import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { runAuctionLifecycleMaintenance } from '@/lib/auction-lifecycle.js';

function deriveStatus(endsAt, orderStatus) {
  if (orderStatus) return orderStatus;
  if (!endsAt) return 'processing';
  return 'processing';
}

function mapOrder(listing) {
  return {
    id: `TB-${String(listing.id).padStart(5, '0')}`,
    listingId: listing.id,
    title: listing.title ?? '',
    image: listing.image_url ?? null,
    finalPrice: Number(listing.current_bid) || 0,
    status: deriveStatus(listing.ends_at, listing.order_status),
    location: [listing.city, listing.country].filter(Boolean).join(', '),
    endsAt: listing.ends_at,
    trackingNumber: listing.tracking_number ?? null,
    sellerId: listing.seller_id,
  };
}

export async function GET() {
  await runAuctionLifecycleMaintenance();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);

  if (role === 'seller') {
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .in('status', ['sold', 'ended'])
      .gt('bid_count', 0)
      .order('ends_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // For each sold listing, find the winning buyer
    const listingIds = (listings ?? []).map((l) => l.id);
    let buyerMap = {};

    if (listingIds.length > 0) {
      const { data: winningBids } = await supabaseAdmin
        .from('bids')
        .select('listing_id, buyer_id, amount')
        .in('listing_id', listingIds)
        .order('amount', { ascending: false });

      // Keep only the top bid per listing
      (winningBids ?? []).forEach((b) => {
        if (!buyerMap[b.listing_id]) buyerMap[b.listing_id] = b.buyer_id;
      });

      // Fetch buyer handles
      const buyerIds = [...new Set(Object.values(buyerMap))];
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, handle, role')
          .in('id', buyerIds)
          .eq('role', 'buyer');

        const handleMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.handle]));
        Object.keys(buyerMap).forEach((lid) => {
          buyerMap[lid] = handleMap[buyerMap[lid]] ?? 'Anonymous Buyer';
        });
      }
    }

    const orders = (listings ?? []).map((l) => ({
      ...mapOrder(l),
      buyerHandle: buyerMap[l.id] ?? 'Anonymous Buyer',
    }));

    return NextResponse.json({ orders, role: 'seller' });
  }

  // Buyer: show all auction orders they participated in (open + closed)
  const [bidsResult, mktOrdersResult] = await Promise.all([
    supabaseAdmin
      .from('bids')
      .select('listing_id, amount, created_at')
      .eq('buyer_id', user.id),
    supabaseAdmin
      .from('marketplace_orders')
      .select('*, marketplace_items(id, title, image_url, price, city, country)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const userBids = bidsResult.data ?? [];
  const rawMktOrders = mktOrdersResult.data ?? [];

  const marketplaceOrders = rawMktOrders.map((o) => ({
    id: `MKT-${String(o.id).slice(0, 8).toUpperCase()}`,
    orderId: o.id,
    itemId: o.item_id,
    title: o.marketplace_items?.title ?? 'Marketplace item',
    image: o.marketplace_items?.image_url ?? null,
    quantity: o.quantity,
    unitPrice: Number(o.marketplace_items?.price ?? 0),
    totalPrice: Number(o.total_price),
    status: o.status ?? 'confirmed',
    createdAt: o.created_at,
    location: [o.marketplace_items?.city, o.marketplace_items?.country].filter(Boolean).join(', '),
  }));

  if (!userBids.length) {
    return NextResponse.json({ orders: [], marketplaceOrders, role: 'buyer' });
  }

  const bidMap = {};
  userBids.forEach((b) => {
    const lid = b.listing_id;
    if (!bidMap[lid] || Number(b.amount) > bidMap[lid]) {
      bidMap[lid] = Number(b.amount);
    }
  });

  const listingIds = Object.keys(bidMap).map(Number);
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .in('id', listingIds)
    .order('ends_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const winnerRows = await Promise.all(
    listingIds.map(async (listingId) => {
      const { data: bid } = await supabaseAdmin
        .from('bids')
        .select('buyer_id, amount')
        .eq('listing_id', listingId)
        .order('amount', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return [listingId, bid ?? null];
    })
  );
  const winnersByListing = Object.fromEntries(winnerRows);

  const orders = (listings ?? []).map((listing) => {
    const mapped = mapOrder(listing);
    const userMaxBid = Number(bidMap[listing.id] ?? 0);
    const topBid = winnersByListing[listing.id];
    const topAmount = Number(topBid?.amount ?? listing.current_bid ?? 0);
    const isWinner = topBid?.buyer_id === user.id;
    const endedByTime = listing.ends_at ? new Date(listing.ends_at).getTime() <= Date.now() : false;
    const isClosed = endedByTime || (listing.status && listing.status !== 'active');
    const listingStatus = isClosed ? 'closed' : 'open';

    let bidStatus = 'outbid';
    if (isClosed) {
      bidStatus = isWinner ? 'won' : 'outbid';
      if (isWinner && mapped.status === 'shipped') {
        bidStatus = 'shipped';
      }
      if (isWinner && mapped.status === 'delivered') {
        bidStatus = 'delivered';
      }
    } else if (Math.abs(userMaxBid - topAmount) < 0.0001) {
      bidStatus = 'highest_bidder';
    }

    return {
      ...mapped,
      yourBid: userMaxBid,
      finalBid: topAmount,
      listingStatus,
      bidStatus,
      wonAt: isClosed ? listing.ends_at : null,
      isWinner,
    };
  });

  return NextResponse.json({ orders, marketplaceOrders, role: 'buyer' });
}
