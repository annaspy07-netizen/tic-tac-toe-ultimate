(() => {
'use strict';

/* =====================================================================
   Stickman Battle 2  -  single-file canvas game
   ===================================================================== */
const W = 960, H = 540, GROUND = 462, GOAL_W = 46, GOAL_H = 150;
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;

/* ------------------------------------------------- language (shared with the Alex Games site: key "ag-lang") */
const I18N = {
  en: {
    weapon: 'Weapon', skin: 'Skin', color: 'Color', boss: 'Boss', soccer: 'SOCCER', survival: 'SURVIVAL', free: 'Free',
    lvlBtn: 'Level ', best: 'Best: ', settings: 'Settings', backMenu: 'Back to menu', language: 'Language', home: '🏠 Home',
    needKey: 'You need a 🔑 key – clear 5 levels to earn one',
    gameOver: 'Game Over', waves: 'Waves: ', newBest: '🏆 New best!', menu: 'Menu', retry: 'Retry',
    keyPlus: '🔑 +1 Key', bossDefeated: 'Boss Defeated!', victory: 'Victory!', nobody: 'Nobody can stop you!',
    levelCleared: n => 'Level ' + n + ' cleared', bossAgain: 'Boss again', nextLevel: 'Next Level',
    defeated: 'Defeated', tryAgain: 'Try a stronger weapon from the shop, or try again!',
    youWin: 'You Win!', youLose: 'You Lose', rematch: 'Rematch',
    you: 'YOU', cpu: 'CPU', bossFight: 'BOSS FIGHT', wave: 'WAVE ', level: 'LEVEL ', enemies: 'Enemies: ', bossBang: 'BOSS!', fight: 'FIGHT!',
    helpFight: 'A/D or ←/→ move  •  W / Space jump  •  J / click attack',
    golden: 'GOLDEN GOAL!', kickoff: 'KICK-OFF!', timeUp: "TIME'S UP!", goal: 'GOAL!', helpSoccer: 'First to 5 goals wins  •  J / click = kick',
    recharging: 'Chest is recharging…', chestOpened: 'Chest Opened!', nice: 'Nice!',
    newItem: (k, n) => '🎁 New ' + k + ': ' + n + '!',
    tabWeapons: 'Weapons', tabSkins: 'Skins', tabColors: 'Colors',
    stats: (d, s) => 'DMG ' + d + ' • SPD ' + s, equipped: 'Equipped', equip: 'Equip', noCash: 'Not enough cash 💵', shop: 'Shop', close: 'Close',
    sound: 'Sound', on: 'ON', off: 'OFF', progress: 'Progress', reset: 'Reset', confirmReset: 'Reset all progress?', progressReset: 'Progress reset',
    help: 'Move: A/D or ←/→<br>Jump: W / ↑ / Space<br>Attack / Kick: J / K / click<br>Clear 5 levels → 🔑 key → Boss fight',
    banked: (r, c) => 'Banked 💵 ' + r + ' (' + c + ' waves)',
  },
  vi: {
    weapon: 'Vũ khí', skin: 'Mũ', color: 'Màu', boss: 'Trùm', soccer: 'BÓNG ĐÁ', survival: 'SINH TỒN', free: 'Miễn phí',
    lvlBtn: 'Màn ', best: 'Cao nhất: ', settings: 'Cài đặt', backMenu: 'Về menu', language: 'Ngôn ngữ', home: '🏠 Trang chủ',
    needKey: 'Bạn cần 🔑 chìa khóa – qua 5 màn để nhận một chiếc',
    gameOver: 'Thua rồi', waves: 'Số đợt: ', newBest: '🏆 Kỷ lục mới!', menu: 'Menu', retry: 'Chơi lại',
    keyPlus: '🔑 +1 Chìa khóa', bossDefeated: 'Hạ gục trùm!', victory: 'Chiến thắng!', nobody: 'Không ai cản nổi bạn!',
    levelCleared: n => 'Đã qua màn ' + n, bossAgain: 'Đánh trùm lại', nextLevel: 'Màn tiếp',
    defeated: 'Thất bại', tryAgain: 'Hãy thử vũ khí mạnh hơn trong cửa hàng, hoặc thử lại!',
    youWin: 'Bạn thắng!', youLose: 'Bạn thua', rematch: 'Đá lại',
    you: 'BẠN', cpu: 'MÁY', bossFight: 'ĐẤU TRÙM', wave: 'ĐỢT ', level: 'MÀN ', enemies: 'Kẻ địch: ', bossBang: 'TRÙM!', fight: 'CHIẾN!',
    helpFight: 'A/D hoặc ←/→ di chuyển  •  W / Space nhảy  •  J / bấm chuột để đánh',
    golden: 'BÀN THẮNG VÀNG!', kickoff: 'KHAI CUỘC!', timeUp: 'HẾT GIỜ!', goal: 'VÀO!', helpSoccer: 'Ai ghi 5 bàn trước thắng  •  J / bấm chuột = sút',
    recharging: 'Rương đang nạp lại…', chestOpened: 'Đã mở rương!', nice: 'Tuyệt!',
    newItem: (k, n) => '🎁 ' + ({ weapon: 'Vũ khí', skin: 'Mũ', color: 'Màu' }[k] || k) + ' mới: ' + n + '!',
    tabWeapons: 'Vũ khí', tabSkins: 'Mũ', tabColors: 'Màu sắc',
    stats: (d, s) => 'Dame ' + d + ' • Tốc ' + s, equipped: 'Đang dùng', equip: 'Dùng', noCash: 'Không đủ tiền 💵', shop: 'Cửa hàng', close: 'Đóng',
    sound: 'Âm thanh', on: 'BẬT', off: 'TẮT', progress: 'Tiến trình', reset: 'Xóa', confirmReset: 'Xóa toàn bộ tiến trình?', progressReset: 'Đã xóa tiến trình',
    help: 'Di chuyển: A/D hoặc ←/→<br>Nhảy: W / ↑ / Space<br>Đánh / Sút: J / K / bấm chuột<br>Qua 5 màn → 🔑 chìa khóa → Đấu trùm',
    banked: (r, c) => 'Đã nhận 💵 ' + r + ' (' + c + ' đợt)',
  },
};
const NAMES_VI = {
  w: { fist: 'Nắm đấm', bat: 'Gậy', sword: 'Kiếm', hammer: 'Búa', axe: 'Rìu', spear: 'Giáo', katana: 'Katana', mace: 'Chùy', none: 'Đá', bow: 'Cung' },
  s: { none: 'Không mũ', cap: 'Mũ lưỡi trai', headband: 'Băng đô', cowboy: 'Cao bồi', tophat: 'Mũ chóp', horns: 'Sừng', helmet: 'Mũ sắt', halo: 'Hào quang', crown: 'Vương miện' },
  c: { '#10a9e8': 'Xanh trời', '#ff5a5a': 'Đỏ', '#ffd23f': 'Vàng', '#5ddc5d': 'Xanh lá', '#b266ff': 'Tím', '#ff8c1a': 'Cam', '#ff6fb5': 'Hồng', '#f2f2f2': 'Trắng', '#3a3a3a': 'Đen', '#00e5c0': 'Bạc hà' },
};
let LANG = 'vi';
try { const g = localStorage.getItem('ag-lang'); if (g === 'vi' || g === 'en') LANG = g; } catch (e) {}
const T = (k, ...a) => { const v = I18N[LANG][k] !== undefined ? I18N[LANG][k] : I18N.en[k]; return typeof v === 'function' ? v(...a) : v; };
const nameOf = (kind, it) => (LANG === 'vi' && NAMES_VI[kind][it.id]) || it.name;
const kindOf = tab => tab === 'weapon' ? 'w' : tab === 'skin' ? 's' : 'c';

/* ---------------------------------------------------------------- data */
const WEAPONS = [
  { id: 'fist',   name: 'Fists',  dmg: 7,  range: 46,  dur: 14, knock: 4,  cost: 0,   len: 0,  thrust: true },
  { id: 'bat',    name: 'Bat',    dmg: 11, range: 78,  dur: 20, knock: 7,  cost: 0,   len: 56 },
  { id: 'sword',  name: 'Sword',  dmg: 14, range: 86,  dur: 18, knock: 6,  cost: 100, len: 58 },
  { id: 'hammer', name: 'Hammer', dmg: 24, range: 84,  dur: 34, knock: 13, cost: 180, len: 62 },
  { id: 'axe',    name: 'Axe',    dmg: 20, range: 82,  dur: 28, knock: 10, cost: 260, len: 58 },
  { id: 'spear',  name: 'Spear',  dmg: 13, range: 118, dur: 24, knock: 5,  cost: 340, len: 98, thrust: true },
  { id: 'katana', name: 'Katana', dmg: 17, range: 96,  dur: 15, knock: 6,  cost: 450, len: 68 },
  { id: 'mace',   name: 'Mace',   dmg: 28, range: 84,  dur: 38, knock: 14, cost: 600, len: 64 },
];
const WBY = {};
WEAPONS.forEach(w => WBY[w.id] = w);
WBY.none = { id: 'none', name: 'Kick', dmg: 0, range: 64, dur: 16, knock: 0, len: 0 };
WBY.bow = { id: 'bow', name: 'Bow', dmg: 0, range: 0, dur: 22, knock: 0, len: 0, thrust: true };

const SKINS = [
  { id: 'none', name: 'No Hat', cost: 0 }, { id: 'cap', name: 'Cap', cost: 50 },
  { id: 'headband', name: 'Headband', cost: 80 }, { id: 'cowboy', name: 'Cowboy', cost: 120 },
  { id: 'tophat', name: 'Top Hat', cost: 160 }, { id: 'horns', name: 'Horns', cost: 200 },
  { id: 'helmet', name: 'Helmet', cost: 250 }, { id: 'halo', name: 'Halo', cost: 300 },
  { id: 'crown', name: 'Crown', cost: 500 },
];
const COLORS = [['#10a9e8', 'Sky'], ['#ff5a5a', 'Red'], ['#ffd23f', 'Gold'], ['#5ddc5d', 'Lime'],
  ['#b266ff', 'Purple'], ['#ff8c1a', 'Orange'], ['#ff6fb5', 'Pink'], ['#f2f2f2', 'Snow'],
  ['#3a3a3a', 'Shadow'], ['#00e5c0', 'Mint']].map(([id, name], i) => ({ id, name, cost: i ? 40 : 0 }));
const ENEMY_COLORS = ['#e84a4a', '#f08a1c', '#9b4de0', '#d9d9d9', '#e04a9a', '#8fd13f'];
const THEMES = [
  { top: '#3a7bd6', bot: '#1b4797', ground: '#15346f', edge: '#2d63c4', bld: 'rgba(255,255,255,.06)' },
  { top: '#8a4ac0', bot: '#e0705a', ground: '#3b1f5e', edge: '#9a58d8', bld: 'rgba(40,10,70,.25)' },
  { top: '#1f8a6a', bot: '#0d3d33', ground: '#0a2a24', edge: '#2fb38a', bld: 'rgba(0,20,15,.25)' },
  { top: '#8a2230', bot: '#2e0c16', ground: '#220910', edge: '#c0364a', bld: 'rgba(0,0,0,.25)' },
];

/* ---------------------------------------------------------------- save */
const SAVE_KEY = 'stickman-battle-2:v1';
const defSave = () => ({
  cash: 120, keys: 0, level: 1,
  weapon: 'bat', ownedW: ['fist', 'bat'],
  skin: 'none', ownedS: ['none'],
  color: '#10a9e8', ownedC: ['#10a9e8'],
  chestAt: 0, sound: true, best: 0,
});
let save = (() => {
  try { return Object.assign(defSave(), JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); }
  catch (e) { return defSave(); }
})();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

/* --------------------------------------------------------------- sound */
let AC = null;
function tone(f, d, type = 'square', vol = 0.06, slide = 0) {
  if (!save.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const snd = {
  swing: () => tone(500, .08, 'sawtooth', .03, -300),
  hit:   () => { tone(150, .12, 'square', .08, -90); tone(90, .1, 'sawtooth', .06, -40); },
  ko:    () => tone(220, .35, 'sawtooth', .07, -180),
  jump:  () => tone(260, .12, 'triangle', .05, 280),
  kick:  () => tone(180, .1, 'square', .07, -80),
  goal:  () => { tone(520, .15, 'triangle', .08); setTimeout(() => tone(780, .25, 'triangle', .08), 120); },
  win:   () => [520, 660, 780, 1040].forEach((f, i) => setTimeout(() => tone(f, .2, 'triangle', .07), i * 110)),
  lose:  () => [400, 330, 260, 190].forEach((f, i) => setTimeout(() => tone(f, .25, 'sawtooth', .06), i * 140)),
  coin:  () => tone(880, .12, 'triangle', .06, 400),
};

/* ----------------------------------------------------------- drawing: items */
const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };

function drawWeapon(c, id) {           // origin = grip, +x = pointing out
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  switch (id) {
    case 'bow':
      c.strokeStyle = '#8a5326'; c.lineWidth = 4; c.beginPath(); c.arc(-6, 0, 26, -1.15, 1.15); c.stroke();
      c.strokeStyle = '#e8e0c8'; c.lineWidth = 1.5; line(c, -6 + Math.cos(-1.15) * 26, Math.sin(-1.15) * 26, -6 + Math.cos(1.15) * 26, Math.sin(1.15) * 26); break;
    case 'bat':
      c.strokeStyle = '#8a5326'; c.lineWidth = 6; line(c, -8, 0, 24, 0);
      c.strokeStyle = '#b9783a'; c.lineWidth = 11; line(c, 24, 0, 56, 0); break;
    case 'sword':
      c.strokeStyle = '#6b4423'; c.lineWidth = 5; line(c, -10, 0, 4, 0);
      c.strokeStyle = '#e1b52c'; c.lineWidth = 4; line(c, 4, -9, 4, 9);
      c.fillStyle = '#e4ecf4'; c.strokeStyle = '#8795a8'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, -4); c.lineTo(52, -4); c.lineTo(62, 0); c.lineTo(52, 4); c.lineTo(6, 4); c.closePath(); c.fill(); c.stroke(); break;
    case 'hammer':
      c.strokeStyle = '#8a5326'; c.lineWidth = 5; line(c, -8, 0, 46, 0);
      c.fillStyle = '#d6dee9'; c.strokeStyle = '#6f7d90'; c.lineWidth = 2.5;
      c.beginPath(); c.rect(38, -13, 26, 26); c.fill(); c.stroke();
      c.fillStyle = '#18b4e8'; c.fillRect(48, -13, 6, 26); break;
    case 'axe':
      c.strokeStyle = '#8a5326'; c.lineWidth = 5; line(c, -8, 0, 52, 0);
      c.fillStyle = '#c6d0dc'; c.strokeStyle = '#6f7d90'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(38, -3); c.lineTo(44, -24); c.quadraticCurveTo(64, -18, 60, 0);
      c.quadraticCurveTo(64, 18, 44, 24); c.lineTo(38, 3); c.closePath(); c.fill(); c.stroke(); break;
    case 'spear':
      c.strokeStyle = '#8a5326'; c.lineWidth = 4; line(c, -22, 0, 84, 0);
      c.fillStyle = '#dfe7f0'; c.strokeStyle = '#7b889b'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(80, -7); c.lineTo(104, 0); c.lineTo(80, 7); c.closePath(); c.fill(); c.stroke(); break;
    case 'katana':
      c.strokeStyle = '#2b2b33'; c.lineWidth = 5; line(c, -12, 0, 6, 0);
      c.fillStyle = '#d9a82a'; c.beginPath(); c.arc(7, 0, 5, 0, 7); c.fill();
      c.strokeStyle = '#e9eff6'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, 0); c.quadraticCurveTo(40, -9, 70, -3); c.stroke(); break;
    case 'mace':
      c.strokeStyle = '#8a5326'; c.lineWidth = 5; line(c, -8, 0, 44, 0);
      c.fillStyle = '#8f9aab'; c.strokeStyle = '#4b5566'; c.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(c, 54 + Math.cos(a) * 10, Math.sin(a) * 10, 54 + Math.cos(a) * 17, Math.sin(a) * 17); }
      c.beginPath(); c.arc(54, 0, 11, 0, 7); c.fill(); c.stroke(); break;
  }
  c.restore();
}

