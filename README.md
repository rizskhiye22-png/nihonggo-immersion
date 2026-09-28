# THE MARS: Belajar Bahasa Jepang dengan Imersi

Platform web untuk belajar bahasa Jepang lewat **imersi**: menonton anime, film, dan video, serta mendengar podcast,
khusus untuk pengguna Indonesia. Cocok untuk yang tidak suka banyak membaca: subtitle Jepang, arti Indonesia setiap kata,
dan terjemahan kalimat muncul langsung saat menonton.

Semua berjalan di browser pengguna: **gratis, tanpa akun, tanpa server backend, dan tanpa API key**.

## Fitur

| Fitur | Keterangan |
|---|---|
| **Studio Tonton** | Putar YouTube atau file video/audio. Subtitle Jepang dari file (.srt/.vtt/.ass) atau **otomatis dari suara** memakai pengenal suara bawaan browser (audio tab YouTube, audio video lokal, atau mikrofon). Setiap baris menampilkan **daftar kata + cara baca + arti Bahasa Indonesia** dan terjemahan kalimat. Ada juga jeda per baris, mode dengar, tambang kata dengan tangkapan layar, dan ekspor .srt. |
| **Penerjemah JP ⇄ ID** | Terjemahan lokal dua arah, input suara, rincian kata, audio normal/pelan, dan **latihan ucap dengan skor** (output). |
| **Anime, Film & Podcast** | Rekomendasi tontonan dan podcast per tahap, dengan cara imersi dan timer. |
| **Cerita Bersuara** | 15 cerita asli dengan audio TTS, furigana adaptif, dan terjemahan Indonesia per kalimat. |
| **Pembaca Bebas** | Tempel teks Jepang apa pun (lirik, transkrip, subtitle). Setiap kata bisa diklik. |
| **Review (FSRS)** | Ulangi kata tambangan dari tontonan beserta kalimat dan adegannya. |
| **Dashboard & Log** | Rencana harian per tahap, menit imersi mingguan, streak, heatmap, dan jam imersi. |

Pencarian kata ala Yomitan: klik kata, atau tahan **Shift** lalu arahkan kursor.

## Teknologi

- React + Vite + TypeScript, dengan CSS kustom (tema biru–putih di `src/styles/tokens.css`).
- **Kamus:** JMdict (lewat paket `kotobako-data`), dibagi menjadi 256 berkas kecil yang dimuat sesuai kebutuhan.
- **Tokenizer:** kuromoji di Web Worker (`public/workers/kuromoji-worker.js`) agar halaman tidak macet.
- **Terjemahan:** Translator API bawaan Chrome/Edge (berjalan di perangkat). Di browser lain, arti kata tampil dalam bahasa Inggris.
- **Suara → teks:** Web Speech API bawaan browser (`ja-JP`). Tidak ada model yang diunduh.
- **Suara Jepang (TTS):** Web Speech Synthesis bawaan browser.
- Situs sepenuhnya statis. Tidak ada Functions, database, atau API key.

## Menjalankan secara lokal

```bash
npm install
npm run dev            # membangun data lalu menjalankan Vite di http://localhost:5173
```

`npm run build` menjalankan `scripts/build-data.ts` terlebih dahulu. Skrip ini menghasilkan `public/data` (kamus terbagi dan cerita
yang sudah ditokenisasi), `public/dict/kuromoji`, dan `public/vendor/kuromoji.js`. Folder hasil
ini tidak di-commit. Butuh **Node.js 22**.

## Deploy ke Cloudflare Pages (dengan domain sendiri)

1. Buka Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, lalu pilih repo ini.
2. Isi pengaturan build:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
3. Tidak perlu variabel rahasia apa pun.
4. **Custom domains** → **Set up a custom domain** → masukkan domainmu (mis. `themars.id` atau `belajar.themars.id`).
   Karena domain sudah ada di Cloudflare, DNS akan diatur otomatis.
Setiap push ke branch produksi akan otomatis di-deploy ulang.

## Mengganti tema / branding

Semua warna, font, radius, dan bayangan ada di **`src/styles/tokens.css`** sebagai variabel CSS (mode gelap & terang).
Untuk memakai tema CSS sendiri, ganti nilai variabel di file itu. Komponen tidak perlu diubah. Logo ada di
`src/components/Logo.tsx` dan `public/favicon.svg`.

## Menambah konten

- **Cerita:** tambahkan objek baru di `content/stories.ts` (kalimat Jepang + terjemahan Indonesia + kosakata kunci).
  Tokenisasi dan furigana dibuat otomatis saat build.
- **Rekomendasi media:** `content/media.ts`.

## Struktur

```
content/            konten asli (cerita, rekomendasi media)
scripts/            build-data.ts: pembuat data statis
src/lib/            logika: tokenizer, kamus, FSRS, subtitle, pemutar, store
src/components/     komponen UI (teks Jepang interaktif, popup kamus, layout, dll.)
src/pages/          halaman aplikasi
src/styles/         token desain + gaya komponen
```

## Lisensi data

- JMdict © Electronic Dictionary Research and Development Group, lisensi **CC BY-SA 4.0**.
- KanjiVG © Ulrich Apel, lisensi **CC BY-SA 3.0** (bentuk kanji 語 pada logo).
- Label tingkat kata (N5–N1): perkiraan komunitas (open-anki-jlpt-decks, JLPT 10k).
- kuromoji.js: Apache-2.0.
- Cerita dan teks antarmuka: karya asli THE MARS.

Studio Tonton memproses video dan subtitle di browser pengguna tanpa mengunggahnya ke server. Pengguna bertanggung jawab
memakai konten dari sumber yang legal.
