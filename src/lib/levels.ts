// Level kemampuan (setara N5–N1) dan peta jalan metode imersi THE MARS.
import type { Level } from "./types.ts";

export type LevelInfo = {
  level: Level;
  name: string;
  phase: string;
  tagline: string;
  can: string;
  hours: [number, number]; // perkiraan kumulatif jam belajar (tanpa latar kanji)
  kanji: string;
  vocab: string;
  daily: { label: string; min: number; to: string }[];
  focus: string[];
};

export const LEVEL_INFO: Record<Level, LevelInfo> = {
  5: {
    level: 5, name: "N5", phase: "Fase 1 · Pendaratan", tagline: "Membangun fondasi: kana, kata inti, dan telinga.",
    can: "Memahami kalimat sederhana yang diucapkan pelan tentang topik sehari-hari.",
    hours: [250, 450], kanji: "±100", vocab: "±800",
    daily: [
      { label: "Review kartu tambangan", min: 10, to: "/review" },
      { label: "Tonton video untuk pemula", min: 20, to: "/tonton" },
      { label: "Dengar podcast pemula", min: 10, to: "/tonton" },
    ],
    focus: ["Dengarkan bahasa Jepang setiap hari, walau belum paham semua", "Tonton video dengan gambar yang membantu menebak arti", "Tambang 5–10 kata dari tontonan per hari"],
  },
  4: {
    level: 4, name: "N4", phase: "Fase 1 · Pendaratan", tagline: "Mulai memahami percakapan harian yang lambat.",
    can: "Memahami percakapan sehari-hari yang diucapkan agak lambat.",
    hours: [450, 750], kanji: "±300", vocab: "±1.500",
    daily: [
      { label: "Review kartu tambangan", min: 15, to: "/review" },
      { label: "Anime slice-of-life di Studio Tonton", min: 25, to: "/studio" },
      { label: "Podcast / cerita bersuara", min: 15, to: "/baca" },
    ],
    focus: ["Nyalakan subtitle Jepang + arti kata otomatis di Studio", "Tirukan (shadowing) 5 kalimat favorit per hari", "Ulangi episode yang sama sampai terasa mudah"],
  },
  3: {
    level: 3, name: "N3", phase: "Fase 2 · Eksplorasi", tagline: "Jembatan menuju konten asli.",
    can: "Memahami bahasa sehari-hari dengan kecepatan hampir natural, dan membaca artikel sederhana.",
    hours: [750, 1150], kanji: "±650", vocab: "±3.700",
    daily: [
      { label: "Review kartu tambangan", min: 15, to: "/review" },
      { label: "Anime/drama dengan subtitle Jepang", min: 40, to: "/studio" },
      { label: "Podcast bahasa Jepang", min: 20, to: "/tonton" },
    ],
    focus: ["Ganti subtitle Indonesia → subtitle Jepang", "Tambang 10–15 kalimat per hari dari tontonan", "Latihan output: ucapkan kalimat di Penerjemah & lihat skornya"],
  },
  2: {
    level: 2, name: "N2", phase: "Fase 3 · Kolonisasi", tagline: "Hidup di dalam konten asli.",
    can: "Memahami berita, artikel, dan percakapan natural tentang beragam topik.",
    hours: [1150, 1800], kanji: "±1.000", vocab: "±6.000",
    daily: [
      { label: "Review kartu tambangan", min: 15, to: "/review" },
      { label: "Drama/film, subtitle disamarkan", min: 60, to: "/studio" },
      { label: "Podcast & berita", min: 30, to: "/tonton" },
    ],
    focus: ["Samarkan subtitle, intip hanya saat perlu", "Perbanyak podcast sambil beraktivitas", "Output: ceritakan ulang isi episode dengan suaramu"],
  },
  1: {
    level: 1, name: "N1", phase: "Fase 4 · Terraform", tagline: "Menguasai bahasa tingkat lanjut dan abstrak.",
    can: "Memahami tulisan logis/abstrak dan wacana natural dalam berbagai situasi.",
    hours: [1800, 3100], kanji: "±2.000", vocab: "±10.000",
    daily: [
      { label: "Review kartu tambangan", min: 15, to: "/review" },
      { label: "Film/dokumenter tanpa subtitle", min: 60, to: "/studio" },
      { label: "Podcast diskusi / radio", min: 45, to: "/tonton" },
    ],
    focus: ["Konten asli tanpa subtitle: film, dokumenter, radio", "Tambang hanya ungkapan yang terus muncul", "Output: bicara & menulis bebas tentang topik yang kamu tonton"],
  },
};

export const METHOD_STEPS = [
  { n: "01", title: "Tonton & dengar yang kamu suka", text: "Bahasa diperoleh lewat input yang bisa dipahami. Pilih anime, film, atau podcast yang sedikit di atas kemampuanmu, lalu nikmati setiap hari." },
  { n: "02", title: "Subtitle Jepang + arti otomatis", text: "Nyalakan subtitle Jepang (dari file atau dari suara) dan biarkan THE MARS menampilkan arti Indonesia setiap kata. Tidak perlu membuka kamus." },
  { n: "03", title: "Tambang kalimat", text: "Simpan kata baru bersama kalimat dan adegan aslinya. Konteks dari tontonan membuat ingatan jauh lebih kuat daripada hafalan daftar." },
  { n: "04", title: "Ulangi sebentar", text: "Review 10–15 menit per hari. Algoritma pengulangan berjarak menjadwalkan kata tepat sebelum kamu lupa." },
  { n: "05", title: "Tirukan & bicara", text: "Output: tirukan kalimat favorit (shadowing), ucapkan di Penerjemah, dan lihat skor pengucapanmu. Input yang banyak akan keluar menjadi kemampuan bicara." },
];

export const levelLabel = (l: Level) => `N${l}`;
