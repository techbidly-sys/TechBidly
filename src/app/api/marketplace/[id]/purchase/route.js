import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { stripe } from '@/lib/stripe-server.js';
import { emailNotify } from '@/lib/email.js';

export async function POST(request, { params }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'buyer') {
    return NextResponse.json({ error: 'Seller accounts cannot purchase items' }, { status: 403 });
  }

  const { id } = await params;
  const { quantity = 1 } = await request.json();
  const qty = Math.max(1, Number(quantity) || 1);

  const { data: item, error: fetchError } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // 1.2 MOQ enforcement — find the lowest minQty across pricing tiers
  if (item.pricing_tiers?.length > 0) {
    const tierMins = item.pricing_tiers
      .map((t) => Number(t.minQty ?? t.min_qty))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (tierMins.length > 0) {
      const minQty = Math.min(...tierMins);
      if (qty < minQty) {
        return NextResponse.json(
          { error: `Minimum order quantity is ${minQty} units` },
          { status: 400 }
        );
      }
    }
  }

  const remaining = item.quantity_remaining ?? item.quantity ?? 0;
  if (remaining < qty) {
    return NextResponse.json({ error: 'Not enough stock' }, { status: 400 });
  }

  // Get buyer's Stripe customer and payment method
  const { data: buyerProfile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .eq('role', 'buyer')
    .maybeSingle();

  if (!buyerProfile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'A payment card is required. Add one in your profile billing settings.' },
      { status: 403 }
    );
  }

  const customer = await stripe.customers.retrieve(buyerProfile.stripe_customer_id);
  let paymentMethodId = customer.invoice_settings?.default_payment_method ?? null;

  if (!paymentMethodId) {
    const methods = await stripe.paymentMethods.list({
      customer: buyerProfile.stripe_customer_id,
      type: 'card',
    });
    if (methods.data.length === 0) {
      return NextResponse.json(
        { error: 'No saved payment method found. Add a card in your profile billing settings.' },
        { status: 403 }
      );
    }
    paymentMethodId = methods.data[0].id;
  }

  // Apply volume pricing tier if applicable
  let unitPrice = Number(item.price);
  if (item.pricing_tiers?.length > 0) {
    const sorted = [...item.pricing_tiers].sort((a, b) => b.minQty - a.minQty);
    const tier = sorted.find((t) => qty >= Number(t.minQty ?? t.min_qty));
    if (tier) unitPrice = Number(tier.price);
  }
  const totalCents = Math.round(unitPrice * qty * 100);

  // Create order in pending_payment state before charging
  const { data: order, error: orderError } = await supabaseAdmin
    .from('marketplace_orders')
    .insert({
      item_id: id,
      buyer_id: user.id,
      quantity: qty,
      total_price: unitPrice * qty,
      status: 'pending_payment',
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Charge via Stripe
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: buyerProfile.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        marketplace_item_id: String(id),
        marketplace_order_id: String(order.id),
        buyer_id: user.id,
        quantity: String(qty),
      },
    });
  } catch (stripeErr) {
    await supabaseAdmin
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id);
    return NextResponse.json({ error: stripeErr.message }, { status: 402 });
  }

  if (paymentIntent.status !== 'succeeded') {
    await supabaseAdmin
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id);
    return NextResponse.json(
      { error: `Payment not completed (status: ${paymentIntent.status})` },
      { status: 402 }
    );
  }

  // Confirm order and decrement stock
  await supabaseAdmin
    .from('marketplace_orders')
    .update({ status: 'confirmed' })
    .eq('id', order.id);

  const newRemaining = remaining - qty;
  await supabaseAdmin
    .from('marketplace_items')
    .update({
      quantity_remaining: newRemaining,
      status: newRemaining === 0 ? 'sold' : 'active',
    })
    .eq('id', id);

  emailNotify.purchaseConfirmed(user.id, item.title, unitPrice * qty).catch(() => {});

  return NextResponse.json({ order: { ...order, status: 'confirmed' } });
}
