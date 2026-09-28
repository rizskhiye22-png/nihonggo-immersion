// Memuat data statis (dihasilkan scripts/build-data.ts) dengan cache sederhana.
import { useEffect, useState } from "react";
import type { Story, StoryMeta } from "./types.ts";

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

export type Stats = { dictionary: number; stories: number };

export const urls = {
  stories: "/data/stories/index.json",
  story: (id: string) => `/data/stories/${id}.json`,
  stats: "/data/stats.json",
};

export const useStories = () => useJson<StoryMeta[]>(urls.stories);
export const useStory = (id: string) => useJson<Story>(urls.story(id));
export const useStats = () => useJson<Stats>(urls.stats);
