// Mini Game #11: Labirin Gerbang Matematika — Menara Robotika & Logika 3D (SD & SMP)
(function () {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('game') || 'mg-11';
  const playerName = localStorage.getItem('edumetro_name') || 'Penjelajah';
  const playerColor = localStorage.getItem('edumetro_color') || '#38bdf8';
  const playerHat = localStorage.getItem('edumetro_hat') || 'none';

  // ==================== 1. KONFIGURASI LABIRIN 5 ZONA ====================
  const MAZE_HALF_W = 13.5; // Lebar total lorong utama 27 unit
  const START_Z = 11;
  const TROPHY_Z = -135;
  const GATE_Z = [-14, -40, -66, -92, -118]; // 5 Gerbang Laser Berurutan

  // Dinding dekorasi & belokan labirin (tinggi 3.1 unit agar pandangan kamera lega!)
  // Setiap dinding: { x, z, w, d }
  const MAZE_WALLS = [
    // Dinding luar kiri & kanan sepanjang labirin (z: +16 .. -144)
    { x: -MAZE_HALF_W - 0.5, z: -64, w: 1.0, d: 162 },
    { x:  MAZE_HALF_W + 0.5, z: -64, w: 1.0, d: 162 },
    // Dinding belakang Start & belakang Ruang Trofi
    { x: 0, z: 16.5, w: MAZE_HALF_W * 2 + 2, d: 1.0 },
    { x: 0, z: -144.5, w: MAZE_HALF_W * 2 + 2, d: 1.0 },

    // Sekat belokan labirin yang lebar & nyaman untuk joystick HP di tiap zona
    // Zona 1 (antara Start +11 dan Gate 0 -14)
    { x: -5.5, z: 1.5, w: 15, d: 1.1 },
    // Zona 2 (antara Gate 0 -14 dan Gate 1 -40)
    { x: 5.5, z: -24.5, w: 15, d: 1.1 },
    // Zona 3 (antara Gate 1 -40 dan Gate 2 -66)
    { x: -5.8, z: -50.5, w: 14.5, d: 1.1 },
    { x: 7.5, z: -57.5, w: 11, d: 1.1 },
    // Zona 4 (antara Gate 2 -66 dan Gate 3 -92)
    { x: 5.5, z: -76.5, w: 15, d: 1.1 },
    // Zona 5 (antara Gate 3 -92 dan Gate 4 -118)
    { x: -5.5, z: -102.5, w: 15, d: 1.1 }
  ];

  // ==================== 2. AUDIO EFEK FUTURISTIK ====================
  function playGateUnlockSound() {
    if (!window.soundFX || !window.soundFX.enabled) return;
    try {
      const ctx = window.soundFX.ctx || new (window.AudioContext || window.webkitAudioContext)();
      window.soundFX.ctx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.38);
      });
    } catch (_) {}
  }

  function playPlateClick() {
    if (window.soundFX && window.soundFX.pop) window.soundFX.pop();
  }

  function playWrongBuzz() {
    if (window.soundFX && window.soundFX.playWrong) window.soundFX.playWrong();
  }

  // ==================== 3. SETUP SCENE THREE.JS (LABIRIN FUTURISTIK TERANG) ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdbeafe); // Biru langit futuristik terang & ramah mata
  scene.fog = new THREE.FogExp2(0xdbeafe, 0.0085);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf8fafc, 0x38bdf8, 0.92));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(22, 42, 18);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // Helper Tekstur Lantai Grid Neon Futuristik
  function createNeonGridTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 252);
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.moveTo(0, 128); ctx.lineTo(256, 128);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(9, 54);
    return tex;
  }

  // Helper Tekstur Angka Saklar Lantai (CanvasTexture Tajam untuk HP)
  function createPlateNumberTexture(numStr, state = 'idle') {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    const bg = state === 'held' ? '#0284c7' : (state === 'open' ? '#059669' : (state === 'wrong' ? '#dc2626' : '#0f172a'));
    const border = state === 'held' ? '#7dd3fc' : (state === 'open' ? '#6ee7b7' : (state === 'wrong' ? '#fca5a5' : '#38bdf8'));

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = border;
    ctx.lineWidth = 18;
    ctx.strokeRect(12, 12, 232, 232);

    ctx.fillStyle = '#ffffff';
    const fs = String(numStr).length > 3 ? 82 : (String(numStr).length > 2 ? 98 : 118);
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(numStr), 128, 132);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Helper Papan Hologram Besar di Atas Gerbang Laser
  function createGateBoardTexture(tag, mainText, subText, status = 'locked') {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 320;
    const ctx = c.getContext('2d');

    const bg = status === 'open' ? '#064e3b' : (status === 'wrong' ? '#7f1d1d' : '#0f172a');
    const border = status === 'open' ? '#34d399' : (status === 'wrong' ? '#f87171' : '#38bdf8');

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(14, 14, 996, 292, 34);
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = border;
    ctx.stroke();

    // Tag atas
    ctx.fillStyle = status === 'open' ? '#6ee7b7' : (status === 'wrong' ? '#fecaca' : '#7dd3fc');
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tag, 512, 68);

    // Teks utama (soal / persamaan)
    ctx.fillStyle = '#ffffff';
    const fs = mainText.length > 36 ? 44 : (mainText.length > 24 ? 54 : 66);
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillText(mainText, 512, 168);

    // Subteks status live
    ctx.fillStyle = status === 'open' ? '#a7f3d0' : '#fde047';
    ctx.font = '800 36px system-ui, sans-serif';
    ctx.fillText(subText, 512, 252);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // ==================== 4. BANGUN ARENA LABIRIN & RUANG TROFI ====================
  let trophyMesh = null;

  function buildMazeStructure() {
    // Lantai Grid Neon
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(MAZE_HALF_W * 2 + 2, 162),
      new THREE.MeshStandardMaterial({ map: createNeonGridTexture(), roughness: 0.65 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -64);
    floor.receiveShadow = true;
    scene.add(floor);

    // Dinding Labirin Futuristik (Tinggi 3.1 unit agar lega di kamera HP!)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 });
    const neonTopMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    MAZE_WALLS.forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, 3.1, w.d), wallMat);
      m.position.set(w.x, 1.55, w.z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);

      // Strip neon cyan tipis di puncak dinding
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w.w + 0.05, 0.16, w.d + 0.05), neonTopMat);
      strip.position.set(w.x, 3.15, w.z);
      scene.add(strip);
    });

    // Garis Start
    const startBand = new THREE.Mesh(
      new THREE.PlaneGeometry(MAZE_HALF_W * 2, 1.8),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.55 })
    );
    startBand.rotation.x = -Math.PI / 2;
    startBand.position.set(0, 0.04, START_Z - 2.5);
    scene.add(startBand);

    // Ruang Trofi / Finis di Ujung Labirin (z = TROPHY_Z)
    const finishPad = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.5, 0.16, 36),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xeab308, emissiveIntensity: 0.35 })
    );
    finishPad.position.set(0, 0.08, TROPHY_Z);
    scene.add(finishPad);

    // Piala Trofi Emas 3D Berputar
    const trophyGrp = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    base.position.y = 0.3;
    trophyGrp.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.2, 12), goldMat);
    stem.position.y = 1.2;
    trophyGrp.add(stem);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 0.65, 1.8, 16), goldMat);
    cup.position.y = 2.65;
    trophyGrp.add(cup);
    trophyGrp.position.set(0, 0.2, TROPHY_Z);
    scene.add(trophyGrp);
    trophyMesh = trophyGrp;

    // Papan Ruang Trofi
    const finBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 3.2),
      new THREE.MeshBasicMaterial({
        map: createGateBoardTexture('ZONA FINIS', 'RUANG TROFI MATEMATIKA!', 'Injak Lingkaran Emas untuk Finis!', 'open'),
        transparent: true
      })
    );
    finBoard.position.set(0, 5.8, TROPHY_Z - 4.5);
    scene.add(finBoard);
  }
  buildMazeStructure();

  // ==================== 5. GERBANG LASER, SAKLAR LANTAI & KABEL ENERGI ====================
  let gatesData = [];
  const gateVisuals = []; // index 0..4 -> { group, laserGroup, boardMat, plates: [{ mesh, topMat, cableMat, x, z, val }] }
  const gateWrongTimers = [0, 0, 0, 0, 0];
  const gateWrongTexts = ['', '', '', '', ''];

  function clearGateVisuals() {
    gateVisuals.forEach(gv => scene.remove(gv.group));
    gateVisuals.length = 0;
  }

  function getGateTypeLabel(type) {
    if (type === 'coop') return 'TIPE A • KOLABORASI 2 SAKLAR';
    if (type === 'sequence') return 'TIPE C • URUTAN BERANTAI (3 SAKLAR)';
    return 'TIPE B • SYARAT BILANGAN (1 SAKLAR)';
  }

  function getGateLiveSubText(g) {
    if (g.open) return `TERBUKA! Pahlawan: ${(g.openedBy || []).join(' & ')}`;
    if (gateWrongTimers[g.index] > 0) return gateWrongTexts[g.index];
    if (g.type === 'coop') {
      if (g.heldValue !== null && g.heldValue !== undefined) {
        return `[ ${g.heldValue} ] ${g.op} [ ? ] = ${g.target}  (Ditahan ${g.heldByName || 'Teman'}!)`;
      }
      return `Injak 2 saklar bersamaan / bergantian dalam 6 detik!`;
    }
    if (g.type === 'sequence') {
      const prog = g.seqProgress || [];
      const slots = [0, 1, 2].map(i => (prog[i] !== undefined ? `[ ${prog[i]} ]` : '[ ? ]'));
      return `Urutan: ${slots.join(' → ')}`;
    }
    return `Injak 1 saklar angka yang benar di lantai!`;
  }

  function buildGatesVisuals(gates) {
    clearGateVisuals();
    gatesData = gates || [];

    gatesData.forEach((g, idx) => {
      const gz = GATE_Z[idx];
      const grp = new THREE.Group();
      scene.add(grp);

      // Pilar Kiri & Kanan Gerbang
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      [-MAZE_HALF_W + 0.6, MAZE_HALF_W - 0.6].forEach(px => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.2, 1.6), pillarMat);
        pil.position.set(px, 2.6, gz);
        pil.castShadow = true;
        grp.add(pil);
      });

      // Palang Atas Gerbang
      const beamTop = new THREE.Mesh(new THREE.BoxGeometry(MAZE_HALF_W * 2, 0.7, 1.2), pillarMat);
      beamTop.position.set(0, 5.0, gz);
      grp.add(beamTop);

      // Laser Merah Melintang (3 garis laser bercahaya)
      const laserGroup = new THREE.Group();
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });
      [0.9, 1.85, 2.8].forEach(ly => {
        const lBar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, MAZE_HALF_W * 2 - 1.5, 10), laserMat);
        lBar.rotation.z = Math.PI / 2;
        lBar.position.set(0, ly, gz);
        laserGroup.add(lBar);
      });
      // Tirai merah transparan tipis
      const veil = new THREE.Mesh(
        new THREE.PlaneGeometry(MAZE_HALF_W * 2 - 1.5, 3.6),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      veil.position.set(0, 1.85, gz);
      laserGroup.add(veil);
      laserGroup.visible = !g.open;
      grp.add(laserGroup);

      // Papan Hologram Besar di Atas Gerbang
      const boardTex = createGateBoardTexture(
        `GERBANG ${idx + 1}/5 • ${getGateTypeLabel(g.type)}`,
        g.prompt,
        getGateLiveSubText(g),
        g.open ? 'open' : 'locked'
      );
      const boardMat = new THREE.MeshBasicMaterial({ map: boardTex, transparent: true, side: THREE.DoubleSide });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 4.5), boardMat);
      board.position.set(0, 7.6, gz + 0.2);
      grp.add(board);

      // Saklar Lantai (Pressure Plates) + Kabel Energi Bercahaya ke Gerbang!
      const plateEntries = [];
      const count = g.plates.length;
      const spreadW = Math.min(20, count * 3.4);
      const plateZ = gz + 5.2;

      g.plates.forEach((val, pIdx) => {
        const px = count === 1 ? 0 : -spreadW / 2 + (pIdx / (count - 1)) * spreadW;

        const topTex = createPlateNumberTexture(val, g.open ? 'open' : 'idle');
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        const topMat = new THREE.MeshBasicMaterial({ map: topTex });

        const plateMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.22, 2.4),
          [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
        );
        plateMesh.position.set(px, 0.11, plateZ);
        plateMesh.receiveShadow = true;
        grp.add(plateMesh);

        // Kabel Energi Bercahaya di Lantai menghubungkan Saklar -> Gerbang Laser
        const cableLen = Math.abs(plateZ - gz) - 1.2;
        const cableMat = new THREE.MeshBasicMaterial({ color: g.open ? 0x10b981 : 0x38bdf8 });
        const cable = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, cableLen), cableMat);
        cable.position.set(px, 0.04, (plateZ + gz) / 2);
        grp.add(cable);

        plateEntries.push({
          index: pIdx,
          val,
          x: px,
          z: plateZ,
          mesh: plateMesh,
          topMat,
          cableMat
        });
      });

      gateVisuals.push({
        index: idx,
        group: grp,
        laserGroup,
        boardMat,
        plates: plateEntries
      });
    });
  }

  function refreshGateVisual(gateIdx) {
    const g = gatesData[gateIdx];
    const gv = gateVisuals[gateIdx];
    if (!g || !gv) return;

    gv.laserGroup.visible = !g.open;

    const status = g.open ? 'open' : (gateWrongTimers[gateIdx] > 0 ? 'wrong' : 'locked');
    const mainTitle = (g.type === 'coop' && g.heldValue !== null && !g.open)
      ? `[ ${g.heldValue} ] ${g.op} [ ? ] = ${g.target}`
      : g.prompt;

    const newTex = createGateBoardTexture(
      `GERBANG ${gateIdx + 1}/5 • ${getGateTypeLabel(g.type)}`,
      mainTitle,
      getGateLiveSubText(g),
      status
    );
    if (gv.boardMat.map) gv.boardMat.map.dispose();
    gv.boardMat.map = newTex;
    gv.boardMat.needsUpdate = true;

    gv.plates.forEach(pe => {
      let pState = 'idle';
      if (g.open) pState = 'open';
      else if (gateWrongTimers[gateIdx] > 0) pState = 'wrong';
      else if (g.type === 'coop' && g.heldPlateIdx === pe.index) pState = 'held';
      else if (g.type === 'sequence' && (g.seqProgress || []).includes(pe.val)) pState = 'held';

      const pTex = createPlateNumberTexture(pe.val, pState);
      if (pe.topMat.map) pe.topMat.map.dispose();
      pe.topMat.map = pTex;
      pe.topMat.needsUpdate = true;
      pe.cableMat.color.setHex(
        pState === 'open' ? 0x10b981 : (pState === 'held' ? 0x0ea5e9 : (pState === 'wrong' ? 0xef4444 : 0x38bdf8))
      );
      pe.mesh.position.y = pState === 'held' ? 0.05 : 0.11;
    });
  }

  // ==================== 6. PARTIKEL CONFETTI 3D ====================
  const confetti = [];
  function spawnConfetti(x, y, z) {
    const colors = [0x38bdf8, 0x10b981, 0xfacc15, 0xf43f5e, 0xa78bfa];
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.08);
    for (let i = 0; i < 38; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
      m.position.set(x + (Math.random() - 0.5) * 5, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 3);
      scene.add(m);
      confetti.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 7,
        vy: 5 + Math.random() * 6,
        vz: (Math.random() - 0.5) * 7,
        life: 1.8 + Math.random() * 0.8
      });
    }
  }

  // ==================== 7. PEMAIN LOKAL, REMOTE & BOT TEMAN SOLO ====================
  let socket = null;
  let matchState = 'LOBBY';
  let currentLevel = 'sd';
  let startTimeMs = Date.now();
  let playersList = [];
  let botEnabled = true;
  let localFinished = false;

  const localAvatar = new Avatar3D(scene, {
    name: playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, START_Z);
  localAvatar.group.rotation.y = Math.PI;

  const controls = new Controls(camera, localAvatar, renderer.domElement, {
    moveSpeed: 10.8,
    maxRadius: 200 // Kita atur batas dinding labirin secara presisi via AABB!
  });
  controls.cameraYaw = Math.PI; // Menghadap langsung ke Gerbang 1 (-Z)
  if (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches) {
    controls.cameraPitch = 0.4;
    controls.cameraDistance = 10.5;
  } else {
    controls.cameraPitch = 0.42;
    controls.cameraDistance = 11.2;
  }

  const remoteAvatars = {}; // id -> { avatar, targetPos, targetRotY, isMoving, isJumping }
  let soloBot = null;

  function clearSoloBot() {
    if (soloBot) {
      soloBot.avatar.destroy();
      soloBot = null;
    }
  }

  // Peta celah lorong (doorway) di tiap sekat horizontal agar RoboTeman bisa pathfinding mulus tanpa menabrak dinding
  const MAZE_DIVIDER_GAPS = [
    { z: 1.5,    minX: -13.0, maxX: 2.0,  gapX: 8.0 },   // Zona 1: celah di kanan
    { z: -24.5,  minX: -2.0,  maxX: 13.0, gapX: -8.0 },  // Zona 2: celah di kiri
    { z: -50.5,  minX: -13.05, maxX: 1.45, gapX: 7.8 },  // Zona 3a: celah di kanan
    { z: -57.5,  minX: 2.0,   maxX: 13.0, gapX: -6.0 },  // Zona 3b: celah di kiri
    { z: -76.5,  minX: -2.0,  maxX: 13.0, gapX: -8.0 },  // Zona 4: celah di kiri
    { z: -102.5, minX: -13.0, maxX: 2.0,  gapX: 8.0 }    // Zona 5: celah di kanan
  ];

  function spawnSoloBotIfNeeded() {
    clearSoloBot();
    if (!botEnabled || playersList.length > 1) return;
    const av = new Avatar3D(scene, {
      name: 'RoboTeman',
      color: '#a78bfa',
      hat: 'topi_wisuda',
      isLocal: false
    });
    av.group.position.set(2.8, 0, START_Z);
    soloBot = {
      avatar: av,
      targetPos: { x: 2.8, z: START_Z },
      helpCooldown: 0,
      stuckTimer: 0,
      lastX: 2.8,
      lastZ: START_Z
    };
  }

  function computeBotWaypoint(posX, posZ, goalX, goalZ) {
    // Cek apakah ada sekat dinding di antara posZ dan goalZ (baik maju ke -Z maupun mundur ke +Z)
    const movingForward = goalZ < posZ;
    let blockingWall = null;
    let closestDistZ = Infinity;

    for (const wall of MAZE_DIVIDER_GAPS) {
      const wallBetween = movingForward
        ? (wall.z < posZ - 0.4 && wall.z > goalZ + 0.4)
        : (wall.z > posZ + 0.4 && wall.z < goalZ - 0.4);
      if (!wallBetween) continue;

      // Hitung titik potong X garis lurus dari bot ke target pada Z dinding
      const t = (wall.z - posZ) / (goalZ - posZ);
      const crossX = posX + (goalX - posX) * t;
      const margin = 1.25;
      const blocked = (crossX >= wall.minX - margin && crossX <= wall.maxX + margin);
      if (blocked) {
        const dz = Math.abs(wall.z - posZ);
        if (dz < closestDistZ) {
          closestDistZ = dz;
          blockingWall = wall;
        }
      }
    }

    if (blockingWall) {
      // Arahkan bot ke depan celah lorong dulu sampai sejajar X, lalu lewati celah dengan mulus
      const sideSign = movingForward ? 1 : -1;
      const alignedWithGap = Math.abs(posX - blockingWall.gapX) < 2.2;
      if (alignedWithGap) {
        return { x: blockingWall.gapX, z: blockingWall.z - sideSign * 2.2 };
      }
      return { x: blockingWall.gapX, z: blockingWall.z + sideSign * 2.2 };
    }

    return { x: goalX, z: goalZ };
  }

  function updateSoloBot(dt) {
    if (!soloBot || matchState !== 'PLAYING' || playersList.length > 1) return;
    if (soloBot.helpCooldown > 0) soloBot.helpCooldown -= dt;

    // Pilih sisi follow yang lega (tidak mepet dinding luar)
    const pPos = localAvatar.group.position;
    const followSide = pPos.x > 6 ? -2.2 : 2.2;
    let goalX = Math.max(-MAZE_HALF_W + 1.5, Math.min(MAZE_HALF_W - 1.5, pPos.x + followSide));
    let goalZ = Math.min(14.5, pPos.z + 1.8);
    let helpingGate = null;
    let partnerPlate = null;

    // Cari gerbang Co-op (Tipe A) terdekat yang sedang ditahan pemain lokal
    for (let i = 0; i < gatesData.length; i++) {
      const g = gatesData[i];
      if (!g.open && g.type === 'coop' && g.heldPlateIdx !== null && g.heldValue !== null) {
        const gv = gateVisuals[i];
        if (gv) {
          for (const pe of gv.plates) {
            if (pe.index === g.heldPlateIdx) continue;
            const calc = g.op === '+' ? (g.heldValue + pe.val) : (g.heldValue * pe.val);
            if (calc === g.target) {
              helpingGate = i;
              partnerPlate = pe;
              goalX = pe.x;
              goalZ = pe.z;
              break;
            }
          }
        }
        break;
      }
    }

    const pos = soloBot.avatar.group.position;

    // Jangan menerobos gerbang laser yang masih tertutup
    for (let i = 0; i < gatesData.length; i++) {
      if (!gatesData[i].open && pos.z > GATE_Z[i] && goalZ < GATE_Z[i] + 1.8) {
        goalZ = GATE_Z[i] + 2.8;
      }
    }

    // Hitung waypoint cerdas yang memutari sekat dinding labirin
    const wp = computeBotWaypoint(pos.x, pos.z, goalX, goalZ);
    const dx = wp.x - pos.x;
    const dz = wp.z - pos.z;
    const distToWp = Math.hypot(dx, dz);
    const distToGoal = Math.hypot(goalX - pos.x, goalZ - pos.z);

    if (distToGoal > 0.7 && distToWp > 0.25) {
      const prevX = pos.x;
      const prevZ = pos.z;
      const speed = helpingGate !== null ? 10.2 : 9.2;
      const step = Math.min(distToWp, speed * dt);

      // Coba gerak normal; pisahkan X dan Z agar bisa sliding mulus di tepi dinding
      pos.x += (dx / distToWp) * step;
      resolveWallCollisions(pos, 0.6);
      pos.z += (dz / distToWp) * step;
      resolveWallCollisions(pos, 0.6);

      const movedDist = Math.hypot(pos.x - prevX, pos.z - prevZ);
      if (movedDist < 0.025) {
        soloBot.stuckTimer += dt;
        // Jika sempat tersangkut sudut, geser ke arah celah terdekat agar langsung bebas
        if (soloBot.stuckTimer > 0.35) {
          let nearestWall = MAZE_DIVIDER_GAPS[0];
          let minWDist = Infinity;
          for (const w of MAZE_DIVIDER_GAPS) {
            const d = Math.abs(pos.z - w.z);
            if (d < minWDist) { minWDist = d; nearestWall = w; }
          }
          const escapeDir = nearestWall.gapX >= pos.x ? 1 : -1;
          pos.x += escapeDir * 7.5 * dt;
          resolveWallCollisions(pos, 0.6);
          if (soloBot.stuckTimer > 1.2) soloBot.stuckTimer = 0;
        }
      } else {
        soloBot.stuckTimer = 0;
        soloBot.avatar.group.rotation.y = Math.atan2(pos.x - prevX, pos.z - prevZ);
      }

      soloBot.lastX = pos.x;
      soloBot.lastZ = pos.z;
      soloBot.avatar.isMoving = true;
    } else {
      soloBot.stuckTimer = 0;
      soloBot.avatar.isMoving = false;
      if (helpingGate !== null && partnerPlate && soloBot.helpCooldown <= 0 && socket) {
        soloBot.helpCooldown = 1.8;
        socket.emit('maze_step_plate', { gateIndex: helpingGate, plateIndex: partnerPlate.index });
      }
    }
    soloBot.avatar.update(dt);
  }

  // ==================== 8. COLLISION DINDING LABIRIN, GERBANG LASER & KAMERA ====================
  function resolveWallCollisions(pos, radius = 0.65) {
    // 1. Cek seluruh dinding labirin
    for (const w of MAZE_WALLS) {
      const minX = w.x - w.w / 2 - radius;
      const maxX = w.x + w.w / 2 + radius;
      const minZ = w.z - w.d / 2 - radius;
      const maxZ = w.z + w.d / 2 + radius;
      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        const penLeft = pos.x - minX;
        const penRight = maxX - pos.x;
        const penBack = pos.z - minZ;
        const penFront = maxZ - pos.z;
        const minPen = Math.min(penLeft, penRight, penBack, penFront);
        if (minPen === penLeft) pos.x = minX;
        else if (minPen === penRight) pos.x = maxX;
        else if (minPen === penBack) pos.z = minZ;
        else pos.z = maxZ;
      }
    }

    // 2. Cek Gerbang Laser yang masih TERKUNCI (tidak bisa ditembus!)
    for (let i = 0; i < gatesData.length; i++) {
      if (gatesData[i] && !gatesData[i].open) {
        const gz = GATE_Z[i];
        if (pos.z < gz + 0.95 && pos.z > gz - 1.2) {
          pos.z = gz + 0.95;
        }
      }
    }
  }

  function applyCameraWallCollision() {
    // Pastikan kamera tidak menembus keluar dinding luar labirin
    camera.position.x = Math.max(-MAZE_HALF_W + 0.8, Math.min(MAZE_HALF_W - 0.8, camera.position.x));
    camera.position.z = Math.max(-143.2, Math.min(15.2, camera.position.z));
    if (camera.position.y < 1.2) camera.position.y = 1.2;
  }

  // ==================== 9. DETEKSI INJAK SAKLAR & PROXIMITY HUD HP ====================
  let lastSteppedKey = '';
  let stepCooldown = 0;

  function checkPlateStepping() {
    if (matchState !== 'PLAYING' || stepCooldown > 0) return;
    const px = localAvatar.group.position.x;
    const pz = localAvatar.group.position.z;

    let currentlyOn = '';
    for (let i = 0; i < gateVisuals.length; i++) {
      const g = gatesData[i];
      if (!g || g.open) continue;
      if (Math.abs(pz - (GATE_Z[i] + 5.2)) > 2.2) continue;

      for (const pe of gateVisuals[i].plates) {
        if (Math.abs(px - pe.x) < 1.25 && Math.abs(pz - pe.z) < 1.25) {
          currentlyOn = `${i}-${pe.index}`;
          if (lastSteppedKey !== currentlyOn) {
            lastSteppedKey = currentlyOn;
            stepCooldown = 0.45;
            playPlateClick();
            if (socket) socket.emit('maze_step_plate', { gateIndex: i, plateIndex: pe.index });
          }
          break;
        }
      }
    }
    if (!currentlyOn) lastSteppedKey = '';

    // Cek apakah mencapai Ruang Trofi!
    if (!localFinished && Math.hypot(px, pz - TROPHY_Z) < 5.0) {
      localFinished = true;
      if (socket) socket.emit('maze_reach_finish');
    }
  }

  function updateProximityGateHUD() {
    const hud = document.getElementById('maze-gate-hud');
    if (!hud) return;
    if (matchState !== 'PLAYING') {
      hud.style.display = 'none';
      return;
    }

    const pz = localAvatar.group.position.z;
    let nearestIdx = -1;
    let bestDist = 15.5;
    for (let i = 0; i < gatesData.length; i++) {
      if (gatesData[i].open) continue;
      const d = Math.abs(pz - GATE_Z[i]);
      if (d < bestDist && pz >= GATE_Z[i] - 2) {
        bestDist = d;
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) {
      hud.style.display = 'none';
      return;
    }

    const g = gatesData[nearestIdx];
    hud.style.display = 'block';
    hud.classList.toggle('hud-wrong', gateWrongTimers[nearestIdx] > 0);
    hud.classList.toggle('hud-ok', g.open);

    document.getElementById('maze-gate-tag').textContent =
      `GERBANG ${nearestIdx + 1}/5 • ${getGateTypeLabel(g.type)} (${currentLevel.toUpperCase()})`;
    document.getElementById('maze-gate-prompt').textContent =
      (g.type === 'coop' && g.heldValue !== null)
        ? `[ ${g.heldValue} ] ${g.op} [ ? ] = ${g.target}`
        : g.prompt;
    document.getElementById('maze-gate-live').textContent = getGateLiveSubText(g);
  }

  // ==================== 10. MINI-MAP / RADAR LABIRIN REAL-TIME ====================
  const radarCanvas = document.getElementById('maze-radar-canvas');
  const radarCtx = radarCanvas.getContext('2d');
  const radarBox = document.getElementById('maze-radar-box');
  radarBox.addEventListener('click', () => {
    const collapsed = radarBox.classList.toggle('collapsed');
    document.getElementById('radar-toggle-icon').textContent = collapsed ? '▸' : '▾';
  });

  function drawMazeRadar() {
    if (radarBox.classList.contains('collapsed')) return;
    const W = radarCanvas.width;
    const H = radarCanvas.height;
    radarCtx.clearRect(0, 0, W, H);
    radarCtx.fillStyle = '#0b1324';
    radarCtx.fillRect(0, 0, W, H);

    const mapX = (wx) => ((wx + MAZE_HALF_W + 1) / (MAZE_HALF_W * 2 + 2)) * W;
    const mapY = (wz) => ((wz - (-144)) / (16 - (-144))) * H; // Top = Finis (-144), Bottom = Start (+16)

    // Gambar dinding sekat labirin
    radarCtx.fillStyle = '#475569';
    MAZE_WALLS.forEach(w => {
      const rx = mapX(w.x - w.w / 2);
      const ry = mapY(w.z - w.d / 2);
      const rw = Math.max(2, (w.w / (MAZE_HALF_W * 2 + 2)) * W);
      const rh = Math.max(2, (w.d / 160) * H);
      radarCtx.fillRect(rx, ry, rw, rh);
    });

    // Gambar 5 Gerbang Laser (Merah = Terkunci, Hijau = Terbuka)
    gatesData.forEach((g, idx) => {
      const gy = mapY(GATE_Z[idx]);
      radarCtx.strokeStyle = g.open ? '#10b981' : '#ef4444';
      radarCtx.lineWidth = 3;
      radarCtx.beginPath();
      radarCtx.moveTo(4, gy);
      radarCtx.lineTo(W - 4, gy);
      radarCtx.stroke();
    });

    // Titik Ruang Trofi (Emas)
    radarCtx.fillStyle = '#facc15';
    radarCtx.beginPath();
    radarCtx.arc(mapX(0), mapY(TROPHY_Z), 4.5, 0, Math.PI * 2);
    radarCtx.fill();

    // Titik Teman Sekelas (Cyan)
    Object.values(remoteAvatars).forEach(r => {
      radarCtx.fillStyle = '#38bdf8';
      radarCtx.beginPath();
      radarCtx.arc(mapX(r.avatar.group.position.x), mapY(r.avatar.group.position.z), 2.8, 0, Math.PI * 2);
      radarCtx.fill();
    });

    // Titik Bot Teman (Ungu)
    if (soloBot) {
      radarCtx.fillStyle = '#c084fc';
      radarCtx.beginPath();
      radarCtx.arc(mapX(soloBot.avatar.group.position.x), mapY(soloBot.avatar.group.position.z), 2.8, 0, Math.PI * 2);
      radarCtx.fill();
    }

    // Titik Pemain Lokal (Kuning Terang + Ring Putih)
    const lx = mapX(localAvatar.group.position.x);
    const ly = mapY(localAvatar.group.position.z);
    radarCtx.fillStyle = '#fde047';
    radarCtx.beginPath();
    radarCtx.arc(lx, ly, 4, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = '#ffffff';
    radarCtx.lineWidth = 1.5;
    radarCtx.stroke();
  }

  // ==================== 11. UI TOAST, LEADERBOARD & SOCKET.IO ====================
  let toastTimer = null;
  function showMazeToast(msg, isOk = true) {
    const el = document.getElementById('maze-toast');
    el.innerHTML = msg;
    el.className = isOk ? 'mtoast-ok' : 'mtoast-err';
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2700);
  }

  function updateLeaderboardHUD() {
    const openCount = gatesData.filter(g => g.open).length;
    document.getElementById('hud-gates-open').textContent = openCount;
    document.getElementById('maze-player-count').textContent = `(${playersList.length})`;

    const sorted = [...playersList].sort((a, b) => b.score - a.score);
    const me = playersList.find(p => p.id === (socket ? socket.id : ''));
    if (me) document.getElementById('hud-my-score').textContent = me.score;

    document.getElementById('maze-rank-list').innerHTML = sorted.slice(0, 8).map((p, i) => {
      const isMe = socket && p.id === socket.id;
      const finTag = p.finished ? ' ' : '';
      return `<div class="rank-item" style="${isMe ? 'background:rgba(56,189,248,0.2); border-radius:6px; padding:2px 5px;' : ''}">
        <span>#${i + 1} ${p.name}${finTag}</span>
        <strong style="color:#38bdf8;">${p.score}</strong>
      </div>`;
    }).join('');
  }

  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_maze', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      name: playerName,
      color: playerColor,
      hat: playerHat
    }, (res) => {
      if (!res || !res.success) return;
      currentLevel = res.level || 'sd';
      matchState = res.state || 'LOBBY';
      startTimeMs = res.startTime || Date.now();
      playersList = res.players || [];

      localAvatar.group.position.set(res.player.x, 0, res.player.z);
      playersList.forEach(p => {
        if (p.id !== socket.id) spawnRemote(p);
      });

      buildGatesVisuals(res.gates);
      updateLeaderboardHUD();
      if (matchState === 'PLAYING') {
        document.getElementById('maze-mode-modal').style.display = 'none';
      }
    });
  });

  function spawnRemote(p) {
    if (remoteAvatars[p.id]) return;
    const av = new Avatar3D(scene, { name: p.name, color: p.color, hat: p.hat || 'none', isLocal: false });
    av.group.position.set(p.x, p.y || 0, p.z);
    remoteAvatars[p.id] = {
      avatar: av,
      targetPos: new THREE.Vector3(p.x, p.y || 0, p.z),
      targetRotY: p.rotY || Math.PI,
      isMoving: false,
      isJumping: false
    };
  }

  socket.on('maze_player_joined', (p) => { if (p.id !== socket.id) spawnRemote(p); });
  socket.on('maze_players_updated', (list) => {
    playersList = list;
    if (playersList.length > 1) clearSoloBot();
    updateLeaderboardHUD();
  });
  socket.on('maze_player_left', (pid) => {
    if (remoteAvatars[pid]) {
      remoteAvatars[pid].avatar.destroy();
      delete remoteAvatars[pid];
    }
  });
  socket.on('maze_player_moved', (d) => {
    const r = remoteAvatars[d.id];
    if (!r) return;
    r.targetPos.set(d.x, d.y || 0, d.z);
    r.targetRotY = d.rotY || 0;
    r.isMoving = d.isMoving;
    r.isJumping = d.isJumping;
  });

  socket.on('maze_started', (data) => {
    currentLevel = data.level;
    matchState = 'PLAYING';
    startTimeMs = data.startTime || Date.now();
    playersList = data.players || [];
    localFinished = false;
    document.getElementById('maze-mode-modal').style.display = 'none';
    document.getElementById('maze-podium-modal').style.display = 'none';

    const me = playersList.find(p => p.id === socket.id);
    if (me) localAvatar.group.position.set(me.x, 0, me.z);
    controls.cameraYaw = Math.PI;

    buildGatesVisuals(data.gates);
    updateLeaderboardHUD();
    spawnSoloBotIfNeeded();
    playGateUnlockSound();
    showMazeToast(`LABIRIN DIMULAI (${currentLevel.toUpperCase()})! Tembus 5 Gerbang Laser menuju Ruang Trofi!`, true);
  });

  socket.on('maze_gate_updated', ({ gateIndex, gates }) => {
    gatesData = gates;
    refreshGateVisual(gateIndex);
    playPlateClick();
  });

  socket.on('maze_gate_unlocked', (data) => {
    gatesData = data.gates;
    playersList = data.players || playersList;
    gateWrongTimers[data.gateIndex] = 0;
    refreshGateVisual(data.gateIndex);
    updateLeaderboardHUD();
    playGateUnlockSound();
    spawnConfetti(0, 2.5, GATE_Z[data.gateIndex]);
    showMazeToast(
      `GERBANG ${data.gateIndex + 1} TERBUKA! <strong>${data.equationText}</strong><br>Pahlawan Gerbang: ${(data.heroes || []).join(' & ')} (+40 pts)`,
      true
    );
  });

  socket.on('maze_gate_wrong', (data) => {
    gatesData = data.gates;
    gateWrongTimers[data.gateIndex] = 1.15;
    gateWrongTexts[data.gateIndex] = data.wrongText;
    refreshGateVisual(data.gateIndex);
    playWrongBuzz();
  });

  socket.on('maze_player_finished', (data) => {
    playersList = data.players || playersList;
    updateLeaderboardHUD();
    spawnConfetti(0, 3, TROPHY_Z);
    playGateUnlockSound();

    if (data.playerId === socket.id) {
      document.getElementById('maze-win-title').textContent = `FINIS PERINGKAT #${data.finishRank}!`;
      document.getElementById('maze-win-sub').textContent =
        `Waktu: ${data.finishSec} detik • Bonus Finis +${data.finishBonus} pts!`;
      document.getElementById('maze-final-ranking').innerHTML = playersList.map((p, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.8); border:1.5px solid #38bdf8; border-radius:12px; padding:0.5rem 0.9rem; font-weight:800;">
          <span>#${idx + 1} ${p.name} ${p.finished ? '' : ''}</span>
          <span style="color:#fde047;">${p.gatesHelped} gerbang • ${p.score} pts</span>
        </div>
      `).join('');
      document.getElementById('maze-podium-modal').style.display = 'flex';
    } else {
      showMazeToast(`${data.playerName} mencapai Ruang Trofi (#${data.finishRank})!`, true);
    }
  });

  socket.on('maze_player_emote', ({ id, emote }) => {
    if (id === socket.id) localAvatar.showEmote(emote);
    else if (remoteAvatars[id]) remoteAvatars[id].avatar.showEmote(emote);
  });

  // ==================== 12. EVENT MODAL, SUARA & EMOTE ====================
  let selectedLevel = 'sd';
  const cSD = document.getElementById('choice-maze-sd');
  const cSMP = document.getElementById('choice-maze-smp');
  cSD.addEventListener('click', () => { selectedLevel = 'sd'; cSD.classList.add('selected'); cSMP.classList.remove('selected'); });
  cSMP.addEventListener('click', () => { selectedLevel = 'smp'; cSMP.classList.add('selected'); cSD.classList.remove('selected'); });

  document.getElementById('btn-start-maze').addEventListener('click', () => {
    botEnabled = document.getElementById('toggle-maze-bot').checked;
    socket.emit('maze_start', { level: selectedLevel });
  });
  document.getElementById('btn-cancel-maze').addEventListener('click', () => {
    if (matchState === 'PLAYING') document.getElementById('maze-mode-modal').style.display = 'none';
    else window.location.href = 'index.html';
  });
  document.getElementById('btn-open-maze-modal').addEventListener('click', () => {
    document.getElementById('maze-mode-modal').style.display = 'flex';
  });
  document.getElementById('btn-maze-replay').addEventListener('click', () => {
    botEnabled = document.getElementById('toggle-maze-bot').checked;
    socket.emit('maze_start', { level: selectedLevel });
  });
  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    if (window.soundFX) {
      window.soundFX.enabled = !window.soundFX.enabled;
      e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
    }
  });

  const emoteToggle = document.getElementById('btn-maze-emote-toggle');
  const emoteMenu = document.getElementById('maze-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      emoteMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!emoteMenu.contains(e.target) && e.target !== emoteToggle) emoteMenu.classList.remove('open');
    });
  }
  document.querySelectorAll('.maze-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('maze_emote', btn.dataset.emote);
      if (emoteMenu) emoteMenu.classList.remove('open');
    });
  });

  // ==================== 13. MAIN LOOP ====================
  let lastEmitTime = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (stepCooldown > 0) stepCooldown -= dt;

    // Timer flash merah 1 detik saat salah kombinasi
    for (let i = 0; i < gateWrongTimers.length; i++) {
      if (gateWrongTimers[i] > 0) {
        gateWrongTimers[i] -= dt;
        if (gateWrongTimers[i] <= 0) {
          gateWrongTimers[i] = 0;
          refreshGateVisual(i);
        }
      }
    }

    // Update Stopwatch HUD
    if (matchState === 'PLAYING') {
      const sec = Math.floor((Date.now() - startTimeMs) / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      document.getElementById('hud-maze-time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Putar Piala Trofi Emas
    if (trophyMesh) trophyMesh.rotation.y += dt * 1.4;

    // Update Confetti
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.life -= dt;
      c.vy -= 14 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += 5 * dt;
      c.mesh.rotation.y += 5 * dt;
      if (c.life <= 0 || c.mesh.position.y < 0) {
        scene.remove(c.mesh);
        confetti.splice(i, 1);
      }
    }

    // Update Gerak Lokal + Wall Collision + Camera Wall Collision
    controls.update(dt);
    resolveWallCollisions(localAvatar.group.position, 0.65);
    applyCameraWallCollision();
    localAvatar.update(dt);

    checkPlateStepping();
    updateProximityGateHUD();
    drawMazeRadar();

    // Sinkron posisi 20Hz
    const now = performance.now();
    if (socket && socket.connected && now - lastEmitTime > 50) {
      lastEmitTime = now;
      socket.emit('maze_move', {
        x: parseFloat(localAvatar.group.position.x.toFixed(2)),
        y: parseFloat(localAvatar.group.position.y.toFixed(2)),
        z: parseFloat(localAvatar.group.position.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping
      });
    }

    // Interpolasi Remote Players
    Object.values(remoteAvatars).forEach(r => {
      r.avatar.group.position.lerp(r.targetPos, Math.min(1, dt * 12));
      let diff = r.targetRotY - r.avatar.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.avatar.group.rotation.y += diff * Math.min(1, dt * 12);
      r.avatar.isMoving = r.isMoving;
      r.avatar.isJumping = r.isJumping;
      r.avatar.update(dt);
    });

    updateSoloBot(dt);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
})();
