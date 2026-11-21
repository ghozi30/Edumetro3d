// Registry Terpusat 12 Gedung Mini Games di Kota EduMetro 3D (Zero Emoji — Lucide Vector Icons)

const CITY_DISTRICTS = {
  sains: {
    id: 'sains',
    name: 'Distrik Sains & Alam',
    shortName: 'Utara · Sains',
    icon: 'flask',
    color: '#38bdf8',
    hex: 0x38bdf8,
    accentHex: 0x0284c7
  },
  matematika: {
    id: 'matematika',
    name: 'Distrik Logika & Matematika',
    shortName: 'Timur · Matematika',
    icon: 'layers',
    color: '#f59e0b',
    hex: 0xf59e0b,
    accentHex: 0xd97706
  },
  bahasa: {
    id: 'bahasa',
    name: 'Distrik Bahasa & Ekologi',
    shortName: 'Selatan · Bahasa',
    icon: 'book',
    color: '#a855f7',
    hex: 0xa855f7,
    accentHex: 0x9333ea
  },
  kreatif: {
    id: 'kreatif',
    name: 'Distrik Kafe, Robotika & Budaya',
    shortName: 'Barat · Kreatif',
    icon: 'cpu',
    color: '#ec4899',
    hex: 0xec4899,
    accentHex: 0xdb2777
  }
};

