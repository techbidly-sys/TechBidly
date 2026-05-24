'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Sparkles,
  ScanLine,
  ShieldCheck,
  ImageOff,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Sequence of analysis steps to animate through while the request is in flight.
const STEPS = [
  { icon: Camera, label: 'Detecting device model…' },
  { icon: ScanLine, label: 'Grading condition from photos…' },
  { icon: ShieldCheck, label: 'Checking for stock/AI images…' },
  { icon: Sparkles, label: 'Generating price estimate…' },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AIPhotoGrader({ onApply }) {
  const [phase, setPhase] = useState('idle'); // idle | analyzing | done | error
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 6);
    const url = URL.createObjectURL(fileArray[0]);
    setPreviewUrl(url);
    setPhase('analyzing');
    setStepIdx(0);
    setErrorMsg('');

    // Step animation runs in parallel with the actual request.
    const stepTimer = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 900);

    try {
      const dataUrls = await Promise.all(fileArray.map(fileToDataUrl));
      const res = await fetch('/api/ai/photo-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: dataUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI grading failed');
      setResult(data.result);
      setPhase('done');
      setExpanded(true);
    } catch (err) {
      setErrorMsg(err.message ?? 'Photo grading failed');
      setPhase('error');
    } finally {
      clearInterval(stepTimer);
    }
  };

  // Cleanup object URLs on unmount.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const apply = () => {
    if (!result || !onApply) return;
    onApply({
      title: result.device,
      condition: result.condition,
      startingBid: result.suggestedStart,
      description: result.description,
    });
  };

  return (
    <div>
      <span className="label">Photos — AI Grader</span>

      {phase === 'idle' && (
        <label
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/40 p-10 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center text-white">
            <Upload size={22} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-ink-900">Drop photos or click to upload</div>
            <div className="text-xs text-ink-500 mt-1">
              Bidly AI will grade condition, detect device, and suggest a starting bid.
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}

      {phase === 'analyzing' && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3 text-brand-700 font-semibold">
            <Loader2 size={18} className="animate-spin" />
            Analysing your photos…
          </div>
          <div className="space-y-2">
            {STEPS.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                  i < stepIdx ? 'opacity-100' : i === stepIdx ? 'opacity-100' : 'opacity-30'
                }`}
              >
                {i < stepIdx ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                ) : i === stepIdx ? (
                  <Loader2 size={16} className="text-brand-500 animate-spin shrink-0" />
                ) : (
                  <Icon size={16} className="text-ink-300 shrink-0" />
                )}
                <span className={i < stepIdx ? 'text-ink-500' : i === stepIdx ? 'text-ink-900 font-medium' : 'text-ink-300'}>
                  {i < stepIdx ? label.replace('…', '') : label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
            <AlertTriangle size={16} />
            AI grading failed
          </div>
          <p className="text-xs text-rose-700">{errorMsg}</p>
          <button
            onClick={() => { setPhase('idle'); setResult(null); setPreviewUrl(null); setErrorMsg(''); }}
            className="btn-outline text-xs"
          >
            Try again
          </button>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-ink-100 bg-emerald-50/50">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <CheckCircle2 size={16} />
              AI analysis complete
            </div>
            <button
              onClick={apply}
              className="btn bg-brand-600 text-white hover:bg-brand-700 text-xs py-1.5 px-3 shadow-glow"
            >
              <Wand2 size={13} /> Apply to listing
            </button>
          </div>

          {/* Main results grid */}
          <div className="p-4 grid sm:grid-cols-3 gap-4">
            <ResultStat label="Device detected" value={result.device} mono={false} />
            <ResultStat
              label="Condition grade"
              value={
                <span className="flex items-center gap-2">
                  <span className="chip bg-brand-50 text-brand-700">{result.condition}</span>
                  <span className="text-xs text-ink-500">{result.conditionConfidence}% confidence</span>
                </span>
              }
            />
            <ResultStat
              label="Suggested start"
              value={
                <span>
                  <span className="font-display text-xl font-bold text-ink-900">${result.suggestedStart}</span>
                  <span className="text-xs text-ink-500 ml-1">est. closes ${result.bidRange?.low ?? '—'}–${result.bidRange?.high ?? '—'}</span>
                </span>
              }
            />
          </div>

          {/* Issues detected */}
          {(result.issues ?? []).length > 0 && (
            <div className="px-4 pb-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-2">Wear detected</div>
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issue, i) => (
                  <span key={i} className="chip bg-amber-50 text-amber-700 border border-amber-100">
                    <AlertTriangle size={11} /> {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Authenticity section — collapsible */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-t border-ink-100 hover:bg-ink-50 transition text-sm font-semibold text-ink-700"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-500" />
              Photo authenticity · Fraud score {result.fraudScore ?? '—'}/100
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2">
              {(result.checks ?? []).map(({ label, pass }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {pass ? <CheckCircle2 size={14} /> : <ImageOff size={14} />}
                  {label}
                </div>
              ))}
              <div className="sm:col-span-2">
                <FraudBar score={result.fraudScore ?? 0} />
              </div>
            </div>
          )}

          {/* Re-upload */}
          <div className="border-t border-ink-100 px-4 py-2.5">
            <button
              onClick={() => { setPhase('idle'); setResult(null); setPreviewUrl(null); }}
              className="text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              Re-upload photos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{label}</div>
      <div className="text-sm text-ink-900">{value}</div>
    </div>
  );
}

function FraudBar({ score }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 65 ? 'bg-amber-400' : 'bg-rose-500';
  const label = score >= 85 ? 'High trust' : score >= 65 ? 'Moderate' : 'Review needed';
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[11px] text-ink-500 mb-1">
        <span>Fraud resistance score</span>
        <span className="font-semibold text-ink-900">{score}/100 · {label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
