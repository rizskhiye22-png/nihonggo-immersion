// Abstraksi pemutar: YouTube IFrame API atau <video> lokal memakai antarmuka yang sama.

export interface PlayerApi {
  time(): number;
  seek(t: number): void;
  play(): void;
  pause(): void;
  paused(): boolean;
  setRate(r: number): void;
  destroy(): void;
}

type YTPlayer = {
  getCurrentTime(): number;
  seekTo(t: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
  }) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoading: Promise<YTNamespace> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytLoading) {
    ytLoading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => {
        ytLoading = null;
        reject(new Error("Gagal memuat pemutar YouTube"));
      };
      document.head.appendChild(s);
    });
  }
  return ytLoading;
}

export async function createYouTubePlayer(el: HTMLElement, videoId: string, onReady: () => void): Promise<PlayerApi> {
  const YT = await loadYouTubeApi();
  let state = -1;
  const p = new YT.Player(el, {
    videoId,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, cc_load_policy: 0, iv_load_policy: 3, fs: 0 },
    events: { onReady, onStateChange: (e) => (state = e.data) },
  });
  return {
    time: () => (typeof p.getCurrentTime === "function" ? p.getCurrentTime() : 0),
    seek: (t) => p.seekTo(Math.max(0, t), true),
    play: () => p.playVideo(),
    pause: () => p.pauseVideo(),
    paused: () => state !== 1 && state !== 3,
    setRate: (r) => p.setPlaybackRate(r),
    destroy: () => p.destroy(),
  };
}

export function videoElementPlayer(v: HTMLVideoElement): PlayerApi {
  return {
    time: () => v.currentTime,
    seek: (t) => (v.currentTime = Math.max(0, t)),
    play: () => void v.play().catch(() => {}),
    pause: () => v.pause(),
    paused: () => v.paused,
    setRate: (r) => (v.playbackRate = r),
    destroy: () => {},
  };
}

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12) || null;
    const v = u.searchParams.get("v");
    if (v) return v.slice(0, 11);
    const m = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
