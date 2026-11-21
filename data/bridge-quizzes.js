// Bank Soal Khusus Mini Game #05: Jembatan Kaca Pecahan (Matematika SD & SMP)
// Masing-masing jenjang memiliki 16 soal acak dengan 3 pilihan (1 benar kokoh, 2 salah rapuh).

const BRIDGE_QUIZZES = {
  sd: [
    { q: 'Pecahan yang senilai dengan 3/4 dalam bentuk desimal adalah...', options: ['0,75', '0,34', '0,70'], correctIndex: 0 },
    { q: 'Bentuk persen dari pecahan 1/2 adalah...', options: ['20%', '50%', '25%'], correctIndex: 1 },
    { q: 'Pecahan yang senilai dengan 2/5 adalah...', options: ['4/8', '6/10', '4/10'], correctIndex: 2 },
    { q: 'Bentuk desimal dari 1/4 adalah...', options: ['0,25', '0,14', '0,40'], correctIndex: 0 },
    { q: 'Hasil dari 1/4 + 2/4 adalah...', options: ['3/8', '3/4', '2/4'], correctIndex: 1 },
    { q: 'Bentuk pecahan paling sederhana dari 6/8 adalah...', options: ['2/3', '3/5', '3/4'], correctIndex: 2 },
    { q: '25% jika diubah ke bentuk pecahan paling sederhana menjadi...', options: ['1/4', '1/5', '1/2'], correctIndex: 0 },
    { q: 'Hasil dari 5/6 - 2/6 adalah...', options: ['3/12', '1/2', '2/3'], correctIndex: 1 },
    { q: 'Bentuk desimal dari 3/5 adalah...', options: ['0,35', '0,53', '0,6'], correctIndex: 2 },
    { q: 'Pecahan 7/10 jika diubah menjadi persen adalah...', options: ['70%', '7%', '17%'], correctIndex: 0 },
    { q: 'Manakah pecahan yang nilainya PALING BESAR?', options: ['1/4', '2/3', '1/3'], correctIndex: 1 },
    { q: 'Bentuk pecahan biasa dari pecahan campuran 1 1/2 adalah...', options: ['2/3', '4/2', '3/2'], correctIndex: 2 },
    { q: 'Hasil dari 0,5 + 0,25 adalah...', options: ['0,75', '0,30', '0,55'], correctIndex: 0 },
    { q: 'Bentuk persen dari 3/5 adalah...', options: ['35%', '60%', '30%'], correctIndex: 1 },
    { q: 'Hasil dari 1/2 x 1/3 adalah...', options: ['2/5', '1/5', '1/6'], correctIndex: 2 },
    { q: 'Bentuk desimal dari 4/5 adalah...', options: ['0,8', '0,45', '0,4'], correctIndex: 0 }
  ],

  smp: [
    { q: 'Hasil dari 2³ + 4 adalah...', options: ['10', '12', '16'], correctIndex: 1 },
    { q: 'Nilai dari √64 + √9 adalah...', options: ['11', '13', '9'], correctIndex: 0 },
    { q: 'Sederhanakan bentuk pecahan aljabar: 6x / 3 adalah...', options: ['3x', '2x²', '2x'], correctIndex: 2 },
    { q: 'Hasil dari 3² x 2 adalah...', options: ['12', '18', '36'], correctIndex: 1 },
    { q: 'Jika a : b = 2 : 3 dan a = 10, maka nilai b adalah...', options: ['15', '12', '18'], correctIndex: 0 },
    { q: 'Hasil dari 1/2 + 1/3 adalah...', options: ['2/5', '3/5', '5/6'], correctIndex: 2 },
    { q: 'Nilai dari √144 - 5 adalah...', options: ['9', '7', '11'], correctIndex: 1 },
    { q: 'Hasil dari (2/3) ÷ (4/9) adalah...', options: ['3/2', '8/27', '2/3'], correctIndex: 0 },
    { q: 'Bentuk sederhana dari (4a + 6a) / 2 adalah...', options: ['10a', '5a²', '5a'], correctIndex: 2 },
    { q: 'Hasil dari 5² - 4² adalah...', options: ['1', '9', '16'], correctIndex: 1 },
    { q: 'Jika 3x = 24, maka nilai x + 2 adalah...', options: ['10', '8', '6'], correctIndex: 0 },
    { q: 'Nilai dari 2⁴ adalah...', options: ['8', '12', '16'], correctIndex: 2 },
    { q: 'Perbandingan paling sederhana dari 18 : 24 adalah...', options: ['2 : 3', '3 : 4', '4 : 5'], correctIndex: 1 },
    { q: 'Hasil dari √(25 + 11) adalah...', options: ['6', '8', '5'], correctIndex: 0 },
    { q: 'Bentuk sederhana dari 3/x + 2/x adalah...', options: ['5/2x', '6/x', '5/x'], correctIndex: 2 },
    { q: 'Hasil dari (-3)² + 1 adalah...', options: ['-8', '10', '7'], correctIndex: 1 }
  ]
};

module.exports = { BRIDGE_QUIZZES };
