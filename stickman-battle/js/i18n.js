'use strict';
/* Alex Games: Vietnamese / English texts. Shares the 'ag-lang' key with the home page and the other games. */
const I18N = {
  en: {
    home: 'Home', lang: 'Language', langBtn: 'VI', fullscreen: 'Fullscreen', leaveSure: 'Leave the website and quit the match?',
    weapons: 'Weapons', settings: 'Settings', skip: 'Skip level', leaveT: 'Leave match', selLevel: 'Select level',
    skins: 'SKINS', online: 'ONLINE', block: 'BLOCK', hit: 'HIT',
    levels: 'LEVELS', selectLevel: 'SELECT LEVEL', close: 'CLOSE',
    name: 'Name', pickWeapon: 'Choose your weapon (all weapons are free online)', server: 'Server',
    quick: 'QUICK MATCH', create: 'CREATE ROOM', code: 'CODE', join: 'JOIN', cancel: 'CANCEL',
    settingsH: 'SETTINGS', sound: 'Sound', progress: 'Progress', on: 'ON', off: 'OFF', reset: 'RESET', sure: 'SURE?',
    help: '<b>A / D</b> or arrows: move &nbsp; <b>W / Space</b>: jump<br><b>J / X / Click</b>: attack &nbsp; <b>S / K / Right-click</b>: block<br><b>P / Esc</b>: pause &nbsp; Knock enemies off the platform!',
    equipped: 'EQUIPPED', owned: 'OWNED', reach: n => 'REACH LV ' + n, fists: 'FISTS',
    unlocked: (a, b) => 'Unlocked ' + a + ' / ' + b + '   (every 5th level is a boss)',
    lvComplete: n => 'LEVEL ' + n + ' COMPLETE', skullsEarned: r => 'Skulls earned: +' + r, nextLevel: 'NEXT LEVEL',
    victory: 'VICTORY!', defeat: 'DEFEAT', finalScore: (a, b, o) => 'Final score  ' + a + ' - ' + b + '  vs ' + o,
    rematch: 'REMATCH', leave: 'LEAVE', oppLeft: 'OPPONENT LEFT', winDefault: 'You win by default.', ok: 'OK',
    disc: 'DISCONNECTED', lostSrv: 'Lost connection to the server.',
    champ: 'CHAMPION!', champSub: (n, r) => 'You beat all ' + n + ' levels! Skulls earned: +' + r, playAgain: 'PLAY AGAIN',
    died: 'YOU DIED', diedSub: 'Buy a better weapon and try again!', retry: 'RETRY', paused: 'PAUSED', resume: 'RESUME',
    enterCode: 'Enter the 4-letter room code', onlineRound: n => 'ONLINE  -  ROUND ' + n, levelN: n => 'LEVEL ' + n,
    connecting: 'Connecting…', badAddr: 'Invalid server address', cannotReach: s => 'Cannot reach the server (' + s + ')',
    searching: 'Searching for an opponent…', roomHtml: c => 'Room code <b>' + c + '</b><br>Waiting for a friend to join…', roomShort: c => 'Room code ' + c,
    connLost: 'Connection lost', oppLeftS: 'Opponent left', matchFound: 'MATCH FOUND', vs: n => 'vs ' + n,
    roundWon: 'ROUND WON', roundLost: 'ROUND LOST', wantsRematch: 'Opponent wants a rematch!', waitOpp: 'Waiting for your opponent…',
    errNotFound: 'Room not found', errFull: 'Room is full',
    finalBoss: 'FINAL BOSS', defeatKing: 'Defeat the King!', bossFight: 'BOSS FIGHT', levelPlace: (n, p) => 'Level ' + n + '  -  ' + p,
    fight: 'FIGHT!', ko: 'K.O.', hold: 'HOLD', press: 'PRESS', orClick: 'or click to attack', boss: 'BOSS', you: 'YOU', king: 'KING'
  },
  vi: {
    home: 'Trang chủ', lang: 'Ngôn ngữ', langBtn: 'EN', fullscreen: 'Toàn màn hình', leaveSure: 'Thoát khỏi trận đấu và rời trang này?',
    weapons: 'Vũ khí', settings: 'Cài đặt', skip: 'Bỏ qua màn', leaveT: 'Rời trận', selLevel: 'Chọn màn',
    skins: 'TRANG PHỤC', online: 'ĐẤU ONLINE', block: 'ĐỠ', hit: 'ĐÁNH',
    levels: 'CÁC MÀN', selectLevel: 'CHỌN MÀN', close: 'ĐÓNG',
    name: 'Tên', pickWeapon: 'Chọn vũ khí (online miễn phí mọi vũ khí)', server: 'Máy chủ',
    quick: 'TÌM TRẬN NHANH', create: 'TẠO PHÒNG', code: 'MÃ', join: 'VÀO', cancel: 'HỦY',
    settingsH: 'CÀI ĐẶT', sound: 'Âm thanh', progress: 'Tiến trình', on: 'BẬT', off: 'TẮT', reset: 'ĐẶT LẠI', sure: 'CHẮC?',
    help: '<b>A / D</b> hoặc phím mũi tên: di chuyển &nbsp; <b>W / Space</b>: nhảy<br><b>J / X / Chuột trái</b>: tấn công &nbsp; <b>S / K / Chuột phải</b>: đỡ đòn<br><b>P / Esc</b>: tạm dừng &nbsp; Đẩy kẻ địch rơi khỏi sàn!',
    equipped: 'ĐANG DÙNG', owned: 'ĐÃ CÓ', reach: n => 'ĐẠT MÀN ' + n, fists: 'TAY KHÔNG',
    unlocked: (a, b) => 'Đã mở ' + a + ' / ' + b + '   (cứ 5 màn có một trùm)',
    lvComplete: n => 'HOÀN THÀNH MÀN ' + n, skullsEarned: r => 'Sọ nhận được: +' + r, nextLevel: 'MÀN TIẾP',
    victory: 'CHIẾN THẮNG!', defeat: 'THẤT BẠI', finalScore: (a, b, o) => 'Tỉ số chung cuộc  ' + a + ' - ' + b + '  gặp ' + o,
    rematch: 'ĐẤU LẠI', leave: 'RỜI', oppLeft: 'ĐỐI THỦ ĐÃ THOÁT', winDefault: 'Bạn thắng do đối thủ bỏ cuộc.', ok: 'OK',
    disc: 'MẤT KẾT NỐI', lostSrv: 'Mất kết nối tới máy chủ.',
    champ: 'NHÀ VÔ ĐỊCH!', champSub: (n, r) => 'Bạn đã vượt cả ' + n + ' màn! Sọ nhận được: +' + r, playAgain: 'CHƠI LẠI',
    died: 'BẠN ĐÃ CHẾT', diedSub: 'Mua vũ khí tốt hơn rồi thử lại nhé!', retry: 'THỬ LẠI', paused: 'TẠM DỪNG', resume: 'TIẾP TỤC',
    enterCode: 'Nhập mã phòng 4 chữ cái', onlineRound: n => 'ONLINE  -  VÒNG ' + n, levelN: n => 'MÀN ' + n,
    connecting: 'Đang kết nối…', badAddr: 'Địa chỉ máy chủ không hợp lệ', cannotReach: s => 'Không kết nối được máy chủ (' + s + ')',
    searching: 'Đang tìm đối thủ…', roomHtml: c => 'Mã phòng <b>' + c + '</b><br>Đang chờ bạn bè vào…', roomShort: c => 'Mã phòng ' + c,
    connLost: 'Mất kết nối', oppLeftS: 'Đối thủ đã thoát', matchFound: 'ĐÃ TÌM THẤY ĐỐI THỦ', vs: n => 'gặp ' + n,
    roundWon: 'THẮNG VÒNG', roundLost: 'THUA VÒNG', wantsRematch: 'Đối thủ muốn đấu lại!', waitOpp: 'Đang chờ đối thủ…',
    errNotFound: 'Không tìm thấy phòng', errFull: 'Phòng đã đủ người',
    finalBoss: 'TRÙM CUỐI', defeatKing: 'Hạ gục Nhà Vua!', bossFight: 'ĐẤU TRÙM', levelPlace: (n, p) => 'Màn ' + n + '  -  ' + p,
    fight: 'CHIẾN!', ko: 'K.O.', hold: 'GIỮ', press: 'NHẤN', orClick: 'hoặc bấm chuột để đánh', boss: 'TRÙM', you: 'BẠN', king: 'VUA',
    'sc_Moonlit Ruins': 'Tàn tích dưới trăng', 'sc_Thunderstorm': 'Bão sấm sét', 'sc_Frozen Peaks': 'Đỉnh băng giá',
    'sc_Scorched Desert': 'Sa mạc cháy bỏng', 'sc_Volcano Rim': 'Miệng núi lửa', 'sc_Whisper Forest': 'Rừng thì thầm',
    'sc_Deep Sea': 'Biển sâu', 'sc_Starfall Void': 'Hư không sao rơi', 'sc_Neon Rooftop': 'Mái nhà neon', 'sc_Sakura Temple': 'Đền hoa anh đào'
  }
};
let LANG = 'vi';
try { LANG = localStorage.getItem('ag-lang') === 'en' ? 'en' : 'vi'; } catch (e) { /* private mode */ }
function T(k, a, b, c) {
  let v = I18N[LANG][k]; if (v === undefined) v = I18N.en[k];
  return typeof v === 'function' ? v(a, b, c) : v;
}
const sceneName = n => I18N[LANG]['sc_' + n] || n;
function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = T(e.dataset.i); });
  document.querySelectorAll('[data-ih]').forEach(e => { e.innerHTML = T(e.dataset.ih); });
  document.querySelectorAll('[data-it]').forEach(e => { e.title = T(e.dataset.it); });
  document.querySelectorAll('[data-ip]').forEach(e => { e.placeholder = T(e.dataset.ip); });
  const lb = document.getElementById('btn-lang'); if (lb) lb.textContent = T('langBtn');
}
function setLang(l) {
  LANG = l;
  try { localStorage.setItem('ag-lang', l); } catch (e) { /* ignore */ }
  applyStatic();
  if (typeof UI !== 'undefined' && UI.relang) UI.relang();
}
