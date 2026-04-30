import Link from 'next/link';
import { TrendingUp, ArrowRight, Sparkles, Flame } from 'lucide-react';
import { fetchListingsServer } from '@/lib/listings-server.js';
import ListingCard from '@/components/ListingCard.jsx';
import HomeHero from '@/components/HomeHero.jsx';
import AiInsightAside from '@/components/AiInsightAside.jsx';

export default async function Home() {
  const listings = await fetchListingsServer().catch(() => []);

  const featured = listings.filter((l) => l.featured);
  const forYou = listings.slice(0, 4);
  const endingSoon = [...listings]
    .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))
    .slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Client component — needs useAuth for personalised greeting */}
      <HomeHero endingSoonCount={endingSoon.length} />

      {featured.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={<><Flame size={12} /> Featured this week</>}
            title="Curated by Bidly AI"
            subtitle="Top auctions from verified anonymous sellers."
            link="/browse"
          />
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {featured.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {forYou.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={<><Sparkles size={12} /> Personalised</>}
            title="Picked for you"
            link="/browse"
          />
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {forYou.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {endingSoon.length > 0 && (
        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <SectionHeader
              eyebrow={<><TrendingUp size={12} /> Don't miss out</>}
              title="Ending soon"
              link="/browse"
            />
            <div className="grid gap-4">
              {endingSoon.map((l) => <ListingCard key={l.id} listing={l} variant="wide" />)}
            </div>
          </div>

          {/* Client component — needs window.dispatchEvent */}
          <AiInsightAside />
        </section>
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, link }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && (
          <span className="chip bg-brand-50 text-brand-700 border border-brand-100">{eyebrow}</span>
        )}
        <h2 className="font-display text-2xl font-bold mt-2">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link} className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          See all <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
