/**
 * Database helpers: locks, topics (dedup), posts + targets, analytics.
 */
import { supabaseAdmin } from './supabaseAdmin';
import { TIMEZONE } from './env';

// ─── Locks ──────────────────────────────────────────────────

/** Try to acquire the single-run lock. Returns false if another run holds it. */
export async function acquireLock(name = 'pipeline', ttlSeconds = 900): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc('acquire_lock', {
    p_name: name,
    p_ttl_seconds: ttlSeconds
  });
  if (error) throw error;
  return data === true;
}

export async function releaseLock(name = 'pipeline'): Promise<void> {
  await supabaseAdmin().rpc('release_lock', { p_name: name });
}

// ─── Topics / dedup ─────────────────────────────────────────

export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function topicHash(topic: string): string {
  // Simple deterministic FNV-1a hash (avoids a crypto import in edge contexts).
  const s = normalizeTopic(topic);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function recentTopics(count = 20) {
  const { data } = await supabaseAdmin()
    .from('topics')
    .select('topic, rule_id, created_at')
    .order('created_at', { ascending: false })
    .limit(count);
  return data ?? [];
}

export async function isDuplicateTopic(
  topic: string,
  embedding: number[] | null,
  dedupDays: number
): Promise<{ duplicate: boolean; reason?: string; match?: string }> {
  const cutoff = new Date(Date.now() - dedupDays * 86_400_000).toISOString();

  // 1. Exact hash match within the window.
  const { data: exact } = await supabaseAdmin()
    .from('topics')
    .select('topic')
    .eq('hash', topicHash(topic))
    .gte('created_at', cutoff)
    .limit(1);
  const exactRows = (exact ?? []) as Array<{ topic: string }>;
  if (exactRows.length > 0) {
    return { duplicate: true, reason: 'hash', match: exactRows[0].topic };
  }

  // 2. Semantic match via pgvector.
  if (embedding) {
    const { data: similar } = await supabaseAdmin().rpc('match_topics', {
      query_embedding: embedding,
      match_threshold: 0.88,
      match_count: 1
    });
    const similarRows = (similar ?? []) as Array<{ topic: string }>;
    if (similarRows.length > 0) {
      return { duplicate: true, reason: 'semantic', match: similarRows[0].topic };
    }
  }

  return { duplicate: false };
}

export async function saveTopic(
  topic: string,
  ruleId: string | null,
  embedding: number[] | null
): Promise<void> {
  await supabaseAdmin()
    .from('topics')
    .insert({ topic, rule_id: ruleId, embedding, hash: topicHash(topic) });
}

// ─── Posts ──────────────────────────────────────────────────

export interface CreatePostInput {
  topic: string;
  rule_id: string | null;
  title: string;
  caption: string;
  keywords: string[];
  slides: string[];
  score: unknown;
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .insert({
      topic: input.topic,
      rule_id: input.rule_id,
      title: input.title,
      caption: input.caption,
      keywords: input.keywords,
      slides: input.slides,
      score: input.score,
      status: 'pending'
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePost(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin().from('posts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function addPostTarget(
  postId: string,
  platform: string,
  status: string,
  platformPostId: string | null,
  errorText: string | null
): Promise<void> {
  await supabaseAdmin().from('post_targets').insert({
    post_id: postId,
    platform,
    status,
    platform_post_id: platformPostId,
    error: errorText,
    posted_at: status === 'posted' ? new Date().toISOString() : null
  });
}

export async function todayPostCount(): Promise<number> {
  const start = startOfTodayUtc();
  const { count } = await supabaseAdmin()
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('posted_at', start);
  return count ?? 0;
}

function startOfTodayUtc(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const ymd = fmt.format(now); // YYYY-MM-DD in local tz
  // Interpret midnight local as the boundary; approximate with +07:00 offset-free ISO.
  return new Date(`${ymd}T00:00:00`).toISOString();
}

export async function getRecentPosts(count = 20) {
  const { data } = await supabaseAdmin()
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(count);
  return data ?? [];
}

export async function getPost(id: string) {
  const { data } = await supabaseAdmin().from('posts').select('*').eq('id', id).single();
  return data;
}

export async function getPostTargets(postId: string) {
  const { data } = await supabaseAdmin()
    .from('post_targets')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return data ?? [];
}