function drawHat(c, id) {              // origin = head centre, radius 14, facing +x
  c.save(); c.lineJoin = 'round';
  switch (id) {
    case 'cap':
      c.fillStyle = '#e5393a'; c.beginPath(); c.arc(0, -1, 15, Math.PI, 0); c.fill(); c.fillRect(3, -5, 22, 4); break;
    case 'headband':
      c.fillStyle = '#e5393a'; c.fillRect(-14, -9, 28, 5);
      c.strokeStyle = '#e5393a'; c.lineWidth = 4; c.lineCap = 'round'; line(c, -13, -6, -25, -1); line(c, -13, -6, -23, -12); break;
    case 'cowboy':
      c.fillStyle = '#8b5a2b'; c.beginPath(); c.ellipse(0, -9, 25, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#a9713a'; c.beginPath(); c.arc(0, -9, 13, Math.PI, 0); c.fill();
      c.fillStyle = '#5a3a1a'; c.fillRect(-13, -12, 26, 3); break;
    case 'tophat':
      c.fillStyle = '#23232b'; c.fillRect(-9, -34, 18, 24); c.fillRect(-17, -12, 34, 5);
      c.fillStyle = '#d33'; c.fillRect(-9, -20, 18, 4); break;
    case 'horns':
      c.fillStyle = '#f1ead0'; c.strokeStyle = '#a89c75'; c.lineWidth = 1.5;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -10); c.quadraticCurveTo(s * 22, -10, s * 17, -30); c.quadraticCurveTo(s * 13, -16, s * 3, -13); c.fill(); c.stroke(); } break;
    case 'helmet':
      c.fillStyle = '#9aa6b5'; c.beginPath(); c.arc(0, 0, 16, Math.PI, 0); c.fill(); c.fillRect(-16, -2, 32, 5);
      c.fillStyle = '#d33'; c.beginPath(); c.ellipse(0, -17, 4, 8, 0, 0, 7); c.fill(); break;
    case 'halo':
      c.strokeStyle = '#ffd84a'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(0, -24, 13, 4.5, 0, 0, 7); c.stroke(); break;
    case 'crown':
      c.fillStyle = '#ffcf33'; c.strokeStyle = '#b88a00'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-12, -10); c.lineTo(-13, -28); c.lineTo(-6, -19); c.lineTo(0, -30); c.lineTo(6, -19); c.lineTo(13, -28); c.lineTo(12, -10); c.closePath(); c.fill(); c.stroke(); break;
  }
  c.restore();
}

