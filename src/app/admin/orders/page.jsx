'use client';

import { useEffect, useState } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock } from 'lucide-react';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CONFIG = {
  processing: { label: 'Processing', chip: 'bg-ink-100 text-ink-700', Icon: Clock },
  shipped:    { label: 'Shipped',    chip: 'bg-brand-50 text-brand-700', Icon: Truck },
  delivered:  { label: 'Delivered',  chip: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders ?? []); setLoading(false); });
  }, []);

  const filtered = orders.filter((o) =>
    o.listing_title?.toLowerCase().includes(search.toLowerCase()) ||
    o.buyer_handle?.toLowerCase().includes(search.toLowerCase()) ||
    o.seller_handle?.toLowerCase().includes(search.toLowerCase()) ||
    o.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Orders</h1>
          <p className="text-sm text-ink-500 mt-1">{orders.length} total</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Buyer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Seller</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((o) => {
                const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, chip: 'bg-ink-100 text-ink-600', Icon: Package };
                return (
                  <tr key={o.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink-800 max-w-[240px]">
                      <span className="line-clamp-1">{o.listing_title ?? o.listing_id ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{o.buyer_handle ?? '—'}</td>
                    <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{o.seller_handle ?? '—'}</td>
                    <td className="px-6 py-4 font-medium text-ink-800 whitespace-nowrap">
                      {o.amount != null ? `$${o.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.chip}`}>
                        <cfg.Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{fmt(o.created_at)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-400">
                    No orders found.
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
