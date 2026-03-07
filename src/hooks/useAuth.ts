import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getAPIBase, setBackendUrl } from '../lib/api';
import { ensureSupabaseConfig, supabase } from '../lib/supabase';

export interface Profile {
  email: string;
  role: string;
  audits_used: number;
  max_audits: number;
  profile_complete: boolean;
  first_name: string | null;
  last_name: string | null;
}

export function useAuth() {
  const [configReady, setConfigReady] = useState(false);
  const [backendConfigReady, setBackendConfigReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    ensureSupabaseConfig().then(() => setConfigReady(true));
  }, []);

  useEffect(() => {
    fetch('/api/backend-config')
      .then((r) => r.json())
      .then((data: { apiUrl?: string }) => {
        if (data?.apiUrl) setBackendUrl(data.apiUrl);
        setBackendConfigReady(true);
      })
      .catch(() => setBackendConfigReady(true));
  }, []);

  useEffect(() => {
    if (!configReady || !backendConfigReady) return;
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setLoading(false);
      })
      .catch(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [configReady, backendConfigReady]);

  const fetchProfile = useCallback(
    async (token: string, retry = true) => {
      try {
        const resp = await fetch(`${getAPIBase()}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          setProfile(await resp.json());
        } else if (resp.status === 401) {
          if (retry) {
            await new Promise((r) => setTimeout(r, 1500));
            return fetchProfile(token, false);
          }
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
        }
      } catch {
        // Network errors are non-critical on first load
      }
    },
    [],
  );

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }
    fetchProfile(session.access_token);
  }, [session?.access_token, fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.access_token) {
      await fetchProfile(session.access_token);
    }
  }, [session?.access_token, fetchProfile]);

  return { session, profile, loading, logout, refreshProfile };
}
