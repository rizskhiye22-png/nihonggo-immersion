import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  Captions, ChevronLeft, ChevronRight, Clapperboard, EyeOff, FileVideo, Film, Info, Keyboard, Languages, Maximize, Minus, Pause, Pickaxe,
  Play, Plus, Repeat1, Sparkles, Upload, MonitorPlay,
} from "lucide-react";
import { JapaneseText } from "../components/JapaneseText.tsx";
import { AiText } from "../components/AiText.tsx";
import { Modal, Seg, Spinner, Switch, toast } from "../components/ui.tsx";
import { cueAt, cueBefore, fmtTime, parseSubtitles, type Cue } from "../lib/subtitles.ts";
import { analyse, tokenizerStatus } from "../lib/tokenizer.ts";
import { createYouTubePlayer, parseYouTubeId, videoElementPlayer, type PlayerApi } from "../lib/player.ts";
import { addLog, setState, useStore } from "../lib/store.ts";
import { captureFrame, getImage } from "../lib/idb.ts";
import { streamAi, translateLines } from "../lib/ai.ts";
import { isJapanese, type Word } from "../lib/japanese.ts";

type Source = { kind: "yt"; id: string } | { kind: "file"; url: string; name: string };
type Saved = { yt?: string; title?: string; subs?: string; subsName?: string; tr?: string; trName?: string; offset?: number };

const SAVE_KEY = "themars:studio";
const loadSaved = (): Saved => {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
};
const save = (patch: Saved) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...loadSaved(), ...patch }));
  } catch {
    /* subtitle terlalu besar untuk disimpan — tidak masalah */
  }
};

