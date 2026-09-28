import { Fragment, type ReactNode } from "react";

/** Render Markdown ringan dari jawaban AI (judul, tebal, daftar) tanpa HTML mentah. */
export function AiText({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`ul${out.length}`} style={{ margin: "4px 0 10px", paddingLeft: 20 }}>{list}</ul>);
    list = [];
  };
  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(<li key={i}>{inline(bullet[1])}</li>);
      return;
    }
    flush();
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) out.push(<div key={i} style={{ fontWeight: 750, color: "var(--text)", marginTop: 10 }}>{inline(h[1])}</div>);
    else if (line.trim() === "") out.push(<div key={i} style={{ height: 8 }} />);
    else out.push(<div key={i}>{inline(line)}</div>);
  });
  flush();
  return <div className={`ai-out${streaming ? " typing" : ""}`}>{out}</div>;
}

function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="jp" style={{ color: "var(--mars-3)" }}>{p.slice(1, -1)}</code>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
