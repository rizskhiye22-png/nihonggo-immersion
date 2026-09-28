import { lazy as reactLazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/Layout.tsx";
import { WordPopupProvider } from "./components/WordPopup.tsx";
import { Spinner, Toasts } from "./components/ui.tsx";
import { useStore } from "./lib/store.ts";

// Setelah situs di-update, file halaman lama bisa hilang dari server. Muat ulang otomatis sekali
// agar pengguna tidak perlu me-refresh manual.
function lazy<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  return reactLazy(() =>
    load().then(
      (m) => {
        sessionStorage.removeItem("themars:reloaded");
        return m;
      },
      (err) => {
        if (!sessionStorage.getItem("themars:reloaded")) {
          sessionStorage.setItem("themars:reloaded", "1");
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        throw err;
      },
    ),
  );
}

const Landing = lazy(() => import("./pages/Landing.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Method = lazy(() => import("./pages/Method.tsx"));
const Studio = lazy(() => import("./pages/Studio.tsx"));
const Watch = lazy(() => import("./pages/Watch.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const Reader = lazy(() => import("./pages/Reader.tsx"));
const FreeReader = lazy(() => import("./pages/FreeReader.tsx"));
const Review = lazy(() => import("./pages/Review.tsx"));
const Translator = lazy(() => import("./pages/Translator.tsx"));
const Collection = lazy(() => import("./pages/Collection.tsx"));
const Log = lazy(() => import("./pages/Log.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));

function Loading() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
      <Spinner />
    </div>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Guard({ children }: { children: ReactNode }) {
  const onboarded = useStore((s) => s.profile.onboarded);
  return onboarded ? <>{children}</> : <Navigate to="/mulai" replace />;
}

export function App() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <ScrollTop />
      <WordPopupProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/mulai" element={<Onboarding />} />
            <Route element={<Guard><AppLayout /></Guard>}>
              <Route path="/beranda" element={<Dashboard />} />
              <Route path="/metode" element={<Method />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/tonton" element={<Watch />} />
              <Route path="/baca" element={<Library />} />
              <Route path="/baca/:id" element={<Reader />} />
              <Route path="/pembaca" element={<FreeReader />} />
              <Route path="/review" element={<Review />} />
              <Route path="/terjemah" element={<Translator />} />
              <Route path="/koleksi" element={<Collection />} />
              <Route path="/log" element={<Log />} />
              <Route path="/pengaturan" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </WordPopupProvider>
      <Toasts />
    </BrowserRouter>
  );
}
