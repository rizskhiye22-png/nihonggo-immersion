// Terjemahan GRATIS tanpa API key:
// 1) Translator API bawaan Chrome/Edge (berjalan di perangkat, cepat, tanpa batas)
// 2) Cadangan: MyMemory (layanan publik gratis, ±5.000 karakter/hari per pengguna)
// Hasil disimpan di cache lokal agar tidak menerjemahkan hal yang sama dua kali.

type Lang = "ja" | "en" | "id";
type ChromeTranslator = { translate(text: string): Promise<string> };
type TranslatorStatic = {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(o: { sourceLanguage: string; targetLanguage: string }): Promise<ChromeTranslator>;
};

const CACHE_KEY = "themars:tr-cache";
let cache: Record<string, string> = {};
try {
  cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, string>;
} catch {
  cache = {};
}
let saveTimer: number | undefined;
const persist = () => {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 4000) for (const k of keys.slice(0, keys.length - 3000)) delete cache[k];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* penuh — abaikan */
    }
  }, 500);
};

const translators = new Map<string, Promise<ChromeTranslator | null>>();

function chromeTranslator(from: Lang, to: Lang) {
  const key = `${from}-${to}`;
  let p = translators.get(key);
  if (!p) {
    p = (async () => {
      const T = (globalThis as unknown as { Translator?: TranslatorStatic }).Translator;
      if (!T) return null;
      try {
        const a = await T.availability({ sourceLanguage: from, targetLanguage: to });
        if (a === "unavailable") return null;
        return await T.create({ sourceLanguage: from, targetLanguage: to });
      } catch {
        return null;
      }
    })();
    translators.set(key, p);
  }
  return p;
}

async function myMemory(text: string, from: Lang, to: Lang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Layanan terjemahan gratis sedang sibuk");
  const j = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
  const out = j.responseData?.translatedText;
  if (!out || j.responseStatus === 429 || /MYMEMORY WARNING/i.test(out)) throw new Error("Kuota terjemahan gratis harian habis");
  return out;
}

export async function translate(text: string, from: Lang = "ja", to: Lang = "id"): Promise<string> {
  const t = text.trim();
  if (!t) return "";
  const key = `${from}>${to}:${t}`;
  if (cache[key]) return cache[key];
  const tr = await chromeTranslator(from, to);
  const out = tr ? await tr.translate(t) : await myMemory(t, from, to);
  cache[key] = out;
  persist();
  return out;
}

export async function translateMany(lines: string[], from: Lang = "ja", to: Lang = "id") {
  const out: string[] = [];
  for (const l of lines) out.push(await translate(l, from, to));
  return out;
}

/** Arti kata dalam Bahasa Indonesia: terjemahkan arti JMdict (Inggris) → Indonesia. */
export function meaningId(glosses: string[]) {
  return translate(glosses.slice(0, 3).join("; "), "en", "id");
}

export const hasOnDeviceTranslator = () => "Translator" in globalThis;
