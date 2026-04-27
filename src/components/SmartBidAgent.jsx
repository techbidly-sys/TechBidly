import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { insertBid } from '../lib/bids.js';

const STRATEGIES = [
  {
    id: 'sniper',
    label: 'Sniper',
    icon: Zap,
    desc: 'Bids in the final 90 seconds. Historically wins 18% cheaper.',
    color: 'brand',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: Activity,
    desc: 'Bids at T-1h then again at T-5min if outbid.',
    color: 'accent',
  },
  {
    id: 'conservative',
    label: 'Conservative',
    icon: ShieldCheck,
    desc: 'Bids now and defends lead in real time.',
    color: 'emerald',
  },
];

function winProbability(maxBid, currentBid, comparables) {
  if (maxBid <= currentBid) return 0;
  const median = comparables[Math.floor(comparables.length / 2)];
  const raw = ((maxBid - currentBid) / (median - currentBid)) * 75;
  return Math.min(95, Math.max(2, Math.round(raw)));
}

export default function SmartBidAgent({ listing, buyerId, onBidPlaced }) {
  const minNext = listing.currentBid + 5;
  const [maxBid, setMaxBid] = useState(Math.round(listing.currentBid * 1.07));
  const [strategy, setStrategy] = useState('sniper');
  const [mode, setMode] = useState('manual'); // manual | setup | armed
  const [showComps, setShowComps] = useState(false);
  const [agentStatus, setAgentStatus] = useState('leading');
  const [manualBid, setManualBid] = useState(minNext);
  const [placed, setPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState('');

  const prob = winProbability(maxBid, listing.currentBid, listing.comparables ?? []);
  const aiSuggestion = Math.round(listing.comparables?.[1] ?? listing.currentBid * 1.06);

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

  const armAgent = () => {
    if (maxBid < minNext) return;
    setMode('armed');
    setAgentStatus('leading');
  };

  const placeBid = async (e) => {
    e.preventDefault();
    if (manualBid < minNext || !buyerId) return;
    setBidError('');
    setSubmitting(true);
    try {
      await insertBid(listing.id, buyerId, manualBid);
      setPlaced(true);
      onBidPlaced?.();
    } catch (err) {
      setBidError(err.message ?? 'Failed to place bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
        <div className="font-semibold text-emerald-800">Your bid is in.</div>
        <div className="text-sm text-emerald-700 mt-0.5">
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
                {STRATEGIES.map(({ id, label, icon: Icon, desc, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStrategy(id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      strategy === id
                        ? `border-${color === 'brand' ? 'brand' : color === 'accent' ? 'accent' : 'emerald'}-500 bg-${color === 'brand' ? 'brand' : color === 'accent' ? 'accent' : 'emerald'}-50`
                        : 'border-ink-200 hover:border-ink-300'
                    }`}
                  >
                    <Icon size={16} className={`mb-1.5 ${strategy === id ? `text-${color === 'brand' ? 'brand' : color === 'accent' ? 'accent' : 'emerald'}-600` : 'text-ink-500'}`} />
                    <div className={`text-xs font-semibold ${strategy === id ? 'text-ink-900' : 'text-ink-700'}`}>{label}</div>
                    <div className="text-[10px] text-ink-500 mt-0.5 leading-tight">{desc}</div>
                  </button>
                ))}
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
              <Bot size={16} /> Arm agent · max ${maxBid.toLocaleString()}
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
