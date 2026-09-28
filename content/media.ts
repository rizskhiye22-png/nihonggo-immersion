// Rekomendasi media imersi per level. Tautan mengarah ke halaman pencarian/situs resmi
// agar pengguna menonton lewat sumber legal (JustWatch menampilkan layanan streaming di Indonesia).
import type { MediaItem } from "../src/lib/types.ts";

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const jw = (q: string) => `https://www.justwatch.com/id/search?q=${encodeURIComponent(q)}`;

export const media: MediaItem[] = [
  // ── Fondasi (N5–N4)
  {
    title: "Comprehensible Japanese", type: "youtube", levels: [5, 4],
    why: "Video untuk pemula yang dijelaskan sepenuhnya dalam bahasa Jepang dengan gambar dan gestur. Input yang benar-benar bisa dipahami.",
    how: "Tonton tanpa subtitle. Tebak makna dari gambar. 20–30 menit per hari, ulangi video favorit.",
    url: yt("Comprehensible Japanese"),
  },
  {
    title: "Nihongo con Teppei for Beginners", type: "podcast", levels: [5, 4],
    why: "Episode 3–5 menit dengan kosakata dasar yang diulang-ulang. Cocok untuk latihan mendengar harian.",
    how: "Dengarkan saat perjalanan atau beberes. Satu episode diputar 2–3 kali.",
    url: yt("Nihongo con Teppei for beginners"),
  },
  {
    title: "Chi's Sweet Home", titleJa: "チーズスイートホーム", type: "anime", levels: [5, 4],
    why: "Episode hanya ±3 menit dengan kalimat pendek dan situasi keluarga sehari-hari.",
    how: "Pakai Studio Tonton dengan subtitle Jepang, lalu tambang 2–3 kalimat per episode.",
    url: jw("Chi's Sweet Home"),
  },
  {
    title: "Doraemon", titleJa: "ドラえもん", type: "anime", levels: [5, 4, 3],
    why: "Bahasa anak-anak yang jelas, alur mudah ditebak, dan banyak orang Indonesia sudah tahu ceritanya.",
    how: "Karena ceritanya sudah akrab, fokuslah pada bunyi dan pola kalimat.",
    url: jw("Doraemon"),
  },
  {
    title: "Buku bacaan bertingkat Tadoku", titleJa: "にほんご多読ブックス", type: "buku", levels: [5, 4, 3],
    why: "Buku bacaan gratis per level dari NPO Tadoku. Ceritanya pendek, bergambar, dan dilengkapi audio.",
    how: "Baca cepat tanpa kamus (多読). Kalau terlalu sulit, turunkan level.",
    url: "https://tadoku.org/japanese/",
  },
  {
    title: "Pokémon (mode hiragana)", titleJa: "ポケットモンスター", type: "game", levels: [5, 4],
    why: "Game Pokémon bisa diatur ke mode kana tanpa kanji, sehingga cocok untuk melatih kecepatan membaca kana.",
    how: "Atur bahasa ke Jepang dan pilih ひらがな. Salin dialog yang menarik ke Pembaca Bebas.",
    url: yt("ポケモン ひらがな 実況"),
  },

  // ── N4–N3
  {
    title: "Shirokuma Cafe", titleJa: "しろくまカフェ", type: "anime", levels: [4, 3],
    why: "Percakapan santai di kafe dengan tempo lambat. Lelucon kata (dajare) melatih kepekaan bunyi.",
    how: "Mode intensif: jeda otomatis di tiap baris dan ulangi kalimat dengan shadowing.",
    url: jw("Shirokuma Cafe"),
  },
  {
    title: "Tetangga Kita Totoro", titleJa: "となりのトトロ", type: "film", levels: [4, 3],
    why: "Dialog keluarga yang hangat dan natural dengan kosakata rumah tangga dan alam.",
    how: "Tonton sekali untuk menikmati ceritanya, lalu ulangi per adegan di Studio Tonton.",
    url: jw("My Neighbor Totoro"),
  },
  {
    title: "NHK News Web Easy", titleJa: "NEWS WEB EASY", type: "web", levels: [4, 3],
    why: "Berita asli yang ditulis ulang dengan bahasa sederhana, lengkap dengan furigana dan audio.",
    how: "Salin artikel ke Pembaca Bebas. Satu artikel per hari = kebiasaan membaca yang kuat.",
    url: "https://www3.nhk.or.jp/news/easy/",
  },
  {
    title: "Nihongo con Teppei", type: "podcast", levels: [4, 3, 2],
    why: "Versi reguler dengan topik lebih luas dan tempo natural. Lebih dari seribu episode.",
    how: "Dengarkan 2–3 episode per hari. Catat kata yang terdengar berulang.",
    url: yt("Nihongo con Teppei"),
  },
  {
    title: "Yotsuba&!", titleJa: "よつばと！", type: "buku", levels: [4, 3],
    why: "Manga slice-of-life dengan furigana. Bahasanya bahasa percakapan asli.",
    how: "Baca 1 bab per hari. Ketik kalimat sulit ke Pembaca Bebas.",
    url: "https://www.google.com/search?q=" + encodeURIComponent("よつばと！ 1巻"),
  },
  {
    title: "Terrace House", titleJa: "テラスハウス", type: "drama", levels: [4, 3, 2],
    why: "Reality show berisi percakapan natural anak muda Jepang, tanpa naskah.",
    how: "Aktifkan subtitle Jepang. Perhatikan aizuchi (うん, そうなんだ, へえ).",
    url: jw("Terrace House"),
  },

  // ── N3–N2
  {
    title: "Barakamon", titleJa: "ばらかもん", type: "anime", levels: [3, 2],
    why: "Komedi hangat di pulau Goto yang memperkenalkan perbedaan bahasa standar dan dialek.",
    how: "Tandai kata dialek yang berbeda dari bahasa standar, lalu tanyakan ke Sensei AI.",
    url: jw("Barakamon"),
  },
  {
    title: "Kiki's Delivery Service", titleJa: "魔女の宅急便", type: "film", levels: [3],
    why: "Bahasa sopan dan santai bercampur. Bagus untuk belajar perbedaan register.",
    how: "Perhatikan kapan Kiki memakai です/ます dan kapan bicara santai.",
    url: jw("Kiki's Delivery Service"),
  },
  {
    title: "Midnight Diner", titleJa: "深夜食堂", type: "drama", levels: [3, 2],
    why: "Episode pendek (±25 menit), satu cerita per episode, dan banyak kosakata makanan serta kehidupan.",
    how: "Satu episode per hari. Tulis ringkasan 3 kalimat dan minta koreksi Sensei AI.",
    url: jw("Midnight Diner"),
  },
  {
    title: "YUYUの日本語Podcast", type: "podcast", levels: [3, 2],
    why: "Bahasa Jepang natural tentang budaya dan kehidupan. Tersedia transkrip.",
    how: "Dengar dulu tanpa transkrip, lalu baca transkripnya di Pembaca Bebas.",
    url: yt("YUYUの日本語Podcast"),
  },
  {
    title: "Your Name.", titleJa: "君の名は。", type: "film", levels: [3, 2],
    why: "Dialog anak muda modern dan dialek daerah, dengan cerita yang membuat ingin menonton ulang.",
    how: "Tonton ulang dengan subtitle Jepang. Tambang ungkapan emosional untuk flashcard.",
    url: jw("Your Name"),
  },
  {
    title: "Cerita pendek Hoshi Shin'ichi", titleJa: "星新一 ショートショート", type: "buku", levels: [3, 2],
    why: "Cerita super pendek (3–5 halaman) dengan akhir mengejutkan. Kalimatnya lugas dan sering dipakai pelajar.",
    how: "Satu cerita per sesi. Ceritakan ulang isinya ke Sensei AI.",
    url: "https://www.google.com/search?q=" + encodeURIComponent("星新一 ショートショート おすすめ"),
  },

  // ── N2–N1
  {
    title: "SHIROBAKO", type: "anime", levels: [2, 1],
    why: "Dunia kerja studio anime. Banyak kosakata bisnis, rapat, dan keigo di kantor.",
    how: "Mining kosakata kerja: 締め切り, 打ち合わせ, 確認します, dan sejenisnya.",
    url: jw("Shirobako"),
  },
  {
    title: "Unnatural", titleJa: "アンナチュラル", type: "drama", levels: [2, 1],
    why: "Drama forensik dengan dialog cepat dan kosakata medis/hukum ringan. Setiap episode padat.",
    how: "Tonton dengan subtitle Jepang, lalu ulangi adegan penting tanpa subtitle.",
    url: jw("Unnatural"),
  },
  {
    title: "Hanzawa Naoki", titleJa: "半沢直樹", type: "drama", levels: [2, 1],
    why: "Drama perbankan dengan keigo tingkat tinggi dan konfrontasi kantor yang dramatis.",
    how: "Fokus pada ungkapan formal dan sonkeigo/kenjougo.",
    url: jw("Hanzawa Naoki"),
  },
  {
    title: "COTEN RADIO", titleJa: "コテンラジオ", type: "podcast", levels: [2, 1],
    why: "Podcast sejarah populer dengan pembahasan mendalam dan bahasa percakapan orang dewasa.",
    how: "Pilih seri tokoh yang kamu minati, lalu dengarkan secara berurutan.",
    url: yt("コテンラジオ"),
  },
  {
    title: "NHK News Web", type: "web", levels: [2, 1],
    why: "Berita asli tanpa penyederhanaan. Kosakata politik, ekonomi, dan sosial persis seperti di soal dokkai.",
    how: "Baca 2 artikel per hari di Pembaca Bebas. Ringkas isinya dalam bahasa Jepang.",
    url: "https://www3.nhk.or.jp/news/",
  },
  {
    title: "Novel Higashino Keigo", titleJa: "東野圭吾", type: "buku", levels: [2, 1],
    why: "Novel misteri yang membuat penasaran. Bahasanya jelas, cocok sebagai novel penuh pertama.",
    how: "Mulai dari 容疑者Xの献身. Target 10 halaman per hari tanpa berhenti di setiap kata.",
    url: "https://www.google.com/search?q=" + encodeURIComponent("東野圭吾 おすすめ 小説"),
  },

  // ── N1
  {
    title: "Legal High", titleJa: "リーガル・ハイ", type: "drama", levels: [1],
    why: "Monolog pengacara yang sangat cepat dan penuh istilah hukum. Latihan choukai tingkat tertinggi.",
    how: "Mode intensif: jeda di tiap baris, shadowing monolog Komikado.",
    url: jw("Legal High"),
  },
  {
    title: "Hyouka", titleJa: "氷菓", type: "anime", levels: [2, 1],
    why: "Misteri klub sastra dengan kosakata literer, idiom, dan penalaran panjang.",
    how: "Tambang kata-kata sastra dan yojijukugo yang muncul di dialog.",
    url: jw("Hyouka"),
  },
  {
    title: "Professional: Shigoto no Ryūgi", titleJa: "プロフェッショナル 仕事の流儀", type: "drama", levels: [1],
    why: "Dokumenter NHK tentang para profesional. Narasi formal dan wawancara natural seperti bahan choukai N1.",
    how: "Ringkas isi episode dalam 5 kalimat, lalu minta koreksi Sensei AI.",
    url: yt("プロフェッショナル 仕事の流儀"),
  },
  {
    title: "Aozora Bunko: Natsume Sōseki", titleJa: "青空文庫 夏目漱石", type: "buku", levels: [1],
    why: "Karya sastra klasik domain publik yang gratis dan legal. Mulailah dari 夢十夜 yang pendek.",
    how: "Salin satu bab ke Pembaca Bebas. Bahasa lama mungkin membingungkan, jadi tanyakan ke Sensei AI.",
    url: "https://www.aozora.gr.jp/",
  },
  {
    title: "Norwegian Wood", titleJa: "村上春樹『ノルウェイの森』", type: "buku", levels: [1],
    why: "Prosa modern yang mengalir dengan banyak ungkapan perasaan dan narasi batin.",
    how: "Baca bersama terjemahan Indonesia sebagai pendamping jika perlu.",
    url: "https://www.google.com/search?q=" + encodeURIComponent("ノルウェイの森 村上春樹"),
  },
];
