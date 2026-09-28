import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  AudioLines, Captions, ChevronLeft, ChevronRight, Clapperboard, Download, EyeOff, FileVideo, Film, Info, Keyboard, Languages, Maximize,
  Mic, Minus, MonitorPlay, Pause, Pickaxe, Play, Plus, Repeat1, Sparkles, Square, Upload, Wand2,
} from "lucide-react";
import { JapaneseText } from "../components/JapaneseText.tsx";
import { LineVocab } from "../components/LineVocab.tsx";
import { AiText } from "../components/AiText.tsx";
import { Bar, Modal, Seg, Spinner, Switch, toast } from "../components/ui.tsx";
import { cueAt, cueBefore, fmtTime, parseSubtitles, type Cue } from "../lib/subtitles.ts";
import { analyse, preloadTokenizer } from "../lib/tokenizer.ts";
import { createYouTubePlayer, parseYouTubeId, videoElementPlayer, type PlayerApi } from "../lib/player.ts";
import { addLog, setState, useStore } from "../lib/store.ts";
import { captureFrame, getImage } from "../lib/idb.ts";
import { streamAi } from "../lib/ai.ts";
import { useAiEnabled } from "../lib/aiStatus.ts";
import { translate } from "../lib/translate.ts";
import { ASR_MODELS, canCaptureTab, cleanChunks, decodeTo16k, LiveCapture, loadAsr, transcribe, transcribeFile, type AsrChunk } from "../lib/asr.ts";
import { isJapanese, type Word } from "../lib/japanese.ts";

type Source = { kind: "yt"; id: string } | { kind: "file"; url: string; name: string; file: File };
type Saved = { yt?: string; title?: string; subs?: string; subsName?: string; tr?: string; trName?: string; offset?: number };
type AsrState =
  | { phase: "idle" }
  | { phase: "loading"; progress: number; text: string }
  | { phase: "live"; device: string; lines: number }
  | { phase: "file"; device: string; done: number; total: number }
  | { phase: "error"; message: string };

const SAVE_KEY = "themars:studio";
const MODEL_KEY = "themars:asr-model";
const autoKey = (id: string) => `themars:auto-subs:${id}`;

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

const toSrt = (cues: Cue[]) => {
  const t = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  return cues.map((c, i) => `${i + 1}\n${t(c.start)} --> ${t(c.end)}\n${c.text}\n`).join("\n");
};

/** Gabungkan cue baru (urut waktu) dan beri ulang nomor indeks. */
const mergeCues = (prev: Cue[], add: AsrChunk[]) =>
  [...prev, ...add.map((c) => ({ i: 0, start: c.start, end: Math.max(c.end, c.start + 0.8), text: c.text }))]
    .sort((a, b) => a.start - b.start)
    .map((c, i) => ({ ...c, i }));

