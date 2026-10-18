/**
 * Content rules (viral patterns) + the quality rubric used by the gate.
 */
export interface ContentRule {
  id: string;
  name: string;
  desc: string;
  style: string;
}

export const CONTENT_RULES: Record<string, ContentRule> = {
  myth_buster: {
    id: 'myth_buster',
    name: 'Myth Buster',
    desc: 'Phá bỏ hiểu lầm phổ biến bằng bằng chứng',
    style:
      'Slide 1 (HOOK): nêu 1 quan điểm SAI mà nhiều dev tin, kiểu "Nhiều người nghĩ X — nhưng thực tế khác hoàn toàn".\n' +
      'Slide 2..N: mỗi slide là 1 bằng chứng cụ thể (số liệu / code chạy được) vì sao nó sai.\n' +
      'Slide cuối: kết luận + key takeaway áp dụng được ngay.'
  },
  challenge: {
    id: 'challenge',
    name: 'Challenge',
    desc: 'Đố output — kích thích bình luận',
    style:
      'Slide 1 (HOOK): "Đoán output đoạn code này" hoặc "Kết quả bất ngờ hơn bạn nghĩ".\n' +
      'Slide 2: đoạn code BẮT BUỘC (code block) + câu hỏi.\n' +
      'Slide 3: gợi ý ngắn.\n' +
      'Slide cuối: reveal đáp án + giải thích cơ chế bên trong.'
  },
  before_after: {
    id: 'before_after',
    name: 'Before / After',
    desc: 'Refactor code trước/sau',
    style:
      'Slide 1 (HOOK): "Cùng refactor đoạn này".\n' +
      'Slide 2: code BAN ĐẦU (code block) + vấn đề cụ thể.\n' +
      'Slide 3: code SAU khi tối ưu (code block) + lý do từng thay đổi.\n' +
      'Slide cuối: tóm tắt lợi ích (đọc được / nhanh hơn / ít bug hơn).'
  },
  storytime: {
    id: 'storytime',
    name: 'Production Story',
    desc: 'Sự cố production thật + postmortem',
    style:
      'Slide 1 (HOOK): "Production sập vì..." hoặc "Sự cố tốn X giờ debug".\n' +
      'Slide 2..3: diễn biến (setup → sự cố) + code/log gây lỗi nếu có.\n' +
      'Slide cuối: root cause + cách phòng tránh + bài học.'
  },
  speed_run: {
    id: 'speed_run',
    name: 'Speed Run',
    desc: 'Code ngắn hơn nhưng đúng hơn',
    style:
      'Slide 1 (HOOK): "30 dòng còn 3 dòng" hoặc "1 hàm thay boilerplate".\n' +
      'Slide 2: code cách CŨ (code block).\n' +
      'Slide 3: code cách MỚI (code block) + giải thích tại sao an toàn hơn, không chỉ ngắn hơn.\n' +
      'Slide cuối: trick + khi nào KHÔNG nên dùng.'
  },
  hot_take: {
    id: 'hot_take',
    name: 'Hot Take',
    desc: 'Quan điểm có tranh luận nhưng có lý lẽ',
    style:
      'Slide 1 (HOOK): quan điểm mạnh có cơ sở ("Bạn có thể không cần ORM").\n' +
      'Slide 2..3: lý lẽ cụ thể + code minh hoạ.\n' +
      'Slide cuối: thừa nhận mặt ngược lại + mời debate.'
  },
  meme_explain: {
    id: 'meme_explain',
    name: 'Meme Explain',
    desc: 'Giải mã meme dev ẩn sau kiến thức',
    style:
      'Slide 1 (HOOK): mô tả 1 tình huống/meme quen thuộc của dev.\n' +
      'Slide 2: tại sao nó buồn cười-mà-chuẩn (liên hệ thực tế).\n' +
      'Slide 3: kiến thức thật đằng sau — bài học áp dụng được.\n' +
      'Slide cuối: CTA chia sẻ.'
  },
  salary_career: {
    id: 'salary_career',
    name: 'Career & Growth',
    desc: 'Career path, lương, kỹ năng thực chiến',
    style:
      'Slide 1 (HOOK): "1 năm vs 3 năm — gap thật sự là gì?".\n' +
      'Slide 2..3: phân tích cụ thể, có ví dụ/so sánh code nếu phù hợp.\n' +
      'Slide cuối: lời khuyên actionable làm được ngay.'
  }
};

export function getRule(id: string): ContentRule {
  return CONTENT_RULES[id] ?? CONTENT_RULES.myth_buster;
}

export function pickRule(enabledIds: string[]): ContentRule {
  const pool = enabledIds.map((id) => CONTENT_RULES[id]).filter(Boolean);
  const rules = pool.length > 0 ? pool : Object.values(CONTENT_RULES);
  return rules[Math.floor(Math.random() * rules.length)];
}

/**
 * Shared structure every post must follow. This is what separates a
 * "5 tips" listicle from content that a real dev saves.
 */
export const CONTENT_STRUCTURE = `
CẤU TRÚC BẮT BUỘC (đây là điều làm nội dung đáng lưu):
1. HOOK — tạo mâu thuẫn/tò mò trong 1 câu, không clickbait rỗng.
2. CONTEXT — tình huống thực tế khiến vấn đề này quan trọng.
3. CODE/CỤ THỂ — một ví dụ cụ thể (code BẮT BUỘC đúng ngôn ngữ và chạy được).
4. GOTCHA — chi tiết tinh tế mà 90% người làm sai hoặc bỏ qua.
5. TAKEAWAY — bài học áp dụng được ngay + CTA.

TECHNIQUES BẮT BUỘC (chọn ≥1):
- Nêu phiên bản/ngữ cảnh cụ thể (Python 3.12, Postgres 16, Node 20...) khi liên quan.
- Có số liệu thật khi nói về hiệu năng (ms, MB, số query).
- Chỉ ra "khi nào KHÔNG nên dùng" — thể hiện chiều sâu.
- Dẫn tên API/hàm/thuật toán chính xác, không nói chung chung.
`;

export const QUALITY_RUBRIC = `
Chấm điểm theo thang 0-10 cho các tiêu chí:
- specificity: ví dụ/ngữ cảnh cụ thể, không chung chung.
- correctness: code và khẳng định kỹ thuật chính xác, không sai.
- non_obvious: có insight bất ngờ, không phải thứ ai cũng biết.
- actionable: người xem làm được ngay sau khi đọc.
- hook: câu mở đầu đủ mạnh để giữ chân.
Trả về JSON: { "specificity": n, "correctness": n, "non_obvious": n, "actionable": n, "hook": n, "overall": n, "issues": ["..."], "fix": "gợi ý ngắn nếu điểm thấp" }
`;
