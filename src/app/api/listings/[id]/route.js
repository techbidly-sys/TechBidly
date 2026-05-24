import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

export async function GET(_request, { params }) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', Number(params.id))
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}

export async function PATCH(request, { params }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.action !== 'cancel') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id, status, ends_at')
    .eq('id', Number(params.id))
    .single();

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (listing.status !== 'active') return NextResponse.json({ error: 'Only active listings can be cancelled' }, { status: 400 });

  const msRemaining = new Date(listing.ends_at).getTime() - Date.now();
  if (msRemaining < 2 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Auctions cannot be cancelled in the last 2 hours' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'cancelled' })
    .eq('id', Number(params.id))
    .eq('seller_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
