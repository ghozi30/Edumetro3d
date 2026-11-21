// Bank Soal Edukasi Bawaan (Template Siap Pakai untuk Guru)
// Guru bisa langsung memilih kategori ini atau mengeditnya di Dashboard Guru.

const DEFAULT_QUIZ_PACKS = [
  {
    id: 'ipa_sains_tatasurya',
    title: 'IPA Sains: Petualangan Tata Surya & Bumi',
    subject: 'IPA (Sains)',
    grade: 'SD / SMP',
    description: 'Menjelajahi keajaiban planet, gravitasi, dan fenomena alam semesta.',
    questions: [
      {
        question: 'Planet apakah yang memiliki ukuran paling besar di dalam tata surya kita?',
        options: ['Mars', 'Jupiter', 'Saturnus', 'Bumi'],
        correctIndex: 1,
        timeLimit: 20,
        points: 100,
        explanation: 'Jupiter adalah planet terbesar di tata surya dengan diameter sekitar 142.984 km (11 kali diameter Bumi).'
      },
      {
        question: 'Bagian tumbuhan yang bertugas utama melakukan proses fotosintesis adalah...',
        options: ['Akar', 'Batang', 'Daun', 'Bunga'],
        correctIndex: 2,
        timeLimit: 20,
        points: 100,
        explanation: 'Daun memiliki klorofil (zat hijau daun) yang berfungsi menyerap cahaya matahari untuk fotosintesis.'
      },
      {
        question: 'Gaya tarik-menarik yang menyebabkan benda jatuh ke bawah menuju pusat bumi disebut gaya...',
        options: ['Magnet', 'Gesek', 'Pegas', 'Gravitasi'],
        correctIndex: 3,
        timeLimit: 15,
        points: 100,
        explanation: 'Gaya gravitasi bumi menarik semua benda bermassa menuju ke pusat bumi.'
      },
      {
        question: 'Hewan yang mengalami metamorfosis sempurna dalam daur hidupnya adalah...',
        options: ['Kupu-kupu', 'Belalang', 'Kecoa', 'Ayam'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Kupu-kupu melalui fase telur -> ulat (larva) -> kepompong (pupa) -> kupu-kupu dewasa (metamorfosis sempurna).'
      },
      {
        question: 'Peristiwa perputaran bumi pada porosnya sendiri dinamakan...',
        options: ['Revolusi Bumi', 'Rotasi Bumi', 'Gerhana Matahari', 'Pasang Surut'],
        correctIndex: 1,
        timeLimit: 15,
        points: 100,
        explanation: 'Rotasi bumi adalah perputaran bumi pada porosnya yang mengakibatkan terjadinya siang dan malam.'
      }
    ]
  },
  {
    id: 'matematika_seru',
    title: 'Matematika Asyik: Logika & Hitung Cepat',
    subject: 'Matematika',
    grade: 'SD / SMP',
    description: 'Melatih kemampuan hitung cepat, penalaran logika, dan geometri interaktif.',
    questions: [
      {
        question: 'Hasil dari perhitungan: 25 + 15 x 2 adalah...',
        options: ['80', '55', '65', '50'],
        correctIndex: 1,
        timeLimit: 20,
        points: 100,
        explanation: 'Ingat aturan operasi hitung kabataku: perkalian dikerjakan dulu! 15 x 2 = 30, kemudian 25 + 30 = 55.'
      },
      {
        question: 'Sebuah persegi memiliki panjang sisi 8 cm. Berapakah luas persegi tersebut?',
        options: ['32 cm²', '64 cm²', '16 cm²', '48 cm²'],
        correctIndex: 1,
        timeLimit: 20,
        points: 100,
        explanation: 'Rumus luas persegi = sisi x sisi = 8 x 8 = 64 cm².'
      },
      {
        question: 'Bilangan prima terkecil yang lebih besar dari angka 10 adalah...',
        options: ['11', '12', '13', '15'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: '11 adalah bilangan prima terkecil setelah 10 karena hanya dapat dibagi oleh 1 dan dirinya sendiri.'
      },
      {
        question: 'Jika 3 buah apel seharga Rp 15.000, berapakah harga 5 buah apel?',
        options: ['Rp 20.000', 'Rp 22.500', 'Rp 25.000', 'Rp 30.000'],
        correctIndex: 2,
        timeLimit: 20,
        points: 100,
        explanation: '1 apel = 15.000 / 3 = Rp 5.000. Maka 5 apel = 5 x 5.000 = Rp 25.000.'
      },
      {
        question: 'Sudut yang besarnya tepat 90 derajat disebut sudut...',
        options: ['Lancip', 'Tumpul', 'Siku-siku', 'Lurus'],
        correctIndex: 2,
        timeLimit: 15,
        points: 100,
        explanation: 'Sudut 90° adalah sudut siku-siku, sudut <90° lancip, sudut >90° tumpul.'
      }
    ]
  },
  {
    id: 'sejarah_budaya_nusantara',
    title: 'IPS & Sejarah: Budaya dan Kebangsaan Indonesia',
    subject: 'IPS / Sejarah',
    grade: 'SD / SMP / SMA',
    description: 'Mengenal sejarah perjuangan kemerdekaan, keragaman budaya nusantara, dan pahlawan.',
    questions: [
      {
        question: 'Siapakah pahlawan nasional yang dikenal sebagai Bapak Pendidikan Nasional Indonesia?',
        options: ['Ir. Soekarno', 'Ki Hajar Dewantara', 'Mohammad Hatta', 'Jenderal Soedirman'],
        correctIndex: 1,
        timeLimit: 20,
        points: 100,
        explanation: 'Ki Hajar Dewantara (Raden Mas Soewardi Soerjaningrat) mendirikan Taman Siswa dan semboyan Tut Wuri Handayani.'
      },
      {
        question: 'Rumah adat Tongkonan berasal dari suku Toraja di provinsi...',
        options: ['Sulawesi Selatan', 'Sumatera Barat', 'Kalimantan Timur', 'Papua Barat'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Rumah adat Tongkonan yang berbentuk menyerupai perahu berasal dari suku Toraja di Sulawesi Selatan.'
      },
      {
        question: 'Teks Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal...',
        options: ['17 Agustus 1945', '18 Agustus 1945', '28 Oktober 1928', '20 Mei 1908'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: 'Proklamasi Kemerdekaan RI dikumandangkan oleh Bung Karno dan Bung Hatta pada 17 Agustus 1945 di Jl. Pegangsaan Timur 56.'
      },
      {
        question: 'Candi bercorak Buddha terbesar di dunia yang terletak di Magelang, Jawa Tengah adalah...',
        options: ['Candi Prambanan', 'Candi Borobudur', 'Candi Mendut', 'Candi Plaosan'],
        correctIndex: 1,
        timeLimit: 15,
        points: 100,
        explanation: 'Candi Borobudur adalah candi Buddha terbesar di dunia yang dibangun pada masa wangsa Syailendra.'
      }
    ]
  }
];

// Helper functions for quiz data access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_QUIZ_PACKS };
}
