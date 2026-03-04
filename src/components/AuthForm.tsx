import { useEffect, useState } from 'react';
import { getAPIBase } from '../lib/api';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

interface AuthFormProps {
  onAuth: () => void;
  onBack?: () => void;
  initialMode?: 'login' | 'signup';
}

interface ProfileOptions {
  industries: string[];
  ad_budgets: string[];
}

const inputClass =
  'w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 disabled:opacity-50 text-sm';

const selectClass =
  'w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 disabled:opacity-50 text-sm appearance-none';

const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';

export default function AuthForm({ onAuth, onBack, initialMode = 'login' }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile fields (signup only)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isAgency, setIsAgency] = useState<boolean | null>(null);
  const [industry, setIndustry] = useState('');
  const [runningAds, setRunningAds] = useState<boolean | null>(null);
  const [monthlyAdBudget, setMonthlyAdBudget] = useState('');

  const [options, setOptions] = useState<ProfileOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getAPIBase()}/profile/options`)
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => {});
  }, []);

  const validateSignupFields = (): string | null => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!businessName.trim()) return 'Business name is required.';
    if (!website.trim()) return 'Website is required.';
    if (isAgency === null) return 'Please indicate whether you are an agency.';
    if (!isAgency && !industry) return 'Please select your industry.';
    if (runningAds === null) return 'Please indicate whether you are running advertisements.';
    if (runningAds && !monthlyAdBudget) return 'Please select your monthly ad budget.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const validationError = validateSignupFields();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim() || null,
              website: website.trim(),
              business_name: businessName.trim(),
              is_agency: isAgency,
              industry: isAgency ? null : industry,
              running_ads: runningAds,
              monthly_ad_budget: runningAds ? monthlyAdBudget : null,
            },
          },
        });
        if (signUpError) throw signUpError;
        fetch(`${getAPIBase()}/hubspot/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || '',
            company: businessName.trim(),
            website: website.trim(),
            are_you_an_agency: isAgency === true ? 'Yes' : 'No',
            are_you_running_advertisements: runningAds === true ? 'Yes' : 'No',
            industry: isAgency ? '' : industry,
            advertising_budgets: runningAds ? monthlyAdBudget : '',
          }),
        })
          .catch(() => {});
        setSuccess('Check your email to confirm your account.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuth();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 mx-auto ${
      mode === 'signup' ? 'max-w-lg' : 'max-w-md'
    }`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          ← Back
        </button>
      )}
      <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-2 text-center">
        {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
      </h2>
      <p className="text-neutral-500 text-sm text-center mb-6">
        {mode === 'login'
          ? 'Sign in to run your audit.'
          : 'Sign up for a free website audit.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Signup-only: profile fields ── */}
        {mode === 'signup' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="auth-first" className={labelClass}>First Name</label>
                <input
                  id="auth-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                  className={inputClass}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label htmlFor="auth-last" className={labelClass}>Last Name</label>
                <input
                  id="auth-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                  className={inputClass}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-phone" className={labelClass}>Phone Number</label>
              <input
                id="auth-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="auth-biz" className={labelClass}>Business Name</label>
              <input
                id="auth-biz"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                disabled={loading}
                className={inputClass}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label htmlFor="auth-web" className={labelClass}>Website</label>
              <input
                id="auth-web"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                disabled={loading}
                className={inputClass}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className={labelClass}>Are you an agency?</label>
              <div className="flex gap-3 mt-1">
                <ToggleButton active={isAgency === true} disabled={loading} onClick={() => setIsAgency(true)}>
                  Yes
                </ToggleButton>
                <ToggleButton active={isAgency === false} disabled={loading} onClick={() => { setIsAgency(false); setIndustry(''); }}>
                  No
                </ToggleButton>
              </div>
            </div>

            {isAgency === false && (
              <div>
                <label htmlFor="auth-industry" className={labelClass}>Industry</label>
                <div className="relative">
                  <select
                    id="auth-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                    disabled={loading}
                    className={selectClass}
                  >
                    <option value="" disabled>Select your industry</option>
                    {(options?.industries ?? []).map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Are you running advertisements?</label>
              <div className="flex gap-3 mt-1">
                <ToggleButton active={runningAds === true} disabled={loading} onClick={() => setRunningAds(true)}>
                  Yes
                </ToggleButton>
                <ToggleButton active={runningAds === false} disabled={loading} onClick={() => { setRunningAds(false); setMonthlyAdBudget(''); }}>
                  No
                </ToggleButton>
              </div>
            </div>

            {runningAds === true && (
              <div>
                <label htmlFor="auth-budget" className={labelClass}>What is your monthly ad budget today?</label>
                <div className="relative">
                  <select
                    id="auth-budget"
                    value={monthlyAdBudget}
                    onChange={(e) => setMonthlyAdBudget(e.target.value)}
                    required
                    disabled={loading}
                    className={selectClass}
                  >
                    <option value="" disabled>Select a range</option>
                    {(options?.ad_budgets ?? []).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>
            )}

            {/* Visual separator before credentials */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-neutral-400 uppercase tracking-wider">Account Credentials</span>
              </div>
            </div>
          </>
        )}

        {/* ── Email & Password (always shown) ── */}
        <div>
          <label htmlFor="auth-email" className={labelClass}>Email</label>
          <input
            id="auth-email"
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

        <div>
          <label htmlFor="auth-password" className={labelClass}>Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-confirm" className={labelClass}>Confirm Password</label>
            <input
              id="auth-confirm"
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
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {success}
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
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={switchMode}
          className="text-sm text-growth-600 hover:text-growth-700 font-medium"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}


function ToggleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-all duration-200
        ${active
          ? 'bg-growth-500 text-white border-growth-500'
          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}


function ChevronIcon() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
      <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}
