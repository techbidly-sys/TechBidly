'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ShoppingBag, Wand2, CheckCircle2, AlertCircle, Building2, Plus, Trash2 } from 'lucide-react';
import { categories, conditions } from '@/data/mockData.js';
import AIPhotoGrader from '@/components/AIPhotoGrader.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

const EMPTY_FORM = {
  title: '',
  category: 'phones',
  condition: 'Like New',
  price: '',
  quantity: 1,
  description: '',
  location: '',
  imageUrl: '',
  tags: '',
};

export default function MarketplaceSell() {
  const { session, profile, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile && role !== 'seller') router.replace('/marketplace');
  }, [profile, role, router]);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    location: profile?.role === 'seller' ? '' : 'Toronto, Canada',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [bulkEnabled, setBulkEnabled] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([{ minQty: 5, price: '' }]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const aiDraft = () => {
    setForm((f) => ({
      ...f,
      title: f.title || 'iPhone 15 Pro Max — 256GB Natural Titanium',
      description: f.description || 'Used for 3 months in a case with screen protector. Battery health 100%. Includes original box, USB-C cable, and unused EarPods adapter. Ships next-day with tracking and signature.',
      price: f.price || 649,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const tiers = bulkEnabled
        ? pricingTiers
            .filter((t) => t.price !== '' && Number(t.price) > 0 && Number(t.minQty) >= 2)
            .map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) }))
            .sort((a, b) => a.minQty - b.minQty)
        : [];

      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerHandle: profile?.handle ?? 'Anonymous Seller',
          form,
          pricingTiers: tiers.length > 0 ? tiers : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create listing');
      setSubmitted(data.item);
    } catch (err) {
      setError(err.message ?? 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto card p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold mt-4">Item listed!</h1>
        <p className="text-ink-500 mt-2">
          Your item is now live on the marketplace. Buyers can purchase it directly at your fixed price.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => router.push('/marketplace')} className="btn-brand">
            View marketplace
          </button>
          <button
            onClick={() => { setSubmitted(null); setForm({ ...EMPTY_FORM, location: '' }); }}
            className="btn-outline"
          >
            List another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr,340px] gap-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">List on Marketplace</h1>
          <p className="text-sm text-ink-500 mt-1">
            Set a fixed price — buyers purchase instantly, no bidding required.
          </p>
        </div>

        <div className="card p-6 space-y-5">
          <AIPhotoGrader
            onApply={(result) =>
              setForm((f) => ({
                ...f,
                title: f.title || result.title,
                condition: result.condition,
                price: f.price || result.startingBid,
                description: f.description || result.description,
              }))
            }
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="label">Title</span>
              <input
                value={form.title}
                onChange={update('title')}
                className="input"
                placeholder="e.g. iPhone 15 Pro Max — 256GB"
                required
              />
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
              <span className="label">Quantity</span>
              <input
                type="number"
                value={form.quantity}
                onChange={update('quantity')}
                min={1}
                className="input"
                required
              />
            </div>
            <div>
              <span className="label">Price (USD)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={update('price')}
                  min={1}
                  className="input pl-7"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div>
              <span className="label">Seller location</span>
              <input
                value={form.location}
                onChange={update('location')}
                className="input"
                placeholder="City, Country"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Image URL</span>
              <input
                value={form.imageUrl}
                onChange={update('imageUrl')}
                className="input"
                placeholder="https://... (paste a photo URL)"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="label">
                Tags <span className="text-ink-400 font-normal normal-case">(comma separated)</span>
              </span>
              <input
                value={form.tags}
                onChange={update('tags')}
                className="input"
                placeholder="unlocked, battery 100%, box included"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="label !mb-0">Description</span>
              <button
                type="button"
                onClick={aiDraft}
                className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1 hover:underline"
              >
                <Wand2 size={12} /> Draft with Bidly AI
              </button>
            </div>
            <textarea
              rows={6}
              value={form.description}
              onChange={update('description')}
              className="input mt-2"
              placeholder="Be specific: condition, included accessories, battery health, original box, etc."
              required
            />
          </div>
        </div>

        {/* Bulk pricing */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-brand-600" />
              <span className="font-semibold text-ink-900">Bulk / B2B pricing</span>
              <span className="chip bg-brand-50 text-brand-700 text-[10px] py-0.5">Optional</span>
            </div>
            <button
              type="button"
              onClick={() => setBulkEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${bulkEnabled ? 'bg-brand-600' : 'bg-ink-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${bulkEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {bulkEnabled && (
            <div className="space-y-3">
              <p className="text-xs text-ink-500 leading-relaxed">
                Set lower per-unit prices for buyers who order larger quantities. The base price above applies to 1-unit orders.
              </p>

              <div className="space-y-2">
                {pricingTiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        {i === 0 && <span className="label">Min qty</span>}
                        <input
                          type="number"
                          min={2}
                          value={tier.minQty}
                          onChange={(e) => setPricingTiers((prev) => prev.map((t, j) => j === i ? { ...t, minQty: e.target.value } : t))}
                          className="input"
                          placeholder="e.g. 5"
                        />
                      </div>
                      <div>
                        {i === 0 && <span className="label">Price / unit ($)</span>}
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                          <input
                            type="number"
                            min={1}
                            value={tier.price}
                            onChange={(e) => setPricingTiers((prev) => prev.map((t, j) => j === i ? { ...t, price: e.target.value } : t))}
                            className="input pl-7"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    {pricingTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPricingTiers((prev) => prev.filter((_, j) => j !== i))}
                        className={`text-ink-400 hover:text-rose-500 transition ${i === 0 ? 'mt-5' : ''}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pricingTiers.length < 3 && (
                <button
                  type="button"
                  onClick={() => setPricingTiers((prev) => [...prev, { minQty: '', price: '' }])}
                  className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> Add another tier
                </button>
              )}

              <p className="text-[11px] text-ink-400">Example: min qty 5 at $85/unit, min qty 10 at $70/unit.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline">Save draft</button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={16} />
            {submitting ? 'Publishing…' : 'Publish listing'}
          </button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <div className="card p-5 bg-mesh-1">
          <div className="flex items-center gap-2 text-brand-700 font-semibold">
            <Sparkles size={16} /> Bidly AI suggestions
          </div>
          <ul className="mt-3 text-sm text-ink-700 space-y-2 leading-relaxed">
            <li>• Suggested price: <b>$620–$680</b> based on 14 recent sales.</li>
            <li>• Add <b>battery health</b> and <b>IMEI status</b> — increases buyer confidence by ~30%.</li>
            <li>• Items with 3+ photos sell <b>2× faster</b> on average.</li>
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
          <div className="font-semibold">How it works</div>
          <ul className="mt-3 text-sm text-ink-600 space-y-3">
            <li className="flex gap-2.5">
              <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">1</span>
              <span>Set your price — buyers pay it directly, no waiting for bids to close.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">2</span>
              <span>You'll be notified instantly when someone purchases your item.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">3</span>
              <span>Ship within 3 days. Payout lands in your account in 2–4 days after delivery.</span>
            </li>
          </ul>
        </div>

        <div className="card p-5">
          <div className="font-semibold">Fees</div>
          <ul className="mt-2 text-sm text-ink-600 space-y-1.5">
            <li className="flex justify-between"><span>Listing fee</span><span className="text-ink-900 font-semibold">Free</span></li>
            <li className="flex justify-between"><span>Sale fee</span><span className="text-ink-900 font-semibold">5%</span></li>
            <li className="flex justify-between"><span>Payout</span><span className="text-ink-900 font-semibold">2–4 days</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
