import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { data: authData, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authUsers = authData?.users ?? [];

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, handle, role, created_at');

  const profileMap = {};
  (profiles ?? []).forEach((p) => {
    if (!profileMap[p.id]) profileMap[p.id] = [];
    profileMap[p.id].push(p);
  });

  const users = authUsers.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    banned: u.ban_duration != null && u.ban_duration !== 'none',
    profiles: profileMap[u.id] ?? [],
  }));

  return NextResponse.json({ users });
}
