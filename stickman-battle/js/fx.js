'use strict';
/*
  Visual polish: themed backgrounds, lighting, platform, decor, banners, impact rings,
  weapon trails and the main render() routine.
*/

// (scenes, palettes and ambient particles live in scenes.js)
const rgbaHex = (h, a) => { const c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

Object.assign(Game, {
  banners: [], rings: [], flash: 0, theme: null, bg: null, chips: [], sceneOverride: null, mood: null, amb: null,

  banner(txt, col, size, dur, sub, y, shake) {
    this.banners.push({ txt, col, size, dur, sub, y: y || 84, shake: !!shake, t: 0 });
  },
  // expanding ring + star burst at a hit location
  impact(x, y, col, big) {
    this.rings.push({ kind: 'ring', x, y, r0: 6, max: big ? 72 : 44, life: big ? 16 : 12, t: 0, col, w: big ? 5 : 3 });
    this.rings.push({ kind: 'burst', x, y, max: big ? 52 : 32, life: 9, t: 0, col: '#ffffff', n: big ? 10 : 7, rot: Math.random() * 6.28 });
  }
});

function introBanner(n, cfg) {
  const G = Game;
  G.banners.length = 0;
  const place = G.theme ? sceneName(G.theme.name) : null;
  if (cfg.final) G.banner(T('finalBoss'), '#ffd23a', 46, 110, T('defeatKing'), 84, true);
  else if (cfg.boss) G.banner(T('bossFight'), '#ff6b5e', 44, 100, T('levelPlace', n, place), 84, true);
  else G.banner(T('levelN', n), '#ffffff', 38, 80, place, 84, false);
}

// (static background builder lives in scenes.js)

// ---------------------------------------------------------------------
//  Decor + platform
// ---------------------------------------------------------------------
function slab(c, x, y, w, h, top, bot) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  rrect(c, x, y, w, h, 5); c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(x + 5, y + 1.5, w - 10, 2);
}

function drawDecor(c) {
  const G = Game, t = performance.now() / 1000, th = G.theme || BIOMES[0];
  slab(c, 140, 255, 52, 133, mix(th.plat, '#000000', 0.45), mix(th.plat, '#000000', 0.62));
  slab(c, 862, 242, 48, 146, mix(th.plat, '#000000', 0.1), mix(th.plat, '#000000', 0.32));

  // plinth
  const pg = c.createLinearGradient(920, 268, 1012, 362);
  pg.addColorStop(0, mix(th.plat, '#000000', 0.08)); pg.addColorStop(1, mix(th.plat, '#000000', 0.3));
  rrect(c, 920, 268, 92, 94, 8); c.fillStyle = pg; c.fill();
  rrect(c, 930, 278, 72, 74, 6); c.fillStyle = 'rgba(0,0,0,.22)'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(926, 270, 80, 2);

  // glowing core
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const k = 0.45 + pulse * 0.25 + G.glow * 0.5;
  const bob = Math.sin(t * 1.6) * 2;
  const gr = c.createRadialGradient(966, 315, 4, 966, 315, 100);
  gr.addColorStop(0, rgbaHex(th.accent, 0.55 * k)); gr.addColorStop(1, rgbaHex(th.accent, 0));
  c.fillStyle = gr; c.fillRect(860, 210, 174, 210);
  c.save();
  c.shadowColor = th.accent; c.shadowBlur = 16 + 18 * k;
  const cg = c.createLinearGradient(0, 298 + bob, 0, 330 + bob);
  cg.addColorStop(0, mix(th.accent, '#ffffff', 0.35)); cg.addColorStop(1, th.accent);
  rrect(c, 950, 298 + bob, 32, 32, 5); c.fillStyle = cg; c.fill();
  c.restore();
  c.strokeStyle = mix(th.accent, '#000000', 0.45); c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(959, 306 + bob); c.lineTo(966, 322 + bob); c.lineTo(973, 306 + bob); c.stroke();
}

