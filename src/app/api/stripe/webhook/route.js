import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

// Must read the raw body before any parsing — Stripe verifies the exact bytes
export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const { marketplace_order_id, listing_id } = pi.metadata ?? {};

      if (marketplace_order_id) {
        await supabaseAdmin
          .from('marketplace_orders')
          .update({ status: 'confirmed' })
          .eq('id', marketplace_order_id)
          .eq('status', 'pending_payment'); // idempotent — only update if not already confirmed
      }

      if (listing_id) {
        await supabaseAdmin
          .from('listings')
          .update({ order_status: 'paid', status: 'sold' })
          .eq('id', Number(listing_id))
          .neq('order_status', 'paid'); // idempotent
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      const { marketplace_order_id, listing_id } = pi.metadata ?? {};

      if (marketplace_order_id) {
        await supabaseAdmin
          .from('marketplace_orders')
          .update({ status: 'failed' })
          .eq('id', marketplace_order_id);
      }

      if (listing_id) {
        await supabaseAdmin
          .from('listings')
          .update({ order_status: 'payment_failed' })
          .eq('id', Number(listing_id));
      }
      break;
    }

    default:
      // Unhandled event — return 200 so Stripe doesn't retry
      break;
  }

  return NextResponse.json({ received: true });
}
