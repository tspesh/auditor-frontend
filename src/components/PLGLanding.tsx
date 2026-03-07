/**
 * PLG (product-led growth) landing: run an audit without signing in.
 * Same process and screens as logged-in flow during crawl; at completion
 * shows same report tabs and PDF button but disabled, with a note to sign up for the full report.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PipelineProgress, StatusBadge } from './AuditPipeline';
import type { PipelineResult } from './AuditPipeline';
import { ReportProse } from './ReportProse';

import { getAPIBase } from '../lib/api';

interface PLGAuditResponse {
  audit_id: string | null;
  cached: boolean;
  executive_summary: string | null;
  target_url: string;
  status: string;
  prompt_signup: boolean;
}

interface PLGStatusResponse {
  audit_id: string;
  status: string;
  status_message: string | null;
  current_step: string | null;
  executive_summary: string | null;
  errors: string[];
  prompt_signup: boolean;
  target_url: string;
  pages_crawled: number;
  total_urls: number;
  created_at: string | null;
}

/** Same tab order as AuditPanel report (full audit). */
const GUEST_REPORT_TABS = [
  { id: 'executive', label: 'Executive Summary' },
  { id: 'crawl', label: 'Crawl Summary' },
  { id: 'identity', label: 'Business Identity' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'ux', label: 'UX' },
  { id: 'cro', label: 'CRO' },
  { id: 'performance', label: 'Core Web Vitals' },
] as const;

interface PLGLandingProps {
  onShowAuth: (mode?: 'login' | 'signup') => void;
}

function plgStatusToPipelineResult(s: PLGStatusResponse): PipelineResult {
  return {
    status: s.status,
    current_step: s.current_step,
    pages_crawled: s.pages_crawled ?? 0,
    total_urls: s.total_urls ?? 0,
    errors: s.errors ?? [],
    created_at: s.created_at ?? null,
    executive_summary: s.executive_summary,
  };
}

