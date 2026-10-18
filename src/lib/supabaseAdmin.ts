/**
 * Service-role Supabase client. Bypasses RLS.
 * Used by the pipeline (Node/GitHub Actions) and protected API routes.
 */
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env';

let client: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (!client) {
    client = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}
