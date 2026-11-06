/* 小M 庆祝 — 节日当天 / 生日当天，打开 app 时小M 播一次祝福动画（每天只播一次）
 * 依赖：festivals.js（XiaoMFestivals）、xiaom.js（XiaoM）、festival-theme.js（XiaoMFestTheme，取英文祝福）
 *
 *   const s = XiaoMFestivals.status(new Date(), { people, me });
 *   const c = XiaoMCelebrate.pick(s, { me });
 *   // c = null（今天没什么要庆祝）或 { key, type, html, title, text }
 *   //   type：'festival' 节日 | 'birthday' 我生日 | 'birthday-festival' 我生日又撞节日 | 'others-birthday' 别人生日
 *   //   sfx：音效 key，XiaoMSfx.play(c.sfx)（sfx.js）
 *   //   duration：建议显示多久（毫秒），专属生日动画 8500
 *   //   html：放进 229×200 的卡片里（XiaoM 的场景尺寸）；others-birthday 没有 html，只有一句 text
 *   if (c && XiaoMCelebrate.shouldPlay(c)) { 显示卡片; XiaoMCelebrate.markPlayed(c); }
 *
 * 生日和节日完全不同：有专属动画的人（XiaoM.PEOPLE：hang 山海舟上、michael 乘龙云海）播自己的；其他人用 12 个生日场景（每人每年固定一个，年年不同），戴派对帽，标题写名字；
 * 生日撞上节日时用「生日 + 节日」组合场景。素色节日（清明、中元）不庆祝。
 */
(function (root) {
  'use strict';
  var F = root.XiaoMFestivals, T = root.XiaoMFestTheme;
  var STORE = 'xiaom-celebrated';

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function bdScene(name, year) { return ('0' + (hash(name + ':' + year) % 12 + 1)).slice(-2); }
  function greet(id) { return (T && T.GREET_EN[id]) || ''; }

  function pick(status, opts) {
    opts = opts || {};
    if (!status) return null;
    var X = root.XiaoM, year = status.date.slice(0, 4);
    var mine = (status.birthdays || []).filter(function (b) { return b.isMe; })[0];
    var others = (status.birthdays || []).filter(function (b) { return !b.isMe; });
    var fest = status.celebrate; // 素色节日不会在这里
    var hasScene = function (id) { return X && X.FESTS && X.FESTS.indexOf(id) >= 0; };

    if (mine) {
      var title = 'Happy Birthday, ' + mine.name + '!';
      var own = String(mine.name).toLowerCase();
      if (X && X.PEOPLE && X.PEOPLE.indexOf(own) >= 0) {   // 这个人有专属生日动画（撞节日也用它）
        return { key: status.date + ':bd', type: 'birthday', title: title, text: fest ? greet(fest.id) : '',
          html: X.personAct(own, mine.name), duration: 8500, sfx: 'person:' + own };
      }
      if (fest && X && X.bdFestAct) {
        return { key: status.date + ':bd-fest', type: 'birthday-festival', title: title, text: greet(fest.id),
          html: X.bdFestAct(fest.id, 'party', 'Happy Birthday ' + mine.name), sfx: 'bdfest:' + fest.id };
      }
      return { key: status.date + ':bd', type: 'birthday', title: title, text: mine.age ? 'Level ' + mine.age + ' unlocked.' : '',
        html: X && X.actHtml ? X.actHtml(bdScene(mine.name, year), 'party') : '', sfx: 'bd' };
    }
    if (fest) {
      return { key: status.date + ':' + fest.id, type: 'festival', title: greet(fest.id), text: '',
        html: hasScene(fest.id) && X.festAct ? X.festAct(fest.id) : '', sfx: 'fest:' + fest.id };
    }
    if (others.length) {
      var names = others.map(function (b) { return b.name; });
      var who = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
      return { key: status.date + ':others', type: 'others-birthday', title: 'Today is ' + who + "'s birthday", text: 'Say happy birthday!', html: '', sfx: 'others' };
    }
    return null;
  }

  function read() { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } }
  function shouldPlay(c) { return !!c && !read()[c.key]; }
  function markPlayed(c) {
    if (!c) return;
    try {
      var m = read(), today = c.key.slice(0, 10);
      Object.keys(m).forEach(function (k) { if (k.slice(0, 10) < today) delete m[k]; }); // 只留今天的记录
      m[c.key] = 1;
      localStorage.setItem(STORE, JSON.stringify(m));
    } catch (e) { /* 无痕模式：每次打开都播 */ }
  }

  root.XiaoMCelebrate = { pick: pick, shouldPlay: shouldPlay, markPlayed: markPlayed, bdScene: bdScene };
})(typeof self !== 'undefined' ? self : this);
