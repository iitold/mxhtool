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
  if (base) return base.endsWith('/') ? base : base + '/';
  const [owner, name] = repo.split('/');
  if (name === `${owner}.github.io`) return `https://${owner}.github.io/`;
  return `https://${owner}.github.io/${name}/`;
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

  // 1. Current branch head + base tree.
  const ref = await ghJson(
    token,
    `${api}/git/ref/heads/${encodeURIComponent(branch)}`,
    { method: 'GET' },
    repo,
    tokenLabel
  );
  const parentSha: string = ref.object.sha;
  const commit = await ghJson(token, `${api}/git/commits/${parentSha}`, { method: 'GET' }, repo, tokenLabel);
  const baseTree: string = commit.tree.sha;

  // 2. One blob per slide.
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

  // 3. New tree → commit → move branch.
  const newTree = await ghJson(
    token,
    `${api}/git/trees`,
    { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree }) },
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

  logInfo('storage', `Uploaded ${urls.length} images to GitHub Pages ${repo} (1 commit)`);
  return urls;
}

/**
 * Waits until the slides are publicly reachable (GitHub Pages needs a build).
 * Checks the first and last URL (they share the same build). Returns false on timeout.
 */
export async function waitForPublicUrls(
  urls: string[],
  { tries = 60, delayMs = 5000 } = {}
): Promise<boolean> {
  const probes = urls.length > 1 ? [urls[0], urls[urls.length - 1]] : urls;
  for (let attempt = 0; attempt < tries; attempt++) {
    let allOk = true;
    for (const url of probes) {
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'error' });
        if (!res.ok) {
          allOk = false;
          break;
        }
      } catch {
        allOk = false;
        break;
      }
    }
    if (allOk) {
      logInfo('storage', `Images are live (after ~${attempt * (delayMs / 1000)}s)`);
      return true;
    }
    await sleep(delayMs);
  }
  return false;
}
