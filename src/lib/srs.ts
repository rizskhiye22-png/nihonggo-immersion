// Pengulangan berjarak (spaced repetition) memakai algoritma FSRS.
import { createEmptyCard, fsrs, generatorParameters, Rating, State as FState, type Card, type Grade } from "ts-fsrs";
import { getState, setState, today, type SrsCard } from "./store.ts";
import type { Level } from "./types.ts";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

type Stored = SrsCard["fsrs"];

const toCard = (f: Stored): Card => ({
  ...f,
  due: new Date(f.due),
  last_review: f.last_review ? new Date(f.last_review) : undefined,
});

const fromCard = (c: Card): Stored => ({
  due: c.due.toISOString(),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  last_review: c.last_review?.toISOString(),
});

export type NewCard = { key: string; w: string; r: string; m: string; ctx?: string; ctxTr?: string; src?: string; img?: string; level?: Level };

export function hasCard(key: string) {
  return Object.values(getState().cards).some((c) => c.key === key);
}

export function addCard(input: NewCard) {
  if (hasCard(input.key)) return false;
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const card: SrsCard = { ...input, id, created: Date.now(), fsrs: fromCard(createEmptyCard(new Date())) };
  setState((st) => ({
    ...st,
    cards: { ...st.cards, [id]: card },
    words: st.words[input.key]?.s === "known" ? st.words : { ...st.words, [input.key]: { s: "learning", t: Date.now() } },
  }));
  return true;
}

export function removeCard(id: string) {
  setState((st) => {
    const cards = { ...st.cards };
    delete cards[id];
    return { ...st, cards };
  });
}

export function isNew(c: SrsCard) {
  return c.fsrs.state === FState.New;
}

/** Kartu yang jatuh tempo hari ini + kartu baru sesuai kuota harian. */
export function dueQueue(now = new Date()) {
  const st = getState();
  const cards = Object.values(st.cards);
  const due = cards.filter((c) => !isNew(c) && new Date(c.fsrs.due) <= now).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
  const introducedToday = cards.filter((c) => c.fsrs.reps > 0 && c.fsrs.last_review && today(new Date(c.fsrs.last_review)) === today() && c.fsrs.reps === 1).length;
  const quota = Math.max(0, st.settings.newPerDay - introducedToday);
  const fresh = cards.filter(isNew).sort((a, b) => a.created - b.created).slice(0, quota);
  return [...due, ...fresh];
}

export function countDue(cards: Record<string, SrsCard>, newPerDay: number, now = new Date()) {
  let due = 0;
  let fresh = 0;
  for (const c of Object.values(cards)) {
    if (isNew(c)) fresh++;
    else if (new Date(c.fsrs.due) <= now) due++;
  }
  return { due, fresh: Math.min(fresh, newPerDay), total: due + Math.min(fresh, newPerDay) };
}

/** Pratinjau interval untuk tiap tombol (mis. "10m", "3h", "4d"). */
export function preview(c: SrsCard, now = new Date()) {
  const rec = scheduler.repeat(toCard(c.fsrs), now);
  const fmt = (d: Date) => {
    const min = (d.getTime() - now.getTime()) / 60000;
    if (min < 60) return `${Math.max(1, Math.round(min))}m`;
    if (min < 60 * 24) return `${Math.round(min / 60)}j`;
    const days = min / 1440;
    if (days < 30) return `${Math.round(days)}h`;
    if (days < 365) return `${Math.round(days / 30)}bln`;
    return `${(days / 365).toFixed(1)}th`;
  };
  return {
    [Rating.Again]: fmt(rec[Rating.Again].card.due),
    [Rating.Hard]: fmt(rec[Rating.Hard].card.due),
    [Rating.Good]: fmt(rec[Rating.Good].card.due),
    [Rating.Easy]: fmt(rec[Rating.Easy].card.due),
  } as Record<Grade, string>;
}

export function grade(id: string, g: Grade, now = new Date()) {
  setState((st) => {
    const c = st.cards[id];
    if (!c) return st;
    const next = scheduler.next(toCard(c.fsrs), now, g).card;
    const updated: SrsCard = { ...c, fsrs: fromCard(next) };
    const words = { ...st.words };
    // Kata dianggap "dikuasai" bila stabilitas memori ≥ 21 hari
    if (next.stability >= 21) words[c.key] = { s: "known", t: Date.now() };
    const d = today(now);
    return { ...st, cards: { ...st.cards, [id]: updated }, words, reviews: { ...st.reviews, [d]: (st.reviews[d] ?? 0) + 1 } };
  });
}

export { Rating };
