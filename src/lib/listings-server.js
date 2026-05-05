/**
 * Server-only listing helpers.
 * Uses the server Supabase client (cookies-based auth) — never import from client components.
 */
import { createSupabaseServerClient } from './supabase-server.js';
import { mapListing } from './listing-utils.js';
import { runAuctionLifecycleMaintenance } from './auction-lifecycle.js';

export async function fetchListingsServer({ q = '', category = '', condition = '', maxPrice = 0, limit = 50, offset = 0 } = {}) {
  await runAuctionLifecycleMaintenance();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('ends_at', { ascending: true })
    .range(offset, offset + Math.min(limit, 100) - 1);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (condition) {
    query = query.eq('condition', condition);
  }
  if (maxPrice > 0) {
    query = query.lte('current_bid', maxPrice);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const sellerIds = [...new Set(rows.map((l) => l.seller_id).filter(Boolean))];
  let verifiedSet = new Set();
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', sellerIds)
      .eq('verification_status', 'verified');
    verifiedSet = new Set((profiles ?? []).map((p) => p.id));
  }

  return rows.map((l) => mapListing({ ...l, seller_verified: verifiedSet.has(l.seller_id) }));
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
