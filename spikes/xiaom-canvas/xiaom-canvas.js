// SPIKE (not in the app): 小M drawn into one <canvas> instead of ~300 CSS-3D divs.
// Same model as vendor/xiaom/xiaom.js build() for camSVG("", "", …): the same slabs, rims, feet, tuft and lens, the same sizes,
// colours and light, the same perspective (900 model px, origin 50% 30%, model at 50% 61.5%, 260 model px = box width).
// Every slice/strip becomes one flat primitive with a 3D matrix; each frame they are projected, sorted back to front and
// painted. Only the canvas is one layer, so WebKit/WindowServer composite one bitmap instead of ~226 layers.
// Animations are the same keyframes as the CSS (x5bob, x5lid, x5lidside, x5look) and the app's .listen (x5nod) / .think tilt.
(function () {
  "use strict";
  // ---------- colours ----------
  const hex = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const css = c => "rgb(" + c.map(v => Math.round(v)).join(",") + ")";
  const mixc = (a, b, p) => a.map((v, i) => v + (b[i] - v) * p);          // color-mix(in srgb, a, b p)
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const ORANGE = hex("#f48020"), SIDE = hex("#cf6612"), DEEP = hex("#b0560e"), LIDC = hex("#e57519");
  const shade = (c, lit) => lit >= 0 ? mixc(c, WHITE, Math.min(40, Math.round(lit * 22)) / 100) : mixc(c, BLACK, Math.min(55, Math.round(-lit * 38)) / 100);

  // ---------- easing + keyframes (CSS semantics: each segment eased by the timing function of the keyframe it starts at) ----------
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; }
      if (sx(t) - x > 1e-4 || x - sx(t) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } } return sy(t); };
  }
  const EASE = bezier(.25, .1, .25, 1), EIO = bezier(.42, 0, .58, 1);
  // kf: [[offset, value, tf?], ...]; value = number or array of numbers
  function track(kf, defTf) {
    return p => {
      if (p <= kf[0][0]) return kf[0][1];
      for (let i = 0; i < kf.length - 1; i++) {
        const [o0, v0, tf] = kf[i], [o1, v1] = kf[i + 1];
        if (p <= o1) { const e = (tf || defTf)((p - o0) / (o1 - o0 || 1)); return Array.isArray(v0) ? v0.map((v, j) => v + (v1[j] - v) * e) : v0 + (v1 - v0) * e; }
      }
      return kf[kf.length - 1][1];
    };
  }
  const B1 = bezier(.5, 0, .9, .5), B2 = bezier(.2, .6, .4, 1);
  const bob = track([[0, [0, 1, 1]], [.5, [-7, 1.01, 1.02]], [1, [0, 1, 1]]], EIO);                       // x5bob 2.6s: translateY, scaleX, scaleY
  const lid = track([[0, -58], [.32, -58, B1], [.33, 0, B2], [.335, 0, B2], [.35, -58, B1], [.86, -58, B1], [.87, 0, B2], [.882, -34, B1], [.89, 0, B2], [.894, 0, B2], [.91, -58], [1, -58]], EASE); // x5lid 9s
  const lidside = track([[0, 0], [.326, 0], [.33, 1], [.335, 1], [.341, 0], [.866, 0], [.87, 1], [.875, 0], [.887, 0], [.89, 1], [.894, 1], [.898, 0], [1, 0]], EASE); // x5lidside 9s
  const look = track([[0, [0, 0]], [.30, [0, 0]], [.38, [-14, -3]], [.46, [-14, -3]], [.56, [12, 0]], [.62, [12, 0]], [.70, [0, 0]], [1, [0, 0]]], EIO); // x5look 11s, 3s delay: rotateY, rotateX
  const nod = track([[0, [0, 0]], [.5, [4, -18]], [1, [0, 0]]], EIO);                                    // x5nod .5s: translateY, rotateX
  const frac = (t, d) => { const p = (t % d) / d; return p < 0 ? p + 1 : p; };

  // ---------- matrices (DOMMatrix = CSS transform semantics) ----------
  const M = s => new DOMMatrix(s || undefined);
  const about = (m, ox, oy, oz) => M().translate(ox, oy, oz).multiply(m).translate(-ox, -oy, -oz);   // transform-origin
  // a CSS box at (left, top) of size w x h inside its parent, with transform `tr` about its centre (CSS default origin 50% 50%)
  const box = (left, top, w, h, tr) => M().translate(left, top).multiply(about(M(tr), w / 2, h / 2, 0));

  // ---------- the model (vendor/xiaom/xiaom.js build(), hat "" hold "") ----------
  const W = 168, H = 128, D = 88, R = 40, STEP = 2, F = D / 2;
  function buildModel() {
    const P = [];  // primitives: { m: DOMMatrix local→parent-group, w, h, draw(ctx, st) | fill: rgb | colorFn, kind, layer }
    let order = 0;
    const add = (layer, m, w, h, o) => P.push(Object.assign({ layer, m, w, h, ord: order++ }, o));

    // shadows (on .m25w, never move)
    add("w", box(-110, -60, 220, 120, "translate3d(0,90px,0) rotateX(90deg)"), 220, 120, { kind: "draw", draw: (c, w, h) => radial(c, w, h, [[0, "rgba(0,0,0,.4)"], [1, "rgba(0,0,0,0)"]]) });
    add("w", box(-100, -26, 200, 52, "translate3d(4px,90px,6px) rotateX(90deg)"), 200, 52, { kind: "draw", draw: (c, w, h) => radial(c, w, h, [[0, "rgba(0,0,0,.55)"], [.7, "rgba(0,0,0,.2)"], [1, "rgba(0,0,0,0)"]]) });

    // a group translate
    const G = (x, y, z) => M().translate(x, y, z);
    function slab({ w, h, r, depth, x = 0, y = 0, z = 0, front, side, html, lit, eye, shape, back }) {
      const g = G(x, y, z), n = Math.max(2, Math.round(depth / STEP));
      for (let i = 0; i <= n; i++) {
        const zz = -depth / 2 + depth * i / n, ends = i === n || i === 0;
        let m = g.multiply(box(-w / 2, -h / 2, w, h, "translateZ(" + zz + "px)"));
        if (i === 0 && back) m = m.multiply(about(M("rotateY(180deg)"), w / 2, h / 2, 0));
        const base = ends ? front : side;
        add("b", m, w, h, { kind: "draw", eye: eye ? (typeof base === "string" ? null : base) : null,
          draw: (c, w, h, st) => {
            if (shape) { shape(c, w, h, eye ? eyeCol(base, st) : base); return; }
            c.save(); rr(c, w, h, r); c.clip();
            if (typeof base === "function") base(c, w, h); else { c.fillStyle = css(eye ? eyeCol(base, st) : base); c.fillRect(0, 0, w, h); }
            if (i === n && html) html(c, w, h, st);
            if (i === 0 && back) back(c, w, h);
            if (i === n && lit) litOver(c, w, h);
            c.restore();
          } });
      }
    }
    function rim({ w, h, r, depth, color, x = 0, y = 0, z = 0, n = 4, eye }) {
      const g = G(x, y, z);
      const face = ang => { const a = ang * Math.PI / 180, l = -(Math.cos(a) * .55 + Math.sin(a) * .83); return l > 0 ? l * 1.4 : l * 1.2; };
      const strip = (cx, cy, ang, len) => {
        const col = shade(color, face(ang));
        add("b", g.multiply(box(-depth / 2, -len / 2 - .5, depth, len + 1, "translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px) rotateZ(" + ang.toFixed(2) + "deg) rotateY(90deg)")), depth, len + 1,
          { kind: "quad", col, eye });
      };
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
        add("b", g.multiply(box(-w / 2, -d / 2, w, d, "translateY(" + (t * hgt / 2) + "px) rotateX(90deg)")), w, d, { kind: "draw", draw: (c, w, h) => { c.fillStyle = col; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); c.fill(); } });
      }
    }

    // feet
    blob({ x: -40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 }); blob({ x: 40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 });
    // tuft (hat "" keeps it): a 72x34 path extruded 18 deep, plus one side-on plane through it
    const tuftPath = new Path2D("M36 40 C34 30 42 26 48 32 L52 36 L56 32 C62 26 70 30 68 40 Z");
    const tuftK = Math.min(72 / 38, 34 / 17), tuftOy = (34 - 17 * tuftK) / 2;
    const TG = { x: -14, y: -H / 2 - 14 };
    slab({ w: 72, h: 34, r: 0, depth: 18, x: TG.x, y: TG.y, front: ORANGE, side: SIDE,
      shape: (c, w, h, col) => { c.save(); c.translate(0, tuftOy); c.scale(tuftK, tuftK); c.translate(-33, -24); c.fillStyle = css(col); c.fill(tuftPath); c.restore(); } });
    add("b", G(TG.x, TG.y, 0).multiply(box(-9, -11, 18, 26, "rotateY(90deg)")), 18, 26, { kind: "draw", draw: (c, w, h) => { c.fillStyle = css(SIDE); c.beginPath(); c.roundRect(0, 0, w, h, [9, 9, 0, 0]); c.fill(); } });
    // the white top piece
    slab({ w: 32, h: 20, r: 6, depth: 22, x: 48, y: -H / 2 - 8, z: -6, front: WHITE, side: hex("#d9d9d9"), lit: 1 });
    rim({ w: 31, h: 19, r: 5.5, depth: 21, x: 48, y: -H / 2 - 8, z: -6, color: hex("#d9d9d9"), n: 3 });
    // body
    const bodyFront = (c, w, h) => radialAt(c, w, h, .24, .18, 1.3, 1.2, [[0, css(mixc(ORANGE, WHITE, .3))], [.42, css(ORANGE)], [1, css(mixc(ORANGE, BLACK, .3))]]);
    const hiL = new Path2D("M55 96 Q60 99 65 96");
    slab({ w: W, h: H, r: R, depth: D, front: bodyFront, side: SIDE, lit: 1,
      html: c => { c.save(); c.scale(2, 2); c.translate(-18, -38);
        c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(28, 88, 4, 2.5, 0, 0, 7); c.ellipse(92, 88, 4, 2.5, 0, 0, 7); c.fill();
        c.strokeStyle = "#141414"; c.lineWidth = 2.2; c.lineCap = "round"; c.stroke(hiL); c.restore(); },
      back: c => { c.fillStyle = "#141414"; c.beginPath(); c.roundRect(40, 24, 88, 64, 12); c.fill();
        c.save(); c.translate(84, 58); c.scale(2, 2); c.translate(-60, -64); c.fillStyle = css(ORANGE); c.fill(new Path2D("M60 72 C52 66 50 60 54 57 C57 55 59 57 60 59 C61 57 63 55 66 57 C70 60 68 66 60 72 Z")); c.restore(); } });
    rim({ w: W - 2, h: H - 2, r: R - 1, depth: D - 2, color: SIDE, n: 5 });
    // lens ring
    slab({ w: 104, h: 104, r: 52, depth: 6, z: F + 3, side: DEEP,
      front: (c, w, h) => linear135(c, w, h, [[0, css(mixc(DEEP, WHITE, .22))], [.5, css(DEEP)], [1, css(mixc(DEEP, BLACK, .35))]]) });
    rim({ w: 103, h: 103, r: 51.5, depth: 5, z: F + 3, color: DEEP, n: 6 });
    // the eye: white sides turn the lid colour while it is shut (x5lidside)
    rim({ w: 91, h: 91, r: 45.5, depth: 15, z: F + 8, color: hex("#dcdcdc"), n: 6, eye: true });
    slab({ w: 92, h: 92, r: 46, depth: 16, z: F + 8, front: WHITE, side: hex("#dcdcdc"), eye: true, html: eyeFace });
    return P;
  }
  const eyeCol = (base, st) => st.lidside ? mixc(base, LIDC, st.lidside) : base;

  // ---------- 2D helpers (all in a primitive's own CSS box) ----------
  function rr(c, w, h, r) { c.beginPath(); if (r >= Math.min(w, h) / 2 && w === h) c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); else c.roundRect(0, 0, w, h, Math.min(r, w / 2, h / 2)); }
  // radial-gradient(closest-side, …) on an ellipse box
  function radial(c, w, h, stops) { c.save(); c.translate(w / 2, h / 2); c.scale(w / 2, h / 2); const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore(); }
  // radial-gradient(RX% RY% at CX% CY%, …)
  function radialAt(c, w, h, cx, cy, rx, ry, stops) { c.save(); c.translate(cx * w, cy * h); c.scale(rx * w, ry * h); const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(-cx / rx, -cy / ry, 1 / rx, 1 / ry); c.restore(); }
  // linear-gradient(135deg, …): towards the bottom right, line length |w sin a| + |h cos a|
  function linear135(c, w, h, stops) { const L = (w + h) * Math.SQRT1_2, dx = Math.SQRT1_2 * L / 2, dy = Math.SQRT1_2 * L / 2;
    const g = c.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  // .m25lit: the key light from the upper left (linear under, radial sheen on top)
  function litOver(c, w, h) {
    linear135(c, w, h, [[0, "rgba(255,255,255,.22)"], [.45, "rgba(255,255,255,0)"], [.45, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.42)"]]);
    radialAt(c, w, h, .26, .20, .6, .5, [[0, "rgba(255,255,255,.5)"], [.7, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]);
  }
  // the lens face (viewBox 37 47 46 46 at 2x)
  const EYE = {
    shadowArc: new Path2D("M41 76 A20 20 0 0 1 66 50.8"), glint: new Path2D("M44 60 A18 18 0 0 1 58 50"),
    lidShadow: new Path2D("M30 92 Q60 101 90 92"), lidFill: new Path2D("M30 0 H90 V92 Q60 101 30 92 Z"), lidHi: new Path2D("M33 90.4 Q60 98.6 87 90.4")
  };
  function eyeFace(c, w, h, st) {
    c.save(); c.scale(2, 2); c.translate(-37, -47);
    let g = c.createRadialGradient(37 + .4 * 46, 47 + .35 * 46, 0, 37 + .4 * 46, 47 + .35 * 46, .7 * 46); g.addColorStop(.55, "#fff"); g.addColorStop(1, "#c9c9c9");
    c.fillStyle = g; c.beginPath(); c.arc(60, 70, 23, 0, 7); c.fill();
    c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 2; c.beginPath(); c.arc(60, 70, 22, 0, 7); c.stroke();
    c.lineCap = "round"; c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 5; c.stroke(EYE.shadowArc);
    g = c.createRadialGradient(48 + .38 * 24, 58 + .32 * 24, 0, 48 + .38 * 24, 58 + .32 * 24, .75 * 24); g.addColorStop(0, "#3a3a3a"); g.addColorStop(.7, "#141414"); g.addColorStop(1, "#000");
    c.fillStyle = g; c.beginPath(); c.arc(60, 70, 12, 0, 7); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 65, 3.5, 0, 7); c.fill(); c.beginPath(); c.arc(56.5, 74, 1.5, 0, 7); c.fill();
    c.globalAlpha = .9; c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(EYE.glint); c.globalAlpha = 1;
    // the lid, clipped to the lens
    c.beginPath(); c.arc(60, 70, 23, 0, 7); c.clip(); c.translate(0, st.lid);
    c.save(); c.translate(0, 2.6); c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = 4; c.stroke(EYE.lidShadow); c.restore();
    g = c.createLinearGradient(0, 0, 0, 96.5); g.addColorStop(.55, "#f7953f"); g.addColorStop(.86, "#f48020"); g.addColorStop(1, "#cf600c"); c.fillStyle = g; c.fill(EYE.lidFill);
    c.strokeStyle = "rgba(255,255,255,.28)"; c.lineWidth = 1.1; c.stroke(EYE.lidHi);
    c.strokeStyle = "#8a3c06"; c.lineWidth = 1.8; c.stroke(EYE.lidShadow);
    c.restore();
  }

  // ---------- one mounted 小M ----------
  function mount(host, opt = {}) {
    const PAD = .25;                     // the canvas reaches past the box like the CSS model does (overflow visible)
    const cv = document.createElement("canvas"); cv.className = "xmc";
    cv.style.cssText = "position:absolute;left:" + (-PAD * 100) + "%;top:" + (-PAD * 100) + "%;width:" + (100 + 2 * PAD * 100) + "%;height:" + (100 + 2 * PAD * 100) + "%;pointer-events:none";
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.appendChild(cv);
    const ctx = cv.getContext("2d");
    const P = buildModel();
    let bw = 0, bh = 0, dpr = 1, raf = 0, t0 = performance.now(), frozen = null, state = opt.state || "", thinkW = state === "think" ? 1 : 0, thinkFrom = thinkW, thinkAt = 0;
    function size() { const r = host.getBoundingClientRect(); bw = r.width; bh = r.height; dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(bw * (1 + 2 * PAD) * dpr); cv.height = Math.round(bh * (1 + 2 * PAD) * dpr); }
    size();
    // resizing clears the canvas: draw again at once (a frozen 小M has no next frame)
    const ro = window.ResizeObserver ? new ResizeObserver(() => { size(); if (frozen != null) draw(frozen); }) : null; if (ro) ro.observe(host);

    function draw(t) {
      if (!bw) return;
      const k = bw / 260, d = 900 * k, Ox = bw / 2, Oy = .615 * bh, POx = bw / 2, POy = .3 * bh;
      // dynamic groups: m25t (look) > cm-all (listen / think, origin 0 86 0) > cm-body (bob)
      const lk = t >= 3 ? look(frac(t - 3, 11)) : [0, 0];
      const Look = M("rotateY(" + lk[0] + "deg) rotateX(" + lk[1] + "deg)");
      const now = performance.now();
      const tw = thinkFrom + ((state === "think" ? 1 : 0) - thinkFrom) * EASE(Math.min(1, (now - thinkAt) / 300)); thinkW = tw;
      let all = M();
      if (state === "listen") { const n = nod(frac(t, .5)); all = M("translateY(" + n[0] + "px) rotateX(" + n[1] + "deg)"); }
      else if (tw) all = M("rotateZ(" + (-7 * tw) + "deg) rotateY(" + (-16 * tw) + "deg)");
      const All = about(all, 0, 86, 0);
      const b = bob(frac(t, 2.6)), Body = M("translateY(" + b[0] + "px) scale(" + b[1] + "," + b[2] + ")");
      const dyn = Look.multiply(All).multiply(Body);
      const st = { lid: lid(frac(t, 9)), lidside: lidside(frac(t, 9)) };

      const proj = (m, x, y) => { const p = m.transformPoint({ x, y, z: 0, w: 1 }), zz = k * p.z, s = d / (d - zz);
        return [POx + (Ox + k * p.x - POx) * s, POy + (Oy + k * p.y - POy) * s, p.z]; };
      const items = [];
      for (const pr of P) {
        const m = pr.layer === "w" ? pr.m : dyn.multiply(pr.m);
        const c = m.transformPoint({ x: pr.w / 2, y: pr.h / 2, z: 0, w: 1 });
        items.push({ pr, m, z: c.z });
      }
      items.sort((a, b) => a.z - b.z || a.pr.ord - b.pr.ord);
      const off = PAD;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      const S = dpr, ox = bw * off * dpr, oy = bh * off * dpr;
      for (const { pr, m } of items) {
        const { w, h } = pr;
        if (pr.kind === "quad") {
          const a = proj(m, 0, 0), b2 = proj(m, w, 0), c2 = proj(m, w, h), e = proj(m, 0, h);
          ctx.setTransform(S, 0, 0, S, ox, oy);
          ctx.fillStyle = css(pr.eye ? eyeCol(pr.col, st) : pr.col);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill();
          continue;
        }
        // affine fit at the centre of the plane (exact for planes facing the camera; slight error only when 小M turns his head)
        const L = proj(m, 0, h / 2), Rr = proj(m, w, h / 2), T = proj(m, w / 2, 0), Bm = proj(m, w / 2, h), C = proj(m, w / 2, h / 2);
        const A = (Rr[0] - L[0]) / w, Bc = (Rr[1] - L[1]) / w, Cc = (Bm[0] - T[0]) / h, Dd = (Bm[1] - T[1]) / h;
        // edge-on: thinner than half a CSS px across (a CSS plane seen this way leaves next to nothing either)
        const det = Math.abs(A * Dd - Bc * Cc); if (det * w * h / Math.max(Math.hypot(A, Bc) * w, Math.hypot(Cc, Dd) * h, 1e-9) < .5) continue;
        const E = C[0] - A * w / 2 - Cc * h / 2, Fo = C[1] - Bc * w / 2 - Dd * h / 2;
        ctx.setTransform(S * A, S * Bc, S * Cc, S * Dd, S * E + ox, S * Fo + oy);
        pr.draw(ctx, w, h, st);
      }
    }
    function tick() { raf = requestAnimationFrame(tick); draw((performance.now() - t0) / 1000); }
    if (opt.time != null) { frozen = opt.time; requestAnimationFrame(() => draw(frozen)); } else raf = requestAnimationFrame(tick);
    return {
      canvas: cv,
      setState(s) { if (s === state) return; thinkFrom = thinkW; thinkAt = performance.now(); state = s || ""; if (frozen != null) { thinkFrom = thinkW = state === "think" ? 1 : 0; draw(frozen); } },
      renderAt(t) { cancelAnimationFrame(raf); frozen = t; draw(t); },
      play() { frozen = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); },
      primitives: P.length,
      destroy() { cancelAnimationFrame(raf); if (ro) ro.disconnect(); cv.remove(); }
    };
  }
  window.XiaoMCanvas = { mount };
})();