/* ------------------------------------------------------------- fighters */
class Fighter {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: GROUND, mv: 0, kvx: 0, vy: 0, face: 1, hp: 100, weapon: 'fist', color: '#10a9e8', skin: 'none',
      scale: 1, speed: 3.4, atk: 0, atkDur: 20, hitDone: true, cd: 0, hurt: 0, dead: 0, walk: 0,
      onGround: true, isPlayer: false, dmgMul: 1, aggr: .03, cdMul: 1, stagger: 1, shooter: false, type: 'normal', jumpy: false,
    }, o);
    this.maxhp = this.hp;
  }
}

function swingAngle(f, w) {
  if (f.weapon === 'none') return 1.15;
  if (f.atk <= 0) return w.thrust ? -0.12 : -0.9;
  if (w.thrust) return -0.1;
  const p = 1 - f.atk / f.atkDur, idle = -0.9, up = -2.45, down = 0.95;
  if (p < 0.38) return lerp(idle, up, easeOut(p / 0.38));
  if (p < 0.6) return lerp(up, down, easeIn((p - 0.38) / 0.22));
  return lerp(down, idle, (p - 0.6) / 0.4);
}

function drawFighter(c, f) {
  const w = WBY[f.weapon] || WBY.fist, s = f.scale || 1;
  c.save();
  c.translate(f.x, f.y); c.scale(s, s);
  if (f.dead) {
    const k = Math.min(1, f.dead / 14);
    c.rotate(-f.face * k * 1.45);
    c.globalAlpha = f.dead > 70 ? Math.max(0, 1 - (f.dead - 70) / 30) : 1;
  }
  c.scale(f.face, 1);
  const col = (f.hurt > 0 && f.hurt % 4 < 2) ? '#ffffff' : f.color;
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 7;
  const air = !f.onGround, moving = Math.abs(f.mv) > 0.2, ph = f.walk;
  const running = moving && !air;
  const bob = running ? -Math.abs(Math.sin(ph)) * 3 : 0;          // body bounces while running
  const hip = -46 + bob, lean = running ? 8 : 0;                  // lean forward when running
  const nk = -84 + bob, hd = -99 + bob, sh = -78 + bob;
  const p = f.atk > 0 ? 1 - f.atk / f.atkDur : 0;
  const kicking = f.weapon === 'none' && f.atk > 0;

  // legs: two-bone IK (thigh + shin) so the knee bends like a real run cycle
  const L1 = 26, L2 = 26;
  for (let i = 0; i < 2; i++) {
    let fx, fy;
    if (air) { fx = i ? -12 : 14; fy = i ? -20 : -10; }
    else if (moving) {
      const a = ph + i * Math.PI;
      fx = Math.sin(a) * 24;                                      // long stride
      fy = -Math.max(0, Math.cos(a)) * 20;                        // foot lifts on the forward swing
    } else { fx = i ? -7 : 7; fy = 0; }
    if (kicking && i === 0) { const k = Math.sin(p * Math.PI); fx = lerp(-8, 42, k); fy = -8 - k * 20; }
    let dx = fx - lean * 0.2, dy = fy - hip, d = Math.hypot(dx, dy);
    const m = L1 + L2 - 0.5;
    if (d > m) { dx *= m / d; dy *= m / d; d = m; }
    const aa = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - aa * aa));
    const ux = dx / d, uy = dy / d;
    c.beginPath(); c.moveTo(0, hip);
    c.lineTo(ux * aa + uy * hh, hip + uy * aa - ux * hh);         // knee (bends forward)
    c.lineTo(dx, hip + dy); c.stroke();
  }
  // torso + head
  line(c, 0, hip, lean, nk);
  c.beginPath(); c.arc(lean, hd, 14, 0, 7); c.fill();
  if (f.skin && f.skin !== 'none') { c.save(); c.translate(lean, hd); drawHat(c, f.skin); c.restore(); }

  // back arm (pumps opposite to the legs while running)
  const sx = lean * 0.9, sy = sh;
  const bx = running ? -4 + Math.sin(ph) * 17 : -9, by = sy + 21 - (running ? Math.max(0, Math.sin(ph)) * 11 : 0);
  c.beginPath(); c.moveTo(sx, sy); c.lineTo((sx + bx) / 2 - 3, (sy + by) / 2 + 5); c.lineTo(bx, by); c.stroke();

  // front arm + weapon
  const a = swingAngle(f, w) + (running && f.atk <= 0 ? Math.sin(ph + Math.PI) * (f.weapon === 'none' ? 0.7 : 0.2) : 0);
  let th = 0;
  if (w.thrust && f.atk > 0 && f.weapon !== 'none') {
    th = p < 0.4 ? -9 * (p / 0.4) : p < 0.6 ? lerp(-9, 30, (p - 0.4) / 0.2) : lerp(30, 0, (p - 0.6) / 0.4);
  }
  const hx = sx + Math.cos(a) * 30 + th, hy = sy + Math.sin(a) * 30;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo((sx + hx) / 2, (sy + hy) / 2 + 7); c.lineTo(hx, hy); c.stroke();
  if (f.weapon === 'fist') { c.beginPath(); c.arc(hx + 2, hy, 6, 0, 7); c.fill(); }
  else if (f.weapon !== 'none') { c.save(); c.translate(hx, hy); c.rotate(a); drawWeapon(c, f.weapon); c.restore(); }
  c.restore();
}

function drawBar(c, x, y, w, h, frac, color) {
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = color; c.fillRect(x, y, Math.max(0, w * frac), h);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x, y, Math.max(0, w * frac), h / 3);
}
function outlineText(c, t, x, y, size, fill = '#fff', align = 'center') {
  c.font = `${size}px "Lilita One","Arial Black",sans-serif`; c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = Math.max(3, size / 6); c.strokeStyle = 'rgba(8,20,60,.9)'; c.lineJoin = 'round';
  c.strokeText(t, x, y); c.fillStyle = fill; c.fillText(t, x, y);
}

/* ------------------------------------------------------------ game state */
const keys = { left: 0, right: 0, jump: 0, atk: 0 };
const G = {
  mode: 'menu', player: null, enemies: [], ai: null, ball: null, parts: [], texts: [], projs: [],
  survival: false, wave: 1, lvl: 1, theme: 0,
  shake: 0, hitstop: 0, intro: 0, endT: 0, over: false, boss: false, score: [0, 0], time: 0,
  freeze: 0, ot: false, clouds: [{ x: 120, y: 80, s: 1 }, { x: 520, y: 130, s: 1.4 }, { x: 800, y: 60, s: .8 }],
};

