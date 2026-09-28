import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpenText, Bot, Brain, Clapperboard, Compass, Flame, GraduationCap, House, Layers, LibraryBig, Menu, Moon,
  NotebookPen, Orbit, ScanText, Settings, Sun, Target, Tv, Type,
} from "lucide-react";
import { Logo } from "./Logo.tsx";
import { TimerPill } from "./ImmersionTimer.tsx";
import { LevelBadge } from "./ui.tsx";
import { setState, streak, useStore } from "../lib/store.ts";
import { countDue } from "../lib/srs.ts";

type Item = { to: string; label: string; icon: ReactNode; count?: number };

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const profile = useStore((s) => s.profile);
  const cards = useStore((s) => s.cards);
  const newPerDay = useStore((s) => s.settings.newPerDay);
  const theme = useStore((s) => s.settings.theme);
  const log = useStore((s) => s.log);
  const reviews = useStore((s) => s.reviews);
  const due = useMemo(() => countDue(cards, newPerDay).total, [cards, newPerDay]);
  const days = useMemo(() => streak(log, reviews), [log, reviews]);

  useEffect(() => setOpen(false), [loc.pathname]);

  const groups: { label: string; items: Item[] }[] = [
    {
      label: "Utama",
      items: [
        { to: "/beranda", label: "Beranda", icon: <House /> },
        { to: "/review", label: "Review", icon: <Brain />, count: due },
        { to: "/metode", label: "Metode & Roadmap", icon: <Compass /> },
      ],
    },
    {
      label: "Imersi",
      items: [
        { to: "/studio", label: "Studio Tonton", icon: <Clapperboard /> },
        { to: "/tonton", label: "Rekomendasi Tontonan", icon: <Tv /> },
        { to: "/baca", label: "Perpustakaan", icon: <LibraryBig /> },
        { to: "/pembaca", label: "Pembaca Bebas", icon: <ScanText /> },
      ],
    },
    {
      label: "Persiapan JLPT",
      items: [
        { to: "/kosakata", label: "Kosakata", icon: <Layers /> },
        { to: "/kanji", label: "Kanji", icon: <Type /> },
        { to: "/tata-bahasa", label: "Tata Bahasa", icon: <BookOpenText /> },
        { to: "/kuis", label: "Kuis JLPT", icon: <Target /> },
      ],
    },
    {
      label: "Asisten & Progres",
      items: [
        { to: "/sensei", label: "Sensei AI", icon: <Bot /> },
        { to: "/koleksi", label: "Koleksi Kartu", icon: <GraduationCap /> },
        { to: "/log", label: "Log Imersi", icon: <NotebookPen /> },
      ],
    },
  ];

  return (
    <div className="app">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <NavLink to="/" className="brand">
          <Logo />
        </NavLink>
        {groups.map((g) => (
          <nav key={g.label} aria-label={g.label}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                {it.icon}
                {it.label}
                {!!it.count && <span className="nav-count">{it.count}</span>}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="sidebar-foot">
          <NavLink to="/pengaturan" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <Settings /> Pengaturan
          </NavLink>
          <div className="card" style={{ padding: 14, marginTop: 12, background: "var(--surface)" }}>
            <div className="row">
              <Orbit style={{ width: 18, color: "var(--gold)" }} />
              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Target</span>
              <span className="grow" />
              <LevelBadge level={profile.level} />
            </div>
            <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
              {profile.name ? `${profile.name} · ` : ""}{profile.goalMin} menit/hari
            </div>
          </div>
        </div>
      </aside>
      {open && <div className="backdrop" style={{ zIndex: 55, background: "rgba(0,0,0,.5)" }} onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="btn icon ghost menu-btn" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu />
          </button>
          <div className="spacer" />
          <span className="badge mars" title="Hari berturut-turut">
            <Flame style={{ width: 14 }} /> {days} hari
          </span>
          <TimerPill />
          <button
            className="btn icon ghost"
            aria-label="Ganti tema"
            onClick={() => setState((s) => ({ ...s, settings: { ...s.settings, theme: theme === "dark" ? "light" : "dark" } }))}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </header>
        <Outlet />
      </div>

      <nav className="mobile-nav" aria-label="Navigasi cepat">
        {[
          { to: "/beranda", label: "Beranda", icon: <House /> },
          { to: "/studio", label: "Studio", icon: <Clapperboard /> },
          { to: "/review", label: `Review${due ? ` (${due})` : ""}`, icon: <Brain /> },
          { to: "/baca", label: "Baca", icon: <LibraryBig /> },
          { to: "/sensei", label: "Sensei", icon: <Bot /> },
        ].map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {it.icon}
            {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
