'use strict';
/*
  Ragdoll fighter.
  - 11 verlet points (head, neck, hip, 2 arms, 2 legs) joined by distance constraints.
  - While "alive & in control" the points are pulled (spring) towards a procedural pose
    driven by a simple platformer controller (cx, cy, vx, vy). This gives snappy control
    but still lets limbs lag / jiggle.
  - When knocked down / dead the pose spring is switched off => full ragdoll.
*/

const WIND = 0.38, SE = 0.66;          // attack phases (fraction of duration): wind-up | strike | recovery
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const smooth = t => t * t * (3 - 2 * t);
const rnd = (a, b) => a + Math.random() * (b - a);

const PT = { HEAD: 0, NECK: 1, HIP: 2, ELL: 3, HDL: 4, ELR: 5, HDR: 6, KNL: 7, FTL: 8, KNR: 9, FTR: 10 };
//                 head  neck  hip   elL   hdL   elR   hdR   knL   ftL   knR   ftR
const KS = [0.45, 0.65, 0.80, 0.42, 0.55, 0.42, 0.55, 0.50, 0.80, 0.50, 0.80];

const _ik = { x: 0, y: 0, tx: 0, ty: 0 };
function solveIK(ax, ay, tx, ty, l1, l2, prefX, prefY, out) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.995;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < 1) { dx = 0; dy = 1; d = 1; }
  out.tx = ax + dx; out.ty = ay + dy;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + dx * a / d, my = ay + dy * a / d;
  let px = -dy / d, py = dx / d;
  if (px * prefX + py * prefY < 0) { px = -px; py = -py; }
  out.x = mx + px * h; out.y = my + py * h;
}

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function setP(o, x, y) { o.x = x; o.y = y; }

class Fighter {
  constructor(o) {
    const g = Game;
    this.isPlayer = !!o.isPlayer;
    this.team = this.isPlayer ? 0 : 1;
    const s = this.s = o.scale || 1;
    this.headR = 19 * s; this.hd = 24 * s; this.torso = 54 * s;
    this.ua = 30 * s; this.fa = 30 * s; this.th = 38 * s; this.sh = 38 * s;
    this.hipH = 72 * s;

    this.color = o.color || '#f2f2f2';
    this.outline = o.outline || '#b4b4b4';
    this.hat = o.hat || null;
    this.weapon = o.weapon || null;
    this.isBoss = !!o.boss; this.label = o.label || null; this.remote = !!o.remote;
    this.reward = o.reward || 0;

    this.maxHp = o.maxHp || 100; this.hp = this.maxHp; this.ghost = this.hp;
    this.dmgMul = o.dmgMul || 1; this.speed = o.speed || 3.6; this.kbRes = o.kbRes || 1; this.poise = o.poise || 0;
    this.face = o.face || 1;

    this.cx = o.x; this.cy = g.GY - this.hipH; this.vx = 0; this.vy = 0; this.onGround = true;
    this.input = { l: false, r: false, jump: false, attack: false, block: false };
    this.atkBuf = 0; this.atk = null; this.block = false; this.punchArm = 1;
    this.stun = 0; this.invuln = 0; this.recover = 0; this.ctrl = 1; this.hurtFlash = 0; this.blockFlash = 0;
    this.ragdoll = false; this.dead = false; this.out = false; this.ragT = 0; this.ragFrames = 0; this.deadT = 0;
    this.frame = (Math.random() * 100) | 0; this.phase = 0;
    this.wAng = this.weapon ? this.weapon.idle * D2R : 0; this.pWAng = this.wAng; this.nBend = 0;
    this.lastHitBy = null; this.ai = null;
    this.prevB = null; this.trail = []; this.atkN = 0;

    this.pts = [];
    this.T = [];
    for (let i = 0; i < 11; i++) { this.pts.push({ x: 0, y: 0, px: 0, py: 0 }); this.T.push({ x: 0, y: 0 }); }
    this.cons = [
      [1, 0, this.hd], [1, 2, this.torso],
      [1, 3, this.ua], [3, 4, this.fa], [1, 5, this.ua], [5, 6, this.fa],
      [2, 7, this.th], [7, 8, this.sh], [2, 9, this.th], [9, 10, this.sh],
      // min-distance limits (keep ragdoll from folding in on itself)
      [0, 2, (this.hd + this.torso) * 0.78, 1],
      [2, 8, this.th * 0.55, 1], [2, 10, this.th * 0.55, 1],
      [1, 4, this.ua * 0.5, 1], [1, 6, this.ua * 0.5, 1]
    ];
    this.barX = o.x; this.barY = 0;
    this.snapPose();
    this.barY = this.pts[0].y;
  }

