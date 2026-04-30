/**
 * Browser-side listing helpers.
 * Uses the anonymous browser Supabase client — safe in client components.
 * For server components / API routes use listings-server.js instead.
 */
import { supabase } from './supabase.js';
import { mapListing } from './listing-utils.js';

export { mapListing };

export async function fetchListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('ends_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function fetchListingById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', Number(id))
    .single();
  if (error) throw error;
  return mapListing(data);
}

export async function createListing({ sellerHandle, form }) {
  // Call the API endpoint which handles listing creation and notifications server-side.
  const res = await fetch('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerHandle, form }),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? 'Failed to create listing');
  }

  const json = await res.json();
  return mapListing(json.listing);
}
