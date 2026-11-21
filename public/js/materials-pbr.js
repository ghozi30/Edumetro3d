// EduMetro 3D — Essential Procedural PBR Material & Studio Daylight Environment Library
// Menghasilkan tekstur Albedo + Bump + Roughness secara lokal (100% offline, ringan & tajam)
// plus PMREM Studio Daylight Reflection Map agar kaca, air, logam, & bodi mobil berkilau realistis!

(function () {
  const cache = {};

  function createNoiseCanvas(size, baseHex, variance, patternFn) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    // Deterministic pseudo-random noise untuk tekstur konsisten
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < data.length; i += 4) {
      const n = (rnd() - 0.5) * variance;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
    if (patternFn) patternFn(ctx, size);
    return c;
  }

  function wrapTex(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 4;
    return tex;
  }

  // 1. Studio Daylight Environment Map (PMREM) untuk pantulan kaca, air, & cat mobil clearcoat!
  function buildStudioEnvMap(renderer) {
    if (cache.envMap) return cache.envMap;
    if (!THREE.PMREMGenerator) return null;
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      // Langit kubah gradasi siang cerah -> cakrawala hangat -> pantulan tanah lembut
      const skyC = document.createElement('canvas');
      skyC.width = 256;
      skyC.height = 128;
      const sctx = skyC.getContext('2d');
      const g = sctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0.0, '#38bdf8');
      g.addColorStop(0.45, '#bae6fd');
      g.addColorStop(0.54, '#fffbeb');
      g.addColorStop(0.65, '#86efac');
      g.addColorStop(1.0, '#4ade80');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 256, 128);

      // Titik matahari studio lembut agar muncul specular highlight di kaca & atap mobil
      const sunG = sctx.createRadialGradient(180, 32, 2, 180, 32, 24);
      sunG.addColorStop(0, 'rgba(255,255,255,1)');
      sunG.addColorStop(1, 'rgba(255,255,255,0)');
      sctx.fillStyle = sunG;
      sctx.fillRect(150, 4, 60, 60);

      const skyTex = new THREE.CanvasTexture(skyC);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(50, 24, 16),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
      );
      envScene.add(dome);

      const rt = pmrem.fromScene(envScene, 0.04);
      pmrem.dispose();
      cache.envMap = rt.texture;
      return cache.envMap;
    } catch (_) {
      return null;
    }
  }

  // 2. Tekstur PBR Aspal (Mineral Grain Albedo + Bump)
  function getAsphaltMaps(repX = 4, repY = 24) {
    const key = `asphalt_${repX}_${repY}`;
    if (cache[key]) return cache[key];
    const albedoC = createNoiseCanvas(256, '#4b596d', 24);
    const bumpC = createNoiseCanvas(256, '#808080', 55);
    cache[key] = {
      map: wrapTex(albedoC, repX, repY),
      bumpMap: wrapTex(bumpC, repX, repY)
    };
    return cache[key];
  }

  // 3. Tekstur PBR Trotoar Batu Arsitektural (Warm Limestone Tiles + Joint Bump)
  function getSidewalkMaps(repX = 6, repY = 6) {
    const key = `sidewalk_${repX}_${repY}`;
    if (cache[key]) return cache[key];
    const drawTiles = (ctx, s, lineCol) => {
      ctx.strokeStyle = lineCol;
      ctx.lineWidth = 3;
      const step = s / 4;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(s, i * step); ctx.stroke();
      }
    };
    const albedoC = createNoiseCanvas(256, '#e8dfd1', 12, (ctx, s) => drawTiles(ctx, s, 'rgba(148,136,120,0.35)'));
    const bumpC = createNoiseCanvas(256, '#b0b0b0', 18, (ctx, s) => drawTiles(ctx, s, '#404040'));
    cache[key] = {
      map: wrapTex(albedoC, repX, repY),
      bumpMap: wrapTex(bumpC, repX, repY)
    };
    return cache[key];
  }

  // 4. Tekstur PBR Rumput Diorama Organik
  function getGrassMaps(repX = 18, repY = 18) {
    const key = `grass_${repX}_${repY}`;
    if (cache[key]) return cache[key];
    const albedoC = createNoiseCanvas(256, '#58c443', 20, (ctx, s) => {
      for (let i = 0; i < 180; i++) {
        const x = (i * 53) % s;
        const y = (i * 97) % s;
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(134, 239, 172, 0.22)' : 'rgba(21, 128, 61, 0.16)';
        ctx.beginPath();
        ctx.arc(x, y, 4 + (i % 6), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const bumpC = createNoiseCanvas(256, '#808080', 38);
    cache[key] = {
      map: wrapTex(albedoC, repX, repY),
      bumpMap: wrapTex(bumpC, repX, repY)
    };
    return cache[key];
  }

  // 5. Tekstur PBR Plester Arsitektural Halus (untuk dinding gedung diorama agar terasa taktil)
  function getPlasterBumpMap() {
    if (cache.plasterBump) return cache.plasterBump;
    const c = createNoiseCanvas(128, '#808080', 22);
    cache.plasterBump = wrapTex(c, 2, 2);
    return cache.plasterBump;
  }

  window.PBR_ASSETS = {
    buildStudioEnvMap,
    getAsphaltMaps,
    getSidewalkMaps,
    getGrassMaps,
    getPlasterBumpMap
  };
})();
