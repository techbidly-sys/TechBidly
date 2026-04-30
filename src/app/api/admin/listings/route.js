import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, category, condition, current_bid, bid_count, status, featured, ends_at, seller_handle, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}
