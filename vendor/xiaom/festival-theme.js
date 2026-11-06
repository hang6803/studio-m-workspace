/* 小M 节日主题 — 全屏氛围粒子
 * 用法：
 *   const s = XiaoMFestivals.status(new Date(), { people, me });
 *   XiaoMFestTheme.apply(s);                          // 写等级和节日色到 <html>
 *   const stop = XiaoMFestTheme.particles(s);         // 全屏粒子层（pointer-events: none），stop() 移除
 *   const [hat, hold] = XiaoMFestTheme.outfit(s);     // 第 3 步用：小M 的节日装 XiaoM.camSVG(hat, hold)
 *
 * 粒子：春节/元宵 小灯笼上升；元旦/国庆/马来西亚日 烟花火星；开斋/哈芝 金色星光闪烁；卫塞 花瓣飘落；
 *   端午 竹叶飘落；中秋 暖色光点上浮；屠妖节 油灯火光上浮闪烁；冬至 汤圆般的软光点上浮；圣诞 雪；
 *   清明/中元 稀疏灰色尘点缓慢下落。
 * 密度：等级 1 = 35%，2 = 60%，3 = 100%（当天另加偶发烟花/闪光，约 5 秒一朵）。粒子半透明，不挡内容。
 * 出现方式 opts.mode：'intro'（默认，主题期每次打开飘 8 秒后淡出，节日当天一直有）、'always'、'day'（只有当天）。
 * 页面隐藏时暂停；系统开启「减少动态效果」时只画一帧静止粒子。
 *
 * 写到 root（默认 <html>）上：
 *   data-fest="deepavali"  data-fest-level="1|2|3"  data-fest-mood="celebrate|quiet"
 *   --fest       节日色。app 的取景框四角用 var(--fest, var(--orange))
 *   --fest-glow  0–1，越近节日越亮（发光用）
 * 等级：1 = 还有 8–14 天（取景框淡淡带节日色）；2 = 还有 1–7 天（取景框完全换色）；3 = 节日当天（换色 + 发光 + 英文祝福）
 * 整个主题期小M 都穿节日装。素色节日（清明、中元）：取景框灰色、不发光、小M 不换装。
 * 界面其它部分仍是白 + 橙（设计规则 11）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.XiaoMFestTheme = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLOR = {
    newyear: '#f48020', cny: '#e5383b', chapgohmei: '#e5383b', aidilfitri: '#2fa36b', haji: '#2fa38f',
    wesak: '#f2a541', duanwu: '#6bab3f', merdeka: '#ffcc00', malaysiaday: '#ffcc00', midautumn: '#f2d59a',
    deepavali: '#ff9933', dongzhi: '#f3b3c2', christmas: '#e9f2f8', qingming: '#8a8a8a', zhongyuan: '#8a8a8a'
  };
  // 和 xiaom.js 的 XiaoM.OUTFIT 一致；xiaom.js 有加载时以它为准
  var OUTFIT = {
    newyear: ['party', ''], cny: ['cny', 'orange'], chapgohmei: ['cny', 'lantern'], aidilfitri: ['songkok', 'ketupat'],
    haji: ['songkok', ''], wesak: ['', 'lotus'], duanwu: ['zongzi', ''], merdeka: ['', 'flag'], malaysiaday: ['', 'flag'],
    midautumn: ['', 'lantern'], deepavali: ['', 'diya'], dongzhi: ['', 'bowl'], christmas: ['santa', '']
  };
  var GREET_EN = {
    newyear: 'Happy New Year', cny: 'Happy Chinese New Year', chapgohmei: 'Happy Chap Goh Mei',
    aidilfitri: 'Selamat Hari Raya', haji: 'Selamat Hari Raya Haji', wesak: 'Happy Wesak Day',
    duanwu: 'Happy Dragon Boat Festival', merdeka: 'Selamat Hari Merdeka', malaysiaday: 'Selamat Hari Malaysia',
    midautumn: 'Happy Mid-Autumn', deepavali: 'Happy Deepavali', dongzhi: 'Happy Dongzhi', christmas: 'Merry Christmas'
  };

  function level(theme) {
    if (!theme) return 0;
    if (theme.daysLeft === 0) return 3;
    return theme.daysLeft <= 7 ? 2 : 1;
  }

  // 等级 1 时节日色和橙色混一半，慢慢过渡
  function mix(a, b, t) {
    var p = function (h, i) { return parseInt(h.substr(1 + i * 2, 2), 16); };
    var out = '#';
    for (var i = 0; i < 3; i++) out += ('0' + Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16)).slice(-2);
    return out;
  }

  function apply(status, opts) {
    opts = opts || {};
    var r = opts.root || document.documentElement;
    var theme = status && status.theme, c = theme && COLOR[theme.id], lv = c ? level(theme) : 0;
    if (!c) { clear(r); return 0; }
    var quiet = theme.kind === 'quiet';
    r.setAttribute('data-fest', theme.id);
    r.setAttribute('data-fest-level', String(lv));
    r.setAttribute('data-fest-mood', quiet ? 'quiet' : 'celebrate');
    r.style.setProperty('--fest', lv === 1 ? mix('#f48020', c, .5) : c);
    r.style.setProperty('--fest-glow', quiet ? '0' : String([0, 0, .4, 1][lv]));
    return lv;
  }

  function clear(r) {
    r = r || document.documentElement;
    ['data-fest', 'data-fest-level', 'data-fest-mood'].forEach(function (a) { r.removeAttribute(a); });
    ['--fest', '--fest-glow'].forEach(function (p) { r.style.removeProperty(p); });
  }

  // 小M 的节日装 [hat, hold]；没有主题或素色节日返回 ['', '']
  function outfit(status) {
    var t = status && status.theme;
    if (!t || t.kind === 'quiet') return ['', ''];
    var lib = (typeof window !== 'undefined' && window.XiaoM && window.XiaoM.OUTFIT) || OUTFIT;
    return (lib[t.id] || OUTFIT[t.id] || ['', '']).slice();
  }

  function greeting(status) {
    var t = status && status.theme;
    return t && t.daysLeft === 0 ? GREET_EN[t.id] || '' : '';
  }

  /* ---------- 粒子 ---------- */
  var KIND = {
    newyear: 'spark', merdeka: 'spark', malaysiaday: 'spark',
    cny: 'lantern', chapgohmei: 'lantern',
    aidilfitri: 'star', haji: 'star',
    wesak: 'petal', duanwu: 'leaf', midautumn: 'glow', deepavali: 'ember', dongzhi: 'bubble', christmas: 'snow',
    qingming: 'dust', zhongyuan: 'dust'
  };
  var PALETTE = {
    newyear: ['#f48020', '#ffd166', '#ffffff'], merdeka: ['#cc0001', '#ffcc00', '#ffffff', '#3d5afe'], malaysiaday: ['#cc0001', '#ffcc00', '#ffffff', '#3d5afe'],
    cny: ['#e5383b', '#d62828'], chapgohmei: ['#e5383b', '#f48020'],
    aidilfitri: ['#f2d16b', '#ffffff', '#5fd39a'], haji: ['#f2d16b', '#ffffff', '#5fd3c0'],
    wesak: ['#f7c6d9', '#ffffff', '#f2a541'], duanwu: ['#6bab3f', '#a7c957', '#4c9a2a'],
    midautumn: ['#f2d59a', '#ffe8b8', '#f48020'], deepavali: ['#ff9933', '#ffcc66', '#ff6b3d'],
    dongzhi: ['#ffffff', '#ffd6e0', '#ffe9c7'], christmas: ['#ffffff', '#e9f2f8'],
    qingming: ['#9e9e9e'], zhongyuan: ['#9e9e9e']
  };
  var BASE = { spark: 16, lantern: 9, star: 22, petal: 14, leaf: 10, glow: 18, ember: 22, bubble: 9, snow: 36, dust: 10 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function spawn(kind, pal, W, H, fresh) {
    var p = { c: pick(pal), x: rnd(0, W), y: 0, t: rnd(0, 1000), a: 0 };
    var up = kind === 'lantern' || kind === 'glow' || kind === 'ember' || kind === 'bubble';
    p.y = fresh ? rnd(0, H) : (up ? H + 30 : -30);
    switch (kind) {
      case 'snow':    p.r = rnd(1, 3.2); p.vy = rnd(.25, .8); p.vx = rnd(-.2, .2); p.o = rnd(.35, .85); break;
      case 'dust':    p.r = rnd(.8, 1.8); p.vy = rnd(.08, .2); p.vx = rnd(-.05, .05); p.o = rnd(.15, .35); break;
      case 'petal':   p.r = rnd(4, 7); p.vy = rnd(.3, .7); p.vx = rnd(-.3, .3); p.o = rnd(.45, .8); p.rot = rnd(0, 6.3); p.vr = rnd(-.02, .02); break;
      case 'leaf':    p.r = rnd(6, 11); p.vy = rnd(.35, .8); p.vx = rnd(-.4, .4); p.o = rnd(.4, .7); p.rot = rnd(0, 6.3); p.vr = rnd(-.025, .025); break;
      case 'lantern': p.r = rnd(5, 10); p.vy = -rnd(.2, .45); p.vx = rnd(-.08, .08); p.o = rnd(.55, .9); break;
      case 'glow':    p.r = rnd(1.5, 4); p.vy = -rnd(.12, .35); p.vx = rnd(-.1, .1); p.o = rnd(.5, .9); break;
      case 'ember':   p.r = rnd(1.2, 3); p.vy = -rnd(.3, .8); p.vx = rnd(-.15, .15); p.o = rnd(.4, .9); break;
      case 'bubble':  p.r = rnd(2.5, 5.5); p.vy = -rnd(.15, .35); p.vx = rnd(-.08, .08); p.o = rnd(.35, .65); break;
      case 'star':    p.r = rnd(1, 2.6); p.vy = 0; p.vx = 0; p.o = rnd(.4, .95); p.y = rnd(0, H); p.life = rnd(240, 600); p.age = fresh ? rnd(0, p.life) : 0; break;
      case 'spark':   p.r = rnd(1.2, 2.6); p.vy = rnd(.2, .5); p.vx = rnd(-.15, .15); p.o = rnd(.35, .8); break;
    }
    return p;
  }

  function burst(pal, W, H, list) {
    var cx = rnd(W * .15, W * .85), cy = rnd(H * .12, H * .45), c = pick(pal), n = 34;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, v = rnd(1.2, 2.6);
      list.push({ c: c, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(1.4, 2.6), o: 1, life: rnd(70, 110), age: 0, fw: 1 });
    }
  }

  function draw(g, kind, p) {
    g.globalAlpha = p.o; g.fillStyle = p.c;
    if (p.fw) { g.globalAlpha = p.o * (1 - p.age / p.life); g.shadowColor = p.c; g.shadowBlur = 6; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.shadowBlur = 0; return; }
    switch (kind) {
      case 'petal':
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.ellipse(0, 0, p.r, p.r * .5, 0, 0, 6.283); g.fill(); g.restore(); break;
      case 'leaf':
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath();
        g.moveTo(-p.r, 0); g.quadraticCurveTo(0, -p.r * .38, p.r, 0); g.quadraticCurveTo(0, p.r * .38, -p.r, 0); g.fill(); g.restore(); break;
      case 'lantern':
        g.save(); g.translate(p.x + Math.sin(p.t * .02) * 3, p.y);
        g.shadowColor = '#ff9a3d'; g.shadowBlur = p.r * 2.2;
        g.beginPath(); g.ellipse(0, 0, p.r, p.r * .85, 0, 0, 6.283); g.fill();
        g.shadowBlur = 0; g.globalAlpha = p.o * .9; g.fillStyle = '#f2c14e';
        g.fillRect(-p.r * .45, -p.r * .95, p.r * .9, p.r * .2); g.fillRect(-p.r * .45, p.r * .75, p.r * .9, p.r * .2);
        g.fillStyle = '#ffd98a'; g.globalAlpha = p.o * .35; g.beginPath(); g.ellipse(0, 0, p.r * .45, p.r * .6, 0, 0, 6.283); g.fill();
        g.restore(); break;
      case 'star':
        var tw = Math.sin(p.age / p.life * Math.PI); g.globalAlpha = p.o * tw;
        g.save(); g.translate(p.x, p.y); g.beginPath();
        var R = p.r * 2.6 * tw + p.r;
        g.moveTo(0, -R); g.quadraticCurveTo(0, 0, R, 0); g.quadraticCurveTo(0, 0, 0, R); g.quadraticCurveTo(0, 0, -R, 0); g.quadraticCurveTo(0, 0, 0, -R); g.fill(); g.restore(); break;
      case 'ember': case 'glow': case 'bubble':
        g.globalAlpha = p.o * (kind === 'ember' ? .6 + .4 * Math.sin(p.t * .2) : .75 + .25 * Math.sin(p.t * .04));
        g.shadowColor = p.c; g.shadowBlur = p.r * 4; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.shadowBlur = 0; break;
      default:
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
  }

  // status：XiaoMFestivals.status()；opts.target 默认 document.body（全屏 fixed，盖在内容上，z-index 40）；传一个元素则铺满该元素（absolute）；opts.z 改层级
  function particles(status, opts) {
    opts = opts || {};
    var t = status && status.theme, kind = t && KIND[t.id];
    if (!kind || typeof document === 'undefined') return function () {};
    var lv = level(t), host = opts.target || document.body, full = host === document.body;
    // mode：'intro'（默认）主题期打开时飘 introMs 后淡出，节日当天一直有；'always' 一直有；'day' 只有当天
    var mode = opts.mode || 'intro';
    if (mode === 'day' && lv < 3) return function () {};
    var cv = document.createElement('canvas');
    cv.className = 'fest-particles';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:' + (full ? 'fixed' : 'absolute') + ';inset:0;width:100%;height:100%;pointer-events:none;opacity:.85;z-index:' + (opts.z != null ? opts.z : 40);
    if (!full && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(cv);
    var g = cv.getContext('2d'), pal = PALETTE[t.id], W = 0, H = 0, list = [], raf = 0, alive = true, frame = 0;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function size() {
      var d = Math.min(window.devicePixelRatio || 1, 2), b = cv.getBoundingClientRect();
      W = b.width; H = b.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); g.setTransform(d, 0, 0, d, 0, 0);
      var want = Math.round(BASE[kind] * [0, .35, .6, 1][lv] * Math.min(1.6, Math.max(.4, W * H / (1280 * 800))));
      if (t.kind === 'quiet') want = Math.round(BASE[kind] * .5);
      list = list.filter(function (p) { return !p.fw; }).slice(0, want);
      while (list.length < want) list.push(spawn(kind, pal, W, H, true));
      if (still) paint();
    }
    function paint() {
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) draw(g, kind, list[i]);
      g.globalAlpha = 1;
    }
    function step() {
      if (!alive) return;
      frame++;
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i]; p.t++;
        if (p.fw) { p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy = p.vy * .97 + .03; if (++p.age > p.life) list.splice(i, 1); continue; }
        if (kind === 'star') { if (++p.age > p.life) list[i] = spawn(kind, pal, W, H, false); continue; }
        p.x += p.vx + (kind === 'snow' || kind === 'petal' || kind === 'leaf' ? Math.sin(p.t * .015) * .3 : 0);
        p.y += p.vy;
        if (p.rot != null) p.rot += p.vr;
        if (p.y > H + 40 || p.y < -40 || p.x < -40 || p.x > W + 40) list[i] = spawn(kind, pal, W, H, false);
      }
      // 当天：烟花类每 ~3 秒一朵，其它节日偶尔一朵小闪光
      if (lv === 3 && t.kind !== 'quiet') {
        var every = kind === 'spark' ? 300 : 900;
        if (frame % every === 1) burst(pal, W, H, list);
      }
      paint();
      raf = requestAnimationFrame(step);
    }
    function vis() { if (document.hidden) cancelAnimationFrame(raf); else if (!still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(step); } }
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', vis);
    if (!still) raf = requestAnimationFrame(step);
    var fadeT = 0, endT = 0;
    if (mode === 'intro' && lv < 3) {
      cv.style.transition = 'opacity 2s ease';
      fadeT = setTimeout(function () { cv.style.opacity = '0'; endT = setTimeout(stop, 2100); }, opts.introMs || 8000);
    }
    return stop;
    function stop() {
      clearTimeout(fadeT); clearTimeout(endT);
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis);
      cv.remove();
    }
  }

  return { COLOR: COLOR, KIND: KIND, particles: particles, OUTFIT: OUTFIT, GREET_EN: GREET_EN, level: level, apply: apply, clear: clear, outfit: outfit, greeting: greeting };
});
