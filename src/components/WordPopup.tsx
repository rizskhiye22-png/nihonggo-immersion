import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookmarkPlus, Check, ExternalLink, Sparkles, Volume2, X } from "lucide-react";
import type { Word } from "../lib/japanese.ts";
import type { DictEntry, Level } from "../lib/types.ts";
import { lookup, wordKey } from "../lib/dict.ts";
import { setWordStatus, useStore } from "../lib/store.ts";
import { addCard, hasCard } from "../lib/srs.ts";
import { speak } from "../lib/tts.ts";
import { streamAi } from "../lib/ai.ts";
import { putImage } from "../lib/idb.ts";
import { AiText } from "./AiText.tsx";
import { LevelBadge, toast } from "./ui.tsx";

export type PopupContext = {
  ja?: string;
  tr?: string;
  src?: string;
  level?: Level;
  glossary?: Record<string, DictEntry>;
  idMeanings?: Record<string, string>;
  /** Tangkapan layar adegan (Studio Tonton) */
  capture?: () => string | undefined;
  onOpen?: () => void;
};

type Open = { word: Word; rect: DOMRect; ctx?: PopupContext };
type Ctx = { open: (w: Word, rect: DOMRect, ctx?: PopupContext) => void; close: () => void; selected: Word | null };

const PopupCtx = createContext<Ctx>({ open: () => {}, close: () => {}, selected: null });
export const useWordPopup = () => useContext(PopupCtx);

export function WordPopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Open | null>(null);
  const open = useCallback((word: Word, rect: DOMRect, ctx?: PopupContext) => {
    ctx?.onOpen?.();
    setState({ word, rect, ctx });
  }, []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open, close, selected: state?.word ?? null }), [open, close, state]);
  return (
    <PopupCtx.Provider value={value}>
      {children}
      {state && <Popup key={`${state.word.b}-${state.rect.x}-${state.rect.y}`} {...state} onClose={close} />}
    </PopupCtx.Provider>
  );
}

