import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { stripe } from '@/lib/stripe-server.js';

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { paymentMethodId } = await request.json();
  if (!paymentMethodId) {
    return new Response(JSON.stringify({ error: 'paymentMethodId required' }), { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'No Stripe customer found' }), { status: 400 });
  }

  await stripe.customers.update(profile.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
