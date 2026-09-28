// Pengenal suara BAWAAN BROWSER (Web Speech API, bahasa ja-JP).
// Tidak ada model yang diunduh dan tidak ada server THE MARS: browser (Chrome/Edge/Safari)
// yang mengubah suara menjadi teks Jepang. Ringan dan tidak membebani halaman.

type SpeechAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlt; length: number };
type SpeechEvent = { resultIndex: number; results: { length: number; [i: number]: SpeechResult } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(track?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const Ctor = (): RecognitionCtor | undefined => {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const speechSupported = () => !!Ctor();

export type SpeechCue = { start: number; end: number; text: string };

const ERRORS: Record<string, string> = {
  "not-allowed": "Izin mikrofon/audio ditolak. Izinkan di pengaturan situs browser.",
  "service-not-allowed": "Pengenal suara diblokir oleh browser.",
  network: "Pengenal suara bawaan browser butuh koneksi internet.",
  "language-not-supported": "Browser ini belum mendukung pengenalan suara bahasa Jepang.",
  "audio-capture": "Mikrofon tidak ditemukan.",
};

/**
 * Mendengarkan terus-menerus dan menghasilkan baris subtitle.
 * - onInterim: teks sementara saat orang masih berbicara (untuk tampilan langsung)
 * - onFinal: satu baris selesai, lengkap dengan perkiraan waktu mulai/selesai di video
 */
export class LiveSpeech {
  private rec: Recognition | null = null;
  private active = false;
  private utterStart: number | null = null;
  private track?: MediaStreamTrack;
  private restarts = 0;

  constructor(private opts: {
    getTime: () => number;
    onInterim: (text: string) => void;
    onFinal: (cue: SpeechCue) => void;
    onError: (message: string) => void;
    onStop: () => void;
  }) {}

  /** Mulai. `track` = audio dari video/tab (browser yang mendukung); tanpa track = mikrofon. */
  start(track?: MediaStreamTrack) {
    const C = Ctor();
    if (!C) throw new Error("Browser ini belum mendukung pengenal suara. Gunakan Chrome, Edge, atau Safari terbaru.");
    this.track = track;
    this.active = true;
    this.spawn(C);
  }

  private spawn(C: RecognitionCtor) {
    const rec = new C();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      this.restarts = 0;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (!text) continue;
        if (this.utterStart === null) this.utterStart = Math.max(0, this.opts.getTime() - 0.8);
        if (r.isFinal) {
          const end = this.opts.getTime();
          this.opts.onFinal({ start: this.utterStart, end: Math.max(end, this.utterStart + 1), text });
          this.utterStart = null;
        } else interim += text;
      }
      this.opts.onInterim(interim);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      const msg = ERRORS[e.error];
      if (msg) {
        this.active = false;
        this.opts.onError(msg);
      }
    };
    rec.onend = () => {
      // Browser menghentikan sesi setelah hening/beberapa menit — sambung lagi otomatis
      if (this.active && this.restarts < 20) {
        this.restarts++;
        setTimeout(() => this.active && this.spawn(C), 250);
      } else {
        this.active = false;
        this.opts.onStop();
      }
    };
    try {
      if (this.track) rec.start(this.track);
      else rec.start();
    } catch {
      rec.start();
    }
    this.rec = rec;
  }

  stop() {
    this.active = false;
    this.rec?.stop();
    this.track?.stop();
    this.opts.onInterim("");
  }
}

/** Ambil audio dari elemen <video> lokal (tanpa mengganggu suara yang terdengar). */
export function audioTrackFromVideo(v: HTMLVideoElement): MediaStreamTrack | undefined {
  const el = v as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
  const stream = el.captureStream?.() ?? el.mozCaptureStream?.();
  return stream?.getAudioTracks()[0];
}

/** Minta izin berbagi audio tab ini (untuk YouTube). */
export async function audioTrackFromTab(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
  } as DisplayMediaStreamOptions);
  stream.getVideoTracks().forEach((t) => t.stop());
  const track = stream.getAudioTracks()[0];
  if (!track) throw new Error("Audio tidak ikut dibagikan. Ulangi dan centang “Bagikan audio tab”.");
  return track;
}

export const canShareTab = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

/** Dengarkan satu kalimat lewat mikrofon (untuk dikte/latihan ucap). */
export function recognizeOnce(lang = "ja-JP", onInterim?: (t: string) => void): { result: Promise<string>; stop: () => void } {
  const C = Ctor();
  if (!C) return { result: Promise.reject(new Error("Browser ini belum mendukung pengenal suara.")), stop: () => {} };
  const rec = new C();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  const result = new Promise<string>((resolve, reject) => {
    let finalText = "";
    let latest = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      latest = finalText + interim;
      onInterim?.(latest);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech") return resolve("");
      if (e.error !== "aborted") reject(new Error(ERRORS[e.error] ?? "Pengenal suara gagal."));
    };
    rec.onend = () => resolve((finalText || latest).trim());
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}

/** Kemiripan dua kalimat Jepang (0–100), mengabaikan tanda baca & spasi. */
export function similarity(a: string, b: string) {
  const norm = (s: string) => s.replace(/[\s、。！？!?「」『』…・,.]/g, "");
  const x = [...norm(a)];
  const y = [...norm(b)];
  if (!x.length || !y.length) return 0;
  const dp = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return Math.round((2 * dp[x.length][y.length] * 100) / (x.length + y.length));
}
