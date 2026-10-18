import { NextResponse } from 'next/server';
import { getSecret, setSecret } from '@/lib/secrets';
import { logError } from '@/lib/logger';

export const runtime = 'edge';

/** TikTok OAuth callback: exchange the authorization code and persist tokens. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/admin?tiktok=missing', url.origin));

  const clientKey = await getSecret('TIKTOK_CLIENT_KEY');
  const clientSecret = await getSecret('TIKTOK_CLIENT_SECRET');
  const redirectUri = `${url.origin}/api/tiktok/callback`;

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    const json: any = await res.json();

    if (!json.access_token) {
      logError('tiktok', `Code exchange failed: ${JSON.stringify(json)}`);
      return NextResponse.redirect(new URL('/admin?tiktok=error', url.origin));
    }

    await setSecret('TIKTOK_ACCESS_TOKEN', json.access_token);
    if (json.refresh_token) await setSecret('TIKTOK_REFRESH_TOKEN', json.refresh_token);
    if (json.open_id) await setSecret('TIKTOK_OPEN_ID', json.open_id);

    return NextResponse.redirect(new URL('/admin?tiktok=ok', url.origin));
  } catch (e: any) {
    logError('tiktok', `Callback error: ${e.message}`);
    return NextResponse.redirect(new URL('/admin?tiktok=error', url.origin));
  }
}
