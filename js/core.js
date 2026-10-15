/* 공통: 서버 통신·상태·도우미 */
(function (W) {
  'use strict';
  // 실제 서버 주소(배포 후 채움). localhost 에서는 ?api= 로 바꿀 수 있다.
  var PROD_API = '';
  var qs = new URLSearchParams(location.search);
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var API = (isLocal && qs.get('api')) || PROD_API;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'style') e.setAttribute('style', v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round(+n || 0)).toLocaleString('ko-KR'); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, '').replace(/[.,·()\[\]]/g, '').toLowerCase(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function store(k, v) { try { if (v === undefined) { var x = localStorage.getItem('ar_' + k); return x ? JSON.parse(x) : null; } if (v === null) localStorage.removeItem('ar_' + k); else localStorage.setItem('ar_' + k, JSON.stringify(v)); } catch (e) { return null; } }

  // ── 서버 ──
  function get(params) {
    if (!API) return Promise.resolve({ ok: false, err: 'noapi' });
    var u = API + (API.indexOf('?') >= 0 ? '&' : '?') + new URLSearchParams(params).toString() + '&_=' + Date.now();
    return fetch(u, { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, err: 'net' }; });
  }
  // 쓰기는 줄을 세워 한 번에 하나씩(같은 학생의 요청이 서로 덮어쓰지 않게) + busy/네트워크 오류면 다시
  var q = Promise.resolve();
  function post(body, tries) {
    var run = function () { return postOnce(body, tries == null ? 4 : tries); };
    var p = q.then(run, run); q = p.catch(function () {}); return p;
  }
  function postOnce(body, tries) {
    if (!API) return Promise.resolve({ ok: false, err: 'noapi' });
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, err: 'net', retry: true }; })
      .then(function (res) {
        if (res && !res.ok && res.retry && tries > 0) return sleep(800 + Math.random() * 1500).then(function () { return postOnce(body, tries - 1); });
        return res;
      });
  }

  var toastT;
  function toast(msg, ms) {
    var t = $('.toast'); if (!t) { t = h('div', { class: 'toast' }); document.body.appendChild(t); }
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hidden'); }, ms || 2600);
  }
  function errMsg(res) {
    var m = { net: '인터넷 연결을 확인해 주세요', busy: '사람이 몰려 있어요. 잠시 뒤 다시', auth: '다시 입장해 주세요', noroom: '방이 없어요(번호 확인)', pin: '선생님 PIN이 달라요', noapi: '서버 주소가 설정되지 않았어요' };
    return m[res && res.err] || (res && res.err) || '오류가 났어요';
  }

  // 그림 경로
  function avSrc(av) { return 'assets/img/av/' + (av || 'a01') + '.webp'; }
  function bossSrc(stageId) { return 'assets/img/boss/b' + String(stageId).padStart(2, '0') + '.webp'; }
  function cardSrc(name) { var a = W.ACCOUNT_BY_NAME[name]; return a ? 'assets/img/card/' + a.code + '.webp' : 'assets/img/ic/scroll.webp'; }
  function icon(name, cls) { return '<img class="ic ' + (cls || '') + '" src="assets/img/ic/' + name + '.webp" alt="">'; }

  // 레벨·직급
  var RANKS = [[1, '수습'], [3, '인턴'], [5, '사원'], [8, '주임'], [11, '대리'], [14, '과장'], [17, '차장'], [20, '부장'], [23, '이사'], [26, '상무'], [28, '전무'], [30, '회계왕']];
  function rankTitle(lv) { var t = RANKS[0][1]; RANKS.forEach(function (r) { if (lv >= r[0]) t = r[1]; }); return t; }
  function levelOf(xp) { var lv = 1, need = 600, rest = xp || 0; while (rest >= need && lv < 99) { rest -= need; lv++; need = 400 + 200 * lv; } return { lv: lv, cur: rest, need: need }; }

  var TURN_LABEL = { gather: '집결', spell: '주문 각인', drill: '연습 전투', quest: '실전 퀘스트', raid: '보스 레이드', result: '결과', exam: '실전 모의고사', arcade: '오락실 원정' };
  var BADGES = { mvp: ['오늘의 MVP', 'crown'], sharp: ['정확왕', 'medal1'], raider: ['레이드왕', 'bolt'], lasthit: ['막타왕', 'fire'], perfect: ['무결점', 'gem'] };

  function stageData(id) { return (W.STAGES || {})[id] || null; }
  // 차시의 턴 구성(교사가 방을 열 때 서버에 보냄): 오락실 원정이 있는 차시는 연습 전투 뒤에 끼운다
  function stageTurns(st) {
    if (st && st.quest && st.quest.mode === 'exam') return ['gather', 'spell', 'exam', 'result'];
    var t = ['gather', 'spell', 'drill', 'quest', 'raid', 'result'];
    if (st && st.arcade) t.splice(3, 0, 'arcade');
    return t;
  }

  W.U = { $: $, $$: $$, h: h, esc: esc, fmt: fmt, sleep: sleep, norm: norm, shuffle: shuffle, store: store, toast: toast, errMsg: errMsg,
    avSrc: avSrc, bossSrc: bossSrc, cardSrc: cardSrc, icon: icon, rankTitle: rankTitle, levelOf: levelOf, TURN_LABEL: TURN_LABEL, BADGES: BADGES, stageData: stageData, stageTurns: stageTurns };
  W.API = { get: get, post: post, base: function () { return API; }, isLocal: isLocal };

  W.App = {
    qs: qs,
    boot: function () {
      if (qs.get('b')) return W.Board.start(qs.get('b'));
      if (qs.get('t') != null) return W.Teacher.start();
      W.Student.start(qs.get('r'));
    }
  };
})(window);
