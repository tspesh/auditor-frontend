import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AuthForm from './AuthForm';
import ProfileForm from './ProfileForm';

export default function LoginPage() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const [initialMode] = useState<'login' | 'signup'>(() => {
    if (typeof window === 'undefined') return 'login';
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'signup' ? 'signup' : 'login';
  });

  useEffect(() => {
    if (loading) return;
    if (session && profile?.profile_complete) {
      window.location.href = '/dashboard';
    }
  }, [loading, session, profile]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session && profile && !profile.profile_complete) {
    return (
      <ProfileForm
        accessToken={session.access_token}
        onComplete={refreshProfile}
      />
    );
  }

  if (session) return null;

  return (
    <AuthForm
      initialMode={initialMode}
      onAuth={() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) window.location.href = '/dashboard';
        });
      }}
      onBack={() => {
        window.location.href = '/';
      }}
    />
  );
}
