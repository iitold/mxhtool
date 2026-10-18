/**
 * Builds an HTML document with one `.slide` element per slide.
 * Rendered by Playwright (server) and previewed in the admin (client).
 * Syntax highlighting via highlight.js.
 */
import hljs from 'highlight.js';
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';
import { bulletMarker } from './layout';
import { escapeHtml, slideCss, wrapDocument } from './slideStyles';
import { parseSlideText, type ParsedSlide } from './slideParse';

export { parseSlideText };
export type { ParsedSlide };

const LANG_ALIAS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  psql: 'sql',
  golang: 'go',
  'c++': 'cpp',
  'c#': 'csharp'
};

function highlight(code: string, lang: string): string {
  const mapped = LANG_ALIAS[lang.toLowerCase()] ?? lang.toLowerCase();
  try {
    if (hljs.getLanguage(mapped)) return hljs.highlight(code, { language: mapped }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

export interface SlideDocOptions {
  slides: string[];
  title: string;
  theme: Theme;
  layout: LayoutOptions;
  footerHandle: string;
  width: number;
  height: number;
}

function label(index: number): string {
  return index < 10 ? '0' + index : '' + index;
}

function renderHook(slide: ParsedSlide): string {
  return `
      <div class="card hook-card">
        <div class="label" style="color:var(--accent2)">00 // OVERVIEW</div>
        <div class="hook-text">${escapeHtml(slide.title || slide.bullets.join(' '))}</div>
      </div>`;
}

function renderContent(slide: ParsedSlide, index: number, layout: LayoutOptions): string {
  const labelText = `${label(index)} // ${escapeHtml((slide.title || 'CONTENT').toUpperCase()).slice(0, 48)}`;
  const bullets = slide.bullets
    .map((b, i) => `<div class="bullet">${bulletMarker(layout.bulletStyle, i)}<span>${escapeHtml(b)}</span></div>`)
    .join('');

  const code = slide.code
    ? `<div class="codecard">
           <div class="code-label" style="color:var(--accent2)">${label(index)}.code // ${escapeHtml(
             (slide.lang || 'snippet').toUpperCase()
           )}</div>
           <pre class="code"><code class="hljs">${highlight(slide.code, slide.lang)}</code></pre>
         </div>`
    : '';

  return `
      <div class="card content-card ${code ? 'has-code' : ''}">
        <div class="label" style="color:var(--accent2)">${labelText}</div>
        <div class="body ${layout.contentValign === 'top' ? 'valign-top' : ''}">
          ${bullets ? `<div class="bullets">${bullets}</div>` : ''}
          ${code}
        </div>
      </div>`;
}

export function buildSlideHtml(o: {
  rawText: string;
  contextTitle: string;
  index: number;
  total: number;
  theme: Theme;
  layout: LayoutOptions;
  footerHandle: string;
  isHook: boolean;
  isLast: boolean;
}): string {
  const { rawText, contextTitle, index, total, layout, footerHandle, isHook, isLast } = o;
  const parsed = parseSlideText(rawText);
  const slideNum = `${index + 1}/${total}`;
  const footerText = isLast
    ? `End of Topic • ${footerHandle}`
    : isHook
      ? 'Swipe to learn more'
      : `Follow ${footerHandle} for dev tips`;

  const body = isHook ? renderHook(parsed) : renderContent(parsed, index, layout);

  const header =
    layout.showHeader && (layout.showLogo || contextTitle)
      ? `
    <div class="header">
      <div class="header-title">${escapeHtml(contextTitle.toUpperCase())}</div>
      ${layout.showLogo ? '<div class="logo"><span>I</span></div>' : ''}
    </div>`
      : '';

  const footer = layout.showFooter
    ? `
    <div class="footer">
      <div class="footer-left"><span class="fdot"></span><span>${escapeHtml(footerText)}</span></div>
      ${layout.showSlideNumber ? `<div class="badge">${slideNum}  STABLE</div>` : ''}
    </div>`
    : '';

  return `
  <div class="slide">
    ${header}
    ${body}
    ${footer}
  </div>`;
}

export function buildDocument(o: SlideDocOptions): string {
  const { slides, title, theme, layout, footerHandle, width, height } = o;
  const total = slides.length;
  const body = slides
    .map((s, i) =>
      buildSlideHtml({
        rawText: s,
        contextTitle: title,
        index: i,
        total,
        theme,
        layout,
        footerHandle,
        isHook: i === 0,
        isLast: i === total - 1
      })
    )
    .join('\n');

  return wrapDocument(slideCss(theme, layout, width, height), body);
}

export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}
