import { NextResponse } from 'next/server';
import { setConfig } from '@/lib/config';
import { CONTENT_RULES } from '@/lib/rules';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const valid = ids.filter((id) => Boolean(CONTENT_RULES[id]));

  if (valid.length === 0) {
    return NextResponse.json({ success: false, message: 'Phải bật ít nhất 1 rule' }, { status: 400 });
  }

  await setConfig('enabled_content_rules', valid.join(','));
  return NextResponse.json({ success: true, message: `Đã bật ${valid.length} rule` });
}
