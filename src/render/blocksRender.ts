/**
 * Shared block → HTML renderer. Used by the Playwright template (hljs
 * highlighting) and by the admin preview (plain escaping). Isomorphic.
 */
import type { LayoutOptions } from './layout';
import { bulletMarker } from './layout';
import { escapeHtml } from './slideStyles';
import type { SlideBlock, SlideSpec } from './blocks';
import { hasCodeBlock } from './blocks';

export type HighlightFn = (code: string, lang: string) => string;

export interface RenderCtx {
  layout: LayoutOptions;
  highlight: HighlightFn;
}

function label(index: number): string {
  return index < 10 ? '0' + index : '' + index;
}

function bulletsHtml(bullets: string[], layout: LayoutOptions): string {
  return bullets
    .map((b, i) => `<div class="bullet">${bulletMarker(layout.bulletStyle, i)}<span>${escapeHtml(b)}</span></div>`)
    .join('');
}

function codeCardHtml(lang: string, codeHtml: string, tag: string, index: number, extra = ''): string {
  return `<div class="codecard ${extra}">
      <div class="code-label" style="color:var(--accent2)">${label(index)}.${tag} // ${escapeHtml(
        (lang || 'snippet').toUpperCase()
      )}</div>
      <pre class="code"><code class="hljs">${codeHtml}</code></pre>
    </div>`;
}

function diffHtml(lines: string[]): string {
  return lines
    .map((l) => {
      const sign = l[0] === '+' || l[0] === '-' ? l[0] : ' ';
      const cls = sign === '+' ? 'add' : sign === '-' ? 'del' : 'ctx';
      const inner = sign === ' ' ? l : l.slice(1);
      return `<div class="dl ${cls}"><span class="dl-sign">${escapeHtml(
        sign === ' ' ? ' ' : sign
      )}</span><span class="dl-text">${escapeHtml(inner)}</span></div>`;
    })
    .join('');
}

