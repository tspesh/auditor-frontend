import { useAuth } from '../hooks/useAuth';
import AuthGuard from './AuthGuard';
import AuditPanel from './AuditPanel';

interface AuditDetailPageProps {
  auditId: string;
}

export default function AuditDetailPage({ auditId }: AuditDetailPageProps) {
  const { session, profile } = useAuth();

  return (
    <AuthGuard>
      {session && (
        <AuditPanel
          accessToken={session.access_token}
          userRole={profile?.role ?? 'user'}
          initialAuditId={auditId}
        />
      )}
    </AuthGuard>
  );
}
