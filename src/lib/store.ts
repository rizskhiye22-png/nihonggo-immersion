// Penyimpanan progres pengguna (lokal di browser). Semua halaman membaca state lewat useStore().
import { useSyncExternalStore } from "react";
import type { Level } from "./types.ts";

export type WordStatus = "learning" | "known";
export type LogKind = "tonton" | "dengar" | "baca" | "review" | "bicara" | "lainnya";

export type SrsCard = {
  id: string;
  key: string; // kunci kata (id kamus atau bentuk kamus)
  w: string;
  r: string;
  m: string;
  ctx?: string;
  ctxTr?: string;
  src?: string;
  img?: string; // id gambar di IndexedDB
  level?: Level;
  created: number;
  fsrs: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string;
  };
};

export type LogEntry = { id: string; date: string; min: number; kind: LogKind; note?: string };

export type State = {
  v: 1;
  profile: { name: string; level: Level; goalMin: number; exam: "jul" | "dec" | null; onboarded: boolean; startedAt: number };
  settings: {
    furigana: "all" | "unknown" | "none";
    ttsRate: number;
    theme: "dark" | "light";
    showTranslation: boolean;
    autoPause: boolean;
    newPerDay: number;
    lookup: "click" | "shift" | "hover";
  };
  words: Record<string, { s: WordStatus; t: number }>;
  cards: Record<string, SrsCard>;
  log: LogEntry[];
  read: Record<string, number>;
  quiz: { total: number; correct: number; best: Record<string, number> };
  reviews: Record<string, number>; // tanggal → jumlah review
};

const KEY = "themars:v1";

const initial = (): State => ({
  v: 1,
  profile: { name: "", level: 5, goalMin: 45, exam: null, onboarded: false, startedAt: Date.now() },
  settings: { furigana: "unknown", ttsRate: 0.95, theme: "light", showTranslation: false, autoPause: false, newPerDay: 15, lookup: "shift" },
  words: {},
  cards: {},
  log: [],
  read: {},
  quiz: { total: 0, correct: 0, best: {} },
  reviews: {},
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const parsed = JSON.parse(raw) as Partial<State>;
    const base = initial();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      settings: { ...base.settings, ...parsed.settings },
      quiz: { ...base.quiz, ...parsed.quiz },
    };
  } catch {
    return initial();
  }
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh atau diblokir — progres tetap ada di memori */
    }
  }, 150);
}

export function getState() {
  return state;
}

export function setState(fn: (s: State) => State) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// ───────── Tanggal ─────────
export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ───────── Aksi ─────────
export function setWordStatus(key: string, s: WordStatus | null) {
  setState((st) => {
    const words = { ...st.words };
    if (s) words[key] = { s, t: Date.now() };
    else delete words[key];
    return { ...st, words };
  });
}

export function addLog(min: number, kind: LogKind, note?: string, date = today()) {
  if (min <= 0) return;
  const m = Math.round(min * 10) / 10;
  setState((st) => {
    // Gabungkan dengan entri hari ini yang sejenis & bercatatan sama agar log tetap ringkas
    const idx = st.log.findIndex((e) => e.date === date && e.kind === kind && e.note === note);
    const log = [...st.log];
    if (idx >= 0) log[idx] = { ...log[idx], min: Math.round((log[idx].min + m) * 10) / 10 };
    else log.push({ id: uid(), date, min: m, kind, note });
    return { ...st, log };
  });
}

export function removeLog(id: string) {
  setState((st) => ({ ...st, log: st.log.filter((e) => e.id !== id) }));
}

export function markRead(id: string) {
  setState((st) => ({ ...st, read: { ...st.read, [id]: Date.now() } }));
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as State;
  if (parsed?.v !== 1 || !parsed.profile) throw new Error("Berkas bukan cadangan THE MARS yang valid.");
  setState(() => ({ ...initial(), ...parsed }));
}

export function resetAll() {
  setState(() => initial());
}

// ───────── Turunan ─────────
export function minutesByDate(log: LogEntry[]) {
  const map = new Map<string, number>();
  for (const e of log) map.set(e.date, (map.get(e.date) ?? 0) + e.min);
  return map;
}

export function streak(log: LogEntry[], reviews: Record<string, number>) {
  const active = new Set([...log.filter((e) => e.min > 0).map((e) => e.date), ...Object.keys(reviews)]);
  let n = 0;
  const d = new Date();
  if (!active.has(today(d))) d.setDate(d.getDate() - 1); // hari ini belum aktif tidak memutus streak
  while (active.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Tanggal ujian JLPT berikutnya (Minggu pertama Juli / Desember). */
export function nextExam(which: "jul" | "dec" | null) {
  const now = new Date();
  const firstSunday = (y: number, m: number) => {
    const d = new Date(y, m, 1);
    d.setDate(1 + ((7 - d.getDay()) % 7));
    return d;
  };
  const candidates: Date[] = [];
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
    if (which !== "dec") candidates.push(firstSunday(y, 6));
    if (which !== "jul") candidates.push(firstSunday(y, 11));
  }
  return candidates.filter((d) => d.getTime() > now.getTime()).sort((a, b) => a.getTime() - b.getTime())[0];
}
