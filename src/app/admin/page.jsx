'use client';

import { useEffect, useState } from 'react';
import { Users, Tag, Gavel, PackageCheck, TrendingUp, Zap } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-soft border border-ink-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-ink-500">{label}</span>
        <div
          className="h-10 w-10 rounded-xl grid place-items-center"
          style={{ background: color + '1a', color }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-ink-900">{value ?? '—'}</div>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); });
  }, []);

  const fmt = (n) => (n != null ? n.toLocaleString() : null);
  const fmtMoney = (n) =>
    n != null
      ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">Platform overview and key metrics</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={fmt(stats?.totalUsers)}
            color="#7c3aed"
          />
          <StatCard
            icon={Tag}
            label="Total Listings"
            value={fmt(stats?.totalListings)}
            sub={`${fmt(stats?.activeListings)} active`}
            color="#f97316"
          />
          <StatCard
            icon={Gavel}
            label="Total Bids"
            value={fmt(stats?.totalBids)}
            color="#6d28d9"
          />
          <StatCard
            icon={PackageCheck}
            label="Total Orders"
            value={fmt(stats?.totalOrders)}
            color="#059669"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Revenue"
            value={fmtMoney(stats?.totalRevenue)}
            color="#0891b2"
          />
          <StatCard
            icon={Zap}
            label="Live Auctions"
            value={fmt(stats?.activeListings)}
            color="#dc2626"
          />
        </div>
      )}
    </div>
  );
}
