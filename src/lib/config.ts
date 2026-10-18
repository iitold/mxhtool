/**
 * Config stored in the `config` table, with UTF-8 defaults and a short
 * in-memory cache to avoid hammering Postgres on every call.
 */
import { supabaseAdmin } from './supabaseAdmin';

export const DEFAULT_CONFIG: Record<string, string> = {
  post_times: '06:45,12:15,19:30',
  max_posts_per_day: '5',
  tiktok_privacy: 'SELF_ONLY',
  dedup_days: '90',
  slides_per_post_min: '3',
  slides_per_post_max: '5',
  words_per_slide_max: '80',
  content_language: 'vi',
  color_theme: 'dark_slate',
  footer_handle: '@it.old',
  quality_threshold: '7',
  enabled_content_rules:
    'myth_buster,challenge,before_after,storytime,speed_run,hot_take,meme_explain,salary_career',
  trends_enabled: 'true'
};

const TTL_MS = 30_000;
let cache: { at: number; data: Record<string, string> } | null = null;

export async function getAllConfig(force = false): Promise<Record<string, string>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const data: Record<string, string> = { ...DEFAULT_CONFIG };
  try {
    const { data: rows, error } = await supabaseAdmin()
      .from('config')
      .select('key,value');
    if (error) throw error;
    for (const row of (rows ?? []) as Array<{ key: string; value: string }>) {
      data[row.key] = String(row.value ?? '');
    }
  } catch {
    // DB unavailable — fall back to defaults.
  }

  cache = { at: Date.now(), data };
  return data;
}

export async function getConfig(key: string): Promise<string> {
  const all = await getAllConfig();
  return all[key] ?? DEFAULT_CONFIG[key] ?? '';
}

export async function getConfigInt(key: string, fallback = 0): Promise<number> {
  const n = parseInt(await getConfig(key), 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function getConfigBool(key: string, fallback = false): Promise<boolean> {
  const v = (await getConfig(key)).toLowerCase();
  if (v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export async function setConfig(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('config')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });
  if (error) throw error;
  cache = null;
}

export function clearConfigCache() {
  cache = null;
}
