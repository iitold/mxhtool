/**
 * Slide block model — a slide is a titled list of typed blocks.
 * The AI emits this JSON shape; the renderer turns it into HTML.
 * Isomorphic: imported by the Playwright renderer, the admin preview and the
 * content generator / verifier.
 */
import { parseSlideText } from './slideParse';

export type BlockType =
  | 'text'
  | 'code'
  | 'diff'
  | 'compare'
  | 'steps'
  | 'table'
  | 'stat'
  | 'callout'
  | 'diagram';

export interface TextBlock {
  type: 'text';
  title?: string;
  bullets?: string[];
}
export interface CodeBlock {
  type: 'code';
  lang?: string;
  code: string;
}
/** `lines` are prefixed with '+', '-' or a space (unified-diff style). */
export interface DiffBlock {
  type: 'diff';
  lang?: string;
  lines: string[];
}
export interface CompareBlock {
  type: 'compare';
  beforeTitle?: string;
  afterTitle?: string;
  before: string[];
  after: string[];
}
export interface StepsBlock {
  type: 'steps';
  direction?: 'row' | 'column';
  items: { label: string; detail?: string }[];
}
export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}
export interface StatBlock {
  type: 'stat';
  items: { value: string; label: string }[];
}
export interface CalloutBlock {
  type: 'callout';
  variant?: 'tip' | 'warn' | 'info';
  title?: string;
  text: string;
}
export interface DiagramBlock {
  type: 'diagram';
  variant: 'join' | 'venn' | 'bars';
  title?: string;
  caption?: string;
  /** join + venn */
  leftLabel?: string;
  rightLabel?: string;
  leftItems?: string[];
  rightItems?: string[];
  overlap?: string[];
  /** bars */
  bars?: { label: string; value: number; max?: number }[];
}
export type SlideBlock =
  | TextBlock
  | CodeBlock
  | DiffBlock
  | CompareBlock
  | StepsBlock
  | TableBlock
  | StatBlock
  | CalloutBlock
  | DiagramBlock;

