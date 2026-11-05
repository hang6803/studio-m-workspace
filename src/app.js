// Studio M Workspace: PIN lock -> Home (one sentence + the 3D graph), drive / editor / job pages that link to each other,
// Calendar (shoot days), Settings, and 小M in the corner: tap it and it turns into the chat (ask, find, add a shoot).
// All data goes through M.api(fn, args) to the Apps Script JSON API (api/MApp.gs); the Classic Backup page's bridge uses the
// same M.api through window.parent, so one sign-in covers both. Without an API address the app runs on demo data.
// Nothing in this file writes jobs: the only writes are shoots (Calendar), PIN changes, and what Classic Backup does itself.
"use strict";
const APP_VER = "0.8.10";
const MBTN = document.getElementById("mBtn");   
const $ = id => document.getElementById(id) || (MBTN && MBTN.querySelector("#" + id));   // kept by reference: a page redraw can take the card he stands on (and him) out of the page
const CFG = window.M_API || { apiUrl: "", apiKey: "" };
const DEMO = !CFG.apiUrl;
const M = window.M = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const STILL = matchMedia("(prefers-reduced-motion: reduce)").matches;
// the phone keyboard: pop-ups size themselves to the part of the screen above it
if (window.visualViewport) { const vv = visualViewport, fit = () => { const r = document.documentElement.style; r.setProperty("--vvh", vv.height + "px"); r.setProperty("--vvtop", vv.offsetTop + "px"); };
  vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); fit();
  // the field being typed in, and the pop-up's Next / Save under it, stay above the keyboard
  addEventListener("focusin", e => { const el = e.target; if (!el.matches || !el.matches("input, textarea, select") || !el.closest(".sheet")) return;
    setTimeout(() => { el.scrollIntoView({ block: "center", behavior: "smooth" }); }, 320); });
  document.addEventListener("gesturestart", e => e.preventDefault()); }
let session = null;   // { name, token } — kept only in memory, so closing the app always asks for the PIN again

// ---------------------------------------------------------------- API
// Inside the Mac app, requests go out through Tauri's HTTP plugin (no browser CORS rules, so local servers like
// Hermes Agent work without opening CORS); in a plain browser (tests, demo) the normal fetch is used.
const net = (window.__TAURI__ && window.__TAURI__.http && window.__TAURI__.http.fetch) || window.fetch.bind(window);
M.api = async function (fn, args = []) {
  if (DEMO) return demo(fn, args);
  const res = await net(CFG.apiUrl, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },   // text/plain: no CORS preflight
    body: JSON.stringify({ key: CFG.apiKey, token: session && session.token, fn, args })
  });
  const out = await res.json();
  if (out.error) {
    if (/^SESSION/.test(out.error)) lock("Signed out. Enter your PIN again.");
    throw new Error(out.error);
  }
  return out.result;
};

// Demo data (no server): PINs Hang 1111, Mun 2222, Michael 3333; studio PIN 0000
function demoRows() {
  const y = new Date().getFullYear(), at = y + "-01-01T00:00:00Z", out = [];
  // [year offset, section, name, MM-DD, drive, editor, video backed up?, photo row: undefined = none, true/false = backed up?]
  const L = [
    [0, "Wedding", "Tan & Lee Wedding", "03-14", "M1", "Hang", 1, 1], [0, "Corporate", "Petronas Gala Night", "05-17", "M2", "Mun", 0],
    [0, "Corporate", "Maybank Townhall", "06-09", "M1", "Michael", 1], [0, "Event", "Deepavali Open House", "10-20", "M1", "Mun", 0, 0],
    [0, "Wedding", "Wong & Lim Wedding", "08-02", "M2", "Hang", 1, 0], [0, "Event", "Sunway Launch", "02-11", "M1", "Hang", 0],
    [0, "Event", "CNY Dinner", "02-01", "M1", "Mun", 1, 1], [0, "Event", "Raya Open House", "04-12", "M1", "Mun", 1],
    [0, "Portrait", "Lim Family Portrait", "07-19", "M1", "Hang", 1], [0, "Travel", "Rinjani Trip", "09-05", "M2", "Michael", 0, 1],
    [0, "Corporate", "AirAsia Offsite", "03-28", "M2", "Hang", 1], [0, "Corporate", "Grab Year End", "01-18", "M2", "Mun", 1, 1],
    [0, "Wedding", "Chong & Yap Wedding", "09-26", "M3", "Mun", 1], [0, "Wedding", "Ng & Teo Wedding", "10-03", "M3", "Michael", 1, 1],
    [0, "Event", "Merdeka Run", "08-31", "M3", "Michael", 1], [0, "Corporate", "Shopee Kickoff", "06-30", "M3", "Mun", 0],
    [-1, "Wedding", "Goh & Lau Wedding", "11-09", "M1", "Hang", 1, 1], [-1, "Corporate", "CIMB Awards", "12-05", "M2", "Mun", 1],
    [-1, "Event", "Christmas Market", "12-20", "M2", "Michael", 0], [-1, "Travel", "Sabah Trip", "07-14", "M1", "Michael", 1, 1]
  ];
  L.forEach(([o, sec, name, md, drv, ed, v, p], i) => {
    const yr = String(y + o), base = { year: yr, name, date: `${yr}-${md}`, drive: `${drv} ${yr}`, editor: ed, createdAt: at, updatedAt: at, no: String(i + 1) };
    out.push({ ...base, id: "d" + i, section: sec, ...(v ? { backedUp: "Video", backupDate: `${yr}-${md}` } : {}) });
    if (p !== undefined) out.push({ ...base, id: "d" + i + "p", section: sec + " · Photo", ...(p ? { backedUp: "Photo", backupDate: `${yr}-${md}` } : {}) });
  });
  return out;
}
function demo(fn, args) {
  const db = store.get("mDemo4", null) || { rev: 1, shoots: [], settings: {}, team: ["Hang", "Mun", "Michael"],
    pins: { Hang: "1111", Mun: "2222", Michael: "3333" }, rows: demoRows() };
  if (!db.shoots.length && !db.seeded) {   // two upcoming shoots so Home has something to show
    const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return ymd(t); };
    db.shoots = [{ id: "s_demo1", name: "Lim Wedding", dates: d(3), location: "Ipoh", type: "both", crew: "Hang,Mun", notes: "", jobId: "" },
      { id: "s_demo2", name: "Genting Launch", dates: d(9) + "," + d(10), location: "Genting", type: "video", crew: "Michael", notes: "", jobId: "" },
      { id: "s_demo3", name: "Petaling Food Fair", dates: d(-4), location: "Petaling Jaya", type: "both", crew: "Mun", notes: "", jobId: "" },
      { id: "s_demo4", name: "Deepavali Open House", dates: new Date().getFullYear() + "-10-20", location: "Brickfields", type: "both", crew: "Mun,Hang", notes: "", jobId: "" }];
    db.birthdays = { Hang: "1990-03-12", Mun: "1994-08-21" };
    db.seeded = true;
  }
  const save = () => { db.rev++; store.set("mDemo4", db); };
  if (!store.get("mDemo4", null)) store.set("mDemo4", db);
  const ok = v => new Promise(r => setTimeout(() => r(v), 120));
  switch (fn) {
    case "team": return ok({ members: db.team.map(n => ({ name: n, hasPin: !!db.pins[n] })), studioPin: true });
    case "login": { const n = db.team.find(x => db.pins[x] === args[0]); return n ? ok({ name: n, token: "demo" }) : Promise.reject(new Error("Wrong PIN")); }
    case "setMyPin": {
      const [n, auth, pin] = args;
      if (db.pins[n] ? auth !== db.pins[n] : auth !== "0000") return Promise.reject(new Error(db.pins[n] ? "Current PIN is wrong" : "Studio PIN is wrong"));
      if (db.team.some(x => x !== n && db.pins[x] === pin)) return Promise.reject(new Error("That PIN is taken. Pick another."));
      db.pins[n] = pin; save(); return ok({ name: n, token: "demo" });
    }
    case "getAll": return ok({ rev: db.rev, rows: db.rows, team: db.team, birthdays: db.birthdays || {}, settings: db.settings, pinRequired: false });
    case "getRev": return ok(db.rev);
    case "getJob": return ok(db.rows.find(r => r.id === args[0]) || null);
    case "saveJob": { const j = args[1], i = db.rows.findIndex(r => r.id === j.id); if (i < 0) db.rows.push(j); else db.rows[i] = j; save(); return ok(true); }
    case "deleteJob": db.rows = db.rows.filter(r => r.id !== args[1]); save(); return ok(true);
    case "setTeam": db.team = args[1]; if (args[2]) db.birthdays = args[2]; save(); return ok(true);
    case "setSetting": db.settings[args[1]] = args[2]; save(); return ok(true);
    case "addFeedback": return ok(true);
    case "getShoots": return ok(db.shoots);
    case "saveShoot": { const s = args[1], i = db.shoots.findIndex(x => x.id === s.id); if (i < 0) db.shoots.push(s); else db.shoots[i] = s; save(); return ok(true); }
    case "deleteShoot": db.shoots = db.shoots.filter(x => x.id !== args[1]); save(); return ok(true);
  }
  return Promise.reject(new Error("Unknown call: " + fn));
}

// ---------------------------------------------------------------- small helpers
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseYmd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return ymd(d) === s ? d : null; };
const fmtDay = s => { const d = parseYmd(s); return d ? `${WD[(d.getDay() + 6) % 7]} ${d.getDate()} ${MON[d.getMonth()]}` : s; };
const fmtShort = s => { const d = parseYmd(String(s || "").slice(0, 10)); return d ? `${d.getDate()} ${MON[d.getMonth()]}` : String(s || ""); };   // "16 Oct", no year (Backup rule)
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const datesOf = s => String(s.dates || "").split(",").map(x => x.trim()).filter(Boolean);
const crewOf = s => String(s.crew || "").split(",").map(x => x.trim()).filter(Boolean);
function toast(text, label, fn) {
  const t = $("toast"); t.textContent = text;
  if (label) { const b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = label; b.onclick = () => { t.hidden = true; fn(); }; t.append(b); }
  if (/^(Couldn't|Can't|Failed|Error|No connection)|failed|not saved/i.test(text)) fx("err");
  t.hidden = false; t.classList.remove("in"); void t.offsetWidth; t.classList.add("in"); clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, label ? 5000 : 2400); }
function range(from, to) {   // every day from..to (max 31), as YYYY-MM-DD
  const a = parseYmd(from), b = parseYmd(to || from); if (!a || !b || b < a) return a ? [from] : [];
  const out = []; for (const d = new Date(a); d <= b && out.length < 31; d.setDate(d.getDate() + 1)) out.push(ymd(d));
  return out;
}
const fx = k => { if (window.UIFx) UIFx(k); else if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {} };   // sound + haptic, see fx.js
const buzz = k => fx(k || "toggle");

// ---------------------------------------------------------------- Backup rules (the same as the Backup page)
// Video and Photo of one job are two rows ("Wedding" and "Wedding · Photo", same year and name). A row counts as
// backed up only when it AND its twin are; FullHD / link don't change the colour.
const drivesOf = r => String(r.drive || "").split(/\s*,\s*/).filter(Boolean);
const dName = d => d === "未知" ? "Unknown" : d;   // the Sheet's placeholder drive, shown in English
const sectionOf = r => r.section || "Event";
const baseOf = sec => String(sec).replace(/ · Photo$/, "");
const isPhotoSec = sec => / · Photo$/.test(String(sec));
const normName = n => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
let twinIndex = new Map();
function buildTwins() {
  twinIndex = new Map();
  (data.rows || []).forEach(r => { const k = r.year + "|" + baseOf(sectionOf(r)) + "|" + normName(r.name); const e = twinIndex.get(k) || {}; e[isPhotoSec(sectionOf(r)) ? "photo" : "video"] = r; twinIndex.set(k, e); });
}
function twinOf(r) { const e = twinIndex.get(r.year + "|" + baseOf(sectionOf(r)) + "|" + normName(r.name)) || {}; return isPhotoSec(sectionOf(r)) ? e.video : e.photo; }
const selfUnbacked = r => !r.backupDate && !r.backedUp;
function unbacked(r) { if (selfUnbacked(r)) return true; const t = twinOf(r); return !!(t && selfUnbacked(t)); }
const rowsOf = y => (data.rows || []).filter(r => String(r.year) === String(y));
const byDate = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
const kindLabel = r => isPhotoSec(sectionOf(r)) ? "Photo" : "Video";

// ---------------------------------------------------------------- M, the camera mascot (same drawing as in Backup)
let mN = 0;
function mSVG(back) {
  const id = "mmc" + (++mN);
  return `<svg viewBox="-5 -10 130 130" role="img" aria-label="M"><defs><clipPath id="${id}"><circle cx="60" cy="70" r="23"/></clipPath></defs>
    <ellipse cx="60" cy="112" rx="34" ry="4.5" fill="#000" opacity=".22"/>
    <g class="mm-all">
      <ellipse class="mm-foot l" cx="40" cy="104" rx="9" ry="5" fill="#f48020"/><ellipse class="mm-foot r" cx="80" cy="104" rx="9" ry="5" fill="#f48020"/>
      <path d="M36 40 C34 30 42 26 48 32 L52 36 L56 32 C62 26 70 30 68 40 Z" fill="#f48020"/>
      <rect x="18" y="38" width="84" height="64" rx="20" fill="#f48020"/>
      <g class="mm-face"><rect x="76" y="31" width="16" height="9" rx="3" fill="#fff"/><circle class="mm-flash" cx="84" cy="35" r="10" fill="#fff"/>
      <circle cx="60" cy="70" r="23" fill="#fff"/>
      <g class="mm-pupil"><circle cx="60" cy="70" r="12" fill="#141414"/><circle cx="64" cy="65" r="3.5" fill="#fff"/><circle cx="56.5" cy="74" r="1.5" fill="#fff"/></g>
      <rect class="mm-lid" x="36" y="46" width="48" height="48" fill="#f48020" clip-path="url(#${id})"/>
      <path class="mm-brow" d="M45 47 L56 42 M75 47 L64 42" stroke="#141414" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="28" cy="88" rx="4" ry="2.5" fill="#fff" opacity=".35"/><ellipse cx="92" cy="88" rx="4" ry="2.5" fill="#fff" opacity=".35"/>
      <path class="mm-mouth" d="M55 96 Q60 99 65 96" fill="none" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse class="mm-open" cx="60" cy="97" rx="4" ry="3" fill="#141414"/></g>
      ${back ? '<g class="mm-back"><rect x="28" y="31" width="16" height="9" rx="3" fill="#fff"/><path d="M44 62 Q60 56 76 62 M48 74 Q60 69 72 74" fill="none" stroke="#d2650c" stroke-width="2" stroke-linecap="round" opacity=".5"/><g class="mm-peek"><circle cx="100" cy="58" r="11" fill="#fff"/><circle cx="104" cy="58" r="5.5" fill="#141414"/><circle cx="105.5" cy="56" r="1.6" fill="#fff"/></g></g>' : ""}
    </g></svg>`;
}
// 小M is the 2.5D one from xiaom.js (the same file the Backup page uses); the flat drawing above is only the fallback
const X = window.XiaoM;
const face = back => X ? (back ? X.camBackSVG("", "M") : X.camSVG("", "", "M")) : mSVG(back);
// one move at a time on a 2.5D 小M (hop, cheer, shrug, squish, land…), taken off again when it is done
function act(host, name, ms) {
  const m = host.querySelector(".m25"); if (!m) return;
  clearTimeout(host._act); if (host._actName) m.classList.remove(host._actName);
  void m.offsetWidth; m.classList.add(name); host._actName = name;
  host._act = setTimeout(() => { m.classList.remove(name); host._actName = ""; }, ms || 1300);
}
// 小M is built from a few hundred stacked slices, 2 model px apart; at button size on a phone that is a fraction of a screen
// pixel, and every slice is one more 3D layer the phone re-sorts on every frame of his breathing and blinking. So on a touch
// screen, a small 小M keeps every second plain slice (front, back, outlined and other distinct slices always stay): the same
// picture, half the layers. The big 小M of festival scenes is never touched.
const THIN = matchMedia("(pointer: coarse)").matches;
function thinM(root) {
  if (!THIN) return;
  root.querySelectorAll(".m25:not([data-thin])").forEach(m => {
    const w = m.getBoundingClientRect().width; if (!w || w > 100) return;
    m.dataset.thin = "1";
    const groups = new Set(); m.querySelectorAll(".slice").forEach(sl => groups.add(sl.parentElement));
    groups.forEach(g => {
      const sl = [...g.children].filter(c => c.classList.contains("slice")); if (sl.length < 5) return;
      const key = e => e.innerHTML + "|" + (e.style.background || e.style.backgroundColor) + "|" + e.style.borderRadius + "|" + e.style.width + "|" + e.style.height;
      const ks = sl.map(key), last = sl.length - 1;
      sl.forEach((e, k) => { if (k === 0 || k === last || k % 2 === 0) return; if (ks[k] !== ks[k - 1] || ks[k] !== ks[k + 1]) return; e.remove(); });
    });
  });
}
if (THIN) { let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; thinM(document.body); }); }).observe(document.body, { childList: true, subtree: true }); }
$("mSvg").innerHTML = face(false);
$("mpAv").innerHTML = face(false);
$("lockM").innerHTML = X ? face(false) : mSVG(true);
function lockMood(c) {
  const m = $("lockM");
  if (X) { if (c) act(m, c === "yay" ? "cheer" : "shrug", c === "yay" ? 1900 : 1300); return; }
  m.classList.remove("no", "yay", "turn"); void m.offsetWidth; if (c) m.classList.add(c);
}
// While the PIN is typed 小M turns its back (it has no hands to cover its eye), and now and then turns round to peek
let lockWant = false, lockShown = false, peekT = 0;
function lockFace(back) {
  if (lockShown === back) return; lockShown = back;
  const m = $("lockM");
  X.turn(m, () => { m.innerHTML = face(back); });
}
function lockTurn(back) {
  const m = $("lockM");
  if (!X) { if (m.classList.contains("cover") !== back) { m.classList.remove("turn"); void m.offsetWidth; m.classList.add("turn"); m.classList.toggle("cover", back); } return; }
  lockWant = back; clearTimeout(peekT); lockFace(back);
  if (back) peekT = setTimeout(function peek() {
    if (!lockWant) return; lockFace(false);
    peekT = setTimeout(() => { if (!lockWant) return; lockFace(true); peekT = setTimeout(peek, 2600 + Math.random() * 1600); }, 900);
  }, 2400);
}

// ---------------------------------------------------------------- Studio M loading
// Shows the loading only if the work takes longer than 600ms, so a fast sign-in never flashes it
async function slow(work) {
  const b = $("boot"); let shown = false;
  const t = setTimeout(() => { shown = true; b.classList.remove("breathe"); b.hidden = false; }, 600);
  try { return await work; }
  finally { clearTimeout(t); if (shown) { b.classList.add("breathe"); setTimeout(() => { if (b.classList.contains("breathe")) b.hidden = true; }, 1500); } }
}

// ---------------------------------------------------------------- offline (the phone app with no connection)
// After a PIN works online, this device keeps a scrambled copy of it and the last data it loaded, so with no
// connection the same PIN still opens the app and shows that data (view only). Back online, the PIN is asked
// again so saving goes through the server as usual. Backup's own outbox keeps saves made offline.
const isNetErr = e => navigator.onLine === false || /failed to fetch|network|load failed|offline|internet/i.test(String((e && e.message) || e || ""));
async function pinHash(pin) {
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("studio-m|" + CFG.apiUrl + "|" + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { return ""; }
}
async function keepPin(pin, name) { if (DEMO) return; const h = await pinHash(pin); if (!h) return; const m = store.get("mPins", {}) || {}; for (const k in m) if (m[k] === name) delete m[k]; m[h] = name; store.set("mPins", m); }
async function offlineName(pin) { if (DEMO) return ""; const h = await pinHash(pin), m = store.get("mPins", {}) || {}; return (h && m[h]) || ""; }
const offlineCopy = () => { const c = store.get("mCache", null); return c && c.all && Array.isArray(c.all.rows) ? c : null; };
function useCopy(c) { data = c.all; team = c.all.team || []; shoots = c.sh || []; teamOk = false;
  const d = new Date(c.at); toast(`Offline. Showing what was saved ${fmtShort(ymd(d))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}.`); }
addEventListener("online", () => { if (session && session.offline) lock("Back online. Enter your PIN to sync."); });

// ---------------------------------------------------------------- PIN lock
let entered = "", team = [];
function lock(msg) {
  session = null; entered = "";
  $("shell").hidden = true; $("setup").hidden = true; $("lock").hidden = false;
  $("lockMsg").textContent = msg || ""; drawDots();
  $("backupFrame").removeAttribute("src"); backupLoaded = false; scenes(false);
  closeM(true); MBTN.hidden = true; if (graph) graph.stop();
  closeShoot(); if (streaming) streaming.abort(); gKey = ""; teamOk = false; closeJob(true);
}
function drawDots() { [...$("dots").children].forEach((d, i) => d.classList.toggle("on", i < entered.length)); lockTurn(entered.length > 0); }
async function key(k) {
  if (k === "del") entered = entered.slice(0, -1);
  else if (entered.length < 4 && /\d/.test(k)) entered += k;
  drawDots();
  if (entered.length === 4) {
    const pin = entered;
    try { session = await slow(M.api("login", [pin])); keepPin(pin, session.name); entered = ""; drawDots(); setTimeout(() => lockMood("yay"), 300); setTimeout(unlock, 900); }
    catch (e) {
      const off = isNetErr(e) && await offlineName(pin);
      if (off) { session = { name: off, token: "", offline: true }; entered = ""; drawDots(); setTimeout(() => lockMood("yay"), 300); setTimeout(unlock, 900); return; }
      if (isNetErr(e) && !DEMO) e = new Error(store.get("mPins", null) ? "No connection, and that PIN doesn't match. Try again." : "No connection. Sign in once with internet, then it opens offline too.");
      $("dots").classList.remove("shake"); void $("dots").offsetWidth; $("dots").classList.add("shake");
      $("lockMsg").textContent = e.message; entered = ""; drawDots(); setTimeout(() => lockMood("no"), 300);
    }
  }
}
$("pad").addEventListener("click", e => { const b = e.target.closest("button"); if (b) key(b.dataset.k); });
document.addEventListener("keydown", e => {
  if ($("lock").hidden) return;
  if (/^\d$/.test(e.key)) key(e.key); else if (e.key === "Backspace") key("del");
});
$("lockBtn").addEventListener("click", () => lock());

// First-time setup: pick your name (only people without a PIN), studio PIN, new PIN twice
$("setupBtn").addEventListener("click", async () => {
  $("lock").hidden = true; $("setup").hidden = false; $("suMsg").textContent = "";
  try {
    const t = await M.api("team");
    const free = t.members.filter(m => !m.hasPin);
    $("suName").innerHTML = free.length ? free.map(m => `<option>${esc(m.name)}</option>`).join("") : `<option value="">Everyone has a PIN</option>`;
    $("suStudioRow").hidden = !t.studioPin;
  } catch (e) { $("suMsg").textContent = e.message; }
});
$("suCancel").addEventListener("click", () => lock());
$("setupForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pin = $("suPin").value, name = $("suName").value;
  if (!name) return;
  if (!/^\d{4}$/.test(pin)) { $("suMsg").textContent = "PIN is 4 digits"; return; }
  if (pin !== $("suPin2").value) { $("suMsg").textContent = "The two PINs are different"; return; }
  try { session = await slow(M.api("setMyPin", [name, $("suStudio").value, pin])); e.target.reset(); unlock(); }
  catch (err) { $("suMsg").textContent = err.message; }
});