export default function Studio() {
  const saved = useMemo(loadSaved, []);
  const level = useStore((s) => s.profile.level);
  const autoPauseSetting = useStore((s) => s.settings.autoPause);
  const furigana = useStore((s) => s.settings.furigana);
  const allCards = useStore((s) => s.cards);
  const aiOn = useAiEnabled();

  const [source, setSource] = useState<Source | null>(saved.yt ? { kind: "yt", id: saved.yt } : null);
  const [title, setTitle] = useState(saved.title ?? "");
  const [cues, setCues] = useState<Cue[]>(() => {
    if (saved.yt) {
      const auto = localStorage.getItem(autoKey(saved.yt));
      if (auto) return parseSubtitles(auto, "auto.srt");
    }
    return saved.subs ? parseSubtitles(saved.subs, saved.subsName) : [];
  });
  const [cuesTr, setCuesTr] = useState<Cue[]>(() => (saved.tr ? parseSubtitles(saved.tr, saved.trName) : []));
  const [offset, setOffset] = useState(saved.offset ?? 0);
  const [shown, setShown] = useState(-1);
  const [paused, setPaused] = useState(true);
  const [rate, setRate] = useState(1);
  const [autoPause, setAutoPause] = useState(autoPauseSetting);
  const [blur, setBlur] = useState(false);
  const [showTr, setShowTr] = useState(true);
  const [showVocab, setShowVocab] = useState(true);
  const [words, setWords] = useState<Record<string, Word[]>>({});
  const [trMap, setTrMap] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"transkrip" | "tambang" | "ai">("transkrip");
  const [ai, setAi] = useState<{ text: string; busy: boolean; error?: string; line?: string } | null>(null);
  const [ytInput, setYtInput] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tabHelp, setTabHelp] = useState(false);
  const [drag, setDrag] = useState(false);
  const [manual, setManual] = useState<{ text: string; words?: Word[] }>({ text: "" });
  const [isFs, setIsFs] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_KEY) ?? ASR_MODELS[0].id);
  const [asr, setAsr] = useState<AsrState>({ phase: "idle" });

  const playerRef = useRef<PlayerApi | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<LiveCapture | null>(null);
  const stopFileRef = useRef(false);
  const live = useRef({ cues, offset, autoPause, liveMode: false, shown: -1, lastIdx: -1, pausedAt: -1, watched: 0, title });
  live.current.cues = cues;
  live.current.offset = offset;
  live.current.autoPause = autoPause;
  live.current.title = title;
  live.current.liveMode = asr.phase === "live";

  useEffect(() => preloadTokenizer(), []);

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

  // ── Loop sinkronisasi subtitle (10× per detik, hanya memicu render saat baris berganti)
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
      let i = cueAt(L.cues, st);
      if (i >= 0) L.lastIdx = i;
      else {
        // Pertahankan baris terakhir saat dijeda, dan di mode langsung (hasil pengenalan suara datang sedikit terlambat)
        const j = cueBefore(L.cues, st);
        if (j >= 0 && (isPaused || (L.liveMode && st - L.cues[j].end < 7))) i = j;
      }
      if (i !== L.shown) {
        L.shown = i;
        setShown(i);
      }
      // Jeda otomatis di akhir setiap baris (mode intensif)
      const li = L.lastIdx;
      if (L.autoPause && !L.liveMode && !isPaused && li >= 0 && L.pausedAt !== li && L.cues[li] && st >= L.cues[li].end - 0.08) {
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
      captureRef.current?.stop();
      stopFileRef.current = true;
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const cue = shown >= 0 ? cues[shown] : undefined;

  // ── Tokenisasi baris yang tampil + beberapa baris berikutnya (di worker, tidak membekukan halaman)
  useEffect(() => {
    if (shown < 0) return;
    let alive = true;
    const texts = [shown, shown + 1, shown + 2].map((i) => cues[i]?.text).filter((t): t is string => !!t && !words[t]);
    if (!texts.length) return;
    void Promise.all(texts.map((t) => analyse(t).then((w) => [t, w] as const))).then(
      (res) => alive && setWords((prev) => ({ ...prev, ...Object.fromEntries(res) })),
      () => toast("Kamus gagal dimuat. Periksa koneksi lalu coba lagi."),
    );
    return () => {
      alive = false;
    };
  }, [shown, cues, words]);

  // ── Terjemahan Indonesia otomatis (gratis) untuk baris yang tampil
  useEffect(() => {
    if (!showTr || !cue || trMap[cue.text] || cuesTr.length) return;
    let alive = true;
    const text = cue.text;
    translate(text.replace(/\n/g, " ")).then(
      (t) => alive && setTrMap((m) => ({ ...m, [text]: t })),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [cue, showTr, trMap, cuesTr.length]);

  // Gulir transkrip mengikuti baris aktif
  useEffect(() => {
    if (shown < 0 || tab !== "transkrip") return;
    transcriptRef.current?.querySelector(`[data-i="${shown}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [shown, tab]);

  const trFor = useCallback(
    (i: number) => {
      const c = cues[i];
      if (!c) return undefined;
      if (cuesTr.length) {
        const mid = (c.start + c.end) / 2;
        const hit = cuesTr.find((t) => t.start <= mid && t.end >= mid)?.text;
        if (hit) return hit;
      }
      return trMap[c.text];
    },
    [trMap, cues, cuesTr],
  );

  // ── Aksi pemutar
  const seekCue = useCallback((i: number, play = true) => {
    const p = playerRef.current;
    const c = live.current.cues[i];
    if (!p || !c) return;
    live.current.pausedAt = -1;
    live.current.lastIdx = i;
    p.seek(c.start + live.current.offset - 0.05);
    if (play) p.play();
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused()) p.play();
    else p.pause();
  }, []);

  const prev = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const cur = cueBefore(live.current.cues, p.time() - live.current.offset);
    seekCue(Math.max(0, (shown >= 0 ? shown : cur) - 1));
  }, [shown, seekCue]);

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

  // ── Pintasan keyboard (panah atas/bawah tetap untuk menggulir halaman)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, button, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Record<string, () => void> = {
        " ": togglePlay,
        a: prev,
        arrowleft: prev,
        s: replay,
        d: next,
        arrowright: next,
        p: () => setAutoPause((v) => !v),
        b: () => setBlur((v) => !v),
        t: () => setShowTr((v) => !v),
        f: fullscreen,
      };
      if (map[k] && playerRef.current) {
        e.preventDefault();
        map[k]();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, prev, next, replay]);

  // ── Memuat berkas
  const resetLines = () => {
    setWords({});
    setShown(-1);
    live.current.shown = -1;
    live.current.lastIdx = -1;
  };

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
      resetLines();
      save({ subs: text, subsName: name });
      toast(`${parsed.length} baris subtitle Jepang dimuat`);
      if (!jp) toast("Subtitle ini tampaknya bukan bahasa Jepang");
    }
  };

  const onFiles = async (files: FileList | File[], forceTr = false) => {
    for (const f of Array.from(files)) {
      if (f.type.startsWith("video/") || f.type.startsWith("audio/") || /\.(mp4|mkv|webm|mov|m4v|mp3|m4a|wav|ogg)$/i.test(f.name)) {
        if (source?.kind === "file") URL.revokeObjectURL(source.url);
        stopAsr();
        setSource({ kind: "file", url: URL.createObjectURL(f), name: f.name, file: f });
        const t = f.name.replace(/\.[^.]+$/, "");
        setTitle(t);
        setCuesTr([]);
        save({ yt: undefined, title: t, tr: undefined });
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
    stopAsr();
    setSource({ kind: "yt", id });
    const t = `YouTube ${id}`;
    setTitle(t);
    save({ yt: id, title: t, subs: undefined, tr: undefined });
    setCuesTr([]);
    const auto = localStorage.getItem(autoKey(id));
    setCues(auto ? parseSubtitles(auto, "auto.srt") : []);
    resetLines();
    if (auto) toast("Subtitle otomatis dari sesi sebelumnya dimuat");
    setYtInput("");
  };

  // ── Subtitle otomatis dari suara (Whisper di browser, gratis)
  const persistAuto = useCallback(
    (list: Cue[]) => {
      try {
        if (source?.kind === "yt") localStorage.setItem(autoKey(source.id), toSrt(list));
        else save({ subs: toSrt(list), subsName: "auto.srt" });
      } catch {
        /* abaikan */
      }
    },
    [source],
  );

  async function prepareModel() {
    setAsr({ phase: "loading", progress: 0, text: "Menyiapkan pengenal suara…" });
    // Hentikan bila unduhan tidak bergerak selama 60 detik (koneksi terputus/diblokir)
    let lastActivity = Date.now();
    let timer = 0;
    const stalled = new Promise<never>((_, reject) => {
      timer = window.setInterval(() => {
        if (Date.now() - lastActivity > 60_000) reject(new Error("Model pengenal suara gagal diunduh. Periksa koneksi internet lalu coba lagi."));
      }, 2000);
    });
    try {
      return await Promise.race([
        loadAsr(model, (p) => {
          lastActivity = Date.now();
          if (p.status === "progress_total" || (p.status === "progress" && p.total && p.total > 5_000_000)) {
            setAsr({ phase: "loading", progress: p.progress ?? 0, text: `Mengunduh model (sekali saja)… ${Math.round(p.progress ?? 0)}%` });
          }
        }),
        stalled,
      ]);
    } finally {
      clearInterval(timer);
    }
  }

  const onResult = useCallback(
    (chunks: AsrChunk[]) => {
      const clean = cleanChunks(chunks);
      if (!clean.length) return;
      setCues((prevCues) => {
        const merged = mergeCues(prevCues, clean);
        persistAuto(merged);
        return merged;
      });
    },
    [persistAuto],
  );

  async function startLive() {
    if (!source) return toast("Putar video dulu");
    if (cues.length && !confirm("Subtitle yang ada akan diganti subtitle otomatis. Lanjutkan?")) return;
    setTabHelp(false);
    setCues([]);
    resetLines();
    try {
      const device = await prepareModel();
      const cap = new LiveCapture(
        () => playerRef.current?.time() ?? 0,
        (seg) => {
          void transcribe(seg.audio, seg.start).then(onResult, (e: Error) => toast(e.message));
        },
        () => setAsr({ phase: "idle" }),
      );
      if (source.kind === "yt") await cap.fromTab();
      else if (videoRef.current) await cap.fromElement(videoRef.current);
      captureRef.current = cap;
      setAutoPause(false);
      setAsr({ phase: "live", device, lines: 0 });
      playerRef.current?.play();
      toast("Mendengarkan… subtitle akan muncul beberapa detik setelah suara");
    } catch (e) {
      const msg = (e as Error).name === "NotAllowedError" ? "Izin berbagi audio ditolak." : (e as Error).message;
      setAsr({ phase: "error", message: msg });
    }
  }

  async function transcribeWholeFile() {
    if (source?.kind !== "file") return;
    if (cues.length && !confirm("Subtitle yang ada akan diganti subtitle otomatis. Lanjutkan?")) return;
    setCues([]);
    resetLines();
    stopFileRef.current = false;
    try {
      const device = await prepareModel();
      setAsr({ phase: "file", device, done: 0, total: 0 });
      let audio: Float32Array;
      try {
        audio = await decodeTo16k(source.file);
      } catch {
        setAsr({ phase: "idle" });
        toast("Format audio file ini tidak bisa dibaca langsung — beralih ke mode dengar langsung");
        return startLive();
      }
      await transcribeFile(audio, (chunks, done, total) => {
        onResult(chunks);
        setAsr({ phase: "file", device, done, total });
      }, () => stopFileRef.current);
      setAsr({ phase: "idle" });
      toast("Subtitle otomatis selesai dibuat");
    } catch (e) {
      setAsr({ phase: "error", message: (e as Error).message });
    }
  }

  function stopAsr() {
    captureRef.current?.stop();
    captureRef.current = null;
    stopFileRef.current = true;
    setAsr({ phase: "idle" });
  }

  const downloadSrt = () => {
    const blob = new Blob([toSrt(cues)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "subtitle").replace(/[\\/:*?"<>|]/g, "_")}.ja.srt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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

  const translation = shown >= 0 ? trFor(shown) : undefined;
  const popupCtx = useMemo(
    () =>
      cue
        ? {
            ja: cue.text.replace(/\n/g, " "),
            tr: translation,
            src: `${srcLabel} · ${fmtTime(cue.start)}`,
            level,
            capture: source?.kind === "file" && videoRef.current ? () => captureFrame(videoRef.current!) : undefined,
            onOpen: () => {
              if (asr.phase !== "live") playerRef.current?.pause();
            },
          }
        : undefined,
    [cue, translation, srcLabel, level, source, asr.phase],
  );

  const lineWords = cue ? words[cue.text] : undefined;
  const busy = asr.phase === "live" || asr.phase === "file" || asr.phase === "loading";

  return (
    <div
      className="page wide"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => !e.relatedTarget && setDrag(false)}
      onDrop={onDrop}
    >
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow"><Clapperboard style={{ width: 14 }} /> Studio Tonton</div>
          <h1>Belajar langsung dari anime & film</h1>
          <p className="lead" style={{ marginBottom: 0 }}>
            Putar YouTube atau file videomu. Subtitle Jepang bisa dibuat <strong>otomatis dari suara</strong>, dan setiap kata langsung muncul beserta arti Bahasa Indonesia.
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
              <input className="input" placeholder="Tempel tautan YouTube…" value={ytInput} onChange={(e) => setYtInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadYouTube()} />
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
            <button className="btn icon" title="Tempel teks subtitle" onClick={() => setPasteOpen(true)}><Upload /></button>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 12, fontSize: "0.82rem" }}>
          <span className="badge">{source ? (source.kind === "yt" ? "YouTube" : source.name) : "Belum ada video"}</span>
          <span className={`badge${cues.length ? " ok" : ""}`}>{cues.length ? `${cues.length} baris subtitle` : "Belum ada subtitle"}</span>
          {cuesTr.length > 0 && <span className="badge info">Terjemahan: {cuesTr.length} baris</span>}
          <span className="grow" />
          <input className="input" style={{ height: 32, maxWidth: 260, fontSize: "0.82rem" }} placeholder="Judul sesi (mis. Barakamon ep 1)" value={title} onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }} />
        </div>
      </div>

      {/* Panel subtitle otomatis */}
      <div className="card glow asr-panel" style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ gap: 14 }}>
          <div className="stat-icon" style={{ margin: 0 }}><AudioLines /></div>
          <div className="grow" style={{ minWidth: 220 }}>
            <strong>Subtitle otomatis dari suara</strong>
            <div className="muted" style={{ fontSize: "0.84rem" }}>
              Gratis, tanpa API key. Pengenal suara berjalan di browsermu (Chrome/Edge desktop disarankan).
            </div>
          </div>
          <Seg
            value={model}
            onChange={(m) => { setModel(m); localStorage.setItem(MODEL_KEY, m); }}
            options={ASR_MODELS.map((m) => ({ v: m.id, label: `${m.label} · ${m.size}` }))}
          />
          {busy ? (
            <button className="btn" onClick={stopAsr}><Square /> Berhenti</button>
          ) : (
            <>
              {source?.kind === "file" && <button className="btn primary" onClick={transcribeWholeFile}><Wand2 /> Buat subtitle dari file</button>}
              <button
                className={`btn${source?.kind === "file" ? "" : " primary"}`}
                disabled={!source || (source.kind === "yt" && !canCaptureTab())}
                onClick={() => (source?.kind === "yt" ? setTabHelp(true) : startLive())}
              >
                <Mic /> {source?.kind === "yt" ? "Dengarkan audio YouTube" : "Dengar sambil menonton"}
              </button>
            </>
          )}
          {cues.length > 0 && <button className="btn icon" title="Unduh subtitle (.srt)" onClick={downloadSrt}><Download /></button>}
        </div>
        {asr.phase === "loading" && (
          <div style={{ marginTop: 12 }}>
            <div className="row" style={{ fontSize: "0.84rem", marginBottom: 6 }}><Spinner /> {asr.text}</div>
            <Bar value={asr.progress} max={100} />
          </div>
        )}
        {asr.phase === "live" && (
          <div className="callout" style={{ marginTop: 12 }}>
            <span className="rec-dot" />
            <div>
              <strong>Mendengarkan audio…</strong> ({asr.device === "webgpu" ? "GPU" : "CPU"}) Subtitle muncul ±2–6 detik setelah kalimat diucapkan dan tersimpan otomatis.
              Putar ulang video untuk belajar dengan subtitle yang sudah sinkron.
            </div>
          </div>
        )}
        {asr.phase === "file" && (
          <div style={{ marginTop: 12 }}>
            <div className="row" style={{ fontSize: "0.84rem", marginBottom: 6 }}>
              <Spinner /> Membuat subtitle ({asr.device === "webgpu" ? "GPU" : "CPU"})… {fmtTime(asr.done)} / {fmtTime(asr.total || 0)}
            </div>
            <Bar value={asr.done} max={asr.total || 1} />
          </div>
        )}
        {asr.phase === "error" && <div className="callout mars" style={{ marginTop: 12 }}><Info /><div>{asr.message}</div></div>}
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
                  <Film style={{ width: 46, height: 46, margin: "0 auto 14px", color: "#fff" }} />
                  <h3 style={{ color: "#fff" }}>Mulai sesi tontonmu</h3>
                  <p style={{ maxWidth: 440, margin: "0 auto", color: "rgba(255,255,255,.8)" }}>
                    Tempel tautan YouTube atau seret file video (mp4/mkv/webm). Tidak punya subtitle? Pakai <strong>Subtitle otomatis dari suara</strong>.
                  </p>
                </div>
              </div>
            )}
            {cue && (
              <div className="sub-overlay">
                <div className="sub-box" style={{ whiteSpace: "pre-line" }}>
                  {lineWords ? <JapaneseText words={lineWords} size="xl" context={popupCtx} className="pre" /> : <span className="jt xl pre">{cue.text}</span>}
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
                <Switch on={showTr} onChange={setShowTr} /> Terjemahan ID <span className="kbd">T</span>
              </label>
              <label className="row" style={{ gap: 8, fontSize: "0.86rem", fontWeight: 600 }}>
                <Switch on={showVocab} onChange={setShowVocab} /> Daftar kata + arti
              </label>
              <Seg
                value={furigana}
                onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, furigana: v } }))}
                options={[{ v: "all" as const, label: "Furigana" }, { v: "unknown" as const, label: "Adaptif" }, { v: "none" as const, label: "Tanpa" }]}
              />
              <div className="row" style={{ gap: 6, fontSize: "0.82rem" }}>
                <span className="muted">Sinkron</span>
                <button className="btn icon sm" onClick={() => { const o = Math.round((offset - 0.1) * 10) / 10; setOffset(o); save({ offset: o }); }}><Minus /></button>
                <span className="mono" style={{ minWidth: 44, textAlign: "center" }}>{offset > 0 ? "+" : ""}{offset.toFixed(1)}s</span>
                <button className="btn icon sm" onClick={() => { const o = Math.round((offset + 0.1) * 10) / 10; setOffset(o); save({ offset: o }); }}><Plus /></button>
              </div>
            </div>
          </div>

          {/* Panel kalimat aktif + kata-kata beserta artinya */}
          <div className="sub-panel">
            {cue ? (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row between wrap">
                  <span className="badge mono">{fmtTime(cue.start)} · baris {shown + 1}/{cues.length}</span>
                  {aiOn && <button className="btn sm" onClick={() => explainLine(cue.text)}><Sparkles /> Analisis kalimat (AI)</button>}
                </div>
                <div style={{ whiteSpace: "pre-line" }}>
                  {lineWords ? <JapaneseText words={lineWords} size="lg" context={popupCtx} /> : <span className="jt lg">{cue.text}</span>}
                </div>
                {translation && <div className="tr">🇮🇩 {translation}</div>}
                {showVocab && lineWords && <LineVocab words={lineWords} sentence={cue.text.replace(/\n/g, " ")} src={`${srcLabel} · ${fmtTime(cue.start)}`} level={level} />}
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  Klik kata (atau tahan <span className="kbd">Shift</span> + arahkan kursor) untuk kamus lengkap · <strong>Tambang</strong> untuk menyimpan ke review.
                </div>
              </div>
            ) : cues.length ? (
              <p className="muted" style={{ margin: 0 }}>Putar video — baris aktif akan muncul di sini beserta arti setiap kata.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row"><Pickaxe style={{ width: 18, color: "var(--mars-2)" }} /><strong>Belum ada subtitle</strong></div>
                <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                  Pakai <strong>Subtitle otomatis dari suara</strong> di atas, muat file subtitle, atau ketik kalimat yang kamu dengar di bawah ini.
                </p>
                <div className="row">
                  <input className="input jp" placeholder="例：今日はいい天気ですね" value={manual.text} onChange={(e) => setManual({ text: e.target.value })}
                    onKeyDown={async (e) => { if (e.key === "Enter" && manual.text.trim()) setManual({ text: manual.text, words: await analyse(manual.text) }); }} />
                  <button className="btn primary" disabled={!manual.text.trim()} onClick={async () => setManual({ text: manual.text, words: await analyse(manual.text) })}>Analisis</button>
                </div>
                {manual.words && (
                  <>
                    <JapaneseText words={manual.words} size="lg" context={{ ja: manual.text, src: srcLabel, level }} />
                    <LineVocab words={manual.words} sentence={manual.text} src={srcLabel} level={level} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel samping */}
        <div className="card studio-side">
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={tab === "transkrip" ? "on" : ""} onClick={() => setTab("transkrip")}>Transkrip</button>
            <button className={tab === "tambang" ? "on" : ""} onClick={() => setTab("tambang")}>Tambang ({sessionCards.length})</button>
            {aiOn && <button className={tab === "ai" ? "on" : ""} onClick={() => setTab("ai")}>Analisis AI</button>}
          </div>
          {tab === "transkrip" && (
            <div className="transcript" ref={transcriptRef}>
              {cues.length === 0 && <p className="muted" style={{ padding: 10 }}>Transkrip akan muncul di sini (dari file subtitle atau subtitle otomatis).</p>}
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
          {tab === "ai" && aiOn && (
            <div className="transcript">
              {!ai && <p className="muted" style={{ padding: 10 }}>Tekan “Analisis kalimat (AI)” untuk penjelasan tata bahasa dan nuansa dalam Bahasa Indonesia.</p>}
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
      {tabHelp && <TabCaptureHelp onClose={() => setTabHelp(false)} onStart={startLive} modelLabel={ASR_MODELS.find((m) => m.id === model)!} />}
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

function TabCaptureHelp({ onClose, onStart, modelLabel }: { onClose: () => void; onStart: () => void; modelLabel: { label: string; size: string } }) {
  return (
    <Modal onClose={onClose}>
      <div className="eyebrow"><Mic style={{ width: 14 }} /> Subtitle otomatis YouTube</div>
      <h2>Izinkan THE MARS mendengar audio video</h2>
      <ol style={{ paddingLeft: 20, color: "var(--text-2)", lineHeight: 1.9 }}>
        <li>Klik <strong>Mulai</strong>. Browser akan menampilkan jendela berbagi layar.</li>
        <li>Pilih tab <strong>“Tab ini”</strong> (THE MARS).</li>
        <li>Pastikan <strong>“Bagikan juga audio tab”</strong> dicentang, lalu klik <strong>Bagikan</strong>.</li>
        <li>Video akan berputar dan subtitle Jepang muncul otomatis beserta arti Indonesia.</li>
      </ol>
      <div className="callout" style={{ marginTop: 10 }}>
        <Info />
        <div>
          Pertama kali, model pengenal suara <strong>{modelLabel.label} ({modelLabel.size})</strong> diunduh sekali lalu tersimpan di browser.
          Semua proses berjalan di perangkatmu — gratis, tanpa API key, dan audio tidak dikirim ke server mana pun.
          Berfungsi paling baik di Chrome/Edge versi desktop.
        </div>
      </div>
      <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn ghost" onClick={onClose}>Batal</button>
        <button className="btn primary" onClick={onStart}><Mic /> Mulai</button>
      </div>
    </Modal>
  );
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
          ["1. Pilih tontonan", "Anime, drama, film, atau video YouTube berbahasa Jepang yang kamu suka. Lihat Rekomendasi Tontonan sesuai levelmu."],
          ["2. Subtitle otomatis", "Tidak punya subtitle? Tekan “Dengarkan audio YouTube” atau “Buat subtitle dari file”. Suara diubah menjadi teks Jepang di browsermu, gratis."],
          ["3. Kata + arti Indonesia", "Setiap baris menampilkan daftar kata, cara baca, dan artinya dalam Bahasa Indonesia secara otomatis, mirip kamus pop-up Yomitan."],
          ["4. Mode intensif", "Aktifkan “Jeda tiap baris”: setiap baris berhenti otomatis. Baca, dengarkan ulang (S), lalu tirukan (shadowing)."],
          ["5. Mode dengar", "Samarkan subtitle dan intip hanya saat perlu. Latihan terbaik untuk choukai JLPT."],
          ["6. Tambang & review", "Simpan kata penting beserta kalimatnya. Besok kata itu muncul di Review sampai kamu hafal."],
        ].map(([t, d]) => (
          <div key={t} className="card" style={{ padding: 16 }}>
            <strong>{t}</strong>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>{d}</p>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        <Info />
        <div>Video, audio, dan subtitle diproses di browsermu dan tidak diunggah ke server. Subtitle otomatis tersimpan dan bisa diunduh sebagai .srt.</div>
      </div>
    </Modal>
  );
}
