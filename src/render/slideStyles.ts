/**
 * Shared slide CSS + document shell. Isomorphic (no Node APIs, no hljs) so it
 * can be used by the Playwright renderer and by the admin live-preview iframe.
 */
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FONT_STACK = "'Inter', 'Be Vietnam Pro', 'Roboto', 'Lato', 'Montserrat', system-ui, sans-serif";

export function slideCss(theme: Theme, layout: LayoutOptions, width: number, height: number): string {
  const scale = width / 1080;
  const font = layout.fontFamily === 'System' ? FONT_STACK : `'${layout.fontFamily}', ${FONT_STACK}`;
  return `
  :root {
    --w: ${width}px;
    --h: ${height}px;
    --bg: ${theme.bg};
    --card: ${theme.card};
    --card-border: ${theme.cardBorder};
    --accent1: ${theme.accent1};
    --accent2: ${theme.accent2};
    --accent3: ${theme.accent3};
    --title: ${theme.title};
    --body: ${theme.body};
    --muted: ${theme.muted};
    --code-bg: ${theme.codeBg};
    --code-text: ${theme.codeText};
    --font: ${font};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  .slide {
    position: relative;
    width: var(--w); height: var(--h);
    background: var(--bg);
    font-family: var(--font);
    color: var(--body);
    padding: calc(var(--h) * 0.06) calc(var(--w) * 0.06) calc(var(--h) * 0.08);
    display: flex; flex-direction: column; gap: calc(${scale} * 22px);
  }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: calc(${scale} * 20px); }
  .header-title {
    flex: 1; color: var(--accent1); font-weight: 800; letter-spacing: 0.5px;
    font-size: calc(${scale} * 34px); line-height: 1.15; text-transform: uppercase;
    max-height: calc(${scale} * 90px); overflow: hidden;
  }
  .logo {
    flex: none; width: calc(${scale} * 120px); height: calc(${scale} * 120px);
    border-radius: 50%; background: #fff; border: calc(${scale} * 6px) solid var(--accent2);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent2); font-weight: 800; font-size: calc(${scale} * 60px);
  }
  .card {
    flex: 1; background: var(--card); border: calc(${scale} * 3px) solid var(--card-border);
    border-radius: calc(${scale} * 28px); padding: calc(${scale} * 52px);
    display: flex; flex-direction: column; min-height: 0;
  }
  .label {
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: calc(${scale} * 24px); letter-spacing: 1px; text-transform: uppercase;
    margin-bottom: calc(${scale} * 26px);
  }
  .hook-card { justify-content: center; }
  .hook-text {
    color: var(--title); font-weight: 800; text-align: center;
    font-size: calc(${scale} * 62px); line-height: 1.25;
  }
  .content-card .body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: calc(${scale} * 30px); min-height: 0; }
  .content-card .body.valign-top { justify-content: flex-start; }
  .bullets { display: flex; flex-direction: column; gap: calc(${scale} * 18px); }
  .content-card.has-code .bullets { gap: calc(${scale} * 10px); }
  .bullet { display: flex; gap: calc(${scale} * 14px); font-size: calc(${scale} * 36px); line-height: 1.4; color: var(--body); }
  .content-card.has-code .bullet { font-size: calc(${scale} * 32px); }
  .bullet .dot { color: var(--accent2); font-weight: 800; flex: none; }
  .bullet .dot.arrow { font-weight: 700; }
  .codecard {
    flex: 0 1 auto; max-height: 64%;
    display: flex; flex-direction: column; min-height: 0;
    border: calc(${scale} * 1px) solid var(--card-border);
    border-radius: calc(${scale} * 18px); background: var(--code-bg);
    padding: calc(${scale} * 24px) calc(${scale} * 28px);
  }
  .code-label {
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: calc(${scale} * 22px); margin-bottom: calc(${scale} * 14px);
  }
  .code {
    flex: 1; overflow: hidden; font-family: 'JetBrains Mono', monospace;
    font-size: calc(${scale} * 27px); line-height: 1.5; color: var(--code-text);
    white-space: pre; tab-size: 2;
  }
  .hljs-keyword, .hljs-built_in, .hljs-literal, .hljs-type { color: ${theme.kw}; }
  .hljs-string, .hljs-attr { color: ${theme.str}; }
  .hljs-comment, .hljs-quote { color: ${theme.cmt}; font-style: italic; }
  .hljs-number { color: ${theme.num}; }
  .hljs-title, .hljs-title.function_, .hljs-function .hljs-title { color: ${theme.fn}; }
  .hljs-variable, .hljs-name, .hljs-selector-tag { color: var(--code-text); }
  .footer { display: flex; align-items: center; justify-content: space-between; gap: calc(${scale} * 16px); }
  .footer-left { display: flex; align-items: center; gap: calc(${scale} * 16px);
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: calc(${scale} * 24px); color: var(--muted); }
  .fdot { width: calc(${scale} * 26px); height: calc(${scale} * 26px); border-radius: 50%; background: var(--accent2); }
  .badge {
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: calc(${scale} * 24px); color: #fff; background: var(--accent3);
    padding: calc(${scale} * 8px) calc(${scale} * 22px); border-radius: calc(${scale} * 999px);
  }`;
}

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;600;700;800&family=Roboto:wght@400;700;900&family=Lato:wght@400;700;900&family=Montserrat:wght@400;700;800&family=JetBrains+Mono:wght@400;600&display=swap';

export function wrapDocument(css: string, body: string): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_LINK}" rel="stylesheet">
<style>${css}
</style>
</head>
<body>
${body}
</body>
</html>`;
}
