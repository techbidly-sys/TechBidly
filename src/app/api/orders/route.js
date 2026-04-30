import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';

function deriveStatus(endsAt, orderStatus) {
  if (orderStatus) return orderStatus;
  const days = (Date.now() - new Date(endsAt)) / (1000 * 60 * 60 * 24);
  if (days < 2) return 'processing';
  if (days < 6) return 'shipped';
  return 'delivered';
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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);

  if (role === 'seller') {
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .eq('status', 'sold')
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

  // Buyer: find won auctions + marketplace orders in parallel
  const [bidsResult, mktOrdersResult] = await Promise.all([
    supabaseAdmin
      .from('bids')
      .select('listing_id, amount')
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

  // Build a map: listingId → user's max bid
  const bidMap = {};
  userBids.forEach((b) => {
    const lid = b.listing_id;
    if (!bidMap[lid] || Number(b.amount) > bidMap[lid]) {
      bidMap[lid] = Number(b.amount);
    }
  });

  const listingIds = Object.keys(bidMap).map(Number);

  const { data: soldListings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .in('id', listingIds)
    .eq('status', 'sold')
    .order('ends_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // User won if their max bid equals the listing's final current_bid
  const wonListings = (soldListings ?? []).filter(
    (l) => bidMap[l.id] === Number(l.current_bid)
  );

  return NextResponse.json({ orders: wonListings.map(mapOrder), marketplaceOrders, role: 'buyer' });
}
