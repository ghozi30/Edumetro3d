// EduMetro 3D — Modular 3D Physics Engine (Karakter & Kendaraan)
// Fitur: Momentum & gesekan permukaan (aspal/rumput/pasir), Coyote Time + Jump Buffer,
// Auto-step trotoar rendah, Benda Kecil (height <= 1.55) solid & BISA dilompati/dinaiki,
// Benda Besar (height > 1.85) 100% solid dengan sliding halus, dan Fisika Mobil Realistis!

class PhysicsEngine3D {
  constructor(city) {
    this.city = city;
    // Karakter fisika
    this.velX = 0;
    this.velZ = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wasGrounded = true;

    // Kendaraan fisika
    this.carSpeed = 0;
    this.carAngularVel = 0;
    this.carBodyPitch = 0;
    this.carBodyRoll = 0;
  }

  // Deteksi jenis permukaan lantai di koordinat (x, z) untuk gesekan & kecepatan berbeda!
  getSurfaceType(x, z) {
    // 1. Di dalam sirkuit balap
    if (this.city.circuit && this.city.circuit.isInsideCircuit(x, z)) {
      const pts = this.city.circuit.trackPoints || [];
      for (let i = 0; i < pts.length; i += 2) {
        if (Math.hypot(x - pts[i].x, z - pts[i].y) < 5.2) return 'asphalt';
      }
      return 'grass';
    }
    // 2. Jalan raya kota (Boulevard & Bundaran & Ring Luar)
    const r = Math.hypot(x, z);
    if (Math.abs(x) < 4.5 || Math.abs(z) < 4.5) return 'asphalt';
    if (r >= 16.0 && r <= 23.8) return 'asphalt';
    if (Math.abs(x) <= 38.0 && Math.abs(z) >= 30.5 && Math.abs(z) <= 37.5) return 'asphalt';
    if (Math.abs(z) <= 38.0 && Math.abs(x) >= 30.5 && Math.abs(x) <= 37.5) return 'asphalt';
    if (r < 15.6 || Math.abs(x) < 6.2 || Math.abs(z) < 6.2) return 'sidewalk';
    return 'grass';
  }

