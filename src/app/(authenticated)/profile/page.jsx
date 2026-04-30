'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Plus,
  Loader2,
  Star,
  Smartphone,
  KeyRound,
  XCircle,
  Lock,
  Building2,
  Clock,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { user } from '@/data/mockData.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { supabase } from '@/lib/supabase.js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'shipping', label: 'Shipping', icon: MapPin },
  { id: 'security', label: 'Privacy & security', icon: ShieldCheck },
  { id: 'settings', label: 'Preferences', icon: Settings },
];

export default function Profile() {
  const { session, profile, profiles, switchRole } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get('tab') ?? 'account';
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (searchParams.get('tab') !== tab) {
      router.replace(`/profile?tab=${tab}`);
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = profile?.handle ?? user.handle;
  const role = profile?.role ?? 'buyer';
  const initial_letter = handle.charAt(0).toUpperCase();
  const otherProfile = profiles.find((p) => p.role !== role);

  return (
    <div className="space-y-6">
      <header className="card p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 grid place-items-center text-white text-xl font-bold">
          {initial_letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{handle}</h1>
            <span className={`chip capitalize ${role === 'seller' ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
              {role}
            </span>
          </div>
        </div>
        {otherProfile && (
          <button
            onClick={() => switchRole(otherProfile.role)}
            className="btn-outline text-sm flex-shrink-0"
          >
            Switch to {otherProfile.role} · {otherProfile.handle}
          </button>
        )}
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
          {tab === 'account' && <AccountTab email={session?.user?.email} profile={profile} />}
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

const VERIFICATION_CONFIG = {
  pending:  { label: 'Pending review', classes: 'bg-amber-50 text-amber-700',  icon: Clock },
  verified: { label: 'Verified',       classes: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Action required', classes: 'bg-rose-50 text-rose-700',   icon: XCircle },
};

function AccountTab({ email, profile }) {
  const { role, handle, verification_status, display_anonymous } = profile ?? {};
  const [reveal, setReveal] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [isAnon, setIsAnon] = useState(display_anonymous ?? false);
  const [anonSaving, setAnonSaving] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaEnabled((data?.totp ?? []).some((f) => f.status === 'verified'));
    });
  }, []);

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(b.length, 5)) + c)
    : '—';

  const verif = VERIFICATION_CONFIG[verification_status] ?? VERIFICATION_CONFIG.pending;
  const VerifIcon = verif.icon;

  const toggleAnonymous = async () => {
    const next = !isAnon;
    setIsAnon(next);
    setAnonSaving(true);
    await supabase
      .from('profiles')
      .update({ display_anonymous: next })
      .eq('id', profile?.id)
      .eq('role', role);
    setAnonSaving(false);
  };

  return (
    <Card title="Account details" subtitle="Your company information and display preferences.">
      <div className="space-y-5">

        {/* Company name — immutable */}
        <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 flex items-start gap-3">
          <Building2 size={18} className="text-ink-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-0.5">Company name</div>
            <div className="font-semibold text-ink-900 text-base truncate">{handle}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`chip text-[10px] flex items-center gap-1 ${verif.classes}`}>
                <VerifIcon size={10} /> {verif.label}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 text-ink-400 text-xs">
            <Lock size={11} /> Permanent
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <span className="label">Email</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-900">
                {reveal ? email : maskedEmail}
              </span>
              <button onClick={() => setReveal((v) => !v)} className="text-ink-500 hover:text-ink-900">
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <Field
            label="Account type"
            value={role === 'seller' ? 'Seller' : 'Buyer'}
            hint={role === 'seller' ? 'Can create listings' : 'Can place bids'}
          />
          <Field
            label="2-factor auth"
            value={mfaEnabled === null ? '…' : mfaEnabled ? 'Enabled' : 'Not set up'}
            hint="Manage in Privacy & security tab"
          />
        </div>

        {/* Display anonymous toggle */}
        <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
          <div>
            <div className="text-sm font-semibold text-ink-900">Display as anonymous</div>
            <div className="text-xs text-ink-500 mt-0.5">
              {isAnon
                ? 'On — other businesses see "Anonymous" instead of your company name'
                : 'Off — your company name is visible on bids and listings'}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={isAnon}
            onClick={toggleAnonymous}
            disabled={anonSaving}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none disabled:opacity-50 ${
              isAnon ? 'bg-brand-600' : 'bg-ink-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              isAnon ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {verification_status === 'pending' && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800">
            <strong>Verification pending.</strong> TechBidly is reviewing your company details. You can browse the platform but some actions may be restricted until verification is complete.
          </div>
        )}
        {verification_status === 'rejected' && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs text-rose-800">
            <strong>Action required.</strong> Your verification was not completed. Please contact <a href="mailto:support@techbidly.com" className="font-semibold underline">support@techbidly.com</a> to resolve this.
          </div>
        )}
      </div>
    </Card>
  );
}

const BRAND_LABELS = {
  visa: 'VISA',
  mastercard: 'MC',
  amex: 'AMEX',
  discover: 'DISC',
  unionpay: 'UP',
  jcb: 'JCB',
};

function CardBadge({ brand }) {
  return (
    <div className="h-10 w-14 rounded-md bg-gradient-to-br from-ink-900 to-ink-700 grid place-items-center text-white text-xs font-bold flex-shrink-0">
      {BRAND_LABELS[brand] ?? brand?.toUpperCase() ?? '••••'}
    </div>
  );
}

function AddCardForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    try {
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-outline" disabled={loading}>
          Cancel
        </button>
        <button type="submit" disabled={!stripe || loading} className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {loading ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  );
}

function BillingTab() {
  const [methods, setMethods] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [clientSecret, setClientSecret] = useState(null);
  const [addingCard, setAddingCard] = useState(false);
  const [addingCardLoading, setAddingCardLoading] = useState(false);
  const [addCardError, setAddCardError] = useState('');
  const [settingDefault, setSettingDefault] = useState(null);

  const fetchMethods = useCallback(async () => {
    setLoadingMethods(true);
    const res = await fetch('/api/stripe/payment-methods');
    const data = await res.json();
    setMethods(data.methods ?? []);
    setDefaultId(data.defaultId ?? null);
    setLoadingMethods(false);
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const handleAddCard = async () => {
    setAddingCardLoading(true);
    setAddCardError('');
    try {
      const res = await fetch('/api/stripe/setup-intent', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setAddCardError(data.error ?? 'Could not initialise card form. Please try again.');
        return;
      }
      setClientSecret(data.clientSecret);
      setAddingCard(true);
    } catch {
      setAddCardError('Network error. Please try again.');
    } finally {
      setAddingCardLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    setSettingDefault(paymentMethodId);
    await fetch('/api/stripe/payment-methods/default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId }),
    });
    setDefaultId(paymentMethodId);
    setSettingDefault(null);
  };

  const handleCardSaved = async () => {
    setAddingCard(false);
    setClientSecret(null);
    await fetchMethods();
  };

  const handleCancel = () => {
    setAddingCard(false);
    setClientSecret(null);
  };

  return (
    <Card
      title="Payment methods"
      subtitle="Used to settle winning bids automatically. Never shared with sellers."
      action={
        !addingCard && (
          <button onClick={handleAddCard} disabled={addingCardLoading} className="btn-outline disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
            {addingCardLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {addingCardLoading ? 'Loading…' : 'Add card'}
          </button>
        )
      }
    >
      {addCardError && (
        <p className="text-xs text-rose-600 mb-3">{addCardError}</p>
      )}
      {loadingMethods ? (
        <div className="flex items-center gap-2 text-sm text-ink-500 py-2">
          <Loader2 size={14} className="animate-spin" /> Loading cards…
        </div>
      ) : (
        <div className="space-y-3">
          {methods.length === 0 && !addingCard && (
            <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
              <CreditCard size={24} className="mx-auto text-ink-300 mb-2" />
              <p className="text-sm text-ink-500">No cards saved yet.</p>
              <p className="text-xs text-ink-400 mt-0.5">Add a card to start bidding on auctions.</p>
            </div>
          )}

          {methods.map((pm) => {
            const isDefault = pm.id === defaultId;
            return (
              <div
                key={pm.id}
                className={`flex items-center justify-between rounded-xl border p-4 transition ${
                  isDefault ? 'border-brand-200 bg-brand-50/40' : 'border-ink-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CardBadge brand={pm.card.brand} />
                  <div>
                    <div className="font-semibold text-ink-900 capitalize">
                      {pm.card.brand} •••• {pm.card.last4}
                    </div>
                    <div className="text-xs text-ink-500">
                      Expires {String(pm.card.exp_month).padStart(2, '0')} / {String(pm.card.exp_year).slice(-2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDefault ? (
                    <span className="chip bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={12} /> Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(pm.id)}
                      disabled={settingDefault === pm.id}
                      className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {settingDefault === pm.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Star size={12} />}
                      Set default
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {addingCard && clientSecret && (
            <div className="rounded-xl border border-ink-100 p-5 mt-2">
              <p className="text-sm font-semibold text-ink-900 mb-4">Add a new card</p>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <AddCardForm
                  clientSecret={clientSecret}
                  onSuccess={handleCardSaved}
                  onCancel={handleCancel}
                />
              </Elements>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function AddressForm({ existing, onSave, onCancel }) {
  const elements = useElements();
  const [label, setLabel] = useState(existing?.label ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!elements) return;
    setSaving(true);
    setError('');

    const addressEl = elements.getElement(AddressElement);
    const result = await addressEl.getValue();

    if (!result.complete) {
      setError('Please enter and select a complete address from the suggestions.');
      setSaving(false);
      return;
    }

    const a = result.value.address;
    await onSave({
      label,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      region: a.state,
      country: a.country,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="label">Address label <span className="text-ink-400 font-normal">(optional)</span></span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input"
          placeholder="e.g. Home, Work"
        />
      </div>
      <div>
        <span className="label">Street address</span>
        <AddressElement
          options={{
            mode: 'shipping',
            defaultValues: existing ? {
              address: {
                line1: existing.line1,
                city: existing.city,
                state: existing.region,
                country: existing.country || 'US',
              },
            } : undefined,
          }}
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-outline" disabled={saving}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save address
        </button>
      </div>
    </div>
  );
}

function ShippingTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/profile/shipping')
      .then((r) => r.json())
      .then(({ address }) => setAddress(address ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (newAddress) => {
    setSaveError('');
    const res = await fetch('/api/profile/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: newAddress }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSaveError(data.error ?? 'Failed to save address. Please try again.');
      return;
    }
    setAddress(newAddress);
    setIsEditing(false);
  };

  return (
    <>
      <Card
        title="Shipping address"
        subtitle={user.shipping.note}
        action={
          !isEditing && !loading && (
            <button onClick={() => setIsEditing(true)} className="btn-outline">
              <Pencil size={14} /> {address ? 'Edit' : 'Add address'}
            </button>
          )
        }
      >
        {saveError && <p className="text-xs text-rose-600 mb-3">{saveError}</p>}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-500 py-2">
            <Loader2 size={14} className="animate-spin" /> Loading address…
          </div>
        ) : !isEditing ? (
          address ? (
            <div className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-2">
                {address.label && <span className="chip bg-brand-50 text-brand-700">{address.label}</span>}
                <span className="chip bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> Verified</span>
              </div>
              <div className="mt-3 text-sm text-ink-700 space-y-0.5">
                <div className="font-semibold text-ink-900">{address.line1}</div>
                {address.line2 && <div>{address.line2}</div>}
                <div>{[address.city, address.region].filter(Boolean).join(', ')}</div>
                <div>{address.country}</div>
              </div>
              <div className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                <b>What sellers see:</b> {address.city}, {address.country} — until you win and a label is generated.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
              <MapPin size={24} className="mx-auto text-ink-300 mb-2" />
              <p className="text-sm text-ink-500">No shipping address saved yet.</p>
              <p className="text-xs text-ink-400 mt-0.5">Add one so sellers can generate your shipping label when you win.</p>
            </div>
          )
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              mode: 'setup',
              currency: 'usd',
              appearance: { theme: 'stripe' },
            }}
          >
            <AddressForm
              existing={address}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </Elements>
        )}
      </Card>
    </>
  );
}

function SecurityTab() {
  const { session } = useAuth();
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const toggleShow = (field) => setShowPw((p) => ({ ...p, [field]: !p[field] }));
  const updatePw = (field) => (e) => setPwForm((p) => ({ ...p, [field]: e.target.value }));

  // Simple password strength: 0-4
  const strength = (() => {
    const p = pwForm.next;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-400', 'bg-brand-500', 'bg-emerald-500'][strength];

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwError('');

    if (!pwForm.current) { setPwError('Please enter your current password.'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }

    setPwLoading(true);

    // Re-authenticate with current password to verify it's correct
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session?.user?.email,
      password: pwForm.current,
    });

    if (signInError) {
      setPwError('Current password is incorrect.');
      setPwLoading(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: pwForm.next });

    if (updateError) {
      setPwError(updateError.message);
      setPwLoading(false);
      return;
    }

    setPwSuccess(true);
    setPwLoading(false);
    setPwForm({ current: '', next: '', confirm: '' });
    setTimeout(() => { setPwSuccess(false); setChangingPw(false); }, 2500);
  };

  const handleCancelPw = () => {
    setChangingPw(false);
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setPwSuccess(false);
  };

  // ── 2FA (TOTP) ──────────────────────────────────────────────────────────────
  const [factors, setFactors] = useState([]);
  const [mfaLoading, setMfaLoading] = useState(true);

  // enrollment
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState(null); // { qrCode, secret, factorId }
  const [enrollChallengeId, setEnrollChallengeId] = useState('');
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);

  // disable
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(data?.totp ?? []);
      setMfaLoading(false);
    });
  }, []);

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  const handleEnableClick = async () => {
    setEnrollError('');
    setEnrollLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'TechBidly' });
    if (error) { setEnrollError(error.message); setEnrollLoading(false); return; }
    const { data: ch } = await supabase.auth.mfa.challenge({ factorId: data.id });
    setEnrollData({ qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
    setEnrollChallengeId(ch.id);
    setEnrollLoading(false);
    setEnrolling(true);
  };

  const handleEnrollVerify = async (e) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: enrollChallengeId,
      code: enrollCode,
    });
    if (error) { setEnrollError('Invalid code. Please try again.'); setEnrollLoading(false); return; }
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setEnrolling(false);
    setEnrollData(null);
    setEnrollCode('');
    setEnrollLoading(false);
  };

  const handleDisableVerify = async (e) => {
    e.preventDefault();
    setDisableError('');
    setDisableLoading(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
    if (chErr) { setDisableError(chErr.message); setDisableLoading(false); return; }
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: ch.id,
      code: disableCode,
    });
    if (verErr) { setDisableError('Invalid code.'); setDisableLoading(false); return; }
    await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setDisabling(false);
    setDisableCode('');
    setDisableLoading(false);
  };

  // ── Anonymity / privacy toggles ─────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({ showCityToSellers: true, allowSellerMessages: true });
  const [privacySaving, setPrivacySaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const saved = user?.user_metadata?.privacy_settings;
      if (saved) setPrivacy((p) => ({ ...p, ...saved }));
    });
  }, []);

  const handlePrivacyToggle = async (key) => {
    const next = { ...privacy, [key]: !privacy[key] };
    setPrivacy(next);
    setPrivacySaving(true);
    await supabase.auth.updateUser({ data: { privacy_settings: next } });
    setPrivacySaving(false);
  };

  return (
    <>
      <Card title="Sign-in security" subtitle="Keep your account safe.">

        {/* Password row */}
        <div className="border-b border-ink-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-ink-900">Password</div>
              <div className="text-xs text-ink-500">
                {pwSuccess
                  ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Changed successfully</span>
                  : 'Update your login password'}
              </div>
            </div>
            {!changingPw ? (
              <button
                onClick={() => setChangingPw(true)}
                className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1"
              >
                <Pencil size={11} /> Change
              </button>
            ) : (
              <button onClick={handleCancelPw} className="text-xs text-ink-500 hover:text-ink-800">
                Cancel
              </button>
            )}
          </div>

          {changingPw && (
            <form onSubmit={handleChangePw} className="pb-4 space-y-3">
              {/* Current password */}
              <div>
                <span className="label">Current password</span>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={updatePw('current')}
                    className="input pr-9"
                    placeholder="Your current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  >
                    {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <span className="label">New password</span>
                <div className="relative">
                  <input
                    type={showPw.next ? 'text' : 'password'}
                    value={pwForm.next}
                    onChange={updatePw('next')}
                    className="input pr-9"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow('next')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  >
                    {showPw.next ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Strength meter */}
                {pwForm.next && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength ? strengthColor : 'bg-ink-100'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-ink-500">{strengthLabel}</div>
                  </div>
                )}
              </div>

              {/* Confirm new password */}
              <div>
                <span className="label">Confirm new password</span>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={updatePw('confirm')}
                    className="input pr-9"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  >
                    {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.confirm && pwForm.next && (
                  <div className={`text-xs mt-1 flex items-center gap-1 ${pwForm.next === pwForm.confirm ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {pwForm.next === pwForm.confirm
                      ? <><CheckCircle2 size={11} /> Passwords match</>
                      : 'Passwords do not match'}
                  </div>
                )}
              </div>

              {pwError && <p className="text-xs text-rose-600">{pwError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {pwLoading && <Loader2 size={14} className="animate-spin" />}
                  {pwLoading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2FA row */}
        <div className="border-b border-ink-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-ink-900">2-factor authentication</div>
              <div className="text-xs text-ink-500">
                {mfaLoading ? 'Loading…' : verifiedFactor ? 'Authenticator app · Enabled' : 'Not set up'}
              </div>
            </div>
            {!mfaLoading && !enrolling && !disabling && (
              verifiedFactor ? (
                <button
                  onClick={() => setDisabling(true)}
                  className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <KeyRound size={11} /> Disable
                </button>
              ) : (
                <button
                  onClick={handleEnableClick}
                  disabled={enrollLoading}
                  className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {enrollLoading ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                  {enrollLoading ? 'Loading…' : 'Enable'}
                </button>
              )
            )}
          </div>

          {/* Enrollment UI */}
          {enrolling && enrollData && (
            <div className="pb-4 space-y-4">
              <p className="text-xs text-ink-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
              <div className="flex flex-col items-center gap-3">
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollData.qrCode)}`}
                  alt="Scan this QR code"
                  className="w-40 h-40 rounded-xl border border-ink-100 p-1 bg-white"
                />
                <div className="text-center">
                  <p className="text-xs text-ink-500">Can't scan? Enter this key manually:</p>
                  <p className="text-xs font-mono bg-ink-50 rounded-lg px-3 py-1.5 mt-1 text-ink-700 tracking-wider select-all">
                    {enrollData.secret}
                  </p>
                </div>
              </div>
              <form onSubmit={handleEnrollVerify} className="space-y-3">
                <div>
                  <span className="label">6-digit code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input text-center font-mono tracking-widest"
                    placeholder="000000"
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                  />
                </div>
                {enrollError && <p className="text-xs text-rose-600">{enrollError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setEnrolling(false); setEnrollData(null); setEnrollCode(''); setEnrollError(''); }}
                    className="btn-outline"
                    disabled={enrollLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrollLoading || enrollCode.length !== 6}
                    className="btn-brand disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {enrollLoading && <Loader2 size={14} className="animate-spin" />}
                    <Smartphone size={14} />
                    {enrollLoading ? 'Verifying…' : 'Activate 2FA'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Disable UI */}
          {disabling && verifiedFactor && (
            <form onSubmit={handleDisableVerify} className="pb-4 space-y-3">
              <p className="text-xs text-ink-600">Enter your current authenticator code to confirm disabling 2FA.</p>
              <div>
                <span className="label">Authentication code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input text-center font-mono tracking-widest"
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              {disableError && <p className="text-xs text-rose-600">{disableError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setDisabling(false); setDisableCode(''); setDisableError(''); }}
                  className="btn-outline"
                  disabled={disableLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disableLoading || disableCode.length !== 6}
                  className="text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl px-3 py-1.5 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {disableLoading && <Loader2 size={14} className="animate-spin" />}
                  {disableLoading ? 'Disabling…' : 'Confirm disable'}
                </button>
              </div>
            </form>
          )}
        </div>

      </Card>
      <Card title="Anonymity controls" subtitle="Control what sellers and other users can see.">
        {/* Show city to sellers */}
        <div className="flex items-center justify-between py-3 border-b border-ink-100">
          <div>
            <div className="text-sm font-semibold text-ink-900">Show city to sellers</div>
            <div className="text-xs text-ink-500">
              {privacy.showCityToSellers
                ? 'On — sellers see your city for shipping estimates'
                : 'Off — your city is hidden from sellers'}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={privacy.showCityToSellers}
            onClick={() => handlePrivacyToggle('showCityToSellers')}
            disabled={privacySaving}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none disabled:opacity-50 ${
              privacy.showCityToSellers ? 'bg-brand-600' : 'bg-ink-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              privacy.showCityToSellers ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Allow seller messages */}
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-semibold text-ink-900">Allow seller messages</div>
            <div className="text-xs text-ink-500">
              {privacy.allowSellerMessages
                ? 'On — sellers can contact you after a winning bid'
                : 'Off — sellers cannot send you messages'}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={privacy.allowSellerMessages}
            onClick={() => handlePrivacyToggle('allowSellerMessages')}
            disabled={privacySaving}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none disabled:opacity-50 ${
              privacy.allowSellerMessages ? 'bg-brand-600' : 'bg-ink-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              privacy.allowSellerMessages ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </Card>
    </>
  );
}

function PreferencesTab() {
  const ALL_CATEGORIES = ['phones', 'laptops', 'tablets', 'audio', 'wearables'];

  const [selected, setSelected] = useState(user.preferences);
  const [saved, setSaved] = useState(false);

  const toggle = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSaved(false);
  };

  const handleSaveCategories = () => setSaved(true);

  // Notification state
  const CHANNEL_OPTIONS = ['Push', 'Email', 'SMS'];
  const DIGEST_DAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
  const DIGEST_TIMES = ['7am', '8am', '9am', '10am', '12pm', '6pm', '8pm'];

  const [notifs, setNotifs] = useState({
    outbid:  { channels: ['Push', 'Email'], editing: false },
    ending:  { channels: ['Push'], editing: false },
    digest:  { day: 'Sundays', time: '9am', editing: false },
  });

  const openEdit  = (key) => setNotifs((p) => ({ ...p, [key]: { ...p[key], editing: true,  _draft: { ...p[key] } } }));
  const cancelEdit = (key) => setNotifs((p) => ({ ...p, [key]: { ...p[key]._draft, editing: false } }));
  const saveEdit  = (key) => setNotifs((p) => ({ ...p, [key]: { ...p[key], editing: false, _draft: undefined } }));

  const toggleChannel = (key, ch) =>
    setNotifs((p) => {
      const cur = p[key].channels;
      return { ...p, [key]: { ...p[key], channels: cur.includes(ch) ? cur.filter((c) => c !== ch) : [...cur, ch] } };
    });

  const setDigestField = (field, val) =>
    setNotifs((p) => ({ ...p, digest: { ...p.digest, [field]: val } }));

  const fmtChannels = (channels) => channels.length ? channels.join(' + ') : 'None';

  return (
    <Card title="Buyer preferences" subtitle="We tune your dashboard to match.">
      {/* ── Categories ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="label mb-0">Categories</span>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={12} /> Saved
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((c) => {
          const active = selected.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`chip capitalize transition-all select-none ${
                active
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-white border border-ink-200 text-ink-600 hover:border-ink-400 hover:text-ink-900'
              }`}
            >
              {active && <CheckCircle2 size={11} className="shrink-0" />}
              {c}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSaveCategories}
          disabled={saved}
          className="btn-brand text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? 'Saved' : 'Save categories'}
        </button>
      </div>

      {/* ── Notifications ── */}
      <div className="mt-6">
        <span className="label">Notifications</span>

        {/* Outbid alerts */}
        <div className="py-3 border-b border-ink-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">Outbid alerts</div>
              <div className="text-xs text-ink-500">{fmtChannels(notifs.outbid.channels)}</div>
            </div>
            {!notifs.outbid.editing ? (
              <button onClick={() => openEdit('outbid')} className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
                <Pencil size={11} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => cancelEdit('outbid')} className="text-xs text-ink-500 hover:text-ink-800">Cancel</button>
                <button onClick={() => saveEdit('outbid')} className="text-xs font-semibold text-brand-700 hover:underline">Save</button>
              </div>
            )}
          </div>
          {notifs.outbid.editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel('outbid', ch)}
                  className={`chip text-xs transition-all ${
                    notifs.outbid.channels.includes(ch)
                      ? 'bg-ink-900 text-white'
                      : 'bg-white border border-ink-200 text-ink-600 hover:border-ink-400'
                  }`}
                >
                  {notifs.outbid.channels.includes(ch) && <CheckCircle2 size={10} />}
                  {ch}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auctions ending soon */}
        <div className="py-3 border-b border-ink-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">Auctions ending soon</div>
              <div className="text-xs text-ink-500">{fmtChannels(notifs.ending.channels)}</div>
            </div>
            {!notifs.ending.editing ? (
              <button onClick={() => openEdit('ending')} className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
                <Pencil size={11} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => cancelEdit('ending')} className="text-xs text-ink-500 hover:text-ink-800">Cancel</button>
                <button onClick={() => saveEdit('ending')} className="text-xs font-semibold text-brand-700 hover:underline">Save</button>
              </div>
            )}
          </div>
          {notifs.ending.editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel('ending', ch)}
                  className={`chip text-xs transition-all ${
                    notifs.ending.channels.includes(ch)
                      ? 'bg-ink-900 text-white'
                      : 'bg-white border border-ink-200 text-ink-600 hover:border-ink-400'
                  }`}
                >
                  {notifs.ending.channels.includes(ch) && <CheckCircle2 size={10} />}
                  {ch}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weekly digest */}
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">Weekly digest</div>
              <div className="text-xs text-ink-500">{notifs.digest.day} · {notifs.digest.time}</div>
            </div>
            {!notifs.digest.editing ? (
              <button onClick={() => openEdit('digest')} className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
                <Pencil size={11} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => cancelEdit('digest')} className="text-xs text-ink-500 hover:text-ink-800">Cancel</button>
                <button onClick={() => saveEdit('digest')} className="text-xs font-semibold text-brand-700 hover:underline">Save</button>
              </div>
            )}
          </div>
          {notifs.digest.editing && (
            <div className="mt-3 space-y-3">
              <div>
                <span className="label text-xs">Day</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DIGEST_DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDigestField('day', d)}
                      className={`chip text-xs transition-all ${
                        notifs.digest.day === d
                          ? 'bg-ink-900 text-white'
                          : 'bg-white border border-ink-200 text-ink-600 hover:border-ink-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label text-xs">Time</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DIGEST_TIMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setDigestField('time', t)}
                      className={`chip text-xs transition-all ${
                        notifs.digest.time === t
                          ? 'bg-ink-900 text-white'
                          : 'bg-white border border-ink-200 text-ink-600 hover:border-ink-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}


