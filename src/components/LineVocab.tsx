import { memo, useEffect, useState } from "react";
import { BookmarkPlus, Check, Volume2 } from "lucide-react";
import type { Word } from "../lib/japanese.ts";
import type { DictEntry, Level } from "../lib/types.ts";
import { lookup, wordKey } from "../lib/dict.ts";
import { meaningId } from "../lib/translate.ts";
import { useStore } from "../lib/store.ts";
import { addCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { LevelBadge, toast } from "./ui.tsx";

type Row = { key: string; w: Word; e?: DictEntry; id?: string };

/**
 * Daftar kata di sebuah kalimat beserta cara baca dan arti Bahasa Indonesia —
 * muncul otomatis seperti kamus pop-up Yomitan, tanpa perlu mengklik.
 */
export const LineVocab = memo(function LineVocab({ words, sentence, src, level, hideKnown = true }: {
  words: Word[];
  sentence: string;
  src?: string;
  level?: Level;
  hideKnown?: boolean;
}) {
  const status = useStore((s) => s.words);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    const seen = new Set<string>();
    const content = words.filter((w) => {
      if (w.c !== "w" || /^[\d０-９]+$/.test(w.s)) return false;
      const k = wordKey(w);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setRows(content.map((w) => ({ key: wordKey(w), w })));
    void (async () => {
      const out: Row[] = [];
      for (const w of content) {
        const [e] = await lookup(w.b, w.s).catch(() => []);
        out.push({ key: wordKey(w), w, e });
      }
      if (!alive) return;
      setRows([...out]);
      // Terjemahkan arti ke Bahasa Indonesia satu per satu (hasil disimpan di cache)
      for (const r of out) {
        if (!r.e) continue;
        try {
          r.id = await meaningId(r.e.m);
        } catch {
          r.id = undefined;
        }
        if (!alive) return;
        setRows([...out]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [words]);

  const visible = rows.filter((r) => !hideKnown || status[r.key]?.s !== "known");
  if (!visible.length) return null;

  return (
    <div className="line-vocab">
      {visible.map((r) => {
        const st = status[r.key]?.s;
        return (
          <div key={r.key} className={`lv-item${st === "learning" ? " learning" : ""}`}>
            <button className="lv-word jp" onClick={() => speak(r.e?.w ?? r.w.b)} title="Dengarkan">
              <span className="lv-kanji">{r.e?.w ?? r.w.b}</span>
              {r.e && r.e.r !== r.e.w && <span className="lv-read">{r.e.r}</span>}
            </button>
            <div className="lv-mean">
              {r.id ? <span className="lv-id">{r.id}</span> : r.e ? <span className="muted">{r.e.m.slice(0, 2).join("; ")}</span> : <span className="faint">—</span>}
              {r.e?.j && <LevelBadge level={r.e.j} />}
            </div>
            <div className="lv-actions">
              <button className="btn icon sm ghost" aria-label="Dengarkan" onClick={() => speak(r.e?.w ?? r.w.b)}><Volume2 /></button>
              <button
                className="btn icon sm ghost"
                aria-label="Tambang ke review"
                disabled={!!st}
                onClick={() => {
                  if (addCard({ key: r.key, w: r.e?.w ?? r.w.b, r: r.e?.r ?? "", m: r.id ?? r.e?.m.slice(0, 3).join("; ") ?? "", ctx: sentence, src, level: r.e?.j ?? level }))
                    toast(`「${r.e?.w ?? r.w.b}」 masuk review`);
                }}
              >
                {st ? <Check /> : <BookmarkPlus />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
});
