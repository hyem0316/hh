/* 햄 님 합동 비서실 — shared office app
 * 로컬 체험 모드(localStorage) / Firebase Realtime Database 모드
 * GitHub Pages에서 빌드 도구 없이 바로 동작합니다.
 */
(function () {
  'use strict';

  /* ─────────────── 상수 ─────────────── */

  var CAPTAIN = {
    id: 'captain', name: '대장님', label: '대장님(햄)', handle: '@haem1',
    emoji: '👑', char: '👑', color: '#c9a227', kind: 'captain'
  };

  var MEMBERS = [
    { id: 'haem1', name: '피클1', handle: '@haem1', emoji: '🐹', char: '1', color: '#e8846b' },
    { id: 'leelaehui1', name: '피클2', handle: '@leelaehui1', emoji: '🐰', char: '2', color: '#6aa79b' },
    { id: 'haemtaengpon1', name: '피클3', handle: '@haemtaengpon1', emoji: '🍊', char: '3', color: '#d5a12c' },
    { id: 'haemseobeu6', name: '피클4', handle: '@haemseobeu6', emoji: '💜', char: '4', color: '#9b87c9' },
    { id: 'haem31', name: '피클5', handle: '@haem31', emoji: '⚡', char: '5', color: '#7f9bc9' }
  ];

  var ROOMS = [
    { id: 'meeting', name: '대회의실', emoji: '🪑', hint: '다 같이 모여 이야기하는 방', color: '#e8846b' },
    { id: 'command', name: '지휘실', emoji: '🎯', hint: '대장님 지시를 받는 방', color: '#6aa79b' },
    { id: 'lounge', name: '라운지', emoji: '☕', hint: '잠깐 쉬어가는 방', color: '#d5a12c' }
  ];

  var STATUSES = [
    { id: 'waiting', label: '대기 중', emoji: '🟡' },
    { id: 'working', label: '작업 중', emoji: '🟢' },
    { id: 'resting', label: '휴식 중', emoji: '🔵' }
  ];

  var TASK_STATUSES = [
    { id: 'waiting', label: '🟡 대기', board: '대기' },
    { id: 'doing', label: '🟢 진행 중', board: '진행 중' },
    { id: 'done', label: '✅ 완료', board: '완료' }
  ];

  var CATEGORIES = [
    { id: '네오빌', color: '#5b7fe8' },
    { id: '체험단', color: '#e8846b' },
    { id: '폰테크', color: '#6aa79b' },
    { id: '가계', color: '#c9a227' },
    { id: '일반', color: '#918873' }
  ];

  var DEFAULT_PROFILE = {
    haem1: { room: 'command', status: 'waiting' },
    leelaehui1: { room: 'meeting', status: 'working' },
    haemtaengpon1: { room: 'meeting', status: 'waiting' },
    haemseobeu6: { room: 'lounge', status: 'resting' },
    haem31: { room: 'command', status: 'working' }
  };

  var ASSIGN_ALL = '모두';
  var DEFAULT_PASSCODE = '0316';
  var ROOT_PATH = 'pickle-office/v1';
  var SDK_BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';

  var LS = {
    member: 'hh.member.v2',
    passcode: 'hh.passcode.v1',
    trusted: 'hh.trusted.v1',
    cfg: 'hh.firebase.v1',
    data: 'hh.local.v3',
    dataPrev: 'hh.local.v2',
    tab: 'hh.tab.v2',
    room: 'hh.room.v1'
  };
  var SS = { unlocked: 'hh.unlocked.v1' };

  /* ─────────────── 도우미 ─────────────── */

  function $(id) { return document.getElementById(id); }

  function identityById(id) {
    if (!id) return null;
    if (id === CAPTAIN.id) return CAPTAIN;
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].id === id) return MEMBERS[i];
    }
    return null;
  }

  function memberById(id) {
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].id === id) return MEMBERS[i];
    }
    return null;
  }

  function identityLabel(id) {
    var it = identityById(id);
    if (!it) return '이름 없음';
    return it.kind === 'captain' ? '대장님(햄)' : it.name;
  }

  /* 아바타 — 비서 번호를 동그라미 안에 (색으로도 구분) */
  function avatarHtml(it, small) {
    return '<span class="avatar' + (small ? ' sm' : '') + '" style="--c:' + it.color + '">' + escapeHtml(it.char) + '</span>';
  }

  /* 받침에 따라 '로' / '으로' — 숫자는 읽는 소리(1 일·2 이·3 삼…)로 판단 */
  function roJosa(word) {
    var w = String(word || '');
    if (!w) return '으로';
    var c = w.charCodeAt(w.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) {
      var jong = (c - 0xAC00) % 28;
      return (jong === 0 || jong === 8) ? '로' : '으로';
    }
    if (c >= 48 && c <= 57) {
      return '036'.indexOf(w.charAt(w.length - 1)) >= 0 ? '으로' : '로';
    }
    return '으로';
  }

  function roomById(id) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].id === id) return ROOMS[i];
    }
    return ROOMS[0];
  }

  function statusById(id) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].id === id) return STATUSES[i];
    }
    return STATUSES[0];
  }

  function taskStatusById(id) {
    for (var i = 0; i < TASK_STATUSES.length; i++) {
      if (TASK_STATUSES[i].id === id) return TASK_STATUSES[i];
    }
    return TASK_STATUSES[0];
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return { id: id || '일반', color: '#918873' };
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtClock(ts) {
    var d = new Date(Number(ts) || 0);
    var h = d.getHours();
    var ap = h < 12 ? '오전' : '오후';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return ap + ' ' + hh + ':' + pad2(d.getMinutes());
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function fmtDay(ts) {
    var d = new Date(Number(ts) || 0);
    var now = new Date();
    if (sameDay(d, now)) return '오늘';
    var y = new Date(now.getTime() - 86400000);
    if (sameDay(d, y)) return '어제';
    var label = (d.getFullYear() === now.getFullYear()) ? '' : d.getFullYear() + '. ';
    return label + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function fmtStamp(ts) {
    var d = new Date(Number(ts) || 0);
    var now = new Date();
    if (sameDay(d, now)) return '오늘 ' + fmtClock(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + fmtClock(ts);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var MENTION_RE = (function () {
    var names = [];
    for (var i = 0; i < MEMBERS.length; i++) {
      names.push(MEMBERS[i].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    return new RegExp('@(' + names.join('|') + ')', 'g');
  })();

  function highlightMentions(escaped) {
    return escaped.replace(MENTION_RE, function (all, name) {
      return '<span class="mention">@' + name + '</span>';
    });
  }

  function linkify(html) {
    return html.replace(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]}])/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
  }

  function richText(text) {
    return linkify(highlightMentions(escapeHtml(upgradeNames(text))));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function values(obj) {
    var out = [];
    if (!obj || typeof obj !== 'object') return out;
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        var v = obj[k];
        if (!v || typeof v !== 'object') continue;
        if (!v.id) v.id = k;
        out.push(v);
      }
    }
    return out;
  }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function clone(obj) {
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    }
    return out;
  }

  var toastTimer = null;
  function toast(msg, ms) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, ms || 2600);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '복사했어요'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) done(); else toast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function optionsHtml(list, selected, labeler) {
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      html += '<option value="' + escapeHtml(item.id) + '"' + (item.id === selected ? ' selected' : '') + '>'
        + escapeHtml(labeler ? labeler(item) : item.label) + '</option>';
    }
    return html;
  }

  /* ─────────────── 상태 ─────────────── */

  var state = {
    memberId: null,
    tab: 'map',
    room: 'meeting',
    mode: 'local',
    connected: false,
    everConnected: false,
    fbError: null,
    chat: [],
    todos: [],
    memos: [],
    pins: {},
    profiles: {},
    editingMemoId: null
  };

  var current = null;
  var channels = { chat: [], todos: [], memos: [], pins: [], profiles: [] };

  function emit(name, payload) {
    var list = channels[name];
    for (var i = 0; i < list.length; i++) {
      try { list[i](payload); } catch (e) { console.error(e); }
    }
  }

  function profileOf(id) {
    var p = state.profiles ? state.profiles[id] : null;
    var d = DEFAULT_PROFILE[id] || { room: 'meeting', status: 'waiting' };
    return {
      room: (p && p.room) ? p.room : d.room,
      status: (p && p.status) ? p.status : d.status
    };
  }

  /* ─────────────── 로컬 데이터 ─────────────── */

  /* 예전 비서 이름 → 새 이름 (피클1~피클5). 이미 저장된 문구를 옮길 때만 쓴다. */
  var LEGACY_NAME_PAIRS = [
    ['투피클', '피클2'],
    ['햄서브플립', '피클4'],
    ['햄퀀텀', '피클5'],
    ['햄(탱폰)', '피클3'],
    ['햄탱폰', '피클3']
  ];

  function upgradeNames(text) {
    if (!text || typeof text !== 'string') return text;
    var out = text;
    for (var i = 0; i < LEGACY_NAME_PAIRS.length; i++) {
      out = out.split(LEGACY_NAME_PAIRS[i][0]).join(LEGACY_NAME_PAIRS[i][1]);
    }
    /* '피클' 은 '피클1'~'피클5' 의 앞부분이라 뒤에 숫자가 없을 때만 바꿔서 두 번 적용해도 안전하다 */
    return out.replace(/@피클(?![0-9])/g, '@피클1');
  }

  function upgradeDataNames(d) {
    var k;
    for (k in d.chat) {
      if (Object.prototype.hasOwnProperty.call(d.chat, k) && d.chat[k] && typeof d.chat[k].text === 'string') {
        d.chat[k].text = upgradeNames(d.chat[k].text);
      }
    }
    for (k in d.memos) {
      if (Object.prototype.hasOwnProperty.call(d.memos, k) && d.memos[k] && typeof d.memos[k].body === 'string') {
        d.memos[k].body = upgradeNames(d.memos[k].body);
      }
    }
    return d;
  }

  function defaultData() {
    var now = Date.now();
    var d = { chat: {}, todos: {}, memos: {}, pins: { meeting: 'seed-c1' }, profiles: {} };
    var i;

    for (i = 0; i < MEMBERS.length; i++) {
      var mid = MEMBERS[i].id;
      d.profiles[mid] = {
        room: DEFAULT_PROFILE[mid].room,
        status: DEFAULT_PROFILE[mid].status,
        updated: now - 1000 * 60 * 30
      };
    }

    d.chat['seed-c1'] = {
      id: 'seed-c1', room: 'meeting', sender: 'haem1', ts: now - 1000 * 60 * 75,
      text: '합동 비서실 문 열었습니다 🎉\n대회의실·지휘실·라운지 세 방에서 이야기해요. 아래 @이름 을 누르면 멘션도 됩니다.'
    };
    d.chat['seed-c2'] = {
      id: 'seed-c2', room: 'meeting', sender: 'leelaehui1', ts: now - 1000 * 60 * 58,
      text: '@피클1 확인했어요! 작업실에 맡은 일부터 하나씩 올려 둘게요.'
    };
    d.chat['seed-c3'] = {
      id: 'seed-c3', room: 'command', sender: 'captain', ts: now - 1000 * 60 * 44,
      text: '오늘 우선순위는 체험단 마감 확인, 네오빌 서류 정리 두 가지예요. 지휘실에서 보고해 주세요.'
    };
    d.chat['seed-c4'] = {
      id: 'seed-c4', room: 'command', sender: 'haem31', ts: now - 1000 * 60 * 39,
      text: '네, 두 건 모두 작업실에 올렸습니다 👌'
    };
    d.chat['seed-c5'] = {
      id: 'seed-c5', room: 'lounge', sender: 'haemseobeu6', ts: now - 1000 * 60 * 20,
      text: '라운지 커피 내렸어요 ☕ 잠깐 쉬다 가세요.'
    };

    d.todos['seed-t1'] = { id: 'seed-t1', title: 'Firebase 연결해서 다섯 명 실시간 공유 켜기', category: '일반', assignee: ASSIGN_ALL, status: 'waiting', by: 'haem1', ts: now - 1000 * 60 * 70 };
    d.todos['seed-t2'] = { id: 'seed-t2', title: '이번 주 체험단 신청 마감일 확인하기', category: '체험단', assignee: 'leelaehui1', status: 'doing', by: 'captain', ts: now - 1000 * 60 * 43 };
    d.todos['seed-t3'] = { id: 'seed-t3', title: '네오빌 잔금 서류 한곳에 모으기', category: '네오빌', assignee: 'haem1', status: 'doing', by: 'captain', ts: now - 1000 * 60 * 41 };
    d.todos['seed-t4'] = { id: 'seed-t4', title: '비서실 입장 비밀번호 바꾸기', category: '일반', assignee: 'haem1', status: 'done', by: 'haem1', ts: now - 1000 * 60 * 60 * 26 };
    d.todos['seed-t5'] = { id: 'seed-t5', title: '폰테크 견적 두 곳 비교해 두기', category: '폰테크', assignee: 'haem31', status: 'waiting', by: 'captain', ts: now - 1000 * 60 * 38 };

    d.memos['seed-m1'] = {
      id: 'seed-m1', title: '합동 비서실 사용법', pinned: true, by: 'captain',
      ts: now - 1000 * 60 * 72, updated: now - 1000 * 60 * 72,
      body: '· 오피스 맵에서 방을 누르면 그 방의 회의실로 들어갑니다.\n· 회의실 아래 @이름 을 누르면 멘션이 입력돼요.\n· 작업실은 대기 → 진행 중 → 완료 세 칸으로 움직입니다.\n· 비서현황에서 각 비서의 방과 상태를 바꿀 수 있어요.\n· ⚙️ 설정에서 Firebase를 연결하면 다섯 명이 실시간으로 같은 화면을 봅니다.'
    };
    d.memos['seed-m2'] = {
      id: 'seed-m2', title: 'Firebase 콘솔 바로가기', pinned: false, by: 'haem1',
      ts: now - 1000 * 60 * 66, updated: now - 1000 * 60 * 66,
      body: '프로젝트 만들고 Realtime Database 켜는 곳:\nhttps://console.firebase.google.com\n\n⚙️ 설정 → Firebase 5단계 가이드에 순서대로 적어 뒀어요.'
    };
    d.memos['seed-m3'] = {
      id: 'seed-m3', title: '공지 고정하는 법', pinned: false, by: 'haem31',
      ts: now - 1000 * 60 * 24, updated: now - 1000 * 60 * 24,
      body: '회의실 메시지에 마우스를 올리면 나오는 📌 고정을 누르면 그 방 위쪽 공지로 올라갑니다. 방마다 공지를 하나씩 둘 수 있어요.'
    };

    return d;
  }

  function readLocalData() {
    var raw = null;
    try { raw = localStorage.getItem(LS.data); } catch (e) { raw = null; }
    /* 예전 키(hh.local.v2)에 저장돼 있던 체험 데이터는 그대로 옮겨 온다 */
    if (!raw) {
      try { raw = localStorage.getItem(LS.dataPrev); } catch (e1) { raw = null; }
    }
    var d = null;
    if (raw) {
      try { d = JSON.parse(raw); } catch (e2) { d = null; }
    }
    if (!d || typeof d !== 'object') return defaultData();
    if (!d.chat || typeof d.chat !== 'object') d.chat = {};
    if (!d.todos || typeof d.todos !== 'object') d.todos = {};
    if (!d.memos || typeof d.memos !== 'object') d.memos = {};
    if (!d.pins || typeof d.pins !== 'object') d.pins = {};
    if (!d.profiles || typeof d.profiles !== 'object') d.profiles = {};

    for (var k in d.todos) {
      if (Object.prototype.hasOwnProperty.call(d.todos, k)) {
        var t = d.todos[k];
        if (t && !t.status) t.status = t.done ? 'done' : 'waiting';
      }
    }

    upgradeDataNames(d);
    return d;
  }

  /* ─────────────── 어댑터: 로컬 ─────────────── */

  function LocalAdapter() {
    this.data = null;
    this.onStorage = null;
  }

  LocalAdapter.prototype.start = function () {
    var self = this;
    this.data = readLocalData();
    var exists = null;
    try { exists = localStorage.getItem(LS.data); } catch (e) { exists = null; }
    if (!exists) this.save();
    this.onStorage = function (e) {
      if (e.key === LS.data) {
        self.data = readLocalData();
        self.pushAll();
      }
    };
    window.addEventListener('storage', this.onStorage);
    this.pushAll();
  };

  LocalAdapter.prototype.stop = function () {
    if (this.onStorage) window.removeEventListener('storage', this.onStorage);
    this.onStorage = null;
  };

  LocalAdapter.prototype.save = function () {
    try {
      localStorage.setItem(LS.data, JSON.stringify(this.data));
    } catch (e) {
      toast('브라우저 저장 공간이 부족해 저장하지 못했어요');
    }
  };

  LocalAdapter.prototype.pushAll = function () {
    emit('chat', values(this.data.chat));
    emit('todos', values(this.data.todos));
    emit('memos', values(this.data.memos));
    emit('pins', this.data.pins || {});
    emit('profiles', this.data.profiles || {});
  };

  LocalAdapter.prototype.commit = function () {
    this.save();
    this.pushAll();
  };

  LocalAdapter.prototype.addChat = function (msg) {
    this.data.chat[msg.id] = msg;
    this.commit();
  };

  LocalAdapter.prototype.deleteChat = function (id) {
    var room = null;
    if (this.data.chat[id]) room = this.data.chat[id].room;
    delete this.data.chat[id];
    if (room && this.data.pins[room] === id) this.data.pins[room] = null;
    this.commit();
  };

  LocalAdapter.prototype.setPin = function (room, id) {
    this.data.pins[room] = id || null;
    this.commit();
  };

  LocalAdapter.prototype.saveTodo = function (todo) {
    this.data.todos[todo.id] = todo;
    this.commit();
  };

  LocalAdapter.prototype.deleteTodo = function (id) {
    delete this.data.todos[id];
    this.commit();
  };

  LocalAdapter.prototype.saveMemo = function (memo) {
    this.data.memos[memo.id] = memo;
    this.commit();
  };

  LocalAdapter.prototype.deleteMemo = function (id) {
    delete this.data.memos[id];
    this.commit();
  };

  LocalAdapter.prototype.saveProfile = function (memberId, profile) {
    this.data.profiles[memberId] = profile;
    this.commit();
  };

  /* ─────────────── 어댑터: Firebase ─────────────── */

  var sdkPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Firebase SDK를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(s);
    });
  }

  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = loadScript(SDK_BASE + 'firebase-app-compat.js')
      .then(function () { return loadScript(SDK_BASE + 'firebase-database-compat.js'); })
      .catch(function (err) { sdkPromise = null; throw err; });
    return sdkPromise;
  }

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error(message));
      }, ms);
      promise.then(function (v) {
        clearTimeout(timer);
        resolve(v);
      }, function (err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function FbAdapter(cfg) {
    this.cfg = cfg;
    this.app = null;
    this.db = null;
    this.root = null;
    this.refs = [];
    this.connRef = null;
  }

  FbAdapter.prototype.start = function () {
    var self = this;
    return loadSdk().then(function () {
      var apps = firebase.apps || [];
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].name === 'hhapp') {
          try { apps[i].delete(); } catch (e) { /* 무시 */ }
        }
      }
      self.app = firebase.initializeApp(self.cfg, 'hhapp');
      self.db = firebase.database(self.app);
      self.root = self.db.ref(ROOT_PATH);
      self.watch('chat', 'chat');
      self.watch('todos', 'todos');
      self.watch('memos', 'memos');
      self.watch('pins', 'meta/pins');
      self.watch('profiles', 'profiles');

      self.connWait = new Promise(function (res) { self._connResolve = res; });
      self.connRef = self.db.ref('.info/connected');
      self.connRef.on('value', function (snap) {
        state.connected = snap.val() === true;
        if (state.connected) {
          state.everConnected = true;
          state.fbError = null;
          if (self._connResolve) { self._connResolve(); self._connResolve = null; }
        }
        renderLiveBadge();
        renderSettingsStatus();
      });

      /* 연결 신호와 실제 읽기가 모두 되어야 성공으로 본다 */
      return withTimeout(Promise.all([self.connWait, self.root.once('value')]), 9000,
        'Firebase에 연결하지 못했어요. databaseURL과 인터넷 연결을 확인해 주세요.');
    });
  };

  FbAdapter.prototype.stop = function () {
    for (var i = 0; i < this.refs.length; i++) {
      try { this.refs[i].ref.off('value', this.refs[i].cb); } catch (e) { /* 무시 */ }
    }
    this.refs = [];
    if (this.connRef) {
      try { this.connRef.off(); } catch (e2) { /* 무시 */ }
      this.connRef = null;
    }
    if (this.app) {
      try { this.app.delete(); } catch (e3) { /* 무시 */ }
      this.app = null;
    }
    this.db = null;
    this.root = null;
  };

  FbAdapter.prototype.watch = function (name, path) {
    var r = this.root.child(path);
    var cb = function (snap) {
      var val = snap.val();
      if (name === 'pins' || name === 'profiles') {
        emit(name, (val && typeof val === 'object') ? val : {});
      } else {
        emit(name, values(val || {}));
      }
    };
    var errCb = function (err) {
      state.fbError = (err && err.message) ? err.message : String(err);
      renderLiveBadge();
      renderSettingsStatus();
      console.error('[firebase]', err);
    };
    r.on('value', cb, errCb);
    this.refs.push({ ref: r, cb: cb });
    return r;
  };

  FbAdapter.prototype.write = function (ref, value, label) {
    var p = (value === null) ? ref.remove() : ref.set(value);
    if (p && p.catch) {
      p.catch(function (err) {
        state.fbError = (err && err.message) ? err.message : String(err);
        renderLiveBadge();
        renderSettingsStatus();
        toast((label || '저장') + '에 실패했어요. Firebase 규칙을 확인해 주세요.');
      });
    }
  };

  FbAdapter.prototype.addChat = function (msg) {
    this.write(this.root.child('chat/' + msg.id), msg, '메시지 전송');
  };

  FbAdapter.prototype.deleteChat = function (id) {
    this.write(this.root.child('chat/' + id), null, '메시지 삭제');
    var pins = state.pins || {};
    for (var room in pins) {
      if (Object.prototype.hasOwnProperty.call(pins, room) && pins[room] === id) {
        this.setPin(room, null);
      }
    }
  };

  FbAdapter.prototype.setPin = function (room, id) {
    this.write(this.root.child('meta/pins/' + room), id || null, '공지 고정');
  };

  FbAdapter.prototype.saveTodo = function (todo) {
    this.write(this.root.child('todos/' + todo.id), todo, '작업 저장');
  };

  FbAdapter.prototype.deleteTodo = function (id) {
    this.write(this.root.child('todos/' + id), null, '작업 삭제');
  };

  FbAdapter.prototype.saveMemo = function (memo) {
    this.write(this.root.child('memos/' + memo.id), memo, '메모 저장');
  };

  FbAdapter.prototype.deleteMemo = function (id) {
    this.write(this.root.child('memos/' + id), null, '메모 삭제');
  };

  FbAdapter.prototype.saveProfile = function (memberId, profile) {
    this.write(this.root.child('profiles/' + memberId), profile, '비서 상태 저장');
  };

  /* ─────────────── 모드 전환 ─────────────── */

  function detach() {
    if (current && current.stop) {
      try { current.stop(); } catch (e) { /* 무시 */ }
    }
    current = null;
  }

  function startLocal() {
    detach();
    state.mode = 'local';
    state.connected = false;
    state.everConnected = false;
    var a = new LocalAdapter();
    current = a;
    a.start();
    renderLiveBadge();
    renderSettingsStatus();
  }

  function startFirebase(cfg) {
    detach();
    state.mode = 'firebase';
    state.connected = false;
    state.everConnected = false;
    state.fbError = null;
    renderLiveBadge();
    renderSettingsStatus();
    var a = new FbAdapter(publicCfg(cfg));
    current = a;
    return a.start().catch(function (err) {
      var friendly = friendlyFbError(err);
      detach();
      state.fbError = friendly.message;
      startLocal();
      throw friendly;
    });
  }

  function friendlyFbError(err) {
    var msg = (err && err.message) ? err.message : String(err);
    if (/permission_denied|Permission denied/i.test(msg)) {
      return new Error('Firebase 규칙이 읽기·쓰기를 막고 있어요. Realtime Database 규칙을 확인해 주세요.');
    }
    if (/Can't determine Firebase Database URL|not configured|no database/i.test(msg)) {
      return new Error('databaseURL이 맞지 않아요. Realtime Database 주소를 확인해 주세요.');
    }
    return new Error(msg);
  }

  /* ─────────────── 렌더: 상단 ─────────────── */

  function renderLiveBadge() {
    var badge = $('liveBadge');
    badge.classList.remove('live', 'local', 'connecting', 'error');
    if (state.mode === 'local') {
      badge.classList.add('local');
      badge.textContent = '● 로컬 체험 모드';
      badge.title = '눌러서 Firebase를 연결하면 다섯 명이 실시간으로 함께 써요';
      $('brandSub').textContent = '햄 님 전용 · 비서 5명 · 이 기기에만 저장';
    } else if (state.fbError) {
      badge.classList.add('error');
      badge.textContent = '● 연결 오류';
      badge.title = state.fbError;
      $('brandSub').textContent = '햄 님 전용 · 설정을 확인해 주세요';
    } else if (state.connected) {
      badge.classList.add('live');
      badge.textContent = '● 실시간 연결';
      badge.title = 'Firebase Realtime Database';
      $('brandSub').textContent = '햄 님 전용 · 비서 5명 실시간 공유';
    } else if (state.everConnected) {
      badge.classList.add('connecting');
      badge.textContent = '● 다시 연결 중';
      badge.title = '연결이 끊겨 다시 연결하고 있어요';
      $('brandSub').textContent = '햄 님 전용 · 비서 5명';
    } else {
      badge.classList.add('connecting');
      badge.textContent = '● 연결 중';
      badge.title = 'Firebase에 연결하고 있어요';
      $('brandSub').textContent = '햄 님 전용 · 비서 5명';
    }
    renderConnBanner();
  }

  function renderConnBanner() {
    var box = $('connBanner');
    if (!box) return;
    if (state.fbError) {
      box.hidden = false;
      $('connBannerText').textContent = (state.mode === 'firebase')
        ? 'Firebase 연결에 문제가 있어요. 저장된 내용은 그대로지만 지금은 보이지 않을 수 있어요.'
        : 'Firebase 연결에 실패해 이 기기 저장 내용을 보여 주고 있어요.';
    } else {
      box.hidden = true;
    }
  }

  function renderIdentity() {
    var it = identityById(state.memberId);
    var av = $('memberAvatar');
    var label = $('memberLabel');
    var hint = $('identityHint');
    if (it) {
      av.textContent = it.kind === 'captain' ? '👑' : it.char;
      av.style.setProperty('--c', it.color);
      var nm = it.kind === 'captain' ? '대장님' : it.name;
      label.textContent = it.kind === 'captain' ? '대장님(햄)' : it.name;
      hint.textContent = nm + roJosa(nm) + ' 말해요';
    } else {
      av.textContent = '?';
      av.style.setProperty('--c', '#918873');
      label.textContent = '이름 선택';
      hint.textContent = '눌러서 내 이름을 골라 주세요';
    }
  }

  /* ─────────────── 렌더: 오피스 맵 ─────────────── */

  function renderMap() {
    var html = '';
    for (var i = 0; i < ROOMS.length; i++) {
      var r = ROOMS[i];
      var seats = '';
      var count = 0;
      for (var j = 0; j < MEMBERS.length; j++) {
        var m = MEMBERS[j];
        var p = profileOf(m.id);
        if (p.room !== r.id) continue;
        count++;
        var st = statusById(p.status);
        seats += '<div class="seat">'
          + avatarHtml(m, true)
          + '<span class="seat-name">' + escapeHtml(m.name) + '</span>'
          + '<span class="seat-status"><i class="dot s-' + st.id + '"></i>' + escapeHtml(st.label) + '</span>'
          + '</div>';
      }
      if (!count) seats = '<span class="seat-empty">아직 아무도 없어요</span>';

      html += '<div class="room-card" role="button" tabindex="0" data-room="' + r.id + '" style="--c:' + r.color + '" aria-label="' + escapeHtml(r.name) + ' 들어가기">'
        + '<div class="room-head">'
        + '<span class="room-emoji">' + r.emoji + '</span>'
        + '<div><p class="room-name">' + escapeHtml(r.name) + '</p>'
        + '<p class="room-hint">' + escapeHtml(r.hint) + '</p></div>'
        + '<span class="room-count">' + count + '명</span>'
        + '</div>'
        + '<div class="room-floor">' + seats + '</div>'
        + '</div>';
    }
    $('officeGrid').innerHTML = html;
    renderMapTasks();
  }

  function renderMapTasks() {
    var el = $('mapTasks');
    if (!el) return;
    var items = state.todos.filter(function (t) { return (t.status || 'waiting') !== 'done'; });
    items.sort(function (a, b) {
      var pa = (a.status === 'doing') ? 0 : 1;
      var pb = (b.status === 'doing') ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (Number(a.ts) || 0) - (Number(b.ts) || 0);
    });
    var top = items.slice(0, 4);
    if (!top.length) {
      el.innerHTML = '<li class="map-empty">지금 맡은 일이 없어요. 작업실에서 지시해 보세요.</li>';
      return;
    }
    var html = '';
    for (var i = 0; i < top.length; i++) {
      var t = top[i];
      var cat = catById(t.category);
      var who = (t.assignee === ASSIGN_ALL) ? '모두' : identityLabel(t.assignee);
      var dot = (t.status === 'doing') ? 's-working' : 's-waiting';
      html += '<li class="map-task"><i class="dot ' + dot + '"></i>'
        + '<span class="tag" style="--c:' + cat.color + '">' + escapeHtml(cat.id) + '</span>'
        + '<span class="mt-title">' + escapeHtml(t.title) + '</span>'
        + '<span class="mt-who">' + escapeHtml(who) + '</span></li>';
    }
    el.innerHTML = html;
  }

  /* ─────────────── 렌더: 회의실 ─────────────── */

  function renderRoomTabs() {
    var html = '';
    for (var i = 0; i < ROOMS.length; i++) {
      var r = ROOMS[i];
      html += '<button class="room-tab' + (r.id === state.room ? ' active' : '') + '" type="button" data-room="' + r.id + '" style="--c:' + r.color + '">'
        + r.emoji + ' ' + escapeHtml(r.name) + '</button>';
    }
    $('roomTabs').innerHTML = html;

    var room = roomById(state.room);
    $('roomTitle').textContent = room.name;
    $('roomEmoji').textContent = room.emoji;

    var names = [];
    for (var j = 0; j < MEMBERS.length; j++) {
      if (profileOf(MEMBERS[j].id).room === room.id) names.push(MEMBERS[j].name);
    }
    $('roomWho').textContent = names.length ? ('비서 ' + names.length + '명 · ' + names.join(', ')) : '지금은 비어 있는 방이에요';
  }

  function renderAnnouncement() {
    var box = $('announcement');
    var textEl = $('announceText');
    var pinnedId = state.pins ? state.pins[state.room] : null;
    var msg = pinnedId ? findById(state.chat, pinnedId) : null;
    if (!msg || msg.room !== state.room) { box.hidden = true; return; }
    box.hidden = false;
    textEl.textContent = identityLabel(msg.sender) + ': ' + upgradeNames(msg.text);
  }

  function renderChat() {
    var list = $('chatList');
    var nearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 130;

    var msgs = state.chat.filter(function (m) { return m.room === state.room; });
    msgs.sort(function (a, b) { return (Number(a.ts) || 0) - (Number(b.ts) || 0); });

    var pinnedId = state.pins ? state.pins[state.room] : null;
    var html = '';

    if (!msgs.length) {
      html = '<div class="empty"><span class="empty-emoji">💬</span>아직 이 방에는 대화가 없어요.<br>첫 말을 건네 보세요.</div>';
    }

    var lastDay = '';
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      var day = fmtDay(m.ts);
      if (day !== lastDay) {
        html += '<div class="day"><span>' + escapeHtml(day) + '</span></div>';
        lastDay = day;
      }
      var it = identityById(m.sender);
      var mine = (m.sender === state.memberId);
      var isPinned = (pinnedId === m.id);
      var badge;
      if (!it) {
        badge = '<span class="badge">❔ 알 수 없음</span>';
      } else if (it.kind === 'captain') {
        badge = '<span class="badge captain">👑 대장님(햄)</span>';
      } else {
        badge = '<span class="badge" style="--c:' + it.color + '">' + escapeHtml(it.name) + '</span>';
      }
      html += '<div class="msg' + (mine ? ' mine' : '') + '" data-id="' + escapeHtml(m.id) + '">'
        + '<div class="msg-head">' + badge + '<span class="msg-time">' + fmtClock(m.ts) + '</span></div>'
        + '<div class="bubble">' + richText(m.text) + '</div>'
        + '<div class="msg-tools">'
        + '<button type="button" data-act="pin" class="' + (isPinned ? 'on' : '') + '">' + (isPinned ? '📌 고정됨' : '📌 고정') + '</button>'
        + '<button type="button" data-act="del">삭제</button>'
        + '</div></div>';
    }

    list.innerHTML = html;
    if (nearBottom) list.scrollTop = list.scrollHeight;
    renderAnnouncement();
  }

  function renderChatTools() {
    var senders = [CAPTAIN].concat(MEMBERS);
    var html = '<span class="tool-label">보내는 사람</span>';
    for (var i = 0; i < senders.length; i++) {
      var s = senders[i];
      var on = (s.id === state.memberId);
      var text = (s.kind === 'captain') ? '👑 대장님(햄)' : (s.emoji + ' ' + s.name);
      html += '<button class="tool-chip' + (on ? ' on' : '') + '" type="button" data-kind="sender" data-value="' + s.id + '">'
        + escapeHtml(text) + '</button>';
    }
    html += '<span class="tool-sep"></span><span class="tool-label">멘션</span>';
    for (var j = 0; j < MEMBERS.length; j++) {
      html += '<button class="tool-chip mention" type="button" data-kind="mention" data-value="' + escapeHtml(MEMBERS[j].name) + '">@' + escapeHtml(MEMBERS[j].name) + '</button>';
    }
    $('chatTools').innerHTML = html;
  }

  /* ─────────────── 렌더: 작업실 ─────────────── */

  function renderTasks() {
    var counts = { waiting: 0, doing: 0, done: 0 };
    for (var i = 0; i < state.todos.length; i++) {
      var st = state.todos[i].status || 'waiting';
      if (counts[st] === undefined) counts[st] = 0;
      counts[st]++;
    }

    var html = '';
    for (var c = 0; c < TASK_STATUSES.length; c++) {
      var col = TASK_STATUSES[c];
      var items = state.todos.filter(function (t) { return (t.status || 'waiting') === col.id; });
      items.sort(function (a, b) { return (Number(b.ts) || 0) - (Number(a.ts) || 0); });

      var cards = '';
      for (var j = 0; j < items.length; j++) {
        var t = items[j];
        var cat = catById(t.category);
        var who = (t.assignee === ASSIGN_ALL) ? '모두' : identityLabel(t.assignee);
        cards += '<article class="task' + (col.id === 'done' ? ' done' : '') + '" data-id="' + escapeHtml(t.id) + '">'
          + '<div class="task-top"><span class="tag" style="--c:' + cat.color + '">' + escapeHtml(cat.id) + '</span>'
          + '<button class="x" type="button" data-act="delete" aria-label="삭제">✕</button></div>'
          + '<p class="task-title">' + escapeHtml(t.title) + '</p>'
          + '<div class="task-meta"><span>👤 ' + escapeHtml(who) + '</span><span>' + escapeHtml(fmtStamp(t.ts)) + '</span></div>'
          + '<div class="task-foot">'
          + '<select class="status-select" data-act="status" aria-label="상태">'
          + optionsHtml(TASK_STATUSES, col.id, function (x) { return x.label; })
          + '</select>'
          + '</div></article>';
      }
      if (!cards) cards = '<p class="board-empty">비어 있어요</p>';

      html += '<section class="board-col" data-col="' + col.id + '">'
        + '<div class="board-col-head">' + escapeHtml(col.label) + '<b>' + counts[col.id] + '</b></div>'
        + '<div class="board-cards">' + cards + '</div>'
        + '</section>';
    }
    $('board').innerHTML = html;

    var openCount = counts.waiting + counts.doing;
    var tab = document.querySelector('.tab[data-tab="tasks"]');
    if (tab) {
      tab.innerHTML = '📋 작업실' + (openCount > 0 ? ' <span class="tab-count">' + openCount + '</span>' : '');
    }
    renderMapTasks();
  }

  /* ─────────────── 렌더: 비서현황 ─────────────── */

  function renderStaff() {
    var counts = { waiting: 0, working: 0, resting: 0 };
    var html = '';

    for (var i = 0; i < MEMBERS.length; i++) {
      var m = MEMBERS[i];
      var p = profileOf(m.id);
      counts[p.status] = (counts[p.status] || 0) + 1;

      var open = 0;
      for (var j = 0; j < state.todos.length; j++) {
        var t = state.todos[j];
        if (t.assignee === m.id && (t.status || 'waiting') !== 'done') open++;
      }

      var mine = (m.id === state.memberId);
      var room = roomById(p.room);
      html += '<div class="staff-row' + (mine ? ' me' : '') + '" data-member="' + m.id + '" style="--c:' + m.color + '">'
        + avatarHtml(m, false)
        + '<div class="staff-info">'
        + '<div class="staff-name">' + escapeHtml(m.name) + (mine ? '<span class="mine-tag">나</span>' : '') + '</div>'
        + '<div class="staff-sub">' + escapeHtml(m.handle) + ' · ' + room.emoji + ' ' + escapeHtml(room.name) + ' · 맡은 일 ' + open + '개</div>'
        + '</div>'
        + '<div class="staff-controls">'
        + '<select class="status-select" data-act="status" aria-label="상태">'
        + optionsHtml(STATUSES, p.status, function (x) { return x.emoji + ' ' + x.label; })
        + '</select>'
        + '<select class="status-select" data-act="room" aria-label="방">'
        + optionsHtml(ROOMS, p.room, function (x) { return x.emoji + ' ' + x.name; })
        + '</select>'
        + '</div></div>';
    }

    $('staffList').innerHTML = html;
    $('staffSummary').innerHTML =
      '<div class="sum-chip"><b>' + MEMBERS.length + '</b>비서</div>'
      + '<div class="sum-chip"><b>' + (counts.working || 0) + '</b>작업 중</div>'
      + '<div class="sum-chip"><b>' + (counts.waiting || 0) + '</b>대기 중</div>'
      + '<div class="sum-chip"><b>' + (counts.resting || 0) + '</b>휴식 중</div>';
  }

  /* ─────────────── 렌더: 메모 ─────────────── */

  function renderMemos() {
    var memos = state.memos.slice().sort(function (a, b) {
      var pa = a.pinned ? 1 : 0;
      var pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (Number(b.updated || b.ts) || 0) - (Number(a.updated || a.ts) || 0);
    });

    var html = '';
    if (!memos.length) {
      html = '<div class="empty"><span class="empty-emoji">📝</span>메모가 없어요.<br>위에서 첫 메모를 남겨 보세요.</div>';
    }
    for (var i = 0; i < memos.length; i++) {
      var m = memos[i];
      var it = identityById(m.by);
      var badge = it
        ? (it.kind === 'captain'
          ? '<span class="badge captain">👑 대장님(햄)</span>'
          : '<span class="badge" style="--c:' + it.color + '">' + escapeHtml(it.name) + '</span>')
        : '<span class="badge">❔ 알 수 없음</span>';

      html += '<article class="memo-card' + (m.pinned ? ' pinned' : '') + '" data-id="' + escapeHtml(m.id) + '">'
        + '<div class="memo-head">'
        + '<h3 class="memo-title">' + (m.title ? escapeHtml(m.title) : '<span style="color:#bdb29c;font-weight:600">제목 없음</span>') + '</h3>'
        + '<div class="memo-actions">'
        + '<button type="button" data-act="pin" class="' + (m.pinned ? 'on' : '') + '">' + (m.pinned ? '고정됨' : '고정') + '</button>'
        + '<button type="button" data-act="copy">복사</button>'
        + '<button type="button" data-act="edit">수정</button>'
        + '<button type="button" data-act="delete">삭제</button>'
        + '</div></div>'
        + '<div class="memo-body">' + richText(m.body) + '</div>'
        + '<div class="memo-foot">' + badge + '<span>' + escapeHtml(fmtStamp(m.updated || m.ts)) + '</span></div>'
        + '</article>';
    }
    $('memoList').innerHTML = html;
  }

  function renderSettingsStatus() {
    var box = $('settingsStatus');
    if (!box) return;
    var lines = [];
    if (state.mode === 'local') {
      lines.push('<b>로컬 체험 모드</b> — 이 브라우저에만 저장되고, 다른 기기·사람과 공유되지 않아요.');
    } else if (state.connected) {
      lines.push('<b>실시간 연결됨</b> — Firebase Realtime Database에 저장 중이에요.');
    } else {
      lines.push('<b>연결 중…</b> — 잠시만 기다려 주세요.');
    }
    if (state.fbError) lines.push('오류: ' + escapeHtml(state.fbError));
    lines.push('현재 이름: <b>' + escapeHtml(identityLabel(state.memberId)) + '</b>');
    box.innerHTML = lines.join('<br>');
  }

  /* ─────────────── 게이트 / 모달 ─────────────── */

  function getPasscode() {
    var p = null;
    try { p = localStorage.getItem(LS.passcode); } catch (e) { p = null; }
    return p || DEFAULT_PASSCODE;
  }

  function setPasscode(p) {
    try { localStorage.setItem(LS.passcode, p); } catch (e) { /* 무시 */ }
  }

  function isUnlocked() {
    try {
      if (localStorage.getItem(LS.trusted) === '1') return true;
      return sessionStorage.getItem(SS.unlocked) === '1';
    } catch (e) {
      return false;
    }
  }

  function showApp() {
    $('gate').hidden = true;
    $('app').hidden = false;
    if (!state.memberId) setTimeout(openMemberModal, 260);
  }

  function showGate() {
    $('app').hidden = true;
    $('gate').hidden = false;
    $('gateInput').value = '';
    $('gateError').hidden = true;
    setTimeout(function () { $('gateInput').focus(); }, 120);
  }

  function tryUnlock() {
    var input = $('gateInput');
    if (input.value.trim() === getPasscode()) {
      try { sessionStorage.setItem(SS.unlocked, '1'); } catch (e) { /* 무시 */ }
      if ($('rememberDevice').checked) {
        try { localStorage.setItem(LS.trusted, '1'); } catch (e2) { /* 무시 */ }
      }
      $('gateError').hidden = true;
      showApp();
    } else {
      $('gateError').hidden = false;
      input.value = '';
      input.classList.add('shake');
      setTimeout(function () { input.classList.remove('shake'); }, 360);
      input.focus();
    }
  }

  function openModal(id) {
    $(id).hidden = false;
    if (id === 'settingsModal') {
      fillSettings();
      renderSettingsStatus();
    }
  }

  function closeModal(id) {
    $(id).hidden = true;
  }

  function openMemberModal() {
    var all = [CAPTAIN].concat(MEMBERS);
    var html = '';
    for (var i = 0; i < all.length; i++) {
      var s = all[i];
      var isMe = (s.id === state.memberId);
      var display = (s.kind === 'captain') ? '대장님(햄)' : s.name;
      var role = s.handle;
      html += '<button class="member-option' + (isMe ? ' current' : '') + '" type="button" data-member="' + s.id + '" style="--c:' + s.color + '">'
        + avatarHtml(s, false)
        + '<span class="member-info"><span class="member-name">' + escapeHtml(display) + '</span>'
        + '<span class="member-role">' + escapeHtml(role) + '</span></span>'
        + (isMe ? '<span class="member-check">✓</span>' : '')
        + '</button>';
    }
    $('memberList').innerHTML = html;
    openModal('memberModal');
  }

  function setIdentity(id) {
    state.memberId = id;
    try { localStorage.setItem(LS.member, id); } catch (e) { /* 무시 */ }
    renderIdentity();
    renderChatTools();
    renderChat();
    renderStaff();
    renderSettingsStatus();
  }

  function chooseMember(id) {
    setIdentity(id);
    closeModal('memberModal');
    var nm = identityLabel(id);
    toast(nm + roJosa(nm) + ' 입장했어요');
  }

  /* ─────────────── Firebase 설정 ─────────────── */

  function publicCfg(cfg) {
    var keys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    var out = {};
    for (var i = 0; i < keys.length; i++) {
      if (cfg && cfg[keys[i]]) out[keys[i]] = cfg[keys[i]];
    }
    return out;
  }

  function loadCfg() {
    var raw = null;
    try { raw = localStorage.getItem(LS.cfg); } catch (e) { raw = null; }
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      return (o && o.databaseURL) ? o : ((o && o.projectId) ? o : null);
    } catch (e2) {
      return null;
    }
  }

  function saveCfg(cfg) {
    try { localStorage.setItem(LS.cfg, JSON.stringify(publicCfg(cfg))); } catch (e) { /* 무시 */ }
  }

  function clearCfg() {
    try { localStorage.removeItem(LS.cfg); } catch (e) { /* 무시 */ }
  }

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64decode(str) {
    var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }

  function readHashConfig() {
    var h = location.hash || '';
    if (h.indexOf('#cfg=') !== 0) return null;
    try {
      var cfg = JSON.parse(b64decode(h.slice(5)));
      return normalizeConfig(JSON.stringify(cfg));
    } catch (e) {
      return null;
    }
  }

  function normalizeConfig(text) {
    var src = String(text || '').trim();
    if (!src) return null;

    var obj = null;
    try { obj = JSON.parse(src); } catch (e) { obj = null; }

    if (!obj) {
      var start = src.indexOf('{');
      var end = src.lastIndexOf('}');
      if (start >= 0 && end > start) {
        var body = src.slice(start, end + 1);
        try {
          obj = JSON.parse(body);
        } catch (e2) {
          var fixed = body
            .replace(/^\s*\/\/.*$/gm, '')
            .replace(/'/g, '"')
            .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
            .replace(/,\s*([}\]])/g, '$1');
          try { obj = JSON.parse(fixed); } catch (e3) { obj = null; }
        }
      }
    }

    if (!obj) {
      obj = {};
      var lines = src.split(/\n+/);
      for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^\s*["']?([A-Za-z0-9_]+)["']?\s*[:=]\s*["']?([^"',]+?)["']?,?\s*$/);
        if (m) obj[m[1]] = m[2].trim();
      }
      if (!Object.keys(obj).length) return null;
    }

    var keys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    var out = {};
    for (var k = 0; k < keys.length; k++) {
      var v = obj[keys[k]];
      if (v !== undefined && v !== null && String(v).trim() !== '') out[keys[k]] = String(v).trim();
    }

    if (!out.databaseURL && out.projectId) {
      out.databaseURL = 'https://' + out.projectId + '-default-rtdb.firebaseio.com';
      out.estimatedUrl = true;
    }
    if (!out.databaseURL) return null;
    return out;
  }

  function shareLinkFor(cfg) {
    return location.origin + location.pathname + '#cfg=' + b64encode(JSON.stringify(publicCfg(cfg)));
  }

  function fillSettings() {
    var cfg = loadCfg();
    $('cfgInput').value = cfg ? JSON.stringify(publicCfg(cfg), null, 2) : '';
    $('shareLinkInput').value = cfg ? shareLinkFor(cfg) : '';
    $('newPassInput').value = '';
    renderSettingsStatus();
  }

  /* ─────────────── 동작: 회의실 ─────────────── */

  function sendChat() {
    var input = $('chatInput');
    var text = input.value.trim();
    if (!text) return;
    if (!state.memberId) {
      toast('먼저 내 이름을 골라 주세요');
      openMemberModal();
      return;
    }
    if (!current) { toast('아직 준비 중이에요. 잠시 후 다시 시도해 주세요'); return; }

    current.addChat({
      id: uid('m'),
      room: state.room,
      sender: state.memberId,
      text: text,
      ts: Date.now()
    });
    input.value = '';
    autoGrow(input);
    input.focus();
    var list = $('chatList');
    list.scrollTop = list.scrollHeight;
  }

  function insertMention(name) {
    var input = $('chatInput');
    var token = '@' + name + ' ';
    var start = 0;
    var end = 0;
    try {
      start = input.selectionStart || 0;
      end = input.selectionEnd || 0;
    } catch (e) {
      start = input.value.length;
      end = start;
    }
    var val = input.value;
    if (start === 0 && end === 0) start = end = val.length;
    input.value = val.slice(0, start) + token + val.slice(end);
    var pos = start + token.length;
    try { input.setSelectionRange(pos, pos); } catch (e2) { /* 무시 */ }
    input.focus();
    autoGrow(input);
  }

  function chatAction(btn) {
    var wrap = btn.closest('.msg');
    if (!wrap) return;
    var id = wrap.getAttribute('data-id');
    var act = btn.getAttribute('data-act');
    if (act === 'pin') {
      var cur = state.pins ? state.pins[state.room] : null;
      current.setPin(state.room, cur === id ? null : id);
      toast(cur === id ? '공지 고정을 풀었어요' : '이 방의 공지로 고정했어요');
    } else if (act === 'del') {
      if (!window.confirm('이 메시지를 삭제할까요?')) return;
      current.deleteChat(id);
    }
  }

  function openRoom(roomId) {
    state.room = roomId;
    try { localStorage.setItem(LS.room, roomId); } catch (e) { /* 무시 */ }
    switchTab('chat');
    renderRoomTabs();
    renderChat();
  }

  /* ─────────────── 동작: 작업실 ─────────────── */

  function addTodo() {
    var titleEl = $('todoTitle');
    var title = titleEl.value.trim();
    if (!title) { titleEl.focus(); return; }
    if (!state.memberId) { toast('먼저 내 이름을 골라 주세요'); openMemberModal(); return; }

    current.saveTodo({
      id: uid('t'),
      title: title,
      category: $('todoCat').value,
      assignee: $('todoAssignee').value,
      status: 'waiting',
      by: state.memberId,
      ts: Date.now()
    });
    titleEl.value = '';
    titleEl.focus();
    toast('작업실에 올렸어요');
  }

  function setTaskStatus(id, status) {
    var t = findById(state.todos, id);
    if (!t) return;
    var copy = clone(t);
    copy.status = status;
    current.saveTodo(copy);
  }

  function deleteTodo(id) {
    var t = findById(state.todos, id);
    if (!t) return;
    if (!window.confirm('"' + t.title + '" 을(를) 지울까요?')) return;
    current.deleteTodo(id);
  }

  /* ─────────────── 동작: 비서현황 ─────────────── */

  function updateProfile(memberId, patch) {
    var p = profileOf(memberId);
    var next = {
      room: patch.room || p.room,
      status: patch.status || p.status,
      updated: Date.now()
    };
    current.saveProfile(memberId, next);
  }

  /* ─────────────── 동작: 메모 ─────────────── */

  function addMemo() {
    var titleEl = $('memoTitle');
    var bodyEl = $('memoBody');
    var title = titleEl.value.trim();
    var body = bodyEl.value.trim();
    if (!body) { bodyEl.focus(); toast('내용을 적어 주세요'); return; }
    if (!state.memberId) { toast('먼저 내 이름을 골라 주세요'); openMemberModal(); return; }

    var now = Date.now();
    current.saveMemo({
      id: uid('n'),
      title: title,
      body: body,
      pinned: false,
      by: state.memberId,
      ts: now,
      updated: now
    });
    titleEl.value = '';
    bodyEl.value = '';
    toast('메모를 붙였어요');
  }

  function memoAction(btn) {
    var card = btn.closest('.memo-card');
    if (!card) return;
    var id = card.getAttribute('data-id');
    var act = btn.getAttribute('data-act');
    var m = findById(state.memos, id);
    if (!m) return;

    if (act === 'pin') {
      var copy = clone(m);
      copy.pinned = !m.pinned;
      copy.updated = Date.now();
      current.saveMemo(copy);
      toast(copy.pinned ? '메모를 위에 고정했어요' : '고정을 풀었어요');
    } else if (act === 'copy') {
      copyText((m.title ? m.title + '\n' : '') + m.body, '메모를 복사했어요');
    } else if (act === 'edit') {
      state.editingMemoId = id;
      $('editMemoTitle').value = m.title || '';
      $('editMemoBody').value = m.body || '';
      openModal('memoModal');
      setTimeout(function () { $('editMemoBody').focus(); }, 150);
    } else if (act === 'delete') {
      if (!window.confirm('이 메모를 지울까요?')) return;
      current.deleteMemo(id);
    }
  }

  function saveMemoEdit() {
    var id = state.editingMemoId;
    if (!id) return;
    var m = findById(state.memos, id);
    if (!m) { closeModal('memoModal'); return; }
    var body = $('editMemoBody').value.trim();
    if (!body) { toast('내용을 적어 주세요'); return; }
    var copy = clone(m);
    copy.title = $('editMemoTitle').value.trim();
    copy.body = body;
    copy.updated = Date.now();
    current.saveMemo(copy);
    state.editingMemoId = null;
    closeModal('memoModal');
    toast('메모를 고쳤어요');
  }

  /* ─────────────── 탭 ─────────────── */

  var PANELS = { map: 'panel-map', chat: 'panel-chat', tasks: 'panel-tasks', staff: 'panel-staff', memos: 'panel-memos' };
  var TAB_LABELS = { map: '🗺️ 오피스 맵', chat: '💬 회의실', tasks: '📋 작업실', staff: '📊 비서현황', memos: '📝 메모' };

  function switchTab(name) {
    if (!PANELS[name]) name = 'map';
    state.tab = name;

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var id = tabs[i].getAttribute('data-tab');
      var on = (id === name);
      tabs[i].classList.toggle('active', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (!tabs[i].querySelector('.tab-count')) tabs[i].textContent = TAB_LABELS[id] || id;
    }
    for (var key in PANELS) {
      if (Object.prototype.hasOwnProperty.call(PANELS, key)) {
        $(PANELS[key]).hidden = (key !== name);
      }
    }
    if (name === 'chat') {
      var list = $('chatList');
      list.scrollTop = list.scrollHeight;
    }
    try { localStorage.setItem(LS.tab, name); } catch (e) { /* 무시 */ }
  }

  /* ─────────────── 이벤트 ─────────────── */

  function bindEvents() {
    $('gateForm').addEventListener('submit', function (e) {
      e.preventDefault();
      tryUnlock();
    });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
      })(tabs[i]);
    }

    $('memberBtn').addEventListener('click', openMemberModal);
    $('goTasksBtn').addEventListener('click', function () { switchTab('tasks'); });
    $('connFixBtn').addEventListener('click', function () { openModal('settingsModal'); });
    $('settingsBtn').addEventListener('click', function () { openModal('settingsModal'); });
    $('liveBadge').addEventListener('click', function () {
      if (state.mode === 'local' || state.fbError) openModal('settingsModal');
    });
    $('lockBtn').addEventListener('click', function () {
      try {
        sessionStorage.removeItem(SS.unlocked);
        localStorage.removeItem(LS.trusted);
      } catch (e) { /* 무시 */ }
      showGate();
    });

    /* 오피스 맵 → 방 들어가기 */
    $('officeGrid').addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.room-card') : null;
      if (card) openRoom(card.getAttribute('data-room'));
    });
    $('officeGrid').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest ? e.target.closest('.room-card') : null;
      if (!card) return;
      e.preventDefault();
      openRoom(card.getAttribute('data-room'));
    });

    /* 회의실 */
    $('roomTabs').addEventListener('click', function (e) {
      var tab = e.target.closest ? e.target.closest('.room-tab') : null;
      if (!tab) return;
      openRoom(tab.getAttribute('data-room'));
    });
    $('chatTools').addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.tool-chip') : null;
      if (!chip) return;
      var kind = chip.getAttribute('data-kind');
      var val = chip.getAttribute('data-value');
      if (kind === 'sender') {
        setIdentity(val);
      } else if (kind === 'mention') {
        insertMention(val);
      }
    });
    $('chatForm').addEventListener('submit', function (e) {
      e.preventDefault();
      sendChat();
    });
    $('chatInput').addEventListener('input', function (e) { autoGrow(e.target); });
    $('chatInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendChat();
      }
    });
    $('chatList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (btn) chatAction(btn);
    });
    $('unpinBtn').addEventListener('click', function () {
      if (current) current.setPin(state.room, null);
    });

    /* 작업실 */
    $('todoForm').addEventListener('submit', function (e) {
      e.preventDefault();
      addTodo();
    });
    $('board').addEventListener('change', function (e) {
      var sel = e.target.closest ? e.target.closest('select[data-act="status"]') : null;
      if (!sel) return;
      var card = sel.closest('.task');
      if (!card) return;
      setTaskStatus(card.getAttribute('data-id'), sel.value);
    });
    $('board').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act="delete"]') : null;
      if (!btn) return;
      var card = btn.closest('.task');
      if (card) deleteTodo(card.getAttribute('data-id'));
    });

    /* 비서현황 */
    $('staffList').addEventListener('change', function (e) {
      var sel = e.target.closest ? e.target.closest('select[data-act]') : null;
      if (!sel) return;
      var row = sel.closest('.staff-row');
      if (!row) return;
      var memberId = row.getAttribute('data-member');
      var act = sel.getAttribute('data-act');
      if (act === 'status') updateProfile(memberId, { status: sel.value });
      else if (act === 'room') updateProfile(memberId, { room: sel.value });
      toast(identityLabel(memberId) + ' 상태를 바꿨어요');
    });

    /* 메모 */
    $('memoForm').addEventListener('submit', function (e) {
      e.preventDefault();
      addMemo();
    });
    $('memoList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (btn) memoAction(btn);
    });
    $('memoSaveBtn').addEventListener('click', saveMemoEdit);

    /* 이름 선택 */
    $('memberList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.member-option') : null;
      if (btn) chooseMember(btn.getAttribute('data-member'));
    });

    /* 설정 */
    $('cfgSaveBtn').addEventListener('click', function () {
      var cfg = normalizeConfig($('cfgInput').value);
      if (!cfg) {
        toast('설정을 읽지 못했어요. firebaseConfig 전체를 붙여넣어 주세요');
        return;
      }
      if (cfg.estimatedUrl) toast('databaseURL이 없어 프로젝트 ID로 주소를 추정했어요', 3600);
      saveCfg(cfg);
      var btn = $('cfgSaveBtn');
      btn.disabled = true;
      btn.textContent = '연결 중…';
      startFirebase(cfg).then(function () {
        btn.disabled = false;
        btn.textContent = '저장하고 연결';
        $('shareLinkInput').value = shareLinkFor(cfg);
        toast('Firebase에 연결했어요. 초대 링크를 복사해 다섯 명에게 보내세요', 3600);
        renderSettingsStatus();
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = '저장하고 연결';
        toast('연결하지 못했어요: ' + ((err && err.message) ? err.message : err), 4200);
        renderSettingsStatus();
      });
    });

    $('cfgTestBtn').addEventListener('click', function () {
      var cfg = normalizeConfig($('cfgInput').value) || loadCfg();
      if (!cfg) { toast('먼저 Firebase 설정을 붙여넣어 주세요'); return; }
      var btn = $('cfgTestBtn');
      btn.disabled = true;
      btn.textContent = '확인 중…';
      startFirebase(cfg).then(function () {
        btn.disabled = false;
        btn.textContent = '연결 테스트';
        toast('연결에 성공했어요');
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = '연결 테스트';
        toast('연결 실패: ' + ((err && err.message) ? err.message : err), 4200);
      });
    });

    $('cfgClearBtn').addEventListener('click', function () {
      if (!window.confirm('Firebase 연결을 해제하고 로컬 체험 모드로 돌아갈까요?\n(Firebase에 저장된 내용은 지워지지 않아요)')) return;
      clearCfg();
      state.fbError = null;
      startLocal();
      $('cfgInput').value = '';
      $('shareLinkInput').value = '';
      toast('로컬 체험 모드로 전환했어요');
    });

    $('copyLinkBtn').addEventListener('click', function () {
      var cfg = normalizeConfig($('cfgInput').value) || loadCfg();
      if (!cfg) { toast('먼저 Firebase를 연결해 주세요'); return; }
      var link = shareLinkFor(cfg);
      $('shareLinkInput').value = link;
      copyText(link, '초대 링크를 복사했어요');
    });

    $('passSaveBtn').addEventListener('click', function () {
      var v = $('newPassInput').value.trim();
      if (v.length < 4) { toast('4자 이상으로 정해 주세요'); return; }
      setPasscode(v);
      $('newPassInput').value = '';
      toast('이 기기의 비밀번호를 바꿨어요');
    });

    $('memberChangeBtn').addEventListener('click', function () {
      closeModal('settingsModal');
      openMemberModal();
    });

    $('lockNowBtn').addEventListener('click', function () {
      closeModal('settingsModal');
      try {
        sessionStorage.removeItem(SS.unlocked);
        localStorage.removeItem(LS.trusted);
      } catch (e) { /* 무시 */ }
      showGate();
    });

    $('resetLocalBtn').addEventListener('click', function () {
      if (!window.confirm('이 브라우저에 저장된 체험용 대화·작업·메모를 모두 지울까요?')) return;
      try { localStorage.removeItem(LS.data); } catch (e) { /* 무시 */ }
      try { localStorage.removeItem(LS.dataPrev); } catch (e2) { /* 무시 */ }
      if (state.mode === 'local') {
        startLocal();
        toast('로컬 데이터를 초기화했어요');
      } else {
        toast('로컬 데이터를 초기화했어요 (Firebase 내용은 그대로)');
      }
    });

    document.addEventListener('click', function (e) {
      var closer = e.target.closest ? e.target.closest('[data-close]') : null;
      if (closer) closeModal(closer.getAttribute('data-close'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var mods = document.querySelectorAll('.modal-root');
        for (var i = 0; i < mods.length; i++) mods[i].hidden = true;
      }
    });
  }

  /* ─────────────── 초기화 ─────────────── */

  function fillSelects() {
    var catSel = $('todoCat');
    var html = '';
    for (var i = 0; i < CATEGORIES.length; i++) {
      html += '<option value="' + escapeHtml(CATEGORIES[i].id) + '">' + escapeHtml(CATEGORIES[i].id) + '</option>';
    }
    catSel.innerHTML = html;
    catSel.value = '일반';

    var asSel = $('todoAssignee');
    html = '<option value="' + ASSIGN_ALL + '">모두</option>';
    for (var j = 0; j < MEMBERS.length; j++) {
      html += '<option value="' + MEMBERS[j].id + '">' + escapeHtml(MEMBERS[j].name) + '</option>';
    }
    asSel.innerHTML = html;
  }

  function registerChannels() {
    channels.chat.push(function (arr) { state.chat = arr || []; renderChat(); });
    channels.todos.push(function (arr) { state.todos = arr || []; renderTasks(); renderStaff(); });
    channels.memos.push(function (arr) { state.memos = arr || []; renderMemos(); });
    channels.pins.push(function (pins) { state.pins = pins || {}; renderAnnouncement(); renderChat(); });
    channels.profiles.push(function (profiles) {
      state.profiles = profiles || {};
      renderMap();
      renderRoomTabs();
      renderStaff();
    });
  }

  function boot() {
    fillSelects();
    bindEvents();
    registerChannels();

    var savedMember = null;
    try { savedMember = localStorage.getItem(LS.member); } catch (e) { savedMember = null; }
    if (savedMember && identityById(savedMember)) state.memberId = savedMember;
    renderIdentity();
    renderChatTools();

    var savedRoom = null;
    try { savedRoom = localStorage.getItem(LS.room); } catch (e2) { savedRoom = null; }
    if (savedRoom) state.room = roomById(savedRoom).id;
    renderRoomTabs();

    var savedTab = null;
    try { savedTab = localStorage.getItem(LS.tab); } catch (e3) { savedTab = null; }
    switchTab(PANELS[savedTab] ? savedTab : 'map');

    var hashCfg = readHashConfig();
    if (hashCfg) {
      saveCfg(hashCfg);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e4) { /* 무시 */ }
      toast('초대 링크의 Firebase 설정을 불러왔어요');
    }

    var cfg = loadCfg();
    if (cfg) {
      startFirebase(cfg).catch(function () {
        toast('Firebase에 연결하지 못해 로컬 체험 모드로 시작합니다', 4000);
      });
    } else {
      startLocal();
    }

    renderLiveBadge();
    renderSettingsStatus();
    renderMap();
    renderStaff();

    if (isUnlocked()) showApp(); else showGate();

    if (hashCfg && isUnlocked()) setTimeout(function () { openModal('settingsModal'); }, 420);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
