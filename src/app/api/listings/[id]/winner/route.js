import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { stripe } from '@/lib/stripe-server.js';

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

// Admin/system endpoint to explicitly capture payment for an auction winner
export async function POST(_request, { params }) {
  const listingId = Number(params.id);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, current_bid, ends_at, status, order_status, title')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (!hasAuctionEnded(listing)) {
    return NextResponse.json({ error: 'Auction has not ended yet' }, { status: 400 });
  }

  if (listing.order_status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
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
    return NextResponse.json({ error: 'No bids found for this auction' }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', topBid.buyer_id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Winner has no saved payment method' }, { status: 402 });
  }

  const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
  let paymentMethodId = customer.invoice_settings?.default_payment_method ?? null;

  if (!paymentMethodId) {
    const methods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });
    if (methods.data.length === 0) {
      return NextResponse.json({ error: 'Winner has no saved payment method' }, { status: 402 });
    }
    paymentMethodId = methods.data[0].id;
  }

  const amountCents = Math.round(Number(topBid.amount) * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { listing_id: String(listingId), buyer_id: topBid.buyer_id },
    });

    await supabaseAdmin
      .from('listings')
      .update({ order_status: 'paid', status: 'sold' })
      .eq('id', listingId);

    return NextResponse.json({ ok: true, paymentIntentId: paymentIntent.id });
  } catch (err) {
    await supabaseAdmin
      .from('listings')
      .update({ order_status: 'payment_failed' })
      .eq('id', listingId);
    return NextResponse.json({ error: err.message }, { status: 402 });
  }
}