function spark(x, y, n, color = '#fff', sp = 5) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), v = rnd(1, sp);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: rnd(14, 28), max: 28, r: rnd(2, 4.5), color });
  }
}
const floatText = (x, y, text, color = '#fff') => G.texts.push({ x, y, text, color, life: 40, vy: -1.4 });

function startAttack(f) {
  f.atk = f.atkDur; f.hitDone = false;
  if (G.mode === 'soccer' || f.weapon === 'none') return;
  snd.swing();
}

function takeHit(t, src, dmg, knock) {
  t.hp -= dmg; t.hurt = 14;
  t.kvx = src.face * knock; t.vy = Math.min(t.vy, -knock * 0.35);
  if (!t.isPlayer && Math.random() < t.stagger) t.atk = 0;
  G.hitstop = Math.min(6, 2 + ((knock * 0.3) | 0));
  G.shake = Math.max(G.shake, knock * 0.7);
  spark(t.x + src.face * -4, t.y - 62 * t.scale, 8, '#fff', 5);
  spark(t.x, t.y - 62 * t.scale, 4, t.color, 4);
  floatText(t.x, t.y - 118 * t.scale, String(dmg), t.isPlayer ? '#ff6b6b' : '#ffe066');
  snd.hit();
  if (t.hp <= 0) {
    t.hp = 0; t.dead = 1; t.atk = 0; t.kvx = src.face * (knock + 5); t.vy = -8; t.mv = 0;
    snd.ko(); G.shake = 10; G.hitstop = 8;
    spark(t.x, t.y - 60, 18, t.color, 8);
    if (src.isPlayer) src.hp = Math.min(src.maxhp, src.hp + 8);
  }
}

function doAttack(f) {
  if (G.mode === 'soccer') return kickBall(f);
  if (f.shooter) return spawnProj(f);
  const w = WBY[f.weapon], list = f.isPlayer ? G.enemies : [G.player];
  const reach = w.range * f.scale;
  for (const t of list) {
    if (t.dead) continue;
    const dx = (t.x - f.x) * f.face;
    if (dx > -14 && dx < reach + 12 * t.scale && Math.abs(t.y - f.y) < 58) {
      const dmg = Math.max(1, Math.round(w.dmg * (f.isPlayer ? 1 : f.dmgMul) * rnd(.9, 1.12)));
      takeHit(t, f, dmg, w.knock * (f.scale > 1 ? 1.2 : 1));
    }
  }
  if (f.isPlayer) {   // swing at arrows to deflect them
    G.projs = G.projs.filter(pr => {
      const dx = (pr.x - f.x) * f.face;
      if (dx > 0 && dx < reach + 20 && Math.abs(pr.y - (f.y - 60)) < 70) { spark(pr.x, pr.y, 6, '#ffe9a0', 4); snd.hit(); return false; }
      return true;
    });
  }
}

function spawnProj(f) {
  G.projs.push({ x: f.x + f.face * 30, y: f.y - 70 * f.scale, vx: f.face * 7, dmg: Math.max(1, Math.round(9 * f.dmgMul)), life: 160 });
}

function stepProjs() {
  const p = G.player;
  for (const pr of G.projs) {
    pr.x += pr.vx; pr.life--;
    if (!p.dead && Math.abs(pr.x - p.x) < 16 && pr.y > p.y - 112 && pr.y < p.y + 4) {
      takeHit(p, { face: Math.sign(pr.vx), isPlayer: false }, pr.dmg, 4); pr.life = 0;
    }
    if (pr.x < -20 || pr.x > W + 20) pr.life = 0;
  }
  G.projs = G.projs.filter(pr => pr.life > 0);
}

function stepFighter(f) {
  if (f.dead) { f.dead++; f.atk = 0; f.mv = 0; }
  if (f.cd > 0) f.cd--;
  if (f.hurt > 0) f.hurt--;
  if (f.atk > 0) {
    f.atk--;
    if (!f.hitDone && 1 - f.atk / f.atkDur >= 0.5) { f.hitDone = true; doAttack(f); }
  }
  f.vy += 0.62; f.y += f.vy;
  if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.onGround = true; } else f.onGround = false;
  f.x += f.mv + f.kvx;
  f.kvx *= f.onGround ? 0.82 : 0.96; if (Math.abs(f.kvx) < 0.05) f.kvx = 0;
  if (f.onGround && Math.abs(f.mv) > 0.2) f.walk += Math.abs(f.mv) * 0.13;
  f.x = clamp(f.x, 26, W - 26);
}

function separate(list) {
  const a = list.filter(f => !f.dead);
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const d = a[j].x - a[i].x, m = 30 * Math.max(a[i].scale, a[j].scale);
    if (Math.abs(d) < m && Math.abs(a[i].y - a[j].y) < 40) {
      const push = (m - Math.abs(d)) * 0.25 * (d >= 0 ? 1 : -1);
      a[i].x -= push; a[j].x += push;
    }
  }
}

/* ------------------------------------------------------------- fighting */
function mkPlayer(x) {
  return new Fighter({ x, face: 1, isPlayer: true, weapon: save.weapon, color: save.color, skin: save.skin, hp: 100, speed: 3.5 });
}

function mkEnemy(n, i, boss) {
  const wp = boss ? pick(['hammer', 'axe', 'mace']) : WEAPONS[(Math.random() * Math.min(WEAPONS.length, 2 + Math.floor(n / 2))) | 0].id;
  const ecol = ENEMY_COLORS.filter(c => c !== save.color);
  const e = new Fighter({
    x: W - 90 - i * 62, face: -1, weapon: wp,
    color: boss ? '#b01818' : pick(ecol),
    skin: boss ? 'crown' : (n >= 6 && Math.random() < .4 ? pick(['cap', 'headband', 'cowboy', 'horns', 'helmet']) : 'none'),
    hp: boss ? 200 + n * 18 : 30 + n * 6,
    scale: boss ? 1.35 : 1,
    speed: boss ? 1.7 : Math.min(2.9, 1.5 + n * 0.05),
    dmgMul: Math.min(2.2, 0.55 + n * 0.045) * (boss ? 1.3 : 1),
    aggr: Math.min(.07, .02 + n * .003),
    cdMul: Math.max(.4, 1.1 - n * 0.03),
    stagger: boss ? 0.3 : Math.max(0.4, 1 - n * 0.06),
  });
  e.atkDur = Math.round(WBY[wp].dur * Math.max(1.1, 1.7 - n * 0.03));
  if (!boss) applyType(e, n);
  return e;
}

// ninja = fast & fragile, brute = huge & hard to stagger, archer = ranged
function applyType(e, n) {
  const pool = ['normal', 'normal'];
  if (n >= 3) pool.push('ninja');
  if (n >= 4) pool.push('archer');
  if (n >= 5) pool.push('brute');
  const t = e.type = pick(pool), hp = k => { e.hp = e.maxhp = Math.round(e.hp * k); };
  if (t === 'ninja') {
    e.weapon = pick(['sword', 'katana']); e.color = '#2f2f38'; e.skin = 'headband'; hp(0.7);
    e.speed *= 1.6; e.aggr *= 1.5; e.jumpy = true; e.atkDur = Math.round(WBY[e.weapon].dur * 1.2);
  } else if (t === 'brute') {
    e.weapon = pick(['hammer', 'mace', 'axe']); e.color = '#a0521e'; e.skin = 'none'; hp(2.2);
    e.scale = 1.3; e.speed *= 0.7; e.stagger = 0.15; e.dmgMul *= 1.2; e.atkDur = Math.round(WBY[e.weapon].dur * 1.5);
  } else if (t === 'archer') {
    e.weapon = 'bow'; e.shooter = true; e.color = '#2fb36b'; e.skin = 'cap'; hp(0.8); e.atkDur = 22;
  }
}

function spawnEnemies(n, boss) {
  G.enemies = [];
  const count = boss ? 1 : Math.min(5, 1 + Math.floor(n / 2));
  const fromLeft = G.player && G.player.x > W * 0.6;
  for (let i = 0; i < count; i++) {
    const e = mkEnemy(n, i, boss);
    if (fromLeft) { e.x = 90 + i * 62; e.face = 1; }
    G.enemies.push(e);
  }
  if (!boss && n % 5 === 0) { const e = G.enemies[0]; e.scale = Math.max(e.scale, 1.25); e.hp = e.maxhp = Math.round(e.hp * 2); }
}

