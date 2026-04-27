import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Tag, Wand2, CheckCircle2, AlertCircle } from 'lucide-react';
import { categories, conditions } from '../data/mockData.js';
import AIPhotoGrader from '../components/AIPhotoGrader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createListing } from '../lib/listings.js';

export default function Sell() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    category: 'phones',
    condition: 'Like New',
    startingBid: 200,
    duration: '3',
    description: '',
    location: profile?.role === 'seller' ? '' : 'Toronto, Canada',
    imageUrl: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const aiDraft = () => {
    setForm((f) => ({
      ...f,
      title: f.title || 'iPhone 15 Pro Max — 256GB Natural Titanium',
      description: f.description || 'Used for 3 months in a case with screen protector. Battery health 100%. Includes original box, USB-C cable, and unused EarPods adapter. Ships next-day with tracking and signature.',
      startingBid: f.startingBid || 600,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const listing = await createListing({
        sellerId: session.user.id,
        sellerHandle: profile?.handle ?? 'Anonymous Seller',
        form,
      });
      setSubmitted(listing);
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
        <h1 className="font-display text-2xl font-bold mt-4">Listing live!</h1>
        <p className="text-ink-500 mt-2">
          Your auction is now visible to verified buyers. We'll notify you on the first bid.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => navigate(`/listing/${submitted.id}`)}
            className="btn-brand"
          >
            View listing
          </button>
          <button
            onClick={() => {
              setSubmitted(null);
              setForm({ title: '', category: 'phones', condition: 'Like New', startingBid: 200, duration: '3', description: '', location: '', imageUrl: '', tags: '' });
            }}
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
          <h1 className="font-display text-3xl font-bold">Sell on TechBidly</h1>
          <p className="text-sm text-ink-500 mt-1">
            Your identity stays anonymous. Buyers see only your city &amp; country until shipping.
          </p>
        </div>

        <div className="card p-6 space-y-5">
          <AIPhotoGrader
            onApply={(result) =>
              setForm((f) => ({
                ...f,
                title: f.title || result.title,
                condition: result.condition,
                startingBid: result.startingBid,
                description: f.description || result.description,
              }))
            }
          />

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
              <input value={form.location} onChange={update('location')} className="input" placeholder="City, Country" required />
            </div>
            <div>
              <span className="label">Starting bid (USD)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                <input type="number" value={form.startingBid} onChange={update('startingBid')} min={1} className="input pl-7" required />
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
            <div className="sm:col-span-2">
              <span className="label">Image URL</span>
              <input value={form.imageUrl} onChange={update('imageUrl')} className="input" placeholder="https://... (paste a photo URL)" />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Tags <span className="text-ink-400 font-normal normal-case">(comma separated)</span></span>
              <input value={form.tags} onChange={update('tags')} className="input" placeholder="unlocked, battery 100%, box included" />
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
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline">Save draft</button>
          <button type="submit" disabled={submitting} className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed">
            <Tag size={16} /> {submitting ? 'Publishing…' : 'Publish auction'}
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
