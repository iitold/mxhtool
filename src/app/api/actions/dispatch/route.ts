import { NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets';
import { logError, logInfo } from '@/lib/logger';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * Triggers the GitHub Actions pipeline (workflow_dispatch).
 * action: 'force' | 'auto' | 'topic'
 * GitHub settings are read from the secrets store (configurable on the web UI).
 */
export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getSecret('GITHUB_TOKEN');
  const repo = await getSecret('GITHUB_REPO');
  const workflow = (await getSecret('GITHUB_WORKFLOW')) || 'pipeline.yml';
  const branch = (await getSecret('GITHUB_BRANCH')) || 'main';

  if (!token || !repo) {
    return NextResponse.json(
      { success: false, error: 'GITHUB_TOKEN / GITHUB_REPO chưa cấu hình' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action: string = body.action ?? 'auto';
  const topicInput: string = typeof body.topic === 'string' ? body.topic.trim() : '';

  const inputs: Record<string, string> = {};
  if (action === 'force') inputs.force = 'true';
  if (action === 'topic' && topicInput) {
    inputs.topic = topicInput;
    inputs.force = 'true';
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'mxht-content-factory'
      },
      body: JSON.stringify({ ref: branch, inputs })
    }
  );

  if (res.status !== 204) {
    const text = await res.text();
    logError('dispatch', `GitHub dispatch failed: HTTP ${res.status} ${text}`);
    return NextResponse.json({ success: false, error: `GitHub HTTP ${res.status}` }, { status: 502 });
  }

  logInfo('dispatch', `Dispatched workflow (${action})`);
  return NextResponse.json({ success: true, message: 'Đã gửi lệnh tới GitHub Actions' });
}
