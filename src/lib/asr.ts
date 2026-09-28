// Subtitle otomatis dari suara (Whisper di browser). Dua cara:
//  - transcribeFile(): dekode audio file lokal lalu transkripsi penuh (tercepat untuk file milik sendiri)
//  - LiveCapture: dengarkan audio yang sedang diputar (tab YouTube atau <video>) lalu transkripsi per kalimat

export type AsrChunk = { start: number; end: number; text: string };
export type AsrModel = { id: string; label: string; size: string; note: string };

export const ASR_MODELS: AsrModel[] = [
  { id: "onnx-community/whisper-base", label: "Cepat", size: "±80 MB", note: "Ringan, cocok untuk HP/laptop biasa. Akurasi cukup." },
  { id: "onnx-community/whisper-small", label: "Akurat", size: "±250 MB", note: "Lebih tepat untuk bahasa Jepang. Butuh perangkat lebih kuat." },
];

type Progress = { status: string; file?: string; progress?: number; loaded?: number; total?: number };
type WorkerMsg =
  | { type: "progress"; data: Progress }
  | { type: "ready"; device: string }
  | { type: "result"; id: number; chunks: AsrChunk[] }
  | { type: "error"; id?: number; message: string };

let worker: Worker | null = null;
let loadedModel = "";
let loadPromise: Promise<string> | null = null;
let seq = 0;
let chain: Promise<unknown> = Promise.resolve();
const pending = new Map<number, { resolve: (c: AsrChunk[]) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: Progress) => void>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/whisper.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
    const m = e.data;
    if (m.type === "progress") progressListeners.forEach((l) => l(m.data));
    else if (m.type === "result") {
      pending.get(m.id)?.resolve(m.chunks);
      pending.delete(m.id);
    } else if (m.type === "error" && m.id !== undefined) {
      pending.get(m.id)?.reject(new Error(m.message));
      pending.delete(m.id);
    }
  };
  return worker;
}

/** Muat model (sekali). Mengembalikan perangkat yang dipakai: "webgpu" atau "wasm". */
export function loadAsr(model: string, onProgress?: (p: Progress) => void): Promise<string> {
  if (onProgress) progressListeners.add(onProgress);
  if (loadPromise && loadedModel === model) return loadPromise;
  const w = getWorker();
  loadedModel = model;
  loadPromise = new Promise<string>((resolve, reject) => {
    const onMsg = (e: MessageEvent<WorkerMsg>) => {
      const m = e.data;
      if (m.type === "ready") {
        w.removeEventListener("message", onMsg);
        resolve(m.device);
      } else if (m.type === "error" && m.id === undefined) {
        w.removeEventListener("message", onMsg);
        loadPromise = null;
        const offline = /fetch|network|import/i.test(m.message);
        reject(new Error(offline ? "Model pengenal suara gagal diunduh. Periksa koneksi internet lalu coba lagi." : `Pengenal suara gagal dimuat: ${m.message}`));
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "load", model });
  });
  void loadPromise.finally(() => onProgress && progressListeners.delete(onProgress));
  return loadPromise;
}

/** Transkripsi audio 16 kHz mono. Permintaan dijalankan berurutan. */
export function transcribe(audio: Float32Array, offset: number): Promise<AsrChunk[]> {
  const run = () =>
    new Promise<AsrChunk[]>((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ type: "transcribe", id, audio, offset }, [audio.buffer]);
    });
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

// Kalimat "halusinasi" khas Whisper saat hening/musik
const HALLUCINATION = /^(ご視聴ありがとうございました|チャンネル登録(をお願いします)?|おやすみなさい|ありがとうございました)[。！!]*$/;
export const cleanChunks = (chunks: AsrChunk[]) => chunks.filter((c) => !HALLUCINATION.test(c.text.trim()));

/** Dekode seluruh audio file menjadi 16 kHz mono. */
export async function decodeTo16k(file: Blob): Promise<Float32Array> {
  const buf = await file.arrayBuffer();
  const ac = new AudioContext();
  try {
    const decoded = await ac.decodeAudioData(buf);
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void ac.close();
  }
}

/** Transkripsi file penuh per potongan 30 detik; `onChunk` dipanggil setiap ada hasil baru. */
export async function transcribeFile(
  audio: Float32Array,
  onChunk: (chunks: AsrChunk[], doneSec: number, totalSec: number) => void,
  shouldStop: () => boolean,
) {
  const total = audio.length / 16000;
  const step = 30 * 16000;
  for (let i = 0; i < audio.length; i += step) {
    if (shouldStop()) break;
    const part = audio.slice(i, Math.min(audio.length, i + step + 16000)); // +1 dtk tumpang tindih
    const chunks = cleanChunks(await transcribe(part, i / 16000));
    // Buang potongan yang dimulai di area tumpang tindih (sudah dicakup potongan berikutnya)
    onChunk(chunks.filter((c) => c.start < (i + step) / 16000), Math.min(total, (i + step) / 16000), total);
  }
}

// ───────────── Tangkap audio langsung ─────────────
const WORKLET = `class Tap extends AudioWorkletProcessor{process(i){const c=i[0];if(c&&c[0]){const m=new Float32Array(c[0].length);for(let k=0;k<c.length;k++){const ch=c[k];for(let j=0;j<ch.length;j++)m[j]+=ch[j]/c.length}this.port.postMessage(m,[m.buffer])}return true}}registerProcessor("tap",Tap);`;

