/**
 * Environment helpers. All configuration that is not stored in the DB
 * (secrets, credentials) is read from environment variables.
 */

export function env(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v === null || v === '' ? fallback : v;
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function envList(name: string): string[] {
  return env(name)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function envBool(name: string, fallback = false): boolean {
  const v = env(name).toLowerCase();
  if (v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function envInt(name: string, fallback: number): number {
  const n = parseInt(env(name), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const TIMEZONE = env('TZ', 'Asia/Ho_Chi_Minh');
export const STORAGE_BUCKET = env('SUPABASE_STORAGE_BUCKET', 'media');
