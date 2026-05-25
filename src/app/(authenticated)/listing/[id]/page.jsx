'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  Share2,
  Sparkles,
  ChevronLeft,
  Info,
  Truck,
  Lock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer.jsx';
import AuthBadge from '@/components/AuthBadge.jsx';
import SmartBidAgent from '@/components/SmartBidAgent.jsx';
import BidHistoryChart from '@/components/BidHistoryChart.jsx';
import { fetchListingById } from '@/lib/listings.js';
import { fetchRecentBids } from '@/lib/bids.js';
import { supabase } from '@/lib/supabase.js';
import { isListingWatchlisted, toggleListingWatchlist } from '@/lib/watchlist.js';
import { useAuth } from '@/context/AuthContext.jsx';

export default function ListingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [recentBids, setRecentBids] = useState([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [auctionResult, setAuctionResult] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [sellerLogo, setSellerLogo] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchListingById(id)
      .then((data) => {
        if (!data) setNotFound(true);
        else setListing(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetchRecentBids(id).then(setRecentBids).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (notFound) router.replace('/browse');
  }, [notFound, router]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`listing-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'listings',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setListing((prev) => prev ? {
          ...prev,
          currentBid: Number(payload.new.current_bid),
          bids: payload.new.bid_count,
          endsAt: payload.new.ends_at ?? prev.endsAt,
        } : prev);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `listing_id=eq.${id}`,
      }, () => {
        fetchRecentBids(id).then(setRecentBids).catch(console.error);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!listing?.seller_id) return;
    supabase
      .from('profiles')
      .select('logo_url, display_anonymous, verification_status')
      .eq('id', listing.seller_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !data.display_anonymous && data.logo_url) {
          setSellerLogo(data.logo_url);
        }
        setSellerVerified(data?.verification_status === 'verified');
      });
  }, [listing?.seller_id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/listings/${id}/winner`)
      .then((res) => res.json())
      .then((data) => {
        setAuctionResult(data?.ended ? data.result : null);
      })
      .catch(() => setAuctionResult(null));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsWatchlisted(isListingWatchlisted(id));
  }, [id]);

  const handleToggleWatchlist = () => {
    setIsWatchlisted(toggleListingWatchlist(id));
  };

  const isSeller = session?.user?.id && listing?.seller_id && session.user.id === listing.seller_id;
  const tooLateToCancel = listing?.endsAt
    ? new Date(listing.endsAt).getTime() - nowTs < 2 * 60 * 60 * 1000
    : false;

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? 'Failed to cancel listing');
        setCancelConfirm(false);
      } else {
        router.push('/browse');
      }
    } catch {
      setCancelError('Failed to cancel listing');
      setCancelConfirm(false);
    } finally {
      setCancelling(false);
    }
  };

  const recent = recentBids;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-ink-100 rounded-lg animate-pulse" />
        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
          <div className="card h-96 animate-pulse bg-ink-100" />
          <div className="card h-96 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (notFound || !listing) return null;

  const hasEnded = (listing.endsAt ? new Date(listing.endsAt).getTime() <= nowTs : false)
    || (listing.status && listing.status !== 'active');

  return (
    <div className="space-y-6">
      <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ChevronLeft size={16} /> Back to browse
      </Link>

      <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
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
                <button
                  onClick={handleToggleWatchlist}
                  className={`h-9 w-9 grid place-items-center rounded-full bg-white/90 backdrop-blur transition ${
                    isWatchlisted ? 'text-rose-500' : 'hover:text-rose-500'
                  }`}
                  aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Heart size={16} className={isWatchlisted ? 'fill-current' : ''} />
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
            <div className="flex items-center gap-2 text-xs flex-wrap">
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
            {listing.auth && (
              <div className="mt-4">
                <AuthBadge auth={listing.auth} size="md" />
              </div>
            )}
          </div>

          <BidHistoryChart
            listingId={id}
            startingBid={listing.startingBid}
            bidCount={listing.bids}
          />

          <div className="card p-6">
            <div className="flex items-center gap-3">
              {sellerLogo ? (
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-ink-100 bg-white flex items-center justify-center flex-shrink-0">
                  <img src={sellerLogo} alt="Seller logo" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div
                  className="h-10 w-10 rounded-xl grid place-items-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #6d28d9 100%)' }}
                >
                  {listing.seller.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-ink-900">{listing.seller}</span>
                {sellerVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                    <ShieldCheck size={10} className="flex-shrink-0" /> Verified Business
                  </span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-ink-700">
                <Info size={16} /> About the seller
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              <SellerStat label="Identity" value="Verified anonymous" sub="ID + payout verified" />
              <SellerStat label="Location" value={listing.location} sub="Exact address shared after sale" />
              <SellerStat label="Sales" value="32 closed" sub={`⭐ ${listing.rating} from 28 reviews`} />
            </div>
          </div>
        </div>

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

            <div className="mt-5">
              <SmartBidAgent
                listing={listing}
                buyerId={session?.user?.id}
                onBidPlaced={() => fetchRecentBids(id).then(setRecentBids)}
                auctionEnded={hasEnded}
                auctionResult={auctionResult}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Trust icon={ShieldCheck} label="Buyer protection" />
              <Trust icon={Truck} label="Tracked shipping" />
              <Trust icon={Lock} label="Anonymous identity" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{hasEnded ? 'Final bids' : 'Recent bids'}</div>
              <span className="text-xs text-ink-500">{hasEnded ? 'Auction closed' : 'Last 5'}</span>
            </div>
            {hasEnded && auctionResult && (
              <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-700">
                Auction ended at <span className="font-semibold text-ink-900">${Number(auctionResult.finalBid ?? listing.currentBid).toLocaleString()}</span>
                {' · '}
                Winner: <span className="font-semibold text-ink-900">{auctionResult.winnerDisplay ?? 'Anonymous Buyer'}</span>
              </div>
            )}
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">{hasEnded ? 'No bids were placed before close.' : 'No bids yet — be the first!'}</p>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-ink-700">{r.anon}</span>
                    <span className="font-semibold text-ink-900">${r.amount.toLocaleString()}</span>
                    <span className="text-ink-400 text-xs w-20 text-right">{r.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isSeller && !hasEnded && (
            <div className="card p-5 border border-rose-100">
              <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                <XCircle size={15} /> Cancel auction
              </div>
              {tooLateToCancel ? (
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                  Cancellation is not allowed in the last 2 hours of an auction.
                </p>
              ) : (
                <>
                  {cancelError && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="shrink-0" /> {cancelError}
                    </div>
                  )}
                  {cancelConfirm ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-ink-700">This will immediately remove the listing. Bidders will be notified. This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="btn-outline text-sm border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
                        </button>
                        <button onClick={() => setCancelConfirm(false)} className="btn-outline text-sm">
                          Go back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelConfirm(true)}
                      className="mt-3 btn-outline w-full text-sm border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      Cancel this auction
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="card p-5 bg-mesh-1">
            <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
              <Sparkles size={14}/> Bidly AI insight
            </div>
            <p className="text-sm text-ink-700 mt-2 leading-relaxed">
              Listings in <b>{listing.location.split(',')[0]}</b> with this condition grade close
              within <b>${Math.round(listing.currentBid * 0.96).toLocaleString()}–${Math.round(listing.currentBid * 1.12).toLocaleString()}</b> over 30 days.
              Activate the Smart Bid Agent above to let AI snipe at the optimal moment.
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
