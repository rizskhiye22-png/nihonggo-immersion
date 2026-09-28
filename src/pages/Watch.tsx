import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clapperboard, ExternalLink, Film, Gamepad2, Globe, Headphones, Play, Tv, MonitorPlay } from "lucide-react";
import { media } from "../../content/media.ts";
import { LevelBadge, PageHead } from "../components/ui.tsx";
import { startTimer } from "../components/ImmersionTimer.tsx";
import { useStore } from "../lib/store.ts";
import { LEVELS, type Level, type MediaItem } from "../lib/types.ts";

const TYPE: Record<MediaItem["type"], { label: string; icon: typeof Tv }> = {
  anime: { label: "Anime", icon: Tv },
  drama: { label: "Drama/Acara", icon: Clapperboard },
  film: { label: "Film", icon: Film },
  youtube: { label: "YouTube", icon: MonitorPlay },
  podcast: { label: "Podcast", icon: Headphones },
  web: { label: "Web", icon: Globe },
  buku: { label: "Buku/Manga", icon: BookOpen },
  game: { label: "Game", icon: Gamepad2 },
};

export default function Watch() {
  const my = useStore((s) => s.profile.level);
  const [level, setLevel] = useState<Level | 0>(my);
  const [type, setType] = useState<MediaItem["type"] | "all">("all");
  const list = useMemo(
    () => media.filter((m) => (level === 0 || m.levels.includes(level)) && (type === "all" || m.type === type)),
    [level, type],
  );

  const start = (m: MediaItem) => {
    const kind = m.type === "podcast" ? "dengar" : m.type === "buku" || m.type === "web" ? "baca" : "tonton";
    startTimer(kind, m.title);
    window.open(m.url, "_blank", "noopener");
  };

  return (
    <div className="page">
      <PageHead
        eyebrow={<><Tv style={{ width: 14 }} /> Rekomendasi Tontonan</>}
        title="Konten imersi sesuai levelmu"
        lead="Pilihan anime, drama, film, podcast, dan bacaan yang cocok untuk tiap tahap. Tekan Mulai untuk membuka sumbernya sekaligus menjalankan timer imersi."
      />

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div className="row wrap" style={{ gap: 14 }}>
          <div className="chips">
            <button className={`chip${level === 0 ? " on" : ""}`} onClick={() => setLevel(0)}>Semua level</button>
            {LEVELS.map((l) => (
              <button key={l} className={`chip${level === l ? " on" : ""}`} onClick={() => setLevel(l)}>N{l}{l === my ? " ★" : ""}</button>
            ))}
          </div>
          <span className="grow" />
          <select className="select" style={{ width: 200 }} value={type} onChange={(e) => setType(e.target.value as MediaItem["type"] | "all")}>
            <option value="all">Semua jenis</option>
            {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="callout mars" style={{ marginBottom: 20 }}>
        <Clapperboard />
        <div>
          Punya file video dan subtitle Jepang? Buka di <Link to="/studio" style={{ fontWeight: 700, textDecoration: "underline" }}>Studio Tonton</Link> agar setiap kata bisa diklik dan ditambang.
          Untuk YouTube, tempel tautannya langsung di Studio.
        </div>
      </div>

      <div className="grid auto">
        {list.map((m) => {
          const T = TYPE[m.type];
          return (
            <div key={m.title} className="card hover" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row">
                <div className="stat-icon" style={{ margin: 0, width: 36, height: 36 }}><T.icon /></div>
                <span className="badge">{T.label}</span>
                <span className="grow" />
                <div className="row" style={{ gap: 4 }}>{m.levels.map((l) => <LevelBadge key={l} level={l} />)}</div>
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{m.title}</h3>
                {m.titleJa && <div className="jp muted">{m.titleJa}</div>}
              </div>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: "0.9rem" }}>{m.why}</p>
              <div className="callout" style={{ fontSize: "0.84rem", padding: "10px 12px" }}>
                <Play />
                <div><strong>Cara imersi:</strong> {m.how}</div>
              </div>
              <div className="row" style={{ marginTop: "auto", gap: 8 }}>
                <button className="btn primary sm grow" onClick={() => start(m)}><Play /> Mulai + timer</button>
                <a className="btn sm" href={m.url} target="_blank" rel="noreferrer"><ExternalLink /> Buka</a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: 24, fontSize: "0.8rem" }}>
        Tautan anime/drama/film mengarah ke JustWatch Indonesia untuk menemukan layanan streaming legal yang tersedia.
      </p>
    </div>
  );
}
