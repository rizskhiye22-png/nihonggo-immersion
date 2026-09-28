// Penerjemah LOKAL bawaan browser (Translator API di Chrome/Edge desktop terbaru).
// Berjalan di perangkat pengguna: gratis, tanpa API key, tanpa server THE MARS.
// Paket bahasa diunduh sekali oleh browser saat pertama dipakai.
// Hasil disimpan di cache lokal agar tidak menerjemahkan hal yang sama dua kali.
import { useEffect, useState } from "react";

export type Lang = "ja" | "en" | "id";
type Availability = "unavailable" | "downloadable" | "downloading" | "available";
type ChromeTranslator = { translate(text: string): Promise<string> };
type TranslatorStatic = {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(o: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<ChromeTranslator>;
};

const API = () => (globalThis as unknown as { Translator?: TranslatorStatic }).Translator;
export const translatorSupported = () => !!API();

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
      /* penyimpanan penuh — abaikan */
    }
  }, 500);
};

const translators = new Map<string, Promise<ChromeTranslator>>();

export class TranslatorUnavailable extends Error {}

/**
 * Siapkan penerjemah. Pemanggilan pertama sebaiknya dari klik tombol, karena browser
 * mungkin perlu mengunduh paket bahasa (butuh gestur pengguna).
 */
export function getTranslator(from: Lang, to: Lang, onProgress?: (pct: number) => void) {
  const key = `${from}-${to}`;
  let p = translators.get(key);
  if (!p) {
    p = (async () => {
      const T = API();
      if (!T) throw new TranslatorUnavailable("Penerjemah lokal butuh Chrome atau Edge versi desktop terbaru.");
      const a = await T.availability({ sourceLanguage: from, targetLanguage: to });
      if (a === "unavailable") throw new TranslatorUnavailable(`Pasangan bahasa ${from}→${to} belum didukung browser ini.`);
      return T.create({
        sourceLanguage: from,
        targetLanguage: to,
        monitor: (m) =>
          m.addEventListener("downloadprogress", (e) => onProgress?.(Math.round(((e as unknown as { loaded: number }).loaded ?? 0) * 100))),
      });
    })();
    p.catch(() => translators.delete(key));
    translators.set(key, p);
  }
  return p;
}

export async function translate(text: string, from: Lang = "ja", to: Lang = "id"): Promise<string> {
  const t = text.trim();
  if (!t) return "";
  const key = `${from}>${to}:${t}`;
  if (cache[key]) return cache[key];
  const tr = await getTranslator(from, to);
  const out = await tr.translate(t);
  cache[key] = out;
  persist();
  return out;
}

export async function translateMany(lines: string[], from: Lang = "ja", to: Lang = "id") {
  const out: string[] = [];
  for (const l of lines) out.push(await translate(l, from, to));
  return out;
}

/** Arti kata dalam Bahasa Indonesia: arti kamus JMdict (Inggris) diterjemahkan lokal ke Indonesia. */
export function meaningId(glosses: string[]) {
  return translate(glosses.slice(0, 3).join("; "), "en", "id");
}

/** Status penerjemah untuk ditampilkan di UI. */
export function useTranslatorStatus(from: Lang = "ja", to: Lang = "id") {
  const [status, setStatus] = useState<Availability | "unsupported" | "checking">("checking");
  useEffect(() => {
    const T = API();
    if (!T) return setStatus("unsupported");
    let alive = true;
    T.availability({ sourceLanguage: from, targetLanguage: to }).then(
      (a) => alive && setStatus(a),
      () => alive && setStatus("unavailable"),
    );
    return () => {
      alive = false;
    };
  }, [from, to]);
  return status;
}
