import { useEffect, useRef, useState } from 'react';
import { ensureSupabaseConfig, supabase } from '../lib/supabase';

const inputClass =
  'w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 disabled:opacity-50 text-sm';

const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';

type PageState = 'loading' | 'ready' | 'success' | 'invalid';

export default function UpdatePasswordPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recoveryDetected = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    ensureSupabaseConfig().then(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          recoveryDetected.current = true;
          setPageState('ready');
          clearTimeout(timeout);
        }
      });

      // If no PASSWORD_RECOVERY event fires within 5 seconds, the link is invalid or the user
      // navigated here directly.
      timeout = setTimeout(() => {
        if (!recoveryDetected.current) {
          setPageState('invalid');
        }
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPageState('success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto max-w-md text-center">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-neutral-500 text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto max-w-md text-center">
        <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-2">
          Invalid or Expired Link
        </h2>
        <p className="text-neutral-500 text-sm mb-6">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <a
          href="/forgot-password"
          className="inline-block px-8 py-3 rounded-md font-semibold text-white
                     bg-growth-500 hover:bg-growth-600
                     focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                     transition-all duration-200"
        >
          Request New Link
        </a>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto max-w-md text-center">
        <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-2">
          Password Updated
        </h2>
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 mb-4">
          Your password has been updated successfully. Redirecting to login...
        </div>
        <a
          href="/login"
          className="text-sm text-growth-600 hover:text-growth-700 font-medium"
        >
          Go to login now
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto max-w-md">
      <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-2 text-center">
        Set New Password
      </h2>
      <p className="text-neutral-500 text-sm text-center mb-6">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className={labelClass}>New Password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirm-new-password" className={labelClass}>Confirm New Password</label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-8 py-3 rounded-md font-semibold text-white
                     bg-growth-500 hover:bg-growth-600
                     focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
