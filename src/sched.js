// M Workspace: shoots in plain text, with no app state, so it can be tested on its own (tools/test-sched.mjs).
//   parse(text, { team, today })  a pasted schedule (WhatsApp style) -> shoot cards
//   nameLike(a, b)                 two shoot names are the same shoot (case, spaces, small differences don't matter)
//   sameIn(shoots, s)              the shoot already saved that is s (a shared day and a name like it)
//   dupsOf(shoots)                 copies: the same shoot saved more than once (the first one saved stays)
//   timeOf(s) / notesOf(s) / pack(time, notes)
//                                  a shoot's time lives in its notes as a first line "⏰ 2.30pm – 8.30pm", so it is kept by
//                                  every version of the server (no new column) and still reads fine in the sheet
(function (g) {
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const datesOf = s => (Array.isArray(s.dates) ? s.dates : String(s.dates || "").split(",")).map(x => String(x).trim()).filter(Boolean);

  // ---- time in the notes
  const MARK = "⏰ ";
  function timeOf(s) { if (s && s.time) return String(s.time).trim(); const l = String((s && s.notes) || "").split("\n")[0]; return l.startsWith(MARK) ? l.slice(MARK.length).trim() : ""; }
  function notesOf(s) { const n = String((s && s.notes) || ""); return n.startsWith(MARK) ? n.split("\n").slice(1).join("\n").trim() : n.trim(); }
  const pack = (time, notes) => [time ? MARK + String(time).trim() : "", String(notes || "").trim()].filter(Boolean).join("\n");

  // ---- same shoot
  const normQ = t => String(t || "").toLowerCase().replace(/\d{4}-\d{2}-\d{2}|\d+/g, "#").replace(/[^\p{L}#& ]+/gu, " ").replace(/\s+/g, " ").trim();
  const grams = t => { const s = normQ(t).replace(/ /g, ""), o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
  const dice = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; a.forEach(x => { if (b.has(x)) n++; }); return 2 * n / (a.size + b.size); };
  const nameKey = t => String(t || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  function nameLike(a, b) { const x = nameKey(a), y = nameKey(b); if (!x || !y) return false;
    return x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x))) || dice(grams(a), grams(b)) >= .72; }
  function sameIn(shoots, s, not) { const ds = datesOf(s);
    return (shoots || []).find(x => x !== not && !(not && x.id === not.id) && datesOf(x).some(d => ds.includes(d)) && nameLike(x.name, s.name)); }
  function dupsOf(shoots) {
    const keep = [], extra = [];
    [...(shoots || [])].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))).forEach(x => {
      if (keep.some(k => datesOf(k).join() === datesOf(x).join() && nameLike(k.name, x.name))) extra.push(x); else keep.push(x); });
    return extra;
  }

  // ---- a pasted schedule
  // "18 - Livestream test, 11am", or a day on its own line ("20th") with its jobs below, a time line ("2.30pm - 8.30pm")
  // before a name, notes and @mentions under it, "Venue: …" / "Location: …" / "地点：…" for the place.
  // Day numbers without a month are the coming ones (a day more than 3 days past this month is next month).
  const CLOCK = "\\d{1,2}(?:[.:]\\d{2})?\\s*(?:am|pm)(?:\\s*(?:-|–|~|to)\\s*\\d{1,2}(?:[.:]\\d{2})?\\s*(?:am|pm))?";
  const TIME_RE = new RegExp(`\\b(?:${CLOCK}|morning|afternoon|evening|night|full day|half day)\\b|上午|下午|晚上|早上`, "gi");
  const CLOCK_RE = new RegExp(`\\b${CLOCK}\\b`, "gi");
  const PLACE_RE = /^(?:venue|location|place|lokasi|tempat|地点|地點|场地|場地)\s*[:：-]\s*(.+)$/i;
  function parse(q, o) {
    o = o || {}; const team = o.team || [], t0 = new Date(o.today || Date.now()); t0.setHours(12, 0, 0, 0);
    const lines = String(q).replace(/[⁦-⁩‎‏]/g, "").split(/\r?\n/).map(l => l.trim());
    // a day: "20th" alone, "18 - text", "21st text"; not "1 Photo" (a count) or "2-3min" (a range)
    const DAY = /^(\d{1,2})(?:(st|nd|rd|th)\b\s*[-–—:.)]?|\s*[-–—:)]|\s*$)\s*(.*)$/i;
    const MM = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec", mon = (String(q).toLowerCase().match(new RegExp(`\\b(${MM})[a-z]*\\b(?![ \\t]*\\d)`)) || [])[1];
    const dayOf = d => { let y = t0.getFullYear(), m = mon ? MM.split("|").indexOf(mon) : t0.getMonth();
      if (!mon && d < t0.getDate() - 3) m++; if (mon && (m < t0.getMonth() || (m === t0.getMonth() && d < t0.getDate() - 3))) y++; if (m > 11) { m = 0; y++; } const x = new Date(y, m, d, 12); return x.getDate() === d ? ymd(x) : ""; };
    const lower = Object.fromEntries(team.map(n => [n.toLowerCase(), n]));
    const crewOfText = t => { const out = new Set(); (t.match(/@\s?([^@\n,，]+?)(?=\s*(?:@|$|,|，|\n))/g) || []).forEach(m => {
        const w = m.replace(/^@\s?/, "").replace(/\(.*?\)/g, "").trim().toLowerCase(); if (!w) return;
        if (/^(all|everyone|team|全部|大家)$/.test(w)) team.filter(n => n !== "M").forEach(n => out.add(n));
        else { const hit = lower[w] || team.find(n => w.includes(n.toLowerCase()) || n.toLowerCase().includes(w)); if (hit) out.add(hit); } }); return [...out]; };
    const out = []; let day = "", cur = null;
    const close = () => { if (cur && cur.name) out.push(cur); cur = null; };
    const start = (d, text) => { close(); cur = { day: d, name: "", time: "", place: "", notes: [], raw: [] }; if (text) addLine(text); };
    const addTime = tm => { if (tm) cur.time = [cur.time, tm].filter(Boolean).join(" "); };
    const addLine = l => {
      if (!cur) return; cur.raw.push(l);
      const pl = l.match(PLACE_RE); if (pl) { cur.place = pl[1].trim(); return; }
      if (!cur.name) { const tm = (l.match(TIME_RE) || []).join(" ");
        const rest = l.replace(new RegExp(`^[^A-Za-z一-鿿]*?(?:(?:${CLOCK}|morning|afternoon|evening|night)\\s*[-–:]\\s*)`, "i"), "");
        const name = rest.replace(/@\s?\S.*$/, "").replace(CLOCK_RE, " ")
          .replace(/\((?:photo|video|photo\s*&\s*video|both|morning|afternoon|evening|night|full day|half day)\)/ig, " ").replace(/\(\s*\)/g, " ")
          .replace(/[\s,.;:–-]+$/g, "").replace(/^[\s,.;:–-]+/, "").replace(/\s{2,}/g, " ").trim();
        addTime(tm); if (name) cur.name = name; return; }
      cur.notes.push(l);
    };
    lines.forEach(l => {
      const m = l.match(DAY);
      if (m && +m[1] >= 1 && +m[1] <= 31 && !(m[3] && !m[2] && /^\d/.test(m[3])) && !/^\d{1,2}\s*(?:am|pm)\b/i.test(l) && !/^\d{1,2}[.:]\d{2}/.test(l)) { close(); day = dayOf(+m[1]); if (m[3]) start(day, m[3]); return; }
      if (!day) return;
      if (!l) { if (cur && cur.name) close(); return; }
      if (!cur) start(day, l); else addLine(l);
    });
    close();
    return out.filter(e => e.day).map(e => {
      const all = e.raw.join(" "), hasP = /photo|照片|拍照|摄影/i.test(all), hasV = /video|livestream|live stream|视频|录像|摄像/i.test(all);
      return { name: e.name.slice(0, 120), dates: [e.day], location: e.place.slice(0, 200), type: hasP && !hasV ? "photo" : hasV && !hasP ? "video" : "both",
        crew: crewOfText(all), time: e.time, notes: e.notes.join("\n") };
    });
  }

  g.MSched = { parse, nameLike, sameIn, dupsOf, timeOf, notesOf, pack, datesOf };
})(typeof window !== "undefined" ? window : globalThis);
