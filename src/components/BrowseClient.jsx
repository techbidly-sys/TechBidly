'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, Search } from 'lucide-react';
import { categories, conditions } from '@/data/mockData.js';
import ListingCard from '@/components/ListingCard.jsx';
import { mapListing } from '@/lib/listing-utils.js';

const SORTS = [
  { id: 'ending', label: 'Ending soon' },
  { id: 'lowest', label: 'Lowest bid' },
  { id: 'highest', label: 'Highest bid' },
  { id: 'most-bids', label: 'Most bids' },
];

export default function BrowseClient({ initialListings }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('any');
  const [sort, setSort] = useState('ending');
  const [maxPrice, setMaxPrice] = useState(2500);
  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(false);
  const q = searchParams.get('q') ?? '';
  const fetchController = useRef(null);

  useEffect(() => {
    // Cancel any in-flight request
    if (fetchController.current) fetchController.current.abort();
    const controller = new AbortController();
    fetchController.current = controller;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category !== 'all') params.set('category', category);
    if (condition !== 'any') params.set('condition', condition);
    if (maxPrice < 2500) params.set('maxPrice', String(maxPrice));

    setLoading(true);
    fetch(`/api/listings?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(({ listings: data }) => {
        setListings((data ?? []).map(mapListing));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoading(false);
      });
  }, [q, category, condition, maxPrice]);

  const sorted = useMemo(() => {
    const list = [...listings];
    switch (sort) {
      case 'lowest':    list.sort((a, b) => a.currentBid - b.currentBid); break;
      case 'highest':   list.sort((a, b) => b.currentBid - a.currentBid); break;
      case 'most-bids': list.sort((a, b) => b.bids - a.bids); break;
      default:          list.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
    }
    return list;
  }, [listings, sort]);

  const clearSearch = () => router.replace('/browse');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Browse auctions</h1>
        <p className="text-sm text-ink-500 mt-1">
          {loading ? 'Loading…' : `${sorted.length} active listing${sorted.length === 1 ? '' : 's'}`}
          {q ? ` matching "${q}"` : ''} · all sellers verified anonymous.
        </p>
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
                <span className="inline-flex items-center gap-1.5 text-ink-700"><Search size={12}/> {q}</span>
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
            <span className="label">Max bid</span>
            <input
              type="range" min={100} max={2500} step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-ink-500 mt-1">
              <span>$100</span>
              <span className="font-semibold text-ink-900">${maxPrice.toLocaleString()}</span>
              <span>$2,500</span>
            </div>
          </div>

          <button
            onClick={() => { setCategory('all'); setCondition('any'); setSort('ending'); setMaxPrice(2500); clearSearch(); }}
            className="btn-outline w-full"
          >
            <Filter size={14} /> Reset filters
          </button>
        </aside>

        <div>
          {sorted.length === 0 && !loading ? (
            <div className="card p-12 text-center">
              <div className="text-ink-900 font-semibold">No matching auctions</div>
              <div className="text-sm text-ink-500 mt-1">Try adjusting your filters or search.</div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
              {sorted.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
