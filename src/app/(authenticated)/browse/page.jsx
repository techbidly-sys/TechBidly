import { Suspense } from 'react';
import { fetchListingsServer } from '@/lib/listings-server.js';
import BrowseClient from '@/components/BrowseClient.jsx';

export default async function Browse() {
  const listings = await fetchListingsServer().catch(() => []);

  return (
    <Suspense>
      <BrowseClient initialListings={listings} />
    </Suspense>
  );
}
