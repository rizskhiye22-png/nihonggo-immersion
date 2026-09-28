import { useId } from "react";
import { GO_STROKES } from "./logoPaths.ts";

/**
 * Logo THE MARS: kanji 語 ("bahasa", dari 日本語) bergaya goresan kuas putih
 * di atas kotak membulat bergradien biru.
 */
export function LogoMark({ size = 38, animate = false }: { size?: number; animate?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={animate ? "logo-draw" : undefined}>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id={`hl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#lg-${id})`} />
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#hl-${id})`} />
      <g
        transform="translate(6.5 6.5) scale(0.468)"
        fill="none"
        stroke="#fff"
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GO_STROKES.map((d, i) => (
          <path key={i} d={d} pathLength={1} style={animate ? { animationDelay: `${0.25 + i * 0.12}s` } : undefined} />
        ))}
      </g>
    </svg>
  );
}

export function Logo({ sub = "日本語 · NIHONGO" }: { sub?: string }) {
  return (
    <span className="row" style={{ gap: 12 }}>
      <LogoMark />
      <span>
        <span className="brand-name">THE MARS</span>
        <span className="brand-sub">{sub}</span>
      </span>
    </span>
  );
}
