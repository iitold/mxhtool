/**
 * Local render test: `npm run render:test`
 * Writes PNGs to ./renders so you can eyeball the slide design.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderSlides } from '../src/render/renderSlides';

const sample = {
  title: 'WeakMap trong JavaScript',
  themeKey: process.env.THEME ?? 'dark_slate',
  footerHandle: '@it.old',
  slides: [
    'Bạn có biết WeakMap có thể chống memory leak mà bạn không ngờ tới?',
    'Cache theo object\n• WeakMap cho phép key là object bị thu hồi tự động\n```js\nconst cache = new WeakMap();\ncache.set(node, computed);\n```',
    'Vì sao quan trọng\n• Map giữ reference → object không bao giờ bị GC\n• WeakMap để GC dọn khi không còn ai tham chiếu',
    'Kết luận\n• Dùng WeakMap cho cache gắn với object\n• Save lại để dùng khi cần!'
  ]
};

async function main() {
  const buffers = await renderSlides(sample);
  mkdirSync('renders', { recursive: true });
  buffers.forEach((buf, i) => {
    const path = `renders/slide_${i + 1}.jpeg`;
    writeFileSync(path, buf);
    console.log(`Wrote ${path} (${Math.round(buf.length / 1024)} KB)`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
