'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { fetchBidHistory } from '@/lib/bids.js';

// SVG canvas dimensions
const W = 440;
const H = 170;
const PAD = { top: 14, right: 14, bottom: 30, left: 58 };
const IW = W - PAD.left - PAD.right; // 368
const IH = H - PAD.top - PAD.bottom; // 126

function fmtPrice(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

function fmtTime(ms, spanMs) {
  if (spanMs < 1000 * 60 * 60 * 2) return `${Math.round((ms) / 60000)}m`;
  if (spanMs < 1000 * 60 * 60 * 48) return `${Math.round(ms / 3600000)}h`;
  return `${Math.round(ms / 86400000)}d`;
}

export default function BidHistoryChart({ listingId, startingBid, bidCount }) {
  const [bids, setBids] = useState(null); // null = loading

  useEffect(() => {
    fetchBidHistory(listingId)
      .then(setBids)
      .catch(() => setBids([]));
  }, [listingId, bidCount]);

  if (bids === null) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-ink-900 mb-3">
          <TrendingUp size={15} className="text-brand-600" /> Price history
        </div>
        <div className="h-[170px] rounded-xl bg-ink-50 animate-pulse" />
      </div>
    );
  }

  if (bids.length === 0) {
    return <NoBidsChart startingBid={startingBid} />;
  }

  return <BidsChart startingBid={startingBid} bids={bids} />;
}

// ── No bids yet ────────────────────────────────────────────────────────────────

function NoBidsChart({ startingBid }) {
  const midY = PAD.top + IH / 2;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-ink-900">
          <TrendingUp size={15} className="text-brand-600" /> Price history
        </div>
        <span className="text-xs text-ink-400">No bids yet</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Starting price grid line */}
        <line
          x1={PAD.left} y1={midY}
          x2={W - PAD.right} y2={midY}
          stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4"
        />
        {/* Y label */}
        <text x={PAD.left - 6} y={midY} textAnchor="end" dominantBaseline="middle"
          fontSize="11" fill="#9ca3af" fontWeight="600">
          {fmtPrice(startingBid)}
        </text>
        {/* Starting dot */}
        <circle cx={PAD.left + IW / 2} cy={midY} r="5"
          fill="#9ca3af" stroke="white" strokeWidth="2" />
        {/* Label */}
        <text x={PAD.left + IW / 2} y={midY - 14} textAnchor="middle"
          fontSize="11" fill="#6b7280">
          Starting price — be the first to bid
        </text>
      </svg>

      <div className="flex justify-between text-xs text-ink-500 mt-1">
        <span>Starting price: <b className="text-ink-900">{fmtPrice(startingBid)}</b></span>
        <span>No bids placed yet</span>
      </div>
    </div>
  );
}

// ── Chart with bid data ────────────────────────────────────────────────────────

function BidsChart({ startingBid, bids }) {
  // Build chart points: starting price + each bid in order
  const firstBidT = new Date(bids[0].createdAt).getTime();
  const lastBidT = new Date(bids[bids.length - 1].createdAt).getTime();

  const points = [
    { amount: startingBid, t: firstBidT, isStart: true },
    ...bids.map((b) => ({ amount: b.amount, t: new Date(b.createdAt).getTime() })),
  ];

  // Y range with padding
  const amounts = points.map((p) => p.amount);
  const rawMin = Math.min(...amounts);
  const rawMax = Math.max(...amounts);
  const yPad = (rawMax - rawMin) * 0.18 || rawMin * 0.12 || 20;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;

  // T range
  const tMin = firstBidT;
  const tMax = lastBidT === firstBidT ? firstBidT + 60000 : lastBidT; // avoid division by zero
  const tSpan = tMax - tMin;

  // Scale functions
  const sx = (t) => PAD.left + ((t - tMin) / tSpan) * IW;
  const sy = (v) => PAD.top + IH - ((v - yMin) / (yMax - yMin)) * IH;

  // Y grid labels (top, mid, bottom of data range)
  const yGridValues = [rawMax, (rawMin + rawMax) / 2, rawMin];

  // Area polygon (fill under line)
  const areaPoints = [
    `${sx(tMin).toFixed(1)},${(PAD.top + IH).toFixed(1)}`,
    ...points.map((p) => `${sx(p.t).toFixed(1)},${sy(p.amount).toFixed(1)}`),
    `${sx(tMax).toFixed(1)},${(PAD.top + IH).toFixed(1)}`,
  ].join(' ');

  // Line polyline
  const linePoints = points
    .map((p) => `${sx(p.t).toFixed(1)},${sy(p.amount).toFixed(1)}`)
    .join(' ');

  const currentBid = bids[bids.length - 1].amount;
  const gradId = `bh-grad-${String(bids[0]?.amount ?? 0).replace('.', '')}`;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-ink-900">
          <TrendingUp size={15} className="text-brand-600" /> Price history
        </div>
        <span className="text-xs text-ink-500">
          {bids.length} bid{bids.length !== 1 ? 's' : ''}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}
        role="img" aria-label="Bid price history chart">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yGridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={sy(v).toFixed(1)}
              x2={W - PAD.right} y2={sy(v).toFixed(1)}
              stroke="#f3f4f6" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={sy(v).toFixed(1)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="10" fill="#9ca3af"
            >
              {fmtPrice(v)}
            </text>
          </g>
        ))}

        {/* X axis baseline */}
        <line
          x1={PAD.left} y1={PAD.top + IH}
          x2={W - PAD.right} y2={PAD.top + IH}
          stroke="#e5e7eb" strokeWidth="1"
        />

        {/* X axis labels */}
        <text x={PAD.left} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
          Start
        </text>
        {tSpan > 0 && (
          <text x={PAD.left + IW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {fmtTime(tSpan / 2, tSpan)} in
          </text>
        )}
        <text x={W - PAD.right} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
          Latest
        </text>

        {/* Area fill */}
        <polygon points={areaPoints} fill={`url(#${gradId})`} />

        {/* Line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => {
          const x = sx(p.t).toFixed(1);
          const y = sy(p.amount).toFixed(1);
          const isLast = i === points.length - 1;
          const isStart = p.isStart;

          return (
            <g key={i}>
              {isLast && (
                <circle cx={x} cy={y} r="9" fill="#a855f7" opacity="0.12" />
              )}
              <circle
                cx={x} cy={y}
                r={isLast ? 4.5 : isStart ? 3.5 : 3}
                fill={isStart ? '#d1d5db' : '#a855f7'}
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* Current price callout on last point */}
        {(() => {
          const last = points[points.length - 1];
          const lx = Number(sx(last.t).toFixed(1));
          const ly = Number(sy(last.amount).toFixed(1));
          const labelX = lx > W - PAD.right - 60 ? lx - 6 : lx + 6;
          const anchor = lx > W - PAD.right - 60 ? 'end' : 'start';
          return (
            <text x={labelX} y={ly - 10} textAnchor={anchor}
              fontSize="11" fill="#7c3aed" fontWeight="700">
              {fmtPrice(last.amount)}
            </text>
          );
        })()}
      </svg>

      <div className="flex items-center justify-between text-xs text-ink-500 mt-1">
        <span>Started at <b className="text-ink-900">{fmtPrice(startingBid)}</b></span>
        <span>Now at <b className="text-brand-700 text-sm">{fmtPrice(currentBid)}</b></span>
      </div>
    </div>
  );
}
