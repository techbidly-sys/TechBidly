import { Link } from 'react-router-dom';
import { MapPin, Heart, Gavel } from 'lucide-react';
import CountdownTimer from './CountdownTimer.jsx';
import AuthBadge from './AuthBadge.jsx';

export default function ListingCard({ listing, variant = 'default' }) {
  if (variant === 'wide') {
    return (
      <Link
        to={`/listing/${listing.id}`}
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
          <div className="text-xs text-ink-500 mt-1 flex items-center gap-1.5">
            <MapPin size={12} /> {listing.location}
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
      to={`/listing/${listing.id}`}
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
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white/90 backdrop-blur text-ink-700 hover:text-rose-500 transition"
          aria-label="Add to watchlist"
        >
          <Heart size={15} />
        </button>
        {listing.auth && (
          <div className="absolute bottom-3 left-3">
            <AuthBadge auth={listing.auth} size="sm" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="chip bg-brand-50 text-brand-700">{listing.condition}</span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-500 capitalize">{listing.category}</span>
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
