import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';

// PATCH /api/orders/[id] — seller adds tracking number / updates status
export async function PATCH(request, { params }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'seller') {
    return NextResponse.json({ error: 'Only sellers can update order tracking' }, { status: 403 });
  }

  const listingId = Number((await params).id);
  const { trackingNumber, status } = await request.json();

  // Verify the listing belongs to this seller
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', listingId)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (listing.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (listing.status !== 'sold') return NextResponse.json({ error: 'Can only update sold listings' }, { status: 400 });

  const updates = {};
  if (trackingNumber !== undefined) updates.tracking_number = trackingNumber.trim() || null;
  if (status !== undefined) updates.order_status = status;

  const { error } = await supabaseAdmin
    .from('listings')
    .update(updates)
    .eq('id', listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
