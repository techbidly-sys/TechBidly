import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function PATCH(request, { params }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { action } = await request.json();
  const numId = Number(params.id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
  }

  const updates = {
    feature:   { featured: true },
    unfeature: { featured: false },
    remove:    { status: 'removed' },
    restore:   { status: 'active' },
  };

  if (!updates[action]) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('listings').update(updates[action]).eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
