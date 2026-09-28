// Klien untuk endpoint AI di Cloudflare Pages Functions (/api/ai/*).
import type { Level } from "./types.ts";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class AiError extends Error {}

async function post(path: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(`/api/ai/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = `Layanan AI tidak tersedia (${res.status}).`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* respons bukan JSON */
    }
    if (res.status === 404) msg = "Endpoint AI belum aktif. Jalankan lewat Cloudflare Pages dengan ANTHROPIC_API_KEY (lihat README).";
    throw new AiError(msg);
  }
  return res;
}

/** Mengalirkan teks jawaban potong demi potong ke `onText`. Mengembalikan teks lengkap. */
export async function streamAi(path: "chat" | "explain", body: unknown, onText: (full: string) => void, signal?: AbortSignal) {
  const res = await post(path, body, signal);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

export type AiStory = { title: string; titleId: string; sentences: { ja: string; id: string }[] };

export async function generateStory(level: Level, topic: string, signal?: AbortSignal) {
  const res = await post("story", { level, topic }, signal);
  return (await res.json()) as AiStory;
}

export async function translateLines(lines: string[], level: Level, signal?: AbortSignal) {
  const res = await post("translate", { lines, level }, signal);
  return ((await res.json()) as { translations: string[] }).translations;
}