function renderDiagram(b: Extract<SlideBlock, { type: 'diagram' }>): string {
  const title = b.title ? `<div class="diagram-title">${escapeHtml(b.title)}</div>` : '';
  const caption = b.caption ? `<div class="diagram-caption">${escapeHtml(b.caption)}</div>` : '';

  if (b.variant === 'bars') {
    const bars = (b.bars ?? [])
      .map((bar) => {
        const max = bar.max && bar.max > 0 ? bar.max : Math.max(...(b.bars ?? []).map((x) => x.value), 1);
        const pct = Math.max(2, Math.min(100, Math.round((bar.value / max) * 100)));
        return `<div class="bar-row">
          <div class="bar-label">${escapeHtml(bar.label)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-value">${escapeHtml(String(bar.value))}</div>
        </div>`;
      })
      .join('');
    return `<div class="diagram bars">${title}<div class="bars-list">${bars}</div>${caption}</div>`;
  }

  if (b.variant === 'join') {
    const list = (items?: string[]) =>
      (items ?? []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    return `<div class="diagram join">
      ${title}
      <div class="join-grid">
        <div class="join-box"><div class="join-head">${escapeHtml(b.leftLabel ?? 'A')}</div><ul>${list(b.leftItems)}</ul></div>
        <div class="join-op"><span>&#8904;</span></div>
        <div class="join-box"><div class="join-head">${escapeHtml(b.rightLabel ?? 'B')}</div><ul>${list(b.rightItems)}</ul></div>
      </div>
      ${
        (b.overlap ?? []).length
          ? `<div class="join-result"><span class="join-result-tag">KẾT QUẢ</span><span>${escapeHtml(
              (b.overlap ?? []).join('  •  ')
            )}</span></div>`
          : ''
      }
      ${caption}
    </div>`;
  }

  // venn
  return `<div class="diagram venn">
    ${title}
    <div class="venn-circles">
      <div class="venn-circle left"><span>${escapeHtml(b.leftLabel ?? 'A')}</span></div>
      <div class="venn-circle right"><span>${escapeHtml(b.rightLabel ?? 'B')}</span></div>
      ${
        (b.overlap ?? []).length
          ? `<div class="venn-overlap">${escapeHtml((b.overlap ?? []).join(', '))}</div>`
          : ''
      }
    </div>
    ${caption}
  </div>`;
}

/** Removes scripts and inline event handlers from author-supplied HTML. */
export function sanitizeHtml(html: string): string {
  return String(html)
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script[^>]*>/gi, '')
    .replace(/<\s*\/\s*script\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

export function renderBlock(b: SlideBlock, ctx: RenderCtx, index: number): string {
  switch (b.type) {
    case 'text':
      return `<div class="blk-text">${
        b.title ? `<div class="blk-title">${escapeHtml(b.title)}</div>` : ''
      }${b.bullets?.length ? `<div class="bullets">${bulletsHtml(b.bullets, ctx.layout)}</div>` : ''}</div>`;

    case 'code':
      return codeCardHtml(b.lang ?? 'text', ctx.highlight(b.code, b.lang ?? 'text'), 'code', index);

    case 'diff':
      return codeCardHtml(b.lang ?? 'diff', `<div class="diff">${diffHtml(b.lines)}</div>`, 'diff', index, 'diffcard');

    case 'compare':
      return `<div class="compare">
        <div class="compare-col before">
          <div class="compare-head">${escapeHtml(b.beforeTitle ?? 'TRƯỚC')}</div>
          <ul>${b.before.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </div>
        <div class="compare-col after">
          <div class="compare-head">${escapeHtml(b.afterTitle ?? 'SAU')}</div>
          <ul>${b.after.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </div>
      </div>`;

    case 'steps': {
      const dir = b.direction ?? 'column';
      const items = b.items
        .map(
          (it, i) => `<div class="step">
            <span class="step-num">${i + 1}</span>
            <div class="step-body">
              <div class="step-label">${escapeHtml(it.label)}</div>
              ${it.detail ? `<div class="step-detail">${escapeHtml(it.detail)}</div>` : ''}
            </div>
          </div>${dir === 'row' && i < b.items.length - 1 ? '<div class="step-arrow">&rarr;</div>' : ''}`
        )
        .join('');
      return `<div class="steps ${dir}">${items}</div>`;
    }

    case 'table':
      return `<div class="table-wrap"><table class="tbl">
        ${b.headers.length ? `<thead><tr>${b.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>` : ''}
        <tbody>${b.rows
          .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody>
      </table></div>`;

    case 'stat':
      return `<div class="stats">${b.items
        .map(
          (it) => `<div class="stat"><div class="stat-value">${escapeHtml(it.value)}</div><div class="stat-label">${escapeHtml(
            it.label
          )}</div></div>`
        )
        .join('')}</div>`;

    case 'callout': {
      const v = b.variant ?? 'info';
      return `<div class="callout ${v}">
        ${b.title ? `<div class="callout-title">${escapeHtml(b.title)}</div>` : ''}
        <div class="callout-text">${escapeHtml(b.text)}</div>
      </div>`;
    }

    case 'diagram':
      return renderDiagram(b);

    case 'raw':
      return `<div class="raw">${sanitizeHtml(b.html)}</div>`;

    case 'image':
      return `<figure class="img-block">
        <img class="img ${b.fit === 'contain' ? 'contain' : 'cover'}" src="${escapeHtml(b.url)}" alt="" />
        ${b.caption ? `<figcaption class="img-caption">${escapeHtml(b.caption)}</figcaption>` : ''}
      </figure>`;

    case 'timeline':
      return `<div class="timeline">${b.items
        .map(
          (it) => `<div class="tl-item">
            <div class="tl-rail"><span class="tl-dot"></span></div>
            <div class="tl-body">
              ${it.when ? `<div class="tl-when">${escapeHtml(it.when)}</div>` : ''}
              <div class="tl-label">${escapeHtml(it.label)}</div>
              ${it.detail ? `<div class="tl-detail">${escapeHtml(it.detail)}</div>` : ''}
            </div>
          </div>`
        )
        .join('')}</div>`;

    case 'code-compare':
      return `<div class="code-compare">
        <div class="codecol">
          ${b.leftTitle ? `<div class="codecol-head">${escapeHtml(b.leftTitle)}</div>` : ''}
          <pre class="code"><code class="hljs">${ctx.highlight(b.left.code, b.left.lang ?? 'text')}</code></pre>
        </div>
        <div class="codecol">
          ${b.rightTitle ? `<div class="codecol-head">${escapeHtml(b.rightTitle)}</div>` : ''}
          <pre class="code"><code class="hljs">${ctx.highlight(b.right.code, b.right.lang ?? 'text')}</code></pre>
        </div>
      </div>`;
  }
}

export function renderCardBody(spec: SlideSpec, ctx: RenderCtx, index: number): string {
  return spec.blocks.map((b) => renderBlock(b, ctx, index)).join('');
}

export function renderHookCard(spec: SlideSpec): string {
  const text = spec.title || spec.blocks.map((b) => (b.type === 'text' ? (b.bullets ?? []).join(' ') : '')).join(' ');
  return `
      <div class="card hook-card">
        <div class="label" style="color:var(--accent2)">00 // OVERVIEW</div>
        <div class="hook-text">${escapeHtml(text)}</div>
      </div>`;
}

export function renderContentCard(spec: SlideSpec, ctx: RenderCtx, index: number): string {
  const labelText = `${label(index)} // ${escapeHtml((spec.title || 'CONTENT').toUpperCase()).slice(0, 48)}`;
  const hasCode = hasCodeBlock(spec);
  const hero = spec.variant === 'hero' ? 'is-hero' : '';
  return `
      <div class="card content-card ${hasCode ? 'has-code' : ''} ${hero}">
        <div class="label" style="color:var(--accent2)">${labelText}</div>
        <div class="body ${ctx.layout.contentValign === 'top' ? 'valign-top' : ''}">
          ${renderCardBody(spec, ctx, index)}
        </div>
      </div>`;
}

export function buildSlideHtml(o: {
  spec: SlideSpec;
  contextTitle: string;
  index: number;
  total: number;
  ctx: RenderCtx;
  footerHandle: string;
  isHook: boolean;
  isLast: boolean;
}): string {
  const { spec, contextTitle, index, total, ctx, footerHandle, isHook, isLast } = o;
  const slideNum = `${index + 1}/${total}`;
  const footerText = isLast
    ? `End of Topic • ${footerHandle}`
    : isHook
      ? 'Swipe to learn more'
      : `Follow ${footerHandle} for dev tips`;

  const body = isHook ? renderHookCard(spec) : renderContentCard(spec, ctx, index);

  const header =
    ctx.layout.showHeader && (ctx.layout.showLogo || contextTitle)
      ? `
    <div class="header">
      <div class="header-title">${escapeHtml(contextTitle.toUpperCase())}</div>
      ${ctx.layout.showLogo ? '<div class="logo"><span>I</span></div>' : ''}
    </div>`
      : '';

  const footer = ctx.layout.showFooter
    ? `
    <div class="footer">
      <div class="footer-left"><span class="fdot"></span><span>${escapeHtml(footerText)}</span></div>
      ${ctx.layout.showSlideNumber ? `<div class="badge">${slideNum}  STABLE</div>` : ''}
    </div>`
    : '';

  return `
  <div class="slide">
    ${header}
    ${body}
    ${footer}
  </div>`;
}
