import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guard against missing env vars at build/prerender time.
// At runtime in the browser, NEXT_PUBLIC_* vars are always inlined by Next.js.
export const supabase =
  url && key
    ? createBrowserClient(url, key)
    : /** @type {import('@supabase/supabase-js').SupabaseClient} */ ({});

