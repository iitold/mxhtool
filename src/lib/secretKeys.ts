/**
 * Credentials that can be managed from the web UI.
 * Keep in sync with the `app_secrets` table (see migrations/0003_secrets.sql).
 */
export const SECRET_KEYS = [
  'GEMINI_API_KEYS',
  'GEMINI_API_KEY',
  'GEMINI_MODELS',
  'GEMINI_EMBED_MODELS',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
  'TIKTOK_ACCESS_TOKEN',
  'TIKTOK_REFRESH_TOKEN',
  'FB_PAGE_ID',
  'FB_PAGE_TOKEN',
  'THREADS_USER_ID',
  'THREADS_ACCESS_TOKEN',
  'THREADS_APP_SECRET',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'GITHUB_WORKFLOW',
  'GITHUB_BRANCH',
  'GITHUB_PAGES_REPO',
  'GITHUB_PAGES_BRANCH',
  'GITHUB_PAGES_BASE',
  'GITHUB_PAGES_PATH',
  'GITHUB_PAGES_TOKEN'
] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];
