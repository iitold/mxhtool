-- ============================================================
-- Appearance settings: color palettes + layout options.
-- Safe to re-run (insert ... on conflict do nothing — keeps existing values).
-- ============================================================

insert into public.config (key, value, description) values
  -- colors
  ('color_theme',             'dark_slate', 'Bảng màu: dark_slate | light_blue | neon | sunset | ocean | custom'),
  ('custom_color_bg',         '#0b1220',    'Màu nền (khi color_theme = custom)'),
  ('custom_color_card',       '#111a2e',    'Màu thẻ (custom)'),
  ('custom_color_card_border','#22304d',    'Màu viền thẻ (custom)'),
  ('custom_color_accent1',    '#60a5fa',    'Màu nhấn 1 (custom)'),
  ('custom_color_accent2',    '#fb923c',    'Màu nhấn 2 (custom)'),
  ('custom_color_accent3',    '#34d399',    'Màu nhấn 3 (custom)'),
  ('custom_color_title',      '#f1f5f9',    'Màu chữ tiêu đề (custom)'),
  ('custom_color_body',       '#cbd5e1',    'Màu chữ nội dung (custom)'),
  ('custom_color_muted',      '#94a3b8',    'Màu chữ mờ (custom)'),
  ('custom_color_code_bg',    '#0a0f1c',    'Màu nền code (custom)'),
  ('custom_color_code_text',  '#e2e8f0',    'Màu chữ code (custom)'),
  -- layout
  ('slide_width_px',          '1080',       'Chiều rộng slide (px)'),
  ('slide_height_px',         '1920',       'Chiều cao slide (px)'),
  ('font_family',             'Inter',      'Phông chữ slide'),
  ('bullet_style',            'dot',        'Kiểu bullet: dot | number | arrow | none'),
  ('content_valign',          'center',     'Căn nội dung: center | top'),
  ('show_header',             'true',       'Hiện tiêu đề đầu slide'),
  ('show_logo',               'true',       'Hiện logo'),
  ('show_footer',             'true',       'Hiện chân slide'),
  ('show_slide_number',       'true',       'Hiện số slide (badge)')
on conflict (key) do nothing;
