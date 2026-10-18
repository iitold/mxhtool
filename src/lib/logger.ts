/**
 * Tiny structured logger. Console only (cheap) + best-effort DB insert.
 */
import { supabaseAdmin } from './supabaseAdmin';

export type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, source: string, message: string, details?: unknown) {
  const line = `[${level.toUpperCase()}][${source}] ${message}`;
  if (level === 'error') console.error(line, details ?? '');
  else if (level === 'warn') console.warn(line, details ?? '');
  else console.log(line, details ?? '');

  try {
    void supabaseAdmin()
      .from('logs')
      .insert({ level, source, message, details: details ?? null })
      .then(
        () => undefined,
        () => undefined
      );
  } catch {
    // Supabase not configured (e.g. local render test) — ignore.
  }
}

export const logInfo = (source: string, message: string, details?: unknown) =>
  write('info', source, message, details);
export const logWarn = (source: string, message: string, details?: unknown) =>
  write('warn', source, message, details);
export const logError = (source: string, message: string, details?: unknown) =>
  write('error', source, message, details);