const MINIGAMES_REGISTRY = [
  // ================= SISI UTARA (Z < 0) =================
  {
    id: 'mg-01',
    number: 1,
    district: 'sains',
    icon: 'trophy',
    name: 'Stadium Kuis Lari 3D',
    subject: 'Multi-Mapel (IPA / MTK / IPS)',
    desc: 'Berlari bersama satu kelas memilih platform jawaban A, B, C, atau D sebelum waktu habis.',
    status: 'ready',
    url: 'game.html?game=mg-01',
    teacherUrl: 'guru.html?game=mg-01',
    requiresPin: false,
    pos: { x: -20, z: -42 },
    facing: 0,
    size: { w: 11, h: 10.5, d: 9.5 },
    color: 0x60a5fa
  },
  {
    id: 'mg-02',
    number: 2,
    district: 'sains',
    icon: 'compass',
    name: 'Observatorium Tata Surya',
    subject: 'IPA · Astronomi',
    desc: 'Jelajahi arena luar angkasa 3D dan lompati jembatan cahaya menuju planet jawaban yang benar.',
    status: 'ready',
    url: 'game.html?game=mg-02',
    teacherUrl: 'guru.html?game=mg-02',
    requiresPin: false,
    pos: { x: 0, z: -44 },
    facing: 0,
    size: { w: 10.5, h: 14.5, d: 9.5 },
    color: 0xa78bfa
  },
  {
    id: 'mg-03',
    number: 3,
    district: 'sains',
    icon: 'flask',
    name: 'Lab Reaksi Kimia',
    subject: 'IPA · Kimia Dasar',
    desc: 'Masuk ke tabung reaksi kimia yang tepat untuk menyelesaikan misi eksperimen.',
    status: 'ready',
    url: 'game.html?game=mg-03',
    teacherUrl: 'guru.html?game=mg-03',
    requiresPin: false,
    pos: { x: 20, z: -42 },
    facing: 0,
    size: { w: 10.5, h: 9.5, d: 9.5 },
    color: 0xfb923c
  },

  // ================= SISI TIMUR (X > 0) =================
  {
    id: 'mg-04',
    number: 4,
    district: 'matematika',
    icon: 'car',
    name: 'Sirkuit Balap 3 Gerbang',
    subject: 'IPA · Biologi & Alam (3 Lap)',
    desc: 'Balapan mobil 3D Grand Prix satu kelas! Lewati gerbang jawaban benar untuk Turbo Boost.',
    status: 'ready',
    url: 'race.html?game=mg-04',
    teacherUrl: 'guru.html?game=mg-04',
    requiresPin: false,
    pos: { x: 42, z: -20 },
    facing: -Math.PI / 2,
    size: { w: 10.5, h: 10.2, d: 9.5 },
    color: 0x34d399
  },
  {
    id: 'mg-05',
    number: 5,
    district: 'matematika',
    icon: 'layers',
    name: 'Menara Jembatan Matematika',
    subject: 'Matematika · Pecahan SD & SMP',
    desc: 'Jembatan kaca pecahan 8 baris di menara langit. Lompati panel kaca yang benar.',
    status: 'ready',
    url: 'bridge.html?game=mg-05',
    teacherUrl: 'guru.html?game=mg-05',
    requiresPin: false,
    pos: { x: 44, z: 0 },
    facing: -Math.PI / 2,
    size: { w: 10, h: 15.2, d: 9.5 },
    color: 0x38bdf8
  },
  {
    id: 'mg-06',
    number: 6,
    district: 'matematika',
    icon: 'flame',
    name: 'Lantai Lava Tata Surya',
    subject: 'IPA · Astronomi (Battle Royale)',
    desc: 'Lompat ke pulau planet yang tepat dalam 30 detik sebelum lantai ruang angkasa menghilang.',
    status: 'ready',
    url: 'lava.html?game=mg-06',
    teacherUrl: 'guru.html?game=mg-06',
    requiresPin: false,
    pos: { x: 42, z: 20 },
    facing: -Math.PI / 2,
    size: { w: 10.5, h: 12.2, d: 9.5 },
    color: 0xf97316
  },

  // ================= SISI SELATAN (Z > 0) =================
  {
    id: 'mg-07',
    number: 7,
    district: 'bahasa',
    icon: 'layers',
    name: 'Museum Geometri 3D',
    subject: 'Matematika · Bangun Ruang',
    desc: 'Panjat menara museum 6 lantai dengan melompati bangun ruang 3D yang tepat.',
    status: 'ready',
    url: 'geometry.html?game=mg-07',
    teacherUrl: 'guru.html?game=mg-07',
    requiresPin: false,
    pos: { x: 20, z: 42 },
    facing: Math.PI,
    size: { w: 10.5, h: 11.2, d: 9.5 },
    color: 0xfbbf24
  },
  {
    id: 'mg-08',
    number: 8,
    district: 'bahasa',
    icon: 'book',
    name: 'Balai Bahasa — PUEBI',
    subject: 'Bahasa Indonesia · Lampu Merah Hijau',
    desc: 'Berlari saat muncul kata baku dan berhenti total saat muncul kata tidak baku.',
    status: 'ready',
    url: 'puebi.html?game=mg-08',
    teacherUrl: 'guru.html?game=mg-08',
    requiresPin: false,
    pos: { x: 0, z: 44 },
    facing: Math.PI,
    size: { w: 10.5, h: 13.8, d: 9.5 },
    color: 0xc084fc
  },
  {
    id: 'mg-09',
    number: 9,
    district: 'bahasa',
    icon: 'recycle',
    name: 'Stasiun Ekologi — Daur Ulang',
    subject: 'IPA · Biologi & Lingkungan',
    desc: 'Ambil sampah dari konveyor pabrik dan pilah cepat ke mesin Organik, Anorganik, atau B3.',
    status: 'ready',
    url: 'recycle.html?game=mg-09',
    teacherUrl: 'guru.html?game=mg-09',
    requiresPin: false,
    pos: { x: -20, z: 42 },
    facing: Math.PI,
    size: { w: 10.5, h: 9.6, d: 9.5 },
    color: 0x4ade80
  },

  // ================= SISI BARAT (X < 0) =================
  {
    id: 'mg-10',
    number: 10,
    district: 'kreatif',
    icon: 'coffee',
    name: 'Kafe Bahasa Inggris — Dapur Kalimat',
    subject: 'Bahasa Inggris · SD & SMP',
    desc: 'Estafet susun kalimat bahasa Inggris bersama tim di dapur kafe 3D lalu sajikan.',
    status: 'ready',
    url: 'cafe.html?game=mg-10',
    teacherUrl: 'guru.html?game=mg-10',
    requiresPin: false,
    pos: { x: -42, z: 20 },
    facing: Math.PI / 2,
    size: { w: 10.5, h: 10.4, d: 9.5 },
    color: 0xf472b6
  },
  {
    id: 'mg-11',
    number: 11,
    district: 'kreatif',
    icon: 'cpu',
    name: 'Menara Robotika & Logika',
    subject: 'Matematika · Labirin Co-op SD & SMP',
    desc: 'Tembus 5 gerbang laser matematika di labirin futuristik menuju Ruang Trofi.',
    status: 'ready',
    url: 'maze.html?game=mg-11',
    teacherUrl: 'guru.html?game=mg-11',
    requiresPin: false,
    pos: { x: -44, z: 0 },
    facing: Math.PI / 2,
    size: { w: 10.5, h: 14.4, d: 9.5 },
    color: 0x38bdf8
  }
];

window.CITY_DISTRICTS = CITY_DISTRICTS;
window.MINIGAMES_REGISTRY = MINIGAMES_REGISTRY;
