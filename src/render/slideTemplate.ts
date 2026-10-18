/**
 * Builds an HTML document with one `.slide` element per slide.
 * Rendered to PNG by Playwright. Syntax highlighting via highlight.js.
 */
import hljs from 'highlight.js';
import type { Theme } from './theme';

export interface ParsedSlide {
  title: string;
  bullets: string[];
  code: string | null;
  lang: string;
}

export function parseSlideText(text: string): ParsedSlide {
  const result: ParsedSlide = { title: '', bullets: [], code: null, lang: '' };
  if (!text) return result;

  const codeMatch = text.match(/```(\w*)\n?([\s\S]*?)```/);
  let clean = text;
  if (codeMatch) {
    result.lang = codeMatch[1] || 'text';
    result.code = codeMatch[2].replace(/\s+$/, '');
    clean = text.replace(/```[\s\S]*?```/, '').trim();
  }

  let lines = clean
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 0 && !/^[•\-*]/.test(lines[0])) {
    result.title = lines[0];
    lines = lines.slice(1);
  }
  for (const line of lines) {
    const b = line.replace(/^[•\-*]\s*/, '').trim();
    if (b) result.bullets.push(b);
  }
  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
  footerHandle: string;
  width: number;
  height: number;
}

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

function label(index: number): string {
  return index < 10 ? '0' + index : '' + index;
}

function renderHook(slide: ParsedSlide, theme: Theme): string {
  return `
    <div class="card hook-card">
      <div class="label" style="color:${theme.accent2}">00 // OVERVIEW</div>
      <div class="hook-text">${escapeHtml(slide.title || slide.bullets.join(' '))}</div>
    </div>`;
}

function renderContent(slide: ParsedSlide, index: number, theme: Theme): string {
  const labelText = `${label(index)} // ${escapeHtml((slide.title || 'CONTENT').toUpperCase()).slice(0, 48)}`;
  const bullets = slide.bullets
    .map((b) => `<div class="bullet"><span class="dot">•</span><span>${escapeHtml(b)}</span></div>`)
    .join('');

  const code = slide.code
    ? `<div class="codecard">
         <div class="code-label" style="color:${theme.accent2}">${label(index)}.code // ${escapeHtml(
           (slide.lang || 'snippet').toUpperCase()
         )}</div>
         <pre class="code"><code class="hljs">${highlight(slide.code, slide.lang)}</code></pre>
       </div>`
    : '';

  return `
    <div class="card content-card ${code ? 'has-code' : ''}">
      <div class="label" style="color:${theme.accent2}">${labelText}</div>
      <div class="body">
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
  footerHandle: string;
  isHook: boolean;
  isLast: boolean;
}): string {
  const { rawText, contextTitle, index, total, theme, footerHandle, isHook, isLast } = o;
  const parsed = parseSlideText(rawText);
  const slideNum = `${index + 1}/${total}`;
  const footerText = isLast
    ? `End of Topic • ${footerHandle}`
    : isHook
      ? 'Swipe to learn more  →'
      : `Follow ${footerHandle} for dev tips`;

  const body = isHook ? renderHook(parsed, theme) : renderContent(parsed, index, theme);

  return `
  <div class="slide">
    <div class="header">
      <div class="header-title">${escapeHtml(contextTitle.toUpperCase())}</div>
      <div class="logo"><span>I</span></div>
    </div>
    ${body}
    <div class="footer">
      <div class="footer-left"><span class="fdot"></span><span>${escapeHtml(footerText)}</span></div>
      <div class="badge">${slideNum}  STABLE</div>
    </div>
  </div>`;
}

export function buildDocument(o: SlideDocOptions): string {
  const { slides, title, theme, footerHandle, width, height } = o;
  const total = slides.length;
  const scale = width / 1080;
  const body = slides
    .map((s, i) =>
      buildSlideHtml({
        rawText: s,
        contextTitle: title,
        index: i,
        total,
        theme,
        footerHandle,
        isHook: i === 0,
        isLast: i === total - 1
      })
    )
    .join('\n');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
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
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  .slide {
    position: relative;
    width: var(--w); height: var(--h);
    background: var(--bg);
    font-family: 'Inter', system-ui, sans-serif;
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
  .bullets { display: flex; flex-direction: column; gap: calc(${scale} * 18px); }
  .content-card.has-code .bullets { gap: calc(${scale} * 10px); }
  .bullet { display: flex; gap: calc(${scale} * 14px); font-size: calc(${scale} * 36px); line-height: 1.4; color: var(--body); }
  .content-card.has-code .bullet { font-size: calc(${scale} * 32px); }
  .bullet .dot { color: var(--accent2); font-weight: 800; }
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
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export { pad2 };
