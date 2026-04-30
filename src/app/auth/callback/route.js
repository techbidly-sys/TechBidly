import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'techbidly@gmail.com';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Admin always goes straight to /admin regardless of profile state
  if (user.email === ADMIN_EMAIL) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id);

  if (!profiles || profiles.length === 0) {
    return NextResponse.redirect(`${origin}/signup/complete`);
  }

  const redirectTo = next.startsWith('/') ? next : '/';
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
