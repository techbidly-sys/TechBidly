import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_DOC_TYPES = ['business_license', 'bank_statement', 'trade_reference'];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('verifications')
    .select('id, document_type, status, notes, created_at, reviewed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verifications: data ?? [] });
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  const documentType = formData.get('document_type');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPEG, and PNG files are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 });
  }
  if (!ALLOWED_DOC_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${user.id}/${documentType}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageErr } = await supabaseAdmin.storage
    .from('kyb-documents')
    .upload(path, buffer, { contentType: file.type });

  if (storageErr) return NextResponse.json({ error: storageErr.message }, { status: 500 });

  const { data: record, error: dbErr } = await supabaseAdmin
    .from('verifications')
    .insert({ user_id: user.id, document_type: documentType, document_url: path, status: 'pending' })
    .select('id, document_type, status, created_at')
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Move profile to pending if it was rejected so reviewer sees the resubmission
  await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'pending' })
    .eq('id', user.id)
    .eq('verification_status', 'rejected');

  return NextResponse.json({ verification: record });
}
