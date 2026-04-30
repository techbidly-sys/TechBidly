'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  MapPin,
  Star,
  Package,
  ShoppingCart,
  CheckCircle2,
  Heart,
  ShieldCheck,
  Truck,
  Lock,
  MessageSquare,
  Minus,
  Plus,
  Building2,
} from 'lucide-react';
import StarRating from '@/components/StarRating.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

function priceForQty(item, qty) {
  const tiers = item.pricing_tiers;
  if (!tiers?.length) return Number(item.price);
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find((t) => qty >= t.minQty);
  return match ? Number(match.price) : Number(item.price);
}

export default function MarketplaceItemDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useAuth();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [buyError, setBuyError] = useState('');

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/marketplace/${id}`).then((r) => r.json()),
      fetch(`/api/marketplace/${id}/reviews`).then((r) => r.json()),
    ])
      .then(([itemData, reviewData]) => {
        if (!itemData.item) { setNotFound(true); return; }
        setItem(itemData.item);
        setReviews(reviewData.reviews ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (notFound) router.replace('/marketplace');
  }, [notFound, router]);

  const handleBuy = async () => {
    setBuyError('');
    setBuying(true);
    try {
      const res = await fetch(`/api/marketplace/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Purchase failed');
      }
      setItem((prev) => ({
        ...prev,
        quantity_remaining: Math.max(0, (prev.quantity_remaining ?? prev.quantity ?? 1) - qty),
      }));
      setPurchased(true);
    } catch (err) {
      setBuyError(err.message ?? 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewRating) { setReviewError('Please select a star rating'); return; }
    setReviewError('');
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit review');
      setReviews((prev) => [data.review, ...prev]);
      setReviewSubmitted(true);
      const allRatings = [data.review.rating, ...reviews.map((r) => r.rating)];
      const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      setItem((prev) => ({ ...prev, rating: avg }));
    } catch (err) {
      setReviewError(err.message ?? 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

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

  if (notFound || !item) return null;

  const stockRemaining = item.quantity_remaining ?? item.quantity ?? 0;
  const soldOut = stockRemaining === 0;
  const isBulkItem = stockRemaining >= 5 || (item.pricing_tiers?.length > 0);
  const location = [item.city, item.country].filter(Boolean).join(', ');
  const avgRating = reviews.length
    ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
    : Number(item.rating ?? 5);

  const unitPrice = priceForQty(item, qty);
  const totalPrice = unitPrice * qty;
  const hasTiers = item.pricing_tiers?.length > 0;

  const changeQty = (delta) => {
    setQty((prev) => Math.min(stockRemaining, Math.max(1, prev + delta)));
  };

  return (
    <div className="space-y-8">
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ChevronLeft size={16} /> Back to marketplace
      </Link>

      <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
        {/* Left column */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="aspect-[4/3] bg-ink-100 relative">
              <img
                src={item.image_url ?? 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80'}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {isBulkItem && !soldOut && (
                <div className="absolute top-4 left-4">
                  <span className="chip bg-brand-600 text-white text-[10px] font-semibold px-2.5 py-1 flex items-center gap-1">
                    <Building2 size={11} /> Bulk Available
                  </span>
                </div>
              )}
              <button
                className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full bg-white/90 backdrop-blur hover:text-rose-500 transition"
                aria-label="Save"
              >
                <Heart size={16} />
              </button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="chip bg-brand-50 text-brand-700">{item.condition}</span>
              <span className="chip bg-ink-50 text-ink-600 capitalize border border-ink-100">{item.category}</span>
              {(item.tags ?? []).map((t) => (
                <span key={t} className="chip bg-ink-50 text-ink-600 border border-ink-100 capitalize">{t}</span>
              ))}
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mt-3 leading-tight">{item.title}</h1>
            <div className="flex items-center gap-4 text-sm text-ink-500 mt-2 flex-wrap">
              {location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {location}</span>}
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </span>
              <span className="inline-flex items-center gap-1">
                <Package size={14} /> {stockRemaining} in stock
              </span>
            </div>
            <p className="mt-4 text-ink-700 leading-relaxed">{item.description}</p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:sticky lg:top-20 self-start">
          <div className="card p-6">
            {/* Pricing header */}
            <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Price per unit</div>
            <div className="flex items-end gap-3 mt-1">
              <div className="font-display text-4xl font-extrabold text-ink-900">
                ${unitPrice.toLocaleString()}
              </div>
              {qty > 1 && unitPrice < Number(item.price) && (
                <div className="text-sm text-emerald-600 font-semibold mb-1">
                  vs ${Number(item.price).toLocaleString()} base
                </div>
              )}
            </div>
            <div className="text-xs text-ink-500 mt-1">Fixed price · no bidding</div>

            {/* Volume tiers table */}
            {hasTiers && (
              <div className="mt-4 rounded-xl border border-ink-100 overflow-hidden">
                <div className="px-3 py-2 bg-ink-50 text-[11px] uppercase tracking-wider font-semibold text-ink-500 flex items-center gap-1.5">
                  <Building2 size={11} /> Volume pricing
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className={`border-t border-ink-100 ${qty < (item.pricing_tiers[0]?.minQty ?? Infinity) ? 'bg-brand-50' : ''}`}>
                      <td className="px-3 py-2 text-ink-700">1 – {(item.pricing_tiers[0]?.minQty ?? 2) - 1} units</td>
                      <td className="px-3 py-2 font-semibold text-ink-900 text-right">${Number(item.price).toLocaleString()} / unit</td>
                    </tr>
                    {item.pricing_tiers.map((tier, i) => {
                      const next = item.pricing_tiers[i + 1];
                      const isActive = qty >= tier.minQty && (!next || qty < next.minQty);
                      return (
                        <tr key={i} className={`border-t border-ink-100 ${isActive ? 'bg-brand-50' : ''}`}>
                          <td className="px-3 py-2 text-ink-700">
                            {tier.minQty}{next ? ` – ${next.minQty - 1}` : '+'} units
                          </td>
                          <td className="px-3 py-2 font-semibold text-ink-900 text-right">
                            ${Number(tier.price).toLocaleString()} / unit
                            {i === item.pricing_tiers.length - 1 && (
                              <span className="ml-1.5 text-emerald-600">
                                (save {Math.round((1 - tier.price / Number(item.price)) * 100)}%)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quantity selector */}
            <div className="mt-5">
              <span className="label">Quantity</span>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => changeQty(-1)}
                  disabled={qty <= 1}
                  className="h-10 w-10 rounded-xl border border-ink-200 flex items-center justify-center text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  max={stockRemaining}
                  onChange={(e) => setQty(Math.min(stockRemaining, Math.max(1, Number(e.target.value) || 1)))}
                  className="input w-20 text-center font-semibold text-lg"
                />
                <button
                  onClick={() => changeQty(1)}
                  disabled={qty >= stockRemaining}
                  className="h-10 w-10 rounded-xl border border-ink-200 flex items-center justify-center text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Plus size={16} />
                </button>
                <span className="text-xs text-ink-500">{stockRemaining} available</span>
              </div>
            </div>

            {/* Order summary */}
            {qty > 1 && (
              <div className="mt-4 rounded-xl bg-ink-50 border border-ink-100 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>{qty} × ${unitPrice.toLocaleString()}</span>
                  <span>${totalPrice.toLocaleString()}</span>
                </div>
                {unitPrice < Number(item.price) && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Bulk discount</span>
                    <span>−${((Number(item.price) - unitPrice) * qty).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-ink-900 border-t border-ink-200 pt-1.5">
                  <span>Total</span>
                  <span>${totalPrice.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {buyError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{buyError}</p>
              )}

              {purchased ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                  <div className="font-semibold text-emerald-800">
                    Purchase confirmed{qty > 1 ? ` · ${qty} units` : ''}!
                  </div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    Total: ${totalPrice.toLocaleString()} · You'll receive shipping details shortly.
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={buying || soldOut}
                  className="btn-brand w-full text-base py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} />
                  {buying
                    ? 'Processing…'
                    : soldOut
                    ? 'Sold Out'
                    : qty > 1
                    ? `Buy ${qty} units · $${totalPrice.toLocaleString()}`
                    : 'Buy Now'}
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: ShieldCheck, label: 'Buyer protection' },
                { icon: Truck, label: 'Tracked shipping' },
                { icon: Lock, label: 'Anonymous identity' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-xl bg-ink-50 p-2.5">
                  <Icon size={16} className="mx-auto text-ink-700" />
                  <div className="text-[10px] mt-1 font-medium text-ink-600">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Review form — shown after purchase */}
          {purchased && !reviewSubmitted && (
            <div className="card p-6">
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquare size={16} /> Leave a review
              </div>
              <p className="text-xs text-ink-500 mt-1">Share your experience to help other buyers.</p>
              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                <div>
                  <span className="label">Your rating</span>
                  <StarRating value={reviewRating} onChange={setReviewRating} size={24} />
                </div>
                <div>
                  <span className="label">Comment <span className="text-ink-400 font-normal normal-case">(optional)</span></span>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="input mt-1"
                    placeholder="How was the item condition, packaging, speed of shipping?"
                  />
                </div>
                {reviewError && <p className="text-xs text-rose-600">{reviewError}</p>}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-brand w-full disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            </div>
          )}

          {reviewSubmitted && (
            <div className="card p-5 text-center bg-emerald-50 border-emerald-200">
              <CheckCircle2 size={20} className="mx-auto text-emerald-600 mb-1" />
              <div className="font-semibold text-emerald-800 text-sm">Review submitted — thanks!</div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews section */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">
            Reviews <span className="text-ink-400 font-normal text-base">({reviews.length})</span>
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} readonly size={16} />
              <span className="text-sm font-semibold text-ink-900">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">No reviews yet — be the first to buy and review!</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} readonly size={14} />
                    <span className="text-sm font-semibold text-ink-800">{r.buyer_handle}</span>
                  </div>
                  <span className="text-xs text-ink-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
