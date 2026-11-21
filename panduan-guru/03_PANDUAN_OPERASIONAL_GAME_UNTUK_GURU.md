# MODUL 3: BUKU PANDUAN OPERASIONAL GAME UNTUK GURU
**"Tinggal Edit Soal Aja! — Panduan Menggelar Mabar Kuis Pembelajaran di Kelas"**

---

## 1. Persiapan Sebelum Kelas Dimulai
1. **Perangkat Guru**: 1 unit Laptop yang terhubung ke proyektor kelas atau layar monitor besar.
2. **Koneksi Jaringan**:
   - Jika di sekolah ada WiFi: Sambungkan laptop guru dan HP/laptop murid ke jaringan WiFi yang sama.
   - Jika tidak ada WiFi sekolah: Laptop guru (atau salah satu HP) cukup menyalakan **Tethering / Hotspot Portabel**, lalu semua murid tersambung ke hotspot tersebut. *(Hemat kuota internet karena komunikasi multiplayer diproses langsung di jaringan lokal server!)*
3. **Menyalakan Server Game**:
   - Buka folder game di laptop, jalankan perintah `npm start`.
   - Layar akan menampilkan alamat IP yang bisa diakses murid, contoh: `http://192.168.1.15:3000`.

---

## 2. Langkah Demi Langkah Guru Mengedit Soal ("Tinggal Edit Soal Aja!")
1. Buka browser (Google Chrome / Edge) di laptop guru, masuk ke alamat: `http://localhost:3000/guru.html`.
2. Klik tab **"📚 Bank Soal & Materi"**:
   - Guru bisa langsung memilih salah satu kuis yang sudah tersedia (IPA, Matematika, IPS, dll.).
   - Klik tombol **"✏️ Edit Soal"** pada kuis yang dipilih.
3. Di tab editor:
   - Ubah judul kuis sesuai mata pelajaran yang sedang diajarkan di kelas hari itu.
   - Untuk mengubah pertanyaan yang sudah ada, klik **"✏️ Edit"** pada kartu soal.
   - Ubah teks pertanyaan, pilihan A, B, C, D, tentukan kunci jawaban (A/B/C/D), batas waktu detik, serta tulis pembahasan singkat.
   - Klik **"Simpan Soal"**, lalu klik tombol hijau **"💾 Simpan Perubahan"**.
4. Guru juga dapat menambah soal baru sebanyak yang diinginkan dengan menekan tombol **"+ Tambah Soal"**.

---

## 3. Langkah Meluncurkan Room Kelas & Mengajak Siswa Bergabung
1. Di Dashboard Guru, klik tombol **"🚀 Luncurkan Room Kelas"**.
2. Layar proyektor akan berpindah ke arena stadium 3D dan menampilkan **KODE PIN 4 HURUF/ANGKA** (contoh: `KL89`) di bagian atas layar.
3. Guru menginstruksikan seluruh siswa di kelas:
   - *"Anak-anak, buka browser di HP masing-masing dan ketik alamat yang ada di papan tulis: `http://192.168.1.15:3000`"*
   - Siswa memasukkan **PIN**, mengetik **Nama Lengkap**, memilih warna baju avatar dan topi kesukaan, lalu menekan **"Masuk Arena 3D"**.
4. Di layar proyektor guru, avatar siswa-siswi yang bergabung akan bermunculan di arena stadium 3D secara langsung (*real-time*). Guru dapat melihat jumlah siswa yang sudah masuk.

---

## 4. Memandu Jalannya Permainan Mabar Kelas
1. Setelah seluruh siswa masuk, guru menekan tombol **"▶️ Mulai Kuis"** pada panel kontrol di layar proyektor.
2. Soal nomor 1 akan muncul di layar jumbotron 3D dan di layar HP masing-masing siswa bersamaan dengan hitungan mundur waktu (misal 20 detik).
3. **Aksi Siswa**:
   - Siswa mengendalikan joystick virtual di HP mereka untuk menggerakkan avatar berlari ke platform pilihan mereka:
     - **Platform Merah** = Opsi A
     - **Platform Biru** = Opsi B
     - **Platform Kuning** = Opsi C
     - **Platform Hijau** = Opsi D
   - Siswa harus memastikan avatarnya sudah berdiri di atas platform yang benar sebelum waktu hitung mundur habis.
4. **Pembukaan Jawaban**:
   - Saat waktu habis, platform yang salah akan berguncang dan turun ke bawah, sedangkan platform yang benar akan terangkat ke atas disertai semburan kembang api emas dan suara kemenangan!
   - Layar proyektor akan memunculkan ringkasan: berapa siswa yang menjawab benar, siapa yang tercepat, serta penjelasan materi.
   - Guru dapat memanfaatkan momen ini untuk memberikan penguatan materi selama 1–2 menit sebelum menekan tombol **"⏭️ Soal Berikutnya"**.
5. **Akhir Permainan & Podium Juara**:
   - Di akhir seluruh soal, layar proyektor akan memunculkan selebrasi **Podium Juara 1, 2, dan 3** disertai hujan konfeti!
   - Guru menekan tombol **"📥 Download Rekap Nilai Murid"** untuk mengunduh daftar nilai seluruh siswa dalam format file Excel (`.csv`) untuk arsip penilaian harian.
