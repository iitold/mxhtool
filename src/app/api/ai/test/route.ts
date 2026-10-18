import { NextResponse } from 'next/server';
import { embedModels, geminiKeys, geminiModels } from '@/lib/ai';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MAX_KEYS = 3;
const MAX_MODELS = 5;

interface ChatResult {
  kind: 'chat';
  keyLabel: string;
  model: string;
  ok: boolean;
  status: number;
  ms: number;
  error: string | null;
}
interface EmbedResult {
  kind: 'embed';
  keyLabel: string;
  model: string;
  ok: boolean;
  status: number;
  ms: number;
  dims: number | null;
  error: string | null;
}

function mask(key: string): string {
  if (key.length <= 10) return key.slice(0, 2) + '…';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

async function testChat(key: string, model: string): Promise<{ ok: boolean; status: number; error: string | null }> {
  const started = Date.now();
  try {
    const res = await fetch(`${API_BASE}${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 }
      })
    });
    const bodyText = await res.text();
    if (res.ok) {
      const json = JSON.parse(bodyText);
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { ok: false, status: res.status, error: 'Không có nội dung trả về' };
      return { ok: true, status: res.status, error: null };
    }
    let message = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(bodyText)?.error;
      if (err?.message) message = `${err.status ?? res.status}: ${err.message}`.slice(0, 240);
    } catch {
      message = `${message}: ${bodyText.slice(0, 160)}`;
    }
    return { ok: false, status: res.status, error: message };
  } catch (e: any) {
    return { ok: false, status: 0, error: `${e.message} (${Date.now() - started}ms)` };
  }
}

async function testEmbed(key: string, model: string): Promise<{ ok: boolean; status: number; dims: number | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${model}:embedContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: 'ping' }] },
        outputDimensionality: 768
      })
    });
    const bodyText = await res.text();
    if (res.ok) {
      const json = JSON.parse(bodyText);
      const values = json?.embedding?.values;
      if (!values?.length) return { ok: false, status: res.status, dims: null, error: 'Không có vector trả về' };
      return { ok: true, status: res.status, dims: values.length, error: null };
    }
    let message = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(bodyText)?.error;
      if (err?.message) message = `${err.status ?? res.status}: ${err.message}`.slice(0, 240);
    } catch {
      message = `${message}: ${bodyText.slice(0, 160)}`;
    }
    return { ok: false, status: res.status, dims: null, error: message };
  } catch (e: any) {
    return { ok: false, status: 0, dims: null, error: e.message };
  }
}

/** Tests each configured Gemini key/model pair so the UI can show what is alive. */
export async function POST() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const keys = (await geminiKeys()).slice(0, MAX_KEYS);
  if (keys.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Chưa có GEMINI_API_KEYS nào được cấu hình' },
      { status: 400 }
    );
  }

  const models = (await geminiModels()).slice(0, MAX_MODELS);
  const emodels = (await embedModels()).slice(0, 3);

  const chat: ChatResult[] = [];
  for (const key of keys) {
    for (const model of models) {
      const started = Date.now();
      const r = await testChat(key, model);
      chat.push({
        kind: 'chat',
        keyLabel: mask(key),
        model,
        ok: r.ok,
        status: r.status,
        ms: Date.now() - started,
        error: r.error
      });
    }
  }

  const primaryKey = keys[0];
  const embed: EmbedResult[] = [];
  for (const model of emodels) {
    const started = Date.now();
    const r = await testEmbed(primaryKey, model);
    embed.push({
      kind: 'embed',
      keyLabel: mask(primaryKey),
      model,
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      dims: r.dims,
      error: r.error
    });
  }

  const results = [...chat, ...embed];
  const passed = results.filter((r) => r.ok).length;

  return NextResponse.json({
    success: true,
    keyCount: keys.length,
    models,
    results,
    summary: { passed, total: results.length, anyOk: passed > 0 }
  });
}
