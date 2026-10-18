# IT OLD Content Factory (v2)

Tự động tạo **topic → nội dung → ảnh slides → đăng TikTok / Facebook / Threads**, chạy hoàn toàn trên hạ tầng miễn phí, **không cần thẻ tín dụng**.

Thay thế hệ Google Apps Script cũ, khắc phục: giới hạn 6 phút, ghi log vào Sheet, trigger 30', thiếu lock, endpoint công khai không bảo mật.

## Kiến trúc

```
GitHub Actions (cron 30') ──► Node pipeline
                                 ├─ Duyệt topic (Gemini + pgvector dedup + trends)
                                 ├─ Sinh content + quality gate (tự chấm điểm)
                                 ├─ Render slides bằng Playwright (HTML/CSS → JPEG)
                                 ├─ Upload Supabase Storage → URL công khai
                                 ├─ Đăng TikTok (carousel) + Facebook + Threads
                                 └─ Telegram notify + lưu metrics/state

Admin UI (Next.js @ Cloudflare Pages) ──► Supabase Auth + RLS
```

| Vai trò | Công nghệ | Free |
|---|---|---|
| Runner + scheduler | GitHub Actions | ✅ 2000 phút/tháng (repo private) |
| DB + Auth + Storage | Supabase | ✅ 500MB DB, 1GB storage |
| Admin UI/API | Next.js trên Cloudflare Pages | ✅ không giới hạn (Hobby) |
| AI | Google AI Studio (Gemini) | ✅ free tier |
| Ảnh | Playwright render | ✅ |
| Thông báo | Telegram | ✅ |

## Cấu trúc thư mục

```
src/lib/            # engine: ai, topic, content, dedup, publishers, pipeline
src/render/         # theme + HTML slide template + Playwright renderer
src/app/            # Next.js admin UI + API routes
scripts/            # pipeline entry, setup, render test
supabase/migrations # schema SQL
.github/workflows   # pipeline.yml, keepalive.yml, deploy-pages.yml
wrangler.toml       # Cloudflare Pages config (nodejs_compat)
```

## Cài đặt (khoảng 15 phút)

### 1. Supabase
1. Tạo project tại https://supabase.com (free, không cần thẻ).
2. SQL Editor → chạy lần lượt `supabase/migrations/0001_init.sql`, `0002_seed.sql`, `0003_secrets.sql`.
   - SQL Editor tự bật extension `vector` và `pgcrypto`.
3. Authentication → Users → **Add user** (email + mật khẩu) — đây là tài khoản admin.
4. Project Settings → API: lấy `Project URL`, `anon key`, `service_role key`.

### 2. Cấu hình môi trường
```bash
cp .env.example .env
# điền các giá trị
npm install
npm run setup        # kiểm tra env + tạo storage bucket
```

### 3. Chạy thử render ảnh (không cần đăng)
```bash
npm run render:test
open renders/        # xem thiết kế slide
```

### 4. Chạy pipeline một lần
```bash
npm run pipeline:force
```

### 5. Admin UI
```bash
npm run dev          # http://localhost:3000 → /login
```

Deploy lên **Cloudflare Pages** (khuyến nghị, `mxhtool.pages.dev`):
1. Tạo Pages project tên `mxhtool` (Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git). Chọn repo `iitold/mxhtool`, branch `main`.
2. **Build command**: `npx @cloudflare/next-on-pages` — **Output directory**: `.vercel/output/static`.
3. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_VERSION=20`.
4. Settings → Functions → **Compatibility flags** = `nodejs_compat` (đã khai báo trong `wrangler.toml`).

Hoặc deploy tự động bằng GitHub Actions (`deploy-pages.yml`): thêm repo secrets `CLOUDFLARE_API_TOKEN` (quyền *Cloudflare Pages: Edit*) và `CLOUDFLARE_ACCOUNT_ID`.
Chạy local: `npm run pages:build` rồi `npm run pages:preview`.

Cũng có thể deploy lên Vercel: import repo, thêm các biến trong `.env.example`.

### Đăng nhập Google (tùy chọn)
1. Google Cloud Console → tạo **OAuth client** (Web application). Authorized redirect URI = `https://qntfywlfodbpguxdsemi.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → **Google**: dán Client ID/Secret.
3. Supabase → Authentication → URL Configuration → thêm `https://mxhtool.pages.dev/auth/callback` vào *Redirect URLs*.
4. Trên `/login` bấm **Đăng nhập bằng Google** (hoặc dùng email/mật khẩu, magic link).

