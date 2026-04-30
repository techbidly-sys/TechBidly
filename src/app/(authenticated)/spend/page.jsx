'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Download,
  Minus,
} from 'lucide-react';

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtK(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [yr, mo] = key.split('-');
  return new Date(+yr, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ── SVG monthly bar chart ─────────────────────────────────────────────────────

function MonthlyBarChart({ data }) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-ink-400 text-sm">
        No data for this period
      </div>
    );
  }

  const W = 560, H = 160;
  const PAD = { top: 12, right: 12, bottom: 28, left: 56 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barStep = IW / data.length;
  const barW = Math.max(Math.min(barStep * 0.55, 44), 4);
  const yLines = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="mb-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {yLines.map((frac) => {
        const y = PAD.top + IH * (1 - frac);
        return (
          <g key={frac}>
            <line
              x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="#f3f4f6" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize="10" fill="#9ca3af"
            >
              {fmtK(maxVal * frac)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const barH = Math.max((d.total / maxVal) * IH, d.total > 0 ? 2 : 0);
        const x = PAD.left + i * barStep + (barStep - barW) / 2;
        const y = PAD.top + IH - barH;
        return (
          <g key={d.month}>
            <rect
              x={x.toFixed(1)} y={y.toFixed(1)}
              width={barW.toFixed(1)} height={Math.max(barH, 0).toFixed(1)}
              rx="3" fill="url(#mb-grad)"
            />
            {data.length <= 14 && (
              <text
                x={(x + barW / 2).toFixed(1)} y={H - 6}
                textAnchor="middle" fontSize="9" fill="#9ca3af"
              >
                {monthLabel(d.month)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Category horizontal bars ──────────────────────────────────────────────────

function CategoryBars({ data }) {
  if (!data.length) return <p className="text-ink-400 text-sm">No data</p>;

  const colors = ['#a855f7', '#7c3aed', '#6d28d9', '#8b5cf6', '#c084fc', '#5b21b6', '#9333ea'];
  const maxVal = data[0].total;

  return (
    <div className="space-y-3.5">
      {data.slice(0, 7).map((d, i) => (
        <div key={d.category}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-700 font-medium truncate mr-3">{d.category}</span>
            <span className="text-ink-500 shrink-0">{fmt(d.total)}</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.total / maxVal) * 100}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="label mb-0">{label}</span>
        <div className="h-8 w-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-ink-900 mt-1">{value}</div>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  );
}

// ── Date range options ────────────────────────────────────────────────────────

const DATE_RANGES = [
  { value: 'ytd', label: 'Year to Date' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SpendDashboardPage() {
  const { session, role } = useAuth();

  const [allOrders, setAllOrders] = useState(null); // null = loading
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [dateRange, setDateRange] = useState('ytd');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const fetchSpend = useCallback(async () => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (supplierFilter) params.set('supplier', supplierFilter);

    try {
      const res = await fetch(`/api/spend?${params}`);
      if (!res.ok) throw new Error('Failed to load spend data');
      const json = await res.json();
      setAllOrders(json.orders ?? []);
      setCategories(json.categories ?? []);
      setSuppliers(json.suppliers ?? []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
      setAllOrders([]);
    }
  }, [categoryFilter, supplierFilter]);

  useEffect(() => {
    if (session) fetchSpend();
  }, [session, fetchSpend]);

  // Apply date range filter client-side (charts + table)
  const filtered = useMemo(() => {
    if (!allOrders) return [];
    const now = new Date();

    if (dateRange === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      return allOrders.filter((o) => new Date(o.date) >= start);
    }
    if (dateRange === '3m') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return allOrders.filter((o) => new Date(o.date) >= start);
    }
    if (dateRange === '6m') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      return allOrders.filter((o) => new Date(o.date) >= start);
    }
    if (dateRange === 'custom' && fromDate) {
      const start = new Date(fromDate);
      const end = toDate ? new Date(toDate + 'T23:59:59') : now;
      return allOrders.filter((o) => {
        const d = new Date(o.date);
        return d >= start && d <= end;
      });
    }
    return allOrders;
  }, [allOrders, dateRange, fromDate, toDate]);

  // Summary stats always computed from all orders (ignoring date range filter)
  const stats = useMemo(() => {
    if (!allOrders) return { ytdTotal: 0, monthTotal: 0, prevMonthTotal: 0, orderCount: 0 };
    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let ytdTotal = 0, monthTotal = 0, prevMonthTotal = 0;
    for (const o of allOrders) {
      const d = new Date(o.date);
      if (d >= ytdStart) ytdTotal += o.total;
      if (d >= curMonthStart) monthTotal += o.total;
      if (d >= prevMonthStart && d <= prevMonthEnd) prevMonthTotal += o.total;
    }
    return { ytdTotal, monthTotal, prevMonthTotal, orderCount: filtered.length };
  }, [allOrders, filtered.length]);

  const byMonth = useMemo(() => {
    const map = {};
    for (const o of filtered) {
      const k = monthKey(o.date);
      map[k] = (map[k] ?? 0) + o.total;
    }
    return Object.entries(map)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = {};
    for (const o of filtered) {
      map[o.category] = (map[o.category] ?? 0) + o.total;
    }
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const bySupplier = useMemo(() => {
    const map = {};
    for (const o of filtered) {
      if (!map[o.supplier]) map[o.supplier] = { total: 0, count: 0 };
      map[o.supplier].total += o.total;
      map[o.supplier].count++;
    }
    return Object.entries(map)
      .map(([handle, { total, count }]) => ({ handle, total, orderCount: count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered]);

  const momChange =
    stats.prevMonthTotal > 0
      ? ((stats.monthTotal - stats.prevMonthTotal) / stats.prevMonthTotal) * 100
      : null;

  function exportCSV() {
    if (!filtered.length) return;
    const rows = [
      ['Date', 'Order ID', 'Title', 'Category', 'Supplier', 'Amount', 'Type'],
      ...filtered.map((o) => [
        new Date(o.date).toLocaleDateString('en-US'),
        o.id,
        `"${o.title.replace(/"/g, '""')}"`,
        o.category,
        o.supplier,
        o.total.toFixed(2),
        o.type,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `techbidly-spend-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (role === 'seller') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <ShoppingBag size={40} className="mx-auto text-ink-200 mb-4" />
        <h2 className="text-lg font-semibold text-ink-700 mb-2">Track Expenses</h2>
        <p className="text-ink-500 text-sm">Switch to your buyer account to view expense analytics.</p>
      </div>
    );
  }

  const loading = allOrders === null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Spend Dashboard</h1>
          <p className="text-ink-500 text-sm mt-0.5">Track and analyse your purchasing activity</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="btn-outline gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-40"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div>
              <label className="label">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input w-36"
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input w-36"
              />
            </div>
          </>
        )}

        <div>
          <label className="label">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Supplier</label>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="input w-44"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {(categoryFilter || supplierFilter) && (
          <button
            onClick={() => { setCategoryFilter(''); setSupplierFilter(''); }}
            className="btn-ghost text-sm self-end"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {loadError && (
        <div className="card p-5 text-center">
          <p className="text-rose-600 text-sm">{loadError}</p>
          <button onClick={fetchSpend} className="btn-outline mt-3 text-sm">Retry</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && !loadError && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 h-[100px] animate-pulse" />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="card p-5 lg:col-span-2 h-[220px] animate-pulse" />
            <div className="card p-5 h-[220px] animate-pulse" />
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="YTD Spend"
              value={fmt(stats.ytdTotal)}
              icon={<BarChart2 size={18} className="text-brand-600" />}
            />
            <StatCard
              label="This Month"
              value={fmt(stats.monthTotal)}
              sub={
                momChange !== null ? (
                  <span
                    className={`flex items-center gap-1 text-xs font-medium ${
                      momChange > 0
                        ? 'text-rose-500'
                        : momChange < 0
                        ? 'text-emerald-600'
                        : 'text-ink-400'
                    }`}
                  >
                    {momChange > 0 ? (
                      <TrendingUp size={12} />
                    ) : momChange < 0 ? (
                      <TrendingDown size={12} />
                    ) : (
                      <Minus size={12} />
                    )}
                    {Math.abs(momChange).toFixed(1)}% vs last month
                  </span>
                ) : null
              }
              icon={<TrendingUp size={18} className="text-brand-600" />}
            />
            <StatCard
              label="Last Month"
              value={fmt(stats.prevMonthTotal)}
              icon={<TrendingDown size={18} className="text-ink-400" />}
            />
            <StatCard
              label="Orders in Range"
              value={stats.orderCount}
              icon={<ShoppingBag size={18} className="text-brand-600" />}
            />
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <ShoppingBag size={40} className="mx-auto text-ink-200 mb-4" />
              <h3 className="font-semibold text-ink-700 mb-1">No orders yet</h3>
              <p className="text-ink-400 text-sm">
                Your spend data will appear here once you place your first order.
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Charts */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="card p-5 lg:col-span-2">
                  <h2 className="font-semibold text-ink-900 mb-4">Monthly Spend</h2>
                  <MonthlyBarChart data={byMonth} />
                </div>
                <div className="card p-5">
                  <h2 className="font-semibold text-ink-900 mb-4">By Category</h2>
                  <CategoryBars data={byCategory} />
                </div>
              </div>

              {/* Top suppliers */}
              <div className="card p-5">
                <h2 className="font-semibold text-ink-900 mb-4">Top Suppliers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-ink-100">
                        <th className="pb-2 pr-4 text-ink-400 font-medium">#</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium">Supplier</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium text-right">Orders</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium text-right">Total Spend</th>
                        <th className="pb-2 text-ink-400 font-medium text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bySupplier.map((s, i) => {
                        const rangeTotal = bySupplier.reduce((acc, x) => acc + x.total, 0);
                        return (
                          <tr
                            key={s.handle}
                            className="border-b border-ink-50 hover:bg-ink-50/40 transition-colors"
                          >
                            <td className="py-3 pr-4 text-ink-400 text-xs">{i + 1}</td>
                            <td className="py-3 pr-4 font-medium text-ink-900">{s.handle}</td>
                            <td className="py-3 pr-4 text-right text-ink-500">{s.orderCount}</td>
                            <td className="py-3 pr-4 text-right font-semibold text-ink-900">
                              {fmt(s.total)}
                            </td>
                            <td className="py-3 text-right text-ink-500">
                              {rangeTotal > 0
                                ? ((s.total / rangeTotal) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order history */}
              <div className="card p-5">
                <h2 className="font-semibold text-ink-900 mb-4">
                  Order History
                  <span className="text-ink-400 font-normal text-sm ml-2">
                    ({filtered.length} order{filtered.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-ink-100">
                        <th className="pb-2 pr-4 text-ink-400 font-medium">Date</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium">Item</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium">Category</th>
                        <th className="pb-2 pr-4 text-ink-400 font-medium">Supplier</th>
                        <th className="pb-2 text-ink-400 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filtered].reverse().map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-ink-50 hover:bg-ink-50/40 transition-colors"
                        >
                          <td className="py-3 pr-4 text-ink-500 whitespace-nowrap">
                            {new Date(o.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-medium text-ink-900 max-w-[200px] truncate">
                              {o.title}
                            </div>
                            <div className="text-xs text-ink-400">{o.id}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="chip bg-brand-50 text-brand-700">{o.category}</span>
                          </td>
                          <td className="py-3 pr-4 text-ink-600">{o.supplier}</td>
                          <td className="py-3 text-right font-semibold text-ink-900">
                            {fmt(o.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
