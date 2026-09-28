// Membangun seluruh data statis THE MARS ke public/ :
//  - kamus terbagi (JMdict via kotobako-data, CC BY-SA 4.0)
//  - daftar kosakata JLPT N5–N1 & kanji per level
//  - cerita & tata bahasa yang sudah ditokenisasi (kuromoji) lengkap dengan furigana
//  - salinan kuromoji + kamusnya untuk tokenisasi di browser (Pembaca Bebas & Studio Tonton)
import fs from "node:fs";
import path from "node:path";
import kuromoji from "kuromoji";
import { groupTokens, dictKey, shardOf, kataToHira, isKanji, type RawToken, type Word } from "../src/lib/japanese.ts";
import type { DictEntry, Level, Kanji } from "../src/lib/types.ts";
import { stories } from "../content/stories.ts";
import { grammar } from "../content/grammar.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public");
const t0 = Date.now();

const write = (rel: string, data: unknown) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

// ───────────────── 1. Kamus ─────────────────
type KVocab = { id: string; word: string; altWord: string | null; reading: string; meanings: string[]; pos: string; jlpt: string | null };
type KKanji = { char: string; meanings: string[]; onyomi: string[]; kunyomi: string[]; strokeCount: number; grade: number | null; jlpt: string | null; strokes?: string[] };
const kotobako = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/kotobako-data/kotobako-static.json"), "utf8")) as { datasets: { vocab: KVocab[]; kanji: KKanji[] } };

const lv = (s: string | null | undefined): Level | undefined => (s && /^N[1-5]$/.test(s) ? (Number(s[1]) as Level) : undefined);

const entries: DictEntry[] = kotobako.datasets.vocab.map((v) => {
  const e: DictEntry = { i: Number(v.id.replace(/\D/g, "")), w: v.word, r: v.reading, m: v.meanings.slice(0, 6), p: v.pos };
  if (v.altWord) e.a = v.altWord;
  const j = lv(v.jlpt);
  if (j) e.j = j;
  return e;
});
const byId = new Map(entries.map((e) => [e.i, e]));

// Lengkapi level JLPT (terutama N1) dari silabus JLPT 10k.
type SylItem = { type: string; word?: string; transcription?: string; category?: string; data?: { _order?: string }; children?: SylItem[] };
const syllabus = JSON.parse(
  fs.readFileSync(path.join(ROOT, "node_modules/@polyglot-bundles/ja-jlpt-syllabi/src/generated/jlpt-syllabus.json"), "utf8"),
) as SylItem;
const sylOrder = new Map<string, number>();
{
  const byWordReading = new Map<string, DictEntry[]>();
  for (const e of entries) {
    for (const w of [e.w, e.a]) if (w) {
      const k = `${w}|${kataToHira(e.r)}`;
      byWordReading.set(k, [...(byWordReading.get(k) ?? []), e]);
    }
  }
  const catLevel: Record<string, Level | undefined> = { n1: 1, n2: 2, n3: 3 };
  let n = 0;
  const walk = (node: SylItem) => {
    if (node.type === "vocabularyItem" && node.word) {
      n++;
      const found = byWordReading.get(`${node.word}|${kataToHira(node.transcription ?? "")}`);
      for (const e of found ?? []) {
        if (!sylOrder.has(String(e.i))) sylOrder.set(String(e.i), n);
        const l = catLevel[node.category ?? ""];
        if (!e.j && l) e.j = l;
      }
      return;
    }
    node.children?.forEach(walk);
  };
  walk(syllabus);
}

