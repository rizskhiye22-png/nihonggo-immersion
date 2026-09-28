import { useMemo, useState } from "react";
import { BookmarkPlus, Check, Layers, Plus, Search, Volume2 } from "lucide-react";
import { useVocab, type VocabItem } from "../lib/data.ts";
import { setWordStatus, useStore, type WordStatus } from "../lib/store.ts";
import { addCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { kataToHira } from "../lib/japanese.ts";
import { LEVELS, type Level } from "../lib/types.ts";
import { LevelBadge, PageHead, Seg, toast } from "../components/ui.tsx";

type Filter = "all" | "new" | "learning" | "known";
const PAGE = 80;

export default function Vocab() {
  const my = useStore((s) => s.profile.level);
  const words = useStore((s) => s.words);
  const [level, setLevel] = useState<Level>(my);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const { data, loading } = useVocab(level);

  const status = (v: VocabItem): WordStatus | "new" => words[String(v.i)]?.s ?? "new";

  const counts = useMemo(() => {
    const c = { known: 0, learning: 0, new: 0 };
    for (const v of data ?? []) c[status(v)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, words]);

  const list = useMemo(() => {
    const needle = kataToHira(q.trim().toLowerCase());
    return (data ?? []).filter((v) => {
      if (filter !== "all" && status(v) !== filter) return false;
      if (!needle) return true;
      return v.w.includes(q) || kataToHira(v.r).includes(needle) || v.m.some((m) => m.toLowerCase().includes(needle));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, filter, words]);

  const add = (v: VocabItem) => addCard({ key: String(v.i), w: v.w, r: v.r, m: v.m.join("; "), level, src: `Kosakata N${level}` });

  const addNext = (n: number) => {
    let added = 0;
    for (const v of data ?? []) {
      if (added >= n) break;
      if (status(v) === "new" && add(v)) added++;
    }
    toast(added ? `${added} kata baru N${level} masuk review` : "Tidak ada kata baru tersisa");
  };

  const total = data?.length ?? 0;

  return (
    <div className="page">
      <PageHead
        eyebrow={<><Layers style={{ width: 14 }} /> Kosakata JLPT</>}
        title={`Kosakata N${level}`}
        lead="Daftar kosakata per level JLPT, diurutkan dari yang paling sering muncul. Tandai yang sudah kamu tahu, dan kirim sisanya ke review sedikit demi sedikit."
      >
        <button className="btn" onClick={() => addNext(10)}><Plus /> 10 kata baru</button>
        <button className="btn primary" onClick={() => addNext(25)}><BookmarkPlus /> 25 kata baru</button>
      </PageHead>

      <div className="grid c3" style={{ marginBottom: 18 }}>
        {[
          { l: "Dikuasai", v: counts.known, c: "var(--ok)" },
          { l: "Sedang dipelajari", v: counts.learning, c: "var(--warn)" },
          { l: "Belum dipelajari", v: counts.new, c: "var(--muted)" },
        ].map((s) => (
          <div key={s.l} className="card" style={{ padding: 18 }}>
            <div className="stat-value" style={{ color: s.c }}>{s.v}</div>
            <div className="stat-label">{s.l} · {total ? Math.round((s.v / total) * 100) : 0}%</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <Seg value={level} onChange={(l) => { setLevel(l); setLimit(PAGE); }} options={LEVELS.map((l) => ({ v: l, label: `N${l}` }))} />
          <div className="search grow" style={{ minWidth: 220 }}>
            <Search />
            <input className="input" placeholder="Cari kanji, kana, atau arti (Inggris)…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
          </div>
          <Seg value={filter} onChange={(f) => { setFilter(f); setLimit(PAGE); }} options={[
            { v: "all" as const, label: "Semua" }, { v: "new" as const, label: "Baru" }, { v: "learning" as const, label: "Belajar" }, { v: "known" as const, label: "Dikuasai" },
          ]} />
        </div>
      </div>

      <div className="card" style={{ padding: 6 }}>
        {loading && <div className="skeleton" style={{ height: 300, margin: 10 }} />}
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Kata</th>
              <th>Arti</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((v) => {
              const st = status(v);
              return (
                <tr key={v.i}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <button className="btn icon sm ghost" onClick={() => speak(v.w)} aria-label="Dengarkan"><Volume2 /></button>
                      <div>
                        <div className="jp" style={{ fontSize: "1.2rem", fontWeight: 600 }}>{v.w}</div>
                        {v.r !== v.w && <div className="jp muted" style={{ fontSize: "0.82rem" }}>{v.r}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{v.m.join("; ")}</div>
                    <div className="faint" style={{ fontSize: "0.75rem" }}>{v.p}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      {st === "learning" ? (
                        <span className="badge warn">Belajar</span>
                      ) : (
                        <button className="btn sm" disabled={st === "known"} onClick={() => add(v) && toast(`「${v.w}」 masuk review`)} title="Tambah ke review"><BookmarkPlus /></button>
                      )}
                      <button className={`btn sm${st === "known" ? " gold" : ""}`} onClick={() => setWordStatus(String(v.i), st === "known" ? null : "known")} title="Tandai sudah tahu">
                        <Check />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length > limit && (
          <div style={{ textAlign: "center", padding: 16 }}>
            <button className="btn" onClick={() => setLimit((l) => l + PAGE * 2)}>Tampilkan lebih banyak ({list.length - limit} lagi)</button>
          </div>
        )}
        {!loading && list.length === 0 && <p className="muted" style={{ textAlign: "center", padding: 30 }}>Tidak ada kata yang cocok.</p>}
      </div>
      <p className="muted" style={{ fontSize: "0.78rem", marginTop: 14 }}>
        <LevelBadge level={level} /> Klasifikasi level adalah perkiraan komunitas (JLPT tidak menerbitkan daftar resmi sejak 2010). Arti dari JMdict (bahasa Inggris).
      </p>
    </div>
  );
}
