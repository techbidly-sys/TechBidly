import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// size='sm'  → compact chip (for ListingCard image overlay)
// size='md'  → full panel with check list (for ListingDetail)
export default function AuthBadge({ auth, size = 'sm' }) {
  const [open, setOpen] = useState(false);

  if (!auth) return null;

  const { status, fraudScore, checks } = auth;

  const cfg = {
    verified: {
      icon: ShieldCheck,
      label: 'Verified',
      chip: 'bg-emerald-500/90 text-white backdrop-blur',
      panel: 'border-emerald-200 bg-emerald-50',
      header: 'text-emerald-700',
      bar: 'bg-emerald-500',
    },
    warning: {
      icon: ShieldAlert,
      label: 'Review',
      chip: 'bg-amber-400/90 text-white backdrop-blur',
      panel: 'border-amber-200 bg-amber-50',
      header: 'text-amber-700',
      bar: 'bg-amber-400',
    },
    unverified: {
      icon: Shield,
      label: 'Unverified',
      chip: 'bg-ink-600/80 text-white backdrop-blur',
      panel: 'border-ink-200 bg-ink-50',
      header: 'text-ink-600',
      bar: 'bg-ink-400',
    },
  }[status] ?? {
    icon: Shield,
    label: 'Unknown',
    chip: 'bg-ink-400/80 text-white backdrop-blur',
    panel: 'border-ink-200 bg-ink-50',
    header: 'text-ink-500',
    bar: 'bg-ink-400',
  };

  const Icon = cfg.icon;

  if (size === 'sm') {
    return (
      <span className={`chip text-[10px] font-semibold ${cfg.chip}`}>
        <Icon size={11} />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border ${cfg.panel} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition"
      >
        <div className={`flex items-center gap-2 font-semibold text-sm ${cfg.header}`}>
          <Icon size={16} />
          {status === 'verified'
            ? `Photos verified — Fraud score ${fraudScore}/100`
            : status === 'warning'
              ? `One check flagged — Fraud score ${fraudScore}/100`
              : 'Not yet verified'}
        </div>
        {open ? <ChevronUp size={15} className="text-ink-400" /> : <ChevronDown size={15} className="text-ink-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5">
          <div className="grid sm:grid-cols-2 gap-2 pt-3">
            {checks.map(({ label, pass }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  pass ? 'bg-white text-emerald-700 border border-emerald-100' : 'bg-white text-rose-700 border border-rose-200'
                }`}
              >
                {pass
                  ? <CheckCircle2 size={14} className="shrink-0" />
                  : <XCircle size={14} className="shrink-0" />}
                {label}
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-ink-500 mb-1">
              <span>Fraud resistance</span>
              <span className="font-semibold text-ink-900">{fraudScore}/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                style={{ width: `${fraudScore}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            {status === 'verified'
              ? "All photos are original device photos. No AI generation or stock image reuse detected. Metadata is consistent with the seller's listed condition."
              : status === 'warning'
                ? 'One or more checks raised a flag. Bidly AI recommends reviewing the listing photos carefully before placing a bid.'
                : 'This seller has not yet submitted photos for AI verification.'}
          </p>
        </div>
      )}
    </div>
  );
}
