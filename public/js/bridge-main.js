// Mini Game #05: Jembatan Kaca Pecahan (Menara Jembatan Matematika — SD & SMP)
// Modular Three.js + Socket.IO + Fallback 4 Bot Siswa AI (tanpa mengubah kode lobi/game lain).

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-05').toLowerCase().trim();
  const isTeacher = sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo';

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru' : 'Siswa');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  // Konstanta Tata Letak Jembatan (pas untuk jarak lompat Controls & Avatar3D!)
  const ROW_COUNT = 8;
  const FIRST_ROW_Z = -7.5;
  const ROW_GAP = 6.5;
  const COL_XS = [-5.2, 0, 5.2];
  const PANEL_SIZE = 4.4;
  const FINISH_START_Z = -56.6;
  const FINISH_END_Z = -67.5;

  const getRowZ = (row) => FIRST_ROW_Z - row * ROW_GAP;

  // ==================== 1. SCENE 3D MENARA LANGIT ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7dd3fc);
  scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0065);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 420);
  camera.position.set(0, 8, 12);

  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x38bdf8, 0.78));
  const sun = new THREE.DirectionalLight(0xfffbeb, 0.92);
  sun.position.set(35, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // ==================== 2. STATE PERMAINAN ====================
  let currentLevel = 'sd';
  let stepsData = [];        // 8 soal dari server
  let panelMeshes = [];      // [row][col] -> { group, glassMesh, frameMesh, sprite, state }
  let glassShards = [];      // Partikel pecahan kaca jatuh
  let sparkles = [];         // Partikel kilauan hijau saat benar
  let clouds = [];
  let trophyMesh = null;

  // Papan Soal Raksasa 3D di depan jembatan
  let giantBoardCanvas = null;
  let giantBoardTex = null;

  // State Pemain Lokal
  let localAvatar = null;
  let controls = null;
  let isFalling = false;
  let fallVelocity = 0;
  let highestRow = 0; // 0..8
  let activePromptRow = 0; // Baris soal yang ditampilkan (0..7)
  let hasCheckpoint = false;
  let checkpointPos = { x: 0, z: 1.2 };
  let hasFinished = false;
  let roundStartLocal = performance.now();

  // Pemain Remote & Fallback 4 Bot Siswa
  const remotePlayers = {};
  let bots = [];
  let socket = null;
  let lastEmitTime = 0;

  // ==================== 3. BANGUN STRUKTUR MENARA & JEMBATAN ====================
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);

  function buildStaticTowerEnvironment() {
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });

    // 1. Platform Start Menara (z = -3.6 .. +5.2)
    const startPad = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 9), stoneMat);
    startPad.position.set(0, -1.1, 0.8);
    startPad.receiveShadow = true;
    scene.add(startPad);

    const startTrim = new THREE.Mesh(new THREE.BoxGeometry(18.3, 0.35, 9.3), trimMat);
    startTrim.position.set(0, -0.15, 0.8);
    scene.add(startTrim);

    // Pilar Menara Start menjulang ke bawah awan
    const towerCol = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 36, 16), darkMat);
    towerCol.position.set(0, -20, 0.8);
    scene.add(towerCol);

    // Garis Start Putih
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(17, 0.7), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.03, -3.1);
    scene.add(startLine);

    // 2. Rel Samping Kiri & Kanan Sepanjang Jembatan Kaca (x = ±8.3)
    const railLen = 54;
    const railGeo = new THREE.BoxGeometry(0.45, 0.45, railLen);
    const railMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    [-8.3, 8.3].forEach(rx => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(rx, -0.15, -30.2);
      scene.add(rail);
    });

    // Penanda Emas CHECKPOINT di Baris 4 (row = 3 -> z = -27.0)
    const cpZ = getRowZ(3);
    [-8.3, 8.3].forEach(cx => {
      const cpPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 5.2, 10), goldMat);
      cpPillar.position.set(cx, 2.6, cpZ);
      scene.add(cpPillar);
      const cpOrb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      cpOrb.position.set(cx, 5.5, cpZ);
      scene.add(cpOrb);
    });

    // 3. Platform Finis Menara (z = -56.6 .. -67.5)
    const finPad = new THREE.Mesh(new THREE.BoxGeometry(18.5, 2.2, 11), stoneMat);
    finPad.position.set(0, -1.1, -62);
    finPad.receiveShadow = true;
    scene.add(finPad);

    const finTrim = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.35, 11.3), goldMat);
    finTrim.position.set(0, -0.15, -62);
    scene.add(finTrim);

    const finTowerCol = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 36, 16), darkMat);
    finTowerCol.position.set(0, -20, -62);
    scene.add(finTowerCol);

    // Garis Finis Kotak-Kotak
    const finC = document.createElement('canvas');
    finC.width = 512;
    finC.height = 64;
    const fc = finC.getContext('2d');
    for (let i = 0; i < 16; i++) {
      fc.fillStyle = i % 2 === 0 ? '#ffffff' : '#0f172a';
      fc.fillRect(i * 32, 0, 32, 64);
    }
    const finLine = new THREE.Mesh(
      new THREE.PlaneGeometry(17.5, 1.6),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(finC) })
    );
    finLine.rotation.x = -Math.PI / 2;
    finLine.position.set(0, 0.04, -57.6);
    scene.add(finLine);

    // 2 Bendera Finis + Piala Emas 3D Berputar!
    [-7.5, 7.5].forEach(fx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.5, 8), darkMat);
      pole.position.set(fx, 3.25, -58.5);
      scene.add(pole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.1), new THREE.MeshLambertMaterial({ color: 0xf43f5e }));
      flag.position.set(fx + (fx < 0 ? 1.1 : -1.1), 5.6, -58.5);
      scene.add(flag);
    });

    const trophyGroup = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.7, 2.4, 16), goldMat);
    cup.position.y = 2.4;
    trophyGroup.add(cup);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 1.4, 12), goldMat);
    stem.position.y = 0.7;
    trophyGroup.add(stem);
    const starTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    starTop.position.y = 4.4;
    trophyGroup.add(starTop);
    trophyGroup.position.set(0, 0.4, -63.5);
    scene.add(trophyGroup);
    trophyMesh = trophyGroup;

    // 4. Papan Soal Raksasa 3D Melayang di Depan Jembatan
    giantBoardCanvas = document.createElement('canvas');
    giantBoardCanvas.width = 1280;
    giantBoardCanvas.height = 420;
    giantBoardTex = new THREE.CanvasTexture(giantBoardCanvas);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(26, 8.6, 0.9),
      [darkMat, darkMat, darkMat, darkMat, new THREE.MeshBasicMaterial({ map: giantBoardTex }), darkMat]
    );
    board.position.set(0, 12.5, -70);
    scene.add(board);

    // 5. Awan Putih Melayang di Bawah Jembatan (Nuansa Menara Langit!)
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(3.2 + Math.random() * 2.2, 8, 8), cloudMat);
        puff.position.set((j - 1) * 3.2, Math.random() * 1.1, Math.random() * 1.4);
        c.add(puff);
      }
      c.position.set((Math.random() - 0.5) * 140, -10 - Math.random() * 16, -Math.random() * 90 + 15);
      scene.add(c);
      clouds.push({ mesh: c, speed: 0.7 + Math.random() * 0.9 });
    }
  }

  function updateGiantBoard(rowIdx) {
    if (!giantBoardCanvas || !stepsData[rowIdx]) return;
    const step = stepsData[rowIdx];
    const ctx = giantBoardCanvas.getContext('2d');
    const w = 1280;
    const h = 420;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, w, 74);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`JEMBATAN KACA BARIS ${rowIdx + 1} / ${ROW_COUNT} • MODE ${currentLevel.toUpperCase()}`, w / 2, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    const words = step.q.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(test).width > w - 110 && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);

    const baseY = lines.length === 1 ? 235 : 200;
    lines.slice(0, 2).forEach((l, i) => {
      ctx.fillText(l, w / 2, baseY + i * 66);
    });

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Lompat ke panel kaca dengan nilai jawaban yang BENAR!', w / 2, h - 42);

    giantBoardTex.needsUpdate = true;

    // Sinkronkan juga ke Banner HUD Atas
    document.getElementById('hud-bridge-step-tag').textContent =
      `SOAL BARIS ${rowIdx + 1} DARI ${ROW_COUNT} • MODE ${currentLevel.toUpperCase()}`;
    document.getElementById('hud-bridge-question').textContent = step.q;
  }

  function createPanelLabelTexture(text, state) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const bg = state === 'safe' ? 'rgba(6, 78, 59, 0.94)' : 'rgba(15, 23, 42, 0.9)';
    const border = state === 'safe' ? '#34d399' : '#38bdf8';

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(14, 14, 484, 228, 30);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 88px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 10), 256, 132);

    return new THREE.CanvasTexture(canvas);
  }

  function buildGlassBridgePanels(steps) {
    while (bridgeGroup.children.length > 0) {
      bridgeGroup.remove(bridgeGroup.children[0]);
    }
    panelMeshes = [];

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });

    steps.forEach((step, row) => {
      const rz = getRowZ(row);
      const rowPanels = [];

      for (let col = 0; col < 3; col++) {
        const cx = COL_XS[col];
        const state = step.panelStates[col] || 'unknown';
        const pGroup = new THREE.Group();

        // Panel Kaca Transparan Bercahaya
        const glassMat = new THREE.MeshLambertMaterial({
          color: state === 'safe' ? 0x10b981 : 0xbae6fd,
          transparent: true,
          opacity: state === 'safe' ? 0.88 : 0.62
        });
        const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(PANEL_SIZE, 0.34, PANEL_SIZE), glassMat);
        glassMesh.position.y = -0.17;
        glassMesh.receiveShadow = true;
        pGroup.add(glassMesh);

        // Bingkai Logam Panel Kaca
        const rim = new THREE.Mesh(
          new THREE.RingGeometry(PANEL_SIZE * 0.48, PANEL_SIZE * 0.52, 4),
          new THREE.MeshBasicMaterial({ color: state === 'safe' ? 0x34d399 : 0x38bdf8, side: THREE.DoubleSide })
        );
        rim.rotation.x = -Math.PI / 2;
        rim.rotation.z = Math.PI / 4;
        rim.position.y = 0.02;
        pGroup.add(rim);

        // Teks Jawaban Kontras Tinggi di Permukaan Kaca + Sprite Mengambang
        const labelTex = createPanelLabelTexture(step.options[col], state);
        const floorText = new THREE.Mesh(
          new THREE.PlaneGeometry(PANEL_SIZE * 0.86, PANEL_SIZE * 0.44),
          new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
        );
        floorText.rotation.x = -Math.PI / 2;
        floorText.position.y = 0.04;
        pGroup.add(floorText);

        const floatSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
        floatSprite.position.set(0, 1.65, 0);
        floatSprite.scale.set(3.4, 1.7, 1);
        pGroup.add(floatSprite);

        pGroup.position.set(cx, 0, rz);
        pGroup.visible = (state !== 'broken');
        bridgeGroup.add(pGroup);

        rowPanels.push({
          group: pGroup,
          glassMesh,
          rim,
          floorText,
          floatSprite,
          text: step.options[col],
          state
        });
      }

      // Nomor Baris kecil di sisi kiri jembatan
      panelMeshes.push(rowPanels);
    });

    activePromptRow = 0;
    updateGiantBoard(0);
  }

  // ==================== 4. EFEK PECAH KACA & KILAUAN AMAN ====================
  function shatterGlassPanel(row, col) {
    const pObj = panelMeshes[row] && panelMeshes[row][col];
    if (!pObj || pObj.state === 'broken') return;
    pObj.state = 'broken';
    pObj.group.visible = false;

    const origin = pObj.group.position;
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), shardMat);
      shard.position.set(
        origin.x + (Math.random() - 0.5) * 3.4,
        0,
        origin.z + (Math.random() - 0.5) * 3.4
      );
      scene.add(shard);
      glassShards.push({
        mesh: shard,
        vx: (Math.random() - 0.5) * 5,
        vy: 1 + Math.random() * 2.5,
        vz: (Math.random() - 0.5) * 5,
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        life: 1.4
      });
    }
  }

  function markPanelSafe(row, col) {
    const pObj = panelMeshes[row] && panelMeshes[row][col];
    if (!pObj || pObj.state === 'safe') return;
    pObj.state = 'safe';
    pObj.glassMesh.material.color.setHex(0x10b981);
    pObj.glassMesh.material.opacity = 0.9;
    pObj.rim.material.color.setHex(0x34d399);

    const newTex = createPanelLabelTexture(pObj.text, 'safe');
    pObj.floorText.material.map = newTex;
    pObj.floatSprite.material.map = newTex;

    // Partikel kilauan hijau/emas ringan
    const origin = pObj.group.position;
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 0.25),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x34d399 : 0xfbbf24 })
      );
      sp.position.set(origin.x + (Math.random() - 0.5) * 3, 0.4, origin.z + (Math.random() - 0.5) * 3);
      scene.add(sp);
      sparkles.push({ mesh: sp, vy: 2.5 + Math.random() * 3, life: 0.9 });
    }
  }

  let toastTimer = null;
  function showBridgeToast(text, cls) {
    const el = document.getElementById('bridge-toast');
    el.textContent = text;
    el.className = cls || 'btoast-ok';
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

  // ==================== 5. FALLBACK 4 BOT SISWA (SAAT TESTING SOLO) ====================
  function initFallbackBots() {
    clearBots();
    const botProfiles = [
      { name: 'Raka (Bot)', color: '#fb7185', hat: 'topi_sekolah' },
      { name: 'Sinta (Bot)', color: '#a78bfa', hat: 'telinga_kucing' },
      { name: 'Bima (Bot)', color: '#fbbf24', hat: 'topi_wisuda' },
      { name: 'Nadia (Bot)', color: '#10b981', hat: 'none' }
    ];

    botProfiles.forEach((bp, idx) => {
      const av = new Avatar3D(scene, { name: bp.name, color: bp.color, hat: bp.hat, isLocal: false });
      av.group.position.set(-5.5 + idx * 3.5, 0, 1.5);
      av.group.rotation.y = Math.PI;
      bots.push({
        id: `bot_${idx}`,
        name: bp.name,
        avatar: av,
        row: 0,
        targetX: -5.5 + idx * 3.5,
        targetZ: 1.5,
        hasCheckpoint: false,
        cpPos: { x: 0, z: 1.5 },
        isFalling: false,
        fallVel: 0,
        finished: false,
        finishTime: null,
        thinkTimer: 1.2 + idx * 0.9
      });
    });
  }

  function clearBots() {
    bots.forEach(b => b.avatar.destroy());
    bots = [];
  }

  function updateBots(delta) {
    // Jika ada pemain manusia lain bergabung, nonaktifkan bot agar murni mabar kelas!
    if (Object.keys(remotePlayers).length > 0 && bots.length > 0) {
      clearBots();
      return;
    }
    if (!stepsData || stepsData.length === 0) return;

    bots.forEach(b => {
      if (b.isFalling) {
        b.fallVel += 24 * delta;
        b.avatar.group.position.y -= b.fallVel * delta;
        b.avatar.group.rotation.x += delta * 4;
        if (b.avatar.group.position.y < -14) {
          b.isFalling = false;
          b.fallVel = 0;
          b.avatar.group.rotation.x = 0;
          b.avatar.group.position.set(b.cpPos.x, 0, b.cpPos.z);
          b.targetX = b.cpPos.x;
          b.targetZ = b.cpPos.z;
          b.row = b.hasCheckpoint ? 4 : 0;
          b.thinkTimer = 1.4;
        }
        return;
      }

      if (b.finished) {
        b.avatar.isMoving = false;
        b.avatar.update(delta);
        return;
      }

      // Gerakkan bot menuju targetX/targetZ
      const pos = b.avatar.group.position;
      const dx = b.targetX - pos.x;
      const dz = b.targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.25) {
        b.avatar.isMoving = true;
        pos.x += (dx / dist) * 8.5 * delta;
        pos.z += (dz / dist) * 8.5 * delta;
        b.avatar.group.rotation.y = Math.atan2(dx, dz);
      } else {
        b.avatar.isMoving = false;
        b.thinkTimer -= delta;
        if (b.thinkTimer <= 0) {
          if (b.row >= ROW_COUNT) {
            // Lompat ke Platform Finis!
            b.targetX = (Math.random() - 0.5) * 8;
            b.targetZ = -60;
            b.avatar.jump();
            b.finished = true;
            b.finishTime = parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(2));
          } else {
            const step = stepsData[b.row];
            const rowP = panelMeshes[b.row];
            // Cek apakah panel aman sudah terbuka
            let chosenCol = -1;
            for (let c = 0; c < 3; c++) {
              if (rowP[c].state === 'safe') chosenCol = c;
            }
            if (chosenCol === -1) {
              // Pilih dari panel yang belum pecah (55% benar, 45% tebak salah agar seru!)
              const intact = [0, 1, 2].filter(c => rowP[c].state !== 'broken');
              if (Math.random() < 0.55) {
                chosenCol = step.correctIndex;
              } else {
                chosenCol = intact[Math.floor(Math.random() * intact.length)] ?? step.correctIndex;
              }
            }

            b.targetX = COL_XS[chosenCol];
            b.targetZ = getRowZ(b.row);
            b.avatar.jump();

            // Evaluasi hasil pendaratan bot sedikit setelah lompat
            const targetRow = b.row;
            const targetCol = chosenCol;
            setTimeout(() => {
              if (!stepsData[targetRow]) return;
              if (targetCol === stepsData[targetRow].correctIndex) {
                markPanelSafe(targetRow, targetCol);
                b.row = targetRow + 1;
                if (targetRow === 3) {
                  b.hasCheckpoint = true;
                  b.cpPos = { x: COL_XS[targetCol], z: getRowZ(3) };
                }
              } else {
                shatterGlassPanel(targetRow, targetCol);
                b.isFalling = true;
                b.fallVel = 2;
              }
            }, 520);

            b.thinkTimer = 2.0 + Math.random() * 1.6;
          }
        }
      }
      b.avatar.update(delta);
    });
  }

  // ==================== 6. FISIKA BERPIJAK & RESPAWN LOKAL ====================
  function triggerLocalFall() {
    if (isFalling) return;
    isFalling = true;
    fallVelocity = 2.0;
    if (controls) controls.enabled = false;
    window.soundFX.wrong();
    showBridgeToast('Kaca Pecah! Kembali ke ' + (hasCheckpoint ? 'Checkpoint Baris 4' : 'Garis Start'), 'btoast-fail');

    setTimeout(() => {
      isFalling = false;
      fallVelocity = 0;
      localAvatar.group.rotation.x = 0;
      localAvatar.group.position.set(checkpointPos.x, 0, checkpointPos.z);
      localAvatar.isJumping = false;
      localAvatar.jumpVelocity = 0;
      if (controls) controls.enabled = true;
    }, 1250);
  }

  function checkLocalBridgePhysics() {
    if (!localAvatar || isFalling || stepsData.length === 0) return;
    const pos = localAvatar.group.position;

    // Sedang melompat di udara -> tunggu sampai mendarat (y <= 0.12)
    if (localAvatar.isJumping && pos.y > 0.12) return;

    // 1. Cek Platform Start
    if (Math.abs(pos.x) <= 9.2 && pos.z <= 5.4 && pos.z >= -3.8) {
      if (activePromptRow !== 0) {
        activePromptRow = 0;
        updateGiantBoard(0);
      }
      return;
    }

    // 2. Cek Platform Finis!
    if (Math.abs(pos.x) <= 9.3 && pos.z <= FINISH_START_Z && pos.z >= FINISH_END_Z) {
      if (!hasFinished) {
        hasFinished = true;
        highestRow = ROW_COUNT;
        document.getElementById('hud-step-now').textContent = ROW_COUNT;
        window.soundFX.victory();
        socket.emit('bridge_finish');
        showFinishModal();
      }
      return;
    }

    // 3. Cek 8 Baris x 3 Panel Kaca
    for (let r = 0; r < ROW_COUNT; r++) {
      const rz = getRowZ(r);
      if (Math.abs(pos.z - rz) <= PANEL_SIZE / 2 + 0.35) {
        for (let c = 0; c < 3; c++) {
          if (Math.abs(pos.x - COL_XS[c]) <= PANEL_SIZE / 2 + 0.35) {
            const pObj = panelMeshes[r][c];
            if (pObj.state === 'broken') {
              triggerLocalFall();
              return;
            }

            // Cek benar atau salah!
            const step = stepsData[r];
            if (c === step.correctIndex) {
              if (pObj.state !== 'safe') {
                markPanelSafe(r, c);
                window.soundFX.correct();
                showBridgeToast(`Baris ${r + 1} Benar! Kaca Kokoh!`, 'btoast-ok');
                socket.emit('bridge_panel_step', { row: r, col: c });
              }

              if (r + 1 > highestRow) {
                highestRow = r + 1;
                document.getElementById('hud-step-now').textContent = highestRow;
              }

              // Checkpoint Baris 4 (r === 3)
              if (r === 3 && !hasCheckpoint) {
                hasCheckpoint = true;
                checkpointPos = { x: COL_XS[c], z: rz };
                const cpBadge = document.getElementById('hud-checkpoint-badge');
                cpBadge.textContent = 'CP: Baris 4 ✓';
                cpBadge.style.color = '#fbbf24';
                showBridgeToast('CHECKPOINT BARIS 4 AKTIF!', 'btoast-cp');
              }

              // Tampilkan soal baris berikutnya di papan soal 3D & HUD!
              const nextRow = Math.min(ROW_COUNT - 1, r + 1);
              if (activePromptRow !== nextRow) {
                activePromptRow = nextRow;
                updateGiantBoard(nextRow);
              }
              return;
            } else {
              // Panel SALAH -> Pecahkan kaca & Jatuhkan pemain!
              shatterGlassPanel(r, c);
              socket.emit('bridge_panel_step', { row: r, col: c });
              triggerLocalFall();
              return;
            }
          }
        }
      }
    }

    // 4. Jika menapak di ruang hampa (celah antar kaca atau tepi luar) -> Jatuh!
    triggerLocalFall();
  }

  // ==================== 7. MULTIPLAYER SOCKET.IO & UI ====================
  buildStaticTowerEnvironment();

  localAvatar = new Avatar3D(scene, {
    name: isTeacher ? `${playerName}` : playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, 1.5);
  localAvatar.group.rotation.y = Math.PI;

  controls = new Controls(camera, localAvatar, container, {
    moveSpeed: 10.5,
    maxRadius: 90
  });

  // Emote & Sound Buttons
  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  const bEmoteToggle = document.getElementById('btn-bridge-emote-toggle');
  const bEmoteMenu = document.getElementById('bridge-emote-menu');
  if (bEmoteToggle && bEmoteMenu) {
    bEmoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = bEmoteMenu.classList.toggle('open');
      bEmoteToggle.classList.toggle('open', open);
    });
  }

  document.querySelectorAll('.bridge-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('bridge_emote', em);
      if (bEmoteMenu) bEmoteMenu.classList.remove('open');
      if (bEmoteToggle) bEmoteToggle.classList.remove('open');
    });
  });

  // Mode SD / SMP & Ronde Baru
  const setLevelBtnUI = (lvl) => {
    document.getElementById('btn-mode-sd').classList.toggle('active', lvl === 'sd');
    document.getElementById('btn-mode-smp').classList.toggle('active', lvl === 'smp');
  };

  document.getElementById('btn-mode-sd').addEventListener('click', () => {
    if (socket) socket.emit('bridge_new_round', { level: 'sd' });
  });
  document.getElementById('btn-mode-smp').addEventListener('click', () => {
    if (socket) socket.emit('bridge_new_round', { level: 'smp' });
  });
  document.getElementById('btn-new-round').addEventListener('click', () => {
    if (socket) socket.emit('bridge_new_round', { level: currentLevel });
  });
  document.getElementById('btn-bridge-play-again').addEventListener('click', () => {
    document.getElementById('bridge-finish-modal').style.display = 'none';
    if (socket) socket.emit('bridge_new_round', { level: currentLevel });
  });

  // Connect Socket.IO
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_bridge', {
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
      setLevelBtnUI(currentLevel);
      stepsData = res.steps || [];
      buildGlassBridgePanels(stepsData);
      roundStartLocal = performance.now();

      (res.players || []).forEach(p => {
        if (p.id !== socket.id) spawnRemotePlayer(p);
      });

      // Aktifkan 4 Bot Siswa otomatis jika sedang solo testing (1 orang)
      if (Object.keys(remotePlayers).length === 0) {
        initFallbackBots();
      }
      renderBridgeLeaderboard();
    });
  });

  function spawnRemotePlayer(p) {
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
      row: p.row || 0,
      finished: p.finished || false,
      finishTime: p.finishTime || null
    };
  }

  socket.on('bridge_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemotePlayer(p);
    renderBridgeLeaderboard();
  });

  socket.on('bridge_player_left', (id) => {
    if (remotePlayers[id]) {
      remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
    renderBridgeLeaderboard();
  });

  socket.on('bridge_player_moved', (m) => {
    const rp = remotePlayers[m.id];
    if (!rp) return;
    rp.targetPos = { x: m.x, y: m.y, z: m.z };
    rp.targetRotY = m.rotY;
    rp.isMoving = m.isMoving;
    rp.isJumping = m.isJumping;
    rp.row = m.row || rp.row;
  });

  socket.on('bridge_panel_updated', (u) => {
    if (stepsData[u.row]) stepsData[u.row].panelStates[u.col] = u.state;
    if (u.state === 'safe') markPanelSafe(u.row, u.col);
    else if (u.state === 'broken') shatterGlassPanel(u.row, u.col);
  });

  socket.on('bridge_player_emote', (d) => {
    if (remotePlayers[d.id]) remotePlayers[d.id].avatar.showEmote(d.emote);
  });

  socket.on('bridge_round_reset', (data) => {
    currentLevel = data.level || 'sd';
    setLevelBtnUI(currentLevel);
    stepsData = data.steps || [];
    buildGlassBridgePanels(stepsData);

    // Reset state pemain lokal
    isFalling = false;
    hasCheckpoint = false;
    hasFinished = false;
    highestRow = 0;
    checkpointPos = { x: 0, z: 1.5 };
    roundStartLocal = performance.now();
    document.getElementById('hud-step-now').textContent = '0';
    const cpBadge = document.getElementById('hud-checkpoint-badge');
    cpBadge.textContent = 'CP: Start';
    cpBadge.style.color = '#94a3b8';
    document.getElementById('bridge-finish-modal').style.display = 'none';

    localAvatar.group.position.set(0, 0, 1.5);
    localAvatar.group.rotation.set(0, Math.PI, 0);
    if (controls) controls.enabled = true;

    if (Object.keys(remotePlayers).length === 0) initFallbackBots();
    showBridgeToast(`Ronde Baru (Mode ${currentLevel.toUpperCase()}) Dimulai!`, 'btoast-cp');
  });

  socket.on('bridge_standings_updated', (data) => {
    if (hasFinished) showFinishModal(data.standings);
  });

  function getCombinedStandings() {
    const myTime = hasFinished ? parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(1)) : null;
    const all = [
      { id: socket ? socket.id : 'me', name: playerName, row: highestRow, finished: hasFinished, finishTime: myTime, isMe: true },
      ...Object.entries(remotePlayers).map(([id, rp]) => ({
        id, name: rp.name, row: rp.row, finished: rp.finished, finishTime: rp.finishTime, isMe: false
      })),
      ...bots.map(b => ({
        id: b.id, name: b.name, row: b.row, finished: b.finished, finishTime: b.finishTime, isMe: false
      }))
    ];
    return all.sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 999) - (b.finishTime || 999);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.row - a.row;
    });
  }

  function renderBridgeLeaderboard() {
    const list = getCombinedStandings();
    document.getElementById('bridge-player-count').textContent = `(${list.length})`;
    const el = document.getElementById('bridge-rank-list');
    el.innerHTML = '';
    list.slice(0, 6).forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      div.innerHTML = `
        <span class="rank-pos">#${idx + 1}</span>
        <span class="rank-name">${p.name} ${p.isMe ? '(Anda)' : ''}</span>
        <span class="rank-score">${p.finished ? 'Finis' : `B.${p.row}/8`}</span>
      `;
      el.appendChild(div);
    });
  }

  function showFinishModal(serverStandings) {
    const list = serverStandings && serverStandings.length > 0 ? serverStandings : getCombinedStandings();
    const wrap = document.getElementById('bridge-finish-standings');
    wrap.innerHTML = '';
    const medals = ['#1', '#2', '#3'];
    list.slice(0, 6).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.45rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.92rem;';
      row.innerHTML = `
        <span><strong>${medals[i] || '#' + (i + 1)}</strong> ${s.name}</span>
        <span style="color:#34d399; font-weight:800;">${s.finished ? (s.finishTime ? s.finishTime + ' dtk' : 'Finis') : `Baris ${s.row}/8`}</span>
      `;
      wrap.appendChild(row);
    });
    document.getElementById('bridge-finish-modal').style.display = 'flex';
  }

  // ==================== 8. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();
  let uiTick = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. Update Kontrol & Fisika Pemain Lokal
    if (isFalling) {
      fallVelocity += 26 * delta;
      localAvatar.group.position.y -= fallVelocity * delta;
      localAvatar.group.rotation.x += delta * 4.5;
    } else {
      controls.update(delta);
      localAvatar.update(delta);
      checkLocalBridgePhysics();
    }

    // 2. Kirim posisi ke server (18Hz)
    if (socket && now - lastEmitTime > 55) {
      const pos = localAvatar.group.position;
      socket.emit('bridge_move', {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping,
        row: highestRow
      });
      lastEmitTime = now;
    }

    // 3. Interpolasi Pemain Remote & Update Bot
    for (const id in remotePlayers) {
      const rp = remotePlayers[id];
      rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, 1 - Math.exp(-14 * delta));
      rp.avatar.isMoving = rp.isMoving;
      rp.avatar.isJumping = rp.isJumping;
      rp.avatar.update(delta);
    }
    updateBots(delta);

    // 4. Animasi Pecahan Kaca, Kilauan, Piala, & Awan
    for (let i = glassShards.length - 1; i >= 0; i--) {
      const s = glassShards[i];
      s.life -= delta;
      s.vy -= 18 * delta;
      s.mesh.position.x += s.vx * delta;
      s.mesh.position.y += s.vy * delta;
      s.mesh.position.z += s.vz * delta;
      s.mesh.rotation.x += s.rx * delta;
      s.mesh.rotation.y += s.ry * delta;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        glassShards.splice(i, 1);
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.life -= delta;
      sp.mesh.position.y += sp.vy * delta;
      sp.mesh.rotation.y += delta * 5;
      if (sp.life <= 0) {
        scene.remove(sp.mesh);
        sparkles.splice(i, 1);
      }
    }

    if (trophyMesh) trophyMesh.rotation.y += delta * 1.3;
    for (const c of clouds) {
      c.mesh.position.x += delta * c.speed;
      if (c.mesh.position.x > 85) c.mesh.position.x = -85;
    }

    uiTick += delta;
    if (uiTick > 0.4) {
      renderBridgeLeaderboard();
      uiTick = 0;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
});
