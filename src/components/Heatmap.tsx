import { useMemo } from "react";
import { today } from "../lib/store.ts";

/** Heatmap aktivitas harian (menit imersi) ala GitHub. */
export function Heatmap({ minutes, weeks = 20, goal = 45 }: { minutes: Map<string, number>; weeks?: number; goal?: number }) {
  const cells = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
    const out: { d: string; m: number }[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = today(d);
      out.push({ d: key, m: minutes.get(key) ?? 0 });
    }
    return out;
  }, [minutes, weeks]);
  const t = today();
  const level = (m: number) => (m <= 0 ? 0 : m < goal * 0.34 ? 1 : m < goal * 0.67 ? 2 : m < goal ? 3 : 4);
  return (
    <div>
      <div className="heatmap">
        {cells.map((c) => (
          <i key={c.d} data-l={level(c.m)} className={c.d === t ? "today" : undefined} title={`${c.d}: ${Math.round(c.m)} menit`} />
        ))}
      </div>
      <div className="row" style={{ gap: 6, marginTop: 10, fontSize: "0.72rem", justifyContent: "flex-end" }}>
        <span className="muted">Sedikit</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} data-l={l} style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block" }} className="hm-legend" />
        ))}
        <span className="muted">Target tercapai</span>
      </div>
    </div>
  );
}
