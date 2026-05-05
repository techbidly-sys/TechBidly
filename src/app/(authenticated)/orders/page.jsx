'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight,
  Loader2, Tag, Pencil, X, Check, ShoppingBag, Building2, XCircle, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

function fmtUSD(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function fmtK(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

const PERIODS = [
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: 'all', label: 'All', days: null },
];

const STATUS_CONFIG = {
  paid: {
    label: 'Awaiting shipment',
    chip: 'bg-amber-50 text-amber-700',
    Icon: Clock,
  },
  payment_pending: {
    label: 'Payment pending',
    chip: 'bg-amber-50 text-amber-700',
    Icon: Clock,
  },
  payment_failed: {
    label: 'Payment failed',
    chip: 'bg-rose-50 text-rose-700',
    Icon: XCircle,
  },
  processing: {
    label: 'Awaiting shipment',
    chip: 'bg-amber-50 text-amber-700',
    Icon: Clock,
  },
  shipped: {
    label: 'Shipped',
    chip: 'bg-brand-50 text-brand-700',
    Icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    chip: 'bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
  },
};

const MKT_STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmed',
    chip: 'bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
  },
  pending_payment: {
    label: 'Payment pending',
    chip: 'bg-amber-50 text-amber-700',
    Icon: Clock,
  },
  failed: {
    label: 'Payment failed',
    chip: 'bg-rose-50 text-rose-700',
    Icon: AlertCircle,
  },
};

const BID_STATUS_CONFIG = {
  highest_bidder: { label: 'Highest bidder', chip: 'bg-emerald-50 text-emerald-700' },
  outbid: { label: 'Outbid', chip: 'bg-red-50 text-red-700' },
  won: { label: 'Won', chip: 'bg-emerald-50 text-emerald-700' },
  shipped: { label: 'Shipped', chip: 'bg-emerald-50 text-emerald-700' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Buyer view ────────────────────────────────────────────────────────────────

const AUCTION_TABS = [
  { id: 'open', label: 'Open', filter: (o) => o.listingStatus === 'open' },
  { id: 'closed', label: 'Closed', filter: (o) => o.listingStatus === 'closed' },
  { id: 'all', label: 'All', filter: () => true },
];

function BuyerOrders({ orders, marketplaceOrders }) {
  const [tab, setTab] = useState('open');
  const current = AUCTION_TABS.find((t) => t.id === tab);
  const list = orders.filter(current.filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your orders</h1>
        <p className="text-sm text-ink-500 mt-1">Every auction you bid on, with live position and close outcome.</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="chip bg-ink-900 text-white">
          <Package size={12} /> Orders
        </span>
        <span className="text-ink-500">{orders.length} auction{orders.length === 1 ? '' : 's'}</span>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-100">
        {AUCTION_TABS.map((t) => {
          const count = orders.filter(t.filter).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-ink-900 text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              {t.label}
              <span className="ml-2 text-[11px] text-ink-400">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={28} className="mx-auto text-ink-300 mb-3" />
          <div className="font-semibold text-ink-900">No auctions in this view</div>
          <div className="text-sm text-ink-500 mt-1">
            {tab === 'open' ? 'Place bids on active auctions to see them here.' : 'No closed auctions in this view yet.'}
          </div>
          <Link href="/browse" className="btn-brand mt-4 inline-flex">Browse auctions</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => <BuyerOrderRow key={o.id} order={o} />)}
        </div>
      )}

      {marketplaceOrders.length > 0 && (
        <div className="pt-2">
          <div className="text-sm font-semibold text-ink-700 mb-2">Marketplace purchases</div>
          <MarketplaceOrders orders={marketplaceOrders} />
        </div>
      )}
    </div>
  );
}

function MarketplaceOrders({ orders }) {
  if (orders.length === 0) {
    return (
      <div className="card p-12 text-center">
        <ShoppingBag size={28} className="mx-auto text-ink-300 mb-3" />
        <div className="font-semibold text-ink-900">No marketplace purchases yet</div>
        <div className="text-sm text-ink-500 mt-1">Browse the marketplace to buy items at fixed prices.</div>
        <Link href="/marketplace" className="btn-brand mt-4 inline-flex">Go to marketplace</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => <MarketplaceOrderRow key={o.id} order={o} />)}
    </div>
  );
}