  setWeapon(w) {
    this.weapon = w; this.atk = null;
    this.wAng = this.pWAng = w ? w.idle * D2R : 0;
    this.nBend = 0;
  }

  attackReach() {
    const w = this.weapon || FISTS, s = this.s;
    if (w.type === 'punch') return 74 * s;
    if (w.type === 'stab') return (60 + w.len) * s;
    return (30 + w.len) * s + 4;
  }

  snapPose() {
    const T = this.computePose();
    for (let i = 0; i < 11; i++) {
      const p = this.pts[i];
      p.x = p.px = T[i].x; p.y = p.py = T[i].y;
    }
  }

  // ---------- state changes ----------
  startRagdoll(frames) {
    if (!this.ragdoll) {
      this.ragdoll = true; this.atk = null; this.block = false; this.atkBuf = 0; this.ragFrames = 0;
    }
    this.ragT = Math.max(this.ragT, frames);
  }
  standUp() {
    const hip = this.pts[2];
    this.ragdoll = false;
    this.cx = hip.x; this.cy = hip.y; this.vx = 0; this.vy = 0;
    this.onGround = true; this.recover = 40; this.ctrl = 0; this.invuln = 40; this.stun = 0;
  }
  die() {
    if (this.dead) return;
    this.dead = true; this.hp = 0; this.deadT = 0;
    this.startRagdoll(1e9);
  }

  // ---------- per-frame ----------
  update() {
    this.frame++;
    if (this.invuln > 0) this.invuln--;
    if (this.stun > 0) this.stun--;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.blockFlash > 0) this.blockFlash--;
    this.prevB = this.weaponBase();
    this.pWAng = this.wAng;

    if (this.remote) {                      // online opponent: pose comes from the network
      Net.applyRemote(this);
      if (this.dead) this.deadT++;
    } else {
      if (this.ragdoll) this.ragUpdate(); else this.ctrlUpdate();
      this.physics();
    }

