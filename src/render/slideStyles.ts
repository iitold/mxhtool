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
  const cardFitCss =
    layout.cardFit === 'hug'
      ? `
  .card { flex: 0 1 auto; max-height: 100%; margin-top: auto; margin-bottom: auto; overflow: hidden; }
  .content-card .body { justify-content: flex-start; }
  .codecard { max-height: 100%; }`
      : '';
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
    border-radius: calc(${scale} * 28px); padding: calc(${scale} * 46px);
    display: flex; flex-direction: column; min-height: 0;
  }
  .label {
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: calc(${scale} * 24px); letter-spacing: 1px; text-transform: uppercase;
    margin-bottom: calc(${scale} * 22px);
  }
  .hook-card { justify-content: center; }
  .hook-text {
    color: var(--title); font-weight: 800; text-align: center;
    font-size: calc(${scale} * 62px); line-height: 1.25;
  }
  .content-card .body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: calc(${scale} * 34px); min-height: 0; }
  .content-card .body.valign-top { justify-content: flex-start; }
  .bullets { display: flex; flex-direction: column; gap: calc(${scale} * 18px); }
  .content-card.has-code .bullets { gap: calc(${scale} * 10px); }
  .bullet { display: flex; gap: calc(${scale} * 14px); font-size: calc(${scale} * 40px); line-height: 1.4; color: var(--body); }
  .content-card.has-code .bullet { font-size: calc(${scale} * 34px); }
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
    font-size: calc(${scale} * 29px); line-height: 1.5; color: var(--code-text);
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
  }

  /* ── block: text ── */
  .blk-text { display: flex; flex-direction: column; gap: calc(${scale} * 16px); flex: 1 1 auto; justify-content: center; }
  .blk-title { font-weight: 800; font-size: calc(${scale} * 46px); line-height: 1.2; color: var(--title); }

  /* ── block: diff ── */
  .diff { display: flex; flex-direction: column; }
  .dl { display: flex; gap: calc(${scale} * 12px); white-space: pre-wrap; word-break: break-word; }
  .dl-sign { flex: none; width: calc(${scale} * 22px); opacity: 0.8; }
  .dl.add { color: ${theme.str}; background: rgba(52, 211, 153, 0.10); }
  .dl.del { color: #fb7185; background: rgba(251, 113, 133, 0.10); }
  .dl.ctx { color: var(--code-text); }

  /* ── block: compare (before / after) ── */
  .compare { display: grid; grid-template-columns: 1fr 1fr; gap: calc(${scale} * 24px); }
  .compare-col {
    border: calc(${scale} * 2px) solid var(--card-border); border-radius: calc(${scale} * 18px);
    padding: calc(${scale} * 24px) calc(${scale} * 26px); background: var(--code-bg);
    display: flex; flex-direction: column; gap: calc(${scale} * 14px);
  }
  .compare-col.before { border-color: rgba(251, 113, 133, 0.45); }
  .compare-col.after { border-color: rgba(52, 211, 153, 0.45); }
  .compare-head {
    font-family: 'JetBrains Mono', monospace; font-weight: 700; letter-spacing: 1px;
    font-size: calc(${scale} * 24px); text-transform: uppercase;
  }
  .compare-col.before .compare-head { color: #fb7185; }
  .compare-col.after .compare-head { color: ${theme.str}; }
  .compare-col ul { list-style: none; display: flex; flex-direction: column; gap: calc(${scale} * 14px); }
  .compare-col li { font-size: calc(${scale} * 31px); line-height: 1.35; color: var(--body); display: flex; gap: calc(${scale} * 10px); }
  .compare-col li::before { content: '•'; color: var(--muted); flex: none; }

  /* ── block: steps / flow ── */
  .steps { display: flex; gap: calc(${scale} * 16px); }
  .steps.column { flex-direction: column; }
  .steps.row { flex-direction: row; align-items: stretch; flex-wrap: wrap; justify-content: center; }
  .step {
    display: flex; gap: calc(${scale} * 16px); align-items: flex-start;
    background: var(--code-bg); border: calc(${scale} * 1px) solid var(--card-border);
    border-radius: calc(${scale} * 16px); padding: calc(${scale} * 18px) calc(${scale} * 22px);
    flex: 1 1 auto; min-width: 0;
  }
  .steps.column .step { flex: 0 1 auto; }
  .step-num {
    flex: none; width: calc(${scale} * 44px); height: calc(${scale} * 44px); border-radius: 50%;
    background: var(--accent2); color: #fff; font-weight: 800; font-size: calc(${scale} * 24px);
    display: flex; align-items: center; justify-content: center;
  }
  .step-body { display: flex; flex-direction: column; gap: calc(${scale} * 4px); min-width: 0; }
  .step-label { font-weight: 700; font-size: calc(${scale} * 34px); color: var(--title); line-height: 1.25; }
  .step-detail { font-size: calc(${scale} * 28px); color: var(--muted); line-height: 1.35; }
  .step-arrow { align-self: center; color: var(--accent2); font-size: calc(${scale} * 40px); font-weight: 800; flex: none; }

  /* ── block: table ── */
  .table-wrap { width: 100%; overflow: hidden; border-radius: calc(${scale} * 16px); border: calc(${scale} * 2px) solid var(--card-border); }
  .tbl { width: 100%; border-collapse: collapse; font-size: calc(${scale} * 31px); }
  .tbl th, .tbl td { text-align: left; padding: calc(${scale} * 16px) calc(${scale} * 22px); border-bottom: calc(${scale} * 1px) solid var(--card-border); }
  .tbl th { background: var(--code-bg); color: var(--accent1); font-weight: 800; text-transform: uppercase; font-size: calc(${scale} * 24px); letter-spacing: 0.5px; }
  .tbl td { color: var(--body); }
  .tbl tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }
  .tbl tbody tr:last-child td { border-bottom: none; }

  /* ── block: stat ── */
  .stats { display: flex; gap: calc(${scale} * 22px); flex-wrap: wrap; justify-content: center; }
  .stat {
    flex: 1 1 0; min-width: calc(${scale} * 220px); text-align: center;
    background: var(--code-bg); border: calc(${scale} * 2px) solid var(--card-border);
    border-radius: calc(${scale} * 18px); padding: calc(${scale} * 26px) calc(${scale} * 18px);
  }
  .stat-value { font-weight: 800; font-size: calc(${scale} * 76px); line-height: 1.05; color: var(--accent2); }
  .stat-label { margin-top: calc(${scale} * 8px); font-size: calc(${scale} * 28px); color: var(--muted); }

  /* ── block: callout ── */
  .callout {
    border-radius: calc(${scale} * 16px); padding: calc(${scale} * 22px) calc(${scale} * 26px);
    border-left: calc(${scale} * 8px) solid var(--accent2); background: rgba(255, 255, 255, 0.04);
    display: flex; flex-direction: column; gap: calc(${scale} * 8px);
  }
  .callout.tip { border-left-color: ${theme.str}; }
  .callout.warn { border-left-color: #fbbf24; }
  .callout.info { border-left-color: var(--accent2); }
  .callout-title { font-weight: 800; font-size: calc(${scale} * 28px); color: var(--title); text-transform: uppercase; letter-spacing: 0.5px; }
  .callout.tip .callout-title { color: ${theme.str}; }
  .callout.warn .callout-title { color: #fbbf24; }
  .callout-text { font-size: calc(${scale} * 34px); line-height: 1.4; color: var(--body); }

  /* ── block: diagram ── */
  .diagram { display: flex; flex-direction: column; gap: calc(${scale} * 20px); align-items: center; width: 100%; }
  .diagram-title { font-weight: 800; font-size: calc(${scale} * 32px); color: var(--title); text-align: center; }
  .diagram-caption { font-size: calc(${scale} * 24px); color: var(--muted); text-align: center; }
  .venn-circles { position: relative; width: calc(${scale} * 720px); height: calc(${scale} * 380px); }
  .venn-circle {
    position: absolute; top: 0; width: calc(${scale} * 460px); height: calc(${scale} * 380px);
    border-radius: 50%; display: flex; align-items: flex-start; justify-content: center;
    padding-top: calc(${scale} * 40px); font-weight: 800; font-size: calc(${scale} * 30px);
  }
  .venn-circle.left { left: 0; background: rgba(56, 189, 248, 0.22); border: calc(${scale} * 3px) solid var(--accent2); color: var(--accent2); }
  .venn-circle.right { right: 0; background: rgba(52, 211, 153, 0.22); border: calc(${scale} * 3px) solid ${theme.str}; color: ${theme.str}; justify-content: center; }
  .venn-overlap {
    position: absolute; left: 50%; bottom: calc(${scale} * 30px); transform: translateX(-50%);
    font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: calc(${scale} * 26px);
    color: var(--title); text-align: center; max-width: calc(${scale} * 340px);
  }
  .join-grid { display: flex; align-items: center; gap: calc(${scale} * 18px); width: 100%; }
  .join-box { flex: 1 1 0; min-width: 0; border: calc(${scale} * 2px) solid var(--accent2); border-radius: calc(${scale} * 16px); overflow: hidden; }
  .join-box .join-head { background: rgba(56, 189, 248, 0.15); color: var(--accent2); font-weight: 800; font-size: calc(${scale} * 26px); padding: calc(${scale} * 12px) calc(${scale} * 18px); text-transform: uppercase; letter-spacing: 0.5px; }
  .join-box ul { list-style: none; padding: calc(${scale} * 12px) calc(${scale} * 18px); display: flex; flex-direction: column; gap: calc(${scale} * 8px); }
  .join-box li { font-family: 'JetBrains Mono', monospace; font-size: calc(${scale} * 24px); color: var(--body); }
  .join-op { flex: none; font-size: calc(${scale} * 56px); color: var(--accent2); }
  .join-result {
    width: 100%; display: flex; align-items: center; gap: calc(${scale} * 16px);
    border: calc(${scale} * 2px) dashed rgba(52, 211, 153, 0.6); border-radius: calc(${scale} * 16px);
    padding: calc(${scale} * 16px) calc(${scale} * 20px);
  }
  .join-result-tag { flex: none; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: calc(${scale} * 22px); color: ${theme.str}; }
  .join-result span:last-child { font-size: calc(${scale} * 26px); color: var(--body); }
  .bars-list { width: 100%; display: flex; flex-direction: column; gap: calc(${scale} * 16px); }
  .bar-row { display: flex; align-items: center; gap: calc(${scale} * 16px); }
  .bar-label { flex: none; width: calc(${scale} * 280px); font-size: calc(${scale} * 26px); color: var(--body); text-align: right; }
  .bar-track { flex: 1; height: calc(${scale} * 40px); background: var(--code-bg); border-radius: calc(${scale} * 999px); overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent1)); border-radius: calc(${scale} * 999px); }
  .bar-value { flex: none; width: calc(${scale} * 110px); font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: calc(${scale} * 26px); color: var(--accent2); }

  /* ── block: raw html ── */
  .raw { width: 100%; font-size: calc(${scale} * 32px); line-height: 1.4; color: var(--body); }
  .raw img { max-width: 100%; border-radius: calc(${scale} * 16px); }
  .raw h1, .raw h2, .raw h3 { color: var(--title); line-height: 1.2; margin-bottom: calc(${scale} * 12px); }
  .raw h1 { font-size: calc(${scale} * 52px); }
  .raw h2 { font-size: calc(${scale} * 44px); }
  .raw h3 { font-size: calc(${scale} * 38px); }
  .raw p { margin-bottom: calc(${scale} * 12px); }
  .raw ul, .raw ol { padding-left: calc(${scale} * 40px); margin-bottom: calc(${scale} * 12px); }
  .raw code, .raw pre { font-family: 'JetBrains Mono', monospace; }
  .raw pre { background: var(--code-bg); color: var(--code-text); border-radius: calc(${scale} * 14px); padding: calc(${scale} * 20px); white-space: pre-wrap; font-size: calc(${scale} * 27px); }
  .raw a { color: var(--accent2); }
  .raw strong, .raw b { color: var(--title); }

  /* ── block: image ── */
  .img-block { display: flex; flex-direction: column; align-items: center; gap: calc(${scale} * 16px); flex: 1 1 auto; min-height: 0; width: 100%; }
  .img { width: 100%; flex: 1 1 auto; min-height: 0; object-fit: cover; border-radius: calc(${scale} * 20px); border: calc(${scale} * 2px) solid var(--card-border); }
  .img.contain { object-fit: contain; background: var(--code-bg); }
  .img-caption { font-size: calc(${scale} * 26px); color: var(--muted); text-align: center; }

  /* ── block: timeline ── */
  .timeline { display: flex; flex-direction: column; width: 100%; }
  .tl-item { display: flex; gap: calc(${scale} * 20px); }
  .tl-rail { position: relative; flex: none; width: calc(${scale} * 34px); display: flex; justify-content: center; }
  .tl-rail::before { content: ''; position: absolute; top: 0; bottom: 0; width: calc(${scale} * 4px); background: var(--card-border); }
  .tl-item:first-child .tl-rail::before { top: calc(${scale} * 16px); }
  .tl-item:last-child .tl-rail::before { bottom: calc(100% - ${scale} * 16px); }
  .tl-dot { position: relative; z-index: 1; margin-top: calc(${scale} * 8px); width: calc(${scale} * 30px); height: calc(${scale} * 30px); border-radius: 50%; background: var(--accent2); border: calc(${scale} * 6px) solid var(--card); }
  .tl-body { flex: 1; padding-bottom: calc(${scale} * 30px); }
  .tl-when { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: calc(${scale} * 24px); color: var(--accent2); letter-spacing: 0.5px; }
  .tl-label { font-size: calc(${scale} * 34px); font-weight: 700; color: var(--title); line-height: 1.25; }
  .tl-detail { font-size: calc(${scale} * 28px); color: var(--muted); line-height: 1.35; }

  /* ── block: code-compare (2 cột code) ── */
  .code-compare { display: grid; grid-template-columns: 1fr 1fr; gap: calc(${scale} * 20px); width: 100%; min-height: 0; }
  .codecol {
    display: flex; flex-direction: column; min-height: 0; min-width: 0;
    background: var(--code-bg); border: calc(${scale} * 1px) solid var(--card-border);
    border-radius: calc(${scale} * 16px); padding: calc(${scale} * 18px) calc(${scale} * 20px);
  }
  .codecol-head {
    font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: calc(${scale} * 24px);
    color: var(--accent2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: calc(${scale} * 12px);
  }
  .codecol .code { font-size: calc(${scale} * 24px); white-space: pre-wrap; word-break: break-word; }${cardFitCss}`;
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
