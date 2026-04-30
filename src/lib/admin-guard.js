import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'techbidly@gmail.com';

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