function resetWorld() {
  G.parts = []; G.texts = []; G.projs = []; G.shake = 0; G.hitstop = 0; G.endT = 0; G.over = false;
  keys.left = keys.right = keys.jump = keys.atk = 0;
}

function startFight(boss) {
  if (boss && save.keys < 1) { toast(T('needKey')); return; }
  resetWorld();
  G.mode = 'fight'; G.boss = boss; G.intro = 80;
  const n = save.level; G.lvl = n;
  G.player = mkPlayer(150);
  G.survival = false; G.theme = boss ? 3 : Math.floor((n - 1) / 5) % THEMES.length;
  spawnEnemies(n, boss);
  showScreen('hud');
}

function startSurvival() {
  resetWorld();
  G.mode = 'fight'; G.boss = false; G.survival = true; G.wave = 1; G.lvl = 1; G.intro = 80; G.theme = 0;
  G.player = mkPlayer(W / 2);
  spawnEnemies(1, false);
  showScreen('hud');
}

function nextWave() {
  G.wave++; G.lvl = G.wave; G.endT = 0; G.intro = 60;
  G.theme = Math.floor((G.wave - 1) / 5) % THEMES.length;
  G.player.hp = Math.min(G.player.maxhp, G.player.hp + 25);
  floatText(G.player.x, G.player.y - 130, '+25 HP', '#7dff8f');
  spawnEnemies(G.wave, false); snd.coin();
}

function bankSurvival() {
  const cleared = G.wave - 1, reward = 10 + cleared * 15, newBest = cleared > save.best;
  if (newBest) save.best = cleared;
  save.cash += reward; persist(); refreshMenu();
  return { cleared, reward, newBest };
}

function finishSurvival() {
  G.over = true; snd.lose();
  const { cleared, reward, newBest } = bankSurvival();
  openModal({
    title: T('gameOver'),
    body: `<div class="reward">${T('waves')}${cleared}</div><div class="sub">${newBest ? T('newBest') : T('best') + save.best}</div><div class="reward">💵 +${reward}</div>`,
    buttons: [{ label: T('menu'), cls: 'gray', fn: toMenu }, { label: T('retry'), cls: 'green', fn: () => { closeModal(); startSurvival(); } }],
  });
}

function aiFight(e) {
  const p = G.player;
  e.mv = 0;
  if (e.dead || G.intro > 0 || p.dead || e.hurt > 6 || e.atk > 0) return;
  const dx = p.x - e.x, dist = Math.abs(dx);
  e.face = dx >= 0 ? 1 : -1;
  if (e.shooter) {                      // archer: keep range, shoot
    if (dist < 230 && e.x > 60 && e.x < W - 60) e.mv = -e.face * e.speed;
    else if (dist > 380) e.mv = e.face * e.speed;
    if (e.cd <= 0) { startAttack(e); e.cd = e.atkDur + rnd(60, 120) * e.cdMul; }
    return;
  }
  const reach = WBY[e.weapon].range * e.scale * 0.82;
  if (dist > reach) e.mv = e.face * e.speed;
  else if (e.cd <= 0 && Math.abs(p.y - e.y) < 50 && Math.random() < e.aggr * 3) {
    startAttack(e); e.cd = e.atkDur + rnd(20, 60) * e.cdMul;
  } else if (dist < reach * 0.5) e.mv = -e.face * e.speed * 0.5;
  if (e.onGround && Math.random() < (e.jumpy ? 0.02 : 0.004)) e.vy = -11;
}

function playerControl(p) {
  p.mv = 0;
  if (p.dead || G.intro > 0 || G.freeze > 0) return;
  const d = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  p.mv = d * p.speed * (p.atk > 0 ? 0.45 : 1);
  if (d && p.atk <= 0) p.face = d;
  if (keys.jump && p.onGround) { p.vy = -12.2; snd.jump(); }
  if (keys.atk && p.atk <= 0 && p.cd <= 0) {
    if (!d && G.mode === 'fight') {
      let best = null;
      for (const e of G.enemies) if (!e.dead && Math.abs(e.x - p.x) < 170 && (!best || Math.abs(e.x - p.x) < Math.abs(best.x - p.x))) best = e;
      if (best) p.face = best.x >= p.x ? 1 : -1;
    }
    p.atkDur = WBY[p.weapon].dur; startAttack(p); p.cd = 3;
  }
}

function updateFight() {
  const p = G.player;
  if (G.intro > 0) G.intro--;
  playerControl(p);
  G.enemies.forEach(aiFight);
  const all = [p, ...G.enemies];
  all.forEach(stepFighter);
  separate(all);
  stepProjs();

  if (!G.over) {
    if (p.dead) { if (++G.endT > 70) G.survival ? finishSurvival() : finishFight(false); }
    else if (G.enemies.every(e => e.dead)) {
      if (++G.endT > 55) G.survival ? nextWave() : finishFight(true);
    }
  }
}

function finishFight(win) {
  G.over = true;
  const n = save.level;
  if (win) {
    snd.win();
    let reward, extra = '';
    if (G.boss) { reward = 150 + n * 15; save.keys--; }
    else {
      reward = 25 + n * 8;
      if (n % 5 === 0) { save.keys++; extra = '<div class="reward">' + T('keyPlus') + '</div>'; }
      save.level++;
    }
    save.cash += reward; persist();
    openModal({
      title: G.boss ? T('bossDefeated') : T('victory'),
      body: `<div class="reward">💵 +${reward}</div>${extra}<div class="sub">${G.boss ? T('nobody') : T('levelCleared', n)}</div>`,
      buttons: [
        { label: T('menu'), cls: 'gray', fn: toMenu },
        { label: G.boss ? T('bossAgain') : T('nextLevel'), cls: 'green', fn: () => { closeModal(); startFight(G.boss && save.keys > 0); } },
      ],
    });
  } else {
    snd.lose();
    openModal({
      title: T('defeated'), body: '<div class="sub">' + T('tryAgain') + '</div>',
      buttons: [{ label: T('menu'), cls: 'gray', fn: toMenu }, { label: T('retry'), cls: 'green', fn: () => { closeModal(); startFight(G.boss); } }],
    });
  }
}

/* --------------------------------------------------------------- soccer */
function startSoccer() {
  resetWorld();
  G.mode = 'soccer'; G.score = [0, 0]; G.time = 90 * 60; G.ot = false; G.freeze = 0; G.intro = 80;
  G.player = mkPlayer(W * 0.3);
  G.player.weapon = 'none'; G.player.speed = 3.6;
  G.ai = new Fighter({
    x: W * 0.7, face: -1, weapon: 'none', color: pick(ENEMY_COLORS.filter(c => c !== save.color)),
    speed: Math.min(3.3, 2.0 + save.level * 0.07), hp: 100,
  });
  G.enemies = [];
  G.ball = { x: W / 2, y: 200, vx: 0, vy: 0, r: 15, rot: 0 };
  showScreen('hud');
}
function resetKickoff() {
  G.player.x = W * 0.3; G.ai.x = W * 0.7; G.player.face = 1; G.ai.face = -1;
  G.player.kvx = G.ai.kvx = 0;
  G.ball = { x: W / 2, y: 200, vx: 0, vy: 0, r: 15, rot: 0 };
  G.intro = 40;
}

function kickBall(f) {
  const b = G.ball; if (!b) return;
  const dx = (b.x - f.x) * f.face;
  if (dx > -8 && dx < 70 && b.y > f.y - 85 && b.y < f.y + 8) {
    b.vx = f.face * (10 + rnd(0, 3) + Math.abs(f.mv) * 0.6);
    b.vy = -(4 + rnd(0, 4));
    snd.kick(); spark(b.x, b.y, 6, '#fff', 4); G.shake = 3;
  }
}

