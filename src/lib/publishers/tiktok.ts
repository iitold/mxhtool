/**
 * TikTok Content Posting API — photo carousel (DIRECT_POST).
 * Reads/writes tokens through the secrets store so refreshes persist.
 */
import { getConfig } from '../config';
import { getSecret, setSecret } from '../secrets';
import { logError, logInfo } from '../logger';

const BASE = 'https://open.tiktokapis.com/v2';

interface PostResult {
  success: boolean;
  publishId?: string;
  status?: string;
  error?: string;
}

/** Turns TikTok error codes into actionable Vietnamese hints. */
function friendlyError(code: string, message: string, sampleUrl = ''): string {
  switch (code) {
    case 'url_ownership_unverified':
      return (
        `${message} — URL ảnh (${sampleUrl}) chưa thuộc domain/prefix đã verify. Kiểm tra: ` +
        '(1) URL prefix đã verify trong TikTok Developer Portal phải khớp đầu URL này; ' +
        '(2) phải verify Ở CHẾ ĐỘ PRODUCTION; ' +
        '(3) app đang đăng bài (TIKTOK_CLIENT_KEY) phải ĐÚNG LÀ app đã verify URL properties.'
      );
    case 'privacy_level_option_mismatch':
      return `${message} — privacy_level không nằm trong danh sách creator cho phép (do app chưa audit).`;
    case 'unaudited_client_can_only_post_to_private':
      return `${message} — App chưa audit nên chỉ đăng được chế độ riêng tư (SELF_ONLY).`;
    case 'spam_risk_too_many_posts':
      return `${message} — Đã đạt giới hạn số bài/ngày của tài khoản này.`;
    case 'spam_risk_too_many_pending_share':
      return `${message} — Tối đa 5 bài chờ duyệt trong 24h. Đăng lại sau.`;
    default:
      return message;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const clientKey = await getSecret('TIKTOK_CLIENT_KEY');
  const clientSecret = await getSecret('TIKTOK_CLIENT_SECRET');
  const refreshToken = await getSecret('TIKTOK_REFRESH_TOKEN');
  if (!clientKey || !clientSecret || !refreshToken) return null;

  const res = await fetch(`${BASE}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  const json: any = await res.json();
  if (!res.ok || json.error) {
    logError('tiktok', `Token refresh failed: ${JSON.stringify(json.error ?? json)}`);
    return null;
  }

  await setSecret('TIKTOK_ACCESS_TOKEN', json.access_token);
  if (json.refresh_token) await setSecret('TIKTOK_REFRESH_TOKEN', json.refresh_token);
  if (json.open_id) await setSecret('TIKTOK_OPEN_ID', json.open_id);
  logInfo('tiktok', 'Access token refreshed and persisted');
  return json.access_token as string;
}

async function token(): Promise<string | null> {
  return (await getSecret('TIKTOK_ACCESS_TOKEN')) || refreshAccessToken();
}

async function request(path: string, payload: unknown, accessToken: string) {
  const doFetch = (t: string) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload)
    });

  let res = await doFetch(accessToken);
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) throw new Error('TikTok token refresh failed');
    res = await doFetch(fresh);
  }
  return { status: res.status, json: (await res.json()) as any };
}

export async function postPhotoCarousel(imageUrls: string[], caption: string): Promise<PostResult> {
  if (!imageUrls || imageUrls.length < 2) {
    return { success: false, error: 'TikTok needs at least 2 images' };
  }
  const images = imageUrls.slice(0, 10);

  const accessToken = await token();
  if (!accessToken) return { success: false, error: 'No TikTok access token' };

  const privacy = (await getConfig('tiktok_privacy')) || 'SELF_ONLY';

  const payload = {
    post_info: {
      title: caption.slice(0, 90),
      description: caption.slice(0, 4000),
      privacy_level: privacy,
      disable_comment: false,
      auto_add_music: true
    },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: images },
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO'
  };

  logInfo('tiktok', `Initiating carousel with ${images.length} images`);
  const { status, json } = await request('/post/publish/content/init/', payload, accessToken);

  if (status !== 200 || (json.error && json.error.code !== 'ok')) {
    const code = json?.error?.code ?? '';
    const message = json?.error?.message ?? JSON.stringify(json);
    const err = friendlyError(code, message, images[0]);
    logError('tiktok', `Init failed: ${err}`);
    return { success: false, error: err };
  }

  const publishId = json?.data?.publish_id;
  if (!publishId) return { success: false, error: `No publish_id: ${JSON.stringify(json)}` };

  const polled = await pollStatus(publishId, accessToken);
  return { publishId, ...polled };
}

async function pollStatus(publishId: string, accessToken: string): Promise<PostResult> {
  const maxPolls = 12;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const { json } = await request('/post/publish/status/fetch/', { publish_id: publishId }, accessToken);
      const status = json?.data?.status;
      logInfo('tiktok', `Poll ${i + 1}: ${status}`);
      if (status === 'PUBLISH_COMPLETE') return { success: true, status };
      if (status === 'FAILED') {
        return { success: false, status, error: json?.data?.fail_reason ?? 'Unknown failure' };
      }
    } catch (e: any) {
      logError('tiktok', `Poll error: ${e.message}`);
    }
  }
  return { success: false, status: 'PROCESSING', error: 'Polling timeout' };
}
