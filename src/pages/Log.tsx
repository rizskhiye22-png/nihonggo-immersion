import { useMemo, useState } from "react";
import { Clock, NotebookPen, Plus, Trash2 } from "lucide-react";
import { addLog, minutesByDate, removeLog, today, useStore, type LogKind } from "../lib/store.ts";
import { LEVEL_INFO } from "../lib/levels.ts";
import { Heatmap } from "../components/Heatmap.tsx";
import { Bar, PageHead, toast } from "../components/ui.tsx";

const KINDS: { v: LogKind; label: string; color: string }[] = [
  { v: "tonton", label: "Menonton", color: "#ff6a3d" },
  { v: "dengar", label: "Mendengar", color: "#e9c37d" },
  { v: "baca", label: "Membaca", color: "#7cc7ff" },
  { v: "review", label: "Review", color: "#a78bfa" },
  { v: "bicara", label: "Berbicara", color: "#4ade80" },
  { v: "lainnya", label: "Lainnya", color: "#968d86" },
];

export default function Log() {
  const log = useStore((s) => s.log);
  const profile = useStore((s) => s.profile);
  const [form, setForm] = useState({ date: today(), min: 30, kind: "tonton" as LogKind, note: "" });
  const byDate = useMemo(() => minutesByDate(log), [log]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of log) t[e.kind] = (t[e.kind] ?? 0) + e.min;
    return t;
  }, [log]);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const week = useMemo(() => {
    let m = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      m += byDate.get(today(d)) ?? 0;
    }
    return m;
  }, [byDate]);
  const info = LEVEL_INFO[profile.level];
  const sorted = useMemo(() => [...log].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100), [log]);

  return (
    <div className="page">
      <PageHead
        eyebrow={<><NotebookPen style={{ width: 14 }} /> Log Imersi</>}
        title={`${(total / 60).toFixed(1)} jam imersi`}
        lead="Waktu dari Studio Tonton, bacaan, review, dan Sensei AI tercatat otomatis. Tambahkan juga imersi di luar aplikasi (podcast di jalan, drama di TV, dll.)."
      />

      <div className="grid c3" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="stat-icon"><Clock /></div>
          <div className="stat-value">{Math.round(week)} mnt</div>
          <div className="stat-label">7 hari terakhir · rata-rata {Math.round(week / 7)} mnt/hari</div>
        </div>
        <div className="card span-2">
          <div className="row between" style={{ marginBottom: 8 }}>
            <strong>Menuju jam N{profile.level}</strong>
            <span className="muted">{(total / 60).toFixed(1)} / {info.hours[0]}–{info.hours[1]} jam</span>
          </div>
          <Bar value={total / 60} max={info.hours[1]} />
          <div className="bar stacked" style={{ marginTop: 14, height: 12 }}>
            {KINDS.map((k) => <span key={k.v} style={{ width: `${total ? ((totals[k.v] ?? 0) / total) * 100 : 0}%`, background: k.color }} />)}
          </div>
          <div className="row wrap" style={{ gap: 14, marginTop: 10, fontSize: "0.78rem" }}>
            {KINDS.map((k) => (
              <span key={k.v} className="muted"><span style={{ color: k.color }}>●</span> {k.label} {Math.round((totals[k.v] ?? 0) / 60 * 10) / 10}j</span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Heatmap aktivitas</h3>
        <Heatmap minutes={byDate} goal={profile.goalMin} weeks={26} />
      </div>

      <div className="grid collapse" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)" }}>
        <div className="card">
          <h3>Tambah catatan</h3>
          <div className="stack">
            <div className="field"><label>Tanggal</label><input className="input" type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="field"><label>Durasi (menit)</label><input className="input" type="number" min={1} max={600} value={form.min} onChange={(e) => setForm({ ...form, min: Number(e.target.value) })} /></div>
            <div className="field">
              <label>Jenis</label>
              <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LogKind })}>
                {KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Catatan</label><input className="input" placeholder="mis. Barakamon ep 3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <button className="btn primary" disabled={form.min <= 0} onClick={() => { addLog(form.min, form.kind, form.note || undefined, form.date); toast("Catatan ditambahkan"); setForm({ ...form, note: "" }); }}>
              <Plus /> Simpan
            </button>
          </div>
        </div>
        <div className="card" style={{ padding: 6 }}>
          <table className="tbl">
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Catatan</th><th style={{ textAlign: "right" }}>Menit</th><th /></tr></thead>
            <tbody>
              {sorted.map((e) => {
                const k = KINDS.find((x) => x.v === e.kind)!;
                return (
                  <tr key={e.id}>
                    <td className="mono" style={{ fontSize: "0.82rem" }}>{e.date}</td>
                    <td><span style={{ color: k.color }}>●</span> {k.label}</td>
                    <td className="muted">{e.note ?? "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{Math.round(e.min)}</td>
                    <td style={{ textAlign: "right" }}><button className="btn icon sm ghost" onClick={() => removeLog(e.id)} aria-label="Hapus"><Trash2 /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && <p className="muted" style={{ textAlign: "center", padding: 30 }}>Belum ada catatan imersi.</p>}
        </div>
      </div>
    </div>
  );
}
