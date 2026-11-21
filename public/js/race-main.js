// Mini Game #04: Sirkuit Balap Mobil 3 Gerbang Grand Prix — EduMetro 3D (3 Lap • 15 Soal • Mabar 1 Kelas!)
// Lintasan panjang berliku (~650m per lap x 3 lap = ~1.95 km) dengan Pagar Ban, Guardrail, Tribun,
// Kolam Biru, & Radar Sirkuit. Mobil OTOMATIS MELAMBAT HALUS saat mendekati Gerbang Soal agar pemain
// punya cukup waktu membaca papan 3D di gerbang lalu belok memilih Gerbang A, B, atau C (tanpa popup HUD!).

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game') || 'mg-04';
  const playerName = sessionStorage.getItem('eduverse_name') || localStorage.getItem('edumetro_name') || 'Pembalap';
  const playerColor = sessionStorage.getItem('eduverse_color') || localStorage.getItem('edumetro_color') || '#38bdf8';
  const isTeacher = (sessionStorage.getItem('eduverse_city_role') === 'teacher' || sessionStorage.getItem('eduverse_role') === 'teacher');

  if (isTeacher) {
    const editBtn = document.getElementById('btn-race-edit-quiz');
    if (editBtn) {
      editBtn.href = `guru.html?game=${gameId}`;
      editBtn.style.display = 'inline-flex';
    }
  }

  const TOTAL_LAPS = 3;
  const GATES_PER_LAP = 5;
  const TOTAL_GATES = TOTAL_LAPS * GATES_PER_LAP; // 15 Soal total!

  // ==================== 1. SETUP THREE.JS GRAND PRIX SCENE ====================
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87cefa);
  scene.fog = new THREE.FogExp2(0x9ad8ff, 0.0020);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 480);
  const _isMobileGPU = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileGPU, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(_isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !_isMobileGPU;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.34));
  scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x4d7c0f, 0.52));
  const sun = new THREE.DirectionalLight(0xfff5e4, 0.88);
  sun.position.set(80, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  scene.add(sun);

  // ==================== 2. KURVA LINTASAN SIRKUIT GRAND PRIX PANJANG (~650M / LAP!) ====================
  const CIRCUIT_SIZE = 225;
  const ORIGIN_X = -CIRCUIT_SIZE / 2;
  const ORIGIN_Z = -CIRCUIT_SIZE / 2;
  const TRACK_HALF_W = 6.9;
  const LANE_OFFSETS = [-4.5, 0, 4.5]; // Kiri (A), Tengah (B), Kanan (C)

  const toX = (u) => ORIGIN_X + u * CIRCUIT_SIZE;
  const toZ = (v) => ORIGIN_Z + v * CIRCUIT_SIZE;

  const TRACK_UV = [
    [0.36, 0.89], // 0: GARIS START / FINISH!
    [0.57, 0.89], // 1: Lurus bawah kanan
    [0.57, 0.57], // 2: Naik tengah
    [0.40, 0.55], // 3: Chicane kiri
    [0.40, 0.36], // 4: Chicane atas
    [0.72, 0.36], // 5: Lurus bawah kolam biru
    [0.72, 0.52], // 6: Tikungan S kanan
    [0.88, 0.52], // 7: Sudut kanan bawah
    [0.88, 0.11], // 8: Lurus panjang kanan naik
    [0.42, 0.11], // 9: Lurus panjang atas (tribun biru!)
    [0.20, 0.33], // 10: Tikungan diagonal cepat kiri atas
    [0.20, 0.56], // 11: Lurus tengah kiri turun
    [0.09, 0.58], // 12: Belok kiri
    [0.09, 0.89]  // 13: Hairpin kiri bawah menuju garis Start/Finis!
  ];

  let splineSamples = [];
  let totalTrackLen = 650;

  function buildTrackSpline() {
    const rawPts = TRACK_UV.map(([u, v]) => new THREE.Vector2(toX(u), toZ(v)));
    const filleted = [];
    const n = rawPts.length;
    const cornerRadius = 15.0;
    const arcSteps = 10;

    for (let i = 0; i < n; i++) {
      const prev = rawPts[(i - 1 + n) % n];
      const curr = rawPts[i];
      const next = rawPts[(i + 1) % n];
      const v1 = new THREE.Vector2().subVectors(prev, curr);
      const v2 = new THREE.Vector2().subVectors(next, curr);
      const r = Math.min(cornerRadius, v1.length() * 0.35, v2.length() * 0.35);
      const pStart = curr.clone().add(v1.normalize().multiplyScalar(r));
      const pEnd = curr.clone().add(v2.normalize().multiplyScalar(r));

      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const omt = 1 - t;
        filleted.push(new THREE.Vector2(
          omt * omt * pStart.x + 2 * omt * t * curr.x + t * t * pEnd.x,
          omt * omt * pStart.y + 2 * omt * t * curr.y + t * t * pEnd.y
        ));
      }
    }

    splineSamples = [];
    let accum = 0;
    const m = filleted.length;
    for (let i = 0; i < m; i++) {
      const curr = filleted[i];
      const prev = filleted[(i - 1 + m) % m];
      const next = filleted[(i + 1) % m];
      if (i > 0) accum += curr.distanceTo(prev);
      const tan = new THREE.Vector2().subVectors(next, prev).normalize();
      const right = new THREE.Vector2(-tan.y, tan.x);
      splineSamples.push({ x: curr.x, z: curr.y, tx: tan.x, tz: tan.y, rx: right.x, rz: right.y, dist: accum });
    }
    totalTrackLen = accum + filleted[m - 1].distanceTo(filleted[0]);
  }
  buildTrackSpline();

  function sampleTrackAt(s, laneOffset = 0) {
    const dist = ((s % totalTrackLen) + totalTrackLen) % totalTrackLen;
    const m = splineSamples.length;
    let idx = 0;
    for (let i = 0; i < m - 1; i++) {
      if (splineSamples[i + 1].dist >= dist) { idx = i; break; }
      idx = i;
    }
    const a = splineSamples[idx];
    const b = splineSamples[(idx + 1) % m];
    const segLen = (idx === m - 1) ? (totalTrackLen - a.dist) : (b.dist - a.dist);
    const t = segLen > 0.0001 ? Math.max(0, Math.min(1, (dist - a.dist) / segLen)) : 0;

    const cx = a.x + (b.x - a.x) * t;
    const cz = a.z + (b.z - a.z) * t;
    const tx = a.tx + (b.tx - a.tx) * t;
    const tz = a.tz + (b.tz - a.tz) * t;
    const lenT = Math.hypot(tx, tz) || 1;
    const ntx = tx / lenT;
    const ntz = tz / lenT;
    const rx = -ntz;
    const rz = ntx;

    return { x: cx + rx * laneOffset, z: cz + rz * laneOffset, tx: ntx, tz: ntz, rx, rz, yaw: Math.atan2(ntx, ntz) };
  }

  function isClearOfTrack(wx, wz, minDist = 14.0) {
    for (let i = 0; i < splineSamples.length; i += 2) {
      if (Math.hypot(wx - splineSamples[i].x, wz - splineSamples[i].z) < minDist) return false;
    }
    return true;
  }

  // ==================== 3. BUILDER MOBIL BALAP 3D (LOKAL SOLID & LAWAN TRANSPARAN JELAS) ====================
  const OPPONENT_PALETTE = ['#f43f5e', '#f59e0b', '#a855f7', '#10b981', '#ec4899', '#fb923c', '#22d3ee', '#eab308'];
  let opponentSlotCounter = 0;

  function createRaceCar(name, colorHex, isLocal = false, opponentSlot = 0) {
    const group = new THREE.Group();
    const resolvedHex = isLocal
      ? (colorHex || '#38bdf8')
      : (colorHex && colorHex.toLowerCase() !== '#38bdf8' ? colorHex : OPPONENT_PALETTE[opponentSlot % OPPONENT_PALETTE.length]);
    const mainColor = new THREE.Color(resolvedHex);

    const makeCarMat = (col, roughness, metalness = 0.15, opacity = 0.42) => {
      if (isLocal) {
        return new THREE.MeshStandardMaterial({ color: col, roughness, metalness });
      }
      return new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.22,
        roughness,
        metalness,
        transparent: true,
        opacity,
        depthWrite: false
      });
    };

    const bodyMat = makeCarMat(mainColor, 0.3, 0.2, 0.40);
    const darkMat = makeCarMat(0x1e293b, 0.6, 0.1, 0.46);
    const whiteMat = makeCarMat(0xffffff, 0.4, 0.1, 0.50);
    const glassMat = makeCarMat(0x38bdf8, 0.15, 0.3, 0.36);

    const chassisGeo = new THREE.BoxGeometry(2.3, 0.72, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.68;
    chassis.castShadow = isLocal;
    group.add(chassis);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 4.1), whiteMat);
    stripe.position.set(0, 1.06, 0);
    group.add(stripe);

    const cabinGeo = new THREE.BoxGeometry(1.75, 0.62, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.28, -0.15);
    group.add(cabin);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), whiteMat);
    wing.position.set(0, 1.5, -1.95);
    group.add(wing);

    // Outline tepi tegas warna unik untuk setiap lawan transparan agar tetap terpisah & mudah dibedakan (bukan ghost bertumpuk!)
    if (!isLocal) {
      const edgeMat = new THREE.LineBasicMaterial({
        color: mainColor,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      });
      const chassisEdges = new THREE.LineSegments(new THREE.EdgesGeometry(chassisGeo), edgeMat);
      chassisEdges.position.copy(chassis.position);
      group.add(chassisEdges);

      const cabinEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cabinGeo), edgeMat);
      cabinEdges.position.copy(cabin.position);
      group.add(cabinEdges);

      // Urutan render unik per lawan agar transparansi tidak pernah berkedip / saling menimpa
      const baseOrder = 10 + opponentSlot * 2;
      group.traverse((obj) => {
        if (obj.isMesh || obj.isLineSegments) obj.renderOrder = baseOrder;
      });
    }

    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 12);
    const wheels = [];
    [[-1.2, 1.4], [1.2, 1.4], [-1.2, -1.4], [1.2, -1.4]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.44, wz);
      if (!isLocal) w.renderOrder = 10 + opponentSlot * 2;
      group.add(w);
      wheels.push(w);
    });

    const turboFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 2.5, 8),
      new THREE.MeshBasicMaterial({ color: isLocal ? 0x38bdf8 : mainColor, transparent: true, opacity: isLocal ? 0.9 : 0.55, depthWrite: false })
    );
    turboFlame.rotation.x = -Math.PI / 2;
    turboFlame.position.set(0, 0.65, -3.4);
    turboFlame.visible = false;
    group.add(turboFlame);

    const nc = document.createElement('canvas');
    nc.width = 320; nc.height = 80;
    const nctx = nc.getContext('2d');
    nctx.fillStyle = isLocal ? 'rgba(56, 189, 248, 0.92)' : 'rgba(15, 23, 42, 0.86)';
    nctx.beginPath(); nctx.roundRect(8, 8, 304, 64, 20); nctx.fill();
    nctx.strokeStyle = isLocal ? '#ffffff' : resolvedHex;
    nctx.lineWidth = isLocal ? 4 : 6;
    nctx.stroke();
    nctx.fillStyle = isLocal ? '#0f172a' : '#ffffff';
    nctx.font = 'bold 30px sans-serif'; nctx.textAlign = 'center'; nctx.textBaseline = 'middle';
    nctx.fillText(name.slice(0, 14), 160, 42);
    const nameSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(nc), transparent: true, depthTest: false }));
    nameSpr.position.set(0, isLocal ? 2.85 : (2.75 + (opponentSlot % 3) * 0.42), 0);
    nameSpr.scale.set(3.4, 0.85, 1);
    nameSpr.renderOrder = 50 + opponentSlot;
    group.add(nameSpr);

    scene.add(group);
    return { group, wheels, turboFlame, colorHex: resolvedHex, slot: opponentSlot };
  }

  // ==================== 4. HELPER TEKSTUR PAPAN SOAL 3D TAJAM (HANYA DI PAPAN GERBANG!) ====================
  function makeQuestionBoardTexture(qNum, totalQ, lapNum, questionText) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 320;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(10, 10, 1004, 300, 30); ctx.fill();
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 12; ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LAP ${lapNum}/${TOTAL_LAPS} • SOAL ${qNum} DARI ${totalQ}`, 512, 66);

    // Bungkus teks hingga 3 baris besar & tajam agar mudah dibaca di layar HP!
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, sans-serif';
    const words = String(questionText || '').split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
      if ((cur + ' ' + w).trim().length <= 36) cur = (cur + ' ' + w).trim();
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);

    const startY = lines.length === 1 ? 195 : (lines.length === 2 ? 162 : 138);
    lines.slice(0, 3).forEach((ln, idx) => {
      ctx.fillText(ln, 512, startY + idx * 54);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makeLaneOptionTexture(letter, optText, hexColor) {
    const c = document.createElement('canvas');
    c.width = 384; c.height = 176;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(8, 8, 368, 160, 22); ctx.fill();
    ctx.strokeStyle = hexColor; ctx.lineWidth = 10; ctx.stroke();

    ctx.fillStyle = hexColor;
    ctx.beginPath(); ctx.roundRect(18, 22, 82, 132, 14); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, 59, 90);

    const txt = String(optText || '-').slice(0, 18);
    const fs = txt.length > 13 ? 30 : (txt.length > 9 ? 36 : 42);
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(txt, 236, 90);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // ==================== 5. BANGUN SIRKUIT 3D GRAND PRIX + 5 GERBANG DINAMIS (3 LAP = 15 SOAL!) ====================
  const trackGroup = new THREE.Group();
  scene.add(trackGroup);
  let gateVisualSlots = []; // 5 struktur gerbang 3D di sirkuit (teksturnya di-refresh tiap ganti Lap!)
  let allLapGates = [];     // 15 checkpoint gerbang sepanjang 3 lap: { globalIdx, lap, slotIdx, totalS, q, passed }

  // 5 posisi gerbang di sepanjang lintasan lurus sirkuit (0..1 per lap) agar papan soal terlihat lurus dari jauh!
  const GATE_FRACTIONS = [0.12, 0.30, 0.50, 0.70, 0.88];

  function buildGrandPrixCircuit(qList) {
    while (trackGroup.children.length > 0) trackGroup.remove(trackGroup.children[0]);
    gateVisualSlots = [];
    allLapGates = [];

    // Susun 15 soal (jika guru isi kurang dari 15, ulang secara siklis agar 3 lap x 5 gerbang selalu penuh!)
    const pool = (qList && qList.length > 0) ? qList : [{ question: '2 + 2 = ?', options: ['3', '4', '5'], correctIndex: 1 }];
    for (let lap = 0; lap < TOTAL_LAPS; lap++) {
      for (let slot = 0; slot < GATES_PER_LAP; slot++) {
        const gIdx = lap * GATES_PER_LAP + slot;
        const q = pool[gIdx % pool.length];
        allLapGates.push({
          globalIdx: gIdx,
          lap,
          slotIdx: slot,
          totalS: lap * totalTrackLen + GATE_FRACTIONS[slot] * totalTrackLen,
          q,
          passed: false
        });
      }
    }

    // 1. Rumput Hijau
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(CIRCUIT_SIZE + 140, CIRCUIT_SIZE + 140),
      new THREE.MeshStandardMaterial({ color: 0x5cc947, roughness: 0.9 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.05;
    grass.receiveShadow = true;
    trackGroup.add(grass);

    // 2. Lintasan Aspal & Kerb Merah-Putih (Menghadap +Y, DoubleSide)
    const m = splineSamples.length;
    const buildRibbon = (halfW, yPos) => {
      const pos = [], norm = [], uvs = [], idx = [];
      for (let i = 0; i <= m; i++) {
        const sp = splineSamples[i % m];
        const d = (i === m) ? totalTrackLen : sp.dist;
        pos.push(sp.x - sp.rx * halfW, yPos, sp.z - sp.rz * halfW);
        pos.push(sp.x + sp.rx * halfW, yPos, sp.z + sp.rz * halfW);
        norm.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, d * 0.08, 1, d * 0.08);
        if (i < m) {
          const b = i * 2;
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      return g;
    };

    const cc = document.createElement('canvas');
    cc.width = 64; cc.height = 128;
    const cctx = cc.getContext('2d');
    cctx.fillStyle = '#ef4444'; cctx.fillRect(0, 0, 64, 64);
    cctx.fillStyle = '#ffffff'; cctx.fillRect(0, 64, 64, 64);
    const curbTex = new THREE.CanvasTexture(cc);
    curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
    trackGroup.add(new THREE.Mesh(
      buildRibbon(TRACK_HALF_W + 1.15, 0.05),
      new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7, side: THREE.DoubleSide })
    ));

    const rc = document.createElement('canvas');
    rc.width = 256; rc.height = 256;
    const rctx = rc.getContext('2d');
    rctx.fillStyle = '#334155'; rctx.fillRect(0, 0, 256, 256);
    rctx.fillStyle = '#ffffff';
    rctx.fillRect(6, 0, 8, 256);
    rctx.fillRect(242, 0, 8, 256);
    rctx.fillStyle = 'rgba(255,255,255,0.75)';
    [86, 170].forEach(lx => { rctx.fillRect(lx, 18, 6, 92); rctx.fillRect(lx, 146, 6, 92); });
    const roadTex = new THREE.CanvasTexture(rc);
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.anisotropy = 4;
    const roadMesh = new THREE.Mesh(
      buildRibbon(TRACK_HALF_W, 0.12),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.75, side: THREE.DoubleSide })
    );
    roadMesh.receiveShadow = true;
    trackGroup.add(roadMesh);

    // 3. PAGAR BAN (Tire Barriers) di Tikungan & Guardrail Besi di Pinggir Jalan
    const tireGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.55, 10);
    const tireBlk = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const tireRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55 });
    const tireWht = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.4 });
    const barrierOff = TRACK_HALF_W + 2.4;

    for (let i = 0; i < m; i += 2) {
      const sp = splineSamples[i];
      const nextSp = splineSamples[(i + 2) % m];
      const turnAmt = Math.abs(sp.tx * nextSp.tz - sp.tz * nextSp.tx);
      const yaw = Math.atan2(sp.tx, sp.tz);

      [-1, 1].forEach(side => {
        const bx = sp.x + sp.rx * barrierOff * side;
        const bz = sp.z + sp.rz * barrierOff * side;
        if (turnAmt > 0.08) {
          const t1 = new THREE.Mesh(tireGeo, tireBlk); t1.position.set(bx, 0.28, bz); trackGroup.add(t1);
          const t2 = new THREE.Mesh(tireGeo, (i % 4 === 0) ? tireRed : tireWht); t2.position.set(bx, 0.84, bz); trackGroup.add(t2);
        } else if (i % 4 === 0) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 6.2), railMat);
          rail.position.set(bx, 0.52, bz); rail.rotation.y = yaw; trackGroup.add(rail);
        }
      });
    }

    // 4. Kolam Biru, Tribun & Pohon Candy (100% di LUAR jalan via isClearOfTrack!)
    const pondShape = new THREE.Shape();
    pondShape.absellipse(0, 0, 28, 10.5, 0, Math.PI * 2, false, 0);
    const pondGeo = new THREE.ShapeGeometry(pondShape, 28);
    pondGeo.rotateX(-Math.PI / 2);
    const pond = new THREE.Mesh(pondGeo, new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.15, side: THREE.DoubleSide }));
    pond.position.set(toX(0.64), 0.06, toZ(0.24));
    trackGroup.add(pond);

    const addStand = (ux, uz, len, col, rotY) => {
      const st = new THREE.Mesh(new THREE.BoxGeometry(len, 6.5, 11), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
      st.position.set(toX(ux), 3.25, toZ(uz)); st.rotation.y = rotY; st.castShadow = true;
      trackGroup.add(st);
    };
    addStand(0.32, 0.73, 52, 0xef4444, 0);
    addStand(0.62, 0.03, 62, 0x3b82f6, 0);
    addStand(0.30, 0.46, 36, 0xfacc15, Math.PI / 2);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9a653c });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.3 });
    const gateCoords = GATE_FRACTIONS.map(f => sampleTrackAt(f * totalTrackLen, 0));
    for (let gx = -105; gx <= 105; gx += 18) {
      for (let gz = -105; gz <= 105; gz += 18) {
        if (!isClearOfTrack(gx, gz, 19.5)) continue;
        if (gateCoords.some(gc => Math.hypot(gx - gc.x, gz - gc.z) < 28)) continue;
        if (Math.hypot(gx - toX(0.64), gz - toZ(0.24)) < 31) continue;
        if (Math.abs(gx - toX(0.32)) < 30 && Math.abs(gz - toZ(0.73)) < 12) continue;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.8, 8), trunkMat);
        tr.position.set(gx, 1.9, gz); trackGroup.add(tr);
        const cr = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), (gx + gz) % 36 === 0 ? leafMat2 : leafMat);
        cr.position.set(gx, 4.9, gz); trackGroup.add(cr);
      }
    }

    // 5. Garis Start/Finis Checkered di s = 0
    const startSample = sampleTrackAt(0, 0);
    const chC = document.createElement('canvas');
    chC.width = 128; chC.height = 256;
    const chCtx = chC.getContext('2d');
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) {
        chCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        chCtx.fillRect(c * 32, r * 32, 32, 32);
      }
    }
    const startLine = new THREE.Mesh(
      new THREE.PlaneGeometry(TRACK_HALF_W * 2, 3.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(chC), side: THREE.DoubleSide })
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.rotation.z = -startSample.yaw;
    startLine.position.set(startSample.x, 0.16, startSample.z);
    trackGroup.add(startLine);

    // 6. Bangun 5 Struktur Gerbang 3D (Papan Soal Besar + 3 Papan A/B/C yang Di-refresh tiap Lap!)
    const laneColors = [0xf43f5e, 0x0ea5e9, 0xf59e0b];
    const pilMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

    for (let slot = 0; slot < GATES_PER_LAP; slot++) {
      const gateS = GATE_FRACTIONS[slot] * totalTrackLen;
      const sp = sampleTrackAt(gateS, 0);
      const gateGrp = new THREE.Group();
      gateGrp.position.set(sp.x, 0, sp.z);
      gateGrp.rotation.y = sp.yaw;

      [-TRACK_HALF_W - 0.85, TRACK_HALF_W + 0.85].forEach(px => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.15, 9.2, 1.15), pilMat);
        pil.position.set(px, 4.6, 0);
        gateGrp.add(pil);
      });

      // Papan Soal Utama Raksasa & Tajam di Atas Gerbang
      const qMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const qBoard = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 2.8, 4.6), qMat);
      qBoard.position.set(0, 7.6, 0);
      qBoard.rotation.y = Math.PI;
      gateGrp.add(qBoard);

      // 3 Jalur Gerbang A (kiri), B (tengah), C (kanan) — sesuai sudut pandang pengemudi & deteksi jalur!
      const optMats = [];
      for (let lIdx = 0; lIdx < 3; lIdx++) {
        const lx = -LANE_OFFSETS[lIdx];
        const curtain = new THREE.Mesh(
          new THREE.PlaneGeometry(4.1, 3.6),
          new THREE.MeshBasicMaterial({ color: laneColors[lIdx], transparent: true, opacity: 0.24, side: THREE.DoubleSide })
        );
        curtain.position.set(lx, 1.85, 0);
        gateGrp.add(curtain);

        const oMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        const oBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 1.95), oMat);
        oBoard.position.set(lx, 4.35, 0);
        oBoard.rotation.y = Math.PI;
        gateGrp.add(oBoard);
        optMats.push(oMat);
      }

      // Garis Penanda Zona Pelambat Biru/Kuning di Aspal (45 unit sebelum gerbang!)
      const slowSp = sampleTrackAt(gateS - 45, 0);
      const slowStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_HALF_W * 2, 1.3),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
      );
      slowStrip.rotation.x = -Math.PI / 2;
      slowStrip.rotation.z = -slowSp.yaw;
      slowStrip.position.set(slowSp.x, 0.15, slowSp.z);
      trackGroup.add(slowStrip);

      trackGroup.add(gateGrp);
      gateVisualSlots.push({ slotIdx: slot, qMat, optMats });
    }

    refreshGateBoardsForLap(0);
  }

  // Perbarui seluruh 5 papan soal 3D di sirkuit sesuai Lap saat ini (Lap 1: #1-5, Lap 2: #6-10, Lap 3: #11-15!)
  function refreshGateBoardsForLap(lapIndex) {
    const clampedLap = Math.min(TOTAL_LAPS - 1, Math.max(0, lapIndex));
    const laneHex = ['#f43f5e', '#0ea5e9', '#f59e0b'];
    const letters = ['A', 'B', 'C'];

    for (let slot = 0; slot < GATES_PER_LAP; slot++) {
      const gObj = allLapGates[clampedLap * GATES_PER_LAP + slot];
      const vis = gateVisualSlots[slot];
      if (!gObj || !vis) continue;

      if (vis.qMat.map) vis.qMat.map.dispose();
      vis.qMat.map = makeQuestionBoardTexture(gObj.globalIdx + 1, TOTAL_GATES, clampedLap + 1, gObj.q.question);
      vis.qMat.needsUpdate = true;

      const opts = (gObj.q.options || ['A', 'B', 'C']).slice(0, 3);
      for (let l = 0; l < 3; l++) {
        if (vis.optMats[l].map) vis.optMats[l].map.dispose();
        vis.optMats[l].map = makeLaneOptionTexture(letters[l], opts[l], laneHex[l]);
        vis.optMats[l].needsUpdate = true;
      }
    }
  }

  // ==================== 6. STATE BALAPAN 3 LAP, KONTROL & SLOW-APPROACH ====================
  let socket = null;
  let questions = [];
  let raceState = 'LOBBY';
  let localCar = null;
  const remoteCars = {};

  const localState = {
    totalS: 0,      // Jarak total sepanjang 3 lap (0 .. totalTrackLen * 3)
    currentLap: 0,  // 0, 1, 2 -> tampil Lap 1/3, 2/3, 3/3
    laneX: 0,
    speed: 0,
    status: 'normal',
    turboTimer: 0,
    slowTimer: 0,
    correctCount: 0,
    finished: false
  };

  let steerInput = 0;
  let pointerDown = false;
  let prevPtr = { x: 0, y: 0 };
  let camYawOffset = 0;
  let camPitch = 0.24;

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  const bindHold = (id, dir) => {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); e.stopPropagation(); steerInput = dir; };
    const off = (e) => { e.preventDefault(); e.stopPropagation(); if (steerInput === dir) steerInput = 0; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off);
    el.addEventListener('touchcancel', off);
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  };
  bindHold('btn-steer-left', -1);
  bindHold('btn-steer-right', 1);

  const joyZone = document.getElementById('mobile-joystick-zone');
  const joyKnob = document.getElementById('mobile-joystick-knob');
  if (joyZone && joyKnob) {
    let joyTouchId = null, jBaseX = 0;
    const moveJoy = (cx) => {
      const dx = Math.max(-44, Math.min(44, cx - jBaseX));
      steerInput = dx / 44;
      joyKnob.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
    };
    const endJoy = () => { joyTouchId = null; steerInput = 0; joyKnob.style.transform = 'translate(-50%, -50%)'; };
    joyZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (joyTouchId !== null) return;
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      const r = joyZone.getBoundingClientRect(); jBaseX = r.left + r.width / 2;
      moveJoy(t.clientX);
    }, { passive: false });
    joyZone.addEventListener('touchmove', (e) => {
      if (joyTouchId === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          e.preventDefault();
          e.stopPropagation();
          moveJoy(t.clientX);
          break;
        }
      }
    }, { passive: false });
    const handleJoyEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) { endJoy(); break; }
      }
    };
    joyZone.addEventListener('touchend', handleJoyEnd);
    joyZone.addEventListener('touchcancel', handleJoyEnd);
  }

  // Geser Kamera Kanan / Kiri / Atas / Bawah — Mouse (PC) + Touch Multi-Sentuh (HP & Tablet!)
  container.addEventListener('mousedown', (e) => { pointerDown = true; prevPtr = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mousemove', (e) => {
    if (!pointerDown) return;
    camYawOffset -= (e.clientX - prevPtr.x) * 0.0055;
    camPitch = Math.max(-0.32, Math.min(1.15, camPitch + (e.clientY - prevPtr.y) * 0.0045));
    prevPtr = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => { pointerDown = false; });

  let camTouchId = null;
  let camTouchPrev = { x: 0, y: 0 };
  let lastCanvasTapTime = 0;

  container.addEventListener('touchstart', (e) => {
    if (camTouchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    // Jangan bajak sentuhan pada tombol HUD / joystick
    if (e.target && e.target.closest && e.target.closest('.hud-interactive, .mobile-controls, button, select, a')) return;
    e.preventDefault();
    camTouchId = t.identifier;
    camTouchPrev = { x: t.clientX, y: t.clientY };

    // Double-tap cepat di layar untuk reset kamera lurus ke belakang mobil
    const nowTap = performance.now();
    if (nowTap - lastCanvasTapTime < 280) {
      camYawOffset = 0;
      camPitch = 0.24;
    }
    lastCanvasTapTime = nowTap;
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (camTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === camTouchId) {
        e.preventDefault();
        const dx = t.clientX - camTouchPrev.x;
        const dy = t.clientY - camTouchPrev.y;
        camYawOffset -= dx * 0.0068;
        camPitch = Math.max(-0.32, Math.min(1.15, camPitch + dy * 0.0055));
        camTouchPrev = { x: t.clientX, y: t.clientY };
        break;
      }
    }
  }, { passive: false });

  const endCamTouch = (e) => {
    if (camTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === camTouchId) {
        camTouchId = null;
        break;
      }
    }
  };
  window.addEventListener('touchend', endCamTouch);
  window.addEventListener('touchcancel', endCamTouch);

  document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
    window.soundFX.enabled = !window.soundFX.enabled;
    e.target.textContent = window.soundFX.enabled ? 'SFX' : 'MUTE';
  });

  let toastTimer = null;
  function showRaceToast(text, isTurbo) {
    const el = document.getElementById('race-feedback-toast');
    el.textContent = text;
    el.className = isTurbo ? 'toast-turbo' : 'toast-slow';
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  }

  // ==================== 7. KONEKSI SOCKET.IO MULTIPLAYER MABAR 1 KELAS ====================
  socket = io({ transports: ['websocket', 'polling'] });
  const TOTAL_RACE_DIST = totalTrackLen * TOTAL_LAPS;

  socket.on('connect', () => {
    socket.emit('join_race', {
      gameId,
      serverCode: sessionStorage.getItem('eduverse_server_code') || 'PUBLIC',
      level: (document.getElementById('race-level-select') && document.getElementById('race-level-select').value) || 'sd',
      name: playerName,
      color: playerColor,
      role: isTeacher ? 'teacher' : 'student'
    }, (res) => {
      if (!res || !res.success) return;
      document.getElementById('race-title-label').textContent = res.title || 'Sirkuit Balap 3 Gerbang';
      questions = res.questions || [];
      buildGrandPrixCircuit(questions);

      localState.totalS = 0;
      localState.currentLap = 0;
      localState.laneX = 0;
      localCar = createRaceCar(playerName, playerColor, true);
      placeCarOnSpline(localCar, 0, 0);

      (res.players || []).forEach(p => { if (p.id !== socket.id) spawnRemoteCar(p); });
      updateStandingsUI();
    });
  });

  function placeCarOnSpline(carObj, s, laneX) {
    const sp = sampleTrackAt(s, laneX);
    carObj.group.position.set(sp.x, 0.14, sp.z);
    carObj.group.rotation.y = sp.yaw;
    return sp;
  }

  function spawnRemoteCar(p) {
    if (remoteCars[p.id]) return;
    const slot = opponentSlotCounter++;
    const car = createRaceCar(p.name, p.color, false, slot);
    const sInit = Math.max(0, Math.min(TOTAL_RACE_DIST, (-p.z / 440) * TOTAL_RACE_DIST));
    placeCarOnSpline(car, sInit, p.x || 0);
    remoteCars[p.id] = {
      car,
      slot,
      colorHex: car.colorHex,
      targetS: sInit,
      currS: sInit,
      targetLaneX: p.x || 0,
      currLaneX: p.x || 0,
      visLaneOffset: 0,
      speed: p.speed || 0,
      status: p.status || 'normal',
      name: p.name,
      finished: p.finished || false,
      finishTime: p.finishTime || null,
      correctCount: p.correctCount || 0
    };
  }

  socket.on('race_player_joined', (p) => { if (p.id !== socket.id) spawnRemoteCar(p); updateStandingsUI(); });
  socket.on('race_player_left', (id) => {
    if (remoteCars[id]) { scene.remove(remoteCars[id].car.group); delete remoteCars[id]; }
    updateStandingsUI();
  });
  socket.on('race_player_moved', (m) => {
    const rc = remoteCars[m.id];
    if (!rc) return;
    rc.targetS = Math.max(0, Math.min(TOTAL_RACE_DIST, (-m.z / 440) * TOTAL_RACE_DIST));
    rc.targetLaneX = Math.max(-5.2, Math.min(5.2, m.x || 0));
    rc.speed = m.speed || 0;
    rc.status = m.status;
    rc.correctCount = m.correctCount;
  });

  socket.on('race_countdown', (data) => {
    raceState = 'COUNTDOWN';
    document.getElementById('race-finish-modal').style.display = 'none';
    const rCtrl = document.getElementById('race-controls-wrap');
    if (rCtrl) rCtrl.style.display = 'none';

    localState.totalS = 0;
    localState.currentLap = 0;
    localState.laneX = 0;
    localState.speed = 0;
    localState.turboTimer = 0;
    localState.slowTimer = 0;
    localState.status = 'normal';
    localState.correctCount = 0;
    localState.finished = false;
    allLapGates.forEach(g => { g.passed = false; });
    refreshGateBoardsForLap(0);
    if (localCar) placeCarOnSpline(localCar, 0, 0);

    // Pastikan seluruh pembalap lain terlihat bersamaan di garis start!
    if (data && Array.isArray(data.players)) {
      data.players.forEach(p => {
        if (p.id !== socket.id && !remoteCars[p.id]) spawnRemoteCar(p);
      });
    }
    for (const id in remoteCars) {
      const rc = remoteCars[id];
      rc.currS = 0;
      rc.targetS = 0;
      rc.currLaneX = 0;
      rc.targetLaneX = 0;
      rc.visLaneOffset = 0;
      rc.speed = 0;
      rc.status = 'normal';
      rc.correctCount = 0;
      placeCarOnSpline(rc.car, 0, 0);
    }
    updateStandingsUI();

    const banner = document.getElementById('race-countdown-banner');
    let sec = 3;
    banner.style.display = 'block';
    banner.textContent = sec;
    window.soundFX.tick();
    const iv = setInterval(() => {
      sec--;
      if (sec > 0) { banner.textContent = sec; window.soundFX.urgentTick(); }
      else clearInterval(iv);
    }, 1000);
  });

  socket.on('race_go', () => {
    raceState = 'RACING';
    const banner = document.getElementById('race-countdown-banner');
    banner.textContent = 'GO!! ';
    window.soundFX.correct();
    setTimeout(() => { banner.style.display = 'none'; }, 900);
  });

  socket.on('race_standings_updated', (data) => {
    if (localState.finished) renderFinishModal(data.standings);
  });

  const raceLevelSelect = document.getElementById('race-level-select');
  if (raceLevelSelect) {
    raceLevelSelect.addEventListener('change', () => {
      socket.emit('race_set_level', { level: raceLevelSelect.value });
    });
  }
  socket.on('race_level_changed', (data) => {
    if (raceLevelSelect && data && data.level) raceLevelSelect.value = data.level;
    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
      questions = data.questions;
      if (typeof buildGates === 'function') buildGates(questions);
    }
  });
  document.getElementById('btn-race-start').addEventListener('click', () => socket.emit('race_start'));
  document.getElementById('btn-race-again').addEventListener('click', () => socket.emit('race_start'));

  function renderFinishModal(standings) {
    const listEl = document.getElementById('finish-standings-list');
    listEl.innerHTML = '';
    const medals = ['#1', '#2', '#3'];
    (standings || []).forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:0.45rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.92rem;';
      row.innerHTML = `
        <span><strong>${medals[i] || '#' + (i + 1)}</strong> ${s.name} ${s.id === socket.id ? '(Anda)' : ''}</span>
        <span style="color:#38bdf8; font-weight:800;">${s.finished ? s.finishTime + ' dtk' : 'Melaju...'} (${s.correctCount}/${TOTAL_GATES})</span>
      `;
      listEl.appendChild(row);
    });
    document.getElementById('race-finish-modal').style.display = 'flex';
  }

  function updateStandingsUI() {
    const all = [{ name: playerName, s: localState.totalS, isMe: true, color: '#38bdf8', correct: localState.correctCount }];
    for (const id in remoteCars) {
      all.push({ name: remoteCars[id].name, s: remoteCars[id].currS, isMe: false, color: remoteCars[id].colorHex || '#f43f5e', correct: remoteCars[id].correctCount });
    }
    all.sort((a, b) => b.s - a.s);
    document.getElementById('race-player-count').textContent = `(${all.length})`;
    document.getElementById('race-rank-list').innerHTML = all.slice(0, 6).map((r, i) => `
      <div class="rank-item" style="${r.isMe ? 'color:#fde047; font-weight:800;' : ''}">
        <span style="display:inline-flex; align-items:center; gap:0.35rem;"><span style="width:8px; height:8px; border-radius:50%; background:${r.color}; display:inline-block; flex-shrink:0;"></span>#${i + 1} ${r.name}</span>
        <span>${Math.min(100, Math.round((r.s / TOTAL_RACE_DIST) * 100))}%</span>
      </div>
    `).join('');
  }

  // ==================== 8. RADAR MINI-MAP SIRKUIT REAL-TIME ====================
  const radarCanvas = document.getElementById('race-circuit-radar');
  const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
  function drawCircuitRadar() {
    if (!radarCtx) return;
    const W = radarCanvas.width, H = radarCanvas.height;
    const s = W / 92; // Skala otomatis untuk resolusi retina 184x184
    radarCtx.clearRect(0, 0, W, H);
    radarCtx.fillStyle = '#0f172a';
    radarCtx.fillRect(0, 0, W, H);
    const pad = 10 * s;
    const mx = (wx) => pad + ((wx - ORIGIN_X) / CIRCUIT_SIZE) * (W - pad * 2);
    const mz = (wz) => pad + ((wz - ORIGIN_Z) / CIRCUIT_SIZE) * (H - pad * 2);

    // Lintasan luar & dalam agar kontras tajam
    radarCtx.lineJoin = 'round';
    radarCtx.lineCap = 'round';
    radarCtx.strokeStyle = '#334155';
    radarCtx.lineWidth = 6.5 * s;
    radarCtx.beginPath();
    splineSamples.forEach((sp, i) => {
      if (i === 0) radarCtx.moveTo(mx(sp.x), mz(sp.z));
      else radarCtx.lineTo(mx(sp.x), mz(sp.z));
    });
    radarCtx.closePath();
    radarCtx.stroke();

    radarCtx.strokeStyle = '#64748b';
    radarCtx.lineWidth = 3.8 * s;
    radarCtx.stroke();

    // Penanda Garis Start/Finish
    const startSp = sampleTrackAt(0, 0);
    radarCtx.fillStyle = '#ffffff';
    radarCtx.fillRect(mx(startSp.x) - 3.5 * s, mz(startSp.z) - 1.5 * s, 7 * s, 3 * s);

    // 5 Titik Gerbang Lap aktif (Kuning=belum, Hijau=sudah)
    const lapBase = localState.currentLap * GATES_PER_LAP;
    for (let slot = 0; slot < GATES_PER_LAP; slot++) {
      const g = allLapGates[lapBase + slot];
      if (!g) continue;
      const sp = sampleTrackAt(g.totalS, 0);
      radarCtx.fillStyle = g.passed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(250, 204, 21, 0.8)';
      radarCtx.beginPath();
      radarCtx.arc(mx(sp.x), mz(sp.z), 2.2 * s, 0, Math.PI * 2);
      radarCtx.fill();
    }

    // Marker Lawan (masing-masing warna unik + fan-out tipis jika berdekatan agar selalu terpisah jelas!)
    const placedOpponents = [];
    for (const id in remoteCars) {
      const rc = remoteCars[id];
      const pos = rc.car.group.position;
      let ox = mx(pos.x);
      let oz = mz(pos.z);

      // Jika 2 lawan sangat berdekatan di minimap, beri geseran mikro agar keduanya tetap terlihat terpisah
      let overlapCount = 0;
      for (const prev of placedOpponents) {
        if (Math.hypot(ox - prev.x, oz - prev.z) < 5.5 * s) overlapCount++;
      }
      if (overlapCount > 0) {
        const ang = overlapCount * 2.1;
        ox += Math.cos(ang) * 3.0 * s;
        oz += Math.sin(ang) * 3.0 * s;
      }
      placedOpponents.push({ x: ox, z: oz });

      radarCtx.fillStyle = rc.colorHex || '#f43f5e';
      radarCtx.strokeStyle = '#0f172a';
      radarCtx.lineWidth = 1.6 * s;
      radarCtx.beginPath();
      radarCtx.arc(ox, oz, 3.3 * s, 0, Math.PI * 2);
      radarCtx.fill();
      radarCtx.stroke();
    }

    // Marker Pemain Lokal (Panah arah cyan terang + halo berdenyut — selalu di atas & mudah dibedakan!)
    if (localCar) {
      const lx = mx(localCar.group.position.x);
      const lz = mz(localCar.group.position.z);
      const pulse = 5.4 * s + Math.sin(performance.now() * 0.008) * 1.1 * s;

      // Halo luar
      radarCtx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      radarCtx.beginPath();
      radarCtx.arc(lx, lz, pulse, 0, Math.PI * 2);
      radarCtx.fill();

      // Panah arah hadap mobil pemain
      const yaw = localCar.group.rotation.y;
      const heading = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      radarCtx.save();
      radarCtx.translate(lx, lz);
      // Di canvas minimap: +X = kanan, +Z = bawah; vektor maju mobil adalah (sin(yaw), cos(yaw))
      radarCtx.rotate(Math.atan2(Math.cos(heading), Math.sin(heading)));
      radarCtx.fillStyle = '#38bdf8';
      radarCtx.strokeStyle = '#ffffff';
      radarCtx.lineWidth = 1.6 * s;
      radarCtx.beginPath();
      radarCtx.moveTo(5.2 * s, 0);
      radarCtx.lineTo(-3.6 * s, -3.5 * s);
      radarCtx.lineTo(-2.0 * s, 0);
      radarCtx.lineTo(-3.6 * s, 3.5 * s);
      radarCtx.closePath();
      radarCtx.fill();
      radarCtx.stroke();
      radarCtx.restore();
    }
  }

  // ==================== 9. MAIN LOOP 60 FPS (MELAMBAT HALUS SEBELUM GERBANG + 3 LAP!) ====================
  let lastEmit = 0;
  let lastRankUI = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (localCar) {
      let approachingGate = false;

      if (raceState === 'RACING' && !localState.finished) {
        if (localState.turboTimer > 0) {
          localState.turboTimer -= dt;
          if (localState.turboTimer <= 0) localState.status = 'normal';
        }
        if (localState.slowTimer > 0) {
          localState.slowTimer -= dt;
          if (localState.slowTimer <= 0) localState.status = 'normal';
        }

        // Cek jarak ke Gerbang Soal berikutnya yang belum dilewati!
        let nextGate = null;
        for (const g of allLapGates) {
          if (!g.passed) { nextGate = g; break; }
        }

        const distToGate = nextGate ? (nextGate.totalS - localState.totalS) : 999;
        // ZONA MELAMBAT HALUS: 48 unit sebelum gerbang -> kecepatan turun nyaman (~11.5 u/s) agar sempat baca papan 3D & pilih gerbang!
        approachingGate = (distToGate > 0 && distToGate <= 48);

        let targetSpeed = localState.status === 'turbo' ? 49 : (localState.status === 'slow' ? 14 : 33);
        if (approachingGate) {
          // Makin dekat gerbang, makin halus melambat (sekitar 45-55 KM/H) supaya sangat nyaman membaca papan 3D & belok!
          targetSpeed = Math.min(targetSpeed, 11.5);
        }

        localState.speed += (targetSpeed - localState.speed) * Math.min(1, dt * 4.5);
        localState.totalS += localState.speed * dt;

        // Belok mulus kiri / tengah / kanan antar 3 jalur Gerbang A, B, C
        let steer = steerInput;
        if (keys.KeyA || keys.ArrowLeft) steer = -1;
        if (keys.KeyD || keys.ArrowRight) steer = 1;
        if (Math.abs(steer) > 0.05) {
          localState.laneX = Math.max(-5.2, Math.min(5.2, localState.laneX + steer * 13.5 * dt));
        }

        // Cek melewati Gerbang Soal!
        if (nextGate && localState.totalS >= nextGate.totalS) {
          nextGate.passed = true;
          const chosenLane = localState.laneX < -1.85 ? 0 : (localState.laneX > 1.85 ? 2 : 1);
          const correctIdx = (nextGate.q.correctIndex !== undefined ? nextGate.q.correctIndex : 0) % 3;

          if (chosenLane === correctIdx) {
            localState.correctCount++;
            localState.turboTimer = 4.0;
            localState.slowTimer = 0;
            localState.status = 'turbo';
            localState.speed = 48;
            window.soundFX.correct();
            showRaceToast('BENAR! TURBO BOOST 215 KM/H! ', true);
          } else {
            localState.slowTimer = 3.2;
            localState.turboTimer = 0;
            localState.status = 'slow';
            localState.speed = 13;
            window.soundFX.wrong();
            const rightOpt = (nextGate.q.options && nextGate.q.options[correctIdx]) || ['A', 'B', 'C'][correctIdx];
            showRaceToast(`SALAH! Jawaban: ${rightOpt}`, false);
          }
        }

        // Cek Pergantian Lap (Lap 1 -> Lap 2 -> Lap 3) & Refresh Papan 5 Gerbang!
        const newLap = Math.min(TOTAL_LAPS - 1, Math.floor(localState.totalS / totalTrackLen));
        if (newLap > localState.currentLap) {
          localState.currentLap = newLap;
          refreshGateBoardsForLap(newLap);
          window.soundFX.correct();
          showRaceToast(
            newLap === TOTAL_LAPS - 1
              ? 'FINAL LAP 3/3! 5 Gerbang Terakhir!'
              : `LAP ${newLap + 1}/${TOTAL_LAPS}! 5 Gerbang Soal Baru!`,
            true
          );
        }

        // Cek Finis Lap 3 (15 Soal Selesai!)
        if (localState.totalS >= TOTAL_RACE_DIST) {
          localState.totalS = TOTAL_RACE_DIST;
          localState.finished = true;
          localState.speed = 0;
          window.soundFX.victory();
          socket.emit('race_finish', { correctCount: localState.correctCount });
        }
      }

      const sp = placeCarOnSpline(localCar, localState.totalS, localState.laneX);
      localCar.turboFlame.visible = (localState.status === 'turbo' && localState.speed > 20);
      localCar.wheels.forEach(w => { w.rotation.x += localState.speed * dt * 1.4; });

      // Update Speedometer, Lap & Progress HUD
      const kmh = Math.round(localState.speed * 4.4);
      const speedEl = document.getElementById('hud-speed-val');
      speedEl.textContent = kmh;
      speedEl.className = 'speed-val ' + (localState.status === 'turbo' ? 'speed-turbo' : (localState.status === 'slow' ? 'speed-slow' : ''));

      const lapEl = document.getElementById('hud-lap-label');
      if (lapEl) lapEl.textContent = `Lap ${Math.min(TOTAL_LAPS, localState.currentLap + 1)}/${TOTAL_LAPS}`;

      const pct = Math.min(100, Math.round((localState.totalS / TOTAL_RACE_DIST) * 100));
      document.getElementById('hud-progress-pct').textContent = `${pct}%`;
      document.getElementById('hud-progress-fill').style.width = `${pct}%`;
      document.getElementById('hud-correct-gates').textContent = `${localState.correctCount}/${TOTAL_GATES}`;

      // Kamera mengikuti di belakang mobil + mendukung geser kanan/kiri/atas/bawah (HP, Tablet & PC) agar papan soal 3D mudah dilihat!
      const camYaw = sp.yaw + Math.PI + camYawOffset;
      const lookYaw = sp.yaw + camYawOffset;
      const dist = approachingGate ? 11.2 : 12.6;
      const pitchLookBoost = (0.24 - camPitch) * 6.5;
      const lookY = Math.max(1.2, Math.min(9.5, (approachingGate ? 4.4 : 2.6) + pitchLookBoost));
      const camX = sp.x + Math.sin(camYaw) * Math.cos(camPitch) * dist;
      const camY = Math.max(1.6, (approachingGate ? 2.8 : 3.4) + Math.sin(camPitch) * dist);
      const camZ = sp.z + Math.cos(camYaw) * Math.cos(camPitch) * dist;
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 10));
      camera.lookAt(sp.x + Math.sin(lookYaw) * 16, lookY, sp.z + Math.cos(lookYaw) * 16);

      // Kirim posisi ke server secara real-time (~30Hz, Mabar 1 Kelas!)
      const now = performance.now();
      if (socket && socket.connected && now - lastEmit > 33) {
        lastEmit = now;
        socket.emit('race_update', {
          x: Math.round(localState.laneX * 100) / 100,
          z: Math.round((-(localState.totalS / TOTAL_RACE_DIST) * 440) * 100) / 100,
          speed: localState.speed,
          status: localState.status,
          correctCount: localState.correctCount
        });
      }
      if (now - lastRankUI > 180) {
        lastRankUI = now;
        updateStandingsUI();
      }
    }

    // Interpolasi Mobil Lawan (Transparan, tanpa halangan tabrakan, dan terpisah visual secara halus saat berdekatan!)
    const smoothRemote = 1 - Math.exp(-14 * dt);
    const remoteList = Object.values(remoteCars);
    for (let i = 0; i < remoteList.length; i++) {
      const rc = remoteList[i];
      rc.currS += (rc.targetS - rc.currS) * smoothRemote;
      rc.currLaneX += (rc.targetLaneX - rc.currLaneX) * smoothRemote;

      // Hitung geseran visual tipis jika 2 mobil lawan berada di koordinat hampir sama agar tetap terlihat sebagai 2 mobil terpisah
      let desiredOffset = 0;
      for (let j = 0; j < remoteList.length; j++) {
        if (i === j) continue;
        const other = remoteList[j];
        const ds = Math.abs(rc.currS - other.currS);
        const dl = Math.abs(rc.currLaneX - other.currLaneX);
        if (ds < 4.5 && dl < 2.2) {
          const dir = (rc.slot % 2 === 0 ? 1 : -1) * (i < j ? -1 : 1);
          desiredOffset += dir * 1.15;
        }
      }
      desiredOffset = Math.max(-1.6, Math.min(1.6, desiredOffset));
      rc.visLaneOffset += (desiredOffset - (rc.visLaneOffset || 0)) * smoothRemote;

      const finalLane = Math.max(-5.2, Math.min(5.2, rc.currLaneX + rc.visLaneOffset));
      placeCarOnSpline(rc.car, rc.currS, finalLane);
      rc.car.turboFlame.visible = (rc.status === 'turbo');
      const wheelSpin = (rc.speed || 0) * dt * 0.45;
      if (wheelSpin > 0.01) rc.car.wheels.forEach(w => { w.rotation.x += wheelSpin; });
    }

    drawCircuitRadar();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
});
