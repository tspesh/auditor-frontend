import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import PLGLanding from './PLGLanding';

export default function LandingApp() {
  const { session, profile, loading } = useAuth();

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

  if (session) return null;

  return (
    <PLGLanding
      onShowAuth={(mode) => {
        window.location.href = `/login${mode === 'signup' ? '?mode=signup' : ''}`;
      }}
    />
  );
}
