'use strict';
const $ = id => document.getElementById(id);

const UI = {
  touch: false,
  cards: {},
  skinOpen: false, setOpen: false, ovKind: null, userPaused: false,
  lastBonusTxt: '',

  init() {
    this.stage = $('stage');
    Sfx.setEnabled(Save.data.sound);
    this.buildShop();

    $('btn-shop').onclick = () => { Sfx.click(); $('shop').classList.toggle('hide'); $('skins-btn').classList.toggle('hide'); };
    $('btn-set').onclick = () => { Sfx.click(); this.openSettings(); };
    $('btn-skip').onclick = () => { Sfx.click(); if (Game.level < MAX_LEVEL) Game.nextLevel(); };
    $('skins-btn').onclick = () => { Sfx.click(); this.openSkins(); };
    Net.loadSettings();
    $('level-txt').onclick = () => { if (Net.active) return; Sfx.click(); this.openLevels(); };
    $('ov-lv-btn').onclick = () => { Sfx.click(); if (Net.active) Net.leave(); else this.openLevels(); };
    $('online-btn').onclick = () => this.openOnline();
    $('btn-leave').onclick = () => { Sfx.click(); Net.leave(); };
    $('btn-home').onclick = () => { Sfx.click(); UI.goHome(); };
    $('btn-lang').onclick = () => { Sfx.click(); setLang(LANG === 'vi' ? 'en' : 'vi'); };
    if (location.protocol === 'file:') $('btn-home').style.display = 'none';
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $('row-fs').style.display = 'none';
    $('set-fs').onclick = () => { Sfx.click(); UI.toggleFullscreen(); };
    applyStatic();
    $('on-close').onclick = () => this.cancelOnline();
    $('on-cancel').onclick = () => { Sfx.click(); Net.cancel(); this.onlineStatus(''); };
    $('on-quick').onclick = () => this.onlineGo('quick');
    $('on-create').onclick = () => this.onlineGo('create');
    $('on-join').onclick = () => this.onlineGo('join');
    $('on-code').addEventListener('keydown', e => { if (e.key === 'Enter') this.onlineGo('join'); });
    $('lv-close').onclick = () => this.closeLevels();
    $('skins-close').onclick = () => this.closeSkins();
    $('set-close').onclick = () => this.closeSettings();
    $('set-sound').onclick = () => {
      Save.data.sound = !Save.data.sound; Sfx.setEnabled(Save.data.sound); Save.save(); Sfx.click(); this.refresh();
    };
    let confirm = false;
    $('set-reset').onclick = () => {
      if (!confirm) { confirm = true; $('set-reset').textContent = T('sure'); setTimeout(() => { confirm = false; $('set-reset').textContent = T('reset'); }, 2500); return; }
      confirm = false; $('set-reset').textContent = T('reset');
      Save.reset(); this.closeSettings(); Game.startLevel(1);
    };
    $('ov-btn').onclick = () => this.pressMain();
    $('bonus').onclick = () => this.claimBonus();
    const closers = { 'ov-skins': () => this.closeSkins(), 'ov-set': () => this.closeSettings(), 'ov-levels': () => this.closeLevels(), 'ov-online': () => this.cancelOnline() };
    for (const id in closers) {
      $(id).addEventListener('mousedown', e => { if (e.target === $(id)) closers[id](); });
    }

    // touch controls
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      this.touch = true; document.body.classList.add('touch'); $('shop').classList.add('hide'); $('skins-btn').classList.add('hide');
    }
    document.querySelectorAll('.tb').forEach(b => {
      const k = b.dataset.k;
      const set = v => { touchIn[k] = v; b.classList.toggle('on', v); };
      b.addEventListener('pointerdown', e => { Sfx.init(); set(true); b.setPointerCapture(e.pointerId); e.preventDefault(); });
      b.addEventListener('pointerup', () => set(false));
      b.addEventListener('pointercancel', () => set(false));
    });

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => { this.resize(); setTimeout(() => this.resize(), 120); setTimeout(() => this.resize(), 450); });
    window.addEventListener('pageshow', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { this.resize(); setTimeout(() => this.resize(), 200); }));
    ['pointerdown', 'touchend'].forEach(ev => window.addEventListener(ev, () => Sfx.init(), { passive: true }));
    document.addEventListener('contextmenu', e => { if (!e.target || e.target.tagName !== 'INPUT') e.preventDefault(); });
    this.resize();
  },

  resize() {
    const vv = window.visualViewport;
    const vw = Math.round((vv && vv.width) || window.innerWidth), vh = Math.round((vv && vv.height) || window.innerHeight);
    document.documentElement.style.height = document.body.style.height = vh + 'px';
    document.documentElement.style.width = document.body.style.width = vw + 'px';
    if (!this.probe) { this.probe = document.createElement('div'); this.probe.id = 'fsProbe'; document.body.appendChild(this.probe); }
    const cs = getComputedStyle(this.probe);
    const it = parseFloat(cs.paddingTop) || 0, ir = parseFloat(cs.paddingRight) || 0, ib = parseFloat(cs.paddingBottom) || 0, il = parseFloat(cs.paddingLeft) || 0;
    const aw = Math.max(50, vw - il - ir), ah = Math.max(50, vh - it - ib);
    const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    // a phone held upright: turn the whole stage 90 degrees so the game fills the screen instead of a thin strip
    const rotated = isTouch && ah > aw * 1.1;
    const sc = rotated ? Math.min(ah / 1034, aw / 580) : Math.min(aw / 1034, ah / 580);
    const cx = il + aw / 2, cy = it + ah / 2;
    this.stage.style.transform = rotated
      ? 'translate(' + (cx + 580 * sc / 2) + 'px,' + (cy - 1034 * sc / 2) + 'px) rotate(90deg) scale(' + sc + ')'
      : 'translate(' + (cx - 1034 * sc / 2) + 'px,' + (cy - 580 * sc / 2) + 'px) scale(' + sc + ')';
    document.body.classList.toggle('rotated', rotated);
    Game.res = Math.min(3, Math.max(1, sc * (window.devicePixelRatio || 1)));
    const cv = $('cv');
    cv.width = Math.round(1034 * Game.res); cv.height = Math.round(580 * Game.res);
    if (Game.bg) buildBackground();
  },

  goHome() {
    if (Net.active && !window.confirm(T('leaveSure'))) return;
    if (Net.active) Net.leave();
    location.href = '/';
  },
  toggleFullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } };
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (e) { /* ignore */ }
  },
  relang() {
    this.refresh();
    if (this.levelOpen) this.buildLevels();
    if (this.skinOpen) this.buildSkins();
    if (this.onlineOpen) this.buildOnlineWeapons();
    if (this.ovKind) this.showOverlay(this.ovKind, this.ovWon);
  },

  // ---------- shop ----------
  buildShop() {
    const shop = $('shop');
    shop.innerHTML = '';
    for (const w of WEAPONS) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = '<div class="nm">' + w.name + '</div><div class="pr"></div><canvas></canvas>';
      drawWeaponIcon(el.querySelector('canvas'), w, 130, 28);
      el.onclick = () => this.clickWeapon(w, el);
      shop.appendChild(el);
      this.cards[w.id] = el;
    }
  },
  clickWeapon(w, el) {
    const d = Save.data;
    Sfx.init();
    if (d.weapons.includes(w.id)) {
      d.weapon = d.weapon === w.id ? null : w.id; Sfx.click();
    } else if (w.unlockLevel) {
      Sfx.no(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return;
    } else if (d.skulls >= w.price) {
      d.skulls -= w.price; d.weapons.push(w.id); d.weapon = w.id; Sfx.coin();
    } else {
      Sfx.no(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return;
    }
    Save.save();
    Game.player.setWeapon(weaponById(d.weapon));
    this.refresh();
  },

  // ---------- skins ----------
  openSkins() {
    this.skinOpen = true; this.buildSkins(); $('ov-skins').classList.add('show'); this.syncPause();
  },
  closeSkins() { this.skinOpen = false; $('ov-skins').classList.remove('show'); this.syncPause(); },
  buildSkins() {
    const grid = $('skin-grid'); grid.innerHTML = '';
    const d = Save.data;
    for (const sk of SKINS) {
      const el = document.createElement('div');
      const owned = d.skins.includes(sk.id), eq = d.skin === sk.id;
      el.className = 'skin' + (owned ? ' owned' : '') + (eq ? ' equipped' : '') + (!owned && d.skulls < sk.price ? ' poor' : '');
      el.innerHTML = '<canvas width="180" height="240"></canvas><div>' + sk.name + '</div><div class="pr">' +
        (eq ? T('equipped') : owned ? T('owned') : '<svg><use href="#i-skull"/></svg>' + sk.price) + '</div>';
      this.drawSkinPreview(el.querySelector('canvas'), sk);
      el.onclick = () => {
        if (!owned) {
          if (d.skulls < sk.price) { Sfx.no(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
          d.skulls -= sk.price; d.skins.push(sk.id); Sfx.coin();
        } else Sfx.click();
        d.skin = sk.id; Save.save();
        const p = Game.player;
        p.color = sk.color; p.outline = sk.outline; p.hat = sk.hat;
        this.refresh(); this.buildSkins();
      };
      grid.appendChild(el);
    }
  },
  drawSkinPreview(cv, sk) {
    const c = cv.getContext('2d');
    c.scale(2, 2);
    c.translate(45, 114); c.scale(0.58, 0.58); c.translate(-45, -Game.GY);
    const f = new Fighter({ isPlayer: true, x: 45, face: 1, color: sk.color, outline: sk.outline, hat: sk.hat });
    f.draw(c, true);
  },

  // ---------- online ----------
  openOnline() {
    Sfx.click(); Sfx.init();
    this.onlineOpen = true;
    $('on-name').value = Net.name; $('on-server').value = Net.server; $('on-code').value = '';
    this.buildOnlineWeapons(); this.onlineStatus('');
    $('ov-online').classList.add('show'); this.syncPause();
  },
  closeOnline() { this.onlineOpen = false; $('ov-online').classList.remove('show'); this.syncPause(); },
  cancelOnline() { Net.cancel(); this.closeOnline(); },
  buildOnlineWeapons() {
    const box = $('on-weapons'); box.innerHTML = '';
    for (const w of [FISTS].concat(WEAPONS)) {
      const el = document.createElement('div');
      el.className = 'ow' + (Net.weapon === w.id || (!weaponById(Net.weapon) && w === FISTS) ? ' sel' : '');
      el.title = w.name;
      if (w.draw) { const cv = document.createElement('canvas'); drawWeaponIcon(cv, w, 60, 30); el.appendChild(cv); }
      else el.innerHTML = '<div class="fl">' + T('fists') + '</div>';
      el.onclick = () => {
        Sfx.click(); Net.weapon = w.id;
        box.querySelectorAll('.ow').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
      };
      box.appendChild(el);
    }
  },
  onlineGo(kind) {
    Sfx.click(); Sfx.init();
    Net.name = ($('on-name').value || '').trim().slice(0, 12) || Net.name;
    Net.server = ($('on-server').value || '').trim() || Net.server;
    let code = '';
    if (kind === 'join') {
      code = $('on-code').value.trim().toUpperCase();
      if (code.length !== 4) { this.onlineStatus(T('enterCode'), true); return; }
    }
    Net.start(kind, code);
  },
  onlineStatus(msg, isErr, code) {
    const el = $('on-status');
    el.className = isErr ? 'err' : '';
    if (code) el.innerHTML = T('roomHtml', code);
    else el.textContent = msg;
    $('online-box').classList.toggle('busy', !!msg && !isErr);
  },
  enterOnline() { document.body.classList.add('online'); this.refresh(); },
  exitOnline() { document.body.classList.remove('online'); this.hideOverlay(); this.refresh(); },
  setOverlaySub(t) { $('ov-sub').textContent = t; },

  // ---------- level select ----------
  openLevels() { this.levelOpen = true; this.buildLevels(); $('ov-levels').classList.add('show'); this.syncPause(); },
  closeLevels() { this.levelOpen = false; $('ov-levels').classList.remove('show'); this.syncPause(); },
  buildLevels() {
    const grid = $('lv-grid'); grid.innerHTML = '';
    const best = Save.data.best;
    $('lv-sub').textContent = T('unlocked', best, MAX_LEVEL);
    for (let n = 1; n <= MAX_LEVEL; n++) {
      const el = document.createElement('div');
      const locked = n > best;
      el.className = 'lv' + (locked ? ' locked' : '') + (n < best || (n === MAX_LEVEL && Save.data.won) ? ' done' : '') +
        (n % 5 === 0 ? ' boss' : '') + (n === Game.level ? ' cur' : '');
      const s = (Save.data.stars || {})[n] || 0;
      el.innerHTML = '<b>' + n + '</b>' + (s ? '<i>' + '&#9733;'.repeat(s) + '</i>' : '');
      if (!locked) el.onclick = () => { Sfx.click(); this.levelOpen = false; $('ov-levels').classList.remove('show'); Game.startLevel(n); };
      grid.appendChild(el);
    }
  },

  // ---------- settings / pause ----------
  openSettings() { this.setOpen = true; this.refresh(); $('ov-set').classList.add('show'); this.syncPause(); },
  closeSettings() { this.setOpen = false; $('ov-set').classList.remove('show'); this.syncPause(); },
  togglePause() {
    if (this.skinOpen) return this.closeSkins();
    if (this.setOpen) return this.closeSettings();
    if (this.levelOpen) return this.closeLevels();
    if (this.onlineOpen) return this.cancelOnline();
    if (Game.mode === 'online') return;           // no pausing a live match
    if (Game.state !== 'fight') return;
    this.userPaused = !this.userPaused;
    if (this.userPaused) this.showOverlay('pause'); else this.hideOverlay();
    this.syncPause();
  },
  syncPause() { Game.paused = !!(this.skinOpen || this.setOpen || this.levelOpen || this.onlineOpen || this.userPaused); },

  // ---------- main overlay ----------
  showOverlay(kind, won) {
    this.ovWon = won;
    this.ovKind = kind;
    const t = $('ov-title'), s = $('ov-sub'), b = $('ov-btn');
    $('ov-lv-btn').style.display = (kind === 'pause' || kind === 'oppleft' || kind === 'netdc') ? 'none' : '';
    $('ov-lv-btn').textContent = kind === 'netover' ? T('leave') : T('levels');
    const st = $('ov-stars');
    if (kind === 'win' || kind === 'champ') {      // (single-player only)
      st.innerHTML = [1, 2, 3].map(i => '<span class="' + (i <= Game.stars ? 'on' : '') + '" style="animation-delay:' + (0.15 + i * 0.2) + 's">&#9733;</span>').join('');
      st.style.display = '';
    } else st.style.display = 'none';
    if (kind === 'win') {
      t.textContent = T('lvComplete', Game.level); s.textContent = T('skullsEarned', Game.levelReward); b.textContent = T('nextLevel');
    } else if (kind === 'netover') {
      t.textContent = won ? T('victory') : T('defeat');
      s.textContent = T('finalScore', Net.scores[Net.idx], Net.scores[1 - Net.idx], Net.opp ? Net.opp.name : '');
      b.textContent = T('rematch');
    } else if (kind === 'oppleft') {
      t.textContent = T('oppLeft'); s.textContent = T('winDefault'); b.textContent = T('ok');
    } else if (kind === 'netdc') {
      t.textContent = T('disc'); s.textContent = T('lostSrv'); b.textContent = T('ok');
    } else if (kind === 'champ') {
      t.textContent = T('champ'); s.textContent = T('champSub', MAX_LEVEL, Game.levelReward); b.textContent = T('playAgain');
    } else if (kind === 'lose') {
      t.textContent = T('died'); s.textContent = T('diedSub'); b.textContent = T('retry');
    } else {
      t.textContent = T('paused'); s.textContent = ''; b.textContent = T('resume');
    }
    $('ov-main').classList.add('show');
  },
  hideOverlay() { this.ovKind = null; this.userPaused = false; $('ov-main').classList.remove('show'); this.syncPause(); },
  pressMain() {
    Sfx.init();
    if (this.skinOpen || this.setOpen || this.levelOpen || this.onlineOpen) return;
    if (this.ovKind === 'netover') { Sfx.click(); Net.rematch(); }
    else if (this.ovKind === 'oppleft' || this.ovKind === 'netdc') { Sfx.click(); Net.leave(); }
    else if (this.ovKind === 'win' || this.ovKind === 'champ') { Sfx.click(); Game.nextLevel(); }
    else if (this.ovKind === 'lose') { Sfx.click(); Game.retry(); }
    else if (this.ovKind === 'pause') { Sfx.click(); this.hideOverlay(); }
  },

  // ---------- bonus ----------
  claimBonus() {
    const d = Save.data;
    if (Date.now() < d.bonusAt) { Sfx.no(); return; }
    d.skulls += 100; d.bonusAt = Date.now() + 30000; Save.save(); Sfx.coin();
    Game.float(90, 70, '+100', '#ffd45a', 20);
    this.refresh();
  },

  // ---------- refresh ----------
  refresh() {
    const d = Save.data;
    const sn = $('skull-n');
    if (sn.textContent !== String(d.skulls)) {
      const first = sn.textContent === '0' && d.skulls === 0;
      sn.textContent = d.skulls;
      if (!first) { sn.classList.remove('bump'); void sn.offsetWidth; sn.classList.add('bump'); }
    }
    $('level-txt').textContent = Game.mode === 'online' ? T('onlineRound', Math.max(1, Net.round)) : T('levelN', Game.level);
    $('set-sound').textContent = d.sound ? T('on') : T('off');
    for (const w of WEAPONS) {
      if (w.unlockLevel && d.best >= w.unlockLevel && !d.weapons.includes(w.id)) { d.weapons.push(w.id); Save.save(); }
      const el = this.cards[w.id];
      const owned = d.weapons.includes(w.id), eq = d.weapon === w.id;
      const poor = w.unlockLevel ? true : d.skulls < w.price;
      el.className = 'card' + (owned ? ' owned' : '') + (eq ? ' equipped' : '') + (!owned && poor ? ' poor' : '');
      el.querySelector('.pr').innerHTML = eq ? T('equipped') : owned ? T('owned') :
        w.unlockLevel ? T('reach', w.unlockLevel) : '<svg><use href="#i-skull"/></svg>' + w.price;
    }
  },
  tick() {
    const left = Save.data.bonusAt - Date.now();
    const txt = left > 0 ? '0:' + String(Math.ceil(left / 1000)).padStart(2, '0') : '+100';
    if (txt !== this.lastBonusTxt) {
      this.lastBonusTxt = txt;
      $('bonus-t').textContent = txt;
      $('bonus').classList.toggle('cd', left > 0);
    }
  }
};

window.addEventListener('load', () => {
  Save.load();
  UI.init();
  Game.init();
  // the webfont may arrive late: redraw hat/label text with it automatically (canvas reads it each frame)
});
