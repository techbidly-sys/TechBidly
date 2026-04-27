'use client';

import { Sparkles } from 'lucide-react';

export default function AiInsightAside() {
  return (
    <aside className="card p-6 bg-mesh-1">
      <div className="flex items-center gap-2 text-brand-700 font-semibold">
        <Sparkles size={16} />
        <span>Bidly AI insight</span>
      </div>
      <h3 className="mt-2 font-display text-xl">Your sweet spot is the 6–8h window</h3>
      <p className="text-sm text-ink-600 mt-2 leading-relaxed">
        Across your last 18 wins, bids placed in the final 6–8 hours close at <b>11% under market</b>.
        Two of your watched auctions hit that window in the next hour.
      </p>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
        className="btn-primary w-full mt-5"
      >
        Get bid suggestions
      </button>
    </aside>
  );
}