// Indeks kata → id, lalu dibagi ke 256 berkas kecil yang dimuat sesuai kebutuhan.
const index = new Map<string, number[]>();
const addKey = (k: string, id: number) => {
  const key = dictKey(k);
  const arr = index.get(key) ?? [];
  if (!arr.includes(id)) arr.push(id);
  index.set(key, arr);
};
for (const e of entries) {
  addKey(e.w, e.i);
  if (e.a) addKey(e.a, e.i);
  addKey(e.r, e.i);
}
// Urutkan kandidat: cocok persis dengan tulisan dulu, lalu yang punya level JLPT, lalu yang ada di silabus.
for (const [key, ids] of index) {
  ids.sort((x, y) => {
    const a = byId.get(x)!, b = byId.get(y)!;
    const exact = (e: DictEntry) => (dictKey(e.w) === key || (e.a && dictKey(e.a) === key) ? 0 : 1);
    return exact(a) - exact(b) || (a.j ? 0 : 1) - (b.j ? 0 : 1) || (sylOrder.get(String(a.i)) ?? 1e9) - (sylOrder.get(String(b.i)) ?? 1e9);
  });
  if (ids.length > 8) ids.length = 8;
}
{
  const shards = Array.from({ length: 256 }, () => ({ k: {} as Record<string, number[]>, e: {} as Record<number, DictEntry> }));
  for (const [key, ids] of index) {
    const s = shards[shardOf(key)];
    s.k[key] = ids;
    for (const id of ids) s.e[id] = byId.get(id)!;
  }
  fs.rmSync(path.join(OUT, "data/dict"), { recursive: true, force: true });
  shards.forEach((s, i) => write(`data/dict/${i}.json`, s));
}

function lookup(...keys: string[]): DictEntry | undefined {
  for (const k of keys) {
    const ids = index.get(dictKey(k));
    if (ids?.length) return byId.get(ids[0]);
  }
  return undefined;
}

// ───────────────── 2. Daftar JLPT & kanji ─────────────────
const levelCounts: Record<string, number> = {};
for (const l of [5, 4, 3, 2, 1] as Level[]) {
  const list = entries
    .filter((e) => e.j === l)
    .sort((a, b) => (sylOrder.get(String(a.i)) ?? 1e9) - (sylOrder.get(String(b.i)) ?? 1e9) || a.i - b.i)
    .map((e) => ({ i: e.i, w: e.w, r: e.r, m: e.m.slice(0, 3), p: e.p }));
  levelCounts[`n${l}`] = list.length;
  write(`data/jlpt/n${l}.json`, list);
}

// Data kanji memakai level JLPT lama (4 level): level 2 lama = N3 + N2.
const kanjiGroups: Record<string, Level[]> = { n5: [5], n4: [4], n3: [3, 2], n1: [1] };
const kanjiOld: Record<string, string> = { N5: "n5", N4: "n4", N3: "n3", N2: "n3", N1: "n1" };
const kanjiCounts: Record<string, number> = {};
{
  const vocabForKanji = new Map<string, DictEntry[]>();
  for (const e of entries) {
    if (!e.j) continue;
    for (const ch of new Set([...e.w].filter(isKanji))) {
      const arr = vocabForKanji.get(ch) ?? [];
      arr.push(e);
      vocabForKanji.set(ch, arr);
    }
  }
  const groups: Record<string, (Kanji & { x: [string, string, string][] })[]> = {};
  for (const k of kotobako.datasets.kanji) {
    const g = k.jlpt ? kanjiOld[k.jlpt] : undefined;
    if (!g) continue;
    const ex = (vocabForKanji.get(k.char) ?? [])
      .sort((a, b) => (b.j ?? 0) - (a.j ?? 0) || (sylOrder.get(String(a.i)) ?? 1e9) - (sylOrder.get(String(b.i)) ?? 1e9))
      .slice(0, 6)
      .map((e) => [e.w, e.r, e.m[0]] as [string, string, string]);
    const item = { c: k.char, m: k.meanings.slice(0, 4), on: k.onyomi, kun: k.kunyomi, n: k.strokeCount, g: k.grade ?? undefined, s: k.strokes, x: ex };
    (groups[g] ??= []).push(item);
  }
  for (const g of Object.keys(kanjiGroups)) {
    const list = (groups[g] ?? []).sort((a, b) => (a.g ?? 99) - (b.g ?? 99) || a.n - b.n);
    kanjiCounts[g] = list.length;
    write(`data/kanji/${g}.json`, list);
  }
}

