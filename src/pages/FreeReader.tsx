import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Languages, ScanText, Sparkles, Trash2, Wand2 } from "lucide-react";
import { analyseMany, splitSentences, tokenizerStatus } from "../lib/tokenizer.ts";
import { generateStory } from "../lib/ai.ts";
import { useAiEnabled } from "../lib/aiStatus.ts";
import { translateMany } from "../lib/translate.ts";
import { parseSubtitles } from "../lib/subtitles.ts";
import { addLog, useStore } from "../lib/store.ts";
import { LEVELS, type Level } from "../lib/types.ts";
import type { Word } from "../lib/japanese.ts";
import { SentenceList, PlayAllButton, type TrMode } from "../components/SentenceList.tsx";
import { PageHead, Seg, Spinner, toast } from "../components/ui.tsx";

type Sent = { ja: string; id?: string; w: Word[] };
const KEY = "themars:reader";

const TOPICS = ["Kehidupan sekolah", "Makanan Jepang", "Liburan musim panas", "Kerja paruh waktu", "Festival matsuri", "Misteri di kereta", "Teknologi & AI", "Persahabatan", "Kota Tokyo", "Kucing yang pintar"];

export default function FreeReader() {
  const my = useStore((s) => s.profile.level);
  const [params] = useSearchParams();
  const [text, setText] = useState(() => localStorage.getItem(KEY) ?? "");
  const [title, setTitle] = useState("Pembaca Bebas");
  const [sents, setSents] = useState<Sent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tr, setTr] = useState<TrMode>("blur");
  const [playAll, setPlayAll] = useState(false);
  const aiOn = useAiEnabled();
  const [aiOpen, setAiOpen] = useState(params.get("ai") === "1");
  const [aiLevel, setAiLevel] = useState<Level>(my);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [started, setStarted] = useState(0);
  const stopPlayAll = useCallback(() => setPlayAll(false), []);

  const run = useCallback(async (input: { ja: string; id?: string }[], t = "Pembaca Bebas") => {
    setBusy(true);
    setTitle(t);
    try {
      const ws = await analyseMany(input.map((s) => s.ja));
      setSents(input.map((s, i) => ({ ...s, w: ws[i] })));
      setStarted(Date.now());
    } catch {
      toast("Tokenizer gagal dimuat. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Catat waktu membaca saat meninggalkan halaman
  useEffect(() => {
    if (!started) return;
    return () => {
      const min = (Date.now() - started) / 60000;
      if (min >= 1) addLog(Math.min(min, 120), "baca", title);
    };
  }, [started, title]);

  const analyseText = () => {
    const clean = text.trim();
    if (!clean) return;
    localStorage.setItem(KEY, clean);
    void run(splitSentences(clean).slice(0, 400).map((ja) => ({ ja })));
  };

  const loadFile = async (f: File) => {
    const raw = await f.text();
    const isSub = /\.(srt|vtt|ass|ssa)$/i.test(f.name);
    const content = isSub ? parseSubtitles(raw, f.name).map((c) => c.text.replace(/\n/g, " ")).join("\n") : raw;
    setText(content);
  };

  const makeStory = async () => {
    setBusy(true);
    try {
      const story = await generateStory(aiLevel, topic);
      setAiOpen(false);
      setTr("blur");
      await run(story.sentences, `Cerita AI: ${story.title}`);
      setText(story.sentences.map((s) => s.ja).join("\n"));
      toast(`Cerita "${story.titleId}" siap dibaca`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  const translateAll = async () => {
    if (!sents) return;
    setBusy(true);
    try {
      const out = [...sents];
      for (let i = 0; i < out.length; i += 30) {
        const chunk = out.slice(i, i + 30);
        const res = await translateMany(chunk.map((s) => s.ja));
        res.forEach((t, j) => (out[i + j] = { ...out[i + j], id: t }));
        setSents([...out]);
      }
      setTr("show");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow={<><ScanText style={{ width: 14 }} /> Pembaca Bebas</>}
        title="Baca teks Jepang apa pun"
        lead="Tempel artikel NHK, lirik lagu, dialog game, transkrip podcast, atau subtitle. Setiap kata langsung bisa diklik, didengar, dan ditambang."
      >
        {aiOn && <button className="btn primary" onClick={() => setAiOpen((v) => !v)}><Sparkles /> Buat cerita AI</button>}
      </PageHead>

      {aiOn && aiOpen && (
        <div className="card glow" style={{ marginBottom: 18 }}>
          <div className="card-title"><Wand2 style={{ color: "var(--mars-2)" }} /><h3 className="grow">Generator cerita bertingkat</h3></div>
          <p className="muted" style={{ marginTop: -6 }}>Sensei AI menulis cerita baru sesuai level JLPT-mu, lengkap dengan terjemahan Indonesia per kalimat.</p>
          <div className="row wrap" style={{ gap: 12 }}>
            <Seg value={aiLevel} onChange={setAiLevel} options={LEVELS.map((l) => ({ v: l, label: `N${l}` }))} />
            <select className="select" style={{ maxWidth: 260 }} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input" style={{ maxWidth: 260 }} placeholder="…atau tulis topik sendiri" onChange={(e) => e.target.value && setTopic(e.target.value)} />
            <button className="btn primary" onClick={makeStory} disabled={busy}>{busy ? <Spinner /> : <Sparkles />} Buat cerita</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <textarea
          className="textarea jp"
          style={{ minHeight: sents ? 90 : 200, fontSize: "1.05rem" }}
          placeholder="ここに日本語の文章を貼り付けてください。例：今日は朝から雨が降っています。"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row wrap" style={{ marginTop: 12, gap: 10 }}>
          <button className="btn primary" onClick={analyseText} disabled={busy || !text.trim()}>
            {busy ? <Spinner /> : <ScanText />} {busy && tokenizerStatus() !== "ready" ? "Menyiapkan kamus…" : "Analisis teks"}
          </button>
          <label className="btn">
            <FileText /> Muat .txt / .srt
            <input type="file" hidden accept=".txt,.srt,.vtt,.ass" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
          <button className="btn ghost" onClick={() => { setText(""); setSents(null); localStorage.removeItem(KEY); }}><Trash2 /> Bersihkan</button>
          <span className="grow" />
          <span className="muted" style={{ fontSize: "0.8rem" }}>{text.length} karakter</span>
        </div>
        {tokenizerStatus() !== "ready" && (
          <p className="muted" style={{ fontSize: "0.8rem", margin: "10px 0 0" }}>Analisis pertama memuat kamus morfologi (±12 MB) dan disimpan di cache browser.</p>
        )}
      </div>

      {sents && (
        <>
          <div className="toolbar">
            <strong className="grow">{title} · {sents.length} kalimat</strong>
            <Seg value={tr} onChange={setTr} options={[{ v: "hide" as const, label: "Tanpa arti" }, { v: "blur" as const, label: "Arti samar" }, { v: "show" as const, label: "Arti" }]} />
            <button className="btn sm" onClick={translateAll} disabled={busy}><Languages /> Terjemahkan (ID)</button>
            <PlayAllButton on={playAll} onClick={() => setPlayAll((p) => !p)} />
          </div>
          <div className="card" style={{ padding: "10px 6px" }}>
            <SentenceList sentences={sents} tr={tr} base={{ src: title, level: my }} level={my} playAll={playAll} onPlayAllEnd={stopPlayAll} />
          </div>
        </>
      )}
    </div>
  );
}
