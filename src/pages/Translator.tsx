import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Copy, Download, History, Languages, Mic, Square, Trash2, Volume2 } from "lucide-react";
import { getTranslator, translate, translatorSupported, useTranslatorStatus } from "../lib/translate.ts";
import { analyse } from "../lib/tokenizer.ts";
import { recognizeOnce, similarity, speechSupported } from "../lib/speech.ts";
import { speak } from "../lib/tts.ts";
import { addLog, useStore } from "../lib/store.ts";
import type { Word } from "../lib/japanese.ts";
import { JapaneseText } from "../components/JapaneseText.tsx";
import { LineVocab } from "../components/LineVocab.tsx";
import { Bar, PageHead, Spinner, toast } from "../components/ui.tsx";

type Dir = "ja-id" | "id-ja";
type Item = { dir: Dir; src: string; out: string; t: number };
const HIST_KEY = "themars:tr-history";

const loadHist = (): Item[] => {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]") as Item[];
  } catch {
    return [];
  }
};

export default function Translator() {
  const level = useStore((s) => s.profile.level);
  const [dir, setDir] = useState<Dir>("id-ja");
  const [src, setSrc] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useState<number | null>(null);
  const [jpWords, setJpWords] = useState<Word[] | null>(null);
  const [listening, setListening] = useState<null | "input" | "practice">(null);
  const [practice, setPractice] = useState<{ heard: string; score: number } | null>(null);
  const [hist, setHist] = useState<Item[]>(loadHist);
  const stopRef = useRef<() => void>(() => {});
  const started = useRef(Date.now());
  const from = dir === "ja-id" ? "ja" : "id";
  const to = dir === "ja-id" ? "id" : "ja";
  const status = useTranslatorStatus(from, to);
  const jpText = dir === "ja-id" ? src : out;

  useEffect(() => () => {
    const min = (Date.now() - started.current) / 60000;
    if (min >= 1) addLog(Math.min(min, 90), "bicara", "Penerjemah & latihan ucap");
  }, []);

  // Rincian kata untuk sisi bahasa Jepang
  useEffect(() => {
    setPractice(null);
    if (!jpText.trim()) return setJpWords(null);
    let alive = true;
    const t = setTimeout(() => {
      void analyse(jpText.trim()).then((w) => alive && setJpWords(w), () => {});
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [jpText]);

  async function run(text = src) {
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await getTranslator(from, to, (pct) => setDl(pct));
      setDl(null);
      const res = await translate(clean, from, to);
      setOut(res);
      const next = [{ dir, src: clean, out: res, t: Date.now() }, ...hist.filter((h) => h.src !== clean)].slice(0, 30);
      setHist(next);
      localStorage.setItem(HIST_KEY, JSON.stringify(next));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      setDl(null);
    }
  }

  function swap() {
    setDir((d) => (d === "ja-id" ? "id-ja" : "ja-id"));
    setSrc(out);
    setOut(src);
  }

  function listen(mode: "input" | "practice") {
    if (listening) return stopRef.current();
    const lang = mode === "input" && dir === "id-ja" ? "id-ID" : "ja-JP";
    const { result, stop } = recognizeOnce(lang, (t) => mode === "input" && setSrc(t));
    stopRef.current = stop;
    setListening(mode);
    result.then(
      (text) => {
        setListening(null);
        if (!text) return toast("Tidak ada suara yang terdengar");
        if (mode === "input") {
          setSrc(text);
          void run(text);
        } else setPractice({ heard: text, score: similarity(text, jpText) });
      },
      (e: Error) => {
        setListening(null);
        toast(e.message);
      },
    );
  }

  const unsupported = !translatorSupported() || status === "unsupported" || status === "unavailable";

  return (
    <div className="page">
      <PageHead
        eyebrow={<><Languages style={{ width: 14 }} /> Penerjemah lokal</>}
        title="Penerjemah Jepang ⇄ Indonesia"
        lead="Latihan input & output: terjemahkan kalimat, lihat arti setiap kata, dengarkan pengucapannya, lalu tirukan dan dapatkan skor. Terjemahan berjalan di perangkatmu."
      />

      {unsupported && status !== "checking" && (
        <div className="callout mars" style={{ marginBottom: 16 }}>
          <Languages />
          <div>
            Penerjemah lokal membutuhkan <strong>Google Chrome atau Microsoft Edge versi desktop terbaru</strong>. Di browser ini kamu tetap bisa
            melihat rincian kata Jepang, mendengarkan pengucapan, dan latihan ucap.
          </div>
        </div>
      )}
      {status === "downloadable" && (
        <div className="callout" style={{ marginBottom: 16 }}>
          <Download />
          <div>Paket bahasa akan diunduh sekali oleh browser saat kamu menekan <strong>Terjemahkan</strong> pertama kali. Setelah itu bisa dipakai offline.</div>
        </div>
      )}

      <div className="grid collapse" style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "stretch", gap: 14 }}>
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row between">
            <strong>{dir === "ja-id" ? "🇯🇵 Jepang" : "🇮🇩 Indonesia"}</strong>
            <div className="btn-row">
              {speechSupported() && (
                <button className={`btn sm${listening === "input" ? " primary" : ""}`} onClick={() => listen("input")}>
                  {listening === "input" ? <Square /> : <Mic />} {listening === "input" ? "Berhenti" : "Bicara"}
                </button>
              )}
              {src && <button className="btn icon sm ghost" onClick={() => { setSrc(""); setOut(""); }} aria-label="Hapus"><Trash2 /></button>}
            </div>
          </div>
          <textarea
            className={`textarea${dir === "ja-id" ? " jp" : ""}`}
            style={{ minHeight: 150, fontSize: "1.1rem" }}
            placeholder={dir === "ja-id" ? "日本語を入力… (mis. 今日は何をしますか？)" : "Tulis kalimat Indonesia… (mis. Aku ingin makan ramen hari ini)"}
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void run();
            }}
          />
          <button className="btn primary" onClick={() => run()} disabled={busy || !src.trim() || unsupported}>
            {busy ? <Spinner /> : <Languages />} Terjemahkan <span className="kbd" style={{ marginLeft: 4 }}>Ctrl+Enter</span>
          </button>
          {dl !== null && (
            <div>
              <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>Mengunduh paket bahasa… {dl}%</div>
              <Bar value={dl} max={100} thin />
            </div>
          )}
        </div>

        <div style={{ display: "grid", placeItems: "center" }}>
          <button className="btn icon lg" onClick={swap} aria-label="Tukar arah" title="Tukar arah"><ArrowLeftRight /></button>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          <div className="row between">
            <strong>{dir === "ja-id" ? "🇮🇩 Indonesia" : "🇯🇵 Jepang"}</strong>
            {out && (
              <div className="btn-row">
                {to === "ja" && <button className="btn icon sm ghost" onClick={() => speak(out)} aria-label="Dengarkan"><Volume2 /></button>}
                <button className="btn icon sm ghost" onClick={() => { void navigator.clipboard?.writeText(out); toast("Disalin"); }} aria-label="Salin"><Copy /></button>
              </div>
            )}
          </div>
          <div className={`tr-out${to === "ja" ? " jp" : ""}`}>{out || <span className="faint">Hasil terjemahan muncul di sini.</span>}</div>
        </div>
      </div>

      {jpWords && jpText.trim() && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="row between wrap" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Kalimat Jepang & rincian kata</h3>
            <div className="btn-row">
              <button className="btn sm" onClick={() => speak(jpText)}><Volume2 /> Dengarkan</button>
              <button className="btn sm" onClick={() => speak(jpText, { rate: 0.7 })}><Volume2 /> Pelan</button>
              {speechSupported() && (
                <button className={`btn sm${listening === "practice" ? " primary" : ""}`} onClick={() => listen("practice")}>
                  {listening === "practice" ? <Square /> : <Mic />} {listening === "practice" ? "Berhenti" : "Tirukan & nilai"}
                </button>
              )}
            </div>
          </div>
          <JapaneseText words={jpWords} size="lg" context={{ ja: jpText, tr: dir === "ja-id" ? out : src, src: "Penerjemah", level }} />
          {practice && (
            <div className={`callout${practice.score >= 80 ? "" : " mars"}`} style={{ marginTop: 12 }}>
              <Mic />
              <div>
                <strong>Skor ucapan: {practice.score}%</strong> — {practice.score >= 90 ? "Sempurna! 🎉" : practice.score >= 70 ? "Bagus, sedikit lagi!" : "Coba dengarkan versi pelan lalu ulangi."}
                <div className="jp" style={{ marginTop: 4 }}>Terdengar: {practice.heard}</div>
              </div>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <LineVocab words={jpWords} sentence={jpText} src="Penerjemah" level={level} hideKnown={false} />
          </div>
        </div>
      )}

      {hist.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }} className="row"><History style={{ width: 18 }} /> Riwayat</h3>
            <button className="btn sm ghost" onClick={() => { setHist([]); localStorage.removeItem(HIST_KEY); }}><Trash2 /> Hapus</button>
          </div>
          <div className="list">
            {hist.slice(0, 12).map((h) => (
              <button
                key={h.t}
                className="vocab-row"
                style={{ gridTemplateColumns: "1fr 1fr", textAlign: "left", border: 0, background: "none", width: "100%" }}
                onClick={() => { setDir(h.dir); setSrc(h.src); setOut(h.out); }}
              >
                <span className={h.dir === "ja-id" ? "jp" : ""}>{h.src}</span>
                <span className={`muted${h.dir === "id-ja" ? " jp" : ""}`}>{h.out}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
