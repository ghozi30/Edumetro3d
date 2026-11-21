// Network Client Engine: Socket.IO Communication with Lag Compensation & Lightweight Sync

class NetworkClient {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.isHost = false;
    this.myPlayerId = null;

    // Remote players registry: { [socketId]: { avatar, targetPos, targetRot, isMoving, isJumping } }
    this.remotePlayers = {};

    // Throttled movement emission (20Hz = 50ms)
    this.lastEmitTime = 0;
    this.emitInterval = 50; // ms
    this.lastSentState = { x: 0, y: 0, z: 0, rotY: 0, isMoving: false, isJumping: false };

    // Event callbacks
    this.callbacks = {};
  }

  connect(onConnected) {
    if (this.socket) return;
    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.myPlayerId = this.socket.id;
      console.log('Terhubung ke Server EduVerse! ID:', this.socket.id);
      if (onConnected) onConnected(this.socket.id);
    });

    this.setupListeners();
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  setupListeners() {
    // 1. Remote player joined
    this.socket.on('player_joined_3d', (playerData) => {
      this.trigger('remote_player_joined', playerData);
    });

    // 2. Remote player moved
    this.socket.on('player_moved_3d', (moveData) => {
      const rp = this.remotePlayers[moveData.id];
      if (rp) {
        rp.lastNetTime = performance.now();
        rp.targetPos = { x: moveData.x, y: moveData.y, z: moveData.z };
        rp.targetRotY = moveData.rotY;
        rp.isMoving = !!moveData.isMoving;
        rp.isJumping = !!moveData.isJumping;
      }
    });

    // 3. Remote player left
    this.socket.on('player_left_3d', (socketId) => {
      if (this.remotePlayers[socketId]) {
        this.remotePlayers[socketId].avatar.destroy();
        delete this.remotePlayers[socketId];
      }
      this.trigger('player_left', socketId);
    });

    // 4. Player list updated
    this.socket.on('player_list_updated', (playersList) => {
      this.trigger('player_list_updated', playersList);
    });

    // 5. Question round started
    this.socket.on('question_started', (questionData) => {
      this.trigger('question_started', questionData);
    });

    // 6. Timer tick
    this.socket.on('timer_tick', (data) => {
      this.trigger('timer_tick', data);
    });

    // 7. Question result reveal
    this.socket.on('question_result', (resultData) => {
      this.trigger('question_result', resultData);
    });

    // 8. Game finished
    this.socket.on('game_finished', (finishData) => {
      this.trigger('game_finished', finishData);
    });

    // 9. Emote pop
    this.socket.on('player_emote_3d', (data) => {
      this.trigger('player_emote', data);
    });

    // 10. Chat message
    this.socket.on('chat_message', (chatData) => {
      this.trigger('chat_message', chatData);
    });

    // 11. Host disconnected
    this.socket.on('host_disconnected', () => {
      this.trigger('host_disconnected');
    });
  }

  // Send local player movement with rate-limiting & immediate reliable state changes
  sendMovement(localAvatar) {
    if (!this.socket || !this.roomCode) return;
    const now = performance.now();
    const pos = localAvatar.group.position;
    const rotY = localAvatar.group.rotation.y;
    const isMoving = !!localAvatar.isMoving;
    const isJumping = !!localAvatar.isJumping;

    const dState = isMoving !== this.lastSentState.isMoving || isJumping !== this.lastSentState.isJumping;
    if (!dState && now - this.lastEmitTime < 33) return; // 30Hz real-time

    const dx = Math.abs(pos.x - this.lastSentState.x);
    const dy = Math.abs(pos.y - this.lastSentState.y);
    const dz = Math.abs(pos.z - this.lastSentState.z);
    const drot = Math.abs(rotY - this.lastSentState.rotY);

    if (dState || dx > 0.02 || dy > 0.02 || dz > 0.02 || drot > 0.03) {
      const payload = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100,
        rotY: Math.round(rotY * 100) / 100,
        isMoving,
        isJumping
      };
      if (dState) {
        this.socket.emit('player_move_3d', payload);
      } else {
        this.socket.volatile.emit('player_move_3d', payload);
      }

      this.lastSentState = { x: pos.x, y: pos.y, z: pos.z, rotY, isMoving, isJumping };
      this.lastEmitTime = now;
    }
  }

  // Standing on zone A (0), B (1), C (2), D (3) or null
  sendStandingZone(zoneIndex) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('player_stand_on_zone', zoneIndex);
  }

  sendEmote(emoji) {
    if (!this.socket) return;
    this.socket.emit('send_emote', emoji);
  }

  sendChat(text) {
    if (!this.socket) return;
    this.socket.emit('send_chat', text);
  }

  // Smooth remote avatars interpolation in game render loop (real-time, zero blink)
  updateRemoteAvatars(delta) {
    const smoothPos = 1 - Math.exp(-18 * delta);
    const smoothRot = 1 - Math.exp(-20 * delta);
    const nowMs = performance.now();
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (!rp || !rp.avatar) continue;

      if (rp.targetPos) {
        const jumpDist = Math.hypot(rp.targetPos.x - rp.avatar.group.position.x, rp.targetPos.z - rp.avatar.group.position.z);
        if (jumpDist > 14) {
          rp.avatar.group.position.set(rp.targetPos.x, rp.targetPos.y, rp.targetPos.z);
        } else {
          rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, smoothPos);
          rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, smoothPos);
          rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, smoothPos);
        }
      }

      if (rp.targetRotY !== undefined) {
        let diff = rp.targetRotY - rp.avatar.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rp.avatar.group.rotation.y += diff * smoothRot;
      }

      const stale = rp.lastNetTime && (nowMs - rp.lastNetTime > 350);
      rp.avatar.isMoving = stale ? false : !!rp.isMoving;
      rp.avatar.isJumping = (stale && (!rp.targetPos || rp.targetPos.y <= 0.08)) ? false : !!rp.isJumping;
      rp.avatar.update(delta);
    }
  }
}

window.NetworkClient = new NetworkClient();
