import { useRef, type ReactNode } from "react";
import { Download, RotateCcw, Settings as Cog, Upload, Volume2 } from "lucide-react";
import { exportData, importData, resetAll, setState, useStore, type State } from "../lib/store.ts";
import { speak, ttsAvailable } from "../lib/tts.ts";
import { LEVELS } from "../lib/types.ts";
import { PageHead, Seg, Switch, toast } from "../components/ui.tsx";

export default function SettingsPage() {
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const setP = (p: Partial<State["profile"]>) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const setS = (p: Partial<State["settings"]>) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));

  const backup = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `the-mars-cadangan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <PageHead eyebrow={<><Cog style={{ width: 14 }} /> Pengaturan</>} title="Pengaturan" lead="Semua progres tersimpan di browser ini. Buat cadangan secara berkala agar aman saat berganti perangkat." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Profil & target</h3>
        <div className="list">
          <Row title="Nama panggilan"><input className="input" style={{ maxWidth: 260 }} value={profile.name} onChange={(e) => setP({ name: e.target.value })} /></Row>
          <Row title="Level target JLPT" desc="Menentukan rencana harian, rekomendasi, dan kosakata default.">
            <Seg value={profile.level} onChange={(level) => setP({ level })} options={LEVELS.map((l) => ({ v: l, label: `N${l}` }))} />
          </Row>
          <Row title="Target menit per hari">
            <input className="input" type="number" min={5} max={600} style={{ maxWidth: 120 }} value={profile.goalMin} onChange={(e) => setP({ goalMin: Math.max(5, Number(e.target.value)) })} />
          </Row>
          <Row title="Jadwal ujian">
            <Seg value={profile.exam ?? "none"} onChange={(v) => setP({ exam: v === "none" ? null : v })} options={[{ v: "jul" as const, label: "Juli" }, { v: "dec" as const, label: "Desember" }, { v: "none" as const, label: "Belum" }]} />
          </Row>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Belajar</h3>
        <div className="list">
          <Row title="Furigana" desc="Adaptif: furigana disembunyikan pada kata yang sudah kamu kuasai.">
            <Seg value={settings.furigana} onChange={(furigana) => setS({ furigana })} options={[{ v: "all" as const, label: "Selalu" }, { v: "unknown" as const, label: "Adaptif" }, { v: "none" as const, label: "Tanpa" }]} />
          </Row>
          <Row title="Cara membuka kamus" desc="Seperti Yomitan: tahan Shift lalu arahkan kursor ke kata. Mode arahkan membuka kamus tanpa klik.">
            <Seg value={settings.lookup} onChange={(lookup) => setS({ lookup })} options={[{ v: "click" as const, label: "Klik" }, { v: "shift" as const, label: "Klik + Shift" }, { v: "hover" as const, label: "Arahkan" }]} />
          </Row>
          <Row title="Kartu baru per hari" desc="Kartu baru yang diperkenalkan setiap hari. 10–20 ideal untuk kebanyakan orang.">
            <input className="input" type="number" min={0} max={100} style={{ maxWidth: 120 }} value={settings.newPerDay} onChange={(e) => setS({ newPerDay: Math.max(0, Number(e.target.value)) })} />
          </Row>
          <Row title="Jeda otomatis di Studio" desc="Menjeda video di akhir setiap baris subtitle (mode intensif).">
            <Switch on={settings.autoPause} onChange={(autoPause) => setS({ autoPause })} />
          </Row>
          <Row title="Kecepatan suara" desc={ttsAvailable() ? "Suara bahasa Jepang dari browser/perangkatmu." : "Browser ini tidak mendukung suara."}>
            <div className="row" style={{ minWidth: 260 }}>
              <input type="range" min={0.5} max={1.3} step={0.05} value={settings.ttsRate} onChange={(e) => setS({ ttsRate: Number(e.target.value) })} />
              <span className="mono" style={{ width: 44 }}>{settings.ttsRate.toFixed(2)}</span>
              <button className="btn icon sm" onClick={() => speak("こんにちは。一緒に日本語を勉強しましょう。")}><Volume2 /></button>
            </div>
          </Row>
          <Row title="Tema">
            <Seg value={settings.theme} onChange={(theme) => setS({ theme })} options={[{ v: "dark" as const, label: "Gelap" }, { v: "light" as const, label: "Terang" }]} />
          </Row>
        </div>
      </div>

      <div className="card">
        <h3>Data</h3>
        <div className="btn-row">
          <button className="btn" onClick={backup}><Download /> Unduh cadangan</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload /> Pulihkan cadangan</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              importData(await f.text());
              toast("Cadangan dipulihkan");
            } catch (err) {
              alert((err as Error).message);
            }
          }} />
          <span className="grow" />
          <button className="btn danger" onClick={() => confirm("Hapus SEMUA progres (kartu, log, pengaturan)? Tindakan ini tidak bisa dibatalkan.") && resetAll()}>
            <RotateCcw /> Reset semua
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="row wrap between" style={{ padding: "14px 0", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 650 }}>{title}</div>
        {desc && <div className="muted" style={{ fontSize: "0.84rem" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}
