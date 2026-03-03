/**
 * Shared pipeline progress and status UI for audit flows (logged-in and guest).
 * Accepts a minimal result shape so both AuditPanel and PLGLanding can use it.
 */

import { useState, useEffect } from 'react';

/** Minimal audit result shape for pipeline/status display (full AuditStatus or PLG guest status). */
export interface PipelineResult {
  status: string;
  current_step: string | null;
  pages_crawled: number;
  total_urls: number;
  errors: string[];
  created_at: string | null;
  discovered_urls?: string[];
  identity?: unknown;
  messaging?: unknown;
  ux?: unknown;
  cro?: unknown;
  urls_measured?: number;
  executive_summary?: string | null;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    queued:        { bg: 'bg-neutral-200',  text: 'text-neutral-700', label: 'Queued' },
    running:       { bg: 'bg-growth-100',   text: 'text-growth-700',  label: 'Running' },
    urls_ready:    { bg: 'bg-growth-100',   text: 'text-growth-700',  label: 'Review URLs' },
    identity_ready: { bg: 'bg-growth-100', text: 'text-growth-700',  label: 'Review identity' },
    completed:     { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Completed' },
    failed:        { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Failed' },
  };
  const s = map[status] ?? map.queued;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>
      {status === 'running' && (
        <span className="mr-2 h-2 w-2 rounded-full bg-growth-500 animate-pulse" />
      )}
      {s.label}
    </span>
  );
}

export const PIPELINE_STEPS = [
  { key: 'discovering',            label: 'Discovering',          desc: 'Finding sitemap & page URLs' },
  { key: 'filtering',              label: 'Filtering',            desc: 'Prioritizing marketing pages' },
  { key: 'url_review',             label: 'URL Review',           desc: 'Waiting for you to confirm URLs' },
  { key: 'crawling',               label: 'Crawling',             desc: 'Visiting pages & capturing screenshots' },
  { key: 'distilling',             label: 'Distilling',           desc: 'Extracting page content' },
  { key: 'analyzing_identity',     label: 'Identity Analysis',    desc: 'Analyzing business positioning' },
  { key: 'identity_review',        label: 'Identity Review',      desc: 'Waiting for you to confirm or add feedback' },
  { key: 'analyzing_messaging',    label: 'Messaging Analysis',   desc: 'Evaluating messaging quality' },
  { key: 'analyzing_ux',           label: 'UX Analysis',           desc: 'Analyzing screenshots for brand & clarity' },
  { key: 'analyzing_cro',          label: 'CRO Analysis',         desc: 'Evaluating conversion paths & opportunities' },
  { key: 'measuring_performance',  label: 'Performance',          desc: 'Collecting Core Web Vitals via PageSpeed Insights' },
  { key: 'generating_summary',     label: 'Executive Summary',    desc: 'Synthesizing audit into a concise summary' },
] as const;

export function stepStatus(stepKey: string, currentStep: string | null, auditStatus: string): 'done' | 'active' | 'pending' {
  if (auditStatus === 'completed') return 'done';

  if (auditStatus === 'urls_ready') {
    const idx = PIPELINE_STEPS.findIndex(s => s.key === stepKey);
    const reviewIdx = PIPELINE_STEPS.findIndex(s => s.key === 'url_review');
    if (idx < reviewIdx) return 'done';
    if (idx === reviewIdx) return 'active';
    return 'pending';
  }

  if (auditStatus === 'identity_ready') {
    const idx = PIPELINE_STEPS.findIndex(s => s.key === stepKey);
    const identityReviewIdx = PIPELINE_STEPS.findIndex(s => s.key === 'identity_review');
    if (idx < identityReviewIdx) return 'done';
    if (idx === identityReviewIdx) return 'active';
    return 'pending';
  }

  if (!currentStep) return 'pending';

  const idx = PIPELINE_STEPS.findIndex(s => s.key === stepKey);
  const activeIdx = PIPELINE_STEPS.findIndex(s => s.key === currentStep);

  if (idx < activeIdx) return 'done';
  if (idx === activeIdx) return 'active';
  return 'pending';
}

function StepIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-growth-500 flex items-center justify-center">
        <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }
  return <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-neutral-300 bg-white" />;
}

function stepDetail(stepKey: string, result: PipelineResult): string | null {
  const discovered = result.discovered_urls ?? [];
  const urlsMeasured = result.urls_measured ?? 0;
  switch (stepKey) {
    case 'filtering':
      return result.total_urls > 0 ? `${result.total_urls} URLs prioritized` : null;
    case 'url_review':
      if (result.status === 'urls_ready') return `${discovered.length} URLs ready for review`;
      if (result.status === 'completed' || result.status === 'running') return 'Confirmed';
      return null;
    case 'identity_review':
      if (result.status === 'identity_ready') return 'Add feedback or continue';
      if (result.status === 'completed' || result.status === 'running') return 'Continued';
      return null;
    case 'crawling':
      if (result.pages_crawled > 0 && result.total_urls > 0) {
        return `${result.pages_crawled} / ${result.total_urls} pages`;
      }
      return result.total_urls > 0 ? `0 / ${result.total_urls} pages` : null;
    case 'analyzing_identity':
      return result.identity ? 'Complete' : null;
    case 'analyzing_messaging':
      return result.messaging ? 'Complete' : null;
    case 'analyzing_ux':
      return result.ux ? 'Complete' : null;
    case 'analyzing_cro':
      return result.cro ? 'Complete' : null;
    case 'measuring_performance':
      if (urlsMeasured > 0 && result.total_urls > 0) {
        return `${urlsMeasured} / ${result.total_urls} URLs measured`;
      }
      return result.total_urls > 0 ? `0 / ${result.total_urls} URLs to measure` : null;
    case 'generating_summary':
      return result.executive_summary ? 'Complete' : null;
    default:
      return null;
  }
}

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <span className="font-mono text-sm text-neutral-500">{elapsed}</span>
  );
}

export function PipelineProgress({ result }: { result: PipelineResult }) {
  const current = result.current_step;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-growth-500 animate-pulse" />
          <p className="text-neutral-900 font-heading font-semibold text-lg">Audit in progress</p>
        </div>
        {result.created_at && <ElapsedTimer startTime={result.created_at} />}
      </div>

      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const state = stepStatus(step.key, current, result.status);
          const detail = stepDetail(step.key, result);
          const isLast = i === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <StepIcon state={state} />
                {!isLast && (
                  <div className={`w-0.5 h-8 ${
                    state === 'done' ? 'bg-green-300' :
                    state === 'active' ? 'bg-growth-200' :
                    'bg-neutral-200'
                  }`} />
                )}
              </div>
              <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold ${
                  state === 'active' ? 'text-growth-600' :
                  state === 'done' ? 'text-neutral-900' :
                  'text-neutral-400'
                }`}>
                  {step.label}
                </p>
                <p className={`text-xs mt-0.5 ${
                  state === 'pending' ? 'text-neutral-300' : 'text-neutral-500'
                }`}>
                  {detail ?? step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(result.pages_crawled > 0 || result.total_urls > 0 || result.errors.length > 0) && (
        <div className="mt-6 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-lg font-heading font-bold text-neutral-900">{result.pages_crawled}</p>
            <p className="text-xs text-neutral-500">Pages Crawled</p>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-lg font-heading font-bold text-neutral-900">{result.total_urls}</p>
            <p className="text-xs text-neutral-500">URLs Found</p>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className={`text-lg font-heading font-bold ${result.errors.length > 0 ? 'text-red-500' : 'text-neutral-900'}`}>
              {result.errors.length}
            </p>
            <p className="text-xs text-neutral-500">Errors</p>
          </div>
        </div>
      )}
    </div>
  );
}
