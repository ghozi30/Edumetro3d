// Controller Utama Lobby Perkotaan 3D — EduMetro 3D (Hub 20 Mini Games)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inisialisasi Dunia Kota 3D (Live Background langsung aktif)
  const canvasContainer = document.getElementById('city-canvas-container');
  const city = new City3D(canvasContainer);

  // State Pemain & Sesi (Single-Player Private Server vs Multiplayer Guru/Murid)
  let inCity = false;
  let playMode = sessionStorage.getItem('eduverse_play_mode') || 'solo'; // 'solo' | 'multiplayer'
  let mpRole = sessionStorage.getItem('eduverse_mp_role') || 'student'; // 'student' | 'teacher'
  let soloWithBots = sessionStorage.getItem('eduverse_solo_bots') === '1';
  let playerRole = sessionStorage.getItem('eduverse_city_role') || 'solo'; // 'solo' | 'student' | 'teacher'
  let serverCode = sessionStorage.getItem('eduverse_server_code') || '';
  let serverMeta = null;
  try {
    const savedMeta = sessionStorage.getItem('eduverse_server_meta');
    if (savedMeta) serverMeta = JSON.parse(savedMeta);
  } catch (e) {}

  let playerName = sessionStorage.getItem('eduverse_name') || '';
  let playerColor = sessionStorage.getItem('eduverse_color') || '#38bdf8';
  let playerHat = sessionStorage.getItem('eduverse_hat') || 'none';

  let localAvatar = null;
  let controls = null;
  let socket = null;
  let socketListenersBound = false;
  const remotePlayers = {}; // { [id]: { avatar, targetPos, targetRotY, isMoving, isJumping, role, name } }
  let latestRoster = [];
  let soloBots = [];
  let activeNearbyBuilding = null;
  let lastEmitTime = 0;
  let lastSentPos = { x: 0, y: 0, z: 0, rotY: 0, isMoving: false, isJumping: false };

  // Referensi Elemen UI
  const landingOverlay = document.getElementById('landing-overlay');
  const cityHud = document.getElementById('city-hud');
  const nameInput = document.getElementById('landing-player-name');
  const hatSelect = document.getElementById('landing-hat-select');
  const teacherBanner = document.getElementById('landing-teacher-banner');
  const buildingPrompt = document.getElementById('building-prompt');
  const menuFeedback = document.getElementById('menu-inline-feedback');

  // Elemen Mode Switcher & Sub-Mode
  const tabModeSolo = document.getElementById('tab-mode-solo');
  const tabModeMulti = document.getElementById('tab-mode-multi');
  const panelModeSolo = document.getElementById('panel-mode-solo');
  const panelModeMulti = document.getElementById('panel-mode-multi');
  const btnSoloEmpty = document.getElementById('btn-solo-empty');
  const btnSoloBots = document.getElementById('btn-solo-bots');
  const btnMpStudent = document.getElementById('btn-mp-role-student');
  const btnMpTeacher = document.getElementById('btn-mp-role-teacher');
  const mpStudentFields = document.getElementById('mp-student-fields');
  const mpTeacherFields = document.getElementById('mp-teacher-fields');
  const mpJoinCodeInput = document.getElementById('mp-join-code');
  const mpServerNameInput = document.getElementById('mp-server-name');
  const labelPlayerName = document.getElementById('label-player-name');
  const btnEnterSubmit = document.getElementById('btn-enter-city-submit');
  const btnEnterLabel = document.getElementById('btn-enter-city-label');
  const footerHint = document.getElementById('landing-footer-hint');

  // Elemen HUD Server Bar & Modal Proyektor Kode Guru
  const hudServerBar = document.getElementById('hud-server-bar');
  const hudServerTag = document.getElementById('hud-server-tag');
  const hudServerCodeVal = document.getElementById('hud-server-code-val');
  const btnHudToggleBots = document.getElementById('btn-hud-toggle-bots');
  const btnHudCopyCode = document.getElementById('btn-hud-copy-code');
  const btnHudOpenServerModal = document.getElementById('btn-hud-open-server-modal');
  const serverCodeModal = document.getElementById('server-code-modal');

  function formatDisplayCode(code) {
    const clean = String(code || '').replace(/\s+/g, '');
    if (/^\d{6}$/.test(clean)) return clean.slice(0, 3) + ' ' + clean.slice(3);
    return clean || 'SOLO';
  }

  function generateSoloCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'SOLO_';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function setMenuFeedback(msg, isError = true) {
    if (!menuFeedback) return;
    menuFeedback.textContent = msg || '';
    menuFeedback.style.color = isError ? '#fb7185' : '#34d399';
  }

  // Auto-format input kode 6 digit ala Kahoot / Quizizz (misal 482 917)
  if (mpJoinCodeInput) {
    mpJoinCodeInput.addEventListener('input', () => {
      const digits = mpJoinCodeInput.value.replace(/\D/g, '').slice(0, 6);
      mpJoinCodeInput.value = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
      setMenuFeedback('');
    });
  }

  // Pulihkan nilai awal jika sudah tersimpan di sesi
  if (playerName) nameInput.value = playerName;
  if (playerHat) hatSelect.value = playerHat;
  if (serverMeta && serverMeta.code && /^\d{6}$/.test(serverMeta.code) && mpJoinCodeInput) {
    mpJoinCodeInput.value = formatDisplayCode(serverMeta.code);
  }

  // Sinkronisasi Tampilan Mode Menu (Single-Player vs Multiplayer Murid/Guru)
  function syncMenuModeUI() {
    const isSolo = playMode === 'solo';
    const isMpTeacher = !isSolo && mpRole === 'teacher';

    if (tabModeSolo) {
      tabModeSolo.classList.toggle('active', isSolo);
      tabModeSolo.setAttribute('aria-selected', String(isSolo));
    }
    if (tabModeMulti) {
      tabModeMulti.classList.toggle('active', !isSolo);
      tabModeMulti.setAttribute('aria-selected', String(!isSolo));
    }

    if (panelModeSolo) panelModeSolo.style.display = isSolo ? 'block' : 'none';
    if (panelModeMulti) panelModeMulti.style.display = isSolo ? 'none' : 'block';

    if (btnSoloEmpty) btnSoloEmpty.classList.toggle('active', !soloWithBots);
    if (btnSoloBots) btnSoloBots.classList.toggle('active', soloWithBots);

    if (btnMpStudent) btnMpStudent.classList.toggle('active', !isMpTeacher);
    if (btnMpTeacher) btnMpTeacher.classList.toggle('active-teacher', isMpTeacher);

    if (mpStudentFields) mpStudentFields.style.display = isMpTeacher ? 'none' : 'block';
    if (mpTeacherFields) mpTeacherFields.style.display = isMpTeacher ? 'block' : 'none';

    if (teacherBanner) {
      teacherBanner.style.display = isMpTeacher ? 'flex' : 'none';
    }

    if (labelPlayerName) {
      labelPlayerName.textContent = isMpTeacher ? 'NAMA GURU (HOST)' : (isSolo ? 'NAMA PEMAIN' : 'NAMA MURID');
    }

    if (btnEnterSubmit && btnEnterLabel) {
      btnEnterSubmit.className = 'btn btn-block ' + (isMpTeacher ? 'btn-accent' : (isSolo ? 'btn-success' : 'btn-primary'));
      btnEnterLabel.textContent = isSolo
        ? (soloWithBots ? 'Masuk Private Server + Bot' : 'Masuk Private Server')
        : (isMpTeacher ? 'Buat Server & Dapatkan Kode' : 'Gabung Server Kelas');
    }

    if (footerHint) {
      footerHint.textContent = isSolo
        ? 'Private Server terisolasi penuh — hanya Anda di dunia ini untuk tes fitur atau main dengan Bot AI.'
        : (isMpTeacher
          ? 'Siapa saja bisa menjadi host. Buat server dan bagikan kode 6 digit kepada murid.'
          : 'Minta kode 6 digit dari gurumu lalu klik Gabung Server Kelas untuk bermain bersama.');
    }

    setMenuFeedback('');
  }

  if (tabModeSolo) tabModeSolo.addEventListener('click', () => { playMode = 'solo'; syncMenuModeUI(); });
  if (tabModeMulti) tabModeMulti.addEventListener('click', () => { playMode = 'multiplayer'; syncMenuModeUI(); });
  if (btnSoloEmpty) btnSoloEmpty.addEventListener('click', () => { soloWithBots = false; syncMenuModeUI(); });
  if (btnSoloBots) btnSoloBots.addEventListener('click', () => { soloWithBots = true; syncMenuModeUI(); });
  if (btnMpStudent) btnMpStudent.addEventListener('click', () => { mpRole = 'student'; syncMenuModeUI(); });
  if (btnMpTeacher) btnMpTeacher.addEventListener('click', () => { mpRole = 'teacher'; syncMenuModeUI(); });

  // Helper: Perbarui tampilan status Role & Server di HUD
  function syncRoleUI() {
    const isTeacher = playerRole === 'teacher';
    const isSolo = playMode === 'solo' || playerRole === 'solo';

    // HUD khusus Role & Server
    const hudTeacherBtn = document.getElementById('btn-hud-teacher-dash');
    const hudRolePill = document.getElementById('hud-role-pill');
    if (hudTeacherBtn) hudTeacherBtn.style.display = isTeacher ? 'inline-flex' : 'none';
    if (hudRolePill) {
      if (isSolo) {
        hudRolePill.textContent = 'Private Solo';
        hudRolePill.className = 'role-pill role-solo';
      } else if (isTeacher) {
        hudRolePill.textContent = 'Host Guru';
        hudRolePill.className = 'role-pill role-teacher';
      } else {
        hudRolePill.textContent = 'Murid';
        hudRolePill.className = 'role-pill role-student';
      }
    }

    // HUD Server Bar (terlihat di Desktop & HP!)
    if (hudServerBar) {
      hudServerBar.classList.toggle('is-solo', isSolo);
      hudServerBar.classList.toggle('is-teacher', !isSolo && isTeacher);
      if (isSolo) {
        hudServerTag.textContent = 'PRIVATE';
        hudServerCodeVal.textContent = 'SOLO';
        if (btnHudToggleBots) {
          btnHudToggleBots.style.display = 'inline-flex';
          btnHudToggleBots.classList.toggle('active-bot', soloWithBots);
          btnHudToggleBots.querySelector('span').textContent = soloWithBots ? 'Bot: ON' : 'Bot: OFF';
        }
        if (btnHudCopyCode) btnHudCopyCode.style.display = 'none';
        if (btnHudOpenServerModal) btnHudOpenServerModal.style.display = 'none';
      } else {
        hudServerTag.textContent = isTeacher ? 'HOST' : 'KELAS';
        hudServerCodeVal.textContent = formatDisplayCode(serverCode);
        if (btnHudToggleBots) btnHudToggleBots.style.display = 'none';
        if (btnHudCopyCode) btnHudCopyCode.style.display = 'inline-flex';
        if (btnHudOpenServerModal) btnHudOpenServerModal.style.display = isTeacher ? 'inline-flex' : 'none';
      }
    }

    syncMenuModeUI();
  }
  syncRoleUI();

  // ==================== 2. PILIH WARNA AVATAR ====================
  document.querySelectorAll('.color-option').forEach(opt => {
    if (opt.getAttribute('data-color') === playerColor) {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    }
    opt.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      playerColor = opt.getAttribute('data-color');
    });
  });

  // ==================== 3. MODAL PENGATURAN & LOGIN AKUN GURU ====================
  const settingsModal = document.getElementById('settings-modal');
  const openSettings = () => {
    settingsModal.style.display = 'flex';
    if (controls) controls.enabled = false;
  };
  const closeSettings = () => {
    settingsModal.style.display = 'none';
    if (controls && inCity) controls.enabled = true;
  };

  document.getElementById('btn-landing-settings').addEventListener('click', openSettings);
  document.getElementById('btn-hud-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);

  // Kualitas Grafis
  document.getElementById('setting-quality').addEventListener('change', (e) => {
    city.setQuality(e.target.value);
  });

  // Toggle Audio (Zero Emoji — Crisp Vector SVG)
  const soundToggleHandler = () => {
    window.soundFX.enabled = !window.soundFX.enabled;
    const svg = window.UI_ICONS
      ? window.UI_ICONS.svg(window.soundFX.enabled ? 'volume' : 'volumeX', 18)
      : (window.soundFX.enabled ? 'ON' : 'OFF');
    document.getElementById('btn-landing-sound').innerHTML = svg;
    document.getElementById('setting-sound-toggle').textContent = window.soundFX.enabled ? 'Suara: Aktif' : 'Suara: Mati';
  };
  document.getElementById('btn-landing-sound').addEventListener('click', soundToggleHandler);
  document.getElementById('setting-sound-toggle').addEventListener('click', soundToggleHandler);

  // ==================== 4. MASUK KE LOBBY (PRIVATE SERVER / MULTIPLAYER KODE) ====================
  document.getElementById('enter-city-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setMenuFeedback('');

    const rawName = nameInput.value.trim();
    if (!rawName) {
      setMenuFeedback('Masukkan nama panggilanmu terlebih dahulu.');
      nameInput.focus();
      return;
    }

    playerName = rawName.slice(0, 18);
    playerHat = hatSelect.value;

    // A. MODE SINGLE-PLAYER (PRIVATE SERVER — 100% TERISOLASI)
    if (playMode === 'solo') {
      playerRole = 'solo';
      if (!serverCode || !serverCode.startsWith('SOLO_')) {
        serverCode = generateSoloCode();
      }
      serverMeta = {
        code: serverCode,
        serverName: 'Private Server',
        hostName: playerName,
        locked: false,
        mode: 'solo'
      };
      persistSessionState();
      enterCityWorld({ showServerModal: false });
      return;
    }

    // B. MODE MULTIPLAYER — SUB-MODE MURID (GABUNG PAKAI KODE 6 DIGIT ALA KAHOOT/QUIZIZZ)
    if (mpRole === 'student') {
      const cleanCode = (mpJoinCodeInput ? mpJoinCodeInput.value : '').replace(/\s+/g, '').toUpperCase();
      if (!cleanCode || cleanCode.length < 4) {
        setMenuFeedback('Masukkan kode server 6 digit yang diberikan gurumu.');
        if (mpJoinCodeInput) mpJoinCodeInput.focus();
        window.soundFX.wrong();
        return;
      }

      if (btnEnterSubmit) btnEnterSubmit.disabled = true;
      try {
        const res = await fetch('/api/servers/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanCode })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setMenuFeedback(data.message || 'Kode server tidak ditemukan.');
          window.soundFX.wrong();
          return;
        }
        playerRole = 'student';
        serverCode = data.server.code;
        serverMeta = { ...data.server, mode: 'multiplayer' };
        persistSessionState();
        enterCityWorld({ showServerModal: false });
      } catch (err) {
        setMenuFeedback('Gagal memeriksa kode server. Periksa koneksi jaringan.');
      } finally {
        if (btnEnterSubmit) btnEnterSubmit.disabled = false;
      }
      return;
    }

    // C. MODE MULTIPLAYER — SUB-MODE GURU (CREATE SERVER TANPA AUTENTIKASI, ALA KAHOOT)
    const customServerName = mpServerNameInput ? mpServerNameInput.value.trim() : '';

    if (btnEnterSubmit) btnEnterSubmit.disabled = true;
    try {
      const res = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerName,
          serverName: customServerName || `Kelas ${playerName}`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMenuFeedback(data.message || 'Gagal membuat server kelas.');
        window.soundFX.wrong();
        return;
      }

      playerRole = 'teacher';
      serverCode = data.server.code;
      serverMeta = { ...data.server, mode: 'multiplayer' };
      persistSessionState();
      enterCityWorld({ showServerModal: true });
    } catch (err) {
      setMenuFeedback('Gagal membuat server kelas. Coba beberapa saat lagi.');
    } finally {
      if (btnEnterSubmit) btnEnterSubmit.disabled = false;
    }
  });

  function persistSessionState() {
    sessionStorage.setItem('eduverse_name', playerName);
    sessionStorage.setItem('eduverse_color', playerColor);
    sessionStorage.setItem('eduverse_hat', playerHat);
    sessionStorage.setItem('eduverse_play_mode', playMode);
    sessionStorage.setItem('eduverse_mp_role', mpRole);
    sessionStorage.setItem('eduverse_solo_bots', soloWithBots ? '1' : '0');
    sessionStorage.setItem('eduverse_city_role', playerRole);
    sessionStorage.setItem('eduverse_server_code', serverCode);
    if (serverMeta) sessionStorage.setItem('eduverse_server_meta', JSON.stringify(serverMeta));
  }

  function clearRemotePlayers() {
    for (const id in remotePlayers) {
      if (remotePlayers[id] && remotePlayers[id].avatar) remotePlayers[id].avatar.destroy();
      delete remotePlayers[id];
    }
    latestRoster = [];
  }

  // ==================== BOT AI TEMAN UNTUK PRIVATE SERVER (SINGLE-PLAYER) ====================
  function clearSoloBots() {
    soloBots.forEach(b => {
      if (b.avatar) b.avatar.destroy();
    });
    soloBots = [];
    updateOnlineCountDisplay();
  }

  function spawnSoloBots() {
    clearSoloBots();
    if (playMode !== 'solo' || !soloWithBots) return;

    const botPresets = [
      { id: 'bot-1', name: '[BOT] Raka', color: '#10b981', hat: 'topi_sekolah', angle: 0.4 },
      { id: 'bot-2', name: '[BOT] Naya', color: '#f43f5e', hat: 'telinga_kucing', angle: 2.5 },
      { id: 'bot-3', name: '[BOT] Bima', color: '#8b5cf6', hat: 'topi_wisuda', angle: 4.4 }
    ];

    botPresets.forEach(bp => {
      const av = new Avatar3D(city.scene, {
        name: bp.name,
        color: bp.color,
        hat: bp.hat,
        isLocal: false
      });
      const r = 13 + Math.random() * 5;
      av.group.position.set(Math.cos(bp.angle) * r, 0, Math.sin(bp.angle) * r);
      soloBots.push({
        id: bp.id,
        name: bp.name,
        avatar: av,
        targetX: Math.cos(bp.angle + 1.1) * 16,
        targetZ: Math.sin(bp.angle + 1.1) * 16,
        waitTimer: 0.5 + Math.random() * 1.5,
        emoteTimer: 4 + Math.random() * 6,
        speed: 4.8 + Math.random() * 1.6
      });
    });

    updateOnlineCountDisplay();
  }

  function updateSoloBots(delta) {
    if (playMode !== 'solo' || soloBots.length === 0) return;
    const botReactions = ['HI', 'GO', 'GG', 'OK'];

    soloBots.forEach(bot => {
      const pos = bot.avatar.group.position;
      bot.emoteTimer -= delta;
      if (bot.emoteTimer <= 0) {
        bot.emoteTimer = 8 + Math.random() * 9;
        bot.avatar.showEmote(botReactions[Math.floor(Math.random() * botReactions.length)]);
      }

      if (bot.waitTimer > 0) {
        bot.waitTimer -= delta;
        bot.avatar.isMoving = false;
      } else {
        const dx = bot.targetX - pos.x;
        const dz = bot.targetZ - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.3) {
          bot.waitTimer = 1.2 + Math.random() * 2.4;
          const a = Math.random() * Math.PI * 2;
          const r = 11 + Math.random() * 20;
          bot.targetX = Math.cos(a) * r;
          bot.targetZ = Math.sin(a) * r;
          if (Math.random() < 0.28 && !bot.avatar.isJumping) {
            bot.avatar.jump();
          }
        } else {
          const step = Math.min(dist, bot.speed * delta);
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          const desiredRot = Math.atan2(dx, dz);
          let diff = desiredRot - bot.avatar.group.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          bot.avatar.group.rotation.y += diff * Math.min(1, delta * 8);
          bot.avatar.isMoving = true;
        }
      }

      if (city.physics) city.physics.resolveCharacter(bot.avatar, delta);
      bot.avatar.update(delta);
    });
  }

  function updateOnlineCountDisplay(serverCount) {
    const el = document.getElementById('hud-online-count');
    if (!el) return;
    if (playMode === 'solo') {
      el.textContent = soloWithBots ? `1 + ${soloBots.length} Bot` : '1 (Solo)';
    } else if (typeof serverCount === 'number') {
      el.textContent = String(serverCount);
    }
  }

  // Toggle Bot AI instan dari HUD Private Server
  if (btnHudToggleBots) {
    btnHudToggleBots.addEventListener('click', () => {
      if (playMode !== 'solo') return;
      soloWithBots = !soloWithBots;
      sessionStorage.setItem('eduverse_solo_bots', soloWithBots ? '1' : '0');
      if (soloWithBots) spawnSoloBots();
      else clearSoloBots();
      syncRoleUI();
      window.soundFX.pop();
    });
  }

  // Copy Kode Server Kelas ke Clipboard
  function copyServerCodeToClipboard(btnEl) {
    if (!serverCode) return;
    const raw = String(serverCode).replace(/\s+/g, '');
    const finish = () => {
      if (!btnEl) return;
      const prev = btnEl.textContent;
      btnEl.textContent = 'Tersalin';
      setTimeout(() => { btnEl.textContent = prev; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw).then(finish).catch(finish);
    } else {
      finish();
    }
    window.soundFX.pop();
  }

  if (btnHudCopyCode) {
    btnHudCopyCode.addEventListener('click', () => copyServerCodeToClipboard(btnHudCopyCode.querySelector('span') || btnHudCopyCode));
  }

  // Modal Proyektor Kode Server Guru ala Kahoot
  function renderServerRosterModal() {
    const codeDisp = document.getElementById('modal-server-code-display');
    const titleEl = document.getElementById('modal-server-title');
    const subEl = document.getElementById('modal-server-sub');
    const countEl = document.getElementById('modal-server-player-count');
    const rosterEl = document.getElementById('modal-server-roster');
    const lockBtn = document.getElementById('btn-modal-toggle-lock');

    if (codeDisp) codeDisp.textContent = formatDisplayCode(serverCode);
    if (titleEl) titleEl.textContent = (serverMeta && serverMeta.serverName) || 'Server Kelas Aktif';
    if (subEl) subEl.textContent = `Host: ${(serverMeta && serverMeta.hostName) || playerName} · Bagikan kode 6 digit ini kepada murid.`;
    if (lockBtn && serverMeta) {
      lockBtn.textContent = serverMeta.locked ? 'Buka Kunci Server' : 'Kunci Server';
    }

    const list = latestRoster.length > 0 ? latestRoster : [{ name: playerName, role: playerRole }];
    if (countEl) countEl.textContent = `${list.length} Peserta Online`;
    if (rosterEl) {
      rosterEl.innerHTML = '';
      list.forEach(p => {
        const chip = document.createElement('span');
        chip.className = 'roster-chip' + (p.role === 'teacher' ? ' is-host' : '');
        chip.textContent = (p.role === 'teacher' ? '[GURU] ' : '') + p.name;
        rosterEl.appendChild(chip);
      });
    }
  }

  function openServerCodeModal() {
    if (!serverCodeModal || playMode !== 'multiplayer') return;
    renderServerRosterModal();
    serverCodeModal.style.display = 'flex';
    if (controls) controls.enabled = false;
  }

  function closeServerCodeModal() {
    if (!serverCodeModal) return;
    serverCodeModal.style.display = 'none';
    if (controls && inCity) controls.enabled = true;
  }

  if (btnHudOpenServerModal) btnHudOpenServerModal.addEventListener('click', openServerCodeModal);
  const btnCloseServerModal = document.getElementById('btn-close-server-modal');
  const btnModalEnterCity = document.getElementById('btn-modal-enter-city');
  const btnModalCopyCode = document.getElementById('btn-modal-copy-code');
  const btnModalToggleLock = document.getElementById('btn-modal-toggle-lock');
  const btnModalCloseServer = document.getElementById('btn-modal-close-server');

  if (btnCloseServerModal) btnCloseServerModal.addEventListener('click', closeServerCodeModal);
  if (btnModalEnterCity) btnModalEnterCity.addEventListener('click', closeServerCodeModal);
  if (btnModalCopyCode) btnModalCopyCode.addEventListener('click', () => copyServerCodeToClipboard(btnModalCopyCode));

  if (btnModalToggleLock) {
    btnModalToggleLock.addEventListener('click', () => {
      if (!socket || playerRole !== 'teacher') return;
      socket.emit('teacher_toggle_lock_server', {}, (res) => {
        if (res && res.success && serverMeta) {
          serverMeta.locked = res.locked;
          persistSessionState();
          renderServerRosterModal();
          window.soundFX.pop();
        }
      });
    });
  }

  if (btnModalCloseServer) {
    btnModalCloseServer.addEventListener('click', () => {
      if (!socket || playerRole !== 'teacher') return;
      if (!confirm('Tutup server kelas ini? Seluruh murid di server akan kembali ke menu.')) return;
      socket.emit('teacher_close_server', {}, () => {
        closeServerCodeModal();
        serverCode = '';
        serverMeta = null;
        sessionStorage.removeItem('eduverse_server_code');
        sessionStorage.removeItem('eduverse_server_meta');
        returnToMainMenu();
      });
    });
  }

  function enterCityWorld(opts = {}) {
    inCity = true;
    landingOverlay.style.display = 'none';
    cityHud.style.display = 'block';
    document.getElementById('hud-player-name').textContent = playerName;
    syncRoleUI();

    // Tampilkan analog kiri bawah & tombol lompat untuk HP dan iPad/Tablet (termasuk iPad Pro 12.9")
    const syncTouchControlsVisibility = () => {
      const mobileCtrl = document.querySelector('.mobile-controls');
      if (!mobileCtrl) return;
      if (!inCity) {
        mobileCtrl.style.display = 'none';
        return;
      }
      const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isTouchOrTablet = isCoarse || isIPadOS || 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1180;
      mobileCtrl.style.display = isTouchOrTablet ? 'flex' : 'none';
    };
    syncTouchControlsVisibility();
    if (!window._cityTouchResizeBound) {
      window._cityTouchResizeBound = true;
      window.addEventListener('resize', syncTouchControlsVisibility);
      window.addEventListener('orientationchange', () => setTimeout(syncTouchControlsVisibility, 120));
    }

    // Reset avatar lama jika pemain berganti role/warna/topi dari Menu
    if (localAvatar) {
      localAvatar.destroy();
      localAvatar = null;
    }

    const displayLabel = playerRole === 'teacher' ? `[GURU] ${playerName}` : playerName;
    localAvatar = new Avatar3D(city.scene, {
      name: displayLabel,
      color: playerColor,
      hat: playerHat,
      isLocal: true
    });
    localAvatar.group.position.set(0, 0, 12);

    if (!controls) {
      controls = new Controls(city.camera, localAvatar, canvasContainer, {
        moveSpeed: 13.5,
        maxRadius: 225
      });
    } else {
      controls.avatar = localAvatar;
      controls.enabled = true;
    }
    city.cameraMode = 'follow';

    clearRemotePlayers();
    clearSoloBots();
    if (playMode === 'solo' && soloWithBots) {
      spawnSoloBots();
    }

    connectCityMultiplayer();

    // Reset chat welcome line sesuai server aktif
    if (chatMessages) {
      const welcome = playMode === 'solo'
        ? 'Private Server aktif. Hanya Anda (dan Bot opsional) yang berada di kota ini.'
        : `Terhubung ke ${serverMeta ? serverMeta.serverName : 'Server Kelas'} (Kode: ${formatDisplayCode(serverCode)}).`;
      chatMessages.innerHTML = `<div class="chat-line" style="color: #94a3b8;">${escapeHtml(welcome)}</div>`;
    }

    if (opts.showServerModal && playMode === 'multiplayer' && playerRole === 'teacher') {
      openServerCodeModal();
    }

    window.soundFX.pop();
  }

  // Kembali ke Tampilan Menu Utama (dari tombol permanen kanan atas maupun dropdown hamburger!)
  function returnToMainMenu() {
    if (city.circuit && city.circuit.activeCar && localAvatar) {
      city.circuit.exitCar(localAvatar);
    }
    if (socket && socket.connected) {
      socket.emit('leave_city');
    }
    sessionStorage.removeItem('eduverse_auto_rejoin');
    clearRemotePlayers();
    clearSoloBots();
    closeServerCodeModal();

    inCity = false;
    if (controls) controls.enabled = false;
    city.cameraMode = 'orbit';
    cityHud.style.display = 'none';
    const mCtrl = document.querySelector('.mobile-controls');
    if (mCtrl) mCtrl.style.display = 'none';
    if (circuitHudBar) circuitHudBar.style.display = 'none';
    if (buildingPrompt) buildingPrompt.style.display = 'none';
    const annBar = document.getElementById('teacher-announcement-bar');
    if (annBar) annBar.style.display = 'none';
    landingOverlay.style.display = 'flex';
    syncRoleUI();
  }
  document.getElementById('btn-hud-menu').addEventListener('click', returnToMainMenu);
  const directMenuBtn = document.getElementById('btn-hud-menu-direct');
  if (directMenuBtn) directMenuBtn.addEventListener('click', returnToMainMenu);

  // ==================== 5. MULTIPLAYER KOTA & PRIVATE SERVER (SOCKET.IO) ====================
  function emitJoinCityPayload() {
    if (!socket || !socket.connected || !inCity) return;
    socket.emit('join_city', {
      mode: playMode,
      serverCode: serverCode,
      name: playerName,
      role: playerRole,
      color: playerColor,
      hat: playerHat
    }, (res) => {
      if (!res || !res.success) {
        setMenuFeedback((res && res.message) || 'Gagal bergabung ke server.');
        returnToMainMenu();
        return;
      }

      if (res.server) {
        serverCode = res.server.code;
        serverMeta = res.server;
        persistSessionState();
        syncRoleUI();
      }

      if (localAvatar && res.player) {
        localAvatar.group.position.set(res.player.position.x, 0, res.player.position.z);
      }

      clearRemotePlayers();
      latestRoster = res.players || [];
      updateOnlineCountDisplay(latestRoster.length);
      latestRoster.forEach(p => {
        if (p.id !== socket.id) spawnRemoteAvatar(p);
      });
      if (serverCodeModal && serverCodeModal.style.display === 'flex') {
        renderServerRosterModal();
      }
    });
  }

  function connectCityMultiplayer() {
    if (!socket) {
      socket = io({ transports: ['websocket', 'polling'] });
    }

    if (!socketListenersBound) {
      socketListenersBound = true;

      socket.on('connect', () => {
        if (inCity) emitJoinCityPayload();
      });

      socket.on('city_player_joined', (p) => {
        if (p.id !== socket.id) spawnRemoteAvatar(p);
      });

      socket.on('city_player_moved', (m) => {
        const rp = remotePlayers[m.id];
        if (!rp) return;
        rp.lastNetTime = performance.now();
        rp.targetPos = { x: m.x, y: m.y, z: m.z };
        rp.targetRotY = m.rotY;
        rp.isMoving = !!m.isMoving;
        rp.isJumping = !!m.isJumping;
      });

      socket.on('city_player_left', (id) => {
        if (remotePlayers[id]) {
          remotePlayers[id].avatar.destroy();
          delete remotePlayers[id];
        }
      });

      socket.on('city_count_updated', (count) => {
        updateOnlineCountDisplay(count);
      });

      socket.on('city_roster_updated', (roster) => {
        latestRoster = Array.isArray(roster) ? roster : [];
        updateOnlineCountDisplay(latestRoster.length);
        if (serverCodeModal && serverCodeModal.style.display === 'flex') {
          renderServerRosterModal();
        }
      });

      socket.on('server_lock_changed', (info) => {
        if (serverMeta) {
          serverMeta.locked = !!info.locked;
          persistSessionState();
        }
        if (serverCodeModal && serverCodeModal.style.display === 'flex') {
          renderServerRosterModal();
        }
      });

      socket.on('server_closed_by_host', (info) => {
        serverCode = '';
        serverMeta = null;
        sessionStorage.removeItem('eduverse_server_code');
        sessionStorage.removeItem('eduverse_server_meta');
        returnToMainMenu();
        setMenuFeedback((info && info.message) || 'Server kelas telah ditutup oleh guru.');
      });

      socket.on('city_player_emote', (data) => {
        if (data.id === socket.id && localAvatar) {
          localAvatar.showEmote(data.emote);
        } else if (remotePlayers[data.id]) {
          remotePlayers[data.id].avatar.showEmote(data.emote);
        }
      });

      socket.on('city_chat_message', (msg) => {
        appendChatMessage(msg);
      });

      // Pengumuman Panggilan dari Guru ke seluruh kelas di server ini
      socket.on('city_teacher_announcement', (ann) => {
        const bar = document.getElementById('teacher-announcement-bar');
        const textEl = document.getElementById('announcement-text');
        const goBtn = document.getElementById('btn-announcement-go');

        textEl.textContent = `Pengumuman: ${ann.message}`;
        bar.style.display = 'flex';
        window.soundFX.correct();

        goBtn.onclick = () => {
          const target = (window.MINIGAMES_REGISTRY || []).find(g => g.id === ann.buildingId);
          if (target && localAvatar) {
            teleportToBuilding(target);
            openBuildingGateModal(target);
          }
          bar.style.display = 'none';
        };
      });
    }

    if (socket.connected) {
      emitJoinCityPayload();
    }
  }

  function spawnRemoteAvatar(p) {
    if (remotePlayers[p.id]) return;
    const label = p.role === 'teacher' ? `[GURU] ${p.name}` : p.name;
    const av = new Avatar3D(city.scene, {
      name: label,
      color: p.color,
      hat: p.hat,
      isLocal: false
    });
    av.group.position.set(p.position.x, p.position.y, p.position.z);
    remotePlayers[p.id] = {
      avatar: av,
      targetPos: { ...p.position },
      targetRotY: p.rotationY || 0,
      isMoving: false,
      isJumping: false,
      role: p.role
    };
  }

  function emitLocalMovement() {
    if (!socket || !localAvatar || !inCity) return;
    const now = performance.now();
    const pos = localAvatar.group.position;
    const rotY = localAvatar.group.rotation.y;
    const stateChanged =
      localAvatar.isMoving !== lastSentPos.isMoving ||
      localAvatar.isJumping !== lastSentPos.isJumping;

    // Perubahan status (berhenti / mendarat) dikirim LANGSUNG tanpa menunggu throttle 33ms!
    if (!stateChanged && now - lastEmitTime < 33) return; // ~30Hz real-time

    const posChanged =
      Math.abs(pos.x - lastSentPos.x) > 0.02 ||
      Math.abs(pos.y - lastSentPos.y) > 0.02 ||
      Math.abs(pos.z - lastSentPos.z) > 0.02 ||
      Math.abs(rotY - lastSentPos.rotY) > 0.03;

    if (stateChanged || posChanged) {
      const payload = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100,
        rotY: Math.round(rotY * 100) / 100,
        isMoving: !!localAvatar.isMoving,
        isJumping: !!localAvatar.isJumping
      };
      // Status berhenti/mendarat dikirim reliable (socket.emit) agar TIDAK PERNAH nyangkut!
      if (stateChanged) {
        socket.emit('city_move', payload);
      } else {
        socket.volatile.emit('city_move', payload);
      }
      lastSentPos = { x: pos.x, y: pos.y, z: pos.z, rotY, isMoving: localAvatar.isMoving, isJumping: localAvatar.isJumping };
      lastEmitTime = now;
    }
  }

  // ==================== 6. CHAT & EMOTE ====================
  const chatForm = document.getElementById('city-chat-form');
  const chatInput = document.getElementById('city-chat-input');
  const chatMessages = document.getElementById('city-chat-messages');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = chatInput.value.trim();
    if (!txt || !socket) return;
    socket.emit('city_chat', txt);
    chatInput.value = '';
    chatInput.blur();
  });

  function appendChatMessage(msg) {
    const div = document.createElement('div');
    div.className = 'chat-line';
    const badge = msg.role === 'teacher' ? '[GURU] ' : '';
    div.innerHTML = `<span class="chat-author ${msg.role === 'teacher' ? 'is-teacher' : ''}">${badge}${escapeHtml(msg.name)}:</span> ${escapeHtml(msg.text)}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // Hamburger Menu (Kanan Atas) & Emote Dropdown (di bawah Hamburger)
  const hamburgerBtn = document.getElementById('btn-city-hamburger');
  const hamburgerMenu = document.getElementById('city-hamburger-menu');
  const cityEmoteToggle = document.getElementById('btn-city-emote-toggle');
  const cityEmoteMenu = document.getElementById('city-emote-menu');

  if (hamburgerBtn && hamburgerMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = hamburgerMenu.classList.toggle('open');
      hamburgerBtn.classList.toggle('open', isOpen);
      if (isOpen && cityEmoteMenu) {
        cityEmoteMenu.classList.remove('open');
        if (cityEmoteToggle) cityEmoteToggle.classList.remove('open');
      }
    });
    hamburgerMenu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        hamburgerMenu.classList.remove('open');
        hamburgerBtn.classList.remove('open');
      });
    });
  }

  if (cityEmoteToggle && cityEmoteMenu) {
    cityEmoteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = cityEmoteMenu.classList.toggle('open');
      cityEmoteToggle.classList.toggle('open', isOpen);
      if (isOpen && hamburgerMenu) {
        hamburgerMenu.classList.remove('open');
        if (hamburgerBtn) hamburgerBtn.classList.remove('open');
      }
    });
  }

  document.querySelectorAll('.city-emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emote');
      if (localAvatar) localAvatar.showEmote(em);
      window.soundFX.pop();
      if (socket) socket.emit('city_emote', em);
      if (cityEmoteMenu) cityEmoteMenu.classList.remove('open');
      if (cityEmoteToggle) cityEmoteToggle.classList.remove('open');
    });
  });

  // ==================== 7. DIREKTORI 20 GEDUNG MINI GAMES & TELEPORT ====================
  const dirModal = document.getElementById('directory-modal');
  const dirList = document.getElementById('directory-games-grid');

  function renderGamesDirectory(filterDistrict = 'all') {
    dirList.innerHTML = '';
    const games = (window.MINIGAMES_REGISTRY || []).filter(g => filterDistrict === 'all' || g.district === filterDistrict);

    games.forEach(g => {
      const dist = window.CITY_DISTRICTS[g.district];
      const isReady = g.status === 'ready';
      const card = document.createElement('div');
      card.className = `game-dir-card ${isReady ? 'is-ready' : ''}`;
      const iconHtml = window.UI_ICONS ? window.UI_ICONS.svg(g.icon, 20) : '';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="width:36px; height:36px; border-radius:10px; background:rgba(37,99,235,0.18); color:${dist.color}; display:inline-flex; align-items:center; justify-content:center;">${iconHtml}</span>
          <span class="badge ${isReady ? 'badge-green' : 'badge-blue'}">
            ${isReady ? 'Siap Main' : `Slot #${String(g.number).padStart(2, '0')}`}
          </span>
        </div>
        <div style="font-weight:800; font-size:0.94rem; color:#fff;">#${String(g.number).padStart(2, '0')} ${g.name}</div>
        <div style="font-size:0.76rem; color:${dist.color}; font-weight:700;">${g.subject}</div>
        <p style="font-size:0.78rem; color:#94a3b8; flex-grow:1;">${g.desc}</p>
        <button class="btn btn-secondary" style="min-height:38px; padding:0.4rem 0.7rem; font-size:0.78rem; margin-top:0.35rem;">
          Pergi ke Lokasi
        </button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        teleportToBuilding(g);
        dirModal.style.display = 'none';
        if (controls && inCity) controls.enabled = true;
      });
      dirList.appendChild(card);
    });
  }

  function teleportToBuilding(game) {
    if (city.circuit && city.circuit.activeCar) {
      city.circuit.exitCar(localAvatar);
    }
    if (game.id === 'mg-04' && city.circuit && localAvatar) {
      // Langsung teleport ke gerbang masuk Sirkuit Balap dekat mobil balap!
      localAvatar.group.position.set(55, 0, -20);
      window.soundFX.jump();
      return;
    }
    const portalObj = city.portals.find(p => p.game.id === game.id);
    if (!portalObj || !localAvatar) return;
    localAvatar.group.position.set(portalObj.portalPos.x, 0, portalObj.portalPos.z);
    window.soundFX.jump();
  }

  document.getElementById('btn-hud-directory').addEventListener('click', () => {
    renderGamesDirectory('all');
    dirModal.style.display = 'flex';
    if (controls) controls.enabled = false;
  });

  document.getElementById('btn-close-directory').addEventListener('click', () => {
    dirModal.style.display = 'none';
    if (controls && inCity) controls.enabled = true;
  });

  document.querySelectorAll('.dir-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dir-filter-btn').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      renderGamesDirectory(btn.getAttribute('data-district'));
    });
  });

  // ==================== 8. INTERAKSI PORTAL MASUK MINI GAME ====================
  const gateModal = document.getElementById('building-gate-modal');
  let selectedGateGame = null;

  function openBuildingGateModal(game) {
    selectedGateGame = game;
    const dist = window.CITY_DISTRICTS[game.district];
    const isReady = game.status === 'ready';
    const isTeacher = playerRole === 'teacher';

    const gateIconEl = document.getElementById('gate-icon');
    if (gateIconEl) gateIconEl.innerHTML = window.UI_ICONS ? window.UI_ICONS.svg(game.icon, 22) : '';
    document.getElementById('gate-title').textContent = `#${String(game.number).padStart(2, '0')} ${game.name}`;
    document.getElementById('gate-subject').textContent = `${dist.name} · ${game.subject}`;
    document.getElementById('gate-desc').textContent = game.desc;

    const readyArea = document.getElementById('gate-ready-actions');
    const comingArea = document.getElementById('gate-coming-soon');
    const teacherExtra = document.getElementById('gate-teacher-extra');

    if (isReady) {
      readyArea.style.display = 'block';
      comingArea.style.display = 'none';
    } else {
      readyArea.style.display = 'none';
      comingArea.style.display = 'block';
    }

    const gateScopeNote = document.getElementById('gate-server-scope-note');
    if (gateScopeNote) {
      gateScopeNote.textContent = playMode === 'solo'
        ? 'Private Server — Anda bermain sendiri di arena terisolasi.'
        : `Server Kelas ${formatDisplayCode(serverCode)} — Langsung mabar bersama peserta server ini.`;
    }

    teacherExtra.style.display = isTeacher ? 'block' : 'none';
    gateModal.style.display = 'flex';
    if (controls) controls.enabled = false;
  }

  document.getElementById('btn-close-gate').addEventListener('click', () => {
    gateModal.style.display = 'none';
    if (controls && inCity) controls.enabled = true;
  });

  // Klik tombol pada Prompt Proximity (atau tekan E di keyboard)
  document.getElementById('btn-prompt-enter').addEventListener('click', () => {
    if (activeNearbyBuilding) openBuildingGateModal(activeNearbyBuilding);
  });

  // Kontrol Sirkuit Balap Free-Drive di Lobi (Naik/Turun Mobil & Tombol Start Balapan!)
  const circuitHudBar = document.getElementById('circuit-hud-bar');
  const btnCarToggle = document.getElementById('btn-car-toggle');
  const circuitSpeedPill = document.getElementById('circuit-speed-pill');
  const circuitSpeedVal = document.getElementById('circuit-speed-val');
  const btnCircuitStartRace = document.getElementById('btn-circuit-start-race');
  let nearbyCircuitCar = null;

  function toggleCircuitCar() {
    if (!city.circuit || !localAvatar) return;
    if (city.circuit.activeCar) {
      city.circuit.exitCar(localAvatar);
      window.soundFX.pop();
    } else if (nearbyCircuitCar) {
      city.circuit.enterCar(nearbyCircuitCar, localAvatar);
      window.soundFX.pop();
    }
  }

  if (btnCarToggle) {
    btnCarToggle.addEventListener('click', toggleCircuitCar);
  }
  if (btnCircuitStartRace) {
    btnCircuitStartRace.addEventListener('click', () => {
      const raceGame = (window.MINIGAMES_REGISTRY || []).find(g => g.id === 'mg-04');
      if (raceGame) openBuildingGateModal(raceGame);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'KeyE' && inCity && activeNearbyBuilding && gateModal.style.display !== 'flex') {
      openBuildingGateModal(activeNearbyBuilding);
    }
    if (e.code === 'KeyF' && inCity && gateModal.style.display !== 'flex') {
      toggleCircuitCar();
    }
  });

  // Masuk Mini Game sesuai scope Server Aktif (Private Server / Server Kelas)
  document.getElementById('btn-gate-join-student').addEventListener('click', () => {
    if (!selectedGateGame || !selectedGateGame.url) return;
    persistSessionState();
    sessionStorage.setItem('eduverse_auto_rejoin', '1');
    sessionStorage.setItem('eduverse_role', (playerRole === 'teacher' || playMode === 'solo') ? 'teacher' : 'player');
    window.location.href = selectedGateGame.url;
  });

  // Guru membuka Dashboard untuk mengubah/mengedit soal Mini Game ini
  document.getElementById('btn-gate-open-teacher').addEventListener('click', () => {
    window.location.href = (selectedGateGame && selectedGateGame.teacherUrl) || 'guru.html';
  });

  document.getElementById('btn-hud-teacher-dash').addEventListener('click', () => {
    window.location.href = 'guru.html';
  });

  // Guru memanggil seluruh siswa di kota ke gedung yang dipilih
  document.getElementById('btn-teacher-call-class').addEventListener('click', () => {
    if (!socket || !selectedGateGame) return;
    socket.emit('teacher_announce_building', {
      buildingId: selectedGateGame.id,
      buildingName: `#${String(selectedGateGame.number).padStart(2, '0')} ${selectedGateGame.name}`,
      pin: null
    });
    alert('Pengumuman panggilan kelas telah dikirim ke layar seluruh siswa di Kota.');
  });

  // ==================== 9. MINIMAP RADAR KOTA 2D ====================
  const minimapCanvas = document.getElementById('city-minimap');
  const minimapCtx = minimapCanvas.getContext('2d');

  function drawMinimap() {
    if (!inCity || !localAvatar) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 1.05; // 146px mencakup area kota ~136m

    // Peta Minimap Otomatis Beralih Fokus ke Sirkuit saat berada di dalam Sirkuit Balap!
    const inCircuitView = city.circuit && city.circuit.isInsideCircuit(localAvatar.group.position.x, localAvatar.group.position.z);
    if (inCircuitView) {
      const cOriginX = city.circuit.originX;
      const cOriginZ = city.circuit.originZ;
      const cSize = city.circuit.size;
      const pad = 12;
      const mapCX = (wx) => pad + ((wx - cOriginX) / cSize) * (w - pad * 2);
      const mapCZ = (wz) => pad + ((wz - cOriginZ) / cSize) * (h - pad * 2);

      minimapCtx.clearRect(0, 0, w, h);
      minimapCtx.fillStyle = '#14532d';
      minimapCtx.fillRect(0, 0, w, h);

      // Gambar lintasan sirkuit pada radar
      if (city.circuit.trackPoints.length > 2) {
        minimapCtx.strokeStyle = '#94a3b8';
        minimapCtx.lineWidth = 7;
        minimapCtx.lineJoin = 'round';
        minimapCtx.beginPath();
        city.circuit.trackPoints.forEach((pt, idx) => {
          const rx = mapCX(pt.x);
          const ry = mapCZ(pt.y);
          if (idx === 0) minimapCtx.moveTo(rx, ry);
          else minimapCtx.lineTo(rx, ry);
        });
        minimapCtx.closePath();
        minimapCtx.stroke();
      }

      // Titik mobil balap (kuning)
      city.circuit.cars.forEach(c => {
        minimapCtx.fillStyle = '#facc15';
        minimapCtx.fillRect(mapCX(c.mesh.position.x) - 2.5, mapCZ(c.mesh.position.z) - 2.5, 5, 5);
      });

      // Titik pemain lokal
      const px = mapCX(localAvatar.group.position.x);
      const py = mapCZ(localAvatar.group.position.z);
      minimapCtx.fillStyle = '#38bdf8';
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 4.2, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#ffffff';
      minimapCtx.lineWidth = 1.5;
      minimapCtx.stroke();
      return;
    }

    minimapCtx.clearRect(0, 0, w, h);

    // Latar gelap
    minimapCtx.fillStyle = '#0f172a';
    minimapCtx.fillRect(0, 0, w, h);

    // Jalan raya salib & lingkar
    minimapCtx.strokeStyle = '#334155';
    minimapCtx.lineWidth = 6;
    minimapCtx.beginPath();
    minimapCtx.moveTo(cx, 6);
    minimapCtx.lineTo(cx, h - 6);
    minimapCtx.moveTo(6, cy);
    minimapCtx.lineTo(w - 6, cy);
    minimapCtx.stroke();

    minimapCtx.lineWidth = 4;
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
    minimapCtx.stroke();

    // 20 Titik Gedung
    (window.MINIGAMES_REGISTRY || []).forEach(g => {
      const gx = cx + g.pos.x * scale;
      const gy = cy + g.pos.z * scale;
      minimapCtx.fillStyle = g.status === 'ready' ? '#10b981' : window.CITY_DISTRICTS[g.district].color;
      minimapCtx.fillRect(gx - 3, gy - 3, 6, 6);
    });

    // Bot AI (Private Server)
    soloBots.forEach(bot => {
      const bx = cx + bot.avatar.group.position.x * scale;
      const by = cy + bot.avatar.group.position.z * scale;
      minimapCtx.fillStyle = '#34d399';
      minimapCtx.beginPath();
      minimapCtx.arc(bx, by, 2.8, 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Teman sekelas & guru lain
    for (const id in remotePlayers) {
      const rp = remotePlayers[id];
      const rx = cx + rp.avatar.group.position.x * scale;
      const ry = cy + rp.avatar.group.position.z * scale;
      minimapCtx.fillStyle = rp.role === 'teacher' ? '#fbbf24' : '#e2e8f0';
      minimapCtx.beginPath();
      minimapCtx.arc(rx, ry, 2.8, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    // Posisi pemain lokal (titik cyan terang dengan ring putih)
    const px = cx + localAvatar.group.position.x * scale;
    const py = cy + localAvatar.group.position.z * scale;
    minimapCtx.fillStyle = '#38bdf8';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4.2, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.stroke();
  }

  // ==================== 10. MAIN 60 FPS RENDER LOOP ====================
  let lastTime = performance.now();
  let elapsed = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    elapsed += delta;

    city.update(delta, elapsed);

    if (inCity && localAvatar && controls) {
      // Jika sedang menyetir mobil di Sirkuit Balap Lobi, pakai fisika mobil; jika jalan kaki, pakai PhysicsEngine3D!
      if (city.circuit && city.circuit.activeCar) {
        const kmh = city.circuit.updateCarDriving(delta, controls, localAvatar);
        if (circuitSpeedVal) circuitSpeedVal.textContent = kmh;
        localAvatar.update(delta);
      } else {
        controls.update(delta);
        if (city.physics) city.physics.resolveCharacter(localAvatar, delta);
        else city.resolvePhysics3D(localAvatar);
        localAvatar.update(delta);
      }
      emitLocalMovement();

      // Update lokasi distrik
      const pos = localAvatar.group.position;
      document.getElementById('hud-district-label').textContent = city.getDistrictLabel(pos.x, pos.z);

      // Update HUD Sirkuit Balap Free-Drive & Tombol "Naik/Turun Mobil" + "Mulai Balapan" (Zero Emoji)
      if (city.circuit && circuitHudBar) {
        const insideCircuit = city.circuit.isInsideCircuit(pos.x, pos.z);
        const driving = !!city.circuit.activeCar;
        nearbyCircuitCar = driving ? null : city.circuit.getNearestCar(pos.x, pos.z);

        const showBar = insideCircuit || driving || !!nearbyCircuitCar;
        circuitHudBar.style.display = showBar ? 'flex' : 'none';

        if (driving) {
          btnCarToggle.style.display = 'inline-flex';
          btnCarToggle.textContent = 'Turun Mobil';
          circuitSpeedPill.style.display = 'inline-flex';
        } else if (nearbyCircuitCar) {
          btnCarToggle.style.display = 'inline-flex';
          btnCarToggle.textContent = `Naik ${nearbyCircuitCar.name}`;
          circuitSpeedPill.style.display = 'none';
        } else {
          btnCarToggle.style.display = 'none';
          circuitSpeedPill.style.display = 'none';
        }

        btnCircuitStartRace.style.display = (insideCircuit || driving) ? 'inline-flex' : 'none';
      }

      // Cek kedekatan dengan 12 portal gedung (Zero Emoji)
      const near = city.getNearbyBuilding(pos.x, pos.z);
      if (near !== activeNearbyBuilding) {
        activeNearbyBuilding = near;
        if (near) {
          document.getElementById('prompt-building-title').textContent = `#${String(near.number).padStart(2, '0')} ${near.name}`;
          document.getElementById('prompt-building-sub').textContent = near.status === 'ready'
            ? `Siap dimainkan · ${near.subject}`
            : `Slot Mini Game #${near.number} · ${near.subject}`;
          buildingPrompt.style.display = 'flex';
          if (window.MobileControls) {
            window.MobileControls.setActionLabel('Masuk', true, 'door', () => openBuildingGateModal(near));
          }
        } else {
          buildingPrompt.style.display = 'none';
          if (window.MobileControls) {
            window.MobileControls.clearAction();
          }
        }
      }

      // Update Bot AI Private Server
      updateSoloBots(delta);

      // Interpolasi pemain lain di kota (real-time mulus tanpa prediksi kasar / tanpa blink!)
      const smoothPos = 1 - Math.exp(-18 * delta);
      const smoothRot = 1 - Math.exp(-20 * delta);
      const nowMs = performance.now();
      for (const id in remotePlayers) {
        const rp = remotePlayers[id];
        const jumpDist = Math.hypot(rp.targetPos.x - rp.avatar.group.position.x, rp.targetPos.z - rp.avatar.group.position.z);
        if (jumpDist > 14) {
          rp.avatar.group.position.set(rp.targetPos.x, rp.targetPos.y, rp.targetPos.z);
        } else {
          rp.avatar.group.position.x = THREE.MathUtils.lerp(rp.avatar.group.position.x, rp.targetPos.x, smoothPos);
          rp.avatar.group.position.y = THREE.MathUtils.lerp(rp.avatar.group.position.y, rp.targetPos.y, smoothPos);
          rp.avatar.group.position.z = THREE.MathUtils.lerp(rp.avatar.group.position.z, rp.targetPos.z, smoothPos);
        }
        let diff = rp.targetRotY - rp.avatar.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rp.avatar.group.rotation.y += diff * smoothRot;

        // Failsafe: jika tidak ada paket > 350ms, hentikan animasi jalan/lompat agar tidak nyangkut
        const stale = rp.lastNetTime && (nowMs - rp.lastNetTime > 350);
        rp.avatar.isMoving = stale ? false : !!rp.isMoving;
        rp.avatar.isJumping = (stale && rp.targetPos.y <= 0.08) ? false : !!rp.isJumping;
        rp.avatar.update(delta);
      }

      if (nowMs - (window._lastCityMinimapMs || 0) >= 66) {
        window._lastCityMinimapMs = nowMs;
        drawMinimap();
      }
    }

    city.renderer.render(city.scene, city.camera);
  }

  requestAnimationFrame(animate);

  // Auto-Rejoin mulus saat kembali dari Mini Game ke Lobi Kota (tanpa mengetik kode ulang)
  if (sessionStorage.getItem('eduverse_auto_rejoin') === '1' && serverCode && playerName) {
    sessionStorage.removeItem('eduverse_auto_rejoin');
    if (playMode === 'solo') {
      enterCityWorld({ showServerModal: false });
    } else if (playMode === 'multiplayer') {
      fetch(`/api/servers/${encodeURIComponent(serverCode)}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.success) {
            serverMeta = { ...data.server, mode: 'multiplayer' };
            enterCityWorld({ showServerModal: false });
          } else {
            setMenuFeedback('Server kelas sebelumnya sudah ditutup. Buat atau gabung server baru.');
          }
        })
        .catch(() => {});
    }
  }
});
