/**
 * Facebook Page — multi-photo post via Graph API.
 */
import { getSecret } from '../secrets';
import { logError, logInfo } from '../logger';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export function getFbCaption(content: { caption?: string; title?: string; keywords?: string[] }): string {
  const lines: string[] = [];
  lines.push(content.caption || content.title || '');
  lines.push('');
  lines.push('TikTok: @it.old');
  lines.push('Threads: @bztiensinh');
  lines.push('');
  if (content.keywords?.length) {
    lines.push(content.keywords.map((k) => '#' + k.replace(/\s+/g, '_')).join(' '));
  }
  return lines.join('\n');
}

export async function postToFacebook(
  imageUrls: string[],
  content: { caption?: string; title?: string; keywords?: string[] }
): Promise<PublishResult> {
  const pageId = await getSecret('FB_PAGE_ID');
  const token = await getSecret('FB_PAGE_TOKEN');
  if (!pageId || !token) return { success: false, error: 'Not configured' };

  const message = getFbCaption(content);

  try {
    if (imageUrls.length === 1) {
      const res = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: 'POST',
        body: new URLSearchParams({ message, url: imageUrls[0], access_token: token })
      });
      const json: any = await res.json();
      if (json.error) throw new Error(json.error.message);
      return { success: true, postId: json.post_id ?? json.id };
    }

    const photoIds: string[] = [];
    for (const url of imageUrls) {
      const res = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: 'POST',
        body: new URLSearchParams({ url, published: 'false', access_token: token })
      });
      const json: any = await res.json();
      if (json.error) {
        logError('facebook', `Photo upload failed: ${json.error.message}`);
        continue;
      }
      photoIds.push(json.id);
    }
    if (photoIds.length === 0) throw new Error('No photos uploaded');

    const res = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: token,
        attached_media: photoIds.map((id) => ({ media_fbid: id }))
      })
    });
    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message);
    logInfo('facebook', `Posted ${photoIds.length} photos`);
    return { success: true, postId: json.id };
  } catch (e: any) {
    logError('facebook', e.message);
    return { success: false, error: e.message };
  }
}
