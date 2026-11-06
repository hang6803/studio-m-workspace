/* 小M 音效 — 用 Web Audio 现场合成，不需要音频文件
 *   XiaoMSfx.play('person:hang')      // 跟动画同时调用，音效按时间点自动排好
 *   XiaoMSfx.play(c.sfx)              // XiaoMCelebrate.pick() 返回的 sfx
 *   XiaoMSfx.stop()                   // 立即停掉（锁屏/关闭祝福）
 *   XiaoMSfx.muted = true             // 静音（记在 localStorage）
 *   XiaoMSfx.render('person:mun')     // 离线渲染成 AudioBuffer（录屏配音用）
 * key：person:hang / person:michael / person:mun / fest:<节日 id> / bd（通用生日）/ others（别人生日，一声提示）
 * 浏览器禁止自动播放时（没有任何点击过），play() 什么也不做，不报错。
 */
(function (root) {
  'use strict';
  var KEY = 'xiaom-sfx-muted';

  /* ---------- 合成积木：每个都是 (ctx, out, t[, ...]) ---------- */
  function noiseBuf(ctx) {
    if (ctx._xn) return ctx._xn;
    var b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (ctx._xn = b);
  }
  function env(ctx, g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(ctx, out, t, o) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || o.dur));
    if (o.vib) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 8; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + o.dur); }
    env(ctx, g, t, o.a || 0.005, o.g || 0.3, o.dur);
    osc.connect(g).connect(out); osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(ctx, out, t, o) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf(ctx); src.loop = true;
    f.type = o.filter || 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    env(ctx, g, t, o.a || 0.005, o.g || 0.3, o.dur);
    src.connect(f).connect(g).connect(out); src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  }

  var S = {
    whoosh: function (c, o, t) { noise(c, o, t, { filter: 'bandpass', f: 300, to: 2600, q: 1.2, a: 0.25, g: 0.35, dur: 0.7 }); },
    boom: function (c, o, t) { tone(c, o, t, { f: 120, to: 35, dur: 0.8, g: 0.8 }); noise(c, o, t, { f: 900, to: 80, dur: 0.9, g: 0.5 }); },
    thud: function (c, o, t) { tone(c, o, t, { f: 160, to: 50, dur: 0.3, g: 0.6 }); noise(c, o, t, { f: 500, to: 100, dur: 0.25, g: 0.3 }); },
    thunder: function (c, o, t) {
      noise(c, o, t, { f: 3000, to: 200, dur: 0.25, g: 0.6 });
      noise(c, o, t + 0.05, { f: 600, to: 60, a: 0.1, dur: 2.2, g: 0.7 });
      [0.3, 0.55, 0.9].forEach(function (d) { noise(c, o, t + d, { f: 400, to: 80, a: 0.05, dur: 0.6, g: 0.4 }); });
    },
    pop: function (c, o, t) { tone(c, o, t, { f: 500, to: 1300, dur: 0.1, g: 0.35 }); },
    sparkle: function (c, o, t) { for (var i = 0; i < 7; i++) tone(c, o, t + i * 0.05, { f: 2000 + Math.random() * 2500, dur: 0.18, g: 0.08, type: 'triangle' }); },
    chime: function (c, o, t) { [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(c, o, t + i * 0.09, { f: f, dur: 0.9, g: 0.14, type: 'triangle' }); }); },
    fanfare: function (c, o, t) {
      [[784, 0, 0.12], [1047, 0.13, 0.12], [1319, 0.26, 0.12], [1568, 0.39, 0.5]].forEach(function (n) {
        tone(c, o, t + n[1], { f: n[0], dur: n[2] + 0.15, g: 0.14, type: 'square', a: 0.01 });
        tone(c, o, t + n[1], { f: n[0] / 2, dur: n[2] + 0.15, g: 0.1, type: 'sawtooth', a: 0.01 });
      });
    },
    firework: function (c, o, t) {
      tone(c, o, t, { f: 700, to: 2200, dur: 0.45, g: 0.08 });
      noise(c, o, t + 0.45, { f: 2500, to: 300, dur: 0.5, g: 0.45 });
      for (var i = 0; i < 10; i++) noise(c, o, t + 0.55 + Math.random() * 0.6, { filter: 'highpass', f: 3000, dur: 0.04, g: 0.25 });
    },
    splat: function (c, o, t) { noise(c, o, t, { f: 1400, to: 200, dur: 0.35, g: 0.7 }); tone(c, o, t, { f: 220, to: 60, dur: 0.25, g: 0.5 }); },
    boing: function (c, o, t) { tone(c, o, t, { f: 220, to: 880, slide: 0.15, dur: 0.4, g: 0.25, vib: 18, vibAmt: 40 }); },
    awkward: function (c, o, t) { tone(c, o, t, { f: 392, dur: 0.22, g: 0.18, type: 'triangle' }); tone(c, o, t + 0.25, { f: 370, dur: 0.22, g: 0.18, type: 'triangle' }); tone(c, o, t + 0.5, { f: 349, to: 330, dur: 0.6, g: 0.18, type: 'triangle', vib: 6, vibAmt: 6 }); },
    roar: function (c, o, t) {
      tone(c, o, t, { f: 110, to: 60, dur: 1.2, g: 0.35, type: 'sawtooth', vib: 22, vibAmt: 12, a: 0.08 });
      noise(c, o, t, { filter: 'bandpass', f: 400, to: 200, q: 2, a: 0.1, dur: 1.2, g: 0.4 });
    },
    click: function (c, o, t) { noise(c, o, t, { filter: 'highpass', f: 2000, dur: 0.03, g: 0.4 }); },
    sting: function (c, o, t) {
      [220, 233, 311, 466].forEach(function (f) { tone(c, o, t, { f: f, dur: 0.9, g: 0.16, type: 'sawtooth', a: 0.003 }); });
      noise(c, o, t, { f: 5000, to: 400, dur: 0.6, g: 0.5 });
    },
    vacuum: function (c, o, t) {
      noise(c, o, t, { filter: 'bandpass', f: 400, to: 1800, q: 3, a: 0.2, dur: 1.4, g: 0.35 });
      tone(c, o, t, { f: 110, to: 180, dur: 1.4, g: 0.12, type: 'sawtooth', a: 0.2 });
    },
    shloop: function (c, o, t) { tone(c, o, t, { f: 1200, to: 90, dur: 0.4, g: 0.35 }); },
    waves: function (c, o, t) { noise(c, o, t, { f: 500, to: 300, a: 1, dur: 3.2, g: 0.12 }); noise(c, o, t + 2, { f: 450, to: 250, a: 0.9, dur: 2.6, g: 0.1 }); },
    horn: function (c, o, t) { tone(c, o, t, { f: 420, to: 470, dur: 0.6, g: 0.2, type: 'sawtooth', a: 0.02, vib: 9, vibAmt: 5 }); },
    gong: function (c, o, t) { [98, 147, 233, 311].forEach(function (f, i) { tone(c, o, t, { f: f, dur: 2.4 - i * 0.4, g: 0.22 / (i + 1), a: 0.01 }); }); },
    crackers: function (c, o, t) { for (var i = 0; i < 16; i++) noise(c, o, t + i * 0.07 + Math.random() * 0.04, { filter: 'highpass', f: 1500, dur: 0.05, g: 0.4 }); },
    beep: function (c, o, t) { tone(c, o, t, { f: 880, dur: 0.15, g: 0.2 }); },
    beepHi: function (c, o, t) { tone(c, o, t, { f: 1760, dur: 0.35, g: 0.2 }); }
  };

  /* ---------- 每段动画的音效时间表（秒），和 xiaom.js 的动画对齐 ---------- */
  var FESTIVAL = {
    newyear: [['beep', 0], ['beep', 0.8], ['beep', 1.6], ['beepHi', 2.4], ['firework', 2.2], ['firework', 2.9], ['horn', 2.7], ['fanfare', 3.0]],
    cny: [['gong', 0.1], ['crackers', 0.8], ['pop', 2.3], ['sparkle', 2.4]],
    chapgohmei: [['chime', 0.2], ['whoosh', 1.0], ['pop', 1.2], ['pop', 1.9], ['pop', 2.6]],
    aidilfitri: [['chime', 0.3], ['sparkle', 1.6], ['chime', 2.6]],
    haji: [['chime', 0.3], ['sparkle', 1.4], ['chime', 2.6]],
    wesak: [['chime', 0.4], ['sparkle', 1.2], ['sparkle', 2.2]],
    duanwu: [['whoosh', 0.2], ['thud', 1.9], ['chime', 2.4]],
    merdeka: [['horn', 0.2], ['thud', 0.6], ['thud', 1.2], ['thud', 1.8], ['firework', 2.2], ['fanfare', 2.7], ['firework', 3.0]],
    malaysiaday: [['horn', 0.2], ['thud', 0.6], ['thud', 1.2], ['thud', 1.8], ['firework', 2.2], ['fanfare', 2.7], ['firework', 3.0]],
    midautumn: [['whoosh', 0.1], ['chime', 0.9], ['sparkle', 1.8]],
    deepavali: [['chime', 0.4], ['pop', 0.5], ['pop', 0.85], ['pop', 1.2], ['pop', 1.55], ['pop', 1.9], ['sparkle', 2.3]],
    dongzhi: [['pop', 0.6], ['boing', 0.9], ['boing', 1.45], ['chime', 2.2]],
    christmas: [['chime', 0.2], ['whoosh', 1.4], ['boing', 1.7], ['sparkle', 2.2]]
  };
  var CUES = {
    'person:hang': [['waves', 0], ['boing', 3.6], ['awkward', 4.1], ['pop', 5.15], ['whoosh', 5.7], ['splat', 6.4], ['fanfare', 6.9]],
    'person:michael': [['thunder', 0.35], ['roar', 0.9], ['whoosh', 1.0], ['whoosh', 2.5], ['boom', 3.8], ['chime', 4.6], ['sparkle', 5.0], ['thud', 5.65], ['firework', 5.8], ['firework', 6.1], ['fanfare', 6.0], ['firework', 6.4]],
    'person:mun': [['click', 0.8], ['click', 0.9], ['click', 1.05], ['click', 1.25], ['thud', 1.4], ['sting', 1.82], ['boing', 2.05], ['pop', 3.25], ['vacuum', 3.8], ['shloop', 4.75], ['boom', 5.5], ['whoosh', 5.75], ['thud', 6.05], ['fanfare', 6.25], ['firework', 6.2], ['firework', 6.5], ['firework', 6.8]],
    bd: [['horn', 0.4], ['pop', 2.3], ['sparkle', 2.4], ['chime', 2.9]],
    others: [['chime', 0]]
  };
  function cues(key) {
    if (CUES[key]) return CUES[key];
    if (key && key.indexOf('fest:') === 0) return FESTIVAL[key.slice(5)] || [['chime', 0.3], ['sparkle', 1.5]];
    if (key && key.indexOf('bdfest:') === 0) return [['horn', 0.4], ['chime', 2.0], ['sparkle', 3.0]];
    return null;
  }
  function schedule(ctx, out, key, t0) {
    var list = cues(key);
    if (!list) return 0;
    var end = 0;
    list.forEach(function (c) { S[c[0]](ctx, out, t0 + c[1]); end = Math.max(end, c[1] + 2.5); });
    return end;
  }
  function master(ctx) {
    var comp = ctx.createDynamicsCompressor(), g = ctx.createGain();
    g.gain.value = 0.8; comp.connect(g).connect(ctx.destination);
    comp._out = g;
    return comp;
  }

  var ctx = null, live = [];
  var api = {
    get muted() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } },
    set muted(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} },
    play: function (key) {
      if (!key || api.muted || !cues(key)) return false;
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = ctx || new AC();
        if (ctx.state === 'suspended') ctx.resume();
        if (ctx.state !== 'running' && ctx.state !== 'suspended') return false;
        api.stop();   // 一次只播一段，不叠加
        var m = master(ctx); live.push(m);
        schedule(ctx, m, key, ctx.currentTime + 0.05);
        return true;
      } catch (e) { return false; }
    },
    stop: function () {   // 立即停掉正在播的音效（锁屏、关闭祝福时）
      live.forEach(function (m) { try { m._out.disconnect(); } catch (e) {} });
      live = [];
    },
    render: function (key, seconds, rate) {
      rate = rate || 44100;
      var OC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      var c = new OC(2, Math.ceil(rate * (seconds || 9)), rate);
      schedule(c, master(c), key, 0.05);
      return c.startRendering();
    },
    keys: function () { return Object.keys(CUES).concat(Object.keys(FESTIVAL).map(function (k) { return 'fest:' + k; })); },
    SOUNDS: S
  };
  root.XiaoMSfx = api;
})(typeof self !== 'undefined' ? self : this);
