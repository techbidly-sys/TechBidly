'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart, ShoppingCart, Star, CheckCircle2, Package, Store, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

export default function MarketplaceCard({ item, onBuy }) {
  const { role } = useAuth();
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [error, setError] = useState('');

  const stockRemaining = item.quantity_remaining ?? item.quantity ?? 1;
  const soldOut = stockRemaining === 0;
  const lowStock = !soldOut && stockRemaining <= 3;
  const isBulk = !soldOut && (stockRemaining >= 5 || item.pricing_tiers?.length > 0);
  const location = [item.city, item.country].filter(Boolean).join(', ');

  const handleBuy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setBuying(true);
    try {
      await onBuy(item);
      setBought(true);
    } catch (err) {
      setError(err.message ?? 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="group card overflow-hidden flex flex-col hover:shadow-glow hover:-translate-y-1 transition relative">
      <div className="relative aspect-[4/3] bg-ink-100 overflow-hidden z-10">
        <img
          src={item.image_url ?? 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80'}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
        />
        {isBulk && (
          <div className="absolute top-3 left-3">
            <span className="chip bg-brand-600 text-white text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1">
              <Building2 size={10} /> Bulk
            </span>
          </div>
        )}
        {!isBulk && lowStock && (
          <div className="absolute top-3 left-3">
            <span className="chip bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-semibold">
              Only {stockRemaining} left
            </span>
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-ink-900/50 grid place-items-center">
            <span className="chip bg-white text-ink-900 font-semibold px-4 py-2">Sold Out</span>
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white/90 backdrop-blur text-ink-700 hover:text-rose-500 transition"
          aria-label="Save item"
        >
          <Heart size={15} />
        </button>
      </div>

      {/* Invisible full-card link — buttons above use stopPropagation to stay independent */}
      <Link href={`/marketplace/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />

      <div className="p-4 flex-1 flex flex-col relative z-10">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="chip bg-brand-50 text-brand-700">{item.condition}</span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-500 capitalize">{item.category}</span>
        </div>
        <h3 className="mt-2 font-semibold text-ink-900 line-clamp-2 leading-snug">{item.title}</h3>
        {location && (
          <div className="text-xs text-ink-500 mt-1 flex items-center gap-1.5">
            <MapPin size={12} /> {location}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">Price</div>
              <div className="font-display text-xl font-bold text-ink-900">
                ${Number(item.price).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-ink-500 flex items-center gap-1">
                <Star size={11} className="text-amber-500 fill-amber-500" />
                {Number(item.rating ?? 5.0).toFixed(1)}
              </div>
              <div className="text-xs text-ink-400 flex items-center gap-1">
                <Package size={11} /> {stockRemaining} in stock
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 mb-2">{error}</p>
          )}

          {role === 'seller' ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium bg-ink-50 text-ink-500 border border-ink-200">
              <Store size={13} /> Seller account — cannot purchase
            </div>
          ) : bought ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={15} /> Purchased!
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={buying || soldOut}
              className="btn-brand w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={15} />
              {buying ? 'Processing…' : soldOut ? 'Sold Out' : 'Buy Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
