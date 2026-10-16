/* 전광판(?b=방번호): 교실 앞 프로젝터용 — 읽기만 */
(function (W) {
  'use strict';
  var U = W.U, h = U.h, $ = U.$, API = W.API, FX = W.FX;
  var B = { code: '', s: null, turn: -1, kill: false, poll: 0, lastRanks: {} };
  var root;

  function start(code) {
    B.code = code; root = $('#board'); root.classList.remove('hidden');
    document.addEventListener('pointerdown', function () { FX.unlock(); }, { once: true });
    tick();
  }
  function tick() {
    clearTimeout(B.poll);
    API.get({ a: 'board', code: B.code }).then(function (s) {
      if (s.ok) draw(s); else root.innerHTML = '<div class="bbig">' + U.esc(U.errMsg(s)) + '</div>';
      B.poll = setTimeout(tick, s.ok && s.room.turnName === 'raid' ? 1500 : 2500);
    });
  }
  function studentUrl() { var u = location.origin + location.pathname + '?r=' + B.code; var a = W.App.qs.get('api'); if (API.isLocal && a) u += '&api=' + encodeURIComponent(a); return u; }

  function draw(s) {
    var r = s.room, st = U.stageData(r.stage) || {}, changed = r.turn !== B.turn || (r.ended && !B.ended);
    if (changed) { B.turn = r.turn; B.ended = r.ended; FX.play('turn'); root.innerHTML = ''; build(s, st); }
    update(s, st);
  }

  function header(r, st) {
    return h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:16px' }, [
      h('div', { class: 'row' }, [h('span', { class: 'pill', style: 'background:var(--gold);color:#3a2300;font-size:22px', text: r.stage + '층' }), h('div', { class: 'bbig', style: 'font-size:52px', text: st.title || '' })]),
      h('div', { class: 'pill', style: 'font-size:26px;padding:8px 18px', text: U.TURN_LABEL[r.turnName] })
    ]);
  }

  function build(s, st) {
    var r = s.room; root.appendChild(header(r, st));
    if (r.turnName === 'gather') {
      var qr = h('div', { style: 'background:#fff;padding:12px;border-radius:18px;width:300px;height:300px;margin:0 auto' });
      root.appendChild(h('div', { class: 'brow' }, [
        h('div', { class: 'panel', style: 'text-align:center' }, [
          h('img', { src: U.bossSrc(r.stage), style: 'width:340px;height:340px;object-fit:contain', onerror: function () { this.src = 'assets/img/hero_s.webp'; } }),
          h('div', { class: 'bbig', style: 'font-size:44px', text: (st.boss && st.boss.name) || '' }),
          h('div', { class: 'muted', style: 'font-size:26px;font-style:italic', text: '“' + ((st.boss && st.boss.taunt) || '') + '”' }),
          h('div', { class: 'mission', style: 'margin-top:16px;font-size:24px;justify-content:center', text: '오늘의 목표: ' + (st.goal || '') })
        ]),
        h('div', { class: 'panel', style: 'text-align:center' }, [
          h('div', { class: 'muted', style: 'font-size:28px', text: '방 번호' }), h('div', { class: 'bbig gold', style: 'font-size:130px', text: r.code }), qr,
          h('div', { class: 'muted', style: 'font-size:18px;margin-top:10px;word-break:break-all', text: studentUrl() }),
          h('div', { id: 'bJoined', class: 'bbig', style: 'font-size:46px;margin-top:14px' }), h('div', { id: 'bAvs', style: 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px' })
        ])
      ]));
      try { new W.QRCode(qr, { text: studentUrl(), width: 276, height: 276 }); } catch (e) {}
    } else if (r.turnName === 'raid') {
      root.appendChild(h('div', { style: 'display:grid;grid-template-columns:2fr 1fr;gap:24px' }, [
        h('div', { class: 'raid' }, [
          h('div', { class: 'bbig', style: 'font-size:50px', text: (st.boss && st.boss.name) || '보스' }),
          h('div', { id: 'bTimer', class: 'bbig gold', style: 'font-size:60px' }),
          h('div', { class: 'boss', id: 'bBoss' }, [h('img', { src: U.bossSrc(r.stage), style: 'width:460px;height:460px', onerror: function () { this.src = 'assets/img/hero_s.webp'; } })]),
          h('div', { class: 'hpbar', style: 'height:50px;max-width:900px' }, [h('i', { id: 'bHp' }), h('span', { id: 'bHpTxt', style: 'line-height:46px;font-size:28px' })]),
          h('div', { id: 'bKill', class: 'bbig gold', style: 'font-size:48px;min-height:60px' })
        ]),
        h('div', { class: 'panel' }, [h('div', { class: 'bbig', style: 'font-size:36px;margin-bottom:12px', html: U.icon('bolt', 'l') + ' 피해 순위' }), h('div', { id: 'bRank' })])
      ]));
    } else if (r.turnName === 'result') {
      root.appendChild(h('div', { id: 'bResult' }));
    } else {
      root.appendChild(h('div', { class: 'brow' }, [
        h('div', { class: 'panel', style: 'text-align:center' }, [
          h('div', { class: 'muted', style: 'font-size:30px', text: guideText(r.turnName, st) }),
          h('div', { id: 'bProg', class: 'bbig', style: 'font-size:120px;margin:24px 0' }),
          h('div', { class: 'meter', style: 'height:30px' }, [h('i', { id: 'bMeter' })]),
          h('div', { id: 'bClock', class: 'bbig gold', style: 'font-size:46px;margin-top:20px' }),
          r.turnName === 'spell' ? spellList(st) : null
        ]),
        h('div', { class: 'panel' }, [h('div', { class: 'bbig', style: 'font-size:36px;margin-bottom:12px', html: U.icon('crown', 'l') + ' 실시간 TOP 5' }), h('div', { id: 'bRank' })])
      ]));
    }
  }
  function spellList(st) {
    var box = h('div', { style: 'text-align:left;margin-top:20px' });
    (st.spells || []).forEach(function (sp, i) { box.appendChild(h('div', { style: 'font-size:24px;margin:8px 0' }, [h('b', { class: 'gold', text: (i + 1) + '. ' + sp.title + ' — ' }), sp.keyword])); });
    return box;
  }
  function guideText(t, st) { return { spell: '주문 카드를 읽고 주문을 새기세요', drill: '연습 전투! 콤보를 이어 가세요', arcade: '전산회계 오락실 원정 — 한 판 하고 점수 인증!', quest: st.quest && st.quest.mode === 'kclep' ? 'KcLep 실전 퀘스트' : '기출 실전 퀘스트', exam: '실전 모의고사 진행 중' }[t] || ''; }

  function rankRows(list, key) {
    var box = $('#bRank'); if (!box) return;
    var top = list.slice().sort(function (a, b) { return (b[key] - a[key]); }).slice(0, 5);
    box.innerHTML = '';
    top.forEach(function (o, i) {
      var prev = B.lastRanks[o.sid], up = prev && prev > i + 1;
      box.appendChild(h('div', { class: 'rankrow', style: up ? 'background:rgba(62,230,176,.2)' : '' }, [
        h('b', { class: 'bbig', style: 'font-size:36px;width:40px', text: String(i + 1) }), h('img', { src: U.avSrc(o.v) }),
        h('div', {}, [h('div', { style: 'font-weight:800', text: o.n }), h('div', { class: 'dim', style: 'font-size:16px', text: 'Lv ' + o.lv })]),
        h('div', { class: 's', text: U.fmt(o[key]) })
      ]));
      B.lastRanks[o.sid] = i + 1;
    });
  }

  function update(s, st) {
    var r = s.room;
    if (r.turnName === 'gather') {
      var j = $('#bJoined'); if (j) j.textContent = '입장 ' + s.total + '명';
      var av = $('#bAvs'); if (av) { av.innerHTML = ''; s.list.forEach(function (o) { av.appendChild(h('div', { style: 'text-align:center;width:84px' }, [h('img', { src: U.avSrc(o.v), style: 'width:64px;height:64px' }), h('div', { style: 'font-size:14px', text: o.n })])); }); }
    } else if (r.turnName === 'raid') {
      var b = s.boss || { hp: 0, max: 1 };
      $('#bHp').style.width = (b.hp / Math.max(1, b.max) * 100) + '%';
      $('#bHpTxt').textContent = U.fmt(b.hp) + ' / ' + U.fmt(b.max);
      var sec = Math.max(0, Math.ceil(((r.raid && r.raid.endsAt) - r.now) / 1000));
      var pre = Math.ceil(((r.raid && r.raid.startAt) - r.now) / 1000);
      $('#bTimer').textContent = pre > 0 ? '시작까지 ' + pre : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      var bb = $('#bBoss'); if (B.lastHp != null && b.hp < B.lastHp) { bb.classList.remove('hit'); void bb.offsetWidth; bb.classList.add('hit'); FX.play('hit'); }
      B.lastHp = b.hp;
      if (b.hp <= 0 && !B.kill) { B.kill = true; bb.classList.add('dead'); FX.play('win'); FX.rain(260); $('#bKill').textContent = '보스 처치! 막타: ' + (s.lastHit || ''); }
      rankRows(s.list, 'd');
    } else if (r.turnName === 'result') {
      var box = $('#bResult'); if (!box || box.dataset.done === String(r.ended)) return;
      box.dataset.done = String(r.ended); box.innerHTML = '';
      if (!r.final) { box.appendChild(h('div', { class: 'bbig', style: 'text-align:center;margin-top:120px', text: '결과 발표를 기다리는 중…' })); return; }
      var f = r.final, pod = h('div', { class: 'podium', style: 'transform:scale(1);margin:10px 0 18px' });
      [1, 0, 2].forEach(function (i) { var p = f.top[i]; if (!p) return; pod.appendChild(h('div', { class: 'p' }, [h('img', { class: 'a', src: U.avSrc(p.v) }), h('div', { class: 'h', style: 'font-size:20px', text: p.n }), h('div', { class: 'gold', text: U.fmt(p.s) }), h('div', { class: 'blk', text: String(i + 1) })])); });
      box.appendChild(h('div', { class: 'bbig', style: 'text-align:center;font-size:56px', text: f.bossCleared ? '보스 처치 성공!' : '오늘의 원정 결과' }));
      box.appendChild(pod);
      var grid = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px' });
      (f.awards || []).forEach(function (x) {
        var B = U.BADGES[x.k] || [x.k, 'medal3', ''];
        grid.appendChild(h('div', { class: 'panel', style: 'text-align:center;padding:8px' }, [h('div', { class: 'row', style: 'justify-content:center;gap:6px' }, [h('img', { src: 'assets/img/ic/' + B[1] + '.webp', style: 'width:40px' }), h('div', { class: 'muted', style: 'font-size:19px', text: B[0] })]), h('div', { class: 'row', style: 'justify-content:center;gap:6px' }, [h('img', { src: U.avSrc(x.v), style: 'width:54px;height:54px' }), h('div', { class: 'bbig', style: 'font-size:28px', text: x.n })])]));
      });
      box.appendChild(grid);
      FX.play('win'); FX.rain(300);
    } else {
      var p = $('#bProg'); if (p) p.textContent = s.done + ' / ' + s.total;
      var m = $('#bMeter'); if (m) m.style.width = (s.total ? s.done / s.total * 100 : 0) + '%';
      var c = $('#bClock'); if (c) { var t = Math.max(0, Math.round((r.now - r.turnAt) / 1000)); c.textContent = '준비완료 ' + s.ready + '명 · ' + Math.floor(t / 60) + '분 ' + (t % 60) + '초'; }
      rankRows(s.list, 's');
    }
  }

  W.Board = { start: start };
})(window);
