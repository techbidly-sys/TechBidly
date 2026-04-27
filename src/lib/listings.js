import { supabase } from './supabase.js';

export function mapListing(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    title: row.title ?? '',
    category: row.category ?? '',
    condition: row.condition ?? '',
    image: row.image_url ?? 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
    currentBid: Number(row.current_bid) || 0,
    startingBid: Number(row.starting_bid) || 0,
    bids: row.bid_count ?? 0,
    endsAt: row.ends_at,
    location: [row.city, row.country].filter(Boolean).join(', '),
    city: row.city ?? '',
    country: row.country ?? '',
    seller: row.seller_handle ?? 'Anonymous Seller',
    rating: Number(row.rating) || 5.0,
    description: row.description ?? '',
    tags: row.tags ?? [],
    auth: row.auth ?? { status: 'unverified', fraudScore: 0, checks: [] },
    comparables: row.comparables ?? [],
    featured: row.featured ?? false,
    status: row.status ?? 'active',
    seller_id: row.seller_id,
  };
}

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
