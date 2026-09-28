import { useEffect, useState } from "react";
import { Languages, Pause, Play, Volume2 } from "lucide-react";
import type { Word } from "../lib/japanese.ts";
import type { Level } from "../lib/types.ts";
import { speak, stopSpeaking } from "../lib/tts.ts";
import { translate } from "../lib/translate.ts";
import { JapaneseText } from "./JapaneseText.tsx";
import type { PopupContext } from "./WordPopup.tsx";
import { toast } from "./ui.tsx";

export type TrMode = "hide" | "blur" | "show";
type S = { ja: string; id?: string; w: Word[] };

/** Daftar kalimat interaktif: audio per kalimat, putar semua, dan terjemahan (lokal). */
export function SentenceList({ sentences, tr, base, playAll, onPlayAllEnd }: {
  sentences: S[];
  tr: TrMode;
  base: PopupContext;
  level?: Level;
  playAll: boolean;
  onPlayAllEnd: () => void;
}) {
  const [playing, setPlaying] = useState(-1);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [local, setLocal] = useState<Record<number, string>>({});

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

  async function translateOne(i: number) {
    try {
      const t = await translate(sentences[i].ja);
      setLocal((m) => ({ ...m, [i]: t }));
    } catch (e) {
      toast((e as Error).message);
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
            {!s.id && !local[i] && (
              <button className="btn icon sm ghost" aria-label="Terjemahkan kalimat" title="Terjemahkan (lokal)" onClick={() => translateOne(i)}>
                <Languages />
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
            {local[i] && <div className="tr">🇮🇩 {local[i]}</div>}
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
