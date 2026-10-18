/**
 * Optional code verification: extracts JS code blocks and runs `node --check`.
 * Non-JS snippets are skipped (kept as-is). Enable with VERIFY_CODE=true.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logInfo, logWarn } from './logger';
import { parseSlide, codeBlocks } from '@/render/blocks';

const JS_LANGS = new Set(['javascript', 'js', 'node', 'typescript', 'ts']);

export interface VerifyResult {
  ok: boolean;
  failures: string[];
}

export function verifySlides(slides: unknown[]): VerifyResult {
  const failures: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), 'verify-'));

  try {
    for (let i = 0; i < slides.length; i++) {
      const spec = parseSlide(slides[i]);
      for (const block of codeBlocks(spec)) {
        const lang = block.lang.toLowerCase();
        if (!JS_LANGS.has(lang)) continue;

        // TypeScript is a superset — strip type annotations is out of scope, so
        // only syntax-check when it parses as plain JS.
        const file = join(dir, `slide_${i}.js`);
        writeFileSync(file, block.code);
        try {
          execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
        } catch (e: any) {
          const msg = String(e.stderr ?? e.message).split('\n').slice(0, 3).join(' ').trim();
          failures.push(`slide ${i + 1} (${lang}): ${msg}`);
        }
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (failures.length === 0) logInfo('verify', 'All JS snippets passed syntax check');
  else logWarn('verify', `${failures.length} snippet(s) failed`, failures);

  return { ok: failures.length === 0, failures };
}
