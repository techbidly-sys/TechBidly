'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeLeft(endsAt) {
  const diff = new Date(endsAt) - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

export default function AdminBids() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch('/api/admin/bids')
      .then((r) => r.json())
      .then((d) => { setListings(d.listings ?? []); setLoading(false); });
  }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = listings.filter(
    (l) =>
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.seller_handle?.toLowerCase().includes(search.toLowerCase()) ||
      l.bidders?.some((b) => b.handle.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBids = listings.reduce((sum, l) => sum + (l.bid_count ?? 0), 0);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Active Bids</h1>
          <p className="text-sm text-ink-500 mt-1">
            {listings.length} active auction{listings.length !== 1 ? 's' : ''} · {totalBids} bid{totalBids !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings or bidders…"
            className="pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft border border-ink-100 px-6 py-16 text-center text-ink-400">
          {search ? 'No results for that search.' : 'No active listings with bids yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl shadow-soft border border-ink-100 overflow-hidden">
              <button
                className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-ink-50/50 transition-colors"
                onClick={() => toggle(l.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/listing/${l.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-ink-900 hover:text-brand-600 transition-colors truncate"
                    >
                      {l.title}
                    </Link>
                    <span className="text-xs text-ink-400">by {l.seller_handle}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-ink-500 flex-wrap">
                    <span>Current bid: <span className="font-semibold text-ink-800">${l.current_bid?.toLocaleString()}</span></span>
                    <span>Ends: {fmtDate(l.ends_at)}</span>
                    <span className="text-xs text-amber-600 font-medium">{timeLeft(l.ends_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center px-4 py-2 bg-brand-50 rounded-xl">
                    <div className="font-display text-xl font-bold text-brand-700">{l.bid_count}</div>
                    <div className="text-[10px] text-brand-500 uppercase tracking-wide font-medium">
                      {l.bid_count === 1 ? 'bid' : 'bids'}
                    </div>
                  </div>

                  <div className="flex -space-x-1.5">
                    {[...new Set(l.bidders.map((b) => b.handle))].slice(0, 5).map((handle) => (
                      <div
                        key={handle}
                        title={handle}
                        className="h-7 w-7 rounded-full bg-brand-100 border-2 border-white grid place-items-center text-[10px] font-bold text-brand-700 uppercase"
                      >
                        {handle[0]}
                      </div>
                    ))}
                    {new Set(l.bidders.map((b) => b.handle)).size > 5 && (
                      <div className="h-7 w-7 rounded-full bg-ink-100 border-2 border-white grid place-items-center text-[10px] font-semibold text-ink-500">
                        +{new Set(l.bidders.map((b) => b.handle)).size - 5}
                      </div>
                    )}
                  </div>

                  {expanded[l.id] ? (
                    <ChevronUp size={16} className="text-ink-400" />
                  ) : (
                    <ChevronDown size={16} className="text-ink-400" />
                  )}
                </div>
              </button>

              {expanded[l.id] && (
                <div className="border-t border-ink-100 px-6 pb-4 pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 text-xs font-semibold text-ink-400 uppercase tracking-wide pr-6">Bidder</th>
                        <th className="pb-2 text-xs font-semibold text-ink-400 uppercase tracking-wide pr-6">Amount</th>
                        <th className="pb-2 text-xs font-semibold text-ink-400 uppercase tracking-wide">Placed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {l.bidders.map((b, i) => (
                        <tr key={i} className={i === 0 ? 'text-ink-900' : 'text-ink-500'}>
                          <td className="py-2 pr-6 font-medium">
                            @{b.handle}
                            {i === 0 && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold uppercase tracking-wide">
                                Leading
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-6 font-semibold">${b.amount?.toLocaleString()}</td>
                          <td className="py-2 text-xs">{fmtTime(b.placed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
