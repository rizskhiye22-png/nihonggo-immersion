import { useEffect, useMemo, useState } from "react";
import { BookmarkPlus, Check, Play, Search, Type, Volume2 } from "lucide-react";
import { KANJI_GROUPS, kanjiGroupFor, urls, useJson, type KanjiItem } from "../lib/data.ts";
import { setWordStatus, useStore } from "../lib/store.ts";
import { addCard, hasCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { Modal, PageHead, Seg, toast } from "../components/ui.tsx";

export default function KanjiPage() {
  const my = useStore((s) => s.profile.level);
  const words = useStore((s) => s.words);
  const [group, setGroup] = useState<string>(kanjiGroupFor(my));
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<KanjiItem | null>(null);
  const { data, loading } = useJson<KanjiItem[]>(urls.kanji(group));

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return data ?? [];
    return (data ?? []).filter((k) => k.c === n || k.m.some((m) => m.toLowerCase().includes(n)) || [...k.on, ...k.kun].some((r) => r.replace(/[.-]/g, "").includes(n)));
  }, [data, q]);
  const known = (data ?? []).filter((k) => words[`k:${k.c}`]?.s === "known").length;

  return (
    <div className="page">
      <PageHead
        eyebrow={<><Type style={{ width: 14 }} /> Kanji</>}
        title="Kanji per level JLPT"
        lead="Pelajari kanji lewat kata yang sering dipakai. Klik kanji untuk melihat animasi urutan goresan, cara baca, dan contoh kosakata."
      >
        <span className="badge ok">{known} / {data?.length ?? 0} dikuasai</span>
      </PageHead>

      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <Seg value={group} onChange={setGroup} options={KANJI_GROUPS.map((g) => ({ v: g.id as string, label: g.label }))} />
          <div className="search grow" style={{ minWidth: 220 }}>
            <Search />
            <input className="input" placeholder="Cari kanji, arti (Inggris), atau bacaan…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {group === "n3" && <p className="muted" style={{ fontSize: "0.8rem", margin: "10px 0 0" }}>Data kanji memakai pembagian JLPT lama, sehingga N3 dan N2 digabung.</p>}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <div className="kanji-grid">
          {list.map((k) => (
            <button key={k.c} className={`kanji-cell${words[`k:${k.c}`]?.s === "known" ? " known" : ""}`} onClick={() => setSel(k)} title={k.m.join(", ")}>
              {k.c}
            </button>
          ))}
        </div>
      )}

      {sel && <KanjiDetail k={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function StrokeOrder({ strokes }: { strokes: string[] }) {
  const [run, setRun] = useState(0);
  useEffect(() => setRun((r) => r + 1), [strokes]);
  return (
    <div>
      <svg key={run} className="stroke-svg animate" viewBox="0 0 109 109">
        {strokes.map((d, i) => (
          <path key={i} d={d} pathLength={1} style={{ ["--len" as string]: 1, animationDelay: `${i * 0.5}s` }} />
        ))}
      </svg>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button className="btn sm" onClick={() => setRun((r) => r + 1)}><Play /> Ulangi animasi</button>
      </div>
    </div>
  );
}

function KanjiDetail({ k, onClose }: { k: KanjiItem; onClose: () => void }) {
  const st = useStore((s) => s.words[`k:${k.c}`]?.s);
  return (
    <Modal onClose={onClose} wide>
      <div className="grid collapse" style={{ gridTemplateColumns: "240px 1fr", gap: 26 }}>
        <div>
          {k.s?.length ? <StrokeOrder strokes={k.s} /> : <div className="stroke-svg jp-serif" style={{ display: "grid", placeItems: "center", fontSize: "7rem" }}>{k.c}</div>}
          <p className="muted" style={{ textAlign: "center", fontSize: "0.82rem" }}>{k.n} goresan{k.g ? ` · kelas ${k.g}` : ""}</p>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <div className="row">
            <div className="jp-serif" style={{ fontSize: "3.6rem", lineHeight: 1 }}>{k.c}</div>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{k.m.join(", ")}</div>
            </div>
          </div>
          <div className="grid c2" style={{ gap: 10 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="label">On'yomi (bacaan China)</div>
              <div className="jp" style={{ fontSize: "1.1rem" }}>{k.on.join("、") || "—"}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="label">Kun'yomi (bacaan Jepang)</div>
              <div className="jp" style={{ fontSize: "1.1rem" }}>{k.kun.join("、") || "—"}</div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Contoh kosakata</div>
            <div className="list">
              {k.x.length === 0 && <p className="muted">Belum ada contoh di daftar JLPT.</p>}
              {k.x.map(([w, r, m]) => (
                <div key={w} className="vocab-row">
                  <button className="btn icon sm ghost" onClick={() => speak(w)}><Volume2 /></button>
                  <div>
                    <span className="jp" style={{ fontSize: "1.1rem" }}>{w}</span> <span className="jp muted" style={{ fontSize: "0.85rem" }}>{r}</span>
                    <div className="muted" style={{ fontSize: "0.84rem" }}>{m}</div>
                  </div>
                  <button className="btn icon sm" title="Tambah ke review" disabled={hasCard(`kx:${w}`)} onClick={() => { addCard({ key: `kx:${w}`, w, r, m, src: `Kanji ${k.c}` }); toast(`「${w}」 masuk review`); }}>
                    <BookmarkPlus />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button className={`btn${st === "known" ? " gold" : " primary"}`} onClick={() => setWordStatus(`k:${k.c}`, st === "known" ? null : "known")}>
            <Check /> {st === "known" ? "Sudah dikuasai" : "Tandai dikuasai"}
          </button>
        </div>
      </div>
      <p className="faint" style={{ fontSize: "0.72rem", marginTop: 16 }}>Data goresan: KanjiVG © Ulrich Apel (CC BY-SA 3.0).</p>
    </Modal>
  );
}
