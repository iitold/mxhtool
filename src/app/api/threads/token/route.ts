import { NextResponse } from 'next/server';
import { getSecret, setSecret } from '@/lib/secrets';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * Exchange a short-lived Threads token for a 60-day long-lived token.
 * Body: { shortToken: string, userId?: string }
 */
export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const shortToken: string = (body.shortToken ?? '').trim();
  const userId: string = (body.userId ?? '').trim() || (await getSecret('THREADS_USER_ID'));

  if (!userId || shortToken.length < 10) {
    return NextResponse.json({ success: false, error: 'Thiếu user id hoặc token' }, { status: 400 });
  }

  const appSecret = await getSecret('THREADS_APP_SECRET');
  if (!appSecret) {
    return NextResponse.json({ success: false, error: 'THREADS_APP_SECRET chưa cấu hình' }, { status: 500 });
  }

  const url =
    'https://graph.threads.net/access_token?grant_type=th_exchange_token' +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&access_token=${encodeURIComponent(shortToken)}`;

  const res = await fetch(url);
  const json: any = await res.json();
  if (json.error || !json.access_token) {
    return NextResponse.json({ success: false, error: json.error?.message ?? 'Exchange failed' }, { status: 400 });
  }

  await setSecret('THREADS_USER_ID', userId);
  await setSecret('THREADS_ACCESS_TOKEN', json.access_token);

  const days = Math.round((json.expires_in ?? 5184000) / 86400);
  return NextResponse.json({ success: true, message: `Threads token đã lưu (hạn ${days} ngày)` });
}
