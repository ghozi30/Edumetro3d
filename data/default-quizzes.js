// Bank Soal Bawaan untuk Mini Games #01, #02, #03, dan #04 — Jenjang SD & SMP (Maksimal SMP)
// Setiap mini game memiliki variasi lengkap level SD (15 soal) dan level SMP (15 soal).

const MG01_SD = [
  { q: 'Hasil dari 15 + 27 adalah...', options: ['32', '42', '45', '52'], correctIndex: 1, timeLimit: 18 },
  { q: 'Hasil dari 9 x 8 adalah...', options: ['64', '72', '81', '63'], correctIndex: 1, timeLimit: 18 },
  { q: 'Ibu kota negara Indonesia adalah...', options: ['Bandung', 'Surabaya', 'Jakarta', 'Medan'], correctIndex: 2, timeLimit: 18 },
  { q: 'Hewan berikut yang berkembang biak dengan bertelur (ovipar) adalah...', options: ['Kucing', 'Ayam', 'Kambing', 'Paus'], correctIndex: 1, timeLimit: 18 },
  { q: 'Bangun datar yang memiliki 3 sisi dan 3 sudut disebut...', options: ['Persegi', 'Lingkaran', 'Segitiga', 'Trapesium'], correctIndex: 2, timeLimit: 18 },
  { q: 'Hasil dari 100 - 37 adalah...', options: ['53', '63', '73', '67'], correctIndex: 1, timeLimit: 18 },
  { q: 'Bagian tumbuhan yang berfungsi menyerap air dari tanah adalah...', options: ['Daun', 'Batang', 'Akar', 'Bunga'], correctIndex: 2, timeLimit: 18 },
  { q: 'Hasil dari 56 : 7 adalah...', options: ['6', '7', '8', '9'], correctIndex: 2, timeLimit: 18 },
  { q: 'Pecahan yang senilai dengan 1/2 adalah...', options: ['2/4', '1/3', '3/4', '2/5'], correctIndex: 0, timeLimit: 18 },
  { q: 'Sumber energi panas dan cahaya terbesar bagi Bumi adalah...', options: ['Bulan', 'Matahari', 'Bintang', 'Api unggun'], correctIndex: 1, timeLimit: 18 },
  { q: '1 jam sama dengan berapa menit?', options: ['30 menit', '45 menit', '60 menit', '100 menit'], correctIndex: 2, timeLimit: 18 },
  { q: 'Keliling persegi dengan panjang sisi 6 cm adalah...', options: ['12 cm', '18 cm', '24 cm', '36 cm'], correctIndex: 2, timeLimit: 18 },
  { q: 'Simbol sila pertama Pancasila pada perisai Garuda adalah...', options: ['Rantai', 'Bintang', 'Pohon Beringin', 'Padi dan Kapas'], correctIndex: 1, timeLimit: 18 },
  { q: 'Bilangan genap yang terletak di antara 15 dan 19 adalah...', options: ['16 dan 17', '16 dan 18', '17 dan 18', '14 dan 16'], correctIndex: 1, timeLimit: 18 },
  { q: 'Alat pernapasan utama pada ikan adalah...', options: ['Paru-paru', 'Trakea', 'Insang', 'Kulit'], correctIndex: 2, timeLimit: 18 }
];

