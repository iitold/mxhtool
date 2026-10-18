/**
 * One-time setup check: `npm run setup`
 * Verifies env vars, connectivity and creates the storage bucket.
 */
import { getConfig } from '../src/lib/config';
import { logError, logInfo } from '../src/lib/logger';
import { STORAGE_BUCKET } from '../src/lib/env';
import { supabaseAdmin } from '../src/lib/supabaseAdmin';

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

async function main() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    logError('setup', `Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const supabase = supabaseAdmin();

  // 1. DB connectivity + config seed.
  const postTimes = await getConfig('post_times');
  logInfo('setup', `DB OK — post_times = ${postTimes}`);

  // 2. Storage bucket.
  const { data: bucket } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
    if (error) throw error;
    logInfo('setup', `Created public bucket "${STORAGE_BUCKET}"`);
  } else {
    logInfo('setup', `Bucket "${STORAGE_BUCKET}" exists (public=${bucket.public})`);
  }

  // 3. AI keys present?
  const keys = [process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY].filter(Boolean);
  logInfo('setup', `Gemini keys configured: ${keys.length > 0 ? 'yes' : 'NO'}`);

  logInfo('setup', '✅ Setup complete');
}

main().catch((e) => {
  logError('setup', String(e?.message ?? e));
  process.exit(1);
});
