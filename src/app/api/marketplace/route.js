import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { getProfileRole } from '@/lib/role-guard.js';

export async function GET(request) {
  const supabase = await createSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const condition = searchParams.get('condition')?.trim() ?? '';
  const maxPrice = Number(searchParams.get('maxPrice')) || 0;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  let query = supabase
    .from('marketplace_items')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (condition) {
    query = query.eq('condition', condition);
  }
  if (maxPrice > 0) {
    query = query.lte('price', maxPrice);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [], total: count ?? 0, offset, limit });
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'seller') {
    return NextResponse.json({ error: 'Buyer accounts cannot create marketplace listings' }, { status: 403 });
  }

  const body = await request.json();
  const { sellerHandle, form, pricingTiers } = body;

  if (!form?.title || !form?.price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const parts = (form.location ?? '').split(',');
  const city = parts[0]?.trim() ?? '';
  const country = parts.slice(1).join(',').trim();
  const qty = Number(form.quantity) || 1;

  const { data, error } = await supabase
    .from('marketplace_items')
    .insert({
      seller_id: user.id,
      seller_handle: sellerHandle ?? 'Anonymous Seller',
      title: form.title,
      category: form.category,
      condition: form.condition,
      description: form.description,
      image_url: form.imageUrl || null,
      price: Number(form.price),
      quantity: qty,
      quantity_remaining: qty,
      city,
      country,
      status: 'active',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ...(pricingTiers?.length > 0 ? { pricing_tiers: pricingTiers } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.id) return NextResponse.json({ error: 'Marketplace listing created without an identifier' }, { status: 500 });
  return NextResponse.json({ item: data });
}
