// 3D World Engine: Three.js Environment, Arena, Answer Platforms (A, B, C, D), Jumbotron & Particle Systems

class World3D {
  constructor(canvasContainer, gameId = 'mg-01') {
    this.container = canvasContainer;
    this.gameId = gameId;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Arena elements
    this.platforms = []; // [Zone A, Zone B, Zone C, Zone D]
    this.jumbotronCanvas = null;
    this.jumbotronTexture = null;
    this.jumbotronMesh = null;

    // Animated theme decorations (Matahari/Planet untuk mg-02, Atom/Tabung untuk mg-03)
    this.themeSpinners = [];

    // Particle systems
    this.fireworks = [];
    this.ambientParticles = null;

    // Platform zone boundaries (for stepping detection)
    this.zoneBounds = [];

    this.init();
  }

  init() {
    // 1. Scene & Tema Langit per Mini Game
    this.scene = new THREE.Scene();
    if (this.gameId === 'mg-02') {
      // Observatorium Tata Surya: Luar Angkasa Gelap Berbintang
      this.scene.background = new THREE.Color(0x050816);
      this.scene.fog = new THREE.FogExp2(0x050816, 0.008);
    } else if (this.gameId === 'mg-03') {
      // Lab Reaksi Kimia: Laboratorium Futuristik Neon
      this.scene.background = new THREE.Color(0x0b132b);
      this.scene.fog = new THREE.FogExp2(0x0b132b, 0.011);
    } else {
      // Stadium Kuis Lari 3D: Langit Biru Cerah
      this.scene.background = new THREE.Color(0x90e0ef);
      this.scene.fog = new THREE.FogExp2(0x90e0ef, 0.015);
    }

    // 2. Camera (Third-person setup)
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(0, 10, 18);

    // 3. Renderer Ultra-Ringan di HP (1x DPR, tanpa shadow pass ganda & tanpa MSAA berat)
    const isMobile = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance', stencil: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !isMobile;
    if (!isMobile) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Environment sesuai Tema Mini Game
    if (this.gameId === 'mg-02') {
      this.buildSpaceObservatoryArena();
    } else if (this.gameId === 'mg-03') {
      this.buildChemistryLabArena();
    } else {
      this.buildStadiumArena();
    }

    // 6. 4 Answer Platforms (A, B, C, D) + Dekorasi Tema di atas setiap Platform
    this.buildAnswerPlatforms();

    // 7. Giant Jumbotron Screen
    this.buildJumbotron();

    // 8. Ambient floating sparkles / starfield
    this.createAmbientParticles();

    // 9. Resize Listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);

    // Main Sunlight with shadow
    const sun = new THREE.DirectionalLight(0xfff8e7, 0.85);
    sun.position.set(25, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    const d = 30;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Soft Blue Fill Light from opposite direction
    const fillLight = new THREE.DirectionalLight(0x90e0ef, 0.35);
    fillLight.position.set(-20, 15, -20);
    this.scene.add(fillLight);
  }

  buildStadiumArena() {
    // Main circular floating island floor
    const islandRadius = 32;
    const islandHeight = 4;
    const floorGeo = new THREE.CylinderGeometry(islandRadius, islandRadius + 2, islandHeight, 48);
    
    // Top Grass Material
    const topMat = new THREE.MeshLambertMaterial({ color: 0x48cae4 }); // Futuristic Cyan/Turquoise Grid
    const sideMat = new THREE.MeshLambertMaterial({ color: 0x023e8a }); // Deep Cyber Blue Base
    const materials = [sideMat, topMat, sideMat];

    const floor = new THREE.Mesh(floorGeo, materials);
    floor.position.y = -islandHeight / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Running track / circle border
    const trackGeo = new THREE.RingGeometry(islandRadius - 1.2, islandRadius, 48);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.y = 0.02;
    this.scene.add(trackMesh);

    // Inner lobby circular spawn ring
    const lobbyRingGeo = new THREE.RingGeometry(7.8, 8.2, 32);
    const lobbyRingMat = new THREE.MeshBasicMaterial({ color: 0xffe600, side: THREE.DoubleSide });
    const lobbyRing = new THREE.Mesh(lobbyRingGeo, lobbyRingMat);
    lobbyRing.rotation.x = -Math.PI / 2;
    lobbyRing.position.y = 0.02;
    this.scene.add(lobbyRing);

    // Low-poly Decorative Trees & Crystals around the border
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      // Skip area near Jumbotron (around angle -PI/2)
      if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) continue;

      const r = islandRadius - 4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      this.createStylizedTree(x, z);
    }
  }

  createStylizedTree(x, z) {
    const treeGroup = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage (stylized cones / spheres)
    const folGeo1 = new THREE.ConeGeometry(1.8, 2.5, 7);
    const folMat1 = new THREE.MeshLambertMaterial({ color: 0x38b000 });
    const fol1 = new THREE.Mesh(folGeo1, folMat1);
    fol1.position.y = 2.8;
    fol1.castShadow = true;
    treeGroup.add(fol1);

    const folGeo2 = new THREE.ConeGeometry(1.3, 2.0, 7);
    const folMat2 = new THREE.MeshLambertMaterial({ color: 0x70e000 });
    const fol2 = new THREE.Mesh(folGeo2, folMat2);
    fol2.position.y = 4.0;
    fol2.castShadow = true;
    treeGroup.add(fol2);

    treeGroup.position.set(x, 0, z);
    treeGroup.scale.setScalar(0.8 + Math.random() * 0.4);
    this.scene.add(treeGroup);
  }

  // ==================== TEMA MINI GAME #02: OBSERVATORIUM TATA SURYA ====================
  buildSpaceObservatoryArena() {
    // Dek Stasiun Luar Angkasa Melayang
    const deckGeo = new THREE.CylinderGeometry(32, 30, 3, 48);
    const deckTop = new THREE.MeshLambertMaterial({ color: 0x1e1b4b });
    const deckSide = new THREE.MeshLambertMaterial({ color: 0x312e81 });
    const deck = new THREE.Mesh(deckGeo, [deckSide, deckTop, deckSide]);
    deck.position.y = -1.5;
    deck.receiveShadow = true;
    this.scene.add(deck);

    // Garis Orbit Hologram Bercahaya di Lantai
    [9, 17, 25, 31].forEach((r, idx) => {
      const orbit = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.15, r + 0.15, 64),
        new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x38bdf8 : 0xa78bfa, side: THREE.DoubleSide })
      );
      orbit.rotation.x = -Math.PI / 2;
      orbit.position.y = 0.03;
      this.scene.add(orbit);
    });

    // Matahari Mini Berpijar Mengambang di Tengah Atas Arena
    const sunGroup = new THREE.Group();
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 24, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    sunGroup.add(sunMesh);

    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(3.3, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.3 })
    );
    sunGroup.add(corona);

    const sunRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.12, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sunRing.rotation.x = Math.PI / 2.4;
    sunGroup.add(sunRing);

    sunGroup.position.set(0, 9.5, 4.5);
    this.scene.add(sunGroup);
    this.themeSpinners.push({ mesh: sunGroup, speedY: 0.6, speedX: 0.15 });

    // Bintang-bintang Galaksi 3D di sekeliling kubah langit
    const starCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 65 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = 10 + Math.abs(r * Math.cos(phi));
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.75 }));
    this.scene.add(stars);
  }

  // ==================== TEMA MINI GAME #03: LAB REAKSI KIMIA ====================
  buildChemistryLabArena() {
    // Lantai Laboratorium Futuristik + Grid Neon
    const labFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(32, 32, 3, 8),
      [
        new THREE.MeshLambertMaterial({ color: 0x1e293b }),
        new THREE.MeshLambertMaterial({ color: 0x0f172a }),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      ]
    );
    labFloor.position.y = -1.5;
    labFloor.receiveShadow = true;
    this.scene.add(labFloor);

    const gridHelper = new THREE.GridHelper(56, 28, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0.03;
    this.scene.add(gridHelper);

    // 6 Pilar Kaca Laboratorium di Tepi Ruangan
    const colColors = [0x06b6d4, 0x10b981, 0x3b82f6, 0xf59e0b, 0xec4899, 0x8b5cf6];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      if (Math.sin(a) < -0.65) continue; // Jangan halangi Jumbotron
      const pillar = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.2, 12), new THREE.MeshLambertMaterial({ color: 0x334155 }));
      base.position.y = 0.6;
      pillar.add(base);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 8, 16),
        new THREE.MeshBasicMaterial({ color: colColors[i], transparent: true, opacity: 0.28 })
      );
      glass.position.y = 5.2;
      pillar.add(glass);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.4, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0x334155 }));
      top.position.y = 9.5;
      pillar.add(top);

      pillar.position.set(Math.cos(a) * 26, 0, Math.sin(a) * 26);
      this.scene.add(pillar);
    }

    // Model Atom 3D Raksasa Berputar di Tengah Atas Lab
    const atomGroup = new THREE.Group();
    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    atomGroup.add(nucleus);

    [0, Math.PI / 3, -Math.PI / 3].forEach((tilt, idx) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.8, 0.1, 8, 36),
        new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x38bdf8 : (idx === 1 ? 0x10b981 : 0xf43f5e) })
      );
      ring.rotation.x = Math.PI / 2 + tilt;
      ring.rotation.y = tilt;
      atomGroup.add(ring);
    });

    atomGroup.position.set(0, 9.2, 4.5);
    this.scene.add(atomGroup);
    this.themeSpinners.push({ mesh: atomGroup, speedY: 1.1, speedX: 0.45 });
  }

  // 4 Interactive Answer Platforms
  buildAnswerPlatforms() {
    // 4 positions in quadrant:
    // A: Top-Left (-13, -4), B: Top-Right (13, -4)
    // C: Bottom-Left (-13, 11), D: Bottom-Right (13, 11)
    const platformConfigs = [
      { id: 'A', name: 'Zona A', color: 0xff3366, glowColor: 0xff758f, x: -12.5, z: -3 },
      { id: 'B', name: 'Zona B', color: 0x0096c7, glowColor: 0x48cae4, x: 12.5, z: -3 },
      { id: 'C', name: 'Zona C', color: 0xffb703, glowColor: 0xffd166, x: -12.5, z: 12 },
      { id: 'D', name: 'Zona D', color: 0x06d6a0, glowColor: 0x52b788, x: 12.5, z: 12 }
    ];

    const platformSize = 9.5;
    const platformHeight = 0.5;

    platformConfigs.forEach((cfg, idx) => {
      const group = new THREE.Group();

      // Base Pad
      const padGeo = new THREE.BoxGeometry(platformSize, platformHeight, platformSize);
      const padMat = new THREE.MeshLambertMaterial({ color: cfg.color });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = platformHeight / 2;
      pad.receiveShadow = true;
      pad.castShadow = true;
      group.add(pad);

      // Glowing Neon Rim
      const rimGeo = new THREE.RingGeometry(platformSize * 0.52, platformSize * 0.56, 4);
      const rimMat = new THREE.MeshBasicMaterial({ color: cfg.glowColor, side: THREE.DoubleSide });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.rotation.z = Math.PI / 4;
      rim.position.y = platformHeight + 0.03;
      group.add(rim);

      // Dekorasi 3D Khusus Tema per Mini Game
      if (this.gameId === 'mg-02') {
        // Planet 3D Berputar di atas setiap Zona Jawaban (Mars, Neptunus, Saturnus, Bumi)
        const planetGroup = new THREE.Group();
        const planetSphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 18, 14),
          new THREE.MeshLambertMaterial({ color: cfg.color })
        );
        planetGroup.add(planetSphere);
        if (idx === 2 || idx === 1) {
          // Cincin Saturnus / Planet Bercincin
          const pRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.1, 0.16, 6, 28),
            new THREE.MeshBasicMaterial({ color: cfg.glowColor })
          );
          pRing.rotation.x = Math.PI / 2.4;
          planetGroup.add(pRing);
        }
        planetGroup.position.set(0, 6.6, 0);
        group.add(planetGroup);
        this.themeSpinners.push({ mesh: planetGroup, speedY: 0.9, speedX: 0 });
      } else if (this.gameId === 'mg-03') {
        // Tabung Reaksi Kaca Raksasa Terbuka mengelilingi Zona Jawaban
        const tubeWall = new THREE.Mesh(
          new THREE.CylinderGeometry(4.4, 4.4, 3.6, 24, 1, true),
          new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
        );
        tubeWall.position.y = 2.1;
        group.add(tubeWall);

        const tubeRimTop = new THREE.Mesh(
          new THREE.TorusGeometry(4.4, 0.14, 8, 28),
          new THREE.MeshBasicMaterial({ color: cfg.glowColor })
        );
        tubeRimTop.rotation.x = Math.PI / 2;
        tubeRimTop.position.y = 3.9;
        group.add(tubeRimTop);
      }

      // Huruf A/B/C/D besar tercetak langsung di permukaan lantai platform (jelas saat dilihat dari atas!)
      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = 256;
      floorCanvas.height = 256;
      const fCtx = floorCanvas.getContext('2d');
      fCtx.clearRect(0, 0, 256, 256);
      fCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      fCtx.beginPath();
      fCtx.arc(128, 128, 105, 0, Math.PI * 2);
      fCtx.fill();
      fCtx.fillStyle = '#ffffff';
      fCtx.font = 'bold 150px sans-serif';
      fCtx.textAlign = 'center';
      fCtx.textBaseline = 'middle';
      fCtx.fillText(cfg.id, 128, 138);

      const floorDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(platformSize * 0.72, platformSize * 0.72),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(floorCanvas), transparent: true })
      );
      floorDecal.rotation.x = -Math.PI / 2;
      floorDecal.position.y = platformHeight + 0.04;
      group.add(floorDecal);

      // Papan Jawaban 3D Besar & Tajam di atas setiap Platform (Huruf + Teks Jawaban jadi satu papan kontras tinggi!)
      const optCanvas = document.createElement('canvas');
      optCanvas.width = 640;
      optCanvas.height = 220;
      const optTex = new THREE.CanvasTexture(optCanvas);
      const optSpriteMat = new THREE.SpriteMaterial({ map: optTex, transparent: true });
      const optSprite = new THREE.Sprite(optSpriteMat);
      optSprite.position.set(0, 4.3, 0);
      optSprite.scale.set(9.4, 3.25, 1);
      group.add(optSprite);

      group.position.set(cfg.x, 0, cfg.z);
      this.scene.add(group);

      // Save reference
      const pObj = {
        index: idx,
        id: cfg.id,
        group: group,
        padMesh: pad,
        originalColor: cfg.color,
        glowColor: cfg.glowColor,
        optCanvas: optCanvas,
        optTex: optTex,
        optSprite: optSprite,
        baseY: 0
      };
      this.platforms.push(pObj);

      // Render label awal agar langsung terlihat jelas sejak masuk arena
      this.drawPlatformOptionLabel(pObj, `Zona ${cfg.id}`);

      // Save bounding box for player detection
      const half = platformSize / 2;
      this.zoneBounds.push({
        index: idx,
        id: cfg.id,
        minX: cfg.x - half,
        maxX: cfg.x + half,
        minZ: cfg.z - half,
        maxZ: cfg.z + half
      });
    });
  }

  // Giant Jumbotron Screen (Papan Soal 3D Raksasa — Besar, Tajam & Mudah Dibaca!)
  buildJumbotron() {
    this.jumbotronCanvas = document.createElement('canvas');
    this.jumbotronCanvas.width = 1280;
    this.jumbotronCanvas.height = 640;
    this.updateJumbotronText('EDUMETRO 3D', 'Bersiap untuk Kuis Pembelajaran...', 'Klik "Mulai Kuis" untuk memulai ronde!', 'SIAP');

    this.jumbotronTexture = new THREE.CanvasTexture(this.jumbotronCanvas);
    const screenGeo = new THREE.BoxGeometry(28, 14, 1.1);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.jumbotronTexture });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const screenMaterials = [frameMat, frameMat, frameMat, frameMat, screenMat, frameMat];

    this.jumbotronMesh = new THREE.Mesh(screenGeo, screenMaterials);
    this.jumbotronMesh.position.set(0, 11.5, -22);
    this.scene.add(this.jumbotronMesh);

    // Tiang Penyangga di BELAKANG Papan Soal 3D (tidak menembus / menghalangi layar soal)
    const pillarGeo = new THREE.CylinderGeometry(0.7, 0.9, 14, 12);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const bracketGeo = new THREE.BoxGeometry(1.1, 1.1, 1.4);

    [-11, 11].forEach((px) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 7, -23.6);
      this.scene.add(pillar);

      // Braket penghubung dari tiang belakang ke sisi belakang papan soal
      const bracketTop = new THREE.Mesh(bracketGeo, pillarMat);
      bracketTop.position.set(px, 12.8, -22.95);
      this.scene.add(bracketTop);

      const bracketBottom = new THREE.Mesh(bracketGeo, pillarMat);
      bracketBottom.position.set(px, 6.2, -22.95);
      this.scene.add(bracketBottom);
    });
  }

  updateJumbotronText(category, questionText, subText, timerText, options = null) {
    if (!this.jumbotronCanvas) return;
    const ctx = this.jumbotronCanvas.getContext('2d');
    const w = this.jumbotronCanvas.width;
    const h = this.jumbotronCanvas.height;

    // Background gelap kontras tinggi
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0b1120');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Header Bar
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, w, 76);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('' + (category || 'EDUMETRO 3D'), 34, 39);

    if (timerText) {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(w - 220, 14, 186, 48, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('' + timerText, w - 127, 40);
    }

    // Teks Pertanyaan Utama (Besar & Multi-line Wrap)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = (questionText || '').split(' ');
    let line = '';
    const lines = [];
    const maxWidth = w - 100;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    if (line.trim()) lines.push(line.trim());

    const hasOptions = Array.isArray(options) && options.length === 4;
    let startY = hasOptions ? 150 : 250;
    if (lines.length === 1 && hasOptions) startY = 180;
    if (lines.length === 1 && !hasOptions) startY = 300;

    lines.slice(0, 3).forEach((l, idx) => {
      ctx.fillText(l, w / 2, startY + idx * 58);
    });

    // Grid Pilihan A, B, C, D langsung di Papan Soal 3D agar terbaca super jelas dari seluruh arena!
    if (hasOptions) {
      const optColors = ['#ef476f', '#0096c7', '#f59e0b', '#10b981'];
      const optLetters = ['A', 'B', 'C', 'D'];
      const cardW = 560;
      const cardH = 92;
      const startX = 60;
      const gridY = 395;

      options.forEach((opt, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = startX + col * (cardW + 40);
        const cy = gridY + row * (cardH + 22);

        // Kotak opsi
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = optColors[i];
        ctx.lineWidth = 5;
        ctx.stroke();

        // Lencana huruf A/B/C/D
        ctx.fillStyle = optColors[i];
        ctx.beginPath();
        ctx.roundRect(cx + 12, cy + 12, 68, 68, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(optLetters[i], cx + 46, cy + 48);

        // Teks pilihan
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(opt || '').slice(0, 26), cx + 98, cy + 48);
      });
    } else if (subText) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(subText, w / 2, h - 70);
    }

    // Border Glow
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    if (this.jumbotronTexture) {
      this.jumbotronTexture.needsUpdate = true;
    }
  }

  // Helper: Gambar Papan Jawaban 3D Kontras Tinggi di atas tiap Platform A, B, C, D
  drawPlatformOptionLabel(p, text) {
    const ctx = p.optCanvas.getContext('2d');
    const w = p.optCanvas.width;
    const h = p.optCanvas.height;
    const colorHex = '#' + p.originalColor.toString(16).padStart(6, '0');

    ctx.clearRect(0, 0, w, h);

    // Latar gelap pekat agar tulisan putih menyala & sangat jelas terbaca dari jauh
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 26);
    ctx.fill();

    // Bingkai tebal warna zona
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Lencana Huruf (A / B / C / D) besar di sebelah kiri
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.roundRect(26, 28, 130, h - 56, 20);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.id, 91, h / 2 + 4);

    // Teks Jawaban di sebelah kanan (auto-wrap hingga 2 baris!)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const maxTextW = w - 200;
    const words = String(text || '').split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxTextW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    if (lines.length === 1) {
      ctx.fillText(lines[0], 178, h / 2 + 2);
    } else {
      ctx.fillText(lines[0], 178, h / 2 - 26);
      ctx.fillText(lines.slice(1).join(' ').slice(0, 22), 178, h / 2 + 30);
    }

    p.optTex.needsUpdate = true;
  }

  updatePlatformOptions(options) {
    // options: [TextA, TextB, TextC, TextD]
    this.platforms.forEach((p, idx) => {
      const text = options && options[idx] ? options[idx] : `Pilihan ${p.id}`;
      this.drawPlatformOptionLabel(p, text);

      // Reset platform color & height
      p.padMesh.material.color.setHex(p.originalColor);
      p.group.position.y = 0;
    });
  }

  highlightRevealResult(correctIndex) {
    this.platforms.forEach((p, idx) => {
      if (idx === correctIndex) {
        // Platform Benar: Naik dan Bercahaya Hijau / Emas
        p.padMesh.material.color.setHex(0x06d6a0);
        p.group.position.y = 1.0;
        this.triggerFireworks(p.group.position.x, 3, p.group.position.z, 0x06d6a0);
      } else {
        // Platform Salah: Turun dan Berubah Merah Kusam
        p.padMesh.material.color.setHex(0x590d22);
        p.group.position.y = -0.3;
      }
    });
  }

  // Detect which answer zone a player's coordinate is inside
  detectPlayerZone(x, z) {
    for (const b of this.zoneBounds) {
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        return b.index; // 0, 1, 2, or 3
      }
    }
    return null; // Not inside any zone (in lobby / pathway)
  }

  createAmbientParticles() {
    const particleCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = Math.random() * 25;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  triggerFireworks(x, y, z, colorHex) {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 6;
      velocities.push({
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.abs(Math.cos(phi)) * speed * 1.5,
        vz: Math.sin(phi) * Math.sin(theta) * speed
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex || 0xffd166,
      size: 0.6,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.fireworks.push({
      points: points,
      geo: geo,
      mat: mat,
      velocities: velocities,
      life: 1.0
    });
  }

  update(delta) {
    // 0. Animate Theme Spinners (Matahari, Planet 3D, Model Atom Lab)
    for (const sp of this.themeSpinners) {
      if (sp.speedY) sp.mesh.rotation.y += delta * sp.speedY;
      if (sp.speedX) sp.mesh.rotation.x += delta * sp.speedX;
    }

    // 1. Animate ambient motes
    if (this.ambientParticles) {
      const pos = this.ambientParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += delta * 0.8;
        if (pos[i] > 25) pos[i] = 0;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
      this.ambientParticles.rotation.y += delta * 0.05;
    }

    // 2. Animate Fireworks
    for (let f = this.fireworks.length - 1; f >= 0; f--) {
      const fw = this.fireworks[f];
      fw.life -= delta * 0.9;
      fw.mat.opacity = fw.life;

      const pos = fw.geo.attributes.position.array;
      for (let i = 0; i < fw.velocities.length; i++) {
        const v = fw.velocities[i];
        pos[i * 3] += v.vx * delta;
        pos[i * 3 + 1] += v.vy * delta;
        pos[i * 3 + 2] += v.vz * delta;
        v.vy -= 9.8 * delta; // Gravity
      }
      fw.geo.attributes.position.needsUpdate = true;

      if (fw.life <= 0) {
        this.scene.remove(fw.points);
        fw.geo.dispose();
        fw.mat.dispose();
        this.fireworks.splice(f, 1);
      }
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

window.World3D = World3D;
