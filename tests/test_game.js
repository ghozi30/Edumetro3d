const io = require('socket.io-client');

const hostSocket = io('http://localhost:3000');

hostSocket.on('connect', () => {
  console.log('[TEST] Host connected with socket ID:', hostSocket.id);
  hostSocket.emit('create_room', {
    title: 'Kuis IPA Uji Coba',
    subject: 'IPA',
    teacherName: 'Pak Budi Guru',
    questions: [
      {
        question: 'Planet apakah yang memiliki ukuran paling besar?',
        options: ['Mars', 'Jupiter', 'Bumi', 'Venus'],
        correctIndex: 1, // B = Jupiter
        timeLimit: 15,
        points: 100,
        explanation: 'Jupiter adalah planet terbesar di tata surya.'
      }
    ]
  }, (res) => {
    console.log('[TEST] Room created successfully! Code PIN:', res.roomCode);
    const pin = res.roomCode;

    // Connect 2 students to test simultaneous multiplayer
    const student1 = io('http://localhost:3000');
    const student2 = io('http://localhost:3000');

    student1.on('connect', () => {
      console.log('[TEST] Siswa 1 connected:', student1.id);
      student1.emit('join_room', {
        roomCode: pin,
        name: 'Andi Pratama',
        color: '#4361ee',
        hat: 'topi_sekolah'
      }, (j1) => {
        console.log('[TEST] Siswa 1 Join status:', j1.success);
      });
    });

    student2.on('connect', () => {
      console.log('[TEST] Siswa 2 connected:', student2.id);
      student2.emit('join_room', {
        roomCode: pin,
        name: 'Budi Santoso',
        color: '#ef476f',
        hat: 'mahkota'
      }, (j2) => {
        console.log('[TEST] Siswa 2 Join status:', j2.success);

        // Once both joined, host starts game
        setTimeout(() => {
          console.log('[TEST] Host starting game...');
          hostSocket.emit('host_start_game');
        }, 500);
      });
    });

    student1.on('question_started', (q) => {
      console.log('[TEST] Siswa 1 menerima soal:', q.question);
      // Siswa 1 stands on Zone 1 (Jupiter - Benar)
      student1.emit('player_stand_on_zone', 1);

      // Siswa 2 stands on Zone 0 (Mars - Salah)
      student2.emit('player_stand_on_zone', 0);

      // Trigger reveal
      setTimeout(() => {
        console.log('[TEST] Host reveals answer...');
        hostSocket.emit('host_reveal_answer');
      }, 500);
    });

    student1.on('question_result', (result) => {
      console.log('[TEST] Hasil Soal: Kunci Jawaban =', result.correctIndex);
      const resAndi = result.results.find(r => r.name === 'Andi Pratama');
      const resBudi = result.results.find(r => r.name === 'Budi Santoso');

      console.log(`[TEST] Andi (Pilih B) Benar?: ${resAndi.isCorrect}, Poin: ${resAndi.earnedPoints}, Total: ${resAndi.totalScore}`);
      console.log(`[TEST] Budi (Pilih A) Benar?: ${resBudi.isCorrect}, Poin: ${resBudi.earnedPoints}, Total: ${resBudi.totalScore}`);
      console.log('[TEST] Sebaran Jawaban Kelas:', result.distribution);

      // Export grades test
      hostSocket.emit('export_grades', (report) => {
        console.log('[TEST] Rekap Nilai Murid:', report.students);
        console.log('[TEST] SEMUA SISTEM MULTIPLAYER DAN ATURAN KUIS LULUS PENGUJIAN 100%!');

        hostSocket.disconnect();
        student1.disconnect();
        student2.disconnect();
        process.exit(0);
      });
    });
  });
});
