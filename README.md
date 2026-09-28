# THE MARS: Imersi Bahasa Jepang (JLPT N5–N1)

Platform web untuk belajar bahasa Jepang dengan **metode imersi**, khusus untuk pelajar Indonesia.
Pengguna belajar langsung dari anime, film, video YouTube, dan bacaan asli. Setiap kata bisa diklik untuk melihat artinya,
ditambang ke flashcard, lalu diulang dengan algoritma **FSRS**.

## Fitur

| Fitur | Keterangan |
|---|---|
| **Studio Tonton** | Putar YouTube atau file video/audio milik pengguna + subtitle Jepang (.srt/.vtt/.ass). Subtitle interaktif dengan furigana, klik kata untuk arti, jeda otomatis per baris, ulangi baris, mode dengar (subtitle samar), subtitle terjemahan kedua, terjemahan AI, analisis kalimat AI, layar penuh, dan pintasan keyboard. Kata yang ditambang menyimpan kalimat, waktu adegan, dan tangkapan layar (untuk file lokal). Waktu menonton tercatat otomatis. |
| **Perpustakaan** | 10 cerita bertingkat karya asli (N5–N1), furigana adaptif, audio TTS per kalimat/putar semua, terjemahan Indonesia (samar/tampil), kosakata kunci, dan meter pemahaman. |
| **Pembaca Bebas** | Tempel teks Jepang apa pun (NHK, lirik, subtitle), lalu tokenisasi dan kamus berjalan langsung di browser. Ada juga generator cerita AI sesuai level. |
| **Review (FSRS)** | Flashcard kalimat dengan gambar adegan, pratinjau interval, dan pintasan 1–4. |
| **Kosakata JLPT** | ±9.000 kata N5–N1 dengan status dikuasai/dipelajari/baru, serta tombol kirim 10/25 kata baru ke review. |
| **Kanji** | ±2.000 kanji per level dengan animasi urutan goresan (KanjiVG), on/kun, dan contoh kosakata. |
| **Tata Bahasa** | 40 pola JLPT N5–N1 dengan penjelasan Bahasa Indonesia dan contoh interaktif. |
| **Kuis JLPT** | Baca kanji, arti kata, dan isian pola tata bahasa. Skor terbaik disimpan per level. |
| **Sensei AI** | Mode ngobrol (dengan koreksi), koreksi tulisan, tanya jawab, dan simulasi soal JLPT. |
| **Rekomendasi Tontonan** | Anime, drama, film, podcast, buku, dan game per level, dengan cara imersi dan timer. |
| **Dashboard & Log** | Rencana harian per level, hitung mundur ujian, streak, heatmap, jam imersi, dan cakupan kosakata. |
| **Metode & Roadmap** | Metode THE MARS, tangga subtitle, target jam, dan struktur ujian per level. |

Progres pengguna tersimpan di browser (localStorage + IndexedDB). Pengguna bisa mencadangkan dan memulihkan data dari halaman Pengaturan,
dan kartu bisa diekspor ke CSV untuk Anki.

## Teknologi

- **Frontend:** React 19 + Vite + TypeScript, dengan CSS kustom (tanpa framework UI).
- **Backend AI:** Cloudflare Pages Functions (`functions/api/ai/[action].ts`) + Claude API (`@anthropic-ai/sdk`).
- **Bahasa Jepang:** kuromoji.js (tokenisasi), JMdict/KANJIDIC2/KanjiVG (kamus, lewat paket `kotobako-data`), dan ts-fsrs.

## Menjalankan secara lokal

```bash
npm install
npm run dev            # membangun data lalu menjalankan Vite di http://localhost:5173
```

Untuk mencoba fitur AI secara lokal:

```bash
cp .dev.vars.example .dev.vars   # isi ANTHROPIC_API_KEY
npm run build
npm run preview                  # wrangler pages dev di http://localhost:8788
```

`npm run build` menjalankan `scripts/build-data.ts` terlebih dahulu. Skrip ini menghasilkan `public/data` (kamus terbagi, daftar JLPT,
kanji, cerita dan tata bahasa yang sudah ditokenisasi), `public/dict/kuromoji`, dan `public/vendor/kuromoji.js`. Folder hasil
ini tidak di-commit. Butuh **Node.js 22.18+**.

## Deploy ke Cloudflare Pages (dengan domain sendiri)

1. Buka Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, lalu pilih repo ini.
2. Isi pengaturan build:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
3. Tambahkan variabel di **Settings → Variables and Secrets** (tipe *Secret*):
   - `ANTHROPIC_API_KEY`: kunci API dari console.anthropic.com
   - (opsional) `AI_MODEL`: default `claude-opus-5`
   - (opsional) `AI_DAILY_LIMIT`: batas permintaan AI per IP per hari (default 60, butuh KV di langkah 5)
4. **Custom domains** → **Set up a custom domain** → masukkan domainmu (mis. `themars.id` atau `belajar.themars.id`).
   Karena domain sudah ada di Cloudflare, DNS akan diatur otomatis.
5. (Disarankan) Batasi biaya AI:
   - Buat KV namespace (`npx wrangler kv namespace create RATE_LIMIT`), lalu bind sebagai `RATE_LIMIT` di
     **Settings → Bindings**.
   - Opsional: tambahkan *Rate limiting rule* Cloudflare untuk path `/api/ai/*`.

Setiap push ke branch produksi akan otomatis di-deploy ulang.

## Mengganti tema / branding

Semua warna, font, radius, dan bayangan ada di **`src/styles/tokens.css`** sebagai variabel CSS (mode gelap & terang).
Untuk memakai tema CSS sendiri, ganti nilai variabel di file itu. Komponen tidak perlu diubah. Logo ada di
`src/components/Logo.tsx` dan `public/favicon.svg`.

## Menambah konten

- **Cerita:** tambahkan objek baru di `content/stories.ts` (kalimat Jepang + terjemahan Indonesia + kosakata kunci).
  Tokenisasi dan furigana dibuat otomatis saat build.
- **Tata bahasa:** `content/grammar.ts`. Tandai bagian pola pada contoh dengan `[[...]]` agar muncul di kuis isian.
- **Rekomendasi media:** `content/media.ts`.

## Struktur

```
content/            konten asli (cerita, tata bahasa, rekomendasi media)
scripts/            build-data.ts: pembuat data statis
functions/          Cloudflare Pages Functions (endpoint AI)
src/lib/            logika: tokenizer, kamus, FSRS, subtitle, pemutar, store
src/components/     komponen UI (teks Jepang interaktif, popup kamus, layout, dll.)
src/pages/          halaman aplikasi
src/styles/         token desain + gaya komponen
```

## Lisensi data

- JMdict, KANJIDIC2 © Electronic Dictionary Research and Development Group, lisensi **CC BY-SA 4.0**.
- KanjiVG © Ulrich Apel, lisensi **CC BY-SA 3.0**.
- Level JLPT: perkiraan komunitas (open-anki-jlpt-decks, JLPT 10k). JLPT tidak menerbitkan daftar resmi.
- kuromoji.js: Apache-2.0.
- Cerita, penjelasan tata bahasa, dan teks antarmuka: karya asli THE MARS.

Studio Tonton memproses video dan subtitle di browser pengguna tanpa mengunggahnya ke server. Pengguna bertanggung jawab
memakai konten dari sumber yang legal.