### Credentials trên web UI
Vào `/admin` → mục **Credentials & Secrets** để nhập/cập nhật mọi token (Gemini, TikTok, Facebook, Threads, Telegram, GitHub). Giá trị lưu trong bảng `app_secrets` (chỉ service-role đọc được) và **không hiển thị lại**; bỏ trống = giữ nguyên. Env vẫn được dùng làm fallback.

### 6. GitHub Actions
1. Push repo lên GitHub.
2. Settings → Secrets and variables → Actions: thêm các biến trong `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_*`, `TIKTOK_*`, `FB_*`, `THREADS_*`, `TELEGRAM_*`).
   ⚠️ **Không** đặt secret tên bắt đầu bằng `GITHUB_` — GitHub chặn (trùng quy ước với `GITHUB_TOKEN` hệ thống).
3. Nút "Đăng ngay" trên admin dùng `GITHUB_TOKEN` + `GITHUB_REPO` → nhập ở tab **Credentials & Secrets** trong `/admin` (lưu vào Supabase) hoặc đặt env var trên **Cloudflare Pages**, **không** phải GitHub Actions.
   Tạo **Personal Access Token** (quyền `actions:write` + `contents:read`, có thể kèm `workflow`) cho tài khoản `iitold`, `GITHUB_REPO=iitold/mxhtool`.
4. Chạy tay: Actions → **pipeline** → Run workflow (bật `force`).

> ⚠️ GitHub tắt scheduled workflow sau 60 ngày không commit — `keepalive.yml` tự commit mỗi tuần để tránh.

## Credentials từng nền tảng

**Gemini**: https://aistudio.google.com/apikey → dán nhiều key (cách nhau `,`) vào `GEMINI_API_KEYS` để tự xoay vòng khi hết quota.

**TikTok**: developers.tiktok.com → tạo app (Content Posting API). Lấy `client_key`/`client_secret`. Lấy access + refresh token qua OAuth. Với app chưa được duyệt, bài chỉ đăng ở chế độ `SELF_ONLY` (đặt trong config `tiktok_privacy`) — nhớ bật lại Public trên app TikTok sau khi đăng.

**Facebook**: Graph API Explorer → Page Access Token (`pages_manage_posts`, `pages_read_engagement`), lấy `FB_PAGE_ID`.

**Threads**: developers.facebook.com → Threads API → user id + long-lived token (hạn 60 ngày; dùng `refreshThreadsToken`).

## Content quality

- **Quality gate**: mỗi bài được AI chấm 5 tiêu chí (specificity, correctness, non_obvious, actionable, hook). Nếu dưới `quality_threshold` (mặc định 7) sẽ tự sinh lại (tối đa 3 lần).
- **Semantic dedup**: dùng embedding + pgvector, tránh cả trùng lặp "na ná" mà hash MD5 bỏ sót.
- **Trend-aware**: lấy Hacker News + GitHub trending làm cảm hứng (tắt bằng `trends_enabled=false`).
- **Verify code**: bật `VERIFY_CODE=true` để chạy `node --check` trên snippet JS trước khi đăng.

## Vận hành

- Đổi giờ đăng / số bài / theme ngay trên admin UI (bảng `config`).
- Xem trạng thái, điểm chất lượng, log tại dashboard.
- Sửa nội dung trước khi đăng: gọi `generateContent` trong một script riêng, hoặc thêm bước duyệt (bảng `posts.status`).

## Bảo mật

- Secrets nằm trong GitHub Secrets / Cloudflare Env / bảng `app_secrets` (RLS revoke) — **không** hardcode.
- RLS: ẩn key (`ai_keys` revoke), chỉ user đã đăng nhập đọc được dashboard.
- API route kiểm tra session (`requireUser`), không có endpoint log công khai.