function circleRect(b, r) {
  const cx = clamp(b.x, r.x, r.x + r.w), cy = clamp(b.y, r.y, r.y + r.h);
  let dx = b.x - cx, dy = b.y - cy; const d = Math.hypot(dx, dy);
  if (d < b.r) {
    if (d === 0) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
    b.x = cx + dx * b.r; b.y = cy + dy * b.r;
    const vn = b.vx * dx + b.vy * dy;
    if (vn < 0) { b.vx -= 1.7 * vn * dx; b.vy -= 1.7 * vn * dy; }
  }
}
function ballVsFighter(b, f) {
  const circles = [[f.y - 88, 16], [f.y - 52, 15], [f.y - 16, 17]];
  for (const [cy, r] of circles) {
    let dx = b.x - f.x, dy = b.y - cy; const d = Math.hypot(dx, dy), min = b.r + r;
    if (d < min) {
      if (d === 0) { dx = f.face; dy = 0; } else { dx /= d; dy /= d; }
      b.x = f.x + dx * min; b.y = cy + dy * min;
      const rvx = b.vx - (f.mv + f.kvx), rvy = b.vy - f.vy, vn = rvx * dx + rvy * dy;
      if (vn < 0) { b.vx -= 1.25 * vn * dx; b.vy -= 1.25 * vn * dy; }
    }
  }
}

function aiSoccer(a, b) {
  a.mv = 0;
  if (G.intro > 0 || G.freeze > 0 || a.hurt > 0) return;
  const dBall = b.x - a.x;
  const tx = dBall < 0 ? b.x + 34 : b.x + 70;
  const dx = tx - a.x;
  if (Math.abs(dx) > 8) a.mv = Math.sign(dx) * a.speed;
  if (a.atk <= 0) a.face = Math.abs(dBall) < 110 ? (dBall < 0 ? -1 : 1) : (a.mv ? Math.sign(a.mv) : a.face);
  if (dBall > -10 && dBall < 100 && a.onGround && Math.abs(b.y - a.y) < 45 && Math.random() < 0.15) a.vy = -12;
  if (a.face === -1 && dBall < 0 && dBall > -70 && b.y > a.y - 85 && a.atk <= 0 && a.cd <= 0 && Math.random() < 0.3) {
    a.atkDur = 16; startAttack(a); a.cd = 30 + rnd(0, 25);
  }
}

function updateSoccer() {
  const p = G.player, a = G.ai, b = G.ball;
  if (G.intro > 0) G.intro--;
  playerControl(p);
  aiSoccer(a, b);
  stepFighter(p); stepFighter(a); separate([p, a]);

  // ball physics
  b.vy += 0.5; b.x += b.vx; b.y += b.vy; b.vx *= 0.997; b.rot += b.vx * 0.06;
  if (b.y > GROUND - b.r) {
    b.y = GROUND - b.r;
    if (Math.abs(b.vy) > 2.5) b.vy *= -0.6; else b.vy = 0;
    b.vx *= 0.985;
  }
  if (b.y < b.r) { b.y = b.r; b.vy *= -0.6; }
  circleRect(b, { x: 0, y: GROUND - GOAL_H - 12, w: GOAL_W, h: 12 });
  circleRect(b, { x: W - GOAL_W, y: GROUND - GOAL_H - 12, w: GOAL_W, h: 12 });
  if (b.x < b.r) { b.x = b.r; b.vx *= -0.7; }
  if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -0.7; }
  if (G.intro <= 0 && G.freeze <= 0) { ballVsFighter(b, p); ballVsFighter(b, a); }

  // goals
  if (G.freeze <= 0 && !G.over && b.y > GROUND - GOAL_H) {
    if (b.x < GOAL_W * 0.45) scoreGoal(1);
    else if (b.x > W - GOAL_W * 0.45) scoreGoal(0);
  }
  if (G.freeze > 0) {
    G.freeze--;
    if (G.freeze === 0) { if (G.over) finishSoccer(); else resetKickoff(); }
  } else if (G.intro <= 0 && !G.over) {
    if (G.time > 0) { G.time--; if (G.time === 0 && G.score[0] === G.score[1]) G.ot = true; }
    if (G.time === 0 && !G.ot) { G.over = true; G.freeze = 70; }
  }
}
function scoreGoal(side) {
  G.score[side]++; G.freeze = 95; snd.goal();
  spark(G.ball.x, G.ball.y, 30, '#ffe066', 9); G.shake = 8;
  if (G.score[side] >= 5 || G.ot) G.over = true;
}
function finishSoccer() {
  const win = G.score[0] > G.score[1];
  const reward = win ? 60 : 12;
  save.cash += reward; persist();
  win ? snd.win() : snd.lose();
  openModal({
    title: win ? T('youWin') : T('youLose'), body: `<div class="reward">${G.score[0]} : ${G.score[1]}</div><div class="reward">💵 +${reward}</div>`,
    buttons: [{ label: T('menu'), cls: 'gray', fn: toMenu }, { label: T('rematch'), cls: 'green', fn: () => { closeModal(); startSoccer(); } }],
  });
}

/* --------------------------------------------------------------- render */
function drawBG(c) {
  if (G.mode === 'soccer') {
    const g = c.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#5aa7ff'); g.addColorStop(1, '#bfe0ff');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const cl of G.clouds) { cl.x = (cl.x + 0.12 * cl.s) % (W + 200); drawCloud(c, cl.x - 100, cl.y, cl.s, 'rgba(255,255,255,.85)'); }
    c.fillStyle = 'rgba(40,90,60,.35)'; for (let i = 0; i < 9; i++) c.fillRect(i * 120 + 10, GROUND - 40 - (i % 3) * 14, 60, 60);
    c.fillStyle = '#2f9a45'; c.fillRect(0, GROUND, W, H - GROUND);
    c.fillStyle = '#37a94f'; for (let i = 0; i < 8; i += 2) c.fillRect(i * 120, GROUND, 120, H - GROUND);
    c.fillStyle = '#fff'; c.fillRect(0, GROUND, W, 4); c.fillRect(W / 2 - 2, GROUND, 4, H - GROUND);
    drawGoal(c, 0, 1); drawGoal(c, W - GOAL_W, -1);
    return;
  }
  const th = THEMES[G.theme || 0];
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = th.bld;
  for (let i = 0; i < 8; i++) { const h = 120 + ((i * 53) % 120); c.fillRect(i * 130 - 10, GROUND - h, 90, h); }
  for (const cl of G.clouds) { cl.x = (cl.x + 0.1 * cl.s) % (W + 200); drawCloud(c, cl.x - 100, cl.y, cl.s, 'rgba(255,255,255,.12)'); }
  c.fillStyle = th.ground; c.fillRect(0, GROUND, W, H - GROUND);
  c.fillStyle = th.edge; c.fillRect(0, GROUND, W, 6);
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 2;
  for (let x = -40; x < W + 40; x += 80) line(c, x, GROUND + 6, x - 50, H);
}
function drawCloud(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath();
  c.arc(x, y, 22 * s, 0, 7); c.arc(x + 26 * s, y - 10 * s, 28 * s, 0, 7); c.arc(x + 56 * s, y, 22 * s, 0, 7); c.fill();
}
function drawGoal(c, x, dir) {
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, GROUND - GOAL_H, GOAL_W, GOAL_H);
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1;
  for (let i = 0; i <= GOAL_W; i += 10) line(c, x + i, GROUND - GOAL_H, x + i, GROUND);
  for (let j = 0; j <= GOAL_H; j += 15) line(c, x, GROUND - j, x + GOAL_W, GROUND - j);
  c.fillStyle = '#fff'; c.fillRect(x, GROUND - GOAL_H - 12, GOAL_W, 12);
  c.fillRect(dir > 0 ? x + GOAL_W - 5 : x, GROUND - GOAL_H, 5, GOAL_H);
}
function drawBall(c, b) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(b.x, GROUND + 4, b.r * (1 - Math.min(.6, (GROUND - b.y) / 400)), 4, 0, 0, 7); c.fill();
  c.save(); c.translate(b.x, b.y); c.rotate(b.rot);
  c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, b.r, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#222';
  c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; c.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); } c.fill();
  for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; c.beginPath(); c.arc(Math.cos(a) * 12, Math.sin(a) * 12, 3, 0, 7); c.fill(); }
  c.restore();
}

function drawShadow(c, f) {
  const h = Math.max(0, GROUND - f.y);
  c.fillStyle = `rgba(0,0,0,${0.28 - Math.min(.18, h / 500)})`;
  c.beginPath(); c.ellipse(f.x, GROUND + 5, 22 * f.scale * (1 - Math.min(.4, h / 300)), 6 * f.scale, 0, 0, 7); c.fill();
}

