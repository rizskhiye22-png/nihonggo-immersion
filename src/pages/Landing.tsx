import { Link } from "react-router-dom";
import {
  ArrowRight, Bot, Brain, Captions, Clapperboard, Flame, LibraryBig, MousePointerClick, Pickaxe, ScanText, Sparkles, Target, Type,
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
  const vocabTotal = stats ? Object.values(stats.vocab).reduce((a, b) => a + b, 0) : 9000;

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="links">
          <a href="#fitur">Fitur</a>
          <a href="#metode">Metode</a>
          <a href="#level">Level JLPT</a>
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
            <Sparkles style={{ width: 14 }} /> Metode imersi · JLPT N5–N1
          </div>
          <h1>
            Kuasai bahasa Jepang
            <br />
            <span className="text-grad">dari anime, film</span>
            <br />& bacaan asli.
          </h1>
          <p className="lead">
            THE MARS mengubah tontonan dan bacaan favoritmu menjadi pelajaran. Klik kata apa pun di subtitle untuk melihat artinya,
            simpan kalimatnya, lalu hafalkan dengan algoritma FSRS. Semua dijelaskan dalam Bahasa Indonesia.
          </p>
          <div className="btn-row">
            <Link to={cta} className="btn primary lg">
              Mulai Perjalanan <ArrowRight />
            </Link>
            <a href="#metode" className="btn lg outline">
              Lihat Metodenya
            </a>
          </div>
          <div className="row wrap" style={{ gap: 28, marginTop: 36 }}>
            {[
              [`${Math.round(vocabTotal / 100) * 100}+`, "kosakata JLPT"],
              [stats ? `${(stats.dictionary / 1000).toFixed(0)}rb` : "23rb", "entri kamus"],
              ["N5→N1", "roadmap lengkap"],
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
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Satu tempat untuk seluruh perjalanan imersimu</h2>
          <p className="lead" style={{ margin: "0 auto" }}>Dibuat khusus untuk pelajar Indonesia yang ingin lulus JLPT tanpa kehilangan kesenangan belajar.</p>
        </div>
        <div className="grid c3">
          {[
            { icon: <Clapperboard />, t: "Studio Tonton", d: "Putar YouTube atau file anime/film milikmu dengan subtitle Jepang interaktif. Jeda otomatis, ulangi baris, dan mode dengar." },
            { icon: <MousePointerClick />, t: "Klik kata = arti", d: "Setiap kata di subtitle dan bacaan bisa diklik: cara baca, arti, level JLPT, dan penjelasan AI dalam Bahasa Indonesia." },
            { icon: <Pickaxe />, t: "Sentence mining", d: "Simpan kata beserta kalimat aslinya dan tangkapan layar adegan. Konteks membuat ingatan bertahan lebih lama." },
            { icon: <Brain />, t: "Flashcard FSRS", d: "Algoritma pengulangan berjarak modern yang menjadwalkan review tepat sebelum kamu lupa." },
            { icon: <LibraryBig />, t: "Cerita bertingkat", d: "Bacaan asli N5 sampai N1 dengan furigana adaptif, audio, dan terjemahan Indonesia per kalimat." },
            { icon: <Bot />, t: "Sensei AI", d: "Tutor percakapan yang mengoreksi kalimatmu, membuat cerita sesuai levelmu, dan menjelaskan tata bahasa." },
            { icon: <Type />, t: "Kanji & kosakata", d: "Ribuan kosakata dan kanji per level JLPT, lengkap dengan animasi urutan goresan dan contoh kata." },
            { icon: <Target />, t: "Kuis ala JLPT", d: "Latihan membaca kanji, arti kata, dan pola tata bahasa dengan format pilihan ganda seperti ujian." },
            { icon: <Flame />, t: "Log & streak", d: "Catat jam imersi, pantau heatmap harian, dan lihat progres menuju target jam per level." },
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
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Input → Tambang → Ulangi → Uji</h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Bahasa diperoleh lewat input yang bisa dipahami dalam jumlah besar. Tugas kami: membuat setiap menit tontonanmu menjadi input yang efektif.
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
            <Captions style={{ color: "var(--mars-2)", width: 28, height: 28 }} />
            <h3 style={{ marginTop: 10 }}>Siap mencoba?</h3>
            <p className="muted">Tentukan levelmu dan dapatkan rencana harian dalam 1 menit.</p>
            <Link to={cta} className="btn primary">Mulai sekarang <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section id="level" className="section">
        <div className="section-head">
          <div className="eyebrow">Roadmap</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Dari pendaratan sampai terraform</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
          {LEVELS.map((l) => {
            const info = LEVEL_INFO[l];
            return (
              <div key={l} className="card hover">
                <div className="row between">
                  <LevelBadge level={l} />
                  <span className="muted" style={{ fontSize: "0.75rem" }}>{info.hours[0]}–{info.hours[1]} jam</span>
                </div>
                <div className="step-num" style={{ marginTop: 14 }}>{info.phase}</div>
                <p style={{ margin: "6px 0 10px", fontWeight: 650 }}>{info.tagline}</p>
                <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Kanji {info.kanji} · Kosakata {info.vocab}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="card hero-card pad-lg glow" style={{ textAlign: "center", padding: "56px 24px" }}>
          <ScanText style={{ width: 34, height: 34, margin: "0 auto 12px", color: "var(--gold)" }} />
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>
            Tonton hari ini. <span className="text-grad">Pahami besok.</span>
          </h2>
          <p className="lead" style={{ margin: "0 auto 24px" }}>Gratis, tanpa iklan, dan progres tersimpan di perangkatmu.</p>
          <Link to={cta} className="btn primary lg">Mulai Gratis <ArrowRight /></Link>
        </div>
      </section>

      <footer className="footer">
        <div className="row wrap between" style={{ gap: 20 }}>
          <Logo />
          <div style={{ maxWidth: 640 }}>
            Data kamus berasal dari JMdict, KANJIDIC2, dan KanjiVG milik EDRDG / Ulrich Apel (lisensi CC BY-SA). Tokenisasi memakai kuromoji.js
            (Apache-2.0). Cerita dan materi tata bahasa adalah karya asli THE MARS. © {new Date().getFullYear()} THE MARS.
          </div>
        </div>
      </footer>
    </div>
  );
}
