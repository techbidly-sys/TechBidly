import { supabaseAdmin } from './supabase-admin.js';

export const AUCTION_ARCHIVE_DAYS = 7;

export async function runAuctionLifecycleMaintenance() {
  const archiveBefore = new Date(Date.now() - AUCTION_ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // End listings that timed out without being marked sold.
  await supabaseAdmin
    .from('listings')
    .update({ status: 'ended' })
    .eq('status', 'active')
    .lt('ends_at', nowIso);

  // Archive old closed auctions so they no longer appear as live listings.
  await supabaseAdmin
    .from('listings')
    .update({ status: 'archived' })
    .in('status', ['ended', 'sold'])
    .lt('ends_at', archiveBefore);
}
