'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Star, StarOff, XCircle, CheckCircle, Loader2 } from 'lucide-react';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CHIP = {
  active:  'bg-emerald-50 text-emerald-700',
  ended:   'bg-ink-100 text-ink-600',
  removed: 'bg-red-50 text-red-600',
};

export default function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null);

  const load = () =>
    fetch('/api/admin/listings')
      .then((r) => r.json())
      .then((d) => { setListings(d.listings ?? []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    if (action === 'remove' && !confirm('Remove this listing from the marketplace?')) return;
    setActing(id + action);
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await load();
    setActing(null);
  };

  const filtered = listings.filter((l) =>
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.seller_handle?.toLowerCase().includes(search.toLowerCase()) ||
    l.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Listings</h1>
          <p className="text-sm text-ink-500 mt-1">{listings.length} total</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft border border-ink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Seller</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Bid</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Bids</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Ends</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-6 py-4 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      {l.featured && <Star size={13} className="text-accent-500 fill-accent-500 shrink-0" />}
                      <Link
                        href={`/listing/${l.id}`}
                        className="font-medium text-ink-800 hover:text-brand-600 line-clamp-1 transition-colors"
                      >
                        {l.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{l.seller_handle}</td>
                  <td className="px-6 py-4 text-ink-500 capitalize whitespace-nowrap">{l.category}</td>
                  <td className="px-6 py-4 font-medium text-ink-800 whitespace-nowrap">
                    ${l.current_bid?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-ink-500">{l.bid_count ?? 0}</td>
                  <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{fmt(l.ends_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_CHIP[l.status] ?? 'bg-ink-100 text-ink-600'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {l.featured ? (
                        <button
                          onClick={() => act(l.id, 'unfeature')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-ink-100 text-ink-600 hover:bg-ink-200 transition-colors disabled:opacity-50"
                        >
                          {acting === l.id + 'unfeature' ? <Loader2 size={12} className="animate-spin" /> : <StarOff size={12} />}
                          Unfeature
                        </button>
                      ) : (
                        <button
                          onClick={() => act(l.id, 'feature')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {acting === l.id + 'feature' ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
                          Feature
                        </button>
                      )}
                      {l.status !== 'removed' ? (
                        <button
                          onClick={() => act(l.id, 'remove')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {acting === l.id + 'remove' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => act(l.id, 'restore')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {acting === l.id + 'restore' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-ink-400">
                    No listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
