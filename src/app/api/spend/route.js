import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';

export async function GET(request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'buyer') return NextResponse.json({ error: 'Buyers only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get('category') || '';
  const supplierFilter = searchParams.get('supplier') || '';

  // Fetch marketplace orders + user bids in parallel
  const [mktResult, bidsResult] = await Promise.all([
    supabaseAdmin
      .from('marketplace_orders')
      .select('id, quantity, total_price, status, created_at, marketplace_items(title, category, seller_handle)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('bids')
      .select('listing_id, amount')
      .eq('buyer_id', user.id),
  ]);

  const rawMktOrders = mktResult.data ?? [];
  const userBids = bidsResult.data ?? [];

  // Resolve auction outcomes + bid performance metrics
  let wonOrders = [];
  let buyerMetrics = {
    winRate: 0,
    listingsWon: 0,
    listingsLost: 0,
    openBidsValue: 0,
    openMaxBidsValue: 0,
    totalValueWon: 0,
  };
  if (userBids.length > 0) {
    const bidMap = {};
    userBids.forEach((b) => {
      const lid = b.listing_id;
      if (!bidMap[lid] || Number(b.amount) > bidMap[lid]) bidMap[lid] = Number(b.amount);
    });

    const listingIds = Object.keys(bidMap).map(Number);
    const [{ data: listings }, { data: allListingBids }] = await Promise.all([
      supabaseAdmin
      .from('listings')
      .select('id, title, category, seller_handle, current_bid, ends_at, status')
      .in('id', listingIds)
      .order('ends_at', { ascending: true }),
      supabaseAdmin
        .from('bids')
        .select('listing_id, buyer_id, amount, created_at')
        .in('listing_id', listingIds)
        .order('listing_id', { ascending: true })
        .order('amount', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    const topBidByListing = {};
    (allListingBids ?? []).forEach((bid) => {
      if (!topBidByListing[bid.listing_id]) topBidByListing[bid.listing_id] = bid;
    });

    const now = Date.now();
    const closedListings = [];
    const openListings = [];
    (listings ?? []).forEach((listing) => {
      const closedByTime = listing.ends_at ? new Date(listing.ends_at).getTime() <= now : false;
      const closedByStatus = listing.status && listing.status !== 'active';
      if (closedByTime || closedByStatus) closedListings.push(listing);
      else openListings.push(listing);
    });

    const wonListings = closedListings.filter((listing) => {
      const topBid = topBidByListing[listing.id];
      return topBid?.buyer_id === user.id;
    });

    const lostListings = closedListings.filter((listing) => {
      const topBid = topBidByListing[listing.id];
      return !!topBid && topBid.buyer_id !== user.id;
    });

    const openBidsValue = openListings.reduce((sum, listing) => {
      const topBid = topBidByListing[listing.id];
      if (topBid?.buyer_id !== user.id) return sum;
      return sum + Number(listing.current_bid ?? topBid.amount ?? 0);
    }, 0);

    const openMaxBidsValue = openListings.reduce((sum, listing) => (
      sum + Number(bidMap[listing.id] ?? 0)
    ), 0);

    const totalValueWon = wonListings.reduce((sum, listing) => (
      sum + Number(listing.current_bid ?? 0)
    ), 0);

    const closedCount = wonListings.length + lostListings.length;
    const winRate = closedCount > 0 ? (wonListings.length / closedCount) * 100 : 0;

    buyerMetrics = {
      winRate,
      listingsWon: wonListings.length,
      listingsLost: lostListings.length,
      openBidsValue,
      openMaxBidsValue,
      totalValueWon,
    };

    wonOrders = wonListings
      .filter((l) => !l.ends_at || new Date(l.ends_at).getTime() <= now)
      .map((l) => ({
        id: `TB-${String(l.id).padStart(5, '0')}`,
        title: l.title ?? 'Auction Item',
        category: l.category ?? 'Other',
        supplier: l.seller_handle ?? 'Unknown',
        total: Number(l.current_bid),
        date: l.ends_at,
        type: 'auction',
      }));
  }

  const mktMapped = rawMktOrders.map((o) => ({
    id: `MKT-${String(o.id).slice(0, 8).toUpperCase()}`,
    title: o.marketplace_items?.title ?? 'Marketplace item',
    category: o.marketplace_items?.category ?? 'Other',
    supplier: o.marketplace_items?.seller_handle ?? 'Unknown',
    total: Number(o.total_price),
    date: o.created_at,
    type: 'marketplace',
  }));

  // All combined, sorted ascending by date
  const allUnfiltered = [...wonOrders, ...mktMapped].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  // Available filter options (always from full unfiltered set)
  const categories = [...new Set(allUnfiltered.map((o) => o.category))].filter(Boolean).sort();
  const suppliers = [...new Set(allUnfiltered.map((o) => o.supplier))].filter(Boolean).sort();

  let orders = [...allUnfiltered];
  if (categoryFilter) orders = orders.filter((o) => o.category === categoryFilter);
  if (supplierFilter) orders = orders.filter((o) => o.supplier === supplierFilter);

  return NextResponse.json({ orders, categories, suppliers, buyerMetrics });
}
