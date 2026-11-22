'use strict';
/*
  Per-level scenery.
    scene  = (level - 1) % 10      -> 10 different worlds, consecutive levels never look alike
    palette= floor((level - 1)/10) -> hue shift, so the same world looks different every 10 levels
    seed   = level                 -> layout of mountains / trees / buildings / stars differs per level
  Each world also owns an ambient particle system (rain, snow, embers, fireflies, ...).
*/

const BIOMES = [
  { name: 'Moonlit Ruins',   top: '#414141', bot: '#313131', glow: '#ffffff', plat: '#7a7a7a', accent: '#ffb52e', pillar: '#262626', c1: '#8a8a8a', c2: '#bbbbbb', cap: null },
  { name: 'Thunderstorm',    top: '#2a3547', bot: '#141a27', glow: '#9fc0ff', plat: '#667a94', accent: '#7fc4ff', pillar: '#101823', c1: '#46586e', c2: '#2b3748', cap: 'wet' },
  { name: 'Frozen Peaks',    top: '#2c4361', bot: '#1b293f', glow: '#b8f0ff', plat: '#8fa5bb', accent: '#9fe9ff', pillar: '#16202f', c1: '#5ee6b8', c2: '#7a9cff', cap: 'snow' },
  { name: 'Scorched Desert', top: '#b0663a', bot: '#4a2a22', glow: '#ffd08a', plat: '#a78a68', accent: '#ffcc55', pillar: '#3b221c', c1: '#d9904e', c2: '#8e5236', cap: 'sand' },
  { name: 'Volcano Rim',     top: '#3a1814', bot: '#150a09', glow: '#ff7a35', plat: '#6e5650', accent: '#ff8a2e', pillar: '#1d0d0b', c1: '#ff5a1f', c2: '#ffb347', cap: 'lava' },
  { name: 'Whisper Forest',  top: '#1f3a30', bot: '#0d1d17', glow: '#c7ffb0', plat: '#6b8571', accent: '#c6ff6a', pillar: '#0c1913', c1: '#2c5a45', c2: '#17382b', cap: 'moss' },
  { name: 'Deep Sea',        top: '#0f5a6e', bot: '#06222e', glow: '#8ff6ff', plat: '#5b8c96', accent: '#6ff0ff', pillar: '#073340', c1: '#1b8aa0', c2: '#0b4757', cap: 'water' },
  { name: 'Starfall Void',   top: '#0b0e24', bot: '#05060f', glow: '#c8b6ff', plat: '#6c6f96', accent: '#ff9bd2', pillar: '#12152d', c1: '#7a4cff', c2: '#ff4ca8', cap: 'glow' },
  { name: 'Neon Rooftop',    top: '#2a1245', bot: '#0e0620', glow: '#ff5fd8', plat: '#5d5280', accent: '#35f3ff', pillar: '#190a2e', c1: '#ff2fbf', c2: '#35f3ff', cap: 'neon' },
  { name: 'Sakura Temple',   top: '#5a3a58', bot: '#2b1a30', glow: '#ffd1e3', plat: '#8f7385', accent: '#ffb0cc', pillar: '#241526', c1: '#ffb7c9', c2: '#f2849e', cap: 'petal' }
];

// ---------------------------------------------------------------------
//  colour helpers
// ---------------------------------------------------------------------
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function rotHue(hex, deg) {
  if (!deg) return hex;
  const c = hex2rgb(hex), hsl = rgb2hsl(c[0], c[1], c[2]);
  return hsl2hex(hsl[0] + deg, Math.max(hsl[1], 0.22), hsl[2]);
}

function themeFor(n) {
  n = clamp(Math.floor(n) || 1, 1, 100);
  const kind = (n - 1) % 10, tier = Math.floor((n - 1) / 10), sh = (tier * 37) % 360;
  const B = BIOMES[kind];
  const th = { kind, tier, name: B.name, cap: B.cap };
  for (const k of ['top', 'bot', 'glow', 'plat', 'accent', 'pillar', 'c1', 'c2']) th[k] = rotHue(B[k], sh);
  return th;
}