const MG01_SMP = [
  { q: 'Hasil dari (-12) + 19 - 5 adalah...', options: ['-2', '2', '12', '-12'], correctIndex: 1, timeLimit: 20 },
  { q: 'Jika 3x + 5 = 20, maka nilai x adalah...', options: ['3', '5', '7', '15'], correctIndex: 1, timeLimit: 20 },
  { q: 'FPB dari 24 dan 36 adalah...', options: ['6', '8', '12', '18'], correctIndex: 2, timeLimit: 20 },
  { q: 'Hasil dari 2^4 + 3^2 adalah...', options: ['17', '25', '27', '32'], correctIndex: 1, timeLimit: 20 },
  { q: 'Besar sudut berpelurus (suplemen) dari sudut 115 derajat adalah...', options: ['55 derajat', '65 derajat', '75 derajat', '85 derajat'], correctIndex: 1, timeLimit: 20 },
  { q: 'KPK dari 12 dan 18 adalah...', options: ['24', '36', '48', '72'], correctIndex: 1, timeLimit: 20 },
  { q: 'Nilai dari akar kuadrat 169 ditambah akar kuadrat 36 adalah...', options: ['17', '19', '21', '23'], correctIndex: 1, timeLimit: 20 },
  { q: 'Perbandingan uang Ani dan Budi adalah 3 : 5. Jika jumlah uang mereka Rp80.000, uang Ani adalah...', options: ['Rp24.000', 'Rp30.000', 'Rp40.000', 'Rp50.000'], correctIndex: 1, timeLimit: 20 },
  { q: 'Sebuah segitiga siku-siku memiliki sisi tegak 6 cm dan 8 cm. Panjang sisi miringnya adalah...', options: ['9 cm', '10 cm', '12 cm', '14 cm'], correctIndex: 1, timeLimit: 20 },
  { q: 'Bentuk sederhana dari 4a + 3b - 2a + 5b adalah...', options: ['2a + 8b', '6a + 8b', '2a + 2b', '6a - 2b'], correctIndex: 0, timeLimit: 20 },
  { q: 'Mean (rata-rata) dari data 6, 7, 8, 9, 10 adalah...', options: ['7', '7,5', '8', '8,5'], correctIndex: 2, timeLimit: 20 },
  { q: 'Jika sebuah dadu bermata enam dilempar sekali, peluang muncul mata dadu genap adalah...', options: ['1/6', '1/3', '1/2', '2/3'], correctIndex: 2, timeLimit: 20 },
  { q: 'Suku ke-5 dari barisan aritmatika 3, 7, 11, 15, ... adalah...', options: ['17', '19', '21', '23'], correctIndex: 1, timeLimit: 20 },
  { q: 'Luas lingkaran dengan jari-jari 7 cm (pi = 22/7) adalah...', options: ['44 cm2', '154 cm2', '308 cm2', '616 cm2'], correctIndex: 1, timeLimit: 20 },
  { q: 'Gradien garis dengan persamaan y = 3x - 7 adalah...', options: ['-7', '-3', '3', '7'], correctIndex: 2, timeLimit: 20 }
];

