import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function PATCH(request, { params }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { action } = await request.json();
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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
