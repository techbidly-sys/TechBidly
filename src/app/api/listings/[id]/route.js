import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

export async function GET(_request, { params }) {
  const supabase = createSupabaseServerClient();

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
