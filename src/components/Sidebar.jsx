import { NavLink } from 'react-router-dom';
import {
  Home,
  Search,
  Tag,
  PackageCheck,
  Heart,
  Sparkles,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/sell', label: 'Sell an item', icon: Tag },
  { to: '/orders', label: 'Orders', icon: PackageCheck },
  { to: '/watchlist', label: 'Watchlist', icon: Heart },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="px-6 pt-6 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="h-4.5 w-4.5" size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-2xl p-4 bg-mesh-1 border border-ink-100">
        <div className="flex items-center gap-2 text-ink-900 font-semibold">
          <Sparkles size={16} className="text-brand-600" />
          <span>Bidly AI</span>
        </div>
        <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">
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
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 grid place-items-center text-white shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 9h14M12 9v12M8 21h8" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg font-extrabold text-ink-900">TechBidly</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">Bid · Win · Ship</div>
        </div>
      )}
    </div>
  );
}
