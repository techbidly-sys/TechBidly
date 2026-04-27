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

export async function createListing({ sellerId, sellerHandle, form }) {
  const endsAt = new Date(Date.now() + Number(form.duration) * 24 * 3600 * 1000).toISOString();
  const parts = (form.location ?? '').split(',');
  const city = parts[0]?.trim() ?? '';
  const country = parts.slice(1).join(',').trim();

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      seller_handle: sellerHandle,
      title: form.title,
      category: form.category,
      condition: form.condition,
      description: form.description,
      image_url: form.imageUrl || null,
      starting_bid: Number(form.startingBid),
      current_bid: Number(form.startingBid),
      ends_at: endsAt,
      city,
      country,
      bid_count: 0,
      featured: false,
      status: 'active',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      auth: { status: 'unverified', fraudScore: 0, checks: [] },
      comparables: [],
    })
    .select()
    .single();

  if (error) throw error;
  return mapListing(data);
}