function Popup({ word, rect, ctx, onClose }: Open & { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<DictEntry[] | null>(null);
  const [pos, setPos] = useState({ top: rect.bottom + 10, left: rect.left });
  const [ai, setAi] = useState<{ text: string; busy: boolean; error?: string } | null>(null);
  const key = wordKey(word);
  const status = useStore((s) => s.words[key]?.s);
  const cards = useStore((s) => s.cards);
  const inDeck = useMemo(() => Object.values(cards).some((c) => c.key === key), [cards, key]);
  const idMeaning = ctx?.idMeanings?.[word.b] ?? ctx?.idMeanings?.[word.s];

  useEffect(() => {
    let alive = true;
    const local = word.d !== undefined ? ctx?.glossary?.[word.d] : undefined;
    if (local) setEntries([local]);
    lookup(word.b, word.s).then(
      (res) => {
        if (!alive) return;
        const merged = local ? [local, ...res.filter((e) => e.i !== local.i)] : res;
        setEntries(merged.slice(0, 3));
      },
      () => alive && setEntries((e) => e ?? []),
    );
    return () => {
      alive = false;
    };
  }, [word, ctx]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.offsetHeight;
    const w = el.offsetWidth;
    let top = rect.bottom + 10;
    if (top + h > window.innerHeight - 12) top = Math.max(12, rect.top - h - 10);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 12);
    setPos({ top, left });
  }, [rect, entries, ai]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest(".w")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const main = entries?.[0];

  async function save() {
    if (hasCard(key)) return;
    let img: string | undefined;
    const shot = ctx?.capture?.();
    if (shot) {
      img = `img_${Date.now().toString(36)}`;
      await putImage(img, shot).catch(() => (img = undefined));
    }
    addCard({
      key,
      w: main?.w ?? word.b,
      r: main?.r ?? "",
      m: idMeaning ?? main?.m.slice(0, 3).join("; ") ?? "",
      ctx: ctx?.ja,
      ctxTr: ctx?.tr,
      src: ctx?.src,
      img,
      level: main?.j ?? ctx?.level,
    });
    toast(`「${main?.w ?? word.b}」 masuk ke review`);
  }

  async function explain() {
    setAi({ text: "", busy: true });
    try {
      await streamAi(
        "explain",
        { word: word.b, surface: word.s, sentence: ctx?.ja ?? word.s, level: ctx?.level ?? main?.j },
        (text) => setAi({ text, busy: true }),
      );
      setAi((a) => (a ? { ...a, busy: false } : a));
    } catch (e) {
      setAi({ text: "", busy: false, error: (e as Error).message });
    }
  }

  return createPortal(
    <div ref={ref} className="popup" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={`Kamus: ${word.b}`}>
      <button className="btn ghost icon sm popup-close" onClick={onClose} aria-label="Tutup">
        <X />
      </button>
      <div className="row" style={{ alignItems: "flex-end", paddingRight: 36 }}>
        <div className="grow">
          <div className="popup-word">{main?.w ?? word.b}</div>
          <div className="popup-reading">
            {main?.r}
            {main?.a && <span className="muted"> · {main.a}</span>}
            {word.s !== (main?.w ?? word.b) && <span className="muted"> · di teks: {word.s}</span>}
          </div>
        </div>
        <button className="btn icon sm" onClick={() => speak(main?.w ?? word.b)} aria-label="Dengarkan">
          <Volume2 />
        </button>
      </div>

      {idMeaning && <div className="id-meaning">🇮🇩 {idMeaning}</div>}

      {entries === null ? (
        <div className="stack" style={{ marginTop: 14 }}>
          <div className="skeleton" style={{ height: 14, width: "70%" }} />
          <div className="skeleton" style={{ height: 14, width: "50%" }} />
        </div>
      ) : entries.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>Tidak ditemukan di kamus. Coba tanya Sensei AI.</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {entries.map((e, idx) => (
            <div key={e.i} className="entry">
              <div className="row wrap" style={{ gap: 6 }}>
                {e.j && <LevelBadge level={e.j} />}
                <span className="badge">{e.p}</span>
                {idx > 0 && (
                  <span className="jp" style={{ fontSize: "0.95rem" }}>
                    {e.w} <span className="muted">【{e.r}】</span>
                  </span>
                )}
              </div>
              <ol>{e.m.slice(0, idx === 0 ? 5 : 3).map((m, i) => <li key={i}>{m}</li>)}</ol>
            </div>
          ))}
        </div>
      )}

      {ai && (
        <div className="card" style={{ marginTop: 14, padding: 14, background: "var(--bg-2)" }}>
          {ai.error ? <p style={{ color: "var(--danger)", margin: 0 }}>{ai.error}</p> : <AiText text={ai.text || "…"} streaming={ai.busy} />}
        </div>
      )}

      <div className="popup-actions">
        <button className="btn primary sm" onClick={save} disabled={inDeck}>
          {inDeck ? <Check /> : <BookmarkPlus />} {inDeck ? "Di review" : "Tambang"}
        </button>
        <button className={`btn sm${status === "known" ? " gold" : ""}`} onClick={() => setWordStatus(key, status === "known" ? null : "known")}>
          <Check /> {status === "known" ? "Dikuasai" : "Sudah tahu"}
        </button>
        <button className="btn sm" onClick={explain} disabled={ai?.busy}>
          <Sparkles /> Jelaskan (AI)
        </button>
        <a className="btn sm" href={`https://jisho.org/search/${encodeURIComponent(main?.w ?? word.b)}`} target="_blank" rel="noreferrer">
          <ExternalLink /> Jisho
        </a>
      </div>
    </div>,
    // Saat layar penuh (Studio Tonton), popup harus berada di dalam elemen layar penuh
    document.fullscreenElement ?? document.body,
  );
}
