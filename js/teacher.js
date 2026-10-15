/* 교사 화면(?t=1): 반 관리 → 차시 열기 → 턴 진행·현황·마감 */
(function (W) {
  'use strict';
  var U = W.U, h = U.h, $ = U.$, API = W.API, FX = W.FX;
  var T = { pin: '', cid: '', cls: null, code: '', state: null, poll: 0 };
  var root;

  function start() {
    root = $('#teacher'); root.classList.remove('hidden');
    try { T.pin = sessionStorage.getItem('ar_pin') || ''; } catch (e) {}
    var q = W.App.qs;
    if (T.pin && q.get('c')) { T.code = q.get('c'); return room(); }
    if (T.pin) return classes();
    login();
  }
  function page(title, kids, back) {
    clearTimeout(T.poll);
    root.innerHTML = '';
    var w = h('div', { class: 'wrap' });
    w.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;margin:6px 0 16px' }, [
      h('div', { class: 'row' }, [back ? h('button', { class: 'btn', text: '←', onclick: back }) : null, h('div', { class: 'h', style: 'font-size:30px', text: title })]),
      h('span', { class: 'pill', html: U.icon('crown', 's') + ' 선생님 화면' })
    ]));
    kids.forEach(function (k) { if (k) w.appendChild(k); });
    root.appendChild(w);
  }

  function login() {
    var pin = h('input', { class: 'field', type: 'password', placeholder: '선생님 PIN', inputmode: 'numeric', style: 'max-width:280px;text-align:center' });
    var go = h('button', { class: 'btn gold big', text: '들어가기', onclick: function () {
      API.get({ a: 'classes', pin: pin.value }).then(function (r) {
        if (!r.ok) return U.toast(U.errMsg(r));
        T.pin = pin.value; try { sessionStorage.setItem('ar_pin', T.pin); } catch (e) {}
        classes(r);
      });
    } });
    pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    page('전산회계 레이드 — 선생님', [h('div', { class: 'panel col', style: 'max-width:420px' }, [pin, go])]);
    setTimeout(function () { pin.focus(); }, 50);
  }

  function classes(pre) {
    var load = pre ? Promise.resolve(pre) : API.get({ a: 'classes', pin: T.pin });
    load.then(function (r) {
      if (!r.ok) return login();
      var list = h('div', { class: 'stagegrid' });
      r.classes.sort(function (a, b) { return b.createdAt - a.createdAt; }).forEach(function (c) {
        list.appendChild(h('button', { onclick: function () { T.cid = c.cid; klass(); } }, [h('div', { class: 'h', style: 'font-size:22px', text: c.title }), h('div', { class: 'dim', text: '학생 ' + c.n + '명 · 수업 ' + c.rooms + '번' })]));
      });
      var title = h('input', { class: 'field', placeholder: '반 이름 (예: 2-6 회계실무)', style: 'font-size:18px' });
      var names = h('textarea', { class: 'field', rows: 6, placeholder: '학생 이름을 한 줄에 한 명씩(나중에 추가 가능)', style: 'font-size:16px' });
      var mk = h('button', { class: 'btn gold', text: '반 만들기', onclick: function () {
        if (!title.value.trim()) return U.toast('반 이름을 넣어 주세요');
        mk.disabled = true;
        API.post({ a: 'createClass', pin: T.pin, title: title.value, names: names.value.split(/\n|,/).map(function (s) { return s.trim(); }).filter(Boolean) }).then(function (x) {
          mk.disabled = false; if (!x.ok) return U.toast(U.errMsg(x)); T.cid = x.cid; klass();
        });
      } });
      page('내 반', [list, h('div', { class: 'panel col', style: 'margin-top:20px;max-width:560px' }, [h('div', { class: 'h', style: 'font-size:22px', text: '새 반 만들기' }), title, names, mk])]);
    });
  }

  function klass() {
    API.get({ a: 'class', pin: T.pin, cid: T.cid }).then(function (r) {
      if (!r.ok) return U.toast(U.errMsg(r));
      T.cls = r.cls;
      var doneStage = {}; (r.cls.rooms || []).forEach(function (x) { doneStage[x.stage] = x; });
      var grid = h('div', { class: 'stagegrid' });
      for (var i = 1; i <= 36; i++) (function (id) {
        var st = U.stageData(id) || { title: '(준비 중)', part: 0 };
        var last = doneStage[id];
        grid.appendChild(h('button', { class: 'part' + st.part + (last ? ' done' : ''), onclick: function () { openStage(id, st); } }, [
          h('div', { class: 'n', text: id + '차시' + (last ? ' ✓' : '') }), h('div', { style: 'font-weight:700', text: st.title }),
          h('div', { class: 'dim', style: 'font-size:13px', text: (st.quest && st.quest.mode === 'kclep' ? 'KcLep 실습' : st.quest && st.quest.mode === 'exam' ? '실전 모의고사' : '이론·분개') + (st.arcade ? ' + 오락실 ' + ((W.Play.ARCADE[st.arcade.game] || {}).title || '') : '') }),
          last ? h('div', { class: 'dim', style: 'font-size:12px', text: '방 ' + last.code + ' (' + new Date(last.at).toLocaleDateString() + ') — 눌러서 다시 열기' }) : null
        ]));
      })(i);
      var stu = {}; r.students.forEach(function (s) { stu[s.sid] = s; });
      var tbl = h('table', { class: 'tgrid' }, [h('tr', {}, ['', '이름', 'Lv', 'XP', '골드', '카드', '출석', ''].map(function (x) { return h('th', { text: x }); }))]);
      r.cls.roster.forEach(function (e) {
        var s = stu[e.sid];
        tbl.appendChild(h('tr', { style: e.hidden ? 'opacity:.4' : '' }, [
          h('td', {}, [s ? h('img', { src: U.avSrc(s.av) }) : null]), h('td', { text: e.name + (e.reg ? '' : ' (미등록)') }),
          h('td', { text: s ? s.lv : '' }), h('td', { text: s ? U.fmt(s.xp) : '' }), h('td', { text: s ? U.fmt(s.gold) : '' }),
          h('td', { text: s ? Object.keys(s.cards || {}).length : '' }), h('td', { text: s ? Object.keys(s.attend || {}).length : '' }),
          h('td', {}, [
            s ? h('button', { class: 'pill', text: '비번 초기화', onclick: function () { if (!confirm(e.name + ' 학생의 비밀번호를 지울까요? (다음 입장 때 새로 정함)')) return; API.post({ a: 't_resetPin', pin: T.pin, cid: T.cid, sid: e.sid }).then(function (x) { U.toast(x.ok ? '초기화했어요' : U.errMsg(x)); }); } }) : null,
            h('button', { class: 'pill', text: e.hidden ? '보이기' : '숨기기', onclick: function () { API.post({ a: 't_roster', pin: T.pin, cid: T.cid, hide: e.sid }).then(klass); } })
          ])
        ]));
      });
      var add = h('input', { class: 'field', placeholder: '추가할 이름(쉼표로 여러 명)', style: 'font-size:16px' });
      page(r.cls.title, [
        h('div', { class: 'h', style: 'font-size:22px;margin-bottom:8px', text: '차시 열기 (36차시 · 30분)' }), grid,
        h('div', { class: 'h', style: 'font-size:22px;margin:24px 0 8px', text: '학생 (' + r.cls.roster.length + '명)' }),
        h('div', { class: 'panel', style: 'overflow:auto' }, [tbl, h('div', { class: 'row', style: 'margin-top:10px' }, [add, h('button', { class: 'btn', text: '추가', onclick: function () { API.post({ a: 't_roster', pin: T.pin, cid: T.cid, add: add.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) }).then(klass); } })])])
      ], classes);
    });
  }

  function openStage(id, st) {
    if (!confirm(id + '차시 「' + st.title + '」 방을 새로 열까요?')) return;
    var kind = st.quest && st.quest.mode === 'exam' ? 'exam' : 'lesson';
    API.post({ a: 'openStage', pin: T.pin, cid: T.cid, stage: id, kind: kind, title: st.title, turns: U.stageTurns(st) }).then(function (r) {
      if (!r.ok) return U.toast(U.errMsg(r));
      T.code = r.code; history.replaceState(null, '', '?t=1&c=' + r.code + (API.isLocal && W.App.qs.get('api') ? '&api=' + encodeURIComponent(W.App.qs.get('api')) : ''));
      room();
    });
  }

  function studentUrl(code) { var u = location.origin + location.pathname + '?r=' + code; var a = W.App.qs.get('api'); if (API.isLocal && a) u += '&api=' + encodeURIComponent(a); return u; }
  function boardUrl(code) { var u = location.origin + location.pathname + '?b=' + code; var a = W.App.qs.get('api'); if (API.isLocal && a) u += '&api=' + encodeURIComponent(a); return u; }

  function room() {
    root.innerHTML = '';
    var w = h('div', { class: 'wrap' }); root.appendChild(w);
    var head = h('div'), turns = h('div'), live = h('div'), stats = h('div');
    w.appendChild(head); w.appendChild(turns); w.appendChild(h('div', { style: 'display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:14px' }, [live, stats]));
    function draw(s) {
      T.state = s; var r = s.room, st = U.stageData(r.stage) || {};
      head.innerHTML = '';
      var qr = h('div', { style: 'background:#fff;padding:6px;border-radius:10px;width:118px;height:118px' });
      head.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap' }, [
        h('div', {}, [
          h('div', { class: 'row' }, [h('button', { class: 'btn', text: '← 반', onclick: function () { T.cid = r.cid; klass(); } }), h('span', { class: 'floor pill', style: 'background:var(--gold);color:#3a2300', text: r.stage + '차시' }), h('div', { class: 'h', style: 'font-size:28px', text: st.title || '' })]),
          h('div', { class: 'muted', style: 'margin-top:6px', text: st.goal || '' }),
          h('div', { class: 'row', style: 'margin-top:10px;flex-wrap:wrap' }, [
            h('button', { class: 'btn', text: '학생 링크 복사', onclick: function () { navigator.clipboard.writeText(studentUrl(r.code)); U.toast('복사했어요: ' + studentUrl(r.code)); } }),
            h('a', { class: 'btn pink', href: boardUrl(r.code), target: '_blank', text: '전광판 열기(프로젝터)' })
          ])
        ]),
        h('div', { class: 'row' }, [h('div', { style: 'text-align:right' }, [h('div', { class: 'dim', text: '방 번호' }), h('div', { class: 'bbig gold', style: 'font-size:64px', text: r.code })]), qr])
      ]));
      try { new W.QRCode(qr, { text: studentUrl(r.code), width: 106, height: 106 }); } catch (e) {}
      // 턴 진행
      turns.innerHTML = '';
      var bar = h('div', { class: 'row', style: 'flex-wrap:wrap;margin-top:16px;gap:8px' });
      r.turns.forEach(function (t, i) {
        bar.appendChild(h('button', { class: 'btn' + (i === r.turn ? ' gold' : ''), text: (i + 1) + '. ' + U.TURN_LABEL[t], onclick: function () { if (i !== r.turn && confirm(U.TURN_LABEL[t] + '(으)로 이동할까요?')) setTurn(i); } }));
      });
      var last = r.turn >= r.turns.length - 1;
      var next = h('button', { class: 'btn mint big', style: 'margin-left:auto', text: last ? (r.ended ? '마감 완료' : '결과 발표·보상 지급') : '다음 턴 ▶ ' + U.TURN_LABEL[r.turns[r.turn + 1]], onclick: function () {
        if (last) { if (!r.ended && confirm('오늘 차시를 마감하고 순위·보상을 발표할까요?')) end(); return; }
        if (s.ready < s.total && !confirm('아직 준비 안 된 학생이 ' + (s.total - s.ready) + '명 있어요. 넘길까요?')) return;
        setTurn(r.turn + 1);
      } });
      if (last && r.ended) next.disabled = true;
      bar.appendChild(next);
      turns.appendChild(h('div', { class: 'panel' }, [
        h('div', { class: 'row', style: 'justify-content:space-between' }, [h('b', { text: '지금: ' + U.TURN_LABEL[r.turnName] + ' · ' + guide(r.turnName, st) }), h('b', { class: 'gold', style: 'font-size:22px', text: '완료 ' + s.done + ' · 준비 ' + s.ready + ' / ' + s.total })]),
        h('div', { class: 'meter', style: 'margin-top:8px' }, [h('i', { style: 'width:' + (s.total ? s.ready / s.total * 100 : 0) + '%' })]),
        bar,
        s.boss ? h('div', { style: 'margin-top:10px;font-weight:700', text: '보스 HP ' + U.fmt(s.boss.hp) + ' / ' + U.fmt(s.boss.max) + (s.lastHit ? ' · 막타 ' + s.lastHit : '') }) : null
      ]));
      // 학생 현황
      live.innerHTML = '';
      var tbl = h('table', { class: 'tgrid' }, [h('tr', {}, ['', '#', '이름', '턴', '점수', '정확도', '준비', '접속', ''].map(function (x) { return h('th', { text: x }); }))]);
      s.list.forEach(function (o) {
        var dots = h('td'); r.turns.forEach(function (t, i) { dots.appendChild(h('span', { class: 'dot' + ((o.m >> i) & 1 ? ' on' : '') + (i === r.turn ? ' cur' : ''), title: U.TURN_LABEL[t] })); });
        var ago = Math.round((s.room.now - o.seen) / 1000);
        tbl.appendChild(h('tr', {}, [
          h('td', {}, [h('img', { src: U.avSrc(o.v) })]), h('td', { text: o.rank }), h('td', { html: '<b>' + U.esc(o.n) + '</b> <span class="dim">Lv' + o.lv + '</span>' }), dots,
          h('td', { class: 'gold', text: U.fmt(o.s) }), h('td', { text: o.a ? o.a + '%' : '-' }), h('td', { html: o.r ? '<span class="mint">✓</span>' : '' }),
          h('td', { class: ago > 60 ? 'red' : 'dim', text: ago < 15 ? '방금' : ago < 3600 ? Math.round(ago / 60) + '분' : '-' }),
          h('td', {}, [r.turnName === 'quest' && st.quest && st.quest.mode === 'kclep' ? h('button', { class: 'pill', text: '확인 인정' + (s.credits[o.sid] ? ' ' + s.credits[o.sid] : ''), onclick: function () { API.post({ a: 't_credit', pin: T.pin, code: r.code, sid: o.sid }).then(function () { U.toast(o.n + ' 인정'); }); } }) : null])
        ]));
      });
      var notIn = (s.roster || []).filter(function (e) { return !e.hidden && !s.list.some(function (o) { return o.sid === e.sid; }); });
      live.appendChild(h('div', { class: 'panel', style: 'overflow:auto;max-height:62vh' }, [tbl, notIn.length ? h('div', { class: 'dim', style: 'margin-top:8px', text: '아직 안 들어온 학생: ' + notIn.map(function (e) { return e.name; }).join(', ') }) : null]));
      // 문항 통계
      stats.innerHTML = '';
      var arr = Object.keys(s.items || {}).map(function (id) { var v = s.items[id]; return { id: id, n: v[0], ok: v[1], rate: v[1] / v[0] }; }).filter(function (x) { return x.n >= 2; });
      arr.sort(function (a, b) { return a.rate - b.rate; });
      var sp = h('div', { class: 'panel' }, [h('div', { class: 'h', style: 'font-size:22px', text: '많이 틀린 문제 TOP 6' })]);
      arr.slice(0, 6).forEach(function (x) {
        var it = itemById(st, x.id);
        sp.appendChild(h('div', { style: 'margin-top:10px;padding:10px;border-radius:12px;background:rgba(255,90,95,.1)' }, [
          h('b', { class: 'red', text: Math.round(x.rate * 100) + '% 정답 (' + x.ok + '/' + x.n + ')' }),
          h('div', { style: 'font-size:15px', text: it ? (it.q || it.keyword || it.stem || '') : x.id }),
          it && it.why ? h('div', { class: 'dim', style: 'font-size:13px', text: '→ ' + it.why }) : null
        ]));
      });
      if (!arr.length) sp.appendChild(h('div', { class: 'dim', text: '아직 기록이 적어요' }));
      stats.appendChild(sp);
    }
    function tick() {
      clearTimeout(T.poll);
      API.get({ a: 'tstate', pin: T.pin, code: T.code }).then(function (s) {
        if (s.ok) draw(s); else if (s.err === 'pin') return login(); else U.toast(U.errMsg(s));
        T.poll = setTimeout(tick, 3000);
      });
    }
    function setTurn(i) { API.post({ a: 't_turn', pin: T.pin, code: T.code, turn: i }).then(function (r) { if (!r.ok) U.toast(U.errMsg(r)); FX.play('turn'); tick(); }); }
    function end() { API.post({ a: 't_end', pin: T.pin, code: T.code }).then(function (r) { if (!r.ok) return U.toast(U.errMsg(r)); FX.play('win'); FX.rain(120); tick(); }); }
    tick();
  }
  function guide(t, st) {
    return { gather: '학생 입장·구호 (2분)', spell: '개념 카드 설명 + 주문 타이핑 (6분)', drill: st.arcade ? '연습 전투 (6분)' : '연습 전투 (8분)', arcade: '전산회계 오락실 한 판 (5분)', quest: st.quest && st.quest.mode === 'kclep' ? 'KcLep 실습·인증 (8분)' : '기출 이론 (6분)', raid: '반 전체 보스전 3분', result: '결과 발표', exam: '실전 60분' }[t] || '';
  }
  function itemById(st, id) {
    var m = id.match(/-(d|r|q|k|v|t|p)(\d+)$/); if (!m) return null; var i = +m[2];
    if (m[1] === 'd') return (st.drills || [])[i];
    if (m[1] === 'r') return (st.raid || [])[i];
    if (m[1] === 'k') return (st.spells || [])[i];
    if (m[1] === 'q') { var tid = ((st.quest || {}).theoryIds || [])[i]; return tid && W.THEORY[tid] ? { q: W.THEORY[tid].stem, why: W.THEORY[tid].explanation } : null; }
    if (m[1] === 'v') return (((st.quest || {}).kclep || {}).verify || [])[i];
    if (m[1] === 't') return { q: '실전 이론 ' + i + '번 (' + ((((st.quest || {}).exam) || {}).data || '') + '회)' };
    if (m[1] === 'p') return { q: '실전 문제7 조회 [' + i + ']' };
    return { q: id };
  }

  W.Teacher = { start: start };
})(window);
