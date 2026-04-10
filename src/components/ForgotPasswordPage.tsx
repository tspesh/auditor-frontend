import { useState } from 'react';
import { supabase } from '../lib/supabase';

const inputClass =
  'w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 disabled:opacity-50 text-sm';

const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto max-w-md">
      <a
        href="/login"
        className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 inline-block"
      >
        &larr; Back to login
      </a>

      <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-2 text-center">
        Reset Your Password
      </h2>
      <p className="text-neutral-500 text-sm text-center mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {submitted ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          Check your email for a password reset link. You can close this page.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className={labelClass}>Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className={inputClass}
              placeholder="you@company.com"
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
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
}
