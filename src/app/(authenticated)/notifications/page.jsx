'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  TrendingDown,
  Timer,
  Trophy,
  Package,
  Heart,
  Gavel,
  Tag,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase.js';
import { useAuth } from '@/context/AuthContext.jsx';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const notifIcons = {
  outbid:         { Icon: TrendingDown, color: 'text-rose-500',     bg: 'bg-rose-50'     },
  ending:         { Icon: Timer,        color: 'text-amber-500',    bg: 'bg-amber-50'    },
  won:            { Icon: Trophy,       color: 'text-brand-600',    bg: 'bg-brand-50'    },
  shipped:        { Icon: Package,      color: 'text-green-600',    bg: 'bg-green-50'    },
  watchlist:      { Icon: Heart,        color: 'text-ink-500',      bg: 'bg-ink-100'     },
  bid_placed:     { Icon: Gavel,        color: 'text-brand-600',    bg: 'bg-brand-50'    },
  listing_posted: { Icon: Tag,          color: 'text-emerald-600',  bg: 'bg-emerald-50'  },
};

export default function NotificationsPage() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications ?? []);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
  }, [session, fetchNotifications]);

  // Real-time push
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel(`notifications-page-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const markUnread = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    // Note: API only supports marking as read, not unread. This is a UI-only update.
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  };

  const deleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Note: No delete endpoint yet, so this is UI-only. Add backend support if needed.
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationTypes = [
    { value: 'all', label: 'All notifications', count: notifications.length },
    { value: 'bid_placed', label: 'Bids placed', count: notifications.filter((n) => n.type === 'bid_placed').length },
    { value: 'outbid', label: 'Outbid', count: notifications.filter((n) => n.type === 'outbid').length },
    { value: 'listing_posted', label: 'Listings posted', count: notifications.filter((n) => n.type === 'listing_posted').length },
    { value: 'won', label: 'Won auctions', count: notifications.filter((n) => n.type === 'won').length },
    { value: 'ending', label: 'Ending soon', count: notifications.filter((n) => n.type === 'ending').length },
    { value: 'shipped', label: 'Shipped', count: notifications.filter((n) => n.type === 'shipped').length },
    { value: 'watchlist', label: 'Watchlist', count: notifications.filter((n) => n.type === 'watchlist').length },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-ink-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="btn-outline text-sm"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[240px,1fr] gap-6">
        {/* Sidebar filters */}
        <aside className="space-y-1">
          {notificationTypes.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium text-sm ${
                filter === value
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{label}</span>
                <span className={`text-xs font-semibold ${filter === value ? 'text-brand-600' : 'text-ink-400'}`}>
                  {count}
                </span>
              </div>
            </button>
          ))}
        </aside>

        {/* Notifications list */}
        <div>
          {loading ? (
            <div className="text-center py-12 text-ink-400">Loading notifications…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-400">
              {filter === 'all' ? 'No notifications yet' : `No ${notificationTypes.find((t) => t.value === filter)?.label.toLowerCase()}`}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => {
                const { Icon, color, bg } = notifIcons[n.type] ?? notifIcons.watchlist;
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-4 transition ${
                      !n.read ? 'bg-brand-50/40 border-brand-200' : 'bg-white border-ink-100 hover:border-ink-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${bg} h-10 w-10 rounded-lg grid place-items-center flex-shrink-0`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-semibold ${!n.read ? 'text-ink-900' : 'text-ink-800'}`}>
                                {n.title}
                              </h3>
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-ink-600 mt-1">{n.body}</p>
                            <p className="text-xs text-ink-400 mt-2">{timeAgo(n.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!n.read ? (
                              <button
                                onClick={() => markRead(n.id)}
                                className="h-8 w-8 rounded-lg hover:bg-ink-100 transition grid place-items-center text-ink-500 hover:text-ink-700"
                                title="Mark as read"
                              >
                                <Check size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => markUnread(n.id)}
                                className="h-8 w-8 rounded-lg hover:bg-ink-100 transition grid place-items-center text-ink-400 hover:text-ink-600"
                                title="Mark as unread"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(n.id)}
                              className="h-8 w-8 rounded-lg hover:bg-ink-100 transition grid place-items-center text-ink-500 hover:text-ink-700"
                              title="Delete"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
