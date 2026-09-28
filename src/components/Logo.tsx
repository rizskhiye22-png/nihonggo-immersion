/** Logo THE MARS: planet Mars dengan orbit emas dan aksen kana. */
export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="lm-planet" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffc08a" />
          <stop offset="35%" stopColor="#ff6a3d" />
          <stop offset="75%" stopColor="#b8290f" />
          <stop offset="100%" stopColor="#3d0b04" />
        </radialGradient>
        <linearGradient id="lm-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f5d9a0" stopOpacity="0" />
          <stop offset="50%" stopColor="#f5d9a0" />
          <stop offset="100%" stopColor="#e0ae5c" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="19" fill="url(#lm-planet)" />
      <ellipse cx="38" cy="27" rx="6" ry="2.2" fill="#5a1407" opacity="0.35" />
      <ellipse cx="27" cy="38" rx="4.5" ry="1.8" fill="#5a1407" opacity="0.3" />
      <ellipse cx="32" cy="33" rx="29" ry="8.5" fill="none" stroke="url(#lm-ring)" strokeWidth="2" transform="rotate(-18 32 33)" />
      <circle cx="56" cy="22" r="2.2" fill="#f5d9a0" />
    </svg>
  );
}

export function Logo({ sub = "NIHONGO IMMERSION" }: { sub?: string }) {
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
