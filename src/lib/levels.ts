// Informasi level JLPT dan peta jalan metode imersi THE MARS.
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
      { label: "Review flashcard", min: 15, to: "/review" },
      { label: "Tonton input mudah (Comprehensible Japanese)", min: 20, to: "/tonton" },
      { label: "Baca cerita bertingkat N5", min: 10, to: "/baca" },
    ],
    focus: ["Hafalkan hiragana & katakana sampai lancar", "Tambah 10–15 kata inti per hari", "Dengarkan bahasa Jepang setiap hari, walau belum paham semua"],
  },
  4: {
    level: 4, name: "N4", phase: "Fase 1 · Pendaratan", tagline: "Mulai memahami percakapan harian yang lambat.",
    can: "Memahami percakapan sehari-hari yang diucapkan agak lambat.",
    hours: [450, 750], kanji: "±300", vocab: "±1.500",
    daily: [
      { label: "Review flashcard", min: 20, to: "/review" },
      { label: "Anime slice-of-life di Studio Tonton", min: 25, to: "/studio" },
      { label: "Baca cerita/berita mudah", min: 15, to: "/baca" },
    ],
    focus: ["Kuasai bentuk て, た, ない, dan potensial", "Mulai sentence mining 5–10 kalimat/hari", "Shadowing 5 menit per hari"],
  },
  3: {
    level: 3, name: "N3", phase: "Fase 2 · Eksplorasi", tagline: "Jembatan menuju konten asli.",
    can: "Memahami bahasa sehari-hari dengan kecepatan hampir natural, dan membaca artikel sederhana.",
    hours: [750, 1150], kanji: "±650", vocab: "±3.700",
    daily: [
      { label: "Review flashcard", min: 25, to: "/review" },
      { label: "Anime/drama dengan subtitle Jepang", min: 40, to: "/studio" },
      { label: "Berita mudah / cerita N3", min: 20, to: "/pembaca" },
    ],
    focus: ["Ganti subtitle Indonesia → subtitle Jepang", "Mining 10–15 kalimat/hari dari tontonan", "Latihan pola tata bahasa N3 lewat kuis"],
  },
  2: {
    level: 2, name: "N2", phase: "Fase 3 · Kolonisasi", tagline: "Hidup di dalam konten asli.",
    can: "Memahami berita, artikel, dan percakapan natural tentang beragam topik.",
    hours: [1150, 1800], kanji: "±1.000", vocab: "±6.000",
    daily: [
      { label: "Review flashcard", min: 25, to: "/review" },
      { label: "Drama/podcast tanpa subtitle", min: 60, to: "/tonton" },
      { label: "Artikel berita / novel", min: 30, to: "/pembaca" },
    ],
    focus: ["Kurangi subtitle, perbanyak mendengar murni", "Baca berita NHK setiap hari", "Output: tulis ringkasan dan koreksi dengan Sensei AI"],
  },
  1: {
    level: 1, name: "N1", phase: "Fase 4 · Terraform", tagline: "Menguasai bahasa tingkat lanjut dan abstrak.",
    can: "Memahami tulisan logis/abstrak dan wacana natural dalam berbagai situasi.",
    hours: [1800, 3100], kanji: "±2.000", vocab: "±10.000",
    daily: [
      { label: "Review flashcard", min: 25, to: "/review" },
      { label: "Dokumenter/drama cepat tanpa subtitle", min: 60, to: "/tonton" },
      { label: "Esai, editorial, sastra", min: 45, to: "/pembaca" },
    ],
    focus: ["Konten akademis, editorial, dan sastra", "Latihan soal waktu nyata (dokkai 70 menit)", "Diskusi topik abstrak dengan Sensei AI"],
  },
};

export const METHOD_STEPS = [
  { n: "01", title: "Input yang bisa dipahami", text: "Otak memperoleh bahasa lewat input yang sedikit di atas levelmu (i+1). Tonton dan baca konten yang 80–95% sudah bisa kamu pahami." },
  { n: "02", title: "Tambang kalimat", text: "Saat menemukan kata baru di konteks yang menarik, klik lalu simpan bersama kalimat aslinya. Konteks membuat ingatan jauh lebih kuat." },
  { n: "03", title: "Ulangi dengan FSRS", text: "Algoritma pengulangan berjarak menjadwalkan review tepat sebelum kamu lupa. Cukup 15–25 menit per hari." },
  { n: "04", title: "Volume & konsistensi", text: "Catat jam imersi. Kemampuan tumbuh dari ratusan jam input, bukan dari hafalan singkat. Streak kecil setiap hari mengalahkan maraton sesekali." },
  { n: "05", title: "Uji dengan JLPT", text: "Pola tata bahasa, kuis, dan simulasi soal memastikan input yang kamu serap siap dipakai di hari ujian." },
];

export const levelLabel = (l: Level) => `N${l}`;
