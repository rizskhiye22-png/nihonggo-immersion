import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookmarkPlus, CheckCircle2, Clock, Gauge, ListChecks } from "lucide-react";
import { useStory } from "../lib/data.ts";
import { addLog, markRead, setState, useStore } from "../lib/store.ts";
import { addCard, hasCard } from "../lib/srs.ts";
import { wordKey } from "../lib/dict.ts";
import { SentenceList, PlayAllButton, type TrMode } from "../components/SentenceList.tsx";
import { Bar, LevelBadge, Seg, toast } from "../components/ui.tsx";
import { speak } from "../lib/tts.ts";

export default function Reader() {
  const { id = "" } = useParams();
  const { data: story, error } = useStory(id);
  const words = useStore((s) => s.words);
  const read = useStore((s) => s.read[id]);
  const furigana = useStore((s) => s.settings.furigana);
  const [tr, setTr] = useState<TrMode>("blur");
  const [playAll, setPlayAll] = useState(false);
  const opened = useRef(Date.now());
  const stopPlayAll = useCallback(() => setPlayAll(false), []);

  useEffect(() => {
    opened.current = Date.now();
  }, [id]);

  const idMeanings = useMemo(() => Object.fromEntries((story?.keyVocab ?? []).map((v) => [v.w, v.id])), [story]);
  const base = useMemo(
    () => ({ src: story ? `Bacaan: ${story.title}` : "", level: story?.level, glossary: story?.glossary, idMeanings }),
    [story, idMeanings],
  );

  const coverage = useMemo(() => {
    if (!story) return null;
    const uniq = new Map<string, { s: string; b: string; d?: number }>();
    for (const s of story.sentences) for (const w of s.w) if (w.c === "w") uniq.set(wordKey(w), w);
    let known = 0;
    let learning = 0;
    const fresh: { s: string; b: string; d?: number }[] = [];
    for (const [k, w] of uniq) {
      const st = words[k]?.s;
      if (st === "known") known++;
      else if (st === "learning") learning++;
      else fresh.push(w);
    }
    return { total: uniq.size, known, learning, fresh };
  }, [story, words]);

  if (error) return <div className="page"><div className="callout mars">{error}</div></div>;
  if (!story) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;

  const finish = () => {
    const min = Math.min(Math.max((Date.now() - opened.current) / 60000, 1), story.minutes * 4);
    markRead(story.id);
    addLog(min, "baca", story.title);
    toast(`Selesai! ${Math.round(min)} menit membaca dicatat`);
  };

  const addKeyVocab = () => {
    let n = 0;
    for (const v of story.keyVocab) {
      const entry = Object.values(story.glossary).find((e) => e.w === v.w);
      const key = entry ? String(entry.i) : v.w;
      if (hasCard(key)) continue;
      const ctx = story.sentences.find((s) => s.ja.includes(v.w));
      if (addCard({ key, w: v.w, r: v.r, m: v.id, ctx: ctx?.ja, ctxTr: ctx?.id, src: `Bacaan: ${story.title}`, level: story.level })) n++;
    }
    toast(n ? `${n} kosakata kunci masuk review` : "Semua kosakata kunci sudah ada di review");
  };

  return (
    <div className="page">
      <Link to="/baca" className="btn ghost sm" style={{ marginBottom: 12 }}><ArrowLeft /> Perpustakaan</Link>
      <div className="reader-shell">
        <article>
          <div className="row wrap" style={{ gap: 8 }}>
            <LevelBadge level={story.level} />
            <span className="badge">{story.topic}</span>
            <span className="badge"><Clock style={{ width: 12 }} /> ±{story.minutes} menit</span>
            {read && <span className="badge ok"><CheckCircle2 style={{ width: 12 }} /> Sudah dibaca</span>}
          </div>
          <h1 className="reader-title" onClick={() => speak(story.title)} style={{ cursor: "pointer" }}>{story.title}</h1>
          <p className="lead">{story.titleId} — {story.summary}</p>

          <div className="toolbar">
            <Seg value={furigana} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, furigana: v } }))}
              options={[{ v: "all" as const, label: "Furigana" }, { v: "unknown" as const, label: "Adaptif" }, { v: "none" as const, label: "Tanpa" }]} />
            <Seg value={tr} onChange={setTr} options={[{ v: "hide" as const, label: "Tanpa arti" }, { v: "blur" as const, label: "Arti samar" }, { v: "show" as const, label: "Arti" }]} />
            <span className="grow" />
            <PlayAllButton on={playAll} onClick={() => setPlayAll((p) => !p)} />
          </div>

          <div className="card" style={{ padding: "10px 6px" }}>
            <SentenceList sentences={story.sentences} tr={tr} base={base} level={story.level} playAll={playAll} onPlayAllEnd={stopPlayAll} />
          </div>

          <div className="row wrap" style={{ marginTop: 20, gap: 10 }}>
            <button className="btn primary lg" onClick={finish}><CheckCircle2 /> Selesai membaca</button>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Waktu membaca akan dicatat di Log Imersi.</span>
          </div>
        </article>

        <aside className="reader-side">
          {coverage && (
            <div className="card">
              <div className="card-title"><Gauge style={{ color: "var(--mars-2)" }} /><h3 className="grow">Pemahaman</h3></div>
              <div className="stat-value">{Math.round(((coverage.known + coverage.learning) / Math.max(1, coverage.total)) * 100)}%</div>
              <div className="muted" style={{ fontSize: "0.82rem", marginBottom: 10 }}>kata sudah dikenal / dipelajari dari {coverage.total} kata unik</div>
              <Bar value={coverage.known + coverage.learning} max={coverage.total} />
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: 10, marginBottom: 0 }}>
                Idealnya 90–98%. Kata bergaris oranye = belum pernah kamu tandai.
              </p>
            </div>
          )}
          <div className="card">
            <div className="card-title">
              <ListChecks style={{ color: "var(--gold)" }} />
              <h3 className="grow">Kosakata kunci</h3>
              <button className="btn sm" onClick={addKeyVocab} title="Tambahkan semua ke review"><BookmarkPlus /> Semua</button>
            </div>
            <div className="list">
              {story.keyVocab.map((v) => (
                <div key={v.w} className="vocab-row" style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }} onClick={() => speak(v.w)}>
                  <div>
                    <div className="jp">{v.w} <span className="muted" style={{ fontSize: "0.8rem" }}>{v.r}</span></div>
                    <div className="muted" style={{ fontSize: "0.84rem" }}>{v.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="callout">
            <CheckCircle2 />
            <div>Tips: baca sekali tanpa terjemahan, putar audio untuk shadowing, lalu tambang 3–5 kata yang paling berguna.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
