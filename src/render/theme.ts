/**
 * Slide color themes for the HTML renderer.
 * Presets + a "custom" theme whose colors come from config keys.
 */
export interface Theme {
  name: string;
  bg: string;
  card: string;
  cardBorder: string;
  accent1: string;
  accent2: string;
  accent3: string;
  title: string;
  body: string;
  muted: string;
  codeBg: string;
  codeText: string;
  // syntax highlight
  kw: string;
  str: string;
  cmt: string;
  num: string;
  fn: string;
}

const darkSyntax = { kw: '#ff7b72', str: '#a5d6ff', cmt: '#8b949e', num: '#79c0ff', fn: '#d2a8ff' };
const lightSyntax = { kw: '#d73a49', str: '#032f62', cmt: '#6a737d', num: '#005cc5', fn: '#6f42c1' };

export const THEMES: Record<string, Theme> = {
  dark_slate: {
    name: 'Dark Slate',
    bg: '#0b1220',
    card: '#111a2e',
    cardBorder: '#22304d',
    accent1: '#60a5fa',
    accent2: '#fb923c',
    accent3: '#34d399',
    title: '#f1f5f9',
    body: '#cbd5e1',
    muted: '#94a3b8',
    codeBg: '#0a0f1c',
    codeText: '#e2e8f0',
    ...darkSyntax
  },
  light_blue: {
    name: 'Light Blue',
    bg: '#f0f4f8',
    card: '#ffffff',
    cardBorder: '#cbd5e1',
    accent1: '#1a73e8',
    accent2: '#ea580c',
    accent3: '#188038',
    title: '#0f172a',
    body: '#334155',
    muted: '#64748b',
    codeBg: '#f8fafc',
    codeText: '#24292e',
    ...lightSyntax
  },
  neon: {
    name: 'Neon Purple',
    bg: '#0c0a1a',
    card: '#1a1530',
    cardBorder: '#2e2655',
    accent1: '#a78bfa',
    accent2: '#f472b6',
    accent3: '#34d399',
    title: '#f5f3ff',
    body: '#c4b5fd',
    muted: '#8b5cf6',
    codeBg: '#1e1840',
    codeText: '#e9d5ff',
    kw: '#ff6bcb',
    str: '#7dd3fc',
    cmt: '#6b5b95',
    num: '#67e8f9',
    fn: '#c084fc'
  },
  sunset: {
    name: 'Sunset Vibes',
    bg: '#fef3c7',
    card: '#ffffff',
    cardBorder: '#fbbf24',
    accent1: '#f59e0b',
    accent2: '#ef4444',
    accent3: '#10b981',
    title: '#78350f',
    body: '#92400e',
    muted: '#b45309',
    codeBg: '#fffbeb',
    codeText: '#78350f',
    kw: '#dc2626',
    str: '#b45309',
    cmt: '#d97706',
    num: '#059669',
    fn: '#7c2d12'
  },
  ocean: {
    name: 'Ocean Deep',
    bg: '#0c4a6e',
    card: '#075985',
    cardBorder: '#0369a1',
    accent1: '#38bdf8',
    accent2: '#fbbf24',
    accent3: '#4ade80',
    title: '#f0f9ff',
    body: '#bae6fd',
    muted: '#7dd3fc',
    codeBg: '#0c4a6e',
    codeText: '#e0f2fe',
    kw: '#fbbf24',
    str: '#67e8f9',
    cmt: '#0ea5e9',
    num: '#4ade80',
    fn: '#a78bfa'
  }
};

export const THEME_KEYS = [...Object.keys(THEMES), 'custom'] as const;

/** Relative luminance (0 = dark, 1 = light) of a #rrggbb color. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getTheme(key: string): Theme {
  return THEMES[key] ?? THEMES.dark_slate;
}

/**
 * Resolve a theme key into concrete colors. When `custom`, individual
 * `custom_color_*` values from config override the base palette.
 */
export function resolveTheme(themeKey: string, cfg: Record<string, string> = {}): Theme {
  if (themeKey !== 'custom') return getTheme(themeKey);

  const base = THEMES.dark_slate;
  const pick = (k: string, fallback: string) => {
    const v = (cfg[k] ?? '').trim();
    return /^#?[0-9a-f]{6}$/i.test(v) ? (v.startsWith('#') ? v : '#' + v) : fallback;
  };

  const bg = pick('custom_color_bg', base.bg);
  const syntax = luminance(bg) > 0.5 ? lightSyntax : darkSyntax;

  return {
    name: 'Custom',
    bg,
    card: pick('custom_color_card', base.card),
    cardBorder: pick('custom_color_card_border', base.cardBorder),
    accent1: pick('custom_color_accent1', base.accent1),
    accent2: pick('custom_color_accent2', base.accent2),
    accent3: pick('custom_color_accent3', base.accent3),
    title: pick('custom_color_title', base.title),
    body: pick('custom_color_body', base.body),
    muted: pick('custom_color_muted', base.muted),
    codeBg: pick('custom_color_code_bg', base.codeBg),
    codeText: pick('custom_color_code_text', base.codeText),
    ...syntax
  };
}

/** Editable custom color fields, shared by the UI. */
export const CUSTOM_COLOR_FIELDS: { key: string; label: string; default: string }[] = [
  { key: 'custom_color_bg', label: 'Nền', default: THEMES.dark_slate.bg },
  { key: 'custom_color_card', label: 'Thẻ (card)', default: THEMES.dark_slate.card },
  { key: 'custom_color_card_border', label: 'Viền thẻ', default: THEMES.dark_slate.cardBorder },
  { key: 'custom_color_accent1', label: 'Màu nhấn 1 (tiêu đề)', default: THEMES.dark_slate.accent1 },
  { key: 'custom_color_accent2', label: 'Màu nhấn 2 (nhãn)', default: THEMES.dark_slate.accent2 },
  { key: 'custom_color_accent3', label: 'Màu nhấn 3 (badge)', default: THEMES.dark_slate.accent3 },
  { key: 'custom_color_title', label: 'Chữ tiêu đề', default: THEMES.dark_slate.title },
  { key: 'custom_color_body', label: 'Chữ nội dung', default: THEMES.dark_slate.body },
  { key: 'custom_color_muted', label: 'Chữ mờ', default: THEMES.dark_slate.muted },
  { key: 'custom_color_code_bg', label: 'Nền code', default: THEMES.dark_slate.codeBg },
  { key: 'custom_color_code_text', label: 'Chữ code', default: THEMES.dark_slate.codeText }
];
