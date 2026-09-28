// Memuat data statis (dihasilkan scripts/build-data.ts) dengan cache sederhana.
import { useEffect, useState } from "react";
import type { GrammarPoint, Kanji, Level, Story, StoryMeta } from "./types.ts";

const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(url: string): Promise<T> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Gagal memuat ${url} (${r.status})`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<T>;
}

export function useJson<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; url?: string | null }>({});
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetchJson<T>(url).then(
      (data) => alive && setState({ data, url }),
      (e: Error) => alive && setState({ error: e.message, url }),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  const fresh = state.url === url;
  return { data: fresh ? state.data : undefined, error: fresh ? state.error : undefined, loading: !!url && !fresh };
}

export type VocabItem = { i: number; w: string; r: string; m: string[]; p: string };
export type KanjiItem = Kanji & { x: [string, string, string][] };
export type Stats = { vocab: Record<string, number>; kanji: Record<string, number>; dictionary: number; stories: number; grammar: number };

export const urls = {
  stories: "/data/stories/index.json",
  story: (id: string) => `/data/stories/${id}.json`,
  grammar: "/data/grammar.json",
  vocab: (l: Level) => `/data/jlpt/n${l}.json`,
  kanji: (g: string) => `/data/kanji/${g}.json`,
  stats: "/data/stats.json",
};

export const useStories = () => useJson<StoryMeta[]>(urls.stories);
export const useStory = (id: string) => useJson<Story>(urls.story(id));
export const useGrammar = () => useJson<GrammarPoint[]>(urls.grammar);
export const useVocab = (l: Level | null) => useJson<VocabItem[]>(l ? urls.vocab(l) : null);
export const useStats = () => useJson<Stats>(urls.stats);

/** Kelompok kanji memakai pembagian JLPT lama: N3 & N2 digabung. */
export const KANJI_GROUPS = [
  { id: "n5", label: "N5", levels: [5] },
  { id: "n4", label: "N4", levels: [4] },
  { id: "n3", label: "N3–N2", levels: [3, 2] },
  { id: "n1", label: "N1", levels: [1] },
] as const;
export const kanjiGroupFor = (l: Level) => KANJI_GROUPS.find((g) => (g.levels as readonly number[]).includes(l))!.id;
