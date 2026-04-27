import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  CreditCard,
  MapPin,
  ShieldCheck,
  Settings,
  Pencil,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { user } from '../data/mockData.js';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'shipping', label: 'Shipping', icon: MapPin },
  { id: 'security', label: 'Privacy & security', icon: ShieldCheck },
  { id: 'settings', label: 'Preferences', icon: Settings },
];

export default function Profile() {
  const { session, profile } = useAuth();
  const [sp, setSp] = useSearchParams();
  const initial = sp.get('tab') ?? 'account';
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (sp.get('tab') !== tab) setSp({ tab });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = profile?.handle ?? user.handle;
  const role = profile?.role ?? 'buyer';
  const initial_letter = handle.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <header className="card p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 grid place-items-center text-white text-xl font-bold">
          {initial_letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{handle}</h1>
            <span className="chip bg-emerald-50 text-emerald-700"><CheckCircle2 size={12}/> Verified</span>
            <span className={`chip capitalize ${role === 'seller' ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
              {role}
            </span>
          </div>
          <div className="text-sm text-ink-500 mt-0.5">
            Member since {user.joined} · ⭐ {user.rating} · {user.bidsWon} wins
          </div>
        </div>
        <button className="btn-outline"><Pencil size={14}/> Edit handle</button>
      </header>

      <div className="grid lg:grid-cols-[240px,1fr] gap-6">
        <nav className="card p-2 h-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                tab === id
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          {tab === 'account' && <AccountTab email={session?.user?.email} handle={handle} role={role} />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'shipping' && <ShippingTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'settings' && <PreferencesTab />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, action }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, hint }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="text-sm font-medium text-ink-900">{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function AccountTab({ email, handle, role }) {
  const [reveal, setReveal] = useState(false);

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(b.length, 5)) + c)
    : user.account.email;

  return (
    <Card
      title="Account details"
      subtitle="Sellers and buyers never see your real identity."
      action={<button className="btn-outline"><Pencil size={14}/> Edit</button>}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Public handle" value={handle} hint="What other users see" />
        <div>
          <span className="label">Email</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900">
              {reveal ? email : maskedEmail}
            </span>
            <button onClick={() => setReveal((v) => !v)} className="text-ink-500 hover:text-ink-900">
              {reveal ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>
        <Field label="Account type" value={role === 'seller' ? 'Seller' : 'Buyer'} hint={role === 'seller' ? 'Can create listings' : 'Can place bids'} />
        <Field label="2-factor auth" value={user.account.twoFactor ? 'Enabled' : 'Disabled'} hint="Authenticator app" />
      </div>
    </Card>
  );
}

function BillingTab() {
  return (
    <>
      <Card
        title="Payment method"
        subtitle="Used to settle winning bids automatically."
        action={<button className="btn-outline"><Pencil size={14}/> Update</button>}
      >
        <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-14 rounded-md bg-gradient-to-br from-ink-900 to-ink-700 grid place-items-center text-white text-xs font-bold">
              VISA
            </div>
            <div>
              <div className="font-semibold text-ink-900">{user.billing.method}</div>
              <div className="text-xs text-ink-500">Expires {user.billing.expires} · {user.billing.country}</div>
            </div>
          </div>
          <span className="chip bg-emerald-50 text-emerald-700">Default</span>
        </div>
      </Card>

      <Card title="Billing contact" subtitle="Never shared with sellers.">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Cardholder" value={user.billing.name} />
          <Field label="Country" value={user.billing.country} />
        </div>
      </Card>
    </>
  );
}

function ShippingTab() {
  return (
    <Card
      title="Shipping address"
      subtitle={user.shipping.note}
      action={<button className="btn-outline"><Pencil size={14}/> Edit</button>}
    >
      <div className="rounded-xl border border-ink-100 p-4">
        <div className="flex items-center gap-2">
          <span className="chip bg-brand-50 text-brand-700">{user.shipping.label}</span>
          <span className="chip bg-emerald-50 text-emerald-700"><CheckCircle2 size={12}/> Verified</span>
        </div>
        <div className="mt-3 text-sm text-ink-700 space-y-0.5">
          <div className="font-semibold text-ink-900">{user.shipping.line1}</div>
          <div>{user.shipping.city}, {user.shipping.region}</div>
          <div>{user.shipping.country}</div>
        </div>
        <div className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
          <b>What sellers see:</b> {user.shipping.city}, {user.shipping.country} — until you win and a label is generated.
        </div>
      </div>
    </Card>
  );
}

function SecurityTab() {
  return (
    <>
      <Card title="Sign-in security" subtitle="Keep your account safe.">
        <Row label="Password" value="Last changed 42 days ago" actionLabel="Change" />
        <Row label="2-factor authentication" value="Authenticator app · Enabled" actionLabel="Manage" />
        <Row label="Active sessions" value="2 devices · Toronto, Vancouver" actionLabel="Review" />
      </Card>
      <Card title="Anonymity controls">
        <Row label="Show city to sellers" value="On — required for shipping estimates" actionLabel="On" muted />
        <Row label="Allow seller messages" value="On — only after a winning bid" actionLabel="Manage" />
      </Card>
    </>
  );
}

function PreferencesTab() {
  return (
    <Card title="Buyer preferences" subtitle="We tune your dashboard to match.">
      <span className="label">Categories</span>
      <div className="flex flex-wrap gap-2">
        {['phones', 'laptops', 'tablets', 'audio', 'wearables'].map((c) => (
          <span key={c} className={`chip capitalize ${
            user.preferences.includes(c)
              ? 'bg-ink-900 text-white'
              : 'bg-white border border-ink-200 text-ink-600'
          }`}>{c}</span>
        ))}
      </div>
      <div className="mt-6">
        <span className="label">Notifications</span>
        <Row label="Outbid alerts" value="Push + Email" actionLabel="Edit" />
        <Row label="Auctions ending soon" value="Push only" actionLabel="Edit" />
        <Row label="Weekly digest" value="Sundays · 9am" actionLabel="Edit" />
      </div>
    </Card>
  );
}

function Row({ label, value, actionLabel, muted }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
      <div>
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        <div className="text-xs text-ink-500">{value}</div>
      </div>
      <button className={`text-xs font-semibold ${muted ? 'text-ink-400 cursor-default' : 'text-brand-700 hover:underline'}`}>
        {actionLabel}
      </button>
    </div>
  );
}
