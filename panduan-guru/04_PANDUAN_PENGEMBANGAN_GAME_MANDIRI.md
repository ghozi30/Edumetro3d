# MODUL 4: PANDUAN PENGEMBANGAN GAME EDUKASI 3D SECARA MANDIRI
**Pedoman untuk Guru yang Ingin Mengembangkan & Memodifikasi Game Pembelajaran Sendiri**

---

## 1. Pengantar: Mengapa Guru Bisa Membuat Game 3D?
Banyak pendidik beranggapan bahwa membuat game 3D memerlukan perangkat komputer super mahal atau keahlian koding yang sangat rumit. Pada kenyataannya, dengan kemajuan teknologi modern berbasis **Web (HTML5 + WebGL / Three.js)**, pengembangan game edukasi kini dapat dilakukan dengan konsep modular (*Lego-brick system*).

Modul ini disusun untuk guru yang memiliki ketertarikan dan minat untuk memodifikasi atau mengembangkan game edukasi serupa secara mandiri tanpa harus mulai dari nol.

---

## 2. Mengenal Komponen Utama Game Edukasi 3D Web
Struktur game **EduVerse 3D** dirancang sangat bersih dan terbagi menjadi beberapa bagian yang mudah dipahami:

```text
game-folder/
├── server.js            -> "Otak" yang menghubungkan HP murid dan proyektor guru secara real-time
├── public/
│   ├── js/world3d.js    -> "Dunia 3D": Pulau melayang, warna lapangan, pohon, jumbotron, platform A B C D
│   ├── js/avatar3d.js   -> "Karakter Siswa": Kepala, badan, mata, topi, animasi berlari dan melompat
│   ├── js/audio.js      -> "Suara": Efek suara lonceng jawaban benar, suara buzzer, lompatan
│   ├── js/quiz-data.js  -> "Bank Soal": Daftar materi pembelajaran
│   └── guru.html        -> "Ruang Kerja Guru": Tempat mengedit soal tanpa perlu menyentuh koding
```

---

## 3. Tingkat 1: Modifikasi Tanpa Koding (No-Code)
Bagi guru yang ingin fokus pada variasi materi pembelajaran:
1. **Membuat Paket Kuis Baru**:
   - Guru cukup membuka `guru.html` di browser.
   - Gunakan fitur form atau impor file Excel `.csv` untuk mata pelajaran apa pun (Bahasa Inggris, Fisika, PAI, Geografi, dll.).
2. **Menyimpan & Membagikan ke Rekan Guru Lain**:
   - Guru dapat mengekspor paket kuis yang dibuat dan membagikan file `.csv`-nya ke rekan guru di Musyawarah Guru Mata Pelajaran (MGMP) atau Kelompok Kerja Guru (KKG).

---

## 4. Tingkat 2: Mengubah Visual & Tema Arena 3D (Low-Code Sederhana)
Jika guru ingin mengubah tema arena (misalnya menjadi tema luar angkasa, tema hutan tropis, atau tema gurun pasir):

### A. Mengubah Warna Langit & Lantai Stadium
Buka file `public/js/world3d.js`:
- Cari baris `this.scene.background = new THREE.Color(0x90e0ef);`
- Ubah kode warnanya:
  - Tema Luar Angkasa Gelap: `0x0f172a` (Biru Tua/Hitam)
  - Tema Hutan Tropis: `0x2d6a4f` (Hijau Daun)
  - Tema Senja Keemasan: `0xf77f00` (Jingga Sunset)

### B. Menambahkan Objek 3D Dekoratif Baru
Di dalam fungsi `createStylizedTree(x, z)` pada `public/js/world3d.js`, guru dapat melihat bagaimana bentuk sederhana (silinder untuk batang dan kerucut untuk daun) digabungkan menjadi sebuah pohon 3D. Guru bisa menambahkan objek baru seperti tiang bendera, piala raksasa, atau bola dunia dengan menggunakan geometri dasar Three.js (`BoxGeometry`, `SphereGeometry`, `CylinderGeometry`).

---

## 5. Tingkat 3: Menerbitkan Game ke Internet Secara Gratis
Agar game dapat dimainkan siswa dari rumah masing-masing (pembelajaran jarak jauh / PR interaktif), guru dapat mengunggah game ini ke platform cloud hosting gratis:

1. **Menggunakan Glitch (glitch.com) atau Replit (replit.com)**:
   - Buat akun gratis.
   - Klik *"Import from GitHub"* atau unggah folder proyek ini.
   - Game akan langsung aktif dan memiliki link permanen (contoh: `https://kuis-smpn1.glitch.me`).
2. **Menggunakan Render.com**:
   - Sambungkan dengan repositori GitHub tim pengembang.
   - Pilih *Web Service* Node.js, jalankan perintah `npm start`.
   - Guru dan siswa mendapatkan URL resmi yang dapat diakses dari mana saja.

---

## 6. Tips Mengajarkan Literasi Pembuatan Game kepada Guru
Jika mahasiswa mengadakan *workshop* atau pelatihan bersama guru mitra:
- **Fokus pada Dampak Pedagogis**: Tunjukkan bagaimana gamifikasi meningkatkan keterlibatan siswa (*student engagement*) hingga 80% dibanding tes pilihan ganda konvensional.
- **Berikan Rasa Percaya Diri**: Mulai dari tahap "Tinggal Edit Soal di Excel", lalu perlihatkan langsung bagaimana soal tersebut langsung tampil megah di jumbotron 3D.
- **Apresiasi Guru**: Jadikan guru sebagai desainer instruksional (*Instructional Game Designer*), di mana guru memegang kendali kurikulum sedangkan sistem menyediakan lingkungan bermainnya.
