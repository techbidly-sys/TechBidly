'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Store, CheckCircle2, XCircle, Loader2, UserPlus, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase.js';

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

export default function SignupComplete() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [form, setForm] = useState({
    role: '',
    companyName: '',
    taxCountry: 'US',
    taxId: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressRegion: '',
    addressPostal: '',
    addressCountry: 'US',
  });
  const [nameAvailability, setNameAvailability] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace('/login'); return; }
      const { data: profiles } = await supabase
        .from('profiles').select('id').eq('id', session.user.id);
      if (profiles && profiles.length > 0) { router.replace('/'); return; }
      setUser(session.user);
      setSessionLoading(false);
    });
  }, [router]);

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

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const taxLabel = COUNTRY_OPTIONS.find((c) => c.code === form.taxCountry)?.taxLabel ?? 'Tax ID';
  const stepCount = form.role === 'seller' ? 4 : 3;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please sign in again.');
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? 'Failed to create profile');
      }

      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await fetch('/api/upload/logo', { method: 'POST', body: fd }).catch(() => {});
      }

      localStorage.setItem(`techbidly_active_role_${user.id}`, form.role);
      router.replace('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f2effe' }}>
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const canSubmit =
    !!form.role &&
    form.companyName.trim().length >= 2 &&
    nameAvailability === 'available' &&
    !!form.taxId.trim() &&
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
          <h1 className="text-2xl font-display font-bold text-ink-900">Set up your business account</h1>
          <p className="text-sm text-ink-500 mt-1">We need your company details before you can start</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-7">

            {/* ── Section 1: Account type ── */}
            <section>
              <SectionHeader n={1} title="Account type" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <RoleCard
                  selected={form.role === 'buyer'} icon={ShoppingCart}
                  label="Buyer" sub="Bid & purchase goods"
                  onClick={() => setForm((f) => ({ ...f, role: 'buyer' }))}
                />
                <RoleCard
                  selected={form.role === 'seller'} icon={Store}
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
                  <label className="label">Company name <Required /></label>
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
                    <input type="text" className="input" placeholder={taxLabel} value={form.taxId} onChange={update('taxId')} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section 3: Company logo (optional) ── */}
            {form.role && (
              <section>
                <SectionHeader n={3} title="Company logo" />
                <p className="text-xs text-ink-500 mt-1 mb-3">
                  Optional — shown on your listings and bids when not anonymous.
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-dashed border-ink-300 hover:border-brand-500 transition flex items-center justify-center bg-ink-50 flex-shrink-0"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain bg-white" />
                    ) : (
                      <Upload size={20} className="text-ink-400" />
                    )}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn-outline text-sm"
                    >
                      {logoPreview ? 'Change logo' : 'Upload logo'}
                    </button>
                    <p className="text-xs text-ink-500 mt-1">PNG, JPG or WebP · max 2 MB · optional</p>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
              </section>
            )}

            {/* ── Section 4: Business address (sellers only) ── */}
            {form.role === 'seller' && (
              <section>
                <SectionHeader n={4} title="Business address" />
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
              {loading ? 'Setting up…' : 'Finish setup'}
            </button>
          </form>
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
