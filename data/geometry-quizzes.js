// Bank Soal Khusus Mini Game #07: Panjat Menara Bangun Ruang (Matematika Geometri SD & SMP)
// 7 Bangun Ruang 3D: kubus, balok, tabung, kerucut, bola, limas, prisma
// Minimal 12 soal akurat per jenjang, setiap soal hanya punya 1 jawaban benar yang pasti.

const GEOMETRY_SHAPES = {
  kubus:   { id: 'kubus',   name: 'Kubus',            color: 0x38bdf8, edge: 0xe0f2fe },
  balok:   { id: 'balok',   name: 'Balok',            color: 0xa78bfa, edge: 0xede9fe },
  tabung:  { id: 'tabung',  name: 'Tabung',           color: 0x34d399, edge: 0xd1fae5 },
  kerucut: { id: 'kerucut', name: 'Kerucut',          color: 0xfb7185, edge: 0xffe4e6 },
  bola:    { id: 'bola',    name: 'Bola',             color: 0xfbbf24, edge: 0xfef3c7 },
  limas:   { id: 'limas',   name: 'Limas Segiempat',  color: 0xf97316, edge: 0xffedd5 },
  prisma:  { id: 'prisma',  name: 'Prisma Segitiga',  color: 0xec4899, edge: 0xfce7f3 }
};

const GEOMETRY_QUIZZES = {
  sd: [
    { q: 'Injak bangun ruang yang punya 2 sisi lingkaran dan 1 selimut melengkung!', shapes: ['kubus', 'tabung', 'kerucut', 'bola'], answer: 'tabung' },
    { q: 'Bangun ruang dengan 1 titik puncak dan alas berbentuk persegi adalah...', shapes: ['limas', 'prisma', 'balok', 'tabung'], answer: 'limas' },
    { q: 'Bangun ruang yang memiliki 6 sisi berbentuk persegi yang SEMUANYA sama besar!', shapes: ['balok', 'kubus', 'prisma', 'limas'], answer: 'kubus' },
    { q: 'Bangun ruang yang TIDAK memiliki rusuk dan TIDAK memiliki titik sudut sama sekali!', shapes: ['tabung', 'kerucut', 'bola', 'kubus'], answer: 'bola' },
    { q: 'Bangun ruang yang alasnya berbentuk lingkaran dan memiliki 1 titik puncak (seperti topi ulang tahun)!', shapes: ['tabung', 'bola', 'kerucut', 'limas'], answer: 'kerucut' },
    { q: 'Bangun ruang yang memiliki 2 sisi segitiga sejajar (alas dan tutup) serta 3 sisi tegak!', shapes: ['prisma', 'limas', 'kubus', 'balok'], answer: 'prisma' },
    { q: 'Bangun ruang seperti kotak sepatu yang memiliki panjang, lebar, dan tinggi berbeda!', shapes: ['kubus', 'balok', 'tabung', 'bola'], answer: 'balok' },
    { q: 'Bangun ruang yang bentuknya mirip Piramida Mesir (memiliki 5 sisi dan 8 rusuk)!', shapes: ['prisma', 'kerucut', 'limas', 'kubus'], answer: 'limas' },
    { q: 'Bangun ruang seperti kaleng susu yang memiliki 3 sisi dan 2 rusuk lengkung!', shapes: ['bola', 'kerucut', 'tabung', 'balok'], answer: 'tabung' },
    { q: 'Bangun ruang yang bentuknya mirip tenda kemah (memiliki 9 rusuk dan 6 titik sudut)!', shapes: ['prisma', 'limas', 'kubus', 'tabung'], answer: 'prisma' },
    { q: 'Bangun ruang yang bentuknya seperti dadu (memiliki 12 rusuk sama panjang)!', shapes: ['balok', 'kubus', 'kerucut', 'bola'], answer: 'kubus' },
    { q: 'Bangun ruang yang bentuknya mirip kelereng dan hanya memiliki 1 sisi lengkung!', shapes: ['tabung', 'kerucut', 'bola', 'limas'], answer: 'bola' }
  ],

  smp: [
    { q: 'Bangun ruang dengan rumus volume V = 1/3 × π × r² × t adalah...', shapes: ['tabung', 'kerucut', 'bola', 'limas'], answer: 'kerucut' },
    { q: 'Bangun ruang dengan rumus volume V = π × r² × t adalah...', shapes: ['kerucut', 'bola', 'tabung', 'prisma'], answer: 'tabung' },
    { q: 'Bangun ruang dengan rumus volume V = 4/3 × π × r³ adalah...', shapes: ['bola', 'tabung', 'kerucut', 'kubus'], answer: 'bola' },
    { q: 'Bangun ruang dengan luas permukaan L = 6 × s² adalah...', shapes: ['balok', 'kubus', 'limas', 'prisma'], answer: 'kubus' },
    { q: 'Bangun ruang dengan rumus volume V = 1/3 × Luas Alas Persegi × t adalah...', shapes: ['prisma', 'kerucut', 'limas', 'balok'], answer: 'limas' },
    { q: 'Bangun ruang dengan rumus volume V = p × l × t adalah...', shapes: ['balok', 'tabung', 'bola', 'kerucut'], answer: 'balok' },
    { q: 'Bangun ruang dengan rumus volume V = (1/2 × a × t_alas) × T adalah...', shapes: ['limas', 'prisma', 'tabung', 'kubus'], answer: 'prisma' },
    { q: 'Sebuah bangun ruang memiliki luas selimut L = π × r × s (dengan s = garis pelukis). Bangun apakah itu?', shapes: ['tabung', 'bola', 'kerucut', 'limas'], answer: 'kerucut' },
    { q: 'Bangun ruang yang luas permukaannya L = 4 × π × r² adalah...', shapes: ['bola', 'tabung', 'kerucut', 'prisma'], answer: 'bola' },
    { q: 'Bangun ruang yang panjang diagonal ruangnya tepat s√3 adalah...', shapes: ['kubus', 'prisma', 'limas', 'tabung'], answer: 'kubus' },
    { q: 'Bangun ruang dengan rumus luas selimut L = 2 × π × r × t adalah...', shapes: ['kerucut', 'tabung', 'bola', 'balok'], answer: 'tabung' },
    { q: 'Bangun ruang yang memiliki rumus luas permukaan L = 2(pl + pt + lt) adalah...', shapes: ['balok', 'limas', 'prisma', 'kerucut'], answer: 'balok' }
  ]
};

module.exports = { GEOMETRY_SHAPES, GEOMETRY_QUIZZES };
