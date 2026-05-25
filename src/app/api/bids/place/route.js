import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { stripe } from '@/lib/stripe-server.js';
import { emailNotify } from '@/lib/email.js';

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'buyer') {
    return NextResponse.json({ error: 'Seller accounts cannot place bids' }, { status: 403 });
  }

  // Require at least one saved payment method before bidding
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .eq('role', 'buyer')
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'A payment card is required before placing bids. Add one in your profile billing settings.' },
      { status: 403 }
    );
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: 'card',
  });

  if (paymentMethods.data.length === 0) {
    return NextResponse.json(
      { error: 'A payment card is required before placing bids. Add one in your profile billing settings.' },
      { status: 403 }
    );
  }

  const { listingId, amount } = await request.json();

  if (!listingId || !amount) {
    return NextResponse.json({ error: 'Missing listingId or amount' }, { status: 400 });
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, title, ends_at, status')
    .eq('id', Number(listingId))
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const endedByTime = listing.ends_at ? new Date(listing.ends_at).getTime() <= Date.now() : false;
  const endedByStatus = listing.status && listing.status !== 'active';
  if (endedByTime || endedByStatus) {
    return NextResponse.json({ error: 'Auction ended. Bidding is closed.' }, { status: 400 });
  }

  // Capture the current top bidder before the new bid lands so we can notify them.
  const { data: prevTopBid } = await supabaseAdmin
    .from('bids')
    .select('buyer_id, amount')
    .eq('listing_id', Number(listingId))
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase.rpc('place_bid', {
    p_listing_id: Number(listingId),
    p_buyer_id: user.id,
    p_amount: numericAmount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Anti-sniping: if the bid lands within the last 5 minutes, extend the auction by 5 minutes
  const SNIPE_WINDOW_MS = 5 * 60 * 1000;
  const msRemaining = new Date(listing.ends_at).getTime() - Date.now();
  if (msRemaining > 0 && msRemaining < SNIPE_WINDOW_MS) {
    await supabaseAdmin
      .from('listings')
      .update({ ends_at: new Date(Date.now() + SNIPE_WINDOW_MS).toISOString() })
      .eq('id', Number(listingId));
  }

  const listingTitle = listing.title ?? 'an item';

  const notificationsToInsert = [
    {
      user_id: user.id,
      type: 'bid_placed',
      title: 'Bid placed',
      body: `${listingTitle} — you bid $${numericAmount.toLocaleString()}`,
      listing_id: Number(listingId),
      read: false,
    },
  ];

  if (prevTopBid && prevTopBid.buyer_id !== user.id) {
    notificationsToInsert.push({
      user_id: prevTopBid.buyer_id,
      type: 'outbid',
      title: "You've been outbid",
      body: `${listingTitle} — someone bid $${numericAmount.toLocaleString()}`,
      listing_id: Number(listingId),
      read: false,
    });
  }

  const { error: notifError } = await supabaseAdmin.from('notifications').insert(notificationsToInsert);
  if (notifError) {
    console.error('Notification insert error:', notifError);
  }

  // Fire-and-forget email notifications
  emailNotify.bidPlaced(user.id, listingTitle, numericAmount).catch(() => {});
  if (prevTopBid && prevTopBid.buyer_id !== user.id) {
    emailNotify.outbid(prevTopBid.buyer_id, listingTitle, numericAmount).catch(() => {});
  }

  return NextResponse.json({ bid: data });
}
