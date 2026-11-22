'use strict';
/*
 * Tic Tac Toe Ultimate — online server.
 * Serves index.html and runs matchmaking + rooms over WebSocket.
 *   npm install && npm start      (PORT env var, default 3000)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MODES = {
  classic: { n: 3, k: 3 }, endless: { n: 3, k: 3, endless: 1 },
  m5: { n: 5, k: 4 }, m6: { n: 6, k: 4 }, m4: { n: 4, k: 4 }, m7: { n: 7, k: 5 }, m10: { n: 10, k: 5 }, m20: { n: 20, k: 5 }, misere: { n: 3, k: 3, misere: 1 }
};
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/* ---------- static file ---------- */
function sendPage(res, file) {
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(500); return res.end(file + ' missing'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2'
};
/* Serves a small static game that lives in its own folder, e.g. /stickman-battle-2/  ->  ./stickman-battle-2/ */
function sendStatic(res, dir, rel) {
  let name;
  try { name = decodeURIComponent(rel || ''); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
  if (!name || name.endsWith('/')) name += 'index.html';
  const base = path.join(__dirname, dir) + path.sep;
  const file = path.normalize(path.join(base, name));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy trang này'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}
const STATIC_GAMES = ['stickman-battle-2', 'stickman-battle', 'capybara-run'];

const server = http.createServer((req, res) => {
  const [url, query = ''] = req.url.split('?');
  const sg = STATIC_GAMES.find(g => url === '/' + g || url.startsWith('/' + g + '/'));
  if (sg) {
    if (url === '/' + sg) { res.writeHead(301, { Location: '/' + sg + '/' }); return res.end(); }   // relative asset links need the trailing slash
    return sendStatic(res, sg, url.slice(sg.length + 2));
  }
  if (url === '/') {
    // old invite links looked like /?room=ABCD - keep them working by opening the game
    sendPage(res, /(^|&)room=/.test(query) ? 'index.html' : 'home.html');
  } else if (url === '/tic-tac-toe' || url === '/tic-tac-toe/' || url === '/index.html') sendPage(res, 'index.html');
  else if (url === '/health') { res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy trang này'); }
});

/* ---------- game helpers ---------- */
function lineAt(b, n, k, idx, p) {
  const r = (idx / n) | 0, c = idx % n;
  for (const [dr, dc] of DIRS) {
    let cnt = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === p) { cnt++; rr += dr * s; cc += dc * s; }
    }
    if (cnt >= k) return true;
  }
  return false;
}

const wss = new WebSocketServer({ server, maxPayload: 1024 });
/* ---------- Stickman Battle 2: online duel (matchmaking + relay; the clients simulate the fight) ---------- */
function sbLeave(ws) {
  if (sbWaiting === ws) sbWaiting = null;
  const room = ws.sb;
  if (!room) return;
  ws.sb = null; sbRooms.delete(room.code);
  for (const p of room.players) if (p && p !== ws) { p.sb = null; send(p, { t: 'sb_opp_left' }); }
}
function sbStart(room) {
  room.players.forEach((p, i) => { p.sb = room; send(p, { t: 'sb_start', idx: i, code: room.code }); });
}
function sbMessage(ws, m) {
  if (m.t === 'sb_relay') {
    const room = ws.sb;
    if (!room || room.players.length < 2 || !m.d || typeof m.d !== 'object') return;
    send(room.players.find(x => x !== ws), { t: 'sb_relay', d: m.d });
  } else if (m.t === 'sb_quick') {
    sbLeave(ws);
    if (sbWaiting && sbWaiting !== ws && sbWaiting.readyState === 1) {
      const room = { code: makeCode(), players: [sbWaiting, ws] }; sbWaiting = null;
      sbRooms.set(room.code, room); sbStart(room);
    } else { sbWaiting = ws; send(ws, { t: 'sb_searching' }); }
  } else if (m.t === 'sb_create') {
    sbLeave(ws);
    const room = { code: makeCode(), players: [ws] };
    sbRooms.set(room.code, room); ws.sb = room;
    send(ws, { t: 'sb_waiting', code: room.code });
  } else if (m.t === 'sb_join') {
    const room = sbRooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) return send(ws, { t: 'sb_error', msg: 'not_found' });
    if (room.players.length >= 2) return send(ws, { t: 'sb_error', msg: 'full' });
    if (room.players[0] === ws) return;
    sbLeave(ws);
    room.players.push(ws); sbStart(room);
  } else if (m.t === 'sb_leave') {
    sbLeave(ws);
  }
}


/* ---------- Stickman Battle (1): online 1v1, best of 3. Messages are namespaced 'sk_'. Each client simulates its own
   fighter and streams its pose; the server only pairs players, relays and keeps the round score. ---------- */
const SK_WIN = 2;
const skRooms = new Map();    // code -> room
let skQueue = [];             // sockets waiting for a quick match
function skCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';     // letters only: the game's code box only accepts letters
  let c;
  do { c = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(''); } while (skRooms.has(c));
  return c;
}
function skProfile(ws, m) {
  ws.skName = String(m.name || 'Player').replace(/[^\w \-.]/g, '').slice(0, 12) || 'Player';
  ws.skWeapon = String(m.weapon || 'fists').replace(/[^a-z]/g, '').slice(0, 20) || 'fists';
  ws.skSkin = String(m.skin || 'classic').replace(/[^a-z]/g, '').slice(0, 20) || 'classic';
}
function skBroadcast(room, obj) { room.players.forEach(p => send(p, obj)); }
function skLeave(ws) {
  skQueue = skQueue.filter(q => q !== ws);
  const room = ws.skRoom;
  if (!room) return;
  ws.skRoom = null;
  clearTimeout(room.timer);
  const other = room.players.find(p => p !== ws);
  if (other) { other.skRoom = null; send(other, { t: 'sk_oppleft' }); }
  skRooms.delete(room.code);
}
function skNextRound(room) {
  if (room.players.length < 2) return;
  room.round++; room.state = 'playing';
  skBroadcast(room, { t: 'sk_round', n: room.round, scores: room.scores });
}
function skStart(room) {
  const [a, b] = room.players;
  room.scores = [0, 0]; room.round = 0; room.state = 'starting'; room.rematch = new Set();
  const info = p => ({ name: p.skName, weapon: p.skWeapon, skin: p.skSkin });
  send(a, { t: 'sk_matched', idx: 0, code: room.code, opp: info(b) });
  send(b, { t: 'sk_matched', idx: 1, code: room.code, opp: info(a) });
  room.timer = setTimeout(() => skNextRound(room), 900);
}
function skAdd(room, ws) { ws.skRoom = room; ws.skIdx = room.players.length; room.players.push(ws); }
function skDead(ws) {
  const room = ws.skRoom;
  if (!room || room.state !== 'playing' || room.players.length < 2) return;
  room.state = 'between';
  const winner = 1 - ws.skIdx;
  room.scores[winner]++;
  const over = room.scores[winner] >= SK_WIN;
  skBroadcast(room, { t: 'sk_roundover', winner, scores: room.scores, over });
  if (over) room.state = 'over'; else room.timer = setTimeout(() => skNextRound(room), 3400);
}
function skMessage(ws, m, raw) {
  const t = m.t.slice(3);
  if (t === 's' || t === 'hit' || t === 'hitres') {                 // relayed straight to the opponent
    const room = ws.skRoom;
    if (room && room.players.length === 2 && ws.readyState === 1) {
      const other = room.players[1 - ws.skIdx];
      if (other && other.readyState === 1) other.send(raw.toString());
    }
  } else if (t === 'quick') {
    skProfile(ws, m); skLeave(ws);
    const other = skQueue.find(q => q !== ws && q.readyState === 1);
    if (other) {
      skQueue = skQueue.filter(q => q !== other && q !== ws);
      const room = { code: skCode(), players: [], scores: [0, 0], round: 0, state: 'lobby', rematch: new Set(), timer: null };
      skRooms.set(room.code, room); skAdd(room, other); skAdd(room, ws); skStart(room);
    } else { skQueue.push(ws); send(ws, { t: 'sk_wait' }); }
  } else if (t === 'create') {
    skProfile(ws, m); skLeave(ws);
    const room = { code: skCode(), players: [], scores: [0, 0], round: 0, state: 'lobby', rematch: new Set(), timer: null };
    skRooms.set(room.code, room); skAdd(room, ws);
    send(ws, { t: 'sk_created', code: room.code });
  } else if (t === 'join') {
    skProfile(ws, m);
    const code = String(m.code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    const room = skRooms.get(code);
    if (!room) return send(ws, { t: 'sk_error', code: 'notfound', room: code });
    if (room.players.length >= 2) return send(ws, { t: 'sk_error', code: 'full', room: code });
    if (room.players[0] === ws) return;
    skLeave(ws); skAdd(room, ws); skStart(room);
  } else if (t === 'leave') {
    skLeave(ws);
  } else if (t === 'dead') {
    const room = ws.skRoom;
    if (room && room.players.length === 2) send(room.players[1 - ws.skIdx], { t: 'sk_dead' });
    skDead(ws);
  } else if (t === 'rematch') {
    const room = ws.skRoom;
    if (!room || room.state !== 'over' || room.players.length < 2) return;
    room.rematch.add(ws.skIdx);
    if (room.rematch.size === 2) {
      room.scores = [0, 0]; room.round = 0; room.rematch.clear();
      skBroadcast(room, { t: 'sk_rematchgo' });
      room.timer = setTimeout(() => skNextRound(room), 700);
    } else send(room.players[1 - ws.skIdx], { t: 'sk_rematchreq' });
  }
  // 'ping' (keep-alive) needs no answer
}

const queues = {};            // mode -> ws waiting
const rooms = new Map();      // code -> room (Tic Tac Toe)
const sbRooms = new Map();    // code -> room (Stickman Battle 2 duels)
let sbWaiting = null;         // Stickman quick-match queue (one waiting socket)
let nextId = 1;

const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const broadcastCount = () => { const msg = { t: 'online', count: wss.clients.size }; wss.clients.forEach(c => send(c, msg)); };

function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(''); } while (rooms.has(code) || sbRooms.has(code));
  return code;
}
function leaveAll(ws) {
  for (const m in queues) if (queues[m] === ws) delete queues[m];
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  rooms.delete(room.code);
  for (const p of room.players) if (p && p !== ws) { p.room = null; send(p, { t: 'opp_left' }); }
}
function freshGame(room) {
  const cfg = MODES[room.mode];
  room.b = new Array(cfg.n * cfg.n).fill(0);
  room.q = [[], []];
  room.turn = 1;
  room.over = false;
  room.rematch = new Set();
}
function startRoom(room, swap) {
  freshGame(room);
  if (swap) room.players.reverse();       // players[0] always plays X (mark 1)
  room.players.forEach((p, i) => { p.mark = i + 1; send(p, { t: 'start', mark: i + 1, mode: room.mode, code: room.code }); });
}
function pairUp(a, b, mode) {
  const room = { code: makeCode(), mode, players: Math.random() < .5 ? [a, b] : [b, a] };
  rooms.set(room.code, room);
  a.room = b.room = room;
  startRoom(room, false);
}

