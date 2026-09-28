// Worker pengenal suara bahasa Jepang (Whisper) yang berjalan sepenuhnya di browser — gratis, tanpa API key.
// Library transformers.js dimuat dari CDN; model diunduh sekali dari Hugging Face lalu disimpan di cache browser.

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.web.min.js";

type Chunk = { timestamp: [number, number | null]; text: string };
type AsrOutput = { text: string; chunks?: Chunk[] };
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<AsrOutput>;
type Msg =
  | { type: "load"; model: string }
  | { type: "transcribe"; id: number; audio: Float32Array; offset: number };

const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent<Msg>) => void) | null };

let asr: Asr | null = null;
let loadedModel = "";
let loading: Promise<void> | null = null;

async function load(model: string) {
  if (asr && loadedModel === model) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tf: any = await import(/* @vite-ignore */ TRANSFORMERS_URL);
  tf.env.allowLocalModels = false;
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  const hasGpu = !!gpu && !!(await gpu.requestAdapter().catch(() => null));
  const progress = (p: unknown) => ctx.postMessage({ type: "progress", data: p });
  const make = (device: "webgpu" | "wasm") =>
    tf.pipeline("automatic-speech-recognition", model, {
      device,
      dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
      progress_callback: progress,
    });
  let device: "webgpu" | "wasm" = hasGpu ? "webgpu" : "wasm";
  try {
    asr = await make(device);
  } catch (e) {
    if (device !== "webgpu") throw e;
    device = "wasm";
    asr = await make(device);
  }
  loadedModel = model;
  ctx.postMessage({ type: "ready", device });
}

ctx.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") {
      loading = load(m.model);
      await loading;
      return;
    }
    if (m.type === "transcribe") {
      if (loading) await loading;
      if (!asr) throw new Error("Model belum dimuat");
      const out = await asr(m.audio, {
        language: "japanese",
        task: "transcribe",
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const duration = m.audio.length / 16000;
      const chunks = (out.chunks?.length ? out.chunks : [{ timestamp: [0, duration] as [number, number], text: out.text }])
        .map((c) => ({
          start: m.offset + (c.timestamp[0] ?? 0),
          end: m.offset + (c.timestamp[1] ?? duration),
          text: c.text.trim(),
        }))
        .filter((c) => c.text && !/^[\s。、.,!?！？…♪〜ー]*$/.test(c.text));
      ctx.postMessage({ type: "result", id: m.id, chunks });
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: "id" in m ? m.id : undefined, message: (err as Error).message ?? String(err) });
  }
};
