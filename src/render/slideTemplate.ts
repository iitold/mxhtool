/**
 * Builds an HTML document with one `.slide` element per slide.
 * Rendered by Playwright (server) and previewed in the admin (client).
 * Syntax highlighting via highlight.js.
 */
import hljs from 'highlight.js';
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';
import { escapeHtml, slideCss, wrapDocument } from './slideStyles';
import { parseSlide, type SlideSpec } from './blocks';
import { buildSlideHtml, type HighlightFn } from './blocksRender';

export { parseSlide };
export type { SlideSpec };

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

export const highlightCode: HighlightFn = (code, lang) => {
  const mapped = (LANG_ALIAS[lang.toLowerCase()] ?? lang.toLowerCase()) || 'text';
  try {
    if (hljs.getLanguage(mapped)) return hljs.highlight(code, { language: mapped }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
};

export interface SlideDocOptions {
  slides: unknown[];
  title: string;
  theme: Theme;
  layout: LayoutOptions;
  footerHandle: string;
  width: number;
  height: number;
}

export function buildDocument(o: SlideDocOptions): string {
  const { slides, title, theme, layout, footerHandle, width, height } = o;
  const specs = slides.map(parseSlide);
  const total = specs.length;
  const body = specs
    .map((spec, i) =>
      buildSlideHtml({
        spec,
        contextTitle: title,
        index: i,
        total,
        ctx: { layout, highlight: highlightCode },
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
