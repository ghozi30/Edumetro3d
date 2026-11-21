// Mini Game #07: Panjat Menara Bangun Ruang (Museum Geometri 3D — SD & SMP)
// 6 Tingkat Lantai Vertikal + 7 Bangun Ruang 3D Asli Three.js + Jump-Pad Energi + Multiplayer & Bot Fallback.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-07').toLowerCase().trim();
  const isTeacher = sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo';

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru' : 'Siswa');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  const FLOOR_HEIGHT = 10.0; // Ketinggian antar lantai (Lantai 1=0, 2=10, 3=20, 4=30, 5=40, Puncak 6=50)
  const SHAPE_XS = [-7.5, -2.5, 2.5, 7.5];
  const SHAPE_Z = -2.0;

  // ==================== 1. SCENE 3D ATRIUM MUSEUM MODERN ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  scene.fog = new THREE.FogExp2(0x0f172a, 0.006);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 420);
  camera.position.set(0, 8, 18);

  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf8fafc, 0x38bdf8, 0.85));
  const sun = new THREE.DirectionalLight(0xfffbeb, 0.92);
  sun.position.set(30, 80, 35);
  sun.castShadow = true;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // ==================== 2. STATE PERMAINAN ====================
  let currentLevel = 'sd';
  let shapesCatalog = {};
  let floorsData = [];       // 5 lantai soal (index 0..4)
  let floorMeshes = [];      // { floorIdx, baseY, shapeObjects: [{ id, x, z, group, mesh, origColor, shakeTimer, jumpPad }] }
  let particles = [];
  let peakTrophy = null;

  let currentFloor = 1;      // 1..6 (6 = Puncak Trofi!)
  let hasFinished = false;
  let isLaunching = false;
  let launchProgress = 0;
  let launchFrom = { x: 0, y: 0, z: 0 };
  let launchTo = { x: 0, y: 0, z: 0 };
  let roundStartLocal = performance.now();

  let localAvatar = null;
  let controls = null;
  const remotePlayers = {};
  let bots = [];
  let socket = null;
  let lastEmitTime = 0;

  const towerGroup = new THREE.Group();
  scene.add(towerGroup);

  // ==================== 3. BUILDER 7 BANGUN RUANG 3D ASLI THREE.JS ====================
  function createGeometryShapeMesh(shapeId) {
    const meta = shapesCatalog[shapeId] || { name: shapeId, color: 0x38bdf8, edge: 0xffffff };
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: meta.color });
    const edgeMat = new THREE.LineBasicMaterial({ color: meta.edge });

    let mainGeo;
    let mainY = 1.6;
    let needsTopPad = false;

    if (shapeId === 'kubus') {
      mainGeo = new THREE.BoxGeometry(3.0, 3.0, 3.0);
      mainY = 1.5;
    } else if (shapeId === 'balok') {
      mainGeo = new THREE.BoxGeometry(4.0, 2.3, 2.6);
      mainY = 1.15;
    } else if (shapeId === 'tabung') {
      mainGeo = new THREE.CylinderGeometry(1.55, 1.55, 3.0, 24);
      mainY = 1.5;
    } else if (shapeId === 'kerucut') {
      mainGeo = new THREE.ConeGeometry(1.75, 3.2, 24);
      mainY = 1.6;
      needsTopPad = true;
    } else if (shapeId === 'bola') {
      mainGeo = new THREE.SphereGeometry(1.65, 20, 16);
      mainY = 1.65;
      needsTopPad = true;
    } else if (shapeId === 'limas') {
      mainGeo = new THREE.ConeGeometry(2.05, 3.1, 4);
      mainY = 1.55;
      needsTopPad = true;
    } else {
      // prisma segitiga
      mainGeo = new THREE.CylinderGeometry(1.85, 1.85, 3.0, 3);
      mainY = 1.5;
    }

    const mesh = new THREE.Mesh(mainGeo, mat);
    mesh.position.y = mainY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (shapeId === 'limas') mesh.rotation.y = Math.PI / 4;
    group.add(mesh);

    // Garis Rusuk Geometri Kontras Tinggi agar jumlah sisi & rusuk mudah diamati siswa!
    if (shapeId !== 'bola') {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mainGeo), edgeMat);
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      group.add(edges);
    }

    // Pijakan Rata Transparan Bercahaya di atas Bola / Kerucut / Limas
    if (needsTopPad) {
      const topPad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.55, 0.16, 20),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.48 })
      );
      topPad.position.y = 3.25;
      group.add(topPad);
    }

    // Jump-Pad Bercahaya (muncul aktif saat bangun ruang ini adalah jawaban BENAR yang diinjak!)
    const jumpPad = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    jumpPad.rotation.x = -Math.PI / 2;
    jumpPad.position.y = 3.38;
    jumpPad.visible = false;
    group.add(jumpPad);

    // Label Nama Bangun Ruang di atasnya
    const c = document.createElement('canvas');
    c.width = 420;
    c.height = 110;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 404, 94, 20);
    ctx.fill();
    ctx.strokeStyle = '#' + meta.color.toString(16).padStart(6, '0');
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.name, 210, 56);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
    );
    sprite.position.set(0, 4.45, 0);
    sprite.scale.set(4.5, 1.2, 1);
    group.add(sprite);

    return { group, mesh, jumpPad, origColor: meta.color };
  }

  // ==================== 4. BANGUN MENARA ATRIUM MUSEUM 6 LANTAI ====================
  function buildMuseumTower(floors) {
    while (towerGroup.children.length > 0) {
      towerGroup.remove(towerGroup.children[0]);
    }
    floorMeshes = [];

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassWallMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });

    // 4 Pilar Vertikal Atrium Museum menjulang setinggi 60 meter!
    [[-12.5, -10.5], [12.5, -10.5], [-12.5, 11.5], [12.5, 11.5]].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 62, 1.4), pillarMat);
      pil.position.set(px, 29, pz);
      towerGroup.add(pil);
    });

    // Dinding kaca samping museum transparan agar terasa di dalam atrium modern
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(22, 60), glassWallMat);
    sideGlass.rotation.y = Math.PI / 2;
    sideGlass.position.set(-12.5, 29, 0.5);
    towerGroup.add(sideGlass);
    const sideGlassR = sideGlass.clone();
    sideGlassR.position.set(12.5, 29, 0.5);
    towerGroup.add(sideGlassR);

    // Bangun Lantai 1 s/d Lantai 5 (masing-masing punya Dek Awal + 4 Bangun Ruang + Gerbang Energi + Papan Soal 3D)
    floors.forEach((fl, fIdx) => {
      const baseY = fIdx * FLOOR_HEIGHT;
      const fGroup = new THREE.Group();

      // Dek Awal Lantai (z = +3.5 .. +11)
      const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 0.9, 7.6), deckMat);
      deck.position.set(0, baseY - 0.45, 7.2);
      deck.receiveShadow = true;
      fGroup.add(deck);

      const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.25, 7.9), trimMat);
      deckTrim.position.set(0, baseY - 0.08, 7.2);
      fGroup.add(deckTrim);

      // Lantai Kaca Bawah tipis di area bangun ruang (z = -6 .. +3.5) agar pemain bisa melihat lantai bawah!
      const shapeDeck = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.25, 9.5),
        new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.45 })
      );
      shapeDeck.position.set(0, baseY - 0.14, -1.2);
      fGroup.add(shapeDeck);

      // Gerbang Energi Terkunci + Papan Soal 3D di Belakang (z = -9.5)
      const gateArch = new THREE.Mesh(
        new THREE.BoxGeometry(10, 5.2, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.18 })
      );
      gateArch.position.set(0, baseY + 2.6, -9.5);
      fGroup.add(gateArch);

      const boardCanvas = createFloorBoardCanvas(fIdx + 1, fl.q);
      const qBoard = new THREE.Mesh(
        new THREE.BoxGeometry(21.5, 5.2, 0.5),
        [pillarMat, pillarMat, pillarMat, pillarMat, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(boardCanvas) }), pillarMat]
      );
      qBoard.position.set(0, baseY + 6.9, -9.2);
      fGroup.add(qBoard);

      // 4 Bangun Ruang 3D Pilihan di Lantai Ini
      const shapeObjects = [];
      fl.shapes.forEach((sId, sIdx) => {
        const built = createGeometryShapeMesh(sId);
        built.group.position.set(SHAPE_XS[sIdx], baseY, SHAPE_Z);
        fGroup.add(built.group);

        shapeObjects.push({
          id: sId,
          x: SHAPE_XS[sIdx],
          z: SHAPE_Z,
          baseY,
          group: built.group,
          mesh: built.mesh,
          jumpPad: built.jumpPad,
          origColor: built.origColor,
          shakeTimer: 0
        });
      });

      towerGroup.add(fGroup);
      floorMeshes.push({ floorIdx: fIdx, baseY, shapeObjects });
    });

    // LANTAI 6: PUNCAK TROFI EMAS (y = 5 * FLOOR_HEIGHT = 50)
    const peakY = 5 * FLOOR_HEIGHT;
    const peakDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12.2, 1.2, 36), deckMat);
    peakDeck.position.set(0, peakY - 0.6, 0);
    peakDeck.receiveShadow = true;
    towerGroup.add(peakDeck);

    const peakRing = new THREE.Mesh(new THREE.RingGeometry(10.5, 11.6, 36), new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide }));
    peakRing.rotation.x = -Math.PI / 2;
    peakRing.position.set(0, peakY + 0.03, 0);
    towerGroup.add(peakRing);

    // Trofi Geometri Raksasa Berputar di Tengah Puncak
    const tr = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 0.85, 3.0, 16), goldMat);
    cup.position.y = 2.8;
    tr.add(cup);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.1, 1.6, 12), goldMat);
    stem.position.y = 0.8;
    tr.add(stem);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    gem.position.y = 5.4;
    tr.add(gem);
    tr.position.set(0, peakY + 0.2, -3);
    towerGroup.add(tr);
    peakTrophy = tr;

    updateFloorHUD(1);
  }

  function createFloorBoardCanvas(floorNum, qText) {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 320;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1280, 320);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 1268, 308);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LANTAI ${floorNum} / 5 • MODE ${currentLevel.toUpperCase()} • LOMPAT KE BANGUN RUANG BENAR!`, 640, 54);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    const words = String(qText || '').split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > 1160 && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    const startY = lines.length === 1 ? 185 : (lines.length === 2 ? 155 : 130);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 640, startY + i * 62));
    return c;
  }

  function updateFloorHUD(floorNum) {
    const floorEl = document.getElementById('hud-geo-floor');
    if (floorEl) floorEl.textContent = floorNum;
  }

  let toastTimer = null;
  function showGeoToast(text, isOk) {
    const el = document.getElementById('geo-toast');
    el.textContent = text;
    el.className = isOk ? 'gtoast-ok' : 'gtoast-fail';
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

  function spawnSparkles(x, y, z, hex) {
    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        new THREE.MeshBasicMaterial({ color: hex })
      );
      p.position.set(x + (Math.random() - 0.5) * 2.5, y + 1, z + (Math.random() - 0.5) * 2.5);
      scene.add(p);
      particles.push({ mesh: p, vy: 3 + Math.random() * 4, life: 0.9 });
    }
  }

  // ==================== 5. DETEKSI LOMPATAN KE BANGUN RUANG & JUMP-PAD NAIK LANTAI ====================
  function checkGeometryStep() {
    if (!localAvatar || isLaunching || hasFinished || currentFloor >= 6) return;
    const fObj = floorMeshes[currentFloor - 1];
    const fData = floorsData[currentFloor - 1];
    if (!fObj || !fData) return;

    const pos = localAvatar.group.position;
    // Batasi posisi tetap di dalam dek lantai agar tidak jatuh keluar atrium
    pos.x = Math.max(-10.5, Math.min(10.5, pos.x));
    pos.z = Math.max(-8.0, Math.min(10.2, pos.z));

    for (const sh of fObj.shapeObjects) {
      const dx = Math.abs(pos.x - sh.x);
      const dz = Math.abs(pos.z - sh.z);
      if (dx <= 2.2 && dz <= 2.2) {
        if (sh.id === fData.answer) {
          // BENAR! Aktifkan Jump-Pad & Lontarkan ke Lantai Berikutnya!
          sh.jumpPad.visible = true;
          sh.mesh.material.color.setHex(0x10b981);
          spawnSparkles(sh.x, fObj.baseY + 2, sh.z, 0x34d399);
          window.soundFX.correct();

          const nextFloor = currentFloor + 1;
          showGeoToast(nextFloor === 6 ? 'BENAR! Meluncur ke Puncak Trofi!' : `BENAR! Jump-Pad ke Lantai ${nextFloor}!`, true);

          isLaunching = true;
          launchProgress = 0;
          launchFrom = { x: pos.x, y: pos.y, z: pos.z };
          launchTo = { x: 0, y: (nextFloor - 1) * FLOOR_HEIGHT, z: nextFloor === 6 ? 4.5 : 7.5 };
          if (controls) controls.enabled = false;
          return;
        } else {
          // SALAH! Bangun bergetar merah & pantulkan mundur ke dek awal lantai ini saja!
          sh.shakeTimer = 0.6;
          sh.mesh.material.color.setHex(0xef4444);
          window.soundFX.wrong();
          showGeoToast('Kurang tepat! Coba amati sisi & rusuk bangun ruang lain!', false);
          localAvatar.group.position.set(0, fObj.baseY, 7.5);
          localAvatar.isJumping = false;
          localAvatar.jumpVelocity = 0;
          return;
        }
      }
    }
  }

  // ==================== 6. FALLBACK 4 BOT SISWA PEMANJAT ====================
  function initGeoBots() {
    clearGeoBots();
    const profiles = [
      { name: 'Raka (Bot)', color: '#fb7185', hat: 'topi_sekolah' },
      { name: 'Sinta (Bot)', color: '#a78bfa', hat: 'telinga_kucing' },
      { name: 'Bima (Bot)', color: '#fbbf24', hat: 'topi_wisuda' },
      { name: 'Nadia (Bot)', color: '#10b981', hat: 'none' }
    ];
    profiles.forEach((bp, i) => {
      const av = new Avatar3D(scene, { name: bp.name, color: bp.color, hat: bp.hat, isLocal: false });
      av.group.position.set(-4.5 + i * 3, 0, 8.2);
      bots.push({
        id: `gbot_${i}`,
        name: bp.name,
        avatar: av,
        floor: 1,
        finished: false,
        finishTime: null,
        climbTimer: 3.5 + i * 1.4
      });
    });
  }

  function clearGeoBots() {
    bots.forEach(b => b.avatar.destroy());
    bots = [];
  }

  function updateGeoBots(delta) {
    if (Object.keys(remotePlayers).length > 0 && bots.length > 0) {
      clearGeoBots();
      return;
    }
    bots.forEach((b, idx) => {
      if (b.finished) {
        b.avatar.isMoving = false;
        b.avatar.update(delta);
        return;
      }
      b.climbTimer -= delta;
      if (b.climbTimer <= 0) {
        if (Math.random() < 0.72) {
          b.floor++;
          const targetY = (b.floor - 1) * FLOOR_HEIGHT;
          b.avatar.groundY = targetY;
          b.avatar.group.position.set(-4.5 + idx * 3, targetY, b.floor === 6 ? 3 : 7.5);
          b.avatar.jump();
          if (b.floor >= 6) {
            b.finished = true;
            b.finishTime = parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(2));
          }
        }
        b.climbTimer = 3.2 + Math.random() * 2.8;
      }
      b.avatar.update(delta);
    });
  }

  // ==================== 7. AVATAR, KONTROL, EMOTE DROPDOWN & SOCKET.IO ====================
  localAvatar = new Avatar3D(scene, {
    name: isTeacher ? `${playerName}` : playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, 7.5);
  localAvatar.group.rotation.y = Math.PI;

  controls = new Controls(camera, localAvatar, container, {
    moveSpeed: 10.5,
    maxRadius: 15
  });

  // Emote Dropdown Bulat Kecil
  const emoteToggle = document.getElementById('btn-geo-emote-toggle');
  const emoteMenu = document.getElementById('geo-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = emoteMenu.classList.toggle('open');
      emoteToggle.classList.toggle('open', open);
    });
  }
  document.querySelectorAll('.geo-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('geo_emote', em);
      if (emoteMenu) emoteMenu.classList.remove('open');
      if (emoteToggle) emoteToggle.classList.remove('open');
    });
  });

  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  const setLevelBtnUI = (lvl) => {
    document.getElementById('btn-geo-sd').classList.toggle('active', lvl === 'sd');
    document.getElementById('btn-geo-smp').classList.toggle('active', lvl === 'smp');
  };

  document.getElementById('btn-geo-sd').addEventListener('click', () => socket && socket.emit('geo_new_round', { level: 'sd' }));
  document.getElementById('btn-geo-smp').addEventListener('click', () => socket && socket.emit('geo_new_round', { level: 'smp' }));
  document.getElementById('btn-geo-reset').addEventListener('click', () => socket && socket.emit('geo_new_round', { level: currentLevel }));
  document.getElementById('btn-geo-play-again').addEventListener('click', () => {
    document.getElementById('geo-finish-modal').style.display = 'none';
    if (socket) socket.emit('geo_new_round', { level: currentLevel });
  });

  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_geo', {
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
      shapesCatalog = res.shapes || {};
      floorsData = res.floors || [];
      buildMuseumTower(floorsData);
      roundStartLocal = performance.now();

      (res.players || []).forEach(p => {
        if (p.id !== socket.id) spawnRemoteGeoPlayer(p);
      });
      if (Object.keys(remotePlayers).length === 0) initGeoBots();
      renderGeoLeaderboard();
    });
  });

  function spawnRemoteGeoPlayer(p) {
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
      floor: p.floor || 1,
      finished: p.finished || false,
      finishTime: p.finishTime || null
    };
  }

  socket.on('geo_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemoteGeoPlayer(p);
    renderGeoLeaderboard();
  });

  socket.on('geo_player_left', (id) => {
    if (remotePlayers[id]) {
      remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
    renderGeoLeaderboard();
  });

  socket.on('geo_player_moved', (m) => {
    const rp = remotePlayers[m.id];
    if (!rp) return;
    rp.targetPos = { x: m.x, y: m.y, z: m.z };
    rp.targetRotY = m.rotY;
    rp.isMoving = m.isMoving;
    rp.isJumping = m.isJumping;
    rp.floor = m.floor || rp.floor;
  });

  socket.on('geo_player_emote', (d) => {
    if (remotePlayers[d.id]) remotePlayers[d.id].avatar.showEmote(d.emote);
  });

  socket.on('geo_round_reset', (data) => {
    currentLevel = data.level || 'sd';
    setLevelBtnUI(currentLevel);
    floorsData = data.floors || [];
    buildMuseumTower(floorsData);

    currentFloor = 1;
    hasFinished = false;
    isLaunching = false;
    roundStartLocal = performance.now();
    localAvatar.groundY = 0;
    localAvatar.group.position.set(0, 0, 7.5);
    localAvatar.group.rotation.set(0, Math.PI, 0);
    if (controls) controls.enabled = true;
    document.getElementById('geo-finish-modal').style.display = 'none';

    if (Object.keys(remotePlayers).length === 0) initGeoBots();
    showGeoToast(`Ronde Baru (Mode ${currentLevel.toUpperCase()}) Dimulai!`, true);
  });

  socket.on('geo_standings_updated', (data) => {
    if (hasFinished) showGeoFinishModal(data.standings);
  });

  function getCombinedGeoStandings() {
    const myTime = hasFinished ? parseFloat(((performance.now() - roundStartLocal) / 1000).toFixed(1)) : null;
    const all = [
      { id: socket ? socket.id : 'me', name: playerName, floor: currentFloor, finished: hasFinished, finishTime: myTime, isMe: true },
      ...Object.entries(remotePlayers).map(([id, rp]) => ({
        id, name: rp.name, floor: rp.floor, finished: rp.finished, finishTime: rp.finishTime, isMe: false
      })),
      ...bots.map(b => ({
        id: b.id, name: b.name, floor: b.floor, finished: b.finished, finishTime: b.finishTime, isMe: false
      }))
    ];
    return all.sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 999) - (b.finishTime || 999);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.floor - a.floor;
    });
  }

  function renderGeoLeaderboard() {
    const list = getCombinedGeoStandings();
    document.getElementById('geo-player-count').textContent = `(${list.length})`;
    const el = document.getElementById('geo-rank-list');
    el.innerHTML = '';
    list.slice(0, 6).forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      div.innerHTML = `
        <span class="rank-pos">#${idx + 1}</span>
        <span class="rank-name">${p.name} ${p.isMe ? '(Anda)' : ''}</span>
        <span class="rank-score">${p.finished ? 'Puncak' : `Lt.${p.floor}/6`}</span>
      `;
      el.appendChild(div);
    });
  }

  function showGeoFinishModal(serverStandings) {
    const list = serverStandings && serverStandings.length > 0 ? serverStandings : getCombinedGeoStandings();
    const wrap = document.getElementById('geo-finish-standings');
    wrap.innerHTML = '';
    const medals = ['#1', '#2', '#3'];
    list.slice(0, 6).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.45rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.92rem;';
      row.innerHTML = `
        <span><strong>${medals[i] || '#' + (i + 1)}</strong> ${s.name}</span>
        <span style="color:#fbbf24; font-weight:800;">${s.finished ? (s.finishTime ? s.finishTime + ' dtk' : 'Puncak') : `Lantai ${s.floor}/6`}</span>
      `;
      wrap.appendChild(row);
    });
    document.getElementById('geo-finish-modal').style.display = 'flex';
  }

  // ==================== 8. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();
  let uiTick = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. Animasi Jump-Pad Pelontar Naik Lantai Vertikal
    if (isLaunching) {
      launchProgress += delta * 1.45;
      const t = Math.min(1, launchProgress);
      const arc = Math.sin(t * Math.PI) * 3.2; // Lengkungan lompatan tinggi!
      localAvatar.group.position.x = THREE.MathUtils.lerp(launchFrom.x, launchTo.x, t);
      localAvatar.group.position.y = THREE.MathUtils.lerp(launchFrom.y, launchTo.y, t) + arc;
      localAvatar.group.position.z = THREE.MathUtils.lerp(launchFrom.z, launchTo.z, t);
      localAvatar.group.rotation.y += delta * 8;

      // Kamera ikut meluncur naik mulus mengikuti karakter
      const ap = localAvatar.group.position;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, ap.x, 0.12);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, ap.y + 6, 0.14);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, ap.z + 14, 0.12);
      camera.lookAt(ap.x, ap.y + 2, ap.z);

      if (t >= 1) {
        isLaunching = false;
        currentFloor++;
        localAvatar.groundY = (currentFloor - 1) * FLOOR_HEIGHT;
        localAvatar.group.position.set(launchTo.x, localAvatar.groundY, launchTo.z);
        localAvatar.group.rotation.y = Math.PI;
        localAvatar.isJumping = false;
        localAvatar.jumpVelocity = 0;
        if (controls) controls.enabled = true;
        updateFloorHUD(currentFloor);

        if (currentFloor >= 6 && !hasFinished) {
          hasFinished = true;
          window.soundFX.victory();
          spawnSparkles(0, localAvatar.groundY + 2, -2, 0xfbbf24);
          socket.emit('geo_finish');
          showGeoFinishModal();
        }
      }
    } else {
      controls.update(delta);
      localAvatar.update(delta);
      checkGeometryStep();
    }

    // 2. Animasi getar bangun ruang salah
    for (const fl of floorMeshes) {
      for (const sh of fl.shapeObjects) {
        if (sh.shakeTimer > 0) {
          sh.shakeTimer -= delta;
          sh.group.position.x = sh.x + Math.sin(now * 0.06) * 0.25;
          if (sh.shakeTimer <= 0) {
            sh.group.position.x = sh.x;
            sh.mesh.material.color.setHex(sh.origColor);
          }
        }
      }
    }

    // 3. Sinkronisasi posisi ke server (18Hz)
    if (socket && now - lastEmitTime > 55) {
      const pos = localAvatar.group.position;
      socket.emit('geo_move', {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping,
        floor: currentFloor
      });
      lastEmitTime = now;
    }

    // 4. Interpolasi Remote Players & Update Bot
    for (const id in remotePlayers) {
      const rp = remotePlayers[id];
      rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, 1 - Math.exp(-14 * delta));
      rp.avatar.isMoving = rp.isMoving;
      rp.avatar.isJumping = rp.isJumping;
      rp.avatar.update(delta);
    }
    updateGeoBots(delta);

    // 5. Partikel & Piala Puncak Berputar
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.rotation.y += delta * 5;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
    if (peakTrophy) peakTrophy.rotation.y += delta * 1.2;

    uiTick += delta;
    if (uiTick > 0.4) {
      renderGeoLeaderboard();
      uiTick = 0;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
});
