import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenText, Bot, Target, Volume2 } from "lucide-react";
import { useGrammar } from "../lib/data.ts";
import { useStore } from "../lib/store.ts";
import { speak } from "../lib/tts.ts";
import { LEVELS, type Level } from "../lib/types.ts";
import { JapaneseText } from "../components/JapaneseText.tsx";
import { LevelBadge, PageHead, Seg } from "../components/ui.tsx";
import { useAiEnabled } from "../lib/aiStatus.ts";

export default function Grammar() {
  const my = useStore((s) => s.profile.level);
  const [level, setLevel] = useState<Level>(my);
  const { data, loading } = useGrammar();
  const aiOn = useAiEnabled();
  const list = useMemo(() => (data ?? []).filter((g) => g.level === level), [data, level]);

  return (
    <div className="page">
      <PageHead
        eyebrow={<><BookOpenText style={{ width: 14 }} /> Tata Bahasa</>}
        title={`Pola tata bahasa N${level}`}
        lead="Pola-pola yang sering keluar di JLPT, dijelaskan dalam Bahasa Indonesia dengan contoh kalimat interaktif. Setelah paham, temukan pola ini di tontonanmu."
      >
        <Link to={`/kuis?mode=grammar&level=${level}`} className="btn primary"><Target /> Latihan N{level}</Link>
      </PageHead>

      <div style={{ marginBottom: 20 }}>
        <Seg value={level} onChange={setLevel} options={LEVELS.map((l) => ({ v: l, label: `N${l}` }))} />
      </div>

      {loading && <div className="skeleton" style={{ height: 300 }} />}
      <div className="stack" style={{ gap: 16 }}>
        {list.map((g, i) => (
          <article key={g.id} className="card" id={g.id}>
            <div className="row wrap" style={{ gap: 10, marginBottom: 12 }}>
              <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="jp" style={{ margin: 0, fontSize: "1.6rem" }}>{g.pattern}</h2>
              <span className="badge gold">{g.meaning}</span>
              <span className="grow" />
              <LevelBadge level={g.level} />
            </div>
            <div className="grid collapse" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr)", gap: 20 }}>
              <div>
                <div className="label">Pembentukan</div>
                <div className="jp" style={{ padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", margin: "6px 0 12px", fontWeight: 600 }}>{g.formation}</div>
                <p style={{ color: "var(--text-2)", margin: 0 }}>{g.explanation}</p>
                {aiOn && (
                  <Link to={`/sensei?q=${encodeURIComponent(`Jelaskan pola ${g.pattern} dengan 3 contoh lain dan bedanya dengan pola yang mirip.`)}`} className="btn sm ghost" style={{ marginTop: 12 }}>
                    <Bot /> Tanya Sensei AI
                  </Link>
                )}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {g.examples.map((ex, j) => (
                  <div key={j} className="row" style={{ alignItems: "flex-start", padding: "10px 12px", borderRadius: 14, background: "var(--bg-2)" }}>
                    <button className="btn icon sm ghost" onClick={() => speak(ex.ja)} aria-label="Dengarkan"><Volume2 /></button>
                    <div className="grow">
                      <JapaneseText words={ex.w} size="sm" context={{ ja: ex.ja, tr: ex.id, src: `Tata bahasa ${g.pattern}`, level: g.level }} />
                      <div className="tr">{ex.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: 20 }}>
        Singkatan: KB = kata benda, KK = kata kerja, KS = kata sifat.
      </p>
    </div>
  );
}
