import AuthGuard from './AuthGuard';
import AdminDashboard from './AdminDashboard';

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboard />
    </AuthGuard>
  );
}
