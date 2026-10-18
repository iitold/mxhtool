import { NextResponse } from 'next/server';
import { embedModels, geminiKeyEntries, geminiModels } from '@/lib/ai';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'edge';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MAX_KEYS = 3;
const MAX_MODELS = 10;
const PING_TOKENS = 512;

interface ChatResult {
  kind: 'chat';
  keyLabel: string;
  keyLen: number;
  source: string;
  model: string;
  ok: boolean;
  status: number;
  ms: number;
  error: string | null;
}
interface EmbedResult {
  kind: 'embed';
  keyLabel: string;
  keyLen: number;
  source: string;
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

function parseError(res: Response, bodyText: string): string {
  let message = `HTTP ${res.status}`;
  try {
    const err = JSON.parse(bodyText)?.error;
    if (err?.message) message = `${err.status ?? res.status}: ${err.message}`.slice(0, 240);
  } catch {
    message = `${message}: ${bodyText.slice(0, 160)}`;
  }
  return message;
}

async function testChat(
  key: string,
  model: string
): Promise<{ ok: boolean; status: number; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say OK' }] }],
        // Gemini 3.x spend tokens "thinking" first, so give it a real budget.
        generationConfig: { temperature: 0, maxOutputTokens: PING_TOKENS }
      })
    });
    const bodyText = await res.text();
    if (!res.ok) return { ok: false, status: res.status, error: parseError(res, bodyText) };
    const json = JSON.parse(bodyText);
    const candidates = json?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { ok: false, status: res.status, error: `Không có candidate (finishReason: ${json?.candidates?.[0]?.finishReason ?? 'n/a'})` };
    }
    return { ok: true, status: res.status, error: null };
  } catch (e: any) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function testEmbed(
  key: string,
  model: string
): Promise<{ ok: boolean; status: number; dims: number | null; error: string | null }> {
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
    if (!res.ok) return { ok: false, status: res.status, dims: null, error: parseError(res, bodyText) };
    const json = JSON.parse(bodyText);
    const values = json?.embedding?.values;
    if (!values?.length) return { ok: false, status: res.status, dims: null, error: 'Không có vector trả về' };
    return { ok: true, status: res.status, dims: values.length, error: null };
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

  const entries = (await geminiKeyEntries()).slice(0, MAX_KEYS);
  if (entries.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Chưa có GEMINI_API_KEYS nào được cấu hình' },
      { status: 400 }
    );
  }

  const models = (await geminiModels()).slice(0, MAX_MODELS);
  const emodels = (await embedModels()).slice(0, 3);

  const chat: ChatResult[] = [];
  const liveKeys: string[] = [];
  for (const { key, source } of entries) {
    let keyAlive = false;
    for (const model of models) {
      const started = Date.now();
      const r = await testChat(key, model);
      if (r.ok) keyAlive = true;
      chat.push({
        kind: 'chat',
        keyLabel: mask(key),
        keyLen: key.length,
        source,
        model,
        ok: r.ok,
        status: r.status,
        ms: Date.now() - started,
        error: r.error
      });
    }
    if (keyAlive) liveKeys.push(key);
  }

  // Embeddings: test with a live key (fall back to the first since none may pass chat).
  const embedEntry = entries.find((e) => liveKeys.includes(e.key)) ?? entries[0];
  const embed: EmbedResult[] = [];
  for (const model of emodels) {
    const started = Date.now();
    const r = await testEmbed(embedEntry.key, model);
    embed.push({
      kind: 'embed',
      keyLabel: mask(embedEntry.key),
      keyLen: embedEntry.key.length,
      source: embedEntry.source,
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
    keyCount: entries.length,
    liveKeys: liveKeys.length,
    models,
    results,
    summary: { passed, total: results.length, anyOk: passed > 0, liveKeys: liveKeys.length }
  });
}
