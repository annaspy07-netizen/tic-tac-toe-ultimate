'use strict';

const SKINS = [
  { id: 'classic', name: 'CLASSIC', price: 0,   color: '#f2f2f2', outline: '#b4b4b4', hat: null },
  { id: 'ronin',   name: 'RONIN',   price: 100, color: '#f2f2f2', outline: '#b4b4b4', hat: 'straw' },
  { id: 'ninja',   name: 'NINJA',   price: 150, color: '#5b6374', outline: '#2c313b', hat: 'band' },
  { id: 'knight',  name: 'KNIGHT',  price: 200, color: '#cfd6de', outline: '#8c96a3', hat: 'helmet' },
  { id: 'frost',   name: 'FROST',   price: 250, color: '#a6dcff', outline: '#5da6d6', hat: null },
  { id: 'crimson', name: 'CRIMSON', price: 250, color: '#ff8a8a', outline: '#c24d4d', hat: 'band' },
  { id: 'emperor', name: 'EMPEROR', price: 400, color: '#ffd45a', outline: '#c9962a', hat: 'crown' }
];
const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];

const MAX_LEVEL = 100;

// How many enemies / is it a boss level
function levelConfig(n) {
  const boss = n % 5 === 0;
  const final = n === MAX_LEVEL;
  let count;
  if (boss) count = 1 + (n >= 50 ? 2 : n >= 10 ? 1 : 0);
  else count = n < 8 ? 1 : n < 30 ? 2 : 3;
  return { boss, final, count };
}

const Save = {
  key: 'stickman_battle_v1',
  data: { skulls: 0, level: 1, best: 1, won: false, stars: {}, weapons: [], weapon: null, skins: ['classic'], skin: 'classic', sound: true, tut: false, bonusAt: 0 },
  load() {
    try { const s = localStorage.getItem(this.key); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) { /* ignore */ }
    this.data.best = clamp(Math.max(this.data.best || 1, this.data.level || 1), 1, MAX_LEVEL);
    this.data.level = clamp(this.data.level || 1, 1, MAX_LEVEL);
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },
  reset() {
    this.data = { skulls: 0, level: 1, best: 1, won: false, stars: {}, weapons: [], weapon: null, skins: ['classic'], skin: 'classic', sound: this.data.sound, tut: false, bonusAt: 0 };
    this.save();
  }
};

