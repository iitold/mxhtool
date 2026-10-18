/**
 * Content generation + quality gate.
 * Produces title / slides / caption / keywords and self-scores the result,
 * regenerating when the score is below the configured threshold.
 */
import { callAIJson } from './ai';
import { getConfigInt } from './config';
import { logInfo, logWarn } from './logger';
import { CONTENT_RULES, CONTENT_STRUCTURE, QUALITY_RUBRIC, getRule, pickRule } from './rules';
import { parseSlide, slidesToText, type SlideSpec } from '@/render/blocks';

export interface QualityScore {
  specificity: number;
  correctness: number;
  non_obvious: number;
  actionable: number;
  hook: number;
  overall: number;
  issues: string[];
  fix: string;
}

export interface GeneratedContent {
  topic: string;
  rule_id: string;
  title: string;
  slides: SlideSpec[];
  caption: string;
  keywords: string[];
  score: QualityScore;
}

function removeEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
      ''
    )
    .trim();
}

const BLOCK_SCHEMA =
  'Mỗi slide là 1 object: { "title": "tiêu đề ngắn của slide", "blocks": [ ... ] }.\n' +
  'Chọn block phù hợp với nội dung — ĐA DẠNG giữa các slide, không slide nào chỉ toàn chữ:\n' +
  '- text:     { "type":"text", "bullets":["ý 1","ý 2"] }  (1-3 bullet, mỗi bullet 5-15 từ)\n' +
  '- code:     { "type":"code", "lang":"sql", "code":"SELECT ..." }\n' +
  '- diff:     { "type":"diff", "lang":"ts", "lines":["- dòng cũ","+ dòng mới","  giữ nguyên"] }\n' +
  '- compare:  { "type":"compare", "beforeTitle":"Trước","afterTitle":"Sau","before":["..."],"after":["..."] }\n' +
  '- steps:    { "type":"steps", "direction":"row","items":[{"label":"Bước","detail":"chi tiết ngắn"}] }\n' +
  '- table:    { "type":"table", "headers":["A","B"], "rows":[["1","2"]] }\n' +
  '- stat:     { "type":"stat", "items":[{"value":"12ms","label":"độ trễ sau tối ưu"}] }\n' +
  '- callout:  { "type":"callout", "variant":"tip|warn|info", "title":"","text":"..." }\n' +
  '- diagram join:  { "type":"diagram","variant":"join","leftLabel":"users","rightLabel":"orders",' +
  '"leftItems":["id","name"],"rightItems":["id","user_id"],"overlap":["users.id = orders.user_id"],"caption":"" }\n' +
  '- diagram venn:  { "type":"diagram","variant":"venn","leftLabel":"A","rightLabel":"B","overlap":["phần chung"] }\n' +
  '- diagram bars:  { "type":"diagram","variant":"bars","bars":[{"label":"MySQL","value":120,"max":150}] }\n\n';

