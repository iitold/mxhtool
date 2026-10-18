'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Palette,
  FileText,
  SlidersHorizontal,
  Plug,
  ScrollText,
  Rocket,
  CalendarClock,
  Send,
  LogOut,
  Link2,
  KeyRound,
  Save,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { CONFIG_GROUPS, type ConfigField } from '@/lib/configSchema';
import { THEMES, THEME_KEYS, resolveTheme, CUSTOM_COLOR_FIELDS } from '@/render/theme';
import { resolveLayout } from '@/render/layout';
import { buildPreviewDocument } from '@/render/preview';

interface PostRow {
  id: string;
  topic: string;
  title: string | null;
  status: string;
  rule_id: string | null;
  score: any;
  image_urls: string[] | null;
  posted_at: string | null;
  error: string | null;
  created_at: string;
}
interface ConfigRow {
  key: string;
  value: string;
}
interface LogRow {
  level: string;
  source: string | null;
  message: string | null;
  created_at: string;
}
interface RuleRow {
  id: string;
  name: string;
  desc: string;
}

interface AiTestRow {
  kind: 'chat' | 'embed';
  keyLabel: string;
  model: string;
  ok: boolean;
  status: number;
  ms: number;
  dims?: number | null;
  error: string | null;
}
interface AiTestResponse {
  success: boolean;
  error?: string;
  keyCount?: number;
  models?: string[];
  results?: AiTestRow[];
  summary?: { passed: number; total: number; anyOk: boolean };
}

type TabId = 'overview' | 'appearance' | 'content' | 'settings' | 'connections' | 'logs';

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'appearance', label: 'Giao diện', icon: Palette },
  { id: 'content', label: 'Nội dung', icon: FileText },
  { id: 'settings', label: 'Cấu hình', icon: SlidersHorizontal },
  { id: 'connections', label: 'Kết nối', icon: Plug },
  { id: 'logs', label: 'Nhật ký', icon: ScrollText }
];

const STATUS_COLORS: Record<string, string> = {
  posted: 'bg-emerald-600',
  failed: 'bg-red-600',
  posting: 'bg-amber-600',
  rendering: 'bg-sky-600',
  pending: 'bg-slate-600'
};

const SAMPLE_SLIDES = [
  'Bạn có biết WeakMap có thể chống memory leak mà bạn không ngờ tới?',
  'Cache theo object\n• Cho phép key là object bị thu hồi tự động\n```js\nconst cache = new WeakMap();\ncache.set(node, computed);\n```',
  'Vì sao quan trọng\n• Map giữ reference nên object không bao giờ bị GC\n• WeakMap để GC dọn khi không còn ai tham chiếu',
  'Kết luận\n• Dùng WeakMap cho cache gắn với object\n• Save lại để dùng khi cần!'
];
const SAMPLE_TITLE = 'WeakMap trong JavaScript';
const PREVIEW_W = 300;