export default function PLGLanding({ onShowAuth }: PLGLandingProps) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [summary, setSummary] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [guestStatus, setGuestStatus] = useState<PLGStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [csvUrls, setCsvUrls] = useState<string[]>([]);
  const csvFileRef = useRef<HTMLInputElement | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) ?? '';
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsed: string[] = [];
      for (const line of lines) {
        const cell = line.includes(',') ? line.split(',')[0].trim() : line;
        if (/^https?:\/\//i.test(cell)) parsed.push(cell);
      }
      setCsvUrls([...new Set(parsed)]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearCsv = () => {
    setCsvUrls([]);
    if (csvFileRef.current) csvFileRef.current.value = '';
  };

  const startAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    setError(null);
    setSummary(null);
    setTargetUrl(null);
    setGuestStatus(null);
    setAuditId(null);
    setPhase('running');

    try {
      const parsed = target.startsWith('http') ? target : `https://${target}`;
      const payload: Record<string, unknown> = { url: parsed };
      if (csvUrls.length > 0) {
        payload.urls = csvUrls;
      }
      const resp = await fetch(`${getAPIBase()}/plg/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(body || `Request failed: ${resp.status}`);
      }

      const data: PLGAuditResponse = await resp.json();
      setTargetUrl(data.target_url);

      if (data.cached && data.executive_summary) {
        setSummary(data.executive_summary);
        setPhase('completed');
        return;
      }

      if (data.audit_id) {
        setAuditId(data.audit_id);
        pollRef.current = setInterval(async () => {
          try {
            const sResp = await fetch(`${getAPIBase()}/plg/audit/${data.audit_id}/status`);
            if (!sResp.ok) return;
            const s: PLGStatusResponse = await sResp.json();
            setGuestStatus(s);
            if (s.status === 'completed' && s.executive_summary) {
              stopPolling();
              setSummary(s.executive_summary);
              setPhase('completed');
            } else if (s.status === 'failed') {
              stopPolling();
              setError(s.errors?.[s.errors.length - 1] || 'Audit failed');
              setPhase('failed');
            }
          } catch {
            // ignore poll errors
          }
        }, 2000);
        return;
      }

      setPhase('idle');
      setError('No audit started');
    } catch (err) {
      setPhase('failed');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const reset = () => {
    stopPolling();
    setPhase('idle');
    setSummary(null);
    setTargetUrl(null);
    setError(null);
    setAuditId(null);
    setGuestStatus(null);
    setCsvUrls([]);
  };

  const pipelineResult: PipelineResult | null = guestStatus
    ? plgStatusToPipelineResult(guestStatus)
    : auditId
      ? {
          status: 'running',
          current_step: 'discovering',
          pages_crawled: 0,
          total_urls: 0,
          errors: [],
          created_at: new Date().toISOString(),
        }
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">
          See how your site performs
        </h1>
        <p className="text-neutral-600">
          Run a free audit and get an executive summary. Sign up for the full report.
        </p>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          <form onSubmit={startAudit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-growth-600 text-white font-medium text-sm hover:bg-growth-700 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Run free audit
            </button>
            <label className="px-4 py-3 rounded-lg font-medium text-sm text-neutral-700 border border-neutral-300
                              hover:bg-neutral-50 cursor-pointer whitespace-nowrap transition-colors
                              inline-flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload CSV
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv,.txt"
                className="sr-only"
                onChange={handleCsvFile}
              />
            </label>
          </form>
          {csvUrls.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-growth-50 border border-growth-200 rounded-lg">
              <svg className="w-5 h-5 text-growth-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="flex-1 text-sm text-growth-800 font-medium">
                {csvUrls.length} URL{csvUrls.length !== 1 ? 's' : ''} loaded from CSV
              </span>
              <button
                type="button"
                onClick={clearCsv}
                className="text-sm text-neutral-500 hover:text-red-600 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-4">
          {auditId && pipelineResult && (
            <>
              <div className="flex flex-col gap-2 bg-white rounded-xl border border-neutral-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={pipelineResult.status} />
                    <span className="text-sm text-neutral-500 font-mono">{auditId}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    {pipelineResult.pages_crawled} / {pipelineResult.total_urls} pages crawled
                  </div>
                </div>
                {guestStatus?.status_message && (
                  <p className="text-sm text-neutral-600">
                    {guestStatus.status_message}
                  </p>
                )}
              </div>
              {(pipelineResult.status === 'running' || pipelineResult.status === 'queued') && (
                <PipelineProgress result={pipelineResult} />
              )}
            </>
          )}
          {!auditId && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
              <div className="h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-neutral-600 text-sm">Starting audit…</p>
            </div>
          )}
        </div>
      )}

      {phase === 'failed' && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-800 text-sm">
          {error}
          <button
            type="button"
            onClick={reset}
            className="mt-3 block text-growth-600 font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {phase === 'completed' && summary && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-200 bg-neutral-50 px-2 pt-2">
              <div className="flex items-end justify-between">
                <nav className="flex flex-wrap gap-0.5" aria-label="Report sections">
                  {GUEST_REPORT_TABS.map((tab, i) => (
                    <button
                      key={tab.id}
                      type="button"
                      disabled
                      className={`px-4 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px cursor-not-allowed
                        ${i === 0
                          ? 'bg-white text-neutral-900 border border-neutral-200 border-b-transparent'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200 border-b-transparent'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 mb-1 mr-1 rounded-md text-sm font-medium
                    text-neutral-400 border border-neutral-200 bg-neutral-50 cursor-not-allowed"
                  title="Sign up to download PDF"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </span>
              </div>
            </div>
            <div className="px-6 py-6 min-h-[200px]">
              <div className="mb-6 rounded-lg border border-growth-200 bg-growth-50 px-4 py-3">
                <p className="text-growth-800 font-medium">
                  Create an account to get the full report and download the PDF.
                </p>
                <button
                  type="button"
                  onClick={() => onShowAuth('signup')}
                  className="mt-3 inline-flex items-center px-5 py-2.5 rounded-lg bg-growth-600 text-white font-medium text-sm hover:bg-growth-700 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2"
                >
                  Sign up free
                </button>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-lg text-neutral-900 mb-2">Executive Summary</h2>
                {targetUrl && (
                  <p className="text-xs text-neutral-500 mb-2">{targetUrl}</p>
                )}
                <ReportProse content={summary} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Run another audit
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => onShowAuth('login')}
          className="text-sm font-medium text-growth-600 hover:text-growth-700"
        >
          Sign in
        </button>
        <span className="text-neutral-300">|</span>
        <button
          type="button"
          onClick={() => onShowAuth('signup')}
          className="text-sm font-medium text-growth-600 hover:text-growth-700"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
