// Utilitas bersama untuk endpoint AI THE MARS (Cloudflare Pages Functions + Claude API).
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";

export type Env = {
  ANTHROPIC_API_KEY?: string;
  /** Model Claude yang dipakai. Default: claude-opus-5 */
  AI_MODEL?: string;
  /** Batas permintaan AI per IP per hari (butuh KV RATE_LIMIT). Default 60. */
  AI_DAILY_LIMIT?: string;
  RATE_LIMIT?: KVNamespace;
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function getClient(env: Env) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "Fitur AI belum dikonfigurasi. Tambahkan ANTHROPIC_API_KEY di pengaturan Cloudflare Pages.");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
}

export const modelOf = (env: Env) => env.AI_MODEL?.trim() || "claude-opus-5";

/** Parameter umum: fallback server-side (hanya untuk model yang mendukungnya). */
function withFallback(env: Env) {
  const model = modelOf(env);
  const supports = /^claude-(opus-5|fable-5)/.test(model);
  return supports ? { model, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : { model };
}

/** Pembatasan sederhana per IP per hari memakai KV (opsional). */
export async function rateLimit(request: Request, env: Env) {
  if (!env.RATE_LIMIT) return;
  const ip = request.headers.get("cf-connecting-ip") ?? "anon";
  const day = new Date().toISOString().slice(0, 10);
  const key = `rl:${day}:${ip}`;
  const limit = Number(env.AI_DAILY_LIMIT ?? 60);
  const used = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (used >= limit) throw new HttpError(429, `Batas harian AI (${limit} permintaan) tercapai. Coba lagi besok ya!`);
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });
}

export async function readJson<T>(request: Request, maxBytes = 64_000): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Permintaan terlalu besar.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "Format permintaan tidak valid.");
  }
}

type StreamInput = Pick<BetaMessageStreamParams, "system" | "messages"> & { effort?: "low" | "medium" | "high"; maxTokens?: number };

/** Mengalirkan jawaban Claude sebagai text/plain agar tampil kata demi kata di UI. */
export function streamText(env: Env, input: StreamInput) {
  const client = getClient(env);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          ...withFallback(env),
          max_tokens: input.maxTokens ?? 4000,
          thinking: { type: "adaptive" },
          output_config: { effort: input.effort ?? "low" },
          system: input.system,
          messages: input.messages,
        });
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") controller.enqueue(encoder.encode(ev.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\nMaaf, Sensei tidak bisa membantu permintaan ini."));
        else if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n…(jawaban dipotong)"));
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n⚠️ ${describeError(e)}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

/** Meminta keluaran JSON yang divalidasi skema (structured outputs). */
export async function structured<T>(env: Env, input: { system: string; user: string; schema: Record<string, unknown>; effort?: "low" | "medium" | "high"; maxTokens?: number }) {
  const client = getClient(env);
  const stream = client.beta.messages.stream({
    ...withFallback(env),
    max_tokens: input.maxTokens ?? 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: input.effort ?? "low", format: { type: "json_schema", schema: input.schema } },
    system: input.system,
    messages: [{ role: "user", content: input.user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new HttpError(422, "Permintaan ini tidak bisa diproses oleh AI.");
  if (msg.stop_reason === "max_tokens") throw new HttpError(502, "Jawaban AI terpotong. Coba dengan teks yang lebih pendek.");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(502, "AI mengembalikan format yang tidak terduga. Coba lagi.");
  }
}

export function describeError(e: unknown) {
  if (e instanceof HttpError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "Kunci API Anthropic tidak valid.";
  if (e instanceof Anthropic.RateLimitError) return "Layanan AI sedang sibuk. Coba lagi sebentar lagi.";
  if (e instanceof Anthropic.BadRequestError) return "Permintaan ke AI ditolak (periksa AI_MODEL).";
  if (e instanceof Anthropic.APIConnectionError) return "Tidak bisa terhubung ke layanan AI.";
  if (e instanceof Anthropic.APIError) return `Layanan AI error (${e.status}).`;
  return "Terjadi kesalahan tak terduga.";
}

export function errorResponse(e: unknown) {
  const status = e instanceof HttpError ? e.status : e instanceof Anthropic.APIError && e.status ? e.status : 500;
  return json({ error: describeError(e) }, status >= 400 && status < 600 ? status : 500);
}
