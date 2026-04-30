'use client';

import { useEffect, useState } from 'react';
import { fetchUserBidForListing } from '@/lib/bids.js';
import {
  Bot,
  Sparkles,
  Gavel,
  TrendingUp,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Activity,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Store,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext.jsx';

const STRATEGIES = [
  {
    id: 'sniper',
    label: 'Sniper',
    icon: Zap,
    desc: 'Bids in the final 90 seconds. Historically wins 18% cheaper.',
    selectedBorder: 'border-brand-500',
    selectedBg: 'bg-brand-50',
    selectedIcon: 'text-brand-600',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: Activity,
    desc: 'Bids at T-1h then again at T-5min if outbid.',
    selectedBorder: 'border-orange-400',
    selectedBg: 'bg-orange-50',
    selectedIcon: 'text-orange-500',
  },
  {
    id: 'conservative',
    label: 'Conservative',
    icon: ShieldCheck,
    desc: 'Bids now and defends lead in real time.',
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50',
    selectedIcon: 'text-emerald-600',
  },
];

// Sniper wins cheaper but is riskier; conservative defends position more reliably.
const STRATEGY_MULTIPLIER = { sniper: 0.82, balanced: 1.0, conservative: 1.18 };

function winProbability(maxBid, currentBid, comparables, strategy = 'balanced') {
  if (maxBid <= currentBid) return 0;
  const median = comparables[Math.floor(comparables.length / 2)];
  if (!median || median <= currentBid) return 0;
  const base = ((maxBid - currentBid) / (median - currentBid)) * 75;
  const adjusted = base * (STRATEGY_MULTIPLIER[strategy] ?? 1.0);
  return Math.min(95, Math.max(2, Math.round(adjusted)));
}

export default function SmartBidAgent({ listing, buyerId, onBidPlaced, auctionEnded = false, auctionResult = null }) {
  const { role } = useAuth();
  const [cardChecked, setCardChecked] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [maxBid, setMaxBid] = useState(Math.round(listing.currentBid * 1.07));
  const [strategy, setStrategy] = useState('sniper');
  const [mode, setMode] = useState('manual'); // manual | setup | armed
  const [showComps, setShowComps] = useState(false);
  const [agentStatus, setAgentStatus] = useState('leading');
  const [manualBid, setManualBid] = useState(listing.currentBid + 5);
  const [placedAmount, setPlacedAmount] = useState(null); // null = not placed
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState('');

  useEffect(() => {
    if (role !== 'buyer') return;
    Promise.all([
      fetch('/api/stripe/payment-methods').then((r) => r.json()).catch(() => ({ methods: [] })),
      fetchUserBidForListing(listing.id, buyerId),
    ]).then(([data, existingBid]) => {
      setHasCard((data.methods ?? []).length > 0);
      if (existingBid !== null) setPlacedAmount(existingBid);
      setCardChecked(true);
    }).catch(() => setCardChecked(true));
  }, [role, listing.id, buyerId]);

  // Simulate agent status ticking while armed
  useEffect(() => {
    if (mode !== 'armed') return;
    const statuses = ['leading', 'monitoring', 'leading'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % statuses.length;
      setAgentStatus(statuses[i]);
    }, 4000);
    return () => clearInterval(id);
  }, [mode]);

  if (role === 'seller') {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-4 flex items-start gap-3">
        <Store size={18} className="text-ink-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-ink-700">Seller account</div>
          <div className="text-xs text-ink-500 mt-0.5">Switch to your buyer account to place bids.</div>
        </div>
      </div>
    );
  }

  if (!cardChecked) {
    return (
      <div className="rounded-xl border border-ink-100 p-4 flex items-center gap-2 text-sm text-ink-500">
        <div className="h-4 w-4 rounded-full border-2 border-brand-400 border-t-transparent animate-spin flex-shrink-0" />
        Checking payment method…
      </div>
    );
  }

  if (!hasCard) {
    return (
      <div className="rounded-xl border-2 border-dashed border-ink-200 p-5 text-center space-y-3">
        <div className="h-11 w-11 rounded-full bg-ink-100 grid place-items-center mx-auto">
          <CreditCard size={20} className="text-ink-500" />
        </div>
        <div>
          <div className="font-semibold text-ink-900">Payment card required</div>
          <div className="text-xs text-ink-500 mt-1 leading-relaxed">
            You need a valid payment card on file before placing bids.
            TechBidly uses it to settle winning bids automatically.
          </div>
        </div>
        <Link
          href="/profile?tab=billing"
          className="btn-brand inline-flex mx-auto"
        >
          <CreditCard size={15} /> Add a payment card
        </Link>
      </div>
    );
  }

  if (auctionEnded) {
    return (
      <div className="rounded-xl bg-ink-50 border border-ink-200 p-4 space-y-2">
        <div className="font-semibold text-ink-900">Auction ended</div>
        <div className="text-sm text-ink-600">
          Final bid: <span className="font-semibold text-ink-900">${Number(auctionResult?.finalBid ?? listing.currentBid).toLocaleString()}</span>
        </div>
        {auctionResult?.winnerDisplay && (
          <div className="text-sm text-ink-600">
            Winner: <span className="font-semibold text-ink-900">{auctionResult.winnerDisplay}</span>
          </div>
        )}
      </div>
    );
  }

  const minNext = listing.currentBid + 5;

  const prob = winProbability(maxBid, listing.currentBid, listing.comparables ?? [], strategy);
  const aiSuggestion = Math.round(listing.comparables?.[1] ?? listing.currentBid * 1.06);

  const armAgent = () => {
    if (maxBid < minNext) return;
    setMode('armed');
    setAgentStatus('leading');
  };

  const placeBid = async (e) => {
    e.preventDefault();
    if (manualBid < minNext) return;
    setBidError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/bids/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, amount: manualBid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to place bid. Please try again.');
      setPlacedAmount(manualBid);
      onBidPlaced?.();
    } catch (err) {
      setBidError(err.message ?? 'Failed to place bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedAmount !== null) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-emerald-800">Your bid is in.</div>
          <div className="text-sm font-bold text-emerald-700">${placedAmount.toLocaleString()}</div>
        </div>
        <div className="text-sm text-emerald-700">
          We'll notify you the moment you're outbid or the auction ends.
        </div>
      </div>
    );
  }

  if (mode === 'armed') {
    return <AgentArmed listing={listing} maxBid={maxBid} strategy={strategy} status={agentStatus} onDisarm={() => setMode('setup')} />;
  }

  return (
    <div className="space-y-4">
      {/* Manual bid */}
      <form onSubmit={placeBid} className="space-y-3">
        <span className="label">Your max bid</span>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
            <input
              type="number"
              value={manualBid}
              min={minNext}
              step={5}
              onChange={(e) => setManualBid(Number(e.target.value))}
              className="input pl-7 text-lg font-semibold"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || manualBid < minNext}
            className="btn-brand h-[46px] px-5 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Gavel size={16} /> {submitting ? 'Placing…' : 'Place bid'}
          </button>
        </div>
        {bidError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {bidError}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>Min next bid: <b className="text-ink-900">${minNext}</b></span>
          <button
            type="button"
            onClick={() => { setManualBid(aiSuggestion); setMaxBid(aiSuggestion); }}
            className="inline-flex items-center gap-1 text-brand-700 font-semibold hover:underline"
          >
            <Sparkles size={12} /> AI suggests ${aiSuggestion.toLocaleString()}
          </button>
        </div>
      </form>

      {/* Smart Agent toggle */}
      <div className="rounded-2xl border border-ink-100 overflow-hidden">
        <button
          onClick={() => setMode(mode === 'setup' ? 'manual' : 'setup')}
          className="w-full flex items-center justify-between px-4 py-3 bg-mesh-1 hover:opacity-95 transition"
        >
          <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
            <Bot size={16} />
            Smart Bid Agent
            <span className="chip bg-brand-100 text-brand-700 text-[10px] py-0.5">NEW</span>
          </div>
          {mode === 'setup'
            ? <ToggleRight size={22} className="text-brand-600" />
            : <ToggleLeft size={22} className="text-ink-400" />}
        </button>

        {mode === 'setup' && (
          <div className="p-4 border-t border-ink-100 space-y-4">
            <p className="text-xs text-ink-600 leading-relaxed">
              Set a max bid and choose a strategy. The agent bids automatically at the optimal moment so you don't have to watch the clock.
            </p>

            {/* Strategy picker */}
            <div>
              <span className="label">Strategy</span>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGIES.map(({ id, label, icon: Icon, desc, selectedBorder, selectedBg, selectedIcon }) => {
                  const isSelected = strategy === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStrategy(id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? `${selectedBorder} ${selectedBg}`
                          : 'border-ink-200 hover:border-ink-300 bg-white'
                      }`}
                    >
                      <Icon size={16} className={`mb-1.5 ${isSelected ? selectedIcon : 'text-ink-500'}`} />
                      <div className={`text-xs font-semibold ${isSelected ? 'text-ink-900' : 'text-ink-700'}`}>{label}</div>
                      <div className="text-[10px] text-ink-500 mt-0.5 leading-tight">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max bid + win probability */}
            <div>
              <span className="label">Agent max bid</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                <input
                  type="number"
                  value={maxBid}
                  min={minNext}
                  step={5}
                  onChange={(e) => setMaxBid(Number(e.target.value))}
                  className="input pl-7 font-semibold"
                />
              </div>
              <WinProbBar prob={prob} />
            </div>

            {/* Comparables toggle */}
            <button
              type="button"
              onClick={() => setShowComps((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
            >
              <TrendingUp size={13} />
              {showComps ? 'Hide' : 'Show'} comparable closes
              {showComps ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showComps && <ComparableCloses listing={listing} />}

            <button
              type="button"
              onClick={armAgent}
              disabled={maxBid < minNext}
              className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bot size={16} /> Bid with agent · ${maxBid.toLocaleString()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WinProbBar({ prob }) {
  const color =
    prob >= 70 ? 'bg-emerald-500' : prob >= 40 ? 'bg-brand-500' : 'bg-amber-400';
  const label =
    prob >= 70 ? 'High' : prob >= 40 ? 'Moderate' : 'Low';

  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] text-ink-500 mb-1">
        <span>Estimated win probability</span>
        <span className="font-semibold text-ink-900">{prob}% · {label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${prob}%` }}
        />
      </div>
    </div>
  );
}

function ComparableCloses({ listing }) {
  const comps = listing.comparables ?? [];
  if (comps.length === 0) return null;
  const max = Math.max(...comps);
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
        Last {comps.length} comparable closes
      </div>
      <div className="space-y-1.5">
        {comps.map((price, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-xs text-ink-500 w-4">{i + 1}</div>
            <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-500"
                style={{ width: `${(price / max) * 100}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-ink-900 w-16 text-right">
              ${price.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-ink-400">
        Median close: ${comps[Math.floor(comps.length / 2)].toLocaleString()} · AI suggested max: ${Math.round(comps[1] ?? listing.currentBid * 1.06).toLocaleString()}
      </div>
    </div>
  );
}

function AgentArmed({ listing, maxBid, strategy, status, onDisarm }) {
  const strat = STRATEGIES.find((s) => s.id === strategy);
  const Icon = strat?.icon ?? Bot;
  const nextAction = {
    sniper: 'Watching… will bid at T-90 seconds',
    balanced: 'Bid placed · will re-bid at T-5min if outbid',
    conservative: 'Leading bid held · defending in real time',
  }[strategy];

  const statusCfg = {
    leading: { label: 'Leading', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    outbid: { label: 'Outbid — responding', color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' },
    monitoring: { label: 'Monitoring', color: 'text-brand-600', bg: 'bg-brand-50', dot: 'bg-brand-500' },
  }[status] ?? { label: status, color: 'text-ink-700', bg: 'bg-ink-50', dot: 'bg-ink-400' };

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 overflow-hidden">
      {/* Agent header */}
      <div className="px-4 py-3 bg-mesh-1 border-b border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-brand-700">
          <div className="relative">
            <Bot size={18} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          Smart Bid Agent · Armed
        </div>
        <span className={`chip text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
          {statusCfg.label}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <AgentStat
            icon={Gavel}
            label="Max bid"
            value={`$${maxBid.toLocaleString()}`}
          />
          <AgentStat
            icon={Icon}
            label="Strategy"
            value={strat?.label ?? strategy}
          />
        </div>

        <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5 flex items-center gap-2">
          <Clock size={14} className="text-brand-500 shrink-0" />
          <span className="text-xs text-ink-700">{nextAction}</span>
        </div>

        <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span className="text-xs text-ink-700">
            You'll be notified immediately if outbid beyond your max.
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-ink-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          Agent active — do not place manual bids while armed.
        </div>

        <button
          onClick={onDisarm}
          className="btn-outline w-full text-xs"
        >
          Disarm agent
        </button>
      </div>
    </div>
  );
}

function AgentStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-500 mb-1">
        <Icon size={12} /> {label}
      </div>
      <div className="font-semibold text-ink-900 text-sm">{value}</div>
    </div>
  );
}
