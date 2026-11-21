// Bank Soal Modular Mini Game #10: Dapur Kalimat (Bahasa Inggris - SD & SMP)
// Digunakan oleh server.js (Node.js) dan cafe-main.js (Browser)

const CAFE_QUESTIONS = {
  sd: [
    {
      id: 'sd-01',
      indo: 'Saya sedang membaca buku',
      words: ['I', 'am', 'reading', 'a book'],
      distractors: ['is', 'read', 'books'],
      grammar: 'Present Continuous: I + am + Verb-ing'
    },
    {
      id: 'sd-02',
      indo: 'Dia (perempuan) adalah seorang guru',
      words: ['She', 'is', 'a', 'teacher'],
      distractors: ['are', 'He', 'am'],
      grammar: 'To be untuk She/He/It menggunakan "is"'
    },
    {
      id: 'sd-03',
      indo: 'Kami bermain sepak bola setiap hari',
      words: ['We', 'play', 'football', 'every day'],
      distractors: ['plays', 'is', 'playing'],
      grammar: 'Simple Present untuk We/They/I/You tanpa -s'
    },
    {
      id: 'sd-04',
      indo: 'Mereka sangat senang hari ini',
      words: ['They', 'are', 'very', 'happy'],
      distractors: ['is', 'am', 'sad'],
      grammar: 'To be untuk They/We/You menggunakan "are"'
    },
    {
      id: 'sd-05',
      indo: 'Dia (laki-laki) suka apel merah',
      words: ['He', 'likes', 'red', 'apples'],
      distractors: ['like', 'She', 'blue'],
      grammar: 'Simple Present untuk He/She/It memakai Verb + s (likes)'
    },
    {
      id: 'sd-06',
      indo: 'Kucing itu sedang tidur sekarang',
      words: ['The cat', 'is', 'sleeping', 'now'],
      distractors: ['are', 'sleep', 'eating'],
      grammar: 'Present Continuous tunggal: The cat + is + sleeping'
    },
    {
      id: 'sd-07',
      indo: 'Saya minum susu di pagi hari',
      words: ['I', 'drink', 'milk', 'every morning'],
      distractors: ['drinks', 'am', 'water'],
      grammar: 'Simple Present kebiasaan: I + drink'
    },
    {
      id: 'sd-08',
      indo: 'Kamu adalah teman baikku',
      words: ['You', 'are', 'my', 'best friend'],
      distractors: ['is', 'am', 'your'],
      grammar: 'Subjek "You" selalu berpasangan dengan "are"'
    },
    {
      id: 'sd-09',
      indo: 'Ibu saya sedang memasak nasi',
      words: ['My mother', 'is', 'cooking', 'rice'],
      distractors: ['are', 'cook', 'bread'],
      grammar: 'Present Continuous: My mother + is + cooking'
    },
    {
      id: 'sd-10',
      indo: 'Kami pergi ke sekolah bersama',
      words: ['We', 'go', 'to school', 'together'],
      distractors: ['goes', 'going', 'home'],
      grammar: 'Simple Present jamak: We + go'
    },
    {
      id: 'sd-11',
      indo: 'Ayah saya bekerja di rumah sakit',
      words: ['My father', 'works', 'in', 'a hospital'],
      distractors: ['work', 'are', 'school'],
      grammar: 'Subjek tunggal "My father" memakai Verb + s (works)'
    },
    {
      id: 'sd-12',
      indo: 'Saya punya dua pensil baru',
      words: ['I', 'have', 'two', 'new pencils'],
      distractors: ['has', 'is', 'one'],
      grammar: 'Subjek "I" menggunakan "have", bukan "has"'
    },
    {
      id: 'sd-13',
      indo: 'Mereka sedang belajar bahasa Inggris',
      words: ['They', 'are', 'studying', 'English'],
      distractors: ['is', 'study', 'Math'],
      grammar: 'Present Continuous jamak: They + are + studying'
    },
    {
      id: 'sd-14',
      indo: 'Burung itu bisa terbang tinggi',
      words: ['The bird', 'can', 'fly', 'high'],
      distractors: ['is', 'flies', 'swim'],
      grammar: 'Setelah modal "can", kata kerja kembali ke bentuk dasar (fly)'
    },
    {
      id: 'sd-15',
      indo: 'Dia (perempuan) sedang makan pisang',
      words: ['She', 'is', 'eating', 'a banana'],
      distractors: ['are', 'eat', 'an apple'],
      grammar: 'Present Continuous: She + is + eating'
    },
    {
      id: 'sd-16',
      indo: 'Bola itu ada di atas meja',
      words: ['The ball', 'is', 'on', 'the table'],
      distractors: ['are', 'under', 'chair'],
      grammar: 'Preposisi "on" berarti di atas permukaan'
    }
  ],

  smp: [
    {
      id: 'smp-01',
      indo: 'Surat itu ditulis oleh Rina kemarin',
      words: ['The letter', 'was written', 'by Rina', 'yesterday'],
      distractors: ['wrote', 'is writing', 'tomorrow'],
      grammar: 'Passive Voice (Past): Subject + was/were + V3'
    },
    {
      id: 'smp-02',
      indo: 'Kami mengunjungi museum minggu lalu',
      words: ['We', 'visited', 'the museum', 'last week'],
      distractors: ['visit', 'will visit', 'next week'],
      grammar: 'Simple Past Tense menggunakan Verb-2 (visited)'
    },
    {
      id: 'smp-03',
      indo: 'Saya akan belajar lebih giat besok',
      words: ['I', 'will', 'study', 'harder tomorrow'],
      distractors: ['studied', 'am', 'yesterday'],
      grammar: 'Future Tense: Subject + will + Verb-1'
    },
    {
      id: 'smp-04',
      indo: 'Gajah lebih besar daripada harimau',
      words: ['An elephant', 'is', 'bigger', 'than a tiger'],
      distractors: ['biggest', 'more big', 'are'],
      grammar: 'Comparative pendek: adjective + -er + than (bigger than)'
    },
    {
      id: 'smp-05',
      indo: 'Kue ini dibuat oleh ibu saya',
      words: ['This cake', 'is made', 'by', 'my mother'],
      distractors: ['make', 'making', 'were'],
      grammar: 'Passive Voice (Present): Subject + is/are + V3 (is made)'
    },
    {
      id: 'smp-06',
      indo: 'Dia (laki-laki) membeli tas baru kemarin',
      words: ['He', 'bought', 'a new bag', 'yesterday'],
      distractors: ['buy', 'buys', 'will buy'],
      grammar: 'Irregular Verb-2 dari "buy" adalah "bought"'
    },
    {
      id: 'smp-07',
      indo: 'Matematika lebih menarik daripada yang saya kira',
      words: ['Math', 'is', 'more interesting', 'than I thought'],
      distractors: ['interestinger', 'most', 'are'],
      grammar: 'Comparative kata panjang: more + adjective + than'
    },
    {
      id: 'smp-08',
      indo: 'Mereka akan pergi ke Bali bulan depan',
      words: ['They', 'will go', 'to Bali', 'next month'],
      distractors: ['went', 'going', 'last month'],
      grammar: 'Future Tense untuk rencana: will + Verb-1 (will go)'
    },
    {
      id: 'smp-09',
      indo: 'Jendela itu dipecahkan oleh bola',
      words: ['The window', 'was broken', 'by', 'the ball'],
      distractors: ['broke', 'breaks', 'are'],
      grammar: 'Passive Voice Past: was + V3 dari break (broken)'
    },
    {
      id: 'smp-10',
      indo: 'Dia (perempuan) tidak datang ke pesta tadi malam',
      words: ['She', 'did not', 'come', 'last night'],
      distractors: ['came', 'does not', 'tomorrow'],
      grammar: 'Kalimat negatif Simple Past: did not + Verb-1 (come)'
    },
    {
      id: 'smp-11',
      indo: 'Mobil merah lebih cepat daripada sepeda',
      words: ['The red car', 'is', 'faster', 'than a bike'],
      distractors: ['fastest', 'more fast', 'was'],
      grammar: 'Comparative: fast → faster than'
    },
    {
      id: 'smp-12',
      indo: 'Bahasa Inggris digunakan di seluruh dunia',
      words: ['English', 'is spoken', 'all over', 'the world'],
      distractors: ['spoke', 'speaking', 'are'],
      grammar: 'Passive Present: is + V3 dari speak (spoken)'
    },
    {
      id: 'smp-13',
      indo: 'Kami menonton film seru kemarin malam',
      words: ['We', 'watched', 'an exciting movie', 'last night'],
      distractors: ['watch', 'watching', 'will watch'],
      grammar: 'Simple Past regular verb: watch → watched'
    },
    {
      id: 'smp-14',
      indo: 'Budi akan membantu kita setelah kelas',
      words: ['Budi', 'will help', 'us', 'after class'],
      distractors: ['helped', 'helping', 'we'],
      grammar: 'Future Tense: will + help, objek "us"'
    },
    {
      id: 'smp-15',
      indo: 'Buku ini lebih mahal daripada buku itu',
      words: ['This book', 'is', 'more expensive', 'than that one'],
      distractors: ['expensiver', 'most expensive', 'are'],
      grammar: 'Comparative kata panjang (3 suku kata): more expensive than'
    },
    {
      id: 'smp-16',
      indo: 'Ruangan kelas dibersihkan oleh siswa setiap hari',
      words: ['The classroom', 'is cleaned', 'by students', 'every day'],
      distractors: ['cleaned', 'cleaning', 'were'],
      grammar: 'Passive Present kebiasaan: is + cleaned + by'
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CAFE_QUESTIONS;
} else if (typeof window !== 'undefined') {
  window.CAFE_QUESTIONS = CAFE_QUESTIONS;
}
