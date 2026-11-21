// Dashboard Guru & Host Controller — EduMetro 3D (SD & SMP, 100% Responsif, Zero Emoji)

document.addEventListener('DOMContentLoaded', async () => {
  let quizzesCache = [];
  let activeQuiz = null;
  let activeLevel = 'sd'; // 'sd' | 'smp'
  let editingQuestionIndex = -1;
  let toastTimer = null;

  const quizListContainer = document.getElementById('quiz-list-container');
  const otherGamesGrid = document.getElementById('other-minigames-grid');
  const questionsContainer = document.getElementById('editor-questions-container');
  const quizSelector = document.getElementById('editor-quiz-selector');
  const csvTargetGame = document.getElementById('csv-target-game');
  const csvTargetLevel = document.getElementById('csv-target-level');
  const searchInput = document.getElementById('editor-search-input');
  const btnLevelSD = document.getElementById('btn-editor-level-sd');
  const btnLevelSMP = document.getElementById('btn-editor-level-smp');
  const levelHeading = document.getElementById('editor-level-heading');

  function showToast(msg, isError = false) {
    const toast = document.getElementById('guru-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function getActiveQuestionArray() {
    if (!activeQuiz) return [];
    if (activeLevel === 'smp') {
      if (!Array.isArray(activeQuiz.questionsSMP)) activeQuiz.questionsSMP = [];
      return activeQuiz.questionsSMP;
    }
    if (!Array.isArray(activeQuiz.questionsSD)) activeQuiz.questionsSD = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    return activeQuiz.questionsSD;
  }

  // 1. Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(tabId) {
    tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
    tabPanes.forEach(p => {
      p.style.display = p.id === tabId ? 'block' : 'none';
    });
    if (tabId === 'tab-edit-soal' && !activeQuiz && quizzesCache.length > 0) {
      openEditor(quizzesCache[0].id, false);
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  // 2. Muat Bank Soal & Info Server Aktif
  async function fetchServerQuizzes() {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.success && Array.isArray(data.quizzes)) {
        quizzesCache = data.quizzes;
      }
    } catch (err) {
      console.error('Gagal mengambil bank soal dari server:', err);
      quizzesCache = window.QuizManager ? window.QuizManager.getAllQuizzes() : [];
    }

    updateKpis();
    populateSelectors();
    renderQuizList();
    renderOtherMinigames();

    const urlParams = new URLSearchParams(window.location.search);
    const targetGame = urlParams.get('game');
    if (targetGame) {
      const found = quizzesCache.find(q => q.id === targetGame);
      if (found) openEditor(found.id, true);
    }
  }

  async function fetchServerStatus() {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (data && data.success) {
        const srvEl = document.getElementById('kpi-active-servers');
        const lanEl = document.getElementById('kpi-lan-url');
        if (srvEl) srvEl.textContent = `${data.servers.length} Server`;
        if (lanEl && Array.isArray(data.lanIps) && data.lanIps.length > 0) {
          lanEl.textContent = `LAN: http://${data.lanIps[0]}:${data.port || 3000}`;
        }
      }
    } catch (e) {}
  }

  function updateKpis() {
    const editableEl = document.getElementById('kpi-editable-count');
    const totalQEl = document.getElementById('kpi-total-questions');
    const breakEl = document.getElementById('kpi-level-breakdown');
    const gamesEl = document.getElementById('kpi-total-games');

    const totalGames = (window.MINIGAMES_REGISTRY || []).length || 11;
    if (gamesEl) gamesEl.textContent = `${totalGames} Game`;
    if (editableEl) editableEl.textContent = `${quizzesCache.length} Paket`;

    let sdCount = 0;
    let smpCount = 0;
    quizzesCache.forEach(q => {
      sdCount += (q.questionsSD || q.questions || []).length;
      smpCount += (q.questionsSMP || []).length;
    });
    if (totalQEl) totalQEl.textContent = `${sdCount + smpCount} Soal`;
    if (breakEl) breakEl.textContent = `SD: ${sdCount} · SMP: ${smpCount}`;
  }

  function populateSelectors() {
    const optsHtml = quizzesCache.map(q =>
      `<option value="${escapeHtml(q.id)}">${escapeHtml(q.id.toUpperCase())} — ${escapeHtml(q.title)}</option>`
    ).join('');
    if (quizSelector) quizSelector.innerHTML = optsHtml;
    if (csvTargetGame) csvTargetGame.innerHTML = optsHtml;
  }

  // 3. Render 4 Bank Soal Kustom (MG-01 s.d. MG-04)
  function renderQuizList() {
    quizListContainer.innerHTML = '';
    if (quizzesCache.length === 0) {
      quizListContainer.innerHTML = '<div class="editor-panel" style="text-align:center; color:#94a3b8;">Belum ada bank soal tersedia.</div>';
      return;
    }

    quizzesCache.forEach(quiz => {
      const sdLen = (quiz.questionsSD || quiz.questions || []).length;
      const smpLen = (quiz.questionsSMP || []).length;
      const arenaUrl = `${quiz.id === 'mg-04' ? 'race.html' : 'game.html'}?game=${encodeURIComponent(quiz.id)}`;

      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.innerHTML = `
        <div class="quiz-card-info">
          <div style="display:flex; align-items:center; gap:0.45rem; margin-bottom:0.35rem; flex-wrap:wrap;">
            <span class="badge badge-pink">${escapeHtml(quiz.id.toUpperCase())}</span>
            <span class="badge badge-blue">${escapeHtml(quiz.subject || 'Umum')}</span>
            <span class="badge badge-green">SD: ${sdLen} Soal</span>
            <span class="badge badge-blue" style="background:rgba(139,92,246,0.22); color:#c4b5fd;">SMP: ${smpLen} Soal</span>
          </div>
          <h3 style="font-size:1.08rem; font-weight:700; margin-bottom:0.2rem; color:#ffffff;">${escapeHtml(quiz.title)}</h3>
          <p style="color:#94a3b8; font-size:0.84rem;">${escapeHtml(quiz.description || '')}</p>
        </div>
        <div class="quiz-card-actions">
          <button type="button" class="btn btn-accent btn-edit-quiz" data-id="${escapeHtml(quiz.id)}" style="min-height:40px; padding:0.45rem 0.95rem; font-size:0.84rem;">
            Edit Soal SD/SMP
          </button>
          <a href="${arenaUrl}" class="btn btn-primary" style="min-height:40px; padding:0.45rem 0.95rem; font-size:0.84rem;">
            Buka Arena
          </a>
        </div>
      `;

      card.querySelector('.btn-edit-quiz').addEventListener('click', () => openEditor(quiz.id, true));
      quizListContainer.appendChild(card);
    });
  }

  // 4. Render 7 Arena Mini-Game Tematik Lainnya (MG-05 s.d. MG-11)
  function renderOtherMinigames() {
    if (!otherGamesGrid) return;
    const editableIds = new Set(quizzesCache.map(q => q.id));
    const others = (window.MINIGAMES_REGISTRY || []).filter(g => !editableIds.has(g.id));
    otherGamesGrid.innerHTML = '';

    others.forEach(g => {
      const card = document.createElement('div');
      card.className = 'mini-arena-card';
      card.innerHTML = `
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.4rem; margin-bottom:0.35rem;">
            <span class="badge badge-blue">#${String(g.number).padStart(2, '0')}</span>
            <span class="badge badge-green">SD &amp; SMP</span>
          </div>
          <h4 style="font-size:0.98rem; font-weight:700; color:#ffffff; margin-bottom:0.2rem;">${escapeHtml(g.name)}</h4>
          <div style="font-size:0.78rem; color:#7dd3fc; font-weight:600; margin-bottom:0.35rem;">${escapeHtml(g.subject)}</div>
          <p style="font-size:0.8rem; color:#94a3b8; line-height:1.4;">${escapeHtml(g.desc)}</p>
        </div>
        <a href="${escapeHtml(g.url || 'index.html')}" class="btn btn-secondary btn-block" style="min-height:38px; font-size:0.82rem;">
          Buka Arena
        </a>
      `;
      otherGamesGrid.appendChild(card);
    });
  }

  // 5. Open Editor untuk Mini Game & Level SD/SMP
  function openEditor(quizId, goToTab = true) {
    const found = quizzesCache.find(q => q.id === quizId);
    if (!found) return;
    activeQuiz = JSON.parse(JSON.stringify(found));
    if (!Array.isArray(activeQuiz.questionsSD)) activeQuiz.questionsSD = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    if (!Array.isArray(activeQuiz.questionsSMP)) activeQuiz.questionsSMP = [];

    if (quizSelector) quizSelector.value = activeQuiz.id;
    document.getElementById('edit-meta-title').value = activeQuiz.title || '';
    document.getElementById('edit-meta-subject').value = activeQuiz.subject || '';
    document.getElementById('edit-meta-grade').value = activeQuiz.grade || 'SD & SMP';
    if (searchInput) searchInput.value = '';

    syncEditorLevelUI();
    renderEditorQuestions();
    if (goToTab) switchTab('tab-edit-soal');
  }

  function syncEditorLevelUI() {
    const isSD = activeLevel === 'sd';
    if (btnLevelSD) btnLevelSD.classList.toggle('active', isSD);
    if (btnLevelSMP) btnLevelSMP.classList.toggle('active', !isSD);
    const list = getActiveQuestionArray();
    if (levelHeading) {
      levelHeading.textContent = `Daftar Soal Level ${isSD ? 'SD' : 'SMP'} (${list.length} Soal)`;
    }
  }

  if (btnLevelSD) btnLevelSD.addEventListener('click', () => { activeLevel = 'sd'; syncEditorLevelUI(); renderEditorQuestions(); });
  if (btnLevelSMP) btnLevelSMP.addEventListener('click', () => { activeLevel = 'smp'; syncEditorLevelUI(); renderEditorQuestions(); });
  if (quizSelector) quizSelector.addEventListener('change', () => openEditor(quizSelector.value, false));
  if (searchInput) searchInput.addEventListener('input', renderEditorQuestions);

  function renderEditorQuestions() {
    questionsContainer.innerHTML = '';
    const list = getActiveQuestionArray();
    syncEditorLevelUI();

    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const filtered = list
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (!keyword) return true;
        const txt = String(q.question || q.q || '').toLowerCase();
        const opts = (q.options || []).join(' ').toLowerCase();
        return txt.includes(keyword) || opts.includes(keyword);
      });

    if (filtered.length === 0) {
      questionsContainer.innerHTML = `
        <div style="text-align:center; padding: 2rem; color:#94a3b8; border:1px dashed rgba(255,255,255,0.14); border-radius:12px;">
          ${list.length === 0
            ? `Belum ada soal untuk Level ${activeLevel.toUpperCase()}. Klik "+ Tambah Soal" untuk menambahkan.`
            : 'Tidak ada soal yang cocok dengan kata pencarian.'}
        </div>
      `;
      return;
    }

    const keyLabels = ['A', 'B', 'C', 'D'];
    filtered.forEach(({ q, idx }) => {
      const qText = q.question || q.q || '(Teks soal kosong)';
      const item = document.createElement('div');
      item.className = 'question-list-item';
      item.innerHTML = `
        <div class="question-item-head">
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap; margin-bottom:0.35rem;">
              <span class="badge badge-pink">Soal #${idx + 1}</span>
              <span class="badge badge-blue">${activeLevel.toUpperCase()}</span>
              <span style="font-size:0.78rem; color:#94a3b8;">${q.timeLimit || 18} Detik · ${q.points || 100} Poin</span>
            </div>
            <p style="font-weight:700; font-size:0.98rem; color:#ffffff; line-height:1.4;">${escapeHtml(qText)}</p>
          </div>
          <div class="question-item-actions">
            <button type="button" class="btn btn-secondary btn-edit-single-q" style="min-height:36px; padding:0.35rem 0.72rem; font-size:0.8rem;">
              Edit
            </button>
            <button type="button" class="btn btn-secondary btn-del-single-q" style="min-height:36px; padding:0.35rem 0.72rem; font-size:0.8rem; color:#fda4af; border-color:rgba(244,63,94,0.35);">
              Hapus
            </button>
          </div>
        </div>
        <div class="q-opt-grid">
          ${(q.options || []).map((opt, oIdx) => `
            <div class="q-opt ${oIdx === q.correctIndex ? 'correct' : ''}">
              <strong>${keyLabels[oIdx] || oIdx + 1}:</strong> ${escapeHtml(opt)} ${oIdx === q.correctIndex ? '(Benar)' : ''}
            </div>
          `).join('')}
        </div>
        ${q.explanation ? `<p style="font-size:0.82rem; color:#7dd3fc; margin-top:0.35rem;">Pembahasan: ${escapeHtml(q.explanation)}</p>` : ''}
      `;

      item.querySelector('.btn-edit-single-q').addEventListener('click', () => openQuestionModal(idx));
      item.querySelector('.btn-del-single-q').addEventListener('click', () => {
        if (confirm(`Hapus Soal #${idx + 1} (Level ${activeLevel.toUpperCase()})?`)) {
          list.splice(idx, 1);
          renderEditorQuestions();
        }
      });

      questionsContainer.appendChild(item);
    });
  }

  // 6. Modal Edit / Tambah Soal
  const modal = document.getElementById('question-modal');
  const modalTitle = document.getElementById('modal-q-title');
  const modalText = document.getElementById('modal-q-text');
  const modalOptA = document.getElementById('modal-opt-a');
  const modalOptB = document.getElementById('modal-opt-b');
  const modalOptC = document.getElementById('modal-opt-c');
  const modalOptD = document.getElementById('modal-opt-d');
  const modalKey = document.getElementById('modal-correct-key');
  const modalTime = document.getElementById('modal-time-limit');
  const modalExpl = document.getElementById('modal-explanation');

  function openQuestionModal(qIndex) {
    editingQuestionIndex = qIndex;
    const list = getActiveQuestionArray();
    if (qIndex >= 0 && list[qIndex]) {
      const q = list[qIndex];
      modalTitle.textContent = `Edit Soal #${qIndex + 1} — Level ${activeLevel.toUpperCase()}`;
      modalText.value = q.question || q.q || '';
      modalOptA.value = (q.options && q.options[0]) || '';
      modalOptB.value = (q.options && q.options[1]) || '';
      modalOptC.value = (q.options && q.options[2]) || '';
      modalOptD.value = (q.options && q.options[3]) || '';
      modalKey.value = q.correctIndex !== undefined ? q.correctIndex : 0;
      modalTime.value = q.timeLimit || 18;
      modalExpl.value = q.explanation || '';
    } else {
      modalTitle.textContent = `Tambah Soal Baru — Level ${activeLevel.toUpperCase()}`;
      modalText.value = '';
      modalOptA.value = '';
      modalOptB.value = '';
      modalOptC.value = '';
      modalOptD.value = '';
      modalKey.value = 0;
      modalTime.value = 18;
      modalExpl.value = '';
    }
    modal.style.display = 'flex';
  }

  document.getElementById('btn-add-question').addEventListener('click', () => {
    if (!activeQuiz) return;
    openQuestionModal(-1);
  });

  document.getElementById('btn-modal-cancel').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.getElementById('btn-modal-save').addEventListener('click', () => {
    const qText = modalText.value.trim();
    const optA = modalOptA.value.trim();
    const optB = modalOptB.value.trim();
    const optC = modalOptC.value.trim();
    const optD = modalOptD.value.trim();

    if (!qText || !optA || !optB || !optC) {
      showToast('Lengkapi pertanyaan dan minimal 3 pilihan jawaban (A, B, C).', true);
      return;
    }

    const opts = optD ? [optA, optB, optC, optD] : [optA, optB, optC];
    const parsedKey = Math.min(parseInt(modalKey.value, 10) || 0, opts.length - 1);

    const questionObj = {
      q: qText,
      question: qText,
      options: opts,
      correctIndex: parsedKey,
      timeLimit: Math.max(8, Math.min(60, parseInt(modalTime.value, 10) || 18)),
      points: 100,
      explanation: modalExpl.value.trim()
    };

    const list = getActiveQuestionArray();
    if (editingQuestionIndex >= 0) {
      list[editingQuestionIndex] = questionObj;
    } else {
      list.push(questionObj);
    }

    modal.style.display = 'none';
    renderEditorQuestions();
    showToast('Soal diperbarui di editor. Klik "Simpan ke Server" untuk menerapkan.');
  });

  // 7. Simpan Perubahan ke Server (Menyimpan SD & SMP sekaligus!)
  document.getElementById('btn-save-quiz-changes').addEventListener('click', async () => {
    if (!activeQuiz) return;
    activeQuiz.title = document.getElementById('edit-meta-title').value.trim() || activeQuiz.title;
    activeQuiz.subject = document.getElementById('edit-meta-subject').value.trim() || 'Umum';
    activeQuiz.grade = document.getElementById('edit-meta-grade').value.trim() || 'SD & SMP';
    activeQuiz.questions = activeQuiz.questionsSD || [];

    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(activeQuiz.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeQuiz)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Perubahan ${activeQuiz.id.toUpperCase()} (SD & SMP) berhasil disimpan ke server.`);
        await fetchServerQuizzes();
        openEditor(activeQuiz.id, false);
      } else {
        showToast('Gagal menyimpan soal: ' + (data.message || 'Error'), true);
      }
    } catch (err) {
      showToast('Gagal menghubungi server untuk menyimpan soal.', true);
    }
  });

  // 8. Impor CSV ke Target Mini Game & Jenjang (SD / SMP)
  document.getElementById('btn-import-csv').addEventListener('click', () => {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Pilih file .CSV terlebih dahulu.', true);
      return;
    }

    const targetId = (csvTargetGame && csvTargetGame.value) || 'mg-01';
    const targetLvl = (csvTargetLevel && csvTargetLevel.value) === 'smp' ? 'smp' : 'sd';
    const baseQuiz = quizzesCache.find(q => q.id === targetId);
    if (!baseQuiz) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const res = window.QuizManager.importFromCsv(e.target.result, {
        title: baseQuiz.title,
        subject: baseQuiz.subject
      });
      if (!res.success || !res.quiz || !res.quiz.questions.length) {
        showToast('Gagal mengimpor CSV: ' + (res.error || 'Format tidak terbaca.'), true);
        return;
      }

      const payload = JSON.parse(JSON.stringify(baseQuiz));
      if (targetLvl === 'smp') payload.questionsSMP = res.quiz.questions;
      else {
        payload.questionsSD = res.quiz.questions;
        payload.questions = res.quiz.questions;
      }

      try {
        const saveRes = await fetch(`/api/quizzes/${encodeURIComponent(targetId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          showToast(`Berhasil mengimpor ${res.quiz.questions.length} soal ke ${targetId.toUpperCase()} (${targetLvl.toUpperCase()}).`);
          await fetchServerQuizzes();
          activeLevel = targetLvl;
          openEditor(targetId, true);
        } else {
          showToast('Gagal menyimpan hasil impor.', true);
        }
      } catch (err) {
        showToast('Gagal menghubungi server saat impor.', true);
      }
    };
    reader.readAsText(fileInput.files[0]);
  });

  // 9. Ekspor CSV dari Mini Game & Level Aktif
  document.getElementById('btn-export-active-csv').addEventListener('click', () => {
    const targetId = (csvTargetGame && csvTargetGame.value) || (activeQuiz ? activeQuiz.id : 'mg-01');
    const targetLvl = (csvTargetLevel && csvTargetLevel.value) === 'smp' ? 'smp' : 'sd';
    const quiz = quizzesCache.find(q => q.id === targetId);
    if (!quiz) return;
    const list = targetLvl === 'smp' ? (quiz.questionsSMP || []) : (quiz.questionsSD || quiz.questions || []);
    const keyLetters = ['A', 'B', 'C', 'D'];
    const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    const rows = [['Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban Benar', 'Waktu', 'Pembahasan'].join(',')];
    list.forEach(q => {
      const opts = q.options || [];
      rows.push([
        esc(q.question || q.q || ''),
        esc(opts[0] || ''),
        esc(opts[1] || ''),
        esc(opts[2] || ''),
        esc(opts[3] || ''),
        keyLetters[q.correctIndex || 0] || 'A',
        q.timeLimit || 18,
        esc(q.explanation || '')
      ].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetId}_${targetLvl}_bank_soal.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Berhasil mengekspor ${list.length} soal (${targetId.toUpperCase()} ${targetLvl.toUpperCase()}).`);
  });

  // 10. Reset Semua Bank Soal ke Default SD & SMP
  document.getElementById('btn-reset-default-quizzes').addEventListener('click', async () => {
    if (!confirm('Kembalikan seluruh bank soal (MG-01 s.d. MG-04) ke soal bawaan SD & SMP?')) return;
    try {
      const res = await fetch('/api/quizzes/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Seluruh bank soal berhasil dikembalikan ke bawaan SD & SMP.');
        await fetchServerQuizzes();
        if (activeQuiz) openEditor(activeQuiz.id, false);
      } else {
        showToast('Gagal mereset bank soal.', true);
      }
    } catch (err) {
      showToast('Gagal menghubungi server.', true);
    }
  });

  // 11. Modal Buat Server Kelas Langsung dari Dashboard Guru (Tanpa Login — Ala Kahoot)
  const hostModal = document.getElementById('host-server-modal');
  const hostNameInput = document.getElementById('host-modal-name');
  const hostRoomInput = document.getElementById('host-modal-room');

  document.getElementById('btn-create-class-server').addEventListener('click', () => {
    if (hostNameInput && !hostNameInput.value) {
      hostNameInput.value = sessionStorage.getItem('eduverse_name') || 'Host Guru';
    }
    if (hostModal) hostModal.style.display = 'flex';
  });

  document.getElementById('btn-host-modal-cancel').addEventListener('click', () => {
    if (hostModal) hostModal.style.display = 'none';
  });

  document.getElementById('btn-host-modal-confirm').addEventListener('click', async () => {
    const hostName = (hostNameInput ? hostNameInput.value.trim() : '') || 'Host Guru';
    const serverName = (hostRoomInput ? hostRoomInput.value.trim() : '') || `Kelas ${hostName}`;

    try {
      const res = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, serverName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast('Gagal membuat server kelas.', true);
        return;
      }

      sessionStorage.setItem('eduverse_name', hostName);
      sessionStorage.setItem('eduverse_play_mode', 'multiplayer');
      sessionStorage.setItem('eduverse_mp_role', 'teacher');
      sessionStorage.setItem('eduverse_city_role', 'teacher');
      sessionStorage.setItem('eduverse_server_code', data.server.code);
      sessionStorage.setItem('eduverse_server_meta', JSON.stringify({ ...data.server, mode: 'multiplayer' }));
      sessionStorage.setItem('eduverse_auto_rejoin', '1');
      window.location.href = 'index.html';
    } catch (err) {
      showToast('Gagal terhubung ke server.', true);
    }
  });

  // Initial Load
  await Promise.all([fetchServerQuizzes(), fetchServerStatus()]);
});