function drawPlatform(c) {
  const G = Game, n = 6, bw = (G.PR - G.PL) / n, th = G.theme || BIOMES[0];
  const t = performance.now() / 1000;
  // soft shadow beneath
  const sg = c.createLinearGradient(0, G.GY + 46, 0, G.GY + 110);
  sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg; c.fillRect(G.PL + 8, G.GY + 46, G.PR - G.PL - 16, 64);

  for (let i = 0; i < n; i++) {
    const x = G.PL + i * bw + 1.5, w = bw - 3;
    const gr = c.createLinearGradient(0, G.GY, 0, G.GY + 46);
    gr.addColorStop(0, th.plat); gr.addColorStop(1, mix(th.plat, '#000000', 0.22));
    rrect(c, x, G.GY, w, 46, 6); c.fillStyle = gr; c.fill();
    // top light edge + dark base
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 6, G.GY + 1.5, w - 12, 2.2);
    c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x + 4, G.GY + 40, w - 8, 4);
    rrect(c, x + 0.5, G.GY + 0.5, w - 1, 45, 6); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; c.stroke();
  }
  c.fillStyle = 'rgba(0,0,0,.14)';
  for (const ch of G.chips) c.fillRect(ch.x, ch.y, ch.w, ch.h);

  // surface of the platform depends on the world
  const x0 = G.PL + 4, x1 = G.PR - 4, y = G.GY;
  c.save();
  switch (th.cap) {
    case 'wet':                       // rain-slick top
      c.fillStyle = 'rgba(190,220,255,.3)'; c.fillRect(x0, y + 0.5, x1 - x0, 2); break;
    case 'snow':
      c.fillStyle = '#f4fbff';
      for (let x = x0; x < x1; x += 11) { const h = 3 + ((x * 7) % 5); c.beginPath(); c.arc(x + 5, y + 1, 6, Math.PI, 0); c.fill(); c.fillRect(x - 1, y + 1, 12, h * 0.6); }
      break;
    case 'sand':
      c.fillStyle = '#e8c985'; c.fillRect(x0, y - 1, x1 - x0, 4); break;
    case 'lava':
      c.fillStyle = rgbaHex(th.c1, 0.55 + 0.25 * Math.sin(t * 2));
      for (const ch of G.chips) c.fillRect(ch.x, ch.y, ch.w + 3, 2);
      c.shadowColor = th.c1; c.shadowBlur = 14; c.fillStyle = rgbaHex(th.c2, 0.8);
      c.fillRect(x0, y + 43, x1 - x0, 2); break;
    case 'moss':
      c.fillStyle = '#5f9f4a'; c.fillRect(x0, y - 1, x1 - x0, 4);
      c.strokeStyle = '#78c05c'; c.lineWidth = 1.5;
      for (let x = x0; x < x1; x += 7) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + ((x * 13) % 5) - 2, y - 4 - ((x * 7) % 4)); c.stroke(); }
      break;
    case 'water':
      c.fillStyle = rgbaHex(th.glow, 0.25); c.fillRect(x0, y, x1 - x0, 3);
      c.strokeStyle = rgbaHex(th.glow, 0.35); c.lineWidth = 1.2; c.beginPath();
      for (let x = x0; x < x1; x += 6) c.lineTo(x, y - 2 + Math.sin(x * 0.12 + t * 3) * 1.5);
      c.stroke(); break;
    case 'glow':                      // floating slab: glowing underside
      c.shadowColor = th.accent; c.shadowBlur = 18; c.fillStyle = rgbaHex(th.accent, 0.85);
      c.fillRect(x0 + 10, y + 45, x1 - x0 - 20, 2); break;
    case 'neon': {
      const col = (Math.floor(t * 0.5) % 2) ? th.c1 : th.c2;
      c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = col; c.fillRect(x0, y - 1, x1 - x0, 3);
      c.fillStyle = th.accent; c.fillRect(x0, y + 44, x1 - x0, 2); break;
    }
    case 'petal':
      c.fillStyle = rgbaHex(th.c1, 0.85);
      for (let x = x0; x < x1; x += 9) { c.beginPath(); c.ellipse(x + 4, y - 0.5 + ((x * 5) % 3), 4, 1.8, ((x * 3) % 6) / 3, 0, 6.3); c.fill(); }
      break;
  }
  c.restore();
}

// ---------------------------------------------------------------------
//  Overlays drawn on top of the scene
// ---------------------------------------------------------------------
function drawBanners(c) {
  for (const b of Game.banners) {
    const t = b.t, a = Math.min(1, t / 6, (b.dur - t) / 14);
    if (a <= 0) continue;
    const pop = 1 + Math.max(0, (9 - t) / 9) * 0.8;
    c.save();
    c.globalAlpha = a; c.translate(517, b.y); c.scale(pop, pop);
    if (b.shake && t < 30) c.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = b.size + 'px "Alfa Slab One", "Arial Black", Impact, sans-serif';
    c.lineWidth = b.size * 0.18; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(b.txt, 0, 0);
    c.shadowColor = b.col; c.shadowBlur = 18; c.fillStyle = b.col; c.fillText(b.txt, 0, 0);
    if (b.sub) {
      c.shadowBlur = 0; c.font = '16px "Alfa Slab One", "Arial Black", Impact, sans-serif';
      c.fillStyle = '#e8e8e8'; c.fillText(b.sub, 0, b.size * 0.78);
    }
    c.restore();
  }
}

function drawRings(c) {
  for (const r of Game.rings) {
    const p = r.t / r.life, e = 1 - (1 - p) * (1 - p);
    c.save();
    c.globalAlpha = 1 - p;
    if (r.kind === 'ring') {
      c.strokeStyle = r.col; c.lineWidth = Math.max(0.5, r.w * (1 - p));
      c.beginPath(); c.arc(r.x, r.y, r.r0 + (r.max - r.r0) * e, 0, 6.3); c.stroke();
    } else {
      c.strokeStyle = r.col; c.lineWidth = 2.6 * (1 - p); c.lineCap = 'round';
      for (let i = 0; i < r.n; i++) {
        const a = r.rot + i * 6.283 / r.n;
        const r0 = r.max * 0.25 * p + 4, r1 = r.max * e;
        c.beginPath(); c.moveTo(r.x + Math.cos(a) * r0, r.y + Math.sin(a) * r0); c.lineTo(r.x + Math.cos(a) * r1, r.y + Math.sin(a) * r1); c.stroke();
      }
    }
    c.restore();
  }
}