export default function AdminClient(props: {
  email: string;
  posts: PostRow[];
  config: ConfigRow[];
  logs: LogRow[];
  rules: RuleRow[];
  enabledRules: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('overview');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [topic, setTopic] = useState('');
  const [config, setConfig] = useState<Record<string, string>>(
    useMemo(() => Object.fromEntries(props.config.map((c) => [c.key, c.value])), [props.config])
  );
  const [enabled, setEnabled] = useState<string[]>(props.enabledRules);
  const [threadsToken, setThreadsToken] = useState('');
  const [threadsUserId, setThreadsUserId] = useState('');
  const [secrets, setSecrets] = useState<{ key: string; set: boolean }[]>([]);
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiResult, setAiResult] = useState<AiTestResponse | null>(null);

  function setValue(key: string, value: string) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function loadSecrets() {
    try {
      const res = await fetch('/api/secrets');
      const json = await res.json();
      if (json.success) setSecrets(json.secrets);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadSecrets();
  }, []);

  async function saveSecrets() {
    setBusy('secrets');
    setToast('');
    try {
      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: secretInputs })
      });
      const json = await res.json();
      setToast(json.message ?? json.error ?? 'Xong');
      setSecretInputs({});
      await loadSecrets();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setBusy('');
    }
  }

  async function api(url: string, body: unknown, key: string) {
    setBusy(key);
    setToast('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      setToast(json.message ?? json.error ?? (json.success ? 'OK' : 'Xong'));
      router.refresh();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setBusy('');
    }
  }

  async function runAiTest() {
    setAiTesting(true);
    setToast('');
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' });
      const json: AiTestResponse = await res.json();
      setAiResult(json);
      if (!json.success) setToast(json.error ?? 'Kiểm tra thất bại');
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setAiTesting(false);
    }
  }

  async function signOut() {    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function toggleRule(id: string) {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const postedToday = props.posts.filter(
    (p) =>
      p.status === 'posted' && p.posted_at && new Date(p.posted_at).toDateString() === new Date().toDateString()
  ).length;

  const appearanceGroup = CONFIG_GROUPS.find((g) => g.id === 'appearance')!;
  const layoutFields = appearanceGroup.fields.filter(
    (f) => f.key !== 'color_theme' && !f.key.startsWith('custom_color_')
  );
  const contentGroup = CONFIG_GROUPS.find((g) => g.id === 'content')!;
  const scheduleGroup = CONFIG_GROUPS.find((g) => g.id === 'schedule')!;
  const publishingGroup = CONFIG_GROUPS.find((g) => g.id === 'publishing')!;

  const previewDoc = useMemo(() => {
    const theme = resolveTheme(config.color_theme ?? 'dark_slate', config);
    const layout = resolveLayout(config);
    const width = Number(config.slide_width_px) || 1080;
    const height = Number(config.slide_height_px) || 1920;
    return buildPreviewDocument({
      slides: SAMPLE_SLIDES,
      title: SAMPLE_TITLE,
      theme,
      layout,
      footerHandle: config.footer_handle || '@it.old',
      width,
      height,
      activeIndex: previewIndex
    });
  }, [config, previewIndex]);

  const previewWidth = Number(config.slide_width_px) || 1080;
  const previewHeight = Number(config.slide_height_px) || 1920;
  const previewScale = PREVIEW_W / previewWidth;

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">IT OLD — Content Factory</h1>
          <p className="text-sm text-slate-400">{props.email}</p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {toast && <div className="card p-3 text-sm text-sky-300">{toast}</div>}

      {tab === 'overview' && (
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Hành động</h2>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy === 'force'}
                onClick={() => api('/api/actions/dispatch', { action: 'force' }, 'force')}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
              >
                <Rocket size={16} /> Đăng ngay
              </button>
              <button
                disabled={busy === 'auto'}
                onClick={() => api('/api/actions/dispatch', { action: 'auto' }, 'auto')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
              >
                <CalendarClock size={16} /> Chạy theo lịch
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Chủ đề tùy chọn (để trống = AI tự chọn)"
                className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
              />
              <button
                disabled={busy === 'topic' || !topic.trim()}
                onClick={() => api('/api/actions/dispatch', { action: 'topic', topic: topic.trim() }, 'topic')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
              >
                <Send size={16} /> Đăng chủ đề này
              </button>
            </div>
            <p className="text-xs text-slate-500">Lệnh gửi tới GitHub Actions — bài xuất hiện sau ~1-3 phút.</p>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Đã đăng hôm nay" value={String(postedToday)} />
            <Stat label="Tổng bài gần đây" value={String(props.posts.length)} />
            <Stat label="Thành công" value={String(props.posts.filter((p) => p.status === 'posted').length)} />
            <Stat label="Thất bại" value={String(props.posts.filter((p) => p.status === 'failed').length)} />
          </section>

          <PostsTable posts={props.posts} />
        </div>
      )}

      {tab === 'appearance' && (
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Bảng màu</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {THEME_KEYS.map((key) => {
                const theme = typeof key === 'string' && key !== 'custom' ? THEMES[key] : null;
                const active = (config.color_theme ?? 'dark_slate') === key;
                return (
                  <button
                    key={key}
                    onClick={() => setValue('color_theme', key)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {(theme
                        ? [theme.bg, theme.accent1, theme.accent2, theme.accent3]
                        : ['#0b1220', '#60a5fa', '#fb923c', '#34d399']
                      ).map((c, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-black/20"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-300">{theme?.name ?? 'Tùy chỉnh'}</span>
                  </button>
                );
              })}
            </div>

            {config.color_theme === 'custom' && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-800 pt-4">
                {CUSTOM_COLOR_FIELDS.map((f) => (
                  <ColorInput
                    key={f.key}
                    label={f.label}
                    value={config[f.key] || f.default}
                    onChange={(v) => setValue(f.key, v)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Bố cục</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {layoutFields.map((f) => (
                <FieldInput key={f.key} field={f} value={config[f.key] ?? ''} onChange={(v) => setValue(f.key, v)} />
              ))}
            </div>
          </section>

          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Xem trước</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={previewIndex === 0}
                  className="rounded-lg border border-slate-700 p-1.5 disabled:opacity-40 hover:bg-slate-800"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-400">
                  {previewIndex + 1}/{SAMPLE_SLIDES.length}
                </span>
                <button
                  onClick={() => setPreviewIndex((i) => Math.min(SAMPLE_SLIDES.length - 1, i + 1))}
                  disabled={previewIndex === SAMPLE_SLIDES.length - 1}
                  className="rounded-lg border border-slate-700 p-1.5 disabled:opacity-40 hover:bg-slate-800"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div
              className="overflow-hidden rounded-lg border border-slate-700"
              style={{ width: PREVIEW_W, height: Math.round(previewHeight * previewScale) }}
            >
              <iframe
                title="preview"
                srcDoc={previewDoc}
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  border: 0
                }}
              />
            </div>
          </section>

          <SaveButton busy={busy} onClick={() => api('/api/config', { values: config }, 'config')} />
        </div>
      )}

      {tab === 'content' && (
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Content Rules</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {props.rules.map((r) => (
                <label
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-700 p-3 cursor-pointer hover:border-slate-500"
                >
                  <input
                    type="checkbox"
                    checked={enabled.includes(r.id)}
                    onChange={() => toggleRule(r.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">{r.name}</span>
                    <span className="block text-xs text-slate-400">{r.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              disabled={busy === 'rules' || enabled.length === 0}
              onClick={() => api('/api/rules', { ids: enabled }, 'rules')}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
            >
              <Save size={16} /> Lưu rules ({enabled.length})
            </button>
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Thiết lập nội dung</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {contentGroup.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={config[f.key] ?? ''} onChange={(v) => setValue(f.key, v)} />
              ))}
            </div>
            <SaveButton busy={busy} onClick={() => api('/api/config', { values: config }, 'config')} />
          </section>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          <ConfigSection group={scheduleGroup} config={config} onChange={setValue} />
          <ConfigSection group={publishingGroup} config={config} onChange={setValue} />
          <SaveButton busy={busy} onClick={() => api('/api/config', { values: config }, 'config')} />
        </div>
      )}

      {tab === 'connections' && (
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Kết nối tài khoản</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href="/api/tiktok/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold"
              >
                <Link2 size={16} /> Kết nối TikTok (OAuth)
              </a>
              <span className="text-xs text-slate-500">Cần TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET trước.</span>
            </div>
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <p className="text-xs text-slate-400">
                Threads: dán token ngắn hạn từ Graph API Explorer để đổi thành long-lived (60 ngày).
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={threadsUserId}
                  onChange={(e) => setThreadsUserId(e.target.value)}
                  placeholder="Threads User ID"
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                />
                <input
                  value={threadsToken}
                  onChange={(e) => setThreadsToken(e.target.value)}
                  placeholder="Short-lived token"
                  className="flex-1 min-w-[220px] rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                />
                <button
                  disabled={busy === 'threads' || !threadsToken.trim()}
                  onClick={() =>
                    api(
                      '/api/threads/token',
                      { shortToken: threadsToken.trim(), userId: threadsUserId.trim() },
                      'threads'
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
                >
                  <RefreshCw size={16} /> Đổi token
                </button>
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <KeyRound size={16} /> Credentials &amp; Secrets
              </h2>
              <p className="text-xs text-slate-500">
                Lưu vào Supabase (chỉ service-role đọc). Bỏ trống = giữ nguyên. Không hiển thị lại giá trị đã lưu.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {secrets.map((s) => (
                <label key={s.key} className="block">
                  <span className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${s.set ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    {s.key}
                  </span>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={s.set ? '•••••••• (đã lưu)' : 'chưa cấu hình'}
                    value={secretInputs[s.key] ?? ''}
                    onChange={(e) => setSecretInputs((v) => ({ ...v, [s.key]: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </label>
              ))}
              {secrets.length === 0 && <p className="text-sm text-slate-500">Đang tải…</p>}
            </div>
            <button
              disabled={busy === 'secrets'}
              onClick={saveSecrets}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
            >
              <Save size={16} /> Lưu credentials
            </button>
          </section>

          <section className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <Zap size={16} /> Kiểm tra AI
                </h2>
                <p className="text-xs text-slate-500">
                  Gọi thử từng API key × model để biết cái nào còn sống. Có thể tốn vài request quota.
                </p>
              </div>
              <button
                disabled={aiTesting}
                onClick={runAiTest}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
              >
                <Zap size={16} /> {aiTesting ? 'Đang kiểm tra…' : 'Kiểm tra'}
              </button>
            </div>

            {aiResult?.success && aiResult.results && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-400">
                    Key kiểm tra: <b className="text-white">{aiResult.keyCount}</b>
                  </span>
                  <span className={aiResult.summary?.anyOk ? 'text-emerald-400' : 'text-red-400'}>
                    {aiResult.summary?.passed}/{aiResult.summary?.total} OK
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500">
                      <tr className="text-left">
                        <th className="py-1 pr-4 font-medium">Loại</th>
                        <th className="py-1 pr-4 font-medium">Key</th>
                        <th className="py-1 pr-4 font-medium">Model</th>
                        <th className="py-1 pr-4 font-medium">Kết quả</th>
                        <th className="py-1 font-medium">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {aiResult.results.map((r, i) => (
                        <tr key={i} className="border-t border-slate-800">
                          <td className="py-1.5 pr-4 text-slate-400">{r.kind === 'embed' ? 'embed' : 'chat'}</td>
                          <td className="py-1.5 pr-4 text-slate-400">{r.keyLabel}</td>
                          <td className="py-1.5 pr-4 text-white">{r.model}</td>
                          <td className="py-1.5 pr-4">
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                r.ok ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  r.ok ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              {r.ok ? 'OK' : `Lỗi ${r.status || ''}`}
                            </span>
                          </td>
                          <td className="py-1.5 text-slate-500">
                            {r.ok
                              ? `${r.ms}ms${r.kind === 'embed' && r.dims ? ` · ${r.dims} chiều` : ''}`
                              : r.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">
                  Gợi ý: <b className="text-slate-300">429</b> = key còn sống nhưng hết quota (bình thường, sẽ tự đổi
                  model). <b className="text-slate-300">400/403</b> = key sai hoặc bị chặn. <b className="text-slate-300">404</b> =
                  tên model không tồn tại.
                </p>
              </div>
            )}

            {aiResult && !aiResult.success && (
              <p className="text-sm text-red-400">{aiResult.error}</p>
            )}
          </section>
        </div>
      )}

      {tab === 'logs' && (
        <section className="card p-5 space-y-2">
          <h2 className="font-semibold text-white">Log gần đây</h2>
          <div className="font-mono text-xs space-y-1 max-h-[32rem] overflow-y-auto">
            {props.logs.map((l, i) => (
              <div key={i} className={l.level === 'error' ? 'text-red-400' : 'text-slate-400'}>
                {l.created_at.slice(11, 19)} [{l.level}] [{l.source}] {l.message}
              </div>
            ))}
            {props.logs.length === 0 && <p className="text-slate-500">Chưa có log.</p>}
          </div>
        </section>
      )}
    </main>
  );
}

function ConfigSection({
  group,
  config,
  onChange
}: {
  group: { id: string; title: string; desc?: string; fields: ConfigField[] };
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-white">{group.title}</h2>
        {group.desc && <p className="text-xs text-slate-500">{group.desc}</p>}
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {group.fields.map((f) => (
          <FieldInput key={f.key} field={f} value={config[f.key] ?? ''} onChange={(v) => onChange(f.key, v)} />
        ))}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: ConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputClass =
    'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:border-sky-500 outline-none';

  if (field.type === 'bool') {
    const on = value === 'true';
    return (
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2 cursor-pointer">
        <span className="text-sm text-slate-300">{field.label}</span>
        <button
          type="button"
          onClick={() => onChange(on ? 'false' : 'true')}
          className={`relative h-6 w-11 flex-none rounded-full transition-colors ${on ? 'bg-sky-600' : 'bg-slate-700'}`}
          aria-pressed={on}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="block text-xs text-slate-400 mb-1">{field.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help && <span className="block text-xs text-slate-600 mt-1">{field.help}</span>}
      </label>
    );
  }

  if (field.type === 'color') {
    return <ColorInput label={field.label} value={value} onChange={onChange} />;
  }

  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1">{field.label}</span>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        min={field.min}
        max={field.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {field.help && <span className="block text-xs text-slate-600 mt-1">{field.help}</span>}
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 flex-none rounded border border-slate-700 bg-slate-900"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
        />
      </div>
    </label>
  );
}

function SaveButton({ busy, onClick }: { busy: string; onClick: () => void }) {
  return (
    <button
      disabled={busy === 'config'}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
    >
      <Save size={16} /> Lưu cấu hình
    </button>
  );
}

function PostsTable({ posts }: { posts: PostRow[] }) {
  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Bài đăng gần đây</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="py-2">Chủ đề</th>
              <th>Rule</th>
              <th>Điểm</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-2 pr-3">
                  <span className="block text-white">{p.title || p.topic}</span>
                  {p.error && <span className="block text-xs text-red-400">{p.error.slice(0, 120)}</span>}
                </td>
                <td className="text-slate-400">{p.rule_id}</td>
                <td className="text-slate-400">{p.score?.overall ?? '-'}</td>
                <td>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs text-white ${
                      STATUS_COLORS[p.status] ?? 'bg-slate-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="text-slate-400 whitespace-nowrap">
                  {new Date(p.posted_at || p.created_at).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Chưa có bài nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