// ---------------------------------------------------------------------
//  drawing helpers
// ---------------------------------------------------------------------
function ridge(c, W, H, y0, amp, seg, col, R, caps) {
  const pts = [];
  for (let x = -20; x < W + 40; x += seg * (0.6 + R() * 0.8)) pts.push([x, y0 - R() * amp]);
  c.beginPath(); c.moveTo(-20, H);
  for (const p of pts) c.lineTo(p[0], p[1]);
  c.lineTo(W + 40, H); c.closePath(); c.fillStyle = col; c.fill();
  if (caps) {
    c.fillStyle = caps;
    for (const p of pts) if (p[1] < y0 - amp * 0.5) {
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] - 17, p[1] + 25); c.lineTo(p[0] - 6, p[1] + 19);
      c.lineTo(p[0] + 2, p[1] + 29); c.lineTo(p[0] + 17, p[1] + 23); c.closePath(); c.fill();
    }
  }
}
function dunes(c, W, H, y0, amp, col, R) {
  const ph = R() * 6;
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin(x * 0.006 + ph)) - amp * 0.4 * Math.sin(x * 0.013 + ph * 2));
  c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill();
}
function pines(c, W, H, y0, hmin, hmax, col, n, R) {
  c.fillStyle = col; c.fillRect(0, y0, W, H - y0);
  for (let i = 0; i < n; i++) {
    const x = (i + R()) * W / n, h = hmin + R() * (hmax - hmin), w = h * 0.34;
    for (let t = 0; t < 3; t++) {
      const yy = y0 - h + t * h * 0.27, ww = w * (0.55 + t * 0.3);
      c.beginPath(); c.moveTo(x, yy); c.lineTo(x - ww, yy + h * 0.42); c.lineTo(x + ww, yy + h * 0.42); c.closePath(); c.fill();
    }
    c.fillRect(x - 2, y0 - h * 0.15, 4, h * 0.2);
  }
}
function halo(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, rgbaHex(col, a)); g.addColorStop(1, rgbaHex(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function starfield(c, W, H, n, R, col, maxY) {
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * maxY, r = 0.4 + R() * 1.4;
    c.fillStyle = rgbaHex(col, 0.25 + R() * 0.6);
    c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  }
}
function pillars(c, th, R, W, H, a1, a2) {
  const layers = [{ n: 11, a: a1, y0: 240, y1: 380, w0: 50, w1: 110, blur: 3 }, { n: 7, a: a2, y0: 330, y1: 430, w0: 36, w1: 80, blur: 0 }];
  for (const L of layers) {
    c.save();
    try { c.filter = L.blur ? 'blur(' + L.blur + 'px)' : 'none'; } catch (e) { /* unsupported */ }
    for (let i = 0; i < L.n; i++) {
      const w = L.w0 + R() * (L.w1 - L.w0), x = (i + R() * 0.7) * (W / L.n) - 20, y = L.y0 + R() * (L.y1 - L.y0);
      const pg = c.createLinearGradient(0, y, 0, H);
      pg.addColorStop(0, rgbaHex(th.pillar, L.a)); pg.addColorStop(1, rgbaHex(th.pillar, L.a * 0.4));
      rrect(c, x, y, w, H - y + 10, 6); c.fillStyle = pg; c.fill();
      c.fillStyle = rgbaHex(th.glow, 0.05 * (L.a * 2)); c.fillRect(x + 4, y + 1, w - 8, 2);
    }
    c.restore();
  }
}
function shafts(c, th, R, n, a) {
  for (let i = 0; i < n; i++) {
    const x0 = 120 + i * (800 / n) + R() * 60, w = 40 + R() * 40;
    const sh = c.createLinearGradient(0, 0, 0, 430);
    sh.addColorStop(0, rgbaHex(th.glow, a)); sh.addColorStop(1, rgbaHex(th.glow, 0));
    c.fillStyle = sh;
    c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + w, 0); c.lineTo(x0 + w - 150, 430); c.lineTo(x0 - 150, 430); c.closePath(); c.fill();
  }
}
function moon(c, x, y, r, th, a) {
  halo(c, x, y, r * 7, th.glow, a * 1.6);
  c.fillStyle = rgbaHex(th.glow, a); c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  c.fillStyle = rgbaHex(th.glow, a * 0.55); c.beginPath(); c.arc(x - r * 0.25, y - r * 0.2, r * 0.7, 0, 6.3); c.fill();
}

