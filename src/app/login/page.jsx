'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, ShieldCheck, ShoppingCart, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  );
}

function LoginForm() {
  const { signIn, session, needsRolePicker, profilesLoading, switchRole, profiles, activeRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/';
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(oauthError ? 'Google sign-in failed. Please try again.' : '');
  const [loading, setLoading] = useState(false);

  // MFA step
  const mfaPendingRef = useRef(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Redirect once session + active role are both ready
  useEffect(() => {
    if (session && activeRole && !profilesLoading && !mfaPendingRef.current) {
      router.replace(from);
    }
  }, [session, activeRole, profilesLoading, from, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mfaPendingRef.current = true;
    const { error } = await signIn(email, password);
    if (error) {
      mfaPendingRef.current = false;
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0];
      if (factor) {
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        setMfaFactorId(factor.id);
        setMfaChallengeId(challenge.id);
        setMfaStep(true);
        setLoading(false);
        return;
      }
    }
    mfaPendingRef.current = false;
    setLoading(false);
    // AuthContext will handle redirect via the useEffect above once profiles load
  };

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`,
      },
    });
    if (error) setError(error.message);
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: totpCode,
    });
    if (error) {
      setError('Invalid code. Please try again.');
      setLoading(false);
      return;
    }
    mfaPendingRef.current = false;
  };

  if (mfaStep) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-xl bg-ink-900 grid place-items-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-display font-bold text-ink-900">TechBidly</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-brand-100 grid place-items-center mx-auto mb-3">
              <ShieldCheck size={24} className="text-brand-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-ink-900">Two-factor auth</h1>
            <p className="text-sm text-ink-500 mt-1">Enter the 6-digit code from your authenticator app</p>
          </div>
          <div className="card p-6">
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label className="label">Authentication code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="input text-center text-lg tracking-widest font-mono"
                  placeholder="000 000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={16} />
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => {
                  supabase.auth.signOut();
                  mfaPendingRef.current = false;
                  setMfaStep(false);
                  setTotpCode('');
                  setError('');
                }}
                className="w-full text-xs text-ink-500 hover:text-ink-700 text-center"
              >
                Back to sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Role picker — shown when user has both a buyer and seller account
  if (needsRolePicker) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f2effe' }}>
        <div className="w-full max-w-sm">
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
            <h1 className="text-2xl font-display font-bold text-ink-900">Choose your mode</h1>
            <p className="text-sm text-ink-500 mt-1">You have both a buyer and seller account</p>
          </div>
          <div className="card p-6">
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((p) => (
                <button
                  key={p.role}
                  onClick={() => switchRole(p.role)}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-ink-200 p-5 hover:border-brand-400 hover:bg-brand-50 transition"
                >
                  {p.role === 'buyer'
                    ? <ShoppingCart size={28} className="text-brand-600" />
                    : <Store size={28} className="text-brand-600" />}
                  <div>
                    <div className="text-sm font-semibold text-ink-900 capitalize">{p.role}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5 truncate max-w-[100px]">{p.handle}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-400 text-center mt-4">
              You can switch accounts at any time from your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-ink-900 grid place-items-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="text-xl font-display font-bold text-ink-900">TechBidly</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-500 mt-1">Sign in to your anonymous account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-ink-400">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-outline w-full flex items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="mt-4 pt-4 border-t border-ink-100 text-center space-y-2">
            <p className="text-sm text-ink-500">
              Don't have an account?{' '}
              <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
                Create one
              </Link>
            </p>
            <p className="text-xs text-ink-400">Your real identity is never shown to other users.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
