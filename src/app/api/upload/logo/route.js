import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('logo');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be under 2 MB' }, { status: 400 });
  }

  const ext = EXT_MAP[file.type] ?? 'jpg';
  const path = `${user.id}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageErr } = await supabaseAdmin.storage
    .from('company-logos')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (storageErr) return NextResponse.json({ error: storageErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('company-logos')
    .getPublicUrl(path);

  const { error: dbErr } = await supabaseAdmin
    .from('profiles')
    .update({ logo_url: publicUrl })
    .eq('id', user.id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ logo_url: publicUrl });
}
