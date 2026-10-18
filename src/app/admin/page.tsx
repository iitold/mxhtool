import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { DEFAULT_CONFIG } from '@/lib/config';
import { CONTENT_RULES } from '@/lib/rules';
import AdminClient from './AdminClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const [postsRes, configRes, logsRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id,topic,title,status,rule_id,score,image_urls,posted_at,error,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('config').select('key,value').order('key'),
    supabase.from('logs').select('level,source,message,created_at').order('created_at', { ascending: false }).limit(50)
  ]);

  const rules = Object.values(CONTENT_RULES).map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc
  }));

  // Merge DB values over defaults so every schema field is present in the UI.
  const merged: Record<string, string> = { ...DEFAULT_CONFIG };
  for (const row of (configRes.data ?? []) as Array<{ key: string; value: string }>) {
    merged[row.key] = String(row.value ?? '');
  }
  const config = Object.entries(merged).map(([key, value]) => ({ key, value }));

  const enabledRules = String(merged.enabled_content_rules ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <AdminClient
      email={user.email ?? ''}
      posts={postsRes.data ?? []}
      config={config}
      logs={logsRes.data ?? []}
      rules={rules}
      enabledRules={enabledRules}
    />
  );
}
