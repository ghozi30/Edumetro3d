// Engine Kota 3D Perkotaan: EduMetro 3D — Cute Isometric Low-Poly Miniature Diorama (12 Gedung)
// Fokus Environment: Geometri rounded/beveled lembut, palet pastel cerah, baked contact shadow (AO),
// kaca biru-kehijauan glossy, pohon "candy tree" bulat mengkilap, dan pencahayaan siang hari lembut.

class City3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sunLight = null;

    // Objek animasi & interaksi (100% kompatibel dengan city-main.js)
    this.portals = [];
    this.colliders = [];
    this.shuttles = [];
    this.clouds = [];
    this.towerRing = null;
    this.fountainParticles = null;

    // Mode kamera: 'orbit' (menu awal) | 'follow' (berjalan di kota)
    this.cameraMode = 'orbit';
    this.orbitAngle = Math.PI / 4; // Sudut isometric awal yang estetik

    this.mats = {};
    this.aoTextures = {};
    this.glowTex = null;

    this.init();
  }

  init() {
    // 1. Scene & Langit Biru Cerah Berwarna (Tidak Pucat/Putih!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87cefa);
    this.scene.fog = new THREE.FogExp2(0x9ad8ff, 0.0026);

    // 2. Camera (Sudut isometric lembut — near 0.6 untuk presisi depth buffer tinggi & bebas Z-fighting)
    const isMobileDevice = (window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches);
    this.isMobileDevice = isMobileDevice;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.6, isMobileDevice ? 190 : 360);
    this.camera.position.set(44, 34, 44);

    // 3. Renderer Ultra-Ringan di HP (1x DPR, tanpa shadow pass ganda & tanpa MSAA berat!)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !isMobileDevice;
    if (!isMobileDevice) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.container.appendChild(this.renderer.domElement);

    // 4. Studio Daylight Environment Map (Desktop saja; HP memakai lighting ringan 60 FPS!)
    if (!isMobileDevice && window.PBR_ASSETS) {
      const envMap = window.PBR_ASSETS.buildStudioEnvMap(this.renderer);
      if (envMap) this.scene.environment = envMap;
    }
    this.physics = window.PhysicsEngine3D ? new window.PhysicsEngine3D(this) : null;
    this.initSharedMaterials();
    this.setupLighting();

    // 5. Infrastruktur Kota Diorama (Rumput Mint, Trotoar Bulat Krem, Jalan Abu Terang + Marka Putih)
    this.buildGroundAndRoads();

    // 6. Alun-Alun Tengah + Menara Landmark Pastel & Air Mancur
    this.buildCentralLandmark();

    // 7. 4 Taman Sudut Miniatur (Candy Trees, Bangku Cerah, Lapangan Mini)
    this.buildCornerParks();

    // 8. Bangun 12 Gedung Rounded Pastel dengan Kaca Biru-Kehijauan Glossy & Contact Shadow AO
    this.buildAllBuildings();

    // 9. Pohon Candy Tree, Lampu Jalan Ramping, Bangku Cerah, Shuttle Bulat, & Awan Halus
    this.buildStreetPropsAndTrees();
    this.buildCityShuttles();
    this.buildClouds();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  // ==================== HELPER GEOMETRI BULAT (ROUNDED / BEVELED LOW-POLY) ====================
  createRoundedBoxGeo(w, h, d, radius = 0.65, bevel = 0.22) {
    const r = Math.min(radius, w * 0.4, d * 0.4);
    const shape = new THREE.Shape();
    const hw = w / 2 - bevel;
    const hd = d / 2 - bevel;

    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

    const depth = Math.max(0.08, h - bevel * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 6
    });
    // Putar agar sumbu ekstrusi menjadi vertikal (Y) dan terpusat di (0, 0, 0)
    geo.rotateX(-Math.PI / 2);
    geo.center();
    return geo;
  }

  // ==================== HELPER CONTACT SHADOW / BAKED AMBIENT OCCLUSION ====================
  createRadialAOTexture() {
    if (this.aoTextures.radial) return this.aoTextures.radial;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    grad.addColorStop(0, 'rgba(30, 41, 59, 0.34)');
    grad.addColorStop(0.55, 'rgba(30, 41, 59, 0.16)');
    grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    this.aoTextures.radial = tex;
    return tex;
  }

  createRectAOTexture() {
    if (this.aoTextures.rect) return this.aoTextures.rect;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.shadowColor = 'rgba(30, 41, 59, 0.42)';
    ctx.shadowBlur = 32;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.28)';
    ctx.beginPath();
    ctx.roundRect(36, 36, 184, 184, 34);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    this.aoTextures.rect = tex;
    return tex;
  }

  createSoftGlowTexture() {
    if (this.glowTex) return this.glowTex;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255, 251, 220, 0.85)');
    grad.addColorStop(0.4, 'rgba(254, 240, 138, 0.32)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.glowTex = new THREE.CanvasTexture(c);
    return this.glowTex;
  }

  addContactShadow(parent, w, d, y = 0.03, isRect = false, opacity = 0.85) {
    const tex = isRect ? this.createRectAOTexture() : this.createRadialAOTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  }

  initSharedMaterials() {
    const mobile = this.isMobileDevice;
    const pbr = window.PBR_ASSETS;
    const grassMaps = pbr ? pbr.getGrassMaps(20, 20) : {};
    const roadMaps = pbr ? pbr.getAsphaltMaps(3, 28) : {};
    const swMaps = pbr ? pbr.getSidewalkMaps(8, 8) : {};
    const plasterBump = (!mobile && pbr) ? pbr.getPlasterBumpMap() : null;
    const GlassMat = (!mobile && THREE.MeshPhysicalMaterial) ? THREE.MeshPhysicalMaterial : THREE.MeshLambertMaterial;

    // Di HP gunakan MeshLambertMaterial (4-6x lebih ringan dari PBR Standard+Bump di GPU mobile!)
    const mkMat = (opts) => {
      if (mobile) {
        const lOpts = { color: opts.color };
        if (opts.map) lOpts.map = opts.map;
        if (opts.emissive !== undefined) {
          lOpts.emissive = opts.emissive;
          lOpts.emissiveIntensity = opts.emissiveIntensity || 0.14;
        }
        return new THREE.MeshLambertMaterial(lOpts);
      }
      return new THREE.MeshStandardMaterial(opts);
    };

    this.mats = {
      grass: mkMat({
        color: 0xffffff,
        map: grassMaps.map || null,
        bumpMap: grassMaps.bumpMap || null,
        bumpScale: 0.08,
        roughness: 0.88,
        metalness: 0.02
      }),
      grassLight: mkMat({ color: 0x7be05c, roughness: 0.84, metalness: 0.02 }),
      road: mkMat({
        color: 0xffffff,
        map: roadMaps.map || null,
        bumpMap: roadMaps.bumpMap || null,
        bumpScale: 0.05,
        roughness: 0.78,
        metalness: 0.06
      }),
      sidewalk: mkMat({
        color: 0xffffff,
        map: swMaps.map || null,
        bumpMap: swMaps.bumpMap || null,
        bumpScale: 0.04,
        roughness: 0.76,
        metalness: 0.02
      }),
      curb: mkMat({ color: 0xf4ede2, roughness: 0.72, metalness: 0.02 }),
      stripe: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      dirtPath: mkMat({ color: 0xd9a773, roughness: 0.92 }),

      wallWhite: mkMat({ color: 0xfef3c7, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.64, metalness: 0.04 }),
      wallCream: mkMat({ color: 0xfed7aa, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.65, metalness: 0.04 }),
      wallBlush: mkMat({ color: 0xfbcfe8, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.65, metalness: 0.04 }),
      wallSky: mkMat({ color: 0xbae6fd, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.65, metalness: 0.04 }),
      wallLavender: mkMat({ color: 0xe9d5ff, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.65, metalness: 0.04 }),
      wallMint: mkMat({ color: 0xbbf7d0, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.65, metalness: 0.04 }),
      pureWhite: mkMat({ color: 0xf8fafc, bumpMap: plasterBump, bumpScale: 0.02, roughness: 0.56, metalness: 0.04 }),

      glassTeal: mobile ? new THREE.MeshLambertMaterial({ color: 0x0ea5e9, emissive: 0x06b6d4, emissiveIntensity: 0.18 }) : new GlassMat({
        color: 0x0284c7,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.14,
        roughness: 0.12,
        metalness: 0.35,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1
      }),
      glassSky: mobile ? new THREE.MeshLambertMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.18 }) : new GlassMat({
        color: 0x0ea5e9,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.14,
        roughness: 0.1,
        metalness: 0.32,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1
      }),

      trunk: mkMat({ color: 0x9a653c, bumpMap: plasterBump, bumpScale: 0.05, roughness: 0.82 }),
      candyGreen1: mkMat({ color: 0x22c55e, roughness: 0.32, metalness: 0.06 }),
      candyGreen2: mkMat({ color: 0x4ade80, roughness: 0.26, metalness: 0.06 }),
      candyMint: mkMat({ color: 0x10b981, roughness: 0.32, metalness: 0.06 }),
      candyPeach: mkMat({ color: 0xf97316, roughness: 0.34, metalness: 0.06 }),

      lampPole: mkMat({ color: 0x64748b, roughness: 0.35, metalness: 0.45 }),
      darkTrim: mkMat({ color: 0x334155, roughness: 0.5, metalness: 0.2 }),
      potTerracotta: mkMat({ color: 0xea580c, bumpMap: plasterBump, bumpScale: 0.04, roughness: 0.62 }),
      benchCoral: mkMat({ color: 0xf43f5e, roughness: 0.38, metalness: 0.08 }),
      benchSky: mkMat({ color: 0x0ea5e9, roughness: 0.38, metalness: 0.08 }),
      benchYellow: mkMat({ color: 0xf59e0b, roughness: 0.38, metalness: 0.08 }),
      lampGlow: new THREE.MeshBasicMaterial({ color: 0xfef08a })
    };
  }

  setupLighting() {
    const mobile = this.isMobileDevice;
    // 1. Ambient Light Seimbang
    const amb = new THREE.AmbientLight(0xffffff, mobile ? 0.42 : 0.26);
    this.scene.add(amb);

    // 2. Hemisphere Light (Langit biru cerah + pantulan rumput hijau)
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x4d7c0f, mobile ? 0.52 : 0.44);
    this.scene.add(hemi);

    // 3. Directional Light Utama Siang Hari (Shadow pass hanya di desktop; HP pakai baked contact shadow)
    const sun = new THREE.DirectionalLight(0xfff5e4, 0.86);
    sun.position.set(55, 82, 48);
    sun.castShadow = !mobile;
    if (!mobile) {
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 260;
      const d = 95;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
      sun.shadow.radius = 2.8;
    }
    this.scene.add(sun);
    this.sunLight = sun;
  }

  // ==================== HELPER COLLIDER FISIKA 3D (BENDA KECIL BISA DILOMPATI, BESAR TIDAK!) ====================
  addCollider(minX, maxX, minZ, maxZ, height = 10) {
    this.colliders.push({ minX, maxX, minZ, maxZ, height });
  }

  addBoxCollider(cx, cz, w, d, height = 10, rotY = 0) {
    const isRot90 = Math.abs(Math.sin(rotY || 0)) > 0.5;
    const hw = (isRot90 ? d : w) / 2;
    const hd = (isRot90 ? w : d) / 2;
    this.colliders.push({
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz - hd,
      maxZ: cz + hd,
      height
    });
  }

  setQuality(level) {
    if (!this.renderer || !this.sunLight) return;
    if (level === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else if (level === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    }
    this.renderer.shadowMap.needsUpdate = true;
  }

  // ==================== JALAN ABU-ABU TERANG, TROTOAR BULAT & MARKA PUTIH ====================
  buildGroundAndRoads() {
    // Hamparan Rumput Diorama Pastel
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), this.mats.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Trotoar Raised Bersudut Membulat (tiap arah punya ketinggian Y unik agar 100% bebas Z-fighting!)
    const nsSidewalk = new THREE.Mesh(this.createRoundedBoxGeo(11.6, 0.16, 118, 1.2, 0.05), this.mats.sidewalk);
    nsSidewalk.position.set(0, 0.06, 0); // top = 0.14
    nsSidewalk.receiveShadow = true;
    this.scene.add(nsSidewalk);

    const ewSidewalk = new THREE.Mesh(this.createRoundedBoxGeo(118, 0.16, 11.6, 1.2, 0.05), this.mats.sidewalk);
    ewSidewalk.position.set(0, 0.072, 0); // top = 0.152
    ewSidewalk.receiveShadow = true;
    this.scene.add(ewSidewalk);

    // Jalan Lingkar Bundaran + Trotoar Krem Halus
    const ringSidewalk = new THREE.Mesh(new THREE.RingGeometry(14.8, 24.8, 64), this.mats.sidewalk);
    ringSidewalk.rotation.x = -Math.PI / 2;
    ringSidewalk.position.y = 0.165;
    ringSidewalk.receiveShadow = true;
    this.scene.add(ringSidewalk);

    // Jalan Aspal Abu-Abu Terang Modern (semua di atas trotoar, tiap arah dipisah Y-nya)
    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 114), this.mats.road);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.y = 0.21;
    nsRoad.receiveShadow = true;
    this.scene.add(nsRoad);

    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(114, 8.4), this.mats.road);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.y = 0.228;
    ewRoad.receiveShadow = true;
    this.scene.add(ewRoad);

    const ringRoad = new THREE.Mesh(new THREE.RingGeometry(16.4, 23.4, 64), this.mats.road);
    ringRoad.rotation.x = -Math.PI / 2;
    ringRoad.position.y = 0.265;
    ringRoad.receiveShadow = true;
    this.scene.add(ringRoad);

    // Jalan Lingkar Luar Akses 11 Gedung (di koordinat ±34 — Y terpisah antar horizontal & vertikal)
    const outerBars = [
      { w: 76, d: 9.2, rw: 73, rd: 6.6, x: 0, z: -34, swY: 0.088, rdY: 0.242 },
      { w: 76, d: 9.2, rw: 73, rd: 6.6, x: 0, z: 34,  swY: 0.088, rdY: 0.242 },
      { w: 9.2, d: 76, rw: 6.6, rd: 73, x: 34, z: 0,  swY: 0.102, rdY: 0.256 },
      { w: 9.2, d: 76, rw: 6.6, rd: 73, x: -34, z: 0, swY: 0.102, rdY: 0.256 }
    ];
    outerBars.forEach(b => {
      const sw = new THREE.Mesh(this.createRoundedBoxGeo(b.w, 0.16, b.d, 1.4, 0.05), this.mats.sidewalk);
      sw.position.set(b.x, b.swY, b.z);
      sw.receiveShadow = true;
      this.scene.add(sw);

      const rd = new THREE.Mesh(new THREE.PlaneGeometry(b.rw, b.rd), this.mats.road);
      rd.rotation.x = -Math.PI / 2;
      rd.position.set(b.x, b.rdY, b.z);
      rd.receiveShadow = true;
      this.scene.add(rd);
    });

    // Marka Garis Jalan Putih Putus-Putus (Boulevard + Lingkar Luar) — selalu di atas semua lapisan jalan
    const dashNS = new THREE.PlaneGeometry(0.32, 2.5);
    const dashEW = new THREE.PlaneGeometry(2.5, 0.32);
    for (let i = -48; i <= 48; i += 5.5) {
      if (Math.abs(i) < 25 || (Math.abs(i) > 29 && Math.abs(i) < 39)) continue;
      const d1 = new THREE.Mesh(dashNS, this.mats.stripe);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(0, 0.285, i);
      this.scene.add(d1);

      const d2 = new THREE.Mesh(dashEW, this.mats.stripe);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(i, 0.285, 0);
      this.scene.add(d2);
    }

    // Marka Garis Putih di Jalan Lingkar Luar
    for (let i = -28; i <= 28; i += 6) {
      if (Math.abs(i) < 5) continue;
      [-34, 34].forEach(zPos => {
        const m = new THREE.Mesh(dashEW, this.mats.stripe);
        m.rotation.x = -Math.PI / 2;
        m.position.set(i, 0.285, zPos);
        this.scene.add(m);
      });
      [-34, 34].forEach(xPos => {
        const m = new THREE.Mesh(dashNS, this.mats.stripe);
        m.rotation.x = -Math.PI / 2;
        m.position.set(xPos, 0.285, i);
        this.scene.add(m);
      });
    }

    // Zebra Cross Putih Bersih di Persimpangan
    this.addZebraCross(0, -25.2, false);
    this.addZebraCross(0, 25.2, false);
    this.addZebraCross(-25.2, 0, true);
    this.addZebraCross(25.2, 0, true);
    this.addZebraCross(0, -29.8, false);
    this.addZebraCross(0, 29.8, false);
    this.addZebraCross(-29.8, 0, true);
    this.addZebraCross(29.8, 0, true);
  }

  addZebraCross(x, z, vertical) {
    const group = new THREE.Group();
    const barGeo = new THREE.PlaneGeometry(0.7, 2.6);
    for (let i = -3; i <= 3; i++) {
      const bar = new THREE.Mesh(barGeo, this.mats.stripe);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(i * 1.1, 0.285, 0);
      group.add(bar);
    }
    group.position.set(x, 0, z);
    if (vertical) group.rotation.y = Math.PI / 2;
    this.scene.add(group);
  }

  // ==================== ALUN-ALUN TENGAH & MENARA LANDMARK PASTEL ====================
  buildCentralLandmark() {
    const group = new THREE.Group();

    // Soft AO Contact Shadow di bawah Alun-Alun
    this.addContactShadow(group, 34, 34, 0.04, false, 0.55);

    const plazaBase = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.6, 0.28, 48), this.mats.curb);
    plazaBase.position.y = 0.14;
    plazaBase.receiveShadow = true;
    group.add(plazaBase);

    const plazaInner = new THREE.Mesh(new THREE.CylinderGeometry(14.0, 14.0, 0.3, 48), this.mats.sidewalk);
    plazaInner.position.y = 0.15;
    plazaInner.receiveShadow = true;
    group.add(plazaInner);

    // Kolam Air Mancur Bundar Glossy
    this.addContactShadow(group, 13.5, 13.5, 0.31, false, 0.65);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.8, 0.85, 36), this.mats.wallWhite);
    rim.position.y = 0.52;
    rim.castShadow = true;
    rim.receiveShadow = true;
    group.add(rim);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 0.72, 36), this.mats.glassTeal);
    water.position.y = 0.6;
    group.add(water);

    // Menara Landmark Pastel Bulat (Siluet Cute Modern)
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.92, 12.8, 20), this.mats.wallWhite);
    core.position.y = 7.0;
    core.castShadow = true;
    group.add(core);

    const lowerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 24, 20),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.25, metalness: 0.1 })
    );
    lowerSphere.position.y = 5.4;
    lowerSphere.castShadow = true;
    group.add(lowerSphere);

    const belt1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.22, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.35 })
    );
    belt1.rotation.x = Math.PI / 2;
    belt1.position.y = 5.4;
    group.add(belt1);

    const upperSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 20),
      new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.25, metalness: 0.1 })
    );
    upperSphere.position.y = 11.0;
    upperSphere.castShadow = true;
    group.add(upperSphere);

    this.towerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.14, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.45, roughness: 0.2 })
    );
    this.towerRing.rotation.x = Math.PI / 2.2;
    this.towerRing.position.y = 8.2;
    group.add(this.towerRing);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.2, 16), this.mats.wallWhite);
    spire.position.y = 13.9;
    group.add(spire);

    // Percikan Air Mancur
    const pCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.4 + Math.random() * 2.6;
      pPos[i * 3] = Math.cos(a) * r;
      pPos[i * 3 + 1] = 1.1 + Math.random() * 3.0;
      pPos[i * 3 + 2] = Math.sin(a) * r;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.fountainParticles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.34, transparent: true, opacity: 0.85 })
    );
    group.add(this.fountainParticles);

    // 4 Bangku Pastel Cerah di Alun-Alun (Benda kecil height 0.95 -> solid saat jalan, BISA dilompati & dinaiki!)
    const benchColors = ['coral', 'sky', 'yellow', 'coral'];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(a) * 11.2;
      const bz = Math.sin(a) * 11.2;
      const bench = this.createParkBench(benchColors[i]);
      bench.position.set(bx, 0.3, bz);
      bench.rotation.y = -a + Math.PI / 2;
      group.add(bench);
      this.addBoxCollider(bx, bz, 1.9, 1.0, 1.05, bench.rotation.y);
    }

    const signSprite = this.createTextSprite('EDUMETRO 3D', 'Alun-Alun Diorama · 11 Gedung Mini Game', '#0b1120', '#38bdf8');
    signSprite.position.set(0, 17.2, 0);
    signSprite.scale.set(10.2, 2.5, 1);
    group.add(signSprite);

    this.scene.add(group);
    // Pinggiran kolam rendah bisa dilompati (height 1.05), tapi menara tengah besar tidak bisa ditembus/dilompati!
    this.addBoxCollider(0, 0, 11.2, 11.2, 1.05);
    this.addBoxCollider(0, 0, 4.8, 4.8, 15.0);
  }

  // ==================== 4 TAMAN SUDUT DIORAMA (100% DI RUMPUT — BEBAS BUNDARAN & JALAN!) ====================
  buildCornerParks() {
    // Diposisikan tepat di 4 sudut rumput antara Bundaran (r=25) & Jalan Lingkar Luar (±29.4)
    const parkSpots = [
      { x: -24.2, z: -24.2, hasCourt: false, benchCol: 'coral' },
      { x:  24.2, z:  24.2, hasCourt: false, benchCol: 'sky' },
      { x: -24.2, z:  24.2, hasCourt: false, benchCol: 'yellow' },
      { x:  24.2, z: -24.2, hasCourt: true,  benchCol: 'sky' }
    ];

    parkSpots.forEach(spot => {
      const park = new THREE.Group();
      this.addContactShadow(park, 9.6, 9.6, 0.03, true, 0.55);

      // Bingkai Taman Bersudut Bulat (8.2 x 8.2 -> pas rapi di pulau rumput 20.1..28.3!)
      const frame = new THREE.Mesh(this.createRoundedBoxGeo(8.2, 0.26, 8.2, 1.1, 0.08), this.mats.curb);
      frame.position.y = 0.13;
      frame.receiveShadow = true;
      park.add(frame);

      if (spot.hasCourt) {
        const court = new THREE.Mesh(
          this.createRoundedBoxGeo(7.0, 0.26, 7.0, 0.8, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.65 })
        );
        court.position.y = 0.17;
        court.receiveShadow = true;
        park.add(court);

        const net = new THREE.Mesh(this.createRoundedBoxGeo(0.14, 1.0, 6.0, 0.05, 0.02), this.mats.wallWhite);
        net.position.set(0, 0.8, 0);
        park.add(net);
      } else {
        const lawn = new THREE.Mesh(this.createRoundedBoxGeo(7.2, 0.26, 7.2, 0.9, 0.06), this.mats.grassLight);
        lawn.position.y = 0.17;
        lawn.receiveShadow = true;
        park.add(lawn);

        const path = new THREE.Mesh(this.createRoundedBoxGeo(5.8, 0.1, 1.2, 0.45, 0.03), this.mats.dirtPath);
        path.position.set(0, 0.29, 0);
        path.rotation.y = 0.2;
        park.add(path);

        // Candy Trees Bulat Mengkilap di dalam batas taman + Collider Solid Pohon (Besar -> tidak bisa ditembus/dilompati!)
        const t1 = this.createCandyTree(spot.x < 0 ? 'green' : 'mint', 0.95);
        t1.position.set(-0.2, 0.3, -1.0);
        park.add(t1);
        this.addBoxCollider(spot.x - 0.2, spot.z - 1.0, 1.3, 1.3, 3.8);

        const t2 = this.createCandyTree('peach', 0.72);
        t2.position.set(-2.3, 0.3, -2.0);
        park.add(t2);
        this.addBoxCollider(spot.x - 2.3, spot.z - 2.0, 1.1, 1.1, 3.4);

        const bench = this.createParkBench(spot.benchCol);
        bench.position.set(1.8, 0.3, -2.1);
        park.add(bench);
        this.addBoxCollider(spot.x + 1.8, spot.z - 2.1, 2.0, 0.85, 1.05);

        const pot = this.createPlantPot();
        pot.position.set(-2.3, 0.3, 2.0);
        park.add(pot);
        this.addBoxCollider(spot.x - 2.3, spot.z + 2.0, 1.1, 1.1, 1.1);
      }

      park.position.set(spot.x, 0, spot.z);
      this.scene.add(park);
    });
  }

  // ==================== 12 GEDUNG ROUNDED PASTEL DENGAN KACA BIRU-KEHIJAUAN GLOSSY ====================
  buildAllBuildings() {
    const games = window.MINIGAMES_REGISTRY || [];
    const wallMats = [
      this.mats.wallWhite,
      this.mats.wallSky,
      this.mats.wallCream,
      this.mats.wallMint,
      this.mats.wallLavender,
      this.mats.wallBlush
    ];

    games.forEach((game, index) => {
      // Khusus #04 Sirkuit Balap 3 Gerbang: Bangun Sirkuit Balap 3D Terbuka (BUKAN gedung kotak biasa!)
      if (game.id === 'mg-04' && window.CityCircuit) {
        this.circuit = new window.CityCircuit(this);
        // Pasang portal Mulai Balapan di bawah Gapura Start/Finish Checkered di dalam sirkuit
        const sfRing = new THREE.Mesh(
          new THREE.RingGeometry(1.7, 2.35, 32),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
        );
        sfRing.rotation.x = -Math.PI / 2;
        sfRing.position.set(this.circuit.startArchPos.x, 0.22, this.circuit.startArchPos.z);
        this.scene.add(sfRing);

        this.portals.push({
          game,
          portalPos: { x: this.circuit.startArchPos.x, z: this.circuit.startArchPos.z },
          ringMesh: sfRing,
          beaconMesh: sfRing
        });
        return;
      }

      const distInfo = window.CITY_DISTRICTS[game.district];
      const group = new THREE.Group();
      const { w, h, d } = game.size;

      // 0. Contact Shadow / Ambient Occlusion lembut di bawah keseluruhan tapak gedung
      this.addContactShadow(group, w + 5.2, d + 5.8, 0.03, true, 0.72);

      // 1. Tapak Paving Krem Bersudut Bulat
      const lotBase = new THREE.Mesh(this.createRoundedBoxGeo(w + 2.6, 0.28, d + 3.4, 1.1, 0.08), this.mats.curb);
      lotBase.position.set(0, 0.14, 0.5);
      lotBase.receiveShadow = true;
      group.add(lotBase);

      // AO lembut di dasar tembok gedung
      this.addContactShadow(group, w + 1.8, d + 1.8, 0.29, true, 0.55);

      // 2. Badan Gedung Kotak Bersudut Membulat (Rounded/Beveled Low-Poly!)
      const wallMat = wallMats[index % wallMats.length];
      const bodyGeo = this.createRoundedBoxGeo(w, h, d, 0.95, 0.28);
      const body = new THREE.Mesh(bodyGeo, wallMat);
      body.position.y = h / 2 + 0.25;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Sabuk Aksen Warna di Bawah & Tengah Gedung agar lebih berwarna & hidup!
      const roofMat = new THREE.MeshStandardMaterial({
        color: game.color,
        roughness: 0.4,
        metalness: 0.06
      });
      const baseBand = new THREE.Mesh(this.createRoundedBoxGeo(w + 0.26, 0.75, d + 0.26, 0.98, 0.12), roofMat);
      baseBand.position.y = 0.65;
      group.add(baseBand);

      const roofCap = new THREE.Mesh(this.createRoundedBoxGeo(w + 0.45, 0.72, d + 0.45, 1.05, 0.22), roofMat);
      roofCap.position.y = h + 0.5;
      roofCap.castShadow = true;
      roofCap.receiveShadow = true;
      group.add(roofCap);

      // Variasi elemen puncak atap agar skyline tidak monoton (tetap bersih & proporsional isometric)
      if (index % 3 === 0) {
        // Atap sedikit landai membulat + skylight kaca glossy
        const crown = new THREE.Mesh(this.createRoundedBoxGeo(w * 0.72, 1.05, d * 0.72, 0.8, 0.24), roofMat);
        crown.position.y = h + 1.25;
        crown.castShadow = true;
        group.add(crown);
      } else if (index % 3 === 1) {
        // Skylight kaca biru-kehijauan glossy + mini panel atap putih
        const skylight = new THREE.Mesh(this.createRoundedBoxGeo(w * 0.48, 0.65, d * 0.38, 0.35, 0.12), this.mats.glassTeal);
        skylight.position.set(-w * 0.14, h + 1.1, 0);
        group.add(skylight);

        const unit = new THREE.Mesh(this.createRoundedBoxGeo(1.6, 0.75, 1.4, 0.25, 0.1), this.mats.wallWhite);
        unit.position.set(w * 0.24, h + 1.15, -d * 0.14);
        group.add(unit);
      } else {
        // Dekorasi teras atap pastel dengan mini pot tanaman
        const trim = new THREE.Mesh(this.createRoundedBoxGeo(w * 0.82, 0.45, d * 0.82, 0.75, 0.12), this.mats.wallWhite);
        trim.position.y = h + 1.0;
        group.add(trim);
      }

      // 4. Jendela Kaca 3D Biru-Kehijauan Glossy pada Sisi Depan, Kiri & Kanan!
      const floors = Math.max(2, Math.floor((h - 3.6) / 2.6));
      const winGeoFront = this.createRoundedBoxGeo(1.75, 1.55, 0.22, 0.28, 0.05);
      const winGeoSide = this.createRoundedBoxGeo(0.22, 1.55, 1.75, 0.28, 0.05);
      const sheenGeoFront = new THREE.PlaneGeometry(0.45, 1.15);

      for (let f = 0; f < floors; f++) {
        const wy = 4.9 + f * 2.55;
        if (wy > h - 0.6) break;

        // 3 Jendela Depan
        [-w * 0.3, 0, w * 0.3].forEach(wx => {
          const win = new THREE.Mesh(winGeoFront, this.mats.glassTeal);
          win.position.set(wx, wy, d / 2 - 0.02);
          group.add(win);

          // Kilauan glossy diagonal halus pada kaca
          const sheen = new THREE.Mesh(
            sheenGeoFront,
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 })
          );
          sheen.position.set(wx - 0.3, wy, d / 2 + 0.11);
          sheen.rotation.z = -0.25;
          group.add(sheen);
        });

        // 2 Jendela Samping Kiri & Kanan
        [-d * 0.22, d * 0.22].forEach(wz => {
          const wL = new THREE.Mesh(winGeoSide, this.mats.glassTeal);
          wL.position.set(-w / 2 + 0.02, wy, wz);
          group.add(wL);

          const wR = new THREE.Mesh(winGeoSide, this.mats.glassTeal);
          wR.position.set(w / 2 - 0.02, wy, wz);
          group.add(wR);
        });
      }

      // 5. Pintu Kaca Lobi, Kanopi Bulat Pastel & 2 Pot Tanaman Kecil di Depan Gedung
      const door = new THREE.Mesh(this.createRoundedBoxGeo(3.0, 3.3, 0.3, 0.35, 0.08), this.mats.glassSky);
      door.position.set(0, 1.9, d / 2 + 0.02);
      group.add(door);

      const canopy = new THREE.Mesh(this.createRoundedBoxGeo(4.8, 0.48, 2.2, 0.45, 0.14), roofMat);
      canopy.position.set(0, 3.75, d / 2 + 1.0);
      canopy.castShadow = true;
      group.add(canopy);

      [-3.2, 3.2].forEach(px => {
        const pot = this.createPlantPot();
        pot.position.set(px, 0.28, d / 2 + 1.15);
        group.add(pot);
        // Collider pot tanaman depan gedung (Benda kecil height 1.1 -> solid saat jalan, BISA dilompati!)
        const potWorld = new THREE.Vector3(px, 0, d / 2 + 1.15);
        potWorld.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.facing || 0);
        this.addBoxCollider(game.pos.x + potWorld.x, game.pos.z + potWorld.z, 1.1, 1.1, 1.12);
      });

      // 6. Portal Interaksi Bercahaya di Depan Pintu Masuk
      const isReady = game.status === 'ready';
      const portalColor = isReady ? 0x10b981 : distInfo.hex;

      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.1, 32),
        new THREE.MeshBasicMaterial({ color: portalColor, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, 0.3, d / 2 + 3.0);
      group.add(ringMesh);

      const beaconMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.35, isReady ? 2.5 : 1.1, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: isReady ? 0.24 : 0.12, side: THREE.DoubleSide })
      );
      beaconMesh.position.set(0, isReady ? 1.45 : 0.75, d / 2 + 3.0);
      group.add(beaconMesh);

      // 7. Papan Nama Mengambang Rapi (Zero Emoji)
      const badgeLabel = isReady ? `SIAP MAIN · ${game.subject}` : `SEGERA HADIR · ${game.subject}`;
      const numStr = String(game.number).padStart(2, '0');
      const labelSprite = this.createTextSprite(
        `#${numStr} ${game.name}`,
        badgeLabel,
        isReady ? '#064e3b' : '#0b1120',
        isReady ? '#34d399' : distInfo.color
      );
      labelSprite.position.set(0, h + 4.2, 0);
      labelSprite.scale.set(9.2, 2.3, 1);
      group.add(labelSprite);

      group.position.set(game.pos.x, 0, game.pos.z);
      group.rotation.y = game.facing || 0;
      this.scene.add(group);

      // Simpan posisi portal dunia
      const portalLocal = new THREE.Vector3(0, 0, d / 2 + 3.0);
      portalLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.facing || 0);
      this.portals.push({
        game,
        portalPos: { x: game.pos.x + portalLocal.x, z: game.pos.z + portalLocal.z },
        ringMesh,
        beaconMesh
      });

      // Collider AABB 3D Gedung (Besar -> tidak bisa ditembus atau dilompati!)
      const isRotated90 = Math.abs(Math.sin(game.facing || 0)) > 0.5;
      const halfX = (isRotated90 ? d : w) / 2 + 0.55;
      const halfZ = (isRotated90 ? w : d) / 2 + 0.55;
      this.addCollider(game.pos.x - halfX, game.pos.x + halfX, game.pos.z - halfZ, game.pos.z + halfZ, h + 1.5);
    });
  }

  // ==================== CANDY TREES (CLUSTER SPHERE GLOSSY) & FURNITUR JALAN ====================
  createCandyTree(variant = 'green', scale = 1.0) {
    const g = new THREE.Group();
    this.addContactShadow(g, 3.6, 3.6, 0.03, false, 0.7);

    // Batang silinder lembut
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 2.1, 14), this.mats.trunk);
    trunk.position.y = 1.05;
    trunk.castShadow = true;
    g.add(trunk);

    const matMain = variant === 'mint' ? this.mats.candyMint : (variant === 'peach' ? this.mats.candyPeach : this.mats.candyGreen1);
    const matHi = variant === 'peach' ? this.mats.candyPeach : this.mats.candyGreen2;

    // Gumpalan bulat (blob / cluster sphere) dengan glossy highlight di atas!
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(1.45, 20, 16), matMain);
    b1.position.set(0, 2.85, 0);
    b1.scale.set(1.06, 0.96, 1.06);
    b1.castShadow = true;
    g.add(b1);

    const b2 = new THREE.Mesh(new THREE.SphereGeometry(1.02, 18, 14), matHi);
    b2.position.set(0.75, 3.35, 0.45);
    b2.castShadow = true;
    g.add(b2);

    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.92, 18, 14), matMain);
    b3.position.set(-0.72, 2.95, -0.4);
    b3.castShadow = true;
    g.add(b3);

    g.scale.setScalar(scale);
    return g;
  }

  createPlantPot() {
    const g = new THREE.Group();
    this.addContactShadow(g, 1.7, 1.7, 0.02, false, 0.55);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.42, 0.65, 16), this.mats.potTerracotta);
    pot.position.y = 0.34;
    pot.castShadow = true;
    g.add(pot);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.07, 10, 20), this.mats.potTerracotta);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.66;
    g.add(rim);

    const bush1 = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), this.mats.candyGreen1);
    bush1.position.set(0, 0.95, 0);
    bush1.castShadow = true;
    g.add(bush1);

    const bush2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), this.mats.candyGreen2);
    bush2.position.set(0.24, 1.18, 0.14);
    g.add(bush2);

    return g;
  }

  createCurvedStreetLamp() {
    const g = new THREE.Group();
    this.addContactShadow(g, 1.4, 1.4, 0.02, false, 0.5);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 12), this.mats.darkTrim);
    base.position.y = 0.18;
    g.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.9, 12), this.mats.lampPole);
    pole.position.y = 2.6;
    pole.castShadow = true;
    g.add(pole);

    const arm = new THREE.Mesh(this.createRoundedBoxGeo(1.25, 0.14, 0.14, 0.05, 0.03), this.mats.lampPole);
    arm.position.set(0.55, 5.02, 0);
    g.add(arm);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), this.mats.lampGlow);
    bulb.position.set(1.12, 4.86, 0);
    g.add(bulb);

    // Soft bloom halo di lampu jalan
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createSoftGlowTexture(),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.position.set(1.12, 4.86, 0);
    glow.scale.set(2.1, 2.1, 1);
    g.add(glow);

    return g;
  }

  createParkBench(colorKey = 'coral') {
    const g = new THREE.Group();
    this.addContactShadow(g, 2.6, 1.35, 0.02, true, 0.55);

    const mat = colorKey === 'sky' ? this.mats.benchSky : (colorKey === 'yellow' ? this.mats.benchYellow : this.mats.benchCoral);
    const seat = new THREE.Mesh(this.createRoundedBoxGeo(2.05, 0.2, 0.72, 0.16, 0.05), mat);
    seat.position.y = 0.52;
    seat.castShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(this.createRoundedBoxGeo(2.05, 0.54, 0.18, 0.14, 0.04), mat);
    back.position.set(0, 0.88, -0.28);
    back.castShadow = true;
    g.add(back);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.52, 8);
    [[-0.78, -0.2], [0.78, -0.2], [-0.78, 0.2], [0.78, 0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, this.mats.darkTrim);
      leg.position.set(lx, 0.26, lz);
      g.add(leg);
    });
    return g;
  }

  // Cek matematis agar TIDAK ADA pohon/bangku yang boleh berdiri di atas jalan, trotoar, bundaran, atau jalan masuk sirkuit!
  isOnRoadOrSidewalk(x, z) {
    // Jalan salib utama + trotoar (±6.6)
    if (Math.abs(x) < 6.8 || Math.abs(z) < 6.8) return true;
    // Bundaran tengah + trotoar bundaran (r: 14.2 .. 25.8)
    const r = Math.hypot(x, z);
    if (r > 14.0 && r < 26.0) return true;
    // Jalan lingkar luar ±34 + trotoar (28.6 .. 39.4)
    if (Math.abs(x) <= 39.8 && Math.abs(z) >= 28.6 && Math.abs(z) <= 39.4) return true;
    if (Math.abs(z) <= 39.8 && Math.abs(x) >= 28.6 && Math.abs(x) <= 39.4) return true;
    // Area jalan masuk & taman Sirkuit Balap di Timur Laut (x > 38 && z < -4)
    if (x > 38 && z < -4) return true;
    return false;
  }

  buildStreetPropsAndTrees() {
    // 1. Candy Trees Bulat Mengkilap — HANYA di hamparan rumput hijau (100% bebas jalan & trotoar!)
    const treeSpots = [
      // Sudut rumput hijau antara Bundaran & Jalan Lingkar Luar
      [-26.8, -26.8, 'green', 1.05], [26.8, -26.8, 'mint', 1.0],
      [-26.8,  26.8, 'mint', 1.05],  [26.8,  26.8, 'green', 1.05],
      [-10.2, -26.6, 'green', 0.92], [10.2, -26.6, 'mint', 0.92],
      [-10.2,  26.6, 'mint', 0.92],  [10.2,  26.6, 'green', 0.92],
      [-26.6, -10.2, 'green', 0.92], [26.6, -10.2, 'peach', 0.9],
      [-26.6,  10.2, 'peach', 0.9],  [26.6,  10.2, 'green', 0.92],
      // Sabuk hijau luar kota (rapi di sudut luar gedung)
      [-48, -46, 'green', 1.25], [-52, -32, 'mint', 1.2],
      [-52,  32, 'mint', 1.2],   [-48,  46, 'green', 1.25],
      [ 48,  46, 'green', 1.25], [ 52,  32, 'mint', 1.2],
      [-32, -52, 'green', 1.15], [ 32, -52, 'mint', 1.15],
      [-32,  52, 'mint', 1.15],  [ 32,  52, 'green', 1.15]
    ];
    treeSpots.forEach(([x, z, type, sc]) => {
      if (this.isOnRoadOrSidewalk(x, z)) return;
      const tree = this.createCandyTree(type, sc);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
      // Batang pohon solid (Besar height 3.8 -> tidak bisa ditembus/dilompati!)
      this.addBoxCollider(x, z, 1.1 * sc, 1.1 * sc, 3.8);
    });

    // 2. Lampu Jalan Ramping rapi di pinggir trotoar Alun-Alun & tepi luar Boulevard (BUKAN di tengah jalan!)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const lx = Math.cos(angle) * 14.2;
      const lz = Math.sin(angle) * 14.2;
      const lamp = this.createCurvedStreetLamp();
      lamp.position.set(lx, 0.25, lz);
      lamp.rotation.y = -angle;
      this.scene.add(lamp);
      this.addBoxCollider(lx, lz, 0.65, 0.65, 5.2);
    }

    // Tiang lampu tepat di pinggir luar trotoar persimpangan (±6.5, ±39.5) dan (±39.5, ±6.5)
    [
      [-6.5, -39.5, 0], [6.5, -39.5, Math.PI],
      [-6.5,  39.5, 0], [6.5,  39.5, Math.PI],
      [-39.5, -6.5, -Math.PI / 2], [39.5, 6.5, Math.PI / 2]
    ].forEach(([x, z, rot]) => {
      const lamp = this.createCurvedStreetLamp();
      lamp.position.set(x, 0.12, z);
      lamp.rotation.y = rot;
      this.scene.add(lamp);
      this.addBoxCollider(x, z, 0.65, 0.65, 5.2);
    });

    // 3. Bangku Pastel Cerah di tepi rumput taman (Benda kecil height 1.0 -> solid saat jalan, BISA dilompati & dinaiki!)
    [
      [-11.5, -27.5, 0, 'coral'],
      [ 11.5,  27.5, Math.PI, 'sky'],
      [ 27.5, -11.5, -Math.PI / 2, 'yellow'],
      [-27.5,  11.5, Math.PI / 2, 'coral']
    ].forEach(([x, z, rot, col]) => {
      const b = this.createParkBench(col);
      b.position.set(x, 0.12, z);
      b.rotation.y = rot;
      this.scene.add(b);
      this.addBoxCollider(x, z, 2.05, 0.85, 1.0, rot);
    });
  }

  createTextSprite(title, subtitle, bgHex, borderHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgHex || '#0f172a';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 112, 26);
    ctx.fill();

    ctx.strokeStyle = borderHex || '#38bdf8';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 27px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.slice(0, 32), 256, 48);

    ctx.fillStyle = borderHex || '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(subtitle.slice(0, 38), 256, 88);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    return new THREE.Sprite(mat);
  }

  // ==================== MINI-SHUTTLE BULAT PASTEL ====================
  buildCityShuttles() {
    const colors = [0x60a5fa, 0xfb923c];
    colors.forEach((col, idx) => {
      const car = new THREE.Group();
      this.addContactShadow(car, 3.0, 5.0, 0.22, true, 0.6);

      const body = new THREE.Mesh(
        this.createRoundedBoxGeo(2.15, 1.15, 3.9, 0.45, 0.16),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.08 })
      );
      body.position.y = 0.95;
      body.castShadow = true;
      car.add(body);

      const cabin = new THREE.Mesh(this.createRoundedBoxGeo(1.85, 0.72, 2.35, 0.35, 0.12), this.mats.wallWhite);
      cabin.position.y = 1.8;
      car.add(cabin);

      const windshield = new THREE.Mesh(this.createRoundedBoxGeo(1.6, 0.45, 2.42, 0.15, 0.04), this.mats.glassTeal);
      windshield.position.y = 1.82;
      car.add(windshield);

      const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14);
      [[-1.02, -1.12], [1.02, -1.12], [-1.02, 1.12], [1.02, 1.12]].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(wheelGeo, this.mats.darkTrim);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.44, wz);
        car.add(w);
      });

      this.scene.add(car);
      this.shuttles.push({ mesh: car, angle: idx * Math.PI, radius: 19.9, speed: 0.24 });
    });
  }

  buildClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.5 + Math.random() * 1.5, 14, 12), cloudMat);
        puff.position.set((j - 1) * 2.4, Math.random() * 0.65, Math.random() * 0.9);
        c.add(puff);
      }
      c.position.set((Math.random() - 0.5) * 160, 36 + Math.random() * 14, (Math.random() - 0.5) * 160);
      this.scene.add(c);
      this.clouds.push({ mesh: c, speed: 0.45 + Math.random() * 0.6 });
    }
  }

  getNearbyBuilding(x, z) {
    let nearest = null;
    let minDist = 4.8;
    for (const p of this.portals) {
      const dx = x - p.portalPos.x;
      const dz = z - p.portalPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = p.game;
      }
    }
    return nearest;
  }

  // ==================== ENGINE FISIKA 3D (BENDA KECIL BISA DILOMPATI/DINAIKI, BESAR SOLID!) ====================
  resolvePhysics3D(avatar) {
    if (!avatar || !avatar.group) return;
    const pos = avatar.group.position;
    const pad = 0.55;
    let supportY = 0;

    const checkBox = (minX, maxX, minZ, maxZ, height) => {
      if (pos.x > minX - pad && pos.x < maxX + pad && pos.z > minZ - pad && pos.z < maxZ + pad) {
        // Jika kaki pemain berada di atas atau hampir menyentuh permukaan benda kecil -> BISA DILOMPATI & BERDIRI DI ATASNYA!
        if (pos.y >= height - 0.32) {
          if (height > supportY) supportY = height;
          return;
        }
        // Jika di bawah permukaan benda -> TOLAK SECARA SOLID (TIDAK BISA TEMBUS!)
        const dLeft = Math.abs(pos.x - (minX - pad));
        const dRight = Math.abs((maxX + pad) - pos.x);
        const dTop = Math.abs(pos.z - (minZ - pad));
        const dBottom = Math.abs((maxZ + pad) - pos.z);
        const m = Math.min(dLeft, dRight, dTop, dBottom);
        if (m === dLeft) pos.x = minX - pad;
        else if (m === dRight) pos.x = maxX + pad;
        else if (m === dTop) pos.z = minZ - pad;
        else pos.z = maxZ + pad;
      }
    };

    // 1. Cek seluruh objek statis kota & sirkuit
    for (const c of this.colliders) {
      checkBox(c.minX, c.maxX, c.minZ, c.maxZ, c.height || 10);
    }

    // 2. Cek seluruh mobil yang sedang diparkir di Sirkuit (height 1.32 -> solid saat jalan, bisa dilompati!)
    if (this.circuit && this.circuit.cars) {
      for (const car of this.circuit.cars) {
        if (car === this.circuit.activeCar) continue;
        const cp = car.mesh.position;
        const isRot90 = Math.abs(Math.sin(car.mesh.rotation.y || 0)) > 0.5;
        const hw = isRot90 ? 2.15 : 1.15;
        const hd = isRot90 ? 1.15 : 2.15;
        checkBox(cp.x - hw, cp.x + hw, cp.z - hd, cp.z + hd, 1.32);
      }
    }

    // 3. Terapkan gravitasi mendarat / jatuh mulus saat berjalan turun dari atas benda kecil!
    avatar.groundY = supportY;
    if (!avatar.isJumping && pos.y > supportY + 0.05) {
      avatar.isJumping = true;
      avatar.jumpVelocity = 0;
    } else if (pos.y < supportY) {
      pos.y = supportY;
      avatar.isJumping = false;
      avatar.jumpVelocity = 0;
    }

    // 4. Batas dunia kota + ekspansi Sirkuit Balap 104x104 Timur Laut!
    this.clampWorldBounds(pos);
  }

  // Fisika Tabrakan Mobil Solid (Mobil TIDAK BISA menembus pilar gapura, pagar ban, tribun, garasi, pohon, gedung, atau mobil lain!)
  resolveCarCollisions(pos, activeCar) {
    const pad = 1.65;
    let hit = false;

    const blockBox = (minX, maxX, minZ, maxZ) => {
      if (pos.x > minX - pad && pos.x < maxX + pad && pos.z > minZ - pad && pos.z < maxZ + pad) {
        const dLeft = Math.abs(pos.x - (minX - pad));
        const dRight = Math.abs((maxX + pad) - pos.x);
        const dTop = Math.abs(pos.z - (minZ - pad));
        const dBottom = Math.abs((maxZ + pad) - pos.z);
        const m = Math.min(dLeft, dRight, dTop, dBottom);
        if (m === dLeft) pos.x = minX - pad;
        else if (m === dRight) pos.x = maxX + pad;
        else if (m === dTop) pos.z = minZ - pad;
        else pos.z = maxZ + pad;
        hit = true;
      }
    };

    for (const c of this.colliders) {
      blockBox(c.minX, c.maxX, c.minZ, c.maxZ);
    }

    if (this.circuit && this.circuit.cars) {
      for (const other of this.circuit.cars) {
        if (other === activeCar) continue;
        const op = other.mesh.position;
        blockBox(op.x - 1.4, op.x + 1.4, op.z - 1.4, op.z + 1.4);
      }
    }

    this.clampWorldBounds(pos);
    return hit;
  }

  clampWorldBounds(pos) {
    const maxCircX = this.circuit ? (this.circuit.originX + this.circuit.size + 4) : 158;
    const minCircZ = this.circuit ? (this.circuit.originZ - 4) : -100;
    const maxCircZ = this.circuit ? (this.circuit.originZ + this.circuit.size + 4) : 12;

    if (pos.x > 46 && pos.z <= maxCircZ && pos.z >= minCircZ) {
      pos.x = Math.max(-58, Math.min(maxCircX, pos.x));
      pos.z = Math.max(minCircZ, Math.min(maxCircZ, pos.z));
    } else {
      pos.x = Math.max(-58, Math.min(58, pos.x));
      pos.z = Math.max(-58, Math.min(58, pos.z));
    }
  }

  resolveCollisions(pos) {
    const pad = 0.6;
    for (const c of this.colliders) {
      if (pos.x > c.minX - pad && pos.x < c.maxX + pad && pos.z > c.minZ - pad && pos.z < c.maxZ + pad) {
        const dLeft = Math.abs(pos.x - (c.minX - pad));
        const dRight = Math.abs((c.maxX + pad) - pos.x);
        const dTop = Math.abs(pos.z - (c.minZ - pad));
        const dBottom = Math.abs((c.maxZ + pad) - pos.z);
        const m = Math.min(dLeft, dRight, dTop, dBottom);
        if (m === dLeft) pos.x = c.minX - pad;
        else if (m === dRight) pos.x = c.maxX + pad;
        else if (m === dTop) pos.z = c.minZ - pad;
        else pos.z = c.maxZ + pad;
      }
    }
    this.clampWorldBounds(pos);
  }

  getDistrictLabel(x, z) {
    if (this.circuit && this.circuit.isInsideCircuit(x, z)) {
      return 'Sirkuit Balap EduMetro (Free Drive)';
    }
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter < 18) return 'Alun-Alun Menara EduMetro';
    if (Math.abs(z) >= Math.abs(x)) {
      return z < 0 ? 'Distrik Sains & Alam (Utara)' : 'Distrik Bahasa & Ekologi (Selatan)';
    } else {
      return x > 0 ? 'Distrik Logika & Matematika (Timur)' : 'Distrik Kafe, Robotika & Budaya (Barat)';
    }
  }

  update(delta, elapsed) {
    if (this.cameraMode === 'orbit') {
      this.orbitAngle += delta * 0.12;
      this.camera.position.x = Math.cos(this.orbitAngle) * 56;
      this.camera.position.y = 34 + Math.sin(this.orbitAngle * 1.2) * 2.5;
      this.camera.position.z = Math.sin(this.orbitAngle) * 56;
      this.camera.lookAt(0, 4, 0);
    }

    if (this.towerRing) {
      this.towerRing.rotation.z += delta * 0.9;
    }

    if (this.fountainParticles) {
      const pos = this.fountainParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += delta * 2.1;
        if (pos[i] > 4.2) pos[i] = 1.0;
      }
      this.fountainParticles.geometry.attributes.position.needsUpdate = true;
    }

    const pulse = 1 + Math.sin(elapsed * 3.5) * 0.08;
    for (const p of this.portals) {
      p.ringMesh.scale.set(pulse, pulse, 1);
    }

    for (const s of this.shuttles) {
      s.angle += delta * s.speed;
      s.mesh.position.x = Math.cos(s.angle) * s.radius;
      s.mesh.position.z = Math.sin(s.angle) * s.radius;
      s.mesh.rotation.y = -s.angle;
    }

    for (const c of this.clouds) {
      c.mesh.position.x += delta * c.speed;
      if (c.mesh.position.x > 95) c.mesh.position.x = -95;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.City3D = City3D;