export default function Studio() {
  const saved = useMemo(loadSaved, []);
  const level = useStore((s) => s.profile.level);
  const autoPauseSetting = useStore((s) => s.settings.autoPause);
  const furigana = useStore((s) => s.settings.furigana);
  const allCards = useStore((s) => s.cards);

  const [source, setSource] = useState<Source | null>(saved.yt ? { kind: "yt", id: saved.yt } : null);
  const [title, setTitle] = useState(saved.title ?? "");
  const [cues, setCues] = useState<Cue[]>(() => (saved.subs ? parseSubtitles(saved.subs, saved.subsName) : []));
  const [cuesTr, setCuesTr] = useState<Cue[]>(() => (saved.tr ? parseSubtitles(saved.tr, saved.trName) : []));
  const [offset, setOffset] = useState(saved.offset ?? 0);
  const [idx, setIdx] = useState(-1);
  const [lastIdx, setLastIdx] = useState(-1);
  const [paused, setPaused] = useState(true);
  const [rate, setRate] = useState(1);
  const [autoPause, setAutoPause] = useState(autoPauseSetting);
  const [blur, setBlur] = useState(false);
  const [showTr, setShowTr] = useState(false);
  const [words, setWords] = useState<Record<number, Word[]>>({});
  const [aiTr, setAiTr] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<"transkrip" | "tambang" | "ai">("transkrip");
  const [ai, setAi] = useState<{ text: string; busy: boolean; error?: string; line?: string } | null>(null);
  const [ytInput, setYtInput] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [manual, setManual] = useState<{ text: string; words?: Word[] }>({ text: "" });
  const [isFs, setIsFs] = useState(false);
  const [ready, setReady] = useState(tokenizerStatus() === "ready");

  const playerRef = useRef<PlayerApi | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const live = useRef({ cues, offset, autoPause, lastIdx: -1, idx: -1, pausedAt: -1, watched: 0, title });
  live.current.cues = cues;
  live.current.offset = offset;
  live.current.autoPause = autoPause;
  live.current.title = title;

  // ── Muat pemutar sesuai sumber
  useEffect(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    if (!source) return;
    let cancelled = false;
    if (source.kind === "yt" && ytHostRef.current) {
      const host = document.createElement("div");
      ytHostRef.current.replaceChildren(host);
      createYouTubePlayer(host, source.id, () => {}).then(
        (p) => (cancelled ? p.destroy() : (playerRef.current = p)),
        (e: Error) => toast(e.message),
      );
    } else if (source.kind === "file" && videoRef.current) {
      playerRef.current = videoElementPlayer(videoRef.current);
    }
    return () => {
      cancelled = true;
    };
  }, [source]);

  // ── Loop sinkronisasi subtitle
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const p = playerRef.current;
      const L = live.current;
      if (!p) return;
      const isPaused = p.paused();
      setPaused(isPaused);
      if (!isPaused) L.watched += dt;
      const st = p.time() - L.offset;
      const i = cueAt(L.cues, st);
      if (i !== L.idx) {
        L.idx = i;
        setIdx(i);
        if (i >= 0) {
          L.lastIdx = i;
          setLastIdx(i);
        }
      }
      // Jeda otomatis di akhir setiap baris (mode intensif)
      const li = L.lastIdx;
      if (L.autoPause && !isPaused && li >= 0 && L.pausedAt !== li && st >= L.cues[li].end - 0.08) {
        L.pausedAt = li;
        p.pause();
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ── Catat waktu menonton ke log imersi
  useEffect(() => {
    const flush = (min = 60) => {
      const L = live.current;
      if (L.watched >= min) {
        addLog(L.watched / 60, "tonton", L.title || "Studio Tonton");
        L.watched = 0;
      }
    };
    const id = window.setInterval(() => flush(60), 30000);
    return () => {
      clearInterval(id);
      flush(20);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const shown = idx >= 0 ? idx : paused ? lastIdx : -1;
  const cue = shown >= 0 ? cues[shown] : undefined;

  // ── Tokenisasi baris yang tampil + beberapa baris berikutnya
  useEffect(() => {
    if (shown < 0) return;
    let alive = true;
    for (const i of [shown, shown + 1, shown + 2]) {
      const c = cues[i];
      if (!c || words[i]) continue;
      analyse(c.text).then(
        (w) => {
          if (!alive) return;
          setReady(true);
          setWords((prev) => ({ ...prev, [i]: w }));
        },
        () => toast("Tokenizer gagal dimuat. Periksa koneksi lalu muat ulang."),
      );
    }
    return () => {
      alive = false;
    };
  }, [shown, cues, words]);

  // Gulir transkrip mengikuti baris aktif
  useEffect(() => {
    if (shown < 0 || tab !== "transkrip") return;
    transcriptRef.current?.querySelector(`[data-i="${shown}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [shown, tab]);

  const trFor = useCallback(
    (i: number) => {
      if (aiTr[i]) return aiTr[i];
      const c = cues[i];
      if (!c || !cuesTr.length) return undefined;
      const mid = (c.start + c.end) / 2;
      return cuesTr.find((t) => t.start <= mid && t.end >= mid)?.text;
    },
    [aiTr, cues, cuesTr],
  );

  // ── Aksi pemutar
  const seekCue = useCallback((i: number, play = true) => {
    const p = playerRef.current;
    const c = live.current.cues[i];
    if (!p || !c) return;
    live.current.pausedAt = -1;
    live.current.lastIdx = i;
    setLastIdx(i);
    p.seek(c.start + live.current.offset - 0.05);
    if (play) p.play();
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused()) {
      // Bila sedang dijeda otomatis di akhir baris, lanjutkan ke baris berikutnya
      p.play();
    } else p.pause();
  }, []);

  const prev = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const cur = cueBefore(live.current.cues, p.time() - live.current.offset);
    seekCue(Math.max(0, (idx >= 0 ? idx : cur) - 1));
  }, [idx, seekCue]);

  const next = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const cur = cueBefore(live.current.cues, p.time() - live.current.offset);
    seekCue(Math.min(live.current.cues.length - 1, cur + 1));
  }, [seekCue]);

  const replay = useCallback(() => {
    if (shown >= 0) seekCue(shown);
  }, [shown, seekCue]);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen();
  };

  useEffect(() => {
    playerRef.current?.setRate(rate);
  }, [rate]);

  // ── Pintasan keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Record<string, () => void> = {
        " ": togglePlay,
        a: prev,
        arrowleft: prev,
        s: replay,
        arrowdown: replay,
        d: next,
        arrowright: next,
        p: () => setAutoPause((v) => !v),
        b: () => setBlur((v) => !v),
        t: () => setShowTr((v) => !v),
        f: fullscreen,
      };
      if (map[k]) {
        e.preventDefault();
        map[k]();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, prev, next, replay]);

  // ── Memuat berkas
  const loadSubsText = (text: string, name: string, forceTr = false) => {
    const parsed = parseSubtitles(text, name);
    if (!parsed.length) return toast("Subtitle tidak terbaca. Pastikan formatnya .srt, .vtt, atau .ass");
    const jp = isJapanese(parsed.slice(0, 30).map((c) => c.text).join(""));
    if (forceTr || (!jp && cues.length)) {
      setCuesTr(parsed);
      save({ tr: text, trName: name });
      toast(`Subtitle terjemahan dimuat (${parsed.length} baris)`);
    } else {
      setCues(parsed);
      setWords({});
      setAiTr({});
      setIdx(-1);
      setLastIdx(-1);
      live.current.idx = -1;
      live.current.lastIdx = -1;
      save({ subs: text, subsName: name });
      toast(`${parsed.length} baris subtitle Jepang dimuat`);
      if (!jp) toast("Subtitle ini tampaknya bukan bahasa Jepang");
    }
  };

  const onFiles = async (files: FileList | File[], forceTr = false) => {
    for (const f of Array.from(files)) {
      if (f.type.startsWith("video/") || f.type.startsWith("audio/") || /\.(mp4|mkv|webm|mov|m4v|mp3|m4a)$/i.test(f.name)) {
        if (source?.kind === "file") URL.revokeObjectURL(source.url);
        setSource({ kind: "file", url: URL.createObjectURL(f), name: f.name });
        const t = f.name.replace(/\.[^.]+$/, "");
        setTitle(t);
        save({ yt: undefined, title: t });
      } else if (/\.(srt|vtt|ass|ssa|txt)$/i.test(f.name)) {
        loadSubsText(await f.text(), f.name, forceTr);
      } else toast(`Format ${f.name} belum didukung`);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) void onFiles(e.dataTransfer.files);
  };

  const loadYouTube = () => {
    const id = parseYouTubeId(ytInput);
    if (!id) return toast("Tautan YouTube tidak valid");
    setSource({ kind: "yt", id });
    const t = title && source?.kind === "yt" ? title : `YouTube ${id}`;
    setTitle(t);
    save({ yt: id, title: t });
    setYtInput("");
  };

  async function translateAround() {
    if (shown < 0) return;
    const from = shown;
    const lines = cues.slice(from, from + 25).map((c) => c.text);
    toast("Menerjemahkan 25 baris…");
    try {
      const out = await translateLines(lines, level);
      setAiTr((prev) => {
        const n = { ...prev };
        out.forEach((t, j) => (n[from + j] = t));
        return n;
      });
      setShowTr(true);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function explainLine(text: string) {
    setTab("ai");
    setAi({ text: "", busy: true, line: text });
    try {
      await streamAi("explain", { sentence: text, level }, (t) => setAi({ text: t, busy: true, line: text }));
      setAi((a) => (a ? { ...a, busy: false } : a));
    } catch (e) {
      setAi({ text: "", busy: false, error: (e as Error).message, line: text });
    }
  }

  const srcLabel = title || "Studio Tonton";
  const sessionCards = useMemo(
    () => Object.values(allCards).filter((c) => c.src?.startsWith(srcLabel)).sort((a, b) => b.created - a.created),
    [allCards, srcLabel],
  );

  const popupCtx = useMemo(
    () =>
      cue
        ? {
            ja: cue.text.replace(/\n/g, " "),
            tr: trFor(shown),
            src: `${srcLabel} · ${fmtTime(cue.start)}`,
            level,
            capture: source?.kind === "file" && videoRef.current ? () => captureFrame(videoRef.current!) : undefined,
            onOpen: () => playerRef.current?.pause(),
          }
        : undefined,
    [cue, shown, trFor, srcLabel, level, source],
  );

  const lineWords = shown >= 0 ? words[shown] : undefined;
  const translation = shown >= 0 ? trFor(shown) : undefined;

  const subtitleBlock = cue ? (
    lineWords ? (
      <JapaneseText words={lineWords} size="xl" context={popupCtx} className="pre" />
    ) : (
      <span className="jt xl" style={{ whiteSpace: "pre-line" }}>{cue.text}</span>
    )
  ) : null;

  return (
    <div
      className="page wide"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={onDrop}
    >
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow"><Clapperboard style={{ width: 14 }} /> Studio Tonton</div>
          <h1>Belajar langsung dari anime & film</h1>
          <p className="lead" style={{ marginBottom: 0 }}>
            Putar video YouTube atau file milikmu, muat subtitle Jepang, lalu klik kata apa pun untuk melihat arti dan menyimpannya ke review.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => setHelpOpen(true)}><Info /> Cara pakai</button>
        </div>
      </header>

      {/* Panel sumber */}
      <div className="card" style={{ marginBottom: 18, padding: 16 }}>
        <div className="grid collapse" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="search grow">
              <MonitorPlay />
              <input
                className="input"
                placeholder="Tempel tautan YouTube…"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadYouTube()}
              />
            </div>
            <button className="btn primary" onClick={loadYouTube}>Putar</button>
          </div>
          <label className="btn" style={{ justifyContent: "flex-start" }}>
            <FileVideo /> File video / audio
            <input type="file" accept="video/*,audio/*,.mkv" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && onFiles(e.target.files)} />
          </label>
          <div className="row" style={{ gap: 8 }}>
            <label className="btn grow" style={{ justifyContent: "flex-start" }}>
              <Captions /> Subtitle Jepang
              <input type="file" accept=".srt,.vtt,.ass,.ssa,.txt" hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
            </label>
            <label className="btn icon" title="Subtitle terjemahan (opsional)">
              <Languages />
              <input type="file" accept=".srt,.vtt,.ass,.ssa,.txt" hidden onChange={(e) => e.target.files && onFiles(e.target.files, true)} />
            </label>
            <button className="btn icon" title="Tempel teks subtitle" onClick={() => setPasteOpen(true)}>
              <Upload />
            </button>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 12, fontSize: "0.82rem" }}>
          <span className="badge">{source ? (source.kind === "yt" ? "YouTube" : source.name) : "Belum ada video"}</span>
          <span className={`badge${cues.length ? " ok" : ""}`}>{cues.length ? `${cues.length} baris subtitle` : "Belum ada subtitle"}</span>
          {cuesTr.length > 0 && <span className="badge info">Terjemahan: {cuesTr.length} baris</span>}
          {!ready && cues.length > 0 && <span className="badge warn"><Spinner /> Menyiapkan kamus (sekali saja)…</span>}
          <span className="grow" />
          <input className="input" style={{ height: 32, maxWidth: 260, fontSize: "0.82rem" }} placeholder="Judul sesi (mis. Barakamon ep 1)" value={title} onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }} />
        </div>
      </div>

      {drag && (
        <div className="backdrop" style={{ pointerEvents: "none" }}>
          <div className="dropzone drag" style={{ padding: 60, background: "var(--surface)" }}>
            <Upload />
            <h3>Lepaskan file video atau subtitle</h3>
          </div>
        </div>
      )}

      <div className="studio">
        <div>
          <div ref={wrapRef} className={`player-wrap${isFs ? " fs" : ""}${blur ? " sub-hidden" : ""}`}>
            {source?.kind === "yt" && <div ref={ytHostRef} className="yt-host" />}
            {source?.kind === "file" && <video ref={videoRef} src={source.url} controls controlsList="nofullscreen" playsInline />}
            {!source && (
              <div className="player-empty">
                <div>
                  <Film style={{ width: 46, height: 46, margin: "0 auto 14px", color: "var(--mars-2)" }} />
                  <h3 style={{ color: "var(--text)" }}>Mulai sesi tontonmu</h3>
                  <p style={{ maxWidth: 440, margin: "0 auto" }}>
                    Tempel tautan YouTube atau seret file video (mp4/mkv/webm) dan subtitle Jepang (.srt/.vtt/.ass) ke halaman ini.
                  </p>
                </div>
              </div>
            )}
            {cue && (
              <div className="sub-overlay">
                <div className="sub-box" style={{ whiteSpace: "pre-line" }}>
                  {subtitleBlock}
                  {showTr && translation && <div className="tr">{translation}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <button className="btn icon" onClick={prev} title="Baris sebelumnya (A)"><ChevronLeft /></button>
            <button className="btn primary" onClick={togglePlay} title="Putar/Jeda (Spasi)" style={{ minWidth: 104 }}>
              {paused ? <Play /> : <Pause />} {paused ? "Putar" : "Jeda"}
            </button>
            <button className="btn" onClick={replay} title="Ulangi baris (S)"><Repeat1 /> Ulangi</button>
            <button className="btn icon" onClick={next} title="Baris berikutnya (D)"><ChevronRight /></button>
            <Seg value={rate} onChange={setRate} options={[0.75, 0.9, 1, 1.25].map((r) => ({ v: r, label: `${r}×` }))} />
            <span className="grow" />
            <button className="btn icon" onClick={fullscreen} title="Layar penuh (F)"><Maximize /></button>
          </div>

          <div className="card" style={{ marginTop: 14, padding: 16 }}>
            <div className="row wrap" style={{ gap: 18 }}>
              <label className="row" style={{ gap: 8, fontSize: "0.86rem", fontWeight: 600 }}>
                <Switch on={autoPause} onChange={(v) => { setAutoPause(v); setState((s) => ({ ...s, settings: { ...s.settings, autoPause: v } })); }} />
                Jeda tiap baris <span className="kbd">P</span>
              </label>
              <label className="row" style={{ gap: 8, fontSize: "0.86rem", fontWeight: 600 }}>
                <Switch on={blur} onChange={setBlur} /> <EyeOff style={{ width: 15 }} /> Mode dengar <span className="kbd">B</span>
              </label>
              <label className="row" style={{ gap: 8, fontSize: "0.86rem", fontWeight: 600 }}>
                <Switch on={showTr} onChange={setShowTr} /> Terjemahan <span className="kbd">T</span>
              </label>
              <Seg
                value={furigana}
                onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, furigana: v } }))}
                options={[
                  { v: "all" as const, label: "Furigana" },
                  { v: "unknown" as const, label: "Adaptif" },
                  { v: "none" as const, label: "Tanpa" },
                ]}
              />
              <div className="row" style={{ gap: 6, fontSize: "0.82rem" }}>
                <span className="muted">Sinkron</span>
                <button className="btn icon sm" onClick={() => { const o = Math.round((offset - 0.1) * 10) / 10; setOffset(o); save({ offset: o }); }}><Minus /></button>
                <span className="mono" style={{ minWidth: 44, textAlign: "center" }}>{offset > 0 ? "+" : ""}{offset.toFixed(1)}s</span>
                <button className="btn icon sm" onClick={() => { const o = Math.round((offset + 0.1) * 10) / 10; setOffset(o); save({ offset: o }); }}><Plus /></button>
              </div>
            </div>
          </div>

          {/* Panel kalimat aktif */}
          <div className="sub-panel">
            {cue ? (
              <div className="stack" style={{ gap: 8 }}>
                <div className="row between">
                  <span className="badge mono">{fmtTime(cue.start)} · baris {shown + 1}/{cues.length}</span>
                  <div className="btn-row">
                    <button className="btn sm" onClick={translateAround}><Languages /> Terjemahkan (AI)</button>
                    <button className="btn sm" onClick={() => explainLine(cue.text)}><Sparkles /> Analisis kalimat</button>
                  </div>
                </div>
                <div style={{ whiteSpace: "pre-line" }}>
                  {lineWords ? <JapaneseText words={lineWords} size="lg" context={popupCtx} /> : <span className="jt lg">{cue.text}</span>}
                </div>
                {translation && <div className="tr">{translation}</div>}
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  Klik kata untuk arti → <strong>Tambang</strong> untuk menyimpan kata + kalimat ini{source?.kind === "file" ? " + tangkapan layar" : ""}.
                </div>
              </div>
            ) : cues.length ? (
              <p className="muted" style={{ margin: 0 }}>Putar video — baris subtitle aktif akan muncul di sini dan bisa diklik per kata.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row"><Pickaxe style={{ width: 18, color: "var(--mars-2)" }} /><strong>Tidak punya subtitle? Tambang secara manual</strong></div>
                <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>Ketik atau tempel kalimat Jepang yang kamu dengar/lihat di video, lalu klik katanya.</p>
                <div className="row">
                  <input className="input jp" placeholder="例：今日はいい天気ですね" value={manual.text} onChange={(e) => setManual({ text: e.target.value })}
                    onKeyDown={async (e) => { if (e.key === "Enter" && manual.text.trim()) setManual({ text: manual.text, words: await analyse(manual.text) }); }} />
                  <button className="btn primary" disabled={!manual.text.trim()} onClick={async () => setManual({ text: manual.text, words: await analyse(manual.text) })}>Analisis</button>
                </div>
                {manual.words && (
                  <JapaneseText words={manual.words} size="lg" context={{ ja: manual.text, src: srcLabel, level, onOpen: () => playerRef.current?.pause() }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel samping */}
        <div className="card" style={{ padding: 14, position: "sticky", top: 86 }}>
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={tab === "transkrip" ? "on" : ""} onClick={() => setTab("transkrip")}>Transkrip</button>
            <button className={tab === "tambang" ? "on" : ""} onClick={() => setTab("tambang")}>Tambang ({sessionCards.length})</button>
            <button className={tab === "ai" ? "on" : ""} onClick={() => setTab("ai")}>Analisis AI</button>
          </div>
          {tab === "transkrip" && (
            <div className="transcript" ref={transcriptRef}>
              {cues.length === 0 && <p className="muted" style={{ padding: 10 }}>Transkrip akan muncul setelah subtitle dimuat.</p>}
              {cues.map((c) => (
                <div key={c.i} data-i={c.i} className={`cue${c.i === shown ? " on" : ""}`} onClick={() => seekCue(c.i)}>
                  <time>{fmtTime(c.start)}</time>
                  <span style={{ whiteSpace: "pre-line" }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "tambang" && (
            <div className="stack transcript" style={{ gap: 8 }}>
              {sessionCards.length === 0 && (
                <p className="muted" style={{ padding: 10 }}>Kata yang kamu tambang dari sesi ini akan muncul di sini dan otomatis masuk jadwal <Link to="/review" style={{ color: "var(--mars-2)" }}>Review</Link>.</p>
              )}
              {sessionCards.map((c) => (
                <div key={c.id} className="mined">
                  <Thumb id={c.img} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <strong className="jp" style={{ fontSize: "1.05rem" }}>{c.w}</strong>
                      <span className="muted jp" style={{ fontSize: "0.8rem" }}>{c.r}</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.m}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "ai" && (
            <div className="transcript">
              {!ai && <p className="muted" style={{ padding: 10 }}>Tekan “Analisis kalimat” untuk mendapatkan penjelasan kosakata, tata bahasa, dan nuansa baris yang sedang tampil dalam Bahasa Indonesia.</p>}
              {ai && (
                <div className="stack" style={{ gap: 10, padding: 4 }}>
                  {ai.line && <div className="jp" style={{ fontSize: "1.1rem", padding: 10, background: "var(--surface-2)", borderRadius: 12 }}>{ai.line}</div>}
                  {ai.error ? <p style={{ color: "var(--danger)" }}>{ai.error}</p> : <AiText text={ai.text || "…"} streaming={ai.busy} />}
                </div>
              )}
            </div>
          )}
          <div className="row wrap" style={{ gap: 6, marginTop: 12, fontSize: "0.72rem", color: "var(--muted)" }}>
            <Keyboard style={{ width: 14 }} />
            <span className="kbd">Spasi</span> putar <span className="kbd">A</span><span className="kbd">D</span> baris <span className="kbd">S</span> ulangi <span className="kbd">F</span> layar penuh
          </div>
        </div>
      </div>

      {pasteOpen && <PasteSubs onClose={() => setPasteOpen(false)} onLoad={(t) => { loadSubsText(t, "tempel.srt"); setPasteOpen(false); }} />}
      {helpOpen && <StudioHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function Thumb({ id }: { id?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (id) void getImage(id).then(setSrc);
  }, [id]);
  return src ? <img src={src} alt="" /> : <div className="ph" />;
}

function PasteSubs({ onClose, onLoad }: { onClose: () => void; onLoad: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Modal onClose={onClose}>
      <h2>Tempel subtitle</h2>
      <p className="muted">Tempel isi file .srt / .vtt / .ass. Jika hanya berupa teks biasa tanpa waktu, gunakan Pembaca Bebas.</p>
      <textarea className="textarea jp" style={{ minHeight: 260 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={"1\n00:00:01,000 --> 00:00:03,000\nこんにちは"} />
      <div className="btn-row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <Link to="/pembaca" className="btn ghost">Buka Pembaca Bebas</Link>
        <button className="btn primary" disabled={!text.trim()} onClick={() => onLoad(text)}>Muat subtitle</button>
      </div>
    </Modal>
  );
}

function StudioHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <div className="eyebrow">Panduan</div>
      <h2>Cara belajar dengan Studio Tonton</h2>
      <div className="grid c2" style={{ marginTop: 16 }}>
        {[
          ["1. Pilih tontonan", "Pilih anime, drama, atau video YouTube yang 70–90% bisa kamu ikuti. Lihat halaman Rekomendasi Tontonan sesuai levelmu."],
          ["2. Muat subtitle Jepang", "Gunakan file .srt/.vtt/.ass yang kamu punya. Untuk anime, komunitas pelajar biasa berbagi subtitle Jepang (mis. arsip seperti jimaku.cc). Pastikan kamu menonton dari sumber yang legal."],
          ["3. Mode santai", "Tonton biasa. Jeda hanya saat ada kata yang sering muncul atau menarik, klik katanya, lalu tekan Tambang."],
          ["4. Mode intensif", "Aktifkan “Jeda tiap baris”. Setiap baris berhenti otomatis: baca, klik kata yang belum tahu, ulangi (S), lalu shadowing."],
          ["5. Mode dengar", "Aktifkan “Mode dengar” untuk menyamarkan subtitle. Arahkan kursor untuk mengintip hanya saat perlu."],
          ["6. Review besok", "Kata yang ditambang masuk ke Review lengkap dengan kalimat dan tangkapan layar (untuk file lokal)."],
        ].map(([t, d]) => (
          <div key={t} className="card" style={{ padding: 16 }}>
            <strong>{t}</strong>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>{d}</p>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        <Info />
        <div>Video dan subtitle hanya diproses di browsermu dan tidak diunggah ke server. Waktu menonton tercatat otomatis di Log Imersi.</div>
      </div>
    </Modal>
  );
}
