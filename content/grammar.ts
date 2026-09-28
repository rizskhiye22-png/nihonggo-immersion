// Pola tata bahasa JLPT per level (karya asli THE MARS).
// Pada contoh, bagian pola ditandai [[...]] untuk dipakai di kuis isian.
import type { Level } from "../src/lib/types.ts";

export type GrammarSource = {
  id: string;
  level: Level;
  pattern: string;
  meaning: string;
  formation: string;
  explanation: string;
  examples: [string, string][];
};

export const grammar: GrammarSource[] = [
  // ───────────── N5 ─────────────
  {
    id: "n5-wa-desu", level: 5, pattern: "〜は〜です", meaning: "... adalah ...",
    formation: "KB + は + KB + です",
    explanation: "は menandai topik kalimat (dibaca \"wa\"), dan です adalah penutup sopan yang berarti \"adalah\". Bentuk negatifnya じゃありません / ではありません.",
    examples: [
      ["私[[は]]インドネシア人です。", "Saya orang Indonesia."],
      ["これ[[は]]日本語の本です。", "Ini buku bahasa Jepang."],
    ],
  },
  {
    id: "n5-ga-suki", level: 5, pattern: "〜が好きです", meaning: "suka ...",
    formation: "KB + が好きです",
    explanation: "Benda yang disukai ditandai dengan が, bukan を. Untuk \"tidak suka\" pakai 好きじゃありません; untuk \"benci\" pakai 嫌いです.",
    examples: [
      ["私は猫[[が好き]]です。", "Saya suka kucing."],
      ["兄はサッカー[[が好き]]です。", "Kakak laki-laki saya suka sepak bola."],
    ],
  },
  {
    id: "n5-tai", level: 5, pattern: "〜たい", meaning: "ingin (melakukan) ...",
    formation: "KK bentuk ます (tanpa ます) + たい",
    explanation: "たい menyatakan keinginan pembicara sendiri dan berubah seperti kata sifat-い: 行きたい → 行きたくない (tidak ingin pergi) → 行きたかった (dulu ingin pergi).",
    examples: [
      ["日本へ行き[[たい]]です。", "Saya ingin pergi ke Jepang."],
      ["冷たい水が飲み[[たい]]です。", "Saya ingin minum air dingin."],
    ],
  },
  {
    id: "n5-mashou", level: 5, pattern: "〜ましょう", meaning: "ayo ..., mari ...",
    formation: "KK bentuk ます (tanpa ます) + ましょう",
    explanation: "Dipakai untuk mengajak lawan bicara melakukan sesuatu bersama. Versi bertanya 〜ましょうか berarti \"bagaimana kalau kita ...?\" atau menawarkan bantuan.",
    examples: [
      ["一緒に昼ご飯を食べ[[ましょう]]。", "Ayo makan siang bersama."],
      ["駅で会い[[ましょう]]。", "Mari bertemu di stasiun."],
    ],
  },
  {
    id: "n5-tekudasai", level: 5, pattern: "〜てください", meaning: "tolong ...",
    formation: "KK bentuk て + ください",
    explanation: "Permintaan sopan. Bentuk て wajib dikuasai di N5 karena menjadi dasar banyak pola lain (〜ている, 〜てもいい, 〜てから).",
    examples: [
      ["ここに名前を書い[[てください]]。", "Tolong tulis nama di sini."],
      ["もう一度言っ[[てください]]。", "Tolong ucapkan sekali lagi."],
    ],
  },
  {
    id: "n5-teiru", level: 5, pattern: "〜ています", meaning: "sedang ... / dalam keadaan ...",
    formation: "KK bentuk て + います",
    explanation: "Menyatakan aksi yang sedang berlangsung (食べています = sedang makan) atau keadaan hasil suatu aksi (結婚しています = sudah menikah).",
    examples: [
      ["今、雨が降っ[[ています]]。", "Sekarang sedang turun hujan."],
      ["弟は部屋でテレビを見[[ています]]。", "Adik laki-laki saya sedang menonton TV di kamar."],
    ],
  },
  {
    id: "n5-kara", level: 5, pattern: "〜から", meaning: "karena ...",
    formation: "Kalimat + から, kalimat",
    explanation: "Alasan diletakkan sebelum から, akibatnya sesudahnya. Urutannya kebalikan dari bahasa Indonesia: 暑いから、窓を開けます = karena panas, (saya) buka jendela.",
    examples: [
      ["暑い[[から]]、窓を開けます。", "Karena panas, saya buka jendela."],
      ["時間がない[[から]]、タクシーで行きます。", "Karena tidak ada waktu, saya pergi naik taksi."],
    ],
  },
  {
    id: "n5-ni-iku", level: 5, pattern: "〜に行く", meaning: "pergi untuk ...",
    formation: "KK bentuk ます (tanpa ます) + に + 行く/来る/帰る",
    explanation: "Menyatakan tujuan dari perpindahan. Bisa juga dengan kata benda aksi: 買い物に行く (pergi berbelanja).",
    examples: [
      ["デパートへ靴を買い[[に]]行きます。", "Saya pergi ke department store untuk membeli sepatu."],
      ["友達と映画を見[[に]]行きました。", "Saya pergi menonton film bersama teman."],
    ],
  },

  // ───────────── N4 ─────────────
  {
    id: "n4-takotogaaru", level: 4, pattern: "〜たことがある", meaning: "pernah ...",
    formation: "KK bentuk た + ことがある",
    explanation: "Menceritakan pengalaman di masa lalu. Negatifnya 〜たことがない (belum pernah).",
    examples: [
      ["富士山に登っ[[たことがあります]]。", "Saya pernah mendaki Gunung Fuji."],
      ["納豆を食べ[[たことがありません]]。", "Saya belum pernah makan natto."],
    ],
  },
  {
    id: "n4-nagara", level: 4, pattern: "〜ながら", meaning: "sambil ...",
    formation: "KK bentuk ます (tanpa ます) + ながら",
    explanation: "Dua aksi dilakukan oleh orang yang sama secara bersamaan. Aksi utama ada di akhir kalimat.",
    examples: [
      ["音楽を聞き[[ながら]]勉強します。", "Saya belajar sambil mendengarkan musik."],
      ["歩き[[ながら]]スマホを見ないでください。", "Tolong jangan melihat ponsel sambil berjalan."],
    ],
  },
  {
    id: "n4-tara", level: 4, pattern: "〜たら", meaning: "kalau / setelah ...",
    formation: "KK/KS bentuk た + ら",
    explanation: "Syarat paling serbaguna dalam percakapan. Bisa berarti \"kalau\" (kondisi) atau \"setelah\" (urutan waktu), dan bisa diikuti perintah atau ajakan.",
    examples: [
      ["駅に着い[[たら]]、電話してください。", "Setelah sampai di stasiun, tolong telepon saya."],
      ["雨が降っ[[たら]]、試合は中止です。", "Kalau hujan, pertandingannya dibatalkan."],
    ],
  },
  {
    id: "n4-youni-suru", level: 4, pattern: "〜ようにする", meaning: "berusaha (membiasakan) ...",
    formation: "KK bentuk kamus / ない + ようにする",
    explanation: "Menyatakan usaha sadar untuk membentuk kebiasaan. 〜ようにしています = sedang membiasakan diri.",
    examples: [
      ["毎日野菜を食べる[[ようにしています]]。", "Saya membiasakan diri makan sayur setiap hari."],
      ["遅刻しない[[ようにして]]ください。", "Tolong usahakan tidak terlambat."],
    ],
  },
  {
    id: "n4-nakereba", level: 4, pattern: "〜なければならない", meaning: "harus ...",
    formation: "KK bentuk ない (tanpa い) + ければならない",
    explanation: "Kewajiban. Dalam percakapan sering disingkat menjadi 〜なきゃ atau 〜なくちゃ.",
    examples: [
      ["明日までにレポートを出さ[[なければなりません]]。", "Saya harus menyerahkan laporan paling lambat besok."],
      ["毎晩この薬を飲ま[[なければなりません]]。", "Saya harus minum obat ini setiap malam."],
    ],
  },
  {
    id: "n4-sou", level: 4, pattern: "〜そうだ (tampaknya)", meaning: "kelihatannya ...",
    formation: "KK bentuk ます (tanpa ます) / KS (tanpa い/な) + そうだ",
    explanation: "Dugaan berdasarkan apa yang terlihat. Beda dengan そうだ \"katanya\" (bentuk biasa + そうだ) yang menyampaikan informasi dari orang lain.",
    examples: [
      ["このケーキはおいし[[そう]]ですね。", "Kue ini kelihatannya enak, ya."],
      ["今にも雨が降り[[そう]]です。", "Sepertinya sebentar lagi akan hujan."],
    ],
  },
  {
    id: "n4-teshimau", level: 4, pattern: "〜てしまう", meaning: "terlanjur ... / sudah selesai ...",
    formation: "KK bentuk て + しまう",
    explanation: "Dua nuansa: penyesalan (terlanjur melakukan hal yang tidak diinginkan) atau tuntas (menyelesaikan sampai habis). Dalam percakapan menjadi 〜ちゃう / 〜じゃう.",
    examples: [
      ["電車に傘を忘れ[[てしまいました]]。", "Payung saya ketinggalan di kereta."],
      ["宿題を全部やっ[[てしまいました]]。", "Saya sudah menyelesaikan semua PR."],
    ],
  },
  {
    id: "n4-ba", level: 4, pattern: "〜ば", meaning: "jika ...",
    formation: "KK: ubah akhiran -u → -eba (行く→行けば); KS: い → ければ",
    explanation: "Syarat umum: jika A terpenuhi, B terjadi. Sering dipakai untuk saran: 〜ばいい (sebaiknya ...).",
    examples: [
      ["急げ[[ば]]、間に合います。", "Kalau bergegas, masih keburu."],
      ["安けれ[[ば]]、買います。", "Kalau murah, saya beli."],
    ],
  },

  // ───────────── N3 ─────────────
  {
    id: "n3-youninaru", level: 3, pattern: "〜ようになる", meaning: "menjadi (bisa/terbiasa) ...",
    formation: "KK bentuk kamus / bentuk potensial + ようになる",
    explanation: "Menyatakan perubahan kemampuan atau kebiasaan secara bertahap. Cocok untuk menceritakan kemajuan belajarmu!",
    examples: [
      ["日本語のニュースが分かる[[ようになりました]]。", "Saya sudah bisa memahami berita berbahasa Jepang."],
      ["毎朝運動する[[ようになった]]。", "Saya jadi terbiasa berolahraga setiap pagi."],
    ],
  },
  {
    id: "n3-bakari", level: 3, pattern: "〜たばかり", meaning: "baru saja ...",
    formation: "KK bentuk た + ばかり",
    explanation: "Menekankan bahwa sesuatu baru terjadi (menurut perasaan pembicara). Beda dengan 〜たところ yang lebih tepat secara waktu.",
    examples: [
      ["日本に来た[[ばかり]]なので、まだ友達がいません。", "Karena baru saja datang ke Jepang, saya belum punya teman."],
      ["買った[[ばかり]]の傘をなくしてしまった。", "Saya menghilangkan payung yang baru saja saya beli."],
    ],
  },
  {
    id: "n3-wakedewanai", level: 3, pattern: "〜わけではない", meaning: "bukan berarti ...",
    formation: "Bentuk biasa (KS-な + な) + わけではない",
    explanation: "Menyangkal sebagian dari kesimpulan yang mungkin dibuat lawan bicara. Nadanya lebih halus daripada penyangkalan langsung.",
    examples: [
      ["嫌いな[[わけではない]]が、あまり食べない。", "Bukan berarti saya tidak suka, tapi saya jarang memakannya."],
      ["日本人がみんな寿司が好きな[[わけではない]]。", "Bukan berarti semua orang Jepang suka sushi."],
    ],
  },
  {
    id: "n3-kotonisuru", level: 3, pattern: "〜ことにする", meaning: "memutuskan untuk ...",
    formation: "KK bentuk kamus / ない + ことにする",
    explanation: "Keputusan atas kemauan sendiri. Bandingkan dengan 〜ことになる: keputusan yang ditentukan pihak lain atau keadaan.",
    examples: [
      ["来年、日本に留学する[[ことにしました]]。", "Saya memutuskan untuk kuliah di Jepang tahun depan."],
      ["今日から甘い物を食べない[[ことにする]]。", "Mulai hari ini saya memutuskan tidak makan yang manis-manis."],
    ],
  },
  {
    id: "n3-niyotte", level: 3, pattern: "〜によって", meaning: "tergantung ... / oleh ...",
    formation: "KB + によって",
    explanation: "Tiga fungsi utama: perbedaan (tergantung), pelaku dalam kalimat pasif (oleh), dan cara/sebab (dengan/karena).",
    examples: [
      ["国[[によって]]文化が違う。", "Budaya berbeda-beda tergantung negaranya."],
      ["この寺は有名な建築家[[によって]]設計された。", "Kuil ini dirancang oleh arsitek terkenal."],
    ],
  },
  {
    id: "n3-hazu", level: 3, pattern: "〜はずだ", meaning: "seharusnya ... / pasti ...",
    formation: "Bentuk biasa (KS-な + な, KB + の) + はずだ",
    explanation: "Keyakinan berdasarkan alasan yang logis. Negatifnya 〜はずがない berarti \"tidak mungkin\".",
    examples: [
      ["荷物は明日届く[[はず]]です。", "Paketnya seharusnya sampai besok."],
      ["田中さんはもう家に着いている[[はず]]だ。", "Pak Tanaka seharusnya sudah sampai di rumah."],
    ],
  },
  {
    id: "n3-uchini", level: 3, pattern: "〜うちに", meaning: "selagi ...",
    formation: "KK bentuk kamus/ている/ない, KS, KB + の + うちに",
    explanation: "Melakukan sesuatu sebelum keadaan berubah. Contoh terkenal: 温かいうちに = selagi masih hangat.",
    examples: [
      ["温かい[[うちに]]食べてください。", "Silakan dimakan selagi masih hangat."],
      ["若い[[うちに]]いろいろな経験をしたい。", "Selagi masih muda, saya ingin mencoba banyak pengalaman."],
    ],
  },
  {
    id: "n3-rashii", level: 3, pattern: "〜らしい", meaning: "katanya ... / khas ...",
    formation: "Bentuk biasa + らしい (dugaan); KB + らしい (ciri khas)",
    explanation: "Dua makna: (1) dugaan berdasarkan kabar yang didengar, (2) sifat yang sesuai ciri khas sesuatu (春らしい = khas musim semi).",
    examples: [
      ["来週、台風が来る[[らしい]]。", "Katanya minggu depan akan ada topan."],
      ["今日は春[[らしい]]暖かい日だ。", "Hari ini hangat, khas musim semi."],
    ],
  },

  // ───────────── N2 ─────────────
  {
    id: "n2-nimokakawarazu", level: 2, pattern: "〜にもかかわらず", meaning: "meskipun ...",
    formation: "KB / bentuk biasa + にもかかわらず",
    explanation: "Hasil yang berlawanan dengan dugaan. Lebih formal daripada のに, sering muncul di tulisan dan berita.",
    examples: [
      ["雨[[にもかかわらず]]、多くの人が集まった。", "Meskipun hujan, banyak orang berkumpul."],
      ["努力した[[にもかかわらず]]、結果は出なかった。", "Meskipun sudah berusaha, hasilnya tidak tampak."],
    ],
  },
  {
    id: "n2-nitaishite", level: 2, pattern: "〜に対して", meaning: "terhadap ... / sebaliknya ...",
    formation: "KB + に対して; bentuk biasa + のに対して",
    explanation: "(1) Arah sikap atau tindakan: terhadap. (2) Kontras dua hal: A, sebaliknya B.",
    examples: [
      ["先生の質問[[に対して]]、はっきり答えた。", "Dia menjawab pertanyaan guru dengan jelas."],
      ["兄は背が高いの[[に対して]]、弟は低い。", "Kakaknya tinggi, sedangkan adiknya pendek."],
    ],
  },
  {
    id: "n2-monono", level: 2, pattern: "〜ものの", meaning: "walaupun ..., (tetapi) ...",
    formation: "Bentuk biasa + ものの",
    explanation: "Mengakui A, tetapi hasilnya tidak sesuai harapan. Nuansanya kecewa atau belum tuntas.",
    examples: [
      ["日本語を勉強している[[ものの]]、なかなか上達しない。", "Walaupun belajar bahasa Jepang, kemampuan saya tak kunjung meningkat."],
      ["新しいパソコンを買った[[ものの]]、まだ使い方が分からない。", "Walaupun sudah membeli komputer baru, saya belum tahu cara memakainya."],
    ],
  },
  {
    id: "n2-wakeniwaikanai", level: 2, pattern: "〜わけにはいかない", meaning: "tidak bisa (begitu saja) ...",
    formation: "KK bentuk kamus / ない + わけにはいかない",
    explanation: "Tidak bisa melakukan sesuatu karena alasan moral, sosial, atau situasi, bukan karena tidak mampu.",
    examples: [
      ["大事な会議なので、休む[[わけにはいかない]]。", "Karena rapatnya penting, saya tidak bisa bolos."],
      ["約束したから、行かない[[わけにはいかない]]。", "Karena sudah berjanji, saya tidak bisa tidak datang."],
    ],
  },
  {
    id: "n2-nichigainai", level: 2, pattern: "〜に違いない", meaning: "pasti ...",
    formation: "Bentuk biasa (KS-な/KB tanpa だ) + に違いない",
    explanation: "Keyakinan kuat berdasarkan penilaian pembicara. Lebih kuat daripada だろう, lebih subjektif daripada はずだ.",
    examples: [
      ["あの店はいつも混んでいるから、おいしい[[に違いない]]。", "Toko itu selalu ramai, jadi pasti enak."],
      ["電気が消えている。彼はもう寝た[[に違いない]]。", "Lampunya mati. Dia pasti sudah tidur."],
    ],
  },
  {
    id: "n2-kikkakeni", level: 2, pattern: "〜をきっかけに", meaning: "dipicu oleh ... / berawal dari ...",
    formation: "KB + をきっかけに(して)",
    explanation: "Peristiwa yang menjadi awal sebuah perubahan. Sangat sering dipakai saat bercerita tentang motivasi.",
    examples: [
      ["留学[[をきっかけに]]、料理を始めた。", "Berawal dari kuliah di luar negeri, saya mulai memasak."],
      ["あるアニメ[[をきっかけに]]日本語に興味を持った。", "Berawal dari sebuah anime, saya jadi tertarik pada bahasa Jepang."],
    ],
  },
  {
    id: "n2-ippoude", level: 2, pattern: "〜一方で", meaning: "di sisi lain ...",
    formation: "Bentuk biasa (KS-な + な/である) + 一方(で)",
    explanation: "Membandingkan dua sisi dari satu hal. Sangat umum dalam esai dan soal dokkai.",
    examples: [
      ["生活が便利になる[[一方で]]、失われたものもある。", "Di satu sisi hidup menjadi praktis, di sisi lain ada hal yang hilang."],
      ["彼は仕事に厳しい[[一方で]]、家では優しい父親だ。", "Dia tegas dalam pekerjaan, tetapi di rumah menjadi ayah yang lembut."],
    ],
  },
  {
    id: "n2-zaruwoenai", level: 2, pattern: "〜ざるを得ない", meaning: "terpaksa harus ...",
    formation: "KK bentuk ない (tanpa ない) + ざるを得ない (する → せざるを得ない)",
    explanation: "Tidak ada pilihan lain selain melakukannya, meski tidak mau. Formal dan sering keluar di N2.",
    examples: [
      ["台風のため、旅行は中止せ[[ざるを得ない]]。", "Karena topan, perjalanan terpaksa dibatalkan."],
      ["上司の命令なので、従わ[[ざるを得ない]]。", "Karena perintah atasan, saya terpaksa menurutinya."],
    ],
  },

  // ───────────── N1 ─────────────
  {
    id: "n1-nihokanaranai", level: 1, pattern: "〜にほかならない", meaning: "tidak lain adalah ...",
    formation: "KB + にほかならない",
    explanation: "Penegasan kuat bahwa sesuatu adalah satu-satunya jawaban/alasan. Sering bersama から: 〜からにほかならない.",
    examples: [
      ["成功できたのは、皆さんの支え[[にほかならない]]。", "Keberhasilan ini tidak lain berkat dukungan Anda semua."],
      ["彼の行動は責任逃れ[[にほかならない]]。", "Tindakannya tidak lain adalah lari dari tanggung jawab."],
    ],
  },
  {
    id: "n1-naradewano", level: 1, pattern: "〜ならではの", meaning: "khas (hanya ada pada) ...",
    formation: "KB + ならではの + KB",
    explanation: "Pujian untuk sesuatu yang hanya bisa ditemukan pada orang, tempat, atau hal tertentu.",
    examples: [
      ["これは京都[[ならではの]]景色だ。", "Ini pemandangan yang hanya ada di Kyoto."],
      ["子ども[[ならではの]]自由な発想に驚かされた。", "Saya terkejut oleh ide bebas yang khas anak-anak."],
    ],
  },
  {
    id: "n1-woyosoni", level: 1, pattern: "〜をよそに", meaning: "tanpa menghiraukan ...",
    formation: "KB + をよそに",
    explanation: "Melakukan sesuatu dengan mengabaikan kekhawatiran, harapan, atau reaksi orang lain.",
    examples: [
      ["親の心配[[をよそに]]、彼は一人で海外へ旅立った。", "Tanpa menghiraukan kekhawatiran orang tuanya, dia berangkat sendirian ke luar negeri."],
      ["周囲の反対[[をよそに]]、計画は進められた。", "Tanpa menghiraukan penentangan sekitar, rencana itu tetap dijalankan."],
    ],
  },
  {
    id: "n1-zuniwairarenai", level: 1, pattern: "〜ずにはいられない", meaning: "tidak bisa menahan diri untuk ...",
    formation: "KK bentuk ない (tanpa ない) + ずにはいられない (する → せずには)",
    explanation: "Perasaan atau dorongan yang muncul secara alami dan tak tertahankan.",
    examples: [
      ["その映画を見て、泣か[[ずにはいられなかった]]。", "Menonton film itu, saya tak bisa menahan tangis."],
      ["彼の話を聞くと、笑わ[[ずにはいられない]]。", "Setiap mendengar ceritanya, saya tak bisa menahan tawa."],
    ],
  },
  {
    id: "n1-niitarumade", level: 1, pattern: "〜に至るまで", meaning: "sampai ke ... (sekalipun)",
    formation: "(〜から) KB + に至るまで",
    explanation: "Menekankan cakupan yang sangat luas, sampai ke hal yang paling jauh atau paling detail.",
    examples: [
      ["服装から言葉遣い[[に至るまで]]、厳しく注意された。", "Saya ditegur keras, mulai dari pakaian sampai cara berbicara."],
      ["首相から一般市民[[に至るまで]]、誰もがこのニュースに驚いた。", "Mulai dari perdana menteri sampai warga biasa, semua terkejut oleh berita ini."],
    ],
  },
  {
    id: "n1-towa", level: 1, pattern: "〜とは (terkejut)", meaning: "tak disangka ...",
    formation: "Bentuk biasa + とは",
    explanation: "Mengungkapkan keterkejutan atau kekaguman atas sesuatu yang tidak terduga. Sering bersama まさか.",
    examples: [
      ["まさか彼が優勝する[[とは]]思わなかった。", "Tak disangka dia akan menjadi juara."],
      ["一人で富士山に登る[[とは]]、大した勇気だ。", "Mendaki Gunung Fuji sendirian — sungguh keberanian yang luar biasa."],
    ],
  },
  {
    id: "n1-womotte", level: 1, pattern: "〜をもって", meaning: "dengan ... / per (tanggal) ...",
    formation: "KB + をもって",
    explanation: "Sangat formal. (1) Batas waktu: 本日をもって = terhitung hari ini. (2) Sarana: 優秀な成績をもって = dengan nilai yang sangat baik.",
    examples: [
      ["本日[[をもって]]、この店は閉店いたします。", "Terhitung hari ini, toko ini resmi tutup."],
      ["彼は優秀な成績[[をもって]]大学を卒業した。", "Dia lulus dari universitas dengan nilai yang sangat baik."],
    ],
  },
  {
    id: "n1-nbakari", level: 1, pattern: "〜んばかりの", meaning: "seolah-olah akan ...",
    formation: "KK bentuk ない (tanpa ない) + んばかりの / んばかりに (する → せんばかり)",
    explanation: "Keadaan yang begitu kuat sehingga tampak hampir terjadi, meski sebenarnya tidak.",
    examples: [
      ["彼女は泣き出さ[[んばかりの]]顔をしていた。", "Wajahnya seolah-olah akan menangis."],
      ["会場は割れ[[んばかりの]]拍手に包まれた。", "Aula dipenuhi tepuk tangan yang seolah akan meruntuhkan gedung."],
    ],
  },
];
