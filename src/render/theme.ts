/**
 * Slide color themes for the HTML renderer.
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
    kw: '#ff7b72',
    str: '#a5d6ff',
    cmt: '#8b949e',
    num: '#79c0ff',
    fn: '#d2a8ff'
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
    kw: '#d73a49',
    str: '#032f62',
    cmt: '#6a737d',
    num: '#005cc5',
    fn: '#6f42c1'
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
  }
};

export function getTheme(key: string): Theme {
  return THEMES[key] ?? THEMES.dark_slate;
}