    // nunchaku chain lag
    if (this.weapon && this.weapon.flex && !this.remote) {
      const tgt = this.ragdoll ? 0 : clamp(-(this.wAng - this.pWAng) * 7, -1.8, 1.8);
      this.nBend += (tgt - this.nBend) * 0.35;
    }
    // swing trail
    const T = this.trail, at = this.atk;
    if (!this.ragdoll && at && this.weapon && at.t / at.dur >= WIND && at.t / at.dur < SE + 0.08) {
      const b = this.weaponBase(), L = this.weapon.len * this.s, ux = Math.cos(b.a), uy = Math.sin(b.a);
      T.push({ id: at.id, ax: b.x + ux * L * 0.82, ay: b.y + uy * L * 0.82, bx: b.x + ux * L * 1.04, by: b.y + uy * L * 1.04, life: 5 });
    } else if (!this.ragdoll && at && !this.weapon && at.active) {
      const b = this.weaponBase(), pv = this.prevB || b;
      T.push({ id: at.id, fist: true, bx: b.x, by: b.y, ax: pv.x, ay: pv.y, life: 8 });
    }
    for (let i = T.length - 1; i >= 0; i--) if (--T[i].life <= 0 || this.ragdoll) T.splice(i, 1);
    // health ghost bar
    if (this.ghost > this.hp) this.ghost = Math.max(this.hp, this.ghost - 0.45);
    else this.ghost = this.hp;
  }

  ragUpdate() {
    const g = Game, hip = this.pts[2];
    this.ragFrames++;
    this.cx = hip.x; this.cy = hip.y;
    if (this.dead) { this.deadT++; return; }
    this.ragT--;
    if (this.ragT <= 0 && this.ragFrames > 25) {
      const spd = Math.abs(hip.x - hip.px) + Math.abs(hip.y - hip.py);
      if (g.onPlatform(hip.x) && hip.y > g.GY - 30 && spd < 1.6) this.standUp();
      else this.ragT = 4;
    }
  }

  ctrlUpdate() {
    const g = Game, inp = this.input;
    const w = this.weapon || FISTS;
    if (this.recover > 0) this.recover--;
    const canAct = this.stun <= 0 && this.recover <= 0;

    this.block = canAct && inp.block && !this.atk && this.onGround;

    // attack (with a tiny input buffer)
    if (inp.attack) this.atkBuf = 6; else if (this.atkBuf > 0) this.atkBuf--;
    if (canAct && !this.atk && !this.block && this.atkBuf > 0) {
      this.atkBuf = 0;
      this.atk = {
        t: 0, dur: w.dur, active: false, lunged: false, hit: new Set(), id: ++this.atkN,
        arm: w.type === 'punch' ? (this.punchArm ^= 1) : 1
      };
    }
    if (this.atk) {
      const a = this.atk; a.t++;
      const u = a.t / a.dur;
      a.active = u >= WIND && u < SE;
      if (!a.lunged && u >= WIND) { a.lunged = true; this.vx += this.face * w.lunge; Sfx.swing(w.kb); }
      if (a.t >= a.dur) this.atk = null;
    }

    // horizontal movement
    let tv = 0;
    if (canAct) tv = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    let sp = this.speed;
    if (this.block) sp *= 0.35; else if (this.atk) sp *= 0.45;
    tv *= sp;
    if (this.stun > 0) this.vx *= 0.94;
    else this.vx += (tv - this.vx) * (this.onGround ? 0.22 : 0.07);
    if (canAct && inp.jump && this.onGround && !this.atk) {
      this.vy = -12.6; this.onGround = false; Sfx.jump();
    }
    this.cx += this.vx;

    // vertical movement / platform
    const gyHip = g.GY - this.hipH;
    const over = g.onPlatform(this.cx);
    if (this.recover > 0) {
      this.cy += (gyHip - this.cy) * 0.12; this.vy = 0; this.onGround = true;
    } else if (this.onGround) {
      if (!over) this.onGround = false; else { this.cy = gyHip; this.vy = 0; }
    }
    if (!this.onGround && this.recover <= 0) {
      this.vy += 0.6; this.cy += this.vy;
      if (over && this.cy >= gyHip && this.vy >= 0) {
        this.cy = gyHip;
        if (this.vy > 5) { g.dust(this.cx, g.GY); Sfx.land(); }
        this.vy = 0; this.onGround = true;
      } else if (!over && this.cy > gyHip + 55) {
        this.startRagdoll(1e5);   // tumble into the abyss
      }
    }

    if (this.onGround && Math.abs(this.vx) > 0.35) this.phase += Math.abs(this.vx) * 0.12;

    // how strongly the pose pulls on the limbs
    let tgt = this.stun > 0 ? 0.1 : 1;
    if (this.recover > 0) tgt = 1 - this.recover / 40;
    if (tgt < this.ctrl) this.ctrl = tgt; else this.ctrl = Math.min(tgt, this.ctrl + 0.06);
  }

  physics() {
    const g = Game, P = this.pts;
    const damp = this.ragdoll ? 0.995 : 0.97;
    for (let i = 0; i < 11; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + 0.42;
    }
    if (!this.ragdoll) {
      const T = this.computePose();
      for (let i = 0; i < 11; i++) {
        let k = KS[i] * this.ctrl;
        if (this.atk && i >= 3 && i <= 6) k = Math.min(0.85, KS[i] * 1.6) * this.ctrl;
        const p = P[i];
        p.x += (T[i].x - p.x) * k; p.y += (T[i].y - p.y) * k;
      }
    }
    // distance constraints
    for (let it = 0; it < 5; it++) {
      for (let c = 0; c < this.cons.length; c++) {
        const cn = this.cons[c];
        const a = P[cn[0]], b = P[cn[1]];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (cn[3] === 1 && d >= cn[2]) continue;
        const diff = (d - cn[2]) / d * 0.5;
        a.x += dx * diff; a.y += dy * diff; b.x -= dx * diff; b.y -= dy * diff;
      }
    }
    // platform collision
    for (let i = 0; i < 11; i++) {
      const p = P[i];
      const r = i === 0 ? this.headR : 4;
      if (p.x > g.PL - 4 && p.x < g.PR + 4 && p.y > g.GY - r) {
        if (p.y < g.GY + 28) {
          const vx = p.x - p.px, vy = p.y - p.py;
          p.y = g.GY - r;
          p.px = p.x - vx * 0.65;
          p.py = p.y + (vy > 0 ? vy * 0.15 : 0);
        } else if (p.y < g.GY + 60) {
          // pushed into the side of the platform
          p.x = (p.x - g.PL < g.PR - p.x) ? g.PL - 5 : g.PR + 5;
        }
      }
    }
  }

  // ---------- pose ----------
  computePose() {
    const g = Game, s = this.s, f = this.face, T = this.T;
    const w = this.weapon, atk = this.atk;
    const cx = this.cx, cy = this.cy, t = this.frame;
    const moving = this.onGround && Math.abs(this.vx) > 0.35;

    let lean = clamp(this.vx * f / 3.6, -1, 1) * 0.14;
    let u = 0;
    if (this.stun > 0) lean = -0.32;
    else if (atk) {
      u = atk.t / atk.dur;
      lean = u < WIND ? -0.14 * (u / WIND) : u < SE ? 0.26 : 0.26 * (1 - (u - SE) / (1 - SE));
    } else if (this.block) lean = -0.05;
    else if (!this.onGround) lean = 0.04;

    const bob = (!moving && this.onGround) ? Math.sin(t * 0.09) * 1.3 * s : 0;
    const hy = cy + bob;
    setP(T[2], cx, hy);
    const nx = cx + f * Math.sin(lean) * this.torso, ny = hy - Math.cos(lean) * this.torso;
    setP(T[1], nx, ny);
    const hl = lean * 1.3 - (this.stun > 0 ? 0.2 : 0);
    setP(T[0], nx + f * Math.sin(hl) * this.hd, ny - Math.cos(hl) * this.hd);

    // legs
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      let fx, fy;
      if (this.onGround) {
        const wide = atk ? 1.5 : this.block ? 1.25 : 1;
        const stance = side * 14 * s * f * wide;
        if (moving) {
          const pp = this.phase + (i ? Math.PI : 0);
          const dir = Math.sign(this.vx);
          fx = cx + stance * 0.3 + Math.sin(pp) * 20 * s * dir;
          fy = g.GY - Math.max(0, Math.cos(pp)) * 13 * s;
        } else { fx = cx + stance; fy = g.GY; }
      } else {
        fx = cx + f * (side * 7 + 9) * s; fy = cy + (i ? 50 : 56) * s;
      }
      solveIK(cx, hy, fx, fy, this.th, this.sh, f, 0.2, _ik);
      setP(T[7 + i * 2], _ik.x, _ik.y); setP(T[8 + i * 2], _ik.tx, _ik.ty);
    }

    // arms
    const S = T[1];
    let hRx = S.x + f * (w ? 24 : 26) * s, hRy = S.y + (w ? 8 : 16) * s;
    let hLx = S.x + f * (w ? 14 : 18) * s, hLy = S.y + (w ? 22 : 24) * s;
    let wT = w ? w.idle * D2R : 0, direct = false;
    if (moving) { const sw = Math.sin(this.phase) * 4 * s; hRy += sw; hLy -= sw; }
    if (!this.onGround) { hRy -= 10 * s; hLy -= 8 * s; }
    if (this.block) {
      hRx = S.x + f * 28 * s; hRy = S.y - 4 * s; hLx = S.x + f * 20 * s; hLy = S.y + 8 * s; wT = -82 * D2R;
    }
    if (this.stun > 0) {
      hRx = S.x - f * 18 * s; hRy = S.y - 26 * s; hLx = S.x - f * 26 * s; hLy = S.y - 6 * s; wT = -100 * D2R;
    }
    if (atk && this.stun <= 0) {
      const ww = w || FISTS;
      if (ww.type === 'swing') {
        const A0 = ww.idle * D2R, A1 = ww.wind * D2R, A2 = ww.end * D2R;
        let th;
        if (u < WIND) th = lerp(A0, A1, easeOut(u / WIND));
        else if (u < SE) th = lerp(A1, A2, smooth((u - WIND) / (SE - WIND)));
        else th = lerp(A2, A0, smooth((u - SE) / (1 - SE)));
        const r = 30 * s;
        hRx = S.x + f * Math.cos(th) * r; hRy = S.y + Math.sin(th) * r;
        hLx = lerp(hRx, S.x + f * 10 * s, 0.5); hLy = lerp(hRy, S.y + 20 * s, 0.5);
        wT = th; direct = true;
      } else if (ww.type === 'stab') {
        const A0 = ww.idle * D2R;
        let th, r;
        if (u < WIND) { const k = easeOut(u / WIND); th = lerp(A0, -8 * D2R, k); r = lerp(28, 8, k); }
        else if (u < SE) { const k = easeOut((u - WIND) / (SE - WIND)); th = -6 * D2R; r = lerp(8, 60, k); }
        else { const k = smooth((u - SE) / (1 - SE)); th = lerp(-6 * D2R, A0, k); r = lerp(60, 28, k); }
        hRx = S.x + f * r * s; hRy = S.y + 8 * s;
        hLx = S.x + f * 12 * s; hLy = S.y + 22 * s;
        wT = th; direct = true;
      } else { // punch
        let r;
        if (u < WIND) r = lerp(26, 6, easeOut(u / WIND));
        else if (u < SE) r = lerp(6, 68, easeOut((u - WIND) / (SE - WIND)));
        else r = lerp(68, 26, smooth((u - SE) / (1 - SE)));
        r *= s;
        if (atk.arm === 1) { hRx = S.x + f * r; hRy = S.y + 10 * s; }
        else { hLx = S.x + f * r; hLy = S.y + 10 * s; }
      }
    }
    if (direct) this.wAng = wT; else this.wAng += (wT - this.wAng) * 0.35;
    // dual-wield weapons: the off hand holds a second blade next to the main one
    if (w && w.dual && this.stun <= 0) { hLx = hRx - f * 5 * s; hLy = hRy + 9 * s; }

    solveIK(S.x, S.y, hLx, hLy, this.ua, this.fa, -f * 0.3, 1, _ik);
    setP(T[3], _ik.x, _ik.y); setP(T[4], _ik.tx, _ik.ty);
    solveIK(S.x, S.y, hRx, hRy, this.ua, this.fa, -f * 0.3, 1, _ik);
    setP(T[5], _ik.x, _ik.y); setP(T[6], _ik.tx, _ik.ty);
    return T;
  }

  // position + world angle of the held weapon (or the punching fist)
  weaponBase() {
    const P = this.pts;
    if (!this.weapon) {
      const h = (this.atk && this.atk.arm === 0) ? P[4] : P[6];
      return { x: h.x, y: h.y, a: 0, flip: 1 };
    }
    const h = P[6];
    if (this.ragdoll) {
      return { x: h.x, y: h.y, a: Math.atan2(h.y - P[5].y, h.x - P[5].x), flip: 1 };
    }
    const th = this.wAng;
    return { x: h.x, y: h.y, a: this.face > 0 ? th : Math.PI - th, flip: this.face };
  }

  // ---------- drawing ----------
  draw(c, preview) {
    const P = this.pts, s = this.s, f = this.face;
    let alpha = 1;
    if (this.dead) alpha = clamp(1 - (this.deadT - 170) / 50, 0, 1);
    if (alpha <= 0) return;
    c.save();
    c.globalAlpha = alpha;
    c.lineCap = 'round'; c.lineJoin = 'round';

    if (!preview) this.drawShadow(c);

    let col = this.color, out = this.outline;
    if (this.hurtFlash > 0) { const k = this.hurtFlash / 6 * 0.55; col = mix(col, '#ff6b6b', k); }
    const back = mix(col, '#000000', 0.16), backO = mix(out, '#000000', 0.14);

    const path = (idx, dx, dy) => {
      c.beginPath(); c.moveTo(P[idx[0]].x + dx, P[idx[0]].y + dy);
      for (let i = 1; i < idx.length; i++) c.lineTo(P[idx[i]].x + dx, P[idx[i]].y + dy);
    };
    const poly = (idx, w, fill, stroke) => {
      path(idx, 0, 0);
      c.strokeStyle = stroke; c.lineWidth = w + 4; c.stroke();
      c.strokeStyle = fill; c.lineWidth = w; c.stroke();
      // soft volume: shade on the lower-right, light on the upper-left
      path(idx, w * 0.2, w * 0.14); c.strokeStyle = mix(fill, '#000000', 0.1); c.lineWidth = w * 0.42; c.stroke();
      path(idx, -w * 0.2, -w * 0.18); c.strokeStyle = mix(fill, '#ffffff', 0.55); c.lineWidth = w * 0.16; c.stroke();
    };
    const hand = (i, fill, stroke) => {
      const r = (this.weapon ? 7.5 : 10) * s;
      c.beginPath(); c.arc(P[i].x, P[i].y, r + 2, 0, 6.3); c.fillStyle = stroke; c.fill();
      c.beginPath(); c.arc(P[i].x, P[i].y, r, 0, 6.3); c.fillStyle = fill; c.fill();
    };

    // back limbs
    poly([1, 3, 4], 10 * s, back, backO);
    if (this.weapon && this.weapon.dual) {
      const b = this.weaponBase();
      let a2 = b.a, fl = b.flip;
      if (this.ragdoll) a2 = Math.atan2(P[4].y - P[3].y, P[4].x - P[3].x);
      c.save();
      c.translate(P[4].x, P[4].y); c.rotate(a2 + (this.ragdoll ? 0 : 0.12 * f)); c.scale(s, s * fl);
      this.weapon.draw(c, this.weapon.len, { bend: 0 });
      c.restore();
    }
    hand(4, back, backO);
    poly([2, 7, 8], 12 * s, back, backO);
    // front leg, torso, head
    poly([2, 9, 10], 12 * s, col, out);
    poly([1, 2], 22 * s, col, out);
    const hd = P[0], nk = P[1];
    c.beginPath(); c.arc(hd.x, hd.y, this.headR + 2, 0, 6.3); c.fillStyle = out; c.fill();
    const hg = c.createRadialGradient(hd.x - this.headR * 0.35, hd.y - this.headR * 0.4, this.headR * 0.1, hd.x, hd.y, this.headR);
    hg.addColorStop(0, mix(col, '#ffffff', 0.5)); hg.addColorStop(0.55, col); hg.addColorStop(1, mix(col, '#000000', 0.13));
    c.beginPath(); c.arc(hd.x, hd.y, this.headR, 0, 6.3); c.fillStyle = hg; c.fill();
    if (this.hat) {
      c.save();
      c.translate(hd.x, hd.y);
      c.rotate(Math.atan2(hd.x - nk.x, nk.y - hd.y));
      drawHat(c, this.hat, this.headR, f, this.frame);
      c.restore();
    }
    // front arm + weapon
    poly([1, 5, 6], 10 * s, col, out);
    hand(6, col, out);
    if (this.weapon) {
      const b = this.weaponBase();
      c.save();
      c.translate(b.x, b.y); c.rotate(b.a); c.scale(s, s * b.flip);
      this.weapon.draw(c, this.weapon.len, { bend: this.nBend });
      c.restore();
      hand(6, col, out);
    }
    if (this.atk && !this.weapon && this.atk.arm === 0) hand(4, col, out);
    if (this.blockFlash > 0) {
      c.globalAlpha = alpha * this.blockFlash / 8;
      c.strokeStyle = '#ffe28a'; c.lineWidth = 3;
      c.beginPath(); c.arc(P[1].x + f * 30 * s, P[1].y + 4, 34 * s, -1.2, 1.2 + (f < 0 ? 0 : 0)); c.stroke();
    }
    c.restore();
  }

  drawTrail(c) {
    const T = this.trail;
    if (T.length < 2) return;
    const col = (this.weapon && this.weapon.trail) || '255,255,255';
    c.save(); c.lineCap = 'round';
    for (let i = 1; i < T.length; i++) {
      const a = T[i - 1], b = T[i];
      if (a.id !== b.id) continue;
      const al = Math.min(a.life, b.life) / 5 * 0.36;
      if (b.fist) {
        c.strokeStyle = 'rgba(255,255,255,' + (al * 0.8).toFixed(3) + ')'; c.lineWidth = 9 * this.s;
        c.beginPath(); c.moveTo(a.bx, a.by); c.lineTo(b.bx, b.by); c.stroke();
      } else {
        c.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
        c.beginPath(); c.moveTo(a.ax, a.ay); c.lineTo(a.bx, a.by); c.lineTo(b.bx, b.by); c.lineTo(b.ax, b.ay); c.closePath(); c.fill();
      }
    }
    c.restore();
  }

  drawShadow(c) {
    const g = Game, hip = this.pts[2];
    if (!g.onPlatform(hip.x) || hip.y > g.GY) return;
    const h = clamp((g.GY - hip.y) / 160, 0, 1);
    c.save();
    c.globalAlpha *= 0.28 * (1 - h * 0.7);
    c.fillStyle = '#000';
    c.beginPath(); c.ellipse(hip.x, g.GY + 2, 34 * this.s * (1 - h * 0.35), 6 * this.s, 0, 0, 6.3); c.fill();
    c.restore();
  }

  drawBar(c) {
    if (this.dead) return;
    const hd = this.pts[0];
    this.barX += (hd.x - this.barX) * 0.25; this.barY += (hd.y - this.barY) * 0.25;
    const w = 64, h = 11;
    const extra = (this.hat === 'straw' || this.hat === 'horn' || this.hat === 'crown') ? 10 : 0;
    const x = this.barX - w / 2, y = this.barY - this.headR - 22 - extra - (this.s - 1) * 10;
    const frac = clamp(this.hp / this.maxHp, 0, 1), gfrac = clamp(this.ghost / this.maxHp, 0, 1);
    c.save();
    rrect(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(0,0,0,.38)'; c.fill();
    c.save(); rrect(c, x, y, w, h, h / 2); c.clip();
    if (gfrac > frac) { c.fillStyle = '#ffffff'; c.fillRect(x, y, w * gfrac, h); }
    c.fillStyle = this.isPlayer ? '#a6c64d' : '#e5484d';
    c.fillRect(x, y, w * frac, h);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, y, w * frac, h * 0.4);
    c.restore();
    if (this.isPlayer || this.isBoss || this.label) {
      c.font = '15px "Alfa Slab One", "Arial Black", Impact, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = this.isBoss ? '#ff9b8f' : '#ffffff';
      c.fillText((this.label === 'KING' ? T('king') : this.label) || (this.isBoss ? T('boss') : T('you')), this.barX, y - 7);
    }
    c.restore();
  }
}

