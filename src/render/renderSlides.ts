/**
 * Playwright renderer — HTML/CSS → PNG buffers (one per slide).
 * Runs in Node (GitHub Actions), never on Cloudflare/Vercel.
 */
import { chromium } from 'playwright';
import { envInt } from '@/lib/env';
import { buildDocument } from './slideTemplate';
import type { Theme } from './theme';
import type { LayoutOptions } from './layout';

export interface RenderOptions {
  slides: string[];
  title: string;
  theme: Theme;
  layout: LayoutOptions;
  footerHandle: string;
  width?: number;
  height?: number;
  scale?: number;
}

export async function renderSlides(o: RenderOptions): Promise<Buffer[]> {
  const width = o.width ?? 1080;
  const height = o.height ?? 1920;
  const scale = o.scale ?? envInt('RENDER_SCALE', 2);

  const html = buildDocument({
    slides: o.slides,
    title: o.title,
    theme: o.theme,
    layout: o.layout,
    footerHandle: o.footerHandle,
    width,
    height
  });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: scale
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready.then(() => true));

    const count = await page.locator('.slide').count();
    const buffers: Buffer[] = [];
    for (let i = 0; i < count; i++) {
      // JPEG keeps files small and satisfies TikTok (JPEG/WebP only).
      buffers.push(
        await page.locator('.slide').nth(i).screenshot({ type: 'jpeg', quality: 92 })
      );
    }
    return buffers;
  } finally {
    await browser.close();
  }
}
