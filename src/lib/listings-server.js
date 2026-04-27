/**
 * Server-only listing helpers.
 * Uses the server Supabase client (cookies-based auth) — never import from client components.
 */
import { createSupabaseServerClient } from './supabase-server.js';
import { mapListing } from './listing-utils.js';

export async function fetchListingsServer() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('ends_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function fetchListingByIdServer(id) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', Number(id))
    .single();
  if (error) throw error;
  return mapListing(data);
}