// ---------------------------------------------------------------- shell + routes
// Every page has an address (#/drive/M1 2026, #/editor/Mun, #/job/<id>…), so links, Back and Forward all work.
let data = { rows: [], team: [] }, shoots = [], route = { name: "home" }, gYear = String(new Date().getFullYear()), onlyUn = false, graph = null;
function unlock() {
  $("lock").hidden = true; $("setup").hidden = true; $("shell").hidden = false;
  try { localStorage.setItem("me", session.name); } catch (e) {}   // the Classic Backup page reads its user from here
  $("meBtn").textContent = $("meBtn2").textContent = session.name[0].toUpperCase();
  $("menuName").textContent = $("sideName").textContent = session.name;
  $("demoBadge").hidden = !DEMO;
  if (!graph) graph = Graph3D($("graph"), { onPin: drawPin, onOpen: n => { location.hash = hrefOf(n); } });
  if (!location.hash || location.hash === "#/") history.replaceState(null, "", "#/home");
  showM(); drawAll(); render(true); refresh(); scenes(true);
}
function parse(h) {
  const p = String(h || "").replace(/^#\/?/, "").split("/").map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
  const name = p[0] || "home";
  return ["home", "calendar", "team", "unbacked", "drives", "settings", "backup", "classic", "drive", "editor", "job"].includes(name) ? { name, key: p[1] || "" } : { name: "home", key: "" };
}
const hrefOf = n => n.kind === "drive" ? "#/drive/" + encodeURIComponent(n.key) : n.kind === "editor" ? "#/editor/" + encodeURIComponent(n.key)
  : n.kind === "shoot" ? "#/calendar/" + encodeURIComponent(n.date || "") : "#/job/" + encodeURIComponent(n.key);
const TITLES = { calendar: "Calendar", team: "Team", unbacked: "Not backed up", drives: "Drives", settings: "Settings", backup: "Backup", classic: "Classic Backup" };
addEventListener("hashchange", () => { if (session) { fx("nav"); render(false); } });
// Page changes cross-fade and slide (View Transitions where the system has them); the sidebar marker glides to the new place
function render(first) {
  const next = parse(location.hash);
  const b = MBTN, from = b.hidden ? null : b.getBoundingClientRect();
  // with a page transition, 小M is his own layer in it: he isn't cross-faded with the page (that was the flash), he hops to his new spot
  const vt = !first && !STILL && document.startViewTransition;
  const apply = () => { route = next; paint(); perch.st = 0; perch.dock = false; perch(from); };
  if (vt) document.startViewTransition(apply); else apply();
  if (window.innerWidth < 900 && !$("mPanel").hidden) closeM();
}
let shownView = "";
function paint() {
  if (shownView === "classic" && route.name !== "classic") refresh();   // jobs added or changed in Backup show up right away
  const v = { home: "home", calendar: "calendar", team: "team", settings: "settings", backup: "backup", classic: "classic", job: "job" }[route.name] || "list";
  document.querySelectorAll(".view").forEach(s => { s.hidden = s.id !== "v-" + v; });
  $("main").scrollTop = 0; $("views").scrollTop = 0;
  $("meMenu").hidden = true;
  $("topTitle").textContent = route.name === "drive" ? dName(route.key) : route.name === "editor" ? route.key : route.name === "job" ? "Job" : TITLES[route.name] || "";
  document.body.dataset.route = route.name;
  markNav();
  if (v === "home") { graph.start(); graph.theme(); graph.reset(); } else if (graph) graph.stop();
  if (v === "list") { const lk = route.name + ":" + route.key; if (lk !== drawList.key) { drawList.key = lk; listUn = false; } drawList(); }
  if (v === "job") drawJob();
  if (v === "calendar") { if (route.key && parseYmd(route.key)) { selDay = route.key; const d = parseYmd(route.key); calY = d.getFullYear(); calM = d.getMonth(); } drawCal(); }
  if (v === "backup") drawBackup(true);
  if (v === "classic") loadBackup(); else if (v === "backup" && !backupLoaded) (window.requestIdleCallback || (g => setTimeout(g, 600)))(() => { if (session) loadBackup(); }, { timeout: 1500 });   // after the list has drawn   // Backup saves through Classic Backup, kept ready in the background
  if (v === "team") drawTeam();
  shownView = v;
  if (v === "settings") { drawTheme(); drawAI(); drawVoice(); drawFx(); }
}
function markNav() {
  const key = route.name === "drive" || route.name === "editor" ? route.name + ":" + route.key : route.name === "job" ? "" : route.name === "classic" ? "backup" : route.name;
  let on = null;
  document.querySelectorAll("#nav .nav-i").forEach(a => { const hit = a.dataset.r === key; a.classList.toggle("on", hit); if (hit) on = a; a.toggleAttribute("aria-current", hit); });
  const ind = $("navInd");
  if (on) { ind.style.transform = `translateY(${on.offsetTop}px)`; ind.style.height = on.offsetHeight + "px"; ind.style.opacity = 1; } else ind.style.opacity = 0;
  const tab = { home: "home", calendar: "calendar", backup: "backup", classic: "backup", team: "team", drives: "drives", drive: "drives" }[route.name];
  document.querySelectorAll("#tabs [data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === tab));
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-href]"); if (b) { location.hash = b.dataset.href; return; }
  if (!e.target.closest("#meMenu, #meBtn, #meBtn2")) $("meMenu").hidden = true;
});
$("backBtn").addEventListener("click", () => { if (history.length > 1) history.back(); else location.hash = "#/home"; });
const toggleMenu = () => { $("meMenu").hidden = !$("meMenu").hidden; };
$("meBtn").addEventListener("click", toggleMenu); $("meBtn2").addEventListener("click", toggleMenu);

async function refresh() {
  if (session && session.offline) { const c = offlineCopy(); if (c) useCopy(c); drawAll(); return; }
  try {
    const [all, sh] = await Promise.all([M.api("getAll"), M.api("getShoots")]);
    data = all; team = all.team || []; shoots = sh || [];
    teamOk = Array.isArray(all.team) && all.team.length > 0 && !!all.birthdays && typeof all.birthdays === "object";
    if (!DEMO) store.set("mCache", { at: Date.now(), all, sh: shoots });
  } catch (e) { const c = !DEMO && isNetErr(e) && offlineCopy(); if (c && !(data.rows || []).length) useCopy(c); else toast(e.message); }
  drawAll();
}
setInterval(() => { if (session && !document.hidden) refresh(); }, 60000);

function drawAll() {
  buildTwins();
  drawHome(); drawSide();
  if (route.name === "calendar") drawCal();
  if (["drive", "editor", "unbacked", "drives"].includes(route.name)) drawList();
  if (route.name === "job") drawJob();
  if (route.name === "team") drawTeam();
  if (typeof perch === "function" && session) requestAnimationFrame(() => perch());   // a redraw can take 小M's spot away
  if (route.name === "backup") drawBackup();
}

