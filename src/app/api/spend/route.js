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

  // Fetch marketplace orders + won auctions in parallel
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

  // Resolve won auction listings
  let wonOrders = [];
  if (userBids.length > 0) {
    const bidMap = {};
    userBids.forEach((b) => {
      const lid = b.listing_id;
      if (!bidMap[lid] || Number(b.amount) > bidMap[lid]) bidMap[lid] = Number(b.amount);
    });

    const listingIds = Object.keys(bidMap).map(Number);
    const { data: soldListings } = await supabaseAdmin
      .from('listings')
      .select('id, title, category, seller_handle, current_bid, ends_at')
      .in('id', listingIds)
      .eq('status', 'sold')
      .order('ends_at', { ascending: true });

    wonOrders = (soldListings ?? [])
      .filter((l) => bidMap[l.id] === Number(l.current_bid))
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

  return NextResponse.json({ orders, categories, suppliers });
}
