'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function diff(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { ended: true, label: 'Ended' };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d >= 1) return { ended: false, label: `${d}d ${h}h ${m}m`, urgent: false };
  if (h >= 1) return { ended: false, label: `${h}h ${m}m ${s}s`, urgent: h < 2 };
  return { ended: false, label: `${m}m ${s}s`, urgent: true };
}

export default function CountdownTimer({ endsAt, compact = false }) {
  const [t, setT] = useState(() => diff(endsAt));
  useEffect(() => {
    const id = setInterval(() => setT(diff(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const tone = t.ended
    ? 'bg-ink-100 text-ink-500'
    : t.urgent
      ? 'bg-rose-50 text-rose-600'
      : 'bg-ink-900 text-white';

  return (
    <span className={`chip ${tone} ${compact ? 'text-[11px]' : ''}`}>
      <Clock size={compact ? 12 : 14} />
      {t.label}
    </span>
  );
}
