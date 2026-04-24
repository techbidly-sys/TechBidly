import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ArrowDownUp, Search } from 'lucide-react';
import { listings, categories, conditions } from '../data/mockData.js';
import ListingCard from '../components/ListingCard.jsx';

const SORTS = [
  { id: 'ending', label: 'Ending soon' },
  { id: 'lowest', label: 'Lowest bid' },
  { id: 'highest', label: 'Highest bid' },
  { id: 'most-bids', label: 'Most bids' },
];

export default function Browse() {
  const [sp, setSp] = useSearchParams();
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('any');
  const [sort, setSort] = useState('ending');
  const [maxPrice, setMaxPrice] = useState(2500);
  const q = sp.get('q') ?? '';

  const filtered = useMemo(() => {
    let list = [...listings];
    if (category !== 'all') list = list.filter((l) => l.category === category);
    if (condition !== 'any') list = list.filter((l) => l.condition === condition);
    if (q) list = list.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()));
    list = list.filter((l) => l.currentBid <= maxPrice);
    switch (sort) {
      case 'lowest': list.sort((a, b) => a.currentBid - b.currentBid); break;
      case 'highest': list.sort((a, b) => b.currentBid - a.currentBid); break;
      case 'most-bids': list.sort((a, b) => b.bids - a.bids); break;
      default: list.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
    }
    return list;
  }, [category, condition, sort, q, maxPrice]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Browse auctions</h1>
          <p className="text-sm text-ink-500 mt-1">
            {filtered.length} active listing{filtered.length === 1 ? '' : 's'}
            {q ? ` matching “${q}”` : ''} · all sellers verified anonymous.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input pl-9 pr-9 appearance-none cursor-pointer w-44"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`chip whitespace-nowrap ${
              category === c.id
                ? 'bg-ink-900 text-white'
                : 'bg-white border border-ink-200 text-ink-700 hover:bg-ink-50'
            }`}
          >
            {c.label}
          </button>
        ))}
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
                <button
                  onClick={() => setSp({})}
                  className="text-xs text-brand-700 font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

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
              type="range"
              min={100}
              max={2500}
              step={50}
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
            onClick={() => {
              setCategory('all');
              setCondition('any');
              setMaxPrice(2500);
              setSp({});
            }}
            className="btn-outline w-full"
          >
            <Filter size={14} /> Reset filters
          </button>
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-ink-900 font-semibold">No matching auctions</div>
              <div className="text-sm text-ink-500 mt-1">Try adjusting your filters or search.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
