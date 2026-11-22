'use strict';
/*
  Online 1v1 (best of 3).

  Netcode model (simple + responsive for a casual brawler):
   - Every client simulates ITS OWN fighter (input, physics, ragdoll) and streams the pose
     (11 joints + a few flags) ~30 times a second.
   - The opponent is rendered from those snapshots, interpolated ~90 ms in the past.
   - Hits are detected by the ATTACKER against the opponent's streamed pose and sent as a 'hit'
     message. The VICTIM applies damage/knock-back/blocking to its own fighter and reports
     back, so each player is authoritative over their own health.
   - A player whose fighter dies (or falls off) sends 'dead'; the server scores the round.
*/

const ONLINE_HP = 120;

const Net = {
  ws: null, hb: 0, status: 'idle',      // idle | connecting | searching | room | playing
  active: false,                         // inside a match
  idx: 0, code: '', opp: null, scores: [0, 0], round: 0, matchOver: false, rematchSent: false,
  snaps: [], sendT: 0, themeBase: 0,
  name: 'Player', weapon: 'katana', server: '',

  // ---------- settings ----------
  loadSettings() {
    const d = Save.data;
    this.name = d.netName || ('Player' + (100 + ((Math.random() * 900) | 0)));
    this.weapon = d.netWeapon || d.weapon || 'katana';
    this.server = d.netServer || (location.protocol === 'file:' ? 'localhost:5173' : location.host);
  },
  saveSettings() {
    const d = Save.data;
    d.netName = this.name; d.netWeapon = this.weapon; d.netServer = this.server; Save.save();
  },

  // ---------- connection ----------
  url(s) {
    s = s.trim();
    if (/^wss?:\/\//i.test(s)) return s;
    s = s.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + s;
  },
  connect(onOpen, onFail) {
    if (this.ws && this.ws.readyState === 1) { onOpen(); return; }
    this.closeWs();
    let ws, opened = false;
    try { ws = new WebSocket(this.url(this.server)); } catch (e) { onFail(T('badAddr')); return; }
    this.ws = ws; this.status = 'connecting';
    const timer = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { /* ignore */ } } }, 6000);
    ws.onopen = () => {
      opened = true; clearTimeout(timer);
      this.hb = setInterval(() => this.send({ t: 'ping' }), 15000);
      onOpen();
    };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!m || typeof m.t !== 'string' || m.t.indexOf('sk_') !== 0) return; m.t = m.t.slice(3); this.onMsg(m); };
    ws.onerror = () => { /* handled by onclose */ };
    ws.onclose = () => {
      clearTimeout(timer); clearInterval(this.hb);
      const current = this.ws === ws;
      if (!opened) { if (current) this.ws = null; this.status = 'idle'; onFail(T('cannotReach', this.server)); }
      else if (current) { this.ws = null; this.onClosed(); }
    };
  },
  closeWs() {
    const ws = this.ws; this.ws = null; clearInterval(this.hb);
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } }
  },
  send(o) {
    if (this.ws && this.ws.readyState === 1) { const t0 = o.t; o.t = 'sk_' + t0; const s = JSON.stringify(o); o.t = t0; this.ws.send(s); }   // messages of this game are namespaced 'sk_' on the Alex Games server
  },
  profile() { return { name: this.name, weapon: this.weapon, skin: Save.data.skin }; },

  // ---------- lobby actions ----------
  start(kind, code) {
    this.saveSettings();
    UI.onlineStatus(T('connecting'));
    this.connect(() => {
      const p = this.profile();
      if (kind === 'quick') this.send(Object.assign({ t: 'quick' }, p));
      else if (kind === 'create') this.send(Object.assign({ t: 'create' }, p));
      else this.send(Object.assign({ t: 'join', code }, p));
    }, msg => UI.onlineStatus(msg, true));
  },
  cancel() {            // leave lobby / queue without being in a match
    if (this.active) return;
    this.send({ t: 'leave' }); this.closeWs(); this.status = 'idle';
  },
  leave() {
    this.send({ t: 'leave' }); this.closeWs();
    this.active = false; this.status = 'idle'; this.matchOver = false; this.rematchSent = false; this.snaps.length = 0;
    if (Game.mode === 'online') {
      Game.mode = 'single'; Game.remote = null; Game.lock = 0;
      UI.exitOnline();
      Game.startLevel(Save.data.level);
    }
  },
  rematch() {
    if (this.rematchSent) return;
    this.rematchSent = true; this.send({ t: 'rematch' }); UI.setOverlaySub(T('waitOpp'));
  },

  // ---------- messages ----------
  onMsg(m) {
    const G = Game;
    switch (m.t) {
      case 'wait': this.status = 'searching'; UI.onlineStatus(T('searching')); break;
      case 'created': this.status = 'room'; this.code = m.code; UI.onlineStatus(T('roomShort', m.code), false, m.code); break;
      case 'error': this.status = 'idle'; UI.onlineStatus(m.code === 'full' ? T('errFull') : m.code === 'notfound' ? T('errNotFound') + ' ' + (m.room || '') : (m.msg || ''), true); break;
      case 'matched': this.beginMatch(m); break;
      case 'round':
        this.scores = m.scores || [0, 0]; this.matchOver = false; this.rematchSent = false;
        G.startOnlineRound(m.n);
        break;
      case 'roundover': this.onRoundOver(m); break;
      case 's': this.snaps.push({ at: performance.now(), m }); if (this.snaps.length > 12) this.snaps.shift(); break;
      case 'hit': this.receiveHit(m); break;
      case 'hitres': this.onHitRes(m); break;
      case 'dead': this.onRemoteDead(); break;
      case 'rematchreq': if (!this.rematchSent) UI.setOverlaySub(T('wantsRematch')); break;
      case 'oppleft': this.onOppLeft(); break;
    }
  },
  onClosed() {
    this.status = 'idle';
    if (this.active) UI.showOverlay('netdc');
    else UI.onlineStatus(T('connLost'), true);
  },

  beginMatch(m) {
    const G = Game;
    this.active = true; this.status = 'playing'; this.idx = m.idx; this.opp = m.opp; this.code = m.code;
    this.scores = [0, 0]; this.round = 0; this.matchOver = false; this.rematchSent = false; this.snaps.length = 0;
    let h = 0; for (const ch of m.code) h += ch.charCodeAt(0);
    this.themeBase = h % 10;
    G.mode = 'online'; G.state = 'net-wait'; G.fighters.length = 0; G.remote = null; G.lock = 0;
    UI.closeOnline(); UI.enterOnline();
    G.banners.length = 0; G.banner(T('matchFound'), '#ffd45a', 40, 80, T('vs', m.opp.name), 150, false);
  },

  onRoundOver(m) {
    const G = Game;
    this.scores = m.scores;
    const won = m.winner === this.idx;
    G.state = 'net-between';
    G.banners.length = 0;
    G.banner(won ? T('roundWon') : T('roundLost'), won ? '#ffd45a' : '#ff6b5e', 54, 160, this.scores[this.idx] + ' - ' + this.scores[1 - this.idx], 120, true);
    G.flash = 0.35;
    if (m.over) {
      this.matchOver = true;
      setTimeout(() => { if (this.active && this.matchOver) { won ? Sfx.win() : Sfx.lose(); UI.showOverlay('netover', won); } }, 1700);
    }
  },

  onOppLeft() {
    if (!this.active) { UI.onlineStatus(T('oppLeftS'), true); return; }
    this.matchOver = true;
    UI.showOverlay('oppleft');
  },

  onRemoteDead() {
    const r = Game.remote;
    if (!r || r.dead) return;
    r.dead = true; r.hp = 0; r.deadT = 0; Sfx.die(); Game.flash = 0.4;
  },

  // ---------- combat ----------
  receiveHit(m) {
    const G = Game, d = G.player;
    if (!d || d.dead || d.invuln > 0 || G.lock > 0 || G.state !== 'fight') return;
    const res = resolveHit(G.remote, d, m.dir, m.dmg, m.kb, m.part, m.ix, m.iy);
    this.send({ t: 'hitres', dmg: +res.dmg.toFixed(1), blocked: res.blocked ? 1 : 0, ix: m.ix, iy: m.iy });
  },
  onHitRes(m) {
    const G = Game;
    if (G.remote) G.remote.invuln = 0;
    G.float(m.ix, m.iy - 18, '-' + Math.max(1, Math.round(m.dmg)), m.blocked ? '#ffe28a' : '#ffffff', 15);
    if (m.blocked) { Sfx.block(); G.impact(m.ix, m.iy, '#ffe28a', false); }
  },

  // ---------- state sync ----------
  tick() {
    const G = Game;
    if (G.lock > 0) {
      G.lock--;
      if (G.lock === 180 || G.lock === 120 || G.lock === 60) {
        G.banners.length = 0; G.banner(String(G.lock / 60), '#ffffff', 96, 50, null, 150, false);
      } else if (G.lock === 0) {
        G.banners.length = 0; G.banner(T('fight'), '#ffd45a', 72, 50, null, 150, false);
      }
    }
    if (++this.sendT >= 2 && G.player) { this.sendT = 0; this.sendState(G.player); }
  },

  sendState(f) {
    const p = [];
    for (const q of f.pts) p.push(Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10);
    this.send({
      t: 's', p, f: f.face, w: Math.round(f.wAng * 1000) / 1000, b: Math.round(f.nBend * 100) / 100,
      r: f.ragdoll ? 1 : 0, k: f.block ? 1 : 0, h: Math.round(f.hp * 10) / 10,
      u: f.atk ? Math.round(f.atk.t / f.atk.dur * 1000) / 1000 : -1, ar: f.atk ? f.atk.arm : 1, ai: f.atk ? f.atk.id : 0
    });
  },

  applyRemote(f) {
    const S = this.snaps;
    if (!S.length) return;
    const rt = performance.now() - 90;
    while (S.length > 2 && S[1].at <= rt) S.shift();
    const a = S[0], b = S[1] || null;
    const k = b ? clamp((rt - a.at) / Math.max(1, b.at - a.at), 0, 1) : 0;
    const pa = a.m.p, pb = b ? b.m.p : pa;
    for (let i = 0; i < 11; i++) {
      const q = f.pts[i];
      q.x = lerp(pa[i * 2], pb[i * 2], k); q.y = lerp(pa[i * 2 + 1], pb[i * 2 + 1], k);
      q.px = q.x; q.py = q.y;
    }
    const m = (b && k >= 0.5) ? b.m : a.m;
    f.face = m.f; f.wAng = m.w; f.nBend = m.b; f.ragdoll = !!m.r; f.block = !!m.k;
    if (m.h < f.hp - 0.01) f.hurtFlash = 6;
    if (!f.dead) f.hp = m.h;
    const w = f.weapon || FISTS;
    if (m.u >= 0) {
      f.atk = { t: m.u * w.dur, dur: w.dur, arm: m.ar, id: m.ai, active: m.u >= WIND && m.u < SE, hit: new Set() };
    } else f.atk = null;
    f.cx = f.pts[2].x; f.cy = f.pts[2].y;
  }
};

