// 小M drawn into one <canvas> (0.9.46). The 2.5D 小M of xiaom.js is a few hundred CSS-3D slices; in Safari and the Mac app
// (WebKit) macOS recomposites every one of those layers on every frame he moves: WindowServer ~90–95% CPU. Here the same model
// (same slabs, rims, feet, tuft, lens, light, perspective) is painted into a single canvas, so there is one layer to composite.
// Measured in WKWebView: WindowServer ~91% → ~30%, the same as no 小M at all (spikes/xiaom-canvas/CONCLUSION.md).
//
// How he still does everything the CSS 小M did: next to the canvas sits an invisible "skeleton" — empty divs with the very same
// class names (m25t, m25r, cm-all, cm-body, cm-lid, cm-tuft, cm-blush…) inside the same .m25 root. Every rule of xiaom.js and
// app.css (x5bob, blinks, looking round, hop / cheer / shrug / sneeze / shy / spin, moods, .listen / .think, turn(), cam-back,
// html.away, reduced motion, Settings → Animations) keeps acting on those divs; each frame the canvas reads their computed
// transform / opacity / colour and paints 小M in that pose. Nothing about his moves is copied here.
//
// Used for the always-there 小M only (PIN screen, the 小M button, avatars). Festival / birthday scenes and an outfit (hat or
// held thing) still use xiaom.js' CSS-3D 小M. Fallback: no canvas / DOMMatrix, localStorage m3d = "1", or ?m3d in the URL →
// window.MCanvas is null and the app uses xiaom.js as before; if a canvas can't be set up, that one 小M is swapped for the CSS one.
window.MCanvas = (function () {
  "use strict";
  const X = window.XiaoM;
  try {
    if (!X || !window.DOMMatrix || !window.ResizeObserver || !window.MutationObserver) return null;
    if (/[?&]m3d\b/.test(location.search) || localStorage.getItem("m3d") === "1") return null;
    if (!document.createElement("canvas").getContext("2d")) return null;
    if (typeof CanvasRenderingContext2D.prototype.roundRect !== "function" || !window.Path2D) return null;
  } catch (e) { if (!X || !window.DOMMatrix) return null; }

  // ---------- colours ----------
  const hex = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const css = c => "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")";
  const mixc = (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];   // color-mix(in srgb, a, b p)
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const ORANGE = hex("#f48020"), SIDE = hex("#cf6612"), DEEP = hex("#b0560e"), LIDC = hex("#e57519"), GREY = hex("#dcdcdc");
  const shade = (c, lit) => lit >= 0 ? mixc(c, WHITE, Math.min(40, Math.round(lit * 22)) / 100) : mixc(c, BLACK, Math.min(55, Math.round(-lit * 38)) / 100);
  const eyeCol = (base, st) => st.side ? mixc(base, LIDC, st.side) : base;

  // ---------- matrices (DOMMatrix = CSS transform semantics) ----------
  const M = s => new DOMMatrix(s || undefined);
  const about = (m, ox, oy, oz) => M().translate(ox, oy, oz).multiply(m).translate(-ox, -oy, -oz);   // transform-origin
  const box = (left, top, w, h, tr) => M().translate(left, top).multiply(about(M(tr), w / 2, h / 2, 0));   // a CSS box, origin 50% 50%

  // ---------- 2D helpers, in a primitive's own CSS box ----------
  function rr(c, w, h, r) { c.beginPath(); if (w === h && r >= w / 2) c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); else c.roundRect(0, 0, w, h, Math.min(r, w / 2, h / 2)); }
  function radial(c, w, h, stops) { c.save(); c.translate(w / 2, h / 2); c.scale(w / 2, h / 2); const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore(); }
  function radialAt(c, w, h, cx, cy, rx, ry, stops) { c.save(); c.translate(cx * w, cy * h); c.scale(rx * w, ry * h); const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(-cx / rx, -cy / ry, 1 / rx, 1 / ry); c.restore(); }
  function linear135(c, w, h, stops) { const L = (w + h) * Math.SQRT1_2, d = Math.SQRT1_2 * L / 2;
    const g = c.createLinearGradient(w / 2 - d, h / 2 - d, w / 2 + d, h / 2 + d); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  function litOver(c, w, h) {   // .m25lit
    linear135(c, w, h, [[0, "rgba(255,255,255,.22)"], [.45, "rgba(255,255,255,0)"], [.45, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.42)"]]);
    radialAt(c, w, h, .26, .20, .6, .5, [[0, "rgba(255,255,255,.5)"], [.7, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]);
  }
  const PATH = {
    tuft: new Path2D("M36 40 C34 30 42 26 48 32 L52 36 L56 32 C62 26 70 30 68 40 Z"),
    mouth: new Path2D("M55 96 Q60 99 65 96"), brow: new Path2D("M45 47 L56 42 M75 47 L64 42"), sweat: new Path2D("M95 50 q4 6 0 9 q-4 -3 0 -9z"),
    heart: new Path2D("M60 72 C52 66 50 60 54 57 C57 55 59 57 60 59 C61 57 63 55 66 57 C70 60 68 66 60 72 Z"),
    shadowArc: new Path2D("M41 76 A20 20 0 0 1 66 50.8"), glint: new Path2D("M44 60 A18 18 0 0 1 58 50"),
    lidLine: new Path2D("M30 92 Q60 101 90 92"), lidFill: new Path2D("M30 0 H90 V92 Q60 101 30 92 Z"), lidHi: new Path2D("M33 90.4 Q60 98.6 87 90.4")
  };
  // the lens face (xiaom.js: viewBox 37 47 46 46 at 2x)
  function eyeFace(c, w, h, st) {
    c.save(); c.scale(2, 2); c.translate(-37, -47);
    let g = c.createRadialGradient(55.4, 63.1, 0, 55.4, 63.1, 32.2); g.addColorStop(.55, "#fff"); g.addColorStop(1, "#c9c9c9");
    c.fillStyle = g; c.beginPath(); c.arc(60, 70, 23, 0, 7); c.fill();
    c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 2; c.beginPath(); c.arc(60, 70, 22, 0, 7); c.stroke();
    c.lineCap = "round"; c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 5; c.stroke(PATH.shadowArc);
    c.save(); if (st.pupil) c.transform(st.pupil.a, st.pupil.b, st.pupil.c, st.pupil.d, st.pupil.e, st.pupil.f);
    g = c.createRadialGradient(57.12, 65.68, 0, 57.12, 65.68, 18); g.addColorStop(0, "#3a3a3a"); g.addColorStop(.7, "#141414"); g.addColorStop(1, "#000");
    c.fillStyle = g; c.beginPath(); c.arc(60, 70, 12, 0, 7); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 65, 3.5, 0, 7); c.fill(); c.beginPath(); c.arc(56.5, 74, 1.5, 0, 7); c.fill(); c.restore();
    c.globalAlpha = .9; c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(PATH.glint); c.globalAlpha = 1;
    c.beginPath(); c.arc(60, 70, 23, 0, 7); c.clip(); c.translate(0, st.lid);   // the lid, cut to the lens
    c.save(); c.translate(0, 2.6); c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = 4; c.stroke(PATH.lidLine); c.restore();
    g = c.createLinearGradient(0, 0, 0, 96.5); g.addColorStop(.55, "#f7953f"); g.addColorStop(.86, "#f48020"); g.addColorStop(1, "#cf600c"); c.fillStyle = g; c.fill(PATH.lidFill);
    c.strokeStyle = "rgba(255,255,255,.28)"; c.lineWidth = 1.1; c.stroke(PATH.lidHi);
    c.strokeStyle = "#8a3c06"; c.lineWidth = 1.8; c.stroke(PATH.lidLine);
    c.restore();
  }
  // the body's face: cheek shines, blush, brows, sweat drop, mouth (xiaom.js: viewBox 18 38 84 64 at 2x)
  function bodyFace(c, w, h, st) {
    c.save(); c.scale(2, 2); c.translate(-18, -38);
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(28, 88, 4, 2.5, 0, 0, 7); c.ellipse(92, 88, 4, 2.5, 0, 0, 7); c.fill();
    if (st.blush > .01) { c.globalAlpha = st.blush; c.fillStyle = "#e5322b"; c.beginPath(); c.ellipse(29, 86, 8, 5, 0, 0, 7); c.ellipse(91, 86, 8, 5, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
    c.lineCap = "round";
    if (st.brow > .01) { c.globalAlpha = st.brow; c.strokeStyle = "#141414"; c.lineWidth = 2.6; c.stroke(PATH.brow); c.globalAlpha = 1; }
    if (st.sweat > .01) { c.save(); c.globalAlpha = st.sweat; c.translate(0, st.sweatY); c.fillStyle = "#fff"; c.fill(PATH.sweat); c.restore(); }
    c.strokeStyle = "#141414"; c.lineWidth = 2.2; c.stroke(PATH.mouth);
    c.restore();
  }
  // the back: the camera's screen with its heart (scr-rec / scr-num aren't used by the app's own 小M)
  function backFace(c, w, h, st) {
    c.fillStyle = "#141414"; c.beginPath(); c.roundRect(40, 24, 88, 64, 12); c.fill();
    if (!st.heart) return;
    c.save(); c.translate(84, 58); c.scale(2, 2); c.translate(-60, -64);
    c.translate(60, 64.5); c.scale(st.heart, st.heart); c.translate(-60, -64.5);   // fill-box centre of the heart
    c.fillStyle = css(ORANGE); c.fill(PATH.heart); c.restore();
  }

  // ---------- the model: xiaom.js build() for camSVG("", "", …), as flat primitives with a 3D matrix each ----------
  // layer: "w" = on .m25w (shadows, never move) · "b" = in cm-body · "t" = in cm-body > tuft spot > cm-tuft · "burst" = cm-burst
  const W = 168, H = 128, D = 88, R = 40, STEP = 2, F = D / 2, TUFT = [-14, -H / 2 - 14];
  const P = [];
  (function build() {
    let ord = 0;
    const add = (layer, m, w, h, o) => P.push(Object.assign({ layer, m, w, h, ord: ord++ }, o));
    const G = (x, y, z) => M().translate(x, y, z);
    add("w", box(-110, -60, 220, 120, "translate3d(0,90px,0) rotateX(90deg)"), 220, 120, { draw: (c, w, h) => radial(c, w, h, [[0, "rgba(0,0,0,.4)"], [1, "rgba(0,0,0,0)"]]) });
    add("w", box(-100, -26, 200, 52, "translate3d(4px,90px,6px) rotateX(90deg)"), 200, 52, { draw: (c, w, h) => radial(c, w, h, [[0, "rgba(0,0,0,.55)"], [.7, "rgba(0,0,0,.2)"], [1, "rgba(0,0,0,0)"]]) });
    function slab({ w, h, r, depth, x = 0, y = 0, z = 0, front, side, html, lit, eye, shape, back, layer = "b" }) {
      const g = G(x, y, z), n = Math.max(2, Math.round(depth / STEP));
      for (let i = 0; i <= n; i++) {
        const zz = -depth / 2 + depth * i / n, base = i === n || i === 0 ? front : side;
        let m = g.multiply(box(-w / 2, -h / 2, w, h, "translateZ(" + zz + "px)"));
        if (i === 0 && back) m = m.multiply(about(M("rotateY(180deg)"), w / 2, h / 2, 0));
        add(layer, m, w, h, { draw: (c, w, h, st) => {
          if (shape) { shape(c, w, h, eye ? eyeCol(base, st) : base); return; }
          c.save(); rr(c, w, h, r); c.clip();
          if (typeof base === "function") base(c, w, h); else { c.fillStyle = css(eye ? eyeCol(base, st) : base); c.fillRect(0, 0, w, h); }
          if (i === n && html) html(c, w, h, st);
          if (i === 0 && back) back(c, w, h, st);
          if (i === n && lit) litOver(c, w, h);
          c.restore();
        } });
      }
    }
    function rim({ w, h, r, depth, color, x = 0, y = 0, z = 0, n = 4, eye }) {
      const g = G(x, y, z);
      const face = ang => { const a = ang * Math.PI / 180, l = -(Math.cos(a) * .55 + Math.sin(a) * .83); return l > 0 ? l * 1.4 : l * 1.2; };
      const strip = (cx, cy, ang, len) => add("b", g.multiply(box(-depth / 2, -len / 2 - .5, depth, len + 1, "translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px) rotateZ(" + ang.toFixed(2) + "deg) rotateY(90deg)")),
        depth, len + 1, { quad: shade(color, face(ang)), eye });
      const sx = w / 2 - r, sy = h / 2 - r;
      if (sy > 0) { strip(w / 2, 0, 0, 2 * sy); strip(-w / 2, 0, 180, 2 * sy); }
      if (sx > 0) { strip(0, h / 2, 90, 2 * sx); strip(0, -h / 2, -90, 2 * sx); }
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([ax, ay], q) => {
        for (let i = 0; i < n; i++) {
          const a = (q * 90 + (i + .5) * 90 / n) * Math.PI / 180, len = 2 * r * Math.sin(Math.PI / 4 / n) * 1.04;
          strip(ax * sx + Math.cos(a) * r * Math.cos(Math.PI / 4 / n), ay * sy + Math.sin(a) * r * Math.cos(Math.PI / 4 / n), a * 180 / Math.PI, len);
        }
      });
    }
    function blob({ x, y, z, rx, rz, hgt }) {
      const g = G(x, y, z), n = Math.round(hgt / STEP);
      for (let i = 0; i <= n; i++) {
        const t = -1 + 2 * i / n, k = Math.sqrt(Math.max(0, 1 - t * t)) * .85 + .15, w = rx * 2 * k, d = rz * 2 * k, col = css(shade(ORANGE, .35 - .9 * i / n));
        add("b", g.multiply(box(-w / 2, -d / 2, w, d, "translateY(" + (t * hgt / 2) + "px) rotateX(90deg)")), w, d, { draw: (c, w, h) => { c.fillStyle = col; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); c.fill(); } });
      }
    }
    blob({ x: -40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 }); blob({ x: 40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 });
    const tk = Math.min(72 / 38, 34 / 17), toy = (34 - 17 * tk) / 2;
    slab({ w: 72, h: 34, r: 0, depth: 18, front: ORANGE, side: SIDE, layer: "t",
      shape: (c, w, h, col) => { c.save(); c.translate(0, toy); c.scale(tk, tk); c.translate(-33, -24); c.fillStyle = css(col); c.fill(PATH.tuft); c.restore(); } });
    add("t", box(-9, -11, 18, 26, "rotateY(90deg)"), 18, 26, { draw: (c, w, h) => { c.fillStyle = css(SIDE); c.beginPath(); c.roundRect(0, 0, w, h, [9, 9, 0, 0]); c.fill(); } });
    slab({ w: 32, h: 20, r: 6, depth: 22, x: 48, y: -H / 2 - 8, z: -6, front: WHITE, side: hex("#d9d9d9"), lit: 1 });
    rim({ w: 31, h: 19, r: 5.5, depth: 21, x: 48, y: -H / 2 - 8, z: -6, color: hex("#d9d9d9"), n: 3 });
    add("burst", null, 40, 28, { draw: (c, w, h, st) => { c.globalAlpha = st.burst; c.fillStyle = "#fff"; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); c.fill(); c.globalAlpha = 1; } });
    slab({ w: W, h: H, r: R, depth: D, side: SIDE, lit: 1, html: bodyFace, back: backFace,
      front: (c, w, h) => radialAt(c, w, h, .24, .18, 1.3, 1.2, [[0, css(mixc(ORANGE, WHITE, .3))], [.42, css(ORANGE)], [1, css(mixc(ORANGE, BLACK, .3))]]) });
    rim({ w: W - 2, h: H - 2, r: R - 1, depth: D - 2, color: SIDE, n: 5 });
    slab({ w: 104, h: 104, r: 52, depth: 6, z: F + 3, side: DEEP, front: (c, w, h) => linear135(c, w, h, [[0, css(mixc(DEEP, WHITE, .22))], [.5, css(DEEP)], [1, css(mixc(DEEP, BLACK, .35))]]) });
    rim({ w: 103, h: 103, r: 51.5, depth: 5, z: F + 3, color: DEEP, n: 6 });
    rim({ w: 91, h: 91, r: 45.5, depth: 15, z: F + 8, color: GREY, n: 6, eye: true });
    slab({ w: 92, h: 92, r: 46, depth: 16, z: F + 8, front: WHITE, side: GREY, eye: true, html: eyeFace });
  })();

  // ---------- the HTML the app puts in place of xiaom.js' camSVG ----------
  // the flat overlay (zzz / ? / confetti) is xiaom.js' own: taken from one CSS 小M, once
  let OVER = "";
  try { const s = X.camSVG("", "", "M"), i = s.indexOf('<svg class="m25o"'); if (i > 0) OVER = s.slice(i, s.lastIndexOf("</div>")); } catch (e) {}
  const SKEL = '<div class="m25v mc-sk" aria-hidden="true"><div class="abs m25w"><div class="abs m25t"><div class="abs m25r"><div class="abs cm-all"><div class="abs cm-body">' +
    '<div class="abs" style="transform:translate3d(' + TUFT[0] + 'px,' + TUFT[1] + 'px,0)"><div class="abs cm-tuft"></div></div>' +
    '<div class="slice cm-burst" style="left:28px;top:' + (-H / 2 - 22) + 'px;width:40px;height:28px;opacity:0;transform:translateZ(12px)"></div>' +
    '<div class="abs cm-blush"></div><div class="abs cm-brow"></div><div class="abs cm-sweat"></div>' +
    '<div class="abs cm-eyeside-s" style="--eye-s:#dcdcdc;background:#dcdcdc"></div><div class="abs cm-pupil"></div><div class="abs cm-lid"></div>' +
    '<div class="abs scr-heart"></div></div></div></div></div></div></div>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function html(back, label) {
    return '<div class="cam-svg m25s m25 mc' + (back ? " cam-back" : "") + '" role="img" aria-label="' + esc(label || (back ? "M, seen from behind" : "M")) + '">' +
      '<canvas class="mc-cv" aria-hidden="true"></canvas>' + SKEL + OVER + "</div>";
  }

  // ---------- one live 小M ----------
  const live = new Set();
  const q = (r, c) => r.querySelector("." + c);
  function mount(root) {
    if (root._mc) return;
    const cv = root.querySelector(".mc-cv"), ctx = cv && cv.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    const P2 = s => getComputedStyle(s);   // live CSSStyleDeclaration objects: read each frame, no new lookups
    const it = { root, cv, ctx, w: 0, h: 0, dpr: 1, sig: "", seen: true,
      cs: { t: P2(q(root, "m25t")), r: P2(q(root, "m25r")), all: P2(q(root, "cm-all")), body: P2(q(root, "cm-body")), tuft: P2(q(root, "cm-tuft")),
        burst: P2(q(root, "cm-burst")), blush: P2(q(root, "cm-blush")), brow: P2(q(root, "cm-brow")), sweat: P2(q(root, "cm-sweat")),
        side: P2(q(root, "cm-eyeside-s")), pupil: P2(q(root, "cm-pupil")), lid: P2(q(root, "cm-lid")), heart: P2(q(root, "scr-heart")) } };
    it.ro = new ResizeObserver(es => { const r = es[0].contentRect; it.w = r.width; it.h = r.height; it.sig = ""; wake(); });
    it.ro.observe(root);
    if (window.IntersectionObserver) { it.io = new IntersectionObserver(es => { it.seen = es[es.length - 1].isIntersecting; if (it.seen) { it.sig = ""; wake(); } }); it.io.observe(root); }
    root._mc = it; live.add(it); wake();
  }
  function unmount(it) { live.delete(it); it.ro.disconnect(); if (it.io) it.io.disconnect(); it.root._mc = null; }
  // a computed transform about its computed origin
  const tf = s => { const t = s.transform; if (!t || t === "none") return null; const m = new DOMMatrix(t), o = s.transformOrigin.split(" ").map(parseFloat);
    return o[0] || o[1] || o[2] ? about(m, o[0] || 0, o[1] || 0, o[2] || 0) : m; };
  const op = s => s.display === "none" ? 0 : parseFloat(s.opacity) || 0;

  function draw(it) {
    const { cs, ctx, w: bw, h: bh } = it;
    if (!bw || !bh) return;
    const sig = [cs.t.transform, cs.r.transform, cs.all.transform, cs.all.transformOrigin, cs.body.transform, cs.tuft.transform, cs.burst.transform, cs.burst.opacity,
      cs.blush.opacity, cs.brow.opacity, cs.sweat.opacity, cs.sweat.transform, cs.side.backgroundColor, cs.pupil.transform, cs.lid.transform, cs.heart.transform, cs.heart.display, bw, bh].join("|");
    if (sig === it.sig) return;   // nothing moved: no repaint, nothing for macOS to composite
    it.sig = sig;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), PAD = .25, cw = Math.round(bw * (1 + 2 * PAD) * dpr), ch = Math.round(bh * (1 + 2 * PAD) * dpr);
    if (it.cv.width !== cw || it.cv.height !== ch) { it.cv.width = cw; it.cv.height = ch; }
    const k = bw / 260, d = 900 * k, Ox = bw / 2, Oy = .615 * bh, POx = bw / 2, POy = .3 * bh;
    const I = M(), mt = tf(cs.t) || I, mr = tf(cs.r) || I, ma = tf(cs.all) || I, mb = tf(cs.body) || I;
    const dyn = mt.multiply(mr).multiply(ma).multiply(mb);
    const tuftM = dyn.translate(TUFT[0], TUFT[1], 0).multiply(tf(cs.tuft) || I);
    const lidM = cs.lid.transform !== "none" ? new DOMMatrix(cs.lid.transform) : null;
    const sb = cs.side.backgroundColor.match(/[\d.]+/g), side = sb ? Math.max(0, Math.min(1, (220 - +sb[2]) / (220 - 25))) : 0;
    const pm = cs.pupil.transform !== "none" ? new DOMMatrix(cs.pupil.transform) : null;
    const hs = cs.heart.display === "none" ? 0 : (cs.heart.transform !== "none" ? new DOMMatrix(cs.heart.transform).a : 1);
    const sw = cs.sweat.transform !== "none" ? new DOMMatrix(cs.sweat.transform).f : 0;
    const st = { lid: lidM ? lidM.f : -58, side, pupil: pm && (pm.e || pm.f || pm.a !== 1) ? pm : null, blush: op(cs.blush), brow: op(cs.brow), sweat: op(cs.sweat), sweatY: sw,
      heart: hs, burst: op(cs.burst) };
    const burstM = st.burst > .01 ? dyn.translate(28, -H / 2 - 22, 0).multiply(tf(cs.burst) || M("translateZ(12px)")) : null;
    const proj = (m, x, y) => { const p = m.transformPoint({ x, y, z: 0, w: 1 }), zz = k * p.z, s = d / Math.max(1, d - zz);
      return [POx + (Ox + k * p.x - POx) * s, POy + (Oy + k * p.y - POy) * s]; };
    const items = [];
    for (const pr of P) {
      let m;
      if (pr.layer === "w") m = pr.m; else if (pr.layer === "b") m = dyn.multiply(pr.m); else if (pr.layer === "t") m = tuftM.multiply(pr.m);
      else { if (!burstM) continue; m = burstM; }
      items.push({ pr, m, z: m.transformPoint({ x: pr.w / 2, y: pr.h / 2, z: 0, w: 1 }).z });
    }
    items.sort((a, b) => a.z - b.z || a.pr.ord - b.pr.ord);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
    const ox = bw * PAD * dpr, oy = bh * PAD * dpr;
    for (const { pr, m } of items) {
      const { w, h } = pr;
      if (pr.quad) {   // a rim strip: its four corners, exactly
        const a = proj(m, 0, 0), b = proj(m, w, 0), c = proj(m, w, h), e = proj(m, 0, h);
        ctx.setTransform(dpr, 0, 0, dpr, ox, oy); ctx.fillStyle = css(pr.eye ? eyeCol(pr.quad, st) : pr.quad);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill();
        continue;
      }
      // a face: affine fit at its centre (exact facing the camera, < 1 px off when he turns)
      const L = proj(m, 0, h / 2), Rr = proj(m, w, h / 2), T = proj(m, w / 2, 0), B = proj(m, w / 2, h), C = proj(m, w / 2, h / 2);
      const A = (Rr[0] - L[0]) / w, Bc = (Rr[1] - L[1]) / w, Cc = (B[0] - T[0]) / h, Dd = (B[1] - T[1]) / h;
      if (Math.abs(A * Dd - Bc * Cc) * w * h / Math.max(Math.hypot(A, Bc) * w, Math.hypot(Cc, Dd) * h, 1e-9) < .5) continue;   // edge-on
      ctx.setTransform(dpr * A, dpr * Bc, dpr * Cc, dpr * Dd, dpr * (C[0] - A * w / 2 - Cc * h / 2) + ox, dpr * (C[1] - Bc * w / 2 - Dd * h / 2) + oy);
      pr.draw(ctx, w, h, st);
    }
  }

  // ---------- one loop for every 小M on the page ----------
  // Runs while the window is in front. html.away (awaySync in app.js) or a hidden page: one last frame (the CSS has already let
  // go of his animations, so that is him standing still), then no frames at all until he is back. Frames where nothing moved
  // paint nothing; when nothing has moved for half a second (reduced motion, Settings → Animations) it checks 10 times a second.
  let raf = 0, idleT = 0, still = 0;
  const away = () => document.hidden || document.documentElement.classList.contains("away");
  function frame() {
    raf = 0; let moved = false;
    for (const it of live) {
      if (!it.root.isConnected) { unmount(it); continue; }
      if (!it.seen) continue;
      const before = it.sig;
      try { draw(it); } catch (e) { fail(it, e); continue; }
      if (it.sig !== before) moved = true;
    }
    if (!live.size || away()) return;
    still = moved ? 0 : still + 1;
    if (still > 30) { idleT = setTimeout(() => { idleT = 0; tick(); }, 100); return; }   // turn() animates with WAAPI: no class change to wake on
    raf = requestAnimationFrame(frame);
  }
  function tick() { if (!raf && !idleT) raf = requestAnimationFrame(frame); }
  function wake() { still = 0; if (idleT) { clearTimeout(idleT); idleT = 0; } if (away()) { if (!raf) raf = requestAnimationFrame(frame); return; } tick(); }
  // a 小M whose canvas fails: put the CSS 3D one in its place (only that one)
  function fail(it, e) {
    unmount(it);
    try { const back = it.root.classList.contains("cam-back"), t = document.createElement("div"); t.innerHTML = back ? X.camBackSVG("", it.root.getAttribute("aria-label") || "M") : X.camSVG("", "", it.root.getAttribute("aria-label") || "M");
      const n = t.firstElementChild; [...it.root.classList].forEach(c => n.classList.add(c)); n.classList.remove("mc"); it.root.replaceWith(n); } catch (e2) {}
    if (window.console) console.warn("小M canvas:", e);
  }
  function scan(n) {
    if (n.nodeType !== 1) return;
    const list = n.matches(".m25.mc") ? [n] : n.querySelectorAll(".m25.mc");
    list.forEach(r => { try { mount(r); } catch (e) { fail({ root: r, ro: { disconnect() {} } }, e); } });
  }
  new MutationObserver(ms => ms.forEach(r => r.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
  // class changes anywhere (a move, a mood, .listen / .think, html.away) and coming back to the window wake the loop at once
  new MutationObserver(wake).observe(document.documentElement, { attributes: true, attributeFilter: ["class"], subtree: true });
  document.addEventListener("visibilitychange", wake);
  addEventListener("focus", wake);
  if (document.body) scan(document.body);

  // cost(n): ms per full redraw of the first 小M on screen, n times (for checking frame cost on a phone from the console)
  const cost = (n = 60) => { const it = [...live].find(x => x.w && x.h); if (!it) return null; const t = performance.now(); for (let i = 0; i < n; i++) { it.sig = ""; draw(it); } return +((performance.now() - t) / n).toFixed(3); };
  return { html, count: () => live.size, cost };
})();
