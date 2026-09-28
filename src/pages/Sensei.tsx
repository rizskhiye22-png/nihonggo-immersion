import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Eraser, MessageCircle, PenLine, Send, Square, Target, Volume2, HelpCircle } from "lucide-react";
import { streamAi, type ChatMessage } from "../lib/ai.ts";
import { addLog, useStore } from "../lib/store.ts";
import { speak } from "../lib/tts.ts";
import { isJapanese } from "../lib/japanese.ts";
import { AiText } from "../components/AiText.tsx";
import { PageHead, Seg } from "../components/ui.tsx";

type Mode = "ngobrol" | "koreksi" | "tanya" | "jlpt";
const MODES: { v: Mode; label: string; icon: typeof Bot; hello: string; starters: string[] }[] = [
  {
    v: "ngobrol", label: "Ngobrol", icon: MessageCircle,
    hello: "こんにちは！Aku Sensei, teman ngobrolmu. Kita bicara dalam bahasa Jepang sesuai levelmu, dan aku akan membetulkan kesalahan kecil dengan lembut. 今日は何をしましたか？",
    starters: ["今日は何をしましたか？", "好きなアニメについて話したいです", "週末の予定を話しましょう"],
  },
  {
    v: "koreksi", label: "Koreksi tulisan", icon: PenLine,
    hello: "Tulis kalimat atau paragraf bahasa Jepang (misalnya ringkasan anime yang baru kamu tonton). Aku akan mengoreksi, menjelaskan alasannya, dan memberi versi yang lebih natural.",
    starters: ["昨日、友達と映画を見に行きました。とても面白いでした。", "私は日本語を勉強するのが好きです、でも漢字は難しいです。"],
  },
  {
    v: "tanya", label: "Tanya jawab", icon: HelpCircle,
    hello: "Tanyakan apa saja tentang bahasa Jepang: beda は dan が, kapan memakai keigo, arti slang di anime, dan lain-lain.",
    starters: ["Apa beda は dan が?", "Kapan pakai 〜てしまう vs 〜ちゃう?", "Apa arti やばい di anime?"],
  },
  {
    v: "jlpt", label: "Simulasi JLPT", icon: Target,
    hello: "Aku akan membuat soal latihan gaya JLPT sesuai levelmu satu per satu. Jawab dengan nomor pilihan, lalu aku jelaskan pembahasannya.",
    starters: ["Buat soal kosakata (文字・語彙)", "Buat soal tata bahasa (文法)", "Buat soal membaca pendek (読解)"],
  },
];

const STORE_KEY = "themars:sensei";

export default function Sensei() {
  const level = useStore((s) => s.profile.level);
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("q") ? "tanya" : "ngobrol");
  const [threads, setThreads] = useState<Record<Mode, ChatMessage[]>>(() => {
    try {
      return { ngobrol: [], koreksi: [], tanya: [], jlpt: [], ...JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") };
    } catch {
      return { ngobrol: [], koreksi: [], tanya: [], jlpt: [] };
    }
  });
  const [input, setInput] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const started = useRef(Date.now());
  const messages = threads[mode];
  const meta = MODES.find((m) => m.v === mode)!;

  useEffect(() => {
    if (params.get("q")) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(Object.entries(threads).map(([k, v]) => [k, v.slice(-40)]))));
    } catch {
      /* abaikan */
    }
  }, [threads]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => {
    const min = (Date.now() - started.current) / 60000;
    if (min >= 1) addLog(Math.min(min, 120), "bicara", "Sensei AI");
  }, []);

  async function send(text = input) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setError(null);
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setThreads((t) => ({ ...t, [mode]: [...history, { role: "assistant", content: "" }] }));
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      await streamAi(
        "chat",
        { mode, level, messages: history.slice(-20) },
        (full) => setThreads((t) => ({ ...t, [mode]: [...history, { role: "assistant", content: full }] })),
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setThreads((t) => ({ ...t, [mode]: history }));
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div className="page">
      <PageHead
        eyebrow={<><Bot style={{ width: 14 }} /> Sensei AI</>}
        title="Tutor pribadimu, 24 jam"
        lead={`Latihan output sesuai level N${level}. Penjelasan selalu dalam Bahasa Indonesia.`}
      >
        <button className="btn ghost" onClick={() => setThreads((t) => ({ ...t, [mode]: [] }))}><Eraser /> Percakapan baru</button>
      </PageHead>

      <div style={{ marginBottom: 14 }}>
        <Seg value={mode} onChange={setMode} options={MODES.map((m) => ({ v: m.v, label: <span className="row" style={{ gap: 6 }}><m.icon style={{ width: 15 }} />{m.label}</span> }))} />
      </div>

      <div className="card chat" style={{ padding: 16 }}>
        <div className="chat-log" ref={logRef}>
          <div className="msg assistant"><AiText text={meta.hello} /></div>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === "assistant" ? (
                <>
                  <AiText text={m.content || "…"} streaming={busy && i === messages.length - 1} />
                  {m.content && isJapanese(m.content) && !busy && (
                    <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => speak(m.content.split("\n").filter(isJapanese).slice(0, 2).join("。"))}>
                      <Volume2 /> Dengarkan
                    </button>
                  )}
                </>
              ) : (
                m.content
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="chips" style={{ marginTop: 6 }}>
              {meta.starters.map((s) => (
                <button key={s} className="chip jp" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          {error && <div className="callout mars">{error}</div>}
        </div>
        <div className="chat-input">
          <textarea
            className="textarea jp"
            rows={2}
            placeholder={mode === "tanya" ? "Tulis pertanyaanmu…" : "日本語で書いてみよう…（Enter untuk kirim, Shift+Enter baris baru）"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {busy ? (
            <button className="btn icon lg" onClick={() => abort.current?.abort()} aria-label="Hentikan"><Square /></button>
          ) : (
            <button className="btn primary icon lg" onClick={() => send()} aria-label="Kirim"><Send /></button>
          )}
        </div>
      </div>
    </div>
  );
}
