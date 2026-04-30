'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus, Eye, EyeOff, ShoppingCart, Store,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase.js';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States', taxLabel: 'EIN' },
  { code: 'GB', label: 'United Kingdom', taxLabel: 'Company Number' },
  { code: 'CA', label: 'Canada', taxLabel: 'Business Number (BN)' },
  { code: 'AU', label: 'Australia', taxLabel: 'ABN' },
  { code: 'DE', label: 'Germany', taxLabel: 'USt-IdNr' },
  { code: 'FR', label: 'France', taxLabel: 'SIRET' },
  { code: 'NL', label: 'Netherlands', taxLabel: 'RSIN' },
  { code: 'SG', label: 'Singapore', taxLabel: 'UEN' },
  { code: 'AE', label: 'UAE', taxLabel: 'TRN' },
  { code: 'OTHER', label: 'Other country', taxLabel: 'Registration Number' },
];

const ADDRESS_COUNTRIES = COUNTRY_OPTIONS.filter((c) => c.code !== 'OTHER').concat([{ code: 'OTHER', label: 'Other', taxLabel: '' }]);

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    role: '',
    companyName: '',
    taxCountry: 'US',
    taxId: '',
    // seller address
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressRegion: '',
    addressPostal: '',
    addressCountry: 'US',
    // credentials
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [nameAvailability, setNameAvailability] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const taxLabel = COUNTRY_OPTIONS.find((c) => c.code === form.taxCountry)?.taxLabel ?? 'Tax ID';
  const stepCount = form.role === 'seller' ? 4 : 3;

  useEffect(() => {
    const name = form.companyName.trim();
    if (name.length < 2) { setNameAvailability(null); return; }
    setNameAvailability('checking');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/profile/handle?handle=${encodeURIComponent(name)}`);
      const json = await res.json();
      setNameAvailability(json.available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.companyName]);

  const handleGoogleSignup = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.role) { setError('Please choose Buyer or Seller.'); return; }
    if (form.companyName.trim().length < 2) { setError('Company name must be at least 2 characters.'); return; }
    if (nameAvailability !== 'available') { setError('Please choose an available company name.'); return; }
    if (!form.taxId.trim()) { setError(`${taxLabel} is required.`); return; }
    if (form.role === 'seller') {
      if (!form.addressLine1.trim()) { setError('Street address is required for seller accounts.'); return; }
      if (!form.addressCity.trim()) { setError('City is required for seller accounts.'); return; }
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const validateRes = await fetch(`/api/email/validate?email=${encodeURIComponent(form.email)}`);
      const { valid: emailValid } = await validateRes.json();
      if (!emailValid) { setError('Please enter a valid work email address.'); setLoading(false); return; }

      const { data: { user, session: signUpSession }, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signUpError) {
        const isExisting =
          signUpError.message?.toLowerCase().includes('already registered') ||
          signUpError.code === 'user_already_exists';

        if (isExisting) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });
          if (signInError) {
            setError(`An account already exists with this email. Sign in to add a ${form.role} profile.`);
            setLoading(false);
            return;
          }
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', signInData.user.id)
            .eq('role', form.role)
            .maybeSingle();
          if (existingProfile) {
            setError(`You already have a ${form.role} profile linked to this email.`);
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          const profileRes = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signInData.session.access_token}` },
            body: JSON.stringify({ form }),
          });
          if (!profileRes.ok) {
            const { error: msg } = await profileRes.json();
            throw new Error(msg ?? 'Failed to create profile');
          }
          localStorage.setItem(`techbidly_active_role_${signInData.user.id}`, form.role);
          router.replace('/');
          return;
        }
        throw signUpError;
      }

      if (!user) throw new Error('Signup failed — please try again.');
      if (!signUpSession) throw new Error('Please verify your email before continuing.');

      const profileRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signUpSession.access_token}` },
        body: JSON.stringify({ form }),
      });
      if (!profileRes.ok) {
        const { error: msg } = await profileRes.json();
        throw new Error(msg ?? 'Failed to create profile');
      }
      router.replace('/');
    } catch (err) {
      setError(err.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!form.role &&
    form.companyName.trim().length >= 2 &&
    nameAvailability === 'available' &&
    !!form.taxId.trim() &&
    !!form.email &&
    form.password.length >= 6 &&
    form.password === form.confirmPassword &&
    !loading;

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#f2effe' }}>
      <div className="w-full max-w-lg mx-auto">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold text-sm shadow-glow"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #f97316 100%)' }}
            >
              TB
            </div>
            <span className="text-xl font-display font-bold text-ink-900">TechBidly</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-ink-900">Create your business account</h1>
          <p className="text-sm text-ink-500 mt-1">For verified businesses only</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-7">

            {/* ── Section 1: Account type ── */}
            <section>
              <SectionHeader n={1} title="Account type" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <RoleCard
                  role="buyer" selected={form.role === 'buyer'} icon={ShoppingCart}
                  label="Buyer" sub="Bid & purchase goods"
                  onClick={() => setForm((f) => ({ ...f, role: 'buyer' }))}
                />
                <RoleCard
                  role="seller" selected={form.role === 'seller'} icon={Store}
                  label="Seller" sub="List & auction goods"
                  onClick={() => setForm((f) => ({ ...f, role: 'seller' }))}
                />
              </div>
            </section>

            {/* ── Section 2: Company info ── */}
            <section>
              <SectionHeader n={2} title="Company information" />
              <div className="mt-3 space-y-4">
                <div>
                  <label className="label">
                    Company name <Required />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-9 ${
                        nameAvailability === 'available' ? 'border-emerald-400 focus:ring-emerald-300' :
                        nameAvailability === 'taken' ? 'border-rose-400 focus:ring-rose-300' : ''
                      }`}
                      placeholder="e.g. Acme Industries Ltd"
                      value={form.companyName}
                      onChange={update('companyName')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {nameAvailability === 'checking' && <Loader2 size={15} className="animate-spin text-ink-400" />}
                      {nameAvailability === 'available' && <CheckCircle2 size={15} className="text-emerald-500" />}
                      {nameAvailability === 'taken' && <XCircle size={15} className="text-rose-500" />}
                    </div>
                  </div>
                  <p className={`text-xs mt-1.5 ${
                    nameAvailability === 'available' ? 'text-emerald-600' :
                    nameAvailability === 'taken' ? 'text-rose-600' : 'text-ink-400'
                  }`}>
                    {nameAvailability === 'available' && 'Available — this becomes your permanent public name on TechBidly'}
                    {nameAvailability === 'taken' && 'A business with this name already exists on TechBidly'}
                    {(nameAvailability === null || nameAvailability === 'checking') && 'This will be your permanent public name — it cannot be changed later'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Country <Required /></label>
                    <select className="input" value={form.taxCountry} onChange={update('taxCountry')}>
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{taxLabel} <Required /></label>
                    <input
                      type="text"
                      className="input"
                      placeholder={taxLabel}
                      value={form.taxId}
                      onChange={update('taxId')}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section 3: Business address (sellers only) ── */}
            {form.role === 'seller' && (
              <section>
                <SectionHeader n={3} title="Business address" />
                <p className="text-xs text-ink-500 mt-1 mb-3">
                  Your city and country are shown on your listings. Full address is only shared with the buyer after a successful sale.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Street address <Required /></label>
                    <input type="text" className="input" placeholder="123 Business Ave" value={form.addressLine1} onChange={update('addressLine1')} />
                  </div>
                  <div>
                    <label className="label">Suite / Floor <span className="text-ink-400 font-normal">(optional)</span></label>
                    <input type="text" className="input" placeholder="Suite 400" value={form.addressLine2} onChange={update('addressLine2')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">City <Required /></label>
                      <input type="text" className="input" placeholder="New York" value={form.addressCity} onChange={update('addressCity')} />
                    </div>
                    <div>
                      <label className="label">State / Region</label>
                      <input type="text" className="input" placeholder="NY" value={form.addressRegion} onChange={update('addressRegion')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Postal code</label>
                      <input type="text" className="input" placeholder="10001" value={form.addressPostal} onChange={update('addressPostal')} />
                    </div>
                    <div>
                      <label className="label">Country <Required /></label>
                      <select className="input" value={form.addressCountry} onChange={update('addressCountry')}>
                        {ADDRESS_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Section 3/4: Sign-in details ── */}
            <section>
              <SectionHeader n={stepCount} title="Sign-in details" />
              <div className="mt-3 space-y-3">
                <div>
                  <label className="label">Work email <Required /></label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={update('email')}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password <Required /></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={update('password')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm password <Required /></label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    required
                  />
                </div>
              </div>
            </section>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-brand w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} />
              {loading ? 'Creating account…' : 'Create business account'}
            </button>

            <p className="text-xs text-center text-ink-400 -mt-3">
              By signing up you confirm this is a legitimate registered business.
              TechBidly may request supporting documents to complete verification.
            </p>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-100" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-ink-400">or sign up with</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="btn-outline w-full flex items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            Continue with Google Workspace
          </button>

          <div className="mt-5 pt-4 border-t border-ink-100 text-center">
            <p className="text-sm text-ink-500">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ n, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-6 w-6 rounded-full bg-ink-900 text-white text-xs font-bold grid place-items-center flex-shrink-0">
        {n}
      </div>
      <h2 className="text-sm font-bold text-ink-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function RoleCard({ selected, icon: Icon, label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50'
      }`}
    >
      <Icon size={22} />
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-ink-500 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

function Required() {
  return <span className="text-rose-500">*</span>;
}
