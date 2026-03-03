import { useEffect, useState } from 'react';

import { API_BASE } from '../lib/api';

interface ProfileFormProps {
  accessToken: string;
  onComplete: () => void;
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

export default function ProfileForm({ accessToken, onComplete }: ProfileFormProps) {
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

  useEffect(() => {
    fetch(`${API_BASE}/profile/options`)
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isAgency === null) {
      setError('Please indicate whether you are an agency.');
      return;
    }
    if (!isAgency && !industry) {
      setError('Please select your industry.');
      return;
    }
    if (runningAds === null) {
      setError('Please indicate whether you are running advertisements.');
      return;
    }
    if (runningAds && !monthlyAdBudget) {
      setError('Please select your monthly ad budget.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone.trim() || null,
          website,
          business_name: businessName,
          is_agency: isAgency,
          industry: isAgency ? null : industry,
          running_ads: runningAds,
          monthly_ad_budget: runningAds ? monthlyAdBudget : null,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ detail: 'Something went wrong' }));
        throw new Error(body.detail ?? `Error ${resp.status}`);
      }

      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 shadow-level-2 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-growth-50 mb-4">
          <svg className="h-6 w-6 text-growth-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-neutral-900 mb-1">
          Complete Your Profile
        </h2>
        <p className="text-neutral-500 text-sm">
          Tell us about your business so we can tailor your audit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-first" className={labelClass}>First Name</label>
            <input
              id="pf-first"
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
            <label htmlFor="pf-last" className={labelClass}>Last Name</label>
            <input
              id="pf-last"
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

        {/* Phone */}
        <div>
          <label htmlFor="pf-phone" className={labelClass}>Phone Number</label>
          <input
            id="pf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Business name */}
        <div>
          <label htmlFor="pf-biz" className={labelClass}>Business Name</label>
          <input
            id="pf-biz"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            disabled={loading}
            className={inputClass}
            placeholder="Acme Corp"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="pf-web" className={labelClass}>Website</label>
          <input
            id="pf-web"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            required
            disabled={loading}
            className={inputClass}
            placeholder="https://example.com"
          />
        </div>

        {/* Agency toggle */}
        <div>
          <label className={labelClass}>Are you an agency?</label>
          <div className="flex gap-3 mt-1">
            <ToggleButton
              active={isAgency === true}
              disabled={loading}
              onClick={() => setIsAgency(true)}
            >
              Yes
            </ToggleButton>
            <ToggleButton
              active={isAgency === false}
              disabled={loading}
              onClick={() => { setIsAgency(false); setIndustry(''); }}
            >
              No
            </ToggleButton>
          </div>
        </div>

        {/* Industry (shown when NOT an agency) */}
        {isAgency === false && (
          <div>
            <label htmlFor="pf-industry" className={labelClass}>Industry</label>
            <div className="relative">
              <select
                id="pf-industry"
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

        {/* Running ads toggle */}
        <div>
          <label className={labelClass}>Are you running advertisements?</label>
          <div className="flex gap-3 mt-1">
            <ToggleButton
              active={runningAds === true}
              disabled={loading}
              onClick={() => setRunningAds(true)}
            >
              Yes
            </ToggleButton>
            <ToggleButton
              active={runningAds === false}
              disabled={loading}
              onClick={() => { setRunningAds(false); setMonthlyAdBudget(''); }}
            >
              No
            </ToggleButton>
          </div>
        </div>

        {/* Monthly ad budget (shown when running ads) */}
        {runningAds === true && (
          <div>
            <label htmlFor="pf-budget" className={labelClass}>
              What is your monthly ad budget today?
            </label>
            <div className="relative">
              <select
                id="pf-budget"
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
          {loading ? 'Saving...' : 'Continue to Audit'}
        </button>
      </form>
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
