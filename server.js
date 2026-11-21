const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { DEFAULT_MINIGAME_QUIZZES } = require('./data/default-quizzes');
const { BRIDGE_QUIZZES } = require('./data/bridge-quizzes');
const { LAVA_PLANETS, LAVA_CLUES, LAVA_CLUES_BY_LEVEL } = require('./data/lava-quizzes');
const { GEOMETRY_SHAPES, GEOMETRY_QUIZZES } = require('./data/geometry-quizzes');
const { PUEBI_WORDS } = require('./data/puebi-quizzes');
const { RECYCLE_ITEMS } = require('./data/recycle-items');
const CAFE_QUESTIONS = require('./public/js/cafe-questions');
const { generateMazeGates } = require('./public/js/maze-questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  perMessageDeflate: false,
  httpCompression: false,
  pingInterval: 15000,
  pingTimeout: 10000
});

const PORT = process.env.PORT || 3000;

// Serve static frontend files, local vendor assets (fonts/icons), and guides
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules')));
app.use('/panduan-guru', express.static(path.join(__dirname, 'panduan-guru')));
app.use(express.json());

// ==================== CLASS SERVER & PRIVATE SERVER REGISTRY ====================
const classServers = {}; // { [code6Digit]: { code, serverName, hostName, hostSocketId, createdAt, lastActivityAt, locked, players: {} } }
const cityRooms = {};    // { [cityRoomKey]: { mode, serverCode, players: {} } }

function generateClassServerCode() {
  for (let tries = 0; tries < 50; tries++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!classServers[code]) return code;
  }
  return String(Date.now()).slice(-6);
}

function sanitizeServerCode(raw, fallback = 'PUBLIC') {
  const cleaned = String(raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
  return cleaned || fallback;
}

function buildScopedRoomKey(prefix, gameId, rawServerCode) {
  const scope = sanitizeServerCode(rawServerCode, 'PUBLIC');
  return `${prefix}_${String(gameId || 'mg-01').toUpperCase()}__${scope}`;
}

// Siapa saja bisa membuat Server Kelas baru (tanpa autentikasi, ala Kahoot / Quizizz)
app.post('/api/servers/create', (req, res) => {
  const { hostName, serverName } = req.body || {};

  const code = generateClassServerCode();
  const cleanHost = String(hostName || 'Guru').trim().slice(0, 18) || 'Guru';
  const cleanServerName = String(serverName || `Kelas ${cleanHost}`).trim().slice(0, 32) || `Kelas ${cleanHost}`;

  classServers[code] = {
    code,
    serverName: cleanServerName,
    hostName: cleanHost,
    hostSocketId: null,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    locked: false
  };

  const cityKey = `CITY_${code}`;
  if (!cityRooms[cityKey]) {
    cityRooms[cityKey] = { mode: 'multiplayer', serverCode: code, players: {} };
  }

  console.log(`[CLASS SERVER CREATED] Kode ${code} (${cleanServerName}) oleh Host ${cleanHost}`);
  return res.json({
    success: true,
    server: {
      code,
      serverName: cleanServerName,
      hostName: cleanHost,
      locked: false,
      playerCount: 0
    }
  });
});

// Murid memvalidasi kode 6 digit sebelum masuk server kelas
app.post('/api/servers/validate', (req, res) => {
  const rawCode = String((req.body && req.body.code) || '').replace(/\s+/g, '').toUpperCase();
  if (!rawCode) {
    return res.status(400).json({ success: false, message: 'Masukkan kode server 6 digit dari gurumu.' });
  }
  const srv = classServers[rawCode];
  if (!srv) {
    return res.status(404).json({ success: false, message: `Server dengan kode "${rawCode}" tidak ditemukan. Periksa kembali kode dari guru.` });
  }
  if (srv.locked) {
    return res.status(403).json({ success: false, message: 'Server kelas ini sedang dikunci oleh guru.' });
  }
  const cityKey = `CITY_${rawCode}`;
  const playerCount = cityRooms[cityKey] ? Object.keys(cityRooms[cityKey].players).length : 0;
  return res.json({
    success: true,
    server: {
      code: srv.code,
      serverName: srv.serverName,
      hostName: srv.hostName,
      locked: srv.locked,
      playerCount
    }
  });
});

app.get('/api/servers/:code', (req, res) => {
  const rawCode = String(req.params.code || '').replace(/\s+/g, '').toUpperCase();
  const srv = classServers[rawCode];
  if (!srv) return res.status(404).json({ success: false, message: 'Server tidak ditemukan.' });
  const cityKey = `CITY_${rawCode}`;
  const players = cityRooms[cityKey] ? Object.values(cityRooms[cityKey].players) : [];
  return res.json({
    success: true,
    server: {
      code: srv.code,
      serverName: srv.serverName,
      hostName: srv.hostName,
      locked: srv.locked,
      playerCount: players.length
    }
  });
});

// Bersihkan server kelas tak aktif lebih dari 2 jam secara berkala
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  Object.keys(classServers).forEach((code) => {
    const srv = classServers[code];
    const cityKey = `CITY_${code}`;
    const activeCount = cityRooms[cityKey] ? Object.keys(cityRooms[cityKey].players).length : 0;
    if (activeCount === 0 && now - srv.lastActivityAt > TWO_HOURS) {
      delete classServers[code];
      delete cityRooms[cityKey];
    }
  });
}, 10 * 60 * 1000);

// ==================== SERVER-SIDE QUIZ STORE (PERSISTENT) ====================
const QUIZ_FILE_PATH = path.join(__dirname, 'data', 'quizzes.json');

function loadQuizStore() {
  try {
    if (fs.existsSync(QUIZ_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(QUIZ_FILE_PATH, 'utf8'));
      return { ...DEFAULT_MINIGAME_QUIZZES, ...parsed };
    }
  } catch (e) {
    console.error('Gagal membaca data/quizzes.json:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_MINIGAME_QUIZZES));
}

let quizStore = loadQuizStore();

function saveQuizStore() {
  try {
    fs.mkdirSync(path.dirname(QUIZ_FILE_PATH), { recursive: true });
    fs.writeFileSync(QUIZ_FILE_PATH, JSON.stringify(quizStore, null, 2), 'utf8');
  } catch (e) {
    console.error('Gagal menyimpan data/quizzes.json:', e);
  }
}

function normalizeQuestionList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(q => q && (q.question || q.q))
    .map(q => {
      const text = String(q.question || q.q || '').trim();
      const opts = Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()).filter(Boolean) : ['A', 'B', 'C'];
      const cIdx = Math.max(0, Math.min(parseInt(q.correctIndex, 10) || 0, Math.max(0, opts.length - 1)));
      return {
        q: text,
        question: text,
        options: opts,
        correctIndex: cIdx,
        timeLimit: parseInt(q.timeLimit, 10) || 18,
        points: parseInt(q.points, 10) || 100,
        explanation: String(q.explanation || '').trim()
      };
    });
}

app.get('/api/quizzes', (req, res) => {
  const list = Object.values(quizStore).map(q => {
    const qSD = normalizeQuestionList(q.questionsSD && q.questionsSD.length ? q.questionsSD : q.questions);
    const qSMP = normalizeQuestionList(q.questionsSMP && q.questionsSMP.length ? q.questionsSMP : []);
    return {
      ...q,
      grade: q.grade || 'SD & SMP',
      questions: qSD,
      questionsSD: qSD,
      questionsSMP: qSMP
    };
  });
  res.json({ success: true, quizzes: list });
});

app.get('/api/quizzes/:gameId', (req, res) => {
  const q = quizStore[req.params.gameId];
  if (!q) return res.status(404).json({ success: false, message: 'Bank soal mini game tidak ditemukan.' });
  const qSD = normalizeQuestionList(q.questionsSD && q.questionsSD.length ? q.questionsSD : q.questions);
  const qSMP = normalizeQuestionList(q.questionsSMP && q.questionsSMP.length ? q.questionsSMP : []);
  res.json({ success: true, quiz: { ...q, questions: qSD, questionsSD: qSD, questionsSMP: qSMP } });
});

app.post('/api/quizzes/reset', (req, res) => {
  quizStore = JSON.parse(JSON.stringify(DEFAULT_MINIGAME_QUIZZES));
  try {
    if (fs.existsSync(QUIZ_FILE_PATH)) fs.unlinkSync(QUIZ_FILE_PATH);
  } catch (e) {
    console.error('Gagal menghapus data/quizzes.json saat reset:', e);
  }
  console.log('[QUIZ RESET] Bank soal dikembalikan ke bawaan SD & SMP.');
  res.json({ success: true, message: 'Bank soal berhasil dikembalikan ke default SD & SMP.' });
});

app.post('/api/quizzes/:gameId', (req, res) => {
  const gameId = req.params.gameId;
  const payload = req.body;
  if (!payload || (!Array.isArray(payload.questions) && !Array.isArray(payload.questionsSD) && !Array.isArray(payload.questionsSMP))) {
    return res.status(400).json({ success: false, message: 'Format soal tidak valid.' });
  }

  const prev = quizStore[gameId] || DEFAULT_MINIGAME_QUIZZES[gameId] || {};
  const qSD = Array.isArray(payload.questionsSD)
    ? normalizeQuestionList(payload.questionsSD)
    : (Array.isArray(payload.questions) ? normalizeQuestionList(payload.questions) : normalizeQuestionList(prev.questionsSD || prev.questions));
  const qSMP = Array.isArray(payload.questionsSMP)
    ? normalizeQuestionList(payload.questionsSMP)
    : normalizeQuestionList(prev.questionsSMP || []);

  quizStore[gameId] = {
    id: gameId,
    title: String(payload.title || prev.title || `Mini Game ${gameId}`).trim(),
    subject: String(payload.subject || prev.subject || 'Umum').trim(),
    grade: String(payload.grade || 'SD & SMP').trim(),
    description: String(payload.description !== undefined ? payload.description : (prev.description || '')).trim(),
    questions: qSD,
    questionsSD: qSD,
    questionsSMP: qSMP
  };
  saveQuizStore();

  // Sinkronkan juga ke seluruh room mini game yang sedang terbuka (lintas server kelas & private server)
  Object.values(rooms).forEach((r) => {
    if (r.gameId === gameId) {
      r.title = quizStore[gameId].title;
      r.subject = quizStore[gameId].subject;
      r.questions = r.level === 'smp' && qSMP.length ? qSMP : qSD;
    }
  });
  Object.values(raceRooms).forEach((r) => {
    if (r.gameId === gameId) {
      r.title = quizStore[gameId].title;
      r.subject = quizStore[gameId].subject;
    }
  });

  console.log(`[QUIZ UPDATED] ${gameId}: ${qSD.length} soal SD, ${qSMP.length} soal SMP.`);
  res.json({ success: true, quiz: quizStore[gameId] });
});

app.get('/api/servers', (req, res) => {
  const list = Object.values(classServers).map(srv => {
    const cityKey = `CITY_${srv.code}`;
    const playerCount = cityRooms[cityKey] ? Object.keys(cityRooms[cityKey].players).length : 0;
    return {
      code: srv.code,
      serverName: srv.serverName,
      hostName: srv.hostName,
      locked: srv.locked,
      playerCount
    };
  });
  res.json({ success: true, servers: list, lanIps: getLocalIpAddresses(), port: PORT });
});

// Helper: Get local network IP addresses (so students can easily connect from phones)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// In-Memory Storage for Game Rooms & City Lobby
// Structure: rooms[roomCode] = { hostId, roomCode, title, questions, currentQIndex, state, timer, timerInterval, players, history }
const rooms = {};
const raceRooms = {}; // Ruang Balap Mobil 3 Gerbang (mg-04, dst.)
const bridgeRooms = {}; // Ruang Jembatan Kaca Pecahan (mg-05)
const lavaRooms = {}; // Ruang Battle Royale Lantai Lava Tata Surya (mg-06)
const geoRooms = {};  // Ruang Panjat Menara Bangun Ruang (mg-07)
const puebiRooms = {}; // Ruang Lampu Merah, Lampu Hijau PUEBI (mg-08)
const recycleRooms = {}; // Ruang Pabrik Daur Ulang Kilat (mg-09)
const cafeRooms = {}; // Ruang Dapur Kalimat Kafe Bahasa Inggris (mg-12)
const mazeRooms = {}; // Ruang Labirin Gerbang Matematika (mg-11)
const cityPlayers = {}; // Pemain (Siswa & Guru) yang sedang berada di Lobby Perkotaan 3D

function generateGeoFloors(level = 'sd') {
  const pool = [...(GEOMETRY_QUIZZES[level] || GEOMETRY_QUIZZES.sd)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // 5 Lantai tantangan (Lantai 1..5 -> melontar ke Lantai 6 Puncak Trofi!)
  return pool.slice(0, 5).map((item, idx) => {
    const shuffledShapes = [...item.shapes];
    for (let i = shuffledShapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledShapes[i], shuffledShapes[j]] = [shuffledShapes[j], shuffledShapes[i]];
    }
    return {
      floorIndex: idx, // 0..4
      q: item.q,
      shapes: shuffledShapes,
      answer: item.answer
    };
  });
}
const CITY_ROOM = 'CITY_LOBBY';

function generateBridgeSteps(level = 'sd') {
  const pool = [...(BRIDGE_QUIZZES[level] || BRIDGE_QUIZZES.sd)];
  // Acak Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Ambil 8 soal dan acak posisi kolom (0, 1, 2) tiap soal agar tidak mudah dihafal
  return pool.slice(0, 8).map((item, idx) => {
    const indices = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const shuffledOptions = indices.map(oldIdx => item.options[oldIdx]);
    const newCorrectIndex = indices.indexOf(item.correctIndex);
    return {
      row: idx,
      q: item.q,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
      panelStates: ['unknown', 'unknown', 'unknown'] // 'unknown' | 'safe' | 'broken'
    };
  });
}

// Generate simple 4-character code (e.g., "7429" or "KL89")
function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[code] ? generateRoomCode() : code;
}

