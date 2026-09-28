// Mengecek apakah fitur AI (opsional, butuh ANTHROPIC_API_KEY di server) aktif.
// Tanpa API key semua fitur inti tetap berjalan gratis; tombol AI disembunyikan.
import { useEffect, useState } from "react";

let status: Promise<boolean> | null = null;

export function aiEnabled() {
  if (!status) {
    status = fetch("/api/ai/status")
      .then((r) => (r.ok ? (r.json() as Promise<{ enabled?: boolean }>) : { enabled: false }))
      .then((j) => !!j.enabled)
      .catch(() => false);
  }
  return status;
}

export function useAiEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    void aiEnabled().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
