import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

// GET /api/profile/handle?handle=xyz — check whether a company name / handle is available
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle')?.trim();
  if (!handle) return NextResponse.json({ available: false }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Case-insensitive check so "Acme Corp" and "acme corp" are treated as the same name
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('handle', handle)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