// ---------------------------------------------------------------- sidebar: drives and editors of the year on Home
function yearsAll() { const s = new Set((data.rows || []).map(r => String(r.year)).filter(Boolean)); s.add(String(new Date().getFullYear())); return [...s].sort(); }
function drivesIn(y) {
  const m = new Map();
  rowsOf(y).forEach(r => drivesOf(r).forEach(d => { const o = m.get(d) || { name: d, n: 0, un: 0 }; o.n++; if (unbacked(r)) o.un++; m.set(d, o); }));
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function editorsIn(y) {
  const names = [...new Set([...team, ...rowsOf(y).map(r => r.editor).filter(Boolean)])];
  return names.map(n => { const rs = rowsOf(y).filter(r => r.editor === n); return { name: n, n: rs.length, un: rs.filter(unbacked).length }; });
}
function drawSide() {
  const un = rowsOf(gYear).filter(unbacked).length;
  $("nUn").textContent = un || ""; $("nUn").hidden = !un;
  $("sideDrives").innerHTML = drivesIn(gYear).map(d => `<a class="nav-i sub" href="#/drive/${encodeURIComponent(d.name)}" data-r="drive:${esc(d.name)}"><span class="hub drive" aria-hidden="true"></span><span>${esc(dName(d.name))}</span>
    <span class="mini" aria-hidden="true"><i class="ok" style="height:${Math.round(14 * (d.n - d.un) / Math.max(1, d.n))}px"></i><i class="no" style="height:${Math.round(14 * d.un / Math.max(1, d.n))}px"></i></span><em>${d.n}</em></a>`).join("")
    || `<p class="side-empty">No drives in ${esc(gYear)}</p>`;
  $("sideEds").innerHTML = editorsIn(gYear).map(e => `<a class="nav-i sub" href="#/editor/${encodeURIComponent(e.name)}" data-r="editor:${esc(e.name)}"><span class="hub ed" aria-hidden="true">${esc(initials(e.name))}</span><span>${esc(e.name)}</span>${e.un ? `<em class="red">${e.un}</em>` : ""}</a>`).join("");
  markNav();
}
// one letter, or two when someone earlier on the team starts with the same letter (Mun "M", Michael "Mi")
const initials = n => {
  const w = String(n || "").trim(), first = w.slice(0, 1).toUpperCase(), i = team.indexOf(w);
  return i > 0 && team.slice(0, i).some(t => t[0] && t[0].toUpperCase() === first) ? first + w.slice(1, 2) : first;
};

// ---------------------------------------------------------------- Home: one sentence + the graph
let gKey = "";
function drawHome() {
  if (!session) return;
  const now = new Date(), h = now.getHours(), today = ymd(now), year = String(now.getFullYear()), me = session.name;
  $("hello").textContent = `${h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"}, ${me}.`;
  const mine = rowsOf(year).filter(r => r.editor === me && unbacked(r)).length;
  const next = shoots.filter(s => crewOf(s).includes(me)).map(s => ({ s, d: datesOf(s).find(d => d >= today) })).filter(x => x.d).sort((a, b) => a.d < b.d ? -1 : 1)[0];
  const a = mine ? `<a href="#/editor/${encodeURIComponent(me)}">${mine === 1 ? "1 of your jobs" : mine + " of your jobs"}</a> ${mine === 1 ? "is" : "are"} not backed up yet.` : "All your jobs are backed up.";
  const b = next ? ` Your next shoot is <a href="#/calendar/${esc(encodeURIComponent(next.d))}">${esc(fmtDay(next.d))}</a>, ${esc(next.s.name)}.` : " No shoots on your calendar yet.";
  $("sum").innerHTML = a + b;
  drawYear(false);
  if (graph) { const gd = graphData(gYear), k = gYear + JSON.stringify(gd); if (k !== gKey) { gKey = k; graph.setData(gd); drawPin(graph.pinned); } }
}
// nodes: drives and editors of the year, every job row of the year, and upcoming shoots not made into a job yet
function graphData(y) {
  const nodes = [], links = [], seen = new Set(), add = n => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  const today = ymd(new Date());
  editorsIn(y).forEach(e => add({ id: "e:" + e.name, key: e.name, kind: "editor", label: e.name, short: initials(e.name) }));
  rowsOf(y).forEach(r => {
    const j = { id: "j:" + r.id, key: r.id, kind: "job", label: r.name + (isPhotoSec(sectionOf(r)) ? " · Photo" : ""), status: unbacked(r) ? "no" : "ok" };
    add(j);
    drivesOf(r).forEach(d => { add({ id: "d:" + d, key: d, kind: "drive", label: dName(d) }); links.push({ a: j.id, b: "d:" + d }); });
    if (r.editor) { add({ id: "e:" + r.editor, key: r.editor, kind: "editor", label: r.editor, short: initials(r.editor) }); links.push({ a: j.id, b: "e:" + r.editor }); }
  });
  shoots.filter(s => !s.jobId && datesOf(s).some(d => d >= today && d.slice(0, 4) === y)).forEach(s => {
    const n = { id: "s:" + s.id, key: s.id, kind: "shoot", label: s.name, date: datesOf(s).find(d => d >= today) };
    add(n); crewOf(s).forEach(c => { if (seen.has("e:" + c)) links.push({ a: n.id, b: "e:" + c }); });
  });
  return { nodes, links };
}
function drawYear(animate) {
  const el = $("yearBig"), ys = yearsAll(), i = ys.indexOf(gYear);
  if (el.textContent !== gYear) {
    if (animate && !STILL) el.animate([{ opacity: 0, transform: `translateY(${animate > 0 ? 24 : -24}px)` }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
    el.innerHTML = `${esc(gYear.slice(0, 2))}<em>${esc(gYear.slice(2))}</em>`;
  }
  $("yPrev").disabled = i <= 0; $("yNext").disabled = i >= ys.length - 1;
}
function setYear(dir) {
  const ys = yearsAll(), i = ys.indexOf(gYear) + dir; if (i < 0 || i >= ys.length) return;
  gYear = ys[i]; graph.pin(null); buzz(); drawYear(dir); drawSide(); const gd = graphData(gYear); gKey = gYear + JSON.stringify(gd); graph.setData(gd);
}
$("yPrev").addEventListener("click", () => setYear(-1));
$("yNext").addEventListener("click", () => setYear(1));
$("onlyUn").addEventListener("click", () => {
  onlyUn = !onlyUn; $("onlyUn").setAttribute("aria-pressed", onlyUn); buzz();
  graph.setFilter(onlyUn ? n => n.kind === "drive" || n.kind === "editor" || n.status === "no" : null);
});
// the card for the pinned dot: what it is, what it's linked to, and the way in
let pinOut = 0;
function drawPin(n) {
  const c = $("pinCard");
  clearTimeout(pinOut);
  if (!n) { if (!c.hidden) { c.classList.add("out"); pinOut = setTimeout(() => { c.hidden = true; c.classList.remove("out"); }, 200); } return; }
  c.classList.remove("out");
  const link = (k, v) => `<a href="#/${k}/${encodeURIComponent(v)}">${esc(v)}</a>`;
  const list = a => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  let html = "";
  if (n.kind === "drive" || n.kind === "editor") {
    const rs = rowsOf(gYear).filter(r => n.kind === "drive" ? drivesOf(r).includes(n.key) : r.editor === n.key), un = rs.filter(unbacked).length;
    const other = n.kind === "drive" ? [...new Set(rs.map(r => r.editor).filter(Boolean))].map(x => link("editor", x)) : [...new Set(rs.flatMap(drivesOf))].map(x => link("drive", x));
    html = `<div class="pc-h"><span class="hub ${n.kind === "drive" ? "drive" : "ed"}">${n.kind === "editor" ? esc(initials(n.key)) : ""}</span><b>${esc(n.key)}</b></div>
      <p>${rs.length} ${rs.length === 1 ? "job" : "jobs"} in ${esc(gYear)}${un ? `, <span class="red">${un} not backed up</span>` : ", all backed up"}.</p>
      ${other.length ? `<p>${n.kind === "drive" ? "Edited by" : "On"} ${list(other)}.</p>` : ""}
      <a class="pc-open" href="${hrefOf(n)}" data-open="${esc(n.id)}">Open ${n.kind === "drive" ? "drive" : "editor"}</a>`;
  } else if (n.kind === "job") {
    const r = (data.rows || []).find(x => x.id === n.key); if (!r) return;
    html = `<div class="pc-h"><i class="dot ${unbacked(r) ? "red" : "green"}"></i><b>${esc(r.name)}</b></div>
      <p>${esc(sectionOf(r))}, ${esc(fmtShort(r.date))}. ${unbacked(r) ? '<span class="red">Not backed up.</span>' : "Backed up."}</p>
      <p>${drivesOf(r).map(d => link("drive", d)).join(", ") || "No drive"}${r.editor ? ", edited by " + link("editor", r.editor) : ""}.</p>
      <a class="pc-open" href="${hrefOf(n)}" data-open="${esc(n.id)}">Open job</a>`;
  } else {
    const s = shoots.find(x => x.id === n.key); if (!s) return;
    html = `<div class="pc-h"><i class="dot hollow"></i><b>${esc(s.name)}</b></div><p>${esc(datesOf(s).map(fmtDay).join(", "))}${s.location ? ", " + esc(s.location) : ""}.</p>
      <p>${crewOf(s).map(x => link("editor", x)).join(", ") || "No crew yet"}.</p><a class="pc-open" href="${hrefOf(n)}" data-open="${esc(n.id)}">Open in Calendar</a>`;
  }
  c.innerHTML = html + `<button type="button" class="ibtn plain pc-x" aria-label="Unpin">✕</button>`;
  if (c.hidden) { c.hidden = false; c.classList.remove("out"); c.classList.remove("in"); void c.offsetWidth; c.classList.add("in"); }
  else { c.classList.remove("swap"); void c.offsetWidth; c.classList.add("swap"); }
}
$("pinCard").addEventListener("click", e => {
  if (e.target.closest(".pc-x")) { graph.pin(null); return; }
  const o = e.target.closest("[data-open]");   // "Open …" flies into the dot first, then the page opens
  if (o && !STILL) { e.preventDefault(); graph.open(o.dataset.open); }
});

// ---------------------------------------------------------------- list pages: drive, editor, not backed up, drives, team
const ICON = {
  drive: '<span class="hub drive big"></span>', unbacked: '<span class="hub red big"></span>',
  drives: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="17" cy="12" r="1.3"/><path d="M6.5 12h6"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>'
};
function jobRow(r, hide) {
  const un = unbacked(r);
  return `<div class="row" data-job="${esc(r.id)}"><i class="dot ${un ? "red" : "green"}" title="${un ? "Not backed up" : "Backed up"}"></i>
    <a class="r-name" href="#/job/${encodeURIComponent(r.id)}">${esc(r.name)}<small>${esc(sectionOf(r))}</small></a>
    <span class="r-links">${hide !== "drive" ? drivesOf(r).map(d => `<a href="#/drive/${encodeURIComponent(d)}">${esc(dName(d))}</a>`).join("") : ""}${hide !== "editor" && r.editor ? `<a href="#/editor/${encodeURIComponent(r.editor)}">${esc(r.editor)}</a>` : ""}</span>
    <span class="r-date">${esc(fmtShort(r.date))}</span></div>`;
}
function hubRow(kind, o) {
  return `<a class="row hubrow" href="#/${kind}/${encodeURIComponent(o.name)}"><span class="hub ${kind === "drive" ? "drive" : "ed"}">${kind === "editor" ? esc(initials(o.name)) : ""}</span>
    <span class="r-name">${esc(kind === "drive" ? dName(o.name) : o.name)}<small>${o.n} ${o.n === 1 ? "job" : "jobs"}</small></span><span class="r-links">${o.un ? `<em class="red">${o.un} not backed up</em>` : `<em>All backed up</em>`}</span></a>`;
}
function setBar(n, un) {
  const b = $("listBar"); b.hidden = !n; if (!n) return;
  const [ok, no] = b.children; ok.style.flexGrow = n - un; no.style.flexGrow = un;
}
// A drive's page is its label: what's on it, from when to when, who edited, what still needs backing up, and a list to copy.
// A person's page is the same for their jobs. Jobs show once (Video + Photo together), newest first, grouped by month or year.
let listUn = false;
function spanOf(rs) {
  const ds = rs.map(r => String(r.date || "").slice(0, 10)).filter(d => parseYmd(d)).sort();
  if (!ds.length) return "";
  const a = parseYmd(ds[0]), z = parseYmd(ds[ds.length - 1]);
  return ds[0].slice(0, 7) === ds[ds.length - 1].slice(0, 7) ? `${MON[a.getMonth()]} ${a.getFullYear()}` : `${MON[a.getMonth()]}${a.getFullYear() !== z.getFullYear() ? " " + a.getFullYear() : ""} – ${MON[z.getMonth()]} ${z.getFullYear()}`;
}
function monthOf(r) { const d = parseYmd(String(r.date || "").slice(0, 10)); return d ? `${MON[d.getMonth()]} ${d.getFullYear()}` : "No date"; }
function listText(title, js) {   // plain text for the drive's label or a message
  return [title, ...js.map(j => { const r = j.main; return [fmtShort(r.date), splitJob(r).title, ["video", "photo"].filter(k => j[k]).map(k => (k === "video" ? "Video" : "Photo") + (selfUnbacked(j[k]) ? " (not backed up)" : "")).join(" + "), r.editor].filter(Boolean).join(" — "); })].join("\n");
}
function drawList() {
  const k = route.key; let title = "", sub = "", ico = "", html = "", n = 0, un = 0, tools = "";
  if (route.name === "drive" || route.name === "editor") {
    const drive = route.name === "drive";
    const rs = (data.rows || []).filter(r => drive ? drivesOf(r).includes(k) : r.editor === k).sort(byDate);
    const all = jobsOf(rs), js = listUn ? all.filter(j => j.un) : all;
    n = all.length; un = all.filter(j => j.un).length;
    title = drive ? dName(k) : k; ico = drive ? ICON.drive : `<span class="hub ed big">${esc(initials(k))}</span>`;
    const eds = drive ? [...new Set(rs.map(r => r.editor).filter(Boolean))] : [], drvs = drive ? [] : [...new Set(rs.flatMap(drivesOf))];
    sub = n ? metaRow(`${n} ${n === 1 ? "job" : "jobs"}`, un ? `<b class="red">${un} not backed up</b>` : `<span class="green">all backed up</span>`, spanOf(rs)) : "No jobs yet";
    const who = drive ? (eds.length ? `<span class="muted small">Edited by</span>${eds.map(e => `<a class="fchip" href="#/editor/${encodeURIComponent(e)}">${esc(e)}</a>`).join("")}` : "")
      : (drvs.length ? `<span class="muted small">On</span>${drvs.slice(0, 8).map(d => `<a class="fchip" href="#/drive/${encodeURIComponent(d)}">${esc(dName(d))}</a>`).join("")}` : "");
    tools = `<div class="list-tools">${who}<span class="spacer"></span>${un ? `<button type="button" class="fchip${listUn ? " on" : ""}" id="listUn" aria-pressed="${listUn}"><i class="dot red"></i>Not backed up</button>` : ""}<button type="button" class="fchip" id="listCopy" data-title="${esc(title)}"><svg class="bi" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>Copy list</button></div>`;
    // a drive: by month (one drive is about one year); a person: by year
    const keyOf = drive ? monthOf : (j => String(j.year || "No year"));
    const groups = []; js.forEach(j => { const g = keyOf(j.main), last = groups[groups.length - 1]; if (last && last[0] === g) last[1].push(j); else groups.push([g, [j]]); });
    const num = numbers();
    html = groups.map(([g, l]) => `<section class="bk-group"><h3 class="bk-gh">${esc(g)}<span>${l.length} ${l.length === 1 ? "job" : "jobs"}</span></h3><div class="bk-rows">${l.map((j, i) => jobCard(j, i, { num, hide: route.name })).join("")}</div></section>`).join("")
      || `<p class="muted">${listUn ? "Everything here is backed up." : "Nothing here yet."}</p>`;
    drawList.copy = () => listText(title + (spanOf(rs) ? " (" + spanOf(rs) + ")" : ""), all);
  } else if (route.name === "unbacked") {
    const js = jobsOf(rowsOf(gYear).sort(byDate)).filter(j => j.un);
    title = "Not backed up"; ico = ICON.unbacked;
    sub = js.length ? `${js.length} in ${gYear}. A job turns green once its Video and Photo are both backed up.` : `Everything in ${gYear} is backed up.`;
    const num = numbers();
    html = js.length ? `<div class="bk-rows">${js.map((j, i) => jobCard(j, i, { num })).join("")}</div>` : "";
  } else if (route.name === "drives") {
    // every year, newest first: a jump strip on top, then each year's drives as cards
    const ys = bkYears().filter(y => rowsOf(y).length); title = "Drives"; ico = ICON.drives;
    let total = 0;
    html = ys.map(y => {
      const ds = drivesIn(y); total += ds.length;
      const none = jobsOf(rowsOf(y).filter(r => !drivesOf(r).length)), nu = none.filter(j => j.un).length, un = jobsOf(rowsOf(y)).filter(j => j.un).length;
      return `<section class="bk-group dv-year" id="dy-${y}"><h3 class="bk-gh"><i class="yr">${y.slice(0, 2)}<em>${y.slice(2)}</em></i><span>${ds.length} ${ds.length === 1 ? "drive" : "drives"}</span>${un ? `<span><b class="red">${un} not backed up</b></span>` : ""}</h3>
        <div class="hub-list">${ds.map((d, i) => driveCard(d, y, i)).join("")}${none.length ? `<a class="row hubrow" href="#/backup"><span class="hub drive none"></span><span class="r-name">No drive<small>${none.length} ${none.length === 1 ? "job" : "jobs"} without a drive yet</small></span><span class="r-links">${nu ? `<em class="red">${nu} not backed up</em>` : `<em>All backed up</em>`}</span></a>` : ""}</div></section>`;
    }).join("");
    sub = `${total} drives, ${ys[ys.length - 1] || ""}–${ys[0] || ""}. Open one to see its jobs.`;
    tools = ys.length > 1 ? `<div class="list-tools dv-years">${ys.map(y => `<button type="button" class="fchip" data-dy="${y}">${y}${jobsOf(rowsOf(y)).some(j => j.un) ? '<i class="dot red"></i>' : ""}</button>`).join("")}</div>` : "";
  } else {
    const es = editorsIn(gYear); title = "Team"; ico = ICON.team; sub = `${team.length} people. Jobs counted for ${gYear}.`;
    html = es.map(e => hubRow("editor", e)).join("");
  }
  $("listTitle").textContent = title; $("listSub").innerHTML = sub; $("listIco").innerHTML = ico;
  setBar(n, un);
  setHTML($("listTools"), tools);
  setHTML($("listRows"), html || `<p class="muted">Nothing here yet.</p>`);
}
// a drive in the Drives list: its jobs, how far it's backed up, the months it covers, who edited
function driveCard(d, y, i) {
  const rs = rowsOf(y).filter(r => drivesOf(r).includes(d.name)), js = jobsOf(rs), u = js.filter(j => j.un).length, eds = [...new Set(rs.map(r => r.editor).filter(Boolean))];
  const pct = js.length ? Math.round(100 * (js.length - u) / js.length) : 100;
  return `<a class="drive-card${u ? " has-un" : ""}" style="--i:${i || 0}" href="#/drive/${encodeURIComponent(d.name)}"><span class="hub drive"></span>
    <span class="dc-main"><b>${esc(dName(d.name))}</b><small>${metaRow(`${js.length} ${js.length === 1 ? "job" : "jobs"}`, esc(spanOf(rs) || ""), esc(eds.join(", ")))}</small>
    <span class="dc-bar" aria-hidden="true"><i style="width:${pct}%"></i></span></span>
    <span class="dc-st">${u ? `<em class="red">${u}</em><small>not backed up</small>` : `<em class="green">✓</em><small>all backed up</small>`}</span></a>`;
}
$("v-list").addEventListener("click", e => {
  if (e.target.closest("#listUn")) { listUn = !listUn; buzz(); drawList(); return; }
  const dy = e.target.closest("[data-dy]"); if (dy) { const sec = $("dy-" + dy.dataset.dy); if (sec) sec.scrollIntoView({ behavior: STILL ? "auto" : "smooth", block: "start" }); return; }
  const c = e.target.closest("#listCopy");
  if (c && drawList.copy) { const t = drawList.copy(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("List copied. Paste it on the drive's label or in a message."), () => toast("Couldn't copy here.")); buzz(); }
});
document.addEventListener("click", e => {   // a whole job row opens the job; its own links still go where they point
  if (e.target.closest(".bk-det")) return;
  const k = e.target.closest(".bk-row[data-job]");
  if (k) { if (!e.target.closest("a, button:not(.bk-more)")) bkToggle(k); return; }
  const r = e.target.closest(".row[data-job]"); if (!r || e.target.closest("a, button")) return;
  location.hash = "#/job/" + encodeURIComponent(r.dataset.job);
});

// ---------------------------------------------------------------- job page: everything about one job, and what it links to
function drawJob() {
  const r = (data.rows || []).find(x => x.id === route.key), v = $("v-job");
  if (!r) { v.innerHTML = `<div class="page-head"><div><h1>Job not found</h1><p class="muted">It may have been deleted. <a href="#/home">Back to Home</a></p></div></div>`; return; }
  const un = unbacked(r), tw = twinOf(r), drives = drivesOf(r);
  const fact = (k, val) => val ? `<dt>${k}</dt><dd>${val}</dd>` : "";
  const sameDrive = (data.rows || []).filter(x => x.id !== r.id && (!tw || x.id !== tw.id) && drivesOf(x).some(d => drives.includes(d))).sort(byDate).slice(0, 16);
  const sameEd = r.editor ? (data.rows || []).filter(x => x.id !== r.id && (!tw || x.id !== tw.id) && x.editor === r.editor && String(x.year) === String(r.year)).sort(byDate).slice(0, 8) : [];
  const safeUrl = u => /^https?:\/\//i.test(String(u || "")) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>` : esc(u);
  v.innerHTML = `<div class="page-head"><span class="page-ico"><span class="hub ${un ? "red" : "green"} big"></span></span><div><h1>${esc(r.name)}</h1>
      <p class="muted">${esc(sectionOf(r))}, ${esc(r.year)}. <span class="${un ? "red" : "green"}">${un ? "Not backed up" : "Backed up"}</span></p></div></div>
    <dl class="facts">
      ${fact("Date", esc(fmtShort(r.date)))}
      ${fact("Drive", drives.map(d => `<a href="#/drive/${encodeURIComponent(d)}">${esc(dName(d))}</a>`).join(", ") || "—")}
      ${fact("Editor", r.editor ? `<a href="#/editor/${encodeURIComponent(r.editor)}">${esc(r.editor)}</a>` : "—")}
      ${fact("Backed up", selfUnbacked(r) ? "Not yet" : esc([r.backedUp && r.backedUp !== true ? r.backedUp : "", r.backupDate ? fmtShort(r.backupDate) : ""].filter(Boolean).join(", ") || "Yes"))}
      ${tw ? fact(kindLabel(tw), `<a href="#/job/${encodeURIComponent(tw.id)}">${esc(tw.name)} · ${kindLabel(tw)}</a> <span class="${selfUnbacked(tw) ? "red" : "green"}">${selfUnbacked(tw) ? "not backed up" : "backed up"}</span>`) : ""}
      ${fact("Notes", r.notes ? esc(r.notes) : "")}
      ${fact("Link", r.link ? safeUrl(r.link) : "")}
    </dl>
    <div class="actions" style="justify-content:flex-start"><button type="button" class="btn" data-job-edit="${esc(r.id)}">${un ? "Edit or mark backed up" : "Edit job"}</button></div>
    ${sameDrive.length ? `<h3 class="grp">Also on ${esc(drives.map(dName).join(", "))}</h3><div class="bk-rows">${jobsOf(sameDrive).slice(0, 6).map((j, i) => jobCard(j, i, { hide: "drive" })).join("")}</div>` : ""}
    ${sameEd.length ? `<h3 class="grp">Also edited by ${esc(r.editor)} in ${esc(r.year)}</h3><div class="bk-rows">${jobsOf(sameEd).slice(0, 6).map((j, i) => jobCard(j, i, { hide: "editor" })).join("")}</div>` : ""}`;
}

// ---------------------------------------------------------------- calendar
// Month on the left, the chosen day on the right (phone: one above the other). Each shoot links to its crew, its job
// (once there is one) and that job's drive. Drag a shoot to another day to move it; Undo puts it back.
let calY = new Date().getFullYear(), calM = new Date().getMonth(), selDay = ymd(new Date());
const TYPE = { video: "Video", photo: "Photo", both: "Video + Photo" };
function calGo(dir) { calM += dir; if (calM < 0) { calM = 11; calY--; } if (calM > 11) { calM = 0; calY++; } buzz(); drawCal(dir); }
$("calPrev").addEventListener("click", () => calGo(-1));
$("calNext").addEventListener("click", () => calGo(1));
$("calToday").addEventListener("click", () => { const t = new Date(); const dir = Math.sign((t.getFullYear() - calY) * 12 + t.getMonth() - calM); calY = t.getFullYear(); calM = t.getMonth(); selDay = ymd(t); buzz(); drawCal(dir); });
function byDay() { const m = {}; shoots.forEach(s => datesOf(s).forEach(d => (m[d] = m[d] || []).push(s))); return m; }
// the job a shoot became: its jobId, or a job with the same name on one of its days (the Video row first)
function jobOfShoot(s) {
  const rows = data.rows || [];
  if (s.jobId) { const r = rows.find(x => x.id === s.jobId); if (r) return r; }
  const n = normName(s.name), ds = datesOf(s); if (!n) return null;
  const hit = rows.filter(r => normName(r.name) === n && ds.includes(String(r.date || "").slice(0, 10)));
  return hit.find(r => !isPhotoSec(sectionOf(r))) || hit[0] || null;
}
const isPast = s => { const ds = datesOf(s).sort(); return ds.length && ds[ds.length - 1] < ymd(new Date()); };
function drawCal(dir) {
  $("calTitle").textContent = `${MON[calM]} ${calY}`;
  const map = byDay(), today = ymd(new Date()), first = new Date(calY, calM, 1), start = new Date(first);
  start.setDate(1 - (first.getDay() + 6) % 7);
  let html = WD.map(w => `<div class="wd">${w}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i === 35 && d.getMonth() !== calM) break;
    const k = ymd(d), list = (map[k] || []).slice().sort((a, b) => datesOf(a)[0] < datesOf(b)[0] ? -1 : 1);
    const cls = ["c", d.getMonth() === calM ? "in" : "", k === today ? "today" : "", k === selDay ? "sel" : "", k < today ? "past" : ""].join(" ");
    const evs = list.slice(0, 3).map(s => { const ds = datesOf(s).sort(), at = ds.indexOf(k);
      const span = ds.length > 1 ? (at === 0 ? " first" : at === ds.length - 1 ? " last" : " mid") : "";
      return `<span class="ev t-${esc(s.type || "both")}${span}${jobOfShoot(s) ? " done" : ""}" data-sid="${esc(s.id)}" title="${esc(s.name)}">${esc(s.name)}</span>`; }).join("");
    html += `<div class="c ${cls}" role="button" tabindex="0" data-d="${k}" aria-label="${esc(fmtDay(k))}${list.length ? ", " + list.length + (list.length === 1 ? " shoot" : " shoots") : ""}"><span class="n">${d.getDate()}</span><span class="evs">${evs}${list.length > 3 ? `<span class="more">+${list.length - 3}</span>` : ""}</span></div>`;
  }
  const el = $("cal"); setHTML(el, html);
  if (dir && !STILL) el.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
  drawDay();
}
function pickDay(k) {
  if (k === selDay) return;
  selDay = k; buzz();
  document.querySelectorAll("#cal .c.sel").forEach(c => c.classList.remove("sel"));
  const c = document.querySelector(`#cal .c[data-d="${k}"]`); if (c) c.classList.add("sel"); else { const d = parseYmd(k); calY = d.getFullYear(); calM = d.getMonth(); drawCal(); return; }
  drawDay(true);
  if (window.innerWidth < 900) $("day").scrollIntoView({ behavior: STILL ? "auto" : "smooth", block: "nearest" });
}
$("cal").addEventListener("click", e => { if (calDrag.moved) return; const b = e.target.closest("[data-d]"); if (b) pickDay(b.dataset.d); });
$("cal").addEventListener("keydown", e => { const b = e.target.closest("[data-d]"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pickDay(b.dataset.d); } });
function dayRange(ds) {
  if (ds.length < 2) return "";
  const a = parseYmd(ds[0]), b = parseYmd(ds[ds.length - 1]); if (!a || !b) return "";
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}` : `${fmtShort(ds[0])} – ${fmtShort(ds[ds.length - 1])}`;
}
function drawDay(anim) {
  const list = byDay()[selDay] || [], d = parseYmd(selDay), today = ymd(new Date());
  const ed = n => `<a href="#/editor/${encodeURIComponent(n)}">${esc(n)}</a>`;
  const card = s => {
    const ds = datesOf(s).sort(), job = jobOfShoot(s), crew = crewOf(s);
    let jobLine;
    if (job) jobLine = `<p class="sh-job"><i class="dot ${unbacked(job) ? "red" : "green"}"></i><a href="#/job/${encodeURIComponent(job.id)}">Job</a> on ${drivesOf(job).map(x => `<a href="#/drive/${encodeURIComponent(x)}">${esc(x)}</a>`).join(", ") || "no drive yet"}, ${unbacked(job) ? '<span class="red">not backed up</span>' : "backed up"}.</p>`;
    else if (isPast(s)) jobLine = `<button type="button" class="btn sm" data-job="${esc(s.id)}">Make it a job</button>`;
    else jobLine = `<p class="muted small">Becomes a job after the shoot.</p>`;
    return `<article class="sh t-${esc(s.type || "both")}" data-id="${esc(s.id)}">
      <div class="sh-top"><b>${esc(s.name)}</b><button type="button" class="ibtn sm" data-edit="${esc(s.id)}" aria-label="Edit ${esc(s.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg></button></div>
      <p class="sh-meta">${esc(TYPE[s.type] || "")}${s.location ? `, ${esc(s.location)}` : ""}${ds.length > 1 ? `, ${esc(dayRange(ds))}` : ""}</p>
      <p class="sh-crew">${crew.length ? crew.map(n => `<span class="hub ed">${esc(initials(n))}</span>${ed(n)}`).join(" ") : '<span class="muted">No crew yet</span>'}</p>
      ${s.notes ? `<p class="sh-notes">${esc(s.notes)}</p>` : ""}
      ${jobLine}</article>`;
  };
  const rel = selDay === today ? "Today" : d && Math.round((d - parseYmd(today)) / 864e5) === 1 ? "Tomorrow" : d && Math.round((d - parseYmd(today)) / 864e5) === -1 ? "Yesterday" : "";
  $("day").innerHTML = `<div class="day-h"><span class="day-wd">${d ? WD[(d.getDay() + 6) % 7] : ""}${rel ? `, ${rel}` : ""}</span><span class="day-n">${d ? d.getDate() + " " + MON[d.getMonth()] : esc(selDay)}</span></div>`
    + (list.length ? `<div class="sh-list">${list.map(card).join("")}</div>` : `<p class="muted day-empty">No shoot on this day.</p>`)
    + `<button type="button" class="btn ghost" id="dayAdd">+ Shoot on this day</button>`;
  if (anim && !STILL) $("day").animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
}
$("day").addEventListener("click", e => {
  const ed = e.target.closest("[data-edit]"); if (ed) return openShoot(shoots.find(x => x.id === ed.dataset.edit));
  const mk = e.target.closest("[data-job]"); if (mk) return makeJob(shoots.find(x => x.id === mk.dataset.job));
  if (e.target.id === "dayAdd") return openShoot({ dates: selDay });
  const card = e.target.closest(".sh"); if (card && !e.target.closest("a, button")) openShoot(shoots.find(x => x.id === card.dataset.id));
});
$("newShoot").addEventListener("click", () => openShoot({ dates: selDay }));

// drag a shoot to another day: mouse right away, touch after a short hold
const calDrag = { s: null, moved: false };
(() => {
  const cal = $("cal"); let st = null, ghost = null, hold = 0, over = null;
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest("#cal .c[data-d]") : null; };
  const begin = e => {
    const s = shoots.find(x => x.id === st.sid); if (!s) { st = null; return; }
    calDrag.s = s; calDrag.moved = true; buzz();
    ghost = document.createElement("div"); ghost.className = "ev-ghost t-" + (s.type || "both"); ghost.textContent = s.name; document.body.appendChild(ghost);
    document.body.classList.add("cal-dragging"); try { cal.setPointerCapture(e.pointerId); } catch (x) {}
    move(e);
  };
  const move = e => { if (!ghost) return; ghost.style.transform = `translate(${e.clientX + 10}px, ${e.clientY - 14}px)`;
    const c = cellAt(e.clientX, e.clientY); if (c !== over) { over && over.classList.remove("drop"); over = c; over && over.classList.add("drop"); } };
  cal.addEventListener("pointerdown", e => {
    const ev = e.target.closest(".ev[data-sid]"); if (!ev || e.button) return;
    const c = ev.closest("[data-d]"); st = { sid: ev.dataset.sid, from: c.dataset.d, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== "mouse" };
    calDrag.moved = false;
    if (st.touch) { clearTimeout(hold); hold = setTimeout(() => { if (st) begin(e); }, 320); }
  });
  cal.addEventListener("pointermove", e => {
    if (!st || e.pointerId !== st.id) return;
    if (e.pointerType === "mouse" && !(e.buttons & 1)) { cancel(); return; }   // the button came up outside the calendar
    if (ghost) { e.preventDefault(); move(e); return; }
    if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6) { if (st.touch) { clearTimeout(hold); st = null; } else begin(e); }
  });
  cal.addEventListener("touchmove", e => { if (ghost) e.preventDefault(); }, { passive: false });
  const cancel = () => { clearTimeout(hold); st = null; calDrag.s = null; calDrag.moved = false; if (ghost) { ghost.remove(); ghost = null; } document.body.classList.remove("cal-dragging"); over && over.classList.remove("drop"); over = null; };
  addEventListener("pointerup", e => { if (st && e.pointerId === st.id && !cal.contains(e.target)) cancel(); });
  const end = e => {
    clearTimeout(hold); if (!st || e.pointerId !== st.id) return;
    const was = st; st = null; if (!ghost) return;
    ghost.remove(); ghost = null; document.body.classList.remove("cal-dragging"); over && over.classList.remove("drop");
    const to = over && e.type === "pointerup" ? over.dataset.d : null; over = null;
    const s = calDrag.s; calDrag.s = null; setTimeout(() => { calDrag.moved = false; }, 0);
    if (to && to !== was.from) moveShoot(s, Math.round((parseYmd(to) - parseYmd(was.from)) / 864e5));
  };
  cal.addEventListener("pointerup", end); cal.addEventListener("pointercancel", end);
})();
async function moveShoot(s, days, undo) {
  const old = { ...s }, shift = k => { const d = parseYmd(k); d.setDate(d.getDate() + days); return ymd(d); };
  const next = { ...s, dates: datesOf(s).map(shift).join(","), updatedBy: session.name, updatedAt: new Date().toISOString() };
  const i = shoots.findIndex(x => x.id === s.id); if (i < 0) { toast("That shoot is gone"); return; }
  shoots[i] = next;
  selDay = datesOf(next)[0]; drawAll();
  try {
    await M.api("saveShoot", ["", next]); buzz();
    if (undo) toast("Moved back"); else toast(`Moved to ${fmtDay(datesOf(next)[0])}`, "Undo", () => { const now = shoots.find(x => x.id === next.id); if (now) moveShoot(now, -days, true); });
    act($("mSvg"), "land", 450);
  } catch (err) { shoots[i] = old; selDay = datesOf(old)[0]; drawAll(); toast(err.message); mood("huh"); }
}
// a shoot that is over becomes a job in Backup: the add form opens with its name, days and Video / Photo filled in
function makeJob(s) {
  if (!s) return;
  newJob({ name: s.name, dates: datesOf(s).sort(), type: s.type || "both" });
}

// ---------------------------------------------------------------- Backup (read only for now)
// The same jobs, counts and rules as the Backup page (Video and Photo are two rows; a job is green only when both are
// backed up; the red number counts rows), drawn in the Workspace's own look. Each job shows once, with its Video and
// Photo status side by side. Writing still happens in Classic Backup, one tap away.
const SECTIONS = ["Event", "Event · Photo", "Corporate", "Corporate · Photo", "Commercial", "Wedding"];
const ROMAN = n => { const t = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]; let o = ""; for (const [v, c] of t) while (n >= v) { o += c; n -= v; } return o; };
let bk = { year: null, cat: null, drive: null, un: false, scope: "all", all: false };
try { bk.desc = localStorage.getItem("bkDesc") === "1"; } catch (e) {}
// "16 Oct", "3–5 Oct", "30 Sep – 2 Oct"; the year only when it isn't this year (Backup's rule)
function fmtDates(list) {
  const cur = new Date().getFullYear(), P = s => { const d = parseYmd(String(s).slice(0, 10)); return d && { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), t: Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) }; };
  const ds = [...new Set(list.map(s => String(s).slice(0, 10)).filter(s => parseYmd(s)))].sort().map(P);
  if (!ds.length) return "";
  const runs = [];
  for (const p of ds) { const l = runs[runs.length - 1]; if (l && p.t - l.b.t === 864e5) l.b = p; else runs.push({ a: p, b: p }); }
  const gs = [];
  for (const { a, b } of runs) {
    if (a.y === b.y && a.m === b.m) { const t = a.d === b.d ? `${a.d}` : `${a.d}–${b.d}`, g = gs[gs.length - 1]; if (g && !g.span && g.y === a.y && g.m === a.m) g.days.push(t); else gs.push({ y: a.y, m: a.m, days: [t] }); }
    else gs.push({ span: true, a, b, y: b.y });
  }
  return gs.map((g, i) => { const showY = g.y !== cur && !(gs[i + 1] && gs[i + 1].y === g.y);
    return g.span ? `${g.a.d} ${MON[g.a.m]}${g.a.y !== g.b.y ? " " + g.a.y : ""} – ${g.b.d} ${MON[g.b.m]}${showY ? " " + g.y : ""}` : `${g.days.join(", ")} ${MON[g.m]}${showY ? " " + g.y : ""}`; }).join(", ");
}
// a job's name may carry its days: "CNY Performance / 1. 12/1/2025 / 2. Ipoh" (Backup's format)
const MONS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function dmyToIso(s) {
  s = String(s).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(s);
  const mi = m ? MONS.indexOf(m[2].slice(0, 3).toLowerCase()) : -1;
  return mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}
const isoToDmy = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${+m[3]}/${+m[2]}/${m[1]}` : (s || ""); };
function splitJob(r) {
  if (Array.isArray(r.parts)) return { title: r.name, parts: r.parts.filter(p => p && typeof p === "object") };
  const segs = String(r.name || "").split(" / ");
  if (segs.length < 2) return { title: r.name, parts: [] };
  let items = segs.slice(1).map(x => x.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
  if (items.length === 1 && items[0].split(/\s*,\s*/).every(dmyToIso)) items = items[0].split(/\s*,\s*/);
  return { title: segs[0], parts: items.map(x => dmyToIso(x) ? { date: dmyToIso(x), label: "" } : { date: "", label: x }) };
}
function whenOf(r) {
  const parts = splitJob(r).parts, isos = parts.map(p => p.date).filter(Boolean);
  const labels = [...new Set(parts.map(p => p.label).filter(Boolean))];
  return { when: isos.length ? fmtDates(isos) : (r.date ? fmtDates([r.date]) || String(r.date) : ""), parts, list: parts.length > 1 && labels.length > 1, place: parts.length > 1 && labels.length > 1 ? "" : labels[0] || "" };
}
// one entry per job: its Video row and its Photo row
// (only a Video row and a Photo row with the same name pair up; names with no a–z / 0–9, and a second row of the same
// section, stay jobs of their own)
function jobsOf(list) {
  const m = new Map(), out = [];
  list.forEach(r => {
    const slot = isPhotoSec(sectionOf(r)) ? "photo" : "video", n = normName(r.name);
    const k = n ? r.year + "|" + baseOf(sectionOf(r)) + "|" + n : "id|" + r.id;
    const es = m.get(k) || m.set(k, []).get(k);
    let e = es.find(x => !x[slot]); if (!e) { e = { rows: [] }; es.push(e); out.push(e); }
    e[slot] = r; e.rows.push(r);
  });
  return out.map(e => ({ ...e, main: e.video || e.photo, un: e.rows.some(unbacked) }));
}
// the Sheet's order, as Backup sorts it: numbered rows by section and position, the rest by date, then when they were added
const sortKey = r => r.date || (r.year ? r.year + "-00" : "");
function byExcelNo(a, b) {
  const ax = a.no != null, bx = b.no != null;
  if (ax !== bx) return ax ? -1 : 1;
  if (ax) return (a.sec || 0) - (b.sec || 0) || (a.ord ?? a.no) - (b.ord ?? b.no);
  return String(sortKey(a)).localeCompare(String(sortKey(b))) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}
let sortedFor = null, sortedRows = [];
function bkRows() { if (sortedFor !== data.rows) { sortedFor = data.rows; sortedRows = (data.rows || []).slice().sort(byExcelNo); } return sortedRows; }
function numbers() {   // No. within year + category, in the Sheet's order (as Backup numbers them)
  const n = new Map(), seen = {};
  bkRows().forEach(r => { const k = r.year + "|" + sectionOf(r); seen[k] = (seen[k] || 0) + 1; n.set(r.id, seen[k]); });
  return n;
}
const bkYears = () => [...new Set([String(new Date().getFullYear()), ...(data.rows || []).map(r => String(r.year || ""))].filter(Boolean))].sort().reverse();
// the Backup page's own tabs: one per section (Event, Event · Photo, Corporate …), each with its own numbers
function secsIn(list) {
  const pos = {};
  list.forEach(r => { const s = sectionOf(r), sec = r.sec != null && r.sec !== "" && isFinite(+r.sec) ? +r.sec : null, k = sec ?? 99 + (SECTIONS.indexOf(s) + 1 || 50); if (!(s in pos) || k < pos[s]) pos[s] = k; });
  return Object.keys(pos).sort((a, b) => pos[a] - pos[b] || a.localeCompare(b));
}
// one card per row of a section; its badges still show both halves (Video and its Photo twin)
const secJobs = rs => rs.map(r => { const j = jobsOf([r, twinOf(r)].filter(Boolean))[0]; return { ...j, main: r }; });
function catsIn(list) {
  const pos = {};
  // the order Backup gives its sections (r.sec, or 99 + its place in SECTIONS), each category placed where its first section is
  list.forEach(r => { const b = baseOf(sectionOf(r)), sec = r.sec != null && r.sec !== "" && isFinite(+r.sec) ? +r.sec : null, k = sec ?? 99 + SECTIONS.indexOf(sectionOf(r)); if (!(b in pos) || k < pos[b]) pos[b] = k; });
  return Object.keys(pos).sort((a, b) => pos[a] - pos[b]);
}
const bkTerms = () => $("bkQ").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
const bkMatch = (r, ts) => ts.every(t => [r.date, r.year, r.name, splitJob(r).parts.map(p => p.date + " " + [p.date ? isoToDmy(p.date) : "", p.label].filter(Boolean).join(" · ")).join(" "), r.drive, r.backupDate, r.editor, r.notes, sectionOf(r)].join(" ").toLowerCase().includes(t));
function hl(text, ts) {
  let h = esc(text); if (!ts.length) return h;
  const re = new RegExp("(" + ts.map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return h.split(/(&[#\w]+;)/).map(p => p.startsWith("&") ? p : p.replace(re, "<mark>$1</mark>")).join("");
}
// one job (its Video and Photo rows) as Backup draws it; used by Backup, a drive, a person and a job's neighbours
function jobCard(j, i, o) {
  o = o || {}; const ts = o.ts || [], num = o.num || numbers();
  const r = j.main, w = whenOf(r), t = splitJob(r).title, no = num.get(r.id);
    const st = k => j[k] ? `<span class="md ${selfUnbacked(j[k]) ? "no" : "ok"}" title="${k === "video" ? "Video" : "Photo"}: ${!j[k].backupDate && !j[k].backedUp ? "not backed up" : "backed up" + (j[k].backupDate ? " " + esc(fmtDates([j[k].backupDate])) : "")}">${k === "video" ? "Video" : "Photo"}</span>` : "";
    const drives = [...new Set(j.rows.flatMap(drivesOf))];
    const meta = [w.when && `<span class="bk-when-m">${hl(w.when, ts)}</span>`, w.place && hl(w.place, ts), o.hide !== "editor" && r.editor && `<a href="#/editor/${encodeURIComponent(r.editor)}">${hl(r.editor, ts)}</a>`, r.notes && `<span class="bk-notes">${hl(r.notes, ts)}</span>`].filter(Boolean).map(x => `<span class="mr">${x}</span>`).join("");
    const open = bkOpen.has(r.id);
    return `<div class="bk-row${j.un ? " un" : ""}${open ? " open" : ""}" data-job="${esc(r.id)}" tabindex="0" aria-expanded="${open}" style="--i:${Math.min(i, 14)}">
      <span class="bk-no">${no ? String(no).padStart(2, "0") : ""}</span>
      <span class="bk-main"><b>${hl(t, ts)}</b>${meta ? `<small>${meta}</small>` : ""}${w.list ? `<ol class="bk-parts">${w.parts.map((p, k) => `<li><span>${ROMAN(k + 1)}.</span>${hl([p.date ? fmtDates([p.date]) : "", p.label].filter(Boolean).join(" · "), ts)}</li>`).join("")}</ol>` : ""}</span>
      <span class="bk-when">${hl(w.when, ts)}</span>
      <span class="bk-media">${st("video")}${st("photo")}</span>
      <span class="bk-drv">${jobLinks(j).map(l => linkA(l, "bk-link")).join("")}${j.un ? `<button type="button" class="btn sm bk-fix" data-job-edit="${esc(r.id)}">Back up</button>` : ""}${o.hide === "drive" ? "" : drives.map(d => `<a href="#/drive/${encodeURIComponent(d)}">${hl(dName(d), ts)}</a>`).join("") || '<span class="muted small">No drive</span>'}</span>
      <button type="button" class="bk-more" aria-label="Details"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      ${open ? `<div class="bk-det"><div class="bk-det-in">${bkDetail(r.id)}</div></div>` : ""}
    </div>`;
  }
// tap a job (or its arrow) and it opens in place, as on the Backup page: days, what's backed up where, who, notes, links, history
const bkOpen = new Set();
function relAt(at) {
  const d = new Date(at); if (isNaN(d)) return String(at || "");
  const m = Math.round((Date.now() - d) / 6e4);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : m < 10080 ? `${Math.round(m / 1440)} ${Math.round(m / 1440) === 1 ? "day" : "days"} ago` : fmtShort(String(at).slice(0, 10)) + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
}
const LINK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
// a job's links: with several days, link 1 goes with day i., link 2 with ii. …; with one day, the link carries the job's name
function jobLinks(j) {
  const r = j.main, w = whenOf(r), t = splitJob(r).title, many = w.parts.length > 1;
  const us = j.rows.flatMap(x => String(x.link || "").split(/\s*\n\s*/)).map(u => normLink(u) || "").filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);
  return us.map((u, k) => ({ u, tag: many && k < w.parts.length ? ROMAN(k + 1) + "." : us.length > 1 ? String(k + 1) : "", name: many && w.parts[k] ? [w.parts[k].date ? fmtDates([w.parts[k].date]) : "", w.parts[k].label].filter(Boolean).join(" · ") : t }));
}
const linkA = (l, cls) => `<a class="${cls}" href="${esc(l.u)}" target="_blank" rel="noopener" title="${esc(l.name)}: ${esc(l.u)}">${LINK_SVG}${l.tag ? `<span>${esc(l.tag)}</span>` : ""}</a>`;
// a job opened in place, as the Apps Script Backup does it: one quiet line under the name (where, who, what's backed up,
// what its twin is missing, notes, the last change), its days with their links, and Edit / Back up
function bkDetail(id) {
  const r = (data.rows || []).find(x => x.id === id); if (!r) return "";
  const j = jobsOf([r, twinOf(r)].filter(Boolean))[0], w = whenOf(r), links = jobLinks({ ...j, main: r }), many = w.parts.length > 1;
  const half = (k, x) => !x ? "" : selfUnbacked(x) ? `<span class="dx-no">${k} not backed up</span>` : `<span class="dx-ok">${k} backed up${x.backupDate ? " " + esc(fmtDates([x.backupDate])) : ""}</span>`;
  const notes = [...new Set(j.rows.map(x => x.notes).filter(Boolean))];
  const last = j.rows.flatMap(x => x.history || []).filter(h => h && h.at).sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1);
  const made = j.rows.map(x => x.createdAt).filter(Boolean).sort()[0];
  const line = metaRow(w.place && esc(w.place), r.editor && `<a href="#/editor/${encodeURIComponent(r.editor)}">${esc(r.editor)}</a>`, half("Video", j.video), half("Photo", j.photo),
    ...notes.map(n => `<span class="dx-note">${esc(n)}</span>`),
    last ? `<span class="dx-by"><b>${esc(last.by || "Someone")}</b> ${esc((ACT[last.action] || last.action || "").toLowerCase())} <time title="${esc(String(last.at).slice(0, 16).replace("T", " "))}">${esc(relAt(last.at))}</time></span>`
      : made ? `<span class="dx-by">Added ${esc(relAt(made))}</span>` : "");
  const days = many ? `<ol class="dx-days">${w.parts.map((p, k) => `<li><span class="dt-n">${ROMAN(k + 1)}.</span><span>${esc([p.date ? fmtDates([p.date]) : "", p.label].filter(Boolean).join("  ")) || "–"}</span>${links[k] ? linkA(links[k], "dt-link") : ""}</li>`).join("")}</ol>` : "";
  const rest = links.slice(many ? w.parts.length : 0);
  return `<div class="dx"><p class="dx-line">${line}<button type="button" class="dx-edit" data-job-edit="${esc(r.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 8.5l3 3"/></svg>Edit</button></p>${days}${rest.length ? `<div class="dx-acts">${rest.map(l => linkA(l, "dt-link")).join("")}</div>` : ""}</div>`;
}
function bkToggle(row) {
  const id = row.dataset.job, open = !row.classList.contains("open");
  open ? bkOpen.add(id) : bkOpen.delete(id);
  let d = row.querySelector(".bk-det");
  if (open && !d) { d = document.createElement("div"); d.className = "bk-det"; d.innerHTML = `<div class="bk-det-in">${bkDetail(id)}</div>`; row.appendChild(d); void d.offsetWidth; }
  clearTimeout(row._dt);
  row.classList.toggle("open", open); row.setAttribute("aria-expanded", open);
  if (!open && d) row._dt = setTimeout(() => { if (!row.classList.contains("open")) d.remove(); }, STILL ? 0 : 380);   // folds up, then goes
  fx(open ? "open" : "close");
}
// facts side by side, spaced, never strung together with dots
const metaRow = (...xs) => xs.filter(Boolean).map(x => `<span class="mr">${x}</span>`).join("");
// pop-ups are drawers: they push up from the bottom edge and slide back down; drag the top of one down to put it away
function sheetShow(sc) {
  sc._closing = false; (sc._anims || []).forEach(a => a.cancel()); sc._anims = null; sc.hidden = false;
  clearTimeout(sc._sit); sc._sit = setTimeout(() => { const b = MBTN; if (!sc.hidden && !b.hidden && typeof perch === "function") perch(b.getBoundingClientRect(), "hop"); }, 380);   // he hops onto the drawer once it is up
}
function sheetHide(sc) {
  if (sc.hidden || sc._closing) return;
  const sh = sc.querySelector(".sheet"); if (STILL || !sh) { sc.hidden = true; afterSheet(); return; }
  sc._closing = true;
  const cur = getComputedStyle(sh).transform, from = cur && cur !== "none" ? cur : "none";
  sc._anims = [sh.animate([{ transform: from }, { transform: "translateY(110%)" }], { duration: 280, easing: "cubic-bezier(.5,0,.75,.4)", fill: "forwards" }),
    sc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: "forwards" })];
  sc._anims[0].onfinish = () => { if (!sc._closing) return; sc._closing = false; sc._anims.forEach(a => a.cancel()); sc._anims = null; sc.hidden = true; afterSheet(); };
}
const afterSheet = () => { if (typeof perch === "function" && !document.querySelector(".scrim:not([hidden])")) perch(MBTN.getBoundingClientRect()); };
const SHEET_CLOSE = { jobScrim: () => closeJob(), chkScrim: () => closeChk(), shootScrim: () => closeShoot() };
document.querySelectorAll(".scrim > .sheet").forEach(sh => {
  // push it down and it goes; pull it up and it stretches like rubber and springs back. A finger drags it when the drawer
  // is scrolled to its top (down) or can't scroll further (up); otherwise the finger scrolls its content as usual.
  let y0 = null, dy = 0, t0 = 0, on = false;
  const pull = d => d >= 0 ? `translateY(${d}px)` : `translateY(${-Math.sqrt(-d) * 3.2}px) scaleY(${1 + Math.min(.06, Math.sqrt(-d) / 260)})`;
  const skip = t => t.closest("input, select, textarea, button, a, label, [contenteditable]");
  const start = (y, t) => { if (skip(t)) return; y0 = y; dy = 0; on = false; t0 = performance.now(); sh.style.transformOrigin = "50% 100%"; };
  const move = (y, e) => { if (y0 == null) return; const d = y - y0;
    if (!on) { const atTop = sh.scrollTop <= 0, atEnd = sh.scrollTop + sh.clientHeight >= sh.scrollHeight - 1;
      if ((d > 6 && atTop) || (d < -6 && atEnd)) { on = true; y0 = y; } else if (Math.abs(d) > 6) { y0 = null; return; } else return; }
    if (e.cancelable) e.preventDefault(); dy = y - y0; sh.style.transform = dy ? pull(dy) : ""; };
  const end = () => { if (y0 == null) return; y0 = null; if (!on) return; on = false; const sc = sh.parentElement, fast = dy > 30 && dy / Math.max(1, performance.now() - t0) > .6;
    if (dy > 90 || fast) { SHEET_CLOSE[sc.id] && SHEET_CLOSE[sc.id](); requestAnimationFrame(() => { sh.style.transform = ""; }); return; }
    if (dy) { const from = pull(dy); sh.style.transform = ""; sh.animate([{ transform: from }, { transform: "none" }], { duration: dy < 0 ? 520 : 420, easing: "cubic-bezier(.34,1.56,.64,1)" }); } };
  sh.addEventListener("touchstart", e => start(e.touches[0].clientY, e.target), { passive: true });
  sh.addEventListener("touchmove", e => move(e.touches[0].clientY, e), { passive: false });
  sh.addEventListener("touchend", end); sh.addEventListener("touchcancel", end);
  sh.addEventListener("pointerdown", e => { if (e.pointerType !== "touch" && !e.button) { start(e.clientY, e.target); if (y0 != null) sh.setPointerCapture(e.pointerId); } });
  sh.addEventListener("pointermove", e => { if (e.pointerType !== "touch") move(e.clientY, e); });
  sh.addEventListener("pointerup", e => { if (e.pointerType !== "touch") end(); }); sh.addEventListener("pointercancel", e => { if (e.pointerType !== "touch") end(); });
});
// a page drawn again with nothing changed keeps its rows as they are: no rebuild, no restyle of hundreds of rows
function setHTML(el, html) { if (el._html === html && el.isConnected) return false; el.innerHTML = html; el._html = html; return true; }
function drawBackup(first) {
  if (!session) return;
  const rows = bkRows(), ys = bkYears();
  if (!bk.year || !ys.includes(bk.year)) bk.year = ys[0];
  const inYear = rows.filter(r => String(r.year) === bk.year), unRows = inYear.filter(unbacked);
  if (!unRows.length) bk.un = false;
  // years: a red dot where something isn't backed up
  setHTML($("bkYears"), ys.map(y => `<button type="button" role="tab" data-y="${esc(y)}" aria-selected="${y === bk.year}">${esc(y)}${rows.some(r => String(r.year) === y && unbacked(r)) ? '<i class="dot red"></i>' : ""}</button>`).join(""));
  { const i = ys.indexOf(bk.year), un = y => rows.some(r => String(r.year) === y && unbacked(r));   // ys is newest first: ‹ goes back in time
    $("bkPrev").disabled = i >= ys.length - 1; $("bkNext").disabled = i <= 0;
    $("bkPrev").querySelector(".dot").hidden = !ys.slice(i + 1).some(un); $("bkNext").querySelector(".dot").hidden = !ys.slice(0, Math.max(0, i)).some(un);
    $("bkPrev").title = ys[i + 1] || ""; $("bkNext").title = ys[i - 1] || ""; }
  const yEl = $("bkYear"); if (yEl.textContent !== bk.year) { yEl.innerHTML = `${esc(bk.year.slice(0, 2))}<em>${esc(bk.year.slice(2))}</em>`; if (!first && !STILL) yEl.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" }); }
  $("bkJobs").textContent = inYear.length; $("bkDrives").textContent = new Set(inYear.flatMap(drivesOf)).size; $("bkUnN").textContent = unRows.length;
  $("bkUn").classList.toggle("red", unRows.length > 0); $("bkUn").setAttribute("aria-pressed", bk.un); $("bkUn").disabled = !unRows.length;
  const ts = bkTerms(), searching = ts.length > 0, num = numbers();
  $("bkScope").hidden = !searching; $("bkScope").querySelector('[data-v="year"]').textContent = "Only " + bk.year;
  $("bkScope").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === bk.scope));
  const cats = secsIn(inYear);
  if (!cats.includes(bk.cat)) bk.cat = cats[0] || null;
  $("bkCats").hidden = searching || bk.un;
  setHTML($("bkCats"), cats.map(c => { const js = secJobs(inYear.filter(r => sectionOf(r) === c)); return `<button type="button" role="tab" data-c="${esc(c)}" aria-selected="${c === bk.cat}"><em class="sec-n">${esc(baseOf(c))}${isPhotoSec(c) ? `<i class="sec-sep">·</i>Photo` : ""}</em><span>${js.length}</span>${js.some(j => j.un) ? '<i class="dot red"></i>' : ""}</button>`; }).join(""));
  const row = (j, i) => jobCard(j, i, { num, ts });
  const TH = '<div class="bk-th" aria-hidden="true"><span>No.</span><span>Job</span><span>Date</span><span>Backed up</span><span>Drive</span></div>';
  const sortJ = js => bk.desc ? js.slice().reverse() : js;
  const head = (title, n, jump) => `<h3 class="bk-gh">${jump ? `<button type="button" class="bk-jump" data-y="${esc(title)}">${esc(title)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>` : esc(title)}<span>${n} ${n === 1 ? "job" : "jobs"}</span></h3>`;
  const sortBtn = `<button type="button" class="btn ghost sm bk-sort" id="bkSort" aria-label="Sort">${bk.desc ? "Newest first" : "Oldest first"}</button>`;
  let html = "", filt = "";
  if (searching) {
    const pool = bk.scope === "year" ? inYear : rows, hits = jobsOf(pool).filter(j => j.rows.some(r => bkMatch(r, ts)));
    const shown = bk.all ? hits : hits.slice(0, 60);
    filt = `<span class="muted">${hits.length ? `${hits.length} found` : ""}</span>${hits.length > 1 ? sortBtn : ""}`;
    html = hits.length ? ys.map(y => [y, shown.filter(j => String(j.main.year) === y)]).filter(([, l]) => l.length).map(([y, l]) => `<section class="bk-group">${head(y, l.length, bk.scope === "all")}<div class="bk-rows">${TH}${sortJ(l).map(row).join("")}</div></section>`).join("")
      + (shown.length < hits.length ? `<button type="button" class="btn ghost" id="bkAll">Show all ${hits.length}</button>` : "")
      : `<div class="bk-empty">Nothing matches “${esc($("bkQ").value.trim())}”${bk.scope === "year" ? ` in ${esc(bk.year)}` : ""}.</div>`;
  } else if (bk.un) {
    const js = secJobs(inYear.filter(unbacked));
    filt = `<button type="button" class="fchip on" id="bkUnOff">Not backed up in ${esc(bk.year)} ✕</button>${js.length > 1 ? sortBtn : ""}`;
    html = cats.map(c => [c, js.filter(j => sectionOf(j.main) === c)]).filter(([, l]) => l.length).map(([c, l]) => `<section class="bk-group">${head(c, l.length)}<div class="bk-rows">${TH}${sortJ(l).map(row).join("")}</div></section>`).join("");
  } else {
    const inCat = inYear.filter(r => sectionOf(r) === bk.cat);
    const drives = [...new Set(inCat.flatMap(drivesOf))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (bk.drive && !drives.includes(bk.drive)) bk.drive = null;
    const js = secJobs(inCat).filter(j => !bk.drive || drivesOf(j.main).includes(bk.drive));
    filt = (drives.length > 1 ? `<span class="muted small">Drives</span>${drives.map(d => `<button type="button" class="fchip${bk.drive === d ? " on" : ""}" data-drive="${esc(d)}" aria-pressed="${bk.drive === d}">${esc(d === "未知" ? "Unknown" : d)}</button>`).join("")}` : "") + (js.length > 1 ? sortBtn : "");
    html = js.length ? `<div class="bk-rows">${TH}${sortJ(js).map(row).join("")}</div>` : `<div class="bk-empty">No jobs in ${esc(bk.year)} yet.</div>`;
  }
  setHTML($("bkFilters"), filt);
  const list = $("bkList"), key = [bk.year, bk.cat, bk.drive, bk.un, bk.scope, ts.join(" "), bk.desc].join("|");
  setHTML(list, html);
  { const cs = $("bkCats"), on = cs.querySelector('[aria-selected="true"]');   // the chosen section is always in view on the strip (sideways only)
    if (on && !cs.hidden) { const l = on.offsetLeft - cs.offsetLeft, r = l + on.offsetWidth; if (l < cs.scrollLeft || r > cs.scrollLeft + cs.clientWidth - 24) cs.scrollTo({ left: Math.max(0, l - 16), behavior: first || STILL ? "auto" : "smooth" }); } }
  if (list.dataset.key !== key) { list.dataset.key = key; list.classList.remove("anim"); void list.offsetWidth; list.classList.add("anim"); }
}
const bkStep = d => { const ys = bkYears(), y = ys[ys.indexOf(bk.year) + d]; if (!y) return; bk.year = y; bk.drive = null; buzz(); drawBackup(); };
$("bkPrev").addEventListener("click", () => bkStep(1)); $("bkNext").addEventListener("click", () => bkStep(-1));
$("bkYears").addEventListener("click", e => { const b = e.target.closest("[data-y]"); if (!b || b.dataset.y === bk.year) return; bk.year = b.dataset.y; bk.drive = null; buzz(); drawBackup(); });
$("bkCats").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; bk.cat = b.dataset.c; bk.drive = null; buzz(); drawBackup(); });
$("bkUn").addEventListener("click", () => { bk.un = !bk.un; buzz(); drawBackup(); });
$("bkScope").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) { bk.scope = b.dataset.v; bk.all = false; drawBackup(); } });
let bkT = 0;
$("bkQ").addEventListener("input", () => { bk.all = false; clearTimeout(bkT); bkT = setTimeout(() => drawBackup(), $("bkQ").value ? 120 : 0); });
$("bkQ").addEventListener("keydown", e => { if (e.key === "Escape" && $("bkQ").value) { e.stopPropagation(); $("bkQ").value = ""; drawBackup(); } });
$("bkFilters").addEventListener("click", e => {
  const d = e.target.closest("[data-drive]"); if (d) { bk.drive = bk.drive === d.dataset.drive ? null : d.dataset.drive; buzz(); return drawBackup(); }
  if (e.target.closest("#bkSort")) { bk.desc = !bk.desc; try { localStorage.setItem("bkDesc", bk.desc ? "1" : "0"); } catch (x) {} buzz(); return drawBackup(); }
  if (e.target.closest("#bkUnOff")) { bk.un = false; return drawBackup(); }
});
$("bkList").addEventListener("click", e => {
  const y = e.target.closest(".bk-jump"); if (y) { bk.year = y.dataset.y; $("bkQ").value = ""; buzz(); drawBackup(); $("views").scrollTop = 0; return; }
  if (e.target.closest("#bkAll")) { bk.all = true; return drawBackup(); }
  if (e.target.closest("#bkNew2")) return newJob();
  if (e.target.closest("a, [data-job-edit]")) return;
});
document.addEventListener("keydown", e => { const r = e.target.closest && e.target.closest(".bk-row[data-job]"); if (r && e.target === r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bkToggle(r); } });
// ---------------------------------------------------------------- step-by-step forms
// A new job / new shoot is asked one question at a time (Name, then Date, then Video or Photo, ...), with Next all the way.
// It is the same form underneath: the steps only show and hide its fields, and the last step's Save is the form's own Save.
// "All fields" (or editing an existing job) shows the whole form at once.
function wizOn(form, o) {
  const units = [...form.querySelectorAll("[data-wz]")], n = Math.max(...units.map(u => +u.dataset.wz || 0));
  let w = form._wz;
  if (!w) {
    const head = document.createElement("div"); head.className = "wz-head";
    head.innerHTML = `<div class="wz-dots" aria-hidden="true"></div><p class="wz-q" aria-live="polite"></p><button type="button" class="wz-all">All fields</button>`;
    (form.querySelector(".jf-top") || form.querySelector("h2")).after(head);
    const acts = [...form.querySelectorAll(".actions")].pop(), save = acts.querySelector("button:not([type=button])"), cancel = [...acts.querySelectorAll("button")].find(b => /Cancel/.test(b.textContent));
    const back = document.createElement("button"); back.type = "button"; back.className = "btn ghost wz-back"; back.textContent = "Back";
    const next = document.createElement("button"); next.type = "button"; next.className = "btn wz-next"; next.textContent = "Next";
    cancel.after(back); save.before(next);
    w = form._wz = { head, back, next, save, cancel, i: 0, n: 0, o: null };
    back.addEventListener("click", () => wizGo(form, w.i - 1));
    next.addEventListener("click", () => wizNext(form));
    head.querySelector(".wz-all").addEventListener("click", () => { wizOff(form); fx("open"); });
    form.addEventListener("keydown", e => {
      if (!form.classList.contains("wiz") || e.key !== "Enter" || e.isComposing || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
      if (w.i < w.n - 1) { e.preventDefault(); wizNext(form); }
    });
  }
  w.n = n; w.o = o; w.i = -1; form.classList.add("wiz");
  w.head.querySelector(".wz-dots").innerHTML = Array.from({ length: n }, () => "<i></i>").join("");
  wizGo(form, 0, true);
}
function wizOff(form) {
  const w = form._wz; if (!w || !form.classList.contains("wiz")) return;
  form.classList.remove("wiz"); delete form.dataset.step;
  form.querySelectorAll(".wz-off, .wz-in, .wz-in-back").forEach(u => u.classList.remove("wz-off", "wz-in", "wz-in-back"));
  w.back.hidden = w.next.hidden = true; w.save.hidden = false; w.cancel.hidden = false;
}
function wizNext(form) {
  const w = form._wz, bad = w.o.check && w.o.check(w.i);
  if (bad) { w.o.need ? w.o.need(bad) : toast(bad[0]); fx("err"); return; }
  wizGo(form, w.i + 1);
}
function wizGo(form, i, first) {
  const w = form._wz; if (!w || i < 0 || i >= w.n || i === w.i) return;
  const back = i < w.i; w.i = i; form.dataset.step = i + 1;
  form.querySelectorAll("[data-wz]").forEach(u => {
    const on = u.dataset.wz === String(i + 1); u.classList.toggle("wz-off", !on);
    u.classList.remove("wz-in", "wz-in-back"); if (on && !first && !STILL) { void u.offsetWidth; u.classList.add(back ? "wz-in-back" : "wz-in"); }
  });
  w.head.querySelectorAll(".wz-dots i").forEach((d, k) => { d.classList.toggle("on", k === i); d.classList.toggle("done", k < i); });
  w.head.querySelector(".wz-q").textContent = (w.o.titles || [])[i] || "";
  w.back.hidden = i === 0; w.cancel.hidden = i > 0; w.next.hidden = i === w.n - 1; w.save.hidden = i !== w.n - 1;
  const msg = form.querySelector(".msg"); if (msg) msg.textContent = "";
  if (w.o.enter) w.o.enter(i);
  if (!first) fx(back ? "close" : "nav");
  const f = form.querySelector(`[data-wz="${i + 1}"] input:not([type=date]):not([type=checkbox]), [data-wz="${i + 1}"] select, [data-wz="${i + 1}"]:is(input, select)`);
  if (f && (matchMedia("(hover: hover)").matches || i === 0 || f.type === "number")) setTimeout(() => f.focus({ preventScroll: true }), first ? 60 : 260);
}
// the step a field is on: a check on Save that fails on an earlier step goes back to it
function wizShow(form, el) { const u = el && el.closest("[data-wz]"); if (form.classList.contains("wiz") && u && /^\d+$/.test(u.dataset.wz)) wizGo(form, +u.dataset.wz - 1); }
// ---------------------------------------------------------------- job form: add, edit, back up, delete
// The form is the Workspace's own; Save hands it to Classic Backup (loaded unseen in the background), which saves it with
// its own code: the same rows, numbers, history, twin rules and outbox as before. Nothing here writes to the Sheet itself.
const NOTE_PRESETS = ["FullHD", "Not yet FullHD", "Photo only", "Footage only", "No edit", "Livestream"];
const ACT = { 新增: "Added", 更新备份: "Backed up", 修改: "Edited", 同步: "Synced" };
let jf = null;   // { r, tw, type, tick: {video, photo}, drives: Set, extra: [], dup, busy }
const classicWin = () => { try { return $("backupFrame").contentWindow; } catch (e) { return null; } };
function classicState() { loadBackup(); const w = classicWin(); try { return (w && w.mReady && w.mReady()) || { ready: false }; } catch (e) { return { ready: false }; } }
function jfYear() { const d = jfParts().find(p => p.date); return d ? d.date.slice(0, 4) : String(jf.r ? jf.r.year : bk.year || new Date().getFullYear()); }
function jfParts() { return [...$("jfParts").querySelectorAll(".jf-part")].map(el => ({ date: el.querySelector("input[type=date]").value, label: el.querySelector(".jf-pl").value.trim() })); }
function jfSetParts(ps) {
  const many = ps.length > 1;
  $("jfParts").innerHTML = ps.map((p, i) => `<div class="jf-part">${many ? `<span class="jf-pn">${ROMAN(i + 1)}.</span>` : ""}<input type="date" value="${esc(p.date || "")}" aria-label="Day ${i + 1}"><input class="jf-pl" value="${esc(p.label || "")}" placeholder="Note, e.g. venue" aria-label="Day ${i + 1} note">${many ? `<button type="button" class="ibtn sm jf-rm" data-i="${i}" aria-label="Remove day ${i + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ""}</div>`).join("");
}
function jfCats() {
  const st = classicState(), cur = $("jfCat").value || (jf.r ? baseOf(sectionOf(jf.r)) : baseOf(bk.cat || "Event"));
  const l = st.ready && st.cats && st.cats.length ? st.cats.slice() : [...new Set([...SECTIONS, ...(data.rows || []).map(sectionOf)].map(baseOf))];
  if (!l.includes(cur)) l.push(cur);
  $("jfCat").innerHTML = l.map(c => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("");
}
function jfDrives() {
  const y = jfYear(), w = classicWin(); let used = null;
  try { if (w && w.mDrives && classicState().ready) used = w.mDrives(y, jf.r ? jf.r.id : ""); } catch (e) {}
  if (!used) used = [...new Set((data.rows || []).filter(x => String(x.year) === y && (!jf.r || x.id !== jf.r.id)).flatMap(drivesOf).map(d => d.toUpperCase()).filter(d => d !== "未知"))];
  const list = [...new Set([...used, ...jf.extra, ...jf.drives])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  $("jfDrives").innerHTML = list.length ? list.map(d => `<button type="button" class="${jf.drives.has(d) ? "on" : ""}" data-d="${esc(d)}" aria-pressed="${jf.drives.has(d)}">${esc(d)}</button>`).join("") : `<span class="muted small">No drives used in ${esc(y)} yet. Add one below.</span>`;
}
function jfType() {
  const t = jf.type, has = h => t === "both" || t === h;
  document.querySelectorAll("#jfType button").forEach(b => { b.classList.toggle("on", b.dataset.v === t); b.setAttribute("aria-pressed", b.dataset.v === t); });
  const note = $("jfTypeNote"), half = { video: jf.r && (isPhotoSec(sectionOf(jf.r)) ? jf.tw : jf.r), photo: jf.r && (isPhotoSec(sectionOf(jf.r)) ? jf.r : jf.tw) };
  if (jf.r) {
    const gone = ["video", "photo"].filter(h => half[h] && !has(h)), kept = ["video", "photo"].some(h => half[h] && has(h));
    note.hidden = !gone.length;
    note.textContent = !gone.length ? "" : kept ? `Saving removes this job's ${gone[0] === "video" ? "Video" : "Photo"} row.` : `This job changes from ${gone[0] === "video" ? "Video" : "Photo"} to ${t === "photo" ? "Photo" : "Video"} when you save.`;
    $("jfMarkBox").hidden = false;
    $("jfMarks").innerHTML = ["video", "photo"].filter(has).map(h => { const r = half[h], done = r && !selfUnbacked(r), on = jf.tick[h];
      return `<button type="button" class="jf-mark${on ? " on" : ""}${done ? " done" : ""}" data-h="${h}" aria-pressed="${!!on}"><i aria-hidden="true"></i><span><b>${h === "video" ? "Video" : "Photo"}</b><small>${!r ? "New, not backed up yet" : done ? "Backed up" + (r.backupDate ? " " + esc(fmtDates([r.backupDate])) : "") : "Not backed up yet"}</small></span></button>`; }).join("");
    ["video", "photo"].forEach(h => { if (!has(h)) jf.tick[h] = false; });
  } else { note.hidden = true; $("jfMarkBox").hidden = true; }
  const marking = jf.tick.video || jf.tick.photo;
  $("jfDrvLbl").textContent = marking ? "Drives (needed to back up)" : "Drives";
  $("jfSave").textContent = marking ? "Save and mark backed up" : jf.r ? "Save" : "Add job";
}
function jfNotes() {
  const have = $("jfNotes").value.split(/\s*&\s*/).map(x => x.trim().toLowerCase()).filter(Boolean);
  $("jfNoteChips").innerHTML = NOTE_PRESETS.map(n => `<button type="button" class="${have.includes(n.toLowerCase()) ? "on" : ""}" data-n="${esc(n)}">${esc(n)}</button>`).join("");
}
function jfConn() {
  if (!jf) return;
  const st = classicState();
  if (st.ready && jf.r && !jf.sig) {   // the job as Backup has it now (ours can be up to a minute old)
    const live = classicJob(jf.r.id);
    if (!live) { $("jfMsg").textContent = "This job isn't in Backup any more. It may have been deleted."; jf.gone = true; }
    else if (!jf.touched) jfFill(live.r, live.tw, live.no, null, live.sig);
    else if (live.sig === sigOf(jf.r, jf.tw)) jf.sig = live.sig;
    else { $("jfMsg").textContent = "Someone changed this job since you opened it. Close the form and open it again."; jf.gone = true; }
  }
  $("jfConn").hidden = st.ready; $("jfSave").disabled = $("jfDel").disabled = !st.ready || jf.busy || !!jf.gone;
  if (st.ready && !st.canWrite) { $("jfMsg").textContent = "Backup is view only right now."; $("jfSave").disabled = $("jfDel").disabled = true; }
  if (st.ready && !jf.catsOk) { jf.catsOk = true; jfCats(); jfDrives(); }
  if (!st.ready && !$("jobScrim").hidden) jf.t = setTimeout(jfConn, 300);
}
const sigOf = (r, tw) => r ? [r.id, r.updatedAt || "", sectionOf(r), tw ? tw.id : "", tw ? tw.updatedAt || "" : ""].join("|") : "";
function classicJob(id) { const w = classicWin(); try { return w && w.mJob ? w.mJob(id) : null; } catch (e) { return null; } }
// r: the job's row to edit (null for a new job); pre: { name, dates, type } for a new one
function openJob(r, pre) {
  if (!session) return;
  if (r && !(data.rows || []).some(x => x.id === r.id)) return toast("This job isn't in Backup any more");
  if (jf) clearTimeout(jf.t);
  const live = r && classicState().ready ? classicJob(r.id) : null;
  if (live) jfFill(live.r, live.tw, live.no, null, live.sig);
  else jfFill(r, r ? twinOf(r) : null, r ? numbers().get(r.id) || "" : "", pre, "");
  sheetShow($("jobScrim")); fx("open");
  jfConn(); jfNoHint();
  if (!r) wizOn($("jobForm"), { titles: ["What's the job?", "Which days?", "Video or photo?", "Which No.?"],
    check: i => { const p = jfPayload(); return i === 0 && !p.name ? ["Fill in the name.", "jfName"] : i === 1 && !p.parts.some(x => x.date) ? ["Pick the day.", "jfParts"] : i === 2 && !p.type ? ["Choose Video, Photo or Video + Photo.", "jfType"] : null; },
    need: b => { $("jfMsg").textContent = b[0]; jfNeed(b[1]); }, enter: i => { if (i === 3) jfNoHint(); } });
  else { wizOff($("jobForm")); if (matchMedia("(hover: hover)").matches) $("jfName").focus(); }
}
function jfFill(r, tw, no, pre, sig) {
  const j = r ? splitJob(r) : null;
  jf = { r, tw, sig, no: no || "", type: r ? (tw ? "both" : isPhotoSec(sectionOf(r)) ? "photo" : "video") : (pre && pre.type) || "", tick: { video: false, photo: false }, drives: new Set(r ? drivesOf(r).map(d => d.toUpperCase()).filter(d => d !== "未知") : []), extra: [], busy: false, catsOk: false, touched: false };
  $("jfTitle").textContent = r ? "Edit job" : "New job";
  $("jfCat").innerHTML = ""; $("jfCat").value = "";
  jfCats(); if (r) $("jfCat").value = baseOf(sectionOf(r));
  $("jfName").value = r ? j.title || "" : (pre && pre.name) || "";
  const ps = r ? (j.parts.length ? j.parts : [{ date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : "", label: "" }]) : (pre && pre.dates && pre.dates.length ? pre.dates.map(d => ({ date: d, label: "" })) : [{ date: bk.year === String(new Date().getFullYear()) ? ymd(new Date()) : "", label: "" }]);
  jfSetParts(ps);
  $("jfNo").value = jf.no; $("jfNo").placeholder = "Last";
  $("jfEditor").value = r ? r.editor || session.name : "";
  $("jfTeam").innerHTML = team.map(n => `<option value="${esc(n)}">`).join("");
  $("jfNotes").value = r ? r.notes || "" : ""; jfNotes();
  $("jfLinks").value = r ? String(r.link || "") : "";
  const hist = r ? (r.history || []).filter(h => h && h.at) : [];
  $("jfHist").hidden = !hist.length;
  $("jfHist").innerHTML = hist.length ? `<summary>History, ${hist.length} ${hist.length === 1 ? "change" : "changes"}</summary><ol>${hist.slice().reverse().map(h => `<li><b>${esc(h.by || "")}</b> ${esc(ACT[h.action] || h.action || "")}<span>${esc(fmtShort(h.at))} ${esc(String(h.at).slice(11, 16))}</span></li>`).join("")}</ol>` : "";
  document.querySelectorAll("[data-jf-edit]").forEach(el => { el.hidden = !r; });   // as in Backup: editor, notes and links come with the backup
  $("jfDel").hidden = !r; $("jfCfm").hidden = true; $("jfActs").hidden = false; $("jfMsg").textContent = "";
  $("jfTypeLbl").textContent = r ? "Job type" : "What does this job have?";
  jfType(); jfDrives();
}
function closeJob(force) { if (jf && jf.busy && !force) return; if (!$("jobScrim").hidden) fx("close"); sheetHide($("jobScrim")); if (jf) clearTimeout(jf.t); jf = null; }
function normLink(v) {
  v = String(v || "").trim(); if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : ""; } catch (e) { return ""; }
}
function jfPayload() {
  const parts = jfParts().filter(p => p.date || p.label);
  const no = $("jfNo").value.trim();
  return { id: jf.r ? jf.r.id : "", sig: jf.sig || "", newDrives: jf.extra.slice(), cat: $("jfCat").value, name: $("jfName").value.trim(), parts, type: jf.type, tick: { ...jf.tick },
    drives: [...jf.drives], editor: $("jfEditor").value.trim(), notes: $("jfNotes").value.trim(),
    link: $("jfLinks").value.split(/\n/).map(x => x.trim()).filter(Boolean).join("\n"),
    no: no && String(no) !== String(jf.no) ? +no : null };
}
function jfCheck(p) {
  if (!p.name) return ["Fill in the name.", "jfName"];
  if (!jf.r && !p.parts.some(x => x.date)) return ["Pick the day.", "jfParts"];
  if (!p.type) return ["Choose Video, Photo or Video + Photo.", "jfType"];
  if ((p.tick.video || p.tick.photo) && !p.drives.length) return ["Pick the drive it's backed up on.", "jfDrives"];
  if ((p.tick.video || p.tick.photo) && !p.editor) return ["Fill in the editor.", "jfEditor"];
  const bad = p.link.split("\n").findIndex(u => u && !normLink(u));
  if (bad >= 0) return [`Link ${bad + 1} isn't a web address.`, "jfLinks"];
  if (p.no != null && !(Number.isInteger(p.no) && p.no >= 1)) return ["No. is a whole number from 1.", "jfNo"];
  return null;
}
function jfNeed(id) { const el = $(id); wizShow($("jobForm"), el); el.classList.remove("need"); void el.offsetWidth; el.classList.add("need"); (el.querySelector("input,button") || el).focus({ preventScroll: true }); el.scrollIntoView({ behavior: STILL ? "auto" : "smooth", block: "center" }); }
async function jfSave(force) {
  if (!jf || jf.busy) return;
  const p = jfPayload(), bad = jfCheck(p);
  if (bad) { $("jfMsg").textContent = bad[0]; jfNeed(bad[1]); return; }
  const w = classicWin(), st = classicState();
  if (!st.ready || !w || !w.mSubmit) { $("jfMsg").textContent = "Backup is still loading. Try again in a moment."; jfConn(); return; }
  if (jf.r && !jf.sig) { jfConn(); if (!jf || !jf.sig) return; p.sig = jf.sig; }
  p.force = !!force;
  jf.busy = true; $("jfMsg").textContent = ""; $("jfSave").classList.add("busy"); $("jfSave").disabled = true; $("jfDel").disabled = true;
  let res; try { res = await w.mSubmit(p); } catch (e) { res = { ok: false, msg: "Backup didn't save: " + e.message }; }
  if (!jf) return;
  jf.busy = false; $("jfSave").classList.remove("busy"); $("jfSave").disabled = false; $("jfDel").disabled = false;
  if (!res.ok) {
    if (res.stale) { jf.gone = true; $("jfSave").disabled = $("jfDel").disabled = true; }
    if (res.dup) { $("jfMsg").innerHTML = `${esc(res.msg.replace(/ Change the name, or press Save again.*$/, ""))} <button type="button" class="btn ghost sm" id="jfDup">Add it anyway</button>`; }
    else $("jfMsg").textContent = res.msg || "Backup didn't save.";
    return;
  }
  const r = jf.r, marked = p.tick.video || p.tick.photo, name = p.name;
  closeJob(); buzz();
  toast(res.queued ? "Saved on this device. It syncs when the connection is back." : marked ? `Marked backed up: ${name}` : r ? `Saved: ${name}` : `Added to ${res.year || jfYear()}: ${name}`);
  halo();
  if (!r && res.year) { bk.year = String(res.year); bk.cat = p.type === "photo" ? p.cat + " · Photo" : p.cat; }
  await refresh();
}
async function jfDelete() {
  if (!jf || jf.busy) return;
  const w = classicWin(); if (!classicState().ready || !w || !w.mDelete) { $("jfMsg").textContent = "Backup is still loading. Try again in a moment."; return; }
  jf.busy = true; $("jfCfmYes").classList.add("busy"); $("jfCfmYes").disabled = true;
  let res; try { res = await w.mDelete(jf.r.id, jf.sig || ""); } catch (e) { res = { ok: false, msg: e.message }; }
  if (!jf) return;
  jf.busy = false; $("jfCfmYes").classList.remove("busy"); $("jfCfmYes").disabled = false;
  if (!res.ok) { $("jfMsg").textContent = res.msg || "Backup didn't delete it."; $("jfCfm").hidden = true; $("jfActs").hidden = false; if (res.stale) { jf.gone = true; $("jfSave").disabled = $("jfDel").disabled = true; } return; }
  const name = splitJob(jf.r).title, wasJob = route.name === "job";
  closeJob(); buzz(); toast(res.queued ? "Deleted on this device. It syncs when the connection is back." : `Deleted: ${name}`);
  if (wasJob) location.hash = "#/backup";
  await refresh();
}
$("jfType").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b || !jf) return; jf.type = b.dataset.v; jfType(); jfNoHint(); if ($("jobForm").dataset.step === "3") setTimeout(() => wizNext($("jobForm")), 260); });
// No.: empty = the job goes last; a number already taken = it goes in at that place and the ones after move down (Backup's own rule)
function jfNoHint() {
  const h = $("jfNoHint"); if (!jf) return;
  const d = (jfParts().find(x => x.date) || {}).date || "", y = d.slice(0, 4) || (jf.r ? String(jf.r.year) : String(new Date().getFullYear()));
  const cat = $("jfCat").value, sec = jf.r ? sectionOf(jf.r) : cat + (jf.type === "photo" ? " · Photo" : "");
  const n = bkRows().filter(r => (!jf.r || r.id !== jf.r.id) && String(r.year) === y && sectionOf(r) === sec).length;
  const v = parseInt($("jfNo").value, 10);
  h.textContent = !cat ? "" : v > 0 && v <= n ? `It goes in as No. ${v} in ${sec} ${y}; No. ${v} to ${n} move down one.`
    : v > n + 1 ? `${sec} ${y} has ${n} jobs, so it goes last, as No. ${n + 1}.`
    : `Leave it empty and it goes last in ${sec} ${y}, as No. ${n + 1}. Type a number that's taken to put it in that place.`;
}
["jfNo", "jfCat"].forEach(id => $(id).addEventListener("input", jfNoHint));
$("jfParts").addEventListener("input", jfNoHint);
$("jfMarks").addEventListener("click", e => { const b = e.target.closest("[data-h]"); if (!b || !jf) return; jf.tick[b.dataset.h] = !jf.tick[b.dataset.h]; if (jf.tick[b.dataset.h] && !$("jfEditor").value.trim()) $("jfEditor").value = session.name; buzz(); jfType(); });
$("jfDrives").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b || !jf) return; const d = b.dataset.d; jf.drives.has(d) ? jf.drives.delete(d) : jf.drives.add(d); jfDrives(); });
function jfAddDrive() { const d = $("jfDriveNew").value.trim().replace(/\s+/g, " ").toUpperCase(); if (!d || !jf) return; if (d.includes(",")) { $("jfMsg").textContent = "A drive name can't have a comma."; return; } if (!jf.extra.includes(d)) jf.extra.push(d); jf.drives.add(d); $("jfDriveNew").value = ""; jfDrives(); }
$("jfDriveAdd").addEventListener("click", jfAddDrive);
$("jfDriveNew").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); jfAddDrive(); } });
$("jfAddPart").addEventListener("click", () => { const ps = jfParts(); ps.push({ date: "", label: "" }); jfSetParts(ps); const ds = $("jfParts").querySelectorAll("input[type=date]"); ds[ds.length - 1].focus(); });
$("jfParts").addEventListener("click", e => { const b = e.target.closest(".jf-rm"); if (!b) return; const ps = jfParts(); ps.splice(+b.dataset.i, 1); jfSetParts(ps.length ? ps : [{ date: "", label: "" }]); jfDrives(); });
$("jfParts").addEventListener("change", () => { if (jf) jfDrives(); });
$("jfNoteChips").addEventListener("click", e => {
  const b = e.target.closest("[data-n]"); if (!b) return;
  const n = b.dataset.n, ln = n.toLowerCase(); let ps = $("jfNotes").value.split(/\s*&\s*/).map(x => x.trim()).filter(Boolean);
  if (ps.some(x => x.toLowerCase() === ln)) ps = ps.filter(x => x.toLowerCase() !== ln);
  else { if (/fullhd$/i.test(n)) ps = ps.filter(x => !/^(not yet )?fullhd$/i.test(x)); ps.push(n); }
  $("jfNotes").value = ps.join(" & "); jfNotes();
});
$("jfNotes").addEventListener("input", jfNotes);
$("jobForm").addEventListener("click", e => { if (jf && e.target.closest("button:not(#jfCancel):not(#jfSave)")) jf.touched = true; }, true);
$("jobForm").addEventListener("input", e => { if (jf) jf.touched = true; if (e.target.id !== "jfMsg") { $("jfMsg").textContent = ""; e.target.closest(".need")?.classList.remove("need"); } });
$("jobForm").addEventListener("submit", e => { e.preventDefault(); jfSave(false); });
$("jfMsg").addEventListener("click", e => { if (e.target.closest("#jfDup")) jfSave(true); });
$("jfCancel").addEventListener("click", closeJob);
$("jobScrim").addEventListener("click", e => { if (e.target === $("jobScrim")) closeJob(); });
$("jfDel").addEventListener("click", () => {
  if (!jf || !jf.r) return;
  const list = [jf.r, jf.tw].filter(Boolean), n = list.length, num = numbers();
  $("jfCfmT").textContent = `Delete ${n} ${n === 1 ? "row" : "rows"} for everyone?`;
  $("jfCfmList").innerHTML = list.map(x => `<li><b>${esc(splitJob(x).title)}</b><small>${esc([x.year, sectionOf(x), num.has(x.id) ? "No." + String(num.get(x.id)).padStart(2, "0") : "", drivesOf(x).join(", ") || "No drive"].filter(Boolean).join(", "))}</small></li>`).join("");
  $("jfCfmYes").textContent = `Delete ${n} ${n === 1 ? "row" : "rows"}`;
  $("jfCfm").hidden = false; $("jfActs").hidden = true; $("jfMsg").textContent = ""; $("jfCfmNo").focus();
});
$("jfCfmNo").addEventListener("click", () => { $("jfCfm").hidden = true; $("jfActs").hidden = false; $("jfDel").focus(); });
$("jfCfmYes").addEventListener("click", jfDelete);
function newJob(pre) { openJob(null, pre && pre.name != null ? pre : null); }
$("bkNew").addEventListener("click", () => newJob());
document.addEventListener("click", e => { const b = e.target.closest("[data-job-edit]"); if (!b) return; openJob((data.rows || []).find(x => x.id === b.dataset.jobEdit) || null);
  if (b.classList.contains("bk-fix") && jf) {   // "Back up" on a row: the form opens with the missing halves ticked, ready for the drive and Save
    document.querySelectorAll("#jfMarks .jf-mark:not(.done):not(.on)").forEach(m => m.click());
    const box = $("jfMarkBox"); if (box && !box.hidden) setTimeout(() => box.scrollIntoView({ block: "center", behavior: STILL ? "auto" : "smooth" }), 320);
  } });