// ---------------------------------------------------------------------
//  Main render
// ---------------------------------------------------------------------
function render() {
  const G = Game, c = G.ctx;
  c.setTransform(G.res, 0, 0, G.res, 0, 0);
  if (G.bg) c.drawImage(G.bg, 0, 0, G.W, G.H);
  else { c.fillStyle = '#3a3a3a'; c.fillRect(0, 0, G.W, G.H); }

  // floating dust / bokeh
  for (const m of G.motes) {
    c.globalAlpha = m.a; c.fillStyle = m.big ? (G.theme ? G.theme.glow : '#fff') : '#d6d6d6';
    c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.3); c.fill();
  }
  c.globalAlpha = 1;

  c.save();
  // slight zoom punch during the finishing slow-motion
  if (G.slowT > 0) {
    const z = 1 + 0.05 * clamp(G.slowT / 40, 0, 1);
    c.translate(517, 300); c.scale(z, z); c.translate(-517, -300);
  }
  if (G.shake > 0) c.translate((Math.random() - 0.5) * G.shake * 2, (Math.random() - 0.5) * G.shake * 2);

  drawAmbient(c, 0);
  drawDecor(c);
  drawPlatform(c);

  const order = G.fighters.slice().sort((a, b) => (b.dead ? 1 : 0) - (a.dead ? 1 : 0));
  for (const f of order) f.draw(c);
  for (const f of G.fighters) f.drawTrail(c);
  for (const f of G.fighters) f.drawBar(c);

  // particles (sparks glow additively)
  for (const q of G.parts) {
    const a = Math.max(0, q.life / q.max);
    if (q.glow) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a * 0.5; c.fillStyle = q.col;
      c.beginPath(); c.arc(q.x, q.y, q.size * 2.4, 0, 6.3); c.fill();
      c.globalAlpha = a; c.beginPath(); c.arc(q.x, q.y, q.size, 0, 6.3); c.fill();
      c.globalCompositeOperation = 'source-over';
    } else {
      c.globalAlpha = a; c.fillStyle = q.col;
      c.beginPath(); c.arc(q.x, q.y, q.size, 0, 6.3); c.fill();
    }
  }
  c.globalAlpha = 1;
  drawRings(c);
  drawAmbient(c, 1);

  // floating numbers (pop in)
  c.textAlign = 'center';
  for (const q of G.floats) {
    const pop = 1 + Math.max(0, (8 - q.t) / 8) * 0.7;
    c.save();
    c.globalAlpha = clamp(1 - (q.t - 30) / 25, 0, 1);
    c.translate(q.x, q.y); c.scale(pop, pop);
    c.font = q.size + 'px "Alfa Slab One", "Arial Black", Impact, sans-serif';
    c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText(q.txt, 0, 0);
    c.fillStyle = q.col; c.fillText(q.txt, 0, 0);
    c.restore();
  }
  c.globalAlpha = 1;
  c.restore();

  drawMood(c);
  if (G.flash > 0.01) { c.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.6).toFixed(3) + ')'; c.fillRect(0, 0, G.W, G.H); }
  drawScoreboard(c);
  drawBanners(c);
  drawHint(c);
}

// online: names + round wins at the top centre
function drawScoreboard(c) {
  if (Game.mode !== 'online' || !Net.active || !Net.opp) return;
  const my = Net.idx, mine = Net.scores[my] || 0, theirs = Net.scores[1 - my] || 0;
  const cx = 517, y = 50;
  c.save();
  c.font = '14px "Alfa Slab One", "Arial Black", Impact, sans-serif'; c.textBaseline = 'middle';
  c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.5)';
  const name = (txt, x, al) => { c.textAlign = al; c.strokeText(txt, x, y); c.fillStyle = '#fff'; c.fillText(txt, x, y); };
  name(Net.name, cx - 78, 'right'); name(Net.opp.name, cx + 78, 'left');
  c.textAlign = 'center'; c.fillStyle = '#f6b73c'; c.strokeText('VS', cx, y); c.fillText('VS', cx, y);
  const dot = (x, on, col) => {
    c.beginPath(); c.arc(x, y, 8, 0, 6.3);
    if (on) { c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.stroke(); }
    else { c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.stroke(); }
  };
  for (let i = 0; i < 2; i++) { dot(cx - 30 - i * 22, mine > i, '#a6c64d'); dot(cx + 30 + i * 22, theirs > i, '#e5484d'); }
  c.restore();
}
