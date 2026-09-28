import { useEffect, useState } from "react";
import { Pause, Play, Sparkles, Volume2 } from "lucide-react";
import type { Word } from "../lib/japanese.ts";
import type { Level } from "../lib/types.ts";
import { speak, stopSpeaking } from "../lib/tts.ts";
import { streamAi } from "../lib/ai.ts";
import { JapaneseText } from "./JapaneseText.tsx";
import type { PopupContext } from "./WordPopup.tsx";
import { AiText } from "./AiText.tsx";
import { useAiEnabled } from "../lib/aiStatus.ts";

export type TrMode = "hide" | "blur" | "show";
type S = { ja: string; id?: string; w: Word[] };

/** Daftar kalimat interaktif: audio per kalimat, putar semua, terjemahan, dan analisis AI. */
export function SentenceList({ sentences, tr, base, level, playAll, onPlayAllEnd }: {
  sentences: S[];
  tr: TrMode;
  base: PopupContext;
  level: Level;
  playAll: boolean;
  onPlayAllEnd: () => void;
}) {
  const [playing, setPlaying] = useState(-1);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [ai, setAi] = useState<Record<number, { text: string; busy: boolean; error?: string }>>({});
  const aiOn = useAiEnabled();

  useEffect(() => {
    if (!playAll) {
      stopSpeaking();
      setPlaying(-1);
      return;
    }
    let i = 0;
    let stopped = false;
    const step = () => {
      if (stopped) return;
      if (i >= sentences.length) {
        setPlaying(-1);
        onPlayAllEnd();
        return;
      }
      setPlaying(i);
      document.querySelector(`[data-sent="${i}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      speak(sentences[i].ja, { onEnd: () => setTimeout(() => { i++; step(); }, 450) });
    };
    step();
    return () => {
      stopped = true;
      stopSpeaking();
    };
  }, [playAll, sentences, onPlayAllEnd]);

  useEffect(() => () => stopSpeaking(), []);

  async function explain(i: number) {
    setAi((a) => ({ ...a, [i]: { text: "", busy: true } }));
    try {
      await streamAi("explain", { sentence: sentences[i].ja, level }, (text) => setAi((a) => ({ ...a, [i]: { text, busy: true } })));
      setAi((a) => ({ ...a, [i]: { ...a[i], busy: false } }));
    } catch (e) {
      setAi((a) => ({ ...a, [i]: { text: "", busy: false, error: (e as Error).message } }));
    }
  }

  return (
    <div className="stack" style={{ gap: 4 }}>
      {sentences.map((s, i) => (
        <div key={i} data-sent={i} className={`sentence${playing === i ? " playing" : ""}`}>
          <div className="tools">
            <button className="btn icon sm ghost" aria-label="Dengarkan kalimat" onClick={() => {
              if (playing === i) { stopSpeaking(); setPlaying(-1); }
              else { setPlaying(i); speak(s.ja, { onEnd: () => setPlaying(-1) }); }
            }}>
              {playing === i ? <Pause /> : <Volume2 />}
            </button>
            {aiOn && (
              <button className="btn icon sm ghost" aria-label="Analisis AI" onClick={() => explain(i)}>
                <Sparkles />
              </button>
            )}
          </div>
          <div className="grow">
            <JapaneseText words={s.w} context={{ ...base, ja: s.ja, tr: s.id }} />
            {s.id && tr !== "hide" && (
              <div
                className={`tr${tr === "blur" && !revealed.has(i) ? " blur" : ""}`}
                onClick={() => setRevealed((r) => new Set(r).add(i))}
              >
                {s.id}
              </div>
            )}
            {ai[i] && (
              <div className="card" style={{ marginTop: 10, padding: 14, background: "var(--bg-2)" }}>
                {ai[i].error ? <span style={{ color: "var(--danger)" }}>{ai[i].error}</span> : <AiText text={ai[i].text || "…"} streaming={ai[i].busy} />}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlayAllButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`btn sm${on ? " primary" : ""}`} onClick={onClick}>
      {on ? <Pause /> : <Play />} {on ? "Hentikan audio" : "Putar semua"}
    </button>
  );
}
