// Bank Soal Panggilan Cepat untuk Mini Game #06: Lantai Lava Tata Surya (IPA Astronomi SD & SMP)
// 8 Pulau Planet: merkurius, venus, bumi, mars, jupiter, saturnus, uranus, neptunus

const LAVA_PLANETS = [
  { id: 'merkurius', name: 'Merkurius', color: 0x94a3b8, glow: 0xcbd5e1, hasRing: false },
  { id: 'venus',     name: 'Venus',     color: 0xfde047, glow: 0xfef08a, hasRing: false },
  { id: 'bumi',      name: 'Bumi',      color: 0x0ea5e9, glow: 0x34d399, hasRing: false },
  { id: 'mars',      name: 'Mars',      color: 0xef4444, glow: 0xfca5a5, hasRing: false },
  { id: 'jupiter',   name: 'Jupiter',   color: 0xf97316, glow: 0xfdba74, hasRing: false },
  { id: 'saturnus',  name: 'Saturnus',  color: 0xeab308, glow: 0xfef08a, hasRing: true },
  { id: 'uranus',    name: 'Uranus',    color: 0x22d3ee, glow: 0x67e8f9, hasRing: true },
  { id: 'neptunus',  name: 'Neptunus',  color: 0x2563eb, glow: 0x60a5fa, hasRing: false }
];

const LAVA_CLUES_BY_LEVEL = {
  sd: [
    { clue: 'Lompat ke planet yang punya cincin paling besar dan jelas!', planetId: 'saturnus', info: 'Saturnus terkenal dengan cincin es dan batuannya yang paling jelas.' },
    { clue: 'Lompat ke planet TERBESAR di seluruh Tata Surya!', planetId: 'jupiter', info: 'Jupiter adalah planet raksasa gas terbesar di Tata Surya.' },
    { clue: 'Lompat ke planet yang dijuluki "Planet Merah"!', planetId: 'mars', info: 'Mars berwarna kemerahan karena kandungan oksida besi di permukaannya.' },
    { clue: 'Lompat ke planet yang letaknya PALING DEKAT dengan Matahari!', planetId: 'merkurius', info: 'Merkurius adalah planet pertama (terdekat) dari Matahari.' },
    { clue: 'Lompat ke satu-satunya planet yang dihuni makhluk hidup!', planetId: 'bumi', info: 'Bumi memiliki air cair dan atmosfer oksigen penunjang kehidupan.' },
    { clue: 'Lompat ke planet yang dijuluki "Bintang Kejora"!', planetId: 'venus', info: 'Venus tampak sangat terang di langit pagi atau senja.' },
    { clue: 'Lompat ke planet yang letaknya PALING JAUH dari Matahari!', planetId: 'neptunus', info: 'Neptunus adalah planet ke-8 (terjauh) di Tata Surya.' },
    { clue: 'Lompat ke planet ke-7 dari Matahari yang berwarna biru muda!', planetId: 'uranus', info: 'Uranus adalah planet ketujuh dari Matahari dengan suhu sangat dingin.' },
    { clue: 'Lompat ke planet TERKECIL di dalam Tata Surya!', planetId: 'merkurius', info: 'Merkurius adalah planet dengan diameter terkecil di Tata Surya.' },
    { clue: 'Lompat ke planet yang memiliki satelit alami bernama BULAN!', planetId: 'bumi', info: 'Bulan adalah satu-satunya satelit alami milik planet Bumi.' },
    { clue: 'Lompat ke planet ke-5 dari Matahari (setelah Mars)!', planetId: 'jupiter', info: 'Urutan planet ke-5 dari Matahari adalah Jupiter.' },
    { clue: 'Lompat ke planet ke-6 dari Matahari (setelah Jupiter)!', planetId: 'saturnus', info: 'Saturnus berada di urutan ke-6 dari Matahari.' }
  ],
  smp: [
    { clue: 'Lompat ke planet terpanas akibat efek rumah kaca atmosfer CO2 tebal!', planetId: 'venus', info: 'Suhu permukaan Venus melebihi 460 derajat C karena efek rumah kaca ekstrem.' },
    { clue: 'Lompat ke planet raksasa es yang sumbu rotasinya MIRING hampir 98 derajat!', planetId: 'uranus', info: 'Sumbu rotasi Uranus miring 98 derajat sehingga tampak menggelinding.' },
    { clue: 'Lompat ke planet yang memiliki badai abadi Bintik Merah Raksasa!', planetId: 'jupiter', info: 'Great Red Spot di Jupiter adalah badai raksasa yang lebih besar dari Bumi.' },
    { clue: 'Lompat ke planet yang memiliki gunung tertinggi Olympus Mons!', planetId: 'mars', info: 'Gunung berapi Olympus Mons di Mars tingginya 3 kali Gunung Everest.' },
    { clue: 'Lompat ke planet yang berotasi berlawanan arah (dari timur ke barat)!', planetId: 'venus', info: 'Di Venus, Matahari terbit dari barat dan terbenam di timur (rotasi retrograde).' },
    { clue: 'Lompat ke planet dengan angin supersonik tercepat di Tata Surya!', planetId: 'neptunus', info: 'Neptunus memiliki badai angin berkecepatan lebih dari 2.000 km/jam.' },
    { clue: 'Lompat ke planet yang massa jenis rata-ratanya lebih kecil dari air!', planetId: 'saturnus', info: 'Saturnus tersusun dari gas ringan sehingga massa jenisnya < 1 g/cm3.' },
    { clue: 'Lompat ke planet dengan periode revolusi paling singkat (88 hari)!', planetId: 'merkurius', info: 'Karena paling dekat Matahari, Merkurius mengelilingi Matahari hanya dalam 88 hari.' },
    { clue: 'Lompat ke planet yang memiliki satelit alami Phobos dan Deimos!', planetId: 'mars', info: 'Mars memiliki dua bulan kecil bernama Phobos dan Deimos.' },
    { clue: 'Lompat ke planet yang memiliki satelit terbesar bernama Ganymede!', planetId: 'jupiter', info: 'Ganymede milik Jupiter adalah satelit alami terbesar di Tata Surya.' },
    { clue: 'Lompat ke planet yang memiliki lapisan ozon pelindung radiasi UV!', planetId: 'bumi', info: 'Lapisan ozon di stratosfer Bumi melindungi kehidupan dari sinar UV.' },
    { clue: 'Lompat ke planet dengan periode revolusi terlama (sekitar 165 tahun Bumi)!', planetId: 'neptunus', info: 'Neptunus membutuhkan 165 tahun Bumi untuk satu kali mengorbit Matahari.' }
  ]
};

const LAVA_CLUES = [...LAVA_CLUES_BY_LEVEL.sd, ...LAVA_CLUES_BY_LEVEL.smp];

module.exports = { LAVA_PLANETS, LAVA_CLUES, LAVA_CLUES_BY_LEVEL };
