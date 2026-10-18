-- ============================================================
-- Seed default config. Safe to re-run (upsert, keeps existing).
-- ============================================================

insert into public.config (key, value, description) values
  ('post_times',          '06:45,12:15,19:30', 'Khung giờ đăng (HH:mm, cách nhau bởi dấu phẩy)'),
  ('max_posts_per_day',   '5',                 'Số bài tối đa mỗi ngày'),
  ('tiktok_privacy',      'SELF_ONLY',         'Quyền riêng tư TikTok: SELF_ONLY | PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS'),
  ('dedup_days',          '90',                'Số ngày chống trùng chủ đề'),
  ('slides_per_post_min', '3',                 'Số slide tối thiểu'),
  ('slides_per_post_max', '5',                 'Số slide tối đa'),
  ('words_per_slide_max', '80',                'Số từ tối đa mỗi slide'),
  ('content_language',    'vi',                'Ngôn ngữ nội dung'),
  ('color_theme',         'dark_slate',        'Bảng màu slide: dark_slate | light_blue | neon | sunset | ocean | custom'),
  ('footer_handle',       '@it.old',           'Handle hiển thị ở footer slide'),
  ('quality_threshold',   '7',                 'Điểm tối thiểu của quality gate (0-10). Thấp hơn sẽ sinh lại.'),
  ('enabled_content_rules',
   'myth_buster,challenge,before_after,storytime,speed_run,hot_take,meme_explain,salary_career',
   'Danh sách content rule đang bật (id, cách nhau dấu phẩy)'),
  ('trends_enabled',      'true',              'Dùng Hacker News + GitHub trending làm nguồn cảm hứng')
on conflict (key) do nothing;
