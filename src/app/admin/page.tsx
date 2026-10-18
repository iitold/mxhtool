import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
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
    supabase.from('logs').select('level,source,message,created_at').order('created_at', { ascending: false }).limit(20)
  ]);

  const rules = Object.values(CONTENT_RULES).map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc
  }));

  const enabledRules = String(
    (configRes.data ?? []).find((c) => c.key === 'enabled_content_rules')?.value ?? ''
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <AdminClient
      email={user.email ?? ''}
      posts={postsRes.data ?? []}
      config={configRes.data ?? []}
      logs={logsRes.data ?? []}
      rules={rules}
      enabledRules={enabledRules}
    />
  );
}
