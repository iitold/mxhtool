/**
 * UI + validation schema for the `config` table. Isomorphic (no server deps).
 * The admin renders settings from these groups; the API validates keys against
 * ALL_FIELD_KEYS.
 */
export type FieldType = 'text' | 'number' | 'select' | 'bool' | 'color';

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface ConfigGroup {
  id: string;
  title: string;
  desc?: string;
  fields: ConfigField[];
}

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    id: 'schedule',
    title: 'Lịch đăng',
    desc: 'Thời điểm pipeline được phép đăng bài.',
    fields: [
      {
        key: 'post_times',
        label: 'Giờ đăng',
        type: 'text',
        help: 'Định dạng HH:MM, cách nhau bằng dấu phẩy. VD: 06:45,12:15,19:30'
      },
      { key: 'max_posts_per_day', label: 'Số bài tối đa / ngày', type: 'number', min: 1, max: 50 },
      { key: 'dedup_days', label: 'Chống trùng trong (ngày)', type: 'number', min: 0, max: 365 }
    ]
  },
  {
    id: 'content',
    title: 'Nội dung',
    desc: 'Cấu trúc bài viết, số slide, chất lượng.',
    fields: [
      {
        key: 'content_language',
        label: 'Ngôn ngữ',
        type: 'select',
        options: [
          { value: 'vi', label: 'Tiếng Việt' },
          { value: 'en', label: 'English' }
        ]
      },
      { key: 'slides_per_post_min', label: 'Số slide tối thiểu', type: 'number', min: 2, max: 10 },
      { key: 'slides_per_post_max', label: 'Số slide tối đa', type: 'number', min: 2, max: 10 },
      { key: 'words_per_slide_max', label: 'Số từ tối đa / slide', type: 'number', min: 20, max: 200 },
      {
        key: 'quality_threshold',
        label: 'Ngưỡng chất lượng (0-10)',
        type: 'number',
        min: 0,
        max: 10,
        help: 'Điểm AI tự chấm; dưới ngưỡng sẽ sinh lại.'
      },
      { key: 'trends_enabled', label: 'Dùng xu hướng (HN/GitHub)', type: 'bool' }
    ]
  },
  {
    id: 'appearance',
    title: 'Giao diện slide',
    desc: 'Màu sắc và bố cục của ảnh đăng.',
    fields: [
      {
        key: 'color_theme',
        label: 'Bảng màu',
        type: 'select',
        options: [
          { value: 'dark_slate', label: 'Dark Slate' },
          { value: 'light_blue', label: 'Light Blue' },
          { value: 'neon', label: 'Neon Purple' },
          { value: 'sunset', label: 'Sunset Vibes' },
          { value: 'ocean', label: 'Ocean Deep' },
          { value: 'custom', label: 'Tùy chỉnh (custom)' }
        ]
      },
      { key: 'custom_color_bg', label: 'Nền (custom)', type: 'color' },
      { key: 'custom_color_card', label: 'Thẻ (custom)', type: 'color' },
      { key: 'custom_color_card_border', label: 'Viền thẻ (custom)', type: 'color' },
      { key: 'custom_color_accent1', label: 'Nhấn 1 - tiêu đề (custom)', type: 'color' },
      { key: 'custom_color_accent2', label: 'Nhấn 2 - nhãn (custom)', type: 'color' },
      { key: 'custom_color_accent3', label: 'Nhấn 3 - badge (custom)', type: 'color' },
      { key: 'custom_color_title', label: 'Chữ tiêu đề (custom)', type: 'color' },
      { key: 'custom_color_body', label: 'Chữ nội dung (custom)', type: 'color' },
      { key: 'custom_color_muted', label: 'Chữ mờ (custom)', type: 'color' },
      { key: 'custom_color_code_bg', label: 'Nền code (custom)', type: 'color' },
      { key: 'custom_color_code_text', label: 'Chữ code (custom)', type: 'color' },
      {
        key: 'font_family',
        label: 'Phông chữ',
        type: 'select',
        options: ['Inter', 'Be Vietnam Pro', 'Roboto', 'Lato', 'Montserrat', 'System'].map((f) => ({
          value: f,
          label: f
        }))
      },
      { key: 'slide_width_px', label: 'Chiều rộng (px)', type: 'number', min: 720, max: 2160 },
      { key: 'slide_height_px', label: 'Chiều cao (px)', type: 'number', min: 720, max: 2400 },
      {
        key: 'bullet_style',
        label: 'Kiểu bullet',
        type: 'select',
        options: [
          { value: 'dot', label: 'Chấm tròn' },
          { value: 'number', label: 'Số thứ tự' },
          { value: 'arrow', label: 'Mũi tên' },
          { value: 'none', label: 'Không dùng' }
        ]
      },
      {
        key: 'content_valign',
        label: 'Căn nội dung',
        type: 'select',
        options: [
          { value: 'center', label: 'Giữa' },
          { value: 'top', label: 'Trên' }
        ]
      },
      {
        key: 'card_fit',
        label: 'Kiểu thẻ nội dung',
        type: 'select',
        help: 'Thẻ gọn = thẻ ôm sát nội dung, ít khoảng trống.',
        options: [
          { value: 'stretch', label: 'Kéo đầy slide' },
          { value: 'hug', label: 'Vừa nội dung (thẻ gọn)' }
        ]
      },
      { key: 'show_header', label: 'Hiện tiêu đề đầu slide', type: 'bool' },
      { key: 'show_logo', label: 'Hiện logo', type: 'bool' },
      { key: 'show_footer', label: 'Hiện chân slide', type: 'bool' },
      { key: 'show_slide_number', label: 'Hiện số slide (badge)', type: 'bool' },
      { key: 'footer_handle', label: 'Handle ở chân slide', type: 'text', help: 'VD: @it.old' }
    ]
  },
  {
    id: 'publishing',
    title: 'Xuất bản',
    fields: [
      {
        key: 'tiktok_privacy',
        label: 'Quyền riêng tư TikTok',
        type: 'select',
        help: 'App chưa được duyệt chỉ đăng được SELF_ONLY.',
        options: [
          { value: 'SELF_ONLY', label: 'Riêng tư (SELF_ONLY)' },
          { value: 'PUBLIC_TO_EVERYONE', label: 'Công khai' },
          { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Bạn bè' },
          { value: 'FOLLOWER_OF_CREATOR', label: 'Người theo dõi' }
        ]
      }
    ]
  }
];

export const ALL_FIELD_KEYS: string[] = CONFIG_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export function groupById(id: string): ConfigGroup | undefined {
  return CONFIG_GROUPS.find((g) => g.id === id);
}
