// Utilitas bahasa Jepang yang dipakai bersama oleh skrip build (Node) dan browser.

/** Bagian teks dengan furigana opsional. `r` hanya ada bila `t` mengandung kanji. */
export type Seg = { t: string; r?: string };

/**
 * Satu kata yang sudah dikelompokkan (kata kerja + akhiran konjugasinya menjadi satu).
 * - s: bentuk yang tampil di teks
 * - b: bentuk kamus (dipakai untuk pencarian)
 * - f: segmen furigana (hanya bila ada kanji)
 * - d: id entri kamus (bila ditemukan)
 * - c: kelas — "w" kata isi, "p" partikel/kata fungsi, "x" simbol/spasi
 */
export type Word = { s: string; b: string; f?: Seg[]; d?: number; c: "w" | "p" | "x" };

/** Bentuk minimal token kuromoji yang kita butuhkan. */
export type RawToken = {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  basic_form: string;
  reading?: string;
};

const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆ヵヶ]/;

export const isKanji = (ch: string) => KANJI_RE.test(ch);
export const hasKanji = (s: string) => [...s].some(isKanji);
export const isJapanese = (s: string) => /[぀-ヿ㐀-鿿]/.test(s);

export function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Menyelaraskan cara baca (hiragana) dengan bentuk tertulis agar furigana
 * hanya muncul di atas kanji. Contoh: 食べる + たべる → [食(た)][べる].
 */
export function furigana(surface: string, reading: string): Seg[] {
  const hira = kataToHira(reading);
  if (!hasKanji(surface) || !hira) return [{ t: surface }];
  const runs: { t: string; kanji: boolean }[] = [];
  for (const ch of surface) {
    const k = isKanji(ch);
    const last = runs[runs.length - 1];
    if (last && last.kanji === k) last.t += ch;
    else runs.push({ t: ch, kanji: k });
  }
  const pattern = runs.map((r) => (r.kanji ? "(.+?)" : `(${escapeRe(kataToHira(r.t))})`)).join("");
  const m = new RegExp(`^${pattern}$`).exec(hira);
  if (!m) return [{ t: surface, r: hira }];
  return runs.map((r, i) => (r.kanji ? { t: r.t, r: m[i + 1] } : { t: r.t }));
}

const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞", "連体詞", "感動詞", "接頭詞"]);

function isInflectingHead(t: RawToken) {
  return t.pos === "動詞" || t.pos === "形容詞" || (t.pos === "名詞" && t.pos_detail_1 === "形容動詞語幹");
}

/** Apakah token `t` sebaiknya digabung ke kata sebelumnya (akhiran konjugasi, bantu, dsb.). */
function attaches(prevHead: RawToken, prev: RawToken, t: RawToken) {
  if (!isInflectingHead(prevHead)) return false;
  if (t.pos === "助動詞") return !["です", "だ"].includes(t.basic_form) || prevHead.pos !== "名詞";
  if (t.pos === "助詞" && t.pos_detail_1 === "接続助詞") return ["て", "で", "ば"].includes(t.surface_form);
  if (t.pos === "動詞" && (t.pos_detail_1 === "非自立" || t.pos_detail_1 === "接尾")) {
    return prev.pos === "助動詞" || (prev.pos === "助詞" && ["て", "で"].includes(prev.surface_form)) || prev.pos === "動詞";
  }
  if (t.pos === "形容詞" && t.pos_detail_1 === "非自立") return true;
  return false;
}

/** Mengubah token kuromoji menjadi daftar Word yang ramah pelajar. */
export function groupTokens(tokens: RawToken[]): Word[] {
  const out: Word[] = [];
  let head: RawToken | null = null;
  let prev: RawToken | null = null;
  for (const t of tokens) {
    const reading = t.reading && t.reading !== "*" ? t.reading : t.surface_form;
    const segs = furigana(t.surface_form, reading);
    const last = out[out.length - 1];
    if (head && prev && last && attaches(head, prev, t)) {
      last.s += t.surface_form;
      last.f = [...(last.f ?? [{ t: last.s.slice(0, -t.surface_form.length) }]), ...segs];
      prev = t;
      continue;
    }
    const base = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    const c: Word["c"] =
      t.pos === "記号" || /^\s+$/.test(t.surface_form) ? "x" : CONTENT_POS.has(t.pos) && t.pos_detail_1 !== "非自立" ? "w" : "p";
    const w: Word = { s: t.surface_form, b: base, c };
    if (hasKanji(t.surface_form)) w.f = segs;
    out.push(w);
    head = t;
    prev = t;
  }
  // Rapikan: buang furigana bila hasil gabungan tidak mengandung kanji
  for (const w of out) if (w.f && !w.f.some((s) => s.r)) delete w.f;
  return out;
}

/** Hash sederhana (FNV-1a) untuk membagi kamus ke beberapa berkas kecil. */
export function shardOf(key: string, shards = 256): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % shards;
}

/** Kunci pencarian kamus yang dinormalisasi (katakana → hiragana). */
export const dictKey = (s: string) => kataToHira(s.trim());
