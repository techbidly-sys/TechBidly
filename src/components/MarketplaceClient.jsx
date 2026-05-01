'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Filter, SlidersHorizontal, Search, ShoppingBag, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { categories, conditions } from '@/data/mockData.js';
import MarketplaceCard from '@/components/MarketplaceCard.jsx';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-low', label: 'Price: Low' },
  { id: 'price-high', label: 'Price: High' },
  { id: 'rating', label: 'Top rated' },
];

export default function MarketplaceClient({ initialItems }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('any');
  const [sort, setSort] = useState('newest');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [bulkOnly, setBulkOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const q = searchParams.get('q') ?? '';
  const fetchController = useRef(null);

  const clearSearch = () => router.replace('/marketplace');

  useEffect(() => {
    if (fetchController.current) fetchController.current.abort();
    const controller = new AbortController();
    fetchController.current = controller;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category !== 'all') params.set('category', category);
    if (condition !== 'any') params.set('condition', condition);
    if (maxPrice < 5000) params.set('maxPrice', String(maxPrice));

    setLoading(true);
    fetch(`/api/marketplace?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(({ items: data }) => {
        setItems(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoading(false);
      });
  }, [q, category, condition, maxPrice]);

  const filtered = useMemo(() => {
    let list = [...items];
    // bulkOnly is a UI-only filter not easily expressed as a DB filter
    if (bulkOnly) list = list.filter((i) => (i.quantity_remaining ?? i.quantity ?? 0) >= 5 || i.pricing_tiers?.length > 0);
    switch (sort) {
      case 'price-low':  list.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price-high': list.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'rating':     list.sort((a, b) => Number(b.rating ?? 5) - Number(a.rating ?? 5)); break;
      default:           list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [items, sort, bulkOnly]);

  const handleBuy = useCallback(async (item) => {
    const res = await fetch(`/api/marketplace/${item.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Purchase failed');
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, quantity_remaining: Math.max(0, (i.quantity_remaining ?? i.quantity ?? 1) - 1) }
          : i
      )
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Marketplace</h1>
          <p className="text-sm text-ink-500 mt-1">
            {loading ? 'Loading…' : `${filtered.length} item${filtered.length === 1 ? '' : 's'} available`}
            {q ? ` matching "${q}"` : ''} · buy directly at fixed prices.
          </p>
        </div>
        <Link href="/marketplace/sell" className="btn-brand shrink-0">
          <Plus size={16} /> List an item
        </Link>
      </div>

      <div className="grid lg:grid-cols-[260px,1fr] gap-6">
        <aside className="card p-5 h-fit lg:sticky lg:top-20 space-y-5">
          <div className="flex items-center gap-2 text-ink-900 font-semibold">
            <SlidersHorizontal size={16} /> Filters
          </div>

          {q && (
            <div>
              <span className="label">Search</span>
              <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-ink-700"><Search size={12} /> {q}</span>
                <button onClick={clearSearch} className="text-xs text-brand-700 font-semibold">Clear</button>
              </div>
            </div>
          )}

          <div>
            <span className="label">Category</span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-xs rounded-lg border py-2 capitalize transition ${
                    category === c.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                      : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Sort by</span>
            <div className="grid grid-cols-2 gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`text-xs rounded-lg border py-2 transition ${
                    sort === s.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                      : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Condition</span>
            <div className="grid grid-cols-2 gap-2">
              {['any', ...conditions].map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`text-xs rounded-lg border py-2 capitalize transition ${
                    condition === c
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                      : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Max price</span>
            <input
              type="range" min={10} max={5000} step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-ink-500 mt-1">
              <span>$10</span>
              <span className="font-semibold text-ink-900">${maxPrice.toLocaleString()}</span>
              <span>$5,000</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setBulkOnly((v) => !v)}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                bulkOnly
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                  : 'border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Building2 size={14} /> Bulk available only
              </span>
              <span className={`h-4 w-7 rounded-full flex items-center transition ${bulkOnly ? 'bg-brand-600' : 'bg-ink-200'}`}>
                <span className={`h-3 w-3 rounded-full bg-white shadow transition-transform mx-0.5 ${bulkOnly ? 'translate-x-3' : ''}`} />
              </span>
            </button>
          </div>

          <button
            onClick={() => { setCategory('all'); setCondition('any'); setSort('newest'); setMaxPrice(5000); setBulkOnly(false); clearSearch(); }}
            className="btn-outline w-full"
          >
            <Filter size={14} /> Reset filters
          </button>
        </aside>

        <div>
          {filtered.length === 0 && !loading ? (
            <div className="card p-12 text-center">
              <ShoppingBag size={32} className="mx-auto text-ink-300 mb-3" />
              <div className="text-ink-900 font-semibold">No items available</div>
              <div className="text-sm text-ink-500 mt-1">Try adjusting your filters or check back later.</div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
              {filtered.map((item) => (
                <MarketplaceCard key={item.id} item={item} onBuy={handleBuy} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
