import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { data: listings, error: listingsError } = await supabaseAdmin
    .from('listings')
    .select('id, title, current_bid, bid_count, ends_at, seller_handle, status')
    .eq('status', 'active')
    .gt('bid_count', 0)
    .order('bid_count', { ascending: false });

  if (listingsError) return NextResponse.json({ error: listingsError.message }, { status: 500 });
  if (!listings?.length) return NextResponse.json({ listings: [] });

  const listingIds = listings.map((l) => l.id);

  const { data: bids, error: bidsError } = await supabaseAdmin
    .from('bids')
    .select('listing_id, buyer_id, amount, created_at, profiles(handle)')
    .in('listing_id', listingIds)
    .order('amount', { ascending: false });

  if (bidsError) return NextResponse.json({ error: bidsError.message }, { status: 500 });

  const bidsByListing = {};
  for (const bid of bids ?? []) {
    if (!bidsByListing[bid.listing_id]) bidsByListing[bid.listing_id] = [];
    bidsByListing[bid.listing_id].push({
      handle: bid.profiles?.handle ?? 'Unknown',
      amount: bid.amount,
      placed_at: bid.created_at,
    });
  }

  const result = listings.map((l) => ({
    ...l,
    bidders: bidsByListing[l.id] ?? [],
  }));

  return NextResponse.json({ listings: result });
}
