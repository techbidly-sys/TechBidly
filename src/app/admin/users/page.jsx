'use client';

import { useEffect, useState } from 'react';
import { Search, ShieldBan, ShieldCheck, Trash2, Loader2 } from 'lucide-react';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null);

  const load = () =>
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    if (action === 'delete' && !confirm('Permanently delete this user and all their data?')) return;
    setActing(id + action);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await load();
    setActing(null);
  };

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profiles?.some((p) => p.handle?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500 mt-1">{users.length} total accounts</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or handle…"
            className="pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft border border-ink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Handles / Roles</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Joined</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Last Sign In</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-800">{u.email}</td>
                  <td className="px-6 py-4 text-ink-500">
                    {u.profiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {u.profiles.map((p) => (
                          <span key={p.role} className="inline-flex items-center gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium capitalize">
                              {p.role}
                            </span>
                            <span className="text-xs">{p.handle}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{fmt(u.created_at)}</td>
                  <td className="px-6 py-4 text-ink-500 whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
                  <td className="px-6 py-4">
                    {u.banned ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">Banned</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {u.banned ? (
                        <button
                          onClick={() => act(u.id, 'unban')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {acting === u.id + 'unban' ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => act(u.id, 'ban')}
                          disabled={!!acting}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {acting === u.id + 'ban' ? <Loader2 size={12} className="animate-spin" /> : <ShieldBan size={12} />}
                          Ban
                        </button>
                      )}
                      <button
                        onClick={() => act(u.id, 'delete')}
                        disabled={!!acting}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {acting === u.id + 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
