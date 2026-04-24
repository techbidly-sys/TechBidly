import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Gavel,
  Heart,
  Trophy,
  ArrowRight,
  Sparkles,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { user, listings } from '../data/mockData.js';
import ListingCard from '../components/ListingCard.jsx';

export default function Dashboard() {
  const featured = listings.filter((l) => l.featured);
  const forYou = listings.filter((l) => user.preferences.includes(l.category)).slice(0, 4);
  const endingSoon = [...listings].sort(
    (a, b) => new Date(a.endsAt) - new Date(b.endsAt)
  ).slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 text-white p-8 lg:p-10">
        <div className="absolute inset-0 bg-mesh-1 opacity-70" />
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="chip bg-white/10 backdrop-blur text-white border border-white/15">
              <Sparkles size={12} /> Welcome back
            </span>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold mt-3 leading-tight text-white">
              Hey, {user.handle.split('#')[0]}<span className="text-brand-300">#{user.handle.split('#')[1]}</span>
            </h1>
            <p className="mt-2 text-ink-200 max-w-md">
              You have <span className="text-white font-semibold">{user.activeBids} active bids</span> and{' '}
              <span className="text-white font-semibold">{endingSoon.length} auctions ending soon</span> in your watchlist.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/browse" className="btn-brand">
                Explore auctions <ArrowRight size={16} />
              </Link>
              <Link to="/sell" className="btn bg-white/10 text-white hover:bg-white/15 border border-white/15 backdrop-blur">
                Sell something
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Gavel} label="Active bids" value={user.activeBids} tone="brand" />
            <Stat icon={Trophy} label="Bids won" value={user.bidsWon} tone="amber" />
            <Stat icon={Heart} label="Watchlist" value={user.watchlist} tone="rose" />
            <Stat icon={ShieldCheck} label="Trust score" value={`${user.rating}★`} tone="emerald" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section>
        <SectionHeader
          eyebrow={<><Flame size={12} /> Featured this week</>}
          title="Curated by Bidly AI"
          subtitle="Top auctions from verified anonymous sellers."
          link="/browse"
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* For you */}
      <section>
        <SectionHeader
          eyebrow={<><Sparkles size={12} /> Personalised</>}
          title="Picked for you"
          subtitle={`Matched to your interests: ${user.preferences.join(', ')}.`}
          link="/browse"
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {forYou.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* Ending soon + AI tip */}
      <section className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <SectionHeader
            eyebrow={<><TrendingUp size={12} /> Don't miss out</>}
            title="Ending soon"
            link="/browse"
          />
          <div className="grid gap-4">
            {endingSoon.map((l) => (
              <ListingCard key={l.id} listing={l} variant="wide" />
            ))}
          </div>
        </div>

        <aside className="card p-6 bg-mesh-1">
          <div className="flex items-center gap-2 text-brand-700 font-semibold">
            <Sparkles size={16} />
            <span>Bidly AI insight</span>
          </div>
          <h3 className="mt-2 font-display text-xl">
            Your sweet spot is the 6–8h window
          </h3>
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
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-500/15 text-brand-200',
    amber: 'bg-amber-400/15 text-amber-200',
    rose: 'bg-rose-400/15 text-rose-200',
    emerald: 'bg-emerald-400/15 text-emerald-200',
  };
  return (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${tones[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="mt-3 text-2xl font-display font-bold text-white">{value}</div>
      <div className="text-xs text-ink-300">{label}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, link }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && (
          <span className="chip bg-brand-50 text-brand-700 border border-brand-100">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-2xl font-bold mt-2">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          See all <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