function render() {
  if (G.mode === 'menu') { drawPreview(); return; }
  const c = ctx;
  c.save();
  if (G.shake > 0.3) { c.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake)); G.shake *= 0.85; }
  drawBG(c);
  const fighters = G.mode === 'fight' ? [...G.enemies, G.player] : [G.ai, G.player];
  fighters.forEach(f => drawShadow(c, f));
  fighters.forEach(f => {
    drawFighter(c, f);
    if (!f.dead && G.mode === 'fight' && !f.isPlayer) drawBar(c, f.x - 26 * f.scale, f.y - 138 * f.scale, 52 * f.scale, 6, f.hp / f.maxhp, '#ff4d4d');
  });
  if (G.ball) drawBall(c, G.ball);
  for (const pr of G.projs) {
    const d = Math.sign(pr.vx);
    c.strokeStyle = '#d9c27a'; c.lineWidth = 3; line(c, pr.x - d * 24, pr.y, pr.x, pr.y);
    c.fillStyle = '#eef3f8'; c.beginPath(); c.moveTo(pr.x + d * 9, pr.y); c.lineTo(pr.x, pr.y - 4); c.lineTo(pr.x, pr.y + 4); c.fill();
  }
  for (const p of G.parts) {
    c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
    c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  for (const t of G.texts) { c.globalAlpha = clamp(t.life / 20, 0, 1); outlineText(c, t.text, t.x, t.y, 24, t.color); }
  c.globalAlpha = 1;
  c.restore();
  drawHUD(c);
}

function drawHUD(c) {
  const p = G.player;
  if (G.mode === 'fight') {
    drawBar(c, 20, 20, 250, 18, p.hp / p.maxhp, '#3ddc5a');
    outlineText(c, T('you'), 26, 48, 16, '#fff', 'left');
    outlineText(c, G.boss ? T('bossFight') : (G.survival ? T('wave') : T('level')) + G.lvl, W / 2, 28, 28, G.boss ? '#ff7b7b' : '#fff');
    const left = G.enemies.filter(e => !e.dead).length;
    outlineText(c, T('enemies') + left, 780, 28, 20, '#ffd2d2', 'right');
    if (G.boss) { const e = G.enemies[0]; drawBar(c, W / 2 - 170, 50, 340, 12, e.hp / e.maxhp, '#ff4d4d'); }
    if (G.intro > 0) {
      const t = G.intro > 35 ? (G.boss ? T('bossBang') : (G.survival ? T('wave') : T('level')) + G.lvl) : T('fight');
      outlineText(c, t, W / 2, 200, G.intro > 35 ? 64 : 80, G.intro > 35 ? '#fff' : '#ffe066');
    }
    if (!G.intro && G.lvl === 1 && !G.survival && !G.over && p.hp > 0) outlineText(c, T('helpFight'), W / 2, 512, 18, '#cfe0ff');
  } else {
    outlineText(c, `${G.score[0]}  :  ${G.score[1]}`, W / 2, 30, 44, '#fff');
    const s = Math.ceil(G.time / 60);
    outlineText(c, G.ot ? T('golden') : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W / 2, 68, 22, G.ot ? '#ffe066' : '#e6f0ff');
    outlineText(c, T('you'), 40, 30, 22, '#fff', 'left'); outlineText(c, T('cpu'), W - 130, 30, 22, '#fff', 'right');
    if (G.intro > 0 && G.score[0] + G.score[1] === 0) outlineText(c, T('kickoff'), W / 2, 190, 70, '#ffe066');
    if (G.freeze > 0) outlineText(c, G.over && G.time === 0 && G.score[0] !== G.score[1] && !G.ot ? T('timeUp') : T('goal'), W / 2, 190, 84, '#ffe066');
    if (!G.intro && G.score[0] + G.score[1] === 0) outlineText(c, T('helpSoccer'), W / 2, 512, 18, '#17406b');
  }
}

/* --------------------------------------------------------------- main loop */
function update() {
  if (G.mode === 'menu') return;
  if (G.hitstop > 0) { G.hitstop--; return; }
  G.mode === 'fight' ? updateFight() : updateSoccer();
  for (const p of G.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life--; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.y += t.vy; t.life--; }
  G.texts = G.texts.filter(t => t.life > 0);
}
let last = performance.now(), acc = 0;
function frame(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 16.667) { update(); acc -= 16.667; }
  render();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------- UI */
const cv = $('#game'), ctx = cv.getContext('2d');
const stage = $('#stage');

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit); fit();
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

function showScreen(name) {
  $('#menu').classList.toggle('on', name === 'menu');
  $('#hud').classList.toggle('on', name === 'hud');
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}
function openModal({ title, body, buttons = [], wide = false }) {
  $('#mTitle').textContent = title;
  const b = $('#mBody'); b.innerHTML = '';
  typeof body === 'string' ? (b.innerHTML = body) : b.appendChild(body);
  const bt = $('#mBtns'); bt.innerHTML = '';
  buttons.forEach(x => { const el = document.createElement('button'); el.className = 'btn inl ' + (x.cls || ''); el.textContent = x.label; el.onclick = x.fn; bt.appendChild(el); });
  $('#card').classList.toggle('wide', wide);
  $('#modal').classList.add('on');
}
const closeModal = () => $('#modal').classList.remove('on');

function toMenu() {
  closeModal(); G.mode = 'menu'; G.ball = null; showScreen('menu'); refreshMenu();
}

/* ----- menu preview ----- */
const pcv = $('#prev'), pc = pcv.getContext('2d');
const pf = new Fighter({ x: 100, y: 268, scale: 1.4, face: 1 });
let pT = 0;
function drawPreview() {
  pT++;
  pf.weapon = save.weapon; pf.color = save.color; pf.skin = save.skin;
  const w = WBY[pf.weapon];
  if (pT % 170 === 60) { pf.atkDur = Math.round(w.dur * 1.8); pf.atk = pf.atkDur; }
  if (pf.atk > 0) pf.atk--;
  pc.clearRect(0, 0, pcv.width, pcv.height);
  pc.fillStyle = 'rgba(10,30,90,.45)'; pc.beginPath(); pc.ellipse(100, 274, 56, 13, 0, 0, 7); pc.fill();
  drawFighter(pc, pf);
}
function drawItemIcon(cv2, type, id) {
  const c = cv2.getContext('2d'), S = cv2.width;
  c.clearRect(0, 0, S, S);
  if (type === 'weapon') {
    c.save(); c.translate(S / 2, S / 2);
    if (id === 'fist') { c.fillStyle = '#10a9e8'; c.beginPath(); c.arc(0, 0, S * .22, 0, 7); c.fill(); c.strokeStyle = '#0a7fb8'; c.lineWidth = 3; c.stroke(); }
    else {
      const w = WBY[id], sc = Math.min(1, (S * .8) / (w.len + 24));
      c.rotate(-0.75); c.scale(sc, sc); c.translate(-(w.len - 10) / 2 + (id === 'spear' ? -6 : 0), 0); drawWeapon(c, id);
    }
    c.restore();
  } else if (type === 'skin') {
    c.save(); c.translate(S / 2, S / 2 + 12); c.scale(S / 46, S / 46);
    c.fillStyle = save.color; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill();
    drawHat(c, id); c.restore();
  } else {
    const f = new Fighter({ x: S / 2, y: S - 4, scale: S / 140, weapon: 'none', color: id, skin: save.skin });
    f.face = 1; drawFighter(c, f);
  }
}