// ---------------------------------------------------------------------
//  the ten worlds (static layers)
// ---------------------------------------------------------------------
const SCENES = [
  // 0 ruins: moon, shafts, pillars
  (c, th, R, W, H) => {
    moon(c, 560 + R() * 380, 90 + R() * 70, 44, th, 0.11);
    shafts(c, th, R, 3, 0.06);
    pillars(c, th, R, W, H, 0.32, 0.5);
  },
  // 1 storm: heavy clouds + distant towers
  (c, th, R, W, H) => {
    pillars(c, th, R, W, H, 0.2, 0.32);
    for (let i = 0; i < 13; i++) {
      const x = R() * W, y = 10 + R() * 130, rx = 110 + R() * 130, ry = 30 + R() * 40;
      c.fillStyle = rgbaHex(i % 2 ? th.c1 : th.c2, 0.5);
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.3); c.fill();
    }
    const g = c.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, 220);
  },
  // 2 snow: aurora, stars, icy ridges
  (c, th, R, W, H) => {
    starfield(c, W, H, 60, R, th.glow, 260);
    moon(c, 120 + R() * 800, 80 + R() * 40, 26, th, 0.14);
    for (let b = 0; b < 3; b++) {
      const y = 70 + b * 38 + R() * 20, amp = 22 + R() * 25, ph = R() * 6, col = b % 2 ? th.c2 : th.c1;
      const g = c.createLinearGradient(0, y - 40, 0, y + 150);
      g.addColorStop(0, rgbaHex(col, 0)); g.addColorStop(0.3, rgbaHex(col, 0.3)); g.addColorStop(1, rgbaHex(col, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, y + 150);
      for (let x = 0; x <= W; x += 14) c.lineTo(x, y + Math.sin(x * 0.007 + ph) * amp + Math.sin(x * 0.017 + ph * 2) * 10);
      c.lineTo(W, y + 150); c.closePath(); c.fill();
    }
    ridge(c, W, H, 340, 150, 90, mix(th.bot, th.glow, 0.16), R, rgbaHex(th.glow, 0.5));
    ridge(c, W, H, 420, 100, 70, mix(th.bot, '#000000', 0.25), R, rgbaHex(th.glow, 0.28));
  },
  // 3 desert: low sun, dunes, pyramids
  (c, th, R, W, H) => {
    const sx = 200 + R() * 620, sy = 285;
    halo(c, sx, sy, 330, th.glow, 0.4);
    const sg = c.createRadialGradient(sx, sy, 4, sx, sy, 78);
    sg.addColorStop(0, mix(th.glow, '#ffffff', 0.5)); sg.addColorStop(1, th.glow);
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 76, 0, 6.3); c.fill();
    dunes(c, W, H, 365, 55, mix(th.c1, th.bot, 0.45), R);
    for (let i = 0; i < 2; i++) {
      const px = 80 + R() * 800, ph = 60 + R() * 60;
      c.fillStyle = mix(th.c2, th.bot, 0.5);
      c.beginPath(); c.moveTo(px - ph * 1.1, 400); c.lineTo(px, 400 - ph); c.lineTo(px + ph * 1.1, 400); c.closePath(); c.fill();
    }
    dunes(c, W, H, 420, 45, mix(th.c2, th.bot, 0.35), R);
    dunes(c, W, H, 470, 35, mix(th.bot, '#000000', 0.2), R);
  },
  // 4 volcano
  (c, th, R, W, H) => {
    halo(c, 517, 470, 560, th.c1, 0.22);
    const vx = 140 + R() * 560, vw = 300 + R() * 120, vh = 230 + R() * 60, top = 454 - vh;
    c.fillStyle = mix(th.pillar, th.bot, 0.3);
    c.beginPath(); c.moveTo(vx - vw, 470); c.lineTo(vx - 46, top); c.lineTo(vx + 46, top); c.lineTo(vx + vw, 470); c.closePath(); c.fill();
    halo(c, vx, top, 120, th.c2, 0.6);
    c.strokeStyle = rgbaHex(th.c1, 0.8); c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const sx = vx + (R() - 0.5) * 70; c.beginPath(); c.moveTo(sx, top + 4);
      let x = sx, y = top + 4;
      for (let j = 0; j < 4; j++) { x += (R() - 0.5) * 40 + (sx - vx) * 0.5; y += 34 + R() * 28; c.lineTo(x, y); }
      c.stroke();
    }
    for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(60,40,38,.18)'; c.beginPath(); c.arc(vx + (R() - 0.5) * 80 + i * 8, top - 20 - i * 34, 26 + i * 8, 0, 6.3); c.fill(); }
    ridge(c, W, H, 450, 70, 80, mix(th.pillar, '#000000', 0.3), R);
    const lg = c.createLinearGradient(0, 470, 0, H);
    lg.addColorStop(0, rgbaHex(th.c1, 0.55)); lg.addColorStop(1, rgbaHex(th.c2, 0.1));
    c.fillStyle = lg; c.fillRect(0, 470, W, H - 470);
  },
  // 5 forest
  (c, th, R, W, H) => {
    moon(c, 120 + R() * 800, 80 + R() * 50, 30, th, 0.1);
    shafts(c, th, R, 4, 0.05);
    pines(c, W, H, 400, 130, 230, mix(th.c2, th.bot, 0.3), 16, R);
    const fg = c.createLinearGradient(0, 300, 0, 470);
    fg.addColorStop(0, rgbaHex(th.glow, 0)); fg.addColorStop(1, rgbaHex(th.glow, 0.1));
    c.fillStyle = fg; c.fillRect(0, 300, W, 170);
    pines(c, W, H, 470, 170, 300, mix(th.c2, '#000000', 0.45), 10, R);
  },
  // 6 sea
  (c, th, R, W, H) => {
    for (let i = 0; i < 6; i++) {
      const x0 = R() * W, w = 50 + R() * 60, sh = c.createLinearGradient(0, 0, 0, 470);
      sh.addColorStop(0, rgbaHex(th.glow, 0.14)); sh.addColorStop(1, rgbaHex(th.glow, 0));
      c.fillStyle = sh; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + w, 0); c.lineTo(x0 + w - 220, 470); c.lineTo(x0 - 220, 470); c.closePath(); c.fill();
    }
    for (let i = 0; i < 4; i++) {   // far fish
      const fx = R() * W, fy = 150 + R() * 230, s = 0.7 + R();
      c.fillStyle = rgbaHex(th.glow, 0.12); c.beginPath(); c.ellipse(fx, fy, 18 * s, 7 * s, 0, 0, 6.3); c.fill();
      c.beginPath(); c.moveTo(fx - 16 * s, fy); c.lineTo(fx - 30 * s, fy - 8 * s); c.lineTo(fx - 30 * s, fy + 8 * s); c.closePath(); c.fill();
    }
    ridge(c, W, H, 500, 70, 90, mix(th.c2, th.bot, 0.5), R);
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {   // kelp
      const x = R() * W, h = 110 + R() * 200;
      c.strokeStyle = rgbaHex(mix(th.c1, '#2fbf7a', 0.4), 0.32); c.lineWidth = 4 + R() * 4;
      c.beginPath(); c.moveTo(x, H);
      for (let j = 1; j <= 6; j++) c.lineTo(x + Math.sin(j * 0.9 + i) * 15, H - j * h / 6);
      c.stroke();
    }
  },
  // 7 space
  (c, th, R, W, H) => {
    for (let i = 0; i < 4; i++) halo(c, R() * W, R() * 380, 180 + R() * 150, i % 2 ? th.c1 : th.c2, 0.2);
    starfield(c, W, H, 170, R, '#ffffff', H);
    const px = 120 + R() * 780, py = 90 + R() * 120, pr = 60 + R() * 50;
    const pg = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    pg.addColorStop(0, mix(th.c1, '#ffffff', 0.35)); pg.addColorStop(1, mix(th.c1, '#000000', 0.55));
    c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, 6.3); c.fill();
    c.save(); c.translate(px, py); c.rotate(-0.4);
    c.strokeStyle = rgbaHex(th.glow, 0.35); c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, pr * 1.8, pr * 0.42, 0, 0.15, Math.PI - 0.15); c.stroke();
    c.restore();
    c.fillStyle = rgbaHex(th.glow, 0.3); c.beginPath(); c.arc(px + pr * 2, py + 70, 9, 0, 6.3); c.fill();
  },
  // 8 neon city
  (c, th, R, W, H) => {
    const sx = 517, sy = 330, r = 125;
    halo(c, sx, sy, 420, th.c1, 0.25);
    const sg = c.createLinearGradient(0, sy - r, 0, sy + r);
    sg.addColorStop(0, th.c2); sg.addColorStop(1, th.c1);
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, r, 0, 6.3); c.fill();
    c.fillStyle = th.bot;
    for (let i = 0; i < 6; i++) c.fillRect(sx - r, sy + 8 + i * 20, r * 2, 3 + i * 2.2);
    const base = 470;
    for (let i = 0; i < 18; i++) {
      const bw = 40 + R() * 50, bx = i * (W / 17) - 20 + R() * 20, bh = 90 + R() * 230;
      c.fillStyle = mix(th.pillar, th.bot, 0.3); c.fillRect(bx, base - bh, bw, bh + 40);
      c.strokeStyle = rgbaHex(R() < 0.5 ? th.c1 : th.c2, 0.45); c.lineWidth = 1.5; c.strokeRect(bx + 0.5, base - bh + 0.5, bw - 1, bh);
      for (let wy = base - bh + 10; wy < base - 6; wy += 14) for (let wx = bx + 6; wx < bx + bw - 8; wx += 11) {
        if (R() < 0.35) { c.fillStyle = rgbaHex([th.c1, th.c2, th.accent][(R() * 3) | 0], 0.5 + R() * 0.4); c.fillRect(wx, wy, 5, 7); }
      }
    }
    c.strokeStyle = rgbaHex(th.c2, 0.22); c.lineWidth = 1;
    for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(517, 485); c.lineTo(517 + i * 130, H); c.stroke(); }
    for (let k = 1; k <= 7; k++) { const y = 485 + k * k * 1.9; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  },
  // 9 sakura temple
  (c, th, R, W, H) => {
    moon(c, 300 + R() * 300, 120 + R() * 40, 84, th, 0.16);
    ridge(c, W, H, 400, 130, 100, mix(th.pillar, th.glow, 0.1), R);
    const px = 560 + R() * 280, s = 1 + R() * 0.3;
    c.fillStyle = mix(th.pillar, '#000000', 0.2);
    for (let t = 0; t < 5; t++) {
      const w = (118 - t * 18) * s, h = 32 * s, y = 470 - t * (h + 12 * s);
      c.fillRect(px - w * 0.36, y - h, w * 0.72, h);
      c.beginPath(); c.moveTo(px - w * 0.9, y - h + 5); c.lineTo(px - w * 0.55, y - h - 15 * s); c.lineTo(px + w * 0.55, y - h - 15 * s); c.lineTo(px + w * 0.9, y - h + 5); c.closePath(); c.fill();
    }
    c.fillRect(px - 1.5, 470 - 5 * (44 * s) - 40 * s, 3, 40 * s);
    ridge(c, W, H, 470, 50, 70, mix(th.pillar, '#000000', 0.4), R);
    // cherry branches
    c.strokeStyle = mix(th.pillar, '#000000', 0.5); c.lineCap = 'round'; c.lineWidth = 9;
    const bx = R() * 80;
    c.beginPath(); c.moveTo(bx - 20, 175); c.quadraticCurveTo(bx + 160, 150 + R() * 30, bx + 330 + R() * 80, 215 + R() * 30); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(bx + 120, 165); c.quadraticCurveTo(bx + 200, 130, bx + 290, 140 + R() * 30); c.stroke();
    for (let i = 0; i < 90; i++) {
      const t = R(), x = bx + t * 330 + (R() - 0.5) * 60, y = 150 + t * 60 + (R() - 0.5) * 60;
      c.fillStyle = rgbaHex(R() < 0.5 ? th.c1 : th.c2, 0.45 + R() * 0.4);
      c.beginPath(); c.arc(x, y, 4 + R() * 9, 0, 6.3); c.fill();
    }
  }
];