// Socket.IO Multiplayer Handling
io.on('connection', (socket) => {
  let currentRoom = null;
  let isHost = false;
  let inCityLobby = false;
  let currentCityRoomKey = null;
  let currentServerCode = null;
  let currentPlayMode = 'solo'; // 'solo' | 'multiplayer'
  let currentRaceRoom = null;
  let currentBridgeRoom = null;
  let currentLavaRoom = null;
  let currentGeoRoom = null;
  let currentPuebiRoom = null;
  let currentRecycleRoom = null;
  let currentCafeRoom = null;
  let currentMazeRoom = null;

  function leaveCurrentCityRoom() {
    if (!inCityLobby || !currentCityRoomKey) return;
    const roomObj = cityRooms[currentCityRoomKey];
    if (roomObj && roomObj.players[socket.id]) {
      const leavingPlayer = roomObj.players[socket.id];
      console.log(`[CITY LOBBY ${roomObj.serverCode}] ${leavingPlayer.name} keluar dari Kota.`);
      delete roomObj.players[socket.id];
      socket.leave(currentCityRoomKey);
      io.to(currentCityRoomKey).emit('city_player_left', socket.id);
      const remainingList = Object.values(roomObj.players);
      io.to(currentCityRoomKey).emit('city_count_updated', remainingList.length);
      io.to(currentCityRoomKey).emit('city_roster_updated', remainingList);

      if (roomObj.mode === 'solo' && remainingList.length === 0) {
        delete cityRooms[currentCityRoomKey];
      } else if (classServers[roomObj.serverCode]) {
        classServers[roomObj.serverCode].lastActivityAt = Date.now();
      }
    }
    inCityLobby = false;
    currentCityRoomKey = null;
    currentServerCode = null;
  }

  // =========================================================================
  // A. LOBBY PERKOTAAN 3D (PRIVATE SERVER SOLO & SERVER KELAS MULTIPLAYER)
  // =========================================================================
  socket.on('join_city', (data, callback) => {
    leaveCurrentCityRoom();

    const mode = data.mode === 'multiplayer' ? 'multiplayer' : 'solo';
    let serverCode = '';
    let serverMeta = null;

    if (mode === 'solo') {
      const rawSolo = sanitizeServerCode(data.serverCode, '');
      serverCode = rawSolo.startsWith('SOLO_') ? rawSolo : `SOLO_${socket.id.slice(0, 8).toUpperCase()}`;
      serverMeta = {
        code: serverCode,
        serverName: 'Private Server',
        hostName: (data.name || 'Pemain').slice(0, 18),
        locked: false,
        mode: 'solo'
      };
    } else {
      const cleanCode = String(data.serverCode || '').replace(/\s+/g, '').toUpperCase();
      const srv = classServers[cleanCode];
      if (!srv) {
        if (callback) {
          callback({ success: false, message: `Server kelas "${cleanCode}" tidak ditemukan atau sudah ditutup oleh guru.` });
        }
        return;
      }
      if (srv.locked && data.role !== 'teacher') {
        if (callback) {
          callback({ success: false, message: 'Server kelas sedang dikunci oleh guru.' });
        }
        return;
      }
      serverCode = srv.code;
      srv.lastActivityAt = Date.now();
      if (data.role === 'teacher') {
        srv.hostSocketId = socket.id;
        if (data.name) srv.hostName = String(data.name).slice(0, 18);
      }
      serverMeta = {
        code: srv.code,
        serverName: srv.serverName,
        hostName: srv.hostName,
        locked: srv.locked,
        mode: 'multiplayer'
      };
    }

    const cityRoomKey = `CITY_${serverCode}`;
    if (!cityRooms[cityRoomKey]) {
      cityRooms[cityRoomKey] = { mode, serverCode, players: {} };
    }

    inCityLobby = true;
    currentPlayMode = mode;
    currentServerCode = serverCode;
    currentCityRoomKey = cityRoomKey;
    socket.join(cityRoomKey);

    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 4;
    const isTeacher = data.role === 'teacher';
    const resolvedRole = mode === 'solo' ? 'solo' : (isTeacher ? 'teacher' : 'student');

    const player = {
      id: socket.id,
      name: (data.name || (isTeacher ? 'Guru' : 'Pemain')).slice(0, 18),
      role: resolvedRole,
      color: data.color || (isTeacher ? '#f59e0b' : '#38bdf8'),
      hat: data.hat || (isTeacher ? 'mahkota' : 'none'),
      position: {
        x: parseFloat((Math.cos(angle) * radius).toFixed(2)),
        y: 0,
        z: parseFloat((Math.sin(angle) * radius).toFixed(2))
      },
      rotationY: parseFloat((angle + Math.PI).toFixed(2)),
      isMoving: false,
      isJumping: false
    };

    cityRooms[cityRoomKey].players[socket.id] = player;
    const allInRoom = Object.values(cityRooms[cityRoomKey].players);
    console.log(`[CITY LOBBY ${serverCode}] ${player.name} (${resolvedRole}) masuk. Total: ${allInRoom.length}`);

    if (callback) {
      callback({
        success: true,
        mode,
        server: serverMeta,
        player,
        players: allInRoom
      });
    }

    socket.to(cityRoomKey).emit('city_player_joined', player);
    io.to(cityRoomKey).emit('city_count_updated', allInRoom.length);
    io.to(cityRoomKey).emit('city_roster_updated', allInRoom);
  });

  socket.on('leave_city', () => {
    leaveCurrentCityRoom();
  });

  socket.on('city_move', (moveData) => {
    if (!currentCityRoomKey || !cityRooms[currentCityRoomKey]) return;
    const p = cityRooms[currentCityRoomKey].players[socket.id];
    if (!p) return;
    p.position.x = moveData.x;
    p.position.y = moveData.y;
    p.position.z = moveData.z;
    p.rotationY = moveData.rotY;
    p.isMoving = moveData.isMoving;
    p.isJumping = moveData.isJumping;

    socket.to(currentCityRoomKey).emit('city_player_moved', {
      id: socket.id,
      x: moveData.x,
      y: moveData.y,
      z: moveData.z,
      rotY: moveData.rotY,
      isMoving: moveData.isMoving,
      isJumping: moveData.isJumping
    });
  });

  socket.on('city_emote', (emoji) => {
    if (!currentCityRoomKey || !cityRooms[currentCityRoomKey] || !cityRooms[currentCityRoomKey].players[socket.id]) return;
    io.to(currentCityRoomKey).emit('city_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 6)
    });
  });

  socket.on('city_chat', (msg) => {
    if (!currentCityRoomKey || !cityRooms[currentCityRoomKey]) return;
    const p = cityRooms[currentCityRoomKey].players[socket.id];
    if (!p) return;
    const text = String(msg || '').trim().slice(0, 100);
    if (!text) return;

    io.to(currentCityRoomKey).emit('city_chat_message', {
      id: socket.id,
      name: p.name,
      role: p.role,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('city_update_avatar', (data) => {
    if (!currentCityRoomKey || !cityRooms[currentCityRoomKey]) return;
    const p = cityRooms[currentCityRoomKey].players[socket.id];
    if (!p) return;
    if (data.name) p.name = String(data.name).slice(0, 18);
    if (data.color) p.color = data.color;
    if (data.hat !== undefined) p.hat = data.hat;
    io.to(currentCityRoomKey).emit('city_player_updated', p);
  });

  // Fitur khusus Guru: Panggil semua murid di Server Kelas ini ke gedung Mini Game tertentu
  socket.on('teacher_announce_building', (data) => {
    if (!currentCityRoomKey || !cityRooms[currentCityRoomKey]) return;
    const p = cityRooms[currentCityRoomKey].players[socket.id];
    if (!p || p.role !== 'teacher') return;

    io.to(currentCityRoomKey).emit('city_teacher_announcement', {
      teacherName: p.name,
      buildingId: data.buildingId,
      buildingName: data.buildingName,
      message: data.message || `Guru ${p.name} memanggil seluruh kelas menuju ${data.buildingName}.`,
      pin: currentServerCode || null
    });
  });

  // Fitur khusus Guru: Kunci / Buka Server Kelas
  socket.on('teacher_toggle_lock_server', (_, callback) => {
    if (!currentCityRoomKey || !currentServerCode || !classServers[currentServerCode]) return;
    const p = cityRooms[currentCityRoomKey] && cityRooms[currentCityRoomKey].players[socket.id];
    if (!p || p.role !== 'teacher') return;

    const srv = classServers[currentServerCode];
    srv.locked = !srv.locked;
    io.to(currentCityRoomKey).emit('server_lock_changed', { locked: srv.locked });
    if (callback) callback({ success: true, locked: srv.locked });
  });

  // Fitur khusus Guru: Tutup Server Kelas secara permanen
  socket.on('teacher_close_server', (_, callback) => {
    if (!currentCityRoomKey || !currentServerCode || !classServers[currentServerCode]) return;
    const p = cityRooms[currentCityRoomKey] && cityRooms[currentCityRoomKey].players[socket.id];
    if (!p || p.role !== 'teacher') return;

    const code = currentServerCode;
    const roomKey = currentCityRoomKey;
    io.to(roomKey).emit('server_closed_by_host', {
      code,
      message: `Server kelas ${code} telah ditutup oleh Guru ${p.name}.`
    });
    delete classServers[code];
    delete cityRooms[roomKey];
    inCityLobby = false;
    currentCityRoomKey = null;
    currentServerCode = null;
    if (callback) callback({ success: true });
  });

  // =========================================================================
  // B. MINI GAME ROOMS (ARENA KUIS & MINI GAMES MULTIPLAYER — TANPA KODE PIN)
  // =========================================================================

function getQuestionsForLevel(quizData, level) {
  const lvl = level === 'smp' ? 'smp' : 'sd';
  if (!quizData) return [];
  let raw = [];
  if (lvl === 'smp' && Array.isArray(quizData.questionsSMP) && quizData.questionsSMP.length > 0) {
    raw = quizData.questionsSMP;
  } else if (lvl === 'sd' && Array.isArray(quizData.questionsSD) && quizData.questionsSD.length > 0) {
    raw = quizData.questionsSD;
  } else if (Array.isArray(quizData.questions)) {
    raw = quizData.questions;
  }
  return raw.map(item => ({
    ...item,
    q: item.q || item.question || '',
    question: item.question || item.q || ''
  }));
}

  // 0. Langsung masuk ke Mini Game berdasarkan ID Gedung (mg-01, mg-02, mg-03, dst.)
  socket.on('join_minigame', (data, callback) => {
    const gameId = (data.gameId || 'mg-01').toLowerCase().trim();
    const roomCode = buildScopedRoomKey('MG', gameId, data.serverCode);
    const quizData = quizStore[gameId] || quizStore['mg-01'];
    const reqLevel = data.level === 'smp' ? 'smp' : 'sd';

    // Buat room otomatis jika belum ada
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        roomCode: roomCode,
        gameId: gameId,
        level: reqLevel,
        isAutoMiniGame: true,
        hostId: socket.id,
        title: quizData.title || `Mini Game ${gameId}`,
        subject: quizData.subject || 'Umum',
        teacherName: 'Guru',
        questions: getQuestionsForLevel(quizData, reqLevel),
        currentQIndex: -1,
        state: 'LOBBY',
        timer: 0,
        timerInterval: null,
        players: {},
        resultsHistory: []
      };
    }

    const room = rooms[roomCode];
    // Selalu sinkronkan soal terbaru sesuai level SD/SMP jika sedang di LOBBY
    if (room.state === 'LOBBY' && quizData) {
      room.title = quizData.title;
      room.subject = quizData.subject;
      room.questions = getQuestionsForLevel(quizData, room.level || 'sd');
    }

    currentRoom = roomCode;
    isHost = (data.role === 'teacher' || data.role === 'host');
    socket.join(roomCode);

    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = 2 + Math.random() * 4.5;

    const player = {
      id: socket.id,
      name: (data.name || (isHost ? 'Guru' : 'Siswa')).slice(0, 18),
      role: isHost ? 'teacher' : 'student',
      color: data.color || (isHost ? '#f59e0b' : '#38bdf8'),
      hat: data.hat || (isHost ? 'mahkota' : 'none'),
      position: {
        x: parseFloat((Math.cos(spawnAngle) * spawnRadius).toFixed(2)),
        y: 0,
        z: parseFloat((Math.sin(spawnAngle) * spawnRadius).toFixed(2))
      },
      rotationY: Math.random() * Math.PI * 2,
      isMoving: false,
      isJumping: false,
      currentAnswer: null,
      answeredAt: null,
      score: 0,
      streak: 0,
      correctCount: 0,
      lastAnswerCorrect: null
    };

    room.players[socket.id] = player;
    console.log(`[MINIGAME JOIN] ${player.name} (${player.role}) masuk ke ${gameId} (${roomCode})`);

    if (callback) {
      callback({
        success: true,
        roomCode: roomCode,
        gameId: gameId,
        player: player,
        room: {
          title: room.title,
          subject: room.subject,
          level: room.level || 'sd',
          state: room.state,
          currentQIndex: room.currentQIndex,
          totalQuestions: room.questions.length,
          currentQuestion: room.state === 'QUESTION' && room.questions[room.currentQIndex] ? {
            index: room.currentQIndex,
            total: room.questions.length,
            question: room.questions[room.currentQIndex].question,
            options: room.questions[room.currentQIndex].options,
            timeLimit: room.timer,
            points: room.questions[room.currentQIndex].points || 100,
            category: room.subject
          } : null
        }
      });
    }

    io.to(roomCode).emit('player_list_updated', Object.values(room.players));
    socket.to(roomCode).emit('player_joined_3d', player);
  });

  // Kontrol mulai / buka jawaban / lanjut / main ulang untuk Mini Game tanpa PIN (bisa oleh Guru maupun Pemain di arena)
  socket.on('minigame_start', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (!room.isAutoMiniGame && !isHost) return;
    if (room.questions.length === 0) return;

    // Reset skor saat mulai baru dari LOBBY atau FINISHED
    if (room.state === 'LOBBY' || room.state === 'FINISHED') {
      for (const pid in room.players) {
        room.players[pid].score = 0;
        room.players[pid].streak = 0;
        room.players[pid].correctCount = 0;
      }
      room.currentQIndex = 0;
      startQuestionRound(room);
    }
  });

  socket.on('minigame_reveal', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (!room.isAutoMiniGame && !isHost) return;
    if (room.state === 'QUESTION') {
      if (room.timerInterval) clearInterval(room.timerInterval);
      revealQuestionResult(room);
    }
  });

  socket.on('minigame_next', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (!room.isAutoMiniGame && !isHost) return;
    if (room.state !== 'REVEAL') return;

    if (room.currentQIndex + 1 < room.questions.length) {
      room.currentQIndex++;
      startQuestionRound(room);
    } else {
      finishGame(room);
    }
  });

  // 1. Host creates a new room (tetap dipertahankan untuk kompatibilitas tes)
  socket.on('create_room', (data, callback) => {
    const roomCode = generateRoomCode();
    currentRoom = roomCode;
    isHost = true;

    rooms[roomCode] = {
      roomCode: roomCode,
      hostId: socket.id,
      title: data.title || 'Kuis Kelas Seru 3D',
      subject: data.subject || 'Umum',
      teacherName: data.teacherName || 'Guru',
      questions: data.questions || [],
      currentQIndex: -1,
      state: 'LOBBY', // LOBBY, QUESTION, REVEAL, LEADERBOARD, FINISHED
      timer: 0,
      timerInterval: null,
      players: {},
      resultsHistory: []
    };

    socket.join(roomCode);
    console.log(`[ROOM CREATED] ${roomCode} by ${rooms[roomCode].teacherName} (${socket.id})`);

    if (callback) {
      callback({
        success: true,
        roomCode: roomCode,
        roomData: {
          roomCode,
          title: rooms[roomCode].title,
          subject: rooms[roomCode].subject,
          questionCount: rooms[roomCode].questions.length
        }
      });
    }
  });

  // 2. Player joins room with PIN and character customisation
  socket.on('join_room', (data, callback) => {
    const roomCode = (data.roomCode || '').toUpperCase().trim();
    const room = rooms[roomCode];

    if (!room) {
      if (callback) callback({ success: false, message: 'Kode Room (PIN) tidak ditemukan!' });
      return;
    }

    if (room.state === 'FINISHED') {
      if (callback) callback({ success: false, message: 'Game di room ini sudah selesai.' });
      return;
    }

    currentRoom = roomCode;
    isHost = false;
    socket.join(roomCode);

    // Random spawn position in 3D lobby
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = 2 + Math.random() * 5;
    const spawnX = Math.cos(spawnAngle) * spawnRadius;
    const spawnZ = Math.sin(spawnAngle) * spawnRadius;

    const player = {
      id: socket.id,
      name: (data.name || 'Siswa').slice(0, 16),
      color: data.color || '#4361ee',
      hat: data.hat || 'none',
      position: { x: spawnX, y: 0, z: spawnZ },
      rotationY: Math.random() * Math.PI * 2,
      isMoving: false,
      isJumping: false,
      currentAnswer: null, // index 0, 1, 2, 3 based on 3D platform
      answeredAt: null,
      score: 0,
      streak: 0,
      correctCount: 0,
      lastAnswerCorrect: null
    };

    room.players[socket.id] = player;

    console.log(`[PLAYER JOINED] ${player.name} -> Room ${roomCode}`);

    // Notify caller
    if (callback) {
      callback({
        success: true,
        roomCode: roomCode,
        player: player,
        room: {
          title: room.title,
          subject: room.subject,
          level: room.level || 'sd',
          state: room.state,
          currentQIndex: room.currentQIndex,
          totalQuestions: room.questions.length
        }
      });
    }

    // Broadcast updated player list to everyone in room
    io.to(roomCode).emit('player_list_updated', Object.values(room.players));
    socket.to(roomCode).emit('player_joined_3d', player);
  });

  // 3. 3D Movement Synchronization (high frequency, lightweight)
  socket.on('player_move_3d', (moveData) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players[socket.id];
    if (!player) return;

    player.position.x = moveData.x;
    player.position.y = moveData.y;
    player.position.z = moveData.z;
    player.rotationY = moveData.rotY;
    player.isMoving = moveData.isMoving;
    player.isJumping = moveData.isJumping;

    // Broadcast movement to all other clients in the same room
    socket.to(currentRoom).emit('player_moved_3d', {
      id: socket.id,
      x: moveData.x,
      y: moveData.y,
      z: moveData.z,
      rotY: moveData.rotY,
      isMoving: moveData.isMoving,
      isJumping: moveData.isJumping
    });
  });

  // 4. Player stands on an answer platform (Zone A, B, C, or D)
  socket.on('player_stand_on_zone', (zoneIndex) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.state !== 'QUESTION') return;

    const player = room.players[socket.id];
    if (!player) return;

    // zoneIndex: 0 = A, 1 = B, 2 = C, 3 = D, null = outside
    if (player.currentAnswer !== zoneIndex) {
      player.currentAnswer = zoneIndex;
      if (zoneIndex !== null && !player.answeredAt) {
        player.answeredAt = Date.now();
      }

      // Notify host and player itself of chosen zone
      io.to(room.hostId).emit('player_zone_changed', {
        id: socket.id,
        name: player.name,
        zone: zoneIndex
      });

      socket.emit('my_zone_changed', { zone: zoneIndex });
    }
  });

  // 5. Host starts the game
  socket.on('host_start_game', () => {
    if (!currentRoom || !rooms[currentRoom] || !isHost) return;
    const room = rooms[currentRoom];
    if (room.questions.length === 0) {
      socket.emit('host_error', 'Tidak ada soal dalam kuis ini!');
      return;
    }

    room.currentQIndex = 0;
    startQuestionRound(room);
  });

  // 6. Host advances to next question
  socket.on('host_next_question', () => {
    if (!currentRoom || !rooms[currentRoom] || !isHost) return;
    const room = rooms[currentRoom];

    if (room.currentQIndex + 1 < room.questions.length) {
      room.currentQIndex++;
      startQuestionRound(room);
    } else {
      finishGame(room);
    }
  });

  // 7. Host triggers manual reveal (if teacher wants to end timer early)
  socket.on('host_reveal_answer', () => {
    if (!currentRoom || !rooms[currentRoom] || !isHost) return;
    const room = rooms[currentRoom];
    if (room.state === 'QUESTION') {
      if (room.timerInterval) clearInterval(room.timerInterval);
      revealQuestionResult(room);
    }
  });

  // 8. Player triggers reaction emote (3D Emote Balloon: 👍, 🔥, 😂, etc.)
  socket.on('send_emote', (emote) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    io.to(currentRoom).emit('player_emote_3d', {
      id: socket.id,
      emote: emote
    });
  });

  // 9. Player or Host sends in-game chat
  socket.on('send_chat', (message) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const sender = isHost ? { name: `Guru (${room.teacherName})`, isHost: true } : room.players[socket.id];
    if (!sender) return;

    io.to(currentRoom).emit('chat_message', {
      id: socket.id,
      name: sender.name,
      isHost: isHost,
      text: String(message).slice(0, 80),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 10. Teacher requests final grade export
  socket.on('export_grades', (callback) => {
    if (!currentRoom || !rooms[currentRoom] || !isHost) return;
    const room = rooms[currentRoom];

    const report = {
      title: room.title,
      subject: room.subject,
      teacher: room.teacherName,
      date: new Date().toISOString(),
      totalQuestions: room.questions.length,
      students: Object.values(room.players).map(p => ({
        name: p.name,
        score: p.score,
        correctCount: p.correctCount,
        streakMax: p.streak
      })).sort((a, b) => b.score - a.score),
      questions: room.questions.map((q, idx) => ({
        number: idx + 1,
        question: q.question,
        correctOption: q.options[q.correctIndex]
      }))
    };

    if (callback) callback(report);
  });

  // =========================================================================
  // C. BALAP MOBIL 3 GERBANG SOAL (MULTIPLAYER 1 KELAS TANPA PIN)
  // =========================================================================
  socket.on('join_race', (data, callback) => {
    const gameId = (data.gameId || 'mg-04').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('RACE', gameId, data.serverCode);
    const quizData = quizStore[gameId] || quizStore['mg-04'];

    if (!raceRooms[roomKey]) {
      raceRooms[roomKey] = {
        roomKey,
        gameId,
        title: quizData.title,
        subject: quizData.subject,
        state: 'LOBBY', // LOBBY | COUNTDOWN | RACING
        startTime: 0,
        players: {}
      };
    }

    const rRoom = raceRooms[roomKey];
    currentRaceRoom = roomKey;
    socket.join(roomKey);

    // Posisi start berjajar rapi di 3 jalur
    const idx = Object.keys(rRoom.players).length;
    const laneX = [-7, 0, 7][idx % 3];
    const rowZ = Math.floor(idx / 3) * 6;

    const racer = {
      id: socket.id,
      name: (data.name || 'Pembalap').slice(0, 18),
      color: data.color || '#38bdf8',
      role: data.role || 'student',
      x: laneX,
      z: rowZ,
      speed: 0,
      status: 'normal', // normal | turbo | slow
      correctCount: 0,
      finished: false,
      finishTime: null
    };
    rRoom.players[socket.id] = racer;

    // Pastikan setiap soal punya tepat 3 pilihan gerbang (A, B, C) sesuai level SD / SMP
    if (!rRoom.level) rRoom.level = data.level === 'smp' ? 'smp' : 'sd';
    const levelQs = getQuestionsForLevel(quizData, rRoom.level);
    const preparedQuestions = levelQs.map(q => {
      let opts = Array.isArray(q.options) ? q.options.slice(0, 3) : ['A', 'B', 'C'];
      let cIdx = q.correctIndex || 0;
      if (cIdx >= 3 && q.options && q.options[cIdx]) {
        opts[2] = q.options[cIdx];
        cIdx = 2;
      }
      return {
        question: q.question || q.q || '',
        options: opts,
        correctIndex: cIdx,
        explanation: q.explanation || ''
      };
    });

    if (callback) {
      callback({
        success: true,
        racer,
        level: rRoom.level,
        state: rRoom.state,
        title: quizData.title,
        subject: quizData.subject,
        questions: preparedQuestions,
        players: Object.values(rRoom.players)
      });
    }

    socket.to(roomKey).emit('race_player_joined', racer);
    io.to(roomKey).emit('race_players_updated', Object.values(rRoom.players));
  });

  socket.on('race_set_level', (data) => {
    if (!currentRaceRoom || !raceRooms[currentRaceRoom]) return;
    const rRoom = raceRooms[currentRaceRoom];
    if (rRoom.state !== 'LOBBY') return;
    rRoom.level = data && data.level === 'smp' ? 'smp' : 'sd';
    const quizData = quizStore[rRoom.gameId] || quizStore['mg-04'];
    const preparedQuestions = getQuestionsForLevel(quizData, rRoom.level).map(q => {
      let opts = Array.isArray(q.options) ? q.options.slice(0, 3) : ['A', 'B', 'C'];
      let cIdx = q.correctIndex || 0;
      if (cIdx >= 3 && q.options && q.options[cIdx]) {
        opts[2] = q.options[cIdx];
        cIdx = 2;
      }
      return { question: q.question || q.q || '', options: opts, correctIndex: cIdx, explanation: q.explanation || '' };
    });
    io.to(currentRaceRoom).emit('race_level_changed', { level: rRoom.level, questions: preparedQuestions });
  });

  socket.on('game_set_level', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.state !== 'LOBBY') return;
    room.level = data && data.level === 'smp' ? 'smp' : 'sd';
    const quizData = quizStore[room.gameId] || quizStore['mg-01'];
    room.questions = getQuestionsForLevel(quizData, room.level);
    io.to(currentRoom).emit('game_level_changed', {
      level: room.level,
      totalQuestions: room.questions.length
    });
  });

  socket.on('race_start', () => {
    if (!currentRaceRoom || !raceRooms[currentRaceRoom]) return;
    const rRoom = raceRooms[currentRaceRoom];
    if (rRoom.state === 'COUNTDOWN') return;

    rRoom.state = 'COUNTDOWN';
    // Reset posisi & progres seluruh pembalap
    const list = Object.values(rRoom.players);
    list.forEach((p, idx) => {
      p.x = [-7, 0, 7][idx % 3];
      p.z = Math.floor(idx / 3) * 6;
      p.speed = 0;
      p.status = 'normal';
      p.correctCount = 0;
      p.finished = false;
      p.finishTime = null;
    });

    io.to(currentRaceRoom).emit('race_countdown', { seconds: 3, players: list });

    setTimeout(() => {
      if (!raceRooms[currentRaceRoom]) return;
      rRoom.state = 'RACING';
      rRoom.startTime = Date.now();
      io.to(currentRaceRoom).emit('race_go', { startTime: rRoom.startTime });
    }, 3000);
  });

  const handleRaceUpdate = (u) => {
    if (!currentRaceRoom || !raceRooms[currentRaceRoom]) return;
    const rRoom = raceRooms[currentRaceRoom];
    const p = rRoom.players[socket.id];
    if (!p || !u) return;

    p.x = u.x;
    p.z = u.z;
    p.speed = u.speed;
    p.status = u.status || 'normal';
    p.correctCount = u.correctCount || 0;

    socket.to(currentRaceRoom).emit('race_player_moved', {
      id: socket.id,
      x: p.x,
      z: p.z,
      speed: p.speed,
      status: p.status,
      correctCount: p.correctCount
    });
  };
  socket.on('race_update', handleRaceUpdate);
  socket.on('race_move', handleRaceUpdate);

  socket.on('race_finish', (data) => {
    if (!currentRaceRoom || !raceRooms[currentRaceRoom]) return;
    const rRoom = raceRooms[currentRaceRoom];
    const p = rRoom.players[socket.id];
    if (!p || p.finished) return;

    p.finished = true;
    p.correctCount = data.correctCount || p.correctCount;
    p.finishTime = parseFloat(((Date.now() - rRoom.startTime) / 1000).toFixed(2));

    const standings = Object.values(rRoom.players).sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return a.z - b.z; // z semakin negatif = semakin jauh maju
    });

    io.to(currentRaceRoom).emit('race_standings_updated', {
      finisher: p,
      standings
    });
  });

  // =========================================================================
  // D. MINI GAME #05: JEMBATAN KACA PECAHAN (GLASS BRIDGE MULTIPLAYER)
  // =========================================================================
  socket.on('join_bridge', (data, callback) => {
    const gameId = (data.gameId || 'mg-05').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('BRIDGE', gameId, data.serverCode);
    const reqLevel = data.level === 'smp' ? 'smp' : 'sd';

    if (!bridgeRooms[roomKey]) {
      bridgeRooms[roomKey] = {
        roomKey,
        gameId,
        level: reqLevel,
        roundStartTime: Date.now(),
        steps: generateBridgeSteps(reqLevel),
        players: {}
      };
    }

    const bRoom = bridgeRooms[roomKey];
    currentBridgeRoom = roomKey;
    socket.join(roomKey);

    const spawnX = (Math.random() - 0.5) * 8;
    const player = {
      id: socket.id,
      name: (data.name || 'Siswa').slice(0, 18),
      role: data.role || 'student',
      color: data.color || '#38bdf8',
      hat: data.hat || 'none',
      x: parseFloat(spawnX.toFixed(2)),
      y: 0,
      z: 0,
      rotY: Math.PI,
      isMoving: false,
      isJumping: false,
      row: 0, // Baris tertinggi yang dicapai (0..8)
      finished: false,
      finishTime: null
    };
    bRoom.players[socket.id] = player;

    if (callback) {
      callback({
        success: true,
        player,
        level: bRoom.level,
        steps: bRoom.steps,
        players: Object.values(bRoom.players)
      });
    }

    socket.to(roomKey).emit('bridge_player_joined', player);
    io.to(roomKey).emit('bridge_players_updated', Object.values(bRoom.players));
  });

  socket.on('bridge_new_round', (data) => {
    if (!currentBridgeRoom || !bridgeRooms[currentBridgeRoom]) return;
    const bRoom = bridgeRooms[currentBridgeRoom];
    const newLevel = data && data.level === 'smp' ? 'smp' : 'sd';

    bRoom.level = newLevel;
    bRoom.roundStartTime = Date.now();
    bRoom.steps = generateBridgeSteps(newLevel);

    Object.values(bRoom.players).forEach(p => {
      p.x = parseFloat(((Math.random() - 0.5) * 8).toFixed(2));
      p.y = 0;
      p.z = 0;
      p.row = 0;
      p.finished = false;
      p.finishTime = null;
    });

    io.to(currentBridgeRoom).emit('bridge_round_reset', {
      level: bRoom.level,
      steps: bRoom.steps,
      players: Object.values(bRoom.players)
    });
  });

  socket.on('bridge_move', (m) => {
    if (!currentBridgeRoom || !bridgeRooms[currentBridgeRoom]) return;
    const p = bridgeRooms[currentBridgeRoom].players[socket.id];
    if (!p) return;
    p.x = m.x;
    p.y = m.y;
    p.z = m.z;
    p.rotY = m.rotY;
    p.isMoving = m.isMoving;
    p.isJumping = m.isJumping;
    if (typeof m.row === 'number' && m.row > p.row) p.row = m.row;

    socket.to(currentBridgeRoom).emit('bridge_player_moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isMoving: p.isMoving,
      isJumping: p.isJumping,
      row: p.row
    });
  });

  socket.on('bridge_panel_step', (data) => {
    if (!currentBridgeRoom || !bridgeRooms[currentBridgeRoom]) return;
    const bRoom = bridgeRooms[currentBridgeRoom];
    const step = bRoom.steps[data.row];
    if (!step) return;
    const col = data.col;
    if (col < 0 || col > 2) return;

    const newState = (col === step.correctIndex) ? 'safe' : 'broken';
    if (step.panelStates[col] !== newState) {
      step.panelStates[col] = newState;
      io.to(currentBridgeRoom).emit('bridge_panel_updated', {
        row: data.row,
        col: col,
        state: newState,
        byName: bRoom.players[socket.id] ? bRoom.players[socket.id].name : 'Siswa'
      });
    }
  });

  socket.on('bridge_finish', () => {
    if (!currentBridgeRoom || !bridgeRooms[currentBridgeRoom]) return;
    const bRoom = bridgeRooms[currentBridgeRoom];
    const p = bRoom.players[socket.id];
    if (!p || p.finished) return;

    p.finished = true;
    p.row = 8;
    p.finishTime = parseFloat(((Date.now() - bRoom.roundStartTime) / 1000).toFixed(2));

    const standings = Object.values(bRoom.players).sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.row - a.row;
    });

    io.to(currentBridgeRoom).emit('bridge_standings_updated', {
      finisher: p,
      standings
    });
  });

  socket.on('bridge_emote', (emoji) => {
    if (!currentBridgeRoom || !bridgeRooms[currentBridgeRoom]) return;
    io.to(currentBridgeRoom).emit('bridge_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // E. MINI GAME #06: LANTAI LAVA TATA SURYA (BATTLE ROYALE / ELIMINASI)
  // =========================================================================
  socket.on('join_lava', (data, callback) => {
    const gameId = (data.gameId || 'mg-06').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('LAVA', gameId, data.serverCode);

    if (!lavaRooms[roomKey]) {
      lavaRooms[roomKey] = {
        roomKey,
        gameId,
        level: data.level === 'smp' ? 'smp' : 'sd',
        state: 'LOBBY', // LOBBY | CLUE | LAVA_DROP | FINISHED
        round: 0,
        maxRounds: 6,
        cluesQueue: [],
        currentClue: null,
        timer: 0,
        interval: null,
        players: {}
      };
    }

    const lRoom = lavaRooms[roomKey];
    currentLavaRoom = roomKey;
    socket.join(roomKey);

    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 4;
    const player = {
      id: socket.id,
      name: (data.name || 'Astronot').slice(0, 18),
      role: data.role || 'student',
      color: data.color || '#38bdf8',
      hat: data.hat || 'none',
      x: parseFloat((Math.cos(a) * r).toFixed(2)),
      y: 0,
      z: parseFloat((Math.sin(a) * r).toFixed(2)),
      rotY: 0,
      isMoving: false,
      isJumping: false,
      alive: lRoom.state === 'LOBBY', // Jika masuk saat sudah main, jadi penonton dulu
      standingPlanet: null,
      survivedRounds: 0
    };
    lRoom.players[socket.id] = player;

    if (callback) {
      callback({
        success: true,
        player,
        level: lRoom.level || 'sd',
        state: lRoom.state,
        round: lRoom.round,
        planets: LAVA_PLANETS,
        players: Object.values(lRoom.players)
      });
    }

    socket.to(roomKey).emit('lava_player_joined', player);
    io.to(roomKey).emit('lava_players_updated', Object.values(lRoom.players));
  });

  socket.on('lava_set_level', (data) => {
    if (!currentLavaRoom || !lavaRooms[currentLavaRoom]) return;
    const lRoom = lavaRooms[currentLavaRoom];
    lRoom.level = data && data.level === 'smp' ? 'smp' : 'sd';
    io.to(currentLavaRoom).emit('lava_level_changed', { level: lRoom.level });
  });

  socket.on('lava_start', (data) => {
    if (!currentLavaRoom || !lavaRooms[currentLavaRoom]) return;
    const lRoom = lavaRooms[currentLavaRoom];
    if (data && (data.level === 'sd' || data.level === 'smp')) {
      lRoom.level = data.level;
    }
    if (lRoom.interval) clearInterval(lRoom.interval);

    // Acak 6 ciri planet berbeda sesuai level SD / SMP
    const lvl = lRoom.level === 'smp' ? 'smp' : 'sd';
    const pool = [...(LAVA_CLUES_BY_LEVEL[lvl] || LAVA_CLUES)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    lRoom.cluesQueue = pool.slice(0, lRoom.maxRounds);
    lRoom.round = 0;

    // Hidupkan kembali semua pemain untuk Battle Royale baru
    Object.values(lRoom.players).forEach(p => {
      p.alive = true;
      p.survivedRounds = 0;
      p.standingPlanet = null;
      p.x = parseFloat(((Math.random() - 0.5) * 8).toFixed(2));
      p.y = 0;
      p.z = parseFloat(((Math.random() - 0.5) * 8).toFixed(2));
    });

    io.to(currentLavaRoom).emit('lava_match_started', {
      players: Object.values(lRoom.players),
      maxRounds: lRoom.maxRounds
    });

    runNextLavaRound(lRoom);
  });

  socket.on('lava_move', (m) => {
    if (!currentLavaRoom || !lavaRooms[currentLavaRoom]) return;
    const p = lavaRooms[currentLavaRoom].players[socket.id];
    if (!p) return;
    p.x = m.x;
    p.y = m.y;
    p.z = m.z;
    p.rotY = m.rotY;
    p.isMoving = m.isMoving;
    p.isJumping = m.isJumping;
    p.standingPlanet = m.standingPlanet || null;

    socket.to(currentLavaRoom).emit('lava_player_moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isMoving: p.isMoving,
      isJumping: p.isJumping,
      standingPlanet: p.standingPlanet,
      alive: p.alive
    });
  });

  socket.on('lava_emote', (emoji) => {
    if (!currentLavaRoom || !lavaRooms[currentLavaRoom]) return;
    io.to(currentLavaRoom).emit('lava_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // F. MINI GAME #07: PANJAT MENARA BANGUN RUANG (GEOMETRI 3D VERTIKAL)
  // =========================================================================
  socket.on('join_geo', (data, callback) => {
    const gameId = (data.gameId || 'mg-07').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('GEO', gameId, data.serverCode);
    const reqLevel = data.level === 'smp' ? 'smp' : 'sd';

    if (!geoRooms[roomKey]) {
      geoRooms[roomKey] = {
        roomKey,
        gameId,
        level: reqLevel,
        roundStartTime: Date.now(),
        floors: generateGeoFloors(reqLevel),
        players: {}
      };
    }

    const gRoom = geoRooms[roomKey];
    currentGeoRoom = roomKey;
    socket.join(roomKey);

    const player = {
      id: socket.id,
      name: (data.name || 'Siswa').slice(0, 18),
      role: data.role || 'student',
      color: data.color || '#38bdf8',
      hat: data.hat || 'none',
      x: parseFloat(((Math.random() - 0.5) * 6).toFixed(2)),
      y: 0,
      z: 7,
      rotY: Math.PI,
      isMoving: false,
      isJumping: false,
      floor: 1, // Lantai 1..6 (6 = Puncak Trofi!)
      finished: false,
      finishTime: null
    };
    gRoom.players[socket.id] = player;

    if (callback) {
      callback({
        success: true,
        player,
        level: gRoom.level,
        shapes: GEOMETRY_SHAPES,
        floors: gRoom.floors,
        players: Object.values(gRoom.players)
      });
    }

    socket.to(roomKey).emit('geo_player_joined', player);
    io.to(roomKey).emit('geo_players_updated', Object.values(gRoom.players));
  });

  socket.on('geo_new_round', (data) => {
    if (!currentGeoRoom || !geoRooms[currentGeoRoom]) return;
    const gRoom = geoRooms[currentGeoRoom];
    const newLevel = data && data.level === 'smp' ? 'smp' : 'sd';

    gRoom.level = newLevel;
    gRoom.roundStartTime = Date.now();
    gRoom.floors = generateGeoFloors(newLevel);

    Object.values(gRoom.players).forEach(p => {
      p.x = parseFloat(((Math.random() - 0.5) * 6).toFixed(2));
      p.y = 0;
      p.z = 7;
      p.floor = 1;
      p.finished = false;
      p.finishTime = null;
    });

    io.to(currentGeoRoom).emit('geo_round_reset', {
      level: gRoom.level,
      floors: gRoom.floors,
      players: Object.values(gRoom.players)
    });
  });

  socket.on('geo_move', (m) => {
    if (!currentGeoRoom || !geoRooms[currentGeoRoom]) return;
    const p = geoRooms[currentGeoRoom].players[socket.id];
    if (!p) return;
    p.x = m.x;
    p.y = m.y;
    p.z = m.z;
    p.rotY = m.rotY;
    p.isMoving = m.isMoving;
    p.isJumping = m.isJumping;
    if (typeof m.floor === 'number') p.floor = m.floor;

    socket.to(currentGeoRoom).emit('geo_player_moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isMoving: p.isMoving,
      isJumping: p.isJumping,
      floor: p.floor
    });
  });

  socket.on('geo_finish', () => {
    if (!currentGeoRoom || !geoRooms[currentGeoRoom]) return;
    const gRoom = geoRooms[currentGeoRoom];
    const p = gRoom.players[socket.id];
    if (!p || p.finished) return;

    p.finished = true;
    p.floor = 6;
    p.finishTime = parseFloat(((Date.now() - gRoom.roundStartTime) / 1000).toFixed(2));

    const standings = Object.values(gRoom.players).sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.floor - a.floor;
    });

    io.to(currentGeoRoom).emit('geo_standings_updated', { finisher: p, standings });
  });

  socket.on('geo_emote', (emoji) => {
    if (!currentGeoRoom || !geoRooms[currentGeoRoom]) return;
    io.to(currentGeoRoom).emit('geo_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // G. MINI GAME #08: LAMPU MERAH, LAMPU HIJAU PUEBI (BALAI BAHASA)
  // =========================================================================
  socket.on('join_puebi', (data, callback) => {
    const gameId = (data.gameId || 'mg-08').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('PUEBI', gameId, data.serverCode);
    const reqLevel = data.level === 'smp' ? 'smp' : 'sd';

    if (!puebiRooms[roomKey]) {
      puebiRooms[roomKey] = {
        roomKey,
        gameId,
        level: reqLevel,
        state: 'LOBBY', // LOBBY | RUNNING
        roundStartTime: Date.now(),
        currentWordObj: null,
        wordTimeout: null,
        players: {}
      };
    }

    const pRoom = puebiRooms[roomKey];
    currentPuebiRoom = roomKey;
    socket.join(roomKey);

    const player = {
      id: socket.id,
      name: (data.name || 'Siswa').slice(0, 18),
      role: data.role || 'student',
      color: data.color || '#38bdf8',
      hat: data.hat || 'none',
      x: parseFloat(((Math.random() - 0.5) * 14).toFixed(2)),
      y: 0,
      z: 4,
      rotY: Math.PI,
      isMoving: false,
      isJumping: false,
      progress: 0,
      finished: false,
      finishTime: null
    };
    pRoom.players[socket.id] = player;

    if (callback) {
      callback({
        success: true,
        player,
        level: pRoom.level,
        state: pRoom.state,
        currentWordObj: pRoom.currentWordObj,
        players: Object.values(pRoom.players)
      });
    }

    socket.to(roomKey).emit('puebi_player_joined', player);
    io.to(roomKey).emit('puebi_players_updated', Object.values(pRoom.players));
  });

  socket.on('puebi_start', (data) => {
    if (!currentPuebiRoom || !puebiRooms[currentPuebiRoom]) return;
    const pRoom = puebiRooms[currentPuebiRoom];
    if (pRoom.wordTimeout) clearTimeout(pRoom.wordTimeout);

    pRoom.level = (data && data.level === 'smp') ? 'smp' : (data && data.level === 'sd' ? 'sd' : pRoom.level);
    pRoom.state = 'RUNNING';
    pRoom.roundStartTime = Date.now();
    pRoom.currentWordObj = null;

    Object.values(pRoom.players).forEach(p => {
      p.x = parseFloat(((Math.random() - 0.5) * 14).toFixed(2));
      p.y = 0;
      p.z = 4;
      p.progress = 0;
      p.finished = false;
      p.finishTime = null;
    });

    io.to(currentPuebiRoom).emit('puebi_round_started', {
      level: pRoom.level,
      players: Object.values(pRoom.players)
    });

    scheduleNextPuebiWord(pRoom);
  });

  socket.on('puebi_move', (m) => {
    if (!currentPuebiRoom || !puebiRooms[currentPuebiRoom]) return;
    const p = puebiRooms[currentPuebiRoom].players[socket.id];
    if (!p) return;
    p.x = m.x;
    p.y = m.y;
    p.z = m.z;
    p.rotY = m.rotY;
    p.isMoving = m.isMoving;
    p.isJumping = m.isJumping;
    p.progress = m.progress || 0;

    socket.to(currentPuebiRoom).emit('puebi_player_moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isMoving: p.isMoving,
      isJumping: p.isJumping,
      progress: p.progress
    });
  });

  socket.on('puebi_finish', () => {
    if (!currentPuebiRoom || !puebiRooms[currentPuebiRoom]) return;
    const pRoom = puebiRooms[currentPuebiRoom];
    const p = pRoom.players[socket.id];
    if (!p || p.finished) return;

    p.finished = true;
    p.progress = 100;
    p.finishTime = parseFloat(((Date.now() - pRoom.roundStartTime) / 1000).toFixed(2));

    const standings = Object.values(pRoom.players).sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });

    io.to(currentPuebiRoom).emit('puebi_standings_updated', { finisher: p, standings });
  });

  socket.on('puebi_emote', (emoji) => {
    if (!currentPuebiRoom || !puebiRooms[currentPuebiRoom]) return;
    io.to(currentPuebiRoom).emit('puebi_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // H. MINI GAME #09: PABRIK DAUR ULANG KILAT (STASIUN EKOLOGI — SD & SMP)
  // =========================================================================
  socket.on('join_recycle', (data, callback) => {
    const gameId = (data.gameId || 'mg-09').toLowerCase().trim();
    const roomKey = buildScopedRoomKey('RECYCLE', gameId, data.serverCode);

    if (!recycleRooms[roomKey]) {
      recycleRooms[roomKey] = {
        roomKey,
        gameId,
        mode: 'teams', // 'teams' (Merah vs Biru, 150s) | 'coop' (Co-op 1 Kelas, 120s)
        level: 'sd',   // 'sd' | 'smp'
        state: 'LOBBY', // LOBBY | RUNNING | FINISHED
        timer: 150,
        scores: { red: 0, blue: 0, coop: 0 },
        capacity: 0, // 0..100% (untuk mode Co-op)
        items: {},   // { [itemId]: { id, name, category, shape, color, edu, x, z, carriedBy } }
        nextItemSeq: 1,
        tickInterval: null,
        spawnInterval: null,
        players: {}
      };
    }

    const rRoom = recycleRooms[roomKey];
    currentRecycleRoom = roomKey;
    socket.join(roomKey);

    // Bagi tim seimbang (Merah / Biru)
    const redCount = Object.values(rRoom.players).filter(p => p.team === 'red').length;
    const blueCount = Object.values(rRoom.players).filter(p => p.team === 'blue').length;
    const assignedTeam = redCount <= blueCount ? 'red' : 'blue';

    const player = {
      id: socket.id,
      name: (data.name || 'Siswa').slice(0, 18),
      role: data.role || 'student',
      team: assignedTeam,
      color: data.color || (assignedTeam === 'red' ? '#ef4444' : '#3b82f6'),
      hat: data.hat || 'none',
      x: parseFloat(((Math.random() - 0.5) * 10).toFixed(2)),
      y: 0,
      z: parseFloat((8 + Math.random() * 4).toFixed(2)),
      rotY: Math.PI,
      isMoving: false,
      isJumping: false,
      carryingItemId: null,
      score: 0
    };
    rRoom.players[socket.id] = player;

    if (callback) {
      callback({
        success: true,
        player,
        mode: rRoom.mode,
        level: rRoom.level,
        state: rRoom.state,
        timer: rRoom.timer,
        scores: rRoom.scores,
        capacity: rRoom.capacity,
        items: Object.values(rRoom.items),
        players: Object.values(rRoom.players)
      });
    }

    socket.to(roomKey).emit('recycle_player_joined', player);
    io.to(roomKey).emit('recycle_players_updated', Object.values(rRoom.players));
  });

  socket.on('recycle_start', (data) => {
    if (!currentRecycleRoom || !recycleRooms[currentRecycleRoom]) return;
    const rRoom = recycleRooms[currentRecycleRoom];
    if (rRoom.tickInterval) clearInterval(rRoom.tickInterval);
    if (rRoom.spawnInterval) clearInterval(rRoom.spawnInterval);

    rRoom.mode = (data && data.mode === 'coop') ? 'coop' : 'teams';
    rRoom.level = (data && data.level === 'smp') ? 'smp' : 'sd';
    rRoom.state = 'RUNNING';
    rRoom.timer = rRoom.mode === 'teams' ? 150 : 120; // 2.5 menit Tim vs Tim | 2 menit Co-op
    rRoom.scores = { red: 0, blue: 0, coop: 0 };
    rRoom.capacity = 0;
    rRoom.items = {};

    Object.values(rRoom.players).forEach(p => {
      p.carryingItemId = null;
      p.score = 0;
    });

    // Spawn 6 sampah awal di sekitar zona konveyor tengah
    for (let i = 0; i < 6; i++) spawnRecycleItem(rRoom);

    io.to(currentRecycleRoom).emit('recycle_started', {
      mode: rRoom.mode,
      level: rRoom.level,
      timer: rRoom.timer,
      scores: rRoom.scores,
      capacity: rRoom.capacity,
      items: Object.values(rRoom.items),
      players: Object.values(rRoom.players)
    });

    startRecycleLoops(rRoom);
  });

  socket.on('recycle_move', (m) => {
    if (!currentRecycleRoom || !recycleRooms[currentRecycleRoom]) return;
    const p = recycleRooms[currentRecycleRoom].players[socket.id];
    if (!p) return;
    p.x = m.x;
    p.y = m.y;
    p.z = m.z;
    p.rotY = m.rotY;
    p.isMoving = m.isMoving;
    p.isJumping = m.isJumping;

    socket.to(currentRecycleRoom).emit('recycle_player_moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isMoving: p.isMoving,
      isJumping: p.isJumping,
      carryingItemId: p.carryingItemId
    });
  });

  socket.on('recycle_pickup', (itemId, callback) => {
    if (!currentRecycleRoom || !recycleRooms[currentRecycleRoom]) return;
    const rRoom = recycleRooms[currentRecycleRoom];
    const p = rRoom.players[socket.id];
    const item = rRoom.items[itemId];
    if (!p || !item || p.carryingItemId || item.carriedBy) {
      if (callback) callback({ success: false });
      return;
    }

    p.carryingItemId = item.id;
    item.carriedBy = socket.id;

    io.to(currentRecycleRoom).emit('recycle_item_picked', {
      itemId: item.id,
      playerId: socket.id
    });
    if (callback) callback({ success: true, item });
  });

  socket.on('recycle_deposit', (machineCategory, callback) => {
    if (!currentRecycleRoom || !recycleRooms[currentRecycleRoom]) return;
    const rRoom = recycleRooms[currentRecycleRoom];
    const p = rRoom.players[socket.id];
    if (!p || !p.carryingItemId) return;
    const item = rRoom.items[p.carryingItemId];
    if (!item) {
      p.carryingItemId = null;
      return;
    }

    const isCorrect = (item.category === machineCategory);
    if (isCorrect) {
      p.score += 10;
      if (rRoom.mode === 'teams') {
        rRoom.scores[p.team] += 10;
      } else {
        rRoom.scores.coop += 10;
      }
      delete rRoom.items[item.id];
      p.carryingItemId = null;
      updateRecycleCapacity(rRoom);

      io.to(currentRecycleRoom).emit('recycle_deposit_result', {
        success: true,
        playerId: socket.id,
        itemId: item.id,
        itemName: item.name,
        machineCategory,
        scores: rRoom.scores,
        capacity: rRoom.capacity,
        players: Object.values(rRoom.players)
      });
    } else {
      // Salah mesin -> poin berkurang sedikit, sampah terlempar kembali ke lantai, kirim edukasi!
      p.score = Math.max(0, p.score - 3);
      if (rRoom.mode === 'teams') {
        rRoom.scores[p.team] = Math.max(0, rRoom.scores[p.team] - 3);
      } else {
        rRoom.scores.coop = Math.max(0, rRoom.scores.coop - 3);
      }
      item.carriedBy = null;
      item.x = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
      item.z = parseFloat(((Math.random() - 0.5) * 8).toFixed(2));
      p.carryingItemId = null;

      io.to(currentRecycleRoom).emit('recycle_deposit_result', {
        success: false,
        playerId: socket.id,
        itemId: item.id,
        itemName: item.name,
        itemX: item.x,
        itemZ: item.z,
        machineCategory,
        edu: item.edu,
        scores: rRoom.scores,
        capacity: rRoom.capacity,
        players: Object.values(rRoom.players)
      });
    }
    if (callback) callback({ success: isCorrect, edu: item.edu });
  });

  socket.on('recycle_emote', (emoji) => {
    if (!currentRecycleRoom || !recycleRooms[currentRecycleRoom]) return;
    io.to(currentRecycleRoom).emit('recycle_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // H. MINI GAME #10: DAPUR KALIMAT — KAFE BAHASA INGGRIS (MG-12, SD & SMP)
  // =========================================================================
  const CAFE_TEAM_KEYS = ['red', 'blue', 'green', 'yellow'];
  const CAFE_TEAM_META = {
    red:    { name: 'Tim Merah',  color: '#ef4444', spawn: { x: 0,   z: -12 } },
    blue:   { name: 'Tim Biru',   color: '#3b82f6', spawn: { x: 12,  z: 0   } },
    green:  { name: 'Tim Hijau',  color: '#10b981', spawn: { x: 0,   z: 12  } },
    yellow: { name: 'Tim Kuning', color: '#eab308', spawn: { x: -12, z: 0   } }
  };

  function shuffleCafeArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function createCafeTeamState(teamKey, level) {
    const queue = shuffleCafeArray(CAFE_QUESTIONS[level] || CAFE_QUESTIONS.sd);
    const first = queue[0];
    return {
      key: teamKey,
      name: CAFE_TEAM_META[teamKey].name,
      color: CAFE_TEAM_META[teamKey].color,
      score: 0,
      servedCount: 0,
      queue,
      orderIndex: 0,
      order: first,
      slots: new Array(first.words.length).fill(null),
      slotFeedback: new Array(first.words.length).fill('neutral'),
      orderStartTime: Date.now()
    };
  }

  function rebuildCafeWordBlocks(cRoom) {
    // Kumpulkan seluruh kata + pengecoh dari pesanan aktif tiap tim yang ada pemainnya (atau semua 4 tim)
    const wordSet = new Set();
    const activeTeams = CAFE_TEAM_KEYS.filter(tk =>
      Object.values(cRoom.players).some(p => p.team === tk)
    );
    const sourceTeams = activeTeams.length > 0 ? activeTeams : ['red'];
    sourceTeams.forEach(tk => {
      const ord = cRoom.teams[tk].order;
      if (!ord) return;
      ord.words.forEach(w => wordSet.add(w));
      ord.distractors.forEach(d => wordSet.add(d));
    });

    const wordsArr = shuffleCafeArray(Array.from(wordSet));
    const cols = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(wordsArr.length))));
    const rows = Math.ceil(wordsArr.length / cols);
    const spacingX = 2.65;
    const spacingZ = 2.55;

    cRoom.wordBlocks = wordsArr.map((word, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = parseFloat(((col - (cols - 1) / 2) * spacingX).toFixed(2));
      const z = parseFloat(((row - (rows - 1) / 2) * spacingZ).toFixed(2));
      return {
        id: `wb-${idx}-${word.replace(/\s+/g, '_')}`,
        word,
        x,
        z,
        available: true
      };
    });
  }

  function serializeCafeTeams(cRoom) {
    const out = {};
    CAFE_TEAM_KEYS.forEach(tk => {
      const t = cRoom.teams[tk];
      out[tk] = {
        key: t.key,
        name: t.name,
        color: t.color,
        score: t.score,
        servedCount: t.servedCount,
        orderNumber: t.orderIndex + 1,
        order: {
          id: t.order.id,
          indo: t.order.indo,
          slotCount: t.order.words.length,
          words: t.order.words,
          distractors: t.order.distractors,
          grammar: t.order.grammar
        },
        slots: t.slots,
        slotFeedback: t.slotFeedback
      };
    });
    return out;
  }

  function evaluateCafeOrder(cRoom, teamKey, actorName, actorSocketId) {
    const t = cRoom.teams[teamKey];
    if (!t || !t.order) return;

    const target = t.order.words;
    let allCorrect = true;
    const feedback = target.map((expected, idx) => {
      const placed = t.slots[idx];
      if (placed && placed.word === expected) {
        return 'correct';
      }
      allCorrect = false;
      return 'wrong';
    });

    if (allCorrect) {
      const elapsedSec = (Date.now() - t.orderStartTime) / 1000;
      const speedBonus = Math.max(5, Math.min(25, Math.round(28 - elapsedSec * 0.45)));
      const earned = 50 + speedBonus;
      t.score += earned;
      t.servedCount += 1;

      if (actorSocketId && cRoom.players[actorSocketId]) {
        cRoom.players[actorSocketId].score += earned;
      }

      const completedSentence = target.join(' ');
      const grammar = t.order.grammar;

      // Pesanan berikutnya untuk tim ini
      t.orderIndex = (t.orderIndex + 1) % t.queue.length;
      if (t.orderIndex === 0) {
        t.queue = shuffleCafeArray(CAFE_QUESTIONS[cRoom.level] || CAFE_QUESTIONS.sd);
      }
      t.order = t.queue[t.orderIndex];
      t.slots = new Array(t.order.words.length).fill(null);
      t.slotFeedback = new Array(t.order.words.length).fill('neutral');
      t.orderStartTime = Date.now();

      rebuildCafeWordBlocks(cRoom);

      io.to(cRoom.roomKey).emit('cafe_order_served', {
        team: teamKey,
        teamName: t.name,
        actorName: actorName || t.name,
        sentence: completedSentence,
        grammar,
        earned,
        speedBonus,
        teams: serializeCafeTeams(cRoom),
        wordBlocks: cRoom.wordBlocks,
        players: Object.values(cRoom.players)
      });
    } else {
      t.slotFeedback = feedback;
      io.to(cRoom.roomKey).emit('cafe_order_check_fail', {
        team: teamKey,
        teamName: t.name,
        slotFeedback: feedback,
        teams: serializeCafeTeams(cRoom)
      });
    }
  }

  function getOrCreateCafeRoom(gameId, serverCode) {
    const roomKey = buildScopedRoomKey('CAFE', gameId || 'mg-10', serverCode);
    if (!cafeRooms[roomKey]) {
      const teams = {};
      CAFE_TEAM_KEYS.forEach(tk => {
        teams[tk] = createCafeTeamState(tk, 'sd');
      });
      cafeRooms[roomKey] = {
        roomKey,
        gameId: gameId || 'mg-10',
        level: 'sd',
        state: 'LOBBY', // LOBBY | PLAYING | FINISHED
        timeLeft: 180,
        tickInterval: null,
        teams,
        wordBlocks: [],
        players: {}
      };
      rebuildCafeWordBlocks(cafeRooms[roomKey]);
    }
    return cafeRooms[roomKey];
  }

  function shuffleCafePlayersIntoTeams(cRoom) {
    const pids = shuffleCafeArray(Object.keys(cRoom.players));
    const shuffledTeamOrder = shuffleCafeArray(CAFE_TEAM_KEYS);
    pids.forEach((pid, idx) => {
      const tk = shuffledTeamOrder[idx % shuffledTeamOrder.length];
      const p = cRoom.players[pid];
      p.team = tk;
      p.carrying = null;
      const sp = CAFE_TEAM_META[tk].spawn;
      p.x = parseFloat((sp.x + (Math.random() - 0.5) * 2).toFixed(2));
      p.z = parseFloat((sp.z + (Math.random() - 0.5) * 2).toFixed(2));
    });
  }

  function startCafeMatch(cRoom, level = 'sd') {
    if (cRoom.tickInterval) clearInterval(cRoom.tickInterval);
    cRoom.level = (level === 'smp') ? 'smp' : 'sd';
    cRoom.state = 'PLAYING';
    cRoom.timeLeft = 180; // 3 menit

    // Acak tim seluruh pemain secara merata sebelum ronde dimulai!
    shuffleCafePlayersIntoTeams(cRoom);

    CAFE_TEAM_KEYS.forEach(tk => {
      cRoom.teams[tk] = createCafeTeamState(tk, cRoom.level);
    });

    Object.values(cRoom.players).forEach(p => {
      p.score = 0;
      p.carrying = null;
    });

    rebuildCafeWordBlocks(cRoom);

    io.to(cRoom.roomKey).emit('cafe_match_started', {
      level: cRoom.level,
      timeLeft: cRoom.timeLeft,
      teams: serializeCafeTeams(cRoom),
      wordBlocks: cRoom.wordBlocks,
      players: Object.values(cRoom.players)
    });

    cRoom.tickInterval = setInterval(() => {
      if (!cafeRooms[cRoom.roomKey] || cRoom.state !== 'PLAYING') {
        clearInterval(cRoom.tickInterval);
        return;
      }
      cRoom.timeLeft--;
      io.to(cRoom.roomKey).emit('cafe_timer_tick', { timeLeft: cRoom.timeLeft });

      if (cRoom.timeLeft <= 0) {
        clearInterval(cRoom.tickInterval);
        cRoom.state = 'FINISHED';
        const ranking = CAFE_TEAM_KEYS
          .map(tk => ({
            key: tk,
            name: cRoom.teams[tk].name,
            color: cRoom.teams[tk].color,
            score: cRoom.teams[tk].score,
            servedCount: cRoom.teams[tk].servedCount
          }))
          .sort((a, b) => b.score - a.score);

        io.to(cRoom.roomKey).emit('cafe_match_finished', {
          ranking,
          players: Object.values(cRoom.players).sort((a, b) => b.score - a.score)
        });
      }
    }, 1000);
  }

  socket.on('join_cafe', (data, callback) => {
    const gameId = (data && data.gameId) || 'mg-12';
    const cRoom = getOrCreateCafeRoom(gameId, data && data.serverCode);
    currentCafeRoom = cRoom.roomKey;
    socket.join(cRoom.roomKey);

    // Bagi pemain secara ACAK & merata ke 4 tim (Merah, Biru, Hijau, Kuning)
    const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
    Object.values(cRoom.players).forEach(pl => {
      if (counts[pl.team] !== undefined) counts[pl.team]++;
    });
    const minCount = Math.min(...CAFE_TEAM_KEYS.map(tk => counts[tk]));
    const candidateTeams = CAFE_TEAM_KEYS.filter(tk => counts[tk] === minCount);
    const assignedTeam = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];

    const sp = CAFE_TEAM_META[assignedTeam].spawn;
    const player = {
      id: socket.id,
      name: (data.name || 'Koki Siswa').slice(0, 18),
      color: data.color || CAFE_TEAM_META[assignedTeam].color,
      hat: data.hat || 'none',
      team: assignedTeam,
      x: parseFloat((sp.x + (Math.random() - 0.5) * 2).toFixed(2)),
      y: 0,
      z: parseFloat((sp.z + (Math.random() - 0.5) * 2).toFixed(2)),
      rotY: 0,
      carrying: null,
      score: 0
    };
    cRoom.players[socket.id] = player;

    // Pastikan blok kata di dapur tengah selalu mencakup pesanan tim pemain ini
    rebuildCafeWordBlocks(cRoom);

    socket.to(cRoom.roomKey).emit('cafe_player_joined', player);
    io.to(cRoom.roomKey).emit('cafe_players_updated', Object.values(cRoom.players));
    io.to(cRoom.roomKey).emit('cafe_blocks_updated', cRoom.wordBlocks);

    if (callback) {
      callback({
        success: true,
        player,
        level: cRoom.level,
        state: cRoom.state,
        timeLeft: cRoom.timeLeft,
        teams: serializeCafeTeams(cRoom),
        wordBlocks: cRoom.wordBlocks,
        players: Object.values(cRoom.players)
      });
    }
  });

  socket.on('cafe_start_match', (data) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    startCafeMatch(cafeRooms[currentCafeRoom], data && data.level);
  });

  socket.on('cafe_shuffle_teams', () => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    shuffleCafePlayersIntoTeams(cRoom);
    rebuildCafeWordBlocks(cRoom);
    io.to(cRoom.roomKey).emit('cafe_teams_shuffled', {
      players: Object.values(cRoom.players),
      teams: serializeCafeTeams(cRoom),
      wordBlocks: cRoom.wordBlocks
    });
  });

  socket.on('cafe_move', (d) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    const p = cRoom.players[socket.id];
    if (!p) return;
    p.x = d.x;
    p.y = d.y;
    p.z = d.z;
    p.rotY = d.rotY;
    socket.to(cRoom.roomKey).emit('cafe_player_moved', {
      id: socket.id,
      x: d.x,
      y: d.y,
      z: d.z,
      rotY: d.rotY,
      isMoving: d.isMoving,
      isJumping: d.isJumping,
      carrying: p.carrying
    });
  });

  socket.on('cafe_pickup_word', (blockId, callback) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    const p = cRoom.players[socket.id];
    if (!p || p.carrying) return;
    const block = cRoom.wordBlocks.find(b => b.id === blockId && b.available);
    if (!block) return;

    p.carrying = block.word;
    block.available = false;

    io.to(cRoom.roomKey).emit('cafe_word_picked', {
      playerId: socket.id,
      blockId: block.id,
      word: block.word
    });

    // Respawn bahan kata setelah 1.4 detik agar semua tim tidak kehabisan bahan
    const roomRef = cRoom.roomKey;
    const bid = block.id;
    setTimeout(() => {
      if (!cafeRooms[roomRef]) return;
      const b = cafeRooms[roomRef].wordBlocks.find(x => x.id === bid);
      if (b) {
        b.available = true;
        io.to(roomRef).emit('cafe_word_respawned', { blockId: bid });
      }
    }, 1400);

    if (callback) callback({ success: true, word: block.word });
  });

  socket.on('cafe_drop_word', () => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    const p = cRoom.players[socket.id];
    if (!p || !p.carrying) return;
    p.carrying = null;
    io.to(cRoom.roomKey).emit('cafe_word_dropped', { playerId: socket.id });
  });

  socket.on('cafe_place_slot', (slotIndex, callback) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    const p = cRoom.players[socket.id];
    if (!p || !p.carrying) return;
    const t = cRoom.teams[p.team];
    if (!t || slotIndex < 0 || slotIndex >= t.slots.length) return;

    const prevSlot = t.slots[slotIndex];
    const placedWord = p.carrying;
    t.slots[slotIndex] = { word: placedWord, placedBy: p.name };
    t.slotFeedback[slotIndex] = 'neutral';

    // Tukar jika slot sebelumnya sudah terisi!
    p.carrying = prevSlot ? prevSlot.word : null;

    io.to(cRoom.roomKey).emit('cafe_slot_updated', {
      team: p.team,
      slotIndex,
      playerId: socket.id,
      carrying: p.carrying,
      teams: serializeCafeTeams(cRoom)
    });

    if (callback) callback({ success: true, carrying: p.carrying });

    // Jika semua slot di meja tim sudah terisi -> otomatis cek & sajikan!
    if (t.slots.every(s => s !== null)) {
      evaluateCafeOrder(cRoom, p.team, p.name, socket.id);
    }
  });

  socket.on('cafe_serve', () => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    const p = cRoom.players[socket.id];
    if (!p) return;
    evaluateCafeOrder(cRoom, p.team, p.name, socket.id);
  });

  // Helper khusus mode latihan solo (1 pemain asli): bot rekan/lawan ikut mengisi slot nyata di server
  socket.on('cafe_bot_place_slot', (data) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    const cRoom = cafeRooms[currentCafeRoom];
    if (cRoom.state !== 'PLAYING') return;
    if (Object.keys(cRoom.players).length > 1) return; // Hanya aktif saat solo testing
    const { teamKey, slotIndex, word, botName } = data || {};
    const t = cRoom.teams[teamKey];
    if (!t || slotIndex < 0 || slotIndex >= t.slots.length || !word) return;

    t.slots[slotIndex] = { word, placedBy: botName || 'Bot Koki' };
    t.slotFeedback[slotIndex] = 'neutral';
    io.to(cRoom.roomKey).emit('cafe_slot_updated', {
      team: teamKey,
      slotIndex,
      playerId: null,
      carrying: null,
      teams: serializeCafeTeams(cRoom)
    });

    if (t.slots.every(s => s !== null)) {
      evaluateCafeOrder(cRoom, teamKey, botName || 'Bot Koki', null);
    }
  });

  socket.on('cafe_emote', (emoji) => {
    if (!currentCafeRoom || !cafeRooms[currentCafeRoom]) return;
    io.to(currentCafeRoom).emit('cafe_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // =========================================================================
  // I. MINI GAME #11: LABIRIN GERBANG MATEMATIKA (MG-11, SD & SMP, 3 TIPE GERBANG)
  // =========================================================================
  function getOrCreateMazeRoom(gameId, serverCode) {
    const roomKey = buildScopedRoomKey('MAZE', gameId || 'mg-11', serverCode);
    if (!mazeRooms[roomKey]) {
      mazeRooms[roomKey] = {
        roomKey,
        gameId: gameId || 'mg-11',
        level: 'sd',
        state: 'LOBBY', // LOBBY | PLAYING | FINISHED
        startTime: Date.now(),
        gates: generateMazeGates('sd'),
        players: {},
        finishOrder: []
      };
    }
    return mazeRooms[roomKey];
  }

  function serializeMazeGates(mRoom) {
    const now = Date.now();
    return mRoom.gates.map(g => {
      const holdActive = g.heldPlateIdx !== null && g.heldUntil > now;
      return {
        index: g.index,
        type: g.type,
        op: g.op,
        target: g.target,
        answer: g.answer,
        sequence: g.sequence,
        prompt: g.prompt,
        hint: g.hint,
        plates: g.plates,
        open: g.open,
        openedBy: g.openedBy,
        heldPlateIdx: holdActive ? g.heldPlateIdx : null,
        heldValue: holdActive ? g.heldValue : null,
        heldByName: holdActive ? g.heldByName : null,
        heldRemainingMs: holdActive ? Math.max(0, g.heldUntil - now) : 0,
        seqProgress: g.seqProgress
      };
    });
  }

  socket.on('join_maze', (data, callback) => {
    const gameId = (data && data.gameId) || 'mg-11';
    const mRoom = getOrCreateMazeRoom(gameId, data && data.serverCode);
    currentMazeRoom = mRoom.roomKey;
    socket.join(mRoom.roomKey);

    const player = {
      id: socket.id,
      name: (data.name || 'Penjelajah').slice(0, 18),
      color: data.color || '#38bdf8',
      hat: data.hat || 'none',
      x: parseFloat(((Math.random() - 0.5) * 8).toFixed(2)),
      y: 0,
      z: parseFloat((8 + (Math.random() - 0.5) * 3).toFixed(2)),
      rotY: Math.PI,
      score: 0,
      gatesHelped: 0,
      finished: false,
      finishRank: null,
      finishSec: null
    };
    mRoom.players[socket.id] = player;

    socket.to(mRoom.roomKey).emit('maze_player_joined', player);
    io.to(mRoom.roomKey).emit('maze_players_updated', Object.values(mRoom.players));

    if (callback) {
      callback({
        success: true,
        player,
        level: mRoom.level,
        state: mRoom.state,
        startTime: mRoom.startTime,
        gates: serializeMazeGates(mRoom),
        players: Object.values(mRoom.players)
      });
    }
  });

  socket.on('maze_start', (data) => {
    if (!currentMazeRoom || !mazeRooms[currentMazeRoom]) return;
    const mRoom = mazeRooms[currentMazeRoom];
    mRoom.level = (data && data.level === 'smp') ? 'smp' : 'sd';
    mRoom.state = 'PLAYING';
    mRoom.startTime = Date.now();
    mRoom.gates = generateMazeGates(mRoom.level);
    mRoom.finishOrder = [];

    Object.values(mRoom.players).forEach(p => {
      p.score = 0;
      p.gatesHelped = 0;
      p.finished = false;
      p.finishRank = null;
      p.finishSec = null;
      p.x = parseFloat(((Math.random() - 0.5) * 8).toFixed(2));
      p.y = 0;
      p.z = parseFloat((8 + (Math.random() - 0.5) * 3).toFixed(2));
    });

    io.to(mRoom.roomKey).emit('maze_started', {
      level: mRoom.level,
      startTime: mRoom.startTime,
      gates: serializeMazeGates(mRoom),
      players: Object.values(mRoom.players)
    });
  });

  socket.on('maze_move', (d) => {
    if (!currentMazeRoom || !mazeRooms[currentMazeRoom]) return;
    const mRoom = mazeRooms[currentMazeRoom];
    const p = mRoom.players[socket.id];
    if (!p) return;
    p.x = d.x;
    p.y = d.y;
    p.z = d.z;
    p.rotY = d.rotY;
    socket.to(mRoom.roomKey).emit('maze_player_moved', {
      id: socket.id,
      x: d.x,
      y: d.y,
      z: d.z,
      rotY: d.rotY,
      isMoving: d.isMoving,
      isJumping: d.isJumping
    });
  });

  socket.on('maze_step_plate', ({ gateIndex, plateIndex }) => {
    if (!currentMazeRoom || !mazeRooms[currentMazeRoom]) return;
    const mRoom = mazeRooms[currentMazeRoom];
    if (mRoom.state !== 'PLAYING') return;
    const p = mRoom.players[socket.id];
    const g = mRoom.gates[gateIndex];
    if (!p || !g || g.open) return;
    if (plateIndex < 0 || plateIndex >= g.plates.length) return;

    const val = g.plates[plateIndex];
    const now = Date.now();

    // TIPE A: GERBANG KOLABORASI (2 Saklar Bersamaan / Hold 6.5 Detik)
    if (g.type === 'coop') {
      const holdValid = g.heldPlateIdx !== null && g.heldUntil > now;
      if (!holdValid) {
        g.heldPlateIdx = plateIndex;
        g.heldValue = val;
        g.heldById = socket.id;
        g.heldByName = p.name;
        g.heldUntil = now + 6500;
        io.to(mRoom.roomKey).emit('maze_gate_updated', {
          gateIndex,
          gates: serializeMazeGates(mRoom)
        });
        return;
      }

      if (g.heldPlateIdx === plateIndex) {
        // Perpanjang hold jika masih menginjak saklar yang sama
        g.heldUntil = now + 6500;
        return;
      }

      // Saklar ke-2 diinjak! Evaluasi persamaan!
      const v1 = g.heldValue;
      const v2 = val;
      const calc = g.op === '+' ? (v1 + v2) : (v1 * v2);
      if (calc === g.target) {
        g.open = true;
        const heroes = [];
        if (g.heldById && mRoom.players[g.heldById]) {
          mRoom.players[g.heldById].score += 40;
          mRoom.players[g.heldById].gatesHelped += 1;
          heroes.push(mRoom.players[g.heldById].name);
        }
        if (g.heldById !== socket.id) {
          p.score += 40;
          p.gatesHelped += 1;
          heroes.push(p.name);
        }
        g.openedBy = heroes;
        g.heldPlateIdx = null;
        io.to(mRoom.roomKey).emit('maze_gate_unlocked', {
          gateIndex,
          equationText: `[ ${v1} ] ${g.op} [ ${v2} ] = ${g.target} ✓`,
          heroes,
          hint: g.hint,
          gates: serializeMazeGates(mRoom),
          players: Object.values(mRoom.players)
        });
      } else {
        g.heldPlateIdx = null;
        g.heldValue = null;
        g.heldUntil = 0;
        io.to(mRoom.roomKey).emit('maze_gate_wrong', {
          gateIndex,
          wrongText: `[ ${v1} ] ${g.op} [ ${v2} ] = ${calc} ✕`,
          gates: serializeMazeGates(mRoom)
        });
      }
      return;
    }

    // TIPE B: GERBANG SYARAT BILANGAN (1 Saklar)
    if (g.type === 'single') {
      if (val === g.answer) {
        g.open = true;
        p.score += 35;
        p.gatesHelped += 1;
        g.openedBy = [p.name];
        io.to(mRoom.roomKey).emit('maze_gate_unlocked', {
          gateIndex,
          equationText: `BENAR: ${val} ✓`,
          heroes: [p.name],
          hint: g.hint,
          gates: serializeMazeGates(mRoom),
          players: Object.values(mRoom.players)
        });
      } else {
        io.to(mRoom.roomKey).emit('maze_gate_wrong', {
          gateIndex,
          wrongText: `${val} BELUM TEPAT ✕`,
          gates: serializeMazeGates(mRoom)
        });
      }
      return;
    }

    // TIPE C: GERBANG KOMBINASI BERANTAI (3 Saklar Berurutan)
    if (g.type === 'sequence') {
      const stepIdx = g.seqProgress.length;
      const expected = g.sequence[stepIdx];
      // Abaikan jika menginjak ulang angka yang barusan berhasil diinjak
      if (stepIdx > 0 && g.seqProgress[stepIdx - 1] === val) return;

      if (val === expected) {
        g.seqProgress.push(val);
        if (!g.seqContributors.includes(socket.id)) g.seqContributors.push(socket.id);

        if (g.seqProgress.length >= g.sequence.length) {
          g.open = true;
          const heroes = [];
          g.seqContributors.forEach(cid => {
            if (mRoom.players[cid]) {
              mRoom.players[cid].score += 40;
              mRoom.players[cid].gatesHelped += 1;
              heroes.push(mRoom.players[cid].name);
            }
          });
          g.openedBy = heroes;
          io.to(mRoom.roomKey).emit('maze_gate_unlocked', {
            gateIndex,
            equationText: `${g.sequence.join(' → ')} ✓`,
            heroes,
            hint: g.hint,
            gates: serializeMazeGates(mRoom),
            players: Object.values(mRoom.players)
          });
        } else {
          io.to(mRoom.roomKey).emit('maze_gate_updated', {
            gateIndex,
            gates: serializeMazeGates(mRoom)
          });
        }
      } else {
        g.seqProgress = [];
        g.seqContributors = [];
        io.to(mRoom.roomKey).emit('maze_gate_wrong', {
          gateIndex,
          wrongText: `Urutan salah (${val})! Ulang dari awal ✕`,
          gates: serializeMazeGates(mRoom)
        });
      }
    }
  });

  socket.on('maze_reach_finish', () => {
    if (!currentMazeRoom || !mazeRooms[currentMazeRoom]) return;
    const mRoom = mazeRooms[currentMazeRoom];
    if (mRoom.state !== 'PLAYING') return;
    const p = mRoom.players[socket.id];
    if (!p || p.finished) return;

    p.finished = true;
    mRoom.finishOrder.push(socket.id);
    p.finishRank = mRoom.finishOrder.length;
    p.finishSec = parseFloat(((Date.now() - mRoom.startTime) / 1000).toFixed(1));

    const finishBonus = p.finishRank === 1 ? 120 : (p.finishRank === 2 ? 90 : (p.finishRank === 3 ? 70 : 50));
    p.score += finishBonus;

    const sorted = Object.values(mRoom.players).sort((a, b) => b.score - a.score);
    io.to(mRoom.roomKey).emit('maze_player_finished', {
      playerId: socket.id,
      playerName: p.name,
      finishRank: p.finishRank,
      finishSec: p.finishSec,
      finishBonus,
      players: sorted
    });
  });

  socket.on('maze_emote', (emoji) => {
    if (!currentMazeRoom || !mazeRooms[currentMazeRoom]) return;
    io.to(currentMazeRoom).emit('maze_player_emote', {
      id: socket.id,
      emote: String(emoji).slice(0, 4)
    });
  });

  // 11. Disconnect cleanup
  socket.on('disconnect', () => {
    // Cleanup Maze Room
    if (currentMazeRoom && mazeRooms[currentMazeRoom]) {
      const mRoom = mazeRooms[currentMazeRoom];
      if (mRoom.players[socket.id]) {
        delete mRoom.players[socket.id];
        io.to(currentMazeRoom).emit('maze_player_left', socket.id);
        io.to(currentMazeRoom).emit('maze_players_updated', Object.values(mRoom.players));
      }
      if (Object.keys(mRoom.players).length === 0) {
        delete mazeRooms[currentMazeRoom];
      }
    }

    // Cleanup Cafe Room
    if (currentCafeRoom && cafeRooms[currentCafeRoom]) {
      const cRoom = cafeRooms[currentCafeRoom];
      if (cRoom.players[socket.id]) {
        delete cRoom.players[socket.id];
        io.to(currentCafeRoom).emit('cafe_player_left', socket.id);
        io.to(currentCafeRoom).emit('cafe_players_updated', Object.values(cRoom.players));
      }
      if (Object.keys(cRoom.players).length === 0) {
        if (cRoom.tickInterval) clearInterval(cRoom.tickInterval);
        delete cafeRooms[currentCafeRoom];
      }
    }

    // Cleanup Recycle Room
    if (currentRecycleRoom && recycleRooms[currentRecycleRoom]) {
      const rRoom = recycleRooms[currentRecycleRoom];
      const p = rRoom.players[socket.id];
      if (p) {
        if (p.carryingItemId && rRoom.items[p.carryingItemId]) {
          rRoom.items[p.carryingItemId].carriedBy = null;
        }
        delete rRoom.players[socket.id];
        io.to(currentRecycleRoom).emit('recycle_player_left', socket.id);
        io.to(currentRecycleRoom).emit('recycle_players_updated', Object.values(rRoom.players));
      }
      if (Object.keys(rRoom.players).length === 0) {
        if (rRoom.tickInterval) clearInterval(rRoom.tickInterval);
        if (rRoom.spawnInterval) clearInterval(rRoom.spawnInterval);
        delete recycleRooms[currentRecycleRoom];
      }
    }

    // Cleanup PUEBI Room
    if (currentPuebiRoom && puebiRooms[currentPuebiRoom]) {
      const pRoom = puebiRooms[currentPuebiRoom];
      if (pRoom.players[socket.id]) {
        delete pRoom.players[socket.id];
        io.to(currentPuebiRoom).emit('puebi_player_left', socket.id);
        io.to(currentPuebiRoom).emit('puebi_players_updated', Object.values(pRoom.players));
      }
      if (Object.keys(pRoom.players).length === 0) {
        if (pRoom.wordTimeout) clearTimeout(pRoom.wordTimeout);
        delete puebiRooms[currentPuebiRoom];
      }
    }

    // Cleanup Geo Tower Room
    if (currentGeoRoom && geoRooms[currentGeoRoom]) {
      const gRoom = geoRooms[currentGeoRoom];
      if (gRoom.players[socket.id]) {
        delete gRoom.players[socket.id];
        io.to(currentGeoRoom).emit('geo_player_left', socket.id);
        io.to(currentGeoRoom).emit('geo_players_updated', Object.values(gRoom.players));
      }
      if (Object.keys(gRoom.players).length === 0) {
        delete geoRooms[currentGeoRoom];
      }
    }

    // Cleanup Lava Room
    if (currentLavaRoom && lavaRooms[currentLavaRoom]) {
      const lRoom = lavaRooms[currentLavaRoom];
      if (lRoom.players[socket.id]) {
        delete lRoom.players[socket.id];
        io.to(currentLavaRoom).emit('lava_player_left', socket.id);
        io.to(currentLavaRoom).emit('lava_players_updated', Object.values(lRoom.players));
      }
      if (Object.keys(lRoom.players).length === 0) {
        if (lRoom.interval) clearInterval(lRoom.interval);
        delete lavaRooms[currentLavaRoom];
      }
    }

    // Cleanup Bridge Room
    if (currentBridgeRoom && bridgeRooms[currentBridgeRoom]) {
      const bRoom = bridgeRooms[currentBridgeRoom];
      if (bRoom.players[socket.id]) {
        delete bRoom.players[socket.id];
        io.to(currentBridgeRoom).emit('bridge_player_left', socket.id);
        io.to(currentBridgeRoom).emit('bridge_players_updated', Object.values(bRoom.players));
      }
      if (Object.keys(bRoom.players).length === 0) {
        delete bridgeRooms[currentBridgeRoom];
      }
    }

    // Cleanup Race Room
    if (currentRaceRoom && raceRooms[currentRaceRoom]) {
      const rRoom = raceRooms[currentRaceRoom];
      if (rRoom.players[socket.id]) {
        delete rRoom.players[socket.id];
        io.to(currentRaceRoom).emit('race_player_left', socket.id);
        io.to(currentRaceRoom).emit('race_players_updated', Object.values(rRoom.players));
      }
      if (Object.keys(rRoom.players).length === 0) {
        rRoom.state = 'LOBBY';
      }
    }

    // Cleanup City Lobby (per-server room)
    leaveCurrentCityRoom();

    if (currentRoom && rooms[currentRoom]) {
      const room = rooms[currentRoom];
      if (room.isAutoMiniGame) {
        if (room.players[socket.id]) {
          delete room.players[socket.id];
          io.to(currentRoom).emit('player_left_3d', socket.id);
          io.to(currentRoom).emit('player_list_updated', Object.values(room.players));
        }
        // Jika seluruh pemain sudah keluar, reset room ke LOBBY
        if (Object.keys(room.players).length === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          room.state = 'LOBBY';
          room.currentQIndex = -1;
        }
      } else if (isHost) {
        console.log(`[HOST DISCONNECTED] Room ${currentRoom}`);
        io.to(currentRoom).emit('host_disconnected');
        if (room.timerInterval) clearInterval(room.timerInterval);
        delete rooms[currentRoom];
      } else {
        if (room.players[socket.id]) {
          console.log(`[PLAYER LEFT] ${room.players[socket.id].name} left Room ${currentRoom}`);
          delete room.players[socket.id];
          io.to(currentRoom).emit('player_left_3d', socket.id);
          io.to(currentRoom).emit('player_list_updated', Object.values(room.players));
        }
      }
    }
  });
});

// Question Round Engine
function startQuestionRound(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.state = 'QUESTION';
  const qData = room.questions[room.currentQIndex];
  const timeLimit = qData.timeLimit || 20;
  room.timer = timeLimit;
  room.roundStartTime = Date.now();

  // Reset player answers for this question
  for (const pid in room.players) {
    room.players[pid].currentAnswer = null;
    room.players[pid].answeredAt = null;
    room.players[pid].lastAnswerCorrect = null;
  }

  // Safe question data to broadcast (exclude correctIndex during question time!)
  const publicQuestion = {
    index: room.currentQIndex,
    total: room.questions.length,
    question: qData.question,
    options: qData.options,
    timeLimit: timeLimit,
    points: qData.points || 100,
    category: qData.category || room.subject
  };

  io.to(room.roomCode).emit('question_started', publicQuestion);

  // Countdown timer loop
  room.timerInterval = setInterval(() => {
    room.timer--;
    io.to(room.roomCode).emit('timer_tick', { timer: room.timer });

    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      revealQuestionResult(room);
    }
  }, 1000);
}

