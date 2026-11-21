// 3D Avatar Engine: Procedural Cute Character Generator with Customization & Animations

class Avatar3D {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.name = options.name || 'Siswa';
    this.color = options.color || '#4361ee';
    this.hat = options.hat || 'none';
    this.isLocal = options.isLocal || false;

    this.group = new THREE.Group();
    this.limbs = {};
    this.nameSprite = null;
    this.emoteSprite = null;
    this.emoteTimer = 0;

    // Animation state
    this.animTime = 0;
    this.isMoving = false;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.groundY = 0;
    this.verticalOffset = 0;

    this.buildCharacter();
    this.buildNameTag(this.name);
    this.scene.add(this.group);
  }

  buildCharacter() {
    // Parsing color
    const bodyColor = new THREE.Color(this.color);
    const skinColor = new THREE.Color(0xffdbac); // Soft anime skin tone
    const pantsColor = new THREE.Color(0x1e293b); // Navy pants
    const shoeColor = new THREE.Color(0x0f172a);

    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
    const shoeMat = new THREE.MeshLambertMaterial({ color: shoeColor });

    // 1. Torso (Baju)
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.55);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.group.add(torso);
    this.limbs.torso = torso;

    // 2. Head (Kepala)
    const headGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.4;
    head.castShadow = true;
    this.group.add(head);
    this.limbs.head = head;

    // Cute Anime / Chibi Eyes & Smile
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.18, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.22, 2.42, 0.44);
    this.group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.22, 2.42, 0.44);
    this.group.add(rightEye);

    // Cheeks (Blush)
    const blushGeo = new THREE.BoxGeometry(0.14, 0.08, 0.05);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3 });
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.25, 2.28, 0.44);
    this.group.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.25, 2.28, 0.44);
    this.group.add(rightBlush);

    // 3. Hair (Rambut Stylish)
    const hairGeo = new THREE.BoxGeometry(0.92, 0.35, 0.92);
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x2b1e1a });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.85;
    this.group.add(hair);

    // 4. Hat / Accessory
    this.addAccessory(this.hat);

    // 5. Left Arm Pivot & Mesh
    this.limbs.leftArmPivot = new THREE.Group();
    this.limbs.leftArmPivot.position.set(-0.62, 1.8, 0);
    const armGeo = new THREE.BoxGeometry(0.3, 0.85, 0.3);
    const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    leftArmMesh.position.y = -0.4;
    leftArmMesh.castShadow = true;
    this.limbs.leftArmPivot.add(leftArmMesh);
    this.group.add(this.limbs.leftArmPivot);

    // 6. Right Arm Pivot & Mesh
    this.limbs.rightArmPivot = new THREE.Group();
    this.limbs.rightArmPivot.position.set(0.62, 1.8, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmMesh.position.y = -0.4;
    rightArmMesh.castShadow = true;
    this.limbs.rightArmPivot.add(rightArmMesh);
    this.group.add(this.limbs.rightArmPivot);

    // 7. Left Leg Pivot & Mesh
    this.limbs.leftLegPivot = new THREE.Group();
    this.limbs.leftLegPivot.position.set(-0.25, 0.8, 0);
    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.4;
    leftLegMesh.castShadow = true;
    this.limbs.leftLegPivot.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.45), shoeMat);
    leftShoe.position.set(0, -0.75, 0.05);
    this.limbs.leftLegPivot.add(leftShoe);
    this.group.add(this.limbs.leftLegPivot);

    // 8. Right Leg Pivot & Mesh
    this.limbs.rightLegPivot = new THREE.Group();
    this.limbs.rightLegPivot.position.set(0.25, 0.8, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.4;
    rightLegMesh.castShadow = true;
    this.limbs.rightLegPivot.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.45), shoeMat);
    rightShoe.position.set(0, -0.75, 0.05);
    this.limbs.rightLegPivot.add(rightShoe);
    this.group.add(this.limbs.rightLegPivot);
  }

  addAccessory(hatType) {
    if (hatType === 'mahkota') {
      // Golden Crown
      const crownGeo = new THREE.CylinderGeometry(0.45, 0.4, 0.35, 6);
      const crownMat = new THREE.MeshLambertMaterial({ color: 0xffd166, metalness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 3.1;
      this.group.add(crown);
    } else if (hatType === 'topi_sekolah') {
      // Topi Merah Putih Siswa
      const capGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16);
      const capMat = new THREE.MeshLambertMaterial({ color: 0xef233c });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 3.05;

      const visorGeo = new THREE.BoxGeometry(0.6, 0.08, 0.35);
      const visorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 2.95, 0.4);
      this.group.add(cap);
      this.group.add(visor);
    } else if (hatType === 'topi_wisuda') {
      // Toga Wisuda / Mahasiswa
      const togaBase = new THREE.CylinderGeometry(0.42, 0.45, 0.2, 16);
      const togaMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
      const base = new THREE.Mesh(togaBase, togaMat);
      base.position.y = 3.05;

      const togaTop = new THREE.BoxGeometry(1.1, 0.06, 1.1);
      const top = new THREE.Mesh(togaTop, togaMat);
      top.position.y = 3.18;
      this.group.add(base);
      this.group.add(top);
    } else if (hatType === 'telinga_kucing') {
      // Cute Cat Ears
      const earGeo = new THREE.ConeGeometry(0.18, 0.3, 4);
      const earMat = new THREE.MeshLambertMaterial({ color: 0xffb703 });

      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.32, 3.12, 0);
      leftEar.rotation.z = 0.2;

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.32, 3.12, 0);
      rightEar.rotation.z = -0.2;

      this.group.add(leftEar);
      this.group.add(rightEar);
    }
  }

  buildNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Tag Pill Background
    ctx.fillStyle = this.isLocal ? 'rgba(67, 97, 238, 0.92)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24);
    ctx.fill();

    ctx.strokeStyle = this.isLocal ? '#4cc9f0' : '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.position.set(0, 3.8, 0);
    this.nameSprite.scale.set(3.2, 0.8, 1);
    this.group.add(this.nameSprite);
  }

  showEmote(emoji) {
    if (this.emoteSprite) {
      this.group.remove(this.emoteSprite);
      this.emoteSprite = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Speech bubble circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(80, 70, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4361ee';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(70, 130);
    ctx.lineTo(80, 150);
    ctx.lineTo(90, 130);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Emoji icon
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 80, 72);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.emoteSprite = new THREE.Sprite(spriteMat);
    this.emoteSprite.position.set(0, 4.8, 0);
    this.emoteSprite.scale.set(1.8, 1.8, 1);
    this.group.add(this.emoteSprite);

    this.emoteTimer = 3.0; // Show for 3 seconds
  }

  update(delta) {
    this.animTime += delta;

    // Emote timer countdown
    if (this.emoteSprite && this.emoteTimer > 0) {
      this.emoteTimer -= delta;
      if (this.emoteTimer <= 0) {
        this.group.remove(this.emoteSprite);
        this.emoteSprite = null;
      }
    }

    // Walking / Running Animation
    if (this.isMoving) {
      const speed = 12;
      const swingAngle = Math.sin(this.animTime * speed) * 0.65;

      this.limbs.leftArmPivot.rotation.x = -swingAngle;
      this.limbs.rightArmPivot.rotation.x = swingAngle;

      this.limbs.leftLegPivot.rotation.x = swingAngle;
      this.limbs.rightLegPivot.rotation.x = -swingAngle;

      // Bobbing torso
      this.limbs.torso.position.y = 1.35 + Math.abs(Math.sin(this.animTime * speed)) * 0.12;
      this.limbs.head.position.y = 2.4 + Math.abs(Math.sin(this.animTime * speed)) * 0.12;
    } else {
      // Idle Breathing Animation
      const breath = Math.sin(this.animTime * 3) * 0.04;
      this.limbs.torso.position.y = 1.35 + breath;
      this.limbs.head.position.y = 2.4 + breath * 1.2;

      this.limbs.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.limbs.leftArmPivot.rotation.x, 0, 0.1);
      this.limbs.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.limbs.rightArmPivot.rotation.x, 0, 0.1);
      this.limbs.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.limbs.leftLegPivot.rotation.x, 0, 0.1);
      this.limbs.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.limbs.rightLegPivot.rotation.x, 0, 0.1);
    }

    // Jump Handling (Fisika gravitasi HANYA untuk Local player; remote player mengikuti koordinat Y real-time dari server!)
    if (this.isJumping) {
      // Raise arms during jump (visual untuk local & remote)
      this.limbs.leftArmPivot.rotation.x = -1.2;
      this.limbs.rightArmPivot.rotation.x = -1.2;

      if (this.isLocal) {
        this.jumpVelocity -= 22 * delta; // Gravity
        this.group.position.y += this.jumpVelocity * delta;

        if (this.group.position.y <= this.groundY) {
          this.group.position.y = this.groundY;
          this.isJumping = false;
          this.jumpVelocity = 0;
        }
      }
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = 9.0;
      if (window.soundFX) window.soundFX.jump();
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

window.Avatar3D = Avatar3D;