wss.on('connection', ws => {
  ws.id = nextId++; ws.alive = true; ws.room = null;
  ws.on('pong', () => { ws.alive = true; });
  send(ws, { t: 'hello', count: wss.clients.size });
  broadcastCount();

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const now = Date.now();                                   // tiny flood guard (the fight sends ~30 messages/second)
    if (now - (ws.rlT || 0) > 1000) { ws.rlT = now; ws.rlN = 0; }
    if (++ws.rlN > 150) return;
    if (m.t.startsWith('sb_')) return sbMessage(ws, m);
    if (m.t.startsWith('sk_')) return skMessage(ws, m, raw);

    if (m.t === 'quick' && MODES[m.mode]) {
      leaveAll(ws);
      const w = queues[m.mode];
      if (w && w !== ws && w.readyState === 1) { delete queues[m.mode]; pairUp(w, ws, m.mode); }
      else { queues[m.mode] = ws; send(ws, { t: 'searching' }); }
    }
    else if (m.t === 'create' && MODES[m.mode]) {
      leaveAll(ws);
      const room = { code: makeCode(), mode: m.mode, players: [ws] };
      rooms.set(room.code, room); ws.room = room;
      send(ws, { t: 'waiting', code: room.code, mode: room.mode });
    }
    else if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: 'error', msg: 'not_found' });
      if (room.players.length >= 2) return send(ws, { t: 'error', msg: 'full' });
      if (room.players[0] === ws) return;
      leaveAll(ws);
      room.players.push(ws); ws.room = room;
      if (Math.random() < .5) room.players.reverse();
      startRoom(room, false);
    }
    else if (m.t === 'move') {
      const room = ws.room;
      if (!room || room.players.length < 2 || room.over || ws.mark !== room.turn) return;
      const cfg = MODES[room.mode], i = m.i;
      if (!Number.isInteger(i) || i < 0 || i >= room.b.length || room.b[i]) return;
      const p = room.turn;
      room.b[i] = p; room.q[p - 1].push(i);
      if (cfg.endless && room.q[p - 1].length > 3) room.b[room.q[p - 1].shift()] = 0;
      room.moves = (room.moves || 0) + 1;
      if (lineAt(room.b, cfg.n, cfg.k, i, p) || (!cfg.endless && room.b.every(x => x)) || (cfg.endless && room.moves >= 120)) room.over = true;
      else room.turn = 3 - p;
      const other = room.players.find(x => x !== ws);
      send(other, { t: 'move', i });
    }
    else if (m.t === 'rematch') {
      const room = ws.room;
      if (!room || room.players.length < 2 || !room.over) return;
      room.rematch.add(ws);
      if (room.rematch.size >= 2) { room.moves = 0; startRoom(room, true); }
      else send(room.players.find(x => x !== ws), { t: 'rematch_req' });
    }
    else if (m.t === 'emote' && ws.room && typeof m.e === 'string' && m.e.length <= 4) {
      send(ws.room.players.find(x => x !== ws), { t: 'emote', e: m.e });
    }
    else if (m.t === 'leave') { leaveAll(ws); send(ws, { t: 'left' }); }
  });

  ws.on('close', () => { leaveAll(ws); sbLeave(ws); skLeave(ws); broadcastCount(); });
  ws.on('error', () => {});
});

setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.alive) return ws.terminate(); ws.alive = false; ws.ping(); });
}, 25000);

server.listen(PORT, () => console.log(`Tic Tac Toe Ultimate running on http://localhost:${PORT}`));
