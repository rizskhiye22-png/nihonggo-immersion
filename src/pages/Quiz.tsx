import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, BookmarkPlus, RotateCcw, Target, Trophy, Volume2 } from "lucide-react";
import { useGrammar, useVocab, type VocabItem } from "../lib/data.ts";
import { setState, useStore } from "../lib/store.ts";
import { addCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { hasKanji } from "../lib/japanese.ts";
import { LEVELS, type GrammarPoint, type Level } from "../lib/types.ts";
import { Bar, PageHead, Ring, Seg, toast } from "../components/ui.tsx";

type Mode = "reading" | "meaning" | "grammar";
type Q = { prompt: string; blankAt?: [number, number]; answer: string; options: string[]; hint?: string; vocab?: VocabItem; note?: string };

const MODES: { v: Mode; label: string; d: string }[] = [
  { v: "reading", label: "Baca kanji", d: "Pilih cara baca yang benar (漢字読み)" },
  { v: "meaning", label: "Arti kata", d: "Pilih arti yang tepat (bahasa Inggris JMdict)" },
  { v: "grammar", label: "Tata bahasa", d: "Isi bagian kosong dengan pola yang tepat (文法)" },
];

const shuffle = <T,>(a: T[]) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

function buildVocab(list: VocabItem[], mode: "reading" | "meaning", n = 10): Q[] {
  const pool = mode === "reading" ? list.filter((v) => hasKanji(v.w) && v.r !== v.w) : list;
  return shuffle(pool).slice(0, n).map((v) => {
    const key = (x: VocabItem) => (mode === "reading" ? x.r : x.m[0]);
    const wrong = shuffle(pool.filter((o) => key(o) !== key(v) && (mode !== "reading" || o.r.length === v.r.length || Math.abs(o.r.length - v.r.length) <= 1))).slice(0, 3).map(key);
    return { prompt: v.w, answer: key(v), options: shuffle([key(v), ...wrong]), vocab: v, hint: mode === "meaning" ? v.r : undefined };
  });
}

function buildGrammar(points: GrammarPoint[], all: GrammarPoint[], n = 10): Q[] {
  const qs: Q[] = [];
  for (const g of points) for (const ex of g.examples) if (ex.blank) {
    const answer = ex.ja.slice(ex.blank[0], ex.blank[1]);
    qs.push({ prompt: ex.ja, blankAt: ex.blank, answer, options: [], note: `${g.pattern} — ${g.meaning}`, hint: ex.id });
  }
  const answers = [...new Set(all.flatMap((g) => g.examples.filter((e) => e.blank).map((e) => e.ja.slice(e.blank![0], e.blank![1]))))];
  return shuffle(qs).slice(0, n).map((q) => ({ ...q, options: shuffle([q.answer, ...shuffle(answers.filter((a) => a !== q.answer)).slice(0, 3)]) }));
}

export default function Quiz() {
  const [params] = useSearchParams();
  const my = useStore((s) => s.profile.level);
  const best = useStore((s) => s.quiz.best);
  const [level, setLevel] = useState<Level>((Number(params.get("level")) as Level) || my);
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "reading");
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const { data: vocab } = useVocab(mode === "grammar" ? null : level);
  const { data: grammar } = useGrammar();

  const start = useCallback(() => {
    let built: Q[] = [];
    if (mode === "grammar" && grammar) {
      const pts = grammar.filter((g) => g.level === level);
      built = buildGrammar(pts, grammar.filter((g) => Math.abs(g.level - level) <= 1));
    } else if (vocab) built = buildVocab(vocab, mode as "reading" | "meaning");
    setQs(built);
    setI(0);
    setPicked(null);
    setResults([]);
  }, [mode, level, grammar, vocab]);

  const q = qs?.[i];
  const done = qs && i >= qs.length;
  const score = results.filter(Boolean).length;
  const bestKey = `${mode}-n${level}`;

  const choose = useCallback((opt: string) => {
    if (!q || picked) return;
    setPicked(opt);
    const ok = opt === q.answer;
    setResults((r) => [...r, ok]);
    if (mode !== "grammar") speak(q.prompt);
  }, [q, picked, mode]);

  const nextQ = useCallback(() => {
    setPicked(null);
    setI((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!done || !qs) return;
    const pct = Math.round((score / qs.length) * 100);
    setState((s) => ({
      ...s,
      quiz: { total: s.quiz.total + qs.length, correct: s.quiz.correct + score, best: { ...s.quiz.best, [bestKey]: Math.max(s.quiz.best[bestKey] ?? 0, pct) } },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (!picked && ["1", "2", "3", "4"].includes(e.key)) choose(q.options[Number(e.key) - 1]);
      else if (picked && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        nextQ();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, picked, choose, nextQ]);

  const wrongOnes = useMemo(() => (qs ?? []).filter((_, j) => results[j] === false), [qs, results]);

  if (!qs) {
    return (
      <div className="page">
        <PageHead eyebrow={<><Target style={{ width: 14 }} /> Kuis JLPT</>} title="Latihan ala ujian" lead="10 soal pilihan ganda per sesi. Gunakan tombol 1–4 di keyboard untuk menjawab cepat." />
        <div className="grid c3" style={{ marginBottom: 20 }}>
          {MODES.map((m) => (
            <button key={m.v} className={`card hover${mode === m.v ? " glow" : ""}`} style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode(m.v)}>
              <h3>{m.label}</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{m.d}</p>
              <div className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>Skor terbaik N{level}: <strong>{best[`${m.v}-n${level}`] ?? 0}%</strong></div>
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 14 }}>
          <Seg value={level} onChange={setLevel} options={LEVELS.map((l) => ({ v: l, label: `N${l}` }))} />
          <button className="btn primary lg" onClick={start} disabled={mode === "grammar" ? !grammar : !vocab}>
            Mulai kuis <ArrowRight />
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="page">
        <div className="card pad-lg hero-card glow" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <Trophy style={{ width: 40, height: 40, margin: "0 auto", color: "var(--gold)" }} />
          <h1 style={{ marginTop: 10 }}>{pct >= 80 ? "Luar biasa!" : pct >= 60 ? "Bagus, terus latih!" : "Tetap semangat!"}</h1>
          <div style={{ display: "grid", placeItems: "center", margin: "18px 0" }}>
            <Ring value={score} max={qs.length} size={150} stroke={12}>
              <div className="stat-value">{pct}%</div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>{score}/{qs.length} benar</div>
            </Ring>
          </div>
          {wrongOnes.length > 0 && (
            <div style={{ textAlign: "left", marginTop: 10 }}>
              <div className="label" style={{ marginBottom: 8 }}>Perlu diulang</div>
              <div className="list">
                {wrongOnes.map((w, j) => (
                  <div key={j} className="vocab-row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <span className="jp" style={{ fontSize: "1.05rem" }}>{w.blankAt ? w.prompt : w.prompt}</span>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>Jawaban: <span className="jp">{w.answer}</span>{w.note ? ` · ${w.note}` : ""}</div>
                    </div>
                    {w.vocab && (
                      <button className="btn sm" onClick={() => addCard({ key: String(w.vocab!.i), w: w.vocab!.w, r: w.vocab!.r, m: w.vocab!.m.join("; "), level, src: "Kuis" }) && toast("Masuk review")}>
                        <BookmarkPlus />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 22 }}>
            <button className="btn" onClick={() => setQs(null)}>Ganti mode</button>
            <button className="btn primary" onClick={start}><RotateCcw /> Ulangi kuis</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="badge mars">{MODES.find((m) => m.v === mode)?.label} · N{level}</span>
          <span className="mono muted">{i + 1} / {qs.length}</span>
        </div>
        <Bar value={i} max={qs.length} thin />
        <div className="card pad-lg" style={{ marginTop: 18 }}>
          <p className="muted" style={{ textAlign: "center", margin: 0 }}>
            {mode === "reading" ? "Bagaimana cara membaca kata ini?" : mode === "meaning" ? "Apa arti kata ini?" : "Pilih yang paling tepat untuk ＿＿"}
          </p>
          <div className="quiz-q">
            {q!.blankAt ? (
              <>
                {q!.prompt.slice(0, q!.blankAt[0])}
                <span className="blank" style={picked ? { color: "var(--mars-2)" } : undefined}>{picked ? q!.answer : "＿"}</span>
                {q!.prompt.slice(q!.blankAt[1])}
              </>
            ) : (
              q!.prompt
            )}
          </div>
          {mode === "meaning" && picked && <p className="jp muted" style={{ textAlign: "center", marginTop: -14 }}>{q!.hint}</p>}
          {mode === "grammar" && picked && <p className="muted" style={{ textAlign: "center", marginTop: -14 }}>{q!.hint}</p>}
          <div className="options">
            {q!.options.map((o, j) => (
              <button
                key={o + j}
                className={`option${mode !== "meaning" ? " jp" : ""}${picked ? (o === q!.answer ? " right" : o === picked ? " wrong" : "") : ""}`}
                onClick={() => choose(o)}
              >
                <span className="k">{j + 1}</span> {o}
              </button>
            ))}
          </div>
          {picked && (
            <div className="row between" style={{ marginTop: 20 }}>
              <div className="muted" style={{ fontSize: "0.88rem" }}>
                {q!.note ?? (q!.vocab ? `${q!.vocab.w}【${q!.vocab.r}】 ${q!.vocab.m.join("; ")}` : "")}
              </div>
              <div className="btn-row">
                {mode !== "grammar" && <button className="btn icon" onClick={() => speak(q!.prompt)}><Volume2 /></button>}
                <button className="btn primary" onClick={nextQ}>Lanjut <ArrowRight /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