/* ----- menu ----- */
function refreshMenu() {
  $('#keyCount').textContent = save.keys; $('#cashCount').textContent = save.cash;
  const pos = (save.level - 1) % 5 + 1;
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<div class="chip ${i < pos ? '' : i === pos ? 'cur' : 'todo'}">${i}</div>`;
  h += `<div class="chip key ${pos > 5 ? 'got' : ''}">🔑</div>`;
  $('#chips').innerHTML = h;
  $('#btnPlay').textContent = T('lvlBtn') + save.level;
  $('#btnSurvival').innerHTML = `${T('survival')}<small>${T('best')}${save.best}</small>`;
  $('#btnBoss').classList.toggle('ready', save.keys > 0);
  $('#equipName').textContent = nameOf('w', WBY[save.weapon]);
  drawItemIcon($('#equipIcon'), 'weapon', save.weapon);
  updateChest();
}
function updateChest() {
  const left = Math.ceil((save.chestAt - Date.now()) / 1000), b = $('#btnChest');
  if (left > 0) { b.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; b.classList.add('gray'); b.classList.remove('yellow'); $('#chestWrap').classList.remove('ready'); }
  else { b.textContent = T('free'); b.classList.remove('gray'); b.classList.add('yellow'); $('#chestWrap').classList.add('ready'); }
}
setInterval(() => { if (G.mode === 'menu') updateChest(); }, 500);

function openChest() {
  if (save.chestAt > Date.now()) { toast(T('recharging')); return; }
  save.chestAt = Date.now() + 90 * 1000;
  const r = Math.random(); let msg = '';
  if (r < 0.15) { save.keys++; msg = T('keyPlus'); }
  else if (r < 0.40) {
    const pool = [
      ...WEAPONS.filter(w => !save.ownedW.includes(w.id)).map(i => ['weapon', i]),
      ...SKINS.filter(s => !save.ownedS.includes(s.id)).map(i => ['skin', i]),
      ...COLORS.filter(s => !save.ownedC.includes(s.id)).map(i => ['color', i]),
    ];
    if (pool.length) {
      const [t, it] = pick(pool);
      (t === 'weapon' ? save.ownedW : t === 'skin' ? save.ownedS : save.ownedC).push(it.id);
      msg = T('newItem', t, nameOf(kindOf(t), it));
    }
  }
  if (!msg) { const n = 40 + ((Math.random() * 100) | 0); save.cash += n; msg = `💵 +${n}`; }
  persist(); snd.coin(); refreshMenu();
  openModal({ title: T('chestOpened'), body: `<div class="reward">${msg}</div>`, buttons: [{ label: T('nice'), cls: 'green', fn: closeModal }] });
}

/* ----- shop ----- */
let shopTab = 'weapon';
function openShop(tab) {
  shopTab = tab || shopTab;
  const data = { weapon: [WEAPONS, 'ownedW', 'weapon'], skin: [SKINS, 'ownedS', 'skin'], color: [COLORS, 'ownedC', 'color'] };
  const body = document.createElement('div');
  const tabs = document.createElement('div'); tabs.className = 'tabs';
  [['weapon', T('tabWeapons')], ['skin', T('tabSkins')], ['color', T('tabColors')]].forEach(([k, label]) => {
    const t = document.createElement('button'); t.className = 'tab' + (k === shopTab ? ' on' : ''); t.textContent = label;
    t.onclick = () => openShop(k); tabs.appendChild(t);
  });
  body.appendChild(tabs);
  const grid = document.createElement('div'); grid.className = 'grid';
  const [list, ownKey, saveKey] = data[shopTab];
  list.forEach(it => {
    const owned = save[ownKey].includes(it.id), eq = save[saveKey] === it.id;
    const d = document.createElement('div'); d.className = 'item' + (eq ? ' eq' : '');
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 72; d.appendChild(cv2);
    const nm = document.createElement('span'); nm.textContent = nameOf(kindOf(shopTab), it); d.appendChild(nm);
    if (shopTab === 'weapon') { const st = document.createElement('span'); st.className = 'st'; st.textContent = T('stats', it.dmg, Math.round(100 / it.dur * 4)); d.appendChild(st); }
    const tag = document.createElement('span'); tag.className = 'tag ' + (owned ? 'own' : 'price');
    tag.textContent = eq ? T('equipped') : owned ? T('equip') : '💵 ' + it.cost; d.appendChild(tag);
    d.onclick = () => {
      if (!owned) {
        if (save.cash < it.cost) { toast(T('noCash')); return; }
        save.cash -= it.cost; save[ownKey].push(it.id); snd.coin();
      }
      save[saveKey] = it.id; persist(); refreshMenu(); openShop();
    };
    grid.appendChild(d); drawItemIcon(cv2, shopTab, it.id);
  });
  body.appendChild(grid);
  openModal({ title: `${T('shop')}   💵 ${save.cash}`, body, wide: true, buttons: [{ label: T('close'), cls: 'green', fn: closeModal }] });
}

function openSettings() {
  const body = document.createElement('div');
  const row = document.createElement('div'); row.className = 'row'; row.innerHTML = '<span>' + T('sound') + '</span>';
  const tg = document.createElement('button'); tg.className = 'tog' + (save.sound ? '' : ' off'); tg.textContent = save.sound ? T('on') : T('off');
  tg.onclick = () => { save.sound = !save.sound; persist(); tg.className = 'tog' + (save.sound ? '' : ' off'); tg.textContent = save.sound ? T('on') : T('off'); };
  row.appendChild(tg); body.appendChild(row);
  const r2 = document.createElement('div'); r2.className = 'row'; r2.innerHTML = '<span>' + T('progress') + '</span>';
  const rs = document.createElement('button'); rs.className = 'tog off'; rs.textContent = T('reset');
  rs.onclick = () => { if (confirm(T('confirmReset'))) { save = defSave(); persist(); refreshMenu(); closeModal(); toast(T('progressReset')); } };
  r2.appendChild(rs); body.appendChild(r2);
  const r3 = document.createElement('div'); r3.className = 'row'; r3.innerHTML = '<span>' + T('language') + '</span>';
  const lg = document.createElement('button'); lg.className = 'tog'; lg.textContent = LANG === 'vi' ? 'Tiếng Việt' : 'English';
  lg.onclick = () => { setLang(LANG === 'vi' ? 'en' : 'vi'); openSettings(); };
  r3.appendChild(lg); body.appendChild(r3);
  const help = document.createElement('div'); help.className = 'sub'; help.style.marginTop = '8px';
  help.innerHTML = T('help');
  body.appendChild(help);
  openModal({ title: T('settings'), body, buttons: [{ label: T('close'), cls: 'green', fn: closeModal }] });
}


/* ----- language ----- */
function applyLang() {
  document.documentElement.lang = LANG;
  $('#btnWeapon').lastChild.textContent = T('weapon');
  $('#btnSkin').lastChild.textContent = T('skin');
  $('#btnColor').lastChild.textContent = T('color');
  $('#btnBoss').firstChild.textContent = T('boss') + ' ';
  $('#btnSoccer').firstChild.textContent = T('soccer');
  $('#btnSettings').title = T('settings'); $('#btnExit').title = T('backMenu');
  $('#btnLang').textContent = LANG.toUpperCase(); $('#btnLang').title = T('language');
  $('#btnHome').textContent = T('home');
  refreshMenu();
}
function setLang(l) {
  LANG = l;
  try { localStorage.setItem('ag-lang', l); } catch (e) {}
  applyLang();
}

/* ----- wiring ----- */
$('#btnLang').onclick = () => setLang(LANG === 'vi' ? 'en' : 'vi');
$('#btnHome').onclick = () => { location.href = '/'; };            // back to the Alex Games home page
if (location.protocol === 'file:') $('#btnHome').style.display = 'none';   // only meaningful on the website
$('#btnWeapon').onclick = () => openShop('weapon');
$('#btnSkin').onclick = () => openShop('skin');
$('#btnColor').onclick = () => openShop('color');
$('#btnSettings').onclick = openSettings;
$('#btnChest').onclick = openChest;
$('#chestWrap').onclick = openChest;
$('#btnPlay').onclick = () => startFight(false);
$('#btnBoss').onclick = () => startFight(true);
$('#bossBox').onclick = () => startFight(true);
$('#btnSoccer').onclick = startSoccer;
$('#btnSurvival').onclick = startSurvival;
$('#btnExit').onclick = () => {
  if (G.mode === 'fight' && G.survival && !G.over) { const r = bankSurvival(); toast(T('banked', r.reward, r.cleared)); }
  toMenu();
};

/* ----- input ----- */
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyJ: 'atk', KeyK: 'atk', KeyZ: 'atk', KeyX: 'atk', Enter: 'atk',
};
addEventListener('keydown', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  if (G.mode !== 'menu') e.preventDefault();
  keys[k] = 1;
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = 0; });
addEventListener('blur', () => { keys.left = keys.right = keys.jump = keys.atk = 0; });
stage.addEventListener('pointerdown', e => { if (G.mode !== 'menu' && !e.target.closest('button') && !$('#modal').classList.contains('on')) keys.atk = 1; });
addEventListener('pointerup', () => { keys.atk = 0; });
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); keys[k] = 1; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => { keys[k] = 0; }));
});

/* ------------------------------------------------------------------ go */
applyLang();
requestAnimationFrame(frame);

// tiny debug hook for automated tests
window.__game = { G, save: () => save, startFight, startSoccer, startSurvival, keys };
})();
