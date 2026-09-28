import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Logo } from "../components/Logo.tsx";
import { LevelBadge } from "../components/ui.tsx";
import { setState, useStore } from "../lib/store.ts";
import { LEVEL_INFO } from "../lib/levels.ts";
import { LEVELS, type Level } from "../lib/types.ts";

const GOALS = [
  { min: 20, label: "Santai", d: "20 menit/hari · cocok untuk jadwal padat" },
  { min: 45, label: "Serius", d: "45 menit/hari · progres stabil" },
  { min: 90, label: "Intensif", d: "90 menit/hari · kejar target ujian" },
  { min: 180, label: "Imersi penuh", d: "3 jam/hari · hidup dalam bahasa Jepang" },
];

export default function Onboarding() {
  const profile = useStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name);
  const [level, setLevel] = useState<Level>(profile.level);
  const [goal, setGoal] = useState(profile.goalMin);
  const [exam, setExam] = useState<"jul" | "dec" | null>(profile.exam);
  const nav = useNavigate();

  const finish = () => {
    setState((s) => ({ ...s, profile: { ...s.profile, name: name.trim(), level, goalMin: goal, exam, onboarded: true } }));
    nav("/beranda");
  };

  const steps = [
    <div key="name" className="stack">
      <h1>Selamat datang di THE MARS 🚀</h1>
      <p className="lead">Kita siapkan rencana imersimu dalam 4 langkah singkat. Siapa namamu?</p>
      <input className="input" autoFocus placeholder="Nama panggilan" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setStep(1)} />
    </div>,
    <div key="level" className="stack">
      <h1>Level JLPT yang ingin kamu capai?</h1>
      <p className="lead">Pilih level target berikutnya. Kalau baru mulai, pilih N5.</p>
      <div className="stack" style={{ gap: 10 }}>
        {LEVELS.map((l) => (
          <button key={l} className={`card hover${level === l ? " glow" : ""}`} style={{ textAlign: "left", padding: 16, cursor: "pointer" }} onClick={() => setLevel(l)}>
            <div className="row">
              <LevelBadge level={l} />
              <strong>{LEVEL_INFO[l].phase}</strong>
              <span className="grow" />
              {level === l && <Check style={{ color: "var(--mars-2)" }} />}
            </div>
            <div className="muted" style={{ fontSize: "0.88rem", marginTop: 6 }}>{LEVEL_INFO[l].can}</div>
          </button>
        ))}
      </div>
    </div>,
    <div key="goal" className="stack">
      <h1>Berapa lama imersi per hari?</h1>
      <p className="lead">Konsistensi lebih penting dari durasi. Kamu bisa mengubahnya kapan saja.</p>
      <div className="grid c2">
        {GOALS.map((g) => (
          <button key={g.min} className={`card hover${goal === g.min ? " glow" : ""}`} style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setGoal(g.min)}>
            <div className="stat-value" style={{ fontSize: "1.5rem" }}>{g.label}</div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>{g.d}</div>
          </button>
        ))}
      </div>
    </div>,
    <div key="exam" className="stack">
      <h1>Kapan kamu ingin ikut ujian?</h1>
      <p className="lead">JLPT diadakan setiap Juli dan Desember. Kami akan menampilkan hitung mundur di dashboard.</p>
      <div className="grid c3">
        {[
          { v: "jul" as const, t: "Juli", d: "Ujian Juli berikutnya" },
          { v: "dec" as const, t: "Desember", d: "Ujian Desember berikutnya" },
          { v: null, t: "Belum tahu", d: "Fokus belajar dulu" },
        ].map((o) => (
          <button key={String(o.v)} className={`card hover${exam === o.v ? " glow" : ""}`} style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setExam(o.v)}>
            <strong>{o.t}</strong>
            <div className="muted" style={{ fontSize: "0.85rem" }}>{o.d}</div>
          </button>
        ))}
      </div>
      <div className="callout mars" style={{ marginTop: 8 }}>
        <Check />
        <div>
          Rencana harian N{level}: {LEVEL_INFO[level].daily.map((d) => `${d.label.toLowerCase()} (${d.min} mnt)`).join(", ")}.
        </div>
      </div>
    </div>,
  ];

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(680px, 100%)" }}>
        <div className="row between" style={{ marginBottom: 28 }}>
          <Logo />
          <span className="muted mono" style={{ fontSize: "0.8rem" }}>{step + 1} / {steps.length}</span>
        </div>
        <div className="bar thin" style={{ marginBottom: 28 }}>
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="card pad-lg" style={{ animation: "page-in .4s var(--ease)" }} key={step}>
          {steps[step]}
          <div className="row between" style={{ marginTop: 28 }}>
            <button className="btn ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ArrowLeft /> Kembali
            </button>
            {step < steps.length - 1 ? (
              <button className="btn primary" onClick={() => setStep((s) => s + 1)}>
                Lanjut <ArrowRight />
              </button>
            ) : (
              <button className="btn primary" onClick={finish}>
                Mulai belajar <ArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
