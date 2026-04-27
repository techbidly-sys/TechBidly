import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('ends_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}

export async function POST(request) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { sellerHandle, form } = body;

  if (!form?.title || !form?.startingBid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const endsAt = new Date(Date.now() + Number(form.duration) * 24 * 3600 * 1000).toISOString();
  const parts = (form.location ?? '').split(',');
  const city = parts[0]?.trim() ?? '';
  const country = parts.slice(1).join(',').trim();

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      seller_handle: sellerHandle ?? 'Anonymous Seller',
      title: form.title,
      category: form.category,
      condition: form.condition,
      description: form.description,
      image_url: form.imageUrl || null,
      starting_bid: Number(form.startingBid),
      current_bid: Number(form.startingBid),
      ends_at: endsAt,
      city,
      country,
      bid_count: 0,
      featured: false,
      status: 'active',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      auth: { status: 'unverified', fraudScore: 0, checks: [] },
      comparables: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing: data });
}
