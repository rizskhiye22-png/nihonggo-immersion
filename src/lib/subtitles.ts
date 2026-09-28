// Parser subtitle: SRT, WebVTT, dan ASS/SSA (format umum untuk anime).

export type Cue = { i: number; start: number; end: number; text: string };

const time = (s: string) => {
  // 00:01:02,345 | 00:01:02.345 | 01:02.345 | 0:01:02.34 (ASS)
  const m = s.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/);
  if (!m) return NaN;
  const [, h = "0", mi, se, frac = "0"] = m;
  return Number(h) * 3600 + Number(mi) * 60 + Number(se) + Number(frac.padEnd(3, "0")) / 1000;
};

const clean = (t: string) =>
  t
    .replace(/<[^>]+>/g, "") // tag HTML/VTT
    .replace(/\{[^}]*\}/g, "") // tag gaya ASS
    .replace(/\\N|\\n/g, "\n")
    .replace(/\\h/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

function parseSrtVtt(text: string): Cue[] {
  const blocks = text.replace(/\r/g, "").replace(/^﻿/, "").split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const ti = lines.findIndex((l) => l.includes("-->"));
    if (ti < 0) continue;
    const [a, b] = lines[ti].split("-->");
    const start = time(a);
    const end = time(b.trim().split(/\s+/)[0]);
    const body = clean(lines.slice(ti + 1).join("\n"));
    if (!Number.isNaN(start) && !Number.isNaN(end) && body) cues.push({ i: 0, start, end, text: body });
  }
  return cues;
}

function parseAss(text: string): Cue[] {
  const lines = text.replace(/\r/g, "").split("\n");
  let format: string[] = [];
  let inEvents = false;
  const cues: Cue[] = [];
  for (const line of lines) {
    if (/^\[events\]/i.test(line)) {
      inEvents = true;
      continue;
    }
    if (/^\[/.test(line)) inEvents = false;
    if (!inEvents) continue;
    if (/^format:/i.test(line)) format = line.slice(7).split(",").map((s) => s.trim().toLowerCase());
    else if (/^dialogue:/i.test(line) && format.length) {
      const parts = line.slice(9).split(",");
      const fields = parts.slice(0, format.length - 1);
      fields.push(parts.slice(format.length - 1).join(","));
      const get = (k: string) => fields[format.indexOf(k)] ?? "";
      // Lewati baris tanda/efek (biasanya bukan dialog)
      const style = get("style").toLowerCase();
      if (/sign|song|op|ed|kara|title/.test(style) && !/main|default|dialog/.test(style)) continue;
      const body = clean(get("text"));
      if (body) cues.push({ i: 0, start: time(get("start")), end: time(get("end")), text: body });
    }
  }
  return cues;
}

export function parseSubtitles(text: string, filename = ""): Cue[] {
  const isAss = /\.(ass|ssa)$/i.test(filename) || /^\s*\[script info\]/i.test(text);
  const cues = (isAss ? parseAss(text) : parseSrtVtt(text)).sort((a, b) => a.start - b.start);
  // Gabungkan baris dengan waktu identik (umum pada ASS)
  const merged: Cue[] = [];
  for (const c of cues) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.start - c.start) < 0.01 && Math.abs(last.end - c.end) < 0.01) {
      if (!last.text.includes(c.text)) last.text += "\n" + c.text;
    } else merged.push({ ...c });
  }
  merged.forEach((c, i) => (c.i = i));
  return merged;
}

/** Cari indeks cue aktif pada waktu t (pencarian biner). -1 bila tidak ada. */
export function cueAt(cues: Cue[], t: number) {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].end < t) lo = mid + 1;
    else if (cues[mid].start > t) hi = mid - 1;
    else return mid;
  }
  return -1;
}

/** Cue terakhir yang sudah dimulai sebelum t (untuk navigasi). */
export function cueBefore(cues: Cue[], t: number) {
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].start <= t) idx = i;
    else break;
  }
  return idx;
}

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
