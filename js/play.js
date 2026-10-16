/* 활동 엔진: 주문 각인(타자)·연습 전투·실전 퀘스트·보스 레이드
 * 모두 Promise 를 돌려주고, 끝나면 {score, acc, combo, items, cards, dmg} 로 끝난다.
 */
(function (W) {
  'use strict';
  var U = W.U, h = U.h, FX = W.FX;
  // 화면이 바뀌면 남은 키 처리기를 모두 지운다(이전 턴 문제의 숫자키가 새 문제에 먹지 않게)
  var keys = [];
  function addKey(f) { keys.push(f); window.addEventListener('keydown', f); }
  function delKey(f) { window.removeEventListener('keydown', f); keys = keys.filter(function (x) { return x !== f; }); }
  function clearKeys() { keys.forEach(function (f) { window.removeEventListener('keydown', f); }); keys = []; }

  // ── 타자 입력칸: 붙여넣기 막기 + 한글 조합 중 Enter 처리 ──
  function typeField(opts) {
    var inp = h('input', { class: 'field', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: opts.placeholder || '', inputmode: opts.numeric ? 'numeric' : null });
    var composing = false, pendingEnter = false;
    function fire() { if (opts.onEnter) opts.onEnter(inp.value); }
    inp.addEventListener('paste', function (e) { e.preventDefault(); U.toast('직접 쳐야 각인돼요! (붙여넣기 금지)'); });
    inp.addEventListener('drop', function (e) { e.preventDefault(); });
    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () { composing = false; if (opts.onInput) opts.onInput(inp.value, false); if (pendingEnter) { pendingEnter = false; setTimeout(fire, 0); } });
    inp.addEventListener('input', function (e) { if (opts.numeric) { var d = inp.value.replace(/[^\d]/g, ''); inp.value = d ? (+d).toLocaleString('ko-KR') : ''; } FX.play('key'); if (opts.onInput) opts.onInput(inp.value, composing || e.isComposing); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (e.isComposing || e.keyCode === 229 || composing) { pendingEnter = true; return; } fire(); }
    });
    return inp;
  }

  // 글자 맞춤 표시(조합 중인 마지막 글자는 회색)
  function ghostHtml(target, typed, composing) {
    var out = '', mis = 0;
    for (var i = 0; i < target.length; i++) {
      var c = target[i], t = typed[i];
      var cc = c === ' ' ? '&nbsp;' : U.esc(c);
      if (t == null) out += '<span class="c">' + cc + '</span>';
      else if (composing && i === typed.length - 1) out += '<span class="c">' + cc + '</span>';
      else if (t === c) out += '<span class="ok">' + cc + '</span>';
      else { out += '<span class="bad">' + cc + '</span>'; mis++; }
    }
    return { html: out, mis: mis };
  }

  // ── 주문 각인 ──
  function spells(box, stage, ctx) {
    return new Promise(function (done) {
      var list = stage.spells || [], i = 0, score = 0, perfect = 0, items = {};
      function next() {
        if (i >= list.length) return finish();
        var sp = list[i], mistakes = 0, lastBad = 0;
        var ghost = h('div', { class: 'ghost' });
        var card = h('div', { class: 'spell' }, [
          h('div', { class: 'no', text: (i + 1) + ' / ' + list.length }),
          h('h3', { text: sp.title }),
          h('div', { class: 'ex', text: sp.explain }),
          sp.tip ? h('div', { class: 'tip', text: '💡 ' + sp.tip }) : null,
          h('div', { class: 'typer' }, [h('div', { class: 'dim', text: '아래 주문을 그대로 쳐서 새기세요' }), ghost])
        ]);
        var inp = typeField({
          placeholder: '여기에 입력하고 Enter',
          onInput: function (v, comp) { var g = ghostHtml(sp.keyword, v, comp); ghost.innerHTML = g.html; if (g.mis > lastBad) mistakes += g.mis - lastBad; lastBad = g.mis; },
          onEnter: function (v) {
            if (U.norm(v) !== U.norm(sp.keyword)) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); FX.play('no'); mistakes++; U.toast('글자가 달라요. 빨간 글자를 고쳐 보세요'); return; }
            var pts = 60 + (mistakes === 0 ? 20 : 0); score += pts; if (!mistakes) perfect++;
            items[stage.id + '-k' + i] = [1, mistakes ? 2 : 1];
            card.classList.add('sealed'); FX.play('seal'); FX.popOn(card, '+' + pts + (mistakes ? '' : ' 완벽!'));
            inp.disabled = true; i++; setTimeout(next, 750);
          }
        });
        card.querySelector('.typer').appendChild(inp);
        ghost.innerHTML = ghostHtml(sp.keyword, '', false).html;
        box.innerHTML = ''; box.appendChild(h('div', { class: 'mission' }, [h('span', { html: U.icon('scroll') }), '주문을 모두 새기면 이번 턴 미션 완료!'])); box.appendChild(h('div', { style: 'height:14px' }));
        box.appendChild(card); setTimeout(function () { inp.focus(); }, 50);
      }
      function finish() {
        var acc = list.length ? Math.round(perfect / list.length * 100) : 100;
        done({ score: score, acc: acc, items: items, combo: perfect });
      }
      next();
    });
  }

  // ── 문항 하나 그리기 ──
  var KIND = { acct: '계정과목 쓰기', cls: '분류 쓰기', side: '차변? 대변?', journal: '전표 입력', num: '계산', choice: '고르기', phrase: '따라 치기' };

  function partnerNeeded(acct) { return (W.PARTNER_ACCOUNTS || []).indexOf(acct) >= 0; }
  function canon(name) { var n = String(name || '').replace(/\s+/g, '').replace(/\(판\)$/, ''); return (W.ACCOUNT_ALIAS || {})[n] || n; }

  function checkSimple(it, v) {
    if (it.k === 'num') return +String(v).replace(/[^\d-]/g, '') === +it.a;
    if (it.k === 'acct') { var arr = Array.isArray(it.a) ? it.a : [it.a]; return arr.some(function (x) { return canon(x) === canon(v); }); }
    if (it.k === 'side') { var s = U.norm(v); return s === U.norm(it.a) || (s.length === 1 && it.a.indexOf(s) === 0); }
    if (it.k === 'phrase') return U.norm(v) === U.norm(it.q);
    return U.norm(v) === U.norm(it.a);
  }
  function answerText(it) {
    if (it.k === 'acct') return Array.isArray(it.a) ? it.a[0] : it.a;
    if (it.k === 'num') return U.fmt(it.a);
    if (it.k === 'phrase') return it.q;
    if (it.k === 'choice') return it.opts[it.a];
    return String(it.a);
  }
  function itemAccounts(it) {
    var out = [];
    if (it.k === 'acct') out.push(answerText(it));
    if (it.k === 'cls' && W.ACCOUNT_BY_NAME[it.q]) out.push(it.q);
    if (it.k === 'side' && it.acct) out.push(it.acct);
    if (it.k === 'journal') (it.dr || []).concat(it.cr || []).forEach(function (l) { out.push(canon(l[0])); });
    return out.filter(function (n) { return W.ACCOUNT_BY_NAME[n]; });
  }

  // KcLep 일반전표입력 화면을 닮은 표 (2026-10-16 실습실 캡처 K10b·K11·K12 기준)
  //  구분 1.출금 2.입금 3.차변 4.대변 을 직접 치고, 계정과목은 이름을 치고 Enter → 계정코드도움 창에서 고른다.
  //  출금 = (차) 계정 / (대) 현금, 입금 = (차) 현금 / (대) 계정 으로 채점(출금전표 정답도 인정).
  var GUBUN = { '1': '출금', '2': '입금', '3': '차변', '4': '대변' };
  function code4(a) { return a ? String(a.code).padStart(4, '0') : ''; }
  function slip(it, opts) {
    opts = opts || {};
    var day = (String(it.q || '').match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/) || [])[2] || '';
    var mon = (String(it.q || '').match(/(\d{1,2})\s*월/) || [])[1] || '';
    var rows = [], tbody = h('tbody'), help = null, tip = h('span', { text: '구분을 입력하세요. 1.출금, 2.입금, 3.차변, 4.대변' });
    var diffEl = h('span', { class: 'kdiff' }), tDr = h('td', { class: 'num' }), tCr = h('td', { class: 'num' });
    function setTip(t) { tip.textContent = t; }
    function addRow() {
      var g = h('input', { class: 'g', maxlength: 1, inputmode: 'numeric', autocomplete: 'off' });
      var gl = h('span', { class: 'gl' });
      var acode = h('span', { class: 'cd' }), acc = h('input', { class: 'acc', autocomplete: 'off' });
      var pcode = h('span', { class: 'cd' }), par = h('input', { class: 'par', autocomplete: 'off' });
      var dr = h('input', { class: 'amt', inputmode: 'numeric', autocomplete: 'off' }), cr = h('input', { class: 'amt', inputmode: 'numeric', autocomplete: 'off' });
      var drCell = h('td', { class: 'num' }, [dr]), crCell = h('td', { class: 'num' }, [cr]);
      var tr = h('tr', {}, [
        h('td', { class: 'c day', text: day }), h('td', { class: 'c no', text: day ? '00001' : '' }),
        h('td', { class: 'c gub' }, [g, gl]),
        h('td', { class: 'cdc' }, [acode]), h('td', { class: 'nm' }, [acc]),
        h('td', { class: 'cdc' }, [pcode]), h('td', { class: 'nm' }, [par]),
        h('td', { class: 'memo' }), drCell, crCell
      ]);
      var r = { tr: tr, g: g, gl: gl, acc: acc, acode: acode, par: par, pcode: pcode, dr: dr, cr: cr, drCell: drCell, crCell: crCell };
      [g, acc, par, dr, cr].forEach(function (x) {
        x.addEventListener('paste', function (e) { e.preventDefault(); U.toast('직접 쳐야 각인돼요!'); });
        x.addEventListener('focus', function () { rows.forEach(function (q) { q.tr.classList.remove('on'); }); tr.classList.add('on'); });
      });
      g.addEventListener('focus', function () { setTip('구분을 입력하세요. 1.출금, 2.입금, 3.차변, 4.대변'); });
      acc.addEventListener('focus', function () { setTip('계정코드를 입력하세요. 기능키F2-도움창, 명입력후 엔터-도움창'); });
      par.addEventListener('focus', function () { setTip('거래처를 입력하세요. 채권·채무(외상매출금·미지급금 등)는 거래처가 꼭 있어야 해요'); });
      dr.addEventListener('focus', function () { setTip('금액을 입력하세요.'); }); cr.addEventListener('focus', function () { setTip('금액을 입력하세요.'); });
      g.addEventListener('input', function () {
        g.value = g.value.replace(/[^1-4]/g, '').slice(0, 1); FX.play('key');
        applyG(r);
        if (g.value) acc.focus();
      });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (g.value) acc.focus(); else if (rowFilled(prev(r)) && opts.onEnter) opts.onEnter(); } });
      acc.addEventListener('input', function () { r.acode.textContent = ''; FX.play('key'); });
      acc.addEventListener('keydown', function (e) {
        if (e.key === 'F2') { e.preventDefault(); openHelp(r); return; }
        if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
          e.preventDefault();
          var v = canon(acc.value);
          if (!v) return;
          if (/^\d{1,4}$/.test(v)) { var byCode = W.ACCOUNTS.filter(function (a) { return a.code === +v; })[0]; if (byCode) { setAcc(r, byCode); return nextFrom(r, 'acc'); } }
          openHelp(r);
        }
      });
      par.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (par.value.trim()) pcode.textContent = '0' + (1000 + (hashName(par.value) % 9000)); nextFrom(r, 'par'); } });
      [dr, cr].forEach(function (x) {
        x.addEventListener('input', function () { var d = x.value.replace(/[^\d]/g, ''); x.value = d ? (+d).toLocaleString('ko-KR') : ''; total(); });
        x.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); nextFrom(r, 'amt'); } });
      });
      rows.push(r); tbody.appendChild(tr); applyG(r);
      return r;
    }
    function hashName(s) { var h2 = 0; for (var i = 0; i < s.length; i++) h2 = (h2 * 31 + s.charCodeAt(i)) >>> 0; return h2; }
    function prev(r) { var i = rows.indexOf(r); return rows[i - 1]; }
    function rowFilled(r) { return r && r.g.value && canon(r.acc.value) && amtOf(r) > 0; }
    function amtOf(r) { var x = (r.g.value === '1' || r.g.value === '3') ? r.dr : r.cr; return +x.value.replace(/[^\d]/g, '') || 0; }
    function applyG(r) {
      var g = r.g.value;
      r.gl.textContent = GUBUN[g] || '';
      r.tr.dataset.g = g;
      var drOn = g === '1' || g === '3', crOn = g === '2' || g === '4';
      r.dr.disabled = !drOn; r.cr.disabled = !crOn;
      r.dr.placeholder = g === '2' ? '(현금)' : ''; r.cr.placeholder = g === '1' ? '(현금)' : '';
      if (!drOn) r.dr.value = ''; if (!crOn) r.cr.value = '';
      total();
    }
    function setAcc(r, a) { r.acc.value = a.name; r.acode.textContent = code4(a); FX.play('tick'); }
    function nextFrom(r, field) {
      if (field === 'acc') { if (partnerNeeded(canon(r.acc.value))) return r.par.focus(); field = 'par'; }
      if (field === 'par') { var x = (r.g.value === '1' || r.g.value === '3') ? r.dr : r.cr; if (!x.disabled) return x.focus(); }
      // 금액 다음 → 다음 줄 구분(없으면 새 줄)
      var i = rows.indexOf(r), nx = rows[i + 1] || addRow();
      nx.g.focus();
    }
    // 계정코드도움 창
    function openHelp(r) {
      closeHelp();
      var q = h('input', { class: 'hq', value: canon(r.acc.value), autocomplete: 'off' });
      var list = h('tbody'), idx = 0, items = [];
      function fill() {
        var v = canon(q.value);
        items = W.ACCOUNTS.filter(function (a) { return !v || a.name.indexOf(v) >= 0 || String(a.code).indexOf(v.replace(/^0+/, '')) === 0; }).slice(0, 12);
        list.innerHTML = ''; idx = 0;
        items.forEach(function (a, k) { list.appendChild(h('tr', { class: k === 0 ? 'on' : '', onmousedown: function (e) { e.preventDefault(); idx = k; pick(); } }, [h('td', { text: code4(a) }), h('td', { text: a.name }), h('td', { text: '' })])); });
        if (!items.length) list.appendChild(h('tr', {}, [h('td', { colspan: 3, style: 'text-align:center;color:#888', text: '찾는 계정이 없어요' })]));
      }
      function mv(d) { if (!items.length) return; idx = (idx + d + items.length) % items.length; U.$$('tr', list).forEach(function (x, k) { x.classList.toggle('on', k === idx); }); }
      function pick() { var a = items[idx]; if (!a) return; setAcc(r, a); closeHelp(); nextFrom(r, 'acc'); }
      q.addEventListener('input', fill);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); mv(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mv(-1); }
        else if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); pick(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeHelp(); r.acc.focus(); }
      });
      help = h('div', { class: 'khelp' }, [
        h('div', { class: 'kht' }, [h('b', { text: '계정코드도움' }), h('span', { class: 'x', text: '✕', onmousedown: function (e) { e.preventDefault(); closeHelp(); r.acc.focus(); } })]),
        h('div', { class: 'khs' }, [h('span', { class: 'sel', text: '전체' }), q]),
        h('div', { class: 'khl' }, [h('table', {}, [h('thead', {}, [h('tr', {}, [h('th', { text: '코드' }), h('th', { text: '계정명' }), h('th', { text: '참고' })])]), list])]),
        h('div', { class: 'khb' }, [h('span', { text: '확인(Enter)' }), h('span', { text: '취소(Esc)' })])
      ]);
      wrap.appendChild(help); fill(); setTimeout(function () { q.focus(); }, 0);
    }
    function closeHelp() { if (help) { help.remove(); help = null; } }
    function total() {
      var d = 0, c = 0;
      rows.forEach(function (r) { var g = r.g.value, v = amtOf(r); if (!v) return; if (g === '3') d += v; else if (g === '4') c += v; else if (g === '1' || g === '2') { d += v; c += v; } });
      tDr.textContent = d ? d.toLocaleString('ko-KR') : ''; tCr.textContent = c ? c.toLocaleString('ko-KR') : '';
      diffEl.textContent = d === c ? '' : (d - c).toLocaleString('ko-KR');
    }
    for (var i = 0; i < 4; i++) addRow();
    var table = h('table', { class: 'kgrid' }, [
      h('thead', {}, [h('tr', {}, ['일', '번호', '구분', '계 정 과 목', '', '거 래 처', '', '적 요', '차 변', '대 변'].map(function (t, k) { return h('th', { text: t, colspan: (k === 3 || k === 5) ? 2 : null }); }).filter(function (x, k) { return k !== 4 && k !== 6; }))]),
      tbody,
      h('tfoot', {}, [h('tr', {}, [h('td', { colspan: 8, class: 'c', text: '합          계' }), tDr, tCr])])
    ]);
    var wrap = h('div', { class: 'kclep' }, [
      h('div', { class: 'ktitle' }, [h('b', { text: '일반전표입력' }), h('span', { class: 'kco', text: '1184 레이드상사  ·  2024-01-01~2024-12-31' })]),
      h('div', { class: 'ktool' }, ['닫기', '코드', '삭제', '인쇄', '조회'].map(function (t) { return h('span', { text: t }); })),
      h('div', { class: 'kdate' }, [h('span', { class: 'box', text: '2024' }), ' 년 ', h('span', { class: 'box', text: mon || '  ' }), ' 월 ', h('span', { class: 'box', text: day || '  ' }), ' 일', h('span', { style: 'margin-left:18px', text: '대차차액:' }), diffEl]),
      h('div', { class: 'kbody' }, [table]),
      h('div', { class: 'ktip' }, [h('b', { text: 'Tip' }), tip])
    ]);
    var more = h('div', { class: 'row', style: 'margin-top:8px;gap:8px;flex-wrap:wrap' }, [
      h('button', { class: 'btn', text: '+ 줄 추가', onclick: function () { addRow().g.focus(); } }),
      h('span', { class: 'dim', style: 'font-size:14px', text: '구분 숫자 → 계정 이름 치고 Enter(코드도움) → 금액 Enter → 다음 줄. 출금·입금은 현금 줄을 따로 안 써요.' })
    ]);
    total();
    function lines() {
      var out = { dr: [], cr: [] };
      rows.forEach(function (r) {
        var g = r.g.value, a = canon(r.acc.value), v = amtOf(r), p = r.par.value.trim();
        if (!g && !a && !v) return;
        var L = { a: a, v: v, p: p, r: r };
        if (g === '3') out.dr.push(L); else if (g === '4') out.cr.push(L);
        else if (g === '1') { out.dr.push(L); out.cr.push({ a: '현금', v: v, p: '', r: r, auto: true }); }
        else if (g === '2') { out.cr.push(L); out.dr.push({ a: '현금', v: v, p: '', r: r, auto: true }); }
        else out.dr.push({ a: a, v: v, p: p, r: r, bad: true });
      });
      return out;
    }
    function grade() {
      var got = lines(), msgs = [], ok = true;
      ['dr', 'cr'].forEach(function (side) {
        var exp = (it[side] || []).map(function (l) { return { a: canon(l[0]), v: +l[1], p: l[2] || '' }; });
        var used = {};
        got[side].forEach(function (g) {
          if (g.bad) { ok = false; g.r.tr.classList.add('bad'); msgs.push('구분(1~4)을 먼저 입력하세요'); return; }
          var k = -1;
          exp.forEach(function (e, idx) { if (k < 0 && !used[idx] && e.a === g.a && e.v === g.v) k = idx; });
          if (k >= 0) {
            used[k] = 1;
            var e = exp[k];
            if (e.p && partnerNeeded(e.a) && !g.p && !g.auto) { ok = false; msgs.push(e.a + ' 줄에 거래처(' + e.p + ')를 빼먹었어요 — 시험에선 감점!'); g.r.tr.classList.add('bad'); }
            else if (!g.auto) g.r.tr.classList.add('good');
          } else { ok = false; g.r.tr.classList.add('bad'); }
        });
        if (Object.keys(used).length !== exp.length) ok = false;
      });
      if (!ok && diffEl.textContent) msgs.push('대차차액 ' + diffEl.textContent + ' — 차변 합계와 대변 합계가 달라요');
      if (!ok) rows.forEach(function (r) { if (r.g.value === '1' && it.dr && it.dr.length + (it.cr || []).length > 2) msgs.push('여러 줄 거래는 출금전표(1)가 아니라 차변(3)·대변(4)으로!'); });
      return { ok: ok, msgs: msgs.filter(function (m, i, a) { return a.indexOf(m) === i; }) };
    }
    function focus() { rows[0].g.focus(); }
    return { el: h('div', {}, [wrap, more]), grade: grade, focus: focus, hideHelp: closeHelp, clearMarks: function () { rows.forEach(function (r) { r.tr.classList.remove('bad', 'good'); }); } };
  }
  function entryHtml(it) {
    function line(l) { return '<b>' + U.esc(l[0]) + '</b>' + (l[2] ? '(' + U.esc(l[2]) + ')' : '') + ' ' + U.fmt(l[1]); }
    return '(차) ' + (it.dr || []).map(line).join(', ') + ' &nbsp;/&nbsp; (대) ' + (it.cr || []).map(line).join(', ');
  }

  // 문항 하나를 풀게 하고 {ok, tries, ms} 로 끝남. 틀리면 정답을 직접 쳐야 넘어간다(각인).
  function askItem(box, it, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var t0 = Date.now(), tries = 0, firstOk = null;
      var qEl = h('div', { class: 'q', text: it.k === 'phrase' ? '따라 치세요: ' + it.q : it.q });
      var card = h('div', { class: 'qcard' }, [h('span', { class: 'kind', text: KIND[it.k] || '' }), qEl]);
      if (it.k === 'side' && it.acct) qEl.appendChild(h('div', { class: 'gold', style: 'font-size:20px;margin-top:6px', text: '→ ' + it.acct + ' 은(는) 차변? 대변?' }));
      if (it.k === 'cls') qEl.textContent = '「' + it.q + '」 은(는) 자산·부채·자본·수익·비용 중?';
      var whyBox = h('div', { class: 'why hidden' });
      box.appendChild(card);
      function fail(extra) {
        tries++; if (firstOk == null) firstOk = false;
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); FX.play('no');
        whyBox.classList.remove('hidden');
        if (opts.onWrong) opts.onWrong();
        return extra;
      }
      function pass() { if (firstOk == null) firstOk = true; resolve({ ok: firstOk, tries: tries + 1, ms: Date.now() - t0 }); }

      if (it.k === 'choice') {
        var ob = h('div', { class: 'opts' });
        var answered = false;
        it.opts.forEach(function (o, k) {
          var b = h('button', { html: '<span class="k">' + (k + 1) + '</span>' + U.esc(o), onclick: function () { pick(k); } });
          ob.appendChild(b);
        });
        function pick(k) {
          if (answered) return; answered = true;
          var bs = U.$$('button', ob);
          bs[it.a].classList.add('ok');
          if (k === it.a) { FX.play('ok'); delKey(kd); setTimeout(pass, opts.fast ? 250 : 500); return; }
          bs[k].classList.add('no'); fail();
          whyBox.innerHTML = '정답: <b>' + U.esc(it.opts[it.a]) + '</b><br>' + U.esc(it.why || '');
          var go = h('button', { class: 'btn gold', style: 'margin-top:12px', text: '알겠어요 (Enter)', onclick: function () { delKey(kd); resolve({ ok: false, tries: 2, ms: Date.now() - t0 }); } });
          card.appendChild(go); setTimeout(function () { go.focus(); }, 30);
        }
        function kd(e) { if (!answered && e.key >= '1' && e.key <= String(it.opts.length)) pick(+e.key - 1); }
        addKey(kd);
        card.appendChild(ob); card.appendChild(whyBox);
        return;
      }
      if (it.k === 'journal') {
        var sl = slip(it, { onEnter: function () { check(); } });
        var btn = h('button', { class: 'btn gold', style: 'margin-top:10px', text: '전표 확인 (Enter)', onclick: function () { check(); } });
        card.appendChild(sl.el); card.appendChild(btn); card.appendChild(whyBox);
        var phase = 0;
        function check() {
          sl.hideHelp(); sl.clearMarks();
          var g = sl.grade();
          if (g.ok) { FX.play('ok'); btn.disabled = true; setTimeout(pass, 350); return; }
          fail();
          whyBox.innerHTML = (g.msgs.length ? '<div>' + g.msgs.map(U.esc).join('<br>') + '</div>' : '') + '정답 ▶ ' + entryHtml(it) + '<br>' + U.esc(it.why || '') + (phase === 0 ? '<br><span class="gold">정답대로 다시 입력해 보세요.</span>' : '');
          phase++;
        }
        setTimeout(sl.focus, 60);
        return;
      }
      // 타이핑형(acct·cls·side·num·phrase)
      var inp = typeField({
        numeric: it.k === 'num', placeholder: it.k === 'num' ? '숫자 입력 후 Enter' : '입력 후 Enter',
        onEnter: function (v) {
          if (!String(v).trim()) return;
          if (checkSimple(it, v)) { FX.play('ok'); inp.disabled = true; setTimeout(pass, opts.fast ? 120 : 260); return; }
          fail();
          whyBox.innerHTML = '정답: <b>' + U.esc(answerText(it)) + '</b><br>' + U.esc(it.why || '') + '<br><span class="gold">정답을 직접 쳐서 각인하세요.</span>';
          inp.value = ''; inp.focus();
        }
      });
      card.appendChild(h('div', { style: 'margin-top:14px' }, [inp])); card.appendChild(whyBox);
      setTimeout(function () { inp.focus(); }, 40);
    });
  }

  // ── 연습 전투 ──
  function drill(box, stage, ctx) {
    var list = stage.drills || [];
    var score = 0, combo = 0, best = 0, right = 0, items = {}, cards = {};
    var foe = h('div', { class: 'foe' }, [h('img', { src: U.bossSrc(stage.id), alt: '', onerror: function () { this.src = 'assets/img/ic/gem.webp'; } }), h('div', { class: 'nm', text: (stage.boss && stage.boss.name ? stage.boss.name + '의 부하' : '훈련용 허수아비') }), h('div', { class: 'combo' })]);
    var prog = h('div', { class: 'progress' }, list.map(function () { return h('i'); }));
    var area = h('div');
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'mission' }, [h('span', { html: U.icon('fire') }), '연속으로 맞히면 콤보! 틀리면 정답을 직접 쳐야 넘어가요']));
    box.appendChild(prog);
    box.appendChild(h('div', { class: 'arena' }, [foe, area]));
    var comboEl = foe.querySelector('.combo');
    return list.reduce(function (p, it, i) {
      return p.then(function () {
        U.$$('i', prog)[i].className = 'now';
        area.innerHTML = '';
        return askItem(area, it, { onWrong: function () { combo = 0; comboEl.textContent = ''; } }).then(function (r) {
          var id = stage.id + '-d' + i;
          items[id] = [r.ok ? 1 : 0, r.tries];
          U.$$('i', prog)[i].className = r.ok ? 'ok' : 'no';
          if (r.ok) {
            combo++; best = Math.max(best, combo); right++;
            var mult = 1 + 0.1 * Math.min(combo - 1, 10);
            var fast = r.ms < (it.k === 'journal' ? 45000 : 9000) ? 10 : 0;
            var pts = Math.round(50 * mult) + fast; score += pts;
            foe.classList.remove('hit'); void foe.offsetWidth; foe.classList.add('hit'); FX.play('hit');
            FX.popOn(foe, '+' + pts + (fast ? ' 빠름!' : ''));
            if (combo >= 3) { comboEl.innerHTML = U.icon('fire') + ' ' + combo + ' 콤보'; FX.play('combo', combo); }
            itemAccounts(it).forEach(function (n) { cards[n] = 1; if (ctx && ctx.onCard) ctx.onCard(n); });
          }
          if (ctx && ctx.onProgress) ctx.onProgress({ score: score, i: i + 1, n: list.length });
          return U.sleep(220);
        });
      });
    }, Promise.resolve()).then(function () {
      return { score: score, acc: list.length ? Math.round(right / list.length * 100) : 100, combo: best, items: items, cards: Object.keys(cards) };
    });
  }

  // ── 실전 퀘스트: 이론 ──
  function theoryQuest(box, stage, ctx) {
    var ids = (stage.quest && stage.quest.theoryIds) || [];
    var qs = ids.map(function (id) { return (W.THEORY || {})[id]; }).filter(Boolean);
    var score = 0, right = 0, items = {};
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'mission' }, [h('span', { html: U.icon('medal1') }), '진짜 기출 문제! 숫자키 1~4로 고르세요 · 틀리면 핵심어를 쳐서 각인']));
    var prog = h('div', { class: 'progress' }, qs.map(function () { return h('i'); }));
    var area = h('div'); box.appendChild(prog); box.appendChild(area);
    return qs.reduce(function (p, q, i) {
      return p.then(function () {
        U.$$('i', prog)[i].className = 'now'; area.innerHTML = '';
        return new Promise(function (resolve) {
          var card = h('div', { class: 'qcard' }, [h('span', { class: 'kind', text: q.source + ' · ' + (q.topicName || '') }), h('div', { class: 'q', text: q.stem })]);
          if (q.extra) card.appendChild(h('pre', { style: 'white-space:pre-wrap;font-family:inherit;background:rgba(0,0,0,.25);padding:10px 12px;border-radius:10px;font-size:16px', text: q.extra }));
          var ob = h('div', { class: 'opts' }), why = h('div', { class: 'why hidden' }), answered = false;
          q.options.forEach(function (o, k) { ob.appendChild(h('button', { html: '<span class="k">' + (k + 1) + '</span>' + U.esc(o), onclick: function () { pick(k + 1); } })); });
          card.appendChild(ob); card.appendChild(why); area.appendChild(card);
          function kd(e) { if (!answered && e.key >= '1' && e.key <= '4') pick(+e.key); }
          addKey(kd);
          function pick(k) {
            if (answered) return; answered = true; delKey(kd);
            var bs = U.$$('button', ob); bs[q.answer - 1].classList.add('ok');
            if (k === q.answer) {
              right++; score += 90; FX.play('ok'); FX.popOn(card, '+90');
              items[stage.id + '-q' + i] = [1, 1];
              why.classList.remove('hidden'); why.style.background = 'rgba(62,230,176,.12)'; why.style.borderColor = 'rgba(62,230,176,.4)';
              why.innerHTML = '<b>정답!</b> ' + U.esc(q.explanation || '');
              var go = h('button', { class: 'btn gold', style: 'margin-top:12px', text: '다음 (Enter)', onclick: function () { resolve(); } });
              card.appendChild(go); setTimeout(function () { go.focus(); }, 30);
              return;
            }
            bs[k - 1].classList.add('no'); FX.play('no'); items[stage.id + '-q' + i] = [0, 2];
            why.classList.remove('hidden');
            var kw = (q.concept || '').trim();
            why.innerHTML = '정답은 <b>' + q.answer + '번</b>. ' + U.esc(q.explanation || '') + (q.conceptExplain ? '<div style="margin-top:8px" class="muted">' + U.esc(q.conceptExplain) + '</div>' : '');
            if (kw) {
              var ghost = h('div', { class: 'ghost', style: 'font-size:22px;margin-top:10px' });
              ghost.innerHTML = ghostHtml(kw, '', false).html;
              var inp = typeField({ placeholder: '핵심어: ' + kw, onInput: function (v, c) { ghost.innerHTML = ghostHtml(kw, v, c).html; }, onEnter: function (v) { if (U.norm(v) === U.norm(kw)) { FX.play('seal'); score += 20; resolve(); } else { U.toast('핵심어를 그대로 쳐 주세요'); } } });
              card.appendChild(h('div', { class: 'dim', style: 'margin-top:12px', text: '핵심어를 쳐서 각인하면 다음 문제로 (+20)' })); card.appendChild(ghost); card.appendChild(inp);
              setTimeout(function () { inp.focus(); }, 30);
            } else {
              var go2 = h('button', { class: 'btn gold', style: 'margin-top:12px', text: '알겠어요 (Enter)', onclick: function () { resolve(); } });
              card.appendChild(go2); setTimeout(function () { go2.focus(); }, 30);
            }
          }
        }).then(function () { U.$$('i', prog)[i].className = items[stage.id + '-q' + i][0] ? 'ok' : 'no'; });
      });
    }, Promise.resolve()).then(function () {
      return { score: score, acc: qs.length ? Math.round(right / qs.length * 100) : 100, items: items, combo: right };
    });
  }

  // ── 실전 퀘스트: KcLep ──
  function kclepQuest(box, stage, ctx) {
    var k = stage.quest.kclep || {};
    var score = 0, items = {}, verified = 0;
    return new Promise(function (done) {
      box.innerHTML = '';
      box.appendChild(h('div', { class: 'mission' }, [h('span', { html: U.icon('key') }), 'KcLep 실전! 순서대로 하고, 결과 숫자를 적어 인증하세요']));
      var left = h('div', { class: 'qcard' }, [h('span', { class: 'kind', text: '메뉴: ' + (k.menu || '') + ' · 데이터 ' + (k.data || '') + '회' })]);
      var ol = h('ol', { style: 'font-size:19px;line-height:1.8;padding-left:22px' });
      (k.steps || []).forEach(function (s, i) {
        var cb = h('input', { type: 'checkbox', style: 'width:20px;height:20px;margin-right:8px;vertical-align:middle' });
        cb.addEventListener('change', function () { if (cb.checked) { FX.play('tick'); score += 10; } });
        ol.appendChild(h('li', {}, [h('label', {}, [cb, s])]));
      });
      left.appendChild(ol);
      if (k.items && k.items.length) {
        var tasks = h('div', { style: 'margin-top:8px' });
        k.items.forEach(function (x) { tasks.appendChild(h('div', { class: 'panel', style: 'margin-top:8px;padding:12px;font-size:17px' }, [h('b', { class: 'gold', text: (x.ref || '') + ' ' }), x.q || ''])); });
        left.appendChild(h('div', { class: 'h', style: 'margin-top:10px;font-size:20px', text: '입력할 문제' })); left.appendChild(tasks);
      }
      var right = h('div', { class: 'qcard', style: 'margin-top:14px' }, [h('span', { class: 'kind', text: '인증' })]);
      (k.verify || []).forEach(function (v, i) {
        var res = h('span', { style: 'margin-left:8px;font-weight:800' });
        var row = h('div', { style: 'margin-top:12px' }, [h('div', { style: 'font-size:18px;font-weight:700', text: (i + 1) + '. ' + v.q })]);
        if (v.a == null || v.a === '') {
          row.appendChild(h('div', { class: 'dim', text: '이 문항은 선생님이 화면을 보고 인정해 줘요(손 들기)' }));
        } else {
          var numeric = /^[\d,]+$/.test(String(v.a));
          var inp = typeField({ numeric: numeric, placeholder: numeric ? '숫자' : '답', onEnter: function (val) {
            var nw = function (x) { return U.norm(x).replace(/[원\-\/]/g, ''); };
            var ok = numeric ? (+String(val).replace(/[^\d]/g, '') === +String(v.a).replace(/[^\d]/g, '')) : nw(val).indexOf(nw(v.a)) >= 0;
            items[stage.id + '-v' + i] = [ok ? 1 : 0, ((items[stage.id + '-v' + i] || [0, 0])[1] || 0) + 1];
            if (ok) { inp.disabled = true; res.textContent = '인증 완료!'; res.className = 'mint'; FX.play('seal'); score += 150; verified++; FX.popOn(inp, '+150'); }
            else { res.textContent = '다시 확인!'; res.className = 'red'; FX.play('no'); }
          } });
          row.appendChild(h('div', { class: 'row', style: 'margin-top:6px' }, [inp, res]));
        }
        right.appendChild(row);
      });
      var fin = h('button', { class: 'btn gold big', style: 'margin-top:16px', text: '퀘스트 제출', onclick: function () {
        fin.disabled = true;
        var nv = (k.verify || []).filter(function (v) { return v.a != null && v.a !== ''; }).length;
        done({ score: score + 100, acc: nv ? Math.round(verified / nv * 100) : 100, items: items });
      } });
      box.appendChild(left); box.appendChild(right); box.appendChild(fin);
    });
  }

  // ── 실전 모의고사(이론 OMR + 조회 답) ──
  function examQuest(box, stage, ctx) {
    var ex = (stage.quest && stage.quest.exam) || stage.quest || {};
    var key = ex.theory || [], prac = ex.practiceAnswers || [];
    return new Promise(function (done) {
      var sel = {}, end = (ctx && ctx.examEndsAt) || (Date.now() + (ex.minutes || 60) * 60000);
      box.innerHTML = '';
      var timer = h('div', { class: 'bbig gold', style: 'font-size:48px' });
      box.appendChild(h('div', { class: 'row', style: 'justify-content:space-between' }, [h('div', { class: 'mission', html: U.icon('timer') + ' KcLep에서 ' + (ex.data || '') + '회를 풀고, 이론 답과 문제7 답을 여기에도 적어요' }), timer]));
      var omr = h('div', { class: 'panel', style: 'margin-top:14px' }, [h('div', { class: 'h', style: 'font-size:22px', text: '이론 답안 (1~15)' })]);
      var grid = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:10px' });
      for (var i = 1; i <= 15; i++) (function (n) {
        var row = h('div', { class: 'row', style: 'gap:6px' }, [h('b', { style: 'width:28px', text: n + '.' })]);
        [1, 2, 3, 4].forEach(function (c) {
          var b = h('button', { class: 'pill', text: '①②③④'[c - 1], onclick: function () { sel[n] = c; U.$$('button', row).forEach(function (x, k) { x.style.background = k + 1 === c ? 'var(--gold)' : ''; x.style.color = k + 1 === c ? '#3a2300' : ''; }); FX.play('tick'); } });
          row.appendChild(b);
        });
        grid.appendChild(row);
      })(i);
      omr.appendChild(grid); box.appendChild(omr);
      var pr = h('div', { class: 'panel', style: 'margin-top:14px' }, [h('div', { class: 'h', style: 'font-size:22px', text: '문제7 조회 답' })]);
      var pin = prac.map(function (a, i) { var f = h('input', { class: 'field', placeholder: '[' + (i + 1) + '] 답', style: 'margin-top:8px;font-size:18px' }); pr.appendChild(f); return f; });
      if (prac.length) box.appendChild(pr);
      var submit = h('button', { class: 'btn gold big', style: 'margin-top:16px', text: '답안 저장(제출)', onclick: function () { finish(); } });
      box.appendChild(submit);
      var iv = setInterval(function () {
        if (ctx && ctx.cancelled) { clearInterval(iv); return; }
        var s = Math.max(0, Math.round((end - Date.now()) / 1000));
        timer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
        if (s <= 0) finish();
      }, 500);
      var finished = false;
      function finish() {
        if (finished) return; finished = true; clearInterval(iv); submit.disabled = true;
        var right = 0, items = {};
        key.forEach(function (a, i) { var ok = sel[i + 1] === +a; if (ok) right++; items[stage.id + '-t' + (i + 1)] = [ok ? 1 : 0, 1]; });
        var pr2 = 0; prac.forEach(function (a, i) { var v = U.norm(pin[i].value), w = U.norm(a); var ok = v && (v === w || w.indexOf(v) >= 0 && v.length >= 3 || v.replace(/[^\d]/g, '') && v.replace(/[^\d]/g, '') === w.replace(/[^\d]/g, '')); if (ok) pr2++; items[stage.id + '-p' + (i + 1)] = [ok ? 1 : 0, 1]; });
        U.toast('이론 ' + right + ' / ' + key.length + ' · 조회 ' + pr2 + ' / ' + prac.length);
        done({ score: right * 50 + pr2 * 100, acc: key.length ? Math.round(right / key.length * 100) : 0, items: items, theoryRight: right, pracRight: pr2 });
      }
    });
  }

  // ── 보스 레이드 ──
  function raid(box, stage, ctx) {
    var list = U.shuffle(stage.raid || []), dmg = 0, combo = 0, best = 0, right = 0, total = 0, items = {}, sent = 0, stop = false;
    var endsAt = ctx.raidEndsAt, startAt = ctx.raidStartAt || Date.now();
    box.innerHTML = '';
    var bossImg = h('img', { src: U.bossSrc(stage.id), alt: '', onerror: function () { this.src = 'assets/img/ic/gem.webp'; } });
    var boss = h('div', { class: 'boss' }, [bossImg]);
    var hpFill = h('i'), hpTxt = h('span', { text: '' });
    var timer = h('div', { class: 'h gold', style: 'font-size:34px' });
    var myDmg = h('div', { class: 'h', style: 'font-size:22px' });
    var comboEl = h('div', { class: 'combo' });
    var qArea = h('div', { class: 'raidq' });
    box.appendChild(h('div', { class: 'raid' }, [
      h('div', { class: 'row', style: 'justify-content:space-between' }, [h('div', { class: 'h', style: 'font-size:28px', text: (stage.boss && stage.boss.name) || '보스' }), timer]),
      h('div', { class: 'muted', style: 'font-style:italic', text: '“' + ((stage.boss && stage.boss.taunt) || '덤벼라!') + '”' }),
      boss, h('div', { class: 'hpbar' }, [hpFill, hpTxt]), h('div', { class: 'row', style: 'justify-content:center;gap:24px' }, [myDmg, comboEl]), qArea
    ]));
    var classHp = ctx.boss ? ctx.boss.hp : null, classMax = ctx.boss ? ctx.boss.max : null;
    function drawHp() {
      if (classMax) { var hp = Math.max(0, classHp - Math.max(0, dmg - sent)); hpFill.style.width = (hp / classMax * 100) + '%'; hpTxt.textContent = U.fmt(hp) + ' / ' + U.fmt(classMax); }
      myDmg.innerHTML = U.icon('bolt') + ' 내 피해 ' + U.fmt(dmg);
    }
    ctx.onBoss = function (b) { classHp = b.hp; classMax = b.max; sent = Math.max(sent, b.myDmgAtServer || 0); drawHp(); if (b.hp <= 0) killed(); };
    var dead = false;
    function killed() { if (dead) return; dead = true; boss.classList.add('dead'); FX.play('win'); FX.rain(180); stop = true; }
    drawHp();
    var flushIv = setInterval(function () { if (dmg > sent) { var d = dmg; ctx.sendDmg(d).then(function (r) { if (r && r.ok) { sent = Math.max(sent, d); if (r.boss) ctx.onBoss(Object.assign({}, r.boss, { myDmgAtServer: d })); } }); } }, 3500);
    return new Promise(function (done) {
      var clock = setInterval(function () {
        if (ctx.cancelled) { clearInterval(clock); clearInterval(flushIv); if (dmg > sent) ctx.sendDmg(dmg); return; }
        var s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        timer.innerHTML = U.icon('timer') + ' ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        if (s <= 0) { stop = true; }
        if (stop) finish();
      }, 300);
      var finished = false;
      function finish() {
        if (finished) return; finished = true; clearInterval(clock); clearInterval(flushIv);
        qArea.innerHTML = '<div class="h" style="font-size:30px;margin-top:20px">' + (dead ? '보스 처치! 🎉' : '시간 종료!') + '</div>';
        ctx.sendDmg(dmg).then(function () { done({ score: dmg, dmg: dmg, acc: total ? Math.round(right / total * 100) : 0, combo: best, items: items }); });
      }
      function loop(i) {
        if (stop || finished) return;
        if (!list.length) { stop = true; return; }
        var it = list[i % list.length];
        qArea.innerHTML = ''; total++;
        askItem(qArea, it, { fast: true, onWrong: function () { combo = 0; comboEl.textContent = ''; } }).then(function (r) {
          var id = stage.id + '-r' + (stage.raid || []).indexOf(it);
          if (!items[id]) items[id] = [r.ok ? 1 : 0, r.tries];
          if (r.ok && !stop) {
            combo++; best = Math.max(best, combo); right++;
            var crit = Math.random() < 0.15;
            var d = Math.round(30 * (1 + 0.15 * Math.min(combo - 1, 10)) * (crit ? 2 : 1));
            dmg += d;
            boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
            FX.play(crit ? 'crit' : 'hit'); FX.popOn(boss, (crit ? '치명타! ' : '') + '-' + d, crit);
            if (combo >= 3) comboEl.innerHTML = U.icon('fire') + ' ' + combo + ' 콤보';
            drawHp();
          }
          loop(i + 1);
        });
      }
      var waitStart = function () {
        var s = Math.ceil((startAt - Date.now()) / 1000);
        if (s > 0) { qArea.innerHTML = '<div class="bbig gold" style="font-size:90px">' + s + '</div>'; FX.play('tick'); setTimeout(waitStart, 1000); return; }
        FX.play('boss'); loop(0);
      };
      waitStart();
    });
  }


  // ── 오락실 원정: 전산회계 오락실 2급 게임을 한 판 하고, 오락실 기록(score_history)으로 자동 인증 ──
  var ARCADE = {
    acid: { title: '계정과목 산성비', page: 'game1_acid.html', target: 1000, icon: 'raincloud' },
    memory: { title: '회계 기억의 전당', page: 'game2_memory.html', target: 500, icon: 'memory' },
    debit: { title: '차변·대변 마스터', page: 'game3_debit.html', target: 600, icon: 'debit' },
    factory: { title: '결산분개 조립 공장', page: 'game4_factory.html', target: 600, icon: 'factory' },
    flight: { title: '회계 플라이트', page: 'game5_flight.html', target: 8000, icon: 'flight' },
    theory: { title: '이론 객관식', page: 'theory.html', target: 1, icon: 'theory' }
  };
  var ARCADE_BASE = 'https://tjddlf0224-sudo.github.io/account-game-level2-mobile/';
  var SB = 'https://pjagaulfivafamhhiveg.supabase.co/rest/v1/score_history', SBK = 'sb_publishable_yck2tAKApEjVSJOJMVSXuQ_AGaNatuI';
  function arcadeName(ctx) {
    var n = ''; try { n = localStorage.getItem('hub_nickname') || ''; } catch (e) {}   // 같은 github.io 주소라 오락실 닉네임을 읽을 수 있다
    return U.store('arcadeName') || n || (ctx && ctx.myName) || '';
  }
  function arcadeFetch(name, game, since) {
    var q = '?select=score,game_id,played_at,correct,total&user_name=eq.' + encodeURIComponent(name) + '&game_id=in.(' + game + ',' + game + '_d2)&played_at=gte.' + encodeURIComponent(new Date(since).toISOString()) + '&order=score.desc&limit=5';
    return fetch(SB + q, { headers: { apikey: SBK, Authorization: 'Bearer ' + SBK } }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function arcadeQuest(box, stage, ctx) {
    var a = stage.arcade || {}, g = ARCADE[a.game] || ARCADE.debit;
    var since = (ctx.turnAt || Date.now()) - 60000;
    return new Promise(function (done) {
      box.innerHTML = '';
      box.appendChild(h('div', { class: 'mission' }, [h('span', { html: U.icon('gem') }), '전산회계 오락실에서 한 판! 결과 화면까지 가면 점수가 자동으로 인증돼요']));
      var nameIn = h('input', { class: 'field', style: 'font-size:18px;max-width:260px', value: arcadeName(ctx), placeholder: '오락실 닉네임' });
      var status = h('div', { class: 'muted', style: 'margin-top:10px;font-size:17px' });
      var card = h('div', { class: 'qcard', style: 'display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center' }, [
        h('img', { src: 'assets/img/arcade/' + g.icon + '.webp', style: 'width:150px;height:150px;object-fit:contain', onerror: function () { this.src = 'assets/img/ic/gem.webp'; } }),
        h('div', {}, [
          h('div', { class: 'h', style: 'font-size:30px', text: g.title }),
          h('div', { style: 'font-size:18px;margin:4px 0 10px', text: a.why || '' }),
          h('div', { class: 'gold', style: 'font-weight:800', text: g.page === 'theory.html' ? '목표: 끝까지 풀기 (정답률이 점수)' : '목표 점수 ' + U.fmt(g.target) + '점 이상이면 만점' }),
          h('div', { class: 'row', style: 'margin-top:12px;flex-wrap:wrap' }, [
            h('a', { class: 'btn gold big', href: ARCADE_BASE + g.page, target: '_blank', rel: 'noopener', text: '오락실 열기 ↗', onclick: function () { FX.play('turn'); } }),
            h('button', { class: 'btn mint big', text: '점수 인증', onclick: check })
          ]),
          h('div', { class: 'row', style: 'margin-top:12px;gap:8px' }, [h('span', { class: 'dim', text: '오락실 닉네임' }), nameIn]),
          status
        ])
      ]);
      box.appendChild(card);
      box.appendChild(h('div', { class: 'dim', style: 'margin-top:10px', text: '※ 오락실 결과 화면까지 가야 기록돼요. 닉네임이 다르면 위 칸을 고치세요. 그래도 안 되면 선생님께 확인받기.' }));
      var finished = false;
      function check() {
        var nm = nameIn.value.trim(); if (!nm) return U.toast('오락실 닉네임을 넣어 주세요');
        U.store('arcadeName', nm);
        status.textContent = '오락실 기록을 찾는 중…';
        arcadeFetch(nm, a.game, since).then(function (rows) {
          if (!rows || !rows.length || rows.code) { status.innerHTML = '<span class="red">이 시간 이후 「' + U.esc(nm) + '」 기록이 아직 없어요.</span> 결과 화면까지 갔는지 확인!'; FX.play('no'); return; }
          var best = rows[0], pts;
          if (a.game === 'theory') { var rate = best.total ? best.correct / best.total : 0.5; pts = 150 + Math.round(450 * rate); }
          else pts = 150 + Math.round(450 * Math.min(1, best.score / g.target));
          status.innerHTML = '<span class="mint">인증 완료!</span> 오락실 점수 <b class="gold">' + U.fmt(best.score) + '</b> → 레이드 +' + pts;
          FX.play('seal'); FX.burst(innerWidth / 2, innerHeight / 2, 50);
          if (!finished) { finished = true; done({ score: pts, acc: Math.min(100, Math.round(best.score / g.target * 100)), items: {} }); }
        });
      }
    });
  }

  W.Play = { arcadeQuest: arcadeQuest, ARCADE: ARCADE, clearKeys: clearKeys, spells: spells, drill: drill, theoryQuest: theoryQuest, kclepQuest: kclepQuest, examQuest: examQuest, raid: raid, askItem: askItem, slip: slip, typeField: typeField, ghostHtml: ghostHtml, itemAccounts: itemAccounts, canon: canon };
})(window);
