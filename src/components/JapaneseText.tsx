import { memo } from "react";
import type { Word } from "../lib/japanese.ts";
import { useStore } from "../lib/store.ts";
import { wordKey } from "../lib/dict.ts";
import { useWordPopup, type PopupContext } from "./WordPopup.tsx";

type Props = {
  words: Word[];
  size?: "sm" | "lg" | "xl";
  context?: PopupContext;
  /** Nonaktifkan klik (mis. di kuis) */
  static?: boolean;
  furigana?: "all" | "unknown" | "none";
  className?: string;
};

/** Teks Jepang interaktif: furigana, warna status kata, klik untuk kamus. */
export const JapaneseText = memo(function JapaneseText({ words, size, context, static: isStatic, furigana, className }: Props) {
  const status = useStore((s) => s.words);
  const setting = useStore((s) => s.settings.furigana);
  const mode = furigana ?? setting;
  const popup = useWordPopup();

  return (
    <span className={`jt${size ? " " + size : ""}${className ? " " + className : ""}`}>
      {words.map((w, i) => {
        if (w.c === "x") return <span key={i}>{w.s}</span>;
        const st = status[wordKey(w)]?.s;
        const cls = ["w", w.c === "w" ? st ?? "new" : "fn", popup.selected === w ? "sel" : ""].join(" ");
        const showFuri = mode === "all" || (mode === "unknown" && st !== "known");
        const body = w.f
          ? w.f.map((seg, j) =>
              seg.r ? (
                <ruby key={j} className={showFuri ? undefined : "hide-furi"}>
                  {seg.t}
                  <rt>{seg.r}</rt>
                </ruby>
              ) : (
                <span key={j}>{seg.t}</span>
              ),
            )
          : w.s;
        if (isStatic) return <span key={i}>{body}</span>;
        return (
          <span
            key={i}
            className={cls}
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              popup.open(w, (e.currentTarget as HTMLElement).getBoundingClientRect(), context);
            }}
          >
            {body}
          </span>
        );
      })}
    </span>
  );
});
