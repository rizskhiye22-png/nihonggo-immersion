import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { addLog, type LogKind } from "../lib/store.ts";
import { toast, useTick } from "./ui.tsx";

// Timer imersi global (tetap berjalan saat pindah halaman / memuat ulang).
type Timer = { kind: LogKind; startedAt: number | null; note?: string };
const KEY = "themars:timer";
let timer: Timer = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "") as Timer;
  } catch {
    return { kind: "tonton", startedAt: null };
  }
})();
const ls = new Set<() => void>();
const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(timer));
  } catch {
    /* abaikan */
  }
  ls.forEach((l) => l());
};

export function startTimer(kind: LogKind, note?: string) {
  if (timer.startedAt) stopTimer();
  timer = { kind, note, startedAt: Date.now() };
  emit();
}

export function stopTimer() {
  if (!timer.startedAt) return 0;
  const min = (Date.now() - timer.startedAt) / 60000;
  // Batasi 6 jam untuk mencegah timer yang lupa dimatikan
  const logged = Math.min(min, 360);
  if (logged >= 0.5) {
    addLog(logged, timer.kind, timer.note);
    toast(`${Math.round(logged)} menit imersi dicatat`);
  }
  timer = { ...timer, startedAt: null };
  emit();
  return logged;
}

export function useTimer() {
  return useSyncExternalStore(
    (l) => {
      ls.add(l);
      return () => ls.delete(l);
    },
    () => timer,
  );
}

const KIND_LABEL: Record<LogKind, string> = { tonton: "Menonton", dengar: "Mendengar", baca: "Membaca", review: "Review", bicara: "Berbicara", lainnya: "Lainnya" };

export function TimerPill() {
  const t = useTimer();
  useTick(1000, !!t.startedAt);
  const sec = t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0;
  const hh = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div className={`timer-pill${t.startedAt ? " running" : ""}`} title="Timer imersi">
      <span className="dot" />
      {t.startedAt ? (
        <span className="mono">{hh ? `${hh}:` : ""}{mm}:{ss}</span>
      ) : (
        <select
          className="hide-sm"
          value={t.kind}
          onChange={(e) => {
            timer = { ...timer, kind: e.target.value as LogKind };
            emit();
          }}
          style={{ background: "transparent", border: 0, fontWeight: 650 }}
          aria-label="Jenis imersi"
        >
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      )}
      {t.startedAt && <span className="muted hide-sm">{KIND_LABEL[t.kind]}</span>}
      <button
        className={`btn icon sm${t.startedAt ? "" : " primary"}`}
        style={{ borderRadius: 99, height: 28, width: 28 }}
        onClick={() => (t.startedAt ? stopTimer() : startTimer(t.kind))}
        aria-label={t.startedAt ? "Hentikan timer" : "Mulai timer"}
      >
        {t.startedAt ? <Pause /> : <Play />}
      </button>
    </div>
  );
}