// Reveal Answer & Calculate Scores
function revealQuestionResult(room) {
  room.state = 'REVEAL';
  const qData = room.questions[room.currentQIndex];
  const correctIdx = qData.correctIndex;
  const basePoints = qData.points || 100;
  const timeLimit = qData.timeLimit || 20;

  const distribution = [0, 0, 0, 0];
  const roundResults = [];

  for (const pid in room.players) {
    const p = room.players[pid];
    const answer = p.currentAnswer; // 0, 1, 2, 3 or null

    if (answer !== null && answer >= 0 && answer < 4) {
      distribution[answer]++;
    }

    const isCorrect = (answer === correctIdx);
    p.lastAnswerCorrect = isCorrect;

    let earnedPoints = 0;
    if (isCorrect) {
      p.correctCount++;
      p.streak++;

      // Speed bonus: up to +50 points if answered quickly
      let speedBonus = 0;
      if (p.answeredAt) {
        const timeTaken = (p.answeredAt - room.roundStartTime) / 1000;
        const timeLeftRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
        speedBonus = Math.round(timeLeftRatio * 50);
      }

      // Streak bonus: +10 per current streak (cap at +50)
      const streakBonus = Math.min(50, (p.streak - 1) * 10);

      earnedPoints = basePoints + speedBonus + streakBonus;
      p.score += earnedPoints;
    } else {
      p.streak = 0;
    }

    roundResults.push({
      id: p.id,
      name: p.name,
      answer: answer,
      isCorrect: isCorrect,
      earnedPoints: earnedPoints,
      totalScore: p.score,
      streak: p.streak
    });
  }

  // Sort leaderboard
  const leaderboard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      score: p.score,
      streak: p.streak
    }));

  const payload = {
    questionIndex: room.currentQIndex,
    correctIndex: correctIdx,
    explanation: qData.explanation || `Jawaban yang benar adalah pilihan ${['A', 'B', 'C', 'D'][correctIdx]}: ${qData.options[correctIdx]}`,
    distribution: distribution,
    results: roundResults,
    leaderboard: leaderboard
  };

  io.to(room.roomCode).emit('question_result', payload);

  // Send updated player list
  io.to(room.roomCode).emit('player_list_updated', Object.values(room.players));
}

