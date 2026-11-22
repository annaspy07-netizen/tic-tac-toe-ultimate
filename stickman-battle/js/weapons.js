'use strict';
const D2R = Math.PI / 180;

function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fs(c, fill, stroke, lw) {
  c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}

/*
  Weapon definition
  len   : blade length in px (from grip origin along +x)
  grip  : handle length behind the origin (used for icons)
  dur   : attack duration in frames (60fps)
  type  : 'swing' (overhead arc) | 'stab' (thrust) | 'punch'
  idle / wind / end : weapon angle in degrees (0 = forward, negative = up)
*/
const FISTS = {
  id: 'fists', name: 'FISTS', price: 0, len: 0, grip: 0, h: 0,
  dmg: 6, dur: 24, kb: 0.6, lunge: 0.9, type: 'punch', idle: 0, thick: 11, draw: null
};

const WEAPONS = [
  {
    id: 'bat', name: 'BAT', price: 100, len: 64, grip: 12, h: 7.5, oy: 0,
    dmg: 12, dur: 30, kb: 1.0, lunge: 1.3, type: 'swing', idle: -55, wind: -125, end: 55, thick: 7,
    draw(c, L) {
      c.beginPath();
      c.moveTo(-12, -2.6); c.lineTo(L * 0.5, -4.4);
      c.quadraticCurveTo(L + 3, -7.5, L, 0);
      c.quadraticCurveTo(L + 3, 7.5, L * 0.5, 4.4);
      c.lineTo(-12, 2.6); c.closePath();
      fs(c, '#dba96a', '#a9772f', 1.2);
      c.beginPath(); c.arc(-12, 0, 3.8, 0, 6.3); fs(c, '#b98445', '#8a5f26', 1);
    }
  },
  {
    id: 'staff', name: 'STAFF', price: 150, len: 112, grip: 12, h: 3, oy: 0,
    dmg: 11, dur: 32, kb: 1.1, lunge: 1.0, type: 'swing', idle: -50, wind: -95, end: 40, thick: 5,
    draw(c, L) {
      rrect(c, -12, -2.6, L + 12, 5.2, 2.4); fs(c, '#e3bd88', '#a8782f', 1);
      c.fillStyle = '#f6efde';
      for (const t of [0.04, 0.5, 0.94]) c.fillRect(L * t - 3, -2.8, 6, 5.6);
      c.fillStyle = '#c99a58';
      for (let x = L * 0.4; x < L * 0.6; x += 4) c.fillRect(x, -2.6, 2, 5.2);
    }
  },
  {
    id: 'kanabo', name: 'KANABO', price: 200, len: 76, grip: 12, h: 10, oy: 0,
    dmg: 21, dur: 46, kb: 1.8, lunge: 1.4, type: 'swing', idle: -60, wind: -135, end: 60, thick: 11,
    draw(c, L) {
      rrect(c, -12, -2.6, L * 0.4 + 12, 5.2, 2); fs(c, '#744e2c', '#4e3219', 1);
      c.beginPath();
      c.moveTo(L * 0.3, -5); c.lineTo(L - 4, -9.5); c.quadraticCurveTo(L + 3, 0, L - 4, 9.5); c.lineTo(L * 0.3, 5); c.closePath();
      fs(c, '#dcb070', '#9b7134', 1.2);
      c.fillStyle = '#6e4a26';
      for (let i = 0; i < 5; i++) {
        const x = L * 0.42 + i * L * 0.11;
        const sp = 1.6 + i * 0.5;
        c.beginPath(); c.arc(x, -sp * 1.5, 1.7, 0, 6.3); c.fill();
        c.beginPath(); c.arc(x, sp * 1.5, 1.7, 0, 6.3); c.fill();
        c.beginPath(); c.arc(x + L * 0.05, 0, 1.7, 0, 6.3); c.fill();
      }
    }
  },
  {
    id: 'nunchaku', name: 'NUNCHAKU', price: 250, len: 58, grip: 8, h: 4, oy: 0, flex: true,
    dmg: 9, dur: 22, kb: 0.6, lunge: 1.5, type: 'swing', idle: -40, wind: -110, end: 70, thick: 6,
    draw(c, L, ex) {
      const bend = (ex && ex.bend) || 0;
      const a = L * 0.44, j = L * 0.56;
      rrect(c, -8, -3, a + 8, 6, 2.5); fs(c, '#dcb070', '#9b7134', 1);
      c.strokeStyle = '#8c8c8c'; c.lineWidth = 1.6;
      for (let x = a + 1; x < j; x += 3.4) { c.beginPath(); c.arc(x, 0, 1.6, 0, 6.3); c.stroke(); }
      c.save(); c.translate(j, 0); c.rotate(bend);
      rrect(c, 0, -3, a, 6, 2.5); fs(c, '#dcb070', '#9b7134', 1);
      c.restore();
    }
  },
  {
    id: 'butterfly', name: 'BUTTERFLY', price: 300, len: 36, grip: 24, h: 5, oy: 0,
    dmg: 8, dur: 16, kb: 0.45, lunge: 1.9, type: 'stab', idle: -20, thick: 6,
    draw(c, L) {
      c.fillStyle = '#2f2f2f';
      c.fillRect(-24, -4.5, 26, 3.6); c.fillRect(-24, 0.9, 26, 3.6);
      c.fillStyle = '#b97e45'; c.fillRect(-20, -3.8, 12, 2); c.fillRect(-20, 1.8, 12, 2);
      c.beginPath();
      c.moveTo(1, -4); c.lineTo(L * 0.72, -4.4); c.lineTo(L, -0.5); c.lineTo(L * 0.86, 3); c.lineTo(1, 3.6); c.closePath();
      fs(c, '#d7dde2', '#8d959c', 1);
      c.strokeStyle = '#9aa3aa'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(4, -0.4); c.lineTo(L * 0.85, -0.4); c.stroke();
    }
  },
  {
    id: 'butcher', name: 'BUTCHER', price: 350, len: 48, grip: 16, h: 11.5, oy: 5.5,
    dmg: 19, dur: 36, kb: 1.2, lunge: 1.4, type: 'swing', idle: -60, wind: -130, end: 60, thick: 12,
    draw(c, L) {
      rrect(c, -16, -3.6, 24, 7.2, 3); fs(c, '#b9763e', '#7d4a21', 1);
      c.fillStyle = '#e8e8e8';
      c.beginPath(); c.arc(-9, 0, 1.3, 0, 6.3); c.fill(); c.beginPath(); c.arc(-1, 0, 1.3, 0, 6.3); c.fill();
      rrect(c, 7, -5, L - 7, 22, 3); fs(c, '#cfd5da', '#7b838a', 1.2);
      c.fillStyle = '#6c7278'; c.fillRect(7, -5, L - 7, 3.4);
      c.fillStyle = '#4c5258'; c.beginPath(); c.arc(L - 10, 8, 2.6, 0, 6.3); c.fill();
    }
  },
  {
    id: 'machete', name: 'MACHETE', price: 400, len: 64, grip: 16, h: 9, oy: -1.5,
    dmg: 16, dur: 28, kb: 0.9, lunge: 1.4, type: 'swing', idle: -55, wind: -125, end: 55, thick: 8,
    draw(c, L) {
      rrect(c, -16, -3.2, 20, 6.4, 3); fs(c, '#b9763e', '#7d4a21', 1);
      c.fillStyle = '#d6a24c'; c.fillRect(2, -4.5, 3, 9);
      c.beginPath();
      c.moveTo(5, -3); c.quadraticCurveTo(L * 0.7, -6, L, 6);
      c.quadraticCurveTo(L * 0.55, 9, 5, 4); c.closePath();
      fs(c, '#d4dadf', '#808890', 1.1);
      c.strokeStyle = '#f3f6f8'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(8, -1); c.quadraticCurveTo(L * 0.6, -3, L * 0.9, 4); c.stroke();
    }
  },
  {
    id: 'katana', name: 'KATANA', price: 450, len: 92, grip: 24, h: 7, oy: 0,
    dmg: 19, dur: 24, kb: 0.9, lunge: 1.6, type: 'swing', idle: -55, wind: -120, end: 50, thick: 5,
    draw(c, L) {
      rrect(c, -24, -3.2, 25, 6.4, 3); fs(c, '#2c2c2c', '#111', 1);
      c.strokeStyle = '#7b7b7b'; c.lineWidth = 1;
      for (let x = -21; x < -1; x += 5) { c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 3, 0); c.lineTo(x, 3); c.stroke(); }
      c.beginPath(); c.ellipse(2, 0, 2.6, 7, 0, 0, 6.3); fs(c, '#c9a24b', '#8d6d1f', 1);
      c.beginPath();
      c.moveTo(4, -2.2); c.quadraticCurveTo(L * 0.55, -5, L, -1.2);
      c.quadraticCurveTo(L * 0.55, 1.6, 4, 2.2); c.closePath();
      fs(c, '#e8edf0', '#97a0a6', 1);
      c.strokeStyle = '#b3bcc2'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(6, 0); c.quadraticCurveTo(L * 0.55, -1.6, L * 0.95, -0.9); c.stroke();
    }
  },
  {
    id: 'mace', name: 'MACE', price: 500, len: 76, grip: 14, h: 18, oy: 0,
    dmg: 30, dur: 50, kb: 2.2, lunge: 1.2, type: 'swing', idle: -60, wind: -135, end: 60, thick: 16,
    draw(c, L) {
      rrect(c, -14, -2.6, L - 8, 5.2, 2.4); fs(c, '#8c8c8c', '#5a5a5a', 1);
      c.beginPath(); c.arc(-14, 0, 3.4, 0, 6.3); fs(c, '#bdbdbd', '#777', 1);
      const cx = L - 12;
      c.fillStyle = '#8a8a8a'; c.strokeStyle = '#5a5a5a'; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        const ca = Math.cos(a), sa = Math.sin(a);
        c.beginPath();
        c.moveTo(cx + ca * 8 - sa * 3.4, sa * 8 + ca * 3.4);
        c.lineTo(cx + ca * 17.5, sa * 17.5);
        c.lineTo(cx + ca * 8 + sa * 3.4, sa * 8 - ca * 3.4);
        c.closePath(); c.fill(); c.stroke();
      }
      c.beginPath(); c.arc(cx, 0, 10, 0, 6.3); fs(c, '#a5a5a5', '#666', 1.2);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(cx - 3, -3, 3, 0, 6.3); c.fill();
    }
  },

  // ---------------- second batch ----------------
  {
    id: 'mjolnir', name: 'MJOLNIR', price: 550, len: 72, grip: 14, h: 14, oy: 0,
    dmg: 28, dur: 52, kb: 2.4, lunge: 1.2, type: 'swing', idle: -60, wind: -140, end: 60, thick: 18,
    draw(c, L) {
      rrect(c, -12, -2.8, L * 0.72 + 12, 5.6, 2.5); fs(c, '#8a6a45', '#5a4129', 1);
      c.strokeStyle = '#5a4129'; c.lineWidth = 1;
      for (let x = -6; x < L * 0.5; x += 4) { c.beginPath(); c.moveTo(x, -2.8); c.lineTo(x + 2, 2.8); c.stroke(); }
      c.beginPath(); c.arc(-12, 0, 3.6, 0, 6.3); fs(c, '#6b4e30', '#3f2d1a', 1);
      rrect(c, L * 0.52, -13, L * 0.48, 26, 3); fs(c, '#a9b0b8', '#555c65', 1.4);
      c.fillStyle = '#e3e7ec'; c.beginPath();
      c.moveTo(L * 0.6, -11); c.lineTo(L * 0.72, -11); c.lineTo(L * 0.64, 11); c.lineTo(L * 0.54 + 2, 11); c.closePath(); c.fill();
      c.fillStyle = '#7b828a'; c.fillRect(L * 0.52, 8, L * 0.48, 5);
    }
  },
  {
    id: 'chainmace', name: 'CHAIN MACE', price: 600, len: 84, grip: 10, h: 17, oy: 0, flex: true,
    dmg: 24, dur: 44, kb: 1.9, lunge: 1.2, type: 'swing', idle: -55, wind: -135, end: 60, thick: 18,
    draw(c, L, ex) {
      const bend = (ex && ex.bend) || 0;
      const a = L * 0.4, r = L - a;
      rrect(c, -10, -3, a + 10, 6, 2.5); fs(c, '#8b5e34', '#5a3a1c', 1);
      c.beginPath(); c.arc(-10, 0, 3.4, 0, 6.3); fs(c, '#c8c8c8', '#777', 1);
      c.save(); c.translate(a, 0); c.rotate(bend);
      c.strokeStyle = '#8e8e8e'; c.lineWidth = 1.6;
      for (let x = 2; x < r - 16; x += 4) { c.beginPath(); c.arc(x, 0, 1.8, 0, 6.3); c.stroke(); }
      const cx = r - 12;
      c.fillStyle = '#8a8a8a'; c.strokeStyle = '#5a5a5a'; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        const an = k * Math.PI / 4, ca = Math.cos(an), sa = Math.sin(an);
        c.beginPath();
        c.moveTo(cx + ca * 7 - sa * 3, sa * 7 + ca * 3); c.lineTo(cx + ca * 15, sa * 15); c.lineTo(cx + ca * 7 + sa * 3, sa * 7 - ca * 3);
        c.closePath(); c.fill(); c.stroke();
      }
      c.beginPath(); c.arc(cx, 0, 8.5, 0, 6.3); fs(c, '#a5a5a5', '#666', 1.2);
      c.restore();
    }
  },
  {
    id: 'sword', name: 'SWORD', price: 650, len: 98, grip: 20, h: 9, oy: 0,
    dmg: 21, dur: 28, kb: 1.0, lunge: 1.5, type: 'swing', idle: -55, wind: -125, end: 55, thick: 6,
    draw(c, L) {
      rrect(c, -18, -2.6, 20, 5.2, 2); fs(c, '#6b4a2b', '#3d2918', 1);
      c.beginPath(); c.arc(-19, 0, 3.6, 0, 6.3); fs(c, '#c9a24b', '#8d6d1f', 1);
      rrect(c, 1, -9, 4.5, 18, 2); fs(c, '#c9a24b', '#8d6d1f', 1);
      c.beginPath();
      c.moveTo(5, -4); c.lineTo(L - 10, -4); c.lineTo(L, 0); c.lineTo(L - 10, 4); c.lineTo(5, 4); c.closePath();
      fs(c, '#e2e7eb', '#8b949b', 1.1);
      c.strokeStyle = '#a9b2b9'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(8, 0); c.lineTo(L - 8, 0); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.65)';
      for (let x = 14; x < L - 16; x += 16) { c.beginPath(); c.moveTo(x, -3.4); c.lineTo(x + 7, -3.4); c.lineTo(x + 3, 3.4); c.lineTo(x - 4, 3.4); c.closePath(); c.fill(); }
    }
  },
  {
    id: 'holyblade', name: 'HOLY BLADE', price: 100, len: 82, grip: 16, h: 11, oy: 0,
    dmg: 14, dur: 26, kb: 0.9, lunge: 1.4, type: 'swing', idle: -55, wind: -125, end: 55, thick: 6,
    draw(c, L) {
      rrect(c, -16, -2.6, 17, 5.2, 2); fs(c, '#d9a850', '#9a6f24', 1);
      rrect(c, 0, -11, 6, 22, 2.4); fs(c, '#e6b95a', '#9a6f24', 1.2);
      c.beginPath(); c.arc(3, 0, 2, 0, 6.3); fs(c, '#6fd3ff', '#2d8fb8', 1);
      c.beginPath();
      c.moveTo(6, -4.4); c.lineTo(L - 12, -4.4); c.lineTo(L, 0); c.lineTo(L - 12, 4.4); c.lineTo(6, 4.4); c.closePath();
      fs(c, '#f6f2e0', '#caa24b', 1.2);
      c.strokeStyle = '#ffe9a8'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(9, 0); c.lineTo(L - 10, 0); c.stroke();
    }
  },
  {
    id: 'knives', name: 'KNIVES', price: 300, len: 30, grip: 16, h: 6, oy: 0, dual: true,
    dmg: 7, dur: 14, kb: 0.4, lunge: 1.9, type: 'stab', idle: -25, thick: 6,
    draw(c, L) {
      rrect(c, -16, -3.6, 18, 7.2, 3); fs(c, '#d9a766', '#8f6430', 1);
      c.beginPath(); c.arc(-14, 0, 3.4, 0, 6.3); c.strokeStyle = '#8f6430'; c.lineWidth = 1.6; c.stroke();
      c.beginPath();
      c.moveTo(2, -3.4); c.quadraticCurveTo(L * 0.85, -6, L, 5); c.quadraticCurveTo(L * 0.5, 2.2, 2, 3.4); c.closePath();
      fs(c, '#d7dde2', '#848c93', 1);
    }
  },
  {
    id: 'ulu', name: 'ULU', price: 0, unlockLevel: 20, len: 36, grip: 14, h: 15, oy: 0, dual: true,
    dmg: 10, dur: 16, kb: 0.5, lunge: 1.8, type: 'stab', idle: -25, thick: 8,
    draw(c, L) {
      rrect(c, -14, -5.5, 16, 11, 4); fs(c, '#d9a766', '#8f6430', 1);
      c.strokeStyle = '#8f6430'; c.lineWidth = 1;
      for (const x of [-10, -6, -2]) { c.beginPath(); c.moveTo(x, -5.5); c.lineTo(x, 5.5); c.stroke(); }
      c.beginPath();
      c.moveTo(2, -6); c.quadraticCurveTo(L * 0.95, -15, L, 9); c.quadraticCurveTo(L * 0.45, -1, 2, 5); c.closePath();
      fs(c, '#d9dfe4', '#6e767d', 1.2);
    }
  },
  {
    id: 'sai', name: 'SAI', price: 400, len: 40, grip: 18, h: 11, oy: 0, dual: true,
    dmg: 10, dur: 15, kb: 0.5, lunge: 1.8, type: 'stab', idle: -25, thick: 6,
    draw(c, L) {
      rrect(c, -18, -2.4, 19, 4.8, 2); fs(c, '#4d4d4d', '#222', 1);
      c.strokeStyle = '#8a8a8a'; c.lineWidth = 1;
      for (let x = -15; x < 0; x += 3) { c.beginPath(); c.moveTo(x, -2.4); c.lineTo(x, 2.4); c.stroke(); }
      c.strokeStyle = '#b9c0c6'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(1, -10); c.lineTo(1, 10); c.stroke();
      c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(1, -10); c.quadraticCurveTo(8, -11, L * 0.5, -8); c.stroke();
      c.beginPath(); c.moveTo(1, 10); c.quadraticCurveTo(8, 11, L * 0.5, 8); c.stroke();
      c.beginPath();
      c.moveTo(1, -2.4); c.lineTo(L - 6, -1.2); c.lineTo(L, 0); c.lineTo(L - 6, 1.2); c.lineTo(1, 2.4); c.closePath();
      fs(c, '#d3d9de', '#7d858c', 1);
    }
  },
  {
    id: 'flailong', name: 'FLAILONG', price: 500, len: 122, grip: 12, h: 8, oy: 0, flex: true,
    dmg: 22, dur: 48, kb: 1.6, lunge: 1.1, type: 'swing', idle: -50, wind: -125, end: 55, thick: 14,
    draw(c, L, ex) {
      const bend = (ex && ex.bend) || 0;
      const a = L * 0.66, r = L - a;
      rrect(c, -12, -3, a + 12, 6, 2.6); fs(c, '#c9a063', '#8a6528', 1);
      c.fillStyle = '#f2e8d2';
      for (const t of [0.18, 0.5]) c.fillRect(a * t - 2.5, -3.2, 5, 6.4);
      c.save(); c.translate(a, 0); c.rotate(bend);
      c.strokeStyle = '#8e8e8e'; c.lineWidth = 1.5;
      for (let x = 2; x < 10; x += 3.4) { c.beginPath(); c.arc(x, 0, 1.7, 0, 6.3); c.stroke(); }
      rrect(c, 9, -4.6, r - 9, 9.2, 3); fs(c, '#8f8f8f', '#555', 1.1);
      c.fillStyle = '#5c5c5c';
      for (let x = 12; x < r - 4; x += 5) {
        c.beginPath(); c.moveTo(x, -4.6); c.lineTo(x + 1.6, -9); c.lineTo(x + 3.2, -4.6); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x, 4.6); c.lineTo(x + 1.6, 9); c.lineTo(x + 3.2, 4.6); c.closePath(); c.fill();
      }
      c.restore();
    }
  },
  {
    id: 'sansetsukon', name: 'SANSETSUKON', price: 600, len: 120, grip: 8, h: 4, oy: 0, flex: true,
    dmg: 16, dur: 26, kb: 1.0, lunge: 1.5, type: 'swing', idle: -45, wind: -115, end: 65, thick: 6,
    draw(c, L, ex) {
      const bend = (ex && ex.bend) || 0;
      const a = L * 0.31, g = L * 0.035;
      const sec = (x0) => {
        rrect(c, x0, -3, a, 6, 2.5); fs(c, '#d7b27a', '#9b7134', 1);
        c.fillStyle = '#d94c4c'; c.fillRect(x0, -3, 5, 6); c.fillRect(x0 + a - 5, -3, 5, 6);
      };
      c.save();
      sec(-8 + 8 - 8);
      c.translate(a - 8, 0);
      const chain = () => { c.strokeStyle = '#8e8e8e'; c.lineWidth = 1.5; for (let x = 0; x < g; x += 3) { c.beginPath(); c.arc(x + 1, 0, 1.6, 0, 6.3); c.stroke(); } };
      chain();
      c.translate(g, 0); c.rotate(bend);
      sec(0);
      c.translate(a, 0); chain();
      c.translate(g, 0); c.rotate(bend * 1.1);
      sec(0);
      c.restore();
    }
  }
];

