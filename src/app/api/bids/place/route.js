import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId, amount } = await request.json();

  if (!listingId || !amount) {
    return NextResponse.json({ error: 'Missing listingId or amount' }, { status: 400 });
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('place_bid', {
    p_listing_id: Number(listingId),
    p_buyer_id: user.id,
    p_amount: numericAmount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ bid: data });
}
