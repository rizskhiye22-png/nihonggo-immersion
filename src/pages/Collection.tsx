import { useMemo, useState } from "react";
import { Download, GraduationCap, Search, Trash2, Volume2 } from "lucide-react";
import { useStore } from "../lib/store.ts";
import { removeCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { LevelBadge, PageHead, Seg } from "../components/ui.tsx";

type F = "all" | "new" | "learning" | "review";
const STATE_LABEL = ["Baru", "Belajar", "Review", "Ulang"];

export default function Collection() {
  const cards = useStore((s) => s.cards);
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return Object.values(cards)
      .filter((c) => (f === "all" ? true : f === "new" ? c.fsrs.state === 0 : f === "learning" ? c.fsrs.state === 1 || c.fsrs.state === 3 : c.fsrs.state === 2))
      .filter((c) => !n || c.w.includes(q) || c.r.includes(q) || c.m.toLowerCase().includes(n) || c.src?.toLowerCase().includes(n))
      .sort((a, b) => b.created - a.created);
  }, [cards, q, f]);

  const exportCsv = () => {
    // Format kompatibel impor Anki: Depan ; Belakang ; Konteks ; Sumber
    const esc = (s = "") => `"${s.replace(/"/g, '""')}"`;
    const rows = Object.values(cards).map((c) => [c.w, `${c.r} — ${c.m}`, c.ctx ? `${c.ctx}${c.ctxTr ? ` / ${c.ctxTr}` : ""}` : "", c.src ?? ""].map(esc).join(";"));
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `the-mars-kartu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <PageHead
        eyebrow={<><GraduationCap style={{ width: 14 }} /> Koleksi Kartu</>}
        title={`${Object.keys(cards).length} kartu tambangan`}
        lead="Semua kata yang kamu tambang beserta konteks dan sumbernya. Ekspor ke CSV untuk dipakai di Anki."
      >
        <button className="btn" onClick={exportCsv} disabled={!Object.keys(cards).length}><Download /> Ekspor CSV (Anki)</button>
      </PageHead>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <div className="search grow" style={{ minWidth: 220 }}>
            <Search />
            <input className="input" placeholder="Cari kata, arti, atau sumber…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Seg value={f} onChange={setF} options={[{ v: "all" as const, label: "Semua" }, { v: "new" as const, label: "Baru" }, { v: "learning" as const, label: "Belajar" }, { v: "review" as const, label: "Review" }]} />
        </div>
      </div>

      <div className="card" style={{ padding: 6 }}>
        <table className="tbl">
          <thead>
            <tr><th>Kata</th><th>Arti & konteks</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td style={{ minWidth: 140 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn icon sm ghost" onClick={() => speak(c.w)}><Volume2 /></button>
                    <div>
                      <div className="jp" style={{ fontSize: "1.15rem", fontWeight: 600 }}>{c.w}</div>
                      <div className="jp muted" style={{ fontSize: "0.8rem" }}>{c.r}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{c.m}</div>
                  {c.ctx && <div className="jp muted" style={{ fontSize: "0.85rem" }}>{c.ctx}</div>}
                  {c.src && <div className="faint" style={{ fontSize: "0.74rem" }}>{c.src}</div>}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="row" style={{ gap: 6 }}>
                    {c.level && <LevelBadge level={c.level} />}
                    <span className="badge">{STATE_LABEL[c.fsrs.state]}</span>
                  </div>
                  <div className="faint" style={{ fontSize: "0.72rem", marginTop: 4 }}>
                    {c.fsrs.state === 0 ? "belum direview" : `jadwal ${new Date(c.fsrs.due).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn icon sm ghost danger" onClick={() => confirm(`Hapus kartu 「${c.w}」?`) && removeCard(c.id)} aria-label="Hapus"><Trash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="muted" style={{ textAlign: "center", padding: 30 }}>Belum ada kartu. Klik kata di mana saja lalu tekan “Tambang”.</p>}
      </div>
    </div>
  );
}
