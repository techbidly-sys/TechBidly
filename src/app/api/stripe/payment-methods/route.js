import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { stripe } from '@/lib/stripe-server.js';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return new Response(JSON.stringify({ methods: [], defaultId: null }), { status: 200 });
  }

  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: 'card' }),
    stripe.customers.retrieve(profile.stripe_customer_id),
  ]);

  const defaultId = customer.invoice_settings?.default_payment_method ?? null;

  return new Response(
    JSON.stringify({ methods: methods.data, defaultId }),
    { status: 200 }
  );
}