// Finish Game & Victory Podium
function finishGame(room) {
  room.state = 'FINISHED';
  if (room.timerInterval) clearInterval(room.timerInterval);

  const leaderboard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      score: p.score,
      correctCount: p.correctCount,
      totalQuestions: room.questions.length
    }));

  io.to(room.roomCode).emit('game_finished', {
    podium: leaderboard.slice(0, 3),
    fullLeaderboard: leaderboard,
    totalQuestions: room.questions.length
  });
}

// ==================== ENGINE RONDE BATTLE ROYALE LANTAI LAVA ====================
function runNextLavaRound(lRoom) {
  if (!lavaRooms[lRoom.roomKey]) return;
  if (lRoom.interval) clearInterval(lRoom.interval);

  const clueObj = lRoom.cluesQueue[lRoom.round];
  if (!clueObj || lRoom.round >= lRoom.maxRounds) {
    finishLavaBattle(lRoom);
    return;
  }

  lRoom.state = 'CLUE';
  lRoom.currentClue = clueObj;
  lRoom.timer = 30; // 30 detik agar siswa cukup waktu membaca ciri planet & berlari!

  io.to(lRoom.roomKey).emit('lava_round_start', {
    round: lRoom.round + 1,
    maxRounds: lRoom.maxRounds,
    clue: clueObj.clue,
    timer: lRoom.timer
  });

  lRoom.interval = setInterval(() => {
    if (!lavaRooms[lRoom.roomKey]) {
      clearInterval(lRoom.interval);
      return;
    }
    lRoom.timer--;
    io.to(lRoom.roomKey).emit('lava_timer_tick', { timer: lRoom.timer });

    if (lRoom.timer <= 0) {
      clearInterval(lRoom.interval);
      lRoom.state = 'LAVA_DROP';

      // Evaluasi siapa yang berdiri di planet yang BENAR vs jatuh ke LAVA!
      const safePlanetId = clueObj.planetId;
      const eliminatedIds = [];
      const survivors = [];

      Object.values(lRoom.players).forEach(p => {
        if (!p.alive) return;
        if (p.standingPlanet === safePlanetId) {
          p.survivedRounds++;
          survivors.push(p);
        } else {
          p.alive = false;
          eliminatedIds.push(p.id);
        }
      });

      io.to(lRoom.roomKey).emit('lava_floor_drop', {
        safePlanetId,
        info: clueObj.info,
        eliminatedIds,
        players: Object.values(lRoom.players)
      });

      // Tunggu 3.8 detik (durasi lava menyala & lantai muncul kembali), lalu cek selesai atau lanjut ronde
      setTimeout(() => {
        if (!lavaRooms[lRoom.roomKey]) return;
        lRoom.round++;
        const totalHuman = Object.keys(lRoom.players).length;
        const aliveHuman = Object.values(lRoom.players).filter(p => p.alive).length;

        // Jika main multiplayer (>3 orang) dan tersisa <= 3 juara bertahan, atau habis ronde, atau semua gugur -> selesai!
        const shouldEnd =
          lRoom.round >= lRoom.maxRounds ||
          aliveHuman === 0 ||
          (totalHuman > 3 && aliveHuman <= 3);

        if (shouldEnd) {
          finishLavaBattle(lRoom);
        } else {
          runNextLavaRound(lRoom);
        }
      }, 3800);
    }
  }, 1000);
}

