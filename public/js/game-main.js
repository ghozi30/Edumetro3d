// Main Game Loop & Interaction Controller for EduVerse 3D

document.addEventListener('DOMContentLoaded', () => {
  // 1. Parse URL & Session Parameters (Tanpa Kode PIN — Langsung Berdasarkan Gedung Mini Game!)
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-01').toLowerCase().trim();
  const isTeacher = (sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo' || urlParams.get('role') === 'host');

  const gameMeta = (window.MINIGAMES_REGISTRY || []).find(g => g.id === gameId) || {
    id: gameId,
    icon: '',
    name: 'Stadium Kuis Lari 3D',
    subject: 'Edukasi'
  };

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru Fasilitator' : 'Siswa');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  // Display Mini Game Name & Icon in HUD
  const gameIconEl = document.getElementById('hud-game-icon');
  if (gameIconEl) gameIconEl.innerHTML = window.UI_ICONS ? window.UI_ICONS.svg(gameMeta.icon || 'trophy', 18) : '';
  document.getElementById('hud-room-pin').textContent = gameMeta.name;
  document.title = `${gameMeta.name} — EduMetro 3D`;

  // 2. Initialize 3D Engine dengan Tema Khusus Mini Game (mg-01 / mg-02 / mg-03)
  const container = document.getElementById('canvas-container');
  const world = new World3D(container, gameId);

  // 3. Create Local Player Avatar
  const localAvatar = new Avatar3D(world.scene, {
    name: isTeacher ? `${playerName}` : playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });

  // Position avatar in lobby
  localAvatar.group.position.set(0, 0, 5);

  // 4. Initialize Controls & Camera
  const controls = new Controls(world.camera, localAvatar, container);

  // 5. Setup Game State Variables & Network Client Reference
  const network = window.NetworkClient;
  network.isHost = isTeacher;

  let currentStandingZone = null; // null or 0, 1, 2, 3
  let currentQuestion = null;
  let myScore = 0;
  let myStreak = 0;
  const keyLabels = ['A', 'B', 'C', 'D'];
  const zonePillClasses = ['zone-pill-A', 'zone-pill-B', 'zone-pill-C', 'zone-pill-D'];

  // Controls panel elements
  const btnHostStart = document.getElementById('btn-host-start');
  const gameLevelSelect = document.getElementById('game-level-select');
  if (gameLevelSelect) {
    gameLevelSelect.addEventListener('change', () => {
      if (network && network.socket) {
        network.socket.emit('game_set_level', { level: gameLevelSelect.value });
      }
    });
  }
  const btnHostReveal = document.getElementById('btn-host-reveal');
  const btnHostNext = document.getElementById('btn-host-next');
  const btnHostExport = document.getElementById('btn-host-export');
  const btnHostEditQuiz = document.getElementById('btn-host-edit-quiz');
  const btnDownloadGrades = document.getElementById('btn-download-grades');

  if (isTeacher) {
    btnHostEditQuiz.style.display = 'inline-flex';
    btnHostEditQuiz.href = `guru.html?game=${encodeURIComponent(gameId)}`;
    btnHostExport.style.display = 'inline-flex';
    btnDownloadGrades.style.display = 'inline-flex';
    document.getElementById('controls-panel-label').textContent = 'GURU:';
  }

  // Sound toggle button
  const soundBtn = document.getElementById('btn-toggle-sound');
  let soundEnabled = true;
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    window.soundFX.enabled = soundEnabled;
    soundBtn.textContent = soundEnabled ? 'SFX' : 'MUTE';
  });

  // Emote dropdown toggle & reaction buttons
  const gEmoteToggle = document.getElementById('btn-game-emote-toggle');
  const gEmoteMenu = document.getElementById('game-emote-menu');
  if (gEmoteToggle && gEmoteMenu) {
    gEmoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = gEmoteMenu.classList.toggle('open');
      gEmoteToggle.classList.toggle('open', open);
    });
  }
  document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emote = btn.getAttribute('data-emote');
      localAvatar.showEmote(emote);
      window.soundFX.pop();
      window.NetworkClient.sendEmote(emote);
      if (gEmoteMenu) gEmoteMenu.classList.remove('open');
      if (gEmoteToggle) gEmoteToggle.classList.remove('open');
    });
  });

  // 6. Connect Network Client — Langsung Join ke Room Mini Game Tanpa PIN!
  network.connect((socketId) => {
    network.socket.emit('join_minigame', {
      gameId: gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      level: (document.getElementById('game-level-select') && document.getElementById('game-level-select').value) || 'sd',
      name: playerName,
      color: playerColor,
      hat: playerHat,
      role: isTeacher ? 'teacher' : 'student'
    }, (res) => {
      if (!res || !res.success) {
        alert('Gagal masuk ke arena mini game!');
        window.location.href = 'index.html';
        return;
      }
      network.roomCode = res.roomCode;
      world.updateJumbotronText(
        res.room.subject,
        res.room.title,
        'Klik "Mulai Kuis" saat seluruh teman sekelas sudah masuk!',
        'SIAP'
      );

      // Jika ternyata permainan sudah berlangsung saat siswa terlambat masuk
      if (res.room.currentQuestion) {
        network.trigger('question_started', res.room.currentQuestion);
      }
    });
  });

  if (network.socket) {
    network.socket.on('game_level_changed', (data) => {
      if (gameLevelSelect && data && data.level) gameLevelSelect.value = data.level;
    });
  }

  // 7. Network Event Handlers
  // Remote player joins
  network.on('remote_player_joined', (playerData) => {
    if (playerData.id === network.myPlayerId) return;
    if (network.remotePlayers[playerData.id]) return;

    const remoteAvatar = new Avatar3D(world.scene, {
      name: playerData.name,
      color: playerData.color,
      hat: playerData.hat,
      isLocal: false
    });

    remoteAvatar.group.position.set(playerData.position.x, playerData.position.y, playerData.position.z);

    network.remotePlayers[playerData.id] = {
      avatar: remoteAvatar,
      targetPos: { x: playerData.position.x, y: playerData.position.y, z: playerData.position.z },
      targetRotY: playerData.rotationY,
      isMoving: false,
      isJumping: false
    };
  });

  // Player list updated
  network.on('player_list_updated', (playersList) => {
    document.getElementById('hud-player-count').textContent = `(${playersList.length})`;
    renderLeaderboard(playersList);

    // Ensure all remote players have avatars
    playersList.forEach(p => {
      if (p.id !== network.myPlayerId && !network.remotePlayers[p.id]) {
        network.trigger('remote_player_joined', p);
      }
    });
  });

  // Remote emote
  network.on('player_emote', (data) => {
    if (network.remotePlayers[data.id]) {
      network.remotePlayers[data.id].avatar.showEmote(data.emote);
    }
  });

  // Question round started!
  network.on('question_started', (qData) => {
    currentQuestion = qData;
    document.getElementById('round-result-modal').style.display = 'none';

    updateStandingZonePill(null);

    // Update Papan Soal 3D (Jumbotron) & Papan Pilihan A, B, C, D di setiap platform
    world.updateJumbotronText(
      `SOAL ${qData.index + 1}/${qData.total} • ${qData.category}`,
      qData.question,
      'Berlari ke Platform A, B, C, atau D sebelum waktu habis!',
      `${qData.timeLimit}s`,
      qData.options
    );
    world.updatePlatformOptions(qData.options);

    // Controls toggle
    btnHostStart.style.display = 'none';
    btnHostReveal.style.display = 'inline-flex';
    btnHostNext.style.display = 'none';
    document.getElementById('victory-modal').style.display = 'none';
  });

  // Timer Tick
  network.on('timer_tick', (data) => {
    const sec = data.timer;
    const timerBox = document.getElementById('hud-timer-box');
    const timerText = document.getElementById('hud-timer-sec');

    timerText.textContent = `${sec}s`;

    if (sec <= 5) {
      timerBox.classList.add('hud-timer-urgent');
      window.soundFX.urgentTick();
    } else {
      timerBox.classList.remove('hud-timer-urgent');
      window.soundFX.tick();
    }

    if (currentQuestion) {
      world.updateJumbotronText(
        `SOAL ${currentQuestion.index + 1}/${currentQuestion.total} • ${currentQuestion.category}`,
        currentQuestion.question,
        'Berlari ke Platform A, B, C, atau D sebelum waktu habis!',
        `${sec}s`,
        currentQuestion.options
      );
    }
  });

  // Question Result Reveal
  network.on('question_result', (resData) => {
    const correctIdx = resData.correctIndex;
    world.highlightRevealResult(correctIdx);

    // Update local player result
    const myResult = resData.results.find(r => r.id === network.myPlayerId);
    showResultModal(myResult, resData);

    // Controls toggle
    btnHostReveal.style.display = 'none';
    btnHostNext.style.display = 'inline-flex';
  });

  // Game Finished & Victory Podium
  network.on('game_finished', (finishData) => {
    window.soundFX.victory();
    world.triggerFireworks(0, 10, 0, 0xffd166);
    world.triggerFireworks(-10, 8, -5, 0x06d6a0);
    world.triggerFireworks(10, 8, -5, 0xef476f);

    const podium = finishData.podium || [];
    if (podium[0]) {
      document.getElementById('podium-name-1').textContent = podium[0].name;
      document.getElementById('podium-score-1').textContent = `${podium[0].score} Pts`;
    }
    if (podium[1]) {
      document.getElementById('podium-name-2').textContent = podium[1].name;
      document.getElementById('podium-score-2').textContent = `${podium[1].score} Pts`;
    }
    if (podium[2]) {
      document.getElementById('podium-name-3').textContent = podium[2].name;
      document.getElementById('podium-score-3').textContent = `${podium[2].score} Pts`;
    }

    document.getElementById('round-result-modal').style.display = 'none';
    document.getElementById('victory-modal').style.display = 'flex';
  });

  // Arena Controls Listeners (Bisa dimulai langsung tanpa kode PIN!)
  btnHostStart.addEventListener('click', () => {
    network.socket.emit('minigame_start');
  });

  btnHostReveal.addEventListener('click', () => {
    network.socket.emit('minigame_reveal');
  });

  const nextHandler = () => {
    network.socket.emit('minigame_next');
  };
  btnHostNext.addEventListener('click', nextHandler);
  document.getElementById('btn-modal-next-q').addEventListener('click', nextHandler);

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('victory-modal').style.display = 'none';
    myScore = 0;
    myStreak = 0;
    document.getElementById('hud-player-score').textContent = '0';
    document.getElementById('hud-streak-count').textContent = '0';
    network.socket.emit('minigame_start');
  });

  if (isTeacher) {
    const exportHandler = () => {
      network.socket.emit('export_grades', (report) => {
        if (!report) return;
        downloadGradesCsv(report);
      });
    };
    btnHostExport.addEventListener('click', exportHandler);
    btnDownloadGrades.addEventListener('click', exportHandler);
  }

  // 8. Result Modal Display Helper
  function showResultModal(myRes, resData) {
    const modal = document.getElementById('round-result-modal');
    const icon = document.getElementById('res-icon');
    const title = document.getElementById('res-title');
    const pts = document.getElementById('res-pts');
    const expl = document.getElementById('res-explanation');
    const distBars = document.getElementById('res-distribution-bars');

    const correctIdx = resData.correctIndex;
    const isCorrect = myRes ? myRes.isCorrect : false;

    if (isCorrect) {
      window.soundFX.correct();
      icon.textContent = '';
      title.textContent = 'HEBAT! JAWABAN BENAR!';
      title.className = 'result-title result-correct';
      pts.textContent = `+${myRes.earnedPoints} Poin Ditambahkan! (Streak ${myRes.streak})`;
      myScore = myRes.totalScore;
      myStreak = myRes.streak;
    } else {
      window.soundFX.wrong();
      icon.textContent = '';
      title.textContent = 'KURANG TEPAT!';
      title.className = 'result-title result-wrong';
      const myChosen = myRes && myRes.answer !== null ? `Pilihan ${keyLabels[myRes.answer]}` : 'Tidak Berdiri di Zona';
      pts.textContent = `Pilihanmu: ${myChosen} • Jawaban Benar: Platform ${keyLabels[correctIdx]}`;
      if (myRes) {
        myScore = myRes.totalScore;
        myStreak = 0;
      }
    }

    document.getElementById('hud-player-score').textContent = myScore;
    document.getElementById('hud-streak-count').textContent = myStreak;

    expl.textContent = resData.explanation;

    // Distribution Bars
    distBars.innerHTML = '';
    const dist = resData.distribution || [0, 0, 0, 0];
    dist.forEach((count, idx) => {
      const isWinner = (idx === correctIdx);
      const div = document.createElement('div');
      div.style.cssText = `
        padding: 0.35rem 0.8rem;
        border-radius: 6px;
        background: ${isWinner ? 'rgba(6,214,160,0.3)' : 'rgba(255,255,255,0.08)'};
        border: 1px solid ${isWinner ? '#06d6a0' : 'rgba(255,255,255,0.1)'};
        font-weight: 700;
      `;
      div.textContent = `${keyLabels[idx]}: ${count} Siswa`;
      distBars.appendChild(div);
    });

    modal.style.display = 'flex';
  }

  // 9. Zone Collision Detection & HUD Updates
  function checkZoneCollision() {
    const avatarPos = localAvatar.group.position;
    const detectedZone = world.detectPlayerZone(avatarPos.x, avatarPos.z);

    if (detectedZone !== currentStandingZone) {
      currentStandingZone = detectedZone;
      updateStandingZonePill(detectedZone);
      network.sendStandingZone(detectedZone);

      if (detectedZone !== null) {
        window.soundFX.selectZone();
      }
    }
  }

  let zonePillHideTimer = null;

  function updateStandingZonePill(zoneIndex) {
    const pill = document.getElementById('hud-standing-zone');
    if (!pill) return;
    pill.className = 'current-zone-pill';
    pill.style.transition = 'opacity 0.4s ease';
    pill.style.opacity = '1';
    pill.style.visibility = 'visible';

    if (zoneIndex === null || zoneIndex === undefined) {
      pill.classList.add('zone-pill-none');
      pill.textContent = 'Berlari ke Platform A, B, C, atau D untuk menjawab!';
    } else {
      pill.classList.add(zonePillClasses[zoneIndex]);
      const optText = currentQuestion && currentQuestion.options ? currentQuestion.options[zoneIndex] : '';
      pill.textContent = `Berdiri di Zona [${keyLabels[zoneIndex]}]: ${optText}`;
    }

    // Muncul selama 3 detik saja, lalu otomatis menghilang agar layar tengah lega
    if (zonePillHideTimer) clearTimeout(zonePillHideTimer);
    zonePillHideTimer = setTimeout(() => {
      pill.style.opacity = '0';
      setTimeout(() => {
        if (pill.style.opacity === '0') pill.style.visibility = 'hidden';
      }, 420);
    }, 3000);
  }

  // Sembunyikan teks instruksi awal juga setelah 3 detik
  updateStandingZonePill(null);

  // 10. Mini-Leaderboard Render
  function renderLeaderboard(players) {
    const rankList = document.getElementById('hud-rank-list');
    rankList.innerHTML = '';

    const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
    sorted.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <span class="rank-pos">#${idx + 1}</span>
        <span class="rank-name">${p.name} ${p.id === network.myPlayerId ? '(Anda)' : ''}</span>
        <span class="rank-score">${p.score}</span>
      `;
      rankList.appendChild(item);
    });
  }

  // 11. Download Rekap Nilai CSV
  function downloadGradesCsv(report) {
    let csv = 'No,Nama Siswa,Total Skor,Jawaban Benar,Maks Streak\n';
    report.students.forEach((s, idx) => {
      csv += `"${idx + 1}","${s.name}","${s.score}","${s.correctCount}","${s.streakMax}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `REKAP_NILAI_${report.roomCode || gameId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // 12. Main 60 FPS Render Loop
  let lastTime = performance.now();

  function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Update Controls & Local Avatar
    controls.update(delta);
    localAvatar.update(delta);

    // Check standing zone
    checkZoneCollision();

    // Broadcast local movement to server
    network.sendMovement(localAvatar);

    // Interpolate remote players
    network.updateRemoteAvatars(delta);

    // Update 3D World (particles, fireworks)
    world.update(delta);

    // Render Three.js scene
    world.renderer.render(world.scene, world.camera);
  }

  requestAnimationFrame(animate);
});
