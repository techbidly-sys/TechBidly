import { useState } from 'react';
import { MapPin, Package, ChevronRight, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { orders } from '../data/mockData.js';

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

const ACTIVE = ['Awaiting Payment', 'Shipped', 'Processing'];

export default function Orders() {
  const [tab, setTab] = useState('active');
  const list = orders.filter((o) =>
    tab === 'all' ? true : tab === 'active' ? ACTIVE.includes(o.status) : o.status === 'Delivered'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your orders</h1>
        <p className="text-sm text-ink-500 mt-1">Track shipments, payments, and history.</p>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-100">
        {TABS.map((t) => (
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
            <span className="ml-2 text-[11px] text-ink-400">
              {orders.filter((o) =>
                t.id === 'all' ? true : t.id === 'active' ? ACTIVE.includes(o.status) : o.status === 'Delivered'
              ).length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={28} className="mx-auto text-ink-400" />
          <div className="font-semibold text-ink-900 mt-3">No orders yet</div>
          <div className="text-sm text-ink-500">Your won auctions will show up here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }) {
  const tone = {
    Shipped: 'bg-brand-50 text-brand-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    'Awaiting Payment': 'bg-amber-50 text-amber-700',
    Processing: 'bg-ink-100 text-ink-700',
  }[order.status];

  const Icon = order.status === 'Delivered' ? CheckCircle2 : order.status === 'Shipped' ? Truck : Clock;

  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-glow transition cursor-pointer">
      <div className="h-16 w-16 rounded-xl bg-ink-100 overflow-hidden shrink-0">
        <img src={order.image} alt={order.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`chip ${tone}`}><Icon size={12} /> {order.status}</span>
          <span className="text-xs text-ink-400">Order {order.id}</span>
        </div>
        <div className="font-semibold text-ink-900 mt-1 truncate">{order.title}</div>
        <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin size={12}/> {order.sellerLocation}</span>
          <span>Placed {order.placedAt}</span>
          {order.expected !== '—' && <span>Expected {order.expected}</span>}
          {order.tracking && <span className="font-mono text-ink-600">{order.tracking}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-xl font-bold text-ink-900">${order.finalPrice.toLocaleString()}</div>
        <div className="text-[11px] text-ink-500">final price</div>
      </div>
      <ChevronRight size={18} className="text-ink-400" />
    </div>
  );
}
