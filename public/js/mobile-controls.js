// Modul Kontrol & Responsiveness Mobile Global — EduMetro 3D
// Deteksi mobile (<1024px / pointer: coarse), Collapsible Drawer Chat/Peringkat,
// serta opt-in tombol kontekstual "Ambil/Aksi" khusus mini game yang memerlukannya.

(function () {
  class MobileControlsManager {
    constructor() {
      this.initialized = false;
      this.actionBtn = null;
      this.actionIconEl = null;
      this.actionTextEl = null;
      this.actionCallback = null;
    }

    isMobileDevice() {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      return coarse || isIPadOS || window.innerWidth <= 1180 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.setupCollapsibleDrawers();
    }

    // Opt-in: hanya mini game tertentu yang memunculkan tombol bulat Aksi/Ambil (Zero Emoji — Crisp Vector SVG!)
    enableActionButton(defaultText = 'AMBIL', defaultIconSvg = null) {
      if (this.actionBtn) return;
      const jumpBtn = document.getElementById('mobile-jump-btn');
      if (!jumpBtn) return;

      const fallbackSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
      const cluster = document.createElement('div');
      cluster.className = 'mobile-right-cluster';

      const actionBtn = document.createElement('button');
      actionBtn.id = 'mobile-action-btn';
      actionBtn.type = 'button';
      actionBtn.innerHTML = `
        <span id="mobile-action-icon" style="display:inline-flex; align-items:center; justify-content:center; line-height:1;">${defaultIconSvg || fallbackSvg}</span>
        <span id="mobile-action-text">${defaultText}</span>
      `;

      jumpBtn.parentNode.insertBefore(cluster, jumpBtn);
      cluster.appendChild(actionBtn);
      cluster.appendChild(jumpBtn);

      this.actionBtn = actionBtn;
      this.actionIconEl = document.getElementById('mobile-action-icon');
      this.actionTextEl = document.getElementById('mobile-action-text');

      const triggerAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof this.actionCallback === 'function') {
          this.actionCallback();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
        }
      };
      actionBtn.addEventListener('touchstart', triggerAction, { passive: false });
      actionBtn.addEventListener('click', triggerAction);
    }

    setActionLabel(text, active = false, iconNameOrSvg = null, onPress = null) {
      if (!this.actionBtn) return;
      this.actionCallback = typeof onPress === 'function' ? onPress : null;
      if (this.actionTextEl) this.actionTextEl.textContent = String(text || 'AKSI').slice(0, 10).toUpperCase();
      if (this.actionIconEl && iconNameOrSvg) {
        if (window.UI_ICONS && window.UI_ICONS.has(iconNameOrSvg)) {
          this.actionIconEl.innerHTML = window.UI_ICONS.svg(iconNameOrSvg, 20);
        } else if (String(iconNameOrSvg).trim().startsWith('<svg')) {
          this.actionIconEl.innerHTML = iconNameOrSvg;
        }
      }
      this.actionBtn.classList.toggle('active', Boolean(active));
    }

    clearAction() {
      if (!this.actionBtn) return;
      this.setActionLabel('AMBIL', false, 'zap', null);
    }

    // Ubah Peringkat Kelas menjadi Collapsible Drawer Toggle di HP (< 1024px / pointer: coarse)
    setupCollapsibleDrawers() {
      const leaderboard = document.querySelector('.hud-leaderboard');
      const chatBox = document.querySelector('.city-chat-box');
      if (chatBox) {
        chatBox.classList.add('mobile-collapsible');
      }
      if (!leaderboard) return;

      const cityHudEl = document.getElementById('city-hud');
      let toggleWrap = document.querySelector('.mobile-drawer-toggles');
      if (!toggleWrap) {
        toggleWrap = document.createElement('div');
        toggleWrap.className = 'mobile-drawer-toggles' + (cityHudEl ? ' in-city-hud' : '');
        // Di Lobby Kota, masukkan ke dalam #city-hud agar otomatis tersembunyi saat di Menu Utama!
        (cityHudEl || document.body).appendChild(toggleWrap);
      }

      leaderboard.classList.add('mobile-collapsible');
      const btnRank = document.createElement('button');
      btnRank.type = 'button';
      btnRank.className = 'mobile-drawer-fab';
      btnRank.title = 'Peringkat Kelas';
      btnRank.setAttribute('aria-label', 'Peringkat Kelas');
      btnRank.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
      btnRank.addEventListener('click', (e) => {
        e.stopPropagation();
        const opened = leaderboard.classList.toggle('drawer-open');
        btnRank.classList.toggle('open', opened);
      });
      toggleWrap.appendChild(btnRank);
    }
  }

  window.MobileControls = new MobileControlsManager();
  document.addEventListener('DOMContentLoaded', () => {
    window.MobileControls.init();
  });
})();
