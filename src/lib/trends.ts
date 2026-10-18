/**
 * Trend sources: Hacker News front page + GitHub trending (scraped).
 * Used as optional inspiration so topics track what devs actually discuss.
 */
import { logInfo } from './logger';

const UA = 'Mozilla/5.0 (compatible; itold-factory/1.0)';

async function fetchHackerNews(limit = 15): Promise<string[]> {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page', {
      headers: { 'User-Agent': UA }
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    return (json?.hits ?? [])
      .slice(0, limit)
      .map((h: any) => h.title as string)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGitHubTrending(limit = 15): Promise<string[]> {
  try {
    const res = await fetch('https://github.com/trending', { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const html = await res.text();
    const titles = [...html.matchAll(/<h2[^>]*>\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/g)]
      .map((m) => m[1].trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    return titles.slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchTrends(limit = 20): Promise<string[]> {
  const [hn, gh] = await Promise.all([fetchHackerNews(limit), fetchGitHubTrending(limit)]);
  const all = [...hn, ...gh].map((t) => t.replace(/\s+/g, ' ').trim());
  const unique = [...new Set(all)];
  logInfo('trends', `fetched ${hn.length} HN + ${gh.length} GH = ${unique.length} unique`);
  return unique.slice(0, limit);
}
