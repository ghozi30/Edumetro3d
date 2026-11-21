// Mini Game #08: Lampu Merah, Lampu Hijau PUEBI (Balai Bahasa — SD & SMP)
// Modular Three.js + Socket.IO + Maskot Pengawas 3D + Efek Laser Merah + Fallback 5 Bot Siswa.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-08').toLowerCase().trim();
  const isTeacher = sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo';

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru' : 'Siswa');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  const START_Z = 4.0;
  const FINISH_Z = -76.0;
  const TRACK_LENGTH = START_Z - FINISH_Z; // 80 meter

  // ==================== 1. SCENE 3D BALAI BAHASA ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbae6fd);
  scene.fog = new THREE.FogExp2(0xbae6fd, 0.0055);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 420);
  camera.position.set(0, 8, 16);

  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x86efac, 0.8));
  const sun = new THREE.DirectionalLight(0xfffbeb, 0.92);
  sun.position.set(35, 70, 35);
  sun.castShadow = true;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // ==================== 2. ELEMEN 3D ARENA, PAPAN RAKSASA, & MASKOT PENGAWAS ====================
  let boardCanvas = null;
  let boardTex = null;
  let indicatorLampMesh = null;
  let mascotGroup = null;
  let mascotTargetYaw = 0; // 0 = menghadap lintasan (+Z), Math.PI = membelakangi
  let activeLasers = [];   // { line, life }

  function buildBalaiBahasaArena() {
    // 1. Hamparan Rumput Lapangan Balai Bahasa
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshLambertMaterial({ color: 0x4ade80 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.05, -36);
    grass.receiveShadow = true;
    scene.add(grass);

    // 2. Lintasan Lari Lurus Panjang (lebar 22m, panjang 94m)
    const trackMat = new THREE.MeshLambertMaterial({ color: 0xe07a5f }); // Merah bata lintasan atletik!
    const track = new THREE.Mesh(new THREE.PlaneGeometry(22, 94), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.02, -36);
    track.receiveShadow = true;
    scene.add(track);

    // Garis Lajur Lari Putih (6 lajur)
    const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let lx = -9; lx <= 9; lx += 3.6) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 86), laneLineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lx, 0.04, -36);
      scene.add(line);
    }

    // Garis Start (Hijau) & Penanda 25%, 50%, 75%
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.05, START_Z - 1);
    scene.add(startLine);

    [0.25, 0.5, 0.75].forEach(frac => {
      const mz = START_Z - frac * TRACK_LENGTH;
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.35), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(0, 0.045, mz);
      scene.add(mark);
    });

    // Garis Finis Kotak-Kotak + 2 Bendera Finis
    const finC = document.createElement('canvas');
    finC.width = 512;
    finC.height = 64;
    const fc = finC.getContext('2d');
    for (let i = 0; i < 16; i++) {
      fc.fillStyle = i % 2 === 0 ? '#ffffff' : '#0f172a';
      fc.fillRect(i * 32, 0, 32, 64);
    }
    const finLine = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 2.0),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(finC) })
    );
    finLine.rotation.x = -Math.PI / 2;
    finLine.position.set(0, 0.05, FINISH_Z);
    scene.add(finLine);

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    [-11.5, 11.5].forEach(fx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7.5, 8), poleMat);
      pole.position.set(fx, 3.75, FINISH_Z);
      scene.add(pole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 0.12), new THREE.MeshLambertMaterial({ color: 0xf43f5e }));
      flag.position.set(fx + (fx < 0 ? 1.4 : -1.4), 6.5, FINISH_Z);
      scene.add(flag);
    });

    // Pohon Taman di Kiri & Kanan Lintasan
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    for (let z = 6; z >= -78; z -= 14) {
      [-16, 16].forEach(tx => {
        const tg = new THREE.Group();
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.2, 6), trunkMat);
        tr.position.y = 1.1;
        tg.add(tr);
        const lf = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), leafMat);
        lf.position.y = 3.2;
        tg.add(lf);
        tg.position.set(tx, 0, z);
        scene.add(tg);
      });
    }

    // 3. Papan Layar Raksasa 3D di Ujung Finis (z = -85)
    boardCanvas = document.createElement('canvas');
    boardCanvas.width = 1280;
    boardCanvas.height = 512;
    boardTex = new THREE.CanvasTexture(boardCanvas);

    const boardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(28, 11.2, 1.2),
      [poleMat, poleMat, poleMat, poleMat, new THREE.MeshBasicMaterial({ map: boardTex }), poleMat]
    );
    boardMesh.position.set(0, 12.2, -85);
    scene.add(boardMesh);

    // 2 Tiang Penyangga Papan Raksasa
    [-11, 11].forEach(px => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 12, 12), poleMat);
      p.position.set(px, 6, -85);
      scene.add(p);
    });

    // Lampu Indikator Besar di Atas Papan Raksasa
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.8, 24), poleMat);
    lampHousing.position.set(0, 18.2, -85);
    scene.add(lampHousing);

    indicatorLampMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    indicatorLampMesh.position.set(0, 19.6, -85);
    scene.add(indicatorLampMesh);

    // 4. Maskot Pengawas 3D (Robot Pengawas Balai Bahasa berdiri di z = -80)
    mascotGroup = new THREE.Group();
    const mBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 1.8), new THREE.MeshLambertMaterial({ color: 0x3b82f6 }));
    mBody.position.y = 2.6;
    mascotGroup.add(mBody);

    const mHead = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
    mHead.position.y = 5.4;
    mascotGroup.add(mHead);

    // Visor Mata Scanner (+Z menghadap lintasan)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.2), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    visor.position.set(0, 5.5, 1.12);
    mascotGroup.add(visor);

    [-0.5, 0.5].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      eye.position.set(ex, 5.5, 1.22);
      mascotGroup.add(eye);
    });

    const mPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.0, 16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    mPedestal.position.y = 0.5;
    mascotGroup.add(mPedestal);

    mascotGroup.position.set(0, 0, -80);
    scene.add(mascotGroup);

    drawPuebiBoard('BALAI BAHASA PUEBI', 'KLIK MULAI!', 'Kata Baku = Lari • Tidak Baku = Diam!', '#38bdf8');
  }

  function drawPuebiBoard(header, mainWord, footer, borderHex) {
    if (!boardCanvas) return;
    const ctx = boardCanvas.getContext('2d');
    const w = 1280;
    const h = 512;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = borderHex || '#38bdf8';
    ctx.fillRect(0, 0, w, 80);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(header, w / 2, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 124px sans-serif';
    ctx.fillText(String(mainWord || '').toUpperCase(), w / 2, 275);

    ctx.fillStyle = borderHex || '#7dd3fc';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(footer || '', w / 2, h - 54);

    ctx.strokeStyle = borderHex || '#38bdf8';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    boardTex.needsUpdate = true;
  }

  // Efek Laser Merah 3D dari Mata Maskot Pengawas ke Pemain yang Ketahuan Bergerak!
  function fireRedLaserAt(targetPos) {
    const start = new THREE.Vector3(0, 5.5, -79);
    const end = new THREE.Vector3(targetPos.x, targetPos.y + 1.8, targetPos.z);
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xff1e42, linewidth: 4 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    activeLasers.push({ line, geo, mat, life: 0.45 });
  }

  // ==================== 3. STATE PERMAINAN & MEKANIK PUEBI ====================
  let currentLevel = 'sd';
  let gameState = 'LOBBY'; // LOBBY | RUNNING
  let currentWordObj = null;
  let isScanning = false;  // false selama grace period (~1.1s), true setelahnya!
  let graceTimeout = null;
  let penaltyCooldown = 0;
  let hasFinished = false;
  let roundStartLocal = performance.now();

  let localAvatar = null;
  let controls = null;
  const remotePlayers = {};
  let bots = [];
  let socket = null;
  let lastEmitTime = 0;

  buildBalaiBahasaArena();

  localAvatar = new Avatar3D(scene, {
    name: isTeacher ? `${playerName}` : playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, START_Z);
  localAvatar.group.rotation.y = Math.PI;

  controls = new Controls(camera, localAvatar, container, {
    moveSpeed: 9.5,
    maxRadius: 95
  });

  let toastTimer = null;
  function showLaserToast(msg) {
    const el = document.getElementById('puebi-laser-toast');
    el.textContent = msg;
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
  }

  function applyNewWord(wordObj) {
    currentWordObj = wordObj;
    isScanning = false;
    if (graceTimeout) clearTimeout(graceTimeout);

    const banner = document.getElementById('puebi-word-banner');
    const phaseTag = document.getElementById('puebi-phase-tag');
    const wordEl = document.getElementById('puebi-word-main');
    const prevNote = document.getElementById('puebi-prev-note');

    // Tampilkan edukasi singkat status kata sebelumnya (Hijau=Baku / Merah=Tidak Baku)
    if (wordObj.prevWord) {
      if (wordObj.prevIsBaku) {
        prevNote.textContent = `Sebelumnya: "${wordObj.prevWord}" KATA BAKU`;
        prevNote.style.color = '#34d399';
        banner.className = 'puebi-word-banner prev-baku';
      } else {
        prevNote.textContent = `Sebelumnya: "${wordObj.prevWord}" Tidak Baku (Baku: ${wordObj.prevBakuForm})`;
        prevNote.style.color = '#fb7185';
        banner.className = 'puebi-word-banner prev-tidak';
      }
      setTimeout(() => { banner.className = 'puebi-word-banner'; }, 900);
    } else {
      prevNote.textContent = '';
    }

    // FASE BACA (~1.1 detik grace period): Warna NETRAL Biru/Putih agar siswa benar-benar membaca kata!
    wordEl.textContent = wordObj.word;
    phaseTag.textContent = `BACA KATA (${currentLevel.toUpperCase()}) • SIAPKAN POSISI!`;
    if (indicatorLampMesh) indicatorLampMesh.material.color.setHex(0x38bdf8);
    drawPuebiBoard(`BALAI BAHASA • MODE ${currentLevel.toUpperCase()}`, wordObj.word, 'BACA KATA! Baku = Lari • Tidak Baku = Diam', '#38bdf8');
    window.soundFX.tick();

    // Setelah 1.1 detik -> Mulai Pemindaian Gerakan!
    graceTimeout = setTimeout(() => {
      if (currentWordObj !== wordObj || gameState !== 'RUNNING') return;
      isScanning = true;
      phaseTag.textContent = `MEMINDAI GERAKAN... (${currentLevel.toUpperCase()})`;
      // Maskot menoleh menghadap lintasan saat kata TIDAK BAKU, membelakangi saat kata BAKU
      mascotTargetYaw = wordObj.isBaku ? Math.PI : 0;
    }, wordObj.graceMs || 1100);
  }

  // ==================== 4. FALLBACK 5 BOT SISWA (BISA KEPLESET REM MENDADAK!) ====================
  function initPuebiBots() {
    clearPuebiBots();
    const profiles = [
      { name: 'Raka (Bot)', color: '#fb7185', hat: 'topi_sekolah' },
      { name: 'Sinta (Bot)', color: '#a78bfa', hat: 'telinga_kucing' },
      { name: 'Bima (Bot)', color: '#fbbf24', hat: 'topi_wisuda' },
      { name: 'Nadia (Bot)', color: '#10b981', hat: 'none' },
      { name: 'Doni (Bot)', color: '#f97316', hat: 'topi_sekolah' }
    ];
    profiles.forEach((bp, i) => {
      const av = new Avatar3D(scene, { name: bp.name, color: bp.color, hat: bp.hat, isLocal: false });
      const bx = -7.2 + i * 3.6;
      av.group.position.set(bx, 0, START_Z);
      av.group.rotation.y = Math.PI;
      bots.push({
        id: `pbot_${i}`,
        name: bp.name,
        avatar: av,
        x: bx,
        z: START_Z,
        speed: 6.2 + Math.random() * 2.5,
        slipChance: 0.25 + Math.random() * 0.2, // Kadang telat ngerem saat kata tidak baku!
        penaltyCd: 0,
        finished: false,
        finishTime: null
      });
    });
  }

  function clearPuebiBots() {
    bots.forEach(b => b.avatar.destroy());
    bots = [];
  }

  function updatePuebiBots(delta) {
    if (Object.keys(remotePlayers).length > 0 && bots.length > 0) {
      clearPuebiBots();
      return;
    }
    if (gameState !== 'RUNNING' || !currentWordObj) return;

    bots.forEach(b => {
      if (b.finished) {
        b.avatar.isMoving = false;
        b.avatar.update(delta);
        return;
      }
      if (b.penaltyCd > 0) b.penaltyCd -= delta;

      // Bot lari saat kata baku, atau kadang kepleset tetap lari saat kata tidak baku!
      const shouldRun = currentWordObj.isBaku || (!isScanning && Math.random() < 0.7) || (isScanning && Math.random() < b.slipChance * 0.15);
      if (shouldRun) {
        b.avatar.isMoving = true;
        b.z -= b.speed * delta;
        b.avatar.group.position.z = b.z;

        // Jika bot ketahuan bergerak saat scanning kata TIDAK BAKU -> kena laser & terpental mundur!
        if (isScanning && !currentWordObj.isBaku && b.penaltyCd <= 0) {
          b.penaltyCd = 2.0;
          fireRedLaserAt(b.avatar.group.position);
          const distFromStart = Math.max(0, START_Z - b.z);
          b.z = Math.min(START_Z, b.z + Math.max(6, distFromStart * 0.28));
          b.avatar.group.position.z = b.z;
        }

        if (b.z <= FINISH_Z) {
          b.finished = true;
          b.z = FINISH_Z;
          b.finishTime = parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(2));
        }
      } else {
        b.avatar.isMoving = false;
      }
      b.avatar.update(delta);
    });
  }

  // ==================== 5. UI EMOTE DROPDOWN & SOCKET.IO ====================
  const emoteToggle = document.getElementById('btn-puebi-emote-toggle');
  const emoteMenu = document.getElementById('puebi-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = emoteMenu.classList.toggle('open');
      emoteToggle.classList.toggle('open', open);
    });
  }
  document.querySelectorAll('.puebi-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('puebi_emote', em);
      if (emoteMenu) emoteMenu.classList.remove('open');
      if (emoteToggle) emoteToggle.classList.remove('open');
    });
  });

  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  const setLevelUI = (lvl) => {
    document.getElementById('btn-puebi-sd').classList.toggle('active', lvl === 'sd');
    document.getElementById('btn-puebi-smp').classList.toggle('active', lvl === 'smp');
  };

  document.getElementById('btn-puebi-sd').addEventListener('click', () => {
    currentLevel = 'sd';
    setLevelUI('sd');
    if (socket) socket.emit('puebi_start', { level: 'sd' });
  });
  document.getElementById('btn-puebi-smp').addEventListener('click', () => {
    currentLevel = 'smp';
    setLevelUI('smp');
    if (socket) socket.emit('puebi_start', { level: 'smp' });
  });
  document.getElementById('btn-puebi-start').addEventListener('click', () => {
    if (socket) socket.emit('puebi_start', { level: currentLevel });
  });
  document.getElementById('btn-puebi-play-again').addEventListener('click', () => {
    document.getElementById('puebi-finish-modal').style.display = 'none';
    if (socket) socket.emit('puebi_start', { level: currentLevel });
  });

  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_puebi', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      level: currentLevel,
      name: playerName,
      color: playerColor,
      hat: playerHat,
      role: isTeacher ? 'teacher' : 'student'
    }, (res) => {
      if (!res || !res.success) return;
      currentLevel = res.level || 'sd';
      setLevelUI(currentLevel);
      gameState = res.state || 'LOBBY';
      localAvatar.group.position.set(res.player.x, 0, START_Z);

      (res.players || []).forEach(p => {
        if (p.id !== socket.id) spawnRemotePuebiPlayer(p);
      });
      if (Object.keys(remotePlayers).length === 0) initPuebiBots();
      if (res.currentWordObj && gameState === 'RUNNING') applyNewWord(res.currentWordObj);
      renderPuebiLeaderboard();
    });
  });

  function spawnRemotePuebiPlayer(p) {
    if (remotePlayers[p.id]) return;
    const av = new Avatar3D(scene, { name: p.name, color: p.color, hat: p.hat, isLocal: false });
    av.group.position.set(p.x, p.y, p.z);
    remotePlayers[p.id] = {
      avatar: av,
      name: p.name,
      targetPos: { x: p.x, y: p.y, z: p.z },
      targetRotY: p.rotY || Math.PI,
      isMoving: false,
      isJumping: false,
      progress: p.progress || 0,
      finished: p.finished || false,
      finishTime: p.finishTime || null
    };
  }

  socket.on('puebi_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemotePuebiPlayer(p);
    renderPuebiLeaderboard();
  });

  socket.on('puebi_player_left', (id) => {
    if (remotePlayers[id]) {
      remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
    renderPuebiLeaderboard();
  });

  socket.on('puebi_player_moved', (m) => {
    const rp = remotePlayers[m.id];
    if (!rp) return;
    rp.targetPos = { x: m.x, y: m.y, z: m.z };
    rp.targetRotY = m.rotY;
    rp.isMoving = m.isMoving;
    rp.isJumping = m.isJumping;
    rp.progress = m.progress || 0;
  });

  socket.on('puebi_player_emote', (d) => {
    if (remotePlayers[d.id]) remotePlayers[d.id].avatar.showEmote(d.emote);
  });

  socket.on('puebi_round_started', (data) => {
    currentLevel = data.level || 'sd';
    setLevelUI(currentLevel);
    gameState = 'RUNNING';
    hasFinished = false;
    penaltyCooldown = 0;
    roundStartLocal = performance.now();
    document.getElementById('puebi-finish-modal').style.display = 'none';
    document.getElementById('btn-puebi-start').textContent = 'Ulang';

    localAvatar.group.position.set(0, 0, START_Z);
    localAvatar.group.rotation.set(0, Math.PI, 0);
    if (Object.keys(remotePlayers).length === 0) initPuebiBots();
  });

  socket.on('puebi_word_changed', (wordObj) => {
    if (gameState === 'RUNNING') applyNewWord(wordObj);
  });

  socket.on('puebi_standings_updated', (data) => {
    if (hasFinished) showPuebiFinishModal(data.standings);
  });

  function getProgressPct(z) {
    return Math.max(0, Math.min(100, Math.round(((START_Z - z) / TRACK_LENGTH) * 100)));
  }

  function getCombinedPuebiStandings() {
    const myPct = getProgressPct(localAvatar.group.position.z);
    const myTime = hasFinished ? parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(1)) : null;
    const all = [
      { id: socket ? socket.id : 'me', name: playerName, progress: myPct, finished: hasFinished, finishTime: myTime, isMe: true },
      ...Object.entries(remotePlayers).map(([id, rp]) => ({
        id, name: rp.name, progress: rp.progress, finished: rp.finished, finishTime: rp.finishTime, isMe: false
      })),
      ...bots.map(b => ({
        id: b.id, name: b.name, progress: getProgressPct(b.z), finished: b.finished, finishTime: b.finishTime, isMe: false
      }))
    ];
    return all.sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 999) - (b.finishTime || 999);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }

  function renderPuebiLeaderboard() {
    const list = getCombinedPuebiStandings();
    document.getElementById('puebi-player-count').textContent = `(${list.length})`;
    const el = document.getElementById('puebi-rank-list');
    el.innerHTML = '';
    list.slice(0, 6).forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      div.innerHTML = `
        <span class="rank-pos">#${idx + 1}</span>
        <span class="rank-name">${p.name} ${p.isMe ? '(Anda)' : ''}</span>
        <span class="rank-score">${p.finished ? 'Finis' : `${p.progress}%`}</span>
      `;
      el.appendChild(div);
    });
  }

  function showPuebiFinishModal(serverStandings) {
    const list = serverStandings && serverStandings.length > 0 ? serverStandings : getCombinedPuebiStandings();
    const wrap = document.getElementById('puebi-finish-standings');
    wrap.innerHTML = '';
    const medals = ['#1', '#2', '#3'];
    list.slice(0, 6).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.45rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.92rem;';
      row.innerHTML = `
        <span><strong>${medals[i] || '#' + (i + 1)}</strong> ${s.name}</span>
        <span style="color:#34d399; font-weight:800;">${s.finished ? (s.finishTime ? s.finishTime + ' dtk' : 'Finis') : `${s.progress}%`}</span>
      `;
      wrap.appendChild(row);
    });
    document.getElementById('puebi-finish-modal').style.display = 'flex';
  }

  // ==================== 6. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();
  let uiTick = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (penaltyCooldown > 0) penaltyCooldown -= delta;

    // 1. Update Kontrol & Batasi Area Lintasan
    controls.update(delta);
    const pos = localAvatar.group.position;
    pos.x = Math.max(-10.2, Math.min(10.2, pos.x));
    pos.z = Math.max(FINISH_Z - 2, Math.min(START_Z + 2, pos.z));
    if (gameState !== 'RUNNING') {
      // Sebelum mulai, tetap di area Start
      pos.z = Math.max(START_Z - 1.5, pos.z);
    }
    localAvatar.update(delta);

    const pct = getProgressPct(pos.z);
    document.getElementById('hud-puebi-pct').textContent = `${pct}%`;

    // 2. Pemindaian Gerakan saat Kata TIDAK BAKU!
    if (gameState === 'RUNNING' && !hasFinished && isScanning && currentWordObj && !currentWordObj.isBaku) {
      if ((localAvatar.isMoving || localAvatar.isJumping) && penaltyCooldown <= 0) {
        penaltyCooldown = 1.6;
        fireRedLaserAt(pos);
        window.soundFX.wrong();
        showLaserToast(`${currentWordObj.word} → Yang baku: ${currentWordObj.bakuForm}`);

        // Pental mundur 28% jarak yang sudah ditempuh ke belakang!
        const distCovered = Math.max(0, START_Z - pos.z);
        const knockback = Math.max(6, distCovered * 0.28);
        pos.z = Math.min(START_Z, pos.z + knockback);
      }
    }

    // 3. Cek Garis Finis
    if (gameState === 'RUNNING' && !hasFinished && pos.z <= FINISH_Z) {
      hasFinished = true;
      window.soundFX.victory();
      socket.emit('puebi_finish');
      showPuebiFinishModal();
    }

    // 4. Sinkronisasi Posisi ke Server (18Hz)
    if (socket && now - lastEmitTime > 55) {
      socket.emit('puebi_move', {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping,
        progress: pct
      });
      lastEmitTime = now;
    }

    // 5. Interpolasi Pemain Remote, Update Bot, Maskot Pengawas, & Efek Laser Merah
    for (const id in remotePlayers) {
      const rp = remotePlayers[id];
      rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, 1 - Math.exp(-14 * delta));
      rp.avatar.isMoving = rp.isMoving;
      rp.avatar.isJumping = rp.isJumping;
      rp.avatar.update(delta);
    }
    updatePuebiBots(delta);

    if (mascotGroup) {
      mascotGroup.rotation.y = THREE.MathUtils.lerp(mascotGroup.rotation.y, mascotTargetYaw, 0.14);
    }

    for (let i = activeLasers.length - 1; i >= 0; i--) {
      const l = activeLasers[i];
      l.life -= delta;
      if (l.life <= 0) {
        scene.remove(l.line);
        l.geo.dispose();
        l.mat.dispose();
        activeLasers.splice(i, 1);
      }
    }

    uiTick += delta;
    if (uiTick > 0.35) {
      renderPuebiLeaderboard();
      uiTick = 0;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
});
