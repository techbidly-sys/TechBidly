'use client';

import Link from 'next/link';
import { Gavel, Heart, Trophy, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';
import { user as mockUser } from '@/data/mockData.js';

export default function HomeHero({ endingSoonCount }) {
  const { profile } = useAuth();
  const handle = profile?.handle ?? mockUser.handle;
  const handleParts = handle.split('#');

  return (
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
            Hey, {handleParts[0]}
            {handleParts[1] && <span className="text-brand-300">#{handleParts[1]}</span>}
          </h1>
          <p className="mt-2 text-ink-200 max-w-md">
            You have <span className="text-white font-semibold">{mockUser.activeBids} active bids</span> and{' '}
            <span className="text-white font-semibold">{endingSoonCount} auctions ending soon</span> in your watchlist.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/browse" className="btn-brand">
              Explore auctions <ArrowRight size={16} />
            </Link>
            <Link href="/sell" className="btn bg-white/10 text-white hover:bg-white/15 border border-white/15 backdrop-blur">
              Sell something
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Gavel} label="Active bids" value={mockUser.activeBids} tone="brand" />
          <Stat icon={Trophy} label="Bids won" value={mockUser.bidsWon} tone="amber" />
          <Stat icon={Heart} label="Watchlist" value={mockUser.watchlist} tone="rose" />
          <Stat icon={ShieldCheck} label="Trust score" value={`${mockUser.rating}★`} tone="emerald" />
        </div>
      </div>
    </section>
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
