import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * Diagnostic endpoint (no secrets exposed). Open /api/health and check which
 * env vars are present at runtime and whether Supabase auth responds.
 */
export async function GET() {
  const report: Record<string, unknown> = {
    runtime: 'edge',
    cf: Boolean(process.env.CF_PAGES),
    branch: process.env.CF_PAGES_BRANCH ?? null,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  };

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.getUser();
    report.auth = error ? `error: ${error.message}` : 'ok';
  } catch (e) {
    report.auth = `throw: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(report);
}
