import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

const SIGNED_URL_TTL = 60 * 60; // 1 hour

export async function GET(request) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  let query = supabaseAdmin
    .from('verifications')
    .select('id, user_id, document_type, document_url, status, notes, created_at, reviewed_at')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate a short-lived signed URL for each document so the reviewer can open it
  const records = await Promise.all(
    (data ?? []).map(async (v) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('kyb-documents')
        .createSignedUrl(v.document_url, SIGNED_URL_TTL);
      return { ...v, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ verifications: records });
}