// Check data: the same name twice (same year and category), or backed up with no drive or no editor
let chkScope = "year";
function drawCheck() {
  const rows = bkRows(), list = chkScope === "year" ? rows.filter(r => String(r.year) === bk.year) : rows, num = numbers();
  const g = new Map(); list.forEach(r => { const k = r.year + "|" + sectionOf(r) + "|" + normName(r.name); if (normName(r.name)) (g.get(k) || g.set(k, []).get(k)).push(r); });
  const groups = [["Same name twice", "Same year, category and name. Usually one of them should go, or be renamed.", [...g.values()].filter(x => x.length > 1).flat()],
    ["Backed up, no drive", "Marked as backed up, but no drive is filled in.", list.filter(r => !selfUnbacked(r) && !drivesOf(r).filter(d => d !== "未知").length)],
    ["Backed up, no editor", "Marked as backed up, but no editor is filled in.", list.filter(r => !selfUnbacked(r) && !String(r.editor || "").trim())]];
  const total = groups.reduce((n, x) => n + x[2].length, 0);
  $("chkYear").textContent = bk.year;
  $("chkScope").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === chkScope));
  $("chkSum").textContent = total ? `${total} to look at in ${chkScope === "year" ? bk.year : "all years"}. Tap one to open it.` : "";
  $("chkList").innerHTML = total ? groups.filter(x => x[2].length).map(([t, d, l]) => `<section class="chk-g"><h4>${esc(t)}<span>${l.length}</span></h4><p class="muted small">${esc(d)}</p>
    ${l.slice(0, 60).map(r => `<a class="chk-item" href="#/job/${encodeURIComponent(r.id)}"><b>${esc(splitJob(r).title)}</b><small>${[r.year, sectionOf(r), num.has(r.id) ? "No." + String(num.get(r.id)).padStart(2, "0") : "", drivesOf(r).join(", ") || "No drive"].filter(Boolean).map(esc).join(", ")}</small></a>`).join("")}
    ${l.length > 60 ? `<p class="muted small">And ${l.length - 60} more. Pick one year to see them all.</p>` : ""}</section>`).join("")
    : `<div class="chk-ok"><b>All good</b><small>No repeated names, and every backed-up job has a drive and an editor${chkScope === "year" ? " in " + esc(bk.year) : ""}.</small></div>`;
}
$("bkCheck").addEventListener("click", () => { chkScope = "year"; drawCheck(); sheetShow($("chkScrim")); buzz(); });
$("chkScope").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) { chkScope = b.dataset.v; drawCheck(); } });
const closeChk = () => { sheetHide($("chkScrim")); };
$("chkClose").addEventListener("click", closeChk);
$("chkScrim").addEventListener("click", e => { if (e.target === $("chkScrim") || e.target.closest(".chk-item")) closeChk(); });

