'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import ListingCard from '@/components/ListingCard.jsx';
import { fetchListings } from '@/lib/listings.js';
import { readWatchlistIds, subscribeToWatchlistChanges } from '@/lib/watchlist.js';

export default function Watchlist() {
  const [allListings, setAllListings] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setWatchlistIds(readWatchlistIds());
    fetchListings()
      .then((listings) => {
        if (active) setAllListings(listings);
      })
      .catch(() => {
        if (active) setAllListings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return subscribeToWatchlistChanges((ids) => {
      setWatchlistIds(ids);
    });
  }, []);

  const items = useMemo(() => {
    if (watchlistIds.length === 0) return [];
    const idSet = new Set(watchlistIds);
    return allListings.filter((listing) => idSet.has(Number(listing.id)));
  }, [allListings, watchlistIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Heart className="text-rose-500" /> Watchlist
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          {items.length} auction{items.length === 1 ? '' : 's'} you're tracking. We'll ping you the moment one hits the final hour.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card h-80 animate-pulse bg-ink-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-ink-900 font-semibold">Your watchlist is empty</div>
          <div className="text-sm text-ink-500 mt-1">Tap the heart on any listing to add it here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  );
}
