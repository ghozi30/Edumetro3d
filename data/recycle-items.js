// Bank Item Sampah Mini Game #09: Pabrik Daur Ulang Kilat (IPA Biologi & Lingkungan — SD & SMP)
// Kategori: 'organik' (Hijau) | 'anorganik' (Biru/Kuning) | 'b3' (Merah)
// Minimal 18 item per jenjang lengkap dengan tipe bentuk 3D & edukasi singkat.

const RECYCLE_ITEMS = {
  sd: [
    // 6 ORGANIK (SD)
    { name: 'Kulit Pisang', category: 'organik', shape: 'banana', color: 0xfacc15, edu: 'Kulit pisang mudah membusuk alami menjadi kompos -> masuk ORGANIK!' },
    { name: 'Daun Kering', category: 'organik', shape: 'leaf', color: 0x65a30d, edu: 'Daun kering berasal dari tumbuhan alami -> masuk ORGANIK!' },
    { name: 'Sisa Nasi', category: 'organik', shape: 'bowl', color: 0xf8fafc, edu: 'Sisa makanan dapat terurai mikroorganisme -> masuk ORGANIK!' },
    { name: 'Tulang Ikan', category: 'organik', shape: 'leaf', color: 0xe2e8f0, edu: 'Sisa hewan/tulang ikan termasuk sampah hayati -> masuk ORGANIK!' },
    { name: 'Cangkang Telur', category: 'organik', shape: 'sphere', color: 0xfef3c7, edu: 'Cangkang telur alami kaya kalsium untuk pupuk -> masuk ORGANIK!' },
    { name: 'Sayur Layu', category: 'organik', shape: 'leaf', color: 0x22c55e, edu: 'Sayuran sisa dapur mudah terurai di tanah -> masuk ORGANIK!' },

    // 6 ANORGANIK (SD)
    { name: 'Botol Plastik', category: 'anorganik', shape: 'bottle', color: 0x38bdf8, edu: 'Botol plastik bisa didaur ulang pabrik -> masuk ANORGANIK!' },
    { name: 'Kaleng Soda', category: 'anorganik', shape: 'can', color: 0xef4444, edu: 'Kaleng logam bekas minuman dapat dilebur ulang -> masuk ANORGANIK!' },
    { name: 'Kardus Bekas', category: 'anorganik', shape: 'box', color: 0xd97706, edu: 'Kardus & kertas kering bisa didaur ulang -> masuk ANORGANIK!' },
    { name: 'Kertas Koran', category: 'anorganik', shape: 'box', color: 0xcbd5e1, edu: 'Kertas koran bekas dapat dibuat bubur kertas baru -> masuk ANORGANIK!' },
    { name: 'Kantong Kresek', category: 'anorganik', shape: 'sphere', color: 0x60a5fa, edu: 'Plastik kresek sulit terurai tanah -> masuk ANORGANIK!' },
    { name: 'Gelas Plastik', category: 'anorganik', shape: 'can', color: 0x7dd3fc, edu: 'Gelas minuman plastik dapat didaur ulang -> masuk ANORGANIK!' },

    // 6 B3 (SD)
    { name: 'Baterai Bekas', category: 'b3', shape: 'battery', color: 0x1e293b, edu: 'Baterai bekas mengandung logam berat beracun -> masuk B3!' },
    { name: 'Bohlam Pecah', category: 'b3', shape: 'bulb', color: 0xfef08a, edu: 'Bohlam mengandung merkuri/filamen berbahaya -> masuk B3!' },
    { name: 'Obat Kedaluwarsa', category: 'b3', shape: 'bottle', color: 0xf43f5e, edu: 'Obat kedaluwarsa mengandung zat kimia berbahaya -> masuk B3!' },
    { name: 'Semprot Nyamuk', category: 'b3', shape: 'can', color: 0xdc2626, edu: 'Kaleng aerosol obat nyamuk mudah meledak & beracun -> masuk B3!' },
    { name: 'Termometer Raksa', category: 'b3', shape: 'battery', color: 0x94a3b8, edu: 'Air raksa (merkuri) sangat beracun bagi manusia -> masuk B3!' },
    { name: 'Botol Pemutih', category: 'b3', shape: 'bottle', color: 0xec4899, edu: 'Cairan pemutih pakaian bersifat korosif & kimia kuat -> masuk B3!' }
  ],

  smp: [
    // 6 ORGANIK (SMP)
    { name: 'Kompos Daun', category: 'organik', shape: 'leaf', color: 0x4d7c0f, edu: 'Kompos daun adalah bahan organik biodegradable -> masuk ORGANIK!' },
    { name: 'Ampas Kopi', category: 'organik', shape: 'bowl', color: 0x78350f, edu: 'Ampas kopi kaya nitrogen alami untuk tanah -> masuk ORGANIK!' },
    { name: 'Serbuk Kayu', category: 'organik', shape: 'box', color: 0xb45309, edu: 'Serbuk gergaji kayu alami dapat terurai biologis -> masuk ORGANIK!' },
    { name: 'Ranting Pohon', category: 'organik', shape: 'leaf', color: 0x854d0e, edu: 'Ranting tanaman termasuk biomassa alami -> masuk ORGANIK!' },
    { name: 'Kulit Buah', category: 'organik', shape: 'banana', color: 0xfb923c, edu: 'Kulit buah bisa diolah menjadi eco-enzyme -> masuk ORGANIK!' },
    { name: 'Sisa Makanan', category: 'organik', shape: 'bowl', color: 0xfde68a, edu: 'Limbah makanan rumah tangga terurai secara aerob -> masuk ORGANIK!' },

    // 6 ANORGANIK (SMP)
    { name: 'Styrofoam', category: 'anorganik', shape: 'box', color: 0xf8fafc, edu: 'Styrofoam (polistirena) sangat sulit terurai -> masuk ANORGANIK!' },
    { name: 'Pecahan Kaca', category: 'anorganik', shape: 'sphere', color: 0x38bdf8, edu: 'Kaca bening dapat dilebur ulang menjadi botol baru -> masuk ANORGANIK!' },
    { name: 'Kaleng Aluminium', category: 'anorganik', shape: 'can', color: 0x94a3b8, edu: 'Logam aluminium 100% dapat didaur ulang -> masuk ANORGANIK!' },
    { name: 'Botol Kaca', category: 'anorganik', shape: 'bottle', color: 0x06b6d4, edu: 'Botol kaca dapat disterilisasi atau dilebur ulang -> masuk ANORGANIK!' },
    { name: 'Pipa PVC', category: 'anorganik', shape: 'battery', color: 0x64748b, edu: 'Pipa plastik PVC termasuk polimer sintetis -> masuk ANORGANIK!' },
    { name: 'Kertas Karton', category: 'anorganik', shape: 'box', color: 0xf59e0b, edu: 'Karton bekas dapat diproses ulang di pabrik kertas -> masuk ANORGANIK!' },

    // 6 B3 (SMP)
    { name: 'Minyak Jelantah', category: 'b3', shape: 'bottle', color: 0xca8a04, edu: 'Minyak jelantah mencemari air & tanah, perlu pengolahan khusus -> masuk B3!' },
    { name: 'Limbah Elektronik', category: 'b3', shape: 'box', color: 0x1e293b, edu: 'E-waste mengandung timbal & merkuri beracun -> masuk B3!' },
    { name: 'Botol Pestisida', category: 'b3', shape: 'bottle', color: 0xef4444, edu: 'Pestisida mengandung racun kimia pembasmi hama -> masuk B3!' },
    { name: 'Aki Bekas', category: 'b3', shape: 'box', color: 0x334155, edu: 'Aki bekas berisi asam sulfat & timbal korosif -> masuk B3!' },
    { name: 'Kaleng Cat Sisa', category: 'b3', shape: 'can', color: 0xe11d48, edu: 'Cat mengandung pelarut kimia mudah terbakar & beracun -> masuk B3!' },
    { name: 'Jarum Medis', category: 'b3', shape: 'bulb', color: 0xf43f5e, edu: 'Limbah medis tajam & infeksius wajib masuk wadah B3!' }
  ]
};

module.exports = { RECYCLE_ITEMS };
