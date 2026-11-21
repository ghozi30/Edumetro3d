# 🎮 EDUVERSE 3D — Game Edukasi Multiplayer Mabar Kelas
> **Media Pembelajaran Gamifikasi 3D Terinspirasi dari ZuperVerse**

EduVerse 3D adalah platform media pembelajaran interaktif berbasis web 3D yang memungkinkan **seluruh siswa dalam satu kelas (bahkan satu sekolah)** untuk bermain dan belajar bersama (*mabar*) secara *real-time* langsung dari peramban (browser) HP, laptop, atau tablet tanpa perlu menginstal aplikasi tambahan.

Guru dibekali **Dashboard Khusus** dengan konsep **"Tinggal Edit Soal Aja!"**, memungkinkan guru mata pelajaran apa pun mengubah materi pembelajaran menjadi kuis petualangan 3D interaktif dalam hitungan menit.

---

## 🌟 Fitur Utama

1. **Arena Stadium 3D Interaktif (Three.js WebGL)**:
   - 4 Zona Platform Jawaban Interaktif (**A**, **B**, **C**, **D**) dengan warna dan tanda huruf yang kontras.
   - Papan Skor / Jumbotron Raksasa 3D di tengah stadium.
   - Efek visual responsif: Platform yang benar naik ke atas dengan semburan kembang api dan konfeti emas; platform salah turun ke bawah.
   - Efek suara prosedural tanpa aset audio eksternal (menggunakan *Web Audio API*).

2. **Karakter Avatar 3D & Kustomisasi**:
   - Pilihan warna baju (Biru, Merah, Hijau, Emas, Ungu, Jingga, dll.).
   - Pilihan aksesori topi (Topi Sekolah SD/SMP Merah Putih, Mahkota Juara, Toga Wisuda, Telinga Kucing).
   - Animasi prosedural berjalan, melompat, bernapas, dan balon reaksi emote (👍, 🔥, 💡, 😂, 👏, 🏆).
   - Label nama siswa (*billboard 3D*) mengambang di atas kepala setiap avatar.

3. **Multiplayer Multi-Perangkat (Socket.IO)**:
   - Sistem Room berbasis **KODE PIN 4 Digit** (mudah diketik siswa di HP).
   - Kontrol desktop: Keyboard WASD / Tombol Panah + Spasi + Drag Mouse.
   - Kontrol smartphone/tablet: *Virtual Floating Joystick* analog di jempol kiri dan tombol *LOMPAT* di jempol kanan.
   - Ringan dan hemat data (*lightweight delta synchronization* @ 20Hz), lancar 60 FPS untuk 30–50+ siswa sekaligus.

4. **Dashboard Guru ("Tinggal Edit Soal Aja!")**:
   - **Bank Soal Siap Pakai**: Kuis materi IPA (Tata Surya & Ekosistem), Matematika Asyik, Sejarah & Budaya Nusantara, dan Pengetahuan Umum.
   - **Editor Soal Visual**: Tambah, edit, dan hapus soal dengan mudah tanpa perlu koding.
   - **Impor & Ekspor Excel CSV**: Guru dapat mengetik bank soal di Microsoft Excel lalu mengunggahnya dengan satu klik.
   - **Panel Kontrol Host Proyektor**: Kendali mulai kuis, buka jawaban, lanjut ke soal berikutnya, dan unduh rekap nilai murid otomatis ke format `.csv`.

---

## 📁 Struktur Berkas Proyek

```text
game 20 3d/
├── server.js                      # Server Node.js, Express & Socket.io Multiplayer
├── package.json                   # Dependensi proyek
├── tests/
│   └── test_game.js               # Pengujian otomatis integrasi multiplayer
├── public/
│   ├── index.html                 # Halaman Masuk Siswa (PIN, Nama, Kostumisasi Avatar)
│   ├── guru.html                  # Dashboard & Portal Guru ("Tinggal Edit Soal Aja")
│   ├── game.html                  # Layar Permainan 3D (Siswa & Tampilan Proyektor Guru)
│   ├── css/
│   │   ├── style.css              # Tampilan UI Glassmorphism modern
│   │   └── game.css               # Tampilan HUD game, joystick, emote & leaderboard
│   └── js/
│       ├── three.min.js           # Pustaka 3D Three.js tersimpan lokal (bisa offline)
│       ├── audio.js               # Generator suara Web Audio API (lonceng, buzzer, lompatan)
│       ├── quiz-data.js           # Bank soal bawaan materi kurikulum
│       ├── quiz-manager.js        # Manajer penyimpanan LocalStorage & Impor/Ekspor Excel
│       ├── world3d.js             # Engine 3D arena stadium, jumbotron & partikel kembang api
│       ├── avatar3d.js            # Generator avatar 3D & animasi prosedural
│       ├── controls.js            # Kontrol keyboard PC & analog joystick virtual HP
│       ├── network.js             # Sinkronisasi client socket dengan interpolasi halus
│       ├── game-main.js           # Pengendali utama permainan & evaluasi kuis
│       └── guru-main.js           # Pengendali dashboard guru
├── panduan-guru/                  # Modul Lengkap Pemenuhan Ketentuan Dosen
│   ├── 01_PANDUAN_KERJASAMA_GURU.md         # Surat kesepakatan & wawancara kebutuhan guru
│   ├── 02_PANDUAN_MENYUSUN_SOAL_EDUKATIF.md # Panduan soal Taksonomi Bloom C1-C4
│   ├── 03_PANDUAN_OPERASIONAL_GAME_UNTUK_GURU.md # Buku petunjuk operasional guru di kelas
│   ├── 04_PANDUAN_PENGEMBANGAN_GAME_MANDIRI.md # Modul guru belajar membuat game mandiri
│   └── TEMPLATE_BANK_SOAL_GURU.csv         # Format Excel/CSV siap pakai untuk guru
└── LAPORAN_PROYEK_GAME_EDUKASI.md # Laporan akademik lengkap siap kumpul ke dosen
```

---

## 🚀 Panduan Menjalankan Game

### 1. Jalankan Server
Buka terminal / PowerShell di folder ini, lalu jalankan:
```bash
npm install
npm start
```

### 2. Tampilan di Terminal
Server akan menampilkan alamat URL lokal:
- **Di Laptop Guru / Proyektor Kelas**: `http://localhost:3000`
- **Di HP / Tablet Seluruh Siswa**: `http://[IP-Komputer-Guru]:3000` (contoh: `http://192.168.1.15:3000`)

### 3. Alur Permainan di Kelas
1. Guru membuka `http://localhost:3000/guru.html`.
2. Guru memilih bank soal atau mengedit soal yang diinginkan, lalu klik **"Luncurkan Room Kelas"**.
3. Layar proyektor akan menampilkan kode PIN 4 huruf (misal: `KX3M`).
4. Siswa membuka link dari HP masing-masing, memasukkan PIN, memilih avatar, lalu berlari di arena 3D memilih platform jawaban yang benar!
5. Di akhir kuis, guru dapat mengunduh rekap nilai siswa dalam format Excel dengan menekan tombol **"Download Rekap Nilai"**.
