'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tag, Wand2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { categories, conditions } from '@/data/mockData.js';
import AIPhotoGrader from '@/components/AIPhotoGrader.jsx';
import ManifestUploader from '@/components/ManifestUploader.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { createListing } from '@/lib/listings.js';

export default function Sell() {
  const { session, profile, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile && role !== 'seller') router.replace('/browse');
  }, [profile, role, router]);

  const [form, setForm] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const defaultStartAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return {
      title: '',
      category: 'phones',
      condition: 'Like New',
      startingBid: 200,
      duration: '3',
      description: '',
      location: profile?.role === 'seller' ? '' : 'Toronto, Canada',
      imageUrl: '',
      tags: '',
      startAt: defaultStartAt,
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [cardChecked, setCardChecked] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [drafting, setDrafting] = useState(false);

  useEffect(() => {
    fetch('/api/stripe/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        setHasCard((data.methods ?? []).length > 0);
        setCardChecked(true);
      })
      .catch(() => setCardChecked(true));
  }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch('/api/ai/listing-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          condition: form.condition,
          hint: form.title || form.description || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI draft failed');
      const draft = data.draft ?? {};
      setForm((f) => ({
        ...f,
        title: f.title || draft.title || f.title,
        description: f.description || draft.description || f.description,
        startingBid: f.startingBid || Number(draft.startingBid) || f.startingBid,
      }));
    } catch (err) {
      setError(err.message ?? 'AI draft failed');
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const listing = await createListing({
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
            onClick={() => router.push(`/listing/${submitted.id}`)}
            className="btn-brand"
          >
            View listing
          </button>
          <button
            onClick={() => {
              setSubmitted(null);
              const now = new Date();
              const pad = (n) => String(n).padStart(2, '0');
              setForm({ title: '', category: 'phones', condition: 'Like New', startingBid: 200, duration: '3', description: '', location: '', imageUrl: '', tags: '', startAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}` });
            }}
            className="btn-outline"
          >
            List another
          </button>
        </div>
      </div>
    );
  }

  if (!cardChecked) {
    return (
      <div className="max-w-xl mx-auto card p-10 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-ink-500 mt-4">Loading your account…</p>
      </div>
    );
  }

  if (!hasCard) {
    return (
      <div className="max-w-xl mx-auto card p-10 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-ink-100 grid place-items-center mx-auto">
          <CreditCard size={26} className="text-ink-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Payment card required</h1>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            You need a valid payment card on file before creating listings.
            TechBidly uses it to cover any platform fees and verify your account is active.
          </p>
        </div>
        <Link href="/profile?tab=billing" className="btn-brand inline-flex mx-auto">
          <CreditCard size={15} /> Add a payment card
        </Link>
        <p className="text-xs text-ink-400">
          Once added, come back here to create your listing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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

          <ManifestUploader
            onApply={(fields) =>
              setForm((f) => ({
                ...f,
                ...(fields.title       && { title:       fields.title }),
                ...(fields.category    && { category:    fields.category }),
                ...(fields.condition   && { condition:   fields.condition }),
                ...(fields.startingBid && { startingBid: Number(fields.startingBid) || f.startingBid }),
                ...(fields.description && { description: fields.description }),
                ...(fields.location    && { location:    fields.location }),
                ...(fields.imageUrl    && { imageUrl:    fields.imageUrl }),
                ...(fields.tags        && { tags:        fields.tags }),
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
                <option value="1m">1 minute (demo)</option>
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
              </select>
            </div>
            <div>
              <span className="label">Auction start</span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={update('startAt')}
                className="input"
                required
              />
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
              <button
                type="button"
                onClick={aiDraft}
                disabled={drafting}
                className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Wand2 size={12} /> {drafting ? 'Drafting…' : 'Draft with Bidly AI'}
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
    </div>
  );
}
