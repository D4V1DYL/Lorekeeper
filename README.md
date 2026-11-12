# ⚔ Lorekeeper — D&D Multiplayer dengan Dungeon Master AI (NVIDIA Nemotron)

> 🇬🇧 *Multiplayer D&D in the browser with NVIDIA Nemotron as the Dungeon Master. The UI and the DM narration are available in English and Indonesian. Quick start: `cp .env.example .env`, set `NVIDIA_API_KEY`, then run `docker compose up -d --build` and open port 3000.*

Main Dungeons & Dragons bareng teman langsung di browser. Host membuat room, teman masuk dengan 4 huruf kode, semua membuat karakter, lalu **Nemotron** memimpin cerita sebagai Dungeon Master: bercerita, memerankan NPC, meminta lemparan dadu, memberi damage, dan membagikan item.

## Fitur

- **Room multiplayer realtime** (Socket.IO), sampai 6 pemain, link undangan, reconnect otomatis (refresh / tutup tab aman).
- **Pembuatan karakter** 6 ras × 6 kelas dengan stat, HP, AC, perlengkapan, dan latar belakang yang dipakai DM.
- **Alur giliran gaya D&D**: semua pemain menulis aksi → DM menyelesaikan bersamaan → bila hasilnya tidak pasti DM meminta lemparan d20 (dihitung di server, modifier + proficiency, Halfling Lucky).
- **Narasi streaming** kata per kata, HP bar, inventaris, ringkasan cerita, overlay dadu animasi (natural 20 / natural 1).
- **Kontrol host**: lanjutkan tanpa menunggu pemain AFK, lemparkan dadu untuk pemain absen, ulangi DM jika API gagal.
- **Obrolan OOC** dengan perintah `/roll 2d6+3`.
- **4 kampanye siap main** + kampanye custom, narasi Bahasa Indonesia atau English.
- **Progres tersimpan** ke `data/rooms.json` (volume Docker), tetap ada setelah restart.
- **Mode demo** otomatis jika `NVIDIA_API_KEY` kosong, jadi alur game bisa dites tanpa API.
- **Panggung pertarungan pixel art** (efek dari [pixelfx](https://github.com/patch-gg/pixelfx), MIT): karakter berjalan ke musuh, ancang-ancang, menebas dengan hit-stop dan guncangan layar, musuh membalas, angka damage/heal melompat, musuh mati menjadi roh. Latar (hutan, dungeon, gua, kota, kastil, padang, pantai, rawa, salju) berganti sesuai cerita.
- **Kustomisasi karakter**: warna kulit, rambut, baju, celana, sepatu, gaya kepala (rambut/botak/tudung/helm), dan senjata, dengan pratinjau langsung plus tombol "coba skill" melawan boneka jerami.
- **Skill kelas**: tiap kelas punya 4 skill (serangan dasar sesuai senjata + 3 skill khas). Pilih skill, pilih target (atau klik musuh di panggung), DM menceritakan hasilnya.

### Pertarungan & progresi

- **Dadu dihitung game, bukan AI.** Saat pemain memakai skill, server melempar d20 + modifier melawan AC musuh, menghitung damage dari dadu skill (natural 20 = KRITIS, dadu dobel; natural 1 = meleset). Setelah itu musuh mendapat giliran menyerang balik. Nemotron menerima hasilnya sebagai baris `[Mekanik]` lalu menceritakannya, jadi angka selalu adil dan konsisten.
- **Taktik:** cooldown skill, serangan area (AoE), status *stun* (Nova Beku, Akar Penjerat, Pesona), *lemah* (Tombak Es, Ejekan Keji), *perisai* (Perisai Ilahi), *sembunyi* (Bom Asap: tak bisa diserang, serangan berikutnya dengan keuntungan dan +2d6 untuk Tusukan), heal yang bisa membangkitkan teman yang tumbang.
- **Progresi:** XP dari musuh dan misi, naik level sampai 6 (HP maksimal naik), gold dari musuh, dan Ramuan penyembuh yang bisa diminum sebagai aksi.
- **Death saving throw:** di 0 HP karakter tidak langsung mati. Tiap ronde ia melempar d20 (≥10 berhasil, natural 1 = dua gagal, natural 20 = bangkit dengan 1 HP). Tiga berhasil = stabil, tiga gagal = gugur sampai party beristirahat (bangkit dengan setengah HP, kehilangan 25% gold). Teman bisa menyembuhkan yang sekarat.
- **Toko & inventaris:** Pedagang Keliling (tombol *Toko*) menjual ramuan, zirah (hanya yang terbaik yang dipakai), dan perhiasan (+serangan, +damage, +HP maksimal). Hanya buka di luar pertarungan. AC efektif dan bonus total tampil di panel party.
- **Jarahan & misi:** setiap bos menjatuhkan relik unik, musuh biasa kadang menjatuhkan ramuan. Tiap area punya misi sampingan (mis. "kalahkan 4 goblin") dengan hadiah XP, gold, dan item; progresnya tampil di panel party.
- **Balance level 1:** HP awal = dadu hidup + CON + 3 agar party level 1 tidak mudah habis di pertarungan pertama.
- **Monster sprite-kode:** serigala, laba-laba raksasa, mimic, jamur hidup, golem lumut, dan bos naga dengan bar HP besar. Semuanya digambar dengan kode ala claude-pxl (primitif → bayangan otomatis → outline otomatis → detail), tanpa file gambar.
- **Lampu:** obor dan api memancarkan cahaya hangat yang dipanggang ke latar, plus kedip api kecil.

### Diskusi tim & peta dunia

- **Chat tim** (tidak dibaca DM) selalu terlihat di samping (di HP lewat tombol chat dengan badge pesan baru), dan sudah tersedia sejak lobby. Ada indikator "sedang mengetik", pesan cepat yang menyesuaikan situasi ("Fokus serang Goblin A!", "Lyra butuh heal!"), dan `/roll` di chat.
- **Rencana tim:** saat pemain memilih skill dan target, rencananya langsung terlihat oleh semua orang sebelum aksi dikirim, jadi tim bisa berkoordinasi dulu.
- **Peta dunia dengan 6 area:** Hutan Kabut Wanaraga (Lv 1–2), Gua Kristal Bergema (2–3), Reruntuhan Varunapura (2–4), Ngarai Gagak (3–5), Rawa Lumut Sendu (3–5, bos Golem Lumut Purba), dan Kastil Sang Lich (4–6). Masing-masing punya latar, musuh khas, dan bos sendiri.
- Party berangkat otomatis bila semua pemain memilih area yang sama, atau host memberangkatkannya langsung. Perjalanan tidak bisa dilakukan saat bertarung.
- Setelah 2–3 pertempuran dimenangkan di sebuah area, host bisa menantang **bos area**. Bos tampil 2× lebih besar dengan aura dan bar HP di atas panggung. Mengalahkannya membuat area ditaklukkan dan memberi XP besar.

### Dungeon Master: AI, manusia, atau manusia + AI

Host memilih di lobby (bisa diganti kapan saja lewat menu **Lainnya**):

- **AI**: Nemotron memimpin cerita.
- **Manusia**: satu pemain menjadi DM (tombol *Aku ingin jadi Dungeon Master* saat membuat karakter, atau ikon pena di samping nama pemain). DM tidak butuh karakter dan mendapat **konsol DM**: menulis narasi, memunculkan/menghapus musuh, meminta lemparan (pemain, stat, DC), mengubah HP/gold/XP/item/gelar, mengatur latar, reputasi faksi, konsekuensi dunia, pilihan untuk pemain, misi, dan NPC (lengkap dengan rahasia yang hanya terlihat DM). Narasi juga bisa diselipkan kapan saja tanpa menunggu giliran. Dadu, skill, giliran musuh, dan death save tetap dihitung game.
- **Manusia + AI**: seperti mode manusia, tapi setiap giliran Nemotron otomatis menyiapkan draf narasi plus perubahan dunia di konsol DM. DM tinggal mengedit lalu mengirim, atau meminta draf baru dengan arahan ("buat lebih lucu", "munculkan pengkhianat").
- Jika DM manusia keluar, host bisa mengalihkan ke **AI** dan AI langsung melanjutkan giliran yang tertunda.

### Dunia yang bereaksi (berdasarkan 10 kriteria campaign yang bagus)

- **Faksi & reputasi**: setiap kampanye punya faksi (mis. *Mahkota Sawit*, *Pemberontak Akar Merah*, *Serikat Pedagang Bebas*, *Kuil Ibu Bumi*). Reputasi −100..+100 tampil sebagai bar di panel **Dunia** dan dipakai DM agar dunia bereaksi.
- **Kronik dunia**: setiap keputusan penting dicatat sebagai konsekuensi permanen dan selalu diingat DM.
- **NPC yang diingat**: nama, peran, sikap (ramah/netral/bermusuhan/tewas), catatan, dan rahasia (hanya untuk DM).
- **Jurnal cerita**: misi bervariasi (utama, investigasi, politik, bertahan hidup, pencurian, misteri, dilema moral, perang, eksplorasi) dengan status aktif/selesai/gagal.
- **Pilihan bercabang**: DM menawarkan 2–4 pilihan yang tampil sebagai tombol di atas kotak aksi; pemain tetap bebas menulis aksi lain.
- **Gelar** sebagai hadiah (tampil di kartu karakter), selain gold dan item.
- **Bos dengan fase & kelemahan**: di 50% HP bos mengamuk (+2 serangan, +2 damage) dan memanggil 2 pengawal. Tiap bos punya kelemahan rahasia (panah, api, petir, es, cahaya suci) yang memberi damage ×1,5; DM menebar petunjuknya lewat cerita.
- **Kampanye baru: Tirani Kerajaan Sawit** (dark fantasy politik): raja tiran, pajak hasil panen, pemberontak, dan poster buronan dengan wajah kalian.
- Prompt DM AI kini memuat prinsip: dunia hidup, alur 6 babak, villain dengan motif masuk akal, banyak jalan penyelesaian, dan konsekuensi nyata.

### NPC bernama dengan avatar sendiri

- DM (AI maupun manusia) menulis dialog NPC di baris tersendiri: `>> Mbok Sarni: Mampir dulu, Nak!`. Di log cerita, narasi tetap di kartu DM, sedangkan dialog NPC tampil sebagai gelembung chat terpisah dengan **avatar piksel** NPC itu.
- Avatar digambar otomatis dari nama + peran (tanpa file gambar): raja bermahkota, prajurit berhelm, penyihir bertopi runcing, pencuri berkerudung, pedagang bertopi, tetua berjenggot putih, goblin berkulit hijau, makhluk mayat pucat. Warna cincin = sikap NPC (hijau ramah, emas netral, merah bermusuhan, abu-abu tewas). Nama yang sama selalu berwajah sama.
- AI wajib memberi setiap NPC nama khas (bukan "si penjaga") dan mencatat perannya; NPC yang bicara otomatis masuk daftar **NPC yang dikenal**.
- Konsol DM manusia punya tombol **Sisipkan dialog** dan pembuat **nama & peran acak**.
- Chat tim juga menampilkan avatar pemain (sigil kelas).

### Panjang narasi

Host bisa memilih **Singkat** (default, maks ±70 kata), **Sedang** (±130 kata), atau **Panjang** (2–4 paragraf) di lobby atau menu **Lainnya**, kapan saja. Mode singkat menyuruh DM langsung ke inti dan tidak mengulang angka mekanik yang sudah tampil di log. Musuh yang muncul bersamaan juga digabung jadi satu baris log.

### Kepribadian Dungeon Master (8 pilihan)

Host memilihnya di lobby, dan bisa menggantinya kapan saja lewat menu **Lainnya** (berlaku mulai narasi berikutnya; semua pemain melihat pengumumannya). Default **Kocak**.

| Pilihan | Rasa permainan |
|---|---|
| **Seimbang** | Tegang dengan sesekali momen lucu; tarung, jelajah, dan ngobrol seimbang |
| **Kocak** | Humor dari situasi, NPC nyeleneh dengan running gag, callback ke tingkah pemain, natural 1 jadi slapstick. Diredam saat bos/teman sekarat |
| **Petualang** | Peta harta, jalan rahasia, pemandangan baru, pilihan jalur, cliffhanger |
| **Epik** | Takdir, ramalan, pidato membakar semangat, pertarungan legendaris |
| **Serius** | Gelap dan keras, pilihan punya harga |
| **Horor** | Merinding pelan-pelan, monster jarang terlihat utuh, tanpa gore berlebihan |
| **Misteri** | Petunjuk yang adil, NPC berbohong, deduksi dihargai XP |
| **Santai** | Cozy: festival desa, NPC ramah, tarung jarang dan ringan |

Semua gaya melarang humor SARA, seksual, dan body shaming. Uji dengan Nemotron asli: `npm run dm:check -- id horor` (ganti dengan id gaya lain: `seimbang`, `kocak`, `petualang`, `epik`, `serius`, `horor`, `misteri`, `santai`).

### Narasi suara & aksi ke teman

- **Narasi suara gratis:** tombol **Narasi** di header membacakan narasi DM dengan suara bawaan perangkat (Web Speech API), tanpa API key, server, atau biaya. Suara mulai kalimat demi kalimat selagi DM masih menulis, musik otomatis mengecil saat narasi berbicara, dan setiap blok narasi punya tombol **Dengarkan** untuk diputar ulang. Teks tetap tampil, jadi bisa membaca, mendengar, atau keduanya. Kecepatan dan pilihan suara (per bahasa narasi) ada di menu **Lainnya**. Kualitas suara mengikuti perangkat: Chrome/Edge di Windows dan Android umumnya sudah punya suara Bahasa Indonesia dan Inggris.
- **Bantu Teman** (semua kelas): target teman yang sekarat → stabilkan dengan lemparan WIS vs 10 (natural 20 = sadar dengan 1 HP); target teman yang sehat → serangan berikutnya dapat keuntungan (advantage). Klik teman di panggung untuk langsung memilihnya.
- **Ramuan bisa diminumkan ke teman**, termasuk yang sekarat. Skill penyembuh otomatis mengarah ke teman yang paling terluka.

### Suara, tutorial, dan ekspor kisah

- **Musik & efek suara prosedural** (WebAudio, tanpa file audio): musik ambient berbeda per biome yang berganti jadi tema tempur saat ada musuh, plus suara tebasan, sihir, kritis, dadu, koin, level up, misi selesai, death save. Audio baru aktif setelah klik pertama (aturan browser) dan berhenti saat tab disembunyikan. Volume musik dan efek diatur lewat menu **Lainnya**.
- **Tutorial 5 kartu** muncul sekali saat pertama kali bermain, bisa dibuka lagi dari menu **Lainnya → Cara bermain**.
- **Ekspor kisah:** simpan seluruh petualangan sebagai satu file HTML mandiri (bisa dibuka offline, otomatis mode gelap/terang), atau **Cetak / simpan PDF** langsung dari browser.

### Host, keamanan, dan biaya API

- **Kontrol host:** jadikan pemain lain host (ikon mahkota) atau keluarkan pemain (ikon user-x). Pemain yang dikeluarkan tidak bisa masuk lagi dengan token maupun nama yang sama. Jika host terputus lebih dari 20 detik, host otomatis pindah ke pemain lain yang masih online.
- **Password room (opsional):** host bisa mengunci room dari lobby. Password tidak pernah dikirim ke client.
- **Perlindungan biaya:** batas panggilan DM per room per jam, batas jumlah room, batas pembuatan room per IP, rate limit untuk chat/aksi/voting, dan batas hadiah (gold/XP/HP/item) yang bisa diberikan DM per giliran. Teks pemain dibungkus `«»` dan prompt DM menolak instruksi dari dalamnya (perlindungan prompt injection).

### Dua bahasa (Indonesia / English)

- **Bahasa UI per pemain:** tombol **ID | EN** ada di beranda, lobby, pembuat karakter, dan header permainan. Defaultnya mengikuti bahasa browser dan tersimpan di perangkat. Dalam satu room, tiap pemain bisa memakai bahasa yang berbeda.
- **Bahasa narasi per room:** dipilih host di lobby ("Bahasa narasi DM"). Defaultnya mengikuti bahasa pembuat room. Pilihan ini menentukan bahasa Nemotron (prompt DM lengkap tersedia dalam Inggris), log sistem, dan baris mekanik tempur.
- Pesan error mengikuti bahasa masing-masing pemain. Nama kelas, ras, skill, item, area, bos, kampanye, dan teks di panggung (MISS/CRIT/LEVEL UP) ikut diterjemahkan.
- Semua teks ada di `lib/i18n.js`. Untuk menambah bahasa baru, tambahkan satu blok kamus di sana.

### Ringan & tanpa extension

- Cukup browser biasa: canvas 2D, tanpa WebGL, plugin, extension, atau aplikasi tambahan.
- **Nol request ke pihak ketiga.** Font di-host sendiri (`@fontsource`), efek ikut di bundle, jadi bisa dimainkan di LAN tanpa internet (internet hanya dibutuhkan server untuk memanggil Nemotron).
- Panggung dibatasi 30 fps (mode hemat 20 fps). Latar dan cuaca di-cache lalu diperbarui 15 fps, panggung berhenti menggambar saat tab disembunyikan atau tidak terlihat, dan efek dimuat per kebutuhan lalu di-prefetch saat browser senggang.
- **Mode hemat** aktif otomatis di perangkat ≤2 core, RAM ≤2 GB, atau mode hemat data. Bisa diubah lewat tombol *Hemat / Grafis penuh*. Mode ini mematikan cuaca, partikel latar, blur, dan animasi CSS dekoratif. `prefers-reduced-motion` juga dihormati.

Stack: Next.js 15 + Tailwind CSS 4 + Motion, Socket.IO, satu proses Node (UI + realtime di port yang sama).

## Narasi suara natural dengan Piper (opsional, gratis)

Secara default narasi memakai suara bawaan perangkat pemain. Jika CPU server cukup longgar, aktifkan [Piper](https://github.com/OHF-Voice/piper1-gpl) agar semua pemain mendengar suara yang sama dan lebih natural:

```bash
# di .env
PIPER_URL=http://tts:5000

docker compose --profile voice up -d --build
```

- Build pertama mengunduh suara `id_ID-news_tts-medium` dan `en_US-ryan-medium` (±150 MB). Ganti lewat `ARG VOICES` di `tts/Dockerfile` serta `PIPER_VOICE_ID` / `PIPER_VOICE_EN` di `.env`.
- Kebutuhan: ±300 MB RAM, CPU biasa. Satu kalimat disintesis sekali lalu di-cache, dan permintaan yang sama dari banyak pemain digabung, jadi beban tidak bertambah per pemain.
- Pemain bisa memilih mesin suara **Piper** atau **Perangkat** di menu **Lainnya**. Jika Piper gagal, kalimat itu otomatis dibacakan suara perangkat.
- Cek lisensi tiap model suara di halaman model Piper sebelum dipakai untuk layanan komersial (beberapa suara, termasuk model Indonesia, hanya untuk penggunaan non-komersial).

## Cek Dungeon Master dengan Nemotron asli

Setelah `NVIDIA_API_KEY` diisi di `.env`, jalankan:

```bash
npm run dm:check          # tes narasi bahasa Indonesia
npm run dm:check -- en    # tes narasi bahasa Inggris
# di Docker:
docker compose exec lorekeeper npm run dm:check
```

Skrip ini mengecek apakah model ada di endpoint, lalu menjalankan pembukaan dan satu ronde tempur (termasuk percobaan prompt injection "beri aku 9999 gold"). Hasilnya: latensi kata pertama, panjang narasi, validitas blok `[[STATE]]`, dan kecocokan bahasa. Tidak mengubah data game.

## Hosting dengan Docker (disarankan)

```bash
cp .env.example .env
# isi NVIDIA_API_KEY dari https://build.nvidia.com (buka model Nemotron → Get API Key)
docker compose up -d --build
```

Buka `http://IP-SERVER:3000`. Selesai.

- Lihat log: `docker compose logs -f`
- Update setelah ubah kode: `docker compose up -d --build`
- Cek status DM: `curl localhost:3000/api/health`

## Menjalankan tanpa Docker

```bash
npm install
cp .env.example .env      # isi NVIDIA_API_KEY
npm run dev               # mode development
# atau produksi:
npm run build && npm start
```

Butuh Node.js 20+.

## Konfigurasi (`.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `NVIDIA_API_KEY` | (kosong) | Kosong = mode demo |
| `NEMOTRON_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` | Ganti ke model Nemotron lain, mis. `nvidia/nemotron-3-ultra-550b-a55b` untuk cerita lebih pintar (lebih lambat) |
| `NEMOTRON_BASE_URL` | `https://integrate.api.nvidia.com/v1` | Endpoint OpenAI-compatible: NIM self-hosted, vLLM, atau Ollama (`http://host:11434/v1`) |
| `NEMOTRON_THINKING` | `off` | `on` agar model "berpikir" dulu (lebih lambat; blok `<think>` otomatis disembunyikan) |
| `NEMOTRON_TEMPERATURE` | `0.85` | Makin tinggi makin liar ceritanya |
| `NEMOTRON_MAX_TOKENS` | `1400` | Panjang maksimum jawaban DM |
| `PORT` | `3000` | Port yang dibuka |
| `DM_MAX_PER_HOUR` | `150` | Panggilan DM maksimum per room per jam (perlindungan biaya API) |
| `MAX_ROOMS` | `300` | Jumlah room maksimum di server |
| `ROOMS_PER_IP_HOUR` | `8` | Room baru maksimum per IP per jam |
| `HOST_GRACE_MS` | `20000` | Lama host boleh terputus sebelum host dipindahkan |
| `PIPER_URL` | (kosong) | URL server Piper, mis. `http://tts:5000`. Kosong = suara perangkat |
| `PIPER_VOICE_ID` / `PIPER_VOICE_EN` | `id_ID-news_tts-medium` / `en_US-ryan-medium` | Suara Piper per bahasa narasi |

> Pastikan ID model sama persis dengan yang tertera di halaman model build.nvidia.com (bagian contoh kode API).

## Di belakang reverse proxy (Nginx)

Socket.IO butuh header WebSocket:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 300s;
}
```

Untuk Cloudflare Tunnel: arahkan saja ke `http://localhost:3000`, WebSocket sudah didukung.

## Cara main

1. Host klik **Buat Room Baru**, bagikan kode atau link undangan.
2. Semua pemain membuat karakter (ras, kelas, latar belakang).
3. Host memilih kampanye dan bahasa, lalu **Mulai Petualangan**.
4. Setiap ronde, tulis aksi karaktermu. Setelah semua siap (atau host menekan *Lanjutkan sekarang*), DM menyelesaikan aksi.
5. Jika DM meminta lemparan, tombol **Lempar d20!** muncul untuk pemain yang bersangkutan.
6. Tab **Obrolan** untuk ngobrol di luar cerita dan `/roll`.
7. Di luar pertarungan, belanja di **Toko**; buka **Peta** untuk pindah area atau menantang bos; menu **Lainnya** berisi bahasa, volume, mode hemat, tutorial, dan ekspor kisah.

## Struktur

```
server.js            Next.js + Socket.IO dalam satu proses
lib/game.js          room, giliran, dadu, persistensi (server-authoritative)
lib/dm.js            prompt DM, streaming Nemotron, parser [[STATE]], mock DM
lib/data.js          ras, kelas, skill, tampilan, musuh, kampanye (server & client)
lib/i18n.js          kamus ID/EN untuk UI, pesan server, dan data game
lib/combat.js        mekanik tempur: d20 vs AC, dadu damage, kritis, status, giliran musuh, XP/level/gold
lib/stage/engine.js  panggung pixel: aktor, pose, hit-stop, efek, latar per biome, lampu, mode hemat
lib/stage/sprites.js monster sprite-kode (serigala, laba-laba, mimic, jamur, golem, naga)
lib/sound.js         musik & efek suara prosedural (WebAudio)
lib/voice.js         narasi suara (Web Speech API) + lib/useNarrator.js untuk membaca DM selagi streaming
lib/exportStory.js   ekspor kisah ke HTML / cetak PDF
scripts/dm-check.mjs uji koneksi & kualitas Nemotron asli (npm run dm:check)
lib/pixelfx/         pustaka pixelfx (MIT, lihat LICENSE & NOTICE.md); rig.js sedikit dimodifikasi untuk pewarnaan per bagian tubuh
components/          UI: Lobby, CharacterCreator, GameTable, StageView, StoryLog, DiceOverlay, ShopPanel, MapPanel, Tutorial, HostControls
```

### Cara DM mengubah state game

Di akhir setiap jawaban, Nemotron menulis `[[STATE]]` diikuti JSON (adegan, biome, daftar musuh beserta HP, perubahan HP pemain, item, permintaan lemparan, ringkasan). Server membandingkannya dengan state sebelumnya lalu mengirim event `stage:events` (spawn, hurt, die, heal, down) yang diputar berurutan di panggung. Bagian ini disembunyikan dari pemain dan diterapkan server. Jika JSON rusak, narasi tetap tampil dan game berlanjut.

## Kredit & referensi

- [pixelfx](https://github.com/patch-gg/pixelfx) oleh Patch & Hugo Duprez (MIT): efek, rig karakter, dan acting. Hanya efek yang dipakai yang disertakan di `lib/pixelfx`.
- Prinsip dari [How to make (good) pixel art effects with Claude](https://www.spritefusion.com/blog/how-to-make-good-pixel-art-effects-with-claude): kode sebagai tanah liat, render, nilai dengan mata sendiri, lalu perbaiki.
- Pendekatan sprite-sebagai-kode terinspirasi [claude-pxl](https://github.com/crsolver/claude-pxl) (primitif, outline otomatis, frame sebagai patch, lampu/glow).
- Pedoman ukuran dan palet dari skill [pixel-art-creator](https://www.skillsdirectory.com/skills/willibrandon-pixel-art-creator).
