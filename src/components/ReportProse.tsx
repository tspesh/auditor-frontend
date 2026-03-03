/**
 * Renders audit report markdown with consistent typography.
 * Uses marked for parsing and DOMPurify for safe HTML.
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Report typography: single source of truth for headings, paragraphs, lists
const REPORT_CLASSES = {
  h2: 'font-semibold text-lg text-neutral-900 mt-6 mb-2 first:mt-0',
  h3: 'font-semibold text-base text-neutral-900 mt-4 mb-1',
  h4: 'font-semibold text-sm text-neutral-900 mt-3 mb-1',
  p: 'mb-3 text-neutral-700 leading-relaxed last:mb-0',
  ul: 'list-disc list-outside ml-4 my-3 space-y-1 pl-1',
  ol: 'list-decimal list-outside ml-4 my-3 space-y-1 pl-1',
  li: 'mb-1 text-neutral-700',
  a: 'text-growth-600 underline hover:text-growth-700',
  code: 'px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 text-sm font-mono',
  strong: 'font-semibold text-neutral-900',
  hr: 'border-t border-neutral-200 my-4',
  blockquote: 'border-l-4 border-neutral-300 pl-4 my-3 text-neutral-600 italic',
} as const;

function addReportClasses(html: string): string {
  let out = html;
  out = out.replace(/<h2>/gi, `<h2 class="${REPORT_CLASSES.h2}">`);
  out = out.replace(/<h3>/gi, `<h3 class="${REPORT_CLASSES.h3}">`);
  out = out.replace(/<h4>/gi, `<h4 class="${REPORT_CLASSES.h4}">`);
  out = out.replace(/<p>/gi, `<p class="${REPORT_CLASSES.p}">`);
  out = out.replace(/<ul>/gi, `<ul class="${REPORT_CLASSES.ul}">`);
  out = out.replace(/<ol>/gi, `<ol class="${REPORT_CLASSES.ol}">`);
  out = out.replace(/<li>/gi, `<li class="${REPORT_CLASSES.li}">`);
  out = out.replace(/<a /gi, `<a rel="noopener noreferrer" target="_blank" class="${REPORT_CLASSES.a}" `);
  out = out.replace(/<code>/gi, `<code class="${REPORT_CLASSES.code}">`);
  out = out.replace(/<strong>/gi, `<strong class="${REPORT_CLASSES.strong}">`);
  out = out.replace(/<hr>/gi, `<hr class="${REPORT_CLASSES.hr}">`);
  out = out.replace(/<hr\s*\/>/gi, `<hr class="${REPORT_CLASSES.hr}">`);
  out = out.replace(/<blockquote>/gi, `<blockquote class="${REPORT_CLASSES.blockquote}">`);
  return out;
}

let markedConfigured = false;

function getReportHtml(md: string): string {
  if (!md || typeof md !== 'string') return '';
  const raw = md.trim();
  if (!raw) return '';

  if (!markedConfigured) {
    marked.use({
      gfm: true,
      hooks: {
        postprocess(html: string) {
          return addReportClasses(html);
        },
      },
    });
    markedConfigured = true;
  }

  const html = marked.parse(raw, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'a', 'code', 'strong', 'em', 'br', 'hr', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'class', 'rel', 'target'],
  });
}

export interface ReportProseProps {
  /** Raw markdown from audit agents */
  content: string;
  /** Optional extra class for the wrapper (e.g. for secondary/smaller text) */
  className?: string;
  /** Use smaller base text for dense/secondary blocks (e.g. per-page findings) */
  size?: 'default' | 'sm';
}

export function ReportProse({ content, className = '', size = 'default' }: ReportProseProps) {
  const html = getReportHtml(content);
  if (!html) return null;

  const sizeClass = size === 'sm' ? 'text-sm' : '';
  return (
    <div
      className={`report-prose ${sizeClass} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