function MarketplaceOrderRow({ order }) {
  const mktCfg = MKT_STATUS_CONFIG[order.status] ?? MKT_STATUS_CONFIG.confirmed;
  const MktIcon = mktCfg.Icon;

  return (
    <Link
      href={`/marketplace/${order.itemId}`}
      className="card p-4 flex items-center gap-4 hover:shadow-glow transition"
    >
      <div className="h-16 w-16 rounded-xl bg-ink-100 overflow-hidden shrink-0">
        {order.image ? (
          <img src={order.image} alt={order.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <ShoppingBag size={20} className="text-ink-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`chip ${mktCfg.chip}`}>
            <MktIcon size={11} /> {mktCfg.label}
          </span>
          {order.quantity > 1 && (
            <span className="chip bg-brand-50 text-brand-700">
              <Building2 size={11} /> {order.quantity} units
            </span>
          )}
          <span className="text-xs text-ink-400">{order.id}</span>
        </div>
        <div className="font-semibold text-ink-900 mt-1 truncate">{order.title}</div>
        <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-3 flex-wrap">
          {order.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {order.location}
            </span>
          )}
          <span>Purchased {fmt(order.createdAt)}</span>
          {order.quantity > 1 && (
            <span>${order.unitPrice.toLocaleString()} / unit</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold text-ink-900">
          ${order.totalPrice.toLocaleString()}
        </div>
        <div className="text-[11px] text-ink-500">{order.quantity > 1 ? 'total' : 'fixed price'}</div>
      </div>

      <ChevronRight size={16} className="text-ink-300 shrink-0" />
    </Link>
  );
}

function BuyerOrderRow({ order }) {
  const bidCfg = BID_STATUS_CONFIG[order.bidStatus] ?? BID_STATUS_CONFIG.outbid;

  return (
    <Link
      href={`/listing/${order.listingId}`}
      className="card p-4 flex items-center gap-4 hover:shadow-glow transition"
    >
      <div className="h-16 w-16 rounded-xl bg-ink-100 overflow-hidden shrink-0">
        {order.image ? (
          <img src={order.image} alt={order.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <Package size={20} className="text-ink-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`chip ${order.listingStatus === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-700'}`}>
            {order.listingStatus === 'open' ? 'Open' : 'Closed'}
          </span>
          <span className={`chip ${bidCfg.chip}`}>
            {bidCfg.label}
          </span>
          <span className="text-xs text-ink-400">Auction {order.id}</span>
        </div>
        <div className="font-semibold text-ink-900 mt-1 truncate">{order.title}</div>
        <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-3 flex-wrap">
          {order.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {order.location}
            </span>
          )}
          <span>{order.listingStatus === 'open' ? 'Ends' : 'Closed'} {fmt(order.endsAt)}</span>
          <span>Your max: ${Number(order.yourBid ?? 0).toLocaleString()}</span>
          <span>{order.listingStatus === 'open' ? 'Current' : 'Final'}: ${Number(order.finalBid ?? order.finalPrice ?? 0).toLocaleString()}</span>
          {order.trackingNumber && order.bidStatus === 'shipped' && (
            <span className="font-mono text-ink-600">{order.trackingNumber}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold text-ink-900">
          ${Number(order.finalBid ?? order.finalPrice).toLocaleString()}
        </div>
        <div className="text-[11px] text-ink-500">{order.listingStatus === 'open' ? 'current top bid' : 'closing bid'}</div>
      </div>

      <ChevronRight size={16} className="text-ink-300 shrink-0" />
    </Link>
  );
}

// ── Cumulative revenue chart ──────────────────────────────────────────────────

function CumulativeRevenueChart({ orders }) {
  const [period, setPeriod] = useState('1M');
  const [hovered, setHovered] = useState(null);

  const now = useMemo(() => new Date(), []);

  const { points, periodTotal, allTotal, saleDots } = useMemo(() => {
    const periodDef = PERIODS.find((p) => p.id === period);

    const valid = orders
      .filter((o) => o.endsAt && new Date(o.endsAt) <= now && o.finalPrice > 0)
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));

    let periodOrders = valid;
    let startDate;

    if (periodDef.days) {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - periodDef.days);
      periodOrders = valid.filter((o) => new Date(o.endsAt) >= cutoff);
      startDate = cutoff;
    } else {
      startDate = valid.length > 0
        ? new Date(new Date(valid[0].endsAt).getTime() - 86_400_000 * 3)
        : new Date(now.getTime() - 86_400_000 * 7);
    }

    let cum = 0;
    const pts = [{ date: startDate, value: 0, order: null }];
    for (const o of periodOrders) {
      cum += o.finalPrice;
      pts.push({ date: new Date(o.endsAt), value: cum, order: o });
    }
    pts.push({ date: now, value: cum, order: null });

    const dots = pts.filter((p) => p.order !== null);
    const total = valid.reduce((s, o) => s + o.finalPrice, 0);

    return { points: pts, periodTotal: cum, allTotal: total, saleDots: dots };
  }, [orders, period, now]);

  const W = 600, H = 180;
  const PAD = { top: 12, right: 16, bottom: 28, left: 62 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  const minT = points[0]?.date.getTime() ?? 0;
  const maxT = points[points.length - 1]?.date.getTime() ?? 1;
  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const tRange = maxT - minT || 1;

  const toX = (d) => PAD.left + ((d.getTime() - minT) / tRange) * IW;
  const toY = (v) => PAD.top + IH - (v / maxVal) * IH;

  const ptStr = points.map((p) => `${toX(p.date).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ');
  const area = [
    `M${toX(points[0].date).toFixed(1)},${(PAD.top + IH).toFixed(1)}`,
    ...points.map((p) => `L${toX(p.date).toFixed(1)},${toY(p.value).toFixed(1)}`),
    `L${toX(points[points.length - 1].date).toFixed(1)},${(PAD.top + IH).toFixed(1)}Z`,
  ].join('');

  const yTicks = [0, 0.5, 1];
  const xTickCount = 3;

  const bestSale = saleDots.length > 1 ? Math.max(...saleDots.map((p) => p.order.finalPrice)) : null;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-400 uppercase tracking-wide">Cumulative Revenue</p>
          <p className="text-2xl font-bold text-ink-900">{fmtUSD(periodTotal)}</p>
          {allTotal !== periodTotal && (
            <p className="text-xs text-ink-400 mt-0.5">{fmtUSD(allTotal)} total all time</p>
          )}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                period === p.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          style={{ height: H }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map((frac) => {
            const y = PAD.top + IH * (1 - frac);
            return (
              <g key={frac}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                <text x={PAD.left - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">
                  {fmtK(maxVal * frac)}
                </text>
              </g>
            );
          })}

          {Array.from({ length: xTickCount + 1 }, (_, i) => {
            const frac = i / xTickCount;
            const d = new Date(minT + tRange * frac);
            const x = PAD.left + frac * IW;
            return (
              <text
                key={i} x={x.toFixed(1)} y={H - 4}
                textAnchor={i === 0 ? 'start' : i === xTickCount ? 'end' : 'middle'}
                fontSize="9" fill="#9ca3af"
              >
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}

          {periodTotal > 0 && (
            <>
              <path d={area} fill="url(#rev-fill)" />
              <polyline points={ptStr} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

          {saleDots.map((p, i) => {
            const cx = toX(p.date);
            const cy = toY(p.value);
            const isHov = hovered === i;
            const tipW = 130, tipH = 52, tipPad = 12;
            const tx = Math.min(Math.max(cx - tipW / 2, PAD.left), W - PAD.right - tipW);
            const ty = cy - tipH - tipPad < PAD.top ? cy + tipPad : cy - tipH - tipPad;
            return (
              <g key={i}>
                {isHov && <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="10" fill="#7c3aed" fillOpacity="0.12" />}
                <circle
                  cx={cx.toFixed(1)} cy={cy.toFixed(1)}
                  r={isHov ? '5.5' : '4'}
                  fill="white" stroke="#7c3aed"
                  strokeWidth={isHov ? '2.5' : '2'}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(i)}
                />
                {isHov && (
                  <g>
                    <rect x={tx} y={ty} width={tipW} height={tipH} rx="7"
                      fill="white" stroke="#e5e7eb" strokeWidth="1"
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))' }}
                    />
                    <text x={tx + tipW / 2} y={ty + 17} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">
                      {fmtUSD(p.order.finalPrice)}
                    </text>
                    <text x={tx + tipW / 2} y={ty + 32} textAnchor="middle" fontSize="9.5" fill="#6b7280">
                      {p.order.title.length > 18 ? `${p.order.title.slice(0, 18)}…` : p.order.title}
                    </text>
                    <text x={tx + tipW / 2} y={ty + 45} textAnchor="middle" fontSize="9" fill="#9ca3af">
                      {new Date(p.order.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {periodTotal === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-ink-400 text-sm">No sales in this period</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 pt-2 border-t border-ink-50 text-xs text-ink-500">
        <span>
          <span className="font-semibold text-ink-700">{saleDots.length}</span>{' '}
          sale{saleDots.length !== 1 ? 's' : ''}
        </span>
        {saleDots.length > 0 && (
          <span>
            Avg <span className="font-semibold text-ink-700">{fmtUSD(periodTotal / saleDots.length)}</span> per sale
          </span>
        )}
        {bestSale !== null && (
          <span>
            Best <span className="font-semibold text-ink-700">{fmtUSD(bestSale)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Seller view ───────────────────────────────────────────────────────────────

const SELLER_TABS = [
  { id: 'pending', label: 'Pending', filter: (o) => ['paid', 'payment_pending', 'processing'].includes(o.status) },
  { id: 'shipped', label: 'Shipped', filter: (o) => o.status === 'shipped' },
  { id: 'completed', label: 'Completed', filter: (o) => o.status === 'delivered' },
  { id: 'all', label: 'All', filter: () => true },
];

function SellerOrders({ orders: initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState('pending');
  const current = SELLER_TABS.find((t) => t.id === tab);
  const list = orders.filter(current.filter);

  const handleTrackingUpdate = (listingId, updates) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.listingId === listingId ? { ...o, ...updates } : o
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your sales</h1>
        <p className="text-sm text-ink-500 mt-1">Manage shipments for your sold auctions.</p>
      </div>

      <CumulativeRevenueChart orders={orders} />

      <div className="flex items-center gap-2 border-b border-ink-100">
        {SELLER_TABS.map((t) => {
          const count = orders.filter(t.filter).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-ink-900 text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              {t.label}
              <span className="ml-2 text-[11px] text-ink-400">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={28} className="mx-auto text-ink-300 mb-3" />
          <div className="font-semibold text-ink-900">No sales here</div>
          <div className="text-sm text-ink-500 mt-1">
            {tab === 'pending'
              ? 'When an auction ends, your sold items appear here.'
              : 'Nothing in this category yet.'}
          </div>
          <Link href="/sell" className="btn-brand mt-4 inline-flex">Create a listing</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <SellerOrderRow key={o.id} order={o} onUpdate={handleTrackingUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerOrderRow({ order, onUpdate }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.processing;
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingInput, setTrackingInput] = useState(order.trackingNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveTracking = async () => {
    setSaving(true);
    setError('');
    try {
      const newStatus = trackingInput.trim() ? 'shipped' : order.status;
      const res = await fetch(`/api/orders/${order.listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: trackingInput.trim(),
          status: newStatus,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to save');
      }
      onUpdate(order.listingId, {
        trackingNumber: trackingInput.trim() || null,
        status: newStatus,
      });
      setEditingTracking(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-ink-100 overflow-hidden shrink-0">
          {order.image ? (
            <img src={order.image} alt={order.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <Package size={20} className="text-ink-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`chip ${cfg.chip}`}>
              <cfg.Icon size={11} /> {cfg.label}
            </span>
            <span className="text-xs text-ink-400">Order {order.id}</span>
          </div>
          <div className="font-semibold text-ink-900 mt-1 truncate">{order.title}</div>
          <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>Buyer: <span className="font-medium text-ink-700">{order.buyerHandle}</span></span>
            <span>Sold {fmt(order.endsAt)}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-display text-xl font-bold text-ink-900">
            ${order.finalPrice.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-500">winning bid</div>
        </div>
      </div>

      {/* Tracking section */}
      {['payment_pending', 'payment_failed'].includes(order.status) ? null : editingTracking ? (
        <div className="border-t border-ink-100 pt-3 space-y-2">
          <label className="label">Tracking number</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="e.g. 1Z999AA10123456784"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              autoFocus
            />
            <button
              onClick={saveTracking}
              disabled={saving}
              className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button
              onClick={() => { setEditingTracking(false); setTrackingInput(order.trackingNumber ?? ''); setError(''); }}
              className="btn-ghost h-9 w-9 p-0"
            >
              <X size={14} />
            </button>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <p className="text-xs text-ink-400">
            Adding a tracking number will mark this order as Shipped.
          </p>
        </div>
      ) : (
        <div className="border-t border-ink-100 pt-3 flex items-center justify-between">
          {order.trackingNumber ? (
            <span className="text-xs font-mono text-ink-700 bg-ink-50 rounded-lg px-2 py-1">
              {order.trackingNumber}
            </span>
          ) : (
            <span className="text-xs text-ink-400">No tracking number yet</span>
          )}
          {order.status !== 'delivered' && (
            <button
              onClick={() => setEditingTracking(true)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Pencil size={11} />
              {order.trackingNumber ? 'Update tracking' : 'Add tracking'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { profile, role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [dataRole, setDataRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to load orders');
      const json = await res.json();
      setOrders(json.orders ?? []);
      setMarketplaceOrders(json.marketplaceOrders ?? []);
      setDataRole(json.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-ink-500">
        <Loader2 size={18} className="animate-spin" />
        <span>Loading orders…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button onClick={load} className="btn-outline mt-4">Try again</button>
      </div>
    );
  }

  if (dataRole === 'seller') return <SellerOrders orders={orders} />;
  return <BuyerOrders orders={orders} marketplaceOrders={marketplaceOrders} />;
}
