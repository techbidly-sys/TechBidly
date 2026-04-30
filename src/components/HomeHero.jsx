'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

export default function HomeHero({ endingSoonCount }) {
  const { profile } = useAuth();
  const handle = profile?.handle ?? 'there';
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
            There {endingSoonCount === 1 ? 'is' : 'are'}{' '}
            <span className="text-white font-semibold">{endingSoonCount} auction{endingSoonCount !== 1 ? 's' : ''} ending soon</span> — don't miss out.
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

      </div>
    </section>
  );
}

