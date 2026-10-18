/**
 * Client-safe slide preview builder (no highlight.js). Mirrors the server
 * template so the admin UI can show a live preview of theme + layout.
 */
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';
import { bulletMarker } from './layout';
import { escapeHtml, slideCss, wrapDocument } from './slideStyles';
import { parseSlideText, type ParsedSlide } from './slideParse';

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
           <pre class="code"><code class="hljs">${escapeHtml(slide.code)}</code></pre>
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

function buildSlideHtml(o: {
  rawText: string;
  contextTitle: string;
  index: number;
  total: number;
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

export function buildPreviewDocument(o: {
  slides: string[];
  title: string;
  theme: Theme;
  layout: LayoutOptions;
  footerHandle: string;
  width: number;
  height: number;
  activeIndex?: number;
}): string {
  const { slides, title, theme, layout, footerHandle, width, height } = o;
  const active = o.activeIndex ?? 0;
  const total = slides.length;
  const body = slides
    .map((s, i) =>
      buildSlideHtml({
        rawText: s,
        contextTitle: title,
        index: i,
        total,
        layout,
        footerHandle,
        isHook: i === 0,
        isLast: i === total - 1
      })
    )
    .map((html, i) => html.replace('<div class="slide">', `<div class="slide${i === active ? ' active' : ''}">`))
    .join('\n');
  const css = slideCss(theme, layout, width, height) + `\n.slide{display:none}.slide.active{display:flex}`;
  return wrapDocument(css, body);
}