const Game = {
  W: 1034, H: 580, GY: 408, PL: 200, PR: 930,
  state: 'fight', paused: false, level: 1,
  fighters: [], player: null, parts: [], floats: [], motes: [],
  shake: 0, hitstop: 0, slowT: 0, slowScale: 1, frame: 0, res: 1,
  hint: 2, engaged: false, levelReward: 0, endT: 0, startX: 0, glow: 0,

  onPlatform(x) { return x > this.PL - 4 && x < this.PR + 4; },

  init() {
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    for (let i = 0; i < 46; i++) {
      this.motes.push({ x: rnd(0, 1034), y: rnd(0, 580), r: rnd(0.8, 2.2), a: rnd(0.12, 0.55), vx: rnd(-0.1, 0.1), vy: rnd(-0.14, 0.03) });
    }
    for (let i = 0; i < 12; i++) {   // big soft bokeh
      this.motes.push({ x: rnd(0, 1034), y: rnd(0, 580), r: rnd(7, 18), a: rnd(0.025, 0.06), vx: rnd(-0.05, 0.05), vy: rnd(-0.08, 0.0), big: true });
    }
    bindInput();
    this.startLevel(Save.data.level);
    requestAnimationFrame(loop);
  },

  // ---------- levels ----------
  startLevel(n) {
    n = clamp(Math.floor(n) || 1, 1, MAX_LEVEL);
    this.level = n; Save.data.level = n;
    Save.data.best = Math.max(Save.data.best, n); Save.save();
    this.fighters.length = 0; this.parts.length = 0; this.floats.length = 0;
    this.engaged = false;
    this.levelReward = 0; this.endT = 0; this.shake = 0; this.hitstop = 0; this.slowT = 0; this.glow = 0;

    // the hero grows stronger with every level
    const skin = skinById(Save.data.skin);
    const p = new Fighter({
      isPlayer: true, x: 410, face: 1, color: skin.color, outline: skin.outline, hat: skin.hat,
      weapon: weaponById(Save.data.weapon), maxHp: 100 + 3 * (n - 1), dmgMul: 1 + 0.02 * (n - 1), speed: 3.6
    });
    this.player = p; this.fighters.push(p);
    this.startX = p.cx;

    const cfg = levelConfig(n);
    const tier = Math.floor((n - 1) / 10);
    const hats = ['straw', 'band', 'helmet', null];
    if (n >= 60) hats.push('horn');
    for (let i = 0; i < cfg.count; i++) {
      const isBoss = cfg.boss && i === 0;
      let wi = Math.floor(n / 6) - 1 + (Math.random() < 0.4 ? 1 : 0) + (isBoss ? 2 : 0);
      if (n <= 2) wi = -1;
      wi = clamp(wi, -1, WEAPONS.length - 1);
      const bossScale = cfg.final ? 1.5 : 1.25 + 0.0015 * n;
      const e = new Fighter({
        x: cfg.count === 1 ? 660 : 590 + i * (cfg.count > 3 ? 82 : 90), face: -1, boss: isBoss,
        label: isBoss && cfg.final ? 'KING' : null, scale: isBoss ? bossScale : 1,
        color: isBoss ? '#ffdede' : mix('#ebebeb', '#ffa08f', tier * 0.05),
        outline: isBoss ? '#c98a8a' : mix('#aaaaaa', '#c46a5a', tier * 0.05),
        hat: isBoss ? (cfg.final ? 'crown' : 'horn') : (n === 1 ? 'straw' : hats[(Math.random() * hats.length) | 0]),
        weapon: wi < 0 ? null : WEAPONS[wi],
        maxHp: Math.round((30 + 5 * n) * (isBoss ? 2.4 : 1)),
        dmgMul: (0.6 + 0.009 * n) * (isBoss ? 1.2 : 1),
        speed: Math.min(3.4, 2.0 + 0.016 * n) * (isBoss ? 0.88 : 1),
        kbRes: isBoss ? 1.8 : 1,
        poise: isBoss ? 0.55 : Math.min(0.5, 0.006 * n),
        reward: (15 + 2 * n) * (isBoss ? 3 : 1)
      });
      e.ai = {
        cd: 50 + rnd(0, 50), blockT: 0, blockChance: Math.min(0.32, 0.03 + 0.003 * n),
        cdMin: Math.max(14, 60 - n * 0.45), cdVar: Math.max(25, 55 - n * 0.25)
      };
      this.fighters.push(e);
    }
    this.state = 'fight';
    this.hint = (n === 1 && !Save.data.tut && !UI.touch) ? 0 : 2;
    this.rings.length = 0; this.flash = 0; this.sceneOverride = null;
    buildBackground(); introBanner(n, cfg);
    UI.hideOverlay(); UI.refresh();
  },
  nextLevel() {
    if (this.level >= MAX_LEVEL) return this.startLevel(1);
    this.startLevel(this.level + 1);
  },
  retry() { this.startLevel(this.level); },

  // ---------- fx ----------
  spark(x, y, n, col, pw, dir) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = rnd(1, pw);
      this.parts.push({ x, y, vx: Math.cos(a) * sp + (dir || 0) * pw * 0.45, vy: Math.sin(a) * sp - 1, life: rnd(14, 30), max: 30, size: rnd(1.5, 3.4), col, g: 0.18, glow: true });
    }
  },
  dust(x, y) {
    for (let i = 0; i < 8; i++) this.parts.push({ x: x + rnd(-14, 14), y: y - 2, vx: rnd(-1.4, 1.4), vy: rnd(-1.2, -0.2), life: rnd(16, 28), max: 28, size: rnd(2, 4), col: '#b5b5b5', g: 0.02 });
  },
  float(x, y, txt, col, size) { this.floats.push({ x, y, txt, col, size: size || 16, t: 0 }); },
  slow(frames, scale) { if (this.mode === 'online') return; this.slowT = frames; this.slowScale = scale; },
  mode: 'single', lock: 0, remote: null,
};

