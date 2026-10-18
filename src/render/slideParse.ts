/**
 * Slide text parser (title / bullets / code). No heavy deps so it can be
 * imported from the admin preview bundle.
 */
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
