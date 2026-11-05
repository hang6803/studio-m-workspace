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
  // the Apps Script Backup's sound language: soft water drops (a sine that slides up into its note, with a quiet octave),
  // a breath of air for opening and closing, all through a warm low-pass and a short echo
  const NOTE = { C4: 261.63, G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };
  let bus = null, dry = null, nbuf = null;
  function busOf() {
    if (bus) return bus; const a = ac, desk = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const master = a.createGain(); master.gain.value = desk ? .75 : .9; master.connect(out);
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = desk ? 2600 : 5200;
    bus = a.createGain(); bus.connect(lp); lp.connect(master);
    const dl = a.createDelay(.5), fb = a.createGain(), damp = a.createBiquadFilter(), wet = a.createGain();
    dl.delayTime.value = .085; fb.gain.value = .22; damp.type = "lowpass"; damp.frequency.value = 2400; wet.gain.value = .16;
    lp.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl); damp.connect(wet); wet.connect(master);
    dry = a.createGain(); dry.connect(master); return bus;
  }
  function drop(f, at, len, vol) {
    const a = ac, b = busOf(), t = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain(), o2 = a.createOscillator(), g2 = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f * .74, t); o.frequency.exponentialRampToValueAtTime(f, t + .028);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o2.type = "sine"; o2.frequency.setValueAtTime(f * 2, t);
    g2.gain.setValueAtTime(.0001, t); g2.gain.exponentialRampToValueAtTime(vol * .16, t + .004); g2.gain.exponentialRampToValueAtTime(.0001, t + len * .5);
    o.connect(g); g.connect(b); o2.connect(g2); g2.connect(b); o.start(t); o2.start(t); o.stop(t + len + .03); o2.stop(t + len + .03);
  }
  const noiseSrc = () => { const a = ac; if (!nbuf) { nbuf = a.createBuffer(1, a.sampleRate * .4, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(); s.buffer = nbuf; return s; };
  function air(from, to, len, vol) {
    const a = ac, b = busOf(), t = a.currentTime, n = noiseSrc(), bp = a.createBiquadFilter(), g = a.createGain();
    bp.type = "bandpass"; bp.Q.value = 1.4; bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + len * .4); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    n.connect(bp); bp.connect(g); g.connect(b); n.start(t); n.stop(t + len + .02);
  }
  // the little mechanical tick of a press, and of the page passing under your finger as you scroll
  function tick(f, q, vol, len) {
    if (get(MUTE) === "1" || document.hidden || !ac || ac.state !== "running") return; busOf();
    const a = ac, t = a.currentTime, n = noiseSrc(), bp = a.createBiquadFilter(), g = a.createGain();
    bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    n.connect(bp); bp.connect(g); g.connect(dry); n.start(t, Math.random() * .3); n.stop(t + len + .01);
  }
  const SOUNDS = {
    tap() { drop(NOTE.G5, 0, .07, .045); },
    drag() { drop(NOTE.G5, 0, .05, .025); },
    nav() { drop(NOTE.E5, 0, .09, .075); },
    toggle() { drop(NOTE.E5, 0, .08, .065); drop(NOTE.G5, .045, .1, .06); },
    off() { drop(NOTE.G5, 0, .08, .06); drop(NOTE.E5, .045, .1, .055); },
    pin() { drop(NOTE.C5, 0, .14, .11); drop(NOTE.G5, 0, .1, .04); },
    send() { drop(NOTE.C5, 0, .14, .11); drop(NOTE.G5, 0, .1, .04); air(900, 3200, .2, .02); },
    open() { air(500, 1800, .22, .03); drop(NOTE.C5, .05, .12, .035); },
    close() { air(1600, 450, .18, .025); },
    ok() { drop(NOTE.C5, 0, .16, .085); drop(NOTE.E5, .06, .16, .08); drop(NOTE.G5, .12, .18, .075); drop(NOTE.C6, .18, .28, .07); },
    err() { drop(NOTE.G4, 0, .14, .09); drop(NOTE.C4, .08, .22, .09); }
  };
  function play(kind) {
    if (get(MUTE) === "1" || document.hidden) return;
    const a = ctx(); if (!a || !SOUNDS[kind]) return;
    try { SOUNDS[kind](); } catch (e) {}
  }

  // ---- haptics: Android has vibrate(); iOS 18+ Safari gives a tick when a switch-style checkbox is toggled by a tap
  const PAT = { tap: 16, toggle: 20, off: 16, nav: 22, pin: 30, open: 26, close: 18, ok: [26, 60, 40], err: [45, 60, 45], drag: 10, send: 28 };
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
    // iPhone has one fixed tick: the bigger moments get two or three of them in a quick roll, which reads as a stronger tap
    if (IOS) { iosTick(); const n = { ok: 2, err: 2, pin: 2, open: 1, send: 1, nav: 1 }[kind] || 0; for (let k = 1; k <= n; k++) setTimeout(iosTick, 55 * k); }
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

  // every press anywhere gets a tick and a press-in; buttons spring back like a drop of water, with a drop and its ring where the finger landed
  const PRESS = "button, a[href], [role=button], .row, .bk-row, .drive-card, .fchip, label.jf-mark, summary";
  const RIP = ".btn, .ibtn, .row, .bk-row, .drive-card, .fchip, .seg button, .chips button, .tabs a, .nav-i, .jf-mark, .cal .c, .tm, .drive-card";
  addEventListener("pointerdown", e => {
    const el = e.target.closest && e.target.closest(PRESS); if (!el || el.disabled) return;
    el.classList.add("pressing"); ctx();
    tick(1750, 2.4, .05, .02); if (e.pointerType !== "mouse" && navigator.vibrate && get(HAP) !== "0") { try { navigator.vibrate(10); } catch (x) {} }   // the press itself
    const up = () => { el.classList.remove("pressing"); removeEventListener("pointerup", up, true); removeEventListener("pointercancel", up, true); };
    addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
  }, { capture: true, passive: true });
  addEventListener("click", e => {
    const el = e.target.closest && e.target.closest(PRESS); if (!el || el.disabled) return;
    fx("tap");
    const rip = !still() && !el.closest(".m-host") && el.closest(RIP);   // the card 小M stands on shows no drop (it would spill past its edge)
    if (rip) {   // a ripple of light from where the finger landed
      const el = rip, r = el.getBoundingClientRect(); if (r.width < 24 || r.width > 1400) return;
      const s = document.createElement("span"); s.className = "fx-ripple";
      const d = Math.max(r.width, r.height) * 2.2;
      s.style.cssText = `width:${d}px;height:${d}px;left:${(e.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(e.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(s); setTimeout(() => s.remove(), 760);
      // a water drop: the button gives like a drop of water when let go (buttons and chips only, not whole rows)
      if (!el.matches(".row, .bk-row, .cal .c, .drive-card, .tm, .m-fan button, .mbtn")) el.animate([{ transform: "scale(.94)" }, { transform: "scale(1.06, .93)", offset: .35 }, { transform: "scale(.98, 1.03)", offset: .65 }, { transform: "none" }],
        { duration: 460, easing: "cubic-bezier(.3,.7,.4,1)" });
    }
  }, true);
  // scrolling: a soft gear tick every ~50px, like the Apps Script Backup (and a faint buzz on Android)
  let gy = null, gat = 0;
  addEventListener("scroll", e => {
    const el = e.target === document ? document.scrollingElement : e.target; if (!el || el.scrollTop == null) return;
    const y = el.scrollTop; if (gy == null || gy.el !== el) { gy = { el, y }; return; }
    if (Math.abs(y - gy.y) < 52) return; gy.y = y;
    const now = performance.now(); if (now - gat < 38) return; gat = now;
    const desk = matchMedia("(hover: hover) and (pointer: fine)").matches;
    tick((desk ? 2000 : 2400) + Math.random() * 400, desk ? 5 : 7, desk ? .16 : .05, .022);
    if (navigator.vibrate && get(HAP) !== "0") { try { navigator.vibrate(3); } catch (x) {} }
  }, { capture: true, passive: true });
  window.UIFx = fx;
})();