// =====================================================================
//  Input
// =====================================================================
const keys = {};
const touchIn = { l: false, r: false, jump: false, attack: false, block: false };
let mouseL = false, mouseR = false;

function bindInput() {
  const prevent = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;       // typing a name / room code
    if (prevent.includes(e.code)) e.preventDefault();
    Sfx.init();
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    if (e.code === 'KeyP' || e.code === 'Escape') UI.togglePause();
    if (e.code === 'Enter') UI.pressMain();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
  const cv = Game.cv;
  cv.addEventListener('mousedown', e => { Sfx.init(); if (e.button === 0) mouseL = true; else if (e.button === 2) mouseR = true; });
  window.addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; else if (e.button === 2) mouseR = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

function readPlayerInput() {
  const p = Game.player, i = p.input;
  i.l = !!(keys.KeyA || keys.ArrowLeft || touchIn.l);
  i.r = !!(keys.KeyD || keys.ArrowRight || touchIn.r);
  i.jump = !!(keys.KeyW || keys.ArrowUp || keys.Space || touchIn.jump);
  i.attack = !!(keys.KeyJ || keys.KeyX || keys.KeyZ || mouseL || touchIn.attack);
  i.block = !!(keys.KeyK || keys.KeyS || keys.ArrowDown || keys.KeyC || mouseR || touchIn.block);
  if (Game.lock > 0) { i.l = i.r = i.jump = i.attack = i.block = false; return; }   // online countdown
  if (p.dead) return;
  // enemies wait in the "lobby" until the player makes the first move
  if (!Game.engaged && (i.l || i.r || i.jump || i.attack || i.block)) {
    Game.engaged = true;
    if (Game.state === 'fight') { Game.banners.length = 0; Game.banner(T('fight'), '#ffd45a', 40, 46, null, 84, false); }
  }
  if (!p.ragdoll && p.stun <= 0 && !p.atk) {
    if (i.r && !i.l) p.face = 1;
    else if (i.l && !i.r) p.face = -1;
    else {
      let best = null, bd = 1e9;
      for (const e of Game.fighters) {
        if (e.isPlayer || e.dead) continue;
        const d = Math.abs(e.cx - p.cx);
        if (d < bd) { bd = d; best = e; }
      }
      if (best && bd < 420) p.face = best.cx > p.cx ? 1 : -1;
    }
  }
}

// =====================================================================
//  Enemy AI
// =====================================================================
function aiThink(e) {
  const p = Game.player, inp = e.input, ai = e.ai;
  inp.l = inp.r = inp.jump = inp.block = inp.attack = false;
  if (e.dead || e.ragdoll || p.dead) return;
  const dx = p.cx - e.cx, dist = Math.abs(dx);
  const canAct = e.stun <= 0 && e.recover <= 0;
  if (canAct && !e.atk) e.face = dx >= 0 ? 1 : -1;
  if (!canAct) return;
  if (!Game.engaged) return;   // stand idle until the fight starts
  const reach = e.attackReach();
  ai.cd--; if (ai.blockT > 0) ai.blockT--;

  // react to the player's attack by blocking
  if (p.atk && p.atk.t < p.atk.dur * 0.55 && dist < reach + 70 && ai.blockT <= 0 && !e.atk && Math.random() < ai.blockChance) {
    ai.blockT = 22 + ((Math.random() * 20) | 0);
  }
  if (ai.blockT > 0 && !e.atk) { inp.block = true; return; }

  const edgeL = e.cx < Game.PL + 36, edgeR = e.cx > Game.PR - 36;
  if (dist > reach * 0.9) {
    if (dx > 0 && !edgeR) inp.r = true; else if (dx < 0 && !edgeL) inp.l = true;
  } else if (dist < reach * 0.4 && !e.atk) {
    if (dx > 0 && !edgeL) inp.l = true; else if (dx < 0 && !edgeR) inp.r = true;
  }
  if (!e.atk && ai.cd <= 0 && dist <= reach && Math.abs(p.cy - e.cy) < 90) {
    inp.attack = true; ai.cd = ai.cdMin + Math.random() * ai.cdVar;
  }
}

// =====================================================================
//  Combat
// =====================================================================
function segD2(x, y, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y;
  let t = ((x - a.x) * abx + (y - a.y) * aby) / (abx * abx + aby * aby || 1);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = x - (a.x + abx * t), dy = y - (a.y + aby * t);
  return dx * dx + dy * dy;
}

function testHit(a, d) {
  const w = a.weapon || FISTS, s = a.s;
  const cur = a.weaponBase(), prev = a.prevB || cur;
  const P = d.pts, ds = d.s;
  const hr = d.headR, tr = 11 * ds, lr = 7 * ds;
  let best = null, pri = 0;
  const check = (x, y, r) => {
    let dx = x - P[0].x, dy = y - P[0].y, rr = hr + r;
    if (dx * dx + dy * dy <= rr * rr) { if (pri < 3) { pri = 3; best = { part: 'head', x, y }; } return; }
    if (pri >= 2) return;
    rr = tr + r;
    if (segD2(x, y, P[1], P[2]) <= rr * rr) { pri = 2; best = { part: 'body', x, y }; return; }
    if (pri >= 1) return;
    rr = (lr + r) * (lr + r);
    if (segD2(x, y, P[2], P[7]) <= rr || segD2(x, y, P[7], P[8]) <= rr ||
        segD2(x, y, P[2], P[9]) <= rr || segD2(x, y, P[9], P[10]) <= rr ||
        segD2(x, y, P[1], P[3]) <= rr || segD2(x, y, P[3], P[4]) <= rr ||
        segD2(x, y, P[1], P[5]) <= rr || segD2(x, y, P[5], P[6]) <= rr) { pri = 1; best = { part: 'limb', x, y }; }
  };
  const rad = (w.type === 'punch' ? 11 : w.thick / 2 + 3) * s;
  for (const k of [0, 0.5, 1]) {
    const hx = lerp(prev.x, cur.x, k), hy = lerp(prev.y, cur.y, k);
    if (w.type === 'punch') { check(hx, hy, rad); continue; }
    const ang = lerp(prev.a, cur.a, k);
    const ux = Math.cos(ang), uy = Math.sin(ang), L = w.len * s;
    for (let t = 0; t <= L; t += 9) check(hx + ux * t, hy + uy * t, rad);
    check(hx + ux * L, hy + uy * L, rad);
  }
  return best;
}

function impulse(d, ix, iy, vx, vy, k) {
  for (const p of d.pts) {
    const near = Math.hypot(p.x - ix, p.y - iy) < 45 ? 1 : 0.6;
    p.px -= vx * near * k; p.py -= vy * near * k;
  }
}

// Attacker side: work out the raw damage of a successful weapon hit.
function rollHit(att, d, part) {
  const w = att.weapon || FISTS;
  const dir = d.pts[2].x >= att.pts[2].x ? 1 : -1;
  let dmg = w.dmg * att.dmgMul * rnd(0.9, 1.1);
  if (part === 'head') dmg *= 1.5; else if (part === 'limb') dmg *= 0.8;
  return { dir, dmg, kb: w.kb };
}

function applyHit(att, d, part, ix, iy) {
  att.atk.hit.add(d);
  const r = rollHit(att, d, part);
  return resolveHit(att, d, r.dir, r.dmg, r.kb, part, ix, iy);
}

// Defender side: block, damage, knock-back. Returns { dmg, blocked } (used by online mode).
function resolveHit(att, d, dir, dmg, kb, part, ix, iy) {
  const G = Game;
  kb = kb / d.kbRes;
  const blocked = d.block && !d.ragdoll && d.face === -dir && d.ctrl > 0.5;
  if (blocked) { dmg *= 0.15; kb *= 0.4; }

  d.hp -= dmg; d.lastHitBy = att; d.invuln = 8; d.hurtFlash = blocked ? 0 : 6;
  const crit = part === 'head' && !blocked;
  G.float(ix, iy - 18, '-' + Math.max(1, Math.round(dmg)), blocked ? '#ffe28a' : (crit ? '#ffd45a' : '#ffffff'), crit ? 20 : 15);
  const res = { dmg, blocked };

  if (blocked) {
    Sfx.block(); G.spark(ix, iy, 8, '#ffe28a', 5, dir); G.impact(ix, iy, '#ffe28a', false);
    d.blockFlash = 8; d.vx += dir * kb * 2.2;
    G.shake = Math.max(G.shake, 2); if (G.mode !== 'online') G.hitstop = Math.max(G.hitstop, 2);
    return res;
  }
  Sfx.hit(kb);
  G.impact(ix, iy, crit ? '#ffd45a' : '#ffffff', kb >= 1.6 || crit);
  G.spark(ix, iy, 10 + (crit ? 6 : 0), crit ? '#ffd45a' : '#ffffff', 4 + kb * 2, dir);
  G.shake = Math.max(G.shake, Math.min(12, 3 + kb * 3 + (crit ? 2 : 0)));
  if (G.mode !== 'online') G.hitstop = Math.max(G.hitstop, dmg > 14 ? 4 : 2);

  if (d.hp <= 0) {
    if (G.mode !== 'online') G.hitstop = Math.max(G.hitstop, 6);
    killFighter(d, dir, kb, false);
    return res;
  }
  const knock = kb >= 1.6 || (part === 'head' && kb >= 1.15);
  // poise: tougher enemies sometimes shrug off light hits mid-attack (no flinch)
  const poise = d.poise || (d.isPlayer && d.weapon && d.weapon.dur >= 44 ? 0.5 : 0);   // heavy weapons are hard to interrupt
  if (!knock && !d.ragdoll && d.atk && d.atk.t / d.atk.dur >= WIND * 0.6 && Math.random() < poise) return res;
  d.atk = null; d.atkBuf = 0;
  if (d.ragdoll) {
    impulse(d, ix, iy, dir * kb * 3.4, -kb * 1.2, 1);
  } else if (knock) {
    d.startRagdoll(50 + kb * 16);
    impulse(d, ix, iy, dir * kb * 4.2, -kb * 2.6, 1);
  } else {
    d.stun = 12 + kb * 10;
    d.vx += dir * kb * 3.2;
    if (d.onGround) { d.vy = -kb * 2.2; d.onGround = false; }
    impulse(d, ix, iy, dir * kb * 1.6, 0, 1);
  }
  return res;
}

// Online: the attacker detected a hit on the remote fighter -> tell the opponent, who is
// authoritative for their own health. Only cosmetic effects happen locally.
function netHit(att, d, part, ix, iy) {
  const G = Game;
  att.atk.hit.add(d);
  const r = rollHit(att, d, part);
  Net.send({ t: 'hit', dmg: +r.dmg.toFixed(1), kb: r.kb, dir: r.dir, part, ix: Math.round(ix), iy: Math.round(iy) });
  const crit = part === 'head';
  Sfx.hit(r.kb);
  G.impact(ix, iy, crit ? '#ffd45a' : '#ffffff', r.kb >= 1.6 || crit);
  G.spark(ix, iy, 10 + (crit ? 6 : 0), crit ? '#ffd45a' : '#ffffff', 4 + r.kb * 2, r.dir);
  G.shake = Math.max(G.shake, Math.min(12, 3 + r.kb * 3));
  d.invuln = 6;   // avoid double-sending while the opponent's reply is in flight
}

function killFighter(d, dir, kb, fell) {
  const G = Game;
  d.die();
  if (!fell) {
    const vx = dir * (4 + kb * 3.5), vy = -(4 + kb * 2.5);
    for (const p of d.pts) { p.px = p.x - vx * rnd(0.8, 1.2); p.py = p.y - vy * rnd(0.8, 1.2); }
  }
  Sfx.die();
  if (G.mode === 'online') {            // the victim reports their own death; the server decides the round
    if (d === G.player) Net.send({ t: 'dead' });
    return;
  }
  if (!d.isPlayer) {
    Save.data.skulls += d.reward; G.levelReward += d.reward; Save.save();
    const hp = d.pts[2];
    G.float(clamp(hp.x, 60, 980), Math.min(hp.y - 50, 520), '+' + d.reward, '#ffd45a', 22);
    UI.refresh();
    if (!G.fighters.some(f => !f.isPlayer && !f.dead)) {
      G.slow(70, 0.3); G.flash = 0.55;
      G.banners.length = 0; G.banner(T('ko'), '#ff6b5e', 84, 90, null, 160, true);
    }
  } else {
    G.slow(60, 0.35);
  }
}

function combat() {
  const G = Game;
  for (const a of G.fighters) {
    if (a.remote || a.dead || a.ragdoll || !a.atk || !a.atk.active) continue;
    for (const d of G.fighters) {
      if (d === a || d.team === a.team || d.dead) continue;
      if (a.atk.hit.has(d) || d.invuln > 0) continue;
      const r = testHit(a, d);
      if (!r) continue;
      if (d.remote) netHit(a, d, r.part, r.x, r.y);
      else { applyHit(a, d, r.part, r.x, r.y); if (!a.atk) break; }
    }
  }
}

function separate() {
  const F = Game.fighters;
  for (let i = 0; i < F.length; i++) {
    for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j];
      if (a.ragdoll || b.ragdoll) continue;
      const d = b.cx - a.cx, min = 46 * (a.s + b.s) / 2;
      if (Math.abs(d) < min && Math.abs(a.cy - b.cy) < 60) {
        const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
        a.cx -= push; b.cx += push;
      }
    }
  }
}

