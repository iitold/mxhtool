import { NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * Kicks off TikTok OAuth. Visit /api/tiktok/auth while signed in.
 * The redirect_uri must match what is registered in the TikTok app.
 */
export async function GET(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const clientKey = await getSecret('TIKTOK_CLIENT_KEY');
  if (!clientKey) {
    return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY chưa cấu hình' }, { status: 500 });
  }

  const redirectUri = `${url.origin}/api/tiktok/callback`;
  const scopes = 'user.info.basic,video.publish,video.upload';
  const authorize =
    `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}` +
    `&scope=${scopes}&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&state=tiktok_auth`;

  return NextResponse.redirect(authorize);
}
