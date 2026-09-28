import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpenCheck, Brain, CalendarClock, CheckCircle2, Circle, Clapperboard, Clock, Flame, Layers, LibraryBig, Sparkles, Trophy,
} from "lucide-react";
import { minutesByDate, nextExam, streak, today, useStore } from "../lib/store.ts";
import { countDue } from "../lib/srs.ts";
import { LEVEL_INFO } from "../lib/levels.ts";
import { useStories, useVocab } from "../lib/data.ts";
import { Heatmap } from "../components/Heatmap.tsx";
import { Bar, LevelBadge, Ring } from "../components/ui.tsx";
import { media } from "../../content/media.ts";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return ["おはようございます", "Selamat pagi"];
  if (h < 18) return ["こんにちは", "Selamat siang"];
  return ["こんばんは", "Selamat malam"];
};

export default function Dashboard() {
  const profile = useStore((s) => s.profile);
  const cards = useStore((s) => s.cards);
  const words = useStore((s) => s.words);
  const log = useStore((s) => s.log);
  const reviews = useStore((s) => s.reviews);
  const read = useStore((s) => s.read);
  const newPerDay = useStore((s) => s.settings.newPerDay);
  const { data: stories } = useStories();
  const { data: vocab } = useVocab(profile.level);

  const info = LEVEL_INFO[profile.level];
  const due = useMemo(() => countDue(cards, newPerDay), [cards, newPerDay]);
  const byDate = useMemo(() => minutesByDate(log), [log]);
  const t = today();
  const todayMin = byDate.get(t) ?? 0;
  const totalMin = useMemo(() => log.reduce((a, e) => a + e.min, 0), [log]);
  const days = useMemo(() => streak(log, reviews), [log, reviews]);
  const known = useMemo(() => Object.values(words).filter((w) => w.s === "known").length, [words]);
  const exam = nextExam(profile.exam);
  const daysToExam = exam ? Math.ceil((exam.getTime() - Date.now()) / 86400000) : null;
  const [jp, id] = greeting();

  const coverage = useMemo(() => {
    if (!vocab) return null;
    let k = 0;
    let l = 0;
    for (const v of vocab) {
      const s = words[String(v.i)]?.s;
      if (s === "known") k++;
      else if (s === "learning") l++;
    }
    return { known: k, learning: l, total: vocab.length };
  }, [vocab, words]);

  const todayKinds = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of log) if (e.date === t) m[e.kind] = (m[e.kind] ?? 0) + e.min;
    return m;
  }, [log, t]);

  const plan = info.daily.map((d) => {
    let doneMin = 0;
    if (d.to === "/review") doneMin = due.total === 0 && (reviews[t] ?? 0) > 0 ? d.min : Math.min(d.min, (reviews[t] ?? 0) * 0.3);
    else if (d.to === "/studio" || d.to === "/tonton") doneMin = (todayKinds.tonton ?? 0) + (todayKinds.dengar ?? 0);
    else doneMin = todayKinds.baca ?? 0;
    return { ...d, done: doneMin >= d.min, doneMin: Math.min(doneMin, d.min) };
  });

  const nextStory = stories?.filter((s) => s.level === profile.level && !read[s.id])[0] ?? stories?.find((s) => s.level === profile.level);
  const pick = useMemo(() => {
    const list = media.filter((m) => m.levels.includes(profile.level));
    return list[new Date().getDate() % Math.max(1, list.length)];
  }, [profile.level]);

  return (
    <div className="page">
      <div className="grid collapse" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", marginBottom: 18 }}>
        <div className="card hero-card pad-lg glow">
          <div className="eyebrow"><Sparkles style={{ width: 14 }} /> {info.phase}</div>
          <h1 style={{ marginBottom: 6 }}>
            <span className="jp">{jp}</span>
            {profile.name ? `, ${profile.name}` : ""}!
          </h1>
          <p className="lead">{id}! {info.tagline}</p>
          <div className="row wrap" style={{ gap: 26, marginTop: 20 }}>
            <Ring value={todayMin} max={profile.goalMin} size={132} stroke={11}>
              <div className="stat-value" style={{ fontSize: "1.7rem" }}>{Math.round(todayMin)}</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>/ {profile.goalMin} menit</div>
            </Ring>
            <div className="stack" style={{ gap: 10, flex: 1, minWidth: 220 }}>
              <Link to="/review" className="btn primary lg" style={{ justifyContent: "space-between" }}>
                <span className="row"><Brain /> Review hari ini</span>
                <span className="badge" style={{ background: "rgba(0,0,0,.25)", color: "#fff", borderColor: "transparent" }}>{due.total} kartu</span>
              </Link>
              <Link to="/studio" className="btn lg" style={{ justifyContent: "space-between" }}>
                <span className="row"><Clapperboard /> Buka Studio Tonton</span>
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card-title">
            <CalendarClock style={{ color: "var(--gold)" }} />
            <h3 className="grow">Menuju JLPT</h3>
            <LevelBadge level={profile.level} />
          </div>
          {daysToExam !== null && exam ? (
            <div>
              <div className="stat-value text-gold" style={{ fontSize: "3rem" }}>{daysToExam}</div>
              <div className="muted">hari menuju ujian {exam.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>Pendaftaran biasanya ditutup ±3 bulan sebelum ujian. Cek jadwal resmi di jlpt.jp.</div>
            </div>
          ) : (
            <p className="muted">Belum memilih jadwal ujian. Atur di Pengaturan untuk hitung mundur.</p>
          )}
          <hr className="divider" style={{ margin: "4px 0" }} />
          <div>
            <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 6 }}>
              <span>Jam imersi total</span>
              <strong>{(totalMin / 60).toFixed(1)} / {info.hours[0]} jam</strong>
            </div>
            <Bar value={totalMin / 60} max={info.hours[0]} />
          </div>
          {coverage && (
            <div>
              <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                <span>Kosakata N{profile.level}</span>
                <strong>{coverage.known + coverage.learning} / {coverage.total}</strong>
              </div>
              <div className="bar stacked">
                <span style={{ width: `${(coverage.known / coverage.total) * 100}%`, background: "var(--ok)" }} />
                <span style={{ width: `${(coverage.learning / coverage.total) * 100}%`, background: "var(--warn)" }} />
              </div>
              <div className="row" style={{ gap: 14, fontSize: "0.72rem", marginTop: 6 }}>
                <span className="muted">● <span style={{ color: "var(--ok)" }}>dikuasai {coverage.known}</span></span>
                <span className="muted">● <span style={{ color: "var(--warn)" }}>dipelajari {coverage.learning}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid c4" style={{ marginBottom: 18 }}>
        {[
          { icon: <Flame />, cls: "", v: days, l: "hari streak" },
          { icon: <Clock />, cls: "gold", v: (totalMin / 60).toFixed(1), l: "jam imersi" },
          { icon: <Trophy />, cls: "ok", v: known, l: "kata dikuasai" },
          { icon: <Layers />, cls: "info", v: Object.keys(cards).length, l: "kartu tersimpan" },
        ].map((s) => (
          <div key={s.l} className="card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat">
              <span className="stat-value">{s.v}</span>
              <span className="stat-label">{s.l}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid c2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-title">
            <BookOpenCheck style={{ color: "var(--mars-2)" }} />
            <h3 className="grow">Rencana hari ini</h3>
            <span className="muted" style={{ fontSize: "0.8rem" }}>{plan.filter((p) => p.done).length}/{plan.length}</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {plan.map((p) => (
              <Link key={p.label} to={p.to} className="vocab-row" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                {p.done ? <CheckCircle2 style={{ color: "var(--ok)", width: 22 }} /> : <Circle style={{ color: "var(--faint)", width: 22 }} />}
                <div>
                  <div style={{ fontWeight: 650, textDecoration: p.done ? "line-through" : undefined, opacity: p.done ? 0.6 : 1 }}>{p.label}</div>
                  <Bar thin value={p.doneMin} max={p.min} />
                </div>
                <span className="muted mono" style={{ fontSize: "0.8rem" }}>{p.min}m</span>
              </Link>
            ))}
          </div>
          <div className="callout" style={{ marginTop: 14 }}>
            <Sparkles />
            <div><strong>Fokus N{profile.level}:</strong> {info.focus.join(" · ")}</div>
          </div>
        </div>

        <div className="stack">
          {nextStory && (
            <Link to={`/baca/${nextStory.id}`} className="card hover">
              <div className="row" style={{ marginBottom: 8 }}>
                <LibraryBig style={{ color: "var(--mars-2)", width: 18 }} />
                <span className="eyebrow" style={{ margin: 0 }}>Bacaan berikutnya</span>
              </div>
              <div className="jp-serif" style={{ fontSize: "1.6rem", fontWeight: 700 }}>{nextStory.title}</div>
              <div className="muted">{nextStory.titleId} · {nextStory.minutes} menit</div>
              <p style={{ margin: "10px 0 0", color: "var(--text-2)", fontSize: "0.9rem" }}>{nextStory.summary}</p>
            </Link>
          )}
          {pick && (
            <a href={pick.url} target="_blank" rel="noreferrer" className="card hover">
              <div className="row" style={{ marginBottom: 8 }}>
                <Clapperboard style={{ color: "var(--gold)", width: 18 }} />
                <span className="eyebrow" style={{ margin: 0, color: "var(--gold)" }}>Tontonan pilihan hari ini</span>
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 750 }}>{pick.title}</div>
              {pick.titleJa && <div className="jp muted">{pick.titleJa}</div>}
              <p style={{ margin: "10px 0 0", color: "var(--text-2)", fontSize: "0.9rem" }}>{pick.how}</p>
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <Flame style={{ color: "var(--mars-2)" }} />
          <h3 className="grow">Aktivitas 20 minggu</h3>
          <Link to="/log" className="btn sm ghost">Lihat log <ArrowRight /></Link>
        </div>
        <Heatmap minutes={byDate} goal={profile.goalMin} />
      </div>
    </div>
  );
}
