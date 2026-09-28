import type { Word } from "./japanese.ts";

export type Level = 5 | 4 | 3 | 2 | 1;
export const LEVELS: Level[] = [5, 4, 3, 2, 1];

/** Entri kamus ringkas (turunan JMdict). m = arti (bahasa Inggris), j = level JLPT. */
export type DictEntry = { i: number; w: string; a?: string; r: string; m: string[]; p: string; j?: Level };

export type Sentence = { w: Word[]; ja: string; id: string };

export type StoryMeta = {
  id: string;
  level: Level;
  title: string;
  titleId: string;
  topic: string;
  minutes: number;
  summary: string;
};

export type Story = StoryMeta & {
  sentences: Sentence[];
  keyVocab: { w: string; r: string; id: string }[];
  glossary: Record<string, DictEntry>;
};

export type MediaItem = {
  title: string;
  titleJa?: string;
  type: "anime" | "drama" | "film" | "youtube" | "podcast" | "web" | "buku" | "game";
  levels: Level[];
  why: string;
  how: string;
  url: string;
};