// =====================================================================
//  Main step
// =====================================================================
function step() {
  const G = Game;
  if (G.hitstop > 0 && G.mode !== 'online') { G.hitstop--; return; }
  G.frame++;
  const p = G.player;

  readPlayerInput();
  for (const f of G.fighters) if (!f.isPlayer && !f.remote) aiThink(f);
  for (const f of G.fighters) f.update();
  separate();
  combat();

  // ring-out (the remote fighter reports its own fall)
  for (const f of G.fighters) {
    if (!f.out && !f.remote && f.pts[2].y > 640) {
      f.out = true;
      if (!f.dead) { f.hp = 0; killFighter(f, 0, 0, true); }
    }
  }
  if (G.mode === 'online') Net.tick();

  // tutorial hints
  if (G.hint === 0 && Math.abs(p.cx - G.startX) > 70) G.hint = 1;
  if (G.hint === 1 && p.atk) { G.hint = 2; Save.data.tut = true; Save.save(); }

  // fx
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.x += q.vx; q.y += q.vy; q.vx *= 0.97; q.vy += q.g;
    if (--q.life <= 0) G.parts.splice(i, 1);
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const q = G.floats[i]; q.t++; q.y -= 0.7;
    if (q.t > 55) G.floats.splice(i, 1);
  }
  for (let i = G.rings.length - 1; i >= 0; i--) { if (++G.rings[i].t >= G.rings[i].life) G.rings.splice(i, 1); }
  for (let i = G.banners.length - 1; i >= 0; i--) { if (++G.banners[i].t >= G.banners[i].dur) G.banners.splice(i, 1); }
  G.flash *= 0.9;
  ambientStep();
  for (const m of G.motes) {
    m.x += m.vx; m.y += m.vy;
    if (m.x < -5) m.x = 1040; if (m.x > 1040) m.x = -5; if (m.y < -5) m.y = 585; if (m.y > 585) m.y = -5;
  }
  G.shake *= 0.86; if (G.shake < 0.2) G.shake = 0;

  // win / lose (single player; online rounds are decided by the server)
  if (G.mode !== 'online' && G.state === 'fight') {
    if (p.dead) {
      if (++G.endT > 70) { G.state = 'lose'; Sfx.lose(); UI.showOverlay('lose'); }
    } else if (!G.fighters.some(f => !f.isPlayer && !f.dead)) {
      if (++G.endT > 60) {
        G.state = 'win'; Sfx.win();
        Save.data.best = Math.max(Save.data.best, Math.min(MAX_LEVEL, G.level + 1));
        if (G.level >= MAX_LEVEL) Save.data.won = true;
        const ratio = p.hp / p.maxHp;
        G.stars = ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
        Save.data.stars = Save.data.stars || {};
        Save.data.stars[G.level] = Math.max(Save.data.stars[G.level] || 0, G.stars);
        Save.save();
        UI.showOverlay(G.level >= MAX_LEVEL ? 'champ' : 'win');
      }
    }
  }
  if (G.state === 'win') G.glow = Math.min(1, G.glow + 0.03);
}

