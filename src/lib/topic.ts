/**
 * Topic generation with category rotation + semantic dedup.
 */
import { callAI, embed } from './ai';
import { getConfigBool, getConfigInt } from './config';
import { isDuplicateTopic, recentTopics } from './db';
import { logInfo } from './logger';
import { fetchTrends } from './trends';

const CATEGORIES = [
  '💻 Deep-dive ngôn ngữ: feature ít biết, so sánh thực tế, cơ chế bên trong',
  '🏗 Architecture & Patterns: design patterns, clean code, SOLID thực chiến',
  '⚡ Performance: bottleneck, profiling, tối ưu có số liệu',
  '🔒 Security: lỗ hổng phổ biến, footgun bảo mật, best practices',
  '🛠 DevOps: Docker, CI/CD, deploy, monitoring',
  '🗄 Database: query tuning, indexing, schema design',
  '🐛 Debug stories: lỗi production thật, postmortem',
  '🔧 Tools & Productivity: IDE, CLI, workflow automation',
  '🧪 Testing: unit/integration/TDD trong dự án thật',
  '🌐 API & System Design: REST vs GraphQL, caching, rate limiting',
  '🤖 AI-assisted coding: prompt cho code, review output AI',
  '📈 Career & Soft skills: code review, estimation, collaboration'
];

function cleanTopic(raw: string): string {
  return raw
    .replace(/^["'*`]+|["'*`]+$/g, '')
    .replace(/^(chủ đề|topic)\s*[:：]\s*/i, '')
    .split('\n')[0]
    .trim();
}

/**
 * Generate one fresh topic that passes dedup.
 */
export async function getNextTopic(): Promise<{ topic: string; embedding: number[] | null }> {
  const dedupDays = await getConfigInt('dedup_days', 90);
  const useTrends = await getConfigBool('trends_enabled', true);
  const maxAttempts = 5;

  const recent = await recentTopics(20);
  const recentList = recent.map((t) => `- ${t.topic}`).join('\n');
  const trends = useTrends ? await fetchTrends(20) : [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const topic = await generateTopic(recentList, trends, attempt > 0);
    const embedding = await embed(topic);
    const dup = await isDuplicateTopic(topic, embedding, dedupDays);

    if (!dup.duplicate) {
      logInfo('topic', `Unique topic: ${topic}`);
      return { topic, embedding };
    }
    logInfo('topic', `Duplicate (${dup.reason}): "${topic}" ~ "${dup.match}" — retry ${attempt + 1}`);
  }

  throw new Error(`Could not generate a unique topic after ${maxAttempts} attempts`);
}

async function generateTopic(
  recentList: string,
  trends: string[],
  forceDifferent: boolean
): Promise<string> {
  const prompt =
    'Kênh TikTok "IT OLD" — chia sẻ kiến thức lập trình cho dev Việt (đang học → 3 năm kinh nghiệm).\n\n' +
    'Tạo 1 chủ đề MỚI, có GÓC NHÌN CỤ THỂ cho video tiếp theo.\n\n' +
    'NHÓM CHỦ ĐỀ (chọn 1, ưu tiên nhóm chưa dùng gần đây):\n' +
    CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n') +
    '\n\n' +
    (trends.length
      ? `XU HƯỚNG DEV ĐANG ĐƯỢC BÀN (có thể lấy cảm hứng, KHÔNG copy tiêu đề):\n- ${trends.join('\n- ')}\n\n`
      : '') +
    (recentList
      ? `CHỦ ĐỀ ĐÃ ĐĂNG GẦN ĐÂY (TUYỆT ĐỐI không lặp ý tưởng):\n${recentList}\n\n`
      : '') +
    (forceDifferent ? 'Lần trước bị trùng — hãy chọn GÓC NHÌN KHÁC HẲN.\n\n' : '') +
    'YÊU CẦU:\n' +
    '- Cụ thể, KHÔNG chung chung (SAI: "5 tips JavaScript", ĐÚNG: "WeakMap — feature bị lãng quên nhưng cực mạnh").\n' +
    '- Thể hiện 1 insight/quan điểm, không chỉ liệt kê.\n' +
    '- Tiếng Việt tự nhiên, không hàn lâm, không trịch thượng.\n' +
    '- KHÔNG dùng từ "newbie", "người mới bắt đầu".\n' +
    '- CHỈ trả về 1 dòng chủ đề, không thêm gì.\n';

  const raw = await callAI(prompt, { temperature: 1.0 });
  const topic = cleanTopic(raw);
  if (!topic) throw new Error('AI returned an empty topic');
  return topic;
}