// ---------------------------------------------------------------------
//  Starting a round
// ---------------------------------------------------------------------
Game.startOnlineRound = function (n) {
  const G = this;
  G.mode = 'online'; Net.round = n; Net.snaps.length = 0;
  G.fighters.length = 0; G.parts.length = 0; G.floats.length = 0; G.rings.length = 0; G.banners.length = 0;
  G.engaged = true; G.hint = 2; G.endT = 0; G.shake = 0; G.hitstop = 0; G.slowT = 0; G.glow = 0; G.flash = 0;
  G.sceneOverride = 1 + ((Net.themeBase * 7 + n * 13) % 100);   // a different world every round

  const left = Net.idx === 0;
  const sk = skinById(Save.data.skin), os = skinById(Net.opp.skin);
  const me = new Fighter({
    isPlayer: true, x: left ? 410 : 660, face: left ? 1 : -1, color: sk.color, outline: sk.outline, hat: sk.hat,
    weapon: weaponById(Net.weapon), maxHp: ONLINE_HP, speed: 3.6
  });
  const same = os.id === sk.id;     // tint the opponent if we picked the same skin
  const op = new Fighter({
    x: left ? 660 : 410, face: left ? -1 : 1, remote: true, label: Net.opp.name,
    color: same ? mix(os.color, '#ffa8a0', 0.4) : os.color, outline: same ? mix(os.outline, '#c46a5a', 0.5) : os.outline, hat: os.hat,
    weapon: weaponById(Net.opp.weapon), maxHp: ONLINE_HP
  });
  G.player = me; G.remote = op; G.fighters.push(me, op); G.startX = me.cx;
  G.state = 'fight'; G.lock = 190; Net.sendT = 0;
  buildBackground();
  UI.hideOverlay(); UI.refresh();
};
