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
const server = http.createServer((req, res) => {
  const [url, query = ''] = req.url.split('?');
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
const queues = {};            // mode -> ws waiting
const rooms = new Map();      // code -> room
let nextId = 1;

const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const broadcastCount = () => { const msg = { t: 'online', count: wss.clients.size }; wss.clients.forEach(c => send(c, msg)); };

function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(''); } while (rooms.has(code));
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

  ws.on('close', () => { leaveAll(ws); broadcastCount(); });
  ws.on('error', () => {});
});

setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.alive) return ws.terminate(); ws.alive = false; ws.ping(); });
}, 25000);

server.listen(PORT, () => console.log(`Tic Tac Toe Ultimate running on http://localhost:${PORT}`));
