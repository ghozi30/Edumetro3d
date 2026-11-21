// Mini Game #06: Lantai Lava Tata Surya (Battle Royale / Eliminasi — IPA Astronomi)
// 8 Pulau Planet 3D + Lantai Ruang Angkasa Menghilang ke Lava setelah 5 detik + Fallback 6 Bot Siswa.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = (urlParams.get('game') || 'mg-06').toLowerCase().trim();
  const isTeacher = sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_play_mode') === 'solo';

  const playerName = sessionStorage.getItem('eduverse_name') || (isTeacher ? 'Guru' : 'Astronot');
  const playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  const playerHat = sessionStorage.getItem('eduverse_hat') || (isTeacher ? 'mahkota' : 'none');

  // ==================== 1. SCENE 3D LUAR ANGKASA & LAUTAN LAVA ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b1a);
  scene.fog = new THREE.FogExp2(0x070b1a, 0.0085);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 420);
  camera.position.set(0, 14, 24);

  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xc7d2fe, 0xf97316, 0.72));
  const sun = new THREE.DirectionalLight(0xfffbeb, 0.9);
  sun.position.set(30, 55, 25);
  sun.castShadow = true;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // ==================== 2. ELEMEN ARENA 3D ====================
  let spaceFloorMesh = null;
  let lavaSeaMesh = null;
  let lavaEmbers = null;
  let planetIslands = []; // { id, name, x, z, radius, group, padMesh, sphereGroup, origColor }

  function buildCosmicLavaArena(planetsList) {
    // 1. Bintang-bintang Luar Angkasa
    const starCount = 400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 65 + Math.random() * 80;
      const t = Math.random() * Math.PI * 2;
      const p = Math.random() * Math.PI * 0.55;
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = 8 + Math.abs(r * Math.cos(p));
      starPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));

    // 2. Lautan Lava Kosmik Membara di Bawah Arena (y = -8.5)
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xea580c });
    lavaSeaMesh = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), lavaMat);
    lavaSeaMesh.rotation.x = -Math.PI / 2;
    lavaSeaMesh.position.y = -8.5;
    scene.add(lavaSeaMesh);

    // Percikan Bara Api Lava Naik
    const eCount = 120;
    const eGeo = new THREE.BufferGeometry();
    const ePos = new Float32Array(eCount * 3);
    for (let i = 0; i < eCount; i++) {
      ePos[i * 3] = (Math.random() - 0.5) * 65;
      ePos[i * 3 + 1] = -8 + Math.random() * 14;
      ePos[i * 3 + 2] = (Math.random() - 0.5) * 65;
    }
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    lavaEmbers = new THREE.Points(eGeo, new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.45, transparent: true, opacity: 0.85 }));
    scene.add(lavaEmbers);

    // 3. Lantai Ruang Angkasa (menghilang saat waktu habis!)
    spaceFloorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 25, 0.5, 48),
      new THREE.MeshLambertMaterial({ color: 0x1e293b, transparent: true, opacity: 0.92 })
    );
    spaceFloorMesh.position.y = -0.26;
    spaceFloorMesh.receiveShadow = true;
    scene.add(spaceFloorMesh);

    // 4. 8 Pulau Planet Tata Surya 3D melingkar di radius 16.5m
    const ringRadius = 16.5;
    const islandRadius = 4.2;

    planetsList.forEach((pl, idx) => {
      const angle = (idx / planetsList.length) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * ringRadius;
      const pz = Math.sin(angle) * ringRadius;

      const group = new THREE.Group();

      // Pad Pulau Planet
      const padMat = new THREE.MeshLambertMaterial({ color: pl.color });
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(islandRadius, islandRadius * 0.85, 0.9, 24), padMat);
      padMesh.position.y = -0.35;
      padMesh.receiveShadow = true;
      padMesh.castShadow = true;
      group.add(padMesh);

      // Cincin Neon Tepi Pulau
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(islandRadius - 0.25, islandRadius + 0.1, 24),
        new THREE.MeshBasicMaterial({ color: pl.glow, side: THREE.DoubleSide })
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.12;
      group.add(rim);

      // Bola Planet 3D Berputar Mengambang di Atas Pulau
      const sphereGroup = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 18, 14),
        new THREE.MeshLambertMaterial({ color: pl.color })
      );
      sphereGroup.add(sphere);
      if (pl.hasRing) {
        const ring3d = new THREE.Mesh(
          new THREE.TorusGeometry(2.15, 0.18, 6, 28),
          new THREE.MeshBasicMaterial({ color: pl.glow })
        );
        ring3d.rotation.x = pl.id === 'uranus' ? Math.PI / 6 : Math.PI / 2.3;
        sphereGroup.add(ring3d);
      }
      sphereGroup.position.set(0, 5.4, 0);
      group.add(sphereGroup);

      // Papan Nama Planet Kontras Tinggi
      const nameCanvas = document.createElement('canvas');
      nameCanvas.width = 420;
      nameCanvas.height = 120;
      const ctx = nameCanvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 400, 100, 22);
      ctx.fill();
      ctx.strokeStyle = '#' + pl.color.toString(16).padStart(6, '0');
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, 210, 62);

      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(nameCanvas), transparent: true })
      );
      labelSprite.position.set(0, 3.3, 0);
      labelSprite.scale.set(5.6, 1.6, 1);
      group.add(labelSprite);

      group.position.set(px, 0, pz);
      scene.add(group);

      planetIslands.push({
        id: pl.id,
        name: pl.name,
        x: px,
        z: pz,
        radius: islandRadius,
        group,
        padMesh,
        sphereGroup,
        origColor: pl.color
      });
    });
  }

  // ==================== 3. STATE GAME & AVATAR LOKAL ====================
  let localAvatar = null;
  let controls = null;
  let lavaActive = false;      // true saat lantai & pulau salah menghilang
  let safePlanetId = null;
  let isAlive = true;
  let isFallingToLava = false;
  let fallVel = 0;

  const remotePlayers = {};
  let bots = [];
  let socket = null;
  let lastEmitTime = 0;

  localAvatar = new Avatar3D(scene, {
    name: isTeacher ? `${playerName}` : playerName,
    color: playerColor,
    hat: playerHat,
    isLocal: true
  });
  localAvatar.group.position.set(0, 0, 2);

  controls = new Controls(camera, localAvatar, container, {
    moveSpeed: 12.5,
    maxRadius: 24.5
  });

  function detectStandingPlanet(x, z) {
    for (const pl of planetIslands) {
      const dx = x - pl.x;
      const dz = z - pl.z;
      if (Math.sqrt(dx * dx + dz * dz) <= pl.radius + 0.35) {
        return pl.id;
      }
    }
    return null;
  }

  // ==================== 4. FALLBACK 6 BOT SISWA BATTLE ROYALE ====================
  function initLavaBots() {
    clearLavaBots();
    const profiles = [
      { name: 'Raka (Bot)', color: '#fb7185', hat: 'topi_sekolah' },
      { name: 'Sinta (Bot)', color: '#a78bfa', hat: 'telinga_kucing' },
      { name: 'Bima (Bot)', color: '#fbbf24', hat: 'topi_wisuda' },
      { name: 'Nadia (Bot)', color: '#10b981', hat: 'none' },
      { name: 'Doni (Bot)', color: '#f97316', hat: 'topi_sekolah' },
      { name: 'Citra (Bot)', color: '#ec4899', hat: 'mahkota' }
    ];
    profiles.forEach((bp, i) => {
      const a = (i / profiles.length) * Math.PI * 2;
      const av = new Avatar3D(scene, { name: bp.name, color: bp.color, hat: bp.hat, isLocal: false });
      av.group.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4);
      bots.push({
        id: `lbot_${i}`,
        name: bp.name,
        avatar: av,
        alive: true,
        falling: false,
        fallVel: 0,
        survivedRounds: 0,
        targetX: Math.cos(a) * 4,
        targetZ: Math.sin(a) * 4
      });
    });
  }

  function clearLavaBots() {
    bots.forEach(b => b.avatar.destroy());
    bots = [];
  }

  function assignBotTargets(clueSafeId) {
    if (planetIslands.length === 0) return;
    bots.forEach(b => {
      if (!b.alive) return;
      // 65% bot pintar berlari ke pulau yang benar, 35% salah pilih planet sehingga tereliminasi!
      let targetIsland;
      if (clueSafeId && Math.random() < 0.65) {
        targetIsland = planetIslands.find(p => p.id === clueSafeId) || planetIslands[0];
      } else {
        targetIsland = planetIslands[Math.floor(Math.random() * planetIslands.length)];
      }
      b.targetX = targetIsland.x + (Math.random() - 0.5) * 2.4;
      b.targetZ = targetIsland.z + (Math.random() - 0.5) * 2.4;
    });
  }

  function updateLavaBots(delta) {
    if (Object.keys(remotePlayers).length > 0 && bots.length > 0) {
      clearLavaBots();
      return;
    }
    bots.forEach(b => {
      if (b.falling) {
        b.fallVel += 22 * delta;
        b.avatar.group.position.y -= b.fallVel * delta;
        b.avatar.group.rotation.x += delta * 5;
        if (b.avatar.group.position.y < -12) {
          b.avatar.group.visible = false;
        }
        return;
      }
      if (!b.alive) return;

      const pos = b.avatar.group.position;
      const dx = b.targetX - pos.x;
      const dz = b.targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.35) {
        b.avatar.isMoving = true;
        pos.x += (dx / dist) * 10.5 * delta;
        pos.z += (dz / dist) * 10.5 * delta;
        b.avatar.group.rotation.y = Math.atan2(dx, dz);
      } else {
        b.avatar.isMoving = false;
      }
      b.avatar.update(delta);
    });
  }

  // ==================== 5. UI EMOTE DROPDOWN & KONTROL ====================
  const emoteToggle = document.getElementById('btn-lava-emote-toggle');
  const emoteMenu = document.getElementById('lava-emote-menu');
  if (emoteToggle && emoteMenu) {
    emoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = emoteMenu.classList.toggle('open');
      emoteToggle.classList.toggle('open', open);
    });
  }

  document.querySelectorAll('.lava-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('lava_emote', em);
      if (emoteMenu) emoteMenu.classList.remove('open');
      if (emoteToggle) emoteToggle.classList.remove('open');
    });
  });

  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  // ==================== 6. SOCKET.IO MULTIPLAYER BATTLE ROYALE ====================
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join_lava', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      level: (document.getElementById('lava-level-select') && document.getElementById('lava-level-select').value) || 'sd',
      name: playerName,
      color: playerColor,
      hat: playerHat,
      role: isTeacher ? 'teacher' : 'student'
    }, (res) => {
      if (!res || !res.success) return;
      buildCosmicLavaArena(res.planets || []);
      localAvatar.group.position.set(res.player.x, 0, res.player.z);

      (res.players || []).forEach(p => {
        if (p.id !== socket.id) spawnRemoteLavaPlayer(p);
      });
      if (Object.keys(remotePlayers).length === 0) initLavaBots();
      renderLavaLeaderboard();
    });
  });

  function spawnRemoteLavaPlayer(p) {
    if (remotePlayers[p.id]) return;
    const av = new Avatar3D(scene, { name: p.name, color: p.color, hat: p.hat, isLocal: false });
    av.group.position.set(p.x, p.y, p.z);
    remotePlayers[p.id] = {
      avatar: av,
      name: p.name,
      targetPos: { x: p.x, y: p.y, z: p.z },
      targetRotY: p.rotY || 0,
      isMoving: false,
      isJumping: false,
      alive: p.alive !== false,
      survivedRounds: p.survivedRounds || 0
    };
  }

  socket.on('lava_player_joined', (p) => {
    if (p.id !== socket.id) spawnRemoteLavaPlayer(p);
    renderLavaLeaderboard();
  });

  socket.on('lava_player_left', (id) => {
    if (remotePlayers[id]) {
      remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
    renderLavaLeaderboard();
  });

  socket.on('lava_player_moved', (m) => {
    const rp = remotePlayers[m.id];
    if (!rp) return;
    rp.targetPos = { x: m.x, y: m.y, z: m.z };
    rp.targetRotY = m.rotY;
    rp.isMoving = m.isMoving;
    rp.isJumping = m.isJumping;
    rp.alive = m.alive;
  });

  socket.on('lava_player_emote', (d) => {
    if (remotePlayers[d.id]) remotePlayers[d.id].avatar.showEmote(d.emote);
  });

  // Match Dimulai!
  socket.on('lava_match_started', () => {
    isAlive = true;
    isFallingToLava = false;
    fallVel = 0;
    lavaActive = false;
    safePlanetId = null;

    document.getElementById('lava-finish-modal').style.display = 'none';
    document.getElementById('spectator-badge').style.display = 'none';
    const ctrlWrap = document.getElementById('lava-controls-wrap');
    if (ctrlWrap) ctrlWrap.style.display = 'none';
    document.getElementById('lava-info-sub').textContent = '';

    localAvatar.group.visible = true;
    localAvatar.group.rotation.x = 0;
    localAvatar.group.position.set(0, 0, 0);
    if (controls) controls.enabled = true;

    restoreAllIslandsAndFloor();
    if (Object.keys(remotePlayers).length === 0) initLavaBots();
    renderLavaLeaderboard();
  });

  // Ronde Baru: Panggilan Ciri Planet (5 Detik!)
  socket.on('lava_round_start', (data) => {
    lavaActive = false;
    safePlanetId = null;
    restoreAllIslandsAndFloor();

    document.getElementById('lava-round-tag').textContent = `RONDE ${data.round} DARI ${data.maxRounds} • LARI KE PULAU PLANET!`;
    document.getElementById('lava-clue-text').textContent = `${data.clue}`;
    document.getElementById('lava-info-sub').textContent = '';
    document.getElementById('lava-timer-sec').textContent = `${data.timer}s`;
    document.getElementById('lava-timer-box').classList.remove('hud-timer-urgent');
    window.soundFX.tick();

    // Gerakkan bot acak ke pulau-pulau planet
    assignBotTargets(null);
  });

  socket.on('lava_timer_tick', (data) => {
    document.getElementById('lava-timer-sec').textContent = `${data.timer}s`;
    if (data.timer <= 5 && data.timer > 0) {
      document.getElementById('lava-timer-box').classList.add('hud-timer-urgent');
      if (spaceFloorMesh) spaceFloorMesh.material.color.setHex(0x991b1b); // Peringatan 5 detik terakhir!
      window.soundFX.urgentTick();
    } else if (data.timer > 5) {
      window.soundFX.tick();
    }
  });

  // DETIK 0: LANTAI RUANG ANGKASA & 7 PLANET SALAH MENGHILANG KE LAVA!
  socket.on('lava_floor_drop', (data) => {
    lavaActive = true;
    safePlanetId = data.safePlanetId;
    document.getElementById('lava-timer-sec').textContent = 'LAVA!';
    document.getElementById('lava-info-sub').textContent = `Pulau Aman: ${safePlanetId.toUpperCase()} — ${data.info}`;

    // Sembunyikan lantai ruang angkasa & pulau planet yang salah
    if (spaceFloorMesh) spaceFloorMesh.visible = false;
    planetIslands.forEach(pl => {
      if (pl.id === safePlanetId) {
        pl.group.visible = true;
        pl.padMesh.material.color.setHex(0x10b981); // Menyala hijau aman!
      } else {
        pl.group.visible = false;
      }
    });

    // Cek pemain lokal
    if (isAlive) {
      const myPlanet = detectStandingPlanet(localAvatar.group.position.x, localAvatar.group.position.z);
      if (myPlanet === safePlanetId) {
        window.soundFX.correct();
      } else {
        isAlive = false;
        isFallingToLava = true;
        fallVel = 2.0;
        if (controls) controls.enabled = false;
        window.soundFX.wrong();
        document.getElementById('spectator-badge').style.display = 'block';
      }
    }

    // Evaluasi Bot Solo Testing
    bots.forEach(b => {
      if (!b.alive) return;
      const bPlanet = detectStandingPlanet(b.avatar.group.position.x, b.avatar.group.position.z);
      if (bPlanet === safePlanetId) {
        b.survivedRounds++;
      } else {
        b.alive = false;
        b.falling = true;
        b.fallVel = 2;
      }
    });

    // Update status remote players
    (data.players || []).forEach(p => {
      if (remotePlayers[p.id]) {
        remotePlayers[p.id].alive = p.alive;
        remotePlayers[p.id].survivedRounds = p.survivedRounds;
        if (!p.alive) remotePlayers[p.id].avatar.group.visible = false;
      }
    });

    renderLavaLeaderboard();
  });

  // Game Over — Tampilkan 1-3 Juara Bertahan!
  socket.on('lava_game_over', (data) => {
    lavaActive = false;
    restoreAllIslandsAndFloor();
    const ctrlWrap = document.getElementById('lava-controls-wrap');
    if (ctrlWrap) ctrlWrap.style.display = 'flex';
    window.soundFX.victory();

    const combined = getCombinedSurvivors();
    const listEl = document.getElementById('lava-winners-list');
    listEl.innerHTML = '';
    const medals = ['#1', '#2', '#3'];
    combined.slice(0, 5).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.45rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.92rem;';
      row.innerHTML = `
        <span><strong>${medals[i] || '#' + (i + 1)}</strong> ${s.name} ${s.isMe ? '(Anda)' : ''}</span>
        <span style="color:${s.alive ? '#34d399' : '#fb7185'}; font-weight:800;">
          ${s.alive ? 'Bertahan Hidup' : `Gugur (R.${s.survivedRounds})`}
        </span>
      `;
      listEl.appendChild(row);
    });
    document.getElementById('lava-finish-modal').style.display = 'flex';
  });

  function restoreAllIslandsAndFloor() {
    if (spaceFloorMesh) {
      spaceFloorMesh.visible = true;
      spaceFloorMesh.material.color.setHex(0x1e293b);
    }
    planetIslands.forEach(pl => {
      pl.group.visible = true;
      pl.padMesh.material.color.setHex(pl.origColor);
    });
  }

  const lavaLevelSelect = document.getElementById('lava-level-select');
  if (lavaLevelSelect) {
    lavaLevelSelect.addEventListener('change', () => {
      socket.emit('lava_set_level', { level: lavaLevelSelect.value });
    });
  }
  socket.on('lava_level_changed', (data) => {
    if (lavaLevelSelect && data && data.level) lavaLevelSelect.value = data.level;
  });
  document.getElementById('btn-lava-start').addEventListener('click', () => {
    socket.emit('lava_start', { level: lavaLevelSelect ? lavaLevelSelect.value : 'sd' });
  });
  document.getElementById('btn-lava-play-again').addEventListener('click', () => socket.emit('lava_start'));

  function getCombinedSurvivors() {
    const all = [
      { id: socket ? socket.id : 'me', name: playerName, alive: isAlive, survivedRounds: 0, isMe: true },
      ...Object.entries(remotePlayers).map(([id, rp]) => ({
        id, name: rp.name, alive: rp.alive, survivedRounds: rp.survivedRounds || 0, isMe: false
      })),
      ...bots.map(b => ({
        id: b.id, name: b.name, alive: b.alive, survivedRounds: b.survivedRounds, isMe: false
      }))
    ];
    return all.sort((a, b) => (a.alive === b.alive ? b.survivedRounds - a.survivedRounds : a.alive ? -1 : 1));
  }

  function renderLavaLeaderboard() {
    const all = getCombinedSurvivors();
    const aliveCount = all.filter(p => p.alive).length;
    document.getElementById('lava-alive-count').textContent = aliveCount;
    document.getElementById('lava-total-count').textContent = `(${all.length})`;

    const listEl = document.getElementById('lava-rank-list');
    listEl.innerHTML = '';
    all.slice(0, 6).forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      div.innerHTML = `
        <span class="rank-pos">#${idx + 1}</span>
        <span class="rank-name">${p.name} ${p.isMe ? '(Anda)' : ''}</span>
        <span class="rank-score" style="color:${p.alive ? '#34d399' : '#ef4444'};">${p.alive ? 'Hidup' : 'Lava'}</span>
      `;
      listEl.appendChild(div);
    });
  }

  // ==================== 7. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();
  let elapsed = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    elapsed += delta;

    // 1. Update Kontrol & Jatuh ke Lava
    if (isFallingToLava) {
      fallVel += 22 * delta;
      localAvatar.group.position.y -= fallVel * delta;
      localAvatar.group.rotation.x += delta * 5;
      if (localAvatar.group.position.y < -10) {
        localAvatar.group.visible = false;
        // Mode penonton mengorbit melihat sisa arena
        camera.position.x = Math.cos(elapsed * 0.35) * 28;
        camera.position.y = 18;
        camera.position.z = Math.sin(elapsed * 0.35) * 28;
        camera.lookAt(0, 2, 0);
      }
    } else if (isAlive) {
      controls.update(delta);
      localAvatar.update(delta);
    }

    // 2. Sinkronisasi ke server (18Hz)
    if (socket && now - lastEmitTime > 55) {
      const pos = localAvatar.group.position;
      const standingPlanet = detectStandingPlanet(pos.x, pos.z);
      socket.emit('lava_move', {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotY: parseFloat(localAvatar.group.rotation.y.toFixed(2)),
        isMoving: localAvatar.isMoving,
        isJumping: localAvatar.isJumping,
        standingPlanet
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
    updateLavaBots(delta);

    // 4. Animasi Planet Berputar & Bara Api Lava
    for (const pl of planetIslands) {
      pl.sphereGroup.rotation.y += delta * 0.85;
    }
    if (lavaSeaMesh) {
      lavaSeaMesh.material.color.setHSL(0.05 + Math.sin(elapsed * 2.5) * 0.015, 0.92, 0.48);
    }
    if (lavaEmbers) {
      const arr = lavaEmbers.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += delta * 2.8;
        if (arr[i] > 8) arr[i] = -8;
      }
      lavaEmbers.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
});
