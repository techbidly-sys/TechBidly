/**
 * Maps a raw Supabase DB row to the shape used throughout the UI.
 * Pure function — no Supabase dependency, safe in any context.
 */
export function mapListing(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    title: row.title ?? '',
    category: row.category ?? '',
    condition: row.condition ?? '',
    image:
      row.image_url ??
      'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
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
