import { useState } from 'react';
import { Sparkles, Upload, Tag, Wand2, CheckCircle2 } from 'lucide-react';
import { categories, conditions } from '../data/mockData.js';

export default function Sell() {
  const [form, setForm] = useState({
    title: '',
    category: 'phones',
    condition: 'Like New',
    startingBid: 200,
    duration: '3',
    description: '',
    location: 'Toronto, Canada',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const aiDraft = () => {
    setForm((f) => ({
      ...f,
      title: f.title || 'iPhone 15 Pro Max — 256GB Natural Titanium',
      description:
        f.description ||
        'Used for 3 months in a case with screen protector. Battery health 100%. Includes original box, USB-C cable, and unused EarPods adapter. Ships next-day with tracking and signature.',
      startingBid: f.startingBid || 600,
    }));
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto card p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold mt-4">Listing live!</h1>
        <p className="text-ink-500 mt-2">
          Your auction is now visible to verified buyers. We'll notify you on the first bid.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ ...form, title: '', description: '' });
          }}
          className="btn-primary mt-6"
        >
          List another item
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr,340px] gap-6">
      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
        className="space-y-5"
      >
        <div>
          <h1 className="font-display text-3xl font-bold">Sell on TechBidly</h1>
          <p className="text-sm text-ink-500 mt-1">
            Your identity stays anonymous. Buyers see only your city &amp; country until shipping.
          </p>
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <span className="label">Photos</span>
            <div className="grid grid-cols-4 gap-3">
              <label className="aspect-square rounded-xl border-2 border-dashed border-ink-200 grid place-items-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition">
                <div className="text-center text-ink-500">
                  <Upload size={20} className="mx-auto" />
                  <div className="text-[11px] mt-1 font-medium">Upload</div>
                </div>
                <input type="file" className="hidden" accept="image/*" multiple />
              </label>
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-ink-100 border border-ink-200" />
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-2">First photo is the cover. Up to 8 images.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="label">Title</span>
              <input value={form.title} onChange={update('title')} className="input" placeholder="e.g. iPhone 15 Pro Max — 256GB" required />
            </div>
            <div>
              <span className="label">Category</span>
              <select value={form.category} onChange={update('category')} className="input cursor-pointer">
                {categories.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Condition</span>
              <select value={form.condition} onChange={update('condition')} className="input cursor-pointer">
                {conditions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Seller location</span>
              <input value={form.location} onChange={update('location')} className="input" placeholder="City, Country" />
            </div>
            <div>
              <span className="label">Starting bid (USD)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                <input type="number" value={form.startingBid} onChange={update('startingBid')} min={1} className="input pl-7" />
              </div>
            </div>
            <div>
              <span className="label">Auction duration</span>
              <select value={form.duration} onChange={update('duration')} className="input cursor-pointer">
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="label !mb-0">Description</span>
              <button type="button" onClick={aiDraft} className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1 hover:underline">
                <Wand2 size={12} /> Draft with Bidly AI
              </button>
            </div>
            <textarea
              rows={6}
              value={form.description}
              onChange={update('description')}
              className="input mt-2"
              placeholder="Be specific: condition, included accessories, battery health, original box, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline">Save draft</button>
          <button type="submit" className="btn-brand">
            <Tag size={16} /> Publish auction
          </button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <div className="card p-5 bg-mesh-1">
          <div className="flex items-center gap-2 text-brand-700 font-semibold">
            <Sparkles size={16}/> Bidly AI suggestions
          </div>
          <ul className="mt-3 text-sm text-ink-700 space-y-2 leading-relaxed">
            <li>• Suggested starting bid: <b>$580–$640</b> based on 12 similar closings.</li>
            <li>• Add <b>battery cycles</b> and <b>IMEI status</b> — improves bid count by ~22%.</li>
            <li>• 5pm–8pm local time is the best listing window for phones.</li>
          </ul>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
            className="btn-primary w-full mt-4 text-xs"
          >
            Open Bidly AI
          </button>
        </div>

        <div className="card p-5">
          <div className="font-semibold">Fees</div>
          <ul className="mt-2 text-sm text-ink-600 space-y-1.5">
            <li className="flex justify-between"><span>Listing fee</span><span className="text-ink-900 font-semibold">Free</span></li>
            <li className="flex justify-between"><span>Final value</span><span className="text-ink-900 font-semibold">5%</span></li>
            <li className="flex justify-between"><span>Payout</span><span className="text-ink-900 font-semibold">2–4 days</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
