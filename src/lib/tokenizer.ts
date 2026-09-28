// Tokenisasi teks Jepang di browser (kuromoji) — berjalan di Web Worker agar UI tetap lancar.
// Kamus ±12 MB dimuat sekali lalu disimpan di cache browser.
import { groupTokens, type RawToken, type Word } from "./japanese.ts";
import { attachDictIds } from "./dict.ts";

export type TokenizerStatus = "idle" | "loading" | "ready" | "error";

let worker: Worker | null = null;
let status: TokenizerStatus = "idle";
let seq = 0;
const pending = new Map<number, { resolve: (r: RawToken[][]) => void; reject: (e: Error) => void }>();
const listeners = new Set<(s: TokenizerStatus) => void>();

const setStatus = (s: TokenizerStatus) => {
  status = s;
  listeners.forEach((l) => l(s));
};

export const tokenizerStatus = () => status;
export function onTokenizerStatus(l: (s: TokenizerStatus) => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getWorker() {
  if (worker) return worker;
  setStatus("loading");
  worker = new Worker("/workers/kuromoji-worker.js");
  worker.onmessage = (e: MessageEvent<{ type?: string; id?: number; result?: RawToken[][]; error?: string }>) => {
    const m = e.data;
    if (m.type === "ready") return setStatus("ready");
    if (m.type === "fatal") {
      setStatus("error");
      for (const p of pending.values()) p.reject(new Error(m.error));
      pending.clear();
      worker?.terminate();
      worker = null; // coba lagi pada permintaan berikutnya
      return;
    }
    const p = m.id !== undefined ? pending.get(m.id) : undefined;
    if (!p) return;
    pending.delete(m.id!);
    if (m.error) p.reject(new Error(m.error));
    else p.resolve(m.result!);
  };
  worker.onerror = () => {
    setStatus("error");
    for (const p of pending.values()) p.reject(new Error("Tokenizer gagal dimuat"));
    pending.clear();
    worker = null;
  };
  return worker;
}

/** Mulai memuat tokenizer di latar belakang (tanpa menunggu). */
export function preloadTokenizer() {
  getWorker();
}

function tokenizeMany(texts: string[]) {
  return new Promise<RawToken[][]>((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, texts });
  });
}

/** Pecah teks per kalimat (tetap mempertahankan tanda baca penutup). */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .flatMap((line) => line.match(/[^。！？!?]+[。！？!?」』）)]*|[^。！？!?]+$/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

const cache = new Map<string, Word[]>();

/** Analisis banyak teks sekaligus dalam satu kali kirim ke worker. */
export async function analyseMany(texts: string[]): Promise<Word[][]> {
  const missing = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (missing.length) {
    const raw = await tokenizeMany(missing);
    const grouped = raw.map(groupTokens);
    await Promise.all(grouped.map(attachDictIds));
    if (cache.size > 3000) cache.clear();
    missing.forEach((t, i) => cache.set(t, grouped[i]));
  }
  return texts.map((t) => cache.get(t)!);
}

export async function analyse(text: string): Promise<Word[]> {
  return (await analyseMany([text]))[0];
}
