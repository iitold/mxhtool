/**
 * Client-safe slide preview builder (no highlight.js). Mirrors the server
 * template so the admin UI can show a live preview of theme + layout.
 */
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';
import { escapeHtml, slideCss, wrapDocument } from './slideStyles';
import { parseSlide } from './blocks';
import { buildSlideHtml } from './blocksRender';

const plainHighlight = (code: string) => escapeHtml(code);

export function buildPreviewDocument(o: {
  slides: unknown[];
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
  const specs = slides.map(parseSlide);
  const total = specs.length;
  const body = specs
    .map((spec, i) =>
      buildSlideHtml({
        spec,
        contextTitle: title,
        index: i,
        total,
        ctx: { layout, highlight: plainHighlight },
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
