import { supabaseAdmin } from './supabase-admin.js';
import { stripe } from './stripe-server.js';

export const AUCTION_ARCHIVE_DAYS = 7;

async function captureWinnerPayment(listing) {
  const { data: topBid } = await supabaseAdmin
    .from('bids')
    .select('buyer_id, amount')
    .eq('listing_id', listing.id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!topBid) return { charged: false };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', topBid.buyer_id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) return { charged: false, winnerId: topBid.buyer_id };

  let paymentMethodId;
  try {
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    paymentMethodId = customer.invoice_settings?.default_payment_method ?? null;
    if (!paymentMethodId) {
      const methods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: 'card',
      });
      if (methods.data.length === 0) return { charged: false, winnerId: topBid.buyer_id };
      paymentMethodId = methods.data[0].id;
    }
  } catch {
    return { charged: false, winnerId: topBid.buyer_id };
  }

  const amountCents = Math.round(Number(topBid.amount) * 100);

  try {
    await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { listing_id: String(listing.id), buyer_id: topBid.buyer_id },
    });
    return { charged: true, winnerId: topBid.buyer_id, amount: topBid.amount };
  } catch (err) {
    console.error(`Stripe capture failed for listing ${listing.id}:`, err.message);
    return { charged: false, winnerId: topBid.buyer_id };
  }
}

export async function runAuctionLifecycleMaintenance() {
  const archiveBefore = new Date(Date.now() - AUCTION_ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Find expired active auctions that haven't had payment attempted yet
  const { data: expiredListings } = await supabaseAdmin
    .from('listings')
    .select('id, current_bid, title')
    .eq('status', 'active')
    .is('order_status', null)
    .lt('ends_at', nowIso);

  for (const listing of expiredListings ?? []) {
    // Lock the listing immediately so concurrent runs don't double-charge
    await supabaseAdmin
      .from('listings')
      .update({ order_status: 'payment_pending', status: 'ended' })
      .eq('id', listing.id)
      .eq('status', 'active'); // only update if still active (optimistic lock)

    const result = await captureWinnerPayment(listing);

    if (result.charged) {
      await supabaseAdmin
        .from('listings')
        .update({ order_status: 'paid', status: 'sold' })
        .eq('id', listing.id);
    } else {
      await supabaseAdmin
        .from('listings')
        .update({ order_status: 'payment_failed' })
        .eq('id', listing.id);
    }

    // Fire-and-forget email notifications (imported lazily to avoid circular deps)
    import('./email.js').then(async ({ emailNotify }) => {
      const title = listing.title ?? 'an item';

      if (result.winnerId && result.charged) {
        emailNotify.auctionWon(result.winnerId, title, result.amount).catch(() => {});
      }

      // Notify all other bidders they lost
      const { data: loserBids } = await supabaseAdmin
        .from('bids')
        .select('buyer_id')
        .eq('listing_id', listing.id)
        .neq('buyer_id', result.winnerId ?? '');

      const loserIds = [...new Set((loserBids ?? []).map((b) => b.buyer_id))];
      for (const loserId of loserIds) {
        emailNotify.auctionLost(loserId, title).catch(() => {});
      }
    }).catch(() => {});
  }

  // End any remaining active listings that timed out (shouldn't be many after the loop above)
  await supabaseAdmin
    .from('listings')
    .update({ status: 'ended' })
    .eq('status', 'active')
    .lt('ends_at', nowIso);

  // Archive old closed auctions
  await supabaseAdmin
    .from('listings')
    .update({ status: 'archived' })
    .in('status', ['ended', 'sold'])
    .lt('ends_at', archiveBefore);
}
