/* 햄 님 합동 비서실 — shared office app
 * 로컬 체험 모드(localStorage) / Firebase Realtime Database 모드
 * GitHub Pages에서 빌드 도구 없이 바로 동작합니다.
 */
(function () {
  'use strict';

  /* ─────────────── 상수 ─────────────── */

  var CAPTAIN = {
    id: 'captain', name: '대장님', label: '대장님(햄)', handle: '@haem1',
    emoji: '👑', char: '👑', color: '#b4831f', kind: 'captain'
  };

  /* 대장님(햄) 본인의 피클 = 피클1. 이름 옆에 '내 피클' 표지를 붙인다. */
  var OWN_PICKLE_ID = 'haem1';

  var MEMBERS = [
    { id: 'haem1', name: '피클1', handle: '@haem1', emoji: '🐹', char: '1', color: '#0369a1' },
    { id: 'leelaehui1', name: '피클2', handle: '@leelaehui1', emoji: '🐰', char: '2', color: '#0f766e' },
    { id: 'haemtaengpon1', name: '피클3', handle: '@haemtaengpon1', emoji: '🍊', char: '3', color: '#b45309' },
    { id: 'haemseobeu6', name: '피클4', handle: '@haemseobeu6', emoji: '💜', char: '4', color: '#7e22ce' },
    { id: 'haem31', name: '피클5', handle: '@haem31', emoji: '⚡', char: '5', color: '#4f46e5' }
  ];

  var ROOMS = [
    { id: 'meeting', name: '대회의실', emoji: '🪑', hint: '다 같이 모여 이야기하는 방', color: '#0369a1' },
    { id: 'command', name: '지휘실', emoji: '🎯', hint: '대장님 지시를 받는 방', color: '#0f766e' },
    { id: 'lounge', name: '라운지', emoji: '☕', hint: '잠깐 쉬어가는 방', color: '#b45309' }
  ];

  var STATUSES = [
    { id: 'waiting', label: '대기 중', emoji: '⚪' },
    { id: 'working', label: '작업 중', emoji: '🟢' },
    { id: 'resting', label: '휴식 중', emoji: '🌙' }
  ];

  var TASK_STATUSES = [
    { id: 'waiting', label: '⚪ 대기', board: '대기' },
    { id: 'doing', label: '🟢 진행 중', board: '진행 중' },
    { id: 'done', label: '✅ 완료', board: '완료' }
  ];

  var CATEGORIES = [
    { id: '네오빌', color: '#0369a1' },
    { id: '체험단', color: '#be123c' },
    { id: '폰테크', color: '#0f766e' },
    { id: '가계', color: '#b45309' },
    { id: '일반', color: '#64748b' }
  ];

  var DEFAULT_PROFILE = {
    haem1: { room: 'command', status: 'waiting' },
    leelaehui1: { room: 'meeting', status: 'working' },
    haemtaengpon1: { room: 'meeting', status: 'waiting' },
    haemseobeu6: { room: 'lounge', status: 'resting' },
    haem31: { room: 'command', status: 'working' }
  };

  var CAL_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  var QUOTA_PRESETS = [
    { label: '100% 여유', value: 100 },
    { label: '70%', value: 70 },
    { label: '40%', value: 40 },
    { label: '10% 부족', value: 10 }
  ];

  var QUOTA_PLANS = ['무료 플랜', '유료 플랜', '알 수 없음'];

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

  /* '내 피클' 표지 — 피클1(햄 님 본인 피클) 이름 옆에만 붙는다. */
  function ownTag(id, small) {
    if (id !== OWN_PICKLE_ID) return '';
    return '<span class="own-tag' + (small ? ' sm' : '') + '">내 피클</span>';
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

  /* 받침에 따라 '을' / '를' */
  function eulJosa(word) {
    var w = String(word || '');
    if (!w) return '를';
    var c = w.charCodeAt(w.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) {
      var jong = (c - 0xAC00) % 28;
      return jong === 0 ? '를' : '을';
    }
    if (c >= 48 && c <= 57) {
      return '013678'.indexOf(w.charAt(w.length - 1)) >= 0 ? '을' : '를';
    }
    return '를';
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
    return { id: id || '일반', color: '#64748b' };
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

  /* ─────────────── 날짜(캘린더) 도우미 ─────────────── */

  function ymd(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayYmd() {
    return ymd(new Date());
  }

  function parseYmd(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    var y = Number(p[0]);
    var m = Number(p[1]);
    var d = Number(p[2]);
    if (!y || !m || !d) return null;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function fmtDateLabel(s) {
    var d = parseYmd(s);
    if (!d) return s || '';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + CAL_WEEK[d.getDay()] + ')';
  }

  function fmtMonthLabel(d) {
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월';
  }

  /* 'HH:MM' → 오전/오후 표기 (비어 있으면 종일) */
  function fmtCalTime(t) {
    var m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return '종일';
    var h = Number(m[1]);
    var ap = h < 12 ? '오전' : '오후';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return ap + ' ' + hh + ':' + m[2];
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
    calendar: [],
    quotas: {},
    calMonth: (function () { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
    calSel: '',
    editingMemoId: null,
    mapBuilt: false,
    pickleId: null
  };

  var current = null;
  var channels = { chat: [], todos: [], memos: [], pins: [], profiles: [], calendar: [], quotas: [] };

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

  /* 처음 열었을 때 넣어 두는 예시 일정 — 햄 님의 실제 예정에서 가져왔다. 지우거나 고쳐도 된다. */
  function seedCalendar(base) {
    var now = Number(base) || Date.now();
    var rows = [
      ['2026-12-01', '10:00', '네오빌', 'haem1', '매물·잔금일 조정 1단계 문의'],
      ['2026-12-04', '10:30', '네오빌', 'haem1', '신생아 특례 디딤돌 신청 (기금e든든)'],
      ['2026-12-05', '12:00', '폰테크', 'haem31', 'eSIM·번호이동 조건 확인'],
      ['2026-12-10', '06:00', '가계', 'leelaehui1', '브로드컴 실적 확인'],
      ['2026-12-15', '09:00', '가계', 'haem1', '연말정산·연금저축 납입 점검'],
      ['2026-12-24', '12:00', '체험단', 'haemtaengpon1', '12월 체험단 리뷰 마감 정리'],
      ['2027-01-12', '10:00', '네오빌', 'haem1', '매물·잔금일 조정 2단계 문의'],
      ['2027-01-29', '09:00', '네오빌', 'haem1', '네오빌 잔금일 (협의 조정 가능)'],
      ['2027-02-01', '10:00', '네오빌', 'haemseobeu6', '입주 청소·도배 일정 확인'],
      ['2027-03-22', '10:00', '가계', 'haem1', '공단 행복도약 3,000만 공고 확인']
    ];
    var out = {};
    for (var i = 0; i < rows.length; i++) {
      var id = 'seed-cal-' + (i + 1);
      out[id] = {
        id: id,
        date: rows[i][0],
        time: rows[i][1],
        category: rows[i][2],
        assignee: rows[i][3],
        title: rows[i][4],
        by: 'captain',
        ts: now
      };
    }
    return out;
  }

  /* 사용량은 처음에는 '기록 없음'으로 둔다. 실제 숫자는 눌러서 기록한다. */
  function defaultQuotas() {
    var out = {};
    for (var i = 0; i < MEMBERS.length; i++) {
      out[MEMBERS[i].id] = { percent: null, plan: '무료 플랜', updated: null };
    }
    return out;
  }

  function clampPercent(n) {
    if (n === null || n === undefined || n === '') return null;
    var v = Number(n);
    if (isNaN(v)) return null;
    if (v < 0) return 0;
    if (v > 100) return 100;
    return Math.round(v);
  }

  function quotaOf(id) {
    var q = state.quotas ? state.quotas[id] : null;
    var pct = (q && q.percent !== null && q.percent !== undefined) ? clampPercent(q.percent) : null;
    return {
      percent: pct,
      plan: (q && q.plan) ? String(q.plan) : '무료 플랜',
      updated: (q && q.updated) ? Number(q.updated) : null
    };
  }

  function quotaColor(pct) {
    if (pct === null || pct === undefined) return '#94a9bd';
    if (pct >= 60) return '#2f9e72';
    if (pct >= 30) return '#c08a1e';
    return '#c0504a';
  }

  function defaultData() {
    var now = Date.now();
    var d = { chat: {}, todos: {}, memos: {}, pins: { meeting: 'seed-c1' }, profiles: {}, calendar: seedCalendar(now), quotas: defaultQuotas() };
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
    /* v3 이전 저장분에는 캘린더·사용량이 없다 — 처음 한 번만 예시로 채워 넣는다 */
    if (!d.calendar || typeof d.calendar !== 'object') d.calendar = seedCalendar(Date.now());
    if (!d.quotas || typeof d.quotas !== 'object') d.quotas = defaultQuotas();

    for (var ck in d.calendar) {
      if (Object.prototype.hasOwnProperty.call(d.calendar, ck)) {
        var ev = d.calendar[ck];
        if (!ev || typeof ev !== 'object') { delete d.calendar[ck]; continue; }
        if (!ev.id) ev.id = ck;
        if (!ev.date) ev.date = todayYmd();
        if (!ev.title) ev.title = '(제목 없음)';
      }
    }
    for (var qk in d.quotas) {
      if (Object.prototype.hasOwnProperty.call(d.quotas, qk)) {
        var q = d.quotas[qk];
        if (!q || typeof q !== 'object') { delete d.quotas[qk]; continue; }
        if (q.percent === undefined || q.percent === '' || q.percent === null || (Number(q.percent) === 0 && !q.updated)) q.percent = null;
        else q.percent = clampPercent(q.percent);
        if (!q.plan) q.plan = '무료 플랜';
      }
    }

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
    emit('calendar', values(this.data.calendar || {}));
    emit('quotas', this.data.quotas || {});
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

  LocalAdapter.prototype.saveEvent = function (ev) {
    if (!this.data.calendar) this.data.calendar = {};
    this.data.calendar[ev.id] = ev;
    this.commit();
  };

  LocalAdapter.prototype.deleteEvent = function (id) {
    if (this.data.calendar) delete this.data.calendar[id];
    this.commit();
  };

  LocalAdapter.prototype.saveQuota = function (memberId, quota) {
    if (!this.data.quotas) this.data.quotas = {};
    this.data.quotas[memberId] = quota;
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
      self.watch('calendar', 'calendar');
      self.watch('quotas', 'quotas');

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
      if (name === 'pins' || name === 'profiles' || name === 'quotas') {
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

  FbAdapter.prototype.saveEvent = function (ev) {
    this.write(this.root.child('calendar/' + ev.id), ev, '일정 저장');
  };

  FbAdapter.prototype.deleteEvent = function (id) {
    this.write(this.root.child('calendar/' + id), null, '일정 삭제');
  };

  FbAdapter.prototype.saveQuota = function (memberId, quota) {
    this.write(this.root.child('quotas/' + memberId), quota, '사용량 저장');
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
      av.style.setProperty('--c', '#64748b');
      label.textContent = '이름 선택';
      hint.textContent = '눌러서 내 이름을 골라 주세요';
    }
  }

  /* ─────────────── 렌더: 오피스 평면도 (걸어다니는 피클) ─────────────── */

  /* 방 안 가구는 모두 % 좌표라서, 휴대폰·PC 어느 폭에서도 같은 모양으로 그려진다. */
  function buildOfficeShell() {
    var box = $('officeMap');
    if (!box) return;

    /* 대회의실 — 긴 회의 테이블과 의자 10개 */
    var seats = [
      [30, 17], [44, 16], [58, 17],
      [30, 75], [44, 76], [58, 75],
      [12, 40], [12, 57], [77, 40], [77, 57]
    ];
    var seatHtml = '';
    for (var i = 0; i < seats.length; i++) {
      seatHtml += '<span class="om-chair" style="left:' + seats[i][0] + '%;top:' + seats[i][1] + '%"></span>';
    }
    var meetingInner =
      '<span class="om-rug" style="left:10%;top:22%;width:80%;height:62%"></span>'
      + '<span class="om-table"><i class="om-table-core"></i><i class="om-cup" style="left:18%;top:22%"></i><i class="om-cup" style="right:18%;bottom:20%"></i><i class="om-cup" style="left:46%;bottom:14%"></i></span>'
      + seatHtml
      + '<span class="om-plant" style="left:4%;bottom:6%">🪴</span>'
      + '<span class="om-plant" style="right:4%;top:8%">🪴</span>';

    /* 지휘실 — 책상 5개와 듀얼 모니터 */
    var desks = [[7, 30], [37, 30], [67, 30], [22, 62], [52, 62]];
    var deskHtml = '';
    for (var j = 0; j < desks.length; j++) {
      deskHtml += '<span class="om-desk" style="left:' + desks[j][0] + '%;top:' + desks[j][1] + '%">'
        + '<i class="om-screen"></i><i class="om-screen s2"></i><i class="om-deskchair"></i></span>';
    }
    var commandInner =
      deskHtml
      + '<span class="om-plant" style="left:4%;bottom:5%">🪴</span>';

    /* 라운지 — 소파·커피 테이블·바 카운터 */
    var loungeInner =
      '<span class="om-rug" style="left:5%;top:22%;width:52%;height:62%"></span>'
      + '<span class="om-sofa"><i class="om-cushion"></i><i class="om-cushion"></i><i class="om-cushion"></i><i class="om-sofa-arm"></i></span>'
      + '<span class="om-round"></span>'
      + '<span class="om-bar"><i class="om-machine"></i><i class="om-cupbar"></i><i class="om-cupbar c2"></i></span>'
      + '<span class="om-stool" style="right:23%;top:38%"></span>'
      + '<span class="om-stool c2" style="right:23%;top:58%"></span>'
      + '<span class="om-plant" style="left:4%;top:8%">🪴</span>';

    box.innerHTML =
      '<div class="om-canvas">'
      + '<div class="om-lobby">'
      + '<span class="om-logo" aria-hidden="true">🏢</span>'
      + '<span class="om-lobby-text"><b>햄 님 합동 비서실</b><i>다섯 명이 일하는 6층</i></span>'
      + '<span class="om-clock" id="omClock"></span>'
      + '</div>'
      + '<div class="om-floor">'
      + zoneHtml('meeting', '🪑', '대회의실', '다 같이 모이는 방', meetingInner)
      + zoneHtml('command', '🎯', '지휘실', '대장님 지시를 받는 방', commandInner)
      + zoneHtml('lounge', '☕', '라운지', '잠깐 쉬어가는 방', loungeInner)
      + '</div>'
      + '<p class="om-hint">방을 누르면 그 방의 회의실로 들어가고, 피클을 누르면 상태를 볼 수 있어요.</p>'
      + '</div>';

    state.mapBuilt = true;
    updateOfficeClock();
    initCritters();
  }

  function zoneHtml(room, emoji, name, sub, inner) {
    var r = roomById(room);
    return '<div class="om-zone om-' + room + '" data-room="' + room + '" role="button" tabindex="0"'
      + ' style="--c:' + r.color + '" aria-label="' + escapeHtml(name) + '로 들어가기">'
      + '<span class="om-zone-head"><i aria-hidden="true">' + emoji + '</i>' + escapeHtml(name)
      + '<b class="om-count" data-count="' + room + '">0명</b></span>'
      + '<span class="om-zone-sub">' + escapeHtml(sub) + '</span>'
      + inner
      + '<span class="om-go">회의실로 →</span>'
      + '<span class="om-people" data-people="' + room + '"></span>'
      + '</div>';
  }

  function updateOfficeClock() {
    var el = $('omClock');
    if (el) el.textContent = fmtClock(Date.now());
  }

  /* ── 걷는 피클 엔진 ── */

  var critters = [];
  var mapRaf = null;
  var mapLast = 0;
  var mapActive = false;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function initCritters() {
    critters = [];
    for (var i = 0; i < MEMBERS.length; i++) {
      var m = MEMBERS[i];
      var p = profileOf(m.id);
      var holder = document.querySelector('.om-people[data-people="' + p.room + '"]')
        || document.querySelector('.om-people');
      if (!holder) continue;

      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'om-critter';
      el.setAttribute('data-member', m.id);
      el.setAttribute('aria-label', m.name + ' 상태 보기');
      el.style.setProperty('--c', m.color);
      el.innerHTML = '<span class="om-bubble"></span>'
        + '<span class="oc-fig">'
        + '<span class="oc-body">'
        + '<i class="oc-eye l"></i><i class="oc-eye r"></i>'
        + '<i class="oc-blush l"></i><i class="oc-blush r"></i>'
        + '<i class="oc-mouth"></i>'
        + '</span>'
        + '<i class="oc-leg l"></i><i class="oc-leg r"></i>'
        + '</span>'
        + '<span class="oc-name">' + escapeHtml(m.name) + ownTag(m.id, true) + '</span>';
      holder.appendChild(el);

      critters.push({
        el: el,
        fig: el.querySelector('.oc-fig'),
        bubble: el.querySelector('.om-bubble'),
        id: m.id,
        room: p.room,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        sx: (0.06 + (i * 0.618) % 0.88),
        sy: (0.12 + (i * 0.382) % 0.8),
        speed: 13 + (i % 4) * 2.2,
        wait: 0.4 + i * 0.5,
        ready: false,
        left: false
      });
    }
    startMapLoop();
  }

  function critterBounds(c) {
    var holder = c.el.parentNode;
    if (!holder) return null;
    var W = holder.clientWidth;
    var H = holder.clientHeight;
    if (!W || !H) return null;
    var bw = c.el.offsetWidth || 46;
    var bh = c.el.offsetHeight || 52;
    return {
      minX: 5,
      maxX: Math.max(8, W - bw - 5),
      minY: 52,
      maxY: Math.max(56, H - bh - 2),
      w: W
    };
  }

  function clampNum(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function placeCritter(c, b) {
    if (!b) return;
    if (!c.ready) {
      var spot = freeSpot(c, b);
      c.x = spot.x;
      c.y = spot.y;
      c.tx = c.x;
      c.ty = c.y;
      c.ready = true;
    }
    c.x = clampNum(c.x, b.minX, b.maxX);
    c.y = clampNum(c.y, b.minY, b.maxY);
    c.tx = clampNum(c.tx, b.minX, b.maxX);
    c.ty = clampNum(c.ty, b.minY, b.maxY);
    c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0)';

    /* 말풍선이 방 밖으로 잘리지 않게 좌우로 살짝 밀어 준다 */
    if (c.bubble) {
      var cx = c.x + 23;
      var half = 58;
      var shift = 0;
      if (cx - half < 3) shift = 3 - (cx - half);
      else if (cx + half > b.w - 3) shift = (b.w - 3) - (cx + half);
      c.bubble.style.setProperty('--bx', shift.toFixed(1) + 'px');
    }
  }

  /* 가구 위에 올라서지 않게, 방마다 피해야 하는 사각형(비율 좌표) */
  var WALK_AVOID = {
    meeting: [[0.19, 0.24, 0.81, 0.78]],
    command: [
      [0.05, 0.27, 0.33, 0.56], [0.35, 0.27, 0.63, 0.56], [0.65, 0.27, 0.93, 0.56],
      [0.20, 0.59, 0.48, 0.88], [0.50, 0.59, 0.78, 0.88]
    ],
    lounge: [
      [0.06, 0.28, 0.52, 0.80], [0.51, 0.40, 0.71, 0.62], [0.79, 0.14, 0.96, 0.76]
    ]
  };

  function freeSpot(c, b) {
    var holder = c.el.parentNode;
    var W = holder ? holder.clientWidth : 0;
    var H = holder ? holder.clientHeight : 0;
    var bw = c.el.offsetWidth || 46;
    var bh = c.el.offsetHeight || 52;
    var room = profileOf(c.id).room;
    var rects = WALK_AVOID[room] || [];
    var fallback = { x: (b.minX + b.maxX) / 2, y: b.maxY };

    function blockedAt(x, y) {
      var fx = (x + bw / 2) / (W || 1);
      var fy = (y + bh / 2) / (H || 1);
      for (var j = 0; j < rects.length; j++) {
        var r = rects[j];
        if (fx > r[0] && fx < r[2] && fy > r[1] && fy < r[3]) return true;
      }
      return false;
    }

    for (var i = 0; i < 18; i++) {
      var x = b.minX + Math.random() * (b.maxX - b.minX);
      var y = b.minY + Math.random() * (b.maxY - b.minY);
      if (blockedAt(x, y)) continue;
      /* 가구를 가로질러 걷지 않게, 가는 길 중간도 확인한다 */
      if (c.ready) {
        var cross = false;
        for (var t = 0.25; t < 1; t += 0.25) {
          if (blockedAt(c.x + (x - c.x) * t, c.y + (y - c.y) * t)) { cross = true; break; }
        }
        if (cross) continue;
      }
      return { x: x, y: y };
    }
    return fallback;
  }

  function stepCritters(dt) {
    for (var i = 0; i < critters.length; i++) {
      var c = critters[i];
      var b = critterBounds(c);
      if (!b) continue;
      placeCritter(c, b);
      if (prefersReducedMotion()) continue;

      if (c.wait > 0) {
        c.wait -= dt;
        continue;
      }

      var dx = c.tx - c.x;
      var dy = c.ty - c.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        c.wait = 1.3 + Math.random() * 2.8;
        var next = freeSpot(c, b);
        c.tx = next.x;
        c.ty = next.y;
        continue;
      }

      var step = Math.min(dist, c.speed * dt);
      c.x += (dx / dist) * step;
      c.y += (dy / dist) * step;

      if (c.fig) {
        var goingLeft = dx < -0.6;
        if (goingLeft !== c.left) {
          c.left = goingLeft;
          c.fig.classList.toggle('left', goingLeft);
        }
      }
      c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0)';
    }
  }

  function mapTick(ts) {
    if (!mapActive) { mapRaf = null; return; }
    if (!mapLast) mapLast = ts;
    var dt = Math.min(0.06, Math.max(0, (ts - mapLast) / 1000));
    mapLast = ts;
    stepCritters(dt);
    mapRaf = requestAnimationFrame(mapTick);
  }

  function startMapLoop() {
    mapActive = true;
    if (mapRaf) return;
    mapLast = 0;
    mapRaf = requestAnimationFrame(mapTick);
  }

  function stopMapLoop() {
    mapActive = false;
  }

  function shortText(s, n) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function doingTitleFor(id) {
    for (var i = 0; i < state.todos.length; i++) {
      var t = state.todos[i];
      if (t.assignee === id && (t.status || 'waiting') === 'doing') return t.title;
    }
    for (var j = 0; j < state.todos.length; j++) {
      var t2 = state.todos[j];
      if (t2.assignee === ASSIGN_ALL && (t2.status || 'waiting') === 'doing') return t2.title;
    }
    return '';
  }

  function bubbleFor(id) {
    var p = profileOf(id);
    if (p.status === 'resting') return '잠깐 쉬는 중 ☕';
    var doing = doingTitleFor(id);
    if (p.status === 'working') return doing ? shortText(doing, 13) : '일하는 중 💻';
    if (p.status === 'waiting') return doing ? shortText(doing, 13) : '다음 지시 기다려요';
    return statusById(p.status).label;
  }

  function renderMap() {
    if (!state.mapBuilt) buildOfficeShell();

    var counts = {};
    for (var r = 0; r < ROOMS.length; r++) counts[ROOMS[r].id] = 0;
    for (var i = 0; i < MEMBERS.length; i++) {
      var pr = profileOf(MEMBERS[i].id);
      counts[pr.room] = (counts[pr.room] || 0) + 1;
    }
    for (var rid in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, rid)) continue;
      var badge = document.querySelector('.om-count[data-count="' + rid + '"]');
      if (badge) badge.textContent = counts[rid] + '명';
    }

    for (var k = 0; k < critters.length; k++) {
      var c = critters[k];
      var p = profileOf(c.id);
      var holder = document.querySelector('.om-people[data-people="' + p.room + '"]');
      if (holder && c.el.parentNode !== holder) {
        holder.appendChild(c.el);
        c.room = p.room;
        c.ready = false;
      }
      if (c.bubble) {
        var txt = bubbleFor(c.id);
        c.bubble.textContent = txt;
        c.bubble.title = txt;
      }
    }

    updateOfficeClock();
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
        badge = '<span class="badge" style="--c:' + it.color + '">' + escapeHtml(it.name) + ownTag(it.id, true) + '</span>';
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
        + escapeHtml(text) + ownTag(s.id, true) + '</button>';
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

  /* ─────────────── 렌더: 캘린더 ─────────────── */

  function eventsByDate() {
    var map = {};
    for (var i = 0; i < state.calendar.length; i++) {
      var ev = state.calendar[i];
      if (!ev || !ev.date) continue;
      var key = String(ev.date);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }

  function calEventSort(a, b) {
    var ta = a.time || '';
    var tb = b.time || '';
    if (!ta && tb) return 1;
    if (ta && !tb) return -1;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a.title || '').localeCompare(String(b.title || ''));
  }

  function renderCalendar() {
    if (!parseYmd(state.calSel)) state.calSel = todayYmd();
    if (!state.calMonth || isNaN(state.calMonth.getTime())) {
      var n0 = new Date();
      state.calMonth = new Date(n0.getFullYear(), n0.getMonth(), 1);
    }

    var mon = state.calMonth;
    var y = mon.getFullYear();
    var m = mon.getMonth();
    $('calTitle').textContent = fmtMonthLabel(mon);

    var byDate = eventsByDate();
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - first.getDay());
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var rows = Math.ceil((first.getDay() + daysInMonth) / 7);
    var todayKey = todayYmd();
    var html = '';

    for (var i = 0; i < rows * 7; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var key = ymd(d);
      var evs = byDate[key] || [];
      var cls = 'cal-cell';
      if (d.getMonth() !== m) cls += ' out';
      if (key === todayKey) cls += ' today';
      if (key === state.calSel) cls += ' sel';
      var dow = d.getDay();
      if (dow === 0) cls += ' sun';
      if (dow === 6) cls += ' sat';

      evs.sort(calEventSort);
      var dots = '';
      var shown = Math.min(evs.length, 3);
      for (var j = 0; j < shown; j++) {
        var c = catById(evs[j].category).color;
        dots += '<i class="cal-dot" style="background:' + c + '"></i>';
      }
      if (evs.length > 3) dots += '<span class="cal-more">+' + (evs.length - 3) + '</span>';

      html += '<button class="' + cls + '" type="button" data-date="' + key + '" role="gridcell"'
        + ' aria-label="' + escapeHtml(fmtDateLabel(key) + (evs.length ? ' 일정 ' + evs.length + '개' : '')) + '"'
        + (key === state.calSel ? ' aria-selected="true"' : '') + '>'
        + '<span class="cal-num">' + d.getDate() + '</span>'
        + '<span class="cal-dots">' + dots + '</span>'
        + '</button>';
    }

    $('calGrid').innerHTML = html;
    $('calFormTitle').textContent = fmtDateLabel(state.calSel) + ' 일정 추가';
    renderCalDay();
  }

  function renderCalDay() {
    var list = $('calDayList');
    if (!list) return;
    var evs = (eventsByDate()[state.calSel] || []).slice().sort(calEventSort);
    var isToday = (state.calSel === todayYmd());

    $('calDayTitle').textContent = fmtDateLabel(state.calSel) + (isToday ? ' · 오늘' : '');
    $('calDayCount').textContent = evs.length ? evs.length + '개' : '';

    if (!evs.length) {
      list.innerHTML = '<li class="cal-empty">이 날은 일정이 없어요. 아래에서 바로 추가할 수 있어요.</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      var cat = catById(ev.category);
      var time = ev.time ? fmtCalTime(ev.time) : '종일';
      html += '<li class="cal-ev" data-id="' + escapeHtml(ev.id) + '">'
        + '<span class="ce-time' + (ev.time ? '' : ' allday') + '">' + escapeHtml(time) + '</span>'
        + '<span class="tag" style="--c:' + cat.color + '">' + escapeHtml(cat.id) + '</span>'
        + '<span class="ce-title">' + escapeHtml(ev.title) + '</span>'
        + '<span class="ce-who">' + escapeHtml(ev.assignee === ASSIGN_ALL ? '모두' : identityLabel(ev.assignee)) + '</span>'
        + '<button class="ce-ics" type="button" data-act="ics" aria-label="삼성·구글 캘린더로 내보내기" title="삼성·구글 캘린더에 추가 (.ics)">📅</button>'
        + '<button class="ce-del" type="button" data-act="del" aria-label="일정 삭제">✕</button>'
        + '</li>';
    }
    list.innerHTML = html;
  }

  /* ─────────────── 내보내기: .ics (삼성·구글 캘린더) ─────────────── */

  var ICS_CR = String.fromCharCode(13);
  var ICS_LF = String.fromCharCode(10);
  var ICS_BS = String.fromCharCode(92);
  var ICS_CRLF = ICS_CR + ICS_LF;

  function icsEscape(s) {
    var str = String(s == null ? '' : s);
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === ICS_CR) continue;
      if (ch === ICS_LF) out += ICS_BS + 'n';
      else if (ch === ICS_BS) out += ICS_BS + ICS_BS;
      else if (ch === ';') out += ICS_BS + ';';
      else if (ch === ',') out += ICS_BS + ',';
      else out += ch;
    }
    return out;
  }

  function icsCharBytes(ch) {
    var c = ch.charCodeAt(0);
    if (c < 128) return 1;
    if (c < 2048) return 2;
    return 3;
  }

  /* iCalendar는 한 줄을 75바이트를 남기고 접어야 한다(한글은 한 글자 3바이트) */
  function icsFold(line) {
    var out = [];
    var cur = '';
    var bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      var b;
      var code = ch.charCodeAt(0);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length) {
        ch += line.charAt(i + 1);
        i++;
        b = 4;
      } else {
        b = icsCharBytes(ch);
      }
      if (cur && bytes + b > 74) {
        out.push(cur);
        cur = ' ';
        bytes = 1;
      }
      cur += ch;
      bytes += b;
    }
    out.push(cur);
    return out.join(ICS_CRLF);
  }

  function icsStampUTC(d) {
    function p2(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate())
      + 'T' + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
  }

  function icsNextDate(dt) {
    var d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
    return ymd(d).replace(/-/g, '');
  }

  function icsEventLines(ev) {
    var dt = parseYmd(ev.date) || new Date();
    var dstr = ymd(dt).replace(/-/g, '');
    var who = ev.assignee === ASSIGN_ALL ? '모두' : identityLabel(ev.assignee);
    var lines = [];
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + icsEscape(ev.id || uid('e')) + '@hyem0316.github.io');
    lines.push('DTSTAMP:' + icsStampUTC(new Date()));

    var m = String(ev.time || '').match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      var h = Number(m[1]);
      var mm = m[2];
      var endH = h + 1;
      var endDate = dt;
      if (endH >= 24) { endH -= 24; endDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1); }
      lines.push('DTSTART;TZID=Asia/Seoul:' + dstr + 'T' + pad2(h) + mm + '00');
      lines.push('DTEND;TZID=Asia/Seoul:' + ymd(endDate).replace(/-/g, '') + 'T' + pad2(endH) + mm + '00');
    } else {
      lines.push('DTSTART;VALUE=DATE:' + dstr);
      lines.push('DTEND;VALUE=DATE:' + icsNextDate(dt));
    }

    lines.push('SUMMARY:' + icsEscape(ev.title || '일정'));
    lines.push('CATEGORIES:' + icsEscape(ev.category || '일반'));
    lines.push('DESCRIPTION:' + icsEscape('분류: ' + (ev.category || '일반') + ICS_LF + '담당: ' + who + ICS_LF + '햄 님 합동 비서실에서 보냄'));
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
    return lines;
  }

  function buildIcs(events, calName) {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ham-office//hh//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(calName || '햄 님 합동 비서실'),
      'X-WR-TIMEZONE:Asia/Seoul',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Seoul',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0900',
      'TZOFFSETTO:+0900',
      'TZNAME:KST',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];
    for (var i = 0; i < events.length; i++) {
      lines = lines.concat(icsEventLines(events[i]));
    }
    lines.push('END:VCALENDAR');

    var out = [];
    for (var j = 0; j < lines.length; j++) out.push(icsFold(lines[j]));
    return out.join(ICS_CRLF) + ICS_CRLF;
  }

  function downloadTextFile(filename, text) {
    try {
      var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* 파일 이름에 쓸 수 없는 문자(\ / : * ? " < > |)와 공백을 걷어낸다 */
  function safeFilePart(s) {
    var forbidden = String.fromCharCode(92) + '/:*?"<>|';
    var t = String(s == null ? '' : s);
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      var c = ch.charCodeAt(0);
      if (c < 32) continue;
      if (c === 32) continue;
      if (forbidden.indexOf(ch) >= 0) continue;
      out += ch;
    }
    return out.slice(0, 20);
  }

  function exportEventIcs(id) {
    var ev = findById(state.calendar, id);
    if (!ev) return;
    var name = '합동비서실-' + String(ev.date || todayYmd()).replace(/-/g, '')
      + '-' + safeFilePart(ev.title || '일정') + '.ics';
    var ok = downloadTextFile(name, buildIcs([ev], '햄 님 합동 비서실 · ' + fmtDateLabel(ev.date)));
    toast(ok
      ? '📅 .ics 파일을 내려받았어요. 파일을 누르면 삼성·구글 캘린더에 저장돼요'
      : '파일을 만들지 못했어요. 브라우저 다운로드 설정을 확인해 주세요', 4500);
  }

  function exportAllIcs() {
    var list = state.calendar.slice().sort(function (a, b) {
      var da = String(a.date || '');
      var db = String(b.date || '');
      if (da !== db) return da < db ? -1 : 1;
      return String(a.time || '99:99') < String(b.time || '99:99') ? -1 : 1;
    });
    if (!list.length) { toast('내보낼 일정이 없어요'); return; }
    var name = '합동비서실-전체일정-' + todayYmd().replace(/-/g, '') + '.ics';
    var ok = downloadTextFile(name, buildIcs(list, '햄 님 합동 비서실'));
    toast(ok
      ? '📅 일정 ' + list.length + '개를 .ics로 내려받았어요. 파일을 누르면 캘린더에 저장돼요'
      : '파일을 만들지 못했어요. 브라우저 다운로드 설정을 확인해 주세요', 4500);
  }

  /* ─────────────── 렌더: AI 한도 ─────────────── */

  function renderQuota() {
    var html = '';
    var sum = 0;
    var counted = 0;
    var lowest = null;

    for (var i = 0; i < MEMBERS.length; i++) {
      var m = MEMBERS[i];
      var q = quotaOf(m.id);
      var pct = q.percent;
      var mine = (m.id === state.memberId);
      var isOwn = (m.id === OWN_PICKLE_ID);
      var color = quotaColor(pct);

      if (pct !== null) {
        sum += pct;
        counted++;
        if (!lowest || pct < lowest.percent) lowest = { name: m.name, percent: pct };
      }

      var presets = '';
      for (var j = 0; j < QUOTA_PRESETS.length; j++) {
        var ps = QUOTA_PRESETS[j];
        presets += '<button class="qc-btn' + (pct === ps.value ? ' on' : '') + '" type="button"'
          + ' data-act="set" data-value="' + ps.value + '">' + escapeHtml(ps.label) + '</button>';
      }

      var planOpts = '';
      for (var k = 0; k < QUOTA_PLANS.length; k++) {
        planOpts += '<option value="' + escapeHtml(QUOTA_PLANS[k]) + '"'
          + (q.plan === QUOTA_PLANS[k] ? ' selected' : '') + '>' + escapeHtml(QUOTA_PLANS[k]) + '</option>';
      }

      html += '<article class="quota-card" data-member="' + m.id + '" style="--c:' + m.color + ';--q:' + color + '">'
        + '<div class="qc-head">'
        + avatarHtml(m, false)
        + '<div class="qc-name-wrap">'
        + '<div class="qc-name">' + escapeHtml(m.name) + (isOwn ? ownTag(m.id) : (mine ? '<span class="mine-tag">나</span>' : '')) + '</div>'
        + '<div class="qc-sub">' + escapeHtml(m.handle) + '</div>'
        + '</div>'
        + '<span class="qc-plan">' + escapeHtml(q.plan) + '</span>'
        + '</div>'
        + '<div class="qc-bar' + (pct === null ? ' unknown' : '') + '" role="img"'
        + ' aria-label="남은 사용량 ' + (pct === null ? '기록 없음' : pct + '%') + '">'
        + '<span style="width:' + (pct === null ? 100 : pct) + '%"></span></div>'
        + '<div class="qc-meta">'
        + (pct === null
          ? '<b class="qc-none">—</b><span>아직 기록 없음</span>'
          : '<b>' + pct + '%</b><span>남음</span>')
        + '<span class="qc-time">' + (q.updated ? '마지막 기록 ' + escapeHtml(fmtStamp(q.updated)) : '') + '</span>'
        + '</div>'
        + '<div class="qc-presets">' + presets + '</div>'
        + '<div class="qc-foot">'
        + '<span>플랜</span>'
        + '<select class="status-select qc-plan-select" data-act="plan" aria-label="플랜">' + planOpts + '</select>'
        + '<button class="qc-btn" type="button" data-act="minus" aria-label="5% 줄이기">−5</button>'
        + '<button class="qc-btn" type="button" data-act="plus" aria-label="5% 늘리기">+5</button>'
        + '</div>'
        + '</article>';
    }

    $('quotaList').innerHTML = html;

    var avg = counted ? Math.round(sum / counted) : null;
    $('quotaSummary').innerHTML =
      '<div class="sum-chip"><b>' + (avg === null ? '—' : avg + '%') + '</b>평균 여유</div>'
      + '<div class="sum-chip"><b>' + counted + '/' + MEMBERS.length + '</b>기록한 피클</div>'
      + '<div class="sum-chip"><b>' + (lowest ? escapeHtml(lowest.name) + ' ' + lowest.percent + '%' : '—') + '</b>가장 낮은 곳</div>';
  }

  /* ─────────────── 렌더: 피클 빠른 상태 ─────────────── */

  function taskCountFor(id) {
    var n = 0;
    for (var i = 0; i < state.todos.length; i++) {
      var t = state.todos[i];
      if ((t.assignee === id || t.assignee === ASSIGN_ALL) && (t.status || 'waiting') !== 'done') n++;
    }
    return n;
  }

  function openPickle(id) {
    var m = memberById(id);
    if (!m) return;
    var p = profileOf(id);
    var room = roomById(p.room);
    var st = statusById(p.status);
    var q = quotaOf(id);
    var mine = (id === state.memberId);
    var isOwn = (id === OWN_PICKLE_ID);

    var tasks = [];
    for (var i = 0; i < state.todos.length && tasks.length < 3; i++) {
      var t = state.todos[i];
      if ((t.assignee === id || t.assignee === ASSIGN_ALL) && (t.status || 'waiting') !== 'done') tasks.push(t);
    }
    var taskHtml = tasks.length
      ? (function () {
        var out = '';
        for (var j = 0; j < tasks.length; j++) {
          var cat = catById(tasks[j].category);
          out += '<div class="pk-task"><span class="tag" style="--c:' + cat.color + '">' + escapeHtml(cat.id) + '</span>'
            + '<span class="pk-task-title">' + escapeHtml(tasks[j].title) + '</span></div>';
        }
        return out;
      })()
      : '<p class="muted tiny">지금 맡은 일이 없어요.</p>';

    $('pickleTitle').textContent = m.name + ' 상태';
    $('pickleBody').innerHTML =
      '<div class="pk-head">' + avatarHtml(m, false)
      + '<div class="pk-head-text"><div class="pk-name">' + escapeHtml(m.name)
      + (isOwn ? ownTag(id) : (mine ? '<span class="mine-tag">나</span>' : '')) + '</div>'
      + '<div class="pk-sub">' + escapeHtml(m.handle) + '</div></div></div>'
      + '<div class="pk-status">'
      + '<span class="pk-pill" style="--c:' + st.id + '"><i class="dot s-' + st.id + '"></i>' + escapeHtml(st.label) + '</span>'
      + '<span class="pk-pill">' + room.emoji + ' ' + escapeHtml(room.name) + '</span>'
      + '<span class="pk-pill">📋 맡은 일 ' + taskCountFor(id) + '개</span>'
      + '</div>'
      + '<div class="pk-quota" style="--q:' + quotaColor(q.percent) + '">'
      + '<div class="qc-bar' + (q.percent === null ? ' unknown' : '') + '"><span style="width:' + (q.percent === null ? 100 : q.percent) + '%"></span></div>'
      + '<div class="qc-meta">' + (q.percent === null ? '<span>⚡ 사용량 아직 기록 없음</span>' : '<b>' + q.percent + '%</b><span>남음</span>')
      + '<span class="qc-time">' + escapeHtml(q.plan) + '</span></div></div>'
      + '<div class="pk-block"><h4>맡은 일</h4>' + taskHtml + '</div>'
      + '<div class="pk-block"><h4>빠른 실행</h4>'
      + '<div class="pk-actions">'
      + '<button class="btn primary" type="button" data-act="call">💬 회의실로 부르기</button>'
      + '<button class="btn" type="button" data-act="cycle">' + (p.status === 'waiting' ? '🟢 작업 중으로' : (p.status === 'working' ? '🌙 휴식 중으로' : '⚪ 대기 중으로')) + '</button>'
      + '<button class="btn" type="button" data-act="quota">⚡ 한도 조정</button>'
      + '</div></div>';

    state.pickleId = id;
    openModal('pickleModal');
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
      var isOwn = (m.id === OWN_PICKLE_ID);
      var room = roomById(p.room);
      var qq = quotaOf(m.id);
      var qText = (qq.percent === null) ? '⚡ 기록 전' : '⚡ ' + qq.percent + '% 남음';
      html += '<div class="staff-row' + (mine ? ' me' : '') + '" data-member="' + m.id + '" style="--c:' + m.color + '">'
        + avatarHtml(m, false)
        + '<div class="staff-info">'
        + '<div class="staff-name">' + escapeHtml(m.name)
          + (isOwn ? ownTag(m.id) : (mine ? '<span class="mine-tag">나</span>' : '')) + '</div>'
        + '<div class="staff-sub">' + escapeHtml(m.handle) + ' · ' + room.emoji + ' ' + escapeHtml(room.name) + ' · 맡은 일 ' + open + '개 · ' + escapeHtml(qText) + '</div>'
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
        + '<h3 class="memo-title">' + (m.title ? escapeHtml(m.title) : '<span style="color:#a8bbcd;font-weight:600">제목 없음</span>') + '</h3>'
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
        + '<span class="member-info"><span class="member-name">' + escapeHtml(display) + ownTag(s.id, true) + '</span>'
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
    renderQuota();
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

  /* ─────────────── 동작: 캘린더 ─────────────── */

  function selectCalDate(key) {
    var d = parseYmd(key);
    if (!d) return;
    state.calSel = key;
    if (d.getFullYear() !== state.calMonth.getFullYear() || d.getMonth() !== state.calMonth.getMonth()) {
      state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    renderCalendar();
  }

  function shiftMonth(delta) {
    state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + delta, 1);
    renderCalendar();
  }

  function goToday() {
    var now = new Date();
    state.calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    state.calSel = todayYmd();
    renderCalendar();
  }

  function addEvent() {
    var input = $('calTitleInput');
    var title = input.value.trim();
    if (!title) { input.focus(); toast('일정 제목을 적어 주세요'); return; }
    if (!state.memberId) { toast('먼저 내 이름을 골라 주세요'); openMemberModal(); return; }
    if (!current) { toast('아직 준비 중이에요. 잠시 후 다시 시도해 주세요'); return; }

    var time = $('calTime').value || '';
    if (!/^\d{1,2}:\d{2}$/.test(time)) time = '';

    current.saveEvent({
      id: uid('e'),
      date: state.calSel,
      time: time,
      title: title,
      category: $('calCat').value,
      assignee: $('calAssignee').value,
      by: state.memberId,
      ts: Date.now()
    });
    input.value = '';
    $('calTime').value = '';
    input.focus();
    toast(fmtDateLabel(state.calSel) + '에 일정을 넣었어요');
  }

  function deleteEvent(id) {
    var ev = findById(state.calendar, id);
    if (!ev) return;
    if (!window.confirm('"' + ev.title + '" 일정을 지울까요?')) return;
    current.deleteEvent(id);
    toast('일정을 지웠어요');
  }

  /* ─────────────── 동작: AI 한도 ─────────────── */

  function saveQuota(id, percent) {
    var q = quotaOf(id);
    var pct = clampPercent(percent);
    if (pct === null) return;
    if (!current) { toast('아직 준비 중이에요'); return; }
    current.saveQuota(id, { percent: pct, plan: q.plan, updated: Date.now(), by: state.memberId });
    toast(identityLabel(id) + ' 남은 사용량 ' + pct + '%로 기록했어요');
  }

  function saveQuotaPlan(id, plan) {
    var q = quotaOf(id);
    if (!current) return;
    current.saveQuota(id, { percent: q.percent, plan: plan, updated: Date.now(), by: state.memberId });
    toast(identityLabel(id) + ' 플랜을 ' + plan + '(으)로 적었어요');
  }

  function cycleStatus(id) {
    var p = profileOf(id);
    var next = p.status === 'waiting' ? 'working' : (p.status === 'working' ? 'resting' : 'waiting');
    updateProfile(id, { status: next });
    toast(identityLabel(id) + ' → ' + statusById(next).label);
    return next;
  }

  /* ─────────────── 탭 ─────────────── */

  var PANELS = { map: 'panel-map', chat: 'panel-chat', tasks: 'panel-tasks', calendar: 'panel-calendar', quota: 'panel-quota', staff: 'panel-staff', memos: 'panel-memos' };
  var TAB_LABELS = { map: '🗺️ 오피스 맵', chat: '💬 회의실', tasks: '📋 작업실', calendar: '📅 캘린더', quota: '⚡ AI 한도', staff: '📊 비서현황', memos: '📝 메모' };

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
    if (name === 'map') {
      renderMap();
      if (document.hidden === false) startMapLoop();
    } else {
      stopMapLoop();
    }
    if (name === 'calendar') renderCalendar();
    if (name === 'quota') renderQuota();
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

    /* 오피스 맵 → 방 들어가기 / 피클 상태 보기 */
    $('officeMap').addEventListener('click', function (e) {
      var cr = e.target.closest ? e.target.closest('.om-critter') : null;
      if (cr) { openPickle(cr.getAttribute('data-member')); return; }
      var zone = e.target.closest ? e.target.closest('.om-zone') : null;
      if (zone) openRoom(zone.getAttribute('data-room'));
    });
    $('officeMap').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest && e.target.closest('.om-critter')) return;
      var zone = e.target.closest ? e.target.closest('.om-zone') : null;
      if (!zone) return;
      e.preventDefault();
      openRoom(zone.getAttribute('data-room'));
    });

    /* 피클 빠른 상태 모달 */
    $('pickleBody').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      var id = state.pickleId;
      if (!id) return;
      var act = btn.getAttribute('data-act');
      if (act === 'call') {
        var p = profileOf(id);
        var nm = identityLabel(id);
        closeModal('pickleModal');
        openRoom(p.room);
        insertMention(nm);
        toast(nm + eulJosa(nm) + ' ' + roomById(p.room).name + '에서 불렀어요');
      } else if (act === 'cycle') {
        cycleStatus(id);
        openPickle(id);
      } else if (act === 'quota') {
        closeModal('pickleModal');
        switchTab('quota');
      }
    });

    /* 캘린더 */
    $('calPrev').addEventListener('click', function () { shiftMonth(-1); });
    $('calNext').addEventListener('click', function () { shiftMonth(1); });
    $('calToday').addEventListener('click', goToday);
    $('calGrid').addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.cal-cell') : null;
      if (cell) selectCalDate(cell.getAttribute('data-date'));
    });
    $('calDayList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      var row = btn.closest('.cal-ev');
      if (!row) return;
      var id = row.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'del') deleteEvent(id);
      else if (act === 'ics') exportEventIcs(id);
    });
    $('calIcsAll').addEventListener('click', exportAllIcs);
    $('calForm').addEventListener('submit', function (e) {
      e.preventDefault();
      addEvent();
    });

    /* AI 한도 */
    $('quotaList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      var card = btn.closest('.quota-card');
      if (!card) return;
      var id = card.getAttribute('data-member');
      var act = btn.getAttribute('data-act');
      var q = quotaOf(id);
      var base = (q.percent === null ? 100 : q.percent);
      if (act === 'set') saveQuota(id, Number(btn.getAttribute('data-value')));
      else if (act === 'plus') saveQuota(id, base + 5);
      else if (act === 'minus') saveQuota(id, base - 5);
    });
    $('quotaList').addEventListener('change', function (e) {
      var sel = e.target.closest ? e.target.closest('select[data-act="plan"]') : null;
      if (!sel) return;
      var card = sel.closest('.quota-card');
      if (card) saveQuotaPlan(card.getAttribute('data-member'), sel.value);
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

  /* 홈화면 앱(PWA) 설치 버튼 */
  var installPrompt = null;

  function setupInstall() {
    var btn = $('installBtn');
    if (!btn) return;

    window.addEventListener('beforeinstallprompt', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      installPrompt = e;
      btn.hidden = false;
    });

    btn.addEventListener('click', function () {
      if (!installPrompt) {
        toast('브라우저 오른쪽 위 ⋮ 메뉴에서 \'앱 설치\'를 눌러 주세요', 3600);
        return;
      }
      installPrompt.prompt();
      var p = installPrompt;
      installPrompt = null;
      if (p.userChoice && p.userChoice.then) {
        p.userChoice.then(function (res) {
          if (res && res.outcome === 'accepted') {
            btn.hidden = true;
            toast('홈화면에 추가했어요 📱');
          } else {
            toast('설치를 취소했어요. 메뉴에서 언제든 추가할 수 있어요');
          }
        });
      }
    });

    window.addEventListener('appinstalled', function () {
      installPrompt = null;
      btn.hidden = true;
      toast('홈화면에 앱으로 추가됐어요 📱');
    });

    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) btn.hidden = true;
    } catch (e) { /* 무시 */ }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('[sw]', err);
      });
    });
  }

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

    /* 캘린더 폼 — 분류·담당 */
    var calCat = $('calCat');
    if (calCat) {
      html = '';
      for (var k = 0; k < CATEGORIES.length; k++) {
        html += '<option value="' + escapeHtml(CATEGORIES[k].id) + '">' + escapeHtml(CATEGORIES[k].id) + '</option>';
      }
      calCat.innerHTML = html;
      calCat.value = '일반';
    }

    var calAs = $('calAssignee');
    if (calAs) {
      html = '<option value="' + ASSIGN_ALL + '">모두</option>';
      for (var n = 0; n < MEMBERS.length; n++) {
        html += '<option value="' + MEMBERS[n].id + '">' + escapeHtml(MEMBERS[n].name) + '</option>';
      }
      calAs.innerHTML = html;
      calAs.value = state.memberId || MEMBERS[0].id;
    }
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
    channels.calendar.push(function (arr) {
      state.calendar = arr || [];
      if (state.tab === 'calendar') renderCalendar();
    });
    channels.quotas.push(function (map) {
      state.quotas = map || {};
      if (state.tab === 'quota') renderQuota();
      if (state.tab === 'staff') renderStaff();
    });
  }

  function boot() {
    state.calSel = todayYmd();
    fillSelects();
    bindEvents();
    registerChannels();

    var savedMember = null;
    try { savedMember = localStorage.getItem(LS.member); } catch (e) { savedMember = null; }
    if (savedMember && identityById(savedMember)) state.memberId = savedMember;
    var calAs = $('calAssignee');
    if (calAs && state.memberId) calAs.value = state.memberId;
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
    renderCalendar();
    renderQuota();
    setupInstall();
    registerServiceWorker();
    setInterval(updateOfficeClock, 30000);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopMapLoop();
      } else if (state.tab === 'map') {
        startMapLoop();
      }
    });

    if (isUnlocked()) showApp(); else showGate();

    if (hashCfg && isUnlocked()) setTimeout(function () { openModal('settingsModal'); }, 420);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
