/**
 * Image hosting — uploads rendered slides and returns public URLs.
 * Backend is chosen by the `image_host` config (Supabase Storage or GitHub Pages).
 */
import { getConfig } from './config';
import { STORAGE_BUCKET } from './env';
import { uploadToGitHubPages, waitForPublicUrls } from './githubPages';
import { logInfo } from './logger';
import { supabaseAdmin } from './supabaseAdmin';

let ensured = false;

async function ensureBucket() {
  if (ensured) return;
  const supabase = supabaseAdmin();
  const { data } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
    if (error) throw error;
    logInfo('storage', `Created public bucket "${STORAGE_BUCKET}"`);
  }
  ensured = true;
}

/** Upload JPEG buffers under `<prefix>/slide_N.jpeg`, return public URLs in order. */
export async function uploadImages(buffers: Buffer[], prefix: string): Promise<string[]> {
  const host = await getConfig('image_host');
  if (host === 'github') {
    const urls = await uploadToGitHubPages(buffers, prefix);
    const live = await waitForPublicUrls(urls);
    if (!live) {
      throw new Error(
        'Ảnh đã đẩy lên GitHub nhưng chưa public (GitHub Pages cần thời gian build). Thử lại sau 1-2 phút.'
      );
    }
    return urls;
  }

  await ensureBucket();
  const supabase = supabaseAdmin();
  const urls: string[] = [];

  for (let i = 0; i < buffers.length; i++) {
    const path = `${prefix}/slide_${i + 1}.jpeg`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffers[i], { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  logInfo('storage', `Uploaded ${urls.length} images under ${prefix}/`);
  return urls;
}
