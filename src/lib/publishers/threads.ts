/**
 * Threads (Meta) — single image or carousel, with long-lived token refresh
 * persisted to the secrets store.
 */
import { getSecret, setSecret } from '../secrets';
import { logError, logInfo } from '../logger';

const GRAPH = 'https://graph.threads.net/v1.0';

export interface PublishResult {
  success: boolean;
  threadId?: string;
  error?: string;
}

export function getThreadsCaption(content: {
  caption?: string;
  title?: string;
  keywords?: string[];
}): string {
  const lines: string[] = [];
  lines.push(content.caption || content.title || '');
  lines.push('');
  lines.push('TikTok: @it.old');
  if (content.keywords?.length) {
    lines.push(content.keywords.slice(0, 4).map((k) => '#' + k.replace(/\s+/g, '')).join(' '));
  }
  let text = lines.join('\n');
  if (text.length > 497) text = text.slice(0, 497) + '...';
  return text;
}

async function publishContainer(userId: string, token: string, containerId: string) {
  const res = await fetch(`${GRAPH}/${userId}/threads_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: containerId, access_token: token })
  });
  const json: any = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.id as string;
}

export async function postToThreads(
  imageUrls: string[],
  content: { caption?: string; title?: string; keywords?: string[] }
): Promise<PublishResult> {
  const userId = await getSecret('THREADS_USER_ID');
  const token = await getSecret('THREADS_ACCESS_TOKEN');
  if (!userId || !token) return { success: false, error: 'Not configured' };

  const text = getThreadsCaption(content);

  try {
    if (imageUrls.length <= 1) {
      const res = await fetch(`${GRAPH}/${userId}/threads`, {
        method: 'POST',
        body: new URLSearchParams({
          media_type: imageUrls.length ? 'IMAGE' : 'TEXT',
          text,
          ...(imageUrls.length ? { image_url: imageUrls[0] } : {}),
          access_token: token
        })
      });
      const json: any = await res.json();
      if (json.error) throw new Error(json.error.message);
      await new Promise((r) => setTimeout(r, 30_000));
      const id = await publishContainer(userId, token, json.id);
      return { success: true, threadId: id };
    }

    const childIds: string[] = [];
    for (const url of imageUrls) {
      const res = await fetch(`${GRAPH}/${userId}/threads`, {
        method: 'POST',
        body: new URLSearchParams({
          media_type: 'IMAGE',
          image_url: url,
          is_carousel_item: 'true',
          access_token: token
        })
      });
      const json: any = await res.json();
      if (json.error) {
        logError('threads', `Carousel item failed: ${json.error.message}`);
        continue;
      }
      childIds.push(json.id);
    }
    if (childIds.length < 2) throw new Error('Not enough carousel items');

    const carouselRes = await fetch(`${GRAPH}/${userId}/threads`, {
      method: 'POST',
      body: new URLSearchParams({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        text,
        access_token: token
      })
    });
    const carousel: any = await carouselRes.json();
    if (carousel.error) throw new Error(carousel.error.message);

    await new Promise((r) => setTimeout(r, 30_000));
    const id = await publishContainer(userId, token, carousel.id);
    logInfo('threads', `Carousel posted (${childIds.length})`);
    return { success: true, threadId: id };
  } catch (e: any) {
    logError('threads', e.message);
    return { success: false, error: e.message };
  }
}

/** Refresh the long-lived Threads token (valid ~60 days) and persist it. */
export async function refreshThreadsToken(): Promise<boolean> {
  const token = await getSecret('THREADS_ACCESS_TOKEN');
  if (!token) return false;
  const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url);
  const json: any = await res.json();
  if (json.error) {
    logError('threads', `Token refresh failed: ${json.error.message}`);
    return false;
  }
  await setSecret('THREADS_ACCESS_TOKEN', json.access_token);
  logInfo('threads', 'Long-lived token refreshed');
  return true;
}
