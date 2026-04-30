'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Tag,
  PackageCheck,
  Heart,
  Sparkles,
  ShoppingBag,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

const BUYER_LINKS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/browse', label: 'Browse Auctions', icon: Search },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/orders', label: 'Orders', icon: PackageCheck },
  { to: '/watchlist', label: 'Watchlist', icon: Heart },
  { to: '/spend', label: 'Track Expenses', icon: BarChart2 },
];

const SELLER_LINKS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/sell', label: 'Auction', icon: Tag },
  { to: '/marketplace/sell', label: 'Sell on Marketplace', icon: ShoppingBag },
  { to: '/orders', label: 'My Sales', icon: PackageCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const links = role === 'seller' ? SELLER_LINKS : BUYER_LINKS;

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col border-r"
      style={{
        background: 'linear-gradient(160deg, #4c3d9e 0%, #3d2f8a 50%, #4a3896 100%)',
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <div className="px-6 pt-6 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {links.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              href={to}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="m-3 rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
        }}
      >
        <div className="flex items-center gap-2 font-semibold text-white">
          <Sparkles size={16} className="text-violet-300" />
          <span>Bidly AI</span>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(200,185,255,0.8)' }}>
          Get instant value estimates, smart bid suggestions, and listing tips.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
          className="btn-brand w-full mt-3 text-xs py-2"
        >
          Open assistant
        </button>
      </div>
    </aside>
  );
}

export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-9 w-9 rounded-xl grid place-items-center text-white shadow-glow flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #f97316 100%)' }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 9h14M12 9v12M8 21h8" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg font-extrabold text-white">TechBidly</div>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(180,165,255,0.7)' }}>Bid · Win · Ship</div>
        </div>
      )}
    </div>
  );
}
