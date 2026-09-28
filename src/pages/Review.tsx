import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, CheckCircle2, Clapperboard, Eye, Layers, PartyPopper, Volume2 } from "lucide-react";
import { addLog, useStore, type SrsCard } from "../lib/store.ts";
import { countDue, dueQueue, grade, isNew, preview, Rating } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { getImage } from "../lib/idb.ts";
import { Bar, LevelBadge, PageHead } from "../components/ui.tsx";
import type { Grade } from "ts-fsrs";

function Highlight({ text, word }: { text: string; word: string }) {
  // Sorot kata (atau awalan batangnya) di dalam kalimat konteks
  let needle = word;
  while (needle.length > 1 && !text.includes(needle)) needle = needle.slice(0, -1);
  const at = needle.length && text.includes(needle) ? text.indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <b>{needle}</b>
      {text.slice(at + needle.length)}
    </>
  );
}

export default function Review() {
  const cards = useStore((s) => s.cards);
  const newPerDay = useStore((s) => s.settings.newPerDay);
  const [queue, setQueue] = useState<string[]>(() => dueQueue().map((c) => c.id));
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [img, setImg] = useState<string>();
  const started = useRef(Date.now());

  const card: SrsCard | undefined = cards[queue[0]];
  const pv = useMemo(() => (card ? preview(card) : null), [card]);
  const counts = countDue(cards, newPerDay);

  useEffect(() => {
    setImg(undefined);
    if (card?.img) void getImage(card.img).then(setImg);
  }, [card?.id, card?.img]);

  useEffect(() => () => {
    const min = (Date.now() - started.current) / 60000;
    if (min >= 0.5) addLog(Math.min(min, 120), "review");
  }, []);

  const reveal = useCallback(() => {
    if (!card) return;
    setShown(true);
    speak(card.w);
  }, [card]);

  const answer = useCallback(
    (g: Grade) => {
      if (!card) return;
      grade(card.id, g);
      setShown(false);
      setDone((d) => d + 1);
      setQueue((q) => {
        const rest = q.slice(1);
        // Kartu "Lagi" diulang di akhir sesi ini
        return g === Rating.Again ? [...rest, card.id] : rest;
      });
    },
    [card],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal();
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) answer(Number(e.key) as Grade);
      else if (e.key.toLowerCase() === "r" && card) speak(card.w);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, reveal, answer, card]);

  const total = done + queue.length;

  if (!card) {
    const nextDue = Object.values(cards)
      .filter((c) => !isNew(c))
      .map((c) => new Date(c.fsrs.due))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return (
      <div className="page">
        <PageHead eyebrow={<><Brain style={{ width: 14 }} /> Review</>} title="Review harian" />
        <div className="card pad-lg hero-card" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          {done > 0 ? <PartyPopper style={{ width: 44, height: 44, margin: "0 auto", color: "var(--gold)" }} /> : <CheckCircle2 style={{ width: 44, height: 44, margin: "0 auto", color: "var(--ok)" }} />}
          <h2 style={{ marginTop: 12 }}>{done > 0 ? `Selesai! ${done} kartu diulang hari ini.` : Object.keys(cards).length ? "Tidak ada kartu jatuh tempo" : "Belum ada kartu"}</h2>
          <p className="muted">
            {Object.keys(cards).length
              ? nextDue
                ? `Review berikutnya: ${nextDue.toLocaleString("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.`
                : "Tambahkan kartu baru dari tontonan atau daftar kosakata."
              : "Kartu dibuat saat kamu menekan “Tambang” pada kata di Studio Tonton, Perpustakaan, atau daftar Kosakata."}
          </p>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link to="/studio" className="btn primary"><Clapperboard /> Tambang dari tontonan</Link>
            <Link to="/kosakata" className="btn"><Layers /> Tambah dari kosakata</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge mars"><Brain style={{ width: 12 }} /> {queue.length} tersisa</span>
            {isNew(card) && <span className="badge gold">Kartu baru</span>}
            {card.level && <LevelBadge level={card.level} />}
          </div>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Jatuh tempo: {counts.due} · baru: {counts.fresh}</span>
        </div>
        <Bar value={done} max={total} thin />

        <div className="card review-card glow" style={{ marginTop: 18 }}>
          {img && <img className="review-img" src={img} alt="Adegan" />}
          <div className="review-word">{card.w}</div>
          {card.ctx && (
            <div className="review-ctx">
              <Highlight text={card.ctx} word={card.w} />
            </div>
          )}
          {shown ? (
            <div className="stack" style={{ gap: 8, alignItems: "center", animation: "page-in .3s var(--ease)" }}>
              <div className="jp" style={{ fontSize: "1.4rem", color: "var(--mars-3)" }}>{card.r}</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 650, maxWidth: 560 }}>{card.m}</div>
              {card.ctxTr && <div className="tr" style={{ maxWidth: 600 }}>{card.ctxTr}</div>}
              {card.src && <div className="faint" style={{ fontSize: "0.78rem" }}>{card.src}</div>}
              <button className="btn sm ghost" onClick={() => speak(card.ctx ?? card.w)}><Volume2 /> Dengarkan {card.ctx ? "kalimat" : "kata"}</button>
            </div>
          ) : (
            <button className="btn primary lg" onClick={reveal} style={{ marginTop: 10 }}>
              <Eye /> Tampilkan jawaban <span className="kbd" style={{ marginLeft: 6 }}>Spasi</span>
            </button>
          )}
        </div>

        {shown && pv && (
          <div className="grades" style={{ marginTop: 18 }}>
            {[
              { g: Rating.Again, cls: "again", l: "Lagi" },
              { g: Rating.Hard, cls: "hard", l: "Sulit" },
              { g: Rating.Good, cls: "good", l: "Bisa" },
              { g: Rating.Easy, cls: "easy", l: "Mudah" },
            ].map((b, j) => (
              <button key={b.g} className={`grade ${b.cls}`} onClick={() => answer(b.g as Grade)}>
                {b.l}
                <small>{pv[b.g as Grade]} · {j + 1}</small>
              </button>
            ))}
          </div>
        )}
        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem", marginTop: 18 }}>
          Jujurlah saat menilai: “Lagi” bila lupa, “Bisa” bila ingat dengan usaha wajar. FSRS akan mengatur jadwalnya.
        </p>
      </div>
    </div>
  );
}
