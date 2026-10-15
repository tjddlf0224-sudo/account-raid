/* 학생 화면: 입장 → 턴별 활동 → 결과·보상 */
(function (W) {
  'use strict';
  var U = W.U, h = U.h, $ = U.$, FX = W.FX, API = W.API, P = W.Play;
  var S = { code: '', sid: '', token: '', cid: '', me: null, cur: null, room: null, stage: null, turnShown: -1, running: null, poll: 0, boss: null, lastSeq: 0, awardShown: false, ctx: null };
  var RW = { N: 6, R: 4, SR: 2, SSR: 1 };

  function start(code) {
    $('#landing').classList.remove('hidden');
    document.addEventListener('pointerdown', function () { FX.unlock(); }, { once: true });
    var saved = U.store('sess');
    if (code && saved && saved.code === code && saved.token) return resume(saved);
    if (code) return pickName(code);
    askCode(saved);
  }

  // ── 입장 화면 ──
  function askCode(saved) {
    var box = $('#joinbox'); box.innerHTML = '';
    var inp = h('input', { class: 'field', placeholder: '방 번호 4자리', inputmode: 'numeric', maxlength: 4, style: 'text-align:center;font-size:28px;letter-spacing:8px' });
    var go = h('button', { class: 'btn gold big', style: 'width:100%;margin-top:12px', text: '입장하기', onclick: function () { if (/^\d{4}$/.test(inp.value)) pickName(inp.value); else U.toast('방 번호 4자리를 넣어 주세요'); } });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    box.appendChild(h('div', { class: 'h', style: 'font-size:24px;margin-bottom:8px', text: '원정대 입장' }));
    box.appendChild(inp); box.appendChild(go);
    if (saved && saved.code) box.appendChild(h('button', { class: 'btn', style: 'width:100%;margin-top:8px', text: '지난 방(' + saved.code + ') 이어서', onclick: function () { resume(saved); } }));
    setTimeout(function () { inp.focus(); }, 50);
  }

  function pickName(code) {
    var box = $('#joinbox'); box.innerHTML = '<div class="muted">방 정보를 불러오는 중…</div>';
    API.get({ a: 'room', code: code }).then(function (res) {
      if (!res.ok) { U.toast(U.errMsg(res)); return askCode(); }
      S.code = code; S.room = res.room;
      box.innerHTML = '';
      box.appendChild(h('div', { class: 'h', style: 'font-size:22px', text: res.cls.title }));
      box.appendChild(h('div', { class: 'muted', style: 'margin-bottom:10px', text: res.room.stage + '층 · ' + ((U.stageData(res.room.stage) || {}).title || '') + ' — 내 이름을 누르세요' }));
      var grid = h('div', { class: 'namegrid' });
      res.cls.roster.forEach(function (e) { grid.appendChild(h('button', { class: e.reg ? 'reg' : '', text: e.name, onclick: function () { askPin(e, res); } })); });
      box.appendChild(grid);
      if (res.cls.selfJoin) box.appendChild(h('button', { class: 'btn', style: 'width:100%;margin-top:10px', text: '+ 명단에 내 이름이 없어요', onclick: function () { askPin(null, res); } }));
    });
  }

  function askPin(e, res) {
    var box = $('#joinbox'); box.innerHTML = '';
    var name = e ? null : h('input', { class: 'field', placeholder: '이름(실명)', maxlength: 12, style: 'margin-bottom:8px' });
    var pin = h('input', { class: 'field', placeholder: '비밀번호 숫자 4자리', inputmode: 'numeric', maxlength: 4, type: 'password', style: 'text-align:center;letter-spacing:8px;font-size:26px' });
    var go = h('button', { class: 'btn gold big', style: 'width:100%;margin-top:12px', text: '입장', onclick: submit });
    pin.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
    box.appendChild(h('div', { class: 'h', style: 'font-size:24px', text: e ? e.name : '새로 등록' }));
    box.appendChild(h('div', { class: 'muted', style: 'margin:4px 0 10px;font-size:14px', text: e && e.reg ? '처음에 정한 비밀번호 4자리' : '처음이면 지금 정하는 4자리가 내 비밀번호가 돼요(잊지 마세요!)' }));
    if (name) box.appendChild(name);
    box.appendChild(pin); box.appendChild(go);
    box.appendChild(h('button', { class: 'btn', style: 'width:100%;margin-top:8px', text: '← 이름 다시 고르기', onclick: function () { pickName(S.code); } }));
    setTimeout(function () { (name || pin).focus(); }, 50);
    function submit() {
      if (!/^\d{4}$/.test(pin.value)) return U.toast('숫자 4자리를 넣어 주세요');
      go.disabled = true;
      API.post({ a: 'join', code: S.code, sid: e ? e.sid : undefined, name: name ? name.value : undefined, spin: pin.value }).then(function (r) {
        go.disabled = false;
        if (!r.ok) return U.toast(U.errMsg(r));
        S.sid = r.sid; S.token = r.token; S.cid = r.cid; S.me = r.me; S.room = r.room;
        U.store('sess', { code: S.code, sid: S.sid, token: S.token, cid: S.cid });
        if (r.bonus) setTimeout(function () { FX.burst(innerWidth / 2, innerHeight / 3, 30, 'coin'); FX.play('coin'); U.toast('출석 보상 +' + r.bonus.gold + ' 골드' + (r.bonus.streak > 1 ? ' · ' + r.bonus.streak + '연속 출석!' : ''), 3500); }, 600);
        if (r.claimed && r.claimed.length) setTimeout(function () { U.toast('지난 차시 보상을 받았어요!', 3000); }, 2500);
        if (!S.me.av) avatarPick(enter); else enter();
      });
    }
  }

  function avatarPick(next) {
    var lv = S.me ? S.me.lv : 1;
    var m = h('div', { class: 'modal' }), box = h('div', { class: 'box' });
    box.appendChild(h('div', { class: 'h', style: 'font-size:28px', text: '내 캐릭터 고르기' }));
    box.appendChild(h('div', { class: 'muted', style: 'margin-bottom:12px', text: '레벨이 오르면 잠긴 캐릭터가 열려요' }));
    var grid = h('div', { class: 'avgrid' }), pick = S.me.av || 'a01';
    for (var i = 1; i <= 14; i++) (function (k) {
      var id = 'a' + String(k).padStart(2, '0'), need = k <= 8 ? 1 : (k - 8) * 3 + 2;
      var b = h('button', { class: (id === pick ? 'on ' : '') + (lv < need ? 'lock' : ''), title: lv < need ? 'Lv ' + need + '에 열림' : '', onclick: function () {
        if (lv < need) return U.toast('Lv ' + need + '이 되면 열려요');
        pick = id; U.$$('button', grid).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); FX.play('tick');
      } }, [h('img', { src: U.avSrc(id), alt: '' }), lv < need ? h('div', { class: 'dim', style: 'font-size:12px', text: 'Lv ' + need }) : null]);
      grid.appendChild(b);
    })(i);
    box.appendChild(grid);
    box.appendChild(h('button', { class: 'btn gold big', style: 'margin-top:16px;width:100%', text: '이 캐릭터로!', onclick: function () {
      API.post({ a: 's_avatar', code: S.code, sid: S.sid, token: S.token, av: pick }).then(function (r) { if (r.ok) S.me = r.me; m.remove(); next && next(); });
    } }));
    m.appendChild(box); document.body.appendChild(m);
  }

  function resume(saved) {
    S.code = saved.code; S.sid = saved.sid; S.token = saved.token; S.cid = saved.cid;
    API.get({ a: 'me', cid: S.cid, sid: S.sid, token: S.token }).then(function (r) {
      if (!r.ok) { U.store('sess', null); return pickName(S.code); }
      S.me = r.me;
      // 이 방에 처음이면 입장 처리(출석)가 필요 → 이름 고르기부터
      if (!r.cur || r.cur.code !== S.code) return pickName(S.code);
      S.cur = r.cur; enter();
    });
  }

  // ── 본 화면 ──
  function enter() {
    $('#landing').classList.add('hidden');
    ['#hud', '#stage', '#readybar'].forEach(function (s) { $(s).classList.remove('hidden'); });
    $('#hudSound').textContent = FX.isOn() ? '소리 켬' : '소리 끔';
    $('#hudSound').onclick = function () { $('#hudSound').textContent = FX.toggle() ? '소리 켬' : '소리 끔'; };
    $('#hudBook').onclick = book;
    $('#hudPacks').onclick = function () { openPack(); };
    $('#hudAv').onclick = function () { avatarPick(drawHud); };
    $('#readyBtn').onclick = toggleReady;
    drawHud();
    if (!S.cur) API.get({ a: 'me', cid: S.cid, sid: S.sid, token: S.token }).then(function (r) { if (r.ok) { S.cur = r.cur; S.me = r.me; } tick(); });
    else tick();
  }

  function drawHud() {
    var me = S.me; if (!me) return;
    $('#hudAv').src = U.avSrc(me.av);
    $('#hudName').textContent = me.name;
    $('#hudLv').textContent = 'Lv ' + me.lv + ' ' + U.rankTitle(me.lv);
    $('#hudXp').style.width = Math.round(me.lvCur / me.lvNeed * 100) + '%';
    $('#hudXpTxt').textContent = U.fmt(me.lvCur) + '/' + U.fmt(me.lvNeed);
    $('#hudGold').textContent = U.fmt(me.gold);
    $('#hudPackN').textContent = me.packs || 0;
    var r = S.room; if (!r) return;
    var tw = $('#hudTurns'); tw.innerHTML = '';
    r.turns.forEach(function (t, i) {
      var done = S.cur && S.cur.t && S.cur.t[i];
      tw.appendChild(h('span', { class: (i === r.turn ? 'now ' : '') + (done ? 'done' : ''), text: (done ? '✓ ' : '') + U.TURN_LABEL[t] }));
    });
  }

  function tick() {
    clearTimeout(S.poll);
    API.get({ a: 'st', code: S.code, sid: S.sid, token: S.token }).then(function (r) {
      if (r.ok) apply(r);
      else if (r.err === 'auth') { U.store('sess', null); U.toast('다시 입장해 주세요'); setTimeout(function () { location.reload(); }, 1500); return; }
      var raid = S.room && S.room.turnName === 'raid';
      S.poll = setTimeout(tick, raid ? 2000 : (document.hidden ? 8000 : 3000));
    });
  }

  function apply(r) {
    var prevTurn = S.room ? S.room.turn : -1;
    S.room = r.room;
    $('#hudRank').textContent = r.rank || '-';
    var turnDone = S.cur && S.cur.t && S.cur.t[r.room.turn];
    $('#rbCount').textContent = '준비 ' + r.ready + '/' + r.total + ' · 완료 ' + r.done;
    $('#rbMeter').style.width = (r.total ? r.ready / r.total * 100 : 0) + '%';
    $('#readyBtn').disabled = !turnDone || r.room.turnName === 'result';
    $('#readybar').classList.toggle('hidden', r.room.turnName === 'result');
    var amReady = S.cur && S.cur.ready && S.cur.readyTurn === r.room.turn;
    $('#readyBtn').textContent = amReady ? '준비 취소' : '준비완료';
    $('#rbMsg').textContent = r.room.turnName === 'result' ? '오늘도 수고했어요!' : turnDone ? (amReady ? '선생님이 다음 턴으로 넘길 때까지 기다려요' : '미션 완료! 준비완료를 누르세요') : '미션을 끝내면 준비완료를 누르세요';
    if (r.boss && S.ctx && S.ctx.onBoss) S.ctx.onBoss(r.boss);
    S.boss = r.boss;
    if (r.room.turn !== S.turnShown || (r.room.ended && !S.endedShown)) {
      if (prevTurn >= 0 && r.room.turn !== prevTurn) FX.play('turn');
      showTurn();
    }
    if (r.award && !S.awardShown && $('#myAward')) { S.awardShown = true; claimAward(r.award); }
    drawHud();
  }

  function toggleReady() {
    var on = !(S.cur && S.cur.ready && S.cur.readyTurn === S.room.turn);
    $('#readyBtn').disabled = true;
    API.post({ a: 's_ready', code: S.code, sid: S.sid, token: S.token, on: on }).then(function (r) {
      $('#readyBtn').disabled = false;
      if (!r.ok) return U.toast(U.errMsg(r));
      S.cur = r.cur; if (on) FX.play('ok'); tick();
    });
  }

  // ── 턴 화면 ──
  function showTurn() {
    var r = S.room; S.turnShown = r.turn; if (r.ended) S.endedShown = true;
    if (S.ctx) S.ctx.cancelled = true;
    P.clearKeys();
    var stage = U.stageData(r.stage); S.stage = stage;
    var box = $('#stage'); box.innerHTML = '';
    if (!stage) { box.appendChild(h('div', { class: 'panel', text: '이 차시 자료를 불러오지 못했어요(새로고침).' })); return; }
    box.appendChild(h('div', { class: 'titlebar' }, [h('span', { class: 'floor', text: r.stage + '층' }), h('h2', { text: stage.title }), h('span', { class: 'pill', text: U.TURN_LABEL[r.turnName] })]));
    var area = h('div'); box.appendChild(area);
    var t = r.turn, name = r.turnName;
    var done = S.cur && S.cur.t && S.cur.t[t];
    var ctx = S.ctx = { cancelled: false, onCard: newCard };
    if (name === 'result') return result(area, stage);
    if (done && name !== 'raid') return doneView(area, stage, name, done);
    run(area, stage, name, t, ctx);
  }

  function run(area, stage, name, t, ctx) {
    var p;
    if (name === 'gather') p = gather(area, stage);
    else if (name === 'spell') p = P.spells(area, stage, ctx);
    else if (name === 'drill') p = P.drill(area, stage, ctx);
    else if (name === 'arcade') { ctx.turnAt = S.room.turnAt; ctx.myName = S.me && S.me.name; p = P.arcadeQuest(area, stage, ctx); }
    else if (name === 'quest') {
      var mode = stage.quest && stage.quest.mode;
      p = mode === 'kclep' ? P.kclepQuest(area, stage, ctx) : P.theoryQuest(area, stage, ctx);
    } else if (name === 'exam') { ctx.examEndsAt = S.room.turnAt + ((stage.quest.exam || {}).minutes || 60) * 60000; p = P.examQuest(area, stage, ctx); }
    else if (name === 'raid') {
      var rd = S.room.raid || {};
      if (Date.now() > rd.endsAt) return doneView(area, stage, name, S.cur && S.cur.t && S.cur.t[t] || { score: 0 });
      ctx.raidEndsAt = rd.endsAt; ctx.raidStartAt = rd.startAt; ctx.boss = S.boss;
      ctx.sendDmg = function (d) { return API.post({ a: 's_dmg', code: S.code, sid: S.sid, token: S.token, dmg: d }, 1); };
      p = P.raid(area, stage, ctx);
    }
    if (!p) return;
    p.then(function (res) {
      if (ctx.cancelled && name !== 'raid') return;
      submit(t, res).then(function () { if (!ctx.cancelled) doneView(area, stage, name, S.cur.t[t] || res); });
    });
  }

  function submit(t, res) {
    var body = { a: 's_turn', code: S.code, sid: S.sid, token: S.token, turn: t, score: res.score, acc: res.acc, combo: res.combo || 0, items: res.items, cards: res.cards, dmg: res.dmg };
    return API.post(body).then(function (r) {
      if (!r.ok) { U.toast('저장 실패: ' + U.errMsg(r) + ' — 다시 시도해요'); return U.sleep(2000).then(function () { return submit(t, res); }); }
      var old = S.me; S.me = r.me; S.cur = r.cur;
      if (r.gain) { FX.burst(innerWidth / 2, innerHeight / 2, 40); FX.play('coin'); U.toast('+' + U.fmt(r.gain) + ' XP · +' + Math.floor(r.gain / 10) + ' 골드'); }
      if (r.levelUp) setTimeout(function () { levelUp(r.levelUp); }, 700);
      drawHud(); tick();
      return r;
    });
  }

  function gather(area, stage) {
    return new Promise(function (done) {
      var oath = '오늘도 합격까지 간다';
      area.appendChild(h('div', { class: 'panel', style: 'display:grid;grid-template-columns:200px 1fr;gap:18px;align-items:center' }, [
        h('img', { src: U.bossSrc(stage.id), style: 'width:200px;height:200px;object-fit:contain;filter:drop-shadow(0 10px 20px #000a)', onerror: function () { this.src = 'assets/img/ic/gem.webp'; } }),
        h('div', {}, [
          h('div', { class: 'dim', text: '오늘의 보스' }),
          h('div', { class: 'h', style: 'font-size:34px', text: (stage.boss && stage.boss.name) || '' }),
          h('div', { class: 'muted', style: 'font-style:italic;font-size:18px', text: '“' + ((stage.boss && stage.boss.taunt) || '') + '”' }),
          h('div', { class: 'mission', style: 'margin-top:14px' }, [h('span', { html: U.icon('trophy') }), '오늘의 목표: ' + (stage.goal || '')])
        ])
      ]));
      var ghost = h('div', { class: 'ghost' });
      ghost.innerHTML = P.ghostHtml(oath, '', false).html;
      var inp = P.typeField({ placeholder: '원정대 구호를 치고 Enter', onInput: function (v, c) { ghost.innerHTML = P.ghostHtml(oath, v, c).html; }, onEnter: function (v) {
        if (U.norm(v) !== U.norm(oath)) return U.toast('구호를 그대로 쳐 주세요');
        inp.disabled = true; FX.play('seal'); FX.rain(60); done({ score: 60, acc: 100, items: {} });
      } });
      area.appendChild(h('div', { class: 'spell', style: 'margin-top:16px' }, [h('h3', { text: '원정대 구호' }), h('div', { class: 'muted', text: '구호를 외치며(쳐서) 출발!' }), ghost, inp]));
      setTimeout(function () { inp.focus(); }, 60);
    });
  }

  function doneView(area, stage, name, done) {
    area.innerHTML = '';
    var again = name === 'drill' || name === 'quest' || name === 'spell' || name === 'arcade';
    area.appendChild(h('div', { class: 'panel', style: 'text-align:center;padding:30px' }, [
      h('img', { src: 'assets/img/ic/chest_open.webp', style: 'width:120px' }),
      h('div', { class: 'h', style: 'font-size:34px', text: U.TURN_LABEL[name] + ' 완료!' }),
      h('div', { class: 'muted', style: 'font-size:20px', text: '점수 ' + U.fmt(done.score || 0) + (done.acc != null ? ' · 정확도 ' + done.acc + '%' : '') }),
      h('div', { style: 'margin-top:14px', html: S.cur && S.cur.ready && S.cur.readyTurn === S.room.turn ? '<span class="mint">준비완료! 선생님을 기다려요</span>' : '<b class="gold">아래 [준비완료]를 눌러 주세요</b>' }),
      again ? h('button', { class: 'btn', style: 'margin-top:16px', text: '다시 도전(더 높은 점수만 반영)', onclick: function () { area.innerHTML = ''; run(area, stage, name, S.room.turn, S.ctx = { cancelled: false, onCard: newCard }); } }) : null
    ]));
  }

  // ── 카드 ──
  var seenCards = {};
  function newCard(n) {
    if (seenCards[n] || (S.me && S.me.cards && S.me.cards[n])) return;
    seenCards[n] = 1;
    var a = W.ACCOUNT_BY_NAME[n]; if (!a) return;
    U.toast('새 카드 획득! 「' + n + '」 ' + a.r, 2200);
    if (a.r === 'SR' || a.r === 'SSR') FX.play('seal');
  }
  function cardEl(a, count) {
    var el = h('div', { class: 'card ' + a.r + (count ? '' : ' lock') }, [
      h('span', { class: 'cls cls-' + a.cls, text: a.cls }), h('span', { class: 'rar', text: a.r }),
      h('img', { class: 'art', src: U.cardSrc(a.name), alt: '', onerror: function () { this.src = 'assets/img/ic/scroll.webp'; } }),
      h('div', { class: 'nm', text: a.name }), count ? h('span', { class: 'n', text: '× ' + count }) : null
    ]);
    return el;
  }
  function book() {
    var m = h('div', { class: 'modal', onclick: function (e) { if (e.target === m) m.remove(); } }), box = h('div', { class: 'box' });
    var cards = (S.me && S.me.cards) || {}, have = W.ACCOUNTS.filter(function (a) { return cards[a.name]; }).length;
    box.appendChild(h('div', { class: 'row', style: 'justify-content:space-between' }, [h('div', { class: 'h', style: 'font-size:30px', text: '계정과목 카드 도감' }), h('b', { class: 'gold', text: have + ' / ' + W.ACCOUNTS.length })]));
    box.appendChild(h('div', { class: 'muted', style: 'margin-bottom:10px', text: '문제에서 계정을 맞히면 카드가 모여요. 카드팩으로도 얻을 수 있어요.' }));
    ['자산', '부채', '자본', '수익', '비용'].forEach(function (c) {
      var list = W.ACCOUNTS.filter(function (a) { return a.cls === c; });
      var n = list.filter(function (a) { return cards[a.name]; }).length;
      box.appendChild(h('div', { class: 'h', style: 'font-size:22px;margin:14px 0 8px', html: '<span class="cls cls-' + c + '" style="padding:2px 10px;border-radius:9px">' + c + '</span> ' + n + '/' + list.length }));
      var g = h('div', { class: 'cards' }); list.forEach(function (a) { g.appendChild(cardEl(a, cards[a.name])); }); box.appendChild(g);
    });
    box.appendChild(h('button', { class: 'btn gold', style: 'margin-top:16px', text: '닫기', onclick: function () { m.remove(); } }));
    m.appendChild(box); document.body.appendChild(m);
  }
  function packPool() {
    var names = {}, st = S.stage || {};
    (st.drills || []).concat(st.raid || []).forEach(function (it) { P.itemAccounts(it).forEach(function (n) { names[n] = 1; }); });
    var base = Object.keys(names); if (base.length < 6) base = W.ACCOUNTS.map(function (a) { return a.name; });
    var pool = []; base.forEach(function (n) { var a = W.ACCOUNT_BY_NAME[n]; for (var i = 0; i < (RW[a.r] || 1); i++) pool.push(n); });
    return U.shuffle(pool).slice(0, 80);
  }
  function openPack() {
    if (!S.me) return;
    if (!S.me.packs && S.me.gold < 100) return U.toast('카드팩이 없어요 (100골드로 살 수 있어요)');
    if (!S.me.packs && !confirmBuy()) return;
    API.post({ a: 's_open', code: S.code, sid: S.sid, token: S.token, pool: packPool() }).then(function (r) {
      if (!r.ok) return U.toast(U.errMsg(r));
      var had = S.me.cards || {}; S.me = r.me; drawHud();
      var m = h('div', { class: 'modal' }), box = h('div', { class: 'box', style: 'text-align:center' });
      box.appendChild(h('div', { class: 'h', style: 'font-size:32px', text: '카드팩 개봉!' }));
      var row = h('div', { style: 'display:flex;gap:18px;justify-content:center;margin:20px 0;flex-wrap:wrap' });
      r.cards.forEach(function (n, i) {
        var a = W.ACCOUNT_BY_NAME[n] || { name: n, cls: '자산', r: 'N' };
        var f = h('div', { class: 'flip', style: 'width:170px;height:226px;cursor:pointer' }, [h('div', { class: 'inner' }, [
          h('div', { class: 'face back' }, [h('img', { src: 'assets/img/ic/gem.webp', style: 'width:80px' })]),
          h('div', { class: 'face front' }, [cardEl(a, 1)])
        ])]);
        if (!had[n]) f.appendChild(h('div', { class: 'pill', style: 'position:absolute;margin-top:-14px;background:var(--pink)', text: 'NEW' }));
        f.onclick = function () { if (f.classList.contains('open')) return; f.classList.add('open'); FX.play(a.r === 'SSR' || a.r === 'SR' ? 'lvup' : 'seal'); if (a.r === 'SSR') FX.rain(120); };
        row.appendChild(f);
        setTimeout(function () { f.click(); }, 600 + i * 700);
      });
      box.appendChild(row);
      box.appendChild(h('div', { class: 'row', style: 'justify-content:center' }, [
        h('button', { class: 'btn', text: '도감 보기', onclick: function () { m.remove(); book(); } }),
        (S.me.packs || S.me.gold >= 100) ? h('button', { class: 'btn gold', text: '하나 더 열기', onclick: function () { m.remove(); openPack(); } }) : null,
        h('button', { class: 'btn', text: '닫기', onclick: function () { m.remove(); } })
      ]));
      m.appendChild(box); document.body.appendChild(m);
    });
  }
  function confirmBuy() { return window.confirm('100골드로 카드팩을 살까요?'); }

  function levelUp(lv) {
    FX.play('lvup'); FX.rain(160);
    var m = h('div', { class: 'modal', onclick: function () { m.remove(); } });
    m.appendChild(h('div', { style: 'text-align:center' }, [h('div', { class: 'lvup', text: 'LEVEL UP!' }), h('div', { class: 'h', style: 'font-size:40px', text: 'Lv ' + lv + ' · ' + U.rankTitle(lv) }), h('div', { class: 'muted', style: 'margin-top:10px', text: '(눌러서 닫기)' })]));
    document.body.appendChild(m);
    setTimeout(function () { m.remove(); }, 3500);
  }

  // ── 결과 ──
  function result(area, stage) {
    var r = S.room, f = r.final;
    if (!f) {
      area.appendChild(h('div', { class: 'panel', style: 'text-align:center;padding:40px' }, [h('img', { src: 'assets/img/ic/chest.webp', style: 'width:140px' }), h('div', { class: 'h', style: 'font-size:30px', text: '선생님이 결과를 발표할 거예요' }), h('div', { class: 'muted', text: '잠시만 기다려요…' })]));
      return;
    }
    var pod = h('div', { class: 'podium' });
    [1, 0, 2].forEach(function (i) {
      var p = f.top[i]; if (!p) return;
      pod.appendChild(h('div', { class: 'p' }, [h('img', { class: 'a', src: U.avSrc(p.v) }), h('div', { class: 'h', style: 'font-size:20px', text: p.n }), h('div', { class: 'gold', text: U.fmt(p.s) + '점' }), h('div', { class: 'blk', text: String(i + 1) })]));
    });
    area.appendChild(h('div', { class: 'h', style: 'text-align:center;font-size:34px', text: f.bossCleared ? '보스 처치 성공! 🏆' : '오늘의 순위' }));
    area.appendChild(pod);
    var aw = h('div', { class: 'panel', id: 'myAward' }, [h('div', { class: 'muted', text: '내 보상을 받는 중…' })]);
    area.appendChild(aw);
    area.appendChild(h('div', { class: 'row', style: 'justify-content:center;margin-top:14px' }, [
      h('button', { class: 'btn gold big', html: U.icon('chest') + ' 카드팩 열기', onclick: function () { openPack(); } }),
      h('button', { class: 'btn big', html: U.icon('scroll') + ' 도감', onclick: book })
    ]));
    FX.play('win'); FX.rain(120);
  }
  function claimAward(a) {
    API.post({ a: 's_claim', code: S.code, sid: S.sid, token: S.token }).then(function (r) {
      if (!r.ok) return;
      var before = S.me ? S.me.lv : 1; S.me = r.me; drawHud();
      var box = $('#myAward'); if (!box) return;
      box.innerHTML = '';
      box.appendChild(h('div', { class: 'h', style: 'font-size:26px', text: '내 결과: ' + a.rank + '위 · ' + U.fmt(a.score) + '점' }));
      var badges = (a.badges || []).map(function (k) { var b = U.BADGES[k]; return b ? '<span class="pill" style="margin:4px">' + U.icon(b[1], 's') + ' ' + b[0] + '</span>' : ''; }).join('');
      box.appendChild(h('div', { html: badges }));
      box.appendChild(h('div', { style: 'font-size:22px;margin-top:8px', html: U.icon('gem') + ' +' + a.xp + ' XP &nbsp; ' + U.icon('coin') + ' +' + a.gold + ' 골드 &nbsp; ' + U.icon('chest') + ' 카드팩 ' + a.packs + '개' }));
      FX.burst(innerWidth / 2, innerHeight / 2, 50, 'coin'); FX.play('coin');
      if (S.me.lv > before) setTimeout(function () { levelUp(S.me.lv); }, 900);
    });
  }

  W.Student = { start: start, _S: S };
})(window);
