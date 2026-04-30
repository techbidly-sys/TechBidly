import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';

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

  const { data: item, error: fetchError } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const remaining = item.quantity_remaining ?? item.quantity ?? 0;
  if (remaining < quantity) {
    return NextResponse.json({ error: 'Not enough stock' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from('marketplace_orders')
    .insert({
      item_id: id,
      buyer_id: user.id,
      quantity,
      total_price: Number(item.price) * quantity,
      status: 'confirmed',
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const newRemaining = remaining - quantity;
  await supabaseAdmin
    .from('marketplace_items')
    .update({
      quantity_remaining: newRemaining,
      status: newRemaining === 0 ? 'sold' : 'active',
    })
    .eq('id', id);

  return NextResponse.json({ order });
}
