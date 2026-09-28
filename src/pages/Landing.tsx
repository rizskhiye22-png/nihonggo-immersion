import { Link } from "react-router-dom";
import {
  ArrowRight, AudioLines, Brain, Clapperboard, Flame, Headphones, Languages, MousePointerClick, Pickaxe, Sparkles, Tv,
} from "lucide-react";
import { Logo, LogoMark } from "../components/Logo.tsx";
import { useStore } from "../lib/store.ts";
import { LEVEL_INFO, METHOD_STEPS } from "../lib/levels.ts";
import { LEVELS } from "../lib/types.ts";
import { LevelBadge } from "../components/ui.tsx";
import { useStats } from "../lib/data.ts";

export default function Landing() {
  const onboarded = useStore((s) => s.profile.onboarded);
  const cta = onboarded ? "/beranda" : "/mulai";
  const { data: stats } = useStats();

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="links">
          <a href="#fitur">Fitur</a>
          <a href="#metode">Metode</a>
          <a href="#level">Tahapan</a>
        </div>
        <span style={{ flex: 1 }} />
        <Link to={cta} className="btn primary">
          {onboarded ? "Buka Dashboard" : "Mulai Gratis"} <ArrowRight />
        </Link>
      </nav>

      <section className="hero">
        <div className="stars" />
        <div>
          <div className="eyebrow">
            <Sparkles style={{ width: 14 }} /> Metode imersi · Gratis
          </div>
          <h1>
            Belajar bahasa Jepang
            <br />
            <span className="text-grad">sambil nonton anime,</span>
            <br />film & podcast.
          </h1>
          <p className="lead">
            Tidak suka banyak membaca? Tidak masalah. Putar tontonan favoritmu, dan THE MARS menampilkan subtitle Jepang, arti Bahasa Indonesia
            setiap kata, serta terjemahan kalimat. Simpan kata baru, ulangi sebentar setiap hari, lalu latih bicaramu.
          </p>
          <div className="btn-row">
            <Link to={cta} className="btn primary lg">
              Mulai Menonton <ArrowRight />
            </Link>
            <a href="#metode" className="btn lg outline">
              Lihat Metodenya
            </a>
          </div>
          <div className="row wrap" style={{ gap: 28, marginTop: 36 }}>
            {[
              [stats ? `${(stats.dictionary / 1000).toFixed(0)}rb` : "23rb", "kata di kamus"],
              ["JP ⇄ ID", "terjemahan lokal"],
              ["100%", "gratis, tanpa iklan"],
            ].map(([v, l]) => (
              <div key={l} className="stat">
                <span className="stat-value text-gold">{v}</span>
                <span className="stat-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <div className="hero-mark-glow" />
          <LogoMark size={300} animate />
          {[
            ["日本語", "-2%", "8%", "0s"],
            ["あ", "88%", "4%", "1.2s"],
            ["カ", "-4%", "78%", "2s"],
            ["漢字", "84%", "80%", "0.6s"],
          ].map(([k, l, t, d]) => (
            <span key={k} className="kana-chip jp" style={{ left: l, top: t, animationDelay: d }}>{k}</span>
          ))}
        </div>
      </section>

      <section id="fitur" className="section">
        <div className="section-head">
          <div className="eyebrow">Fitur Utama</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Tonton → pahami → simpan → ucapkan</h2>
          <p className="lead" style={{ margin: "0 auto" }}>Semua berjalan di browsermu: ringan, cepat, dan tidak butuh akun.</p>
        </div>
        <div className="grid c3">
          {[
            { icon: <Clapperboard />, t: "Studio Tonton", d: "Putar YouTube atau file anime/film milikmu dengan subtitle Jepang interaktif, jeda per baris, dan mode dengar." },
            { icon: <AudioLines />, t: "Subtitle dari suara", d: "Tidak punya subtitle? Pengenal suara bawaan browser mengubah dialog menjadi teks Jepang secara langsung." },
            { icon: <MousePointerClick />, t: "Arti Indonesia otomatis", d: "Setiap kata di subtitle langsung tampil dengan cara baca dan artinya dalam Bahasa Indonesia, mirip Yomitan." },
            { icon: <Languages />, t: "Penerjemah JP ⇄ ID", d: "Terjemahan lokal di perangkatmu. Tulis atau ucapkan kalimat Indonesia, lalu lihat versi Jepangnya lengkap dengan rincian kata." },
            { icon: <Pickaxe />, t: "Tambang & review", d: "Simpan kata beserta kalimat dan adegan aslinya, lalu ulangi 10 menit per hari dengan algoritma FSRS." },
            { icon: <Headphones />, t: "Rekomendasi & log", d: "Anime, drama, film, dan podcast per tahap, dengan pencatat jam imersi, streak, dan heatmap." },
          ].map((f) => (
            <div key={f.t} className="card hover">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.t}</h3>
              <p className="muted" style={{ margin: 0 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="metode" className="section">
        <div className="section-head">
          <div className="eyebrow">Metode THE MARS</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Input dulu, output mengikuti</h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Anak-anak belajar bahasa dengan mendengar ribuan jam sebelum lancar bicara. THE MARS membuat setiap menit tontonanmu menjadi input yang bisa dipahami.
          </p>
        </div>
        <div className="grid c3">
          {METHOD_STEPS.map((s, i) => (
            <div key={s.n} className={`card${i === 0 ? " glow" : ""}`}>
              <div className="step-num">{s.n}</div>
              <h3 style={{ marginTop: 6 }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.text}</p>
            </div>
          ))}
          <div className="card hero-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Tv style={{ color: "var(--mars-2)", width: 28, height: 28 }} />
            <h3 style={{ marginTop: 10 }}>Siap menonton?</h3>
            <p className="muted">Pilih tahapmu dan dapatkan rencana harian dalam 1 menit.</p>
            <Link to={cta} className="btn primary">Mulai sekarang <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section id="level" className="section">
        <div className="section-head">
          <div className="eyebrow">Tahapan</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Dari pendaratan sampai terraform</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
          {LEVELS.map((l) => {
            const info = LEVEL_INFO[l];
            return (
              <div key={l} className="card hover">
                <div className="row between">
                  <LevelBadge level={l} />
                  <span className="muted" style={{ fontSize: "0.75rem" }}>±{info.hours[0]} jam</span>
                </div>
                <div className="step-num" style={{ marginTop: 14 }}>{info.phase}</div>
                <p style={{ margin: "6px 0 10px", fontWeight: 650 }}>{info.tagline}</p>
                <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>{info.can}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="card hero-card pad-lg glow" style={{ textAlign: "center", padding: "56px 24px" }}>
          <Flame style={{ width: 34, height: 34, margin: "0 auto 12px", color: "var(--gold)" }} />
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>
            Tonton hari ini. <span className="text-grad">Pahami besok.</span>
          </h2>
          <p className="lead" style={{ margin: "0 auto 24px" }}>Gratis, tanpa akun, dan progres tersimpan di perangkatmu.</p>
          <Link to={cta} className="btn primary lg">Mulai Gratis <ArrowRight /></Link>
          <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 18, fontSize: "0.82rem" }}>
            <Brain style={{ width: 16, color: "var(--muted)" }} />
            <span className="muted">Terjemahan & pengenal suara memakai fitur bawaan browser (terbaik di Chrome/Edge).</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="row wrap between" style={{ gap: 20 }}>
          <Logo />
          <div style={{ maxWidth: 640 }}>
            Data kamus berasal dari JMdict (EDRDG, CC BY-SA). Bentuk kanji pada logo dari KanjiVG © Ulrich Apel (CC BY-SA). Tokenisasi memakai
            kuromoji.js (Apache-2.0). Cerita dan materi adalah karya asli THE MARS. © {new Date().getFullYear()} THE MARS.
          </div>
        </div>
      </footer>
    </div>
  );
}
