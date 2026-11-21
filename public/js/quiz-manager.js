// Quiz Manager: Mengelola Bank Soal Guru (LocalStorage, Tambah, Edit, Hapus, Import/Export)

class QuizManager {
  constructor() {
    this.storageKey = 'eduverse_custom_quizzes';
    this.initDefaultStorage();
  }

  initDefaultStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      const initial = typeof DEFAULT_QUIZ_PACKS !== 'undefined' ? DEFAULT_QUIZ_PACKS : [];
      localStorage.setItem(this.storageKey, JSON.stringify(initial));
    }
  }

  getAllQuizzes() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Gagal membaca bank soal:', e);
      return [];
    }
  }

  getQuizById(id) {
    const list = this.getAllQuizzes();
    return list.find(q => q.id === id) || null;
  }

  saveQuiz(quiz) {
    const list = this.getAllQuizzes();
    const existingIndex = list.findIndex(q => q.id === quiz.id);

    if (existingIndex >= 0) {
      list[existingIndex] = quiz;
    } else {
      list.push(quiz);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(list));
    return true;
  }

  deleteQuiz(id) {
    const list = this.getAllQuizzes();
    const filtered = list.filter(q => q.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    return true;
  }

  resetToDefault() {
    const initial = typeof DEFAULT_QUIZ_PACKS !== 'undefined' ? DEFAULT_QUIZ_PACKS : [];
    localStorage.setItem(this.storageKey, JSON.stringify(initial));
    return initial;
  }

  exportToJson(quizId) {
    const quiz = this.getQuizById(quizId);
    if (!quiz) return null;
    return JSON.stringify(quiz, null, 2);
  }

  importFromJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.title || !Array.isArray(parsed.questions)) {
        throw new Error('Format JSON kuis tidak valid!');
      }
      if (!parsed.id) {
        parsed.id = 'quiz_' + Date.now();
      }
      this.saveQuiz(parsed);
      return { success: true, quiz: parsed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Import dari format CSV (Bisa dari Excel)
  // Format kolom: Nomor,Pertanyaan,OpsiA,OpsiB,OpsiC,OpsiD,KunciJawaban(A/B/C/D),WaktuDetik,Pembahasan
  importFromCsv(csvText, quizMeta = {}) {
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) throw new Error('File CSV kosong atau tidak ada data.');

      const questions = [];
      // Lewati header baris pertama
      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvRow(lines[i]);
        if (row.length < 7) continue;

        // row: [No, Soal, OpsiA, OpsiB, OpsiC, OpsiD, Kunci, Waktu, Pembahasan]
        const questionText = row[1] || row[0];
        const optA = row[2] || '';
        const optB = row[3] || '';
        const optC = row[4] || '';
        const optD = row[5] || '';
        const keyRaw = (row[6] || 'A').toUpperCase().trim();
        const keyMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        const correctIndex = keyMap[keyRaw] !== undefined ? keyMap[keyRaw] : 0;
        const timeLimit = parseInt(row[7], 10) || 20;
        const explanation = row[8] || '';

        questions.push({
          question: questionText,
          options: [optA, optB, optC, optD],
          correctIndex: correctIndex,
          timeLimit: timeLimit,
          points: 100,
          explanation: explanation
        });
      }

      if (questions.length === 0) throw new Error('Tidak ada soal yang berhasil diparsing dari CSV.');

      const newQuiz = {
        id: 'quiz_' + Date.now(),
        title: quizMeta.title || 'Kuis Impor Excel (' + new Date().toLocaleDateString('id-ID') + ')',
        subject: quizMeta.subject || 'Umum',
        grade: quizMeta.grade || 'Semua Jenjang',
        description: 'Diimpor dari file CSV/Excel oleh Guru.',
        questions: questions
      };

      this.saveQuiz(newQuiz);
      return { success: true, quiz: newQuiz };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  parseCsvRow(text) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }
}

window.QuizManager = new QuizManager();