function buildPrompt(topic: string, ruleId: string, minSlides: number, maxSlides: number): string {
  const rule = getRule(ruleId);
  return (
    'Bạn là dev có kinh nghiệm thực tế, chia sẻ kiến thức trên kênh TikTok "IT OLD".\n' +
    'Giọng: ngang hàng, thẳng thắn, tôn trọng. TUYỆT ĐỐI không tự xưng anh/chị, không dạy đời.\n' +
    'Đối tượng: developer Việt Nam.\n\n' +
    `── CONTENT RULE: ${rule.name} ──\n${rule.style}\n\n` +
    CONTENT_STRUCTURE +
    '\n' +
    `CHỦ ĐỀ: ${topic}\n\n` +
    'Trả về JSON CHÍNH XÁC theo format:\n' +
    '{\n' +
    '  "title": "tiêu đề bắt mắt, nêu rõ công nghệ/ngôn ngữ (tối đa 10 từ)",\n' +
    `  "topic": ${JSON.stringify(topic)},\n` +
    '  "slides": [\n' +
    '    { "title": "", "blocks": [ { "type":"text", "bullets":["hook theo phong cách ' + rule.id + '"] } ] },\n' +
    '    { "title": "Ý chính", "blocks": [ {"type":"text","bullets":["..."]}, {"type":"code","lang":"python","code":"..."} ] },\n' +
    '    { "title": "So sánh", "blocks": [ {"type":"compare","before":["..."],"after":["..."]} ] }\n' +
    '  ],\n' +
    '  "caption": "caption tự nhiên + hashtag (KHÔNG dùng emoji)",\n' +
    '  "keywords": ["kw1", "kw2", "kw3"]\n' +
    '}\n\n' +
    'CÁC LOẠI BLOCK (dùng đa dạng, mỗi slide 1-2 block):\n' +
    BLOCK_SCHEMA +
    'QUY TẮC BẮT BUỘC:\n' +
    `- ${minSlides}-${maxSlides} slides.\n` +
    '- Slide đầu là HOOK (chỉ 1 block text, 1-2 câu). Slide cuối có CTA.\n' +
    '- Mỗi slide giữa chỉ 1 ý chính. Tối đa 1 code/diff block mỗi slide.\n' +
    '- Dùng compare hoặc diff khi nói before/after. Dùng diagram join khi nói JOIN/quan hệ bảng. Dùng bars khi so sánh số liệu. Dùng steps khi nói quy trình.\n' +
    '- Mỗi object trong "lines" của diff PHẢI bắt đầu bằng "-", "+" hoặc \" \".\n' +
    '- BẮT BUỘC dùng đúng ngôn ngữ trong lang: sql, ts, python, bash...\n' +
    '- KHÔNG dùng emoji. KHÔNG ghi "Slide N:". KHÔNG dùng markdown ``` trong code.\n' +
    '- Code PHẢI production-grade: không foo/bar, hello world, biến vô nghĩa.\n' +
    '- Nếu title có con số, số ý trong slides PHẢI khớp. Không hứa nhiều hơn thực có.\n' +
    '- CHỈ trả về JSON, không giải thích.\n'
  );
}

interface RawContent {
  title?: string;
  topic?: string;
  slides?: SlideSpec[];
  caption?: string;
  keywords?: string[];
}

function normalizeSlides(input: unknown[]): SlideSpec[] {
  const specs: SlideSpec[] = [];
  for (const s of input) {
    const spec = parseSlide(s);
    if (spec.title) spec.title = spec.title.replace(/^Slide\s*\d+\s*[:：]\s*/i, '').trim();
    if (spec.blocks.length) specs.push(spec);
  }
  return specs;
}

function validateContent(raw: RawContent, topic: string, minSlides: number, maxSlides: number): RawContent {
  if (!raw || typeof raw !== 'object') throw new Error('AI returned invalid content');
  if (!Array.isArray(raw.slides)) throw new Error('Content has no slides array');

  // Strip emojis from every string field before validating.
  try {
    raw = JSON.parse(removeEmojis(JSON.stringify(raw)));
  } catch {
    /* keep original if round-trip fails */
  }

  const slides = normalizeSlides(raw.slides!);
  if (slides.length < minSlides) {
    throw new Error(`Only ${slides.length} slides (min ${minSlides})`);
  }
  slides.length = Math.min(slides.length, maxSlides);

  const rawTitle = removeEmojis((raw.title || topic).trim()).slice(0, 120);
  let caption = removeEmojis((raw.caption || rawTitle).trim());
  if (!caption.includes('#')) caption += ' #coding #programming #tech #developer #tips';

  const fixed = fixTitleNumber(rawTitle, slides);
  return { title: fixed.title, topic, slides: fixed.slides, caption, keywords: raw.keywords ?? [] };
}

