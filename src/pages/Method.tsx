import { Link } from "react-router-dom";
import { ArrowRight, Captions, Compass, Ear, Eye, EyeOff, Sparkles, Timer } from "lucide-react";
import { LEVEL_INFO, METHOD_STEPS } from "../lib/levels.ts";
import { useStore } from "../lib/store.ts";
import { LEVELS } from "../lib/types.ts";
import { LevelBadge, PageHead } from "../components/ui.tsx";


export default function Method() {
  const my = useStore((s) => s.profile.level);
  return (
    <div className="page">
      <PageHead
        eyebrow={<><Compass style={{ width: 14 }} /> Metode & Roadmap</>}
        title="Metode imersi THE MARS"
        lead="Belajar seperti anak kecil belajar bahasa: dengar dan tonton sebanyak mungkin, pahami lewat konteks, lalu keluarkan lewat bicara. Disusun per tahap kemampuan."
      />

      <div className="grid c3" style={{ marginBottom: 28 }}>
        {METHOD_STEPS.map((s) => (
          <div key={s.n} className="card">
            <div className="step-num">{s.n}</div>
            <h3 style={{ marginTop: 6 }}>{s.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{s.text}</p>
          </div>
        ))}
        <div className="card hero-card">
          <Sparkles style={{ color: "var(--gold)" }} />
          <h3 style={{ marginTop: 8 }}>Aturan emas</h3>
          <p className="muted" style={{ margin: 0 }}>Pilih konten yang kamu nikmati. Motivasi yang bertahan lama lebih penting daripada materi “sempurna”.</p>
        </div>
      </div>

      <h2>Tangga subtitle</h2>
      <p className="muted">Kurangi ketergantungan pada subtitle secara bertahap. Naik satu anak tangga saat 80% dialog sudah bisa kamu ikuti.</p>
      <div className="grid c4" style={{ marginBottom: 28 }}>
        {[
          { icon: <Captions />, t: "Subtitle Indonesia", d: "Hanya untuk menikmati cerita. Hampir tidak ada pemerolehan bahasa.", l: "Hindari" },
          { icon: <Eye />, t: "Subtitle Jepang + furigana", d: "Studio Tonton dengan furigana penuh. Klik kata yang belum tahu.", l: "N5–N4" },
          { icon: <EyeOff />, t: "Subtitle Jepang samar", d: "Mode dengar: intip subtitle hanya saat tidak menangkap.", l: "N3–N2" },
          { icon: <Ear />, t: "Tanpa subtitle", d: "Dengar murni. Tambang hanya kata yang terus muncul.", l: "N2–N1" },
        ].map((s, i) => (
          <div key={s.t} className={`card${i === 0 ? "" : " hover"}`} style={i === 0 ? { opacity: 0.6 } : undefined}>
            <div className="stat-icon">{s.icon}</div>
            <strong>{s.t}</strong>
            <p className="muted" style={{ fontSize: "0.86rem", margin: "6px 0 10px" }}>{s.d}</p>
            <span className="badge">{s.l}</span>
          </div>
        ))}
      </div>

      <h2>Tahapan & rutinitas</h2>
      <div className="stack" style={{ gap: 14, marginBottom: 28 }}>
        {LEVELS.map((l) => {
          const info = LEVEL_INFO[l];
          return (
            <div key={l} className={`card${l === my ? " glow" : ""}`}>
              <div className="row wrap" style={{ gap: 10, marginBottom: 12 }}>
                <LevelBadge level={l} />
                <h3 style={{ margin: 0 }}>{info.phase}</h3>
                {l === my && <span className="badge mars">Tahapmu</span>}
                <span className="grow" />
                <span className="badge"><Timer style={{ width: 12 }} /> ±{info.hours[0]}–{info.hours[1]} jam kumulatif</span>
              </div>
              <div className="grid c3">
                <div>
                  <div className="label">Kemampuan</div>
                  <p style={{ margin: "4px 0 8px" }}>{info.can}</p>
                </div>
                <div>
                  <div className="label">Rutinitas harian</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--text-2)" }}>
                    {info.daily.map((d) => <li key={d.label}>{d.label} — {d.min} mnt</li>)}
                  </ul>
                </div>
                <div>
                  <div className="label">Fokus tahap ini</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--text-2)" }}>
                    {info.focus.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card hero-card pad-lg" style={{ textAlign: "center" }}>
        <h2>Siap memulai sesi hari ini?</h2>
        <p className="muted">Mulai dengan review, lalu 1 episode di Studio Tonton.</p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <Link to="/review" className="btn">Review dulu</Link>
          <Link to="/studio" className="btn primary">Buka Studio Tonton <ArrowRight /></Link>
        </div>
      </div>
      <p className="faint" style={{ fontSize: "0.75rem", marginTop: 16 }}>
        Perkiraan jam imersi hanya gambaran kasar dan bisa sangat berbeda antarindividu. Yang terpenting adalah konsisten setiap hari.
      </p>
    </div>
  );
}
