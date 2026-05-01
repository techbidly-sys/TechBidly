import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function PATCH(request, { params }) {
  const { forbidden, user: adminUser } = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await request.json();
  const { action } = body;
  const { id } = params;

  if (action === 'ban') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '87600h' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'unban') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'verify' || action === 'reject') {
    const status = action === 'verify' ? 'verified' : 'rejected';
    const notes = body.notes ?? null;
    const reviewedBy = adminUser?.id ?? null;

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ verification_status: status })
      .eq('id', id);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    // Record the review decision on all pending verification documents for this user
    const { error: verifErr } = await supabaseAdmin
      .from('verifications')
      .update({ status, notes, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('user_id', id)
      .eq('status', 'pending');
    if (verifErr) return NextResponse.json({ error: verifErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