// ---------------------------------------------------------------------
//  static background builder (called per level and on resize)
// ---------------------------------------------------------------------
function buildBackground() {
  const G = Game;
  if (!G.bg) G.bg = document.createElement('canvas');
  const sn = G.sceneOverride || G.level;
  const th = G.theme = themeFor(sn);
  const cv = G.bg;
  cv.width = Math.round(G.W * G.res); cv.height = Math.round(G.H * G.res);
  const c = cv.getContext('2d');
  c.setTransform(G.res, 0, 0, G.res, 0, 0);
  const W = G.W, H = G.H;
  const R = mulberry(sn * 7919 + 13);

  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  c.save(); SCENES[th.kind](c, th, R, W, H); c.restore();

  // fog under the arena
  const fg = c.createLinearGradient(0, 440, 0, H);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = fg; c.fillRect(0, 440, W, H - 440);
  // arena spotlight
  let rg = c.createRadialGradient(517, 430, 20, 517, 430, 460);
  rg.addColorStop(0, 'rgba(255,255,255,0.08)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // vignette
  rg = c.createRadialGradient(517, 290, 260, 517, 290, 650);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.48)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);

  // platform chips (seeded so they never flicker)
  G.chips = [];
  const bw = (G.PR - G.PL) / 6;
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) {
    G.chips.push({ x: G.PL + i * bw + 12 + R() * (bw - 30), y: G.GY + 10 + R() * 28, w: 3 + R() * 7, h: 2 + R() * 2 });
  }

  G.mood = (G.mode !== 'online' && G.level % 5 === 0) ? (G.level === 100 ? 'final' : 'boss') : null;
  ambientInit(th);
}

