// Input & Camera Controls: Desktop Keyboard/Mouse + Mobile Virtual Joystick & Jump Button

class Controls {
  constructor(camera, avatar, container, options = {}) {
    this.camera = camera;
    this.avatar = avatar;
    this.container = container;

    // Movement state
    this.moveVector = { x: 0, z: 0 };
    this.isMoving = false;
    this.moveSpeed = options.moveSpeed || 10;
    this.maxRadius = options.maxRadius || 29.5;
    this.enabled = true;

    // Camera orbit angles (adaptif untuk HP Portrait, HP Landscape, iPad/Tablet, dan Desktop)
    this.userCameraDistance = options.cameraDistance || null;
    this.userCameraPitch = options.cameraPitch !== undefined ? options.cameraPitch : null;
    this.cameraDistance = 10;
    this.cameraHeight = 5;
    this.cameraYaw = 0; // Horizontal rotation
    this.cameraPitch = 0.25; // Vertical tilt
    this.applyResponsiveCameraPreset();

    // Pointer / Touch tracking for camera & pinch-zoom
    this.isPointerDown = false;
    this.prevPointerPos = { x: 0, y: 0 };
    this.cameraTouchId = null;
    this.prevCameraTouch = null;
    this.pinchStartDist = null;
    this.pinchStartCamDist = null;

    // Keyboard keys
    this.keys = {
      KeyW: false, KeyS: false, KeyA: false, KeyD: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      Space: false
    };

    // Mobile Virtual Joystick elements
    this.joystick = {
      active: false,
      touchId: null,
      baseX: 0, baseY: 0,
      currX: 0, currY: 0,
      maxRadius: 45
    };

    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();

    // Adaptasi otomatis saat HP/iPad diputar antara Portrait dan Landscape
    window.addEventListener('resize', () => this.applyResponsiveCameraPreset());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.applyResponsiveCameraPreset(), 120);
    });
  }

  applyResponsiveCameraPreset() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isPortrait = h > w;
    const isPhone = w <= 767;
    const isTablet = w >= 768 && w <= 1366 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!this.userCameraDistance) {
      if (isPhone && isPortrait) this.cameraDistance = 14;
      else if (isPhone && !isPortrait) this.cameraDistance = 11.5;
      else if (isTablet && isPortrait) this.cameraDistance = 12.8;
      else if (isTablet && !isPortrait) this.cameraDistance = 11;
      else this.cameraDistance = 10;
    } else {
      this.cameraDistance = this.userCameraDistance;
    }

    if (this.userCameraPitch === null) {
      if (isPhone && isPortrait) this.cameraPitch = 0.36;
      else if (isTablet && isPortrait) this.cameraPitch = 0.32;
      else this.cameraPitch = 0.26;
    } else {
      this.cameraPitch = this.userCameraPitch;
    }
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
        if (e.code === 'Space') {
          e.preventDefault();
          this.avatar.jump();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });
  }

  setupMouse() {
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) { // Klik kiri atau kanan bisa putar kamera bebas
        this.isPointerDown = true;
        this.prevPointerPos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.prevPointerPos.x;
      const dy = e.clientY - this.prevPointerPos.y;
      this.prevPointerPos = { x: e.clientX, y: e.clientY };

      this.cameraYaw -= dx * 0.0055;
      this.cameraPitch += dy * 0.0045;
      // Bebas mendongak ke atas (-72°) hingga melihat lurus ke bawah (+87°)
      this.cameraPitch = Math.max(-1.25, Math.min(1.52, this.cameraPitch));
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });

    // Zoom with scroll wheel
    this.container.addEventListener('wheel', (e) => {
      this.cameraDistance += e.deltaY * 0.006;
      this.cameraDistance = Math.max(4, Math.min(28, this.cameraDistance));
    }, { passive: true });
  }

  setupTouch() {
    const joyZone = document.getElementById('mobile-joystick-zone');
    const joyKnob = document.getElementById('mobile-joystick-knob');
    const jumpBtn = document.getElementById('mobile-jump-btn');

    if (!joyZone || !joyKnob) return;

    // 1. Virtual Joystick Touch Handler (radius otomatis mengikuti ukuran HP / iPad!)
    joyZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.changedTouches[0];
      const rect = joyZone.getBoundingClientRect();

      this.joystick.active = true;
      this.joystick.touchId = touch.identifier;
      this.joystick.baseX = rect.left + rect.width / 2;
      this.joystick.baseY = rect.top + rect.height / 2;
      this.joystick.maxRadius = Math.max(30, rect.width * 0.38);
      this.handleJoystickMove(touch.clientX, touch.clientY, joyKnob);
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystick.touchId) {
          this.handleJoystickMove(touch.clientX, touch.clientY, joyKnob);
        }
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystick.touchId) {
          this.joystick.active = false;
          this.joystick.touchId = null;
          this.moveVector = { x: 0, z: 0 };
          this.isMoving = false;
          if (this.avatar) this.avatar.isMoving = false;
          joyKnob.style.transform = `translate(-50%, -50%)`;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoystick);
    joyZone.addEventListener('touchcancel', endJoystick);
    window.addEventListener('touchend', endJoystick);
    window.addEventListener('touchcancel', endJoystick);

    // 2. Mobile Jump Button (touch & click — terpisah dari rotasi kamera!)
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.avatar.jump();
      }, { passive: false });
      jumpBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.avatar.jump();
      });
    }

    // Mouse fallback pada analog joystick (untuk tablet hybrid / uji mode responsif browser)
    let mouseJoyActive = false;
    joyZone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = joyZone.getBoundingClientRect();
      mouseJoyActive = true;
      this.joystick.active = true;
      this.joystick.baseX = rect.left + rect.width / 2;
      this.joystick.baseY = rect.top + rect.height / 2;
      this.joystick.maxRadius = Math.max(30, rect.width * 0.38);
      this.handleJoystickMove(e.clientX, e.clientY, joyKnob);
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseJoyActive) return;
      this.handleJoystickMove(e.clientX, e.clientY, joyKnob);
    });
    window.addEventListener('mouseup', () => {
      if (!mouseJoyActive) return;
      mouseJoyActive = false;
      this.joystick.active = false;
      this.moveVector = { x: 0, z: 0 };
      joyKnob.style.transform = `translate(-50%, -50%)`;
    });

    // 3. Sentuh geser di luar analog untuk memutar kamera bebas 360° + 2-jari Pinch-to-Zoom (HP & iPad)
    const getCameraTouches = (touchList) => {
      const arr = [];
      for (let i = 0; i < touchList.length; i++) {
        if (touchList[i].identifier !== this.joystick.touchId) arr.push(touchList[i]);
      }
      return arr;
    };

    this.container.addEventListener('touchstart', (e) => {
      const camTouches = getCameraTouches(e.touches);
      if (camTouches.length === 2) {
        const dx = camTouches[0].clientX - camTouches[1].clientX;
        const dy = camTouches[0].clientY - camTouches[1].clientY;
        this.pinchStartDist = Math.hypot(dx, dy);
        this.pinchStartCamDist = this.cameraDistance;
        this.cameraTouchId = null;
        this.prevCameraTouch = null;
        return;
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.cameraTouchId === null && touch.identifier !== this.joystick.touchId) {
          this.cameraTouchId = touch.identifier;
          this.prevCameraTouch = { x: touch.clientX, y: touch.clientY };
        }
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      const camTouches = getCameraTouches(e.touches);
      if (camTouches.length === 2 && this.pinchStartDist) {
        const dx = camTouches[0].clientX - camTouches[1].clientX;
        const dy = camTouches[0].clientY - camTouches[1].clientY;
        const curDist = Math.hypot(dx, dy);
        const scale = this.pinchStartDist / Math.max(20, curDist);
        this.cameraDistance = Math.max(5.5, Math.min(24, this.pinchStartCamDist * scale));
        return;
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.cameraTouchId && this.prevCameraTouch) {
          const dx = touch.clientX - this.prevCameraTouch.x;
          const dy = touch.clientY - this.prevCameraTouch.y;
          this.prevCameraTouch = { x: touch.clientX, y: touch.clientY };

          const sens = window.innerWidth >= 768 ? 0.0052 : 0.0068;
          this.cameraYaw -= dx * sens;
          this.cameraPitch += dy * (sens * 0.8);
          this.cameraPitch = Math.max(-1.25, Math.min(1.52, this.cameraPitch));
        }
      }
    }, { passive: true });

    const endCameraTouch = (e) => {
      const camTouches = getCameraTouches(e.touches);
      if (camTouches.length < 2) {
        this.pinchStartDist = null;
        this.pinchStartCamDist = null;
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.cameraTouchId) {
          this.cameraTouchId = null;
          this.prevCameraTouch = null;
        }
      }
    };
    this.container.addEventListener('touchend', endCameraTouch);
    this.container.addEventListener('touchcancel', endCameraTouch);
  }

  handleJoystickMove(clientX, clientY, knobEl) {
    const dx = clientX - this.joystick.baseX;
    const dy = clientY - this.joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this.joystick.maxRadius;

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxR) {
      clampedX = (dx / dist) * maxR;
      clampedY = (dy / dist) * maxR;
    }

    knobEl.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

    // Deadzone ringan 8% agar karakter tidak bergeser sendiri saat ibu jari diam di tengah
    const normX = clampedX / maxR;
    const normZ = clampedY / maxR;
    const mag = Math.hypot(normX, normZ);
    if (mag < 0.08) {
      this.moveVector.x = 0;
      this.moveVector.z = 0;
    } else {
      this.moveVector.x = normX;
      this.moveVector.z = normZ;
    }
  }

  update(delta) {
    if (!this.enabled) return;
    // 1. Gather directional input
    let inputX = 0;
    let inputZ = 0;

    if (this.keys.KeyW || this.keys.ArrowUp) inputZ -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) inputZ += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) inputX -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) inputX += 1;

    // Mobile joystick override if active
    if (this.joystick.active) {
      inputX = this.moveVector.x;
      inputZ = this.moveVector.z;
    }

    const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
    this.isMoving = inputLength > 0.15;
    this.avatar.isMoving = this.isMoving;

    if (this.isMoving) {
      // Normalize
      const normX = inputX / (inputLength > 1 ? inputLength : 1);
      const normZ = inputZ / (inputLength > 1 ? inputLength : 1);

      // Hitung arah gerak relatif terhadap arah pandang kamera
      // Kamera berada di belakang (+sin(yaw), +cos(yaw)), sehingga arah maju kamera adalah (-sin(yaw), -cos(yaw))
      const forwardX = -Math.sin(this.cameraYaw);
      const forwardZ = -Math.cos(this.cameraYaw);
      const rightX = Math.cos(this.cameraYaw);
      const rightZ = -Math.sin(this.cameraYaw);

      // W / Panah Atas (normZ = -1) -> maju (+1); D / Panah Kanan (normX = +1) -> kanan (+1)
      const forwardInput = -normZ;
      const rightInput = normX;

      const worldDirX = forwardX * forwardInput + rightX * rightInput;
      const worldDirZ = forwardZ * forwardInput + rightZ * rightInput;

      // Move avatar
      this.avatar.group.position.x += worldDirX * this.moveSpeed * delta;
      this.avatar.group.position.z += worldDirZ * this.moveSpeed * delta;

      // Keep avatar inside boundary
      const currentDist = Math.sqrt(
        this.avatar.group.position.x * this.avatar.group.position.x +
        this.avatar.group.position.z * this.avatar.group.position.z
      );
      if (currentDist > this.maxRadius) {
        const ratio = this.maxRadius / currentDist;
        this.avatar.group.position.x *= ratio;
        this.avatar.group.position.z *= ratio;
      }

      // Smooth avatar rotation towards movement direction
      const targetRotationY = Math.atan2(worldDirX, worldDirZ);
      let diff = targetRotationY - this.avatar.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.avatar.group.rotation.y += diff * 12 * delta;
    }

    // 2. Camera smooth follow bebas 360° (bisa lihat ke atas langit maupun lurus ke bawah)
    const avatarPos = this.avatar.group.position;
    const horizDist = Math.cos(this.cameraPitch) * this.cameraDistance;
    const rawCamY = avatarPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + 2.4;

    const targetCamX = avatarPos.x + Math.sin(this.cameraYaw) * horizDist;
    const targetCamY = Math.max(0.75, rawCamY); // Jangan tembus tanah saat mendongak tinggi
    const targetCamZ = avatarPos.z + Math.cos(this.cameraYaw) * horizDist;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.18);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.18);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.18);

    // Jika pemain mendongak ke atas (cameraPitch < 0), naikkan titik pandang agar benar-benar bisa melihat ke atas!
    const lookUpOffset = this.cameraPitch < 0 ? Math.abs(this.cameraPitch) * 10 : 0;
    this.camera.lookAt(avatarPos.x, avatarPos.y + 1.8 + lookUpOffset, avatarPos.z);
  }
}

window.Controls = Controls;
