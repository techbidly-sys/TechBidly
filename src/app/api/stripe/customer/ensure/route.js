import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { stripe } from '@/lib/stripe-server.js';

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const role = await getProfileRole(supabase, user.id);
  if (!role) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_customer_id) {
    return new Response(JSON.stringify({ customerId: profile.stripe_customer_id }), { status: 200 });
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { supabaseId: user.id },
  });

  const { error } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to save customer ID' }), { status: 500 });
  }

  return new Response(JSON.stringify({ customerId: customer.id }), { status: 200 });
}