// colour of the swing trail (r,g,b)
const TRAIL_COLORS = {
  katana: '190,225,255', sword: '200,225,255', holyblade: '255,228,140', mjolnir: '150,195,255', mace: '255,190,150',
  kanabo: '255,215,160', machete: '210,235,255', butcher: '220,230,240', chainmace: '255,200,160', flailong: '255,210,150'
};
for (const w of WEAPONS) if (TRAIL_COLORS[w.id]) w.trail = TRAIL_COLORS[w.id];

function weaponById(id) {
  return WEAPONS.find(w => w.id === id) || null;
}

// Draws a weapon to a small canvas (shop icon).
function drawWeaponIcon(cv, w, W, H) {
  const k = 3;
  cv.width = W * k; cv.height = H * k;
  const c = cv.getContext('2d');
  c.scale(k, k);
  const span = w.grip + w.len;
  const off = w.dual ? 5 : 0;
  const sc = Math.min(1, (W - 10) / span, (H - 2) / ((w.h + off) * 2 || 1));
  c.translate((W - span * sc) / 2 + w.grip * sc, H / 2 - (w.oy || 0) * sc);
  c.scale(sc, sc);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (w.dual) {
    c.save(); c.translate(0, -off); w.draw(c, w.len, { bend: 0 }); c.restore();
    c.save(); c.translate(0, off); w.draw(c, w.len, { bend: 0 }); c.restore();
  } else w.draw(c, w.len, { bend: 0 });
}
