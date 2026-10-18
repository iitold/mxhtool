import { NextResponse } from 'next/server';
import { setConfig } from '@/lib/config';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const values: Record<string, string> = body.values ?? {};
  if (typeof values !== 'object' || Array.isArray(values)) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  const saved: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    await setConfig(key, String(value));
    saved.push(key);
  }

  return NextResponse.json({ success: true, message: `Đã lưu: ${saved.join(', ')}` });
}
