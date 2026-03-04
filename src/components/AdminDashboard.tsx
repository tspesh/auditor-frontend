import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

import { getAPIBase } from '../lib/api';

interface AuditSummary {
  id: string;
  user_email: string;
  target_url: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface PaginatedAudits {
  items: AuditSummary[];
  total: number;
  page: number;
  page_size: number;
}

interface UserSummary {
  id: string;
  email: string;
  role: string;
  audits_used: number;
  max_audits: number;
  created_at: string;
}

interface PaginatedUsers {
  items: UserSummary[];
  total: number;
  page: number;
  page_size: number;
}

type Tab = 'audits' | 'users';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-neutral-200 text-neutral-700',
    running: 'bg-growth-100 text-growth-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.queued}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      role === 'admin' ? 'bg-growth-100 text-growth-700' : 'bg-neutral-200 text-neutral-600'
    }`}>
      {role}
    </span>
  );
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<Tab>('audits');
  const [audits, setAudits] = useState<PaginatedAudits | null>(null);
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    checkAdmin(session.access_token);
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !authorized) return;
    if (tab === 'audits') fetchAudits(session.access_token, page);
    else fetchUsers(session.access_token, page);
  }, [session?.access_token, authorized, tab, page]);

  const checkAdmin = async (token: string) => {
    try {
      const resp = await fetch(`${getAPIBase()}/audit/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Not authenticated');
      const data = await resp.json();
      if (data.role !== 'admin') {
        setError('Admin access required');
        return;
      }
      setAuthorized(true);
    } catch {
      setError('Authentication failed');
    }
  };

  const fetchAudits = async (token: string, p: number) => {
    try {
      const resp = await fetch(`${getAPIBase()}/admin/audits?page=${p}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      setAudits(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const fetchUsers = async (token: string, p: number) => {
    try {
      const resp = await fetch(`${getAPIBase()}/admin/users?page=${p}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      setUsers(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !authorized) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center max-w-md mx-auto">
        <h2 className="font-heading text-xl font-bold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-500 text-sm mb-4">{error ?? 'You must be an admin to view this page.'}</p>
        <a href="/" className="text-growth-600 hover:text-growth-700 font-medium text-sm">
          Back to Home
        </a>
      </div>
    );
  }

  const totalPages = tab === 'audits'
    ? Math.ceil((audits?.total ?? 0) / 20)
    : Math.ceil((users?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-neutral-900">Admin Dashboard</h2>
        <a href="/" className="text-sm text-growth-600 hover:text-growth-700 font-medium">
          Back to Auditor
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {(['audits', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t === 'audits' ? 'All Audits' : 'Users'}
          </button>
        ))}
      </div>

      {/* Audits Tab */}
      {tab === 'audits' && audits && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <p className="text-sm text-neutral-500">{audits.total} total audits</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {audits.items.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-6 py-3 font-mono text-xs text-growth-600 max-w-[250px] truncate">
                      {a.target_url}
                    </td>
                    <td className="px-6 py-3 text-neutral-700">{a.user_email}</td>
                    <td className="px-6 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-6 py-3 text-neutral-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {audits.items.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-400">No audits yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && users && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <p className="text-sm text-neutral-500">{users.total} total users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium text-right">Audits Used</th>
                  <th className="px-6 py-3 font-medium text-right">Quota</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-6 py-3 text-neutral-700">{u.email}</td>
                    <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-3 text-right text-neutral-700">{u.audits_used}</td>
                    <td className="px-6 py-3 text-right text-neutral-700">{u.max_audits}</td>
                    <td className="px-6 py-3 text-neutral-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-md text-sm font-medium bg-white border border-neutral-200
                       text-neutral-700 hover:bg-neutral-50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-md text-sm font-medium bg-white border border-neutral-200
                       text-neutral-700 hover:bg-neutral-50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
