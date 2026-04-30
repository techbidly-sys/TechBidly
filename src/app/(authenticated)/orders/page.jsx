'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight,
  Loader2, Tag, Pencil, X, Check, ShoppingBag, Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

const STATUS_CONFIG = {
  processing: {
    label: 'Processing',
    chip: 'bg-ink-100 text-ink-700',
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

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Buyer view ────────────────────────────────────────────────────────────────

const AUCTION_TABS = [
  { id: 'active', label: 'Active', filter: (o) => o.status !== 'delivered' },
  { id: 'past', label: 'Past', filter: (o) => o.status === 'delivered' },
  { id: 'all', label: 'All', filter: () => true },
];

function BuyerOrders({ orders, marketplaceOrders }) {
  const [section, setSection] = useState('auctions');
  const [tab, setTab] = useState('active');
  const current = AUCTION_TABS.find((t) => t.id === tab);
  const list = orders.filter(current.filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your orders</h1>
        <p className="text-sm text-ink-500 mt-1">Track shipments, auction wins, and marketplace purchases.</p>
      </div>

      {/* Section switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setSection('auctions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
            section === 'auctions'
              ? 'bg-ink-900 text-white border-ink-900'
              : 'border-ink-200 text-ink-600 hover:bg-ink-50'
          }`}
        >
          <Package size={15} /> Auctions
          <span className="text-[11px] opacity-70">{orders.length}</span>
        </button>
        <button
          onClick={() => setSection('marketplace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
            section === 'marketplace'
              ? 'bg-ink-900 text-white border-ink-900'
              : 'border-ink-200 text-ink-600 hover:bg-ink-50'
          }`}
        >
          <Building2 size={15} /> Marketplace
          <span className="text-[11px] opacity-70">{marketplaceOrders.length}</span>
        </button>
      </div>

      {section === 'auctions' ? (
        <>
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
              <div className="font-semibold text-ink-900">No orders here</div>
              <div className="text-sm text-ink-500 mt-1">
                {tab === 'active' ? 'Win an auction and your order will appear here.' : 'No completed orders yet.'}
              </div>
              <Link href="/browse" className="btn-brand mt-4 inline-flex">Browse auctions</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((o) => <BuyerOrderRow key={o.id} order={o} />)}
            </div>
          )}
        </>
      ) : (
        <MarketplaceOrders orders={marketplaceOrders} />
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
          <span className="chip bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={11} /> Confirmed
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
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.processing;

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
          <span className={`chip ${cfg.chip}`}>
            <cfg.Icon size={11} /> {cfg.label}
          </span>
          <span className="text-xs text-ink-400">Order {order.id}</span>
        </div>
        <div className="font-semibold text-ink-900 mt-1 truncate">{order.title}</div>
        <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-3 flex-wrap">
          {order.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {order.location}
            </span>
          )}
          <span>Won {fmt(order.endsAt)}</span>
          {order.trackingNumber && (
            <span className="font-mono text-ink-600">{order.trackingNumber}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold text-ink-900">
          ${order.finalPrice.toLocaleString()}
        </div>
        <div className="text-[11px] text-ink-500">final price</div>
      </div>

      <ChevronRight size={16} className="text-ink-300 shrink-0" />
    </Link>
  );
}

// ── Seller view ───────────────────────────────────────────────────────────────

const SELLER_TABS = [
  { id: 'pending', label: 'Pending', filter: (o) => o.status === 'processing' },
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
      {editingTracking ? (
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
