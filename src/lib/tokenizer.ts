// Tokenisasi teks Jepang di browser (kuromoji). Kamus ±12 MB dimuat sekali lalu di-cache browser.
import { groupTokens, type RawToken, type Word } from "./japanese.ts";
import { attachDictIds } from "./dict.ts";

type KuromojiTokenizer = { tokenize(text: string): RawToken[] };
type KuromojiGlobal = { builder(opts: { dicPath: string }): { build(cb: (err: unknown, t: KuromojiTokenizer) => void): void } };

let loading: Promise<KuromojiTokenizer> | null = null;
const listeners = new Set<(s: TokenizerStatus) => void>();
export type TokenizerStatus = "idle" | "loading" | "ready" | "error";
let status: TokenizerStatus = "idle";

const setStatus = (s: TokenizerStatus) => {
  status = s;
  listeners.forEach((l) => l(s));
};

export const tokenizerStatus = () => status;
export function onTokenizerStatus(l: (s: TokenizerStatus) => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if ((window as unknown as { kuromoji?: unknown }).kuromoji) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Gagal memuat tokenizer"));
    document.head.appendChild(el);
  });
}

export function getTokenizer() {
  if (!loading) {
    setStatus("loading");
    loading = loadScript("/vendor/kuromoji.js")
      .then(
        () =>
          new Promise<KuromojiTokenizer>((resolve, reject) => {
            const k = (window as unknown as { kuromoji: KuromojiGlobal }).kuromoji;
            k.builder({ dicPath: "/dict/kuromoji/" }).build((err, t) => (err ? reject(err) : resolve(t)));
          }),
      )
      .then((t) => {
        setStatus("ready");
        return t;
      })
      .catch((e) => {
        loading = null;
        setStatus("error");
        throw e;
      });
  }
  return loading;
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

export async function analyse(text: string): Promise<Word[]> {
  const hit = cache.get(text);
  if (hit) return hit;
  const t = await getTokenizer();
  const words = await attachDictIds(groupTokens(t.tokenize(text)));
  if (cache.size > 2000) cache.clear();
  cache.set(text, words);
  return words;
}
