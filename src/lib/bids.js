import { supabase } from './supabase.js';

export async function insertBid(listingId, buyerId, amount) {
  const { data, error } = await supabase.rpc('place_bid', {
    p_listing_id: Number(listingId),
    p_buyer_id: buyerId,
    p_amount: Number(amount),
  });
  if (error) throw error;
  return data;
}

export async function fetchRecentBids(listingId) {
  const { data, error } = await supabase
    .from('bids')
    .select('id, amount, created_at, buyer_id')
    .eq('listing_id', Number(listingId))
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((b) => ({
    anon: `Bidder #${(parseInt(b.buyer_id.replace(/-/g, '').slice(0, 8), 16) % 9000) + 1000}`,
    amount: Number(b.amount),
    when: relativeTime(b.created_at),
  }));
}

function relativeTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
