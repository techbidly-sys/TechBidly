import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

function hasAuctionEnded(listing) {
  if (!listing?.ends_at) return false;
  if (listing.status && listing.status !== 'active') return true;
  return new Date(listing.ends_at).getTime() <= Date.now();
}

function anonymizeBuyer(userId) {
  if (!userId) return 'Anonymous Buyer';
  const seed = parseInt(String(userId).replace(/-/g, '').slice(0, 8), 16);
  return `Anonymous Buyer #${(seed % 9000) + 1000}`;
}

export async function GET(_request, { params }) {
  const listingId = Number(params.id);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, current_bid, ends_at, status')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const ended = hasAuctionEnded(listing);
  if (!ended) {
    return NextResponse.json({ ended: false, result: null });
  }

  const { data: topBid } = await supabaseAdmin
    .from('bids')
    .select('buyer_id, amount')
    .eq('listing_id', listingId)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!topBid) {
    return NextResponse.json({
      ended: true,
      result: {
        finalBid: Number(listing.current_bid) || 0,
        winnerDisplay: 'No winning bidder',
      },
    });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, handle, display_anonymous')
    .eq('id', topBid.buyer_id)
    .eq('role', 'buyer')
    .maybeSingle();

  const winnerDisplay =
    profile?.display_anonymous || !profile?.handle
      ? anonymizeBuyer(topBid.buyer_id)
      : profile.handle;

  return NextResponse.json({
    ended: true,
    result: {
      finalBid: Number(topBid.amount) || Number(listing.current_bid) || 0,
      winnerDisplay,
    },
  });
}
