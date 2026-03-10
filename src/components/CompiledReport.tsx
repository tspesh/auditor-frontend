/**
 * Renders a compiled audit report with score ring graphics injected into
 * scored sections (Messaging, UX, Core Web Vitals).
 *
 * Splits the compiled markdown by ## headings, detects scored sections,
 * strips the **Scores:** text line (replaced by visual rings), and renders
 * each section via ReportProse.
 */

import { useMemo } from 'react';
import { ReportProse } from './ReportProse';
import { ScoreRing, Stat } from './ui';

interface MessagingScores {
  consistency_score: number;
}

interface UXScores {
  brand_alignment_score: number;
  visual_clarity_score: number;
  mobile_desktop_consistency: number;
}

interface PerformanceEntry {
  vitals: { performance_score: number | null };
  grade: { overall_grade: string };
  error: string | null;
}

export interface CompiledReportProps {
  markdown: string;
  messaging?: MessagingScores | null;
  ux?: UXScores | null;
  performance?: PerformanceEntry[] | null;
}

const SCORES_LINE_RE = /^\s*\*\*Scores?:\*\*.*$/m;

interface MdSection {
  heading: string;
  body: string;
}

function splitMdSections(md: string): MdSection[] {
  const parts = md.split(/^(## .+)$/m);
  const sections: MdSection[] = [];

  if (parts[0].trim()) {
    sections.push({ heading: '', body: parts[0] });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].replace(/^#+\s*/, '').trim();
    const body = i + 1 < parts.length ? parts[i + 1] : '';
    sections.push({ heading, body });
  }

  return sections;
}

export function CompiledReport({ markdown, messaging, ux, performance }: CompiledReportProps) {
  const sections = useMemo(() => splitMdSections(markdown), [markdown]);

  return (
    <div className="space-y-8">
      {sections.map((section, idx) => {
        const headingLower = section.heading.toLowerCase();
        let scoreRow: React.ReactNode = null;
        let body = section.body;

        if (headingLower.includes('messaging') && messaging) {
          scoreRow = (
            <div className="flex items-start gap-6 mb-4">
              <div className="flex-shrink-0 text-center">
                <ScoreRing score={messaging.consistency_score} />
                <p className="text-xs text-neutral-500 mt-1">Consistency</p>
              </div>
            </div>
          );
          body = body.replace(SCORES_LINE_RE, '');
        } else if (headingLower.includes('ux') && ux) {
          scoreRow = (
            <div className="flex items-start gap-6 mb-4">
              <div className="flex-shrink-0 text-center">
                <ScoreRing score={ux.brand_alignment_score} />
                <p className="text-xs text-neutral-500 mt-1">Brand Alignment</p>
              </div>
              <div className="flex-shrink-0 text-center">
                <ScoreRing score={ux.visual_clarity_score} />
                <p className="text-xs text-neutral-500 mt-1">Visual Clarity</p>
              </div>
              <div className="flex-shrink-0 text-center">
                <ScoreRing score={ux.mobile_desktop_consistency} />
                <p className="text-xs text-neutral-500 mt-1">Mobile / Desktop</p>
              </div>
            </div>
          );
          body = body.replace(SCORES_LINE_RE, '');
        } else if (headingLower.includes('core web vitals') && performance?.length) {
          const successful = performance.filter(r => r.error === null);
          const scores = successful
            .map(r => r.vitals.performance_score)
            .filter((s): s is number => s !== null);
          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
          const passing = successful.filter(r =>
            r.grade.overall_grade === 'A' || r.grade.overall_grade === 'B',
          ).length;
          const needsWork = successful.filter(r =>
            ['C', 'D', 'F'].includes(r.grade.overall_grade),
          ).length;

          scoreRow = (
            <div className="flex items-start gap-6 mb-4">
              <div className="flex-shrink-0 text-center">
                <ScoreRing score={avgScore} max={100} />
                <p className="text-xs text-neutral-500 mt-1">Avg Score</p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <Stat label="URLs Measured" value={performance.length} />
                <Stat label="Passing" value={passing} />
                <Stat label="Needs Work" value={needsWork} alert={needsWork > 0} />
              </div>
            </div>
          );
          body = body.replace(SCORES_LINE_RE, '');
        }

        return (
          <div key={idx}>
            {section.heading && (
              <h2 className="font-semibold text-lg text-neutral-900 mt-6 mb-2 first:mt-0">
                {section.heading}
              </h2>
            )}
            {scoreRow}
            {body.trim() && <ReportProse content={body} />}
          </div>
        );
      })}
    </div>
  );
}
