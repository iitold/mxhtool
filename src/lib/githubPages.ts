/**
 * GitHub Pages image host — uploads rendered slides to a repo and returns
 * public URLs under a verified URL prefix (needed for TikTok PULL_FROM_URL).
 * Runs in Node (GitHub Actions) and uses the Git Data API (one commit per post).
 */
import { getSecret } from './secrets';
import { logInfo } from './logger';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'mxht-content-factory'
  };
}

function accessHint(repo: string, status: number, detail: string, tokenLabel: string): string {
  if (status === 403 || status === 404) {
    return (
      `Không ghi được vào ${repo} (HTTP ${status}) — token đang dùng: ${tokenLabel}. ` +
      `Cần PAT có quyền "Contents: Read and write" trên repo ${repo}. ` +
      `Nếu GITHUB_PAGES_TOKEN trống, hệ thống dùng GITHUB_TOKEN (token đó thường chỉ có quyền repo mxhtool). ` +
      `Chi tiết: ${detail}`
    );
  }
  return `GitHub upload failed (HTTP ${status}): ${detail}`;
}

async function ghJson(
  token: string,
  url: string,
  init: RequestInit,
  repo: string,
  tokenLabel: string
): Promise<any> {
  const res = await fetch(url, { ...init, headers: ghHeaders(token) });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(accessHint(repo, res.status, detail, tokenLabel));
  }
  return res.status === 204 ? null : res.json();
}

/** Derives the Pages base URL from `owner/repo` unless an explicit base is set. */
export function pagesBaseUrl(repo: string, base?: string): string {
  const [owner, name] = repo.split('/');
  const isUserPage = name === `${owner}.github.io`;
  const derived = isUserPage ? `https://${owner}.github.io/` : `https://${owner}.github.io/${name}/`;
  if (!base) return derived;

  const normalized = base.endsWith('/') ? base : base + '/';
  // Auto-fix a common mistake: a project page base without the repo segment,
  // e.g. https://user.github.io/ instead of https://user.github.io/repo/.
  if (!isUserPage) {
    try {
      const u = new URL(normalized);
      if (u.hostname.endsWith('.github.io')) {
        const firstSegment = u.pathname.replace(/^\/+/, '').split('/')[0];
        if (firstSegment !== name) return `https://${u.hostname}/${name}/`;
      }
    } catch {
      // Not a valid URL — fall back to the derived value.
      return derived;
    }
  }
  return normalized;
}

/**
 * Commits all slides to the repo in one commit (single Pages build).
 * Returns the public URLs.
 */
export async function uploadToGitHubPages(buffers: Buffer[], prefix: string): Promise<string[]> {
  const repo = await getSecret('GITHUB_PAGES_REPO');
  const pagesToken = await getSecret('GITHUB_PAGES_TOKEN');
  const token = pagesToken || (await getSecret('GITHUB_TOKEN'));
  const tokenLabel = pagesToken ? 'GITHUB_PAGES_TOKEN' : 'GITHUB_TOKEN (dự phòng)';
  const branch = (await getSecret('GITHUB_PAGES_BRANCH')) || 'main';
  const base = pagesBaseUrl(repo, await getSecret('GITHUB_PAGES_BASE'));
  // Repo folder that GitHub Pages publishes from (e.g. "docs"); empty = branch root.
  const repoPath = (await getSecret('GITHUB_PAGES_PATH')).replace(/^\/+|\/+$/g, '');

  if (!repo || !token) {
    throw new Error('GITHUB_PAGES_REPO / GITHUB_PAGES_TOKEN (hoặc GITHUB_TOKEN) chưa cấu hình');
  }
  const api = `https://api.github.com/repos/${repo}`;

  // 1. One blob per slide (independent of branch state).
  const urls: string[] = [];
  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const rel = `${prefix}/slide_${i + 1}.jpeg`;
    const filePath = repoPath ? `${repoPath}/${rel}` : rel;
    const blob = await ghJson(
      token,
      `${api}/git/blobs`,
      { method: 'POST', body: JSON.stringify({ content: buffers[i].toString('base64'), encoding: 'base64' }) },
      repo,
      tokenLabel
    );
    tree.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
    urls.push(base + rel);
  }

  // 2. New tree → commit → move branch. Retry if another commit lands first.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ref = await ghJson(
        token,
        `${api}/git/ref/heads/${encodeURIComponent(branch)}`,
        { method: 'GET' },
        repo,
        tokenLabel
      );
      const parentSha: string = ref.object.sha;
      const parent = await ghJson(token, `${api}/git/commits/${parentSha}`, { method: 'GET' }, repo, tokenLabel);
      const newTree = await ghJson(
        token,
        `${api}/git/trees`,
        { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) },
        repo,
        tokenLabel
      );
      const newCommit = await ghJson(
        token,
        `${api}/git/commits`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: `slides: ${prefix} (${buffers.length} images)`,
            tree: newTree.sha,
            parents: [parentSha]
          })
        },
        repo,
        tokenLabel
      );
      await ghJson(
        token,
        `${api}/git/refs/heads/${encodeURIComponent(branch)}`,
        { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) },
        repo,
        tokenLabel
      );
      lastError = undefined;
      break;
    } catch (e) {
      lastError = e;
      if (!/HTTP (409|422)/.test(String(e))) throw e;
      await sleep(2000);
    }
  }
  if (lastError) throw lastError;

  logInfo('storage', `Uploaded ${urls.length} images to GitHub Pages ${repo} (1 commit)`);
  logInfo('storage', `Public base: ${base}`);
  return urls;
}

/**
 * Waits until the slides are publicly reachable (GitHub Pages needs a build).
 * Probes with a cache-busting query so an early 404 is never cached on the
 * canonical URL that TikTok will fetch. Returns false on timeout.
 */
export async function waitForPublicUrls(
  urls: string[],
  { tries = 96, delayMs = 5000 } = {}
): Promise<boolean> {
  const probe = urls[0];
  let last = 'no response';
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const sep = probe.includes('?') ? '&' : '?';
      const res = await fetch(`${probe}${sep}mxhtcb=${Date.now()}-${attempt}`, {
        method: 'HEAD',
        cache: 'no-store',
        redirect: 'follow'
      });
      last = `HTTP ${res.status}`;
      const type = res.headers.get('content-type') ?? '';
      if (res.ok && type.startsWith('image/')) {
        logInfo('storage', `Images are live (after ~${attempt * (delayMs / 1000)}s)`);
        return true;
      }
    } catch (e: any) {
      last = e?.message ?? 'fetch error';
    }
    await sleep(delayMs);
  }
  logInfo('storage', `Images still not public after ~${(tries * delayMs) / 1000}s (last: ${last})`);
  return false;
}
