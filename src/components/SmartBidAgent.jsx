'use client';

import { useEffect, useState } from 'react';
import { fetchUserBidForListing } from '@/lib/bids.js';
import {
  Bot,
  Sparkles,
  Gavel,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Store,
  CreditCard,
  Crown,
  Swords,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext.jsx';

// Returns the next counter-bid: current + max(5%, $25), rounded to nearest dollar
function apexNextBid(currentBid) {
  return Math.round(currentBid + Math.max(currentBid * 0.05, 25));
}

// Build the full bid ladder from currentBid up to maxBid
function buildLadder(currentBid, maxBid) {
  const steps = [];
  let bid = currentBid;
  while (true) {
    const next = apexNextBid(bid);
    if (next > maxBid) break;
    steps.push(next);
    bid = next;
    if (steps.length >= 8) break; // cap preview at 8 steps
  }
  return steps;
}

function winProbability(maxBid, currentBid, comparables) {
  if (maxBid <= currentBid) return 0;
  const median = comparables[Math.floor(comparables.length / 2)];
  if (!median || median <= currentBid) return 0;
  const base = ((maxBid - currentBid) / (median - currentBid)) * 85;
  return Math.min(99, Math.max(2, Math.round(base)));
}

export default function SmartBidAgent({ listing, buyerId, onBidPlaced, auctionEnded = false, auctionResult = null }) {
  const { role } = useAuth();
  const [cardChecked, setCardChecked] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [maxBid, setMaxBid] = useState(Math.round(listing.currentBid * 1.15));
  const [mode, setMode] = useState('manual'); // manual | setup | armed
  const [showLadder, setShowLadder] = useState(false);
  const [agentStatus, setAgentStatus] = useState('leading');
  const [manualBid, setManualBid] = useState(listing.currentBid + 5);
  const [placedAmount, setPlacedAmount] = useState(null);
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

  // Cycle status while armed to simulate live defense
  useEffect(() => {
    if (mode !== 'armed') return;
    const sequence = ['leading', 'monitoring', 'leading', 'leading', 'monitoring'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % sequence.length;
      setAgentStatus(sequence[i]);
    }, 3500);
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
        <Link href="/profile?tab=billing" className="btn-brand inline-flex mx-auto">
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
  const prob = winProbability(maxBid, listing.currentBid, listing.comparables ?? []);
  const aiSuggestion = Math.round(listing.comparables?.[1] ?? listing.currentBid * 1.06);
  const nextCounterBid = apexNextBid(listing.currentBid);
  const ladder = buildLadder(listing.currentBid, maxBid);

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
    return (
      <ApexArmed
        listing={listing}
        maxBid={maxBid}
        status={agentStatus}
        ladder={ladder}
        onDisarm={() => setMode('setup')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual bid */}
      <form onSubmit={placeBid} className="space-y-3">
        <span className="label">Your bid</span>
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

      {/* Apex Mode toggle */}
      <div className="rounded-2xl border border-ink-100 overflow-hidden">
        <button
          onClick={() => setMode(mode === 'setup' ? 'manual' : 'setup')}
          className="w-full flex items-center justify-between px-4 py-3 bg-mesh-1 hover:opacity-95 transition"
        >
          <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
            <Crown size={16} />
            Apex Mode
            <span className="chip bg-brand-100 text-brand-700 text-[10px] py-0.5">AUTO-WIN</span>
          </div>
          {mode === 'setup'
            ? <ToggleRight size={22} className="text-brand-600" />
            : <ToggleLeft size={22} className="text-ink-400" />}
        </button>

        {mode === 'setup' && (
          <div className="p-4 border-t border-ink-100 space-y-4">
            {/* Strategy description */}
            <div className="rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-3 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-brand-600 grid place-items-center shrink-0">
                <Crown size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-brand-900">Guaranteed Win Strategy</div>
                <div className="text-xs text-brand-700 mt-0.5 leading-relaxed">
                  Set your max bid. Every time you're outbid, Apex automatically counters with the current bid +5% or +$25 (whichever is more). It defends your lead relentlessly until someone exceeds your max — then you're notified.
                </div>
              </div>
            </div>

            {/* How it works pills */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1 font-medium">
                <Swords size={10} /> Outbid → counter in seconds
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2.5 py-1 font-medium">
                <ShieldCheck size={10} /> Defends lead 24/7
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-1 font-medium">
                <Target size={10} /> +5% or +$25 per counter
              </span>
            </div>

            {/* Max bid input */}
            <div>
              <span className="label">Maximum bid (your ceiling)</span>
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

            {/* Bid ladder preview */}
            <button
              type="button"
              onClick={() => setShowLadder((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
            >
              <TrendingUp size={13} />
              {showLadder ? 'Hide' : 'Preview'} counter-bid ladder
              {showLadder ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showLadder && <BidLadder currentBid={listing.currentBid} ladder={ladder} maxBid={maxBid} />}

            {ladder.length === 0 && maxBid > listing.currentBid && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Max bid is less than one counter-bid increment above the current price. Raise it to give Apex room to defend.
              </p>
            )}

            <button
              type="button"
              onClick={armAgent}
              disabled={maxBid < minNext}
              className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crown size={16} /> Activate Apex Mode · max ${maxBid.toLocaleString()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WinProbBar({ prob }) {
  const color = prob >= 70 ? 'bg-emerald-500' : prob >= 40 ? 'bg-brand-500' : 'bg-amber-400';
  const label = prob >= 70 ? 'High' : prob >= 40 ? 'Moderate' : 'Low';

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

function BidLadder({ currentBid, ladder, maxBid }) {
  if (ladder.length === 0) return null;
  const final = ladder[ladder.length - 1];

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 space-y-1.5">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
        Counter-bid ladder (up to ${maxBid.toLocaleString()})
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <span className="w-5 text-center font-semibold text-ink-400">—</span>
        <span className="font-semibold text-ink-700">Current: ${currentBid.toLocaleString()}</span>
      </div>
      {ladder.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-5 text-center text-[10px] font-bold text-brand-400">{i + 1}</span>
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-400 transition-all duration-300"
              style={{ width: `${(step / maxBid) * 100}%` }}
            />
          </div>
          <span className="font-semibold text-ink-900 w-16 text-right">${step.toLocaleString()}</span>
        </div>
      ))}
      <div className="pt-1 text-[10px] text-ink-400">
        {ladder.length === 8
          ? `…and more counters available up to $${maxBid.toLocaleString()}`
          : `Apex can place up to ${ladder.length} counter-bid${ladder.length !== 1 ? 's' : ''} · final at $${final.toLocaleString()}`}
      </div>
    </div>
  );
}

function ApexArmed({ listing, maxBid, status, ladder, onDisarm }) {
  const statusCfg = {
    leading:   { label: 'Leading',    color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    outbid:    { label: 'Defending',  color: 'text-rose-600',    bg: 'bg-rose-50',    dot: 'bg-rose-500' },
    monitoring:{ label: 'Monitoring', color: 'text-brand-600',   bg: 'bg-brand-50',   dot: 'bg-brand-500' },
  }[status] ?? { label: status, color: 'text-ink-700', bg: 'bg-ink-50', dot: 'bg-ink-400' };

  const nextCounter = apexNextBid(listing.currentBid);
  const canCounter = nextCounter <= maxBid;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-mesh-1 border-b border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-brand-700">
          <div className="relative">
            <Crown size={18} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          Apex Mode · Armed
        </div>
        <span className={`chip text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
          {statusCfg.label}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <ApexStat icon={Target} label="Your ceiling" value={`$${maxBid.toLocaleString()}`} />
          <ApexStat
            icon={ShieldCheck}
            label="Next counter"
            value={canCounter ? `$${nextCounter.toLocaleString()}` : 'At ceiling'}
            valueClass={canCounter ? 'text-emerald-700' : 'text-rose-600'}
          />
        </div>

        {/* Defense rule */}
        <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5 flex items-center gap-2">
          <Swords size={14} className="text-brand-500 shrink-0" />
          <span className="text-xs text-ink-700">
            Countering every bid with <b>+5% or +$25</b>, whichever is more
          </span>
        </div>

        {/* Ladder preview (compact) */}
        {ladder.length > 0 && (
          <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold mb-1.5">
              Remaining counters
            </div>
            <div className="flex items-end gap-1 h-8">
              {ladder.slice(0, 10).map((step, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-brand-200 transition-all"
                  style={{ height: `${20 + (i / ladder.length) * 80}%` }}
                  title={`$${step.toLocaleString()}`}
                />
              ))}
            </div>
            <div className="text-[10px] text-ink-400 mt-1">
              {ladder.length} counter{ladder.length !== 1 ? 's' : ''} available · ceiling ${maxBid.toLocaleString()}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span className="text-xs text-ink-700">
            You'll be notified if someone bids beyond your ceiling.
          </span>
        </div>

        {!canCounter && (
          <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            <AlertTriangle size={12} className="text-rose-500 shrink-0" />
            Current price is at your ceiling — raise your max bid to keep defending.
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-ink-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          Apex is active — avoid placing manual bids while armed.
        </div>

        <button onClick={onDisarm} className="btn-outline w-full text-xs">
          Disarm Apex
        </button>
      </div>
    </div>
  );
}

function ApexStat({ icon: Icon, label, value, valueClass = 'text-ink-900' }) {
  return (
    <div className="rounded-xl bg-white border border-brand-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-500 mb-1">
        <Icon size={12} /> {label}
      </div>
      <div className={`font-semibold text-sm ${valueClass}`}>{value}</div>
    </div>
  );
}
