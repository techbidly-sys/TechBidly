import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import MarketplaceClient from '@/components/MarketplaceClient.jsx';

async function fetchMarketplaceItems() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function Marketplace() {
  const items = await fetchMarketplaceItems();
  return (
    <Suspense>
      <MarketplaceClient initialItems={items} />
    </Suspense>
  );
}
