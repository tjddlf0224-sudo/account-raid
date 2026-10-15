/* 효과: 소리(파일 없이 합성)·점수 팝·꽃가루·동전 */
(function (W) {
  'use strict';
  var ctx = null, on = W.U.store('sound') !== false;
  function ac() { if (!ctx) { try { ctx = new (W.AudioContext || W.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
  function tone(f, t0, dur, type, vol, f2) {
    var c = ac(); if (!c || !on) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, c.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, c.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  function noise(t0, dur, vol, hp) {
    var c = ac(); if (!c || !on) return;
    var n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = c.createBufferSource(); s.buffer = n;
    var f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1000;
    var g = c.createGain(); g.gain.value = vol || 0.1;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + t0);
  }
  var S = {
    key: function () { noise(0, 0.03, 0.05, 2500); },
    ok: function () { tone(880, 0, 0.09, 'triangle', 0.16); tone(1320, 0.07, 0.14, 'triangle', 0.14); },
    no: function () { tone(220, 0, 0.18, 'sawtooth', 0.08, 140); tone(160, 0.1, 0.2, 'sawtooth', 0.06, 110); },
    combo: function (n) { var b = 660 + Math.min(12, n) * 40; tone(b, 0, 0.08, 'square', 0.07); tone(b * 1.5, 0.06, 0.1, 'square', 0.06); },
    hit: function () { noise(0, 0.12, 0.18, 300); tone(140, 0, 0.12, 'square', 0.1, 60); },
    crit: function () { noise(0, 0.2, 0.25, 200); tone(1200, 0, 0.25, 'sawtooth', 0.08, 300); },
    seal: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.07, 0.25, 'triangle', 0.12); }); },
    coin: function () { tone(1568, 0, 0.06, 'square', 0.06); tone(2093, 0.05, 0.12, 'square', 0.06); },
    lvup: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.09, 0.35, 'sawtooth', 0.07); tone(f / 2, i * 0.09, 0.35, 'triangle', 0.06); }); },
    win: function () { [523, 523, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, 0.4, 'sawtooth', 0.07); }); noise(0.8, 0.8, 0.08, 4000); },
    turn: function () { tone(587, 0, 0.12, 'triangle', 0.12); tone(880, 0.12, 0.2, 'triangle', 0.12); },
    tick: function () { tone(1000, 0, 0.04, 'square', 0.04); },
    boss: function () { tone(110, 0, 0.6, 'sawtooth', 0.12, 55); noise(0, 0.6, 0.1, 150); }
  };
  function play(name, a) { try { if (S[name]) S[name](a); } catch (e) {} }
  function toggle() { on = !on; W.U.store('sound', on); return on; }

  function popAt(x, y, text, crit) {
    var e = document.createElement('div'); e.className = 'pop' + (crit ? ' crit' : ''); e.textContent = text;
    e.style.left = x + 'px'; e.style.top = y + 'px'; document.body.appendChild(e);
    setTimeout(function () { e.remove(); }, 1000);
  }
  function popOn(el, text, crit) { var r = el.getBoundingClientRect(); popAt(r.left + r.width / 2, r.top + r.height / 3, text, crit); }

  // 꽃가루·동전(캔버스)
  var cv, cx, parts = [], raf = 0;
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:96';
    document.body.appendChild(cv); cx = cv.getContext('2d'); resize(); W.addEventListener('resize', resize);
  }
  function resize() { if (!cv) return; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
  var coinImg = new Image(); coinImg.src = 'assets/img/ic/coin.webp';
  function burst(x, y, n, kind) {
    ensure();
    var cols = ['#ffcf4a', '#ff5fa2', '#3ee6b0', '#58c7ff', '#a77bff', '#ffffff'];
    for (var i = 0; i < (n || 60); i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, g: 0.32, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
        s: kind === 'coin' ? 26 + Math.random() * 10 : 7 + Math.random() * 7, c: cols[i % cols.length], life: 90 + Math.random() * 40, k: kind || 'conf' });
    }
    if (!raf) raf = requestAnimationFrame(step);
  }
  function rain(n) { ensure(); for (var i = 0; i < (n || 160); i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 400, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, g: 0.03, r: 0, vr: (Math.random() - .5) * .3, s: 8 + Math.random() * 6, c: ['#ffcf4a', '#ff5fa2', '#3ee6b0', '#58c7ff', '#a77bff'][i % 5], life: 260, k: 'conf' }); if (!raf) raf = requestAnimationFrame(step); }
  function step() {
    var d = devicePixelRatio; cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < innerHeight + 60; });
    parts.forEach(function (p) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--; p.vx *= 0.99;
      cx.save(); cx.translate(p.x * d, p.y * d); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life / 30);
      if (p.k === 'coin' && coinImg.complete) cx.drawImage(coinImg, -p.s * d / 2, -p.s * d / 2, p.s * d, p.s * d);
      else { cx.fillStyle = p.c; cx.fillRect(-p.s * d / 2, -p.s * d / 4, p.s * d, p.s * d / 2); }
      cx.restore();
    });
    raf = parts.length ? requestAnimationFrame(step) : 0;
    if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  W.FX = { play: play, toggle: toggle, isOn: function () { return on; }, popAt: popAt, popOn: popOn, burst: burst, rain: rain, unlock: ac };
})(window);
