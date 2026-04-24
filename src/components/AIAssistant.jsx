import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Wand2 } from 'lucide-react';

const STARTER_PROMPTS = [
  'Suggest a fair max bid for an iPhone 15 Pro Max in like-new condition.',
  'Help me write a listing for a MacBook Pro M3.',
  'What should I check before bidding on a used laptop?',
  'Compare Pixel 8 Pro vs Galaxy S24 Ultra for resale value.',
];

const CANNED_RESPONSES = {
  default:
    "Based on recent TechBidly closings, the fair-bid range for that item sits around $880–$960. I'd anchor at $895 and snipe up to $945 in the final 30 seconds.",
  listing:
    "Here's a draft you can paste into the Sell page:\n\n• Title: \"MacBook Pro 14\\\" M3 Pro — 18GB / 1TB Space Black\"\n• Condition: Excellent · Battery cycles <80\n• Highlight box, charger, AppleCare+ until 2026.\n• Suggested starting bid: $1,200 · Reserve: $1,650.",
  bidding:
    "Quick checklist before bidding:\n1. Confirm seller's anonymized rating (4.8+ is solid).\n2. Check city/country shipping origin for customs.\n3. Look for battery cycles, IMEI status, and box contents.\n4. Set a max bid — don't chase past your ceiling.",
  compare:
    "Pixel 8 Pro tends to depreciate ~12% faster than the S24 Ultra in the first 6 months. If resale matters, the Galaxy holds value better — but the Pixel ships sooner on average across our Berlin and Toronto sellers.",
};

function pickResponse(text) {
  const t = text.toLowerCase();
  if (t.includes('listing') || t.includes('write')) return CANNED_RESPONSES.listing;
  if (t.includes('check') || t.includes('before')) return CANNED_RESPONSES.bidding;
  if (t.includes('compare') || t.includes('vs')) return CANNED_RESPONSES.compare;
  return CANNED_RESPONSES.default;
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi — I'm Bidly, your auction copilot. I can estimate fair bids, draft listings, and explain seller details. What can I help with?",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-assistant', handler);
    return () => window.removeEventListener('open-ai-assistant', handler);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, open]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: pickResponse(t) }]);
      setThinking(false);
    }, 700);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group"
          aria-label="Open Bidly AI"
        >
          <span className="absolute inset-0 rounded-full bg-brand-500/40 blur-xl group-hover:bg-brand-500/60 transition" />
          <span className="relative flex items-center gap-2 rounded-full bg-ink-900 text-white pl-3 pr-4 py-3 shadow-glow">
            <span className="grid place-items-center h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-400">
              <Sparkles size={14} />
            </span>
            <span className="text-sm font-semibold">Ask Bidly AI</span>
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] card overflow-hidden flex flex-col animate-in" style={{ height: 540 }}>
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-3 bg-mesh-1">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-400 text-white">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink-900">Bidly AI</div>
              <div className="text-[11px] text-ink-500">Auction copilot · POC responses</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/60"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50/40">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {thinking && <Bubble role="assistant" text="…" thinking />}

            {messages.length <= 1 && (
              <div className="pt-2">
                <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
                  Try a prompt
                </div>
                <div className="grid gap-1.5">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-left text-xs rounded-lg border border-ink-100 bg-white px-3 py-2 hover:border-brand-300 hover:bg-brand-50/40 transition"
                    >
                      <Wand2 size={12} className="inline-block mr-1.5 text-brand-600" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-ink-100 bg-white"
          >
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Bidly anything…"
                className="input pr-11"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg bg-ink-900 text-white hover:bg-ink-800"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text, thinking }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
          isUser
            ? 'bg-ink-900 text-white rounded-br-md'
            : 'bg-white border border-ink-100 text-ink-800 rounded-bl-md'
        }`}
      >
        {thinking ? (
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-300 animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink-300 animate-pulse [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink-300 animate-pulse [animation-delay:240ms]" />
          </span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
