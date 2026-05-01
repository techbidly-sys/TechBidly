import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is not set');

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, forbidden: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (user.email !== ADMIN_EMAIL) {
    return { user: null, forbidden: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, forbidden: null };
}