// Export: every job of the year in the Sheet's Jobs columns, as a CSV file that opens in Excel or Numbers
const FIELDS = ["id", "year", "section", "sec", "ord", "no", "name", "parts", "date", "drive", "editor", "backupDate", "backedUp", "notes", "link", "secTitle", "sheet", "history", "createdBy", "createdAt", "updatedBy", "updatedAt"];
$("bkExport").addEventListener("click", () => {
  const rows = bkRows().filter(r => String(r.year) === bk.year);
  const cell = v => { v = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const csv = "﻿" + [FIELDS.join(","), ...rows.map(r => FIELDS.map(f => cell(r[f])).join(","))].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `Studio M Backup ${bk.year}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Exported ${rows.length} rows from ${bk.year}`); buzz();
});

// ---------------------------------------------------------------- team
// One card per person: this year's jobs and what isn't backed up, the next shoot, the birthday. Below: members and
// birthdays (the same list Backup uses) and changing your own PIN.
let birthdays = {}, memArmed = null, teamOk = false;
const bdayText = v => { const m = /^(\d{4}|-{0,4})-?(\d{2})-(\d{2})$/.exec(v || ""); return m ? `${+m[3]} ${MON[+m[2] - 1]}` : ""; };
function drawTeam() {
  if (!session) return;
  birthdays = Object.assign({}, data.birthdays || {});
  const y = String(new Date().getFullYear()), today = ymd(new Date());
  $("teamGrid").innerHTML = team.map((n, i) => {
    const rs = rowsOf(y).filter(r => r.editor === n), un = rs.filter(unbacked).length, ok = rs.length - un;
    const next = shoots.filter(s => crewOf(s).includes(n)).map(s => ({ s, d: datesOf(s).sort().find(d => d >= today) })).filter(x => x.d).sort((a, b) => a.d < b.d ? -1 : 1)[0];
    const bd = bdayText(birthdays[n]);
    return `<article class="tm${n === session.name ? " me" : ""}" style="--i:${i}">
      <div class="tm-h"><span class="tm-av">${esc(initials(n))}</span><div><span class="tm-name"><b>${esc(n)}</b>${n === session.name ? '<span class="tag">You</span>' : ""}</span><span class="muted small">${bd ? "Birthday " + esc(bd) : "No birthday yet"}</span></div></div>
      <div class="tm-stats"><a href="#/editor/${encodeURIComponent(n)}"><b>${rs.length}</b><span>${rs.length === 1 ? "job" : "jobs"} in ${y}</span></a>
        <a href="#/editor/${encodeURIComponent(n)}" class="${un ? "red" : ""}"><b>${un}</b><span>not backed up</span></a></div>
      <div class="bar" aria-hidden="true"><i class="ok" style="flex-grow:${ok}"></i><i class="no" style="flex-grow:${un}"></i>${rs.length ? "" : '<i style="flex-grow:1"></i>'}</div>
      <p class="tm-next">${next ? `Next shoot <a href="#/calendar/${esc(encodeURIComponent(next.d))}">${esc(fmtDay(next.d))}</a>, ${esc(next.s.name)}.` : '<span class="muted">No shoots coming up.</span>'}</p>
    </article>`;
  }).join("");
  drawMembers();
}
function drawMembers() {
  // a half-picked birthday or an open select stays as it is through the minute refresh
  const ml = $("memList");
  if (ml.contains(document.activeElement) || [...ml.querySelectorAll(".mem")].some(r => { const v = [...r.querySelectorAll("select")].map(x => !!x.value); return v.some(Boolean) && !v.every(Boolean); })) return;
  const y0 = new Date().getFullYear(), years = Array.from({ length: 67 }, (_, i) => y0 - 14 - i);
  ml.innerHTML = team.map(n => {
    const v = birthdays[n] || "", m = /(\d{2})-(\d{2})$/.exec(v), yy = /^(\d{4})-/.exec(v);
    return `<div class="mem" data-n="${esc(n)}"><span class="hub ed">${esc(initials(n))}</span><b>${esc(n)}</b>
      <label class="bd"><span class="sr">Birthday of ${esc(n)}</span><select data-bd="m" aria-label="Month"><option value="">Month</option>${MON.map((x, i) => `<option value="${String(i + 1).padStart(2, "0")}"${m && +m[1] === i + 1 ? " selected" : ""}>${x}</option>`).join("")}</select>
      <select data-bd="d" aria-label="Day"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, "0")}"${m && +m[2] === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select>
      <select data-bd="y" aria-label="Year"><option value="">Year</option>${years.map(x => `<option${yy && +yy[1] === x ? " selected" : ""}>${x}</option>`).join("")}</select></label>
      ${n === session.name ? '<span class="rm-sp"></span>' : `<button type="button" class="btn ghost sm rm${memArmed === n ? " armed" : ""}" data-rm="${esc(n)}">${memArmed === n ? "Remove?" : "Remove"}</button>`}</div>`;
  }).join("");
}
async function saveTeam(members, bd, msg) {
  // never write a team list that didn't come from a good load, or one without you in it: that would wipe the list in Backup too
  if (!teamOk || !members.includes(session.name)) { $("memMsg").textContent = "The team list hasn't loaded yet. Try again in a moment."; return; }
  const prevT = team, prevB = birthdays;
  team = members; birthdays = bd; data.team = members; data.birthdays = bd; drawTeam(); drawSide();
  try { await M.api("setTeam", ["", members, bd]); toast(msg); buzz(); }
  catch (err) { team = prevT; birthdays = prevB; data.team = prevT; data.birthdays = prevB; drawTeam(); $("memMsg").textContent = err.message; }
}
$("memList").addEventListener("change", e => {
  const row = e.target.closest(".mem"); if (!row) return;
  const n = row.dataset.n, m = row.querySelector('[data-bd="m"]').value, d = row.querySelector('[data-bd="d"]').value, y = row.querySelector('[data-bd="y"]').value;
  if (!(m && d && y) && (m || d || y)) return;   // wait for all three (Backup keeps the year for the zodiac hat)
  const bd = Object.assign({}, birthdays);
  if (m) bd[n] = `${y}-${m}-${d}`; else delete bd[n];
  if (m && !parseYmd(bd[n])) { $("memMsg").textContent = "That day doesn't exist."; return; }
  $("memMsg").textContent = ""; saveTeam(team, bd, m ? `Birthday saved for ${n}` : `Birthday cleared for ${n}`);
});
$("memList").addEventListener("click", e => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  const n = b.dataset.rm;
  if (memArmed !== n) { memArmed = n; drawMembers(); setTimeout(() => { if (memArmed === n) { memArmed = null; drawMembers(); } }, 3000); return; }
  memArmed = null; const bd = Object.assign({}, birthdays); delete bd[n];
  saveTeam(team.filter(x => x !== n), bd, `${n} removed`);
});
$("memAdd").addEventListener("submit", e => {
  e.preventDefault();
  const n = $("memNew").value.trim().replace(/\s+/g, " ");
  if (!n) return;
  if (team.some(x => x.toLowerCase() === n.toLowerCase())) { $("memMsg").textContent = `${n} is already on the team.`; return; }
  if (/[,<>"]/.test(n)) { $("memMsg").textContent = "Use letters and spaces only."; return; }
  $("memNew").value = ""; $("memMsg").textContent = "";
  saveTeam([...team, n], birthdays, `${n} added`);
});

// ---------------------------------------------------------------- shoot form
let editing = null, sfType = "both", sfCrew = new Set();
function openShoot(s, onSaved) {
  editing = { ...s, onSaved };
  const ds = datesOf(s).sort();
  $("sfTitle").textContent = s.id ? "Edit shoot" : "New shoot";
  $("sfName").value = s.name || ""; $("sfFrom").value = ds[0] || ""; $("sfTo").value = ds.length > 1 ? ds[ds.length - 1] : "";
  $("sfLoc").value = s.location || ""; $("sfNotes").value = s.notes || ""; $("sfMsg").textContent = "";
  sfType = s.type || "both"; sfCrew = new Set(crewOf(s));
  drawSeg(); drawCrew(); $("sfDel").hidden = !s.id; sheetShow($("shootScrim"));
  if (!s.id) wizOn($("shootForm"), { titles: ["What's the shoot?", "When and where?", "Video or photo?", "Who's going?"],
    check: i => i === 0 && !$("sfName").value.trim() ? ["Fill in the name.", "sfName"] : i === 1 && !$("sfFrom").value ? ["Pick the day.", "sfFrom"] : null,
    need: b => { $("sfMsg").textContent = b[0]; $(b[1]).focus(); } });
  else { wizOff($("shootForm")); $("sfName").focus(); }
}
function drawSeg() { document.querySelectorAll("#sfType button").forEach(b => b.classList.toggle("on", b.dataset.v === sfType)); }
function drawCrew() { $("sfCrew").innerHTML = team.map(n => `<button type="button" class="${sfCrew.has(n) ? "on" : ""}" data-n="${esc(n)}">${esc(n)}</button>`).join(""); }
$("sfType").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { sfType = b.dataset.v; drawSeg(); if ($("shootForm").dataset.step === "3") setTimeout(() => wizNext($("shootForm")), 260); } });
$("sfCrew").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const n = b.dataset.n; sfCrew.has(n) ? sfCrew.delete(n) : sfCrew.add(n); drawCrew(); });
const closeShoot = () => { sheetHide($("shootScrim")); editing = null; };
$("sfCancel").addEventListener("click", closeShoot);
$("shootScrim").addEventListener("click", e => { if (e.target === $("shootScrim")) closeShoot(); });
$("shootForm").addEventListener("submit", async e => {
  e.preventDefault();
  const dates = range($("sfFrom").value, $("sfTo").value);
  if (!dates.length) { $("sfMsg").textContent = "Pick the date"; return; }
  const now = new Date().toISOString(), old = editing;
  const s = { id: old.id || uid(), name: $("sfName").value.trim(), dates: dates.join(","), location: $("sfLoc").value.trim(), type: sfType,
    crew: [...sfCrew].join(","), notes: $("sfNotes").value.trim(), jobId: old.jobId || "",
    createdBy: old.createdBy || session.name, createdAt: old.createdAt || now, updatedBy: session.name, updatedAt: now };
  $("sfSave").disabled = true;
  try {
    await M.api("saveShoot", ["", s]);
    const i = shoots.findIndex(x => x.id === s.id); if (i < 0) shoots.push(s); else shoots[i] = s;
    closeShoot(); toast("Shoot saved"); halo(); selDay = dates[0]; const d = parseYmd(dates[0]); calY = d.getFullYear(); calM = d.getMonth();
    drawAll();
    if (old.onSaved) old.onSaved(s);
  } catch (err) { $("sfMsg").textContent = err.message; }
  $("sfSave").disabled = false;
});
$("sfDel").addEventListener("click", async () => {
  if (!confirm(`Delete "${editing.name}"?`)) return;
  try { await M.api("deleteShoot", ["", editing.id]); shoots = shoots.filter(x => x.id !== editing.id); closeShoot(); toast("Shoot deleted"); drawAll(); }
  catch (err) { $("sfMsg").textContent = err.message; }
});

