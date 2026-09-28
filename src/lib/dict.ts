// Kamus di browser: memuat potongan (shard) JSON sesuai kebutuhan dan menyimpannya di memori.
import { dictKey, shardOf, type Word } from "./japanese.ts";
import type { DictEntry } from "./types.ts";

type Shard = { k: Record<string, number[]>; e: Record<string, DictEntry> };
const cache = new Map<number, Promise<Shard>>();

function shard(n: number) {
  let p = cache.get(n);
  if (!p) {
    p = fetch(`/data/dict/${n}.json`).then((r) => {
      if (!r.ok) throw new Error(`Kamus gagal dimuat (${r.status})`);
      return r.json() as Promise<Shard>;
    });
    p.catch(() => cache.delete(n));
    cache.set(n, p);
  }
  return p;
}

/** Semua kandidat entri untuk kunci-kunci yang diberikan (urut prioritas, tanpa duplikat). */
export async function lookup(...keys: string[]): Promise<DictEntry[]> {
  const out: DictEntry[] = [];
  const seen = new Set<number>();
  for (const raw of keys) {
    if (!raw) continue;
    const key = dictKey(raw);
    const s = await shard(shardOf(key));
    for (const id of s.k[key] ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(s.e[id]);
    }
  }
  return out;
}

/** Mengisi `d` (id kamus) pada kata-kata hasil tokenisasi di browser. */
export async function attachDictIds(words: Word[]) {
  const pending = words.filter((w) => w.c !== "x" && w.d === undefined);
  await Promise.all([...new Set(pending.map((w) => shardOf(dictKey(w.b))))].map(shard));
  for (const w of pending) {
    const [e] = await lookup(w.b, w.s);
    if (e) w.d = e.i;
  }
  return words;
}

/** Kunci status kata: id kamus bila ada, selain itu bentuk kamusnya. */
export const wordKey = (w: { d?: number; b: string }) => (w.d !== undefined ? String(w.d) : w.b);

export const JLPT_LABEL = (j?: number) => (j ? `N${j}` : "");
