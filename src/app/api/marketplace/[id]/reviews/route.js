import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

export async function GET(request, { params }) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('marketplace_reviews')
    .select('id, rating, comment, created_at, buyer_handle')
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request, { params }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { rating, comment } = await request.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  // Verify user has purchased this item
  const { data: order } = await supabase
    .from('marketplace_orders')
    .select('id')
    .eq('item_id', id)
    .eq('buyer_id', user.id)
    .limit(1)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'You can only review items you have purchased' }, { status: 403 });
  }

  // Check no existing review from this user for this item
  const { data: existing } = await supabase
    .from('marketplace_reviews')
    .select('id')
    .eq('item_id', id)
    .eq('buyer_id', user.id)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this item' }, { status: 409 });
  }

  // Fetch buyer handle for anonymous display
  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single();

  const { data: review, error } = await supabase
    .from('marketplace_reviews')
    .insert({
      item_id: id,
      buyer_id: user.id,
      buyer_handle: profile?.handle ?? 'Anonymous Buyer',
      rating,
      comment: comment?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review });
}
