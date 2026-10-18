/**
 * GitHub Pages image host — uploads rendered slides to a repo and returns
 * public URLs under a verified URL prefix (needed for TikTok PULL_FROM_URL).
 * Runs in Node (GitHub Actions) and uses the GitHub Contents API.
 */
import { getSecret } from './secrets';
import { logInfo } from './logger';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Derives the Pages base URL from `owner/repo` unless an explicit base is set. */
export function pagesBaseUrl(repo: string, base?: string): string {
  if (base) return base.endsWith('/') ? base : base + '/';
  const [owner, name] = repo.split('/');
  if (name === `${owner}.github.io`) return `https://${owner}.github.io/`;
  return `https://${owner}.github.io/${name}/`;
}

async function putFile(
  token: string,
  repo: string,
  branch: string,
  path: string,
  content: Buffer,
  message: string,
  tokenLabel = 'token'
): Promise<void> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'mxht-content-factory'
  };
  const body = JSON.stringify({ message, content: content.toString('base64'), branch });

  let res = await fetch(url, { method: 'PUT', headers, body });
  if (res.status === 422) {
    // File already exists → fetch its sha and overwrite.
    const current = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
    if (current.ok) {
      const sha = (await current.json())?.sha;
      res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ message, content: content.toString('base64'), branch, sha })
      });
    }
  }
  if (res.status !== 201 && res.status !== 200) {
    const detail = (await res.text()).slice(0, 200);
    if (res.status === 403 || res.status === 404) {
      throw new Error(
        `Không ghi được vào ${repo} (HTTP ${res.status}) — token đang dùng: ${tokenLabel}. ` +
          `Cần PAT có quyền "Contents: Read and write" trên repo ${repo}. ` +
          `Nếu GITHUB_PAGES_TOKEN trống, hệ thống dùng GITHUB_TOKEN (token đó thường chỉ có quyền repo mxhtool). ` +
          `Chi tiết: ${detail}`
      );
    }
    throw new Error(`GitHub upload failed (HTTP ${res.status}): ${detail}`);
  }
}

/** Uploads buffers as `<prefix>/slide_N.jpeg`. Returns the public URLs. */
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

  const urls: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const rel = `${prefix}/slide_${i + 1}.jpeg`;
    const filePath = repoPath ? `${repoPath}/${rel}` : rel;
    await putFile(
      token,
      repo,
      branch,
      filePath,
      buffers[i],
      `slides: ${rel} (${i + 1}/${buffers.length})`,
      tokenLabel
    );
    urls.push(base + rel);
  }
  logInfo('storage', `Uploaded ${urls.length} images to GitHub Pages ${repo}`);
  return urls;
}

/**
 * Waits until every URL is publicly reachable (GitHub Pages needs a build).
 * Returns false if it times out.
 */
export async function waitForPublicUrls(
  urls: string[],
  { tries = 24, delayMs = 5000 } = {}
): Promise<boolean> {
  for (let attempt = 0; attempt < tries; attempt++) {
    let allOk = true;
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'GET' });
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
      logInfo('storage', `All ${urls.length} images are live`);
      return true;
    }
    await sleep(delayMs);
  }
  return false;
}