export interface SlideSpec {
  title?: string;
  /** Optional visual key so a slide can opt into a stronger layout. */
  variant?: 'default' | 'hero';
  blocks: SlideBlock[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : [];

function toBlock(raw: any): SlideBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  switch (raw.type) {
    case 'text': {
      const bullets = strArr(raw.bullets);
      const title = str(raw.title);
      return bullets.length || title ? { type: 'text', title: title || undefined, bullets } : null;
    }
    case 'code':
      return str(raw.code) ? { type: 'code', lang: str(raw.lang) || 'text', code: String(raw.code).replace(/\s+$/, '') } : null;
    case 'diff':
      return strArr(raw.lines).length ? { type: 'diff', lang: str(raw.lang) || 'diff', lines: strArr(raw.lines) } : null;
    case 'compare': {
      const before = strArr(raw.before);
      const after = strArr(raw.after);
      if (!before.length && !after.length) return null;
      return { type: 'compare', beforeTitle: str(raw.beforeTitle) || undefined, afterTitle: str(raw.afterTitle) || undefined, before, after };
    }
    case 'steps':
      return Array.isArray(raw.items) && raw.items.length
        ? { type: 'steps', direction: raw.direction === 'row' ? 'row' : 'column', items: raw.items.map((it: any) => ({ label: str(it?.label ?? it), detail: str(it?.detail) || undefined })).filter((it: any) => it.label) }
        : null;
    case 'table': {
      const headers = strArr(raw.headers);
      const rows = Array.isArray(raw.rows) ? raw.rows.map(strArr).filter((r: string[]) => r.length) : [];
      return headers.length || rows.length ? { type: 'table', headers, rows } : null;
    }
    case 'stat':
      return Array.isArray(raw.items) && raw.items.length
        ? { type: 'stat', items: raw.items.map((it: any) => ({ value: str(it?.value), label: str(it?.label) })).filter((it: any) => it.value || it.label) }
        : null;
    case 'callout': {
      const text = str(raw.text);
      if (!text) return null;
      const variant = ['tip', 'warn', 'info'].includes(raw.variant) ? raw.variant : 'info';
      return { type: 'callout', variant, title: str(raw.title) || undefined, text };
    }
    case 'diagram': {
      const variant = ['join', 'venn', 'bars'].includes(raw.variant) ? raw.variant : 'venn';
      return {
        type: 'diagram',
        variant,
        title: str(raw.title) || undefined,
        caption: str(raw.caption) || undefined,
        leftLabel: str(raw.leftLabel) || undefined,
        rightLabel: str(raw.rightLabel) || undefined,
        leftItems: strArr(raw.leftItems),
        rightItems: strArr(raw.rightItems),
        overlap: strArr(raw.overlap),
        bars: Array.isArray(raw.bars)
          ? raw.bars
              .map((b: any) => ({ label: str(b?.label), value: Number(b?.value) || 0, max: b?.max ? Number(b.max) : undefined }))
              .filter((b: any) => b.label)
          : []
      };
    }
    default:
      return null;
  }
}

/** Turns a raw slide (legacy string OR new block object) into a SlideSpec. */
export function parseSlide(raw: unknown): SlideSpec {
  if (typeof raw === 'string') return fromLegacyString(raw);
  if (!raw || typeof raw !== 'object') return { blocks: [] };
  const obj = raw as any;
  const blocks = Array.isArray(obj.blocks)
    ? (obj.blocks.map(toBlock).filter(Boolean) as SlideBlock[])
    : [];
  return {
    title: str(obj.title) || undefined,
    variant: obj.variant === 'hero' ? 'hero' : undefined,
    blocks
  };
}

/** Backward compatibility: old slides are plain text with bullets + a code fence. */
function fromLegacyString(text: string): SlideSpec {
  const parsed = parseSlideText(text);
  const blocks: SlideBlock[] = [];
  if (parsed.code) blocks.push({ type: 'code', lang: parsed.lang || 'text', code: parsed.code });
  if (parsed.bullets.length) blocks.push({ type: 'text', bullets: parsed.bullets });
  else if (!parsed.code && parsed.title) blocks.push({ type: 'text', bullets: [parsed.title] });
  return { title: parsed.title || undefined, blocks };
}

export function hasCodeBlock(spec: SlideSpec): boolean {
  return spec.blocks.some((b) => b.type === 'code' || b.type === 'diff');
}

/** Flattens a slide to plain text (used for scoring, verification, logs). */
export function slideToText(spec: SlideSpec): string {
  const lines: string[] = [];
  if (spec.title) lines.push(spec.title);
  for (const b of spec.blocks) {
    switch (b.type) {
      case 'text':
        if (b.title) lines.push(b.title);
        for (const x of b.bullets ?? []) lines.push('• ' + x);
        break;
      case 'code':
        lines.push('```' + (b.lang ?? 'text'));
        lines.push(b.code);
        lines.push('```');
        break;
      case 'diff':
        lines.push('```diff');
        lines.push(...b.lines);
        lines.push('```');
        break;
      case 'compare':
        lines.push(`[TRƯỚC] ${b.beforeTitle ?? ''}`.trim(), ...b.before.map((x) => '  - ' + x));
        lines.push(`[SAU] ${b.afterTitle ?? ''}`.trim(), ...b.after.map((x) => '  + ' + x));
        break;
      case 'steps':
        b.items.forEach((it, i) => lines.push(`${i + 1}. ${it.label}${it.detail ? ' — ' + it.detail : ''}`));
        break;
      case 'table':
        if (b.headers.length) lines.push('| ' + b.headers.join(' | ') + ' |');
        for (const r of b.rows) lines.push('| ' + r.join(' | ') + ' |');
        break;
      case 'stat':
        lines.push(b.items.map((it) => `${it.value} ${it.label}`).join(' | '));
        break;
      case 'callout':
        lines.push(`[${(b.variant ?? 'info').toUpperCase()}] ${b.title ?? ''} ${b.text}`.trim());
        break;
      case 'diagram':
        lines.push(`[DIAGRAM ${b.variant}] ${b.title ?? ''}`.trim());
        if (b.leftItems?.length) lines.push(`${b.leftLabel ?? 'A'}: ${b.leftItems.join(', ')}`);
        if (b.rightItems?.length) lines.push(`${b.rightLabel ?? 'B'}: ${b.rightItems.join(', ')}`);
        if (b.overlap?.length) lines.push(`chung: ${b.overlap.join(', ')}`);
        for (const bar of b.bars ?? []) lines.push(`${bar.label}: ${bar.value}`);
        break;
    }
  }
  return lines.join('\n').trim();
}

export function slidesToText(slides: unknown[]): string[] {
  return slides.map((s) => slideToText(parseSlide(s)));
}

/** Extracts code/diff lines for the optional syntax verifier. */
export function codeBlocks(spec: SlideSpec): { lang: string; code: string }[] {
  const out: { lang: string; code: string }[] = [];
  for (const b of spec.blocks) {
    if (b.type === 'code') out.push({ lang: b.lang ?? 'text', code: b.code });
    else if (b.type === 'diff')
      out.push({ lang: b.lang ?? 'diff', code: b.lines.map((l) => l.replace(/^[+-]/, '')).join('\n') });
  }
  return out;
}