// ---------------------------------------------------------------------
//  ambient particles
// ---------------------------------------------------------------------
const AMB_SETS = { 1: [[1, 130]], 2: [[2, 95]], 3: [[3, 55]], 4: [[4, 60], [41, 28]], 5: [[5, 32], [51, 22]], 6: [[6, 46]], 7: [[7, 70]], 8: [[8, 34]], 9: [[9, 46]] };

function ambSpawn(p, k, init, th) {
  const W = 1034, H = 580, rr = Math.random;
  p.k = k; p.ph = rr() * 6.28; p.z = 1; p.glow = false; p.col = '#ffffff';
  switch (k) {
    case 1: p.x = rnd(-60, W + 60); p.y = init ? rnd(0, H) : rnd(-40, -5); p.vx = -2.4; p.vy = rnd(15, 21); p.len = rnd(10, 20); p.a = rnd(0.18, 0.45); break;
    case 2: p.x = rnd(0, W); p.y = init ? rnd(0, H) : -8; p.vx = rnd(-0.25, 0.25); p.vy = rnd(0.5, 1.7); p.r = rnd(1, 3.4); p.a = rnd(0.45, 0.9); p.z = rr() < 0.35 ? 0 : 1; break;
    case 3: p.x = init ? rnd(0, W) : -60; p.y = rnd(80, 560); p.vx = rnd(9, 17); p.vy = rnd(-0.4, 0.4); p.len = rnd(18, 50); p.a = rnd(0.06, 0.2); break;
    case 4: p.x = rnd(0, W); p.y = init ? rnd(0, H) : H + 10; p.vx = rnd(-0.3, 0.6); p.vy = -rnd(0.6, 2.2); p.r = rnd(1, 3); p.a = rnd(0.5, 1); p.glow = true; p.col = rr() < 0.5 ? '#ff7a2a' : '#ffc04a'; break;
    case 41: p.x = rnd(0, W); p.y = init ? rnd(0, H) : -8; p.vx = rnd(-0.2, 0.5); p.vy = rnd(0.3, 0.9); p.r = rnd(1, 2.2); p.a = rnd(0.2, 0.45); p.col = '#9a8f8a'; break;
    case 5: p.x = rnd(60, W - 60); p.y = rnd(140, 500); p.vx = rnd(-0.4, 0.4); p.vy = rnd(-0.3, 0.3); p.r = rnd(1.5, 3); p.z = 0; p.glow = true; p.col = '#d9ff7a'; break;
    case 51: p.x = rnd(0, W); p.y = init ? rnd(0, H) : -10; p.vx = rnd(-0.3, 0.6); p.vy = rnd(0.7, 1.5); p.r = rnd(2.5, 4.5); p.col = ['#6fae52', '#8bbf4a', '#b98a45', '#c9a24b'][(rr() * 4) | 0]; break;
    case 6: p.x = rnd(0, W); p.y = init ? rnd(0, H) : H + 12; p.vx = 0; p.vy = -rnd(0.4, 1.5); p.r = rnd(2, 9); p.z = rr() < 0.5 ? 0 : 1; break;
    case 7: p.x = rnd(0, W); p.y = rnd(0, H * 0.8); p.r = rnd(0.8, 2.2); p.z = 0; p.vx = p.vy = 0; break;
    case 8: p.x = rnd(0, W); p.y = init ? rnd(0, H) : H + 10; p.vx = rnd(-0.15, 0.15); p.vy = -rnd(0.3, 1.1); p.r = rnd(3, 9); p.a = rnd(0.2, 0.55); p.z = 0; p.glow = true; p.col = [th.c1, th.c2, th.accent][(rr() * 3) | 0]; break;
    case 9: p.x = rnd(-40, W); p.y = init ? rnd(0, H) : -12; p.vx = rnd(-0.2, 1.1); p.vy = rnd(0.5, 1.4); p.r = rnd(3, 6); p.a = rnd(0.6, 0.95); p.col = rr() < 0.5 ? th.c1 : th.c2; break;
  }
}

