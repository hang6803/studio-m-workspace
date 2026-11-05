// Studio M Workspace — the 3D graph on Home. Plain canvas, no libraries (the Mac app works offline).
// Nodes: drives (orange, big), editors (white, initials), jobs (small: green backed up, red not backed up),
// upcoming shoots (hollow). A 3D force layout settles in front of you; the camera turns slowly until you touch it.
// Drag = orbit, wheel / pinch = zoom, hover = light up the neighbours, click = pin (the camera glides to it),
// double-click (or tap a pinned node again) = open. Nothing here reads or writes data: app.js hands it nodes + links.
"use strict";
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (dt, k) => 1 - Math.exp(-dt * k);   // frame-rate independent smoothing

  function Graph3D(canvas, opt) {
    opt = opt || {};
    const ctx = canvas.getContext("2d");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false;
    let nodes = [], links = [], byId = new Map(), adj = new Map();
    let col = {};
    // camera: orbit around (tx,ty,tz)
    const cam = { yaw: 0.6, pitch: -0.32, dist: 620, tx: 0, ty: 0, tz: 0, gDist: 620, zoom: 1, fit: 300 };
    let alpha = 0;                 // layout heat: 1 = moving a lot, 0 = settled
    let hover = null, pinned = null, idleAt = 0, filter = null, fly = null;
    const ptrs = new Map(); let drag = null, pinch = 0, moved = 0, lastTap = { id: null, t: 0 };

    function theme() {
      const s = getComputedStyle(canvas);
      const v = n => s.getPropertyValue(n).trim();
      col = { bg: v("--bg"), ink: v("--fg"), muted: v("--muted"), line: v("--line"), ok: v("--ok"), no: v("--danger"), acc: v("--accent") || "#f48020", s1: v("--surface"), panel: v("--panel") };
      const rgb = /^#[0-9a-f]{6}$/i.test(col.bg) ? [1, 3, 5].map(i => parseInt(col.bg.slice(i, i + 2), 16)) : [0, 0, 0];
      col.dark = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11 < 110; sprites.clear();
    }
    function size() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      refit(); cam.dist = cam.gDist;
      kick();
    }
    // the camera stands far enough back that most of the graph fills the monitor; wheel / pinch scale that (zoom)
    function refit() {
      if (nodes.length) {
        const d = nodes.map(n => Math.hypot(n.x, n.y, n.z)).sort((a, b) => a - b);
        cam.fit = Math.max(120, d[Math.floor(d.length * 0.9)] || 120);
      }
      cam.gDist = clamp(cam.fit * 3.1 * cam.zoom, 160, 2400);
    }
    const radiusOf = n => n.kind === "drive" ? 15 : n.kind === "editor" ? 12 : 5;

    // ---------------------------------------------------------------- data
    function setData(d) {
      const old = byId;
      nodes = d.nodes.map(n => {
        const o = old.get(n.id);
        const nn = Object.assign({}, n, { r: radiusOf(n), vx: 0, vy: 0, vz: 0, lit: o ? o.lit : 0, show: o ? o.show : 0, seen: !!o });
        if (o) { nn.x = o.x; nn.y = o.y; nn.z = o.z; }
        else { const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1), rr = 30 + Math.random() * 40; nn.x = rr * Math.sin(b) * Math.cos(a); nn.y = rr * Math.cos(b); nn.z = rr * Math.sin(b) * Math.sin(a); }
        return nn;
      });
      byId = new Map(nodes.map(n => [n.id, n]));
      links = d.links.map(l => ({ a: byId.get(l.a), b: byId.get(l.b) })).filter(l => l.a && l.b);
      adj = new Map(nodes.map(n => [n.id, new Set()]));
      links.forEach(l => { adj.get(l.a.id).add(l.b.id); adj.get(l.b.id).add(l.a.id); });
      nodes.forEach(n => { n.deg = adj.get(n.id).size; });
      if (pinned && !byId.has(pinned.id)) { pinned = null; opt.onPin && opt.onPin(null); }
      else if (pinned) pinned = byId.get(pinned.id);
      hover = null;
      alpha = 1;
      const warm = still ? 320 : (old.size ? 30 : 60);   // the rest of the settling is shown, so it unfolds in front of you
      for (let i = 0; i < warm; i++) step(1 / 60, true);
      refit();
      kick();
    }

    // ---------------------------------------------------------------- forces (n is a few hundred at most)
    function step(dt, silent) {
      if (alpha < 0.002) { alpha = 0; return; }
      const n = nodes.length, k = alpha;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z, d2 = dx * dx + dy * dy + dz * dz + 0.01;
          if (d2 > 160000) continue;
          const hubs = (a.kind !== "job" && a.kind !== "shoot" ? 1 : 0) + (b.kind !== "job" && b.kind !== "shoot" ? 1 : 0);
          const f = (hubs === 2 ? 9000 : hubs === 1 ? 2200 : 700) / d2 * k, inv = 1 / Math.sqrt(d2);
          dx *= inv * f; dy *= inv * f; dz *= inv * f;
          a.vx += dx; a.vy += dy; a.vz += dz; b.vx -= dx; b.vy -= dy; b.vz -= dz;
        }
      }
      for (const l of links) {
        const a = l.a, b = l.b, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const rest = 70, f = (d - rest) * 0.02 * k / d;
        const wa = 1 / (1 + a.deg * 0.15), wb = 1 / (1 + b.deg * 0.15);
        a.vx += dx * f * wa; a.vy += dy * f * wa; a.vz += dz * f * wa; b.vx -= dx * f * wb; b.vy -= dy * f * wb; b.vz -= dz * f * wb;
      }
      for (const a of nodes) {
        a.vx -= a.x * 0.004 * k; a.vy -= a.y * (W < H ? 0.004 : 0.006) * k; a.vz -= a.z * 0.004 * k;   // gravity; flatter in y on a wide monitor
        a.vx *= 0.82; a.vy *= 0.82; a.vz *= 0.82;
        a.x += a.vx; a.y += a.vy; a.z += a.vz;
      }
      alpha *= silent ? 0.985 : Math.pow(0.985, dt * 60);
    }

    // ---------------------------------------------------------------- camera + projection
    let proj = [];
    function project() {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const f = Math.min(W, H * 1.25) * 1.05;
      proj.length = 0;
      for (const n of nodes) {
        const x = n.x - cam.tx, y = n.y - cam.ty, z = n.z - cam.tz;
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const zc = z2 + cam.dist;
        if (zc < 20) { n.vis = false; continue; }
        const s = f / zc;
        n.sx = W / 2 + x1 * s; n.sy = H / 2 + y2 * s; n.ss = s; n.zc = zc; n.vis = true;
        proj.push(n);
      }
      proj.sort((a, b) => b.zc - a.zc);   // far first
    }

    // ---------------------------------------------------------------- drawing
    const focus = () => hover || pinned;
    function lightSet() {
      const f = focus(); if (!f) return null;
      const s = new Set([f.id]); adj.get(f.id).forEach(id => s.add(id)); return s;
    }
    // light: each colour gets a soft glow sprite, drawn additively on the dark monitor so crossings get brighter
    const sprites = new Map();
    function glow(c) {
      let g = sprites.get(c); if (g) return g;
      g = document.createElement("canvas"); g.width = g.height = 128;
      const x = g.getContext("2d"), rg = x.createRadialGradient(64, 64, 0, 64, 64, 64), m = /^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(",") : "244,128,32";
      [[0, 1], [0.12, 0.85], [0.3, 0.38], [0.55, 0.12], [0.8, 0.03], [1, 0]].forEach(([o, al]) => rg.addColorStop(o, `rgba(${m},${al})`));
      x.fillStyle = rg; x.fillRect(0, 0, 128, 128);
      sprites.set(c, g); return g;
    }
    const spark = (c, x, y, r, a) => { if (a <= 0.003 || r < 0.5) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glow(c), x - r, y - r, r * 2, r * 2); };
    // dust: a few hundred faint motes around the graph, so the space itself has depth
    const dust = Array.from({ length: 220 }, () => { const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1), r = 0.5 + Math.random() * 1.6; return { x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b) * 0.7, z: r * Math.sin(b) * Math.sin(a), p: Math.random() * TAU }; });
    function drawDust(now) {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), f = Math.min(W, H * 1.25) * 1.05, R = cam.fit * 1.6;
      ctx.fillStyle = col.dark ? "#ffffff" : col.muted;
      for (const d of dust) {
        const x = d.x * R - cam.tx * 0.3, y = d.y * R - cam.ty * 0.3, z = d.z * R - cam.tz * 0.3;
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp - z1 * sp, zc = y * sp + z1 * cp + cam.dist;
        if (zc < 20) continue;
        const s = f / zc, px = W / 2 + x1 * s, py = H / 2 + y2 * s; if (px < 0 || py < 0 || px > W || py > H) continue;
        ctx.globalAlpha = clamp(0.5 - zc / (cam.dist * 4), 0.04, 0.4) * (0.55 + 0.45 * Math.sin(now / 1400 + d.p));
        const r = clamp(s * 1.1, 0.4, 1.6); ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }
    }
    function draw(dt, now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      project();
      const lit = lightSet(), near = 300, far = cam.dist + 420, F = focus(), add = col.dark ? "lighter" : "source-over";
      const fog = n => clamp(1 - (n.zc - near) / (far - near) * 0.75, 0.18, 1);
      for (const n of nodes) {
        const want = lit ? (lit.has(n.id) ? 1 : -1) : 0;
        n.lit += (want - n.lit) * ease(dt, 10);
        const sh = !filter || filter(n) ? 1 : 0;
        n.show += (sh - n.show) * ease(dt, n.seen ? 8 : 4);
      }
      drawDust(now);
      ctx.globalCompositeOperation = add;
      // links: thin filaments of light; the ones on the focused dot burn orange and carry a travelling spark
      ctx.lineCap = "round";
      const thread = col.dark ? mix(col.muted, col.acc, 0.25) : col.muted, hot = mix(col.acc, "#fff", col.dark ? 0.35 : 0);
      for (const l of links) {
        const a = l.a, b = l.b; if (!a.vis || !b.vis) continue;
        const show = Math.min(a.show, b.show); if (show < 0.02) continue;
        const on = lit && lit.has(a.id) && lit.has(b.id) && (a === F || b === F);
        const fa = (fog(a) + fog(b)) / 2;
        if (on) {
          if (col.dark) { ctx.strokeStyle = col.acc; ctx.globalAlpha = 0.22 * fa * show; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); }
          ctx.strokeStyle = hot; ctx.globalAlpha = 0.95 * fa * show; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
          if (!still) {   // the spark runs out from the focused dot
            const [p, q] = a === F ? [a, b] : [b, a], t = ((now / 1100) + (q.sx * 0.013)) % 1, e = t * t * (3 - 2 * t);
            const px = p.sx + (q.sx - p.sx) * e, py = p.sy + (q.sy - p.sy) * e, sa = fa * show * Math.sin(t * Math.PI);
            if (col.dark) spark(col.acc, px, py, 7, sa);
            else { ctx.globalAlpha = sa; ctx.fillStyle = col.acc; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill(); }
          }
        } else {
          ctx.strokeStyle = thread; ctx.globalAlpha = (lit ? 0.05 : col.dark ? 0.26 : 0.2) * fa * show; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
        }
      }
      // nodes, far to near: a glow, then a hot core
      const pulse = 0.5 + 0.5 * Math.sin(now / 520);
      for (const n of proj) {
        if (n.show < 0.02) continue;
        const fa = fog(n), dim = n.lit < 0 ? 1 + n.lit * 0.8 : 1, big = 1 + Math.max(0, n.lit) * 0.18 + (n === hover ? 0.12 : 0);
        const r = Math.max(1.5, n.r * n.ss * big * (0.4 + 0.6 * n.show)), A = fa * dim * n.show;
        const c = n.kind === "drive" ? col.acc : n.kind === "editor" ? col.ink : n.kind === "shoot" ? col.muted : n.status === "no" ? col.no : col.ok;
        const twinkle = n.kind === "job" && n.status === "no" && !still ? 0.75 + 0.25 * Math.sin(now / 700 + n.sx * 0.05) : 1;
        ctx.globalCompositeOperation = add;
        const hr = n.kind === "drive" ? (n === pinned ? 3.6 + pulse * 0.5 : 3.1) : n.kind === "editor" ? 2.6 : n.kind === "shoot" ? 2.4 : 3.6;
        if (col.dark) spark(c, n.sx, n.sy, r * hr, A * (n.kind === "editor" ? 0.3 : n.kind === "drive" ? 0.55 : 0.7) * twinkle * (1 + Math.max(0, n.lit) * 0.5));
        if (n.kind === "shoot") {
          ctx.globalAlpha = A; ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, TAU); ctx.stroke();
        } else {
          ctx.globalAlpha = A * (col.dark ? 0.9 : 1); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(n.sx, n.sy, r * (n.kind === "editor" || !col.dark ? 1 : 0.8), 0, TAU); ctx.fill();
          if (!col.dark) { ctx.globalAlpha = A; ctx.strokeStyle = mix(c, "#000", 0.25); ctx.lineWidth = 1; ctx.stroke(); }
          if (col.dark && n.kind !== "editor") { ctx.globalAlpha = A * 0.85; ctx.fillStyle = mix(c, "#fff", 0.75); ctx.beginPath(); ctx.arc(n.sx, n.sy, r * 0.38, 0, TAU); ctx.fill(); }
        }
        ctx.globalCompositeOperation = "source-over";
        if (n === pinned) { ctx.globalAlpha = A; ctx.strokeStyle = col.acc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.sx, n.sy, r + 5 + pulse * 2, 0, TAU); ctx.stroke(); }
        if (n.kind === "editor" && r > 7) {
          ctx.globalAlpha = A; ctx.fillStyle = col.bg; ctx.font = `700 ${Math.round(r * 0.85)}px ${font()}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(n.short || n.label[0], n.sx, n.sy + 0.5);
        }
        // labels: drives and editors always; jobs when they are lit or hovered
        const label = n.kind === "drive" || n.kind === "editor" || n === hover || (lit && lit.has(n.id) && n.lit > 0.3);
        if (label && n.show > 0.5) {
          const hub = n.kind === "drive" || n.kind === "editor";
          ctx.globalAlpha = A * (hub ? 1 : clamp(n.lit, 0, 1) || 1);
          ctx.font = `${hub ? 700 : 400} ${hub ? 13 : 11}px ${font()}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
          const ty = n.sy + (n.kind === "drive" ? r * 1.9 : r) + 5;
          ctx.lineWidth = 3; ctx.strokeStyle = col.panel || col.bg; ctx.lineJoin = "round"; ctx.strokeText(n.label, n.sx, ty);
          ctx.fillStyle = hub ? col.ink : col.muted; ctx.fillText(n.label, n.sx, ty);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    let fontName = "";
    const font = () => fontName || (fontName = getComputedStyle(canvas).fontFamily || "sans-serif");

    // ---------------------------------------------------------------- loop
    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      step(dt);
      if (alpha > 0 && !pinned) refit();
      // camera goals: glide to the pinned node, otherwise the middle of the graph
      const g = fly ? fly.node : pinned;
      const gx = g ? g.x : 0, gy = g ? g.y : 0, gz = g ? g.z : 0;
      const k = ease(dt, fly ? 7 : 3.2);
      cam.tx += (gx - cam.tx) * k; cam.ty += (gy - cam.ty) * k; cam.tz += (gz - cam.tz) * k;
      const gd = fly ? 60 : pinned ? cam.gDist * 0.8 : cam.gDist;
      cam.dist += (gd - cam.dist) * ease(dt, fly ? 6 : 3);
      if (!still && !drag && !pinned && !hover && now - idleAt > 3500) cam.yaw += dt * 0.07;   // slow turn while idle
      draw(dt, now);
      if (fly && (now - fly.t0 > 520)) { const f = fly; fly = null; f.done && f.done(); }
      // keep drawing while anything moves; with reduced motion it rests 1.5 s after the last touch
      const busy = !still || alpha > 0 || drag || fly || now - idleAt < 1500 || now - kickAt < 1500;
      if (running && busy) raf = requestAnimationFrame(frame);
    }
    let kickAt = 0;
    function kick() { kickAt = performance.now(); if (running && !raf) { last = 0; raf = requestAnimationFrame(frame); } }

    // ---------------------------------------------------------------- picking + pointer
    function pick(x, y) {
      for (let i = proj.length - 1; i >= 0; i--) {   // near first
        const n = proj[i]; if (n.show < 0.5) continue;
        const r = Math.max(6, n.r * n.ss) + 6;
        if ((n.sx - x) ** 2 + (n.sy - y) ** 2 <= r * r) return n;
      }
      return null;
    }
    const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function setHover(n) {
      if (n === hover) return; hover = n; canvas.style.cursor = n ? "pointer" : "grab";
      opt.onHover && opt.onHover(n); kick();
    }
    function setPin(n) {
      pinned = n; opt.onPin && opt.onPin(n);
      if (n && navigator.vibrate) try { navigator.vibrate(6); } catch (e) {}
      kick();
    }
    canvas.addEventListener("pointerdown", e => {
      canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, local(e)); idleAt = performance.now();
      if (ptrs.size === 1) { drag = { ...local(e), yaw: cam.yaw, pitch: cam.pitch }; moved = 0; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
      kick();
    });
    canvas.addEventListener("pointermove", e => {
      const p = local(e);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        cam.zoom = clamp(cam.zoom * pinch / d, 0.35, 3); refit(); pinch = d; idleAt = performance.now(); kick(); return;
      }
      if (drag) {
        const dx = p.x - drag.x, dy = p.y - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        if (moved > 4) { cam.yaw = drag.yaw + dx * 0.006; cam.pitch = clamp(drag.pitch + dy * 0.004, -1.3, 1.3); canvas.style.cursor = "grabbing"; setHover(null); }
        idleAt = performance.now(); kick(); return;
      }
      if (e.pointerType === "mouse") setHover(pick(p.x, p.y));
    });
    const up = e => {
      const p = local(e), was = drag; ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (was && moved <= 4) {
        const n = pick(p.x, p.y), now = performance.now();
        if (n && n === pinned && (e.pointerType !== "mouse" || (lastTap.id === n.id && now - lastTap.t < 380))) open(n);
        else setPin(n);
        lastTap = { id: n && n.id, t: now };
      }
      drag = null; canvas.style.cursor = hover ? "pointer" : "grab"; idleAt = performance.now(); kick();
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); drag = null; pinch = 0; });
    canvas.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !drag) setHover(null); });
    canvas.addEventListener("dblclick", e => { const p = local(e), n = pick(p.x, p.y); if (n) open(n); });
    canvas.addEventListener("wheel", e => { e.preventDefault(); cam.zoom = clamp(cam.zoom * Math.exp(e.deltaY * 0.0012), 0.35, 3); refit(); idleAt = performance.now(); kick(); }, { passive: false });
    function open(n) { if (opt.onOpen) flyTo(n, () => opt.onOpen(n)); }
    function flyTo(n, done) { if (still) { done && done(); return; } fly = { node: n, t0: performance.now(), done }; kick(); }

    const ro = new ResizeObserver(() => { size(); });
    ro.observe(canvas);
    theme();

    return {
      setData,
      setFilter(fn) { filter = fn; kick(); },
      pin(id) { setPin(id ? byId.get(id) || null : null); },
      get pinned() { return pinned; },
      open(id) { const n = byId.get(id); if (n) open(n); },
      theme() { theme(); fontName = ""; kick(); },
      start() { if (running) return; running = true; theme(); kick(); },
      stop() { running = false; fly = null; if (raf) cancelAnimationFrame(raf); raf = 0; },
      reset() { fly = null; refit(); cam.dist = cam.gDist * 0.6; kick(); }   // a small zoom-out "breath" when Home comes back
    };
  }
  // mix two #rrggbb colours (anything else is returned as is)
  function mix(a, b, t) {
    const p = c => /^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
    const x = p(a), y = p(b); if (!x || !y) return a;
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  window.Graph3D = Graph3D;
})();
