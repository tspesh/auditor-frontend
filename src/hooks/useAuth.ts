import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getAPIBase } from '../lib/api';
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

// Profile cache shared across island re-mounts (Astro View Transitions keep the
// JS realm alive) and across full reloads (sessionStorage). This lets navigation
// hydrate the profile instantly instead of re-fetching and flashing a spinner.
const PROFILE_KEY_PREFIX = 'profile:';
const profileCache = new Map<string, Profile>();

function readCachedProfile(userId: string): Profile | null {
  const mem = profileCache.get(userId);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw) as Profile;
      profileCache.set(userId, parsed);
      return parsed;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  return null;
}

function writeCachedProfile(userId: string, profile: Profile): void {
  profileCache.set(userId, profile);
  try {
    sessionStorage.setItem(PROFILE_KEY_PREFIX + userId, JSON.stringify(profile));
  } catch {
    /* sessionStorage unavailable */
  }
}

function clearCachedProfiles(): void {
  profileCache.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PROFILE_KEY_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

export function useAuth() {
  const [configReady, setConfigReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    ensureSupabaseConfig().then(() => {
      setConfigReady(true);
    });
  }, []);

  useEffect(() => {
    if (!configReady) return;
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
  }, [configReady]);

  const fetchProfile = useCallback(
    async (token: string, userId: string, retry = true) => {
      try {
        const resp = await fetch(`${getAPIBase()}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const p = (await resp.json()) as Profile;
          writeCachedProfile(userId, p);
          setProfile(p);
        } else if (resp.status === 401) {
          if (retry) {
            await new Promise((r) => setTimeout(r, 1500));
            return fetchProfile(token, userId, false);
          }
          clearCachedProfiles();
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
    const token = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) {
      setProfile(null);
      return;
    }
    // Instant hydration from cache (no spinner on navigation), then revalidate.
    const cached = readCachedProfile(userId);
    if (cached) setProfile(cached);
    fetchProfile(token, userId);
  }, [session?.access_token, session?.user?.id, fetchProfile]);

  const logout = useCallback(async () => {
    clearCachedProfiles();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.access_token && session?.user?.id) {
      await fetchProfile(session.access_token, session.user.id);
    }
  }, [session?.access_token, session?.user?.id, fetchProfile]);

  return { session, profile, loading, logout, refreshProfile };
}
