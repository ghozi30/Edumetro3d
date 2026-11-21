// Mini Game #10: Dapur Kalimat — Kafe Bahasa Inggris 3D (SD & SMP, 4 Tim Estafet)
(function () {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('game') || 'mg-10';
  const playerName = localStorage.getItem('edumetro_name') || 'Koki Siswa';
  const playerColor = localStorage.getItem('edumetro_color') || '#38bdf8';
  const playerHat = localStorage.getItem('edumetro_hat') || 'none';

  // ==================== 1. AUDIO EFEK LONCENG KAFE & SUKSES ====================
  function playCafeBell() {
    if (!window.soundFX || !window.soundFX.enabled) return;
    try {
      const ctx = window.soundFX.ctx || new (window.AudioContext || window.webkitAudioContext)();
      window.soundFX.ctx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      // Lonceng kafe ding-ding jernih (2 nada harmonik)
      [1318.5, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.24, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.68);
      });
    } catch (_) {}
  }

  function playPickupPop() {
    if (window.soundFX && window.soundFX.playJump) window.soundFX.playJump();
  }

  function playErrorBuzz() {
    if (window.soundFX && window.soundFX.playWrong) window.soundFX.playWrong();
  }

  // ==================== 2. KONFIGURASI 4 MEJA TIM ====================
  const TEAM_CONFIG = {
    red: {
      key: 'red',
      name: 'Tim Merah',
      emoji: '[MERAH]',
      hex: 0xef4444,
      css: '#ef4444',
      dirLabel: 'Meja Utara',
      // Posisi pusat meja & orientasi hadap ke tengah ruangan
      tablePos: { x: 0, z: -15.2 },
      rotY: 0, // Menghadap +Z (ke tengah)
      axis: 'x', // Slot berjajar sepanjang sumbu X
      slotDir: 1,
      frontNormal: { x: 0, z: 1 }
    },
    blue: {
      key: 'blue',
      name: 'Tim Biru',
      emoji: '[BIRU]',
      hex: 0x3b82f6,
      css: '#3b82f6',
      dirLabel: 'Meja Timur',
      tablePos: { x: 15.2, z: 0 },
      rotY: -Math.PI / 2, // Menghadap -X (ke tengah)
      axis: 'z',
      slotDir: 1,
      frontNormal: { x: -1, z: 0 }
    },
    green: {
      key: 'green',
      name: 'Tim Hijau',
      emoji: '[HIJAU]',
      hex: 0x10b981,
      css: '#10b981',
      dirLabel: 'Meja Selatan',
      tablePos: { x: 0, z: 15.2 },
      rotY: Math.PI, // Menghadap -Z (ke tengah)
      axis: 'x',
      slotDir: -1,
      frontNormal: { x: 0, z: -1 }
    },
    yellow: {
      key: 'yellow',
      name: 'Tim Kuning',
      emoji: '[KUNING]',
      hex: 0xeab308,
      css: '#eab308',
      dirLabel: 'Meja Barat',
      tablePos: { x: -15.2, z: 0 },
      rotY: Math.PI / 2, // Menghadap +X (ke tengah)
      axis: 'z',
      slotDir: -1,
      frontNormal: { x: 1, z: 0 }
    }
  };

  // Hitung koordinat dunia (x, z) tiap slot & pad Sajikan untuk suatu tim
  function getTeamSlotPositions(teamKey, slotCount) {
    const cfg = TEAM_CONFIG[teamKey];
    const spacing = 2.25;
    const slots = [];
    for (let i = 0; i < slotCount; i++) {
      const offset = (i - (slotCount - 1) / 2) * spacing * cfg.slotDir;
      const sx = cfg.tablePos.x + (cfg.axis === 'x' ? offset : 0);
      const sz = cfg.tablePos.z + (cfg.axis === 'z' ? offset : 0);
      // Zona berdiri pemain di depan slot
      const standX = sx + cfg.frontNormal.x * 2.15;
      const standZ = sz + cfg.frontNormal.z * 2.15;
      slots.push({ index: i, x: sx, z: sz, standX, standZ });
    }
    // Pad Sajikan di ujung kanan meja
    const serveOffset = ((slotCount - 1) / 2 + 1.25) * spacing * cfg.slotDir;
    const serveX = cfg.tablePos.x + (cfg.axis === 'x' ? serveOffset : 0) + cfg.frontNormal.x * 1.9;
    const serveZ = cfg.tablePos.z + (cfg.axis === 'z' ? serveOffset : 0) + cfg.frontNormal.z * 1.9;
    return { slots, servePad: { x: serveX, z: serveZ } };
  }

  // ==================== 3. SETUP SCENE THREE.JS (KAFE MODERN HANGAT) ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff4e6); // Hangat krem kafe
  scene.fog = new THREE.FogExp2(0xfff4e6, 0.011);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 180);
  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Pencahayaan Kafe Hangat & Terang
  scene.add(new THREE.HemisphereLight(0xfffbeb, 0xd97706, 0.88));
  const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.92);
  dirLight.position.set(16, 28, 14);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 80;
  const dCam = 24;
  dirLight.shadow.camera.left = -dCam;
  dirLight.shadow.camera.right = dCam;
  dirLight.shadow.camera.top = dCam;
  dirLight.shadow.camera.bottom = -dCam;
  scene.add(dirLight);

  // Helper: Sprite Teks Tajam & Kontras Tinggi (Optimal untuk Layar HP)
  function createWordSprite(text, bgHex = '#0f172a', borderHex = '#fbbf24', textHex = '#ffffff', scaleW = 2.6, scaleH = 0.92) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 176;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(10, 12, 492, 152, 34);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = borderHex;
    ctx.stroke();

    ctx.fillStyle = textHex;
    const fontSize = text.length > 13 ? 48 : (text.length > 9 ? 58 : 68);
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 90);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    // depthTest: true agar label jauh tidak menimpa avatar/kata di depan kamera!
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(scaleW, scaleH, 1);
    return spr;
  }

  function createCubeTopTexture(word, bgColor = '#fef3c7', textColor = '#78350f') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = textColor;
    const fs = word.length > 10 ? 34 : (word.length > 6 ? 42 : 52);
    ctx.font = `900 ${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  // ==================== 4. BANGUN INTERIOR KAFE & DAPUR 3D ====================
  function buildCafeInterior() {
    // Lantai Keramik Kayu Kafe (38 x 38)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#f5e6d3';
    fctx.fillRect(0, 0, 512, 512);
    // Pola ubin kafe hangat
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) {
          fctx.fillStyle = '#ead5bc';
          fctx.fillRect(c * 64, r * 64, 64, 64);
        }
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 6);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Zona Dapur Bahan di Tengah (Karpet / Lantai Bercahaya)
    const kitchenMat = new THREE.Mesh(
      new THREE.CylinderGeometry(8.6, 8.8, 0.08, 40),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 })
    );
    kitchenMat.position.y = 0.04;
    kitchenMat.receiveShadow = true;
    scene.add(kitchenMat);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.4, 8.85, 48),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.09;
    scene.add(ring);

    // Tanda Mengambang "DAPUR BAHAN KATA" di tengah atas
    const centerSign = createWordSprite('DAPUR BAHAN KATA', 'rgba(120,53,15,0.92)', '#fbbf24', '#fef3c7', 5.2, 1.35);
    centerSign.position.set(0, 5.4, 0);
    scene.add(centerSign);

    // Dinding Kafe Hangat Rendah (agar kamera tetap leluasa berputar 360°)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.5 });
    const wallConfigs = [
      { x: 0, z: -19.5, w: 40, d: 0.8 },
      { x: 0, z: 19.5, w: 40, d: 0.8 },
      { x: -19.5, z: 0, w: 0.8, d: 40 },
      { x: 19.5, z: 0, w: 0.8, d: 40 }
    ];
    wallConfigs.forEach(wc => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(wc.w, 4.2, wc.d), wallMat);
      wMesh.position.set(wc.x, 2.1, wc.z);
      wMesh.receiveShadow = true;
      scene.add(wMesh);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(wc.w + 0.1, 0.35, wc.d + 0.1), trimMat);
      trim.position.set(wc.x, 4.25, wc.z);
      scene.add(trim);
    });

    // Dekorasi Tanaman Pot Kafe di 4 Sudut Ruangan
    [[-16.5, -16.5], [16.5, -16.5], [-16.5, 16.5], [16.5, 16.5]].forEach(([px, pz]) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.55, 1.1, 12),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 })
      );
      pot.position.set(px, 0.55, pz);
      pot.castShadow = true;
      scene.add(pot);

      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15, 0),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 })
      );
      bush.position.set(px, 1.85, pz);
      bush.castShadow = true;
      scene.add(bush);
    });

    // Lampu Gantung Kafe Hangat
    [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0]].forEach(([lx, lz]) => {
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 0.65, 16),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 })
      );
      shade.position.set(lx, 8.2, lz);
      scene.add(shade);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      bulb.position.set(lx, 7.85, lz);
      scene.add(bulb);
    });
  }
  buildCafeInterior();

  // ==================== 5. MEJA SAJI 4 TIM + SLOT BERNOMOR + PAD SAJIKAN ====================
  const teamTableGroups = {};
  const teamSlotMeshes = { red: [], blue: [], green: [], yellow: [] };
  const teamServePads = {};

  function buildTeamTables() {
    Object.values(TEAM_CONFIG).forEach(cfg => {
      const grp = new THREE.Group();
      scene.add(grp);
      teamTableGroups[cfg.key] = grp;

      // Badan Meja Saji Kayu + Aksen Warna Tim
      const tableLen = 12.6;
      const isX = cfg.axis === 'x';
      const baseGeo = isX
        ? new THREE.BoxGeometry(tableLen, 1.15, 2.2)
        : new THREE.BoxGeometry(2.2, 1.15, tableLen);
      const baseMesh = new THREE.Mesh(
        baseGeo,
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 })
      );
      baseMesh.position.set(cfg.tablePos.x, 0.58, cfg.tablePos.z);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      grp.add(baseMesh);

      // Top Meja Berwarna Tim
      const topGeo = isX
        ? new THREE.BoxGeometry(tableLen + 0.2, 0.16, 2.4)
        : new THREE.BoxGeometry(2.4, 0.16, tableLen + 0.2);
      const topMesh = new THREE.Mesh(
        topGeo,
        new THREE.MeshStandardMaterial({ color: cfg.hex, roughness: 0.4 })
      );
      topMesh.position.set(cfg.tablePos.x, 1.22, cfg.tablePos.z);
      topMesh.receiveShadow = true;
      grp.add(topMesh);

      // Papan Nama Tim Mengambang
      const banner = createWordSprite(
        `${cfg.emoji} ${cfg.name.toUpperCase()}`,
        'rgba(15, 23, 42, 0.92)',
        cfg.css,
        '#ffffff',
        4.4,
        1.15
      );
      banner.position.set(cfg.tablePos.x, 3.65, cfg.tablePos.z);
      grp.add(banner);
    });
  }
  buildTeamTables();

  // Render ulang slot bernomor + kata yang sudah diletakkan di meja tim
  function renderTeamTableSlots(teamKey, teamData) {
    // Hapus slot lama
    (teamSlotMeshes[teamKey] || []).forEach(obj => scene.remove(obj));
    teamSlotMeshes[teamKey] = [];
    if (teamServePads[teamKey]) {
      scene.remove(teamServePads[teamKey].mesh);
      scene.remove(teamServePads[teamKey].label);
    }

    if (!teamData || !teamData.order) return;
    const cfg = TEAM_CONFIG[teamKey];
    const slotCount = teamData.order.slotCount || teamData.slots.length;
    const layout = getTeamSlotPositions(teamKey, slotCount);

    layout.slots.forEach((sl, idx) => {
      const placed = teamData.slots[idx];
      const fb = (teamData.slotFeedback && teamData.slotFeedback[idx]) || 'neutral';

      // Warna pad slot sesuai status verifikasi (Hijau=Benar, Merah=Salah, Emas=Terisi, Abu=Kosong)
      let padColor = 0x334155;
      let borderHex = '#94a3b8';
      if (fb === 'correct') {
        padColor = 0x10b981;
        borderHex = '#6ee7b7';
      } else if (fb === 'wrong') {
        padColor = 0xef4444;
        borderHex = '#fca5a5';
      } else if (placed) {
        padColor = 0xf59e0b;
        borderHex = '#fde68a';
      }

      // Piring / Slot di atas meja
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.14, 1.75),
        new THREE.MeshStandardMaterial({
          color: padColor,
          emissive: padColor,
          emissiveIntensity: fb !== 'neutral' ? 0.45 : 0.15,
          roughness: 0.35
        })
      );
      plate.position.set(sl.x, 1.36, sl.z);
      scene.add(plate);
      teamSlotMeshes[teamKey].push(plate);

      // Lingkaran Lantai Interaksi di Depan Slot
      const floorDot = new THREE.Mesh(
        new THREE.RingGeometry(0.52, 0.72, 20),
        new THREE.MeshBasicMaterial({ color: padColor, side: THREE.DoubleSide })
      );
      floorDot.rotation.x = -Math.PI / 2;
      floorDot.position.set(sl.standX, 0.08, sl.standZ);
      scene.add(floorDot);
      teamSlotMeshes[teamKey].push(floorDot);

      // Jika slot berisi kata -> tampilkan kubus kata 3D di atas piring!
      if (placed && placed.word) {
        const wordCube = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.75, 1.3),
          new THREE.MeshStandardMaterial({
            color: fb === 'wrong' ? 0xfecaca : (fb === 'correct' ? 0xa7f3d0 : 0xfef3c7),
            roughness: 0.45
          })
        );
        wordCube.position.set(sl.x, 1.82, sl.z);
        wordCube.castShadow = true;
        scene.add(wordCube);
        teamSlotMeshes[teamKey].push(wordCube);

        const spr = createWordSprite(
          `${idx + 1}. ${placed.word}`,
          fb === 'wrong' ? '#7f1d1d' : (fb === 'correct' ? '#064e3b' : '#0f172a'),
          borderHex,
          '#ffffff',
          2.35,
          0.8
        );
        spr.position.set(sl.x, 2.7, sl.z);
        scene.add(spr);
        teamSlotMeshes[teamKey].push(spr);
      } else {
        const numSpr = createWordSprite(
          `Slot ${idx + 1}`,
          'rgba(15, 23, 42, 0.82)',
          cfg.css,
          '#cbd5e1',
          1.55,
          0.56
        );
        numSpr.position.set(sl.x, 2.15, sl.z);
        scene.add(numSpr);
        teamSlotMeshes[teamKey].push(numSpr);
      }
    });

    // Pad Lantai "SAJIKAN / SERVE" di Ujung Meja
    const sp = layout.servePad;
    const serveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.14, 24),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.4,
        roughness: 0.3
      })
    );
    serveMesh.position.set(sp.x, 0.08, sp.z);
    scene.add(serveMesh);

    const serveLabel = createWordSprite('SAJIKAN', '#064e3b', '#4ade80', '#ffffff', 2.2, 0.72);
    serveLabel.position.set(sp.x, 1.65, sp.z);
    scene.add(serveLabel);

    teamServePads[teamKey] = { x: sp.x, z: sp.z, mesh: serveMesh, label: serveLabel };
  }

  // ==================== 6. BLOK KATA 3D DI DAPUR TENGAH ====================
  const wordBlockMeshes = {}; // blockId -> { group, data, baseY }

  function syncWordBlocks(blocks) {
    // Hapus blok lama
    Object.values(wordBlockMeshes).forEach(entry => scene.remove(entry.group));
    for (const k in wordBlockMeshes) delete wordBlockMeshes[k];

    (blocks || []).forEach((b, idx) => {
      const grp = new THREE.Group();
      grp.position.set(b.x, 0, b.z);

      // Kubus Roti / Bahan Makanan Hangat Bercahaya
      const topTex = createCubeTopTexture(b.word);
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.18,
        roughness: 0.45
      });
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.4 });
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.85, 1.35),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
      );
      cube.position.y = 0.65;
      cube.castShadow = true;
      grp.add(cube);

      // Piring alas kecil di lantai
      const tray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 0.96, 0.08, 18),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      tray.position.y = 0.08;
      grp.add(tray);

      // Label Teks Mengambang Besar & Tajam untuk Layar HP
      const label = createWordSprite(b.word, 'rgba(15, 23, 42, 0.94)', '#fbbf24', '#ffffff', 2.45, 0.82);
      label.position.y = 1.95;
      grp.add(label);

      grp.visible = b.available !== false;
      scene.add(grp);
      wordBlockMeshes[b.id] = { group: grp, cube, label, data: b, phase: idx * 0.7 };
    });
  }

  // ==================== 7. PARTIKEL CONFETTI 3D ====================
  const confettiParticles = [];
  function spawnConfettiBurst(x, y, z) {
    const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xfbbf24, 0xec4899, 0x38bdf8];
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.08);
    for (let i = 0; i < 42; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x + (Math.random() - 0.5) * 4, y + Math.random() * 1.2, z + (Math.random() - 0.5) * 4);
      scene.add(p);
      confettiParticles.push({
        mesh: p,
        vx: (Math.random() - 0.5) * 7,
        vy: 5 + Math.random() * 6,
        vz: (Math.random() - 0.5) * 7,
        life: 1.8 + Math.random() * 0.8
      });
    }
  }

  // ==================== 8. STATE GAME, PEMAIN & BOT SOLO ====================
  let socket = null;
  let myTeam = 'red';
  let myCarrying = null;
  let currentLevel = 'sd';
  let matchState = 'LOBBY';
  let teamsState = {};
  let playersList = [];
  let botsEnabled = true;

  let localAvatar = new Avatar3D(scene, {
    name: playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, -11);
  let localCarryingGroup = null;
  const remoteAvatars = {}; // id -> { avatar, carryingGroup, targetPos }
  const soloBots = []; // Bot rekan setim & 3 tim lawan saat mode solo testing

  const controls = new Controls(camera, localAvatar, renderer.domElement, {
    moveSpeed: 10.5,
    maxRadius: 17.4
  });
  // Sudut kamera nyaman untuk layar HP & PC
  if (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches) {
    controls.cameraPitch = 0.44;
    controls.cameraDistance = 11.5;
  } else {
    controls.cameraPitch = 0.48;
    controls.cameraDistance = 12.5;
  }

  function createCarryingProp(word) {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.48, 0.82),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 })
    );
    grp.add(box);
    const spr = createWordSprite(word, '#0f172a', '#fbbf24', '#fef08a', 1.75, 0.58);
    spr.position.y = 0.72;
    grp.add(spr);
    grp.position.set(0, 3.35, 0);
    return grp;
  }

  function setLocalCarrying(word) {
    myCarrying = word || null;
    if (localCarryingGroup && localAvatar) {
      localAvatar.group.remove(localCarryingGroup);
      localCarryingGroup = null;
    }
    const badge = document.getElementById('carrying-word-badge');
    const txt = document.getElementById('carrying-word-text');
    if (myCarrying && localAvatar) {
      localCarryingGroup = createCarryingProp(myCarrying);
      localAvatar.group.add(localCarryingGroup);
      txt.textContent = myCarrying;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function setRemoteCarrying(pid, word) {
    const r = remoteAvatars[pid];
    if (!r) return;
    if (r.carryingGroup) {
      r.avatar.group.remove(r.carryingGroup);
      r.carryingGroup = null;
    }
    if (word) {
      r.carryingGroup = createCarryingProp(word);
      r.avatar.group.add(r.carryingGroup);
    }
  }

  // ==================== 9. UI HUD & BANNER PESANAN + PRATINJAU SLOT ====================
  let toastTimeout = null;
  function showCafeToast(msg, isOk = true) {
    const el = document.getElementById('cafe-toast');
    el.innerHTML = msg;
    el.className = isOk ? 'ctoast-ok' : 'ctoast-err';
    el.style.opacity = '1';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  function formatTime(sec) {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateHUD() {
    // Skor 4 tim di strip atas
    ['red', 'blue', 'green', 'yellow'].forEach(tk => {
      const el = document.getElementById(`score-${tk}`);
      if (el && teamsState[tk]) el.textContent = teamsState[tk].score;
    });

    // Banner Pesanan & Pratinjau Slot Meja Tim Kita
    const t = teamsState[myTeam];
    const cfg = TEAM_CONFIG[myTeam];
    if (t && t.order && cfg) {
      const banner = document.getElementById('cafe-order-banner');
      banner.style.borderColor = cfg.css;
      document.getElementById('cafe-order-tag').textContent =
        `${cfg.emoji} ${cfg.name.toUpperCase()} (${cfg.dirLabel}) • PESANAN #${t.orderNumber} • ${currentLevel.toUpperCase()}`;
      document.getElementById('cafe-order-indo').textContent = `"${t.order.indo}"`;

      const slotsWrap = document.getElementById('cafe-slots-preview');
      slotsWrap.innerHTML = '';
      t.slots.forEach((sl, idx) => {
        const chip = document.createElement('span');
        const fb = (t.slotFeedback && t.slotFeedback[idx]) || 'neutral';
        chip.className = 'slot-chip';
        if (fb === 'correct') chip.classList.add('correct');
        else if (fb === 'wrong') chip.classList.add('wrong');
        else if (sl) chip.classList.add('filled');

        chip.innerHTML = `<span class="slot-num">${idx + 1}</span> ${sl ? sl.word : '___'}`;
        slotsWrap.appendChild(chip);
      });
    }

    // Peringkat 4 Tim di panel kanan / laci 
    const rankList = document.getElementById('cafe-rank-list');
    document.getElementById('cafe-player-count').textContent = `(${playersList.length})`;
    const sortedTeams = Object.values(teamsState).sort((a, b) => b.score - a.score);
    rankList.innerHTML = sortedTeams.map((tm, i) => {
      const tc = TEAM_CONFIG[tm.key];
      const isMe = tm.key === myTeam;
      return `<div class="rank-item" style="${isMe ? 'background: rgba(251,191,36,0.18); border-radius:6px; padding:2px 5px;' : ''}">
        <span>#${i + 1} ${tc.emoji} ${tm.name}${isMe ? ' ' : ''}</span>
        <strong style="color:${tc.css};">${tm.score}</strong>
      </div>`;
    }).join('');
  }

  function renderAllTables() {
    ['red', 'blue', 'green', 'yellow'].forEach(tk => {
      if (teamsState[tk]) renderTeamTableSlots(tk, teamsState[tk]);
    });
  }

  // ==================== 10. SISTEM BOT REKAN SETIM & TIM LAWAN (MODE SOLO) ====================
  function clearSoloBots() {
    soloBots.forEach(b => {
      b.avatar.destroy();
    });
    soloBots.length = 0;
  }

  function spawnSoloBotsIfNeeded() {
    clearSoloBots();
    if (!botsEnabled || playersList.length > 1) return;

    const botSpecs = [
      { name: 'Rekan Bot', team: myTeam, color: TEAM_CONFIG[myTeam].css, isTeammate: true, speed: 6.0 }
    ];
    ['red', 'blue', 'green', 'yellow'].forEach((tk, i) => {
      if (tk === myTeam) return;
      botSpecs.push({
        name: `Chef ${TEAM_CONFIG[tk].name.replace('Tim ', '')}`,
        team: tk,
        color: TEAM_CONFIG[tk].css,
        isTeammate: false,
        speed: 4.8 + i * 0.35
      });
    });

    botSpecs.forEach((spec, idx) => {
      const cfg = TEAM_CONFIG[spec.team];
      const av = new Avatar3D(scene, {
        name: spec.name,
        color: spec.color,
        hat: spec.isTeammate ? 'topi_sekolah' : 'none',
        isLocal: false
      });
      const startX = cfg.tablePos.x + cfg.frontNormal.x * 3.2;
      const startZ = cfg.tablePos.z + cfg.frontNormal.z * 3.2;
      av.group.position.set(startX, 0, startZ);

      soloBots.push({
        ...spec,
        avatar: av,
        carrying: null,
        carryingGroup: null,
        state: 'IDLE', // IDLE -> TO_WORD -> TO_SLOT
        targetSlotIdx: -1,
        targetWord: null,
        targetPos: { x: startX, z: startZ },
        cooldown: 1.5 + idx * 1.1
      });
    });
  }

  function updateSoloBots(dt) {
    if (matchState !== 'PLAYING' || playersList.length > 1 || soloBots.length === 0) return;

    soloBots.forEach(bot => {
      const tData = teamsState[bot.team];
      if (!tData || !tData.order) return;

      if (bot.cooldown > 0) {
        bot.cooldown -= dt;
        bot.avatar.isMoving = false;
        bot.avatar.update(dt);
        return;
      }

      if (bot.state === 'IDLE') {
        // Cari slot kosong atau slot yang masih merah di meja tim bot
        let chosenSlot = -1;
        for (let i = 0; i < tData.slots.length; i++) {
          const fb = tData.slotFeedback[i];
          if (!tData.slots[i] || fb === 'wrong') {
            chosenSlot = i;
            break;
          }
        }
        if (chosenSlot === -1) {
          bot.cooldown = 1.0;
          return;
        }
        // Tentukan kata target (90% benar, 10% salah biar terasa natural)
        const expectedWord = tData.order.words[chosenSlot];
        const useDistractor = !bot.isTeammate && Math.random() < 0.14 && tData.order.distractors.length > 0;
        const wantedWord = useDistractor ? tData.order.distractors[0] : expectedWord;

        // Cari posisi blok kata di tengah (atau titik tengah acak)
        let wx = (Math.random() - 0.5) * 6;
        let wz = (Math.random() - 0.5) * 6;
        const matchEntry = Object.values(wordBlockMeshes).find(e => e.data.word === wantedWord);
        if (matchEntry) {
          wx = matchEntry.data.x;
          wz = matchEntry.data.z;
        }

        bot.targetSlotIdx = chosenSlot;
        bot.targetWord = wantedWord;
        bot.targetPos = { x: wx, z: wz };
        bot.state = 'TO_WORD';
      }

      // Gerakkan bot menuju targetPos
      const pos = bot.avatar.group.position;
      const dx = bot.targetPos.x - pos.x;
      const dz = bot.targetPos.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.7) {
        const step = Math.min(dist, bot.speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        bot.avatar.group.rotation.y = Math.atan2(dx, dz);
        bot.avatar.isMoving = true;
        bot.avatar.update(dt);
      } else {
        bot.avatar.isMoving = false;
        bot.avatar.update(dt);
        if (bot.state === 'TO_WORD') {
          // Ambil kata!
          bot.carrying = bot.targetWord;
          if (bot.carryingGroup) bot.avatar.group.remove(bot.carryingGroup);
          bot.carryingGroup = createCarryingProp(bot.carrying);
          bot.avatar.group.add(bot.carryingGroup);

          const layout = getTeamSlotPositions(bot.team, tData.slots.length);
          const sl = layout.slots[bot.targetSlotIdx] || layout.slots[0];
          bot.targetPos = { x: sl.standX, z: sl.standZ };
          bot.state = 'TO_SLOT';
        } else if (bot.state === 'TO_SLOT') {
          // Taruh kata di meja tim melalui server!
          if (bot.carrying && socket) {
            socket.emit('cafe_bot_place_slot', {
              teamKey: bot.team,
              slotIndex: bot.targetSlotIdx,
              word: bot.carrying,
              botName: bot.name
            });
          }
          bot.carrying = null;
          if (bot.carryingGroup) {
            bot.avatar.group.remove(bot.carryingGroup);
            bot.carryingGroup = null;
          }
          bot.state = 'IDLE';
          bot.cooldown = bot.isTeammate ? 2.4 : 3.2;
        }
      }
    });
  }

  // ==================== 11. INTERAKSI PEMAIN (AMBIL / TARUH / SAJIKAN) ====================
  let currentContextAction = null; // { type: 'pickup'|'place'|'serve'|'drop', id/slotIndex, label, icon }
  let servePadCooldown = 0;

  function detectNearbyAction() {
    if (!localAvatar || matchState !== 'PLAYING') {
      currentContextAction = null;
      updateMobileActionUI();
      return;
    }

    const px = localAvatar.group.position.x;
    const pz = localAvatar.group.position.z;
    let found = null;

    // 1. Jika sedang membawa kata -> cek apakah dekat slot meja tim sendiri
    const tData = teamsState[myTeam];
    if (myCarrying && tData && tData.order) {
      const layout = getTeamSlotPositions(myTeam, tData.slots.length);
      let bestDist = 2.65;
      let bestSlot = -1;
      layout.slots.forEach(sl => {
        const d = Math.hypot(px - sl.standX, pz - sl.standZ);
        if (d < bestDist) {
          bestDist = d;
          bestSlot = sl.index;
        }
      });

      if (bestSlot !== -1) {
        const isOccupied = !!tData.slots[bestSlot];
        found = {
          type: 'place',
          slotIndex: bestSlot,
          icon: isOccupied ? '' : '',
          label: isOccupied ? `TUKAR #${bestSlot + 1}` : `TARUH #${bestSlot + 1}`
        };
      }
    }

    // 2. Jika tangan kosong -> cek blok kata terdekat di dapur tengah
    if (!found && !myCarrying) {
      let bestDist = 2.45;
      let bestBlock = null;
      Object.values(wordBlockMeshes).forEach(entry => {
        if (!entry.group.visible) return;
        const d = Math.hypot(px - entry.data.x, pz - entry.data.z);
        if (d < bestDist) {
          bestDist = d;
          bestBlock = entry.data;
        }
      });
      if (bestBlock) {
        found = {
          type: 'pickup',
          blockId: bestBlock.id,
          word: bestBlock.word,
          icon: '',
          label: 'AMBIL'
        };
      }
    }

    // 3. Cek apakah berdiri di dekat Pad "SAJIKAN" meja tim sendiri
    const sp = teamServePads[myTeam];
    if (!found && sp) {
      const dServe = Math.hypot(px - sp.x, pz - sp.z);
      if (dServe < 1.85) {
        found = {
          type: 'serve',
          icon: '',
          label: 'SAJIKAN'
        };
        // Auto-trigger sajikan saat menginjak pad jika semua slot terisi & tidak cooldown
        if (servePadCooldown <= 0 && tData && tData.slots.some(s => s !== null)) {
          servePadCooldown = 2.2;
          socket.emit('cafe_serve');
        }
      }
    }

    // 4. Jika masih pegang kata tapi jauh dari meja -> tawarkan tombol BUANG
    if (!found && myCarrying) {
      found = {
        type: 'drop',
        icon: '',
        label: 'BUANG'
      };
    }

    currentContextAction = found;
    updateMobileActionUI();
  }

  function updateMobileActionUI() {
    if (!window.MobileControls || !window.MobileControls.setActionLabel) return;
    if (currentContextAction) {
      window.MobileControls.setActionLabel(
        currentContextAction.label,
        currentContextAction.type !== 'drop',
        currentContextAction.icon,
        triggerContextAction
      );
    } else {
      window.MobileControls.setActionLabel('AMBIL', false, '', null);
    }
  }

  function triggerContextAction() {
    if (!currentContextAction || !socket || matchState !== 'PLAYING') return;

    if (currentContextAction.type === 'pickup') {
      socket.emit('cafe_pickup_word', currentContextAction.blockId, (res) => {
        if (res && res.success) {
          setLocalCarrying(res.word);
          playPickupPop();
        }
      });
    } else if (currentContextAction.type === 'place') {
      socket.emit('cafe_place_slot', currentContextAction.slotIndex, (res) => {
        if (res && res.success) {
          setLocalCarrying(res.carrying);
          playPickupPop();
        }
      });
    } else if (currentContextAction.type === 'serve') {
      socket.emit('cafe_serve');
    } else if (currentContextAction.type === 'drop') {
      socket.emit('cafe_drop_word');
      setLocalCarrying(null);
    }
  }

  // Aktifkan tombol aksi kontekstual di HP & bind tombol E di PC
  if (window.MobileControls) {
    window.MobileControls.enableActionButton();
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && document.activeElement.tagName !== 'INPUT') {
      triggerContextAction();
    }
  });
  document.getElementById('btn-drop-carrying').addEventListener('click', () => {
    if (myCarrying && socket) {
      socket.emit('cafe_drop_word');
      setLocalCarrying(null);
    }
  });

  // ==================== 12. KONEKSI SOCKET.IO MULTIPLAYER ====================
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_cafe', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      name: playerName,
      color: playerColor,
      hat: playerHat
    }, (res) => {
      if (!res || !res.success) return;
      myTeam = res.player.team;
      currentLevel = res.level || 'sd';
      matchState = res.state || 'LOBBY';
      teamsState = res.teams || {};
      playersList = res.players || [];

      const cfg = TEAM_CONFIG[myTeam];
      const tb = document.getElementById('my-team-banner');
      const tt = document.getElementById('my-team-text');
      if (tt) tt.textContent = `Tim Kamu: ${cfg.emoji} ${cfg.name.toUpperCase()} (${cfg.dirLabel})`;
      tb.style.borderColor = cfg.css;
      tb.style.background = `${cfg.css}2a`;

      // Posisikan Avatar Lokal di depan meja timnya
      localAvatar.group.position.set(res.player.x, 0, res.player.z);

      // Spawn Pemain Lain
      playersList.forEach(p => {
        if (p.id !== socket.id) spawnRemotePlayer(p);
      });

      syncWordBlocks(res.wordBlocks);
      renderAllTables();
      updateHUD();
      document.getElementById('hud-cafe-timer').textContent = `${formatTime(res.timeLeft)}`;

      if (matchState === 'PLAYING') {
        document.getElementById('cafe-mode-modal').style.display = 'none';
      }
    });
  });

  function spawnRemotePlayer(p) {
    if (remoteAvatars[p.id]) return;
    const av = new Avatar3D(scene, {
      name: p.name,
      color: p.color,
      hat: p.hat || 'none',
      isLocal: false
    });
    av.group.position.set(p.x, p.y || 0, p.z);
    remoteAvatars[p.id] = {
      avatar: av,
      carryingGroup: null,
      targetPos: new THREE.Vector3(p.x, p.y || 0, p.z),
      targetRotY: p.rotY || 0,
      isMoving: false,
      isJumping: false
    };
    if (p.carrying) setRemoteCarrying(p.id, p.carrying);
  }

  socket.on('cafe_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemotePlayer(p);
  });

  socket.on('cafe_players_updated', (list) => {
    playersList = list;
    if (playersList.length > 1) clearSoloBots();
    updateHUD();
  });

  socket.on('cafe_player_left', (pid) => {
    if (remoteAvatars[pid]) {
      remoteAvatars[pid].avatar.destroy();
      delete remoteAvatars[pid];
    }
  });

  socket.on('cafe_player_moved', (d) => {
    const r = remoteAvatars[d.id];
    if (!r) return;
    r.targetPos.set(d.x, d.y || 0, d.z);
    r.targetRotY = d.rotY || 0;
    r.isMoving = d.isMoving;
    r.isJumping = d.isJumping;
  });

  socket.on('cafe_blocks_updated', (blocks) => {
    syncWordBlocks(blocks);
  });

  socket.on('cafe_word_picked', ({ playerId, blockId, word }) => {
    if (wordBlockMeshes[blockId]) wordBlockMeshes[blockId].group.visible = false;
    if (playerId !== socket.id) setRemoteCarrying(playerId, word);
  });

  socket.on('cafe_word_respawned', ({ blockId }) => {
    if (wordBlockMeshes[blockId]) wordBlockMeshes[blockId].group.visible = true;
  });

  socket.on('cafe_word_dropped', ({ playerId }) => {
    if (playerId !== socket.id) setRemoteCarrying(playerId, null);
  });

  socket.on('cafe_slot_updated', (data) => {
    teamsState = data.teams;
    if (data.playerId && data.playerId !== socket.id) {
      setRemoteCarrying(data.playerId, data.carrying);
    }
    renderTeamTableSlots(data.team, teamsState[data.team]);
    updateHUD();
  });

  socket.on('cafe_order_served', (data) => {
    teamsState = data.teams;
    playersList = data.players || playersList;
    syncWordBlocks(data.wordBlocks);
    renderAllTables();
    updateHUD();

    const cfg = TEAM_CONFIG[data.team];
    if (cfg) {
      spawnConfettiBurst(cfg.tablePos.x, 2.2, cfg.tablePos.z);
    }
    if (data.team === myTeam) {
      playCafeBell();
      showCafeToast(
        `BENAR! <strong>"${data.sentence}"</strong><br>+${data.earned} Poin (Bonus Cepat +${data.speedBonus}) • <span style="font-weight:600; font-size:0.86em;">${data.grammar}</span>`,
        true
      );
    } else if (window.soundFX && window.soundFX.enabled) {
      playCafeBell();
    }
  });

  socket.on('cafe_order_check_fail', (data) => {
    teamsState = data.teams;
    renderTeamTableSlots(data.team, teamsState[data.team]);
    updateHUD();
    if (data.team === myTeam) {
      playErrorBuzz();
      showCafeToast('Masih ada slot MERAH yang keliru! Ganti kata di slot merah saja ya!', false);
    }
  });

  function refreshMyTeamBanner() {
    const cfg = TEAM_CONFIG[myTeam];
    if (!cfg) return;
    const tb = document.getElementById('my-team-banner');
    const tt = document.getElementById('my-team-text');
    if (tt) tt.textContent = `Tim Kamu: ${cfg.emoji} ${cfg.name.toUpperCase()} (${cfg.dirLabel})`;
    if (tb) {
      tb.style.borderColor = cfg.css;
      tb.style.background = `${cfg.css}2a`;
    }
  }

  socket.on('cafe_teams_shuffled', (data) => {
    playersList = data.players || playersList;
    teamsState = data.teams || teamsState;
    const me = playersList.find(p => p.id === socket.id);
    if (me) {
      myTeam = me.team;
      localAvatar.group.position.set(me.x, 0, me.z);
    }
    refreshMyTeamBanner();
    syncWordBlocks(data.wordBlocks);
    renderAllTables();
    updateHUD();
    playPickupPop();
  });

  socket.on('cafe_match_started', (data) => {
    currentLevel = data.level;
    matchState = 'PLAYING';
    teamsState = data.teams;
    playersList = data.players || playersList;
    setLocalCarrying(null);
    document.getElementById('cafe-mode-modal').style.display = 'none';
    document.getElementById('cafe-podium-modal').style.display = 'none';
    document.getElementById('hud-cafe-timer').textContent = `${formatTime(data.timeLeft)}`;

    // Perbarui tim lokal (hasil pengacakan tim server!) & posisi ke meja tim baru
    const me = playersList.find(p => p.id === socket.id);
    if (me) {
      myTeam = me.team;
      refreshMyTeamBanner();
      if (localAvatar) localAvatar.group.position.set(me.x, 0, me.z);
    }

    syncWordBlocks(data.wordBlocks);
    renderAllTables();
    updateHUD();
    spawnSoloBotsIfNeeded();
    playCafeBell();
    const myCfg = TEAM_CONFIG[myTeam];
    showCafeToast(
      `TIM DIACAK! Kamu masuk <strong>${myCfg.emoji} ${myCfg.name.toUpperCase()} (${myCfg.dirLabel})</strong> — Mode ${currentLevel.toUpperCase()}!`,
      true
    );
  });

  socket.on('cafe_timer_tick', ({ timeLeft }) => {
    document.getElementById('hud-cafe-timer').textContent = `${formatTime(timeLeft)}`;
  });

  socket.on('cafe_match_finished', (data) => {
    matchState = 'FINISHED';
    clearSoloBots();
    setLocalCarrying(null);
    playCafeBell();

    const winner = data.ranking[0];
    document.getElementById('cafe-win-title').textContent = `${winner.name.toUpperCase()} JUARA KAFE!`;
    document.getElementById('cafe-win-sub').textContent =
      `${winner.name} menyajikan ${winner.servedCount} kalimat bahasa Inggris dengan total ${winner.score} poin!`;

    const rankBox = document.getElementById('cafe-final-ranking');
    rankBox.innerHTML = data.ranking.map((r, idx) => {
      const tc = TEAM_CONFIG[r.key];
      return `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.75); border:1.5px solid ${tc.css}; border-radius:12px; padding:0.55rem 0.9rem; font-weight:800;">
        <span>#${idx + 1} ${tc.emoji} ${r.name}</span>
        <span style="color:#fde68a;">${r.servedCount} kalimat • ${r.score} pts</span>
      </div>`;
    }).join('');

    document.getElementById('cafe-podium-modal').style.display = 'flex';
  });

  socket.on('cafe_player_emote', ({ id, emote }) => {
    if (id === socket.id && localAvatar) localAvatar.showEmote(emote);
    else if (remoteAvatars[id]) remoteAvatars[id].avatar.showEmote(emote);
  });

  // ==================== 13. EVENT MODAL, SUARA & EMOTE DROPDOWN ====================
  let selectedLevel = 'sd';
  const cardSD = document.getElementById('choice-cafe-sd');
  const cardSMP = document.getElementById('choice-cafe-smp');
  cardSD.addEventListener('click', () => {
    selectedLevel = 'sd';
    cardSD.classList.add('selected');
    cardSMP.classList.remove('selected');
  });
  cardSMP.addEventListener('click', () => {
    selectedLevel = 'smp';
    cardSMP.classList.add('selected');
    cardSD.classList.remove('selected');
  });

  document.getElementById('btn-start-cafe').addEventListener('click', () => {
    botsEnabled = document.getElementById('toggle-cafe-bots').checked;
    socket.emit('cafe_start_match', { level: selectedLevel });
  });
  document.getElementById('btn-cancel-cafe').addEventListener('click', () => {
    if (matchState === 'PLAYING') {
      document.getElementById('cafe-mode-modal').style.display = 'none';
    } else {
      window.location.href = 'index.html';
    }
  });
  document.getElementById('btn-shuffle-teams').addEventListener('click', () => {
    if (socket) socket.emit('cafe_shuffle_teams');
  });
  document.getElementById('btn-open-cafe-modal').addEventListener('click', () => {
    document.getElementById('cafe-mode-modal').style.display = 'flex';
  });
  document.getElementById('btn-cafe-replay').addEventListener('click', () => {
    botsEnabled = document.getElementById('toggle-cafe-bots').checked;
    socket.emit('cafe_start_match', { level: selectedLevel });
  });
  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    if (window.soundFX) {
      window.soundFX.enabled = !window.soundFX.enabled;
      e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
    }
  });

  const emoteToggle = document.getElementById('btn-cafe-emote-toggle');
  const emoteMenu = document.getElementById('cafe-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      emoteMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!emoteMenu.contains(e.target) && e.target !== emoteToggle) {
        emoteMenu.classList.remove('open');
      }
    });
  }
  document.querySelectorAll('.cafe-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.dataset.emote;
      socket.emit('cafe_emote', em);
      if (emoteMenu) emoteMenu.classList.remove('open');
    });
  });

  // ==================== 14. MAIN ANIMATION & PHYSICS LOOP ====================
  let velY = 0;
  let isGrounded = true;
  let lastEmitTime = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (servePadCooldown > 0) servePadCooldown -= dt;

    // Animasi melayang lembut blok kata di dapur tengah
    Object.values(wordBlockMeshes).forEach(entry => {
      if (!entry.group.visible) return;
      entry.cube.position.y = 0.65 + Math.sin(elapsed * 2.6 + entry.phase) * 0.08;
      entry.cube.rotation.y = Math.sin(elapsed * 0.9 + entry.phase) * 0.18;
    });

    // Update Confetti 3D
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.life -= dt;
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += 6 * dt;
      p.mesh.rotation.y += 5 * dt;
      if (p.life <= 0 || p.mesh.position.y < 0) {
        scene.remove(p.mesh);
        confettiParticles.splice(i, 1);
      }
    }

    // Update Gerak Pemain Lokal via Controls bawaan EduMetro
    if (localAvatar) {
      controls.update(dt);
      // Batas ruangan kafe (-17.4..17.4)
      localAvatar.group.position.x = Math.max(-17.4, Math.min(17.4, localAvatar.group.position.x));
      localAvatar.group.position.z = Math.max(-17.4, Math.min(17.4, localAvatar.group.position.z));
      localAvatar.update(dt);
      detectNearbyAction();

      // Kirim posisi ke server tiap 50ms
      const now = performance.now();
      if (socket && socket.connected && now - lastEmitTime > 50) {
        lastEmitTime = now;
        socket.emit('cafe_move', {
          x: parseFloat(localAvatar.group.position.x.toFixed(2)),
          y: parseFloat(localAvatar.group.position.y.toFixed(2)),
          z: parseFloat(localAvatar.group.position.z.toFixed(2)),
          rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
          isMoving: localAvatar.isMoving,
          isJumping: localAvatar.isJumping
        });
      }
    }

    // Interpolasi Pemain Remote
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

    // Update Bot Solo
    updateSoloBots(dt);

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
})();
