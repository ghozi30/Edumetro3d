// Modul Sirkuit Balap 3D Terbuka & Teroptimasi di Lobi Kota EduMetro 3D (#04 Sirkuit Balap 3 Gerbang)
// Diperbesar menjadi 104 x 104 unit dengan lintasan lebar 9 unit, InstancedMesh untuk Pagar Ban & Guardrail (60 FPS HP!),
// serta Fisika 3D Penuh: benda kecil (ban, guardrail, podium, mobil) bisa dilompati, benda besar (pilar, tribun, garasi, pohon) SOLID!

class CityCircuit {
  constructor(city) {
    this.city = city;
    this.scene = city.scene;

    // Diperbesar dari 76x76 -> 104x104 unit agar jauh lebih lega & seru saat menyetir mobil di lobi!
    this.originX = 50;  // u=0 -> x=50..154
    this.originZ = -96; // v=0 -> z=-96..+8 (z=-20 tepat di v=0.73!)
    this.size = 104;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.cars = [];
    this.activeCar = null;
    this.carSpeed = 0;

    // Koordinat Start/Finis Arch di dalam sirkuit
    this.startArchPos = { x: this.toX(0.36), z: this.toZ(0.89) };
    this.entryArchPos = { x: 43, z: -20 };

    // Titik jalur lintasan sirkuit (u, v dalam 0..1 persis desain referensi!)
    this.trackUV = [
      [0.09, 0.89],
      [0.09, 0.58],
      [0.20, 0.56],
      [0.20, 0.33],
      [0.42, 0.11],
      [0.88, 0.11],
      [0.88, 0.52],
      [0.72, 0.52],
      [0.72, 0.36],
      [0.40, 0.36],
      [0.40, 0.55],
      [0.57, 0.57],
      [0.57, 0.89]
    ];

    this.trackPoints = [];

    this.buildParkGroundAndAccess();
    this.buildRaceTrackAndBarriers();
    this.buildStartFinishGantryAndGrid();
    this.buildGrandstandsPodiumAndBuildings();
    this.buildPondTentsFloodlightsAndDecor();
    this.buildDrivableCars();
  }

  toX(u) { return this.originX + u * this.size; }
  toZ(v) { return this.originZ + v * this.size; }

