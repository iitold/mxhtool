/**
 * AI engine — Gemini with 2-tier fallback (models x keys) and embeddings.
 * Ported from the Apps Script version.
 */
import { env, envList } from './env';
import { getSecret } from './secrets';
import { logInfo, logError } from './logger';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Fallback chain: newer/stronger models first, weaker/high-quota ones last.
 * Only models with a non-zero quota AND that support generateContent.
 * (Gemma 4 and gemini-2.5-flash-lite are excluded — see /api/ai/test.)
 */
const DEFAULT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
].join(',');
const DEFAULT_EMBED_MODELS = 'gemini-embedding-001,gemini-embedding-2';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  models?: string[];
}

export function geminiKeysFromEnv(): string[] {
  const keys = envList('GEMINI_API_KEYS');
  const single = env('GEMINI_API_KEY');
  if (single) keys.push(single);
  return [...new Set(keys)];
}

/**
 * Gemini keys, DB-configured values take priority over env so they can be
 * managed from the web UI.
 */
export async function geminiKeys(): Promise<string[]> {
  const multi = await getSecret('GEMINI_API_KEYS');
  const single = await getSecret('GEMINI_API_KEY');
  const keys = [
    ...multi
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    ...(single ? [single] : []),
    ...geminiKeysFromEnv()
  ];
  return [...new Set(keys)];
}

/** Fallback model chain: DB override → env → built-in default. */
export async function geminiModels(): Promise<string[]> {
  const fromDb = await getSecret('GEMINI_MODELS');
  return splitList(fromDb || env('GEMINI_MODELS', DEFAULT_MODELS));
}

/** Embedding model chain (each tried in order until one works). */
export async function embedModels(): Promise<string[]> {
  const fromDb = await getSecret('GEMINI_EMBED_MODELS');
  const list = splitList(fromDb || env('GEMINI_EMBED_MODELS', ''));
  if (list.length) return list;
  const single = env('GEMINI_EMBED_MODEL', '');
  return single ? [single] : splitList(DEFAULT_EMBED_MODELS);
}

type ErrorAction = 'SWITCH_MODEL' | 'SWITCH_KEY' | 'RETRY';

function classify(err: any): ErrorAction {
  const code = err?.statusCode ?? 0;
  if (code === 429) return 'SWITCH_MODEL';
  if (code === 401 || code === 403) return 'SWITCH_KEY';
  if (code >= 500) return 'RETRY';
  return 'SWITCH_MODEL';
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  json: boolean
): Promise<string> {
  const url = `${API_BASE}${model}:generateContent?key=${apiKey}`;

  const attempt = (useJson: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(useJson ? { responseMimeType: 'application/json' } : {})
        }
      })
    });

  let res = await attempt(json);
  let bodyText = await res.text();

  // Some models (e.g. Gemma) don't support responseMimeType — retry without it.
  if (!res.ok && json && res.status === 400) {
    res = await attempt(false);
    bodyText = await res.text();
  }

  if (!res.ok) {
    const err: any = new Error(`Gemini API ${res.status}: ${bodyText.slice(0, 300)}`);
    err.statusCode = res.status;
    throw err;
  }

  const json2 = JSON.parse(bodyText);
  const candidate = json2?.candidates?.[0];
  if (!candidate) throw new Error('Empty response from Gemini (no candidates)');
  if (candidate.finishReason === 'SAFETY') throw new Error('Blocked by safety filter');
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty content in Gemini response');
  return text as string;
}

export async function callAI(prompt: string, opts: CallOptions = {}): Promise<string> {
  const keys = await geminiKeys();
  if (keys.length === 0) throw new Error('No GEMINI_API_KEYS configured');

  const models = opts.models?.length ? opts.models : await geminiModels();
  const temperature = opts.temperature ?? 0.85;
  const maxTokens = opts.maxTokens ?? 8192;

  let lastError: Error | null = null;

  for (const key of keys) {
    for (const model of models) {
      try {
        logInfo('ai', `Trying ${model}`);
        return await callGemini(key, model, prompt, temperature, maxTokens, opts.json === true);
      } catch (e: any) {
        lastError = e;
        const action = classify(e);
        logError('ai', `${model} failed: ${e.message}`, { action });
        if (action === 'RETRY') {
          try {
            await new Promise((r) => setTimeout(r, 2000));
            return await callGemini(key, model, prompt, temperature, maxTokens, opts.json === true);
          } catch (e2: any) {
            lastError = e2;
            logError('ai', `Retry failed: ${e2.message}`);
          }
        }
        if (action === 'SWITCH_KEY') break;
      }
    }
  }

  throw new Error(`All AI attempts failed. Last error: ${lastError?.message ?? 'unknown'}`);
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export async function callAIJson<T = any>(prompt: string, opts: CallOptions = {}): Promise<T> {
  const text = await callAI(prompt, { ...opts, json: true });
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/** Gemini text embedding (768 dims, matches the pgvector column). Returns null if unavailable. */
export async function embed(text: string): Promise<number[] | null> {
  const key = (await geminiKeys())[0];
  if (!key) return null;

  const models = await embedModels();
  for (const model of models) {
    try {
      const res = await fetch(`${API_BASE}${model}:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          outputDimensionality: 768
        })
      });
      if (!res.ok) {
        logError('ai', `embed ${model} failed: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      const values = json?.embedding?.values ?? null;
      if (values?.length) return values as number[];
    } catch (e: any) {
      logError('ai', `embed ${model} error: ${e.message}`);
    }
  }
  return null;
}
