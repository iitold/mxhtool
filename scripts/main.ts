/**
 * Pipeline entry point for GitHub Actions / local runs.
 *
 *   npm run pipeline            # respects configured post times + daily limit
 *   npm run pipeline:force      # ignores time + daily limit
 *   TOPIC="..." npm run pipeline
 */
import { getConfig, getConfigInt } from '../src/lib/config';
import { logError, logInfo } from '../src/lib/logger';
import { runPipeline } from '../src/lib/pipeline';
import { TIMEZONE } from '../src/lib/env';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function localTimeParts(): { hhmm: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const hhmm = fmt.format(new Date());
  const [h, m] = hhmm.split(':').map(Number);
  return { hhmm, minutes: h * 60 + m };
}

async function isValidPostTime(): Promise<boolean> {
  const times = ((await getConfig('post_times')) || '06:45,12:15,19:30')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const { hhmm, minutes } = localTimeParts();
  const window = 15;
  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    const target = (h || 0) * 60 + (m || 0);
    let diff = Math.abs(minutes - target);
    if (diff > 720) diff = 1440 - diff;
    if (diff <= window) {
      logInfo('main', `Valid post time: ${hhmm} ≈ ${t}`);
      return true;
    }
  }
  return false;
}

async function main() {
  const force = hasFlag('force') || process.env.FORCE === 'true';
  const topicOverride = arg('topic') || process.env.TOPIC || undefined;

  logInfo('main', `Start (force=${force}, topic=${topicOverride ?? 'auto'})`);

  if (!force && !topicOverride && !(await isValidPostTime())) {
    logInfo('main', 'Not a valid post time — exiting');
    return;
  }

  const maxPerDay = await getConfigInt('max_posts_per_day', 5);
  logInfo('main', `Daily cap: ${maxPerDay}`);

  const result = await runPipeline({ topicOverride, force });
  logInfo('main', `Result: ${JSON.stringify(result)}`);

  if (!result.posted && result.reason && !['daily_limit', 'locked'].includes(result.reason)) {
    process.exitCode = 0; // keep the workflow green; failures are reported to Telegram
  }
}

main().catch((e) => {
  logError('main', `Fatal: ${e?.stack ?? e}`);
  process.exit(1);
});
