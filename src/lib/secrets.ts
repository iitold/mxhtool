/**
 * Mutable secrets (OAuth tokens) stored in the DB so refreshed values persist.
 * Falls back to environment variables when a secret is not in the DB.
 * Service-role only — never exposed to clients.
 */
import { env } from './env';
import { logError } from './logger';
import { supabaseAdmin } from './supabaseAdmin';

const cache = new Map<string, string>();

export async function getSecret(key: string): Promise<string> {
  if (cache.has(key)) return cache.get(key)!;
  try {
    const { data } = await supabaseAdmin()
      .from('app_secrets')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    const value = (data as { value?: string } | null)?.value;
    if (value) {
      cache.set(key, value);
      return value;
    }
  } catch (e: any) {
    logError('secrets', `read failed for ${key}: ${e.message}`);
  }
  return env(key);
}

export async function setSecret(key: string, value: string): Promise<void> {
  cache.set(key, value);
  try {
    const { error } = await supabaseAdmin()
      .from('app_secrets')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  } catch (e: any) {
    logError('secrets', `write failed for ${key}: ${e.message}`);
  }
}
