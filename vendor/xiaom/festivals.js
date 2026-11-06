/* 小M 节日日历 — 马来西亚节日 + 华人传统节日 + 成员生日
 * 浏览器：window.XiaoMFestivals；Node：require('./festivals.js')
 *
 * 规则
 * - 庆祝型节日：节日前 LEAD_DAYS(14) 天进入主题期，节日当天（多天节日的每一天）为庆祝日。
 * - 素色节日（清明、中元）：只在当天换素色主题，没有提前期，小M 不庆祝。
 * - 主题期重叠时：庆祝日优先，其次取最近的下一个节日。
 * - 农历节日用 Intl 农历自动换算；清明、冬至用节气公式。
 * - 开斋节、哈芝节、卫塞节、屠妖节以官方公布为准，写在 TABLE 里，每年更新一次。
 *   开斋节、哈芝节没有表数据时用 Intl 伊斯兰历推算（可能差 1 天）；卫塞节、屠妖节没有数据就跳过，
 *   missing(year) 会列出缺的节日。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.XiaoMFestivals = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LEAD_DAYS = 14;

  // 官方日期（马来西亚联邦假期）。每年公布后在这里补上下一年。
  var TABLE = {
    aidilfitri: { 2026: '2026-03-21', 2027: '2027-03-10' },
    haji:       { 2026: '2026-05-27', 2027: '2027-05-17' },
    wesak:      { 2026: '2026-05-31', 2027: '2027-05-20' },
    deepavali:  { 2026: '2026-11-08', 2027: '2027-10-29' }
  };

  // kind: celebrate 庆祝 / quiet 素色
  // rule: fixed 'MM-DD' | lunar [月, 日] | term 节气 | table | islamic [月, 日]
  var FESTIVALS = [
    { id: 'newyear',     name: '元旦',       en: 'New Year',             kind: 'celebrate', fixed: '01-01',
      greet: '新年快乐！今年也一起拍好每一帧。' },
    { id: 'cny',         name: '春节',       en: 'Chinese New Year',     kind: 'celebrate', lunar: [1, 1], days: 2,
      greet: '新春快乐，恭喜发财！' },
    { id: 'chapgohmei',  name: '元宵',       en: 'Chap Goh Mei',         kind: 'celebrate', lunar: [1, 15],
      greet: '元宵快乐，团团圆圆！' },
    { id: 'qingming',    name: '清明',       en: 'Qingming',             kind: 'quiet',     term: 'qingming' },
    { id: 'aidilfitri',  name: '开斋节',     en: 'Hari Raya Aidilfitri', kind: 'celebrate', table: true, islamic: [10, 1], days: 2,
      greet: 'Selamat Hari Raya Aidilfitri！开斋节快乐！' },
    { id: 'haji',        name: '哈芝节',     en: 'Hari Raya Haji',       kind: 'celebrate', table: true, islamic: [12, 10],
      greet: 'Selamat Hari Raya Aidiladha！哈芝节快乐！' },
    { id: 'wesak',       name: '卫塞节',     en: 'Wesak Day',            kind: 'celebrate', table: true,
      greet: '卫塞节快乐，平安喜乐。' },
    { id: 'duanwu',      name: '端午',       en: 'Dragon Boat Festival', kind: 'celebrate', lunar: [5, 5],
      greet: '端午安康，记得吃粽子！' },
    { id: 'zhongyuan',   name: '中元',       en: 'Hungry Ghost Festival', kind: 'quiet',    lunar: [7, 15] },
    { id: 'merdeka',     name: '国庆日',     en: 'Hari Merdeka',         kind: 'celebrate', fixed: '08-31',
      greet: 'Selamat Hari Merdeka！国庆日快乐！' },
    { id: 'malaysiaday', name: '马来西亚日', en: 'Hari Malaysia',        kind: 'celebrate', fixed: '09-16',
      greet: 'Selamat Hari Malaysia！' },
    { id: 'midautumn',   name: '中秋',       en: 'Mid-Autumn Festival',  kind: 'celebrate', lunar: [8, 15],
      greet: '中秋快乐，月圆人团圆！' },
    { id: 'deepavali',   name: '屠妖节',     en: 'Deepavali',            kind: 'celebrate', table: true,
      greet: 'Happy Deepavali！屠妖节快乐，光明常在！' },
    { id: 'dongzhi',     name: '冬至',       en: 'Dongzhi',              kind: 'celebrate', term: 'dongzhi',
      greet: '冬至快乐，吃汤圆添一岁！' },
    { id: 'christmas',   name: '圣诞节',     en: 'Christmas',            kind: 'celebrate', fixed: '12-25',
      greet: 'Merry Christmas！圣诞快乐！' }
  ];

  /* ---------- 日期工具（全部用本地日历日，不涉及时区换算） ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 12);
  }
  function toDate(x) {
    if (x instanceof Date) return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12);
    if (typeof x === 'string') return parse(x);
    return toDate(new Date());
  }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function diffDays(a, b) { return Math.round((b - a) / 864e5); }

  /* ---------- 农历 / 伊斯兰历（Intl） ---------- */
  var calCache = {};
  function scanYear(cal, year) {
    var ck = cal + year;
    if (calCache[ck]) return calCache[ck];
    var map = {};
    try {
      var fmt = new Intl.DateTimeFormat('en-u-ca-' + cal, { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
      for (var d = new Date(Date.UTC(year, 0, 1, 12)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
        var parts = fmt.formatToParts(d), mo = '', da = '';
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === 'month') mo = parts[i].value;
          if (parts[i].type === 'day') da = parts[i].value;
        }
        var k = mo + '/' + da; // 闰月是 "6bis"，不会和正月份撞
        if (!map[k]) map[k] = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
      }
    } catch (e) { /* 不支持该历法的环境：返回空表 */ }
    return (calCache[ck] = map);
  }
  function fromCalendar(cal, year, md) { return scanYear(cal, year)[md[0] + '/' + md[1]] || null; }

  // Intl 的农历偶尔在朔日接近午夜时差一天（例：2027 春节给成 2/7，实际 2/6）。
  // 所以只用 Intl 定「是哪个月」，初一当天用 Meeus 朔日算法按 UTC+8 重新确定。
  function newMoonNear(ds) {
    var rad = Math.PI / 180, jd = parse(ds).getTime() / 864e5 + 2440587.5;
    var k = Math.round((jd - 2451550.09766) / 29.530588861), T = k / 1236.85;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T * T * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * rad;
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T) * rad;
    var Fl = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T) * rad;
    var Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * rad;
    var sin = Math.sin;
    jde += -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * Fl)
      + 0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M)
      - 0.00111 * sin(Mp - 2 * Fl) - 0.00057 * sin(Mp + 2 * Fl) + 0.00056 * E * sin(2 * Mp + M)
      - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * Fl) + 0.00038 * E * sin(M - 2 * Fl)
      - 0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M)
      + 0.00004 * sin(2 * Mp - 2 * Fl) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * Fl)
      + 0.00003 * sin(2 * Mp + 2 * Fl) - 0.00003 * sin(Mp + M + 2 * Fl) + 0.00003 * sin(Mp - M + 2 * Fl)
      - 0.00002 * sin(Mp - M - 2 * Fl) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    var t = new Date((jde - 0.0008 - 2440587.5) * 864e5 + 8 * 36e5); // ΔT≈70s，换成 UTC+8
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function lunarDate(year, md) {
    var first = fromCalendar('chinese', year, [md[0], 1]);
    if (!first) return null;
    return key(addDays(parse(newMoonNear(first)), md[1] - 1));
  }

  /* ---------- 节气（21 世纪通式，北京/吉隆坡时间同为 UTC+8） ---------- */
  function solarTerm(term, year) {
    var y = year % 100, L = Math.floor(y / 4);
    if (term === 'qingming') return year + '-04-' + pad(Math.floor(y * 0.2422 + 4.81) - L);
    if (term === 'dongzhi') return year + '-12-' + pad(Math.floor(y * 0.2422 + 21.94) - L);
    return null;
  }

  /* ---------- 某年的节日表 ---------- */
  var yearCache = {};
  function dateOf(f, year) {
    if (f.fixed) return year + '-' + f.fixed;
    if (f.lunar) return lunarDate(year, f.lunar);
    if (f.term) return solarTerm(f.term, year);
    if (f.table) {
      var t = TABLE[f.id] && TABLE[f.id][year];
      if (t) return t;
      if (f.islamic) return fromCalendar('islamic-umalqura', year, f.islamic);
    }
    return null;
  }
  function forYear(year) {
    if (yearCache[year]) return yearCache[year];
    var list = [];
    FESTIVALS.forEach(function (f) {
      var ds = dateOf(f, year);
      if (!ds) return;
      var start = parse(ds), days = f.days || 1;
      list.push({
        id: f.id, name: f.name, en: f.en, kind: f.kind, greet: f.greet || '',
        date: ds,
        end: key(addDays(start, days - 1)),
        themeStart: key(addDays(start, f.kind === 'quiet' ? 0 : -LEAD_DAYS)),
        estimated: !!(f.table && !(TABLE[f.id] && TABLE[f.id][year]))
      });
    });
    list.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return (yearCache[year] = list);
  }
  function missing(year) {
    return FESTIVALS.filter(function (f) { return !dateOf(f, year); }).map(function (f) { return f.name; });
  }

  /* ---------- 生日 ---------- */
  // people: [{ name, birthday: 'MM-DD' | 'YYYY-MM-DD' }]；2/29 生日在平年算 2/28
  function birthdaysOn(d, people, me) {
    var y = d.getFullYear(), md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var leap = new Date(y, 1, 29).getMonth() === 1;
    return (people || []).filter(function (p) {
      var b = String(p.birthday || '').slice(-5);
      if (b === '02-29' && !leap) b = '02-28';
      return b === md;
    }).map(function (p) {
      var full = /^(\d{4})-/.exec(p.birthday || '');
      return {
        name: p.name,
        isMe: !!me && p.name === me,
        age: full ? y - +full[1] : null
      };
    });
  }

  /* ---------- 当天状态 ---------- */
  // opts: { people, me }
  // 返回 { date, theme, celebrate, birthdays }
  //   theme：当前主题（节日对象 + daysLeft，庆祝日 daysLeft = 0）；无主题为 null
  //   celebrate：今天要小M 庆祝的节日（素色节日不会出现在这里）；没有为 null
  function status(when, opts) {
    opts = opts || {};
    var d = toDate(when), k = key(d), y = d.getFullYear();
    var all = forYear(y - 1).concat(forYear(y), forYear(y + 1));
    var today = null, next = null;
    all.forEach(function (f) {
      if (k < f.themeStart || k > f.end) return;
      if (k >= f.date) { if (!today) today = f; }
      else if (!next || f.date < next.date) next = f;
    });
    var pick = today || next, theme = null;
    if (pick) {
      theme = Object.assign({}, pick, { daysLeft: Math.max(0, diffDays(d, parse(pick.date))) });
    }
    return {
      date: k,
      theme: theme,
      celebrate: today && today.kind === 'celebrate' ? theme : null,
      birthdays: birthdaysOn(d, opts.people, opts.me)
    };
  }

  return {
    LEAD_DAYS: LEAD_DAYS,
    TABLE: TABLE,
    FESTIVALS: FESTIVALS,
    forYear: forYear,
    missing: missing,
    status: status,
    birthdaysOn: function (when, people, me) { return birthdaysOn(toDate(when), people, me); }
  };
});