// ---------------------------------------------------------------- Ask M (AI)
// Any OpenAI-compatible chat server. Default: Hermes Agent on this Mac (its API server: `hermes gateway` with
// API_SERVER_ENABLED=true, port 8642, Bearer API_SERVER_KEY). Others: Ollama / LM Studio, or a cloud API with a key.
// (DeepSeek through MApp.gs comes in a later step.)
const AI_PROVIDERS = {
  hermes: { label: "Hermes Agent (this Mac)", url: "http://127.0.0.1:8642/v1", model: "hermes-agent",
    hint: "In ~/.hermes/.env set API_SERVER_ENABLED=true and API_SERVER_KEY, run `hermes gateway`, and paste that key below." },
  ollama: { label: "Ollama (this Mac)", url: "http://127.0.0.1:11434/v1", model: "hermes3", hint: "No key needed. Model = a name from `ollama list`." },
  lmstudio: { label: "LM Studio (this Mac)", url: "http://127.0.0.1:1234/v1", model: "", hint: "Start the server in LM Studio. No key needed." },
  openai: { label: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o-mini", hint: "Paste an OpenAI API key." },
  anthropic: { label: "Claude (Anthropic)", url: "https://api.anthropic.com/v1", model: "claude-sonnet-5-5", hint: "Paste an Anthropic API key." },
  openrouter: { label: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "nousresearch/hermes-4-70b", hint: "Paste an OpenRouter API key." },
  custom: { label: "Other (OpenAI-compatible)", url: "", model: "", hint: "Any server with /v1/chat/completions." }
};
const aiCfg = () => store.get("mAI", { prov: "hermes", url: AI_PROVIDERS.hermes.url, model: AI_PROVIDERS.hermes.model, key: "" });
const jobLine = r => [r.name, r.date || r.year, sectionOf(r), "drive " + (r.drive || "-"), "editor " + (r.editor || "-"),
  unbacked(r) ? "NOT backed up" : `backed up${r.backedUp && r.backedUp !== true ? " (" + r.backedUp + ")" : ""}${r.backupDate ? " " + r.backupDate : ""}`,
  r.link ? "link " + r.link : ""].filter(Boolean).join(" | ");
// the jobs whose name, drive, editor, section, year or date match words in the question (best first)
const STOP = ["the", "and", "where", "which", "what", "is", "are", "my", "job", "jobs", "drive", "in", "on", "of", "for", "was", "did"];
const wordsOf = q => (String(q || "").toLowerCase().match(/[a-z0-9&]{2,}|[一-鿿]{2,}/g) || []).filter(w => !STOP.includes(w));
function findJobs(q, max) {
  const words = wordsOf(q);
  if (!words.length) return [];
  return (data.rows || []).map(r => {
    const hay = [r.name, r.drive, r.editor, r.section, r.year, r.date].join(" ").toLowerCase();
    return { r, n: words.filter(w => hay.includes(w)).length };
  }).filter(x => x.n).sort((a, b) => b.n - a.n || String(b.r.date || "").localeCompare(String(a.r.date || ""))).slice(0, max || 25).map(x => x.r);
}
function aiSystem(q) {
  const now = new Date(), today = ymd(now), year = String(now.getFullYear());
  const upcoming = shoots.filter(s => datesOf(s).some(d => d >= today)).slice(0, 30).map(s => `${s.name} | ${s.dates} | ${s.location || ""} | ${s.type} | crew ${s.crew || "-"}`);
  const notBacked = rowsOf(year).filter(unbacked).slice(0, 60)
    .map(r => `${r.name} (${sectionOf(r)}, editor ${r.editor || "-"}, drive ${r.drive || "-"})`);
  const found = findJobs(q).map(jobLine);
  return `You are M, the assistant in Studio M Workspace, the Studio M Production team app (event video and photo). Today is ${today} (${WD[(now.getDay() + 6) % 7]}).
Team: ${team.join(", ")}. You are talking with ${session.name}. Answer in the language they write in; keep it short and friendly; Markdown is fine.
When they want to add a shoot day, write one short line, then exactly one block like this (every day of the shoot, crew only from the team):
\`\`\`shoot
{"name":"short event name","dates":["YYYY-MM-DD"],"location":"","type":"video|photo|both","crew":["Hang"],"notes":""}
\`\`\`
The app shows that block as a card they confirm. Never say a shoot is saved; they save it from the card.
Upcoming shoots:
${upcoming.join("\n") || "none"}
Jobs not backed up in ${year} (Video and Photo are separate rows; a job counts as backed up only when both are):
${notBacked.join("\n") || "none"}
When they ask where something is (a job, a drive, an editor's jobs), answer from these.
Jobs that match their question (name | date | section | drive | editor | backup):
${found.join("\n") || "none matched; ask them for the event name, couple's name, drive or editor"}`;
}
// Streams the reply (Server-Sent Events) and calls onText with the text so far; falls back to one plain reply
async function callModel(messages, onText, signal) {
  if (!DEMO) return callServer(messages, onText, signal);
  try { return await callServer(messages, onText, signal); } catch (e) { if (signal && signal.aborted) throw e; return fakeModel(messages, onText, signal); }
}
// Demo only: when no model server is reachable, M answers from a few canned replies so the app can be tried anywhere
async function fakeModel(messages, onText, signal) {
  const q = String(messages[messages.length - 1].content || ""), zh = /[一-鿿]/.test(q), d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const day = ymd(d), found = findJobs(q, 3);
  let out;
  if (/shoot|wedding|拍|婚|活动|event/i.test(q) && !/where|哪/i.test(q)) {
    const name = (q.match(/(?:shoot[:：]?|拍)\s*([^,，。\n]{2,40})/i) || [])[1] || (zh ? "婚礼拍摄" : "Wedding shoot");
    out = (zh ? "好，帮你排好了，确认一下：\n" : "Got it. Check this and tap Add:\n") + "```shoot\n" +
      JSON.stringify({ name: name.trim(), dates: [day], location: zh ? "吉隆坡" : "Kuala Lumpur", type: "both", crew: [session.name], notes: "" }) + "\n```";
  } else if (found.length) {
    const r = found[0];
    out = (zh ? `**${r.name}** 在 ${r.drive || "（没写硬盘）"}，${r.editor || "没人"} 剪的。` : `**${r.name}** is on ${r.drive || "no drive yet"}, edited by ${r.editor || "nobody yet"}. `) +
      (unbacked(r) ? (zh ? "还没备份。" : "It is not backed up yet.") : (zh ? "已经备份了。" : "It is backed up."));
  } else if (/back|备份/i.test(q)) {
    const lines = rowsOf(String(new Date().getFullYear())).filter(unbacked).slice(0, 6).map(r => `- ${r.name} (${sectionOf(r)}, ${r.editor || "-"}, ${r.drive || "-"})`);
    out = lines.length ? (zh ? "还没备份的：\n" : "Not backed up yet:\n") + lines.join("\n") : (zh ? "全部都备份好了 👍" : "Everything is backed up 👍");
  } else {
    out = zh ? `嗨 ${session.name}！这是 **demo 模式**，我是模拟回复。\n- 说「拍 Tan & Lim 婚礼」试试加 shoot\n- 问「Rinjani 在哪个硬盘？」` :
      `Hi ${session.name}! This is **demo mode**, so my replies are canned.\n- Try "Add a shoot: Tan & Lim wedding"\n- Or ask "Where is Rinjani?"`;
  }
  let text = "";
  for (const ch of Array.from(out)) {
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    text += ch; onText(text); await new Promise(r => setTimeout(r, 18));
  }
  return text;
}
async function callServer(messages, onText, signal) {
  const c = aiCfg(), url = c.url.replace(/\/+$/, "") + "/chat/completions";
  const headers = { "Content-Type": "application/json" }; if (c.key) headers.Authorization = "Bearer " + c.key;
  const res = await net(url, { method: "POST", headers, signal, body: JSON.stringify({ model: c.model, messages, temperature: 0.4, stream: true }) });
  if (!res.ok) throw new Error(`Model server said ${res.status}`);
  let text = "", buf = "";
  const eat = chunk => {
    buf += chunk; const lines = buf.split("\n"); buf = lines.pop();
    for (const l of lines) {
      const d = l.replace(/^data:\s*/, "").trim(); if (!l.startsWith("data:") || !d || d === "[DONE]") continue;
      try { const o = JSON.parse(d), c0 = o.choices && o.choices[0]; text += (c0 && (c0.delta && c0.delta.content || c0.message && c0.message.content)) || ""; } catch (e) {}
    }
    onText(text);
  };
  const type = (res.headers.get("content-type") || "");
  if (res.body && res.body.getReader && !type.includes("application/json")) {
    const rd = res.body.getReader(), dec = new TextDecoder();
    for (;;) { const { value, done } = await rd.read(); if (done) break; eat(dec.decode(value, { stream: true })); }
    eat("\n");
  } else {
    const raw = await res.text();
    if (raw.trim().startsWith("{")) { const o = JSON.parse(raw); text = String(o.choices && o.choices[0] && o.choices[0].message && o.choices[0].message.content || ""); onText(text); }
    else eat(raw + "\n");
  }
  return text;
}
// Small Markdown: code blocks, inline code, bold, italic, headings, lists, links. Everything is escaped first.
function md(src) {
  const blocks = [];
  let t = esc(src).replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, (m, lang, code) => { blocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  const inline = x => x.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of t.split("\n")) {
    let m;
    if (/^\u0000\d+\u0000$/.test(line.trim())) { close(); out.push(line.trim()); }
    else if ((m = line.match(/^#{1,3}\s+(.*)/))) { close(); out.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (!line.trim()) close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return linkify(out.join("").replace(/<\/p><p>/g, "<br>").replace(/\u0000(\d+)\u0000/g, (m, n) => blocks[n]));
}
// drive names and team names in M's replies become links into their pages (only in text, never inside tags or code)
function linkify(html) {
  const names = [...drivesIn(gYear).map(d => ["drive", d.name]), ...yearsAll().flatMap(y => drivesIn(y).map(d => ["drive", d.name])), ...team.map(n => ["editor", n])];
  const seen = new Set(), list = names.filter(([k, n]) => n && !seen.has(n) && seen.add(n)).sort((a, b) => b[1].length - a[1].length);
  if (!list.length) return html;
  const re = new RegExp("\\b(" + list.map(([, n]) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "g");
  const kind = Object.fromEntries(list.map(([k, n]) => [n, k]));
  return html.split(/(<pre[\s\S]*?<\/pre>|<a[\s\S]*?<\/a>|<[^>]+>|&#?\w+;)/).map(p => p.startsWith("<") || p.startsWith("&") ? p : p.replace(re, n => `<a href="#/${kind[n]}/${encodeURIComponent(n)}" class="ml">${n}</a>`)).join("");
}
const SHOOT_RE = /```shoot\s*([\s\S]*?)(```|$)/;
// What the model says is never saved as is: dates must be real days, crew only team names, then the person confirms
function cleanShoot(o) {
  const dates = (Array.isArray(o.dates) ? o.dates : [o.dates]).map(String).filter(d => parseYmd(d)).sort().slice(0, 31);
  const lower = Object.fromEntries(team.map(n => [n.toLowerCase(), n]));
  const crew = (Array.isArray(o.crew) ? o.crew : String(o.crew || "").split(",")).map(n => lower[String(n).trim().toLowerCase()]).filter(Boolean);
  return { name: String(o.name || "").trim().slice(0, 200), dates: [...new Set(dates)].join(","), location: String(o.location || "").trim().slice(0, 200),
    type: ["video", "photo", "both"].includes(o.type) ? o.type : "both", crew: [...new Set(crew)].join(","), notes: String(o.notes || "").trim().slice(0, 2000) };
}
// M's moods show on whichever M you can see: the one in the corner, or the one at the top of the open chat
function mood(c) {
  ["mBtn", "mpAv"].forEach(id => { const b = $(id); b.classList.remove("listen", "think", "happy", "huh"); void b.offsetWidth; if (c) b.classList.add(c); });
  Pet.busy = c === "listen" || c === "think";
  const host = mOpen ? $("mpAv") : $("mSvg");
  if (c === "happy") act(host, "cheer", 1900); else if (c === "huh") act(host, "shrug");
}
// what M says shows in a small bubble over its head; "live" ones stay until replaced, others fade after a while
function status(t, live) {
  const b = $("mStatus"); clearTimeout(status.t);
  if (!t || mOpen) { b.hidden = true; return; }
  b.textContent = t; b.classList.toggle("live", !!live); b.hidden = false;
  if (!live) status.t = setTimeout(() => { b.hidden = true; }, 2600);
}

// ---------------------------------------------------------------- 小M ⇄ chat
// Tap 小M: it jumps up into the top of the chat as the chat grows out of the spot where it stood.
// Close: the chat shrinks back into that spot and 小M lands there again. ⌘K / Ctrl+K does the same; Esc closes.
let mOpen = false, mAnim = null;
function showM() {
  const b = MBTN; if (!b.hidden) return; b.hidden = false; perch();
  if (!STILL) b.animate([{ transform: "translateY(40px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.34,1.4,.64,1)" });
}
function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
function openM(text) {
  if (mOpen) { if (text != null) setInput(text); $("aiIn").focus(); return; }
  mOpen = true; fx("open"); status(""); fanHide(true);
  if (mAnim) { mAnim.forEach(a => a.cancel()); mAnim = null; }
  const b = MBTN, p = $("mPanel"), from = centerOf(b);
  anchorPanel(); p.hidden = false; b.setAttribute("aria-expanded", "true"); document.body.classList.add("m-open");
  drawChat(); if (text != null) setInput(text);
  const pr = p.getBoundingClientRect(), av = centerOf($("mpAv")), cx = from.x - pr.left, cy = from.y - pr.top;
  if (mAnim) mAnim.forEach(a => a.cancel());
  if (STILL) { b.style.visibility = "hidden"; $("mpAv").style.visibility = ""; $("aiIn").focus(); return; }
  $("mpAv").style.visibility = "hidden";
  const big = Math.hypot(Math.max(cx, pr.width - cx), Math.max(cy, pr.height - cy)), ph = phoneW();
  mAnim = [
    // phone: grows out of 小M with transform + opacity only (drawn by the GPU, no repaint of the whole screen each frame)
    ph ? p.animate([{ transform: "scale(.12)", opacity: 0, borderRadius: "40px", transformOrigin: `${cx}px ${cy}px` }, { transform: "none", opacity: 1, borderRadius: "0px", transformOrigin: `${cx}px ${cy}px` }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" })
      : p.animate([{ clipPath: `circle(${from.w / 2}px at ${cx}px ${cy}px)` }, { clipPath: `circle(${big}px at ${cx}px ${cy}px)` }], { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" }),
    p.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 220, easing: "ease-out" }),
    // 小M hops in an arc up into the chat's header and shrinks to the size of the avatar there
    b.animate([{ transform: "none" },
      { transform: `translate(${(av.x - from.x) * .45}px, ${(av.y - from.y) * .5 - 40}px) scale(${(av.w / from.w + 1) / 2})`, offset: .55 },
      { transform: `translate(${av.x - from.x}px, ${av.y - from.y}px) scale(${av.w / from.w})` }], { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)" })
  ];
  mAnim[2].onfinish = () => { b.style.visibility = "hidden"; $("mpAv").style.visibility = ""; act($("mpAv"), "land", 450); };
  if (!phoneW()) setTimeout(() => $("aiIn").focus({ preventScroll: true }), 120);   // phone: the keyboard comes up when you tap the box, not mid-animation
}
function closeM(now) {
  if (!mOpen) return;
  mOpen = false; fx("close"); $("mpHist").hidden = true; $("histBtn").setAttribute("aria-expanded", "false");
  const b = MBTN, p = $("mPanel");
  b.setAttribute("aria-expanded", "false"); document.body.classList.remove("m-open");
  if (mAnim) mAnim.forEach(a => a.cancel());
  if (now || STILL || p.hidden) { p.hidden = true; b.style.visibility = ""; return; }
  b.style.visibility = ""; const to = centerOf(b), av = centerOf($("mpAv")), pr = p.getBoundingClientRect(), cx = to.x - pr.left, cy = to.y - pr.top;
  const big = Math.hypot(Math.max(cx, pr.width - cx), Math.max(cy, pr.height - cy));
  $("mpAv").style.visibility = "hidden";
  mAnim = [
    phoneW() ? p.animate([{ transform: "none", opacity: 1, transformOrigin: `${cx}px ${cy}px` }, { transform: "scale(.12)", opacity: 0, borderRadius: "40px", transformOrigin: `${cx}px ${cy}px` }], { duration: 320, easing: "cubic-bezier(.5,0,.75,0)" })
      : p.animate([{ clipPath: `circle(${big}px at ${cx}px ${cy}px)`, opacity: 1 }, { clipPath: `circle(${to.w / 2}px at ${cx}px ${cy}px)`, opacity: .3 }], { duration: 360, easing: "cubic-bezier(.5,0,.75,0)" }),
    b.animate([{ transform: `translate(${av.x - to.x}px, ${av.y - to.y}px) scale(${av.w / to.w})` },
      { transform: `translate(${(av.x - to.x) * .5}px, ${(av.y - to.y) * .5 - 30}px) scale(.8)`, offset: .5 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.3,.7,.3,1)" })
  ];
  mAnim[0].onfinish = () => { p.hidden = true; $("mpAv").style.visibility = ""; };
  mAnim[1].onfinish = () => { act($("mSvg"), "land", 450); perch(); };
}
// Tap 小M: he does one of five little things (never the same twice in a row). Point at him (or tap, on a phone) and three
// choices fan out beside him: Ask M (the chat), Add backup (a new job, step by step), Add calendar (a new shoot).
const TRICKS = [["t-ha", "ok", 1500], ["t-spin", "nav", 1400], ["t-shy", "toggle", 1600], ["t-sneeze", "err", 1500], ["cheer", "pin", 1900]];
let lastTrick = -1;
function trick() {
  let i; do { i = Math.floor(Math.random() * TRICKS.length); } while (i === lastTrick && TRICKS.length > 1); lastTrick = i;
  const [name, sound, ms] = TRICKS[i]; act($("mSvg"), name, ms); fx(sound);
}
MBTN.addEventListener("click", e => {
  e.preventDefault();   // he may stand inside a card that is a link: tapping him never follows it
  if (e.detail === 0) { openM(); return; }   // keyboard: Enter / Space opens the chat as before
  trick(); if (!matchMedia("(hover: hover)").matches) fanShow(); });
const fan = document.createElement("div"); fan.className = "m-fan"; fan.id = "mFan"; fan.hidden = true; fan.setAttribute("role", "menu");
fan.innerHTML = [["ask", "Ask M", '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>'],
  ["job", "Add backup", '<path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/>'],
  ["shoot", "Add calendar", '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/>']]
  .map(([f, t, d], i) => `<button type="button" role="menuitem" data-f="${f}" aria-label="${t}" style="--i:${i}"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg></button>`).join("");
document.body.appendChild(fan);
let fanT = 0;
// the three buttons open in a ring round 小M, on the side that has room (towards the middle of the screen)
function fanShow() {
  clearTimeout(fanT); const b = MBTN; if (mOpen || b.hidden) return;
  const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 + (phoneW() ? 28 : 30);
  const a0 = Math.atan2(innerHeight * .45 - cy, innerWidth / 2 - cx), step = phoneW() ? .78 : .74;
  fan.style.left = cx + "px"; fan.style.top = cy + "px"; fan.sy = $("views").scrollTop;
  fan.querySelectorAll("button").forEach((x, i) => { const a = a0 + (i - 1) * step; x.style.setProperty("--x", Math.cos(a) * R + "px"); x.style.setProperty("--y", Math.sin(a) * R + "px"); x.classList.toggle("tip-l", Math.cos(a) < -.3); });
  if (fan.hidden) { fan.hidden = false; fan.classList.remove("in", "out"); void fan.offsetWidth; fan.classList.add("in"); }
  if (!matchMedia("(hover: hover)").matches) fanT = setTimeout(fanHide, 4500);
}
function fanHide(now) { clearTimeout(fanT); if (fan.hidden) return; if (now || STILL) { fan.hidden = true; return; } fan.classList.add("out"); fanT = setTimeout(() => { fan.hidden = true; fan.classList.remove("out"); }, 200); }
const fanLater = () => { clearTimeout(fanT); fanT = setTimeout(fanHide, 280); };
MBTN.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") fanShow(); });
MBTN.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") fanLater(); });
fan.addEventListener("pointerenter", () => clearTimeout(fanT));
fan.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") fanLater(); });
fan.addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b) return; fanHide(true);
  if (b.dataset.f === "ask") openM();
  else if (b.dataset.f === "job") newJob();
  else openShoot({ dates: route.name === "calendar" && selDay ? selDay : ymd(new Date()) });
});
$("views").addEventListener("scroll", () => { if (Math.abs($("views").scrollTop - (fan.sy || 0)) > 8) fanHide(true); }, { passive: true });   // the circle stays put on 小M; a real scroll closes it
document.addEventListener("pointerdown", e => { if (!fan.hidden && !fan.contains(e.target) && !MBTN.contains(e.target)) fanHide(); }, true);
// 小M stands on the page, as on the Backup page: on the top edge of its main panel (the graph, the calendar, the Backup
// strip, the team cards, the list, the job). When you go to another page he hops over and lands on its panel.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const phoneW = () => window.innerWidth < 900;
const PERCH = { home: ["#monitor"], calendar: [".cal-box", true], backup: ["#bkHero"], team: ["#teamGrid"], list: ["#listRows"], job: ["#v-job .facts"], settings: ["#v-settings .card"] };
const seat = document.createElement("div"); seat.className = "m-seat";
// on a page of cards (Team, Drives) he has a card to stand on at a time: the one in view; scrolled out of sight, he blinks
// to the next card, and back to the first when you go back to the top
// stations: as you scroll, he blinks from panel to panel so he is always in view. Team and Drives are all cards (the first
// card is his first spot); on the other pages his first spot is the page's own (PERCH), then the panels and rows below it.
const PHONE = matchMedia("(max-width: 899px)");
const STATIONS = { team: "#teamGrid > .tm", drives: "#listRows .drive-card" };
const SCROLL = { calendar: "#day", backup: "#bkList .bk-row", settings: "#v-settings .card", job: "#v-job .facts ~ *, #v-job .bk-row",
  list: "#listRows .bk-row, #listRows .drive-card, #listRows .row" };
const stationSel = () => STATIONS[shownView === "list" ? route.name : shownView];
function stationEls() {   // every spot on this page, in order; [0] is his first one
  const sel = stationSel(); if (sel) return [...document.querySelectorAll(sel)].filter(e => e.offsetParent);
  const w = PERCH[shownView], s = SCROLL[shownView]; if (!w || !s) return [];
  const first = document.querySelector(w[0]); return [first, ...[...document.querySelectorAll(s)].filter(e => e.offsetParent && e !== first && !e.contains(first))].filter(Boolean);
}
function perchWant() {
  const sel = stationSel();
  if (sel) { const els = stationEls(); if (els.length) { perch.st = clamp(perch.st || 0, 0, els.length - 1); return [els[perch.st], true, true]; } }
  if (perch.st > 0) { const els = stationEls(); if (els[perch.st]) return [els[perch.st], true, true]; perch.st = 0; }
  const w = PERCH[shownView]; return w && [document.querySelector(w[0]), w[1]];
}
function perch(from, how) {
  const b = MBTN; if (!b.isConnected) document.body.appendChild(b);
  if (b.hidden || mOpen) return;
  if (b.getAnimations().some(a => a.playState === "running") && !from) return;   // mid-jump: a redraw doesn't move him
  // a pop-up is open: he sits on its top edge
  const sc = document.querySelector(".scrim:not([hidden])");
  if (sc && !sc._closing) { const sh = sc.querySelector(".sheet"); seat.remove(); if (b.parentElement !== document.body) document.body.appendChild(b);
    b.classList.remove("perched"); b.classList.add("on-sheet"); b.style.right = ""; sitOn(b, sh);
    const to = b.getBoundingClientRect(); if (from && from.width && !STILL) hop(b, from, to, true); return; }
  b.classList.remove("on-sheet"); b.style.left = b.style.top = "";
  document.querySelectorAll(".m-host").forEach(e => e.classList.remove("m-host"));
  // Home: no panel to stand on; he floats inside the graph, weightless
  const mon = shownView === "home" && $("monitor");
  if (mon && mon.offsetParent) { seat.remove(); b.classList.remove("perched"); b.style.right = ""; space.on(b, mon);
    const to = b.getBoundingClientRect(); if (from && from.width && !STILL) (how === "hop" ? hop : blink)(b, from, to); return; }
  space.off(b);
  b.classList.remove("docked"); b.style.bottom = "";
  // phone, scrolled down: he sits on the top edge of the tab bar at the bottom until you are back at the top
  if (perch.dock && PHONE.matches && $("tabs").offsetParent) { seat.remove(); if (b.parentElement !== document.body) document.body.appendChild(b);
    b.classList.remove("perched"); b.classList.add("docked"); b.style.right = "";
    b.style.bottom = Math.round(innerHeight - $("tabs").getBoundingClientRect().top - 4) + "px";
    const to = b.getBoundingClientRect(); if (from && from.width && !STILL && (Math.abs(from.left - to.left) > 2 || Math.abs(from.top - to.top) > 2)) (how === "hop" ? hop : blink)(b, from, to); return; }
  const want = perchWant(), t = want && want[0];
  const ok = t && t.offsetParent && t.getBoundingClientRect().height > 30;
  if (ok && want[2]) t.classList.add("m-host");
  if (ok) {
    if (want[1]) { if (seat.parentElement !== t || t.firstChild !== seat) t.prepend(seat); seat.style.marginBottom = ""; }
    else if (t.previousElementSibling !== seat) { t.before(seat); }
    if (!want[1]) { const g = parseFloat(getComputedStyle(t.parentElement).rowGap) || 0; seat.style.marginBottom = -g + "px"; }
    if (b.parentElement !== seat) seat.appendChild(b);
    b.classList.add("perched"); fitPerch(b, !!want[1], !!want[2]);
  } else { if (b.parentElement !== document.body) document.body.appendChild(b); b.classList.remove("perched"); b.style.right = ""; seat.remove(); }
  // the hop: up off the old spot, an arc through the air with a motion blur that follows his speed, a squash on landing
  const to = b.getBoundingClientRect();
  if (from && from.width && !STILL && (Math.abs(from.left - to.left) > 2 || Math.abs(from.top - to.top) > 2)) (how === "hop" ? hop : blink)(b, from, to);
}
// 小M in space (Home). He drifts where he rests, slowly turning, as if there were no up or down. Turn the graph and the
// turning sweeps him along; he swims back against it to the front of the screen, coming closer (bigger) as he does,
// leaning into each stroke. Let go and he drifts back to his spot. Moves only through translate / rotate / scale, so the
// jump-in and blink animations (which use transform) still play on top.
const space = (() => {
  let b = null, mon = null, raf = 0, last = 0, W = 0, H = 0, rest = { x: 0, y: 0 };
  const p = { x: 0, y: 0 }, v = { x: 0, y: 0 }; let sc = 1, rot = 0, face = 1, pull = 0, ptr = null, relAt = -1e9, sw = false;
  const size = () => { const r = mon.getBoundingClientRect(); W = r.width; H = r.height; const w = b.offsetWidth;
    rest = { x: W - w - (W < 600 ? 18 : 42), y: H * (W < 600 ? .5 : .56) - w / 2 }; };
  const down = e => { if (e.target.closest(".mbtn, button, a")) return; ptr = { id: e.pointerId, x: e.clientX, y: e.clientY }; pull = 1; };
  const move = e => { if (!ptr || e.pointerId !== ptr.id) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
    v.x += dx * .9; v.y += dy * .55; };   // the graph turns with the finger and carries him with it
  const up = e => { if (ptr && e.pointerId === ptr.id) { ptr = null; relAt = performance.now(); } };
  const ro = window.ResizeObserver ? new ResizeObserver(() => b && size()) : null;
  function tick(now) {
    raf = requestAnimationFrame(tick); const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; if (!dt) return;
    if (b.getAnimations().some(a => a.playState === "running")) return;   // let a blink finish first
    const t = now / 1000, w = b.offsetWidth, chase = ptr || now - relAt < 1400;
    // where he wants to be: in front of you while you turn the graph, his own spot otherwise, with a slow drift around it
    const tx = chase ? W / 2 - w / 2 : rest.x + Math.sin(t * .31) * 10 + Math.sin(t * .17 + 1) * 6,
          ty = chase ? H * .52 - w / 2 : rest.y + Math.sin(t * .23 + 2) * 12;
    const ax = tx - p.x, ay = ty - p.y, d = Math.hypot(ax, ay) || 1;
    // swimming = a steady push towards the target in strokes; drifting = a soft spring with almost no friction
    if (chase) { const stroke = .55 + .45 * Math.max(0, Math.sin(t * 9)); const f = Math.min(1, d / 40) * 900 * stroke; v.x += ax / d * f * dt; v.y += ay / d * f * dt; }
    else { v.x += ax * 1.1 * dt; v.y += ay * 1.1 * dt; }
    const damp = Math.pow(chase ? .12 : .35, dt); v.x *= damp; v.y *= damp;
    p.x += v.x * dt; p.y += v.y * dt;
    // soft walls: he bumps off the edges of the screen instead of leaving it
    const mx = W - w * .7, my = H - w * .8;
    if (p.x < -w * .3) { p.x = -w * .3; v.x = Math.abs(v.x) * .5; } if (p.x > mx) { p.x = mx; v.x = -Math.abs(v.x) * .5; }
    if (p.y < -w * .1) { p.y = -w * .1; v.y = Math.abs(v.y) * .5; } if (p.y > my) { p.y = my; v.y = -Math.abs(v.y) * .5; }
    const speed = Math.hypot(v.x, v.y), swim = chase && (speed > 30 || d > 24);
    if (swim !== sw) { sw = swim; b.classList.toggle("swim", swim); }
    if (Math.abs(v.x) > 40) face = v.x < 0 ? -1 : 1;
    const wantRot = swim ? Math.max(-55, Math.min(55, (v.x / (speed || 1)) * 50 + (v.y / (speed || 1)) * 12 * face)) : Math.sin(t * .4) * 9 + v.x * .02;
    rot += (wantRot - rot) * Math.min(1, dt * (swim ? 6 : 1.6));
    sc += ((chase ? 1.32 : 1) - sc) * Math.min(1, dt * 1.8);
    b.style.translate = p.x.toFixed(1) + "px " + p.y.toFixed(1) + "px"; b.style.rotate = rot.toFixed(2) + "deg";
    b.style.scale = (swim ? face : 1) * sc + " " + sc;
  }
  return {
    on(el, m) {
      if (b === el && mon === m && el.classList.contains("space")) return;
      b = el; mon = m; if (b.parentElement !== mon) mon.appendChild(b); b.classList.add("space"); size();
      p.x = rest.x; p.y = rest.y; v.x = v.y = 0; sc = 1; rot = 0; ptr = null;
      b.style.translate = p.x + "px " + p.y + "px"; b.style.rotate = "0deg"; b.style.scale = "1";
      mon.addEventListener("pointerdown", down); addEventListener("pointermove", move, { passive: true }); addEventListener("pointerup", up); addEventListener("pointercancel", up);
      if (ro) ro.observe(mon);
      if (!STILL && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    },
    off(el) {
      if (!b) return; cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect();
      mon.removeEventListener("pointerdown", down); removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      el.classList.remove("space", "swim"); el.style.translate = el.style.rotate = el.style.scale = ""; sw = false; b = null;
    }
  };
})();
document.addEventListener("visibilitychange", () => { const b = MBTN; if (b.classList.contains("space")) { if (document.hidden) space.off(b); else perch(); } });
// sitting on a pop-up's top edge, at its right; he follows the edge as the pop-up grows or the keyboard moves it
let sitRO = null;
function sitOn(b, sh) {
  const put = () => { if (!b.classList.contains("on-sheet")) return; const r = sh.getBoundingClientRect(), w = b.offsetWidth;
    b.style.left = Math.round(Math.min(innerWidth - w - 8, r.right - w - 22)) + "px"; b.style.top = Math.round(r.top - w * .72) + "px"; };
  put(); if (sitRO) sitRO.disconnect(); if (window.ResizeObserver) { sitRO = new ResizeObserver(put); sitRO.observe(sh); }
  if (window.visualViewport && !sitOn.vv) { sitOn.vv = true; visualViewport.addEventListener("resize", () => { const s = document.querySelector(".scrim:not([hidden]) > .sheet"); if (s && b.classList.contains("on-sheet")) sitOn(b, s); }); }
}
// on Team / Drives: when his card is almost out of sight he blinks to the next card in view; quickly back at the top, to the first
let stT = 0, lastY = 0;
$("views").addEventListener("scroll", () => { if (stT || shownView === "home") return; stT = requestAnimationFrame(() => { stT = 0;
  const b = MBTN; if (b.hidden || mOpen || b.getAnimations().some(a => a.playState === "running")) return;
  if (PHONE.matches) {   // phone: scroll down and he blinks onto the tab bar; back at the top, onto the page again
    const y = $("views").scrollTop, dn = y > lastY; lastY = y;
    if (y < 40 && perch.dock) { perch.dock = false; perch.st = 0; perch(b.getBoundingClientRect()); }
    else if (y > 80 && dn && !perch.dock && b.classList.contains("perched")) { perch.dock = true; perch(b.getBoundingClientRect()); }
    return; }
  if (!b.classList.contains("perched")) return;
  const els = stationEls(); if (els.length < 2) return;
  const vr = $("views").getBoundingClientRect(), br = b.getBoundingClientRect(), cur = Math.min(perch.st || 0, els.length - 1);
  let next = cur;
  if ($("views").scrollTop < 40) next = 0;
  else if (br.bottom < vr.top + 26 || br.top > vr.bottom - 20) {   // gone from sight: the first spot whose top edge is in view
    const i = els.findIndex(e => { const t = e.getBoundingClientRect().top; return t > vr.top + 70 && t < vr.bottom - 90; });
    next = i < 0 ? cur : i; }
  if (next !== cur && Math.abs(els[next].getBoundingClientRect().top - els[cur].getBoundingClientRect().top) > 4) { perch.st = next; perch(br); }
}); }, { passive: true });
// where on the panel's edge he stands: clear of buttons and tabs right above it (tries spots from the right towards the left),
// and with room above him inside the scrolling page so his head is never cut off
function fitPerch(b, inside, station) {
  seat.style.height = ""; b.style.right = ""; if (fitPerch.pushed) { fitPerch.pushed.style.marginTop = fitPerch.pushed.style.paddingTop = ""; fitPerch.pushed = null; }
  if (station) {   // a card of his own: he stands at its right end; the first card gets room above it so his head isn't cut off
    // on a job row he stands over the quiet middle, clear of the row above's tags, drive and Back up
    // on a job row he looks along its top edge for the spot that hides least of the row above (its name, tags, drive, Back up)
    const host = seat.parentElement;
    if (host.matches(".bk-row, .row")) {
      const prev = host.previousElementSibling, hr = host.getBoundingClientRect();
      const things = prev && !prev.classList.contains("bk-th") ? [...prev.querySelectorAll("b, .mr, .md, .bk-drv > *, .bk-more, .bk-when, .bk-no, .bk-parts li, span, a, button")].filter(x => x.offsetParent && !x.children.length || x.matches("button, a, .md"))
        .map(x => x.getBoundingClientRect()).filter(q => q.width && q.bottom > hr.top - b.offsetHeight) : [];
      const cover = () => { const r = b.getBoundingClientRect(), L = r.left + 8, R = r.right - 8, T = r.top + 6, B = r.bottom - 4;
        return things.reduce((a, q) => a + Math.max(0, Math.min(R, q.right) - Math.max(L, q.left)) * Math.max(0, Math.min(B, q.bottom) - Math.max(T, q.top)), 0); };
      let best = 8, least = Infinity;
      for (let c = 8; c < hr.width - b.offsetWidth - 4; c += 10) { b.style.right = c + "px"; const k = cover(); if (k < least - 1) { least = k; best = c; } if (!k) break; }
      b.style.right = best + "px";
    }
    const views = $("views"), top = b.getBoundingClientRect().top - views.getBoundingClientRect().top + views.scrollTop;
    if (top < 6) { const g = seat.parentElement.parentElement; g.style.paddingTop = (6 - top) + "px"; fitPerch.pushed = g; }
    return; }
  const views = $("views"), vr = views.getBoundingClientRect(), host = seat.parentElement, hr = host.getBoundingClientRect();
  // stand over the panel's own content: on a wide grid (team cards) that is the right end of its first row, not the empty space
  let edge = hr.right;
  if (!inside && want1Row(seat.nextElementSibling)) { const kids = [...seat.nextElementSibling.children].filter(k => k.offsetParent);
    if (kids.length) { const top = kids[0].getBoundingClientRect().top; edge = Math.max(...kids.filter(k => Math.abs(k.getBoundingClientRect().top - top) < 4).map(k => k.getBoundingClientRect().right)); } }
  const base = (parseFloat(getComputedStyle(b).right) || 10) + Math.max(0, hr.right - edge);
  // things he must not stand on: buttons, tabs, fields and headings of this page (by their boxes, so it works mid page-change too)
  const page = document.querySelector("#v-" + shownView) || document.body;
  const edgeTop = (inside ? host : seat.nextElementSibling || host).getBoundingClientRect().top;   // what he stands on is below his feet: only what is above the edge counts
  const lines = el => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()]; };
  const things = [...page.querySelectorAll("button, a[href], input, select, textarea, [role=tab], .btn, .fchip")].filter(x => !b.contains(x) && x.offsetParent).map(x => x.getBoundingClientRect())
    .concat([...page.querySelectorAll("h1, h2, h3, p, .lead")].filter(x => !b.contains(x) && x.offsetParent).flatMap(lines)).filter(q => q.top < edgeTop - 2);
  const busy = () => { const r = b.getBoundingClientRect(), L = r.left + 6, R = r.right - 6, T = r.top, B = r.bottom - 4;
    return things.some(q => q.width && q.left < R && q.right > L && q.top < B && q.bottom > T); };
  let pick = null;
  for (let c = base; c < hr.width - b.offsetWidth - 4; c += 14) { b.style.right = c + "px"; if (!busy()) { pick = c; break; } }
  b.style.right = (pick == null ? base : pick) + "px";
  // nowhere free along the edge (a full row of buttons right above it): open a gap above the panel just tall enough for him
  let push = 0;
  if (pick == null) { const r = b.getBoundingClientRect(); push = Math.max(0, ...things.filter(q => q.left < r.right - 6 && q.right > r.left + 6 && q.top < r.bottom).map(q => q.bottom - r.top + 4)); }
  if (!inside) { const top = b.getBoundingClientRect().top - vr.top + views.scrollTop; push = Math.max(push, 6 - top); }
  if (push > 0) { if (inside) { host.style.marginTop = push + "px"; fitPerch.pushed = host; } else seat.style.height = push + "px"; }
}
const want1Row = el => el && /grid|flex/.test(getComputedStyle(el).display) && el.children.length > 1;
// 闪现, the blink: at the old spot he jumps, spins and bursts into paper letters and is gone; at the new spot paper letters
// burst, he springs out of them and lands with a bounce. The old spot is played by a copy of him, so the page never waits.
function blink(b, from, to) {
  const ghost = b.cloneNode(true); ghost.removeAttribute("id"); ghost.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
  ghost.className = "mbtn m-ghost"; ghost.setAttribute("aria-hidden", "true"); ghost.tabIndex = -1;
  Object.assign(ghost.style, { position: "fixed", left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", right: "auto", bottom: "auto", margin: 0, zIndex: 40, pointerEvents: "none", viewTransitionName: "none" });
  document.body.appendChild(ghost);
  ghost.animate([
    { transform: "none" },
    { transform: "translateY(4px) scale(1.12, .86)", offset: .14 },
    { transform: "translateY(-34px) scale(.92, 1.1) rotate(0)", offset: .42 },
    { transform: "translateY(-40px) scale(.6) rotate(320deg)", opacity: 1, offset: .74 },
    { transform: "translateY(-42px) scale(0) rotate(540deg)", opacity: 0 }
  ], { duration: 520, easing: "cubic-bezier(.3,.6,.4,1)", fill: "forwards" }).onfinish = () => ghost.remove();
  setTimeout(() => paperBurst(from.left + from.width / 2, from.top + from.height / 2 - 38), 360);
  // the new spot: a burst, then he springs out and lands
  const IN = 470;
  b.animate([{ opacity: 0 }, { opacity: 0 }], { duration: IN, fill: "backwards" });
  setTimeout(() => { const r = b.getBoundingClientRect(); paperBurst(r.left + r.width / 2, r.top + r.height / 2 - 10, true); }, IN - 120);
  b.animate([
    { transform: "translateY(-46px) scale(0) rotate(-200deg)", opacity: 0 },
    { transform: "translateY(-58px) scale(1.08, 1.12) rotate(0)", opacity: 1, offset: .38 },
    { transform: "translateY(0) scale(1.24, .76)", offset: .66 },
    { transform: "translateY(-12px) scale(.94, 1.08)", offset: .8 },
    { transform: "translateY(0) scale(1.06, .95)", offset: .92 },
    { transform: "none", opacity: 1 }
  ], { duration: 640, delay: IN, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" }).onfinish = () => { act($("mSvg"), "land", 450); fx("drag"); };
  fx("pin");
}
// shredded paper: torn scraps of every shape, thrown out (or sucked in), then fluttering down and turning over as they fall
const SHRED = ["polygon(0 8%,100% 0,92% 100%,6% 88%)", "polygon(10% 0,100% 18%,80% 100%,0 70%)", "polygon(0 0,100% 30%,70% 100%)", "polygon(0 20%,60% 0,100% 60%,40% 100%)",
  "polygon(0 0,100% 0,100% 40%,85% 55%,100% 70%,100% 100%,0 100%)", "polygon(5% 10%,95% 0,100% 90%,0 100%)"];
function paperBurst(x, y, inward) {
  const wrap = document.createElement("div"); wrap.className = "paper-burst"; wrap.style.left = x + "px"; wrap.style.top = y + "px"; document.body.appendChild(wrap);
  const n = 30;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"), a = (i / n) * Math.PI * 2 + Math.random() * .5, d = 26 + Math.random() * 62;
    const w = 3 + Math.random() * 8, h = w * (.6 + Math.random() * 1.8);   // strips and flakes
    p.className = "pb" + (i % 4 === 0 ? " o" : i % 5 === 0 ? " g" : "");
    p.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;margin:${(-h / 2).toFixed(1)}px 0 0 ${(-w / 2).toFixed(1)}px;clip-path:${SHRED[i % SHRED.length]}`;
    wrap.appendChild(p);
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d * .8 - 18, r = (Math.random() - .5) * 720, fl = 360 + Math.random() * 540, fall = 40 + Math.random() * 40, sway = (Math.random() - .5) * 30;
    const k = inward ? [[dx * 1.3, dy * 1.3], [0, 0]] : [[0, 0], [dx, dy]];
    p.animate([
      { transform: `translate(${k[0][0]}px, ${k[0][1]}px) rotate(0) rotateX(0) scale(${inward ? .7 : .4})`, opacity: inward ? 0 : 1 },
      { transform: `translate(${k[1][0]}px, ${k[1][1]}px) rotate(${r * .5}deg) rotateX(${fl * .3}deg) scale(1)`, opacity: 1, offset: .35 },
      { transform: `translate(${k[1][0] + sway}px, ${k[1][1] + fall * .5}px) rotate(${r * .8}deg) rotateX(${fl * .65}deg) rotateY(90deg) scale(1)`, opacity: 1, offset: .65 },
      { transform: `translate(${k[1][0] - sway * .5}px, ${k[1][1] + fall}px) rotate(${r}deg) rotateX(${fl}deg) rotateY(180deg) scale(.9)`, opacity: 0 }
    ], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.15,.7,.35,1)", fill: "forwards" });
  }
  setTimeout(() => wrap.remove(), 1400);
}
function hop(b, from, to) {
  const dx = from.left - to.left, dy = from.top - to.top, up = Math.min(-70, Math.min(dy, 0) - 60), tilt = dx > 0 ? -10 : 10;
  const k = Math.min(1.6, Math.hypot(dx, dy) / 260 + .5);   // longer jumps blur and stretch a little more
  b.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(1.08, .88)`, filter: "blur(0)", offset: 0 },
    { transform: `translate(${dx}px, ${dy - 8}px) scale(.9, 1.14)`, filter: `blur(${.6 * k}px)`, offset: .12 },
    { transform: `translate(${dx * .5}px, ${dy * .55 + up}px) rotate(${tilt}deg) scale(.94, 1.08)`, filter: `blur(${1.8 * k}px)`, offset: .48 },
    { transform: `translate(${dx * .08}px, ${dy * .1 - 18}px) rotate(${-tilt * .3}deg) scale(.92, 1.12)`, filter: `blur(${1.1 * k}px)`, offset: .82 },
    { transform: "translate(0, 0) scale(1.16, .84)", filter: "blur(0)", offset: .92 },
    { transform: "none", filter: "blur(0)", offset: 1 }
  ], { duration: 640, easing: "cubic-bezier(.33,.0,.25,1)" }).onfinish = () => { act($("mSvg"), "land", 450); fx("drag"); };
}
// on a wide screen the chat opens on 小M's side of the screen, or where you last dragged it (by its top bar)
let mpPos = store.get("mpPos", null);
function anchorPanel() {
  const p = $("mPanel");
  if (!phoneW() && mpPos) { const w = p.offsetWidth || 420, h = p.offsetHeight || 600;
    p.style.right = p.style.bottom = "auto"; p.style.left = clamp(mpPos.x * innerWidth, 8, Math.max(8, innerWidth - w - 8)) + "px"; p.style.top = clamp(mpPos.y * innerHeight, 8, Math.max(8, innerHeight - h - 8)) + "px"; return; }
  p.style.left = p.style.right = p.style.top = p.style.bottom = "";
}
addEventListener("resize", () => { if (mOpen) anchorPanel(); });
MBTN.addEventListener("dblclick", e => e.preventDefault());
$("mClose").addEventListener("click", () => closeM());
(() => {
  const p = $("mPanel"), h = p.querySelector(".mp-head"); let st = null;
  h.addEventListener("pointerdown", e => { if (phoneW() || e.button || e.target.closest("input")) return; const r = p.getBoundingClientRect(); st = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, on: false, x: e.clientX, y: e.clientY }; });
  h.addEventListener("pointermove", e => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.on) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 4) return; st.on = true; h.setPointerCapture(e.pointerId); p.classList.add("moving"); if (mAnim) mAnim.forEach(a => a.finish()); }
    p.style.right = p.style.bottom = "auto";
    p.style.left = clamp(e.clientX - st.dx, 8, innerWidth - p.offsetWidth - 8) + "px"; p.style.top = clamp(e.clientY - st.dy, 8, innerHeight - p.offsetHeight - 8) + "px";
  });
  const end = e => { if (!st || e.pointerId !== st.id) return; const was = st.on; st = null; if (!was) return; p.classList.remove("moving");
    h._moved = true; setTimeout(() => { h._moved = false; }, 300); const r = p.getBoundingClientRect(); mpPos = { x: r.left / innerWidth, y: r.top / innerHeight }; store.set("mpPos", mpPos); fx("drag"); };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
  h.addEventListener("click", e => { if (h._moved) { h._moved = false; e.stopPropagation(); e.preventDefault(); } }, true);   // a drag that started on a button doesn't press it
  h.addEventListener("dblclick", e => { if (e.target.closest("button")) return; mpPos = null; store.set("mpPos", null); anchorPanel(); });   // double-click the bar: back to its usual place
})();
document.addEventListener("keydown", e => {
  if (!session) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); mOpen ? closeM() : openM(); return; }
  if (e.key === "Escape") {
    if (!$("jobScrim").hidden) { if (!$("jfCfm").hidden) $("jfCfmNo").click(); else closeJob(); return; }
    if (!$("chkScrim").hidden) { closeChk(); return; }
    if (!$("shootScrim").hidden) { closeShoot(); return; }
    if (mOpen) { closeM(); MBTN.focus(); return; }
    if (graph && graph.pinned) graph.pin(null);
  }
});
function setInput(t) { $("aiIn").value = t; grow(); drawHits(); }

// ---- instant matches while you type: drives, editors, jobs, shoots. Click (or ↑↓ + Enter) to go there.
let hits = [], hitI = -1;
function drawHits() {
  const q = $("aiIn").value.trim(), lq = q.toLowerCase();
  hits = [];
  if (q.length >= 2 && !/^add a shoot/i.test(q)) {
    const has = s => String(s || "").toLowerCase().includes(lq);
    yearsAll().reverse().flatMap(drivesIn).filter(d => has(d.name)).slice(0, 3).forEach(d => hits.push({ kind: "drive", label: dName(d.name), sub: `${d.n} jobs${d.un ? ", " + d.un + " not backed up" : ""}`, href: "#/drive/" + encodeURIComponent(d.name) }));
    team.filter(has).forEach(n => hits.push({ kind: "editor", label: n, sub: "Editor", href: "#/editor/" + encodeURIComponent(n) }));
    findJobs(q, 5).forEach(r => hits.push({ kind: unbacked(r) ? "no" : "ok", label: r.name + (isPhotoSec(sectionOf(r)) ? " · Photo" : ""), sub: [r.drive, r.editor, fmtShort(r.date)].filter(Boolean).join(", "), href: "#/job/" + encodeURIComponent(r.id) }));
    shoots.filter(s => has(s.name) || has(s.location)).slice(0, 2).forEach(s => hits.push({ kind: "shoot", label: s.name, sub: datesOf(s).map(fmtDay).join(", "), href: "#/calendar/" + encodeURIComponent(datesOf(s)[0] || "") }));
    hits = hits.slice(0, 7);
  }
  hitI = -1;
  const h = $("hits");
  h.innerHTML = hits.map((x, i) => `<a class="hit" href="${esc(x.href)}" data-i="${i}" role="option"><span class="hub ${x.kind === "drive" ? "drive" : x.kind === "editor" ? "ed" : x.kind === "no" ? "red" : x.kind === "ok" ? "green" : "hollow"}">${x.kind === "editor" ? esc(initials(x.label)) : ""}</span><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></a>`).join("")
    + (hits.length ? `<p class="hits-foot">Enter asks M. ↑↓ picks a match.</p>` : "");
  h.hidden = !hits.length;
}
function markHit() { [...$("hits").querySelectorAll(".hit")].forEach((a, i) => a.classList.toggle("sel", i === hitI)); }
$("hits").addEventListener("click", e => { if (e.target.closest(".hit")) { setInput(""); if (innerWidth < 900) closeM(); } });

// ---- conversations: kept on this device (last 50), newest first
let chats = store.get("mChats", []), cur = null, streaming = null;
const saveChats = () => store.set("mChats", chats.slice(0, 50));
const MINI = () => `<span class="av">${face(false)}</span>`;
function newChat() { if (streaming) streaming.abort(); cur = null; drawChat(); $("mpHist").hidden = true; $("aiIn").focus(); }
function openChat(id) { if (streaming) streaming.abort(); cur = chats.find(c => c.id === id) || null; drawChat(); $("mpHist").hidden = true; $("histBtn").setAttribute("aria-expanded", "false"); }
function drawChat() {
  const msgs = cur ? cur.msgs : [];
  $("empty").hidden = msgs.length > 0;
  $("chat").innerHTML = "";
  msgs.forEach((m, i) => addMsg(m, i));
  scrollEnd(false);
}
function scrollEnd(smooth = true) { const t = $("thread"); t.scrollTo({ top: t.scrollHeight, behavior: smooth && !STILL ? "smooth" : "auto" }); }
function addMsg(m, i) {
  const d = document.createElement("div");
  if (m.role === "user") { d.className = "cm user"; d.textContent = m.content; }
  else { d.className = "cm bot"; d.innerHTML = MINI() + `<div class="md"></div>`; fillBot(d, m, i, false); }
  $("chat").appendChild(d); return d;
}
// the reply text, with the ```shoot block turned into a confirm card once it is complete
function fillBot(d, m, i, live) {
  const box = d.querySelector(".md"), sm = m.content.match(SHOOT_RE);
  const text = m.content.replace(SHOOT_RE, "").trim();
  box.innerHTML = m.error ? `<p class="err">${esc(m.error)}</p>` : text ? md(text) : live ? '<span class="dots3"><i></i><i></i><i></i></span>' : "";
  if (live && text) { const last = box.lastElementChild && box.lastElementChild.matches("ul,ol") ? box.lastElementChild.lastElementChild : box.lastElementChild || box; last.insertAdjacentHTML("beforeend", '<span class="caret"></span>'); }
  if (sm && (!live || sm[2])) {
    let o = null; try { o = JSON.parse(sm[1]); } catch (e) {}
    if (o) box.appendChild(confirmCard(cleanShoot(o), m, i));
  } else if (sm && live) box.insertAdjacentHTML("beforeend", '<p class="muted small">Preparing the card…</p>');
  if (m.error) { const b = document.createElement("div"); b.className = "actions"; b.style.justifyContent = "flex-start"; b.innerHTML = '<a class="btn ghost" href="#/settings">AI settings</a><button type="button" class="btn ghost">+ Shoot by hand</button>';
    b.children[1].onclick = () => openShoot({ dates: ymd(new Date()) }); box.appendChild(b); }
}
async function ask(text) {
  fx("send");
  if (rec) { const r = rec; rec = null; r.onend = null; r.abort(); $("micBtn").classList.remove("on"); }
  if (streaming) return;
  $("hits").hidden = true;
  if (!cur) { cur = { id: uid(), title: text.slice(0, 60), at: Date.now(), msgs: [] }; chats.unshift(cur); }
  cur.at = Date.now(); chats = [cur, ...chats.filter(c => c !== cur)];
  cur.msgs.push({ role: "user", content: text });
  const bot = { role: "assistant", content: "" }; cur.msgs.push(bot);
  $("empty").hidden = true;
  addMsg(cur.msgs[cur.msgs.length - 2]);
  const i = cur.msgs.length - 1, d = addMsg(bot, i); fillBot(d, bot, i, true); scrollEnd();
  mood("think"); setSending(true);
  const ctl = new AbortController(); streaming = ctl;
  try {
    const history = cur.msgs.slice(0, -1).slice(-12).map(m => ({ role: m.role, content: m.content }));
    await callModel([{ role: "system", content: aiSystem(text) }, ...history], t => {
      bot.content = t; fillBot(d, bot, i, true);
      const th = $("thread"); if (th.scrollHeight - th.scrollTop - th.clientHeight < 160) th.scrollTop = th.scrollHeight;
    }, ctl.signal);
    mood("happy");
  } catch (e) {
    if (e.name === "AbortError") { if (!bot.content) bot.content = "_Stopped._"; }
    else { bot.error = `Couldn't reach ${(AI_PROVIDERS[aiCfg().prov] || AI_PROVIDERS.custom).label} (${e.message}).`; mood("huh"); }
  }
  streaming = null; setSending(false);
  fillBot(d, bot, i, false); saveChats(); drawChats(); scrollEnd();
}
function setSending(on) { $("sendBtn").classList.toggle("stop", on); $("sendBtn").setAttribute("aria-label", on ? "Stop" : "Send"); }
function confirmCard(s, m, i) {
  const ds = datesOf(s), b = document.createElement("div"); b.className = "confirm";
  b.innerHTML = `<b>${esc(s.name || "New shoot")}</b><p class="muted small">${esc(ds.map(fmtDay).join(", ") || "Pick a date")}${s.location ? ", " + esc(s.location) : ""}. ${esc({ video: "Video", photo: "Photo", both: "Video and photo" }[s.type])}. ${esc(crewOf(s).join(", ") || "No crew yet")}.</p>` +
    (m.card ? `<p class="muted small done">${m.card}</p>` : `<div class="actions"><button type="button" class="btn" data-a="add">Add to Calendar</button><button type="button" class="btn ghost" data-a="edit">Edit</button><button type="button" class="btn ghost" data-a="no">Not now</button></div>`);
  const done = html => { m.card = html; saveChats(); const a = b.querySelector(".actions"); if (a) { a.outerHTML = `<p class="muted small done">${html}</p>`; } b.classList.add("ok"); };
  const added = saved => done(`Added to the Calendar. <a href="#/calendar/${esc(datesOf(saved)[0] || "")}">See ${esc(fmtDay(datesOf(saved)[0] || ""))}</a>`);
  b.addEventListener("click", async e => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === "no") return done("Not added.");
    if (a === "edit" || !s.name || !ds.length) return openShoot(s, added);
    e.target.disabled = true; e.target.classList.add("busy");
    const now = new Date().toISOString(), full = { ...s, id: uid(), jobId: "", createdBy: session.name, createdAt: now, updatedBy: session.name, updatedAt: now };
    try { await M.api("saveShoot", ["", full]); shoots.push(full); drawAll(); added(full); toast("Added to the Calendar"); halo(); buzz(); }
    catch (err) { e.target.disabled = false; e.target.classList.remove("busy"); toast(err.message); }
  });
  return b;
}
// past chats, inside the panel
function drawChats() {
  $("chatList").innerHTML = chats.length ? chats.map(c => `<div class="chat-item${cur && cur.id === c.id ? " on" : ""}" data-id="${esc(c.id)}"><button type="button"><b>${esc(c.title)}</b><span>${esc(new Date(c.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</span></button><button type="button" class="ibtn plain del" aria-label="Delete chat">✕</button></div>`).join("")
    : `<p class="muted small" style="padding:8px 10px">No chats yet.</p>`;
}
$("histBtn").addEventListener("click", () => { const h = $("mpHist"), open = h.hidden; drawChats(); h.hidden = !open; $("histBtn").setAttribute("aria-expanded", String(open)); });
$("newChat").addEventListener("click", newChat);
$("chatList").addEventListener("click", e => {
  const it = e.target.closest(".chat-item"); if (!it) return;
  if (e.target.closest(".del")) { chats = chats.filter(c => c.id !== it.dataset.id); if (cur && cur.id === it.dataset.id) { cur = null; drawChat(); } saveChats(); drawChats(); return; }
  openChat(it.dataset.id);
});
$("sugg").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (!b) return; const q = b.dataset.q; if (q.endsWith(": ")) { setInput(q); $("aiIn").focus(); } else ask(q); });
// composer: Enter sends (or opens the picked match), Shift+Enter new line, grows with the text
function grow() { const t = $("aiIn"); t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; }
$("aiIn").addEventListener("input", () => { grow(); drawHits(); });
$("aiIn").addEventListener("keydown", e => {
  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && hits.length) { e.preventDefault(); hitI = (hitI + (e.key === "ArrowDown" ? 1 : -1) + hits.length + 1) % (hits.length + 1) - 1; if (hitI < -1) hitI = hits.length - 1; markHit(); return; }
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (hitI >= 0 && hits[hitI]) { location.hash = hits[hitI].href; setInput(""); if (innerWidth < 900) closeM(); return; }
    $("aiForm").requestSubmit();
  }
});
// Voice: tap the mic to speak; what was heard goes to M like typed text
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
const voiceLang = () => store.get("mVoice", "zh-CN");
function listen() {
  if (rec) { rec.stop(); return; }
  if (!SR) { mood("huh"); toast("No voice input here. Type instead."); $("aiIn").focus(); return; }
  let heard = "", failed = false;
  rec = new SR(); rec.lang = voiceLang(); rec.interimResults = true; rec.continuous = false;
  rec.onresult = e => { heard = [...e.results].map(r => r[0].transcript).join(""); $("aiIn").value = heard; grow(); };
  rec.onerror = e => { failed = true; toast(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone is off. Allow it in System Settings → Privacy." : "Didn't catch that. Try again."); mood("huh"); };
  rec.onend = () => {
    rec = null; $("micBtn").classList.remove("on");
    const t = heard.trim();
    if (t) { setInput(""); ask(t); } else if (!failed) mood("");
  };
  try { rec.start(); } catch (e) { rec = null; toast("Voice isn't available here. Type instead."); return; }
  mood("listen"); $("micBtn").classList.add("on");
}
$("micBtn").addEventListener("click", listen);
$("aiForm").addEventListener("submit", e => { e.preventDefault(); if (streaming) { streaming.abort(); return; } const t = $("aiIn").value.trim(); if (!t) return; setInput(""); ask(t); });

// ---------------------------------------------------------------- Classic Backup (the old Backup page, in a frame) + scenes
let backupLoaded = false;
function loadBackup() {
  if (backupLoaded) return; backupLoaded = true;
  // the Backup page skips its "Who are you?" when a name was picked in the last 10 minutes; the PIN already said who
  try { localStorage.setItem("me", session.name); localStorage.setItem("meAt", String(Date.now())); } catch (e) {}
  $("backupFrame").src = "backup.html";
}
// Birthdays, festivals and their effects come from the Backup page, run a second time as a see-through layer over the whole
// app (backup.html?scenes). It only takes taps while a birthday / festival scene is open (tap to close).
let scenesWait = 0;
function scenes(on) {
  let f = $("scenes");
  clearTimeout(scenesWait); scenesWait = 0;
  if (!on) { if (f) f.remove(); return; }
  if (f) return;
  // a whole second copy of the Backup page: start it once Home has drawn and the phone is idle, so it never competes with the first screen
  if (!scenes.later) { scenes.later = true; const go = () => { if (session) scenes(true); };
    scenesWait = setTimeout(() => (window.requestIdleCallback || (g => g()))(go, { timeout: 2500 }), 1800); return; }
  try { localStorage.setItem("me", session.name); localStorage.setItem("meAt", String(Date.now())); } catch (e) {}
  f = document.createElement("iframe"); f.id = "scenes"; f.title = "Birthdays and festivals"; f.setAttribute("allowtransparency", "true"); f.tabIndex = -1; f.setAttribute("aria-hidden", "true");
  f.src = "backup.html?scenes"; document.body.appendChild(f);
}
window.scenesOpen = on => { const f = $("scenes"); if (f) f.classList.toggle("open", on); };

// ---------------------------------------------------------------- settings
function drawFx() {
  const F = window.UIFx; if (!F) return;
  const on = (id, v) => document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle("on", b.dataset.v === (v ? "1" : "0")));
  on("sndSeg", F.sound()); on("hapSeg", F.haptics());
  $("hapSeg").hidden = $("hapLbl").hidden = !F.canFeel;
}
["sndSeg", "hapSeg"].forEach(id => $(id).addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || !window.UIFx) return; const v = b.dataset.v === "1";
  if (id === "sndSeg") UIFx.sound(v); else UIFx.haptics(v);
  drawFx(); if (v) UIFx(id === "sndSeg" ? "ok" : "toggle");
}));
function drawTheme() { const t = document.documentElement.getAttribute("data-theme"); document.querySelectorAll("#themeSeg button").forEach(b => b.classList.toggle("on", b.dataset.t === t)); }
$("themeSeg").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const go = () => { document.documentElement.setAttribute("data-theme", b.dataset.t); drawTheme(); themeBar(); };
  try { localStorage.setItem("theme", b.dataset.t); } catch (x) {}
  if (!STILL && document.startViewTransition) document.startViewTransition(go); else go();
  if (graph) graph.theme();
  if (backupLoaded && !(jf && jf.busy)) { backupLoaded = false; $("backupFrame").removeAttribute("src"); if (route.name === "backup" || route.name === "classic" || jf) loadBackup(); }   // reloads with the new theme (not in the middle of a save)
});
function drawVoice() { document.querySelectorAll("#voiceSeg button").forEach(b => b.classList.toggle("on", b.dataset.l === voiceLang())); }
$("voiceSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { store.set("mVoice", b.dataset.l); drawVoice(); } });
$("pinForm").addEventListener("submit", async e => {
  e.preventDefault(); const n = $("pfNew").value;
  if (!/^\d{4}$/.test(n)) { $("pfMsg").textContent = "PIN is 4 digits"; return; }
  if (n !== $("pfNew2").value) { $("pfMsg").textContent = "The two PINs are different"; return; }
  try { session = await M.api("setMyPin", [session.name, $("pfOld").value, n]); e.target.reset(); $("pfMsg").textContent = ""; toast("PIN changed"); }
  catch (err) { $("pfMsg").textContent = err.message; }
});
$("aiProv").innerHTML = Object.entries(AI_PROVIDERS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("");
function drawAI() {
  const c = aiCfg(); $("aiProv").value = c.prov || "custom"; $("aiHint").textContent = (AI_PROVIDERS[c.prov] || AI_PROVIDERS.custom).hint;
  $("aiUrl").value = c.url; $("aiName").value = c.model; $("aiKey").value = c.key;
  $("modelChip").textContent = (AI_PROVIDERS[c.prov] || AI_PROVIDERS.custom).label.replace(/ \(.*\)$/, "") + (c.model ? " · " + c.model : "");
}
$("aiProv").addEventListener("change", () => {   // a preset fills address + model; the key field is cleared
  const p = AI_PROVIDERS[$("aiProv").value]; $("aiHint").textContent = p.hint;
  if (p.url) $("aiUrl").value = p.url; $("aiName").value = p.model; $("aiKey").value = "";
});
const aiForm = () => ({ prov: $("aiProv").value, url: $("aiUrl").value.trim(), model: $("aiName").value.trim(), key: $("aiKey").value.trim() });
$("aiSet").addEventListener("submit", e => {
  e.preventDefault(); store.set("mAI", aiForm());
  drawAI(); $("aiMsg").textContent = ""; toast("AI model saved");
});
$("aiTest").addEventListener("click", async () => {
  const keep = aiCfg(); store.set("mAI", aiForm());
  $("aiMsg").textContent = "Testing…";
  try { await callModel([{ role: "user", content: 'Reply with {"action":"reply","text":"ok"}' }]); $("aiMsg").textContent = "Connected."; }
  catch (err) { $("aiMsg").textContent = "Not connected: " + err.message; }
  store.set("mAI", keep);
});

// demo only: make today the person's birthday and play it again, to see the birthday scene
$("demoCard").hidden = !DEMO;
$("demoBday").addEventListener("click", () => {
  const db = store.get("mDemo4", null); if (!db || !session) return;
  const t = new Date(); db.birthdays = Object.assign({}, db.birthdays, { [session.name]: `1997-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}` });
  db.rev++; store.set("mDemo4", db);
  try { localStorage.removeItem("bdaySeen"); } catch (e) {}
  scenes(false); scenes(true); location.hash = "#/home";
});
$("ver").textContent = "Studio M Workspace v" + APP_VER + (DEMO ? " (demo)" : "");

// ---------------------------------------------------------------- 小M's hooks for the Classic Backup page and the scenes layer
// The Backup page's own 小M is hidden; its moods and moves (worried about unbacked jobs, hops, shrugs…) show on this one,
// and birthday / festival outfits come from the scenes layer.
const Pet = {
  busy: false,
  mirror(list) {
    const m = $("mSvg").querySelector(".m25"); if (!m) return;
    const MIR = ["hop", "cheer", "shrug", "squish", "yawn", "worried", "sleepy", "wiggle", "fret", "nod", "puzzled", "t-shy", "t-spin", "t-sneeze", "t-ha", "t-photo"];
    (m._mir || []).forEach(c => m.classList.remove(c));
    m._mir = list.filter(c => MIR.includes(c)); m._mir.forEach(c => m.classList.add(c));
  },
  wear(html) { const m = $("mSvg").querySelector(".m25"), keep = m && m._mir; $("mSvg").innerHTML = html; if (keep) this.mirror(keep); },
  show(on) { if (on) showM(); else MBTN.hidden = true; },
  typeAt() {}, stopTyping() {}, down() {}, perchOn() {}
};
window.Pet = Pet;

// ---------------------------------------------------------------- success: 小M becomes two lines of light round the window
// From 小M's spot on the edge, one line runs along the top and one along the bottom; they meet across and flash, then 小M is back.
const SVGNS = "http://www.w3.org/2000/svg";
let haloOn = false;
function halo() {
  if (haloOn || document.hidden) return;
  const W = innerWidth, H = innerHeight, phone = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const inset = 3, r = phone ? Math.min(44, W / 6) : 12, x0 = inset, y0 = inset, x1 = W - inset, y1 = H - inset;
  const d = `M${x0 + r},${y0}H${x1 - r}A${r},${r} 0 0 1 ${x1},${y0 + r}V${y1 - r}A${r},${r} 0 0 1 ${x1 - r},${y1}H${x0 + r}A${r},${r} 0 0 1 ${x0},${y1 - r}V${y0 + r}A${r},${r} 0 0 1 ${x0 + r},${y0}Z`;
  const svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "halo"); svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const mk = (w, o, c) => { const pa = document.createElementNS(SVGNS, "path"); pa.setAttribute("d", d); pa.setAttribute("stroke-width", w); pa.style.opacity = o; if (c) pa.setAttribute("class", c); svg.appendChild(pa); return pa; };
  const probe = mk(0, 0); document.body.appendChild(svg);
  const P = probe.getTotalLength();
  // where 小M is (its centre, pushed to the nearest edge); bottom right when it's hidden
  const b = MBTN, br = !b.hidden && b.getBoundingClientRect(), cx = br ? br.left + br.width / 2 : W - 60, cy = br ? br.top + br.height / 2 : H - 60;
  let s0 = 0, best = Infinity;
  for (let i = 0; i < 240; i++) { const t = (i / 240) * P, q = probe.getPointAtLength(t), dd = (q.x - cx) ** 2 + (q.y - cy) ** 2; if (dd < best) { best = dd; s0 = t; } }
  const opp = probe.getPointAtLength((s0 + P / 2) % P); probe.remove();
  haloOn = true; mood("happy"); fx("ok");
  if (STILL) {   // reduced motion: the edge lights once, nothing travels
    const pa = mk(2, 0); pa.animate([{ opacity: 0 }, { opacity: .9 }, { opacity: 0 }], { duration: 700 }).onfinish = () => { svg.remove(); haloOn = false; };
    return;
  }
  b.classList.add("to-light");
  const dur = Math.min(1500, 700 + P / 6), ease = "cubic-bezier(.45,.05,.3,1)";
  // each line: a bright head and a fading tail (three strokes of the same dash, longer and fainter behind)
  // thin neon: a white-hot core over an orange tube, with a wide soft glow behind
  const tail = [[Math.min(220, P / 7), 6, .22, "glow"], [Math.min(380, P / 4.5), 1.2, .35, "tube"], [Math.min(200, P / 8), 1.6, .9, "tube"], [Math.min(90, P / 14), 1, 1, "core"]];
  for (const dir of [1, -1]) for (const [len, w, o, c] of tail) {
    const pa = mk(w, o, c); pa.setAttribute("stroke-dasharray", `${len} ${P - len}`);
    // the dash covers [head - len, head] going forward, [head, head + len] going backward; the head starts at 小M
    const off = h => dir > 0 ? -(h - len) : -h;
    pa.animate([{ strokeDashoffset: off(s0) }, { strokeDashoffset: off(s0 + dir * P / 2) }], { duration: dur, easing: ease, fill: "forwards" });
    pa.animate([{ opacity: 0 }, { opacity: o, offset: .08 }, { opacity: o, offset: .85 }, { opacity: 0 }], { duration: dur, fill: "forwards" });
  }
  const meet = document.createElementNS(SVGNS, "circle"); meet.setAttribute("class", "meet"); meet.setAttribute("cx", opp.x); meet.setAttribute("cy", opp.y); meet.setAttribute("r", 40); svg.appendChild(meet);
  meet.animate([{ opacity: 0, transform: "scale(.2)" }, { opacity: .55, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 520, delay: dur * .78, easing: "ease-out", fill: "forwards" }).onfinish = () => { svg.remove(); haloOn = false; };
  meet.style.transformBox = "fill-box"; meet.style.transformOrigin = "center";
  setTimeout(() => { b.classList.remove("to-light"); }, dur * .82);
}
document.addEventListener("pointerdown", e => {   // a finger can't hover: the light sweeps on press
  if (e.pointerType === "mouse") return;
  const b = e.target.closest(".btn:not(.stop), .seg button, .chips button, .fchip, .jf-mark"); if (!b || b.disabled) return;
  b.classList.remove("swept"); void b.offsetWidth; b.classList.add("swept"); setTimeout(() => b.classList.remove("swept"), 700);
});

// ---------------------------------------------------------------- press feel on every button: ripple from the touch point
document.addEventListener("pointerdown", e => {
  const b = e.target.closest(".btn, .ibtn, .sugg button, .model-chip, .seg button, .chips button, .pad button, .shoot, .cal .c, .menu button, .avatar, .link, .nav-i, .tabs a, .tabs button, .chip, .find, .hit, .row, .pc-open");
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement("span");
  s.className = "rip"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 600);
});
addEventListener("resize", () => { if (session) markNav(); });

function themeBar() { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = document.documentElement.getAttribute("data-theme") === "light" ? "#ffffff" : "#0e0e0e"; }
// the phone app's offline shell (not inside the Mac app, which has its files already)
if ("serviceWorker" in navigator && !window.__TAURI__ && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)))
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").then(reg => {
    // a new version: it takes over as soon as it's downloaded, and the app reloads into it unless you're in the middle of something
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!had) { had = true; return; }
      const busy = !$("jobScrim").hidden || !$("shootScrim").hidden || (mOpen && $("aiIn").value.trim());
      if (busy) toast("A new version is ready. It opens next time."); else location.reload();
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });   // back from the background: look for one
  }).catch(() => {}));
drawTheme(); themeBar(); drawAI(); drawVoice();
// Studio M loading: the beam sweeps the logo, it breathes out, then the PIN screen
lock();
setTimeout(() => { $("boot").classList.add("breathe"); setTimeout(() => { $("boot").hidden = true; }, 1500); }, 1700);
