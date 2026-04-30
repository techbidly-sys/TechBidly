import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { stripe } from '@/lib/stripe-server.js';

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Use supabaseAdmin to bypass RLS — stripe_customer_id is a server-only field.
  const { data: profile, error: profileReadError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profileReadError) {
    console.error('[setup-intent] profile read error:', profileReadError);
    return new Response(JSON.stringify({ error: 'Could not load profile.' }), { status: 500 });
  }

  let customerId = profile?.stripe_customer_id;

  // Auto-create a Stripe customer if one doesn't exist yet.
  // AuthContext calls /customer/ensure on login, but it's fire-and-forget,
  // so we can't rely on it being complete by the time the user clicks "Add card".
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseId: user.id },
      });
      customerId = customer.id;
    } catch (err) {
      console.error('[setup-intent] stripe customer create error:', err);
      return new Response(JSON.stringify({ error: 'Could not create payment profile.' }), { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    if (updateError) {
      console.error('[setup-intent] profile update error:', updateError);
      return new Response(JSON.stringify({ error: 'Could not save payment profile.' }), { status: 500 });
    }
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    });

    return new Response(
      JSON.stringify({ clientSecret: setupIntent.client_secret }),
      { status: 200 }
    );
  } catch (err) {
    console.error('[setup-intent] setup intent create error:', err);
    return new Response(JSON.stringify({ error: 'Could not initialise card form.' }), { status: 500 });
  }
}
