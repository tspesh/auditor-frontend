import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      window.location.href = '/login';
      return;
    }
    if (requireAdmin && profile && profile.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [loading, session, profile, requireAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;
  if (requireAdmin && profile && profile.role !== 'admin') return null;

  return <>{children}</>;
}
