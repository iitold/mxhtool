/**
 * The full posting pipeline: topic → content → render → upload → publish.
 * Runs in Node (GitHub Actions), not on Vercel.
 */
import { embed } from './ai';
import { getAllConfig, getConfig, getConfigInt } from './config';
import {
  acquireLock,
  addPostTarget,
  createPost,
  isDuplicateTopic,
  releaseLock,
  saveTopic,
  todayPostCount,
  updatePost
} from './db';
import { envBool } from './env';
import { logError, logInfo } from './logger';
import { postToFacebook } from './publishers/facebook';
import { postToThreads } from './publishers/threads';
import { postPhotoCarousel } from './publishers/tiktok';
import { renderSlides } from '@/render/renderSlides';
import { resolveTheme } from '@/render/theme';
import { resolveLayout } from '@/render/layout';
import { uploadImages } from './storage';
import { notifyPostFailed, notifyPostSuccess, sendTelegram } from './telegram';
import { generateContent } from './content';
import { getNextTopic } from './topic';
import { verifySlides } from './verify-code';

export interface PipelineResult {
  posted: boolean;
  reason?: string;
  topic?: string;
  imageUrls?: string[];
}

export async function runPipeline(opts: {
  topicOverride?: string;
  force?: boolean;
}): Promise<PipelineResult> {
  if (!(await acquireLock('pipeline', 1800))) {
    logInfo('pipeline', 'Another run holds the lock — skipping');
    return { posted: false, reason: 'locked' };
  }

  let postId: string | null = null;
  let topic = opts.topicOverride ?? '';
  const errors: string[] = [];

  try {
    // ── Daily limit ──
    const maxPerDay = await getConfigInt('max_posts_per_day', 5);
    const todayCount = await todayPostCount();
    if (!opts.force && todayCount >= maxPerDay) {
      logInfo('pipeline', `Daily limit reached (${todayCount}/${maxPerDay})`);
      return { posted: false, reason: 'daily_limit' };
    }

    // ── 1. Topic ──
    let embedding: number[] | null = null;
    const dedupDays = await getConfigInt('dedup_days', 90);
    if (topic) {
      embedding = await embed(topic);
      const dup = await isDuplicateTopic(topic, embedding, dedupDays);
      if (dup.duplicate && !opts.force) {
        logInfo('pipeline', `Manual topic is a duplicate: ${dup.match}`);
        return { posted: false, reason: 'duplicate' };
      }
    } else {
      const picked = await getNextTopic();
      topic = picked.topic;
      embedding = picked.embedding;
    }
    logInfo('pipeline', `Topic: ${topic}`);

    // ── 2. Content ──
    const enabled = (await getConfig('enabled_content_rules'))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const content = await generateContent(topic, enabled);

    // ── 3. Optional code verification ──
    if (envBool('VERIFY_CODE', false)) {
      const check = verifySlides(content.slides);
      if (!check.ok) {
        content.caption += '\n\n<!-- code check: ' + check.failures.join('; ') + ' -->';
      }
    }

    // ── 4. Persist post ──
    postId = await createPost({
      topic,
      rule_id: content.rule_id,
      title: content.title,
      caption: content.caption,
      keywords: content.keywords,
      slides: content.slides,
      score: content.score
    });
    await updatePost(postId, { status: 'rendering' });

    // ── 5. Render slides ──
    const cfg = await getAllConfig();
    const theme = resolveTheme(cfg.color_theme ?? 'dark_slate', cfg);
    const layout = resolveLayout(cfg);
    const footerHandle = cfg.footer_handle ?? '@it.old';
    const buffers = await renderSlides({
      slides: content.slides,
      title: content.title,
      theme,
      layout,
      footerHandle,
      width: Number(cfg.slide_width_px) || 1080,
      height: Number(cfg.slide_height_px) || 1920
    });
    if (buffers.length < 2) throw new Error(`Rendered only ${buffers.length} slides`);
    logInfo('pipeline', `Rendered ${buffers.length} slides`);

    // ── 6. Upload ──
    const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
    const imageUrls = await uploadImages(buffers, `${stamp}_${postId.slice(0, 8)}`);
    await updatePost(postId, { image_urls: imageUrls, status: 'posting' });

    // ── 7. Publish ──
    const tiktok = await postPhotoCarousel(imageUrls, content.caption);
    await addPostTarget(
      postId,
      'tiktok',
      tiktok.success ? 'posted' : 'failed',
      tiktok.publishId ?? null,
      tiktok.success ? null : tiktok.error ?? null
    );

    if (envBool('CROSSPOST_FACEBOOK', true)) {
      const fb = await postToFacebook(imageUrls, content);
      if (!fb.error?.includes('Not configured')) {
        await addPostTarget(postId, 'facebook', fb.success ? 'posted' : 'failed', fb.postId ?? null, fb.error ?? null);
      }
    }
    if (envBool('CROSSPOST_THREADS', true)) {
      const th = await postToThreads(imageUrls, content);
      if (!th.error?.includes('Not configured')) {
        await addPostTarget(postId, 'threads', th.success ? 'posted' : 'failed', th.threadId ?? null, th.error ?? null);
      }
    }

    // ── 8. Finalize ──
    if (!tiktok.success) {
      throw new Error(`TikTok post failed: ${tiktok.error ?? 'unknown'}`);
    }

    await updatePost(postId, { status: 'posted', posted_at: new Date().toISOString() });
    await saveTopic(topic, content.rule_id, embedding);

    const platforms = ['TikTok'];
    await notifyPostSuccess(topic, platforms);
    logInfo('pipeline', `Posted: ${topic}`);

    return { posted: true, topic, imageUrls };
  } catch (e: any) {
    errors.push(e.message);
    logError('pipeline', `Failed: ${e.message}`);
    if (postId) {
      await updatePost(postId, { status: 'failed', error: e.message }).catch(() => undefined);
    }
    await sendTelegram(`<b>Pipeline thất bại</b>\n${topic || '?'}\n<code>${e.message}</code>`).catch(
      () => undefined
    );
    await notifyPostFailed(topic || 'unknown', e.message);
    return { posted: false, reason: e.message, topic };
  } finally {
    await releaseLock('pipeline');
  }
}