  // Update fisika berjalan, lompat (Coyote Time), & 3D Solid Box Collision untuk Avatar
  resolveCharacter(avatar, dt) {
    if (!avatar || !avatar.group) return;
    const pos = avatar.group.position;
    const pad = 0.56;
    const stepAllowance = 0.34; // Otomatis naik tepian trotoar rendah <= 0.34 unit
    let supportY = 0;

    const resolveBox = (minX, maxX, minZ, maxZ, height) => {
      if (pos.x > minX - pad && pos.x < maxX + pad && pos.z > minZ - pad && pos.z < maxZ + pad) {
        // Jika kaki pemain berada di atas atau hampir menyentuh atas benda kecil -> mendarat / berdiri di atasnya!
        if (pos.y >= height - stepAllowance) {
          if (height > supportY) supportY = height;
          return;
        }
        // Solid wall slide sepanjang sumbu penetrasi terkecil (tidak nyangkut di sudut!)
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
    for (const c of this.city.colliders) {
      resolveBox(c.minX, c.maxX, c.minZ, c.maxZ, c.height || 10);
    }

    // 2. Cek mobil yang sedang terparkir (height 1.32 -> solid saat jalan, BISA dilompati & dinaiki!)
    if (this.city.circuit && this.city.circuit.cars) {
      for (const car of this.city.circuit.cars) {
        if (car === this.city.circuit.activeCar) continue;
        const cp = car.mesh.position;
        const isRot90 = Math.abs(Math.sin(car.mesh.rotation.y || 0)) > 0.5;
        const hw = isRot90 ? 2.15 : 1.15;
        const hd = isRot90 ? 1.15 : 2.15;
        resolveBox(cp.x - hw, cp.x + hw, cp.z - hd, cp.z + hd, 1.32);
      }
    }

    // 3. Coyote Time & Natural Gravity Drop
    avatar.groundY = supportY;
    const groundedNow = (!avatar.isJumping && pos.y <= supportY + 0.05);
    if (groundedNow) {
      this.coyoteTimer = 0.12;
      pos.y = supportY;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (!avatar.isJumping && pos.y > supportY + 0.06) {
      avatar.isJumping = true;
      avatar.jumpVelocity = 0;
    } else if (pos.y < supportY) {
      pos.y = supportY;
      avatar.isJumping = false;
      avatar.jumpVelocity = 0;
    }

    // 4. Batas dunia kota + sirkuit
    this.city.clampWorldBounds(pos);
  }

  // Fisika Berkendara Mobil Realistis (Traksi Permukaan + Pitch/Roll Suspensi + Pantulan Tabrakan!)
  stepVehicle(car, dt, controls, localAvatar) {
    let inputX = 0;
    let inputZ = 0;
    if (controls.keys.KeyW || controls.keys.ArrowUp) inputZ -= 1;
    if (controls.keys.KeyS || controls.keys.ArrowDown) inputZ += 1;
    if (controls.keys.KeyA || controls.keys.ArrowLeft) inputX -= 1;
    if (controls.keys.KeyD || controls.keys.ArrowRight) inputX += 1;

    if (controls.joystick && controls.joystick.active && controls.moveVector) {
      inputX = controls.moveVector.x || 0;
      inputZ = controls.moveVector.z || 0;
    }

    const pos = car.mesh.position;
    const surface = this.getSurfaceType(pos.x, pos.z);
    // Aspal balap punya kecepatan puncak & grip tertinggi; rumput memiliki hambatan gulir lebih besar!
    const surfaceMaxSpeed = surface === 'asphalt' ? 29.0 : (surface === 'sidewalk' ? 23.0 : 18.5);
    const surfaceGrip = surface === 'asphalt' ? 8.2 : (surface === 'sidewalk' ? 6.5 : 4.8);

    const inputMag = Math.hypot(inputX, inputZ);
    const prevSpeed = this.carSpeed;
    let steerDelta = 0;

    if (inputMag > 0.08) {
      const yaw = controls.cameraYaw || 0;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const worldDirX = rightX * inputX + forwardX * (-inputZ);
      const worldDirZ = rightZ * inputX + forwardZ * (-inputZ);
      const targetAngle = Math.atan2(worldDirX, worldDirZ);

      let diff = targetAngle - car.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      // Radius belok responsif bergantung kecepatan & traksi permukaan
      const turnRate = Math.min(1, dt * surfaceGrip);
      steerDelta = diff * turnRate;
      car.mesh.rotation.y += steerDelta;

      const targetSpeed = surfaceMaxSpeed * Math.min(1, inputMag);
      this.carSpeed += (targetSpeed - this.carSpeed) * Math.min(1, dt * 4.6);
    } else {
      // Hambatan aerodinamika + gesekan ban alami
      const drag = surface === 'grass' ? 6.8 : 4.2;
      this.carSpeed *= Math.max(0, 1 - dt * drag);
      if (Math.abs(this.carSpeed) < 0.15) this.carSpeed = 0;
    }

    // Integrasi posisi
    pos.x += Math.sin(car.mesh.rotation.y) * this.carSpeed * dt;
    pos.z += Math.cos(car.mesh.rotation.y) * this.carSpeed * dt;

    // Deteksi Tabrakan Solid + Impuls Pantulan Elastis!
    const collided = this.city.resolveCarCollisions(pos, car);
    if (collided) {
      if (Math.abs(this.carSpeed) > 6 && window.soundFX && window.soundFX.wrong) {
        // Efek benturan ringan saat nabrak kencang
        this.carSpeed = -Math.sign(this.carSpeed) * Math.min(4.5, Math.abs(this.carSpeed) * 0.28);
      } else {
        this.carSpeed *= 0.2;
      }
    }

    // Animasi Suspensi Fisik: Body Pitch (menungging saat rem / mendongak saat gas) & Roll (miring saat tikungan!)
    const accel = (this.carSpeed - prevSpeed) / Math.max(0.008, dt);
    const targetPitch = Math.max(-0.07, Math.min(0.07, -accel * 0.0022));
    const targetRoll = Math.max(-0.1, Math.min(0.1, -steerDelta * 0.65));
    this.carBodyPitch += (targetPitch - this.carBodyPitch) * Math.min(1, dt * 10);
    this.carBodyRoll += (targetRoll - this.carBodyRoll) * Math.min(1, dt * 10);
    car.mesh.rotation.x = this.carBodyPitch;
    car.mesh.rotation.z = this.carBodyRoll;

    // Putar 4 roda realistis sesuai jarak tempuh (v * dt / wheelRadius)
    const wheelRot = (this.carSpeed * dt) / 0.42;
    car.wheels.forEach(w => { w.rotation.x += wheelRot; });

    // Posisikan avatar di kokpit + kamera mengikuti mulus
    localAvatar.group.position.set(pos.x, pos.y + 0.55, pos.z);
    localAvatar.group.rotation.y = car.mesh.rotation.y;
    localAvatar.isMoving = false;
    localAvatar.isJumping = false;

    const dist = controls.cameraDistance + 3.4 + (this.carSpeed / 29) * 1.6; // Dynamic speed FOV/pullback!
    const pitch = controls.cameraPitch;
    const camYaw = controls.cameraYaw;
    const camX = pos.x + Math.sin(camYaw) * Math.cos(pitch) * dist;
    const camY = pos.y + 2.3 + Math.sin(pitch) * dist;
    const camZ = pos.z + Math.cos(camYaw) * Math.cos(pitch) * dist;
    controls.camera.position.lerp(new THREE.Vector3(camX, Math.max(2.0, camY), camZ), Math.min(1, dt * 10));
    controls.camera.lookAt(pos.x, pos.y + 1.4, pos.z);

    return Math.round(Math.abs(this.carSpeed) * 4.2);
  }
}

window.PhysicsEngine3D = PhysicsEngine3D;
