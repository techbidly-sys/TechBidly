import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  // Fetch auction orders (sold/ended listings with bids) and marketplace orders in parallel
  const [listingsResult, mktResult] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('id, title, seller_id, current_bid, order_status, status, ends_at, tracking_number')
      .in('order_status', ['paid', 'payment_pending', 'payment_failed'])
      .order('ends_at', { ascending: false }),
    supabaseAdmin
      .from('marketplace_orders')
      .select('id, item_id, buyer_id, total_price, status, created_at, marketplace_items(title, seller_id)')
      .order('created_at', { ascending: false }),
  ]);

  const listings = listingsResult.data ?? [];
  const mktOrders = mktResult.data ?? [];

  // Resolve seller handles for auction listings
  const sellerIds = [...new Set(listings.map((l) => l.seller_id).filter(Boolean))];
  const mktSellerIds = [...new Set(
    mktOrders.map((o) => o.marketplace_items?.seller_id).filter(Boolean)
  )];
  const allSellerIds = [...new Set([...sellerIds, ...mktSellerIds])];

  // Find winning buyers for auction listings
  const listingIds = listings.map((l) => l.id);

  const [sellerProfiles, winnerBids, mktBuyerProfiles] = await Promise.all([
    allSellerIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, handle').in('id', allSellerIds)
      : { data: [] },
    listingIds.length > 0
      ? supabaseAdmin
          .from('bids')
          .select('listing_id, buyer_id, amount')
          .in('listing_id', listingIds)
          .order('amount', { ascending: false })
      : { data: [] },
    mktOrders.length > 0
      ? supabaseAdmin
          .from('profiles')
          .select('id, handle')
          .in('id', mktOrders.map((o) => o.buyer_id).filter(Boolean))
      : { data: [] },
  ]);

  const sellerHandleMap = Object.fromEntries(
    (sellerProfiles.data ?? []).map((p) => [p.id, p.handle])
  );
  const mktBuyerHandleMap = Object.fromEntries(
    (mktBuyerProfiles.data ?? []).map((p) => [p.id, p.handle])
  );

  // Keep only top bid per listing
  const topBidMap = {};
  (winnerBids.data ?? []).forEach((b) => {
    if (!topBidMap[b.listing_id]) topBidMap[b.listing_id] = b;
  });

  // Resolve buyer handles from bids
  const buyerIds = [...new Set(Object.values(topBidMap).map((b) => b.buyer_id).filter(Boolean))];
  const buyerProfiles = buyerIds.length > 0
    ? (await supabaseAdmin.from('profiles').select('id, handle').in('id', buyerIds)).data ?? []
    : [];
  const buyerHandleMap = Object.fromEntries(buyerProfiles.map((p) => [p.id, p.handle]));

  const STATUS_MAP = {
    paid: 'processing',
    payment_pending: 'processing',
    payment_failed: 'payment_failed',
  };

  const auctionRows = listings.map((l) => {
    const winner = topBidMap[l.id];
    return {
      id: `TB-${String(l.id).padStart(5, '0')}`,
      listing_title: l.title,
      buyer_handle: winner ? (buyerHandleMap[winner.buyer_id] ?? 'Anonymous') : '—',
      seller_handle: sellerHandleMap[l.seller_id] ?? '—',
      amount: Number(l.current_bid) || 0,
      status: STATUS_MAP[l.order_status] ?? 'processing',
      created_at: l.ends_at,
      type: 'auction',
    };
  });

  const mktRows = mktOrders.map((o) => ({
    id: `MKT-${String(o.id).slice(0, 8).toUpperCase()}`,
    listing_title: o.marketplace_items?.title ?? 'Marketplace item',
    buyer_handle: mktBuyerHandleMap[o.buyer_id] ?? 'Anonymous',
    seller_handle: sellerHandleMap[o.marketplace_items?.seller_id] ?? '—',
    amount: Number(o.total_price) || 0,
    status: o.status === 'confirmed' ? 'delivered' : o.status === 'failed' ? 'payment_failed' : 'processing',
    created_at: o.created_at,
    type: 'marketplace',
  }));

  const orders = [...auctionRows, ...mktRows].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return NextResponse.json({ orders });
}
