/**
 * Layout options for slides (size, alignment, bullet style, toggles, font).
 * Isomorphic: safe to import from both the renderer and the admin UI.
 */
export type BulletStyle = 'dot' | 'number' | 'arrow' | 'none';
export type ContentValign = 'center' | 'top';
export type CardFit = 'stretch' | 'hug';

export interface LayoutOptions {
  bulletStyle: BulletStyle;
  contentValign: ContentValign;
  cardFit: CardFit;
  showHeader: boolean;
  showLogo: boolean;
  showFooter: boolean;
  showSlideNumber: boolean;
  fontFamily: string;
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  bulletStyle: 'dot',
  contentValign: 'center',
  cardFit: 'hug',
  showHeader: true,
  showLogo: true,
  showFooter: true,
  showSlideNumber: true,
  fontFamily: 'Inter'
};

export const CARD_FITS: { value: CardFit; label: string }[] = [
  { value: 'stretch', label: 'Kéo đầy slide' },
  { value: 'hug', label: 'Vừa nội dung (thẻ gọn)' }
];

export const BULLET_STYLES: { value: BulletStyle; label: string }[] = [
  { value: 'dot', label: 'Chấm tròn' },
  { value: 'number', label: 'Số thứ tự' },
  { value: 'arrow', label: 'Mũi tên' },
  { value: 'none', label: 'Không dùng' }
];

export const CONTENT_VALIGNS: { value: ContentValign; label: string }[] = [
  { value: 'center', label: 'Căn giữa' },
  { value: 'top', label: 'Căn trên' }
];

export const FONT_OPTIONS = ['Inter', 'Be Vietnam Pro', 'Roboto', 'Lato', 'Montserrat', 'System'];

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function resolveLayout(cfg: Record<string, string> = {}): LayoutOptions {
  const bullet = (cfg.bullet_style ?? '').trim() as BulletStyle;
  const valign = (cfg.content_valign ?? '').trim() as ContentValign;
  const fit = (cfg.card_fit ?? '').trim() as CardFit;
  return {
    bulletStyle: ['dot', 'number', 'arrow', 'none'].includes(bullet) ? bullet : DEFAULT_LAYOUT.bulletStyle,
    contentValign: ['center', 'top'].includes(valign) ? valign : DEFAULT_LAYOUT.contentValign,
    cardFit: ['stretch', 'hug'].includes(fit) ? fit : DEFAULT_LAYOUT.cardFit,
    showHeader: bool(cfg.show_header, DEFAULT_LAYOUT.showHeader),
    showLogo: bool(cfg.show_logo, DEFAULT_LAYOUT.showLogo),
    showFooter: bool(cfg.show_footer, DEFAULT_LAYOUT.showFooter),
    showSlideNumber: bool(cfg.show_slide_number, DEFAULT_LAYOUT.showSlideNumber),
    fontFamily: (cfg.font_family ?? '').trim() || DEFAULT_LAYOUT.fontFamily
  };
}

/** HTML for a single bullet marker. `i` is the 0-based index within the slide. */
export function bulletMarker(style: BulletStyle, i: number): string {
  switch (style) {
    case 'number':
      return `<span class="dot num">${String(i + 1).padStart(2, '0')}</span>`;
    case 'arrow':
      return `<span class="dot arrow">&rarr;</span>`;
    case 'none':
      return '';
    case 'dot':
    default:
      return `<span class="dot">&bull;</span>`;
  }
}