const elementSources = new WeakMap<HTMLMediaElement, { ac: AudioContext; node: MediaElementAudioSourceNode }>();

type Segment = { audio: Float32Array; start: number };

/**
 * Mendengarkan audio yang sedang diputar dan memotongnya per kalimat (deteksi jeda sederhana),
 * lalu mengirim potongan ke Whisper. `getTime` memberi waktu video saat ini untuk sinkronisasi.
 */
export class LiveCapture {
  private ac: AudioContext | null = null;
  private tap: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private ownsContext = true;
  private buf: Float32Array[] = [];
  private bufLen = 0;
  private preroll: Float32Array[] = [];
  private segStart = 0;
  private inSpeech = false;
  private silentMs = 0;
  private noise = 0.01;
  private carry = new Float32Array(0);
  private window: number[] = [];
  stopped = false;

  constructor(private getTime: () => number, private onSegment: (s: Segment) => void, private onEnded?: () => void) {}

  /** Tangkap audio tab ini (untuk YouTube). Pengguna harus memilih "Tab ini" + centang "Bagikan audio". */
  async fromTab() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaStreamOptions);
    const audioTracks = stream.getAudioTracks();
    stream.getVideoTracks().forEach((t) => t.stop());
    if (!audioTracks.length) throw new Error("Audio tidak ikut dibagikan. Ulangi dan centang “Bagikan audio tab”.");
    audioTracks[0].addEventListener("ended", () => {
      this.stop();
      this.onEnded?.();
    });
    this.stream = new MediaStream(audioTracks);
    const ac = new AudioContext();
    this.ac = ac;
    await this.attach(ac.createMediaStreamSource(this.stream));
  }

  /** Tangkap audio dari elemen <video>/<audio> lokal. */
  async fromElement(el: HTMLMediaElement) {
    let entry = elementSources.get(el);
    if (!entry) {
      const ac = new AudioContext();
      const node = ac.createMediaElementSource(el);
      node.connect(ac.destination); // suara tetap terdengar
      entry = { ac, node };
      elementSources.set(el, entry);
    }
    this.ac = entry.ac;
    this.ownsContext = false;
    await entry.ac.resume();
    await this.attach(entry.node);
  }

  private async attach(source: AudioNode) {
    const ac = this.ac!;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    await ac.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const tap = new AudioWorkletNode(ac, "tap");
    const mute = ac.createGain();
    mute.gain.value = 0;
    source.connect(tap);
    tap.connect(mute).connect(ac.destination);
    tap.port.onmessage = (e: MessageEvent<Float32Array>) => this.push(e.data, ac.sampleRate);
    this.tap = tap;
  }

  /** Turunkan sample rate ke 16 kHz (interpolasi linear). */
  private resample(input: Float32Array, rate: number) {
    const data = new Float32Array(this.carry.length + input.length);
    data.set(this.carry);
    data.set(input, this.carry.length);
    const ratio = rate / 16000;
    const n = Math.floor((data.length - 1) / ratio);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * ratio;
      const i0 = Math.floor(x);
      out[i] = data[i0] + (data[i0 + 1] - data[i0]) * (x - i0);
    }
    this.carry = data.slice(Math.floor(n * ratio));
    return out;
  }

  private push(frame: Float32Array, rate: number) {
    if (this.stopped) return;
    const pcm = this.resample(frame, rate);
    for (const s of pcm) {
      this.window.push(s);
      if (this.window.length >= 320) this.analyse(Float32Array.from(this.window)); // blok 20 ms
    }
  }

  private analyse(block: Float32Array) {
    this.window = [];
    let sum = 0;
    for (const s of block) sum += s * s;
    const rms = Math.sqrt(sum / block.length);
    const threshold = Math.max(0.006, this.noise * 2.5);
    const speech = rms > threshold;
    if (!speech && !this.inSpeech) this.noise = this.noise * 0.98 + rms * 0.02;

    if (!this.inSpeech) {
      this.preroll.push(block);
      if (this.preroll.length > 15) this.preroll.shift(); // simpan 300 ms sebelum suara
      if (speech) {
        this.inSpeech = true;
        this.silentMs = 0;
        this.segStart = Math.max(0, this.getTime() - this.preroll.length * 0.02);
        this.buf = [...this.preroll];
        this.bufLen = this.preroll.reduce((a, b) => a + b.length, 0);
        this.preroll = [];
      }
      return;
    }
    this.buf.push(block);
    this.bufLen += block.length;
    this.silentMs = speech ? 0 : this.silentMs + 20;
    const dur = this.bufLen / 16000;
    if ((this.silentMs >= 550 && dur >= 1.2) || dur >= 12) this.flush();
    else if (this.silentMs >= 900) this.reset(); // bunyi terlalu pendek (bukan ucapan)
  }

  private flush() {
    const audio = new Float32Array(this.bufLen);
    let o = 0;
    for (const b of this.buf) {
      audio.set(b, o);
      o += b.length;
    }
    const start = this.segStart;
    this.reset();
    this.onSegment({ audio, start });
  }

  private reset() {
    this.inSpeech = false;
    this.buf = [];
    this.bufLen = 0;
    this.silentMs = 0;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.bufLen / 16000 >= 1) this.flush();
    this.tap?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ownsContext) void this.ac?.close();
  }
}

export const canCaptureTab = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