function ambientInit(th) {
  const G = Game;
  const A = G.amb = { th, p: [], t: 0, nextBolt: 200 + rnd(0, 300), bolt: null, boltT: 0, nextShoot: 200 + rnd(0, 400), shoot: null };
  for (const set of (AMB_SETS[th.kind] || [])) {
    for (let i = 0; i < set[1]; i++) { const p = {}; ambSpawn(p, set[0], true, th); A.p.push(p); }
  }
  if (G.mood && th.kind !== 4) {      // boss levels: add rising embers everywhere
    for (let i = 0; i < 34; i++) { const p = {}; ambSpawn(p, 4, true, th); A.p.push(p); }
  }
}

function ambientStep() {
  const G = Game, A = G.amb;
  if (!A) return;
  A.t++;
  const W = 1034, H = 580;
  for (const p of A.p) {
    switch (p.k) {
      case 5:
        p.vx = clamp(p.vx + rnd(-0.05, 0.05), -0.6, 0.6); p.vy = clamp(p.vy + rnd(-0.05, 0.05), -0.5, 0.5);
        p.x += p.vx; p.y += p.vy;
        if (p.x < 40 || p.x > W - 40) p.vx = -p.vx; if (p.y < 120 || p.y > 520) p.vy = -p.vy;
        continue;
      case 7: continue;
      case 1: {
        p.x += p.vx; p.y += p.vy;
        const floor = G.onPlatform(p.x) ? G.GY : H + 20;
        if (p.y > floor) {
          if (floor === G.GY && Math.random() < 0.35) {
            for (let i = 0; i < 2; i++) G.parts.push({ x: p.x, y: G.GY, vx: rnd(-1, 1), vy: -rnd(1, 2.5), life: 10, max: 10, size: 1.2, col: '#bcd6ff', g: 0.2 });
          }
          ambSpawn(p, 1, false, A.th);
        }
        continue;
      }
    }
    p.x += p.vx; p.y += p.vy;
    if (p.k === 2 || p.k === 51 || p.k === 9 || p.k === 6) p.x += Math.sin(A.t * 0.03 + p.ph) * 0.5;
    if (p.y > H + 15 || p.y < -15 || p.x > W + 70 || p.x < -70) ambSpawn(p, p.k, false, A.th);
  }
  // lightning
  if (A.th.kind === 1) {
    if (--A.nextBolt <= 0) {
      A.nextBolt = 240 + rnd(0, 420);
      let x = rnd(150, 880), y = 0; const pts = [[x, y]];
      while (y < 300) { x += rnd(-34, 34); y += rnd(24, 48); pts.push([x, y]); }
      A.bolt = pts; A.boltT = 9;
      G.flash = Math.max(G.flash, 0.4); Sfx.thunder();
    }
    if (A.boltT > 0 && --A.boltT === 0) A.bolt = null;
  }
  // shooting star
  if (A.th.kind === 7) {
    if (!A.shoot && --A.nextShoot <= 0) { A.shoot = { x: rnd(200, 900), y: rnd(20, 160), vx: -rnd(9, 14), vy: rnd(4, 7), life: 40 }; A.nextShoot = 240 + rnd(0, 420); }
    if (A.shoot) { A.shoot.x += A.shoot.vx; A.shoot.y += A.shoot.vy; if (--A.shoot.life <= 0) A.shoot = null; }
  }
}