function finishLavaBattle(lRoom) {
  lRoom.state = 'FINISHED';
  if (lRoom.interval) clearInterval(lRoom.interval);

  const standings = Object.values(lRoom.players).sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.survivedRounds - a.survivedRounds;
  });

  io.to(lRoom.roomKey).emit('lava_game_over', {
    winners: standings.slice(0, 3),
    standings
  });
}

// ==================== ENGINE KATA BAKU / TIDAK BAKU PUEBI ====================
function scheduleNextPuebiWord(pRoom) {
  if (!puebiRooms[pRoom.roomKey] || pRoom.state !== 'RUNNING') return;
  if (pRoom.wordTimeout) clearTimeout(pRoom.wordTimeout);

  const pool = PUEBI_WORDS[pRoom.level] || PUEBI_WORDS.sd;
  const pair = pool[Math.floor(Math.random() * pool.length)];
  const isBaku = Math.random() < 0.52;
  const shownWord = isBaku ? pair.baku : pair.tidakBaku;

  const prev = pRoom.currentWordObj;
  const nextObj = {
    word: shownWord,
    isBaku: isBaku,
    bakuForm: pair.baku,
    graceMs: 1100, // 1.1 detik fase baca netral agar siswa benar-benar membaca kata & sempat melepas joystick!
    prevWord: prev ? prev.word : null,
    prevIsBaku: prev ? prev.isBaku : null,
    prevBakuForm: prev ? prev.bakuForm : null
  };
  pRoom.currentWordObj = nextObj;

  io.to(pRoom.roomKey).emit('puebi_word_changed', nextObj);

  // Acak durasi kata 3.5 - 5.2 detik
  const durationMs = 3500 + Math.floor(Math.random() * 1700);
  pRoom.wordTimeout = setTimeout(() => {
    scheduleNextPuebiWord(pRoom);
  }, durationMs);
}

