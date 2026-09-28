import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, LibraryBig, ScanText, Sparkles } from "lucide-react";
import { useStories } from "../lib/data.ts";
import { useStore } from "../lib/store.ts";
import { LEVELS, type Level } from "../lib/types.ts";
import { LevelBadge, PageHead } from "../components/ui.tsx";

export default function Library() {
  const my = useStore((s) => s.profile.level);
  const read = useStore((s) => s.read);
  const [level, setLevel] = useState<Level | 0>(0);
  const { data, loading, error } = useStories();
  const list = useMemo(() => (data ?? []).filter((s) => level === 0 || s.level === level).sort((a, b) => b.level - a.level), [data, level]);

  return (
    <div className="page">
      <PageHead
        eyebrow={<><LibraryBig style={{ width: 14 }} /> Perpustakaan</>}
        title="Cerita bertingkat N5–N1"
        lead="Bacaan asli dengan furigana adaptif, audio, dan terjemahan Indonesia per kalimat. Klik kata apa pun untuk arti dan simpan ke review."
      >
        <Link to="/pembaca" className="btn"><ScanText /> Pembaca Bebas</Link>
        <Link to="/pembaca?ai=1" className="btn primary"><Sparkles /> Buat cerita AI</Link>
      </PageHead>

      <div className="chips" style={{ marginBottom: 20 }}>
        <button className={`chip${level === 0 ? " on" : ""}`} onClick={() => setLevel(0)}>Semua</button>
        {LEVELS.map((l) => (
          <button key={l} className={`chip${level === l ? " on" : ""}`} onClick={() => setLevel(l)}>N{l}{l === my ? " ★" : ""}</button>
        ))}
      </div>

      {error && <div className="callout mars">{error}</div>}
      <div className="grid auto">
        {loading && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 210 }} />)}
        {list.map((s) => (
          <Link key={s.id} to={`/baca/${s.id}`} className="card hover" style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 210 }}>
            <div className="row">
              <LevelBadge level={s.level} />
              <span className="badge">{s.topic}</span>
              <span className="grow" />
              {read[s.id] && <CheckCircle2 style={{ color: "var(--ok)", width: 20 }} />}
            </div>
            <div className="jp-serif" style={{ fontSize: "1.7rem", fontWeight: 700, lineHeight: 1.3, marginTop: 6 }}>{s.title}</div>
            <div style={{ fontWeight: 650 }}>{s.titleId}</div>
            <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{s.summary}</p>
            <div className="row muted" style={{ marginTop: "auto", fontSize: "0.8rem", gap: 6 }}>
              <Clock style={{ width: 14 }} /> ±{s.minutes} menit
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
