import { NextResponse } from 'next/server';
import { SECRET_KEYS } from '@/lib/secretKeys';
import { setSecret } from '@/lib/secrets';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabaseAdmin().from('app_secrets').select('key');
  const inDb = new Set(((data ?? []) as Array<{ key: string }>).map((r) => r.key));

  const secrets = SECRET_KEYS.map((key) => ({
    key,
    set: inDb.has(key) || Boolean(process.env[key])
  }));

  return NextResponse.json({ success: true, secrets });
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const values: Record<string, string> = body.values ?? {};

  const saved: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!(SECRET_KEYS as readonly string[]).includes(key)) continue;
    if (typeof value === 'string' && value.trim() !== '') {
      await setSecret(key, value.trim());
      saved.push(key);
    }
  }

  return NextResponse.json({
    success: true,
    message: saved.length ? `Đã lưu: ${saved.join(', ')}` : 'Không có thay đổi'
  });
}
