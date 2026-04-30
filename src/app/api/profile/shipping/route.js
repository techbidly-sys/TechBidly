import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('shipping_address')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[shipping GET]', error);
    return new Response(JSON.stringify({ address: null }), { status: 200 });
  }

  return new Response(
    JSON.stringify({ address: profile?.shipping_address ?? null }),
    { status: 200 }
  );
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  const { address } = body;

  if (!address?.line1) {
    return new Response(JSON.stringify({ error: 'Invalid address' }), { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ shipping_address: address })
    .eq('id', user.id);

  if (error) {
    console.error('[shipping POST]', error);
    return new Response(JSON.stringify({ error: 'Failed to save address' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
