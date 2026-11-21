// Mini Game #09: Pabrik Daur Ulang Kilat (Stasiun Ekologi — IPA Biologi & Lingkungan SD & SMP)
// Ruangan Pabrik 3D Terang & Modern + Konveyor Tengah + 3 Mesin Pilah (ORGANIK, ANORGANIK, B3) + Tim Merah vs Biru / Co-op.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-09').toLowerCase().trim();
  const isTeacher = sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo';

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru' : 'Siswa');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  // Aktifkan tombol bulat kontekstual "AMBIL" khusus di Mini Game #09 ini!
  if (window.MobileControls && window.MobileControls.enableActionButton) {
    window.MobileControls.enableActionButton('AMBIL', '');
  }

  // ==================== 1. SCENE 3D PABRIK DAUR ULANG MODERN ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe0f2fe);
  scene.fog = new THREE.FogExp2(0xe0f2fe, 0.008);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 350);
  camera.position.set(0, 12, 22);

  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85));
  const sun = new THREE.DirectionalLight(0xfffbeb, 0.85);
  sun.position.set(25, 45, 25);
  sun.castShadow = true;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // ==================== 2. ARENA PABRIK & 3 MESIN PILAH RAKSASA ====================
  const MACHINES = [
    { category: 'organik',   label: 'ORGANIK',   sub: 'Alami / Membusuk', color: 0x10b981, glow: 0x34d399, x: -15, z: -13 },
    { category: 'anorganik', label: 'ANORGANIK', sub: 'Daur Ulang Pabrik', color: 0x0ea5e9, glow: 0x38bdf8, x: 0,   z: -16 },
    { category: 'b3',        label: 'B3 BERACUN', sub: 'Kimia / Berbahaya', color: 0xef4444, glow: 0xfb7185, x: 15,  z: -13 }
  ];
  const machineMeshes = {}; // { [category]: { group, body, origX, shakeTimer, dropZone } }
  let particles = [];

  function buildRecyclingFactory() {
    // Lantai Pabrik Modern Terang & Bersih
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(44, 1, 40),
      new THREE.MeshLambertMaterial({ color: 0xf1f5f9 })
    );
    floor.position.set(0, -0.5, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(40, 20, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.02;
    scene.add(grid);

    // Dinding Pabrik Rendah Estetik di Tepi
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(44, 6, 1), wallMat);
    backWall.position.set(0, 3, -20);
    scene.add(backWall);

    [-22, 22].forEach(wx => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 40), wallMat);
      sw.position.set(wx, 2.5, 0);
      scene.add(sw);
    });

    // Zona Konveyor / Penjatuh Sampah di Tengah Pabrik
    const convBase = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.45, 9),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    convBase.position.set(0, 0.22, 0);
    convBase.receiveShadow = true;
    scene.add(convBase);

    const convRim = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.2, 9.5),
      new THREE.MeshLambertMaterial({ color: 0xfbbf24 })
    );
    convRim.position.set(0, 0.1, 0);
    scene.add(convRim);

    // Corong Penjatuh di Atas Konveyor
    const chute = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 1.8, 3.2, 16),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    chute.position.set(0, 10.5, 0);
    scene.add(chute);

    // 3 Mesin Pilah Raksasa (HIJAU: ORGANIK, BIRU: ANORGANIK, MERAH: B3)
    MACHINES.forEach(m => {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshLambertMaterial({ color: m.color });
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

      const body = new THREE.Mesh(new THREE.BoxGeometry(7.6, 6.2, 4.8), bodyMat);
      body.position.y = 3.1;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      // Mulut Mesin Hitam
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 0.5), darkMat);
      mouth.position.set(0, 2.1, 2.35);
      g.add(mouth);

      // Zona Lantai Bercahaya di Depan Mesin (otomatis memasukkan sampah saat diinjak!)
      const dropPad = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 0.14, 4.2),
        new THREE.MeshBasicMaterial({ color: m.glow, transparent: true, opacity: 0.48 })
      );
      dropPad.position.set(0, 0.08, 4.6);
      g.add(dropPad);

      // Papan Label Raksasa di Atas Mesin
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 170;
      const ctx = c.getContext('2d');
      const hex = '#' + m.color.toString(16).padStart(6, '0');
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(8, 8, 496, 154, 24);
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.fillStyle = hex;
      ctx.font = 'bold 62px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, 256, 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(m.sub, 256, 126);

      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
      sign.position.set(0, 7.9, 0);
      sign.scale.set(7.6, 2.5, 1);
      g.add(sign);

      g.position.set(m.x, 0, m.z);
      scene.add(g);

      machineMeshes[m.category] = {
        group: g,
        body,
        origX: m.x,
        shakeTimer: 0,
        dropZone: { x: m.x, z: m.z + 4.6, halfW: 3.6, halfD: 2.6 }
      };
    });
  }

  // ==================== 3. BUILDER OBJEK SAMPAH 3D BERLABEL ====================
  const trashObjects = {}; // { [itemId]: { data, group } }

  function createTrashMesh(item) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: item.color });
    let mesh;

    if (item.shape === 'bottle') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.15, 10), mat);
      mesh.position.y = 0.65;
    } else if (item.shape === 'can' || item.shape === 'battery') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 12), mat);
      mesh.position.y = 0.5;
    } else if (item.shape === 'box') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.85), mat);
      mesh.position.y = 0.45;
    } else if (item.shape === 'bulb' || item.shape === 'sphere') {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mat);
      mesh.position.y = 0.55;
    } else if (item.shape === 'banana') {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 6, 12, Math.PI), mat);
      mesh.position.y = 0.55;
    } else {
      // leaf / bowl
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), mat);
      mesh.scale.set(1.2, 0.55, 1.0);
      mesh.position.y = 0.42;
    }
    mesh.castShadow = true;
    g.add(mesh);

    // Label Teks Kecil Kontras Tinggi Melayang di Atas Sampah (mudah dibaca di layar HP!)
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 344, 80, 22);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name.slice(0, 18), 180, 48);

    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    sp.position.set(0, 1.85, 0);
    sp.scale.set(3.4, 0.9, 1);
    g.add(sp);

    g.position.set(item.x, 0.45, item.z);
    scene.add(g);
    return g;
  }

  function syncTrashItem(item) {
    if (trashObjects[item.id]) {
      trashObjects[item.id].data = item;
      return;
    }
    const g = createTrashMesh(item);
    trashObjects[item.id] = { data: item, group: g };
  }

  function removeTrashItem(itemId) {
    if (!trashObjects[itemId]) return;
    scene.remove(trashObjects[itemId].group);
    delete trashObjects[itemId];
  }

  function clearAllTrash() {
    Object.keys(trashObjects).forEach(removeTrashItem);
  }

  // ==================== 4. STATE GAME, AVATAR, & BOT REKAN/LAWAN ====================
  let selectedMode = 'teams'; // 'teams' | 'coop'
  let selectedLevel = 'sd';   // 'sd' | 'smp'
  let gameState = 'LOBBY';
  let myTeam = 'red';
  let carryingItemId = null;
  let nearbyItemId = null;
  let depositLock = false;

  let localAvatar = null;
  let controls = null;
  const remotePlayers = {};
  let bots = [];
  let socket = null;
  let lastEmitTime = 0;

  buildRecyclingFactory();

  localAvatar = new Avatar3D(scene, {
    name: playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, 10);
  localAvatar.group.rotation.y = Math.PI;

  controls = new Controls(camera, localAvatar, container, {
    moveSpeed: 12.0,
    maxRadius: 21
  });

  function spawnGreenParticles(x, z) {
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.26, 0.26),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0xfbbf24 })
      );
      p.position.set(x + (Math.random() - 0.5) * 3, 2, z + (Math.random() - 0.5) * 2);
      scene.add(p);
      particles.push({ mesh: p, vy: 3 + Math.random() * 3.5, life: 0.85 });
    }
  }

  let toastTimer = null;
  function showRecycleToast(text, isOk) {
    const el = document.getElementById('recycle-toast');
    el.textContent = text;
    el.className = isOk ? 'rtoast-ok' : 'rtoast-err';
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, isOk ? 1800 : 3200);
  }

  function updateCarryingBadge() {
    const badge = document.getElementById('carrying-badge');
    if (carryingItemId && trashObjects[carryingItemId]) {
      badge.textContent = `Membawa: ${trashObjects[carryingItemId].data.name}`;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  // Fallback 4 Bot Rekan/Lawan saat Testing 1 Orang
  function initRecycleBots() {
    clearRecycleBots();
    const profiles = [
      { name: 'Raka (Bot)', team: 'red', color: '#ef4444', hat: 'topi_sekolah' },
      { name: 'Sinta (Bot)', team: 'blue', color: '#3b82f6', hat: 'telinga_kucing' },
      { name: 'Bima (Bot)', team: 'red', color: '#f43f5e', hat: 'topi_wisuda' },
      { name: 'Nadia (Bot)', team: 'blue', color: '#0ea5e9', hat: 'none' }
    ];
    profiles.forEach((bp, i) => {
      const av = new Avatar3D(scene, { name: bp.name, color: bp.color, hat: bp.hat, isLocal: false });
      av.group.position.set(-7 + i * 4.5, 0, 9);
      bots.push({
        id: `rbot_${i}`,
        name: bp.name,
        team: bp.team,
        avatar: av,
        targetX: -7 + i * 4.5,
        targetZ: 9,
        score: 0,
        thinkTimer: 1.0 + i * 0.6
      });
    });
  }

  function clearRecycleBots() {
    bots.forEach(b => b.avatar.destroy());
    bots = [];
  }

  function updateRecycleBots(delta) {
    if (Object.keys(remotePlayers).length > 0 && bots.length > 0) {
      clearRecycleBots();
      return;
    }
    if (gameState !== 'RUNNING') return;

    bots.forEach(b => {
      const pos = b.avatar.group.position;
      const dx = b.targetX - pos.x;
      const dz = b.targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        b.avatar.isMoving = true;
        pos.x += (dx / dist) * 8.5 * delta;
        pos.z += (dz / dist) * 8.5 * delta;
        b.avatar.group.rotation.y = Math.atan2(dx, dz);
      } else {
        b.avatar.isMoving = false;
        b.thinkTimer -= delta;
        if (b.thinkTimer <= 0) {
          // Bot berlari bergantian antara konveyor tengah dan salah satu mesin pilah
          if (pos.z > -6) {
            const m = MACHINES[Math.floor(Math.random() * MACHINES.length)];
            b.targetX = m.x + (Math.random() - 0.5) * 3;
            b.targetZ = m.z + 5;
          } else {
            b.targetX = (Math.random() - 0.5) * 10;
            b.targetZ = (Math.random() - 0.5) * 6;
          }
          b.thinkTimer = 1.4 + Math.random() * 1.4;
        }
      }
      b.avatar.update(delta);
    });
  }

  // ==================== 5. AKSI AMBIL & MASUKKAN SAMPAH ====================
  function tryPickupNearestTrash() {
    if (gameState !== 'RUNNING' || carryingItemId || !nearbyItemId) return;
    socket.emit('recycle_pickup', nearbyItemId, (res) => {
      if (res && res.success) {
        carryingItemId = res.item.id;
        window.soundFX.pop();
        updateCarryingBadge();
      }
    });
  }

  function tryDepositToMachine(category) {
    if (gameState !== 'RUNNING' || !carryingItemId || depositLock) return;
    depositLock = true;
    socket.emit('recycle_deposit', category, () => {
      setTimeout(() => { depositLock = false; }, 350);
    });
  }

  // Tombol Keyboard E
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'KeyE') {
      if (!carryingItemId && nearbyItemId) {
        tryPickupNearestTrash();
      } else if (carryingItemId) {
        const nearM = getNearbyMachineCategory();
        if (nearM) tryDepositToMachine(nearM);
      }
    }
  });

  function getNearbyMachineCategory() {
    const pos = localAvatar.group.position;
    for (const m of MACHINES) {
      const dz = machineMeshes[m.category].dropZone;
      if (Math.abs(pos.x - dz.x) <= dz.halfW && Math.abs(pos.z - dz.z) <= dz.halfD) {
        return m.category;
      }
    }
    return null;
  }

  // ==================== 6. UI MODAL MODE, EMOTE & SOCKET.IO ====================
  const modeModal = document.getElementById('recycle-mode-modal');
  const setCardSelection = (idA, idB, pickA) => {
    document.getElementById(idA).classList.toggle('selected', pickA);
    document.getElementById(idB).classList.toggle('selected', !pickA);
  };

  document.getElementById('choice-mode-teams').addEventListener('click', () => {
    selectedMode = 'teams';
    setCardSelection('choice-mode-teams', 'choice-mode-coop', true);
  });
  document.getElementById('choice-mode-coop').addEventListener('click', () => {
    selectedMode = 'coop';
    setCardSelection('choice-mode-teams', 'choice-mode-coop', false);
  });
  document.getElementById('choice-lvl-sd').addEventListener('click', () => {
    selectedLevel = 'sd';
    setCardSelection('choice-lvl-sd', 'choice-lvl-smp', true);
  });
  document.getElementById('choice-lvl-smp').addEventListener('click', () => {
    selectedLevel = 'smp';
    setCardSelection('choice-lvl-sd', 'choice-lvl-smp', false);
  });

  document.getElementById('btn-open-mode-modal').addEventListener('click', () => {
    modeModal.style.display = 'flex';
  });

  document.getElementById('btn-start-recycle').addEventListener('click', () => {
    modeModal.style.display = 'none';
    if (socket) socket.emit('recycle_start', { mode: selectedMode, level: selectedLevel });
  });

  document.getElementById('btn-rec-again').addEventListener('click', () => {
    document.getElementById('recycle-finish-modal').style.display = 'none';
    modeModal.style.display = 'flex';
  });

  // Emote Dropdown
  const emoteToggle = document.getElementById('btn-rec-emote-toggle');
  const emoteMenu = document.getElementById('rec-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = emoteMenu.classList.toggle('open');
      emoteToggle.classList.toggle('open', open);
    });
  }
  document.querySelectorAll('.rec-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('recycle_emote', em);
      if (emoteMenu) emoteMenu.classList.remove('open');
      if (emoteToggle) emoteToggle.classList.remove('open');
    });
  });

  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  function formatMMSS(sec) {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function updateTopScoreStrip(mode, timer, scores, capacity) {
    document.getElementById('hud-rec-timer').textContent = `${formatMMSS(timer)}`;
    document.getElementById('hud-teams-score').style.display = mode === 'teams' ? 'flex' : 'none';
    document.getElementById('hud-coop-meter').style.display = mode === 'coop' ? 'flex' : 'none';
    if (scores) {
      document.getElementById('score-red').textContent = scores.red || 0;
      document.getElementById('score-blue').textContent = scores.blue || 0;
    }
    if (capacity !== undefined) {
      document.getElementById('cap-pct').textContent = `${capacity}%`;
      document.getElementById('cap-fill').style.width = `${capacity}%`;
    }
  }

  function renderRecycleLeaderboard(playersList) {
    const list = [...(playersList || [])].sort((a, b) => b.score - a.score);
    document.getElementById('rec-player-count').textContent = `(${list.length})`;
    const el = document.getElementById('rec-rank-list');
    el.innerHTML = '';
    list.slice(0, 6).forEach((p, i) => {
      const teamDot = p.team === 'red' ? '[MERAH]' : '[BIRU]';
      const div = document.createElement('div');
      div.className = 'rank-item';
      div.innerHTML = `
        <span class="rank-pos">#${i + 1}</span>
        <span class="rank-name">${selectedMode === 'teams' ? teamDot + ' ' : ''}${p.name} ${p.id === socket.id ? '(Anda)' : ''}</span>
        <span class="rank-score">${p.score}</span>
      `;
      el.appendChild(div);
    });
  }

  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_recycle', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      name: playerName,
      color: playerColor,
      hat: playerHat,
      role: isTeacher ? 'teacher' : 'student'
    }, (res) => {
      if (!res || !res.success) return;
      myTeam = res.player.team;
      selectedMode = res.mode;
      selectedLevel = res.level;
      gameState = res.state;
      localAvatar.group.position.set(res.player.x, 0, res.player.z);

      updateTopScoreStrip(res.mode, res.timer, res.scores, res.capacity);
      (res.items || []).forEach(syncTrashItem);
      (res.players || []).forEach(p => {
        if (p.id !== socket.id) spawnRemoteRecyclePlayer(p);
      });
      if (Object.keys(remotePlayers).length === 0) initRecycleBots();
      renderRecycleLeaderboard(res.players);

      if (gameState === 'RUNNING') modeModal.style.display = 'none';
    });
  });

  function spawnRemoteRecyclePlayer(p) {
    if (remotePlayers[p.id]) return;
    const label = `${p.team === 'red' ? '[MERAH]' : '[BIRU]'} ${p.name}`;
    const av = new Avatar3D(scene, { name: label, color: p.color, hat: p.hat, isLocal: false });
    av.group.position.set(p.x, p.y, p.z);
    remotePlayers[p.id] = {
      avatar: av,
      name: p.name,
      team: p.team,
      targetPos: { x: p.x, y: p.y, z: p.z },
      targetRotY: p.rotY || Math.PI,
      isMoving: false,
      isJumping: false,
      carryingItemId: p.carryingItemId || null
    };
  }

  socket.on('recycle_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemoteRecyclePlayer(p);
  });

  socket.on('recycle_player_left', (id) => {
    if (remotePlayers[id]) {
      remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
  });

  socket.on('recycle_players_updated', (list) => renderRecycleLeaderboard(list));

  socket.on('recycle_player_moved', (m) => {
    const rp = remotePlayers[m.id];
    if (!rp) return;
    rp.targetPos = { x: m.x, y: m.y, z: m.z };
    rp.targetRotY = m.rotY;
    rp.isMoving = m.isMoving;
    rp.isJumping = m.isJumping;
    rp.carryingItemId = m.carryingItemId;
  });

  socket.on('recycle_player_emote', (d) => {
    if (remotePlayers[d.id]) remotePlayers[d.id].avatar.showEmote(d.emote);
  });

  socket.on('recycle_started', (data) => {
    selectedMode = data.mode;
    selectedLevel = data.level;
    gameState = 'RUNNING';
    carryingItemId = null;
    updateCarryingBadge();
    modeModal.style.display = 'none';
    document.getElementById('recycle-finish-modal').style.display = 'none';

    clearAllTrash();
    (data.items || []).forEach(syncTrashItem);
    updateTopScoreStrip(data.mode, data.timer, data.scores, data.capacity);
    renderRecycleLeaderboard(data.players);
    if (Object.keys(remotePlayers).length === 0) initRecycleBots();
    window.soundFX.correct();
  });

  socket.on('recycle_tick', (d) => {
    updateTopScoreStrip(selectedMode, d.timer, d.scores, d.capacity);
  });

  socket.on('recycle_item_spawned', (d) => {
    syncTrashItem(d.item);
    updateTopScoreStrip(selectedMode, parseInt(document.getElementById('hud-rec-timer').textContent.split(':')[1] || 0, 10) + parseInt(document.getElementById('hud-rec-timer').textContent.replace(/\D/g, '').slice(0, 2) || 0, 10) * 60, null, d.capacity);
  });

  socket.on('recycle_item_picked', (d) => {
    if (trashObjects[d.itemId]) {
      trashObjects[d.itemId].data.carriedBy = d.playerId;
    }
  });

  socket.on('recycle_deposit_result', (res) => {
    if (res.playerId === socket.id) {
      carryingItemId = null;
      updateCarryingBadge();
    }

    if (res.success) {
      removeTrashItem(res.itemId);
      const mObj = machineMeshes[res.machineCategory];
      if (mObj) spawnGreenParticles(mObj.origX, mObj.dropZone.z - 2);
      if (res.playerId === socket.id) {
        window.soundFX.correct();
        showRecycleToast(`+10 Poin! ${res.itemName} masuk ${res.machineCategory.toUpperCase()}!`, true);
      }
    } else {
      // Mesin bergetar merah & sampah terlempar kembali ke lantai!
      const mObj = machineMeshes[res.machineCategory];
      if (mObj) mObj.shakeTimer = 0.6;
      if (trashObjects[res.itemId]) {
        trashObjects[res.itemId].data.carriedBy = null;
        trashObjects[res.itemId].data.x = res.itemX;
        trashObjects[res.itemId].data.z = res.itemZ;
        trashObjects[res.itemId].group.position.set(res.itemX, 0.45, res.itemZ);
      }
      if (res.playerId === socket.id) {
        window.soundFX.wrong();
        showRecycleToast(`Salah Mesin (-3)! ${res.edu}`, false);
      }
    }

    document.getElementById('score-red').textContent = res.scores.red || 0;
    document.getElementById('score-blue').textContent = res.scores.blue || 0;
    document.getElementById('cap-pct').textContent = `${res.capacity}%`;
    document.getElementById('cap-fill').style.width = `${res.capacity}%`;
    renderRecycleLeaderboard(res.players);
  });

  socket.on('recycle_game_over', (data) => {
    gameState = 'FINISHED';
    window.soundFX.victory();

    const titleEl = document.getElementById('rec-finish-title');
    const subEl = document.getElementById('rec-finish-sub');
    if (data.mode === 'teams') {
      const winner = data.scores.red > data.scores.blue ? 'TIM MERAH MENANG!' : (data.scores.blue > data.scores.red ? 'TIM BIRU MENANG!' : 'SERI!');
      titleEl.textContent = winner;
      subEl.textContent = `Skor Akhir: Merah ${data.scores.red} vs Biru ${data.scores.blue}`;
    } else {
      titleEl.textContent = data.reason === 'overflow' ? 'PABRIK BANJIR SAMPAH!' : 'MISI CO-OP BERHASIL!';
      subEl.textContent = `Skor Kelas: ${data.scores.coop} Poin • Kapasitas Akhir: ${data.capacity}%`;
    }

    const wrap = document.getElementById('rec-finish-standings');
    wrap.innerHTML = '';
    (data.standings || []).slice(0, 6).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.4rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.9rem;';
      row.innerHTML = `<span><strong>#${i + 1}</strong> ${s.team === 'red' ? '[MERAH]' : '[BIRU]'} ${s.name}</span><span style="color:#34d399; font-weight:800;">${s.score} Pts</span>`;
      wrap.appendChild(row);
    });
    document.getElementById('recycle-finish-modal').style.display = 'flex';
  });

  // ==================== 7. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    controls.update(delta);
    const pos = localAvatar.group.position;
    pos.x = Math.max(-20.2, Math.min(20.2, pos.x));
    pos.z = Math.max(-14.5, Math.min(18.5, pos.z));
    localAvatar.update(delta);

    // 1. Deteksi Sampah Terdekat (jika belum membawa) atau Mesin Pilah (otomatis masuk!)
    if (gameState === 'RUNNING') {
      if (!carryingItemId) {
        let bestId = null;
        let bestDist = 3.2;
        for (const id in trashObjects) {
          const t = trashObjects[id];
          if (t.data.carriedBy) continue;
          const d = Math.hypot(pos.x - t.group.position.x, pos.z - t.group.position.z);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        }
        if (bestId !== nearbyItemId) {
          nearbyItemId = bestId;
          if (window.MobileControls) {
            if (bestId) {
              window.MobileControls.setActionLabel('Ambil', true, '', tryPickupNearestTrash);
            } else {
              window.MobileControls.clearAction();
            }
          }
        }
      } else {
        // Sedang membawa sampah -> Otomatis masuk saat menginjak zona cahaya mesin!
        const nearM = getNearbyMachineCategory();
        if (nearM) {
          tryDepositToMachine(nearM);
        } else if (window.MobileControls) {
          window.MobileControls.setActionLabel('Pilah', false, '', null);
        }
      }
    }

    // 2. Posisikan objek sampah yang sedang dibawa menempel di atas kepala karakter!
    for (const id in trashObjects) {
      const t = trashObjects[id];
      const carrier = t.data.carriedBy;
      if (carrier) {
        if (carrier === (socket ? socket.id : '')) {
          t.group.position.set(pos.x, pos.y + 3.6, pos.z);
        } else if (remotePlayers[carrier]) {
          const rp = remotePlayers[carrier].avatar.group.position;
          t.group.position.set(rp.x, rp.y + 3.6, rp.z);
        }
      } else {
        t.group.rotation.y += delta * 1.1;
      }
    }

    // 3. Animasi getar mesin jika salah pilah
    for (const cat in machineMeshes) {
      const m = machineMeshes[cat];
      if (m.shakeTimer > 0) {
        m.shakeTimer -= delta;
        m.group.position.x = m.origX + Math.sin(now * 0.07) * 0.35;
        if (m.shakeTimer <= 0) m.group.position.x = m.origX;
      }
    }

    // 4. Sinkronisasi posisi ke server (18Hz)
    if (socket && now - lastEmitTime > 55) {
      socket.emit('recycle_move', {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping
      });
      lastEmitTime = now;
    }

    // 5. Interpolasi Remote Players, Bot, & Partikel
    for (const id in remotePlayers) {
      const rp = remotePlayers[id];
      rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, 1 - Math.exp(-14 * delta));
      rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, 1 - Math.exp(-14 * delta));
      rp.avatar.isMoving = rp.isMoving;
      rp.avatar.isJumping = rp.isJumping;
      rp.avatar.update(delta);
    }
    updateRecycleBots(delta);

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

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
});
