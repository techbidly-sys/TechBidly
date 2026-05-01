'use client';

import { useEffect, useState } from 'react';
import {
  Search, ShieldBan, ShieldCheck, Trash2, Loader2,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  ExternalLink, FileText,
} from 'lucide-react';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const VERIF_CONFIG = {
  pending:  { label: 'Pending',  classes: 'bg-amber-50 text-amber-700',    icon: Clock },
  verified: { label: 'Verified', classes: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', classes: 'bg-rose-50 text-rose-700',      icon: XCircle },
};

const DOC_LABELS = {
  business_license: 'Business License',
  bank_statement:   'Bank Statement',
  trade_reference:  'Trade Reference',
};

function VerifChip({ status }) {
  const cfg = VERIF_CONFIG[status] ?? VERIF_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.classes}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function ReviewPanel({ userId, currentStatus, onDecision }) {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState([]);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/verifications?user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setVerifications(d.verifications ?? []))
      .catch(() => setVerifications([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const decide = async (action) => {
    setActing(action);
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    onDecision(action === 'verify' ? 'verified' : 'rejected');
    setActing(null);
  };

  return (
    <tr>
      <td colSpan={7} className="bg-ink-50/70 border-b border-ink-100 px-6 py-4">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">KYB Documents</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Loader2 size={13} className="animate-spin" /> Loading documents…
            </div>
          ) : verifications.length === 0 ? (
            <p className="text-sm text-ink-400">No documents submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {verifications.map((v) => {
                const cfg = VERIF_CONFIG[v.status] ?? VERIF_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-2.5">
                    <FileText size={14} className="text-ink-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-ink-800">{DOC_LABELS[v.document_type] ?? v.document_type}</span>
                      <span className="text-xs text-ink-400 ml-2">{fmt(v.created_at)}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.classes}`}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                    {v.signed_url && (
                      <a
                        href={v.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-700 hover:underline flex-shrink-0"
                      >
                        <ExternalLink size={12} /> View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink-600 block mb-1">Review notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for rejection, or verification notes…"
              className="w-full text-sm border border-ink-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => decide('verify')}
              disabled={!!acting || currentStatus === 'verified'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 font-medium"
            >
              {acting === 'verify' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {currentStatus === 'verified' ? 'Already verified' : 'Approve'}
            </button>
            <button
              onClick={() => decide('reject')}
              disabled={!!acting || currentStatus === 'rejected'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 font-medium"
            >
              {acting === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              {currentStatus === 'rejected' ? 'Already rejected' : 'Reject'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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

  const handleVerifDecision = (userId, newStatus) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, profiles: u.profiles.map((p) => ({ ...p, verification_status: newStatus })) }
          : u
      )
    );
    setExpandedId(null);
  };

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profiles?.some((p) => p.handle?.toLowerCase().includes(search.toLowerCase()))
  );

  // Count users with pending verification
  const pendingCount = users.filter((u) =>
    u.profiles?.some((p) => p.verification_status === 'pending')
  ).length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500 mt-1">
            {users.length} total accounts
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                <Clock size={10} /> {pendingCount} pending verification
              </span>
            )}
          </p>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Verification</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Joined</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Last Sign In</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((u) => {
                const verifStatus = u.profiles?.[0]?.verification_status ?? 'pending';
                const isExpanded = expandedId === u.id;

                return (
                  <>
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
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : u.id)}
                          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                          <VerifChip status={verifStatus} />
                          {isExpanded ? <ChevronUp size={13} className="text-ink-400" /> : <ChevronDown size={13} className="text-ink-400" />}
                        </button>
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
                    {isExpanded && (
                      <ReviewPanel
                        key={`review-${u.id}`}
                        userId={u.id}
                        currentStatus={verifStatus}
                        onDecision={(newStatus) => handleVerifDecision(u.id, newStatus)}
                      />
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-ink-400">
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