function drawAmbient(c, z) {
  const A = Game.amb;
  if (!A) return;
  c.save();
  c.lineCap = 'round';
  for (const p of A.p) {
    if (p.z !== z) continue;
    switch (p.k) {
      case 1:
        c.strokeStyle = 'rgba(190,210,255,' + p.a + ')'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.7, p.y - p.len); c.stroke(); break;
      case 2:
        c.fillStyle = 'rgba(255,255,255,' + p.a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill(); break;
      case 3:
        c.strokeStyle = 'rgba(255,226,170,' + p.a + ')'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.len, p.y - p.vy * 2); c.stroke(); break;
      case 4: case 5: case 8: {
        let a = p.a == null ? 1 : p.a;
        if (p.k === 5) { const b = 0.5 + 0.5 * Math.sin(A.t * 0.05 + p.ph); a = b * b; }
        if (p.k === 8) { c.save(); c.translate(p.x, p.y); c.rotate(p.ph + A.t * 0.01); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgbaHex(p.col, a); c.lineWidth = 1.6; c.strokeRect(-p.r / 2, -p.r / 2, p.r, p.r); c.restore(); break; }
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = rgbaHex(p.col, a * 0.3); c.beginPath(); c.arc(p.x, p.y, p.r * (p.k === 5 ? 4 : 2.6), 0, 6.3); c.fill();
        c.fillStyle = rgbaHex(p.col, a); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill();
        c.globalCompositeOperation = 'source-over'; break;
      }
      case 41:
        c.fillStyle = 'rgba(154,143,138,' + p.a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill(); break;
      case 51: case 9:
        c.save(); c.translate(p.x, p.y); c.rotate(p.ph + A.t * 0.03);
        c.fillStyle = p.k === 9 ? rgbaHex(p.col, p.a) : p.col;
        c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, 6.3); c.fill(); c.restore(); break;
      case 6:
        c.strokeStyle = 'rgba(200,255,255,.4)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, 6.3); c.fill(); break;
      case 7: {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(A.t * 0.03 + p.ph));
        c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill(); break;
      }
    }
  }
  if (z === 1) {
    if (A.bolt) {         // lightning bolt
      c.globalCompositeOperation = 'lighter';
      for (const w of [[8, 0.18], [3, 0.9]]) {
        c.strokeStyle = 'rgba(200,225,255,' + w[1] + ')'; c.lineWidth = w[0]; c.lineJoin = 'round';
        c.beginPath(); A.bolt.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    }
    if (A.shoot) {        // shooting star
      const s = A.shoot, g = c.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 2.4; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 6, s.y - s.vy * 6); c.stroke();
    }
  }
  c.restore();
}

// boss / final-boss atmosphere
function drawMood(c) {
  const G = Game;
  if (!G.mood) return;
  const t = performance.now() / 1000, final = G.mood === 'final';
  const col = final ? '255,200,60' : '255,40,30';
  const a = (final ? 0.16 : 0.14) + 0.07 * Math.sin(t * 3);
  const rg = c.createRadialGradient(517, 300, 300, 517, 300, 640);
  rg.addColorStop(0, 'rgba(' + col + ',0)'); rg.addColorStop(1, 'rgba(' + col + ',' + a.toFixed(3) + ')');
  c.fillStyle = rg; c.fillRect(0, 0, G.W, G.H);
}
