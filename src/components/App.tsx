import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getAPIBase, setBackendUrl } from '../lib/api';
import { ensureSupabaseConfig, supabase } from '../lib/supabase';
import AuthForm from './AuthForm';
import PLGLanding from './PLGLanding';
import ProfileForm from './ProfileForm';
import AuditPanel from './AuditPanel';

interface Profile {
  email: string;
  role: string;
  audits_used: number;
  max_audits: number;
  profile_complete: boolean;
  first_name: string | null;
  last_name: string | null;
}

export default function App() {
  const [configReady, setConfigReady] = useState(false);
  const [backendConfigReady, setBackendConfigReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authFormMode, setAuthFormMode] = useState<'login' | 'signup'>('login');

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
        // Stale or invalid refresh token (e.g. after local DB reset) — clear and show guest
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [configReady, backendConfigReady]);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }
    fetchProfile(session.access_token);
  }, [session?.access_token]);

  const fetchProfile = async (token: string, retry = true) => {
    try {
      const resp = await fetch(`${getAPIBase()}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setProfile(await resp.json());
      } else if (resp.status === 401) {
        if (retry) {
          // First login can race with profile creation; retry once
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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (!configReady || !backendConfigReady || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (showAuthForm) {
      return (
        <AuthForm
          initialMode={authFormMode}
          onAuth={() => {
            supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
          }}
          onBack={() => setShowAuthForm(false)}
        />
      );
    }
    return (
      <PLGLanding
        onShowAuth={(mode) => {
          setAuthFormMode(mode ?? 'login');
          setShowAuthForm(true);
        }}
      />
    );
  }

  if (profile && !profile.profile_complete) {
    return (
      <ProfileForm
        accessToken={session.access_token}
        onComplete={() => fetchProfile(session.access_token)}
      />
    );
  }

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
    : session.user.email;

  return (
    <div className="space-y-4">
      {/* User bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-growth-500 flex items-center justify-center text-white font-bold text-sm">
            {(profile?.first_name?.[0] ?? session.user.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{displayName}</p>
            {profile && (
              <p className="text-xs text-neutral-500">
                {profile.role === 'admin' ? (
                  <span className="text-growth-600 font-medium">Admin</span>
                ) : profile.role === 'paid' ? (
                  <span className="text-growth-600 font-medium">Pro</span>
                ) : (
                  <>{profile.audits_used} of {profile.max_audits} free audit{profile.max_audits !== 1 ? 's' : ''} used</>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <a
              href="/admin"
              className="text-sm font-medium text-growth-600 hover:text-growth-700"
            >
              Admin Dashboard
            </a>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-700 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      <AuditPanel accessToken={session.access_token} userRole={profile?.role ?? 'user'} />
    </div>
  );
}