// ==================== ENGINE PABRIK DAUR ULANG KILAT ====================
function spawnRecycleItem(rRoom) {
  const pool = RECYCLE_ITEMS[rRoom.level] || RECYCLE_ITEMS.sd;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  const id = `trash_${rRoom.nextItemSeq++}`;
  const item = {
    id,
    name: tpl.name,
    category: tpl.category,
    shape: tpl.shape,
    color: tpl.color,
    edu: tpl.edu,
    x: parseFloat(((Math.random() - 0.5) * 12).toFixed(2)),
    z: parseFloat(((Math.random() - 0.5) * 7).toFixed(2)),
    carriedBy: null
  };
  rRoom.items[id] = item;
  updateRecycleCapacity(rRoom);
  return item;
}

function updateRecycleCapacity(rRoom) {
  const groundCount = Object.values(rRoom.items).filter(it => !it.carriedBy).length;
  // 16 tumpukan sampah di lantai = 100% banjir pabrik!
  rRoom.capacity = Math.min(100, Math.round((groundCount / 16) * 100));
}

function finishRecycleMatch(rRoom, reason) {
  rRoom.state = 'FINISHED';
  if (rRoom.tickInterval) clearInterval(rRoom.tickInterval);
  if (rRoom.spawnInterval) clearInterval(rRoom.spawnInterval);

  const standings = Object.values(rRoom.players).sort((a, b) => b.score - a.score);
  io.to(rRoom.roomKey).emit('recycle_game_over', {
    mode: rRoom.mode,
    reason, // 'time_up' | 'overflow'
    scores: rRoom.scores,
    capacity: rRoom.capacity,
    standings
  });
}

