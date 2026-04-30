'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.js';

const AuthContext = createContext(null);

const ROLE_KEY = (uid) => `techbidly_active_role_${uid}`;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfiles([]);
      setActiveRole(null);
      setProfilesLoading(false);
      return;
    }

    setProfilesLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .then(async ({ data }) => {
        const userProfiles = data ?? [];
        setProfiles(userProfiles);

        // Restore active role from localStorage
        const saved = localStorage.getItem(ROLE_KEY(session.user.id));
        if (saved && userProfiles.some((p) => p.role === saved)) {
          setActiveRole(saved);
        } else if (userProfiles.length === 1) {
          // Only one profile — activate it automatically
          setActiveRole(userProfiles[0].role);
          localStorage.setItem(ROLE_KEY(session.user.id), userProfiles[0].role);
        }
        // Two profiles with no saved role → needsRolePicker will be true

        setProfilesLoading(false);

        // Ensure Stripe customer for each profile on first load
        const active = userProfiles.find((p) => p.role === activeRole) ?? userProfiles[0];
        if (active && !active.stripe_customer_id) {
          await fetch('/api/stripe/customer/ensure', { method: 'POST' });
        }
      });
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep profiles in sync with any remote updates (e.g. handle changes)
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel(`profiles-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => {
          setProfiles((prev) =>
            prev.map((p) => p.role === payload.new.role ? { ...p, ...payload.new } : p)
          );
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const profile = profiles.find((p) => p.role === activeRole) ?? null;
  const role = profile?.role ?? null;
  const needsRolePicker =
    !!session && !profilesLoading && profiles.length > 1 && !activeRole;

  const switchRole = (newRole) => {
    if (!profiles.some((p) => p.role === newRole)) return;
    setActiveRole(newRole);
    if (session?.user) {
      localStorage.setItem(ROLE_KEY(session.user.id), newRole);
    }
  };

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => {
    if (session?.user) localStorage.removeItem(ROLE_KEY(session.user.id));
    setActiveRole(null);
    setProfiles([]);
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        profiles,
        role,
        activeRole,
        needsRolePicker,
        profilesLoading,
        signIn,
        signOut,
        switchRole,
        loading: session === undefined || (!!session && profilesLoading),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
