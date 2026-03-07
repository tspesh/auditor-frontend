import { useAuth } from '../hooks/useAuth';
import AuthGuard from './AuthGuard';
import AuditPanel from './AuditPanel';

export default function DashboardPage() {
  const { session, profile } = useAuth();

  return (
    <AuthGuard>
      {session && (
        <AuditPanel
          accessToken={session.access_token}
          userRole={profile?.role ?? 'user'}
        />
      )}
    </AuthGuard>
  );
}