function startRecycleLoops(rRoom) {
  rRoom.tickInterval = setInterval(() => {
    if (!recycleRooms[rRoom.roomKey] || rRoom.state !== 'RUNNING') {
      clearInterval(rRoom.tickInterval);
      return;
    }
    rRoom.timer--;
    updateRecycleCapacity(rRoom);
    io.to(rRoom.roomKey).emit('recycle_tick', {
      timer: rRoom.timer,
      capacity: rRoom.capacity,
      scores: rRoom.scores
    });

    if (rRoom.mode === 'coop' && rRoom.capacity >= 100) {
      finishRecycleMatch(rRoom, 'overflow');
    } else if (rRoom.timer <= 0) {
      finishRecycleMatch(rRoom, 'time_up');
    }
  }, 1000);

  // Spawn sampah baru tiap 3.2 detik di konveyor tengah (maks 18 sampah di lantai)
  rRoom.spawnInterval = setInterval(() => {
    if (!recycleRooms[rRoom.roomKey] || rRoom.state !== 'RUNNING') {
      clearInterval(rRoom.spawnInterval);
      return;
    }
    if (Object.keys(rRoom.items).length < 18) {
      const newItem = spawnRecycleItem(rRoom);
      io.to(rRoom.roomKey).emit('recycle_item_spawned', {
        item: newItem,
        capacity: rRoom.capacity
      });
    }
  }, 3200);
}

// Start HTTP Server
server.listen(PORT, () => {
  const ips = getLocalIpAddresses();
  console.log('\n=============================================================');
  console.log('🎮 EDUVERSE 3D MULTIPLAYER MABAR KELAS (ZuperVerse Edition)');
  console.log('=============================================================');
  console.log(`🌐 Server berjalan di port ${PORT}`);
  console.log(`💻 Buka di Laptop / Proyektor Guru: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 Buka di HP / Laptop Murid Satu Kelas:`);
    ips.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
  }
  console.log('=============================================================\n');
});
