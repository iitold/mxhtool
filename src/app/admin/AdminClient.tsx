'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const STATUS_COLORS: Record<string, string> = {
  posted: 'bg-emerald-600',
  failed: 'bg-red-600',
  posting: 'bg-amber-600',
  rendering: 'bg-sky-600',
  pending: 'bg-slate-600'
};

export default function AdminClient(props: {
  email: string;
  posts: PostRow[];
  config: ConfigRow[];
  logs: LogRow[];
  rules: RuleRow[];
  enabledRules: string[];
}) {
  const router = useRouter();
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

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function toggleRule(id: string) {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const postedToday = props.posts.filter(
    (p) => p.status === 'posted' && p.posted_at && new Date(p.posted_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IT OLD — Content Factory</h1>
          <p className="text-sm text-slate-400">{props.email}</p>
        </div>
        <button onClick={signOut} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
          Đăng xuất
        </button>
      </header>

      {toast && <div className="card p-3 text-sm text-sky-300">{toast}</div>}

      {/* Actions */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-white">Hành động</h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy === 'force'}
            onClick={() => api('/api/actions/dispatch', { action: 'force' }, 'force')}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            🚀 Đăng ngay (bỏ qua giờ)
          </button>
          <button
            disabled={busy === 'auto'}
            onClick={() => api('/api/actions/dispatch', { action: 'auto' }, 'auto')}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            ⚙️ Chạy theo lịch
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Chủ đề tùy chọn (để trống = AI tự chọn)"
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
          />
          <button
            disabled={busy === 'topic' || !topic.trim()}
            onClick={() => api('/api/actions/dispatch', { action: 'topic', topic: topic.trim() }, 'topic')}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            Đăng chủ đề này
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Lệnh được gửi tới GitHub Actions — bài sẽ xuất hiện sau ~1-3 phút.
        </p>
      </section>

      {/* Connections */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-white">Kết nối tài khoản</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <a
            href="/api/tiktok/auth"
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold"
          >
            🔗 Kết nối TikTok (OAuth)
          </a>
          <span className="text-xs text-slate-500">
            Cần cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET trước.
          </span>
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
                api('/api/threads/token', { shortToken: threadsToken.trim(), userId: threadsUserId.trim() }, 'threads')
              }
              className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
            >
              Đổi token Threads
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Đã đăng hôm nay" value={String(postedToday)} />
        <Stat label="Tổng bài gần đây" value={String(props.posts.length)} />
        <Stat
          label="Thành công"
          value={String(props.posts.filter((p) => p.status === 'posted').length)}
        />
        <Stat label="Thất bại" value={String(props.posts.filter((p) => p.status === 'failed').length)} />
      </section>

      {/* Rules */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-white">Content Rules</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {props.rules.map((r) => (
            <label key={r.id} className="flex items-start gap-3 rounded-lg border border-slate-700 p-3 cursor-pointer">
              <input type="checkbox" checked={enabled.includes(r.id)} onChange={() => toggleRule(r.id)} className="mt-1" />
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
          className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
        >
          Lưu rules ({enabled.length})
        </button>
      </section>

      {/* Credentials */}
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-white">Credentials &amp; Secrets</h2>
          <p className="text-xs text-slate-500">
            Lưu vào Supabase (chỉ service-role đọc được). Bỏ trống = giữ nguyên giá trị cũ. Không hiển thị lại giá trị đã lưu.
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
          className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
        >
          Lưu credentials
        </button>
      </section>

      {/* Config */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-white">Cấu hình</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {Object.keys(config).map((key) => (
            <label key={key} className="block">
              <span className="block text-xs text-slate-400 mb-1">{key}</span>
              <input
                value={config[key]}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </label>
          ))}
        </div>
        <button
          disabled={busy === 'config'}
          onClick={() => api('/api/config', { values: config }, 'config')}
          className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
        >
          Lưu cấu hình
        </button>
      </section>

      {/* Posts */}
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
              {props.posts.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-2 pr-3">
                    <span className="block text-white">{p.title || p.topic}</span>
                    {p.error && <span className="block text-xs text-red-400">{p.error.slice(0, 120)}</span>}
                  </td>
                  <td className="text-slate-400">{p.rule_id}</td>
                  <td className="text-slate-400">{p.score?.overall ?? '-'}</td>
                  <td>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs text-white ${STATUS_COLORS[p.status] ?? 'bg-slate-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-slate-400 whitespace-nowrap">
                    {new Date(p.posted_at || p.created_at).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              {props.posts.length === 0 && (
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

      {/* Logs */}
      <section className="card p-5 space-y-2">
        <h2 className="font-semibold text-white">Log gần đây</h2>
        <div className="font-mono text-xs space-y-1 max-h-72 overflow-y-auto">
          {props.logs.map((l, i) => (
            <div key={i} className={l.level === 'error' ? 'text-red-400' : 'text-slate-400'}>
              {l.created_at.slice(11, 19)} [{l.level}] [{l.source}] {l.message}
            </div>
          ))}
        </div>
      </section>
    </main>
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
