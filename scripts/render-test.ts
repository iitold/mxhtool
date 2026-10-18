/**
 * Local render test: `npm run render:test`
 * Writes JPEGs to ./renders so you can eyeball the slide design.
 * Override theme with THEME=ocean npm run render:test
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderSlides } from '../src/render/renderSlides';
import { resolveTheme } from '../src/render/theme';
import { resolveLayout } from '../src/render/layout';

const themeKey = process.env.THEME ?? 'dark_slate';

const sample = {
  title: 'SQL JOIN trong PostgreSQL',
  theme: resolveTheme(themeKey, {}),
  layout: resolveLayout({ card_fit: process.env.CARD_FIT ?? '' }),
  footerHandle: '@it.old',
  slides: [
    { title: '', blocks: [{ type: 'text', bullets: ['90% bug báo cáo đến từ JOIN sai — không phải từ dữ liệu'] }] },
    {
      title: 'INNER JOIN là gì',
      blocks: [
        { type: 'text', bullets: ['Chỉ trả về bản ghi khớp ở cả hai bảng'] },
        {
          type: 'diagram',
          variant: 'join',
          title: 'users ⋈ orders',
          leftLabel: 'users',
          rightLabel: 'orders',
          leftItems: ['id  (PK)', 'full_name', 'email'],
          rightItems: ['id  (PK)', 'user_id  (FK)', 'total'],
          overlap: ['users.id = orders.user_id'],
          caption: 'INNER JOIN lấy phần giao'
        }
      ]
    },
    {
      title: 'Đọc kế hoạch thực thi',
      blocks: [
        {
          type: 'diff',
          lang: 'sql',
          lines: [
            '  EXPLAIN ANALYZE',
            '  SELECT u.full_name, o.total',
            '  FROM users u',
            '- JOIN orders o ON o.user_id = u.id',
            '+ JOIN orders o ON o.user_id = u.id AND o.status = \'paid\'',
            '  WHERE u.created_at > now() - interval \'30 days\';'
          ]
        },
        { type: 'callout', variant: 'warn', title: 'Cẩn thận', text: 'Điều kiện lọc đặt sau ON thay đổi ngữ nghĩa của LEFT JOIN.' }
      ]
    },
    {
      title: 'Các loại JOIN',
      blocks: [
        {
          type: 'table',
          headers: ['Loại', 'Giữ lại', 'Hàng NULL'],
          rows: [
            ['INNER', 'Chỉ khớp', 'Không'],
            ['LEFT', 'Toàn bộ bảng trái', 'Có'],
            ['RIGHT', 'Toàn bộ bảng phải', 'Có'],
            ['FULL', 'Cả hai bảng', 'Có']
          ]
        }
      ]
    },
    {
      title: 'Quy trình tối ưu',
      blocks: [
        {
          type: 'steps',
          direction: 'column',
          items: [
            { label: 'EXPLAIN ANALYZE', detail: 'Đo thật, đừng đoán' },
            { label: 'Đối chiếu index', detail: 'FK luôn cần index ở bảng con' },
            { label: 'Chuẩn hoá lại truy vấn', detail: 'Tránh JOIN không cần thiết' }
          ]
        }
      ]
    },
    {
      title: 'Kết quả',
      blocks: [
        {
          type: 'stat',
          items: [
            { value: '12ms', label: 'từ 480ms' },
            { value: '40x', label: 'nhanh hơn' }
          ]
        },
        {
          type: 'diagram',
          variant: 'bars',
          title: 'Thời gian truy vấn',
          bars: [
            { label: 'Trước', value: 480, max: 500 },
            { label: 'Sau', value: 12, max: 500 }
          ]
        }
      ]
    },
    {
      title: 'Map vs WeakMap',
      blocks: [
        {
          type: 'compare',
          beforeTitle: 'Trước',
          afterTitle: 'Sau',
          before: ['JOIN toàn bộ bảng', 'Full scan 1.2M dòng'],
          after: ['JOIN có index', 'Index scan 3.4k dòng']
        }
      ]
    },
    { title: '', blocks: [{ type: 'text', bullets: ['Lưu lại kẻo quên khi tối ưu query!'] }] },
    {
      title: 'Refactor truy vấn',
      blocks: [
        {
          type: 'code-compare',
          leftTitle: 'Trước',
          rightTitle: 'Sau',
          left: { lang: 'sql', code: 'SELECT *\nFROM users u\nJOIN orders o\n  ON o.user_id = u.id;' },
          right: { lang: 'sql', code: 'SELECT u.id, o.total\nFROM users u\nJOIN orders o\n  ON o.user_id = u.id\nWHERE o.status = \'paid\';' }
        }
      ]
    },
    {
      title: 'Lịch sử thay đổi',
      blocks: [
        {
          type: 'timeline',
          items: [
            { when: 'v1', label: 'Full scan', detail: '480ms, 1.2M dòng' },
            { when: 'v2', label: 'Thêm index FK', detail: '120ms' },
            { when: 'v3', label: 'Lọc sau JOIN', detail: '12ms' }
          ]
        }
      ]
    },
    {
      title: 'Tự thể hiện',
      blocks: [
        {
          type: 'raw',
          html: '<h3>Checklist review</h3><ul><li>JOIN có dùng index?</li><li>Có <strong>SELECT *</strong> không?</li><li>Điều kiện lọc đặt đúng chỗ?</li></ul>'
        }
      ]
    },
    {
      title: 'Ảnh minh hoạ',
      blocks: [{ type: 'image', url: 'https://picsum.photos/1200/800', caption: 'Kế hoạch thực thi trên EXPLAIN', fit: 'cover' }]
    }
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