// ───────────────── 3. Tokenisasi konten ─────────────────
const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) =>
  kuromoji.builder({ dicPath: path.join(ROOT, "node_modules/kuromoji/dict") }).build((err, t) => (err ? reject(err) : resolve(t))),
);

function analyse(text: string, glossary?: Record<string, DictEntry>): Word[] {
  const words = groupTokens(tokenizer.tokenize(text) as RawToken[]);
  for (const w of words) {
    if (w.c === "x") continue;
    const e = lookup(w.b, w.s);
    if (e) {
      w.d = e.i;
      if (glossary) glossary[e.i] = e;
    }
  }
  return words;
}

fs.rmSync(path.join(OUT, "data/stories"), { recursive: true, force: true });
const storyIndex = stories.map((s) => {
  const glossary: Record<string, DictEntry> = {};
  const sentences = s.sentences.map(([ja, id]) => ({ ja, id, w: analyse(ja, glossary) }));
  const chars = s.sentences.reduce((n, [ja]) => n + ja.length, 0);
  const meta = {
    id: s.id, level: s.level, title: s.title, titleId: s.titleId, topic: s.topic, summary: s.summary,
    minutes: Math.max(2, Math.round(chars / (s.level >= 4 ? 120 : 200) + s.sentences.length * 0.3)),
  };
  write(`data/stories/${s.id}.json`, { ...meta, sentences, glossary, keyVocab: s.keyVocab.map(([w, r, id]) => ({ w, r, id })) });
  return meta;
});
write("data/stories/index.json", storyIndex);

const grammarOut = grammar.map((g) => ({
  ...g,
  examples: g.examples.map(([marked, id]) => {
    const start = marked.indexOf("[[");
    const end = marked.indexOf("]]");
    const ja = marked.replace("[[", "").replace("]]", "");
    const ex: { ja: string; id: string; w: Word[]; blank?: [number, number] } = { ja, id, w: analyse(ja) };
    if (start >= 0 && end > start) ex.blank = [start, end - 2];
    return ex;
  }),
}));
write("data/grammar.json", grammarOut);

// ───────────────── 4. Kuromoji untuk browser ─────────────────
{
  let src = fs.readFileSync(path.join(ROOT, "node_modules/kuromoji/build/kuromoji.js"), "utf8");
  // Beberapa server (dan dev server Vite) mengirim .gz dengan Content-Encoding: gzip sehingga
  // browser sudah mendekompresinya. Hanya gunzip bila data benar-benar masih ter-gzip.
  const before = "var gz = new zlib.Zlib.Gunzip(new Uint8Array(arraybuffer));\n        var typed_array = gz.decompress();";
  const after =
    "var u8 = new Uint8Array(arraybuffer);\n        var typed_array = (u8[0] === 0x1f && u8[1] === 0x8b) ? new zlib.Zlib.Gunzip(u8).decompress() : u8;";
  if (!src.includes(before)) throw new Error("Pola loader kuromoji tidak ditemukan — periksa versi kuromoji.");
  src = src.replace(before, after);
  fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "vendor/kuromoji.js"), src);
  fs.cpSync(path.join(ROOT, "node_modules/kuromoji/dict"), path.join(OUT, "dict/kuromoji"), { recursive: true });
}

write("data/stats.json", { vocab: levelCounts, kanji: kanjiCounts, dictionary: entries.length, stories: stories.length, grammar: grammar.length });
console.log(
  `✓ Data THE MARS siap dalam ${((Date.now() - t0) / 1000).toFixed(1)} dtk —`,
  `${entries.length} entri kamus, JLPT ${JSON.stringify(levelCounts)}, kanji ${JSON.stringify(kanjiCounts)},`,
  `${stories.length} cerita, ${grammar.length} pola tata bahasa`,
);
