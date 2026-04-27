'use client';

import { Heart } from 'lucide-react';
import { listings } from '@/data/mockData.js';
import ListingCard from '@/components/ListingCard.jsx';

export default function Watchlist() {
  const items = listings.slice(0, 6);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Heart className="text-rose-500" /> Watchlist
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          {items.length} auctions you're tracking. We'll ping you the moment one hits the final hour.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
  );
}