/** If the title promises "5 X" but there are fewer items, fix the title/hook. */
function fixTitleNumber(title: string, slides: SlideSpec[]): { title: string; slides: SlideSpec[] } {
  const m = title.match(
    /(\d+)\s*(?:thủ thuật|mẹo|tips?|sai lầm|lỗi|errors?|giải pháp|bước|steps?|cách|tricks?|hàm|functions?|công cụ|tools?|lý do|reasons?|điều|things?|kỹ thuật|techniques?|quy tắc|rules?|điểm|points?|vấn đề|issues?)/i
  );
  if (!m) return { title, slides };
  const promised = parseInt(m[1], 10);
  const actual = Math.max(0, slides.length - 2); // minus hook + CTA
  if (!Number.isFinite(promised) || promised <= actual || actual <= 0) return { title, slides };

  const fixedTitle = title.replace(m[1], String(actual));
  const fixedSlides = slides.slice();
  const hook = fixedSlides[0];
  if (hook) {
    fixedSlides[0] = {
      ...hook,
      title: hook.title?.replace(new RegExp(`\\b${promised}\\b`, 'g'), String(actual)),
      blocks: hook.blocks.map((b) =>
        b.type === 'text'
          ? { ...b, bullets: (b.bullets ?? []).map((x) => x.replace(new RegExp(`\\b${promised}\\b`, 'g'), String(actual))) }
          : b
      )
    };
  }
  logInfo('content', `Fixed title number: ${promised} → ${actual}`);
  return { title: fixedTitle, slides: fixedSlides };
}

async function scoreContent(content: RawContent, topic: string): Promise<QualityScore> {
  const prompt =
    'Bạn là senior engineer khó tính, review nội dung cho kênh TikTok dev Việt.\n' +
    CONTENT_STRUCTURE +
    '\n' +
    QUALITY_RUBRIC +
    '\n' +
    `CHỦ ĐỀ: ${topic}\n` +
    `TIÊU ĐỀ: ${content.title}\n` +
    `NỘI DUNG SLIDES:\n${slidesToText(content.slides ?? []).join('\n---\n')}\n` +
    `CAPTION: ${content.caption}\n`;

  try {
    const score = await callAIJson<QualityScore>(prompt, { temperature: 0.2, maxTokens: 2048 });
    const overall = Number(score.overall) || 0;
    return { ...score, overall } as QualityScore;
  } catch {
    return {
      specificity: 0,
      correctness: 0,
      non_obvious: 0,
      actionable: 0,
      hook: 0,
      overall: 0,
      issues: ['scoring failed'],
      fix: ''
    };
  }
}

export async function generateContent(topic: string, enabledRuleIds: string[]): Promise<GeneratedContent> {
  const minSlides = await getConfigInt('slides_per_post_min', 3);
  const maxSlides = await getConfigInt('slides_per_post_max', 5);
  const threshold = await getConfigInt('quality_threshold', 7);
  const maxAttempts = 3;

  let best: GeneratedContent | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rule = pickRule(enabledRuleIds);
    logInfo('content', `Attempt ${attempt + 1}: rule=${rule.id}`);

    const raw = await callAIJson<RawContent>(buildPrompt(topic, rule.id, minSlides, maxSlides), {
      temperature: 0.85,
      maxTokens: 8192
    });

    const validated = validateContent(raw, topic, minSlides, maxSlides);
    const title = validated.title!;

    const score = await scoreContent(validated, topic);
    logInfo('content', `Score: ${score.overall}/10`, { issues: score.issues });

    const result: GeneratedContent = {
      topic,
      rule_id: rule.id,
      title,
      slides: validated.slides!,
      caption: validated.caption!,
      keywords: validated.keywords!,
      score
    };

    if (!best || score.overall > best.score.overall) best = result;
    if (score.overall >= threshold) return result;

    logWarn('content', `Below threshold (${score.overall} < ${threshold}), regenerating`);
  }

  logWarn('content', `Using best result with score ${best!.score.overall}`);
  return best!;
}

export const ALL_RULE_IDS = Object.keys(CONTENT_RULES);