function drawHat(c, hat, hr, face, t) {
  switch (hat) {
    case 'straw': {
      c.fillStyle = '#e2ab5e'; c.strokeStyle = '#a97831'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-hr * 2.15, -hr * 0.35); c.lineTo(0, -hr * 2.0); c.lineTo(hr * 2.15, -hr * 0.35);
      c.quadraticCurveTo(0, -hr * 0.02, -hr * 2.15, -hr * 0.35);
      c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,80,20,.38)'; c.lineWidth = 1;
      for (const k of [-0.9, -0.45, 0, 0.45, 0.9]) {
        c.beginPath(); c.moveTo(0, -hr * 1.97); c.lineTo(k * hr * 2.0, -hr * 0.32 + (1 - Math.abs(k)) * hr * 0.12); c.stroke();
      }
      break;
    }
    case 'band': {
      c.lineCap = 'butt';
      c.strokeStyle = '#e8453c'; c.lineWidth = hr * 0.38;
      c.beginPath(); c.moveTo(-hr * 0.93, -hr * 0.35); c.lineTo(hr * 0.93, -hr * 0.35); c.stroke();
      c.lineCap = 'round'; c.lineWidth = hr * 0.26;
      const w = Math.sin(t * 0.25) * 3;
      c.beginPath(); c.moveTo(-face * hr * 0.9, -hr * 0.35);
      c.quadraticCurveTo(-face * (hr + 14), -hr * 0.15 + w, -face * (hr + 28), -hr * 0.55 + w * 1.5); c.stroke();
      c.beginPath(); c.moveTo(-face * hr * 0.9, -hr * 0.3);
      c.quadraticCurveTo(-face * (hr + 12), hr * 0.15 + w, -face * (hr + 24), hr * 0.05 + w * 1.5); c.stroke();
      break;
    }
    case 'helmet': {
      c.fillStyle = '#9ba6b3'; c.strokeStyle = '#5f6b78'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(0, -hr * 0.05, hr * 1.08, Math.PI, 0);
      c.lineTo(hr * 1.08, hr * 0.12); c.lineTo(-hr * 1.08, hr * 0.12); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#d94c4c'; c.fillRect(-3, -hr * 1.55, 6, hr * 0.6);
      c.strokeStyle = '#5f6b78'; c.beginPath(); c.moveTo(-hr, -hr * 0.2); c.lineTo(hr, -hr * 0.2); c.stroke();
      break;
    }
    case 'crown': {
      c.fillStyle = '#ffd45a'; c.strokeStyle = '#b8861b'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-hr * 0.85, -hr * 0.55); c.lineTo(-hr * 0.9, -hr * 1.5); c.lineTo(-hr * 0.42, -hr * 1.05);
      c.lineTo(0, -hr * 1.7); c.lineTo(hr * 0.42, -hr * 1.05); c.lineTo(hr * 0.9, -hr * 1.5); c.lineTo(hr * 0.85, -hr * 0.55);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e8453c'; c.beginPath(); c.arc(0, -hr * 0.85, hr * 0.14, 0, 6.3); c.fill();
      break;
    }
    case 'horn': {
      c.fillStyle = '#efe6cc'; c.strokeStyle = '#a79a74'; c.lineWidth = 1.5;
      for (const sd of [-1, 1]) {
        c.beginPath();
        c.moveTo(sd * hr * 0.55, -hr * 0.7);
        c.quadraticCurveTo(sd * hr * 1.5, -hr * 0.8, sd * hr * 1.35, -hr * 1.9);
        c.quadraticCurveTo(sd * hr * 0.95, -hr * 1.2, sd * hr * 0.25, -hr * 0.95);
        c.closePath(); c.fill(); c.stroke();
      }
      break;
    }
  }
}