  computeFilletedTrack(cornerRadius = 6.8, arcSteps = 8) {
    const pts = this.trackUV.map(([u, v]) => new THREE.Vector2(this.toX(u), this.toZ(v)));
    const out = [];
    const n = pts.length;

    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const curr = pts[i];
      const next = pts[(i + 1) % n];

      const v1 = new THREE.Vector2().subVectors(prev, curr);
      const v2 = new THREE.Vector2().subVectors(next, curr);
      const r = Math.min(cornerRadius, v1.length() * 0.36, v2.length() * 0.36);

      const pStart = curr.clone().add(v1.normalize().multiplyScalar(r));
      const pEnd = curr.clone().add(v2.normalize().multiplyScalar(r));

      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const omt = 1 - t;
        out.push(new THREE.Vector2(
          omt * omt * pStart.x + 2 * omt * t * curr.x + t * t * pEnd.x,
          omt * omt * pStart.y + 2 * omt * t * curr.y + t * t * pEnd.y
        ));
      }
    }
    this.trackPoints = out;
    return out;
  }

  // ==================== 1. LAPANGAN HIJAU SIRKUIT & GAPURA MASUK TERBUKA ====================
  buildParkGroundAndAccess() {
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size + 16, this.size + 16),
      new THREE.MeshStandardMaterial({ color: 0x5bc236, roughness: 0.88 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(this.originX + this.size / 2, 0.03, this.originZ + this.size / 2);
    lawn.receiveShadow = true;
    this.group.add(lawn);

    // Pagar keliling solid (height 2.5 -> tidak bisa ditembus/dilompati keluar batas!)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const cx = this.originX + this.size / 2;
    const cz = this.originZ + this.size / 2;
    const half = this.size / 2 + 5.5;
    [
      { x: cx, z: cz - half, w: this.size + 12, d: 0.7 },
      { x: cx, z: cz + half, w: this.size + 12, d: 0.7 },
      { x: cx + half, z: cz, w: 0.7, d: this.size + 12 }
    ].forEach(seg => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(seg.w, 1.5, seg.d), borderMat);
      f.position.set(seg.x, 0.75, seg.z);
      f.castShadow = true;
      this.group.add(f);
      this.city.addBoxCollider(seg.x, seg.z, seg.w, seg.d, 2.5);
    });

    // Jalan masuk aspal lebar dari Boulevard Timur (x=34, z=-20) langsung masuk ke dalam Sirkuit (x=62, z=-20)
    const accessSidewalk = new THREE.Mesh(
      this.city.createRoundedBoxGeo(28, 0.2, 11.4, 1.0, 0.06),
      this.city.mats.sidewalk
    );
    accessSidewalk.position.set(47, 0.09, -20);
    accessSidewalk.receiveShadow = true;
    this.group.add(accessSidewalk);

    const accessRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 8.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    accessRoad.rotation.x = -Math.PI / 2;
    accessRoad.position.set(47, 0.21, -20);
    accessRoad.receiveShadow = true;
    this.group.add(accessRoad);

    // Gapura Masuk Sirkuit (Pilar Kiri & Kanan SOLID, lubang tengah lebar 9.6 unit 100% TERBUKA!)
    const archGrp = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    [-5.4, 5.4].forEach(dz => {
      const pil = new THREE.Mesh(this.city.createRoundedBoxGeo(1.25, 6.8, 1.25, 0.3, 0.08), pillarMat);
      pil.position.set(0, 3.4, dz);
      pil.castShadow = true;
      archGrp.add(pil);

      const cap = new THREE.Mesh(this.city.createRoundedBoxGeo(1.45, 0.9, 1.45, 0.25, 0.08), redMat);
      cap.position.set(0, 6.6, dz);
      archGrp.add(cap);

      // Collider solid HANYA pada 2 pilar gapura (tidak menghalangi jalan masuk di tengah!)
      this.city.addBoxCollider(43, -20 + dz, 1.35, 1.35, 6.8);
    });

    const beam = new THREE.Mesh(this.city.createRoundedBoxGeo(1.35, 1.4, 12.6, 0.3, 0.1), redMat);
    beam.position.set(0, 7.0, 0);
    beam.castShadow = true;
    archGrp.add(beam);

    const sign = this.city.createTextSprite(
      '#04 SIRKUIT BALAP GRAND PRIX',
      'Masuk Bebas · Naik Mobil atau Klik Mulai Balapan',
      '#064e3b',
      '#34d399'
    );
    sign.position.set(0, 10.0, 0);
    sign.scale.set(11.6, 2.8, 1);
    archGrp.add(sign);

    archGrp.position.set(43, 0, -20);
    this.group.add(archGrp);
  }

  // ==================== 2. LINTASAN ASPAL LEBAR + INSTANCED PAGAR BAN & GUARDRAIL ====================
  buildRaceTrackAndBarriers() {
    // Fillet radius 8.5 (10 segmen/tikungan) agar tepi dalam aspal & kerb 100% mulus tanpa lipatan segitiga / garis glitch!
    const pts = this.computeFilletedTrack(8.5, 10);
    const n = pts.length;
    const trackHalfW = 4.5; // Lebar lintasan aspal 9.0 unit (super lega untuk balapan & menyetir!)
    const isMobile = !!(this.city && this.city.isMobileDevice);
    const mkMat = (opts) => isMobile
      ? new THREE.MeshLambertMaterial({ color: opts.color !== undefined ? opts.color : 0xffffff, map: opts.map || null, side: opts.side || THREE.FrontSide })
      : new THREE.MeshStandardMaterial(opts);

    const buildRibbonGeo = (halfWidth, yPos) => {
      const positions = [], normals = [], uvs = [], indices = [];
      let accumLen = 0;

      for (let i = 0; i <= n; i++) {
        const curr = pts[i % n];
        const prev = pts[(i - 1 + n) % n];
        const next = pts[(i + 1) % n];
        if (i > 0) accumLen += curr.distanceTo(prev);

        const tangent = new THREE.Vector2().subVectors(next, prev).normalize();
        const normal = new THREE.Vector2(-tangent.y, tangent.x);

        positions.push(curr.x + normal.x * halfWidth, yPos, curr.y + normal.y * halfWidth);
        positions.push(curr.x - normal.x * halfWidth, yPos, curr.y - normal.y * halfWidth);
        normals.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, accumLen * 0.12, 1, accumLen * 0.12);

        if (i < n) {
          const base = i * 2;
          indices.push(base, base + 2, base + 1);
          indices.push(base + 1, base + 2, base + 3);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return geo;
    };

    // Kerb Merah-Putih
    const curbCanvas = document.createElement('canvas');
    curbCanvas.width = 64; curbCanvas.height = 128;
    const cctx = curbCanvas.getContext('2d');
    cctx.fillStyle = '#ef4444'; cctx.fillRect(0, 0, 64, 64);
    cctx.fillStyle = '#ffffff'; cctx.fillRect(0, 64, 64, 64);
    const curbTex = new THREE.CanvasTexture(curbCanvas);
    curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;

    const curbMesh = new THREE.Mesh(
      buildRibbonGeo(trackHalfW + 0.85, 0.14),
      mkMat({ map: curbTex, roughness: 0.65, side: THREE.DoubleSide })
    );
    curbMesh.receiveShadow = true;
    this.group.add(curbMesh);

    // Aspal Sirkuit Gelap Kontras Tinggi
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 256; roadCanvas.height = 256;
    const rctx = roadCanvas.getContext('2d');
    rctx.fillStyle = '#334155'; rctx.fillRect(0, 0, 256, 256);
    rctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    rctx.fillRect(52, 0, 44, 256); rctx.fillRect(160, 0, 44, 256);
    rctx.fillStyle = '#ffffff';
    rctx.fillRect(8, 0, 9, 256); rctx.fillRect(239, 0, 9, 256);
    rctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    rctx.fillRect(124, 18, 8, 92); rctx.fillRect(124, 146, 8, 92);

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.anisotropy = isMobile ? 1 : 4;

    const asphaltMesh = new THREE.Mesh(
      buildRibbonGeo(trackHalfW, 0.23),
      mkMat({ map: roadTex, roughness: 0.72, metalness: 0.06, side: THREE.DoubleSide })
    );
    asphaltMesh.receiveShadow = true;
    this.group.add(asphaltMesh);

    // Gravel Traps
    const sandMat = mkMat({ color: 0xfde68a, roughness: 0.92 });
    [[0.89, 0.10], [0.89, 0.53], [0.07, 0.58], [0.08, 0.90]].forEach(([u, v]) => {
      const trap = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.08, 22), sandMat);
      trap.position.set(this.toX(u), 0.06, this.toZ(v));
      trap.receiveShadow = true;
      this.group.add(trap);
    });

    // OPTIMASI GPU + ANTI Z-FIGHTING: Cek jarak minimal antar ban & papan sponsor agar TIDAK PERNAH tumpang tindih!
    const tireBotPositions = [];
    const tireRedPositions = [];
    const tireWhtPositions = [];
    const railTransforms = [];
    const sponsorPositions = [];

    const isTooCloseToTrack = (x, z, minClear = trackHalfW + 1.15) => {
      for (let k = 0; k < n; k++) {
        if (Math.hypot(x - pts[k].x, z - pts[k].y) < minClear) return true;
      }
      return false;
    };
    const isTooCloseToList = (list, x, z, minDist) => {
      for (let k = 0; k < list.length; k++) {
        if (Math.hypot(x - list[k].x, z - list[k].z) < minDist) return true;
      }
      return false;
    };

    const makeSponsorMat = (text, bg, fg) => {
      const sc = document.createElement('canvas');
      sc.width = 256; sc.height = 64;
      const sctx = sc.getContext('2d');
      sctx.fillStyle = bg; sctx.fillRect(0, 0, 256, 64);
      sctx.strokeStyle = '#ffffff'; sctx.lineWidth = 4; sctx.strokeRect(3, 3, 250, 58);
      sctx.fillStyle = fg; sctx.font = '900 28px sans-serif';
      sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
      sctx.fillText(text, 128, 33);
      return mkMat({ map: new THREE.CanvasTexture(sc), roughness: 0.45 });
    };
    const sponsorMats = [
      makeSponsorMat('EDUMETRO GP', '#ef4444', '#ffffff'),
      makeSponsorMat('TURBO QUIZ', '#0284c7', '#ffffff'),
      makeSponsorMat('SPEED MATH', '#f59e0b', '#0f172a'),
      makeSponsorMat('CHAMPION CUP', '#10b981', '#ffffff')
    ];

    const barrierOffset = trackHalfW + 1.85;
    for (let i = 0; i < n; i++) {
      const curr = pts[i];
      const prev = pts[(i - 1 + n) % n];
      const next = pts[(i + 1) % n];

      const vIn = new THREE.Vector2().subVectors(curr, prev).normalize();
      const vOut = new THREE.Vector2().subVectors(next, curr).normalize();
      const turnAmt = Math.abs(vIn.x * vOut.y - vIn.y * vOut.x);

      const tangent = new THREE.Vector2().subVectors(next, prev).normalize();
      const normal = new THREE.Vector2(-tangent.y, tangent.x);
      const segAngle = Math.atan2(tangent.x, tangent.y);

      // Buka jalur masuk bebas dari lobi di sekitar (x < 68, z: -27..-13) & akses Paddock kanan bawah!
      const isEntryGap = (curr.x < 68 && curr.y > -28 && curr.y < -12);
      const isPaddockGap = (curr.x > this.toX(0.55) && curr.y > this.toZ(0.76));

      if (turnAmt > 0.06) {
        [-1, 1].forEach(side => {
          const bx = curr.x + normal.x * barrierOffset * side;
          const bz = curr.y + normal.y * barrierOffset * side;
          if (isEntryGap) return;
          // Jarak minimal 1.35 unit antar ban (diameter ban 1.04) -> 0% tumpang tindih / 0% glitch merah-putih!
          if (isTooCloseToTrack(bx, bz, trackHalfW + 1.15)) return;
          if (isTooCloseToList(tireBotPositions, bx, bz, 1.35)) return;
          tireBotPositions.push({ x: bx, z: bz });
          if (tireBotPositions.length % 2 === 0) tireRedPositions.push({ x: bx, z: bz });
          else tireWhtPositions.push({ x: bx, z: bz });
          // Benda kecil height 0.92 -> bisa dilompati saat jalan kaki, SOLID untuk mobil!
          this.city.addBoxCollider(bx, bz, 1.0, 1.0, 0.92);
        });
      } else if (i % 2 === 0) {
        [-1, 1].forEach(side => {
          const bx = curr.x + normal.x * (barrierOffset + 0.35) * side;
          const bz = curr.y + normal.y * (barrierOffset + 0.35) * side;
          if (isEntryGap || isPaddockGap) return;
          if (Math.hypot(bx - this.startArchPos.x, bz - this.startArchPos.z) < 6.5) return;
          if (isTooCloseToTrack(bx, bz, trackHalfW + 1.25)) return;
          // Jangan letakkan papan sponsor atau guardrail menabrak tumpukan ban tikungan!
          if (isTooCloseToList(tireBotPositions, bx, bz, 2.6)) return;

          if (i % 6 === 0 && !isTooCloseToList(sponsorPositions, bx, bz, 4.8)) {
            sponsorPositions.push({ x: bx, z: bz });
            const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 4.2), sponsorMats[(i / 6 | 0) % sponsorMats.length]);
            board.position.set(bx, 0.52, bz);
            board.rotation.y = segAngle;
            this.group.add(board);
            this.city.addBoxCollider(bx, bz, 0.6, 4.2, 0.96, segAngle);
          } else if (!isTooCloseToList(sponsorPositions, bx, bz, 2.8) && !isTooCloseToList(railTransforms, bx, bz, 3.6)) {
            railTransforms.push({ x: bx, z: bz, rotY: segAngle });
            this.city.addBoxCollider(bx, bz, 0.5, 4.0, 0.88, segAngle);
          }
        });
      }
    }

    // InstancedMesh untuk ratusan ban & guardrail -> 10x lebih ringan di HP!
    const dummy = new THREE.Object3D();
    const tireGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.44, 10);
    const makeInst = (list, geo, mat, yVal) => {
      if (list.length === 0) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, idx) => {
        dummy.position.set(p.x, yVal, p.z);
        dummy.rotation.set(0, p.rotY || 0, 0);
        dummy.updateMatrix();
        im.setMatrixAt(idx, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      this.group.add(im);
    };

    makeInst(tireBotPositions, tireGeo, mkMat({ color: 0x1e293b, roughness: 0.85 }), 0.25);
    makeInst(tireRedPositions, tireGeo, mkMat({ color: 0xef4444, roughness: 0.55 }), 0.70);
    makeInst(tireWhtPositions, tireGeo, mkMat({ color: 0xf8fafc, roughness: 0.55 }), 0.70);
    makeInst(railTransforms, new THREE.BoxGeometry(0.18, 0.45, 4.0), mkMat({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.45 }), 0.58);
  }

  // ==================== 3. GARIS START/FINISH, STARTING GRID & LAMPU START F1 ====================
  buildStartFinishGantryAndGrid() {
    const sx = this.startArchPos.x;
    const sz = this.startArchPos.z;
    const trackW = 9.0;

    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 128; checkCanvas.height = 256;
    const kctx = checkCanvas.getContext('2d');
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) {
        kctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        kctx.fillRect(c * 32, r * 32, 32, 32);
      }
    }
    const startLine = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, trackW),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(checkCanvas), side: THREE.DoubleSide })
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(sx, 0.25, sz);
    this.group.add(startLine);

    // 8 Kotak Starting Grid Putih F1
    const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    for (let col = 0; col < 4; col++) {
      [-2.1, 2.1].forEach((rowZ, rIdx) => {
        const gx = sx - 4.0 - col * 3.8 - (rIdx * 1.1);
        const gz = sz + rowZ;
        const frontBar = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 2.2), gridMat);
        frontBar.rotation.x = -Math.PI / 2;
        frontBar.position.set(gx + 1.1, 0.25, gz);
        this.group.add(frontBar);
      });
    }

    // Gantry Start F1 (2 Pilar Kiri/Kanan SOLID, jalan tengah 100% TERBUKA!)
    const sfArch = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    [-5.6, 5.6].forEach(dz => {
      const p = new THREE.Mesh(this.city.createRoundedBoxGeo(1.05, 6.6, 1.05, 0.25, 0.08), darkMat);
      p.position.set(0, 3.3, dz);
      p.castShadow = true;
      sfArch.add(p);
      this.city.addBoxCollider(sx, sz + dz, 1.15, 1.15, 6.6);
    });
    const topBar = new THREE.Mesh(
      this.city.createRoundedBoxGeo(1.4, 1.5, 12.6, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 })
    );
    topBar.position.set(0, 6.5, 0);
    sfArch.add(topBar);

    for (let i = -2; i <= 2; i++) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshBasicMaterial({ color: i === 2 ? 0x22c55e : 0xef4444 })
      );
      bulb.position.set(-0.75, 6.4, i * 1.6);
      sfArch.add(bulb);
    }

    const sfLabel = this.city.createTextSprite('START / FINISH F1', 'Klik "Mulai Balapan" untuk Lomba 3 Lap', '#0b1120', '#facc15');
    sfLabel.position.set(0, 9.3, 0);
    sfLabel.scale.set(9.8, 2.4, 1);
    sfArch.add(sfLabel);

    sfArch.position.set(sx, 0, sz);
    this.group.add(sfArch);
  }

  // ==================== 4. TRIBUN PENONTON, PODIUM JUARA (BISA DILOMPATI!), GARASI & VIP ====================
  buildGrandstandsPodiumAndBuildings() {
    const createGrandstand = (len, depth, seatColors, hasRoof = true) => {
      const g = new THREE.Group();
      this.city.addContactShadow(g, len + 2.5, depth + 2.5, 0.05, true, 0.6);
      const base = new THREE.Mesh(
        this.city.createRoundedBoxGeo(len, 1.5, depth, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 })
      );
      base.position.y = 0.75;
      base.castShadow = true;
      g.add(base);

      for (let tier = 0; tier < 3; tier++) {
        const seatMat = new THREE.MeshStandardMaterial({ color: seatColors[tier % seatColors.length], roughness: 0.45 });
        const row = new THREE.Mesh(this.city.createRoundedBoxGeo(len - 0.6, 0.7, depth * 0.26, 0.15, 0.05), seatMat);
        row.position.set(0, 1.65 + tier * 0.72, -depth * 0.28 + tier * (depth * 0.26));
        g.add(row);
      }
      if (hasRoof) {
        const roof = new THREE.Mesh(
          this.city.createRoundedBoxGeo(len + 0.6, 0.38, depth * 0.72, 0.3, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42 })
        );
        roof.position.set(0, 4.7, -depth * 0.12);
        roof.rotation.x = 0.12;
        g.add(roof);
      }
      return g;
    };

    // Tribun Utama Besar (SOLID height 4.8!)
    const mainX = this.toX(0.32), mainZ = this.toZ(0.74);
    const mainStand = createGrandstand(26, 8.6, [0xef4444, 0xfacc15, 0xef4444], true);
    mainStand.position.set(mainX, 0, mainZ);
    this.group.add(mainStand);
    this.city.addBoxCollider(mainX, mainZ, 26, 8.6, 4.8, 0);

    // Tribun Biru Panjang Utara (SOLID height 3.8!)
    const blueX = this.toX(0.62), blueZ = this.toZ(0.03);
    const blueStand = createGrandstand(32, 5.2, [0x3b82f6, 0x60a5fa, 0x2563eb], false);
    blueStand.position.set(blueX, 0, blueZ);
    blueStand.rotation.y = Math.PI;
    this.group.add(blueStand);
    this.city.addBoxCollider(blueX, blueZ, 32, 5.2, 3.8, Math.PI);

    // Tribun Vertikal Tengah (SOLID height 4.8!)
    const midX = this.toX(0.30), midZ = this.toZ(0.46);
    const midStand = createGrandstand(18, 5.0, [0xfacc15, 0xef4444, 0xfacc15], true);
    midStand.position.set(midX, 0, midZ);
    midStand.rotation.y = Math.PI / 2;
    this.group.add(midStand);
    this.city.addBoxCollider(midX, midZ, 18, 5.0, 4.8, Math.PI / 2);

    // Podium Juara 1-2-3 (BENDA KECIL -> BISA DILOMPATI & BERDIRI DI JUARA #1!)
    const podX = this.toX(0.48), podZ = this.toZ(0.66);
    const podGrp = new THREE.Group();
    const p1 = new THREE.Mesh(this.city.createRoundedBoxGeo(2.0, 1.5, 2.0, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    p1.position.set(0, 0.75, 0);
    const p2 = new THREE.Mesh(this.city.createRoundedBoxGeo(2.0, 1.05, 2.0, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    p2.position.set(-2.1, 0.52, 0);
    const p3 = new THREE.Mesh(this.city.createRoundedBoxGeo(2.0, 0.75, 2.0, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
    p3.position.set(2.1, 0.37, 0);
    podGrp.add(p1, p2, p3);
    podGrp.position.set(podX, 0, podZ);
    this.group.add(podGrp);
    this.city.addBoxCollider(podX, podZ, 2.0, 2.0, 1.5);
    this.city.addBoxCollider(podX - 2.1, podZ, 2.0, 2.0, 1.05);
    this.city.addBoxCollider(podX + 2.1, podZ, 2.0, 2.0, 0.75);

    // 4 Garasi Pit Tim (SOLID height 3.5!)
    const garageColors = [0xf1f5f9, 0xf97316, 0x3b82f6, 0xfacc15];
    garageColors.forEach((col, i) => {
      const gx = this.toX(0.67), gz = this.toZ(0.66 + i * 0.075);
      const gar = new THREE.Group();
      this.city.addContactShadow(gar, 7.2, 6.2, 0.05, true, 0.55);
      const box = new THREE.Mesh(
        this.city.createRoundedBoxGeo(5.8, 3.5, 4.8, 0.45, 0.12),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.42 })
      );
      box.position.y = 1.75;
      box.castShadow = true;
      gar.add(box);
      const door = new THREE.Mesh(this.city.createRoundedBoxGeo(0.28, 2.4, 3.0, 0.1, 0.04), this.city.mats.darkTrim);
      door.position.set(2.9, 1.25, 0);
      gar.add(door);
      gar.position.set(gx, 0, gz);
      this.group.add(gar);
      this.city.addBoxCollider(gx, gz, 5.8, 4.8, 3.5);
    });

    // Paviliun VIP + Kubah Emas (SOLID height 3.2!)
    const vx = this.toX(0.12), vz = this.toZ(0.08);
    const vip = new THREE.Mesh(this.city.createRoundedBoxGeo(13.5, 3.0, 8.0, 1.1, 0.2), this.city.mats.pureWhite);
    vip.position.set(vx, 1.5, vz);
    vip.castShadow = true;
    this.group.add(vip);
    this.city.addBoxCollider(vx, vz, 13.5, 8.0, 3.2);

    const dx = this.toX(0.28), dz = this.toZ(0.08);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }));
    dome.position.set(dx, 1.6, dz);
    this.group.add(dome);
    this.city.addBoxCollider(dx, dz, 7.2, 7.2, 3.2);
  }

  // ==================== 5. KOLAM BIRU, TENDA, LAMPU SOROT & POHON BEBAS JALAN ====================
  buildPondTentsFloodlightsAndDecor() {
    const pondShape = new THREE.Shape();
    pondShape.absellipse(0, 0, 14.0, 5.2, 0, Math.PI * 2, false, 0);
    const pondGeo = new THREE.ShapeGeometry(pondShape, 28);
    pondGeo.rotateX(-Math.PI / 2);

    const pondWater = new THREE.Mesh(
      pondGeo,
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.16, roughness: 0.12, side: THREE.DoubleSide })
    );
    pondWater.position.set(this.toX(0.64), 0.1, this.toZ(0.25));
    this.group.add(pondWater);

    // Tenda Warna-Warni (SOLID height 2.2!)
    const tentColors = [0xfacc15, 0x3b82f6, 0xef4444, 0xf8fafc, 0xfacc15, 0x3b82f6, 0xef4444];
    tentColors.forEach((col, i) => {
      const tx = this.toX(0.46 + i * 0.04), tz = this.toZ(0.18);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }));
      tent.rotation.y = Math.PI / 4;
      tent.position.set(tx, 1.1, tz);
      this.group.add(tent);
      this.city.addBoxCollider(tx, tz, 2.4, 2.4, 2.2);
    });

    // 4 Menara Lampu Sorot (SOLID height 11.5!)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.35 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    [[0.26, 0.22], [0.95, 0.06], [0.95, 0.58], [0.16, 0.95]].forEach(([u, v]) => {
      const fx = this.toX(u), fz = this.toZ(v);
      const tower = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 12.0, 8), poleMat);
      pole.position.y = 6.0;
      tower.add(pole);
      const lampFace = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.45), headMat);
      lampFace.position.y = 12.0;
      tower.add(lampFace);
      tower.position.set(fx, 0, fz);
      this.group.add(tower);
      this.city.addBoxCollider(fx, fz, 0.9, 0.9, 12.0);
    });

    // Pohon Candy Trees di Area Hijau (0% di jalan + SOLID height 3.8!)
    const isClearOfTrack = (wx, wz, minDist = 8.2) => {
      for (const pt of this.trackPoints) {
        if (Math.hypot(wx - pt.x, wz - pt.y) < minDist) return false;
      }
      return true;
    };
    const treeUVs = [
      [0.48, 0.45], [0.56, 0.45], [0.63, 0.45],
      [0.48, 0.50], [0.58, 0.50],
      [0.80, 0.44], [0.80, 0.64], [0.88, 0.66], [0.93, 0.64],
      [0.96, 0.24], [0.96, 0.38], [0.96, 0.72],
      [0.04, 0.24], [0.15, 0.21]
    ];
    treeUVs.forEach(([u, v], i) => {
      const tx = this.toX(u), tz = this.toZ(v);
      if (!isClearOfTrack(tx, tz, 8.2)) return;
      const t = this.city.createCandyTree(i % 3 === 0 ? 'mint' : 'green', 0.9);
      t.position.set(tx, 0, tz);
      this.group.add(t);
      this.city.addBoxCollider(tx, tz, 1.2, 1.2, 3.8);
    });

    // Area Paddock RACING TEAM di Pojok Kanan Bawah
    const padFloor = new THREE.Mesh(
      this.city.createRoundedBoxGeo(22, 0.16, 14, 1.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    padFloor.position.set(this.toX(0.85), 0.09, this.toZ(0.87));
    padFloor.receiveShadow = true;
    this.group.add(padFloor);

    const padLabel = this.city.createTextSprite('RACING TEAM PADDOCK', 'Dekati Mobil & Tap "Naik Mobil"', '#0b1120', '#facc15');
    padLabel.position.set(this.toX(0.85), 4.5, this.toZ(0.87));
    padLabel.scale.set(8.6, 2.1, 1);
    this.group.add(padLabel);
  }

  // ==================== 6. 6 MOBIL BALAP (PARKIR RAPI, BEBAS PILAR GAPURA!) ====================
  createDrivableCarMesh(colorHex, numberStr) {
    const car = new THREE.Group();
    this.city.addContactShadow(car, 2.8, 4.8, 0.05, true, 0.65);

    const isMobile = !!(this.city && this.city.isMobileDevice);
    const PaintMat = (!isMobile && THREE.MeshPhysicalMaterial) ? THREE.MeshPhysicalMaterial : THREE.MeshLambertMaterial;
    const bodyMat = isMobile
      ? new THREE.MeshLambertMaterial({ color: colorHex })
      : new PaintMat({
          color: colorHex,
          roughness: 0.22,
          metalness: 0.25,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12
        });
    const whiteMat = isMobile ? new THREE.MeshLambertMaterial({ color: 0xf8fafc }) : new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const darkMat = isMobile ? new THREE.MeshLambertMaterial({ color: 0x1e293b }) : new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

    const chassis = new THREE.Mesh(this.city.createRoundedBoxGeo(2.05, 0.68, 4.1, 0.45, 0.14), bodyMat);
    chassis.position.y = 0.62;
    chassis.castShadow = true;
    car.add(chassis);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 3.6), whiteMat);
    stripe.position.set(0, 0.97, 0);
    car.add(stripe);

    const cockpit = new THREE.Mesh(this.city.createRoundedBoxGeo(1.42, 0.42, 1.5, 0.25, 0.06), darkMat);
    cockpit.position.set(0, 0.92, -0.1);
    car.add(cockpit);

    const windshield = new THREE.Mesh(this.city.createRoundedBoxGeo(1.45, 0.48, 0.22, 0.08, 0.04), this.city.mats.glassTeal);
    windshield.position.set(0, 1.15, 0.65);
    windshield.rotation.x = -0.35;
    car.add(windshield);

    const wing = new THREE.Mesh(this.city.createRoundedBoxGeo(2.1, 0.16, 0.55, 0.1, 0.04), whiteMat);
    wing.position.set(0, 1.32, -1.78);
    car.add(wing);

    const headMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [-0.65, 0.65].forEach(lx => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), headMat);
      hl.position.set(lx, 0.68, 2.02);
      car.add(hl);
    });

    const wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
    [[-1.08, 1.25], [1.08, 1.25], [-1.08, -1.25], [1.08, -1.25]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      car.add(w);
      wheels.push(w);
    });

    const badge = this.city.createTextSprite(`CAR #${numberStr}`, 'Tap Naik Mobil', '#0b1120', '#' + colorHex.toString(16).padStart(6, '0'));
    badge.position.set(0, 2.35, 0);
    badge.scale.set(2.5, 0.68, 1);
    car.add(badge);

    return { mesh: car, wheels, badge };
  }

  buildDrivableCars() {
    const specs = [
      { num: '10', name: 'Kuning #10', color: 0xfacc15, x: this.toX(0.77), z: this.toZ(0.87), rotY: Math.PI },
      { num: '11', name: 'Biru #11',   color: 0x3b82f6, x: this.toX(0.82), z: this.toZ(0.87), rotY: Math.PI },
      { num: '12', name: 'Putih #12',  color: 0xe2e8f0, x: this.toX(0.88), z: this.toZ(0.87), rotY: Math.PI },
      { num: '13', name: 'Merah #13',  color: 0xef4444, x: this.toX(0.93), z: this.toZ(0.87), rotY: Math.PI },
      // 2 Mobil Pit Cepat terparkir rapi di lintasan bawah (100% jauh dari pilar gapura masuk!)
      { num: '01', name: 'Turbo Mint #01',   color: 0x10b981, x: this.toX(0.18), z: this.toZ(0.89), rotY: Math.PI / 2 },
      { num: '02', name: 'Turbo Oranye #02', color: 0xf97316, x: this.toX(0.24), z: this.toZ(0.89), rotY: Math.PI / 2 }
    ];

    specs.forEach(sp => {
      const built = this.createDrivableCarMesh(sp.color, sp.num);
      built.mesh.position.set(sp.x, 0.22, sp.z);
      built.mesh.rotation.y = sp.rotY;
      this.group.add(built.mesh);
      this.cars.push({ ...sp, mesh: built.mesh, wheels: built.wheels, badge: built.badge });
    });
  }

  // ==================== 7. LOGIKA FREE-DRIVE + FISIKA TABRAKAN MOBIL SOLID ====================
  isInsideCircuit(x, z) {
    return x >= this.originX - 5 && x <= this.originX + this.size + 6 &&
           z >= this.originZ - 6 && z <= this.originZ + this.size + 6;
  }

  getNearestCar(x, z) {
    if (this.activeCar) return null;
    let nearest = null;
    let bestDist = 4.6;
    for (const c of this.cars) {
      const d = Math.hypot(x - c.mesh.position.x, z - c.mesh.position.z);
      if (d < bestDist) { bestDist = d; nearest = c; }
    }
    return nearest;
  }

  enterCar(car, localAvatar) {
    if (!car) return;
    this.activeCar = car;
    this.carSpeed = 0;
    car.badge.visible = false;
    if (localAvatar) {
      localAvatar.group.position.set(car.mesh.position.x, car.mesh.position.y + 0.55, car.mesh.position.z);
      localAvatar.group.rotation.y = car.mesh.rotation.y;
    }
  }

  exitCar(localAvatar) {
    if (!this.activeCar) return;
    const car = this.activeCar;
    car.badge.visible = true;
    if (localAvatar) {
      const sideX = car.mesh.position.x + Math.cos(car.mesh.rotation.y) * 2.5;
      const sideZ = car.mesh.position.z - Math.sin(car.mesh.rotation.y) * 2.5;
      localAvatar.group.position.set(sideX, 0, sideZ);
      localAvatar.groundY = 0;
    }
    this.activeCar = null;
    this.carSpeed = 0;
  }

  updateCarDriving(dt, controls, localAvatar) {
    if (!this.activeCar || !controls || !localAvatar) return 0;
    // Delegasikan ke PhysicsEngine3D (traksi aspal/rumput, suspensi pitch/roll, & tabrakan elastis solid!)
    if (this.city.physics) {
      return this.city.physics.stepVehicle(this.activeCar, dt, controls, localAvatar);
    }
    return 0;
  }
}

window.CityCircuit = CityCircuit;
