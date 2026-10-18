'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  const [sent, setSent] = useState(false);

  async function signInWithGoogle() {
    setLoading('google');
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` }
    });
    if (error) {
      setError(error.message);
      setLoading('');
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading('password');
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading('');
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  async function signInWithMagicLink() {
    if (!email) {
      setError('Nhập email trước đã.');
      return;
    }
    setLoading('magic');
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` }
    });
    setLoading('');
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8 space-y-4">
        <h1 className="text-xl font-bold text-white">mxht — Admin</h1>
        <p className="text-sm text-slate-400">Đăng nhập để quản lý nội dung.</p>

        <button
          onClick={signInWithGoogle}
          disabled={loading !== ''}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-50 py-2 font-semibold"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Đăng nhập bằng Google
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          hoặc
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <form onSubmit={signInWithPassword} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white outline-none focus:border-sky-500"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={loading !== ''}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 py-2 font-semibold text-white"
          >
            {loading === 'password' ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <button
          onClick={signInWithMagicLink}
          disabled={loading !== ''}
          className="w-full text-xs text-slate-400 hover:text-slate-200"
        >
          {sent ? '✅ Đã gửi link đăng nhập vào email' : 'Gửi magic link qua email'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