const MG02_SD = [
  { q: 'Pulau terbesar di Indonesia adalah...', options: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi'], correctIndex: 2, timeLimit: 18 },
  { q: 'Tanggal kemerdekaan Republik Indonesia adalah...', options: ['17 Agustus 1945', '28 Oktober 1928', '10 November 1945', '1 Juni 1945'], correctIndex: 0, timeLimit: 18 },
  { q: 'Candi Borobudur terletak di provinsi...', options: ['Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Bali'], correctIndex: 1, timeLimit: 18 },
  { q: 'Matahari terbit dari arah...', options: ['Barat', 'Utara', 'Selatan', 'Timur'], correctIndex: 3, timeLimit: 18 },
  { q: 'Danau Toba yang terkenal berada di provinsi...', options: ['Sumatra Utara', 'Sumatra Barat', 'Riau', 'Lampung'], correctIndex: 0, timeLimit: 18 },
  { q: 'Rumah adat Tongkonan berasal dari daerah...', options: ['Padang', 'Toraja', 'Papua', 'Aceh'], correctIndex: 1, timeLimit: 18 },
  { q: 'Tari Saman berasal dari provinsi...', options: ['Bali', 'Aceh', 'Jawa Timur', 'Maluku'], correctIndex: 1, timeLimit: 18 },
  { q: 'Pahlawan nasional yang dijuluki Bapak Pendidikan Indonesia adalah...', options: ['R.A. Kartini', 'Ki Hajar Dewantara', 'Pangeran Diponegoro', 'Cut Nyak Dien'], correctIndex: 1, timeLimit: 18 },
  { q: 'Sungai terpanjang di Indonesia yang berada di Kalimantan adalah...', options: ['Sungai Musi', 'Sungai Bengawan Solo', 'Sungai Kapuas', 'Sungai Brantas'], correctIndex: 2, timeLimit: 18 },
  { q: 'Alat musik tradisional Angklung berasal dari...', options: ['Jawa Barat', 'Bali', 'Papua', 'Sulawesi Selatan'], correctIndex: 0, timeLimit: 18 },
  { q: 'Semboyan negara Indonesia adalah...', options: ['Tut Wuri Handayani', 'Bhinneka Tunggal Ika', 'Ing Ngarsa Sung Tulada', 'Bersatu Kita Teguh'], correctIndex: 1, timeLimit: 18 },
  { q: 'Benua tempat negara Indonesia berada adalah...', options: ['Eropa', 'Afrika', 'Asia', 'Australia'], correctIndex: 2, timeLimit: 18 },
  { q: 'Gunung tertinggi di Pulau Jawa adalah...', options: ['Gunung Merapi', 'Gunung Bromo', 'Gunung Semeru', 'Gunung Slamet'], correctIndex: 2, timeLimit: 18 },
  { q: 'Hari Sumpah Pemuda diperingati setiap tanggal...', options: ['20 Mei', '17 Agustus', '28 Oktober', '10 November'], correctIndex: 2, timeLimit: 18 },
  { q: 'Hewan langka Komodo berasal dari provinsi...', options: ['Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Maluku'], correctIndex: 1, timeLimit: 18 }
];

const MG02_SMP = [
  { q: 'Kerajaan Hindu tertua di Indonesia yang berada di Kalimantan Timur adalah...', options: ['Majapahit', 'Sriwijaya', 'Kutai', 'Tarumanegara'], correctIndex: 2, timeLimit: 20 },
  { q: 'Indonesia secara astronomis terletak pada garis lintang...', options: ['6 LU - 11 LS', '11 LU - 6 LS', '23 LU - 23 LS', '0 LU - 15 LS'], correctIndex: 0, timeLimit: 20 },
  { q: 'Organisasi pergerakan nasional pertama yang berdiri pada 20 Mei 1908 adalah...', options: ['Sarekat Islam', 'Budi Utomo', 'Indische Partij', 'Perhimpunan Indonesia'], correctIndex: 1, timeLimit: 20 },
  { q: 'Garis khayal yang membagi fauna Indonesia bagian barat dan tengah disebut...', options: ['Garis Khatulistiwa', 'Garis Wallace', 'Garis Weber', 'Garis Meridian'], correctIndex: 1, timeLimit: 20 },
  { q: 'Kerajaan maritim besar di Sumatra yang menjadi pusat agama Buddha adalah...', options: ['Majapahit', 'Sriwijaya', 'Singasari', 'Mataram'], correctIndex: 1, timeLimit: 20 },
  { q: 'Negara anggota ASEAN yang tidak memiliki wilayah laut (landlocked) adalah...', options: ['Thailand', 'Kamboja', 'Laos', 'Myanmar'], correctIndex: 2, timeLimit: 20 },
  { q: 'Peristiwa penculikan Soekarno-Hatta oleh golongan muda sebelum proklamasi disebut...', options: ['Peristiwa Bandung Lautan Api', 'Peristiwa Rengasdengklok', 'Perjanjian Linggarjati', 'Konferensi Meja Bundar'], correctIndex: 1, timeLimit: 20 },
  { q: 'Samudra yang mengapit wilayah Indonesia adalah...', options: ['Atlantik dan Hindia', 'Pasifik dan Atlantik', 'Hindia dan Pasifik', 'Arktik dan Pasifik'], correctIndex: 2, timeLimit: 20 },
  { q: 'Skala peta 1 : 500.000 artinya 1 cm di peta mewakili jarak sebenarnya sebesar...', options: ['500 meter', '5 km', '50 km', '500 km'], correctIndex: 1, timeLimit: 20 },
  { q: 'Naskah proklamasi kemerdekaan Indonesia diketik oleh...', options: ['Ahmad Soebardjo', 'Sayuti Melik', 'Sukarni', 'Latief Hendraningrat'], correctIndex: 1, timeLimit: 20 },
  { q: 'Lapisan atmosfer tempat terjadinya cuaca, awan, dan hujan adalah...', options: ['Troposfer', 'Stratosfer', 'Mesosfer', 'Termosfer'], correctIndex: 0, timeLimit: 20 },
  { q: 'Benua terluas di permukaan Bumi adalah...', options: ['Amerika', 'Afrika', 'Asia', 'Eropa'], correctIndex: 2, timeLimit: 20 },
  { q: 'Perang Diponegoro terjadi pada tahun 1825-1830 di wilayah...', options: ['Sumatra Barat', 'Jawa', 'Aceh', 'Bali'], correctIndex: 1, timeLimit: 20 },
  { q: 'Sistem tanam paksa (Cultuurstelsel) pada masa kolonial Belanda dicetuskan oleh...', options: ['Herman Willem Daendels', 'Thomas Stamford Raffles', 'Johannes van den Bosch', 'Cornelis de Houtman'], correctIndex: 2, timeLimit: 20 },
  { q: 'ASEAN resmi didirikan pada tanggal 8 Agustus 1967 melalui Deklarasi...', options: ['Jakarta', 'Bangkok', 'Manila', 'Kuala Lumpur'], correctIndex: 1, timeLimit: 20 }
];

const MG03_SD = [
  { q: 'Perubahan wujud benda dari padat menjadi cair disebut...', options: ['Membeku', 'Mencair', 'Menguap', 'Menyublim'], correctIndex: 1, timeLimit: 18 },
  { q: 'Benda yang dapat ditarik kuat oleh magnet adalah...', options: ['Plastik', 'Kayu', 'Besi', 'Kaca'], correctIndex: 2, timeLimit: 18 },
  { q: 'Bunyi dapat merambat paling cepat melalui medium...', options: ['Udara', 'Air', 'Benda padat', 'Ruang hampa'], correctIndex: 2, timeLimit: 18 },
  { q: 'Proses tumbuhan hijau membuat makanan dengan bantuan cahaya matahari disebut...', options: ['Respirasi', 'Fotosintesis', 'Adaptasi', 'Evaporasi'], correctIndex: 1, timeLimit: 18 },
  { q: 'Benda yang menghantarkan panas dengan baik disebut...', options: ['Isolator', 'Konduktor', 'Radiator', 'Resistor'], correctIndex: 1, timeLimit: 18 },
  { q: 'Perubahan wujud dari cair menjadi gas disebut...', options: ['Menguap', 'Mengembun', 'Membeku', 'Mengkristal'], correctIndex: 0, timeLimit: 18 },
  { q: 'Gaya yang menyebabkan buah apel jatuh ke tanah adalah gaya...', options: ['Gesek', 'Magnet', 'Gravitasi', 'Pegas'], correctIndex: 2, timeLimit: 18 },
  { q: 'Air murni mendidih pada suhu...', options: ['0 derajat C', '50 derajat C', '100 derajat C', '120 derajat C'], correctIndex: 2, timeLimit: 18 },
  { q: 'Bentuk energi yang tersimpan di dalam baterai adalah energi...', options: ['Kimia', 'Gerak', 'Bunyi', 'Panas'], correctIndex: 0, timeLimit: 18 },
  { q: 'Pelangi terbentuk karena cahaya matahari mengalami...', options: ['Pemantulan', 'Pembiasan dan penguraian', 'Penyerapan', 'Pembekuan'], correctIndex: 1, timeLimit: 18 },
  { q: 'Alat yang digunakan untuk mengukur suhu tubuh adalah...', options: ['Barometer', 'Termometer', 'Speedometer', 'Higrometer'], correctIndex: 1, timeLimit: 18 },
  { q: 'Contoh sumber energi alternatif yang ramah lingkungan adalah...', options: ['Batu bara', 'Minyak bumi', 'Tenaga surya', 'Solar'], correctIndex: 2, timeLimit: 18 },
  { q: 'Kapur barus yang lama-kelamaan habis di lemari mengalami peristiwa...', options: ['Mencair', 'Menyublim', 'Mengembun', 'Membeku'], correctIndex: 1, timeLimit: 18 },
  { q: 'Satuan panjang baku dalam sistem internasional adalah...', options: ['Kilogram', 'Meter', 'Detik', 'Liter'], correctIndex: 1, timeLimit: 18 },
  { q: 'Pada rangkaian listrik, lampu akan menyala jika saklar dalam posisi...', options: ['Terbuka', 'Tertutup', 'Putus', 'Lepas'], correctIndex: 1, timeLimit: 18 }
];

const MG03_SMP = [
  { q: 'Satuan Internasional (SI) untuk gaya adalah...', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctIndex: 2, timeLimit: 20 },
  { q: 'Rumus kimia untuk senyawa air adalah...', options: ['CO2', 'H2O', 'NaCl', 'O2'], correctIndex: 1, timeLimit: 20 },
  { q: 'Sebuah mobil menempuh jarak 120 km dalam waktu 2 jam. Kecepatan rata-ratanya adalah...', options: ['40 km/jam', '50 km/jam', '60 km/jam', '80 km/jam'], correctIndex: 2, timeLimit: 20 },
  { q: 'Larutan yang memiliki nilai pH kurang dari 7 bersifat...', options: ['Asam', 'Basa', 'Netral', 'Garam'], correctIndex: 0, timeLimit: 20 },
  { q: 'Garam dapur dalam ilmu kimia memiliki rumus senyawa...', options: ['HCl', 'NaOH', 'NaCl', 'H2SO4'], correctIndex: 2, timeLimit: 20 },
  { q: 'Hukum Newton II dirumuskan dengan persamaan...', options: ['F = m x a', 'v = s / t', 'P = F / A', 'W = F x s'], correctIndex: 0, timeLimit: 20 },
  { q: 'Perpindahan kalor tanpa memerlukan zat perantara (seperti panas matahari ke Bumi) disebut...', options: ['Konduksi', 'Konveksi', 'Radiasi', 'Isolasi'], correctIndex: 2, timeLimit: 20 },
  { q: 'Satuan Internasional (SI) untuk kuat arus listrik adalah...', options: ['Volt', 'Ohm', 'Ampere', 'Watt'], correctIndex: 2, timeLimit: 20 },
  { q: 'Organel sel yang berfungsi sebagai pusat penghasil energi (respirasi sel) adalah...', options: ['Ribosom', 'Mitokondria', 'Vakuola', 'Dinding sel'], correctIndex: 1, timeLimit: 20 },
  { q: 'Contoh perubahan kimia yang menghasilkan zat baru adalah...', options: ['Es mencair', 'Kertas dipotong', 'Besi berkarat', 'Air menguap'], correctIndex: 2, timeLimit: 20 },
  { q: 'Alat optik yang memanfaatkan cermin cekung untuk mengumpulkan cahaya adalah...', options: ['Spion motor', 'Reflektor lampu senter', 'Kaca jendela', 'Cermin datar'], correctIndex: 1, timeLimit: 20 },
  { q: 'Jika massa benda 4 kg dan percepatan 3 m/s2, maka besar gaya yang bekerja adalah...', options: ['7 N', '12 N', '16 N', '1,3 N'], correctIndex: 1, timeLimit: 20 },
  { q: 'Bagian atom yang bermuatan listrik negatif disebut...', options: ['Proton', 'Neutron', 'Elektron', 'Inti atom'], correctIndex: 2, timeLimit: 20 },
  { q: 'Frekuensi getaran benda yang bergetar 20 kali dalam 4 detik adalah...', options: ['4 Hz', '5 Hz', '16 Hz', '80 Hz'], correctIndex: 1, timeLimit: 20 },
  { q: 'Jenis pesawat sederhana yang digunakan pada gunting dan jungkat-jungkit adalah...', options: ['Katrol', 'Bidang miring', 'Tuas (pengungkit)', 'Roda berporos'], correctIndex: 2, timeLimit: 20 }
];

const MG04_SD = [
  { q: 'Organ tubuh manusia yang berfungsi memompa darah ke seluruh tubuh adalah...', options: ['Paru-paru', 'Jantung', 'Lambung'], correctIndex: 1 },
  { q: 'Hewan yang hanya memakan tumbuhan (seperti sapi dan kelinci) disebut...', options: ['Karnivora', 'Herbivora', 'Omnivora'], correctIndex: 1 },
  { q: 'Planet terdekat dengan Matahari di Tata Surya adalah...', options: ['Merkurius', 'Venus', 'Mars'], correctIndex: 0 },
  { q: 'Bagian daun yang memberi warna hijau untuk fotosintesis disebut...', options: ['Klorofil', 'Stomata', 'Xilem'], correctIndex: 0 },
  { q: 'Hewan katak dapat hidup di darat dan di air sehingga disebut hewan...', options: ['Mamalia', 'Amfibi', 'Reptil'], correctIndex: 1 },
  { q: 'Sumber vitamin C yang banyak ditemukan pada buah jeruk berguna untuk mencegah...', options: ['Sariawan', 'Rabun senja', 'Tulang rapuh'], correctIndex: 0 },
  { q: 'Perubahan wujud air menjadi es di dalam freezer disebut...', options: ['Mencair', 'Membeku', 'Menguap'], correctIndex: 1 },
  { q: 'Benda langit yang memancarkan cahayanya sendiri adalah...', options: ['Bulan', 'Matahari', 'Planet'], correctIndex: 1 },
  { q: 'Alat pernapasan utama pada burung adalah...', options: ['Paru-paru', 'Insang', 'Kulit'], correctIndex: 0 },
  { q: 'Tumbuhan kaktus menyimpan cadangan air di bagian...', options: ['Daun', 'Batang', 'Bunga'], correctIndex: 1 },
  { q: 'Hewan yang berkembang biak dengan cara melahirkan disebut...', options: ['Ovipar', 'Vivipar', 'Ovovivipar'], correctIndex: 1 },
  { q: 'Hubungan saling menguntungkan antara lebah dan bunga disebut simbiosis...', options: ['Mutualisme', 'Parasitisme', 'Komensalisme'], correctIndex: 0 },
  { q: 'Lapisan udara yang menyelimuti Bumi disebut...', options: ['Hidrosfer', 'Atmosfer', 'Litosfer'], correctIndex: 1 },
  { q: 'Bagian mata yang berfungsi mengatur banyak sedikitnya cahaya masuk adalah...', options: ['Pupil', 'Kornea', 'Alis'], correctIndex: 0 },
  { q: 'Proses jatuhnya serbuk sari ke kepala putik disebut...', options: ['Penyerbukan', 'Pembuahan', 'Pencangkokan'], correctIndex: 0 }
];

const MG04_SMP = [
  { q: 'Gas utama yang dibutuhkan tumbuhan hijau saat proses fotosintesis adalah...', options: ['Karbon Dioksida', 'Nitrogen', 'Helium'], correctIndex: 0 },
  { q: 'Pembuluh darah yang mengalirkan darah keluar dari jantung disebut...', options: ['Arteri', 'Vena', 'Kapiler'], correctIndex: 0 },
  { q: 'Enzim ptialin di dalam mulut berfungsi mengubah amilum menjadi...', options: ['Asam amino', 'Maltosa (gula)', 'Asam lemak'], correctIndex: 1 },
  { q: 'Bagian ginjal yang berfungsi menyaring darah untuk membentuk urine primer adalah...', options: ['Glomerulus', 'Ureter', 'Kandung kemih'], correctIndex: 0 },
  { q: 'Jaringan tumbuhan yang berfungsi mengangkut air dan mineral dari akar ke daun adalah...', options: ['Floem', 'Xilem', 'Epidermis'], correctIndex: 1 },
  { q: 'Sel darah yang berperan penting dalam proses pembekuan darah saat luka adalah...', options: ['Eritrosit', 'Leukosit', 'Trombosit'], correctIndex: 2 },
  { q: 'Hubungan antara benalu dan pohon inangnya termasuk simbiosis...', options: ['Mutualisme', 'Parasitisme', 'Komensalisme'], correctIndex: 1 },
  { q: 'Cacat mata rabun jauh (miopi) dapat dibantu dengan kacamata berlensa...', options: ['Cekung (negatif)', 'Cembung (positif)', 'Rangkap'], correctIndex: 0 },
  { q: 'Pertukaran gas oksigen dan karbon dioksida di paru-paru terjadi pada bagian...', options: ['Trakea', 'Bronkus', 'Alveolus'], correctIndex: 2 },
  { q: 'Gerak menutupnya daun putri malu ketika disentuh disebut...', options: ['Seismonasti', 'Fototropisme', 'Geotropisme'], correctIndex: 0 },
  { q: 'Lapisan ozon (O3) di stratosfer melindungi Bumi dari radiasi...', options: ['Inframerah', 'Ultraviolet', 'Gelombang radio'], correctIndex: 1 },
  { q: 'Bakteri dan jamur yang menguraikan sisa makhluk hidup dalam ekosistem berperan sebagai...', options: ['Produsen', 'Konsumen', 'Dekomposer'], correctIndex: 2 },
  { q: 'Sendi yang memungkinkan gerakan ke segala arah seperti pada bahu disebut sendi...', options: ['Engsel', 'Peluru', 'Putar'], correctIndex: 1 },
  { q: 'Hormon yang mengatur kadar gula dalam darah manusia adalah...', options: ['Insulin', 'Adrenalin', 'Tiroksin'], correctIndex: 0 },
  { q: 'Zat aditif alami yang biasa digunakan sebagai pewarna hijau makanan adalah...', options: ['Kunyit', 'Daun pandan', 'Bit merah'], correctIndex: 1 }
];

const DEFAULT_MINIGAME_QUIZZES = {
  'mg-01': {
    id: 'mg-01',
    title: 'Stadium Kuis Lari 3D',
    subject: 'Matematika & Pengetahuan Umum',
    grade: 'SD & SMP',
    description: 'Berlari cepat ke zona jawaban A, B, C, atau D sebelum timer habis!',
    questions: MG01_SD,
    questionsSD: MG01_SD,
    questionsSMP: MG01_SMP
  },
  'mg-02': {
    id: 'mg-02',
    title: 'Labirin Eksplorasi Sejarah & Geografi',
    subject: 'IPS · Sejarah & Geografi',
    grade: 'SD & SMP',
    description: 'Jelajahi arena pengetahuan Nusantara, sejarah, dan geografi dunia!',
    questions: MG02_SD,
    questionsSD: MG02_SD,
    questionsSMP: MG02_SMP
  },
  'mg-03': {
    id: 'mg-03',
    title: 'Laboratorium IPA & Eksperimen',
    subject: 'IPA · Fisika, Kimia & Biologi',
    grade: 'SD & SMP',
    description: 'Uji ketangkasan sains dasar, wujud benda, energi, dan reaksi kimia SD & SMP!',
    questions: MG03_SD,
    questionsSD: MG03_SD,
    questionsSMP: MG03_SMP
  },
  'mg-04': {
    id: 'mg-04',
    title: 'Sirkuit Balap 3 Gerbang',
    subject: 'IPA · Biologi & Alam',
    grade: 'SD & SMP',
    description: 'Balapan 3 lap (15 gerbang soal) di sirkuit Grand Prix SD & SMP!',
    questions: MG04_SD,
    questionsSD: MG04_SD,
    questionsSMP: MG04_SMP
  }
};

module.exports = { DEFAULT_MINIGAME_QUIZZES };
