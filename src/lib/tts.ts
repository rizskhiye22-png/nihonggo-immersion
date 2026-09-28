// Suara bahasa Jepang memakai Web Speech API bawaan browser (gratis, tanpa server).
import { getState } from "./store.ts";

let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith("ja"));
  // Utamakan suara berkualitas tinggi bila tersedia
  voice = voices.find((v) => /Google|Natural|Premium|Enhanced|Kyoko|Nanami/i.test(v.name)) ?? voices[0] ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export const ttsAvailable = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (!ttsAvailable()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? getState().settings.ttsRate;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsAvailable()) speechSynthesis.cancel();
}
