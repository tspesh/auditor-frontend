import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { getAPIBase } from '../lib/api';
import { PipelineProgress, StatusBadge } from './AuditPipeline';
import { CompiledReport } from './CompiledReport';
import { ReportProse } from './ReportProse';
import { Card, TagList, ScoreRing, Stat } from './ui';

// ─── Types mirroring the Python schemas ───────────────────────────────────────

interface IdentityAnalysis {
  company_name: string;
  industry: string;
  icp_description: string;
  value_proposition: string;
  key_differentiators: string[];
  competitors_mentioned: string[];
  narrative_summary: string;
}

interface MessagingAnalysis {
  tone_of_voice: string;
  messaging_themes: string[];
  cta_patterns: string[];
  messaging_gaps: string[];
  consistency_score: number;
  narrative_summary: string;
}

/** Per-page UX finding with optional url (legacy audits may have string-only). */
type PerPageFindingItem = { url?: string; finding: string } | string;

interface UXAnalysis {
  brand_alignment_score: number;
  visual_clarity_score: number;
  mobile_desktop_consistency: number;
  ux_strengths: string[];
  ux_gaps: string[];
  per_page_findings: PerPageFindingItem[];
  narrative_summary: string;
}

interface CROAnalysis {
  conversion_paths_summary: string;
  cta_effectiveness: string;
  friction_points: string[];
  opportunities: string[];
  narrative_summary: string;
}

interface PageData {
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number;
  status_code: number;
  load_time_ms: number;
}

interface CoreWebVitals {
  performance_score: number | null;
  first_contentful_paint_ms: number | null;
  largest_contentful_paint_ms: number | null;
  total_blocking_time_ms: number | null;
  cumulative_layout_shift: number | null;
  speed_index_ms: number | null;
}

interface PerformanceGrade {
  overall_grade: string;
  lcp_rating: string;
  cls_rating: string;
  tbt_rating: string;
  fcp_rating: string;
}

interface PerformanceRecommendation {
  issue: string;
  impact: string;
  fix: string;
}

interface PerformanceResult {
  url: string;
  vitals: CoreWebVitals;
  grade: PerformanceGrade;
  recommendations: PerformanceRecommendation[];
  error: string | null;
}

interface TechnicalRecommendation {
  category: string;
  severity: string;
  issue: string;
  evidence: string;
  fix: string;
  estimated_impact: string;
}

interface DeepPerformanceResult {
  url: string;
  diagnostics: Record<string, unknown>;
  technical_profile: Record<string, unknown> | null;
  recommendations: TechnicalRecommendation[];
}

interface AuditStatus {
  audit_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'not_found' | 'urls_ready' | 'identity_ready';
  status_message?: string | null;
  current_step: string | null;
  pages_crawled: number;
  total_urls: number;
  discovered_urls: string[];
  pages: PageData[];
  screenshots: Record<string, Record<string, string>>;
  identity: IdentityAnalysis | null;
  messaging: MessagingAnalysis | null;
  ux: UXAnalysis | null;
  cro: CROAnalysis | null;
  performance: PerformanceResult[];
  deep_performance: DeepPerformanceResult[];
  urls_measured: number;
  errors: string[];
  executive_summary: string | null;
  compiled_report: string | null;
  created_at: string | null;
  crawl_mode?: string;
  identity_payload_sent?: string | null;
}

interface AuditHistoryItem {
  audit_id: string;
  target_url: string;
  status: string;
  pages_crawled: number;
  total_urls: number;
  parent_audit_id: string | null;
  created_at: string | null;
  completed_at: string | null;
  crawl_mode?: string;
}

interface AuditPanelProps {
  accessToken: string;
  userRole: string;
  initialAuditId?: string;
}

type Phase = 'idle' | 'polling' | 'reviewing' | 'reviewing_identity' | 'analyzing' | 'completed' | 'failed';

// ─── Sub-components ───────────────────────────────────────────────────────────

function HistoryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    completed:     { cls: 'bg-green-100 text-green-700', label: 'Completed' },
    running:       { cls: 'bg-growth-100 text-growth-700', label: 'Running' },
    urls_ready:    { cls: 'bg-growth-100 text-growth-700', label: 'Review URLs' },
    identity_ready: { cls: 'bg-growth-100 text-growth-700', label: 'Review identity' },
    queued:        { cls: 'bg-neutral-100 text-neutral-600', label: 'Queued' },
    failed:        { cls: 'bg-red-100 text-red-700', label: 'Failed' },
  };
  const s = map[status] ?? { cls: 'bg-neutral-100 text-neutral-600', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Result Sections ──────────────────────────────────────────────────────────

function ExecutiveSummarySection({ summary, noCard = false }: { summary: string; noCard?: boolean }) {
  if (noCard) return <ReportProse content={summary} />;
  return (
    <Card title="Executive Summary">
      <ReportProse content={summary} />
    </Card>
  );
}

function IdentitySection({ data, noCard = false }: { data: IdentityAnalysis; noCard?: boolean }) {
  const body = (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-neutral-500 mb-1">Company</p>
            <p className="text-lg font-semibold text-neutral-900">{data.company_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500 mb-1">Industry</p>
            <p className="text-lg font-semibold text-neutral-900">{data.industry}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">Value Proposition</p>
          <p className="text-neutral-800">{data.value_proposition}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">Ideal Customer Profile</p>
          <p className="text-neutral-800">{data.icp_description}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Key Differentiators</p>
          <TagList items={data.key_differentiators} color="growth" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Competitors Mentioned</p>
          <TagList items={data.competitors_mentioned} color="neutral" />
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-sm font-medium text-neutral-500 mb-2">Summary</p>
          <ReportProse content={data.narrative_summary} />
        </div>
      </div>
  );
  if (noCard) return body;
  return <Card title="Business Identity">{body}</Card>;
}

const IDENTITY_DISPARITY_NOTE =
  'If there\'s a major disparity between what we found and what you feel is your core business and ICP, that may be a sign of significant messaging and positioning mismatches. You can add feedback on any part of the summary below to guide the rest of the audit.';

function IdentityReviewPanel({
  identity,
  errors,
  identityPayloadSent,
  feedback,
  onFeedbackChange,
  onConfirm,
  isSubmitting,
  feedbackSectionRef,
}: {
  identity: IdentityAnalysis | null;
  errors: string[];
  identityPayloadSent?: string | null;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  feedbackSectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const identityError = errors.find(e => /identity/i.test(e)) ?? errors[0];
  const [payloadCopied, setPayloadCopied] = useState(false);
  const copyPayload = useCallback(() => {
    if (identityPayloadSent) {
      navigator.clipboard.writeText(identityPayloadSent);
      setPayloadCopied(true);
      setTimeout(() => setPayloadCopied(false), 2000);
    }
  }, [identityPayloadSent]);
  return (
    <div className="space-y-6">
      {identityPayloadSent && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <p className="text-sm font-medium text-neutral-700 mb-2">Prompt sent to identity agent (copy to test in Mission Squad)</p>
          <pre className="text-xs text-neutral-800 overflow-auto max-h-64 p-3 bg-white border border-neutral-200 rounded-md whitespace-pre-wrap font-mono">
            {identityPayloadSent}
          </pre>
          <button
            type="button"
            onClick={copyPayload}
            className="mt-2 text-sm px-3 py-1.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700"
          >
            {payloadCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {identity ? <IdentitySection data={identity} /> : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm space-y-2">
          <p>Identity analysis did not return results. You can still add feedback below and continue the audit.</p>
          {identityError && (
            <p className="font-mono text-xs mt-2 pt-2 border-t border-amber-200 break-all">{identityError}</p>
          )}
        </div>
      )}
      <div ref={feedbackSectionRef} className="bg-white rounded-xl border border-neutral-200 p-6">
        <p className="text-neutral-700 mb-4">{IDENTITY_DISPARITY_NOTE}</p>
        <label htmlFor="identity-feedback" className="block text-sm font-medium text-neutral-700 mb-2">
          Optional feedback on any part of this summary
        </label>
        <textarea
          id="identity-feedback"
          value={feedback}
          onChange={e => onFeedbackChange(e.target.value)}
          placeholder="E.g. correct company name, industry, ICP, value proposition, or differentiators..."
          rows={4}
          className="w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500
                     font-mono text-sm resize-y"
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-md font-semibold text-white
                       bg-growth-500 hover:bg-growth-600 disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                       transition-all duration-200"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Continuing...
              </span>
            ) : (
              'Continue audit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const BORDER_COLOR_MAP: Record<string, string> = {
  growth: 'border-growth-500',
  green: 'border-green-500',
  red: 'border-red-400',
  neutral: 'border-neutral-300',
};

function StyledList({ items, color = 'neutral' }: { items: string[]; color?: string }) {
  if (!items.length) return <span className="text-neutral-400 italic text-sm">None detected</span>;
  const borderCls = BORDER_COLOR_MAP[color] ?? BORDER_COLOR_MAP.neutral;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className={`border-l-2 ${borderCls} pl-3`}>
          <ReportProse content={item} size="sm" />
        </div>
      ))}
    </div>
  );
}

function MessagingSection({ data, noCard = false }: { data: MessagingAnalysis; noCard?: boolean }) {
  const body = (
    <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 text-center">
            <ScoreRing score={data.consistency_score} />
            <p className="text-xs text-neutral-500 mt-1">Consistency</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-500 mb-1">Tone of Voice</p>
            <p className="text-neutral-800">{data.tone_of_voice}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Messaging Themes</p>
          <TagList items={data.messaging_themes} color="growth" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">CTA Patterns</p>
          <StyledList items={data.cta_patterns} color="green" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Messaging Gaps</p>
          <StyledList items={data.messaging_gaps} color="red" />
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-sm font-medium text-neutral-500 mb-2">Summary</p>
          <ReportProse content={data.narrative_summary} />
        </div>
      </div>
  );
  if (noCard) return body;
  return <Card title="Messaging Analysis">{body}</Card>;
}

function UXSection({ data, noCard = false }: { data: UXAnalysis; noCard?: boolean }) {
  const body = (
    <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 text-center">
            <ScoreRing score={data.brand_alignment_score} />
            <p className="text-xs text-neutral-500 mt-1">Brand alignment</p>
          </div>
          <div className="flex-shrink-0 text-center">
            <ScoreRing score={data.visual_clarity_score} />
            <p className="text-xs text-neutral-500 mt-1">Visual clarity</p>
          </div>
          <div className="flex-shrink-0 text-center">
            <ScoreRing score={data.mobile_desktop_consistency} />
            <p className="text-xs text-neutral-500 mt-1">Mobile/desktop consistency</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">UX Strengths</p>
          <StyledList items={data.ux_strengths} color="growth" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">UX Gaps</p>
          <StyledList items={data.ux_gaps} color="red" />
        </div>

        {data.per_page_findings.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-500 mb-2">Per-page findings</p>
            <div className="space-y-3">
              {data.per_page_findings.map((item, i) => {
                const finding = typeof item === 'string' ? item : item.finding;
                const url = typeof item === 'string' ? '' : (item.url ?? '');
                let pathname = '';
                if (url) {
                  try {
                    pathname = new URL(url).pathname || '/';
                  } catch {
                    pathname = url;
                  }
                }
                return (
                  <div key={i} className="border-l-2 border-neutral-200 pl-3">
                    {pathname && (
                      <p className="text-xs font-mono text-neutral-500 mb-1.5" title={url}>
                        {pathname}
                      </p>
                    )}
                    <ReportProse content={finding} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-sm font-medium text-neutral-500 mb-2">Summary</p>
          <ReportProse content={data.narrative_summary} />
        </div>
      </div>
  );
  if (noCard) return body;
  return <Card title="UX Analysis">{body}</Card>;
}

function CROSection({ data, noCard = false }: { data: CROAnalysis; noCard?: boolean }) {
  const body = (
    <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">Conversion paths</p>
          <ReportProse content={data.conversion_paths_summary} />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">CTA effectiveness</p>
          <ReportProse content={data.cta_effectiveness} />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Friction points</p>
          <StyledList items={data.friction_points} color="red" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500 mb-2">Opportunities</p>
          <StyledList items={data.opportunities} color="growth" />
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-sm font-medium text-neutral-500 mb-2">Summary</p>
          <ReportProse content={data.narrative_summary} />
        </div>
      </div>
  );
  if (noCard) return body;
  return <Card title="Conversion Rate Optimization">{body}</Card>;
}

function GradeBadge({ grade }: { grade: string }) {
  const cls =
    grade === 'A' || grade === 'B' ? 'bg-green-100 text-green-700' :
    grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cls}`}>
      {grade}
    </span>
  );
}

function ratingColor(rating: string): string {
  if (rating === 'good') return 'text-green-600';
  if (rating === 'needs-improvement') return 'text-yellow-600';
  if (rating === 'poor') return 'text-red-500';
  return 'text-neutral-400';
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  return (ms / 1000).toFixed(1) + 's';
}

function formatCls(cls: number | null): string {
  if (cls === null) return '—';
  return cls.toFixed(3);
}

function ImpactBadge({ impact }: { impact: string }) {
  const cls =
    impact === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
    impact === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-green-100 text-green-700 border-green-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {impact}
    </span>
  );
}

const GRADE_ORDER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };

type PerfSortKey = 'grade' | 'score' | 'lcp' | 'cls' | 'tbt' | 'fcp';

function PerformanceSection({ data, noCard = false }: { data: PerformanceResult[]; noCard?: boolean }) {
  const [sortKey, setSortKey] = useState<PerfSortKey>('grade');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (data.length === 0) return data;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      let va: number | null;
      let vb: number | null;
      switch (sortKey) {
        case 'grade':
          va = GRADE_ORDER[a.grade?.overall_grade ?? ''] ?? 99;
          vb = GRADE_ORDER[b.grade?.overall_grade ?? ''] ?? 99;
          return (va - vb) * dir;
        case 'score':
          va = a.vitals.performance_score ?? -1;
          vb = b.vitals.performance_score ?? -1;
          return (va - vb) * dir;
        case 'lcp':
          va = a.vitals.largest_contentful_paint_ms ?? Infinity;
          vb = b.vitals.largest_contentful_paint_ms ?? Infinity;
          return (va - vb) * dir;
        case 'cls':
          va = a.vitals.cumulative_layout_shift ?? Infinity;
          vb = b.vitals.cumulative_layout_shift ?? Infinity;
          return (va - vb) * dir;
        case 'tbt':
          va = a.vitals.total_blocking_time_ms ?? Infinity;
          vb = b.vitals.total_blocking_time_ms ?? Infinity;
          return (va - vb) * dir;
        case 'fcp':
          va = a.vitals.first_contentful_paint_ms ?? Infinity;
          vb = b.vitals.first_contentful_paint_ms ?? Infinity;
          return (va - vb) * dir;
        default:
          return 0;
      }
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: PerfSortKey) => {
    setSortKey(key);
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const Th = ({ colKey, label, className = '' }: { colKey: PerfSortKey; label: string; className?: string }) => (
    <th className={className}>
      <button type="button" onClick={() => handleSort(colKey)} className="inline-flex items-center gap-0.5 font-medium hover:text-neutral-900">
        {label}
        {sortKey === colKey && (sortDir === 'asc' ? ' ↑' : ' ↓')}
      </button>
    </th>
  );

  const successful = data.filter(r => r.error === null);
  const scores = successful
    .map(r => r.vitals.performance_score)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const passing = successful.filter(r => r.grade.overall_grade === 'A' || r.grade.overall_grade === 'B').length;
  const needsWork = successful.filter(r => ['C', 'D', 'F'].includes(r.grade.overall_grade)).length;
  const urlsWithRecs = data.filter(r => r.recommendations.length > 0);

  const body = (
    <div className="space-y-6">
        {/* Summary stats */}
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 text-center">
            <ScoreRing score={avgScore} max={100} />
            <p className="text-xs text-neutral-500 mt-1">Avg Score</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            <Stat label="URLs Measured" value={data.length} />
            <Stat label="Passing" value={passing} />
            <Stat label="Needs Work" value={needsWork} alert={needsWork > 0} />
          </div>
        </div>

        <p className="text-xs text-neutral-500 italic">
          These findings are based solely on what can be observed externally and may not reflect internal infrastructure decisions. Some third-party marketing and analytics tools require implementation patterns that impact performance metrics but provide essential business functionality.
        </p>

        {/* CWV metrics table */}
        {sortedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="pb-2 font-medium">URL</th>
                  <Th colKey="grade" label="Grade" className="pb-2 text-center" />
                  <Th colKey="score" label="Score" className="pb-2 text-right" />
                  <Th colKey="lcp" label="LCP" className="pb-2 text-right" />
                  <Th colKey="cls" label="CLS" className="pb-2 text-right" />
                  <Th colKey="tbt" label="TBT" className="pb-2 text-right" />
                  <Th colKey="fcp" label="FCP" className="pb-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((r, i) => (
                  <tr key={i} className={`border-b border-neutral-100 last:border-0 ${r.error ? 'opacity-50' : ''}`}>
                    <td className="py-2 text-growth-600 max-w-[180px] truncate font-mono text-xs">
                      {(() => {
                        try {
                          const u = new URL(r.url);
                          const path = u.pathname.replace(/\/$/, '') || '/';
                          return path === '/' ? u.origin : path;
                        } catch { return r.url; }
                      })()}
                    </td>
                    <td className="py-2 text-center">
                      {r.error
                        ? <span className="text-xs text-red-400">Error</span>
                        : <GradeBadge grade={r.grade.overall_grade} />}
                    </td>
                    <td className="py-2 text-right font-medium text-neutral-700">
                      {r.vitals.performance_score !== null ? Math.round(r.vitals.performance_score) : '—'}
                    </td>
                    <td className={`py-2 text-right ${ratingColor(r.grade.lcp_rating)}`}>
                      {formatMs(r.vitals.largest_contentful_paint_ms)}
                    </td>
                    <td className={`py-2 text-right ${ratingColor(r.grade.cls_rating)}`}>
                      {formatCls(r.vitals.cumulative_layout_shift)}
                    </td>
                    <td className={`py-2 text-right ${ratingColor(r.grade.tbt_rating)}`}>
                      {formatMs(r.vitals.total_blocking_time_ms)}
                    </td>
                    <td className={`py-2 text-right ${ratingColor(r.grade.fcp_rating)}`}>
                      {formatMs(r.vitals.first_contentful_paint_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action items */}
        {urlsWithRecs.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-semibold text-neutral-900 mb-4">Action Items</p>
            <div className="space-y-5">
              {urlsWithRecs.map((r, i) => (
                <div key={i}>
                  <p className="text-xs font-mono text-growth-600 mb-2">
                    {(() => {
                      try {
                        const u = new URL(r.url);
                        const path = u.pathname.replace(/\/$/, '') || '/';
                        return path === '/' ? u.origin : path;
                      } catch { return r.url; }
                    })()}
                  </p>
                  <div className="space-y-2 pl-3 border-l-2 border-neutral-200">
                    {r.recommendations.map((rec, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <ImpactBadge impact={rec.impact} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900">{rec.issue}</p>
                          <p className="text-sm text-neutral-600 mt-0.5">{rec.fix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
  if (noCard) return body;
  return <Card title="Core Web Vitals">{body}</Card>;
}

// ─── Deep Performance Section ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  'render-blocking': 'Render-Blocking Resources',
  images: 'Image Optimization',
  javascript: 'JavaScript',
  css: 'CSS',
  fonts: 'Font Loading',
  dom: 'DOM Complexity',
  'third-party': 'Third-Party Scripts',
  compression: 'Compression',
  other: 'Other',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
    severity === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
    severity === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-blue-100 text-blue-700 border-blue-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {severity}
    </span>
  );
}

function DeepPerformanceSection({ data, noCard = false }: { data: DeepPerformanceResult[]; noCard?: boolean }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(data[0]?.url ?? null);

  const allRecs = data.flatMap(d => d.recommendations);
  const criticalCount = allRecs.filter(r => r.severity === 'critical').length;
  const highCount = allRecs.filter(r => r.severity === 'high').length;

  const body = (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="flex items-start gap-6">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <Stat label="Pages Audited" value={data.length} />
          <Stat label="Total Findings" value={allRecs.length} />
          <Stat label="Critical" value={criticalCount} alert={criticalCount > 0} />
          <Stat label="High" value={highCount} alert={highCount > 0} />
        </div>
      </div>

      <p className="text-xs text-neutral-500 italic">
        These findings are based solely on what can be observed externally and may not reflect internal infrastructure decisions. Some third-party marketing and analytics tools require implementation patterns that impact performance metrics but provide essential business functionality.
      </p>
      <p className="text-xs text-neutral-500 italic">
        This audit covers the homepage and the 3 other worst-performing pages from the Core Web Vitals test. Most pages on a site share the same underlying tech stack, so the issues and recommendations identified here are typically representative of the full site.
      </p>

      {/* Per-URL accordion */}
      {data.map((result) => {
        const isExpanded = expandedUrl === result.url;

        const categorized = new Map<string, TechnicalRecommendation[]>();
        for (const rec of result.recommendations) {
          const cat = rec.category || 'other';
          if (!categorized.has(cat)) categorized.set(cat, []);
          categorized.get(cat)!.push(rec);
        }

        const sortedCategories = [...categorized.entries()].sort(
          (a, b) => (CATEGORY_ORDER.indexOf(a[0]) === -1 ? 99 : CATEGORY_ORDER.indexOf(a[0])) -
                    (CATEGORY_ORDER.indexOf(b[0]) === -1 ? 99 : CATEGORY_ORDER.indexOf(b[0]))
        );

        let displayUrl: string;
        try {
          const u = new URL(result.url);
          const path = u.pathname.replace(/\/$/, '') || '/';
          displayUrl = path === '/' ? u.origin : path;
        } catch { displayUrl = result.url; }

        return (
          <div key={result.url} className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedUrl(isExpanded ? null : result.url)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-growth-600">{displayUrl}</span>
                <span className="text-xs text-neutral-500">
                  {result.recommendations.length} finding{result.recommendations.length !== 1 ? 's' : ''}
                </span>
              </div>
              <svg className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-4 py-4 space-y-5">
                {sortedCategories.map(([category, recs]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-growth-500 inline-block" />
                      {CATEGORY_LABELS[category] || category}
                      <span className="text-xs font-normal text-neutral-400">({recs.length})</span>
                    </h4>
                    <div className="space-y-3 pl-3 border-l-2 border-neutral-200">
                      {recs.map((rec, j) => (
                        <div key={j} className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <SeverityBadge severity={rec.severity} />
                            <p className="text-sm font-medium text-neutral-900">{rec.issue}</p>
                          </div>
                          <div className="ml-[3.5rem] space-y-1">
                            <p className="text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-1 font-mono leading-relaxed">
                              {rec.evidence}
                            </p>
                            <p className="text-sm text-neutral-700">{rec.fix}</p>
                            {rec.estimated_impact && (
                              <p className="text-xs font-medium text-growth-700 bg-growth-50 rounded px-2 py-1 inline-block">
                                {rec.estimated_impact}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {result.recommendations.length === 0 && (
                  <p className="text-sm text-neutral-500 italic">No significant issues found for this page.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (noCard) return body;
  return <Card title="Deep Performance Audit">{body}</Card>;
}

function CrawlSummary({ data, noCard = false }: { data: AuditStatus; noCard?: boolean }) {
  const body = (
    <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Pages Crawled" value={data.pages_crawled} />
          <Stat label="URLs Discovered" value={data.total_urls} />
          <Stat label="Errors" value={data.errors.length} alert={data.errors.length > 0} />
          <Stat label="Screenshots" value={Object.keys(data.screenshots).length * 2} />
        </div>

        {data.pages.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="pb-2 font-medium">URL</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                  <th className="pb-2 font-medium text-right">Words</th>
                  <th className="pb-2 font-medium text-right">Load (ms)</th>
                </tr>
              </thead>
              <tbody>
                {data.pages.map((page, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 text-growth-600 max-w-[200px] truncate font-mono text-xs">
                      {new URL(page.url).pathname || '/'}
                    </td>
                    <td className="py-2 text-neutral-700 max-w-[250px] truncate">
                      {page.title ?? '—'}
                    </td>
                    <td className="py-2 text-right">
                      <span className={page.status_code === 200 ? 'text-green-600' : 'text-red-500'}>
                        {page.status_code}
                      </span>
                    </td>
                    <td className="py-2 text-right text-neutral-600">{page.word_count.toLocaleString()}</td>
                    <td className="py-2 text-right text-neutral-600">{Math.round(page.load_time_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-700 mb-2">Errors</p>
            <ul className="list-disc list-inside space-y-1">
              {data.errors.map((err, i) => (
                <li key={i} className="text-sm text-red-600">{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
  );
  if (noCard) return body;
  return <Card title="Crawl Summary">{body}</Card>;
}

// ─── URL Review Panel ─────────────────────────────────────────────────────────

function maxCrawlUrlsForRole(role: string): number | null {
  if (role === 'admin') return null;
  if (role === 'paid') return 50;
  return 10;
}

// ─── URL Tree Data Model ──────────────────────────────────────────────────────

interface TreeNode {
  segment: string;
  fullPath: string;
  urls: string[];
  children: TreeNode[];
}

function buildUrlTree(urls: string[]): TreeNode {
  const root: TreeNode = { segment: '', fullPath: '', urls: [], children: [] };

  for (const url of urls) {
    let pathname: string;
    try { pathname = new URL(url).pathname || '/'; } catch { pathname = '/'; }
    const segments = pathname.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const path = '/' + segments.slice(0, i + 1).join('/');
      let child = current.children.find(c => c.segment === seg);
      if (!child) {
        child = { segment: seg, fullPath: path, urls: [], children: [] };
        current.children.push(child);
      }
      current = child;
    }

    current.urls.push(url);
  }

  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => {
      const aIsDir = a.children.length > 0;
      const bIsDir = b.children.length > 0;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.segment.localeCompare(b.segment);
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root;
}

function getDescendantUrls(node: TreeNode): string[] {
  const result: string[] = [...node.urls];
  for (const child of node.children) {
    result.push(...getDescendantUrls(child));
  }
  return result;
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate';

function getCheckState(descendantUrls: string[], selected: Set<string>): CheckState {
  if (descendantUrls.length === 0) return 'unchecked';
  const count = descendantUrls.filter(u => selected.has(u)).length;
  if (count === 0) return 'unchecked';
  if (count === descendantUrls.length) return 'checked';
  return 'indeterminate';
}

// ─── Tree Components ──────────────────────────────────────────────────────────

function DirectoryNode({
  node,
  selected,
  discoveredUrls,
  onToggleUrl,
  onToggleDirectory,
  onRemoveUrl,
  depth,
}: {
  node: TreeNode;
  selected: Set<string>;
  discoveredUrls: string[];
  onToggleUrl: (url: string) => void;
  onToggleDirectory: (urls: string[]) => void;
  onRemoveUrl: (url: string) => void;
  depth: number;
}) {
  const descendants = useMemo(() => getDescendantUrls(node), [node]);
  const checkState = getCheckState(descendants, selected);
  const [expanded, setExpanded] = useState(() => descendants.length <= 5);
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = checkState === 'indeterminate';
    }
  }, [checkState]);

  const handleCheckbox = () => {
    onToggleDirectory(descendants);
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 hover:bg-neutral-50"
        style={{ paddingLeft: `${depth * 20 + 16}px`, paddingRight: '16px' }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-600"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={checkState === 'checked'}
          onChange={handleCheckbox}
          className="h-4 w-4 rounded border-neutral-300 text-growth-500
                     focus:ring-growth-500 focus:ring-offset-0"
        />
        <span
          className="font-mono text-sm font-medium text-neutral-800 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          {node.segment}/
        </span>
        <span className="text-xs text-neutral-400">
          {descendants.length} URL{descendants.length !== 1 ? 's' : ''}
        </span>
      </div>
      {expanded && (
        <div>
          {node.urls.map(url => (
            <UrlLeaf
              key={url} url={url} selected={selected}
              discoveredUrls={discoveredUrls} onToggle={onToggleUrl}
              onRemove={onRemoveUrl} depth={depth + 1}
            />
          ))}
          {node.children.map(child =>
            child.children.length > 0 ? (
              <DirectoryNode
                key={child.fullPath} node={child} selected={selected}
                discoveredUrls={discoveredUrls} onToggleUrl={onToggleUrl}
                onToggleDirectory={onToggleDirectory} onRemoveUrl={onRemoveUrl}
                depth={depth + 1}
              />
            ) : (
              child.urls.map(url => (
                <UrlLeaf
                  key={url} url={url} selected={selected}
                  discoveredUrls={discoveredUrls} onToggle={onToggleUrl}
                  onRemove={onRemoveUrl} depth={depth + 1}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

function UrlLeaf({
  url,
  selected,
  discoveredUrls,
  onToggle,
  onRemove,
  depth,
}: {
  url: string;
  selected: Set<string>;
  discoveredUrls: string[];
  onToggle: (url: string) => void;
  onRemove: (url: string) => void;
  depth: number;
}) {
  let pathname: string;
  try { pathname = new URL(url).pathname || '/'; } catch { pathname = url; }
  const segments = pathname.split('/').filter(Boolean);
  const displayName = segments.length > 0 ? segments[segments.length - 1] : '/';
  const isDiscovered = discoveredUrls.includes(url);

  return (
    <label
      className="flex items-center gap-3 py-2 hover:bg-neutral-50 cursor-pointer group"
      style={{ paddingLeft: `${depth * 20 + 40}px`, paddingRight: '16px' }}
    >
      <input
        type="checkbox"
        checked={selected.has(url)}
        onChange={() => onToggle(url)}
        className="h-4 w-4 rounded border-neutral-300 text-growth-500
                   focus:ring-growth-500 focus:ring-offset-0"
      />
      <span className="flex-1 font-mono text-sm text-neutral-700 truncate">
        {displayName}
      </span>
      {!isDiscovered && (
        <span className="text-[10px] font-medium bg-growth-50 text-growth-600 border border-growth-200 px-1.5 py-0.5 rounded flex-shrink-0">
          Added
        </span>
      )}
      {!isDiscovered && (
        <button type="button" onClick={(e) => { e.preventDefault(); onRemove(url); }}
          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity flex-shrink-0"
          title="Remove URL"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </label>
  );
}

function UrlReviewPanel({
  discoveredUrls,
  targetUrl,
  userRole,
  onConfirm,
  isSubmitting,
}: {
  discoveredUrls: string[];
  targetUrl: string;
  userRole: string;
  onConfirm: (urls: string[]) => void;
  isSubmitting: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(discoveredUrls));
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [allUrls, setAllUrls] = useState<string[]>(discoveredUrls);

  const limit = maxCrawlUrlsForRole(userRole);
  const selectedCount = selected.size;
  const overLimit = limit !== null && selectedCount > limit;

  let targetDomain: string;
  try {
    targetDomain = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    targetDomain = '';
  }

  const toggleUrl = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allUrls));
  const selectNone = () => setSelected(new Set());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setAddError('Please enter a valid URL');
      return;
    }

    if (parsed.hostname.toLowerCase() !== targetDomain) {
      setAddError(`URL must be on ${targetDomain}`);
      return;
    }

    if (allUrls.includes(trimmed)) {
      setAddError('URL already in list');
      return;
    }

    setAllUrls(prev => [...prev, trimmed]);
    setSelected(prev => new Set([...prev, trimmed]));
    setNewUrl('');
  };

  const removeUrl = (url: string) => {
    setAllUrls(prev => prev.filter(u => u !== url));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  };

  const tree = useMemo(() => buildUrlTree(allUrls), [allUrls]);

  const toggleDirectory = useCallback((descendantUrls: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = descendantUrls.every(u => next.has(u));
      if (allSelected) {
        descendantUrls.forEach(u => next.delete(u));
      } else {
        descendantUrls.forEach(u => next.add(u));
      }
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const finalUrls = allUrls.filter(u => selected.has(u));
    onConfirm(finalUrls);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-lg text-neutral-900">Review URLs</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              Select which pages to include in the analysis
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-heading font-bold ${overLimit ? 'text-red-500' : 'text-neutral-900'}`}>
              {selectedCount}{limit !== null ? ` / ${limit}` : ''}
            </p>
            <p className="text-xs text-neutral-500">
              {limit !== null ? 'URL limit' : 'Unlimited'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={selectAll}
            className="text-xs font-medium text-growth-600 hover:text-growth-700">
            Select all
          </button>
          <span className="text-neutral-300">|</span>
          <button type="button" onClick={selectNone}
            className="text-xs font-medium text-growth-600 hover:text-growth-700">
            Deselect all
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto border border-neutral-200 rounded-lg">
          {allUrls.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-400 text-center italic">
              No URLs discovered. Add one manually below.
            </p>
          ) : (
            <>
              {tree.urls.map(url => (
                <UrlLeaf
                  key={url} url={url} selected={selected}
                  discoveredUrls={discoveredUrls} onToggle={toggleUrl}
                  onRemove={removeUrl} depth={0}
                />
              ))}
              {tree.children.map(child =>
                child.children.length > 0 ? (
                  <DirectoryNode
                    key={child.fullPath} node={child} selected={selected}
                    discoveredUrls={discoveredUrls} onToggleUrl={toggleUrl}
                    onToggleDirectory={toggleDirectory} onRemoveUrl={removeUrl}
                    depth={0}
                  />
                ) : (
                  child.urls.map(url => (
                    <UrlLeaf
                      key={url} url={url} selected={selected}
                      discoveredUrls={discoveredUrls} onToggle={toggleUrl}
                      onRemove={removeUrl} depth={0}
                    />
                  ))
                )
              )}
            </>
          )}
        </div>

        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder={`https://${targetDomain}/page`}
            className="flex-1 px-3 py-2 rounded-md border border-neutral-300 bg-neutral-50
                       text-neutral-900 placeholder-neutral-400 font-mono text-sm
                       focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500"
          />
          <button type="submit"
            className="px-4 py-2 rounded-md font-semibold text-sm text-growth-600 border border-growth-300
                       hover:bg-growth-50 transition-colors whitespace-nowrap"
          >
            Add URL
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-sm text-red-600">{addError}</p>
        )}
      </div>

      <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        {overLimit && (
          <p className="text-sm text-red-600 font-medium">
            Too many URLs selected. Your plan allows up to {limit}.
          </p>
        )}
        {!overLimit && selectedCount === 0 && (
          <p className="text-sm text-neutral-500">Select at least one URL to continue.</p>
        )}
        {!overLimit && selectedCount > 0 && (
          <p className="text-sm text-neutral-500">
            {selectedCount} URL{selectedCount !== 1 ? 's' : ''} will be analyzed.
          </p>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || overLimit || selectedCount === 0}
          className="px-8 py-3 rounded-md font-semibold text-white
                     bg-growth-500 hover:bg-growth-600
                     focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                     transition-all duration-200 whitespace-nowrap
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : (
            `Start Analysis (${selectedCount} URL${selectedCount !== 1 ? 's' : ''})`
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditPanel({ accessToken, userRole, initialAuditId }: AuditPanelProps) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [result, setResult] = useState<AuditStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [activeTargetUrl, setActiveTargetUrl] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmIdentityLoading, setConfirmIdentityLoading] = useState(false);
  const [identityFeedback, setIdentityFeedback] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<string>('executive');
  const pollRef = useRef<number | null>(null);
  const feedbackSectionRef = useRef<HTMLDivElement | null>(null);
  const statusSectionRef = useRef<HTMLDivElement | null>(null);
  const [auditMode, setAuditMode] = useState<'full' | 'cwv_only'>('full');
  const [cwvUrls, setCwvUrls] = useState<string[]>([]);
  const [cwvNewUrl, setCwvNewUrl] = useState('');
  const [cwvAddError, setCwvAddError] = useState<string | null>(null);
  const [cwvSubmitLoading, setCwvSubmitLoading] = useState(false);
  const [csvUrls, setCsvUrls] = useState<string[]>([]);
  const csvFileRef = useRef<HTMLInputElement | null>(null);

  const canRecrawl = userRole === 'admin' || userRole === 'paid';
  const isAdmin = userRole === 'admin';
  const csvLimit = maxCrawlUrlsForRole(userRole);

  const reportTabs = useMemo(() => {
    if (!result) return [];
    const tabs: { id: string; label: string }[] = [];
    const isCwvOnly = result.crawl_mode === 'cwv_only';
    if (isCwvOnly && result.performance?.length) {
      tabs.push({ id: 'performance', label: 'Core Web Vitals' });
    }
    if (result.compiled_report) tabs.push({ id: 'full_report', label: 'Full Report' });
    if (result.executive_summary) tabs.push({ id: 'executive', label: 'Executive Summary' });
    tabs.push({ id: 'crawl', label: 'Crawl Summary' });
    if (result.identity) tabs.push({ id: 'identity', label: 'Business Identity' });
    if (result.messaging) tabs.push({ id: 'messaging', label: 'Messaging' });
    if (result.ux) tabs.push({ id: 'ux', label: 'UX' });
    if (result.cro) tabs.push({ id: 'cro', label: 'CRO' });
    if (!isCwvOnly && result.performance?.length) tabs.push({ id: 'performance', label: 'Core Web Vitals' });
    if (result.deep_performance?.length) tabs.push({ id: 'deep_performance', label: 'Deep Performance' });
    return tabs;
  }, [result]);

  useEffect(() => {
    if (reportTabs.length === 0) return;
    if (!reportTabs.some(t => t.id === activeReportTab)) {
      setActiveReportTab(reportTabs[0].id);
    }
  }, [result, reportTabs, activeReportTab]);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`${getAPIBase()}/audits`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) setHistory(await resp.json());
    } catch { /* non-critical */ }
  }, [accessToken]);

  useEffect(() => {
    fetchHistory();
    return () => stopPolling();
  }, [stopPolling, fetchHistory]);

  // When identity phase is complete, scroll to the feedback box
  useEffect(() => {
    if (phase === 'reviewing_identity' && result) {
      const t = setTimeout(() => {
        feedbackSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [phase, result]);

  const handleStatusUpdate = useCallback((s: AuditStatus) => {
    setResult(s);
    if (s.status === 'urls_ready') {
      stopPolling();
      setPhase('reviewing');
    } else if (s.status === 'identity_ready') {
      stopPolling();
      setPhase('reviewing_identity');
    } else if (s.status === 'completed') {
      stopPolling();
      setPhase('completed');
      fetchHistory();
    } else if (s.status === 'failed') {
      stopPolling();
      setPhase('failed');
    }
  }, [stopPolling, fetchHistory]);

  const startPolling = useCallback((id: string) => {
    pollRef.current = window.setInterval(async () => {
      try {
        const resp = await fetch(`${getAPIBase()}/audit/${id}/status`, {
          headers: authHeaders,
        });
        if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);
        const s: AuditStatus = await resp.json();
        handleStatusUpdate(s);
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 2000);
  }, [authHeaders, handleStatusUpdate]);

  const startAudit = async (overrideUrl?: string, forceRecrawl = false) => {
    const targetUrl = overrideUrl ?? url;
    setError(null);
    setResult(null);
    setPhase('polling');
    setActiveTargetUrl(targetUrl);

    try {
      const payload: Record<string, unknown> = { url: targetUrl, force_recrawl: forceRecrawl };
      if (csvUrls.length > 0) {
        payload.urls = csvUrls;
      }

      const resp = await fetch(`${getAPIBase()}/audit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
      }

      const data = await resp.json();
      setAuditId(data.audit_id);

      if (data.cached && data.status === 'completed') {
        const statusResp = await fetch(`${getAPIBase()}/audit/${data.audit_id}/status`, {
          headers: authHeaders,
        });
        if (statusResp.ok) {
          const cachedResult: AuditStatus = await statusResp.json();
          setResult(cachedResult);
          setPhase('completed');
          return;
        }
      }

      if (data.status === 'urls_ready') {
        const statusResp = await fetch(`${getAPIBase()}/audit/${data.audit_id}/status`, {
          headers: authHeaders,
        });
        if (statusResp.ok) {
          const readyResult: AuditStatus = await statusResp.json();
          handleStatusUpdate(readyResult);
          return;
        }
      }

      startPolling(data.audit_id);
    } catch (err: unknown) {
      setPhase('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const startCwvAudit = async () => {
    if (cwvUrls.length === 0) {
      setError('Add at least one URL');
      return;
    }
    setError(null);
    setResult(null);
    setCwvSubmitLoading(true);
    setPhase('polling');
    setActiveTargetUrl(cwvUrls[0]);
    try {
      const resp = await fetch(`${getAPIBase()}/admin/cwv-audit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ urls: cwvUrls }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
      }
      const data = await resp.json();
      setAuditId(data.audit_id);
      startPolling(data.audit_id);
    } catch (err: unknown) {
      setPhase('failed');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCwvSubmitLoading(false);
    }
  };

  const confirmUrls = async (urls: string[]) => {
    if (!auditId) return;
    setConfirmLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${getAPIBase()}/audit/${auditId}/confirm`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ urls }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
      }

      setPhase('analyzing');
      startPolling(auditId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmIdentity = async () => {
    if (!auditId) return;
    setConfirmIdentityLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${getAPIBase()}/audit/${auditId}/confirm-identity`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ feedback: identityFeedback.trim() || null }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
      }

      setPhase('analyzing');
      startPolling(auditId);
      // Scroll back to status so user sees pipeline until audit completes
      setTimeout(() => {
        statusSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmIdentityLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    startAudit();
  };

  const loadAudit = async (id: string, targetUrl?: string) => {
    setError(null);
    setAuditId(id);
    setPhase('polling');
    if (targetUrl) setActiveTargetUrl(targetUrl);
    try {
      const resp = await fetch(`${getAPIBase()}/audit/${id}/status`, { headers: authHeaders });
      if (!resp.ok) throw new Error(`Failed to load audit: ${resp.status}`);
      const data: AuditStatus = await resp.json();

      if (data.status === 'urls_ready') {
        setResult(data);
        setPhase('reviewing');
      } else if (data.status === 'identity_ready') {
        setResult(data);
        setPhase('reviewing_identity');
      } else if (data.status === 'completed') {
        setResult(data);
        setPhase('completed');
      } else if (data.status === 'failed') {
        setResult(data);
        setPhase('failed');
      } else {
        setResult(data);
        startPolling(id);
      }
    } catch (err: unknown) {
      setPhase('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Auto-load a specific audit when navigated to via /audit/:id
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialAuditId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadAudit(initialAuditId);
    }
  }, [initialAuditId]);

  const reset = () => {
    stopPolling();
    setPhase('idle');
    setAuditId(null);
    setResult(null);
    setError(null);
    setUrl('');
    setActiveTargetUrl(null);
    setConfirmLoading(false);
    setConfirmIdentityLoading(false);
    setIdentityFeedback('');
    setActiveReportTab('executive');
    setCsvUrls([]);
  };

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

  const handleCwvAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCwvAddError(null);
    const trimmed = cwvNewUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setCwvAddError('Please enter a valid URL');
      return;
    }
    if (cwvUrls.includes(trimmed)) {
      setCwvAddError('URL already in list');
      return;
    }
    setCwvUrls(prev => [...prev, trimmed]);
    setCwvNewUrl('');
  };

  const handleCwvCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setCwvUrls(prev => [...new Set([...prev, ...parsed])]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {initialAuditId && (
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-growth-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </a>
      )}

      {/* Mode toggle (admin only) */}
      {isAdmin && (
        <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setAuditMode('full')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              auditMode === 'full' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Full audit
          </button>
          <button
            type="button"
            onClick={() => setAuditMode('cwv_only')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              auditMode === 'cwv_only' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            CWV only
          </button>
        </div>
      )}

      {/* CWV-only URL list (admin, when mode is CWV only and idle/failed/completed) */}
      {isAdmin && auditMode === 'cwv_only' && (phase === 'idle' || phase === 'failed' || phase === 'completed') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-level-2">
          <h3 className="font-heading font-semibold text-lg text-neutral-900 mb-1">Core Web Vitals at scale</h3>
          <p className="text-sm text-neutral-500 mb-4">Add URLs one by one or upload a CSV (one URL per line or first column).</p>
          <form onSubmit={handleCwvAddUrl} className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                type="url"
                value={cwvNewUrl}
                onChange={(e) => setCwvNewUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 font-mono text-sm"
              />
            </div>
            <button type="submit" className="px-4 py-3 rounded-md font-medium text-growth-700 border-2 border-growth-500 hover:bg-growth-50 whitespace-nowrap">
              Add URL
            </button>
            <label className="px-4 py-3 rounded-md font-medium text-neutral-700 border border-neutral-300 hover:bg-neutral-50 cursor-pointer whitespace-nowrap">
              Upload CSV
              <input type="file" accept=".csv,.txt" className="sr-only" onChange={handleCwvCsvFile} />
            </label>
          </form>
          {cwvAddError && <p className="text-sm text-red-600 mb-2">{cwvAddError}</p>}
          {cwvUrls.length > 0 && (
            <>
              <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-md mb-4">
                <ul className="divide-y divide-neutral-100">
                  {cwvUrls.map((u, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2 text-sm font-mono text-neutral-700">
                      <span className="truncate flex-1">{u}</span>
                      <button type="button" onClick={() => setCwvUrls(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-neutral-500 mb-3">{cwvUrls.length} URL{cwvUrls.length !== 1 ? 's' : ''}</p>
              <button
                type="button"
                disabled={cwvSubmitLoading}
                onClick={startCwvAudit}
                className="px-8 py-3 rounded-md font-semibold text-white bg-growth-500 hover:bg-growth-600 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2 disabled:opacity-50 whitespace-nowrap"
              >
                {cwvSubmitLoading ? 'Starting…' : 'Run CWV audit'}
              </button>
            </>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {/* URL Input Form (full audit, or when not in CWV-only mode) */}
      {(!isAdmin || auditMode === 'full') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-level-2">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="audit-url" className="sr-only">Website URL</label>
              <input
                id="audit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={phase !== 'idle' && phase !== 'failed' && phase !== 'completed'}
                className="w-full px-4 py-3 rounded-md border border-neutral-300 bg-neutral-50
                           text-neutral-900 placeholder-neutral-400
                           focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           font-mono text-sm transition-all duration-200"
              />
            </div>
            {phase === 'idle' || phase === 'failed' ? (
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-md font-semibold text-white
                             bg-growth-500 hover:bg-growth-600
                             focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                             transition-all duration-200 whitespace-nowrap"
                >
                  Run Audit
                </button>
                <label className="px-4 py-3 rounded-md font-medium text-sm text-neutral-700 border border-neutral-300
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
              </div>
            ) : phase === 'polling' || phase === 'analyzing' ? (
              <button type="button" disabled
                className="px-8 py-3 rounded-md font-semibold text-white bg-growth-400 cursor-wait whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {phase === 'analyzing' ? 'Analyzing...' : 'Discovering...'}
                </span>
              </button>
            ) : phase === 'reviewing' ? (
              <button type="button" onClick={reset}
                className="px-8 py-3 rounded-md font-semibold text-growth-600 border-2 border-growth-500
                           hover:bg-growth-50 transition-all duration-200 whitespace-nowrap"
              >
                Cancel
              </button>
            ) : (
              <div className="flex gap-2">
                {canRecrawl && activeTargetUrl && (
                  <button type="button" onClick={() => startAudit(activeTargetUrl, true)}
                    className="px-6 py-3 rounded-md font-semibold text-white
                               bg-growth-500 hover:bg-growth-600
                               focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2
                               transition-all duration-200 whitespace-nowrap"
                  >
                    Re-audit
                  </button>
                )}
                <button type="button" onClick={reset}
                  className="px-8 py-3 rounded-md font-semibold text-growth-600 border-2 border-growth-500
                             hover:bg-growth-50 transition-all duration-200 whitespace-nowrap"
                >
                  New Audit
                </button>
              </div>
            )}
          </form>

          {csvUrls.length > 0 && (phase === 'idle' || phase === 'failed') && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-growth-50 border border-growth-200 rounded-md">
              <svg className="w-5 h-5 text-growth-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="flex-1 text-sm text-growth-800 font-medium">
                {csvUrls.length} URL{csvUrls.length !== 1 ? 's' : ''} loaded from CSV
                {csvLimit !== null && csvUrls.length > csvLimit && (
                  <span className="text-red-600 ml-2">
                    (exceeds your limit of {csvLimit})
                  </span>
                )}
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

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Previous Audits */}
      {phase === 'idle' && history.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg text-neutral-900">Previous Audits</h3>
            <span className="text-xs text-neutral-400">{history.length} audit{history.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {history.map((item) => (
              <li key={item.audit_id}>
                <a
                  href={`/audit/${item.audit_id}`}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-growth-600 transition-colors">
                        {item.target_url}
                      </p>
                      {item.parent_audit_id && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-growth-50 text-growth-600 border border-growth-200 flex-shrink-0">
                          Re-audit
                        </span>
                      )}
                      {item.crawl_mode === 'cwv_only' && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 flex-shrink-0">
                          CWV
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          })
                        : 'Unknown date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    <span className="text-xs text-neutral-500">
                      {item.pages_crawled}/{item.total_urls} pages
                    </span>
                    <HistoryStatusBadge status={item.status} />
                    <svg className="w-4 h-4 text-neutral-300 group-hover:text-growth-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Bar */}
      {auditId && result && (
        <div ref={statusSectionRef} className="flex flex-col gap-2 bg-white rounded-xl border border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatusBadge status={result.status} />
              <span className="text-sm text-neutral-500 font-mono">{auditId}</span>
            </div>
            <div className="text-sm text-neutral-500">
              {result.pages_crawled} / {result.total_urls} pages crawled
            </div>
          </div>
          {result.status_message && (
            <p className={`text-sm ${result.status === 'failed' ? 'text-red-600' : 'text-neutral-600'}`}>
              {result.status_message}
            </p>
          )}
        </div>
      )}

      {/* Pipeline Progress (discovery phase) */}
      {phase === 'polling' && result && (result.status === 'running' || result.status === 'queued') && (
        <PipelineProgress result={result} />
      )}

      {/* URL Review Panel */}
      {phase === 'reviewing' && result && activeTargetUrl && (
        <UrlReviewPanel
          discoveredUrls={result.discovered_urls}
          targetUrl={activeTargetUrl}
          userRole={userRole}
          onConfirm={confirmUrls}
          isSubmitting={confirmLoading}
        />
      )}

      {/* Identity Review Panel (hidden after submit; status section shown until audit completes) */}
      {phase === 'reviewing_identity' && result && (
        <>
          <PipelineProgress result={result} />
          <IdentityReviewPanel
            identity={result.identity}
            errors={result.errors}
            identityPayloadSent={result.identity_payload_sent}
            feedback={identityFeedback}
            onFeedbackChange={setIdentityFeedback}
            onConfirm={confirmIdentity}
            isSubmitting={confirmIdentityLoading}
            feedbackSectionRef={feedbackSectionRef}
          />
        </>
      )}

      {/* Pipeline Progress (analysis phase) */}
      {phase === 'analyzing' && result && (result.status === 'running' || result.status === 'queued') && (
        <PipelineProgress result={result} />
      )}

      {/* Results with tab navigation */}
      {(phase === 'completed' || (phase === 'failed' && result)) && result && reportTabs.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-2 pt-2">
            <div className="flex items-end justify-between">
              <nav className="flex flex-wrap gap-0.5" aria-label="Report sections">
                {reportTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveReportTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium rounded-t-md transition-colors ${
                      activeReportTab === tab.id
                        ? 'bg-white text-neutral-900 border border-b-0 border-neutral-200 border-b-transparent -mb-px'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              {phase === 'completed' && auditId && (
                <a
                  href={`${getAPIBase()}/audit/${auditId}/export/pdf`}
                  className="inline-flex items-center gap-2 px-4 py-2 mb-1 mr-1 rounded-md text-sm font-medium
                             text-growth-600 border border-growth-300 hover:bg-growth-50
                             transition-colors whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    fetch(`${getAPIBase()}/audit/${auditId}/export/pdf`, {
                      headers: { Authorization: `Bearer ${accessToken}` },
                    })
                      .then(res => {
                        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
                        const disposition = res.headers.get('Content-Disposition') ?? '';
                        const match = disposition.match(/filename="(.+)"/);
                        const filename = match?.[1] ?? 'Audit Report.pdf';
                        return res.blob().then(blob => ({ blob, filename }));
                      })
                      .then(({ blob, filename }) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      })
                      .catch(err => console.error('PDF download failed:', err));
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              )}
            </div>
          </div>
          <div className="px-6 py-6 min-h-[200px]">
            {activeReportTab === 'full_report' && result.compiled_report && (
              <CompiledReport
                markdown={result.compiled_report}
                messaging={result.messaging}
                ux={result.ux}
                performance={result.performance}
              />
            )}
            {activeReportTab === 'executive' && result.executive_summary && (
              <ExecutiveSummarySection summary={result.executive_summary} noCard />
            )}
            {activeReportTab === 'crawl' && <CrawlSummary data={result} noCard />}
            {activeReportTab === 'identity' && result.identity && (
              <IdentitySection data={result.identity} noCard />
            )}
            {activeReportTab === 'messaging' && result.messaging && (
              <MessagingSection data={result.messaging} noCard />
            )}
            {activeReportTab === 'ux' && result.ux && (
              <UXSection data={result.ux} noCard />
            )}
            {activeReportTab === 'cro' && result.cro && (
              <CROSection data={result.cro} noCard />
            )}
            {activeReportTab === 'performance' && result.performance && result.performance.length > 0 && (
              <PerformanceSection data={result.performance} noCard />
            )}
            {activeReportTab === 'deep_performance' && result.deep_performance && result.deep_performance.length > 0 && (
              <DeepPerformanceSection data={result.deep_performance} noCard />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
