'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart, Gavel, ShieldCheck } from 'lucide-react';
import CountdownTimer from './CountdownTimer.jsx';
import AuthBadge from './AuthBadge.jsx';
import {
  isListingWatchlisted,
  subscribeToWatchlistChanges,
  toggleListingWatchlist,
} from '@/lib/watchlist.js';

export default function ListingCard({ listing, variant = 'default' }) {
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  useEffect(() => {
    setIsWatchlisted(isListingWatchlisted(listing.id));
    return subscribeToWatchlistChanges((ids) => {
      setIsWatchlisted(ids.includes(Number(listing.id)));
    });
  }, [listing.id]);

  const handleToggleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWatchlisted(toggleListingWatchlist(listing.id));
  };

  if (variant === 'wide') {
    return (
      <Link
        href={`/listing/${listing.id}`}
        className="group card overflow-hidden flex flex-col sm:flex-row hover:shadow-glow hover:-translate-y-0.5 transition"
      >
        <div className="relative sm:w-56 aspect-[4/3] sm:aspect-auto bg-ink-100">
          <img
            src={listing.image}
            alt={listing.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
          />
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-ink-900 line-clamp-2">{listing.title}</h3>
            <CountdownTimer endsAt={listing.endsAt} compact />
          </div>
          <div className="text-xs text-ink-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin size={12} /> {listing.location}
            {listing.seller_verified && (
              <span className="chip bg-emerald-50 text-emerald-700 text-[10px] flex items-center gap-1">
                <ShieldCheck size={10} /> Verified
              </span>
            )}
          </div>
          <div className="mt-auto pt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">Top bid</div>
              <div className="font-display text-xl font-bold text-ink-900">${listing.currentBid.toLocaleString()}</div>
            </div>
            <span className="chip bg-ink-50 text-ink-600 border border-ink-100">
              <Gavel size={12} /> {listing.bids} bids
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group card overflow-hidden flex flex-col hover:shadow-glow hover:-translate-y-1 transition"
    >
      <div className="relative aspect-[4/3] bg-ink-100 overflow-hidden">
        <img
          src={listing.image}
          alt={listing.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute top-3 left-3">
          <CountdownTimer endsAt={listing.endsAt} compact />
        </div>
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white/90 backdrop-blur transition ${
            isWatchlisted ? 'text-rose-500' : 'text-ink-700 hover:text-rose-500'
          }`}
          aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Heart size={15} className={isWatchlisted ? 'fill-current' : ''} />
        </button>
        {listing.auth && (
          <div className="absolute bottom-3 left-3">
            <AuthBadge auth={listing.auth} size="sm" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <span className="chip bg-brand-50 text-brand-700">{listing.condition}</span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-500 capitalize">{listing.category}</span>
          {listing.seller_verified && (
            <span className="chip bg-emerald-50 text-emerald-700 flex items-center gap-1">
              <ShieldCheck size={10} /> Verified
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-ink-900 line-clamp-2 leading-snug">{listing.title}</h3>
        <div className="text-xs text-ink-500 mt-1 flex items-center gap-1.5">
          <MapPin size={12} /> {listing.location}
        </div>
        <div className="mt-auto pt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">Top bid</div>
            <div className="font-display text-xl font-bold text-ink-900">${listing.currentBid.toLocaleString()}</div>
          </div>
          <span className="chip bg-ink-50 text-ink-600 border border-ink-100">
            <Gavel size={12} /> {listing.bids}
          </span>
        </div>
      </div>
    </Link>
  );
}
