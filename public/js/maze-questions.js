// Bank Soal Modular Mini Game #11: Labirin Gerbang Matematika (SD & SMP)
// 3 Tipe Gerbang: 'coop' (Tipe A: 2 saklar bersamaan), 'single' (Tipe B: 1 saklar syarat), 'sequence' (Tipe C: 3 saklar berurutan)

const MAZE_QUESTIONS = {
  sd: {
    coop: [
      { id: 'sd-a1', op: '+', target: 14, prompt: '[ ? ] + [ ? ] = 14', plates: [6, 8, 5, 9, 3, 7], hint: 'Cari 2 angka yang jika dijumlahkan hasilnya 14!' },
      { id: 'sd-a2', op: '×', target: 24, prompt: '[ ? ] × [ ? ] = 24', plates: [4, 6, 3, 5, 7, 9], hint: 'Cari 2 angka yang jika dikalikan hasilnya 24!' },
      { id: 'sd-a3', op: '+', target: 20, prompt: '[ ? ] + [ ? ] = 20', plates: [12, 8, 7, 11, 5, 6], hint: 'Cari 2 angka yang jumlahnya tepat 20!' },
      { id: 'sd-a4', op: '×', target: 36, prompt: '[ ? ] × [ ? ] = 36', plates: [4, 9, 5, 7, 8, 3], hint: 'Cari 2 angka yang hasil kalinya 36!' },
      { id: 'sd-a5', op: '+', target: 25, prompt: '[ ? ] + [ ? ] = 25', plates: [16, 9, 14, 8, 12, 7], hint: 'Cari 2 angka yang jika ditambah hasilnya 25!' },
      { id: 'sd-a6', op: '×', target: 18, prompt: '[ ? ] × [ ? ] = 18', plates: [3, 6, 4, 5, 7, 8], hint: 'Cari 2 angka yang hasil kalinya 18!' },
      { id: 'sd-a7', op: '+', target: 30, prompt: '[ ? ] + [ ? ] = 30', plates: [17, 13, 15, 11, 9, 14], hint: 'Cari 2 angka yang jumlahnya 30!' },
      { id: 'sd-a8', op: '×', target: 42, prompt: '[ ? ] × [ ? ] = 42', plates: [6, 7, 4, 8, 9, 5], hint: 'Cari 2 angka yang jika dikalikan hasilnya 42!' }
    ],
    single: [
      { id: 'sd-b1', prompt: 'Injak bilangan KELIPATAN 7!', plates: [15, 21, 24, 30, 18], answer: 21, hint: '21 = 7 × 3' },
      { id: 'sd-b2', prompt: 'Injak bilangan PRIMA!', plates: [9, 15, 13, 21, 25], answer: 13, hint: '13 hanya habis dibagi 1 dan 13' },
      { id: 'sd-b3', prompt: 'Injak hasil dari 45 - 18!', plates: [23, 27, 29, 33, 17], answer: 27, hint: '45 - 18 = 27' },
      { id: 'sd-b4', prompt: 'Injak hasil dari 8 × 7!', plates: [48, 54, 56, 63, 64], answer: 56, hint: '8 × 7 = 56' },
      { id: 'sd-b5', prompt: 'Injak bilangan GENAP kelipatan 6!', plates: [14, 22, 18, 26, 32], answer: 18, hint: '18 = 6 × 3 dan genap' },
      { id: 'sd-b6', prompt: 'Injak hasil dari 72 ÷ 8!', plates: [7, 8, 9, 11, 12], answer: 9, hint: '72 ÷ 8 = 9' },
      { id: 'sd-b7', prompt: 'Injak bilangan GANJIL terbesar!', plates: [44, 39, 41, 46, 35], answer: 41, hint: '41 adalah bilangan ganjil paling besar di sini' },
      { id: 'sd-b8', prompt: 'Injak hasil dari 36 + 29!', plates: [55, 63, 65, 67, 75], answer: 65, hint: '36 + 29 = 65' }
    ],
    sequence: [
      { id: 'sd-c1', prompt: 'Lanjutkan pola: 4, 8, 12, ... (3 angka berurutan!)', plates: [16, 20, 24, 14, 22], sequence: [16, 20, 24], hint: 'Pola bertambah +4: 16 → 20 → 24' },
      { id: 'sd-c2', prompt: 'Injak berurutan dari TERKECIL ke TERBESAR!', plates: [19, 7, 25, 13, 31], sequence: [7, 13, 19], targetCount: 3, exactSeq: [7, 13, 19], hint: 'Ambil 3 terkecil berurutan: 7 → 13 → 19' },
      { id: 'sd-c3', prompt: 'Lanjutkan pola: 5, 10, 15, ... (3 angka berurutan!)', plates: [20, 25, 30, 18, 35], sequence: [20, 25, 30], hint: 'Pola kelipatan 5: 20 → 25 → 30' },
      { id: 'sd-c4', prompt: 'Lanjutkan pola: 3, 6, 9, ... (3 angka berurutan!)', plates: [12, 15, 18, 10, 21], sequence: [12, 15, 18], hint: 'Pola kelipatan 3: 12 → 15 → 18' },
      { id: 'sd-c5', prompt: 'Hitung mundur: 30, 25, 20, ... (3 angka berurutan!)', plates: [15, 10, 5, 12, 8], sequence: [15, 10, 5], hint: 'Berkurang 5: 15 → 10 → 5' },
      { id: 'sd-c6', prompt: 'Lanjutkan pola: 2, 4, 6, ... (3 angka berurutan!)', plates: [8, 10, 12, 7, 14], sequence: [8, 10, 12], hint: 'Bilangan genap berurutan: 8 → 10 → 12' }
    ]
  },

  smp: {
    coop: [
      { id: 'smp-a1', op: '+', target: -5, prompt: '[ ? ] + [ ? ] = -5', plates: [-8, 3, -4, 2, -9, 6], hint: 'Contoh: (-8) + 3 = -5' },
      { id: 'smp-a2', op: '×', target: -36, prompt: '[ ? ] × [ ? ] = -36', plates: [-9, 4, -6, 5, 3, -8], hint: 'Negatif × Positif = Negatif: (-9) × 4 = -36' },
      { id: 'smp-a3', op: '+', target: -12, prompt: '[ ? ] + [ ? ] = -12', plates: [-7, -5, 4, -3, 8, -2], hint: '(-7) + (-5) = -12' },
      { id: 'smp-a4', op: '×', target: 48, prompt: '[ ? ] × [ ? ] = 48', plates: [-6, -8, 5, -4, 9, -3], hint: 'Negatif × Negatif = Positif: (-6) × (-8) = 48' },
      { id: 'smp-a5', op: '+', target: 4, prompt: '[ ? ] + [ ? ] = 4', plates: [-5, 9, -2, 3, -7, 8], hint: '(-5) + 9 = 4' },
      { id: 'smp-a6', op: '×', target: -24, prompt: '[ ? ] × [ ? ] = -24', plates: [6, -4, 3, -5, 7, -2], hint: '6 × (-4) = -24' },
      { id: 'smp-a7', op: '+', target: -3, prompt: '[ ? ] + [ ? ] = -3', plates: [-10, 7, -6, 5, 4, -1], hint: '(-10) + 7 = -3' },
      { id: 'smp-a8', op: '×', target: -45, prompt: '[ ? ] × [ ? ] = -45', plates: [-9, 5, -6, 8, 4, -7], hint: '(-9) × 5 = -45' }
    ],
    single: [
      { id: 'smp-b1', prompt: 'Injak nilai x dari 3x - 5 = 16!', plates: [5, 6, 7, 8, 9], answer: 7, hint: '3x = 21 → x = 7' },
      { id: 'smp-b2', prompt: 'Injak hasil akar kuadrat √144!', plates: [11, 12, 13, 14, 16], answer: 12, hint: '12 × 12 = 144' },
      { id: 'smp-b3', prompt: 'Injak nilai x dari 2x + 7 = 19!', plates: [4, 5, 6, 7, 8], answer: 6, hint: '2x = 12 → x = 6' },
      { id: 'smp-b4', prompt: 'Injak FPB dari 24 dan 36!', plates: [6, 8, 12, 18, 24], answer: 12, hint: 'Faktor persekutuan terbesar 24 & 36 adalah 12' },
      { id: 'smp-b5', prompt: 'Injak KPK dari 6 dan 8!', plates: [16, 18, 24, 32, 48], answer: 24, hint: 'Kelipatan persekutuan terkecil 6 & 8 adalah 24' },
      { id: 'smp-b6', prompt: 'Injak hasil dari (-4)² + 5!', plates: [-11, 13, 21, -21, 19], answer: 21, hint: '(-4)² = 16, lalu 16 + 5 = 21' },
      { id: 'smp-b7', prompt: 'Injak faktor prima terbesar dari 30!', plates: [2, 3, 5, 6, 15], answer: 5, hint: '30 = 2 × 3 × 5, faktor prima terbesar = 5' },
      { id: 'smp-b8', prompt: 'Perbandingan A:B = 2:5. Jika A = 10, injak nilai B!', plates: [15, 20, 25, 30, 35], answer: 25, hint: 'B = (5/2) × 10 = 25' }
    ],
    sequence: [
      { id: 'smp-c1', prompt: 'Urutkan bilangan bulat dari TERKECIL ke TERBESAR (3 angka)!', plates: [-9, -3, 2, 5, 0], sequence: [-9, -3, 0], hint: 'Dari paling kiri di garis bilangan: -9 → -3 → 0' },
      { id: 'smp-c2', prompt: 'Lanjutkan barisan aritmatika: -4, -1, 2, ... (3 suku)!', plates: [5, 8, 11, 4, 9], sequence: [5, 8, 11], hint: 'Beda +3: 5 → 8 → 11' },
      { id: 'smp-c3', prompt: 'Urutkan desimal dari TERKECIL: 0.25, 0.5, 0.75!', plates: [0.25, 0.5, 0.75, 1.2, 0.9], sequence: [0.25, 0.5, 0.75], hint: '0.25 → 0.5 → 0.75' },
      { id: 'smp-c4', prompt: 'Lanjutkan pola kuadrat: 1, 4, 9, ... (3 angka)!', plates: [16, 25, 36, 18, 30], sequence: [16, 25, 36], hint: '4²=16 → 5²=25 → 6²=36' },
      { id: 'smp-c5', prompt: 'Lanjutkan barisan turun: 10, 6, 2, ... (3 suku)!', plates: [-2, -6, -10, 0, -4], sequence: [-2, -6, -10], hint: 'Beda -4: -2 → -6 → -10' },
      { id: 'smp-c6', prompt: 'Lanjutkan pola geometri: 2, 4, 8, ... (3 suku)!', plates: [16, 32, 64, 24, 48], sequence: [16, 32, 64], hint: 'Dikali 2: 16 → 32 → 64' }
    ]
  }
};

function shuffleMazeArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bangun 5 Gerbang Berurutan (Mencakup Tipe A, Tipe B, dan Tipe C di setiap permainan!)
function generateMazeGates(level = 'sd') {
  const bank = MAZE_QUESTIONS[level === 'smp' ? 'smp' : 'sd'];
  const coops = shuffleMazeArr(bank.coop);
  const singles = shuffleMazeArr(bank.single);
  const seqs = shuffleMazeArr(bank.sequence);

  // Urutan 5 Zona: B (pemanasan) -> A (co-op) -> C (berantai) -> A (co-op) -> B (final)
  const chosen = [
    { type: 'single', ...singles[0] },
    { type: 'coop', ...coops[0] },
    { type: 'sequence', ...seqs[0] },
    { type: 'coop', ...coops[1] },
    { type: 'single', ...singles[1] }
  ];

  return chosen.map((g, idx) => ({
    index: idx,
    type: g.type,
    id: g.id,
    op: g.op || null,
    target: g.target !== undefined ? g.target : null,
    answer: g.answer !== undefined ? g.answer : null,
    sequence: g.sequence ? [...g.sequence] : null,
    prompt: g.prompt,
    hint: g.hint,
    plates: shuffleMazeArr(g.plates),
    open: false,
    openedBy: [],
    // State dinamis Co-op (Tipe A) & Sequence (Tipe C)
    heldPlateIdx: null,
    heldValue: null,
    heldById: null,
    heldByName: null,
    heldUntil: 0,
    seqProgress: [], // nilai yang sudah benar diinjak berurutan
    seqContributors: []
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAZE_QUESTIONS, generateMazeGates };
} else if (typeof window !== 'undefined') {
  window.MAZE_QUESTIONS = MAZE_QUESTIONS;
  window.generateMazeGates = generateMazeGates;
}
