// Studio M feedback: a soft synthesized sound and a haptic tick for every touch, richer ones for moments that matter.
// No audio files: everything is made with WebAudio on the fly, so it costs nothing to load and works offline.
// Sounds share 小M's mute switch (localStorage "xiaom-sfx-muted"); haptics have their own ("fx-haptics" = "0" turns them off).
(function () {
  "use strict";
  const MUTE = "xiaom-sfx-muted", HAP = "fx-haptics";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- sound
  let ac = null, out = null, verb = null;
  function ctx() {
    if (ac) { if (ac.state === "suspended") ac.resume().catch(() => {}); return ac; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ac = new A({ latencyHint: "interactive" }); } catch (e) { return null; }
    out = ac.createDynamicsCompressor(); out.threshold.value = -18; out.ratio.value = 4; out.connect(ac.destination);
    // a tiny room so tones have air around them (short, made from decaying noise)
    const len = Math.floor(ac.sampleRate * .35), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb = ac.createConvolver(); verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = .22; verb.connect(vg); vg.connect(out);
    return ac;
  }
  function tone(f, t0, dur, o) {
    o = o || {};
    const a = ac, os = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    os.type = o.type || "sine"; os.frequency.setValueAtTime(f, t0);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    lp.type = "lowpass"; lp.frequency.value = o.lp || 6000; lp.Q.value = .4;
    const v = (o.v || .05);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.a || .004));
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    os.connect(lp); lp.connect(g); g.connect(out); if (o.wet) g.connect(verb);
    os.start(t0); os.stop(t0 + dur + .02);
  }
  function noise(t0, dur, o) {
    o = o || {};
    const a = ac, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; bp.type = "bandpass"; bp.Q.value = o.q || 1.2;
    bp.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) bp.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(o.v || .03, t0 + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(bp); bp.connect(g); g.connect(out); s.start(t0);
  }
  const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;
  const SOUNDS = {
    tap(t) { tone(1500, t, .045, { to: 900, v: .028, lp: 4200 }); },
    toggle(t) { tone(740, t, .06, { v: .035, type: "triangle" }); tone(1110, t + .045, .08, { v: .03, type: "triangle" }); },
    off(t) { tone(1110, t, .06, { v: .03, type: "triangle" }); tone(740, t + .045, .08, { v: .03, type: "triangle" }); },
    nav(t) { noise(t, .12, { f: 700, to: 2600, v: .018, q: .9 }); tone(880, t + .02, .09, { to: 1320, v: .018 }); },
    pin(t) { tone(1760, t, .16, { v: .04, wet: 1, type: "triangle", lp: 5000 }); tone(2637, t + .01, .1, { v: .012, wet: 1 }); },
    open(t) { noise(t, .16, { f: 500, to: 1800, v: .016 }); tone(520, t, .16, { to: 880, v: .022, wet: 1 }); },
    close(t) { noise(t, .12, { f: 1600, to: 500, v: .014 }); tone(820, t, .12, { to: 480, v: .02 }); },
    ok(t) { [C6, E6, G6, C7].forEach((f, i) => tone(f, t + i * .07, .42 - i * .05, { v: .045 - i * .006, type: "triangle", wet: 1, lp: 7000 })); noise(t + .21, .5, { f: 5000, to: 9000, v: .008, q: .6 }); },
    err(t) { tone(330, t, .12, { v: .05, type: "square", lp: 900 }); tone(247, t + .11, .18, { v: .05, type: "square", lp: 800 }); },
    drag(t) { tone(1200, t, .03, { v: .018, lp: 3000 }); },
    send(t) { noise(t, .18, { f: 900, to: 4000, v: .02 }); tone(660, t, .14, { to: 1320, v: .03, wet: 1 }); }
  };
  function play(kind) {
    if (get(MUTE) === "1" || document.hidden) return;
    const a = ctx(); if (!a || !SOUNDS[kind]) return;
    try { SOUNDS[kind](a.currentTime + .005); } catch (e) {}
  }

  // ---- haptics: Android has vibrate(); iOS 18+ Safari gives a tick when a switch-style checkbox is toggled by a tap
  const PAT = { tap: 6, toggle: 10, off: 8, nav: 8, pin: 14, open: 12, close: 8, ok: [14, 70, 22], err: [28, 50, 28], drag: 4, send: 12 };
  let sw = null;
  function iosTick() {
    if (!sw) {
      const l = document.createElement("label"); l.setAttribute("aria-hidden", "true");
      l.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1;
      l.appendChild(i); document.body.appendChild(l); sw = l;
    }
    try { sw.click(); } catch (e) {}
  }
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function feel(kind) {
    if (get(HAP) === "0") return;
    if (navigator.vibrate) { try { navigator.vibrate(PAT[kind] || 6); } catch (e) {} return; }
    if (IOS) { iosTick(); if (kind === "ok" || kind === "err") setTimeout(iosTick, 90); }
  }

  // ---- one feedback per touch: a tap starts as "tap"; anything more specific in the same moment replaces it
  const RANK = { drag: 0, tap: 1, toggle: 2, off: 2, nav: 3, close: 3, open: 4, pin: 4, send: 5, err: 6, ok: 6 };
  let pend = null, timer = 0, felt = 0;
  function fx(kind) {
    kind = kind || "tap";
    const now = performance.now();
    if (now - felt > 60) { felt = now; feel(kind); }                          // haptic right away (iOS needs it inside the tap)
    else if (navigator.vibrate && RANK[kind] >= 5) feel(kind);                // upgrade to the success / error pattern
    if (!pend || RANK[kind] >= RANK[pend]) pend = kind;
    if (!timer) timer = setTimeout(() => { timer = 0; const k = pend; pend = null; play(k); }, 12);
  }
  fx.play = play; fx.feel = feel;
  fx.sound = on => { if (on === undefined) return get(MUTE) !== "1"; set(MUTE, on ? null : "1"); };
  fx.haptics = on => { if (on === undefined) return get(HAP) !== "0"; set(HAP, on ? null : "0"); };
  fx.canFeel = !!navigator.vibrate || IOS;

  // every press anywhere gets a tick and a press-in; buttons and rows spring back when let go
  const PRESS = "button, a[href], [role=button], .row, .bk-row, .drive-card, .fchip, label.jf-mark, summary";
  const RIP = ".btn, .ibtn, .row, .bk-row, .drive-card, .fchip, .seg button, .chips button, .tabs a, .nav-i, .jf-mark, .cal .c, .tm, .drive-card";
  addEventListener("pointerdown", e => {
    const el = e.target.closest && e.target.closest(PRESS); if (!el || el.disabled) return;
    el.classList.add("pressing");
    const up = () => { el.classList.remove("pressing"); removeEventListener("pointerup", up, true); removeEventListener("pointercancel", up, true); };
    addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
  }, { capture: true, passive: true });
  addEventListener("click", e => {
    const el = e.target.closest && e.target.closest(PRESS); if (!el || el.disabled) return;
    fx("tap");
    const rip = !still() && el.closest(RIP);
    if (rip) {   // a ripple of light from where the finger landed
      const el = rip, r = el.getBoundingClientRect(); if (r.width < 24 || r.width > 1400) return;
      const s = document.createElement("span"); s.className = "fx-ripple";
      const d = Math.max(r.width, r.height) * 2.2;
      s.style.cssText = `width:${d}px;height:${d}px;left:${(e.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(e.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(s); setTimeout(() => s.remove(), 650);
    }
  }, true);
  window.UIFx = fx;
})();
