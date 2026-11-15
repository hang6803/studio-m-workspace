// M's own brain: what someone means, worked out on the device with no AI. A few hundred example requests (English,
// 中文, Bahasa and the mix the studio actually types) are turned into word / character features weighted by how rare
// they are (TF-IDF); a new request goes to the intent whose examples it is closest to. Names, drives, dates, years and
// job names are swapped for placeholders first (@p @d @t @y @j), so "where is Lim Wedding" and "where is Tan
// Launch" are the same request. Used by app.js (localM) when the AI is off, offline or can't be reached.
(function (g) {
  "use strict";
  // one line per intent; examples separated by |
  const TRAIN = {
    unbacked: `what isn't backed up|what is not backed up yet|anything not backed up|show me what hasn't been backed up|which jobs are not backed up|list the unbacked jobs|unbacked jobs|not backed up|still not backed up|what do we still need to back up|what's left to back up|pending backups|backups pending|which ones still need backup|what has @p not backed up|@p not backed up|what does @p still need to back up|my jobs not backed up|what have i not backed up|which of my jobs aren't backed up|not backed up on @d|what on @d is not backed up|not backed up in @y|@y not backed up|how many not backed up|outstanding backups|missing backups|anything missing backup|backup status|is everything backed up|are all jobs backed up|did we back up everything|还没备份的|没备份的有哪些|哪些还没备份|还有什么没备份|未备份|备份了吗|全部备份好了吗|@p 还有哪些没备份|@p 没备份的|我还有什么没备份|我的没备份|@d 有哪些没备份|@y 年没备份的|还差哪些备份|没有备份的 job|还没 backup 的|哪个还没 backup|belum backup|apa yang belum backup|job mana belum backup|@p belum backup apa|ada yang belum backup ke|semua dah backup ke|jobs that haven't been backed up|which haven't been backed up yet|what hasn't been backed up|have we backed up everything|any job without backup`,
    shoots: `what shoots do we have|shoots this week|any shoots this week|shoots next week|what's on next week|what are we shooting this week|upcoming shoots|next shoot|when is the next shoot|what's on tomorrow|any shoot tomorrow|shoots today|anything today|what do we have on @t|any shoot on @t|what's on saturday|shoots on sunday|this month's shoots|shoots this month|schedule for next week|show the schedule|my schedule|my shoots|what am i shooting this week|when am i shooting next|@p shoots|what is @p shooting|@p schedule next week|is @p shooting tomorrow|where is the shoot tomorrow|where are we shooting on saturday|这周拍什么|这周有什么拍摄|下周拍什么|下周有拍摄吗|明天有拍摄吗|明天拍什么|今天有拍摄吗|后天拍什么|@t 有什么拍摄|@t 拍什么|这个月的拍摄|这个月有几场拍摄|我的行程|我这周的拍摄|我下次拍什么时候|@p 这周拍什么|@p 的行程|下一个拍摄是什么|接下来的拍摄|行程表|拍摄安排|日程|minggu ni ada shooting apa|esok ada shooting ke|shooting minggu depan|bila shooting seterusnya|jadual shooting|ada event apa minggu ni|下周有什么活动|这周有什么活动|有什么要拍的|明天去哪里拍|在哪里拍|拍摄地点在哪|what events do we have next week`,
    find: `where is @j|where's @j|which drive is @j on|which drive has @j|find @j|look for @j|search @j|where did we put @j|where is the @j footage|where are the @j photos|where is @j video|which hard disk has @j|is @j backed up|has @j been backed up|did @j get backed up|who edited @j|who is editing @j|what drive for @j|where can i find @j|i can't find @j|locate @j|@j in which drive|@j footage where|@j 在哪|@j 在哪里|@j 在哪个硬盘|@j 放在哪|@j 的片在哪|@j 的照片在哪|找 @j|帮我找 @j|@j 备份了吗|@j 有备份吗|谁剪 @j|@j 是谁剪的|@j 在哪颗|哪个硬盘有 @j|@j 的资料在哪|@j dekat mana|@j dalam drive mana|cari @j|mana @j|@j dah backup ke|siapa edit @j|找一下 @j|帮我找一下 @j|找找 @j|搜 @j|查一下 @j 在哪`,
    add: `add a shoot|add shoot @t|book a shoot on @t|schedule a shoot|new shoot|set up a shoot|add @j on @t|add @j shoot @t at ipoh|book @p for @j on @t|we have a wedding on @t|there's an event on @t|put @j on the calendar|add to calendar @j @t|add @j to the calendar|schedule @j @t|book @t @j with @p|@p and i shoot @j on @t|create a shoot|add an event|new event on @t|加一个拍摄|加个 shoot|帮我加拍摄|帮我排 @t 拍 @j|@t 拍 @j|@t 在 @j 拍|安排 @t 拍摄|排一个拍摄|新拍摄|新增拍摄|加到日历|@t 有婚礼|@t 有活动要拍|@t 和 @p 去拍 @j|@p @t 拍 @j|帮我把 @j 加进日历|记一下 @t 要拍 @j|tambah shooting|tambah shoot @t|book shooting @t|masukkan @j dalam calendar|ada wedding @t`,
    drive: `what's on @d|what is on @d|what's in @d|show @d|list @d|jobs on @d|what jobs are on @d|@d contents|open @d|how full is @d|what's inside @d|@d has what|which jobs in @d|@d jobs|tell me about @d|@d status|@d 有什么|@d 里面有什么|@d 放了什么|@d 有哪些 job|看 @d|打开 @d|@d 的内容|@d 装了什么|@d 有几个 job|@d 状态|@d ada apa|dalam @d ada apa|tengok @d|which drives do we have|list the drives|all drives|show all drives|有哪些硬盘|所有硬盘|硬盘列表|几颗硬盘|senarai drive|show me @d|let me see @d|which drives are there|what drives exist|how many drives are there|@d got what|@d got which jobs|got what in @d|inside @d got what`,
    editor: `@p jobs|@p's jobs|what is @p editing|what did @p edit|what has @p edited|show @p's work|list @p's jobs|jobs edited by @p|@p workload|how much is @p editing|what am i editing|my jobs|what did i edit|show my work|@p 剪了哪些|@p 剪了什么|@p 的 job|@p 在剪什么|@p 负责哪些|@p 有几个 job|我剪了哪些|我的 job|我负责的|我在剪什么|看 @p 的工作|@p 工作量|kerja @p|@p edit apa|job @p|apa yang @p edit|job saya`,
    count: `how many jobs|how many jobs this year|how many jobs in @y|how many jobs do we have|total jobs|job count|stats|statistics|summary|give me a summary|overview|how are we doing|how many shoots this month|how many weddings this year|how many events in @y|how many drives|numbers for @y|report|year summary|@y summary|今年多少个 job|今年几个 job|@y 年有几个 job|一共多少 job|总共几个|统计|总结|概况|数据|今年做了多少|这个月几场|几个婚礼|几颗硬盘|报告|berapa job tahun ni|berapa banyak job|jumlah job|ringkasan`,
    go: `open calendar|go to calendar|show calendar|take me to the calendar|open backup|go to backup|backup page|open the backup page|open drives|go to drives|drives page|open settings|go to settings|settings|open team|go to team|team page|show the team|go home|home page|back to home|open classic backup|classic backup|open not backed up page|打开日历|去日历|看日历|日历|打开备份页|去备份页|备份页面|打开硬盘|去硬盘|硬盘页|打开设置|去设置|设置|打开团队|团队页|回首页|首页|打开 classic backup|buka calendar|pergi calendar|buka backup|buka settings|buka drive`,
    birthday: `whose birthday is next|next birthday|any birthdays coming|birthdays this month|upcoming birthdays|when is @p's birthday|@p birthday|birthday list|who has a birthday|is it anyone's birthday today|birthdays|谁生日|下一个生日|这个月谁生日|生日|@p 生日几号|@p 什么时候生日|生日列表|今天谁生日|最近谁生日|harijadi|bila birthday @p|siapa birthday bulan ni|birthday seterusnya`,
    free: `who is free on @t|who's free tomorrow|who is available on saturday|who can shoot on @t|anyone free on @t|is @p free on @t|is @p available tomorrow|who's not busy on @t|available crew on @t|who can take a shoot @t|when is @p free|@p free days|is anyone free this weekend|谁有空|@t 谁有空|明天谁有空|周六谁有空|@p @t 有空吗|@p 哪天有空|@p 明天有空吗|谁可以拍 @t|@t 谁没拍摄|这周末谁有空|有没有人 @t 有空|siapa free @t|siapa free esok|@p free tak @t|siapa boleh shoot @t`,
    recent: `latest jobs|recent jobs|what was added recently|newest jobs|last jobs|what did we do recently|latest events|recent work|last few jobs|what's new|most recent job|最近的 job|最新的 job|最近做了什么|最近加了什么|最近的活动|最新的|最近几个 job|最近拍了什么|job terbaru|apa baru|kerja terkini|最近有什么新的|有什么新 job|最近新增的|lately added|added lately`,
    newjob: `add a job|add backup|new job|new backup|add a new job|create a job|log a job|record a backup|i want to add a backup|add a job to backup|new backup entry|加 job|新增 job|加一个 job|新增备份|加备份|登记备份|我要加备份|记录一个 job|新 job|tambah job|tambah backup|job baru`,
    theme: `dark mode|light mode|switch to dark mode|switch to light mode|turn on dark mode|make it light|make it dark|change theme|toggle theme|night mode|day mode|white mode|black mode|深色模式|浅色模式|换成黑色|换成白色|暗色|亮色|夜间模式|白天模式|换主题|切换主题|mode gelap|mode cerah|tukar tema`,
    date: `what's the date|what is today's date|what day is it|what day is today|today's date|date today|which week is this|what time is it|今天几号|今天星期几|今天礼拜几|今天日期|几号了|现在几点|这是第几周|hari ni berapa haribulan|hari apa hari ni|tarikh hari ni`,
    greet: `hi|hello|hey|hey m|hi m|hello m|good morning|good afternoon|good evening|yo|morning|你好|嗨|哈喽|早安|早|午安|晚安|在吗|m 你好|hai|helo|selamat pagi|apa khabar`,
    thanks: `thanks|thank you|thx|ty|great thanks|nice|good job|awesome|ok thanks|cool|perfect|谢谢|多谢|感谢|谢啦|好的谢谢|棒|厉害|赞|好|ok|terima kasih|tq|bagus`,
    help: `help|what can you do|how do i use this|what can i ask|who are you|what are you|commands|what do you know|how does this work|are you offline|can you help me|你会什么|你能做什么|怎么用|帮助|你是谁|可以问什么|有什么功能|教我|你可以帮我什么|apa boleh buat|tolong|macam mana guna|siapa kamu|what is this app|what is this|what is m|this app can do what`
  };
  const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
  const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // ctx: { names: [...team], drives: [...drive names], jobs: Set of lower-case words from job names }
  function norm(q, ctx) {
    ctx = ctx || {};
    let t = " " + String(q || "").toLowerCase().replace(/[’`]/g, "'") + " ";
    t = t.replace(/\d{4}-\d{1,2}-\d{1,2}/g, " @t ").replace(/\d{1,2}月\d{1,2}[日号]?/g, " @t ").replace(/\d{1,2}[号日]/g, " @t ")
      .replace(new RegExp(`\\b\\d{1,2}\\s*(?:${MONTHS})[a-z]*\\b`, "g"), " @t ").replace(new RegExp(`\\b(?:${MONTHS})[a-z]*\\s*\\d{1,2}\\b`, "g"), " @t ")
      .replace(/\b(?:19|20)\d\d\s*年?|\b(?:19|20)\d\d\b/g, " @y ");
    (ctx.drives || []).filter(d => d && d.length > 1).sort((a, b) => b.length - a.length).forEach(d => {
      t = t.replace(new RegExp((/^[a-z0-9]/i.test(d) ? "\\b" : "") + esc(d.toLowerCase()) + (/[a-z0-9]$/i.test(d) ? "\\b" : ""), "g"), " @d "); });
    t = t.replace(/\bm\s?\d{1,2}\b/g, " @d ");
    (ctx.names || []).filter(n => n && n.length > 1).sort((a, b) => b.length - a.length).forEach(n => {
      t = t.replace(new RegExp((/^[a-z]/i.test(n) ? "\\b" : "") + esc(n.toLowerCase()) + "(?:'s)?" + (/[a-z]$/i.test(n) ? "\\b" : ""), "g"), " @p "); });
    if (ctx.jobs && ctx.jobs.size) t = t.replace(/[a-z][a-z&']{2,}/g, w => ctx.jobs.has(w) && !KEEP.has(w) ? " @j " : w);
    t = t.replace(/(@j\s*)+/g, "@j ").replace(/\d+/g, " ").replace(/[^\p{L}@' ]+/gu, " ").replace(/\s+/g, " ").trim();
    return t;
  }
  // words that mean what the person wants, never a job's name even if a job happens to contain them
  const KEEP = new Set("add new shoot shoots backup backed back up not where which find drive drives what when who how many free open show list next this week month today tomorrow birthday latest recent job jobs edit edited editing calendar settings team home dark light mode theme help thanks date summary stats".split(" "));
  const stem = w => w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, "") : w;
  function feats(t) {
    const f = new Map(), add = (k, w) => f.set(k, (f.get(k) || 0) + w);
    const toks = t.match(/@[a-z]|[a-z']+|[一-鿿]+/g) || [];
    let prev = "";
    toks.forEach(tok => {
      if (/^[一-鿿]/.test(tok)) {
        for (let i = 0; i < tok.length; i++) { add(tok[i], 1); if (i < tok.length - 1) add(tok.slice(i, i + 2), 1.6); }
        if (tok.length >= 3) for (let i = 0; i < tok.length - 2; i++) add(tok.slice(i, i + 3), 1.2);
        prev = "";
      } else {
        const w = tok[0] === "@" ? tok : stem(tok.replace(/'/g, ""));
        if (!w) return; add(w, 1); if (prev) add(prev + "_" + w, 1.2); prev = w;
      }
    });
    return f;
  }
  // the model: every example as a weighted, unit-length vector
  const EX = [];
  Object.entries(TRAIN).forEach(([intent, s]) => s.split("|").map(x => x.trim()).filter(Boolean).forEach(x => EX.push({ intent, t: x, f: feats(norm(x)) })));
  const DF = new Map(); EX.forEach(e => e.f.forEach((v, k) => DF.set(k, (DF.get(k) || 0) + 1)));
  const N = EX.length, idf = k => Math.log(1 + N / (DF.get(k) || .5));
  const vec = f => { const v = new Map(); let n = 0; f.forEach((x, k) => { const w = x * idf(k); v.set(k, w); n += w * w; }); n = Math.sqrt(n) || 1; v.forEach((w, k) => v.set(k, w / n)); return v; };
  EX.forEach(e => { e.v = vec(e.f); });
  const cos = (a, b) => { let s = 0; const [x, y] = a.size < b.size ? [a, b] : [b, a]; x.forEach((w, k) => { const o = y.get(k); if (o) s += w * o; }); return s; };
  // best intent: each intent's closest example, plus a little of its next two (agreement among examples counts)
  function classify(q, ctx) {
    const t = norm(q, ctx), v = vec(feats(t)), per = {};
    EX.forEach(e => { const s = cos(v, e.v); (per[e.intent] = per[e.intent] || []).push(s); });
    const scored = Object.entries(per).map(([intent, a]) => { a.sort((x, y) => y - x); return { intent, score: a[0] + .15 * (a[1] || 0) + .08 * (a[2] || 0) }; })
      .sort((a, b) => b.score - a.score);
    return { intent: scored[0].intent, score: scored[0].score, margin: scored[0].score - (scored[1] ? scored[1].score : 0), t, top: scored.slice(0, 3) };
  }
  g.MBrain = { classify, norm, size: EX.length, intents: Object.keys(TRAIN) };
})(typeof window !== "undefined" ? window : globalThis);
