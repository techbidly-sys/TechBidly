import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  CreditCard,
  MapPin,
  LogOut,
  ShieldCheck,
  Settings,
  TrendingDown,
  Timer,
  Trophy,
  Package,
  Heart,
} from 'lucide-react';
import { user, notifications as mockNotifications } from '../data/mockData.js';
import { Logo } from './Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const ref = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/browse${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center gap-4">
        <div className="lg:hidden">
          <Logo compact />
        </div>

        <form onSubmit={submitSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search iPhone, MacBook, AirPods..."
              className="input pl-10"
            />
            <kbd className="hidden md:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink-400 border border-ink-200 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen((v) => !v); setOpen(false); }}
              className="btn-ghost h-10 w-10 p-0 relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationsPanel
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          <div className="relative" ref={ref}>
            <button
              onClick={() => { setOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-xl pl-1 pr-2.5 py-1 hover:bg-ink-100 transition"
            >
              <Avatar />
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-ink-900 leading-tight">
                  {user.handle}
                </div>
                <div className="text-[11px] text-ink-500">{user.shipping.city}, {user.shipping.country}</div>
              </div>
              <ChevronDown size={14} className="text-ink-400" />
            </button>

            {open && <ProfileMenu onClose={() => setOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
}

function Avatar() {
  return (
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 grid place-items-center text-white text-sm font-semibold ring-2 ring-white">
      A
    </div>
  );
}

const notifIcons = {
  outbid: { Icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50' },
  ending: { Icon: Timer, color: 'text-amber-500', bg: 'bg-amber-50' },
  won: { Icon: Trophy, color: 'text-brand-600', bg: 'bg-brand-50' },
  shipped: { Icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  watchlist: { Icon: Heart, color: 'text-ink-500', bg: 'bg-ink-100' },
};

function NotificationsPanel({ notifications, onMarkAllRead, onMarkRead, onClose }) {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="absolute right-0 mt-2 w-80 card p-0 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
        <span className="text-sm font-semibold text-ink-900">Notifications</span>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-medium text-brand-600 hover:text-brand-700 transition"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-ink-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-400">No notifications</div>
        ) : (
          notifications.map((n) => {
            const { Icon, color, bg } = notifIcons[n.type] ?? notifIcons.watchlist;
            return (
              <button
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-ink-50 transition ${!n.read ? 'bg-brand-50/40' : ''}`}
              >
                <div className={`mt-0.5 h-8 w-8 rounded-xl ${bg} grid place-items-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${!n.read ? 'text-ink-900' : 'text-ink-700'}`}>
                      {n.title}
                    </span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-ink-500 truncate">{n.body}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">{n.time}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-ink-100 px-4 py-2.5">
        <button
          onClick={onClose}
          className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}

function ProfileMenu({ onClose }) {
  const { signOut } = useAuth();
  const items = [
    { to: '/profile', label: 'Account details', icon: User, hint: user.account.email },
    { to: '/profile?tab=billing', label: 'Billing', icon: CreditCard, hint: user.billing.method },
    { to: '/profile?tab=shipping', label: 'Shipping', icon: MapPin, hint: `${user.shipping.city}, ${user.shipping.country}` },
    { to: '/profile?tab=security', label: 'Privacy & security', icon: ShieldCheck, hint: '2FA enabled' },
    { to: '/profile?tab=settings', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="absolute right-0 mt-2 w-72 card p-2 z-50">
      <div className="px-3 pt-2 pb-3 border-b border-ink-100">
        <div className="text-sm font-semibold text-ink-900">{user.handle}</div>
        <div className="text-xs text-ink-500">Member since {user.joined} · ⭐ {user.rating}</div>
      </div>
      <div className="py-1">
        {items.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-ink-50 transition"
          >
            <it.icon size={16} className="text-ink-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-900">{it.label}</div>
              {it.hint && <div className="text-[11px] text-ink-500 truncate">{it.hint}</div>}
            </div>
          </Link>
        ))}
      </div>
      <div className="border-t border-ink-100 pt-1">
        <button
          onClick={() => { onClose(); signOut(); }}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-xl hover:bg-ink-50 transition text-rose-600"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
