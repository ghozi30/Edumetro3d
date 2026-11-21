// Bank Kata Baku & Tidak Baku PUEBI/KBBI untuk Mini Game #08: Lampu Merah, Lampu Hijau PUEBI
// Minimal 25 pasang kata untuk jenjang SD dan 25 pasang kata untuk jenjang SMP.

const PUEBI_WORDS = {
  sd: [
    { baku: 'Apotek', tidakBaku: 'Apotik' },
    { baku: 'Aktivitas', tidakBaku: 'Aktifitas' },
    { baku: 'Praktik', tidakBaku: 'Praktek' },
    { baku: 'Ijazah', tidakBaku: 'Ijasah' },
    { baku: 'Nasihat', tidakBaku: 'Nasehat' },
    { baku: 'Jadwal', tidakBaku: 'Jadual' },
    { baku: 'Antre', tidakBaku: 'Antri' },
    { baku: 'Risiko', tidakBaku: 'Resiko' },
    { baku: 'Cokelat', tidakBaku: 'Coklat' },
    { baku: 'Napas', tidakBaku: 'Nafas' },
    { baku: 'Atlet', tidakBaku: 'Atlit' },
    { baku: 'Bus', tidakBaku: 'Bis' },
    { baku: 'Cabai', tidakBaku: 'Cabe' },
    { baku: 'Foto', tidakBaku: 'Photo' },
    { baku: 'Gizi', tidakBaku: 'Gisi' },
    { baku: 'Hafal', tidakBaku: 'Hapal' },
    { baku: 'Izin', tidakBaku: 'Ijin' },
    { baku: 'Jumat', tidakBaku: 'Jum\'at' },
    { baku: 'Kaus', tidakBaku: 'Kaos' },
    { baku: 'Kreatif', tidakBaku: 'Kreatip' },
    { baku: 'Lubang', tidakBaku: 'Lobang' },
    { baku: 'Merek', tidakBaku: 'Merk' },
    { baku: 'Museum', tidakBaku: 'Musium' },
    { baku: 'Paham', tidakBaku: 'Faham' },
    { baku: 'Rapi', tidakBaku: 'Rapih' },
    { baku: 'Telur', tidakBaku: 'Telor' }
  ],

  smp: [
    { baku: 'Analisis', tidakBaku: 'Analisa' },
    { baku: 'Hierarki', tidakBaku: 'Hirarki' },
    { baku: 'Kuitansi', tidakBaku: 'Kwitansi' },
    { baku: 'Ekstrem', tidakBaku: 'Ekstrim' },
    { baku: 'Autentik', tidakBaku: 'Otentik' },
    { baku: 'Cenderamata', tidakBaku: 'Cinderamata' },
    { baku: 'Kualitas', tidakBaku: 'Kwalitas' },
    { baku: 'Kuantitas', tidakBaku: 'Kwantitas' },
    { baku: 'Diagnosis', tidakBaku: 'Diagnosa' },
    { baku: 'Efektif', tidakBaku: 'Efektip' },
    { baku: 'Objek', tidakBaku: 'Obyek' },
    { baku: 'Subjek', tidakBaku: 'Subyek' },
    { baku: 'Sistem', tidakBaku: 'Sistim' },
    { baku: 'Teknik', tidakBaku: 'Tehnik' },
    { baku: 'Teknologi', tidakBaku: 'Tekhnologi' },
    { baku: 'Karier', tidakBaku: 'Karir' },
    { baku: 'Detail', tidakBaku: 'Detil' },
    { baku: 'Sekadar', tidakBaku: 'Sekedar' },
    { baku: 'Standar', tidakBaku: 'Standard' },
    { baku: 'Mengubah', tidakBaku: 'Merubah' },
    { baku: 'Persentase', tidakBaku: 'Prosentase' },
    { baku: 'Silakan', tidakBaku: 'Silahkan' },
    { baku: 'Teladan', tidakBaku: 'Tauladan' },
    { baku: 'Terampil', tidakBaku: 'Trampil' },
    { baku: 'Utang', tidakBaku: 'Hutang' },
    { baku: 'Hipotesis', tidakBaku: 'Hipotesa' }
  ]
};

module.exports = { PUEBI_WORDS };
