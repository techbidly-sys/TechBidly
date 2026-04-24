import { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  Share2,
  Gavel,
  Sparkles,
  ChevronLeft,
  Info,
  Truck,
  Lock,
} from 'lucide-react';
import { listings } from '../data/mockData.js';
import CountdownTimer from '../components/CountdownTimer.jsx';

export default function ListingDetail() {
  const { id } = useParams();
  const listing = listings.find((l) => l.id === id);
  if (!listing) return <Navigate to="/browse" replace />;

  const minNext = listing.currentBid + 5;
  const [bid, setBid] = useState(minNext);
  const [placed, setPlaced] = useState(false);

  const recent = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        anon: `Bidder #${(7421 + i * 37) % 9999}`,
        amount: listing.currentBid - i * (5 + i * 2),
        when: `${i === 0 ? 'just now' : `${i * 4 + 2}m ago`}`,
      })),
    [listing.currentBid]
  );

  const aiSuggestion = Math.round(listing.currentBid * 1.06);

  const placeBid = (e) => {
    e.preventDefault();
    if (bid < minNext) return;
    setPlaced(true);
  };

  return (
    <div className="space-y-6">
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ChevronLeft size={16} /> Back to browse
      </Link>

      <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
        {/* Gallery + details */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="aspect-[4/3] bg-ink-100 relative">
              <img
                src={listing.image}
                alt={listing.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <CountdownTimer endsAt={listing.endsAt} />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="h-9 w-9 grid place-items-center rounded-full bg-white/90 backdrop-blur hover:text-rose-500 transition" aria-label="Watch">
                  <Heart size={16} />
                </button>
                <button className="h-9 w-9 grid place-items-center rounded-full bg-white/90 backdrop-blur hover:text-brand-600 transition" aria-label="Share">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-lg overflow-hidden border ${i === 0 ? 'border-ink-900' : 'border-transparent'}`}>
                  <img src={listing.image} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="chip bg-brand-50 text-brand-700">{listing.condition}</span>
              <span className="chip bg-ink-50 text-ink-600 capitalize border border-ink-100">{listing.category}</span>
              {listing.tags.map((t) => (
                <span key={t} className="chip bg-ink-50 text-ink-600 border border-ink-100 capitalize">{t}</span>
              ))}
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mt-3 leading-tight">{listing.title}</h1>
            <div className="flex items-center gap-4 text-sm text-ink-500 mt-2">
              <span className="inline-flex items-center gap-1"><MapPin size={14}/> {listing.location}</span>
              <span className="inline-flex items-center gap-1"><Star size={14} className="text-amber-500"/> {listing.rating} seller rating</span>
            </div>
            <p className="mt-4 text-ink-700 leading-relaxed">{listing.description}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 font-semibold">
              <Info size={16} /> About the seller
            </div>
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              <SellerStat label="Identity" value="Verified anonymous" sub="ID + payout verified" />
              <SellerStat label="Location" value={listing.location} sub="Exact address shared after sale" />
              <SellerStat label="Sales" value="32 closed" sub={`⭐ ${listing.rating} from 28 reviews`} />
            </div>
          </div>
        </div>

        {/* Bid panel */}
        <div className="space-y-5 lg:sticky lg:top-20 self-start">
          <div className="card p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Current top bid</div>
                <div className="font-display text-4xl font-extrabold text-ink-900 mt-1">
                  ${listing.currentBid.toLocaleString()}
                </div>
                <div className="text-xs text-ink-500 mt-1">
                  {listing.bids} bids · started at ${listing.startingBid.toLocaleString()}
                </div>
              </div>
              <CountdownTimer endsAt={listing.endsAt} />
            </div>

            {placed ? (
              <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="font-semibold text-emerald-800">Your bid is in.</div>
                <div className="text-sm text-emerald-700">
                  We'll notify you the moment you're outbid or the auction ends.
                </div>
              </div>
            ) : (
              <form onSubmit={placeBid} className="mt-5 space-y-3">
                <span className="label">Your max bid</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                    <input
                      type="number"
                      value={bid}
                      min={minNext}
                      step={5}
                      onChange={(e) => setBid(Number(e.target.value))}
                      className="input pl-7 text-lg font-semibold"
                    />
                  </div>
                  <button type="submit" className="btn-brand h-[46px] px-5">
                    <Gavel size={16} /> Place bid
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>Min next bid: <b className="text-ink-900">${minNext}</b></span>
                  <button
                    type="button"
                    onClick={() => setBid(aiSuggestion)}
                    className="inline-flex items-center gap-1 text-brand-700 font-semibold hover:underline"
                  >
                    <Sparkles size={12} /> AI suggests ${aiSuggestion}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Trust icon={ShieldCheck} label="Buyer protection" />
              <Trust icon={Truck} label="Tracked shipping" />
              <Trust icon={Lock} label="Anonymous identity" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Recent bids</div>
              <span className="text-xs text-ink-500">Last 5</span>
            </div>
            <ul className="mt-3 divide-y divide-ink-100">
              {recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-700">{r.anon}</span>
                  <span className="font-semibold text-ink-900">${r.amount.toLocaleString()}</span>
                  <span className="text-ink-400 text-xs w-20 text-right">{r.when}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5 bg-mesh-1">
            <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
              <Sparkles size={14}/> Bidly AI tip
            </div>
            <p className="text-sm text-ink-700 mt-2 leading-relaxed">
              Similar listings in <b>{listing.location.split(',')[0]}</b> closed within
              {' '}<b>${Math.round(listing.currentBid * 0.96)}–${Math.round(listing.currentBid * 1.12)}</b>{' '}
              over the last 30 days. A max of <b>${aiSuggestion}</b> keeps you within the 75th percentile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trust({ icon: Icon, label }) {
  return (
    <div className="rounded-xl bg-ink-50 p-2.5">
      <Icon size={16} className="mx-auto text-ink-700" />
      <div className="text-[10px] mt-1 font-medium text-ink-600">{label}</div>
    </div>
  );
}

function SellerStat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
      <div className="font-semibold text-ink-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