let lastT = 0, acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const G = Game;
  let dt = Math.min(0.1, (now - lastT) / 1000 || 0.016);
  lastT = now;
  if (!G.paused) {
    let ts = 1;
    if (G.slowT > 0) { G.slowT -= dt * 60; ts = G.slowScale; }
    acc += dt * ts;
    let n = 0;
    while (acc >= 1 / 60 && n++ < 5) { step(); acc -= 1 / 60; }
    if (n >= 5) acc = 0;
  }
  UI.tick();
  render();
}

// =====================================================================
//  Rendering
// =====================================================================
// render(), drawDecor(), drawPlatform() and the background live in fx.js

function drawHint(c) {
  const G = Game;
  if (G.hint >= 2 || G.paused || G.state !== 'fight') return;
  const word = G.hint === 0 ? T('hold') : T('press');
  const key = G.hint === 0 ? 'D' : 'J';
  const bob = Math.sin(performance.now() / 260) * 2;
  c.save();
  c.font = '15px "Alfa Slab One", "Arial Black", Impact, sans-serif';
  c.textBaseline = 'middle'; c.textAlign = 'left';
  const tw = c.measureText(word).width;
  const x0 = 517 - (tw + 10 + 30) / 2, y = 146 + bob;
  c.fillStyle = '#fff'; c.fillText(word, x0, y);
  rrect(c, x0 + tw + 10, y - 15, 30, 30, 6); c.fillStyle = '#f6b73c'; c.fill();
  c.fillStyle = '#2b2b2b'; c.textAlign = 'center'; c.font = '17px "Alfa Slab One", "Arial Black", Impact, sans-serif';
  c.fillText(key, x0 + tw + 25, y + 1);
  if (G.hint === 1) {
    c.textAlign = 'left'; c.font = '13px "Alfa Slab One", "Arial Black", Impact, sans-serif'; c.fillStyle = '#dcdcdc';
    c.fillText(T('orClick'), x0 + tw + 50, y + 1);
  }
  c.restore();
}
