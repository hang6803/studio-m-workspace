// Builds dist/ for the M app:
//   index.html, app.js, app.css, graph.js — the shell (src/), with the API settings put in
//   manifest.webmanifest, icons/, sw.js — the phone app (add to Home Screen, opens with no connection)
//   backup.html                  — the Backup page + its Google bridge, talking through the shell (window.parent.M.api)
//   xiaom.js                     — 2.5D 小M from the Backup repo, used by both the shell and the Backup page
//   assets/                      — Century Gothic and the Studio M logos, taken out of the Backup page
// API settings come from config.local.json or env M_API_URL / M_API_KEY; with none the app runs on demo data.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";

const at = p => new URL("../" + p, import.meta.url);
const read = p => readFileSync(at(p), "utf8");
const cfg = existsSync(at("config.local.json")) ? JSON.parse(read("config.local.json")) : {};
const api = { apiUrl: process.env.M_API_URL || cfg.apiUrl || "", apiKey: process.env.M_API_KEY || cfg.apiKey || "" };
if (!api.apiUrl) console.warn("WARN: no apiUrl (config.local.json or M_API_URL) — building the demo app");
const must = (ok, what) => { if (!ok) throw new Error(what); };

let page = read("vendor/backup/index.html");
let bridge = read("vendor/backup/bridge.html");

// 1) the bridge's one transport line: google.script.run -> the shell's M.api (same sign-in, same server)
const CALL = /const call = \(fn, \.\.\.args\) => new Promise\(\(ok, fail\) =>[\s\S]*?\[fn\]\(\.\.\.args\)\);/;
must(CALL.test(bridge), "bridge: transport line not found");
bridge = bridge.replace(CALL, "const call = (fn, ...args) => window.parent.M.api(fn, args);");

// 2) text rewrites (same as the Google page)
const LOGIN = 'login_needed: "Sign in to claude.ai to open this page and see or save records."';
must(page.split(LOGIN).length === 2, "page: login_needed string not found once");
page = page.replace(LOGIN, 'login_needed: "Couldn\'t load the records. Check the internet connection."');

// 3) inside the M app: no year-card calendar (the app's Calendar replaces it) and no "Who are you?" button
//    (the person comes from their PIN); the Backup page reads them from localStorage "me", set by the shell
const M_CSS = `<style>#calBtn, #cal, #meBtn, #camSeat, .search-row .search { display: none !important } .search-row { justify-content: flex-end } #boot { opacity: 0 !important; pointer-events: none !important } body.booting .topbar, body.booting .wrap, body.booting .ver { visibility: visible !important }</style>\n`;
must(page.includes('id="calBtn"') && page.includes('id="meBtn"'), "page: calBtn / meBtn not found");

// 4) bridge goes right before the app's main script (2nd <script>; the 1st is the theme script)
const first = page.indexOf("<script>"), i = page.indexOf("<script>", first + 1);
must(first >= 0 && i >= 0 && page.slice(i, i + 200000).includes("claude.use"), "page: main script not found");
// 小M is one: the Backup page's own 小M is hidden (above) and whatever it does (moods, hops, shrugs) is copied onto the shell's 小M
// The same page also runs a second time as backup.html?scenes, a see-through layer over the whole app: only its birthday and
// festival scenes and the festival effects (snow…) show, so they play on the home screen and across every page.
// That copy sends 小M's festival / birthday outfit to the shell's 小M; the Backup page itself doesn't show them again.
const M_MIRROR = `<script>
(function () {
  const cam = document.getElementById("cam"), P = window.parent; if (!cam || !P.Pet) return;
  if (/[?&]scenes\\b/.test(location.search)) {
    let last = "";
    const wear = () => { const s = cam.querySelector(".cam-svg"); if (!s) return; const c = s.cloneNode(true); c.className = "cam-svg m25s m25";
      const h = c.outerHTML; if (h !== last) { last = h; P.Pet.wear(h); } };
    new MutationObserver(wear).observe(cam, { childList: true }); wear();
    new MutationObserver(() => P.scenesOpen(!!document.querySelector(".bd-ov"))).observe(document.body, { childList: true });
    return;
  }
  const send = () => { const s = cam.querySelector(".cam-svg"); P.Pet.mirror(s ? [...s.classList] : []); };
  new MutationObserver(send).observe(cam, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  send();
})();
</script>\n`;
const M_SCENES = `<script>if (/[?&]scenes\\b/.test(location.search)) document.documentElement.classList.add("m-scenes");</script>
<style>
html:not(.m-scenes) .bd-ov, html:not(.m-scenes) .fx-layer { display: none !important }
html.m-scenes, html.m-scenes body { background: transparent !important }
html.m-scenes body::before, html.m-scenes body::after { display: none !important }
html.m-scenes body > * { visibility: hidden !important }
html.m-scenes body > .bd-ov, html.m-scenes body > .fx-layer { visibility: visible !important }
html.m-scenes .fx-layer { position: fixed !important; inset: 0 !important; height: auto !important; -webkit-mask-image: none !important; mask-image: none !important }
</style>\n`;
const M_WRITE = `<script>
// The Workspace's own job form saves through this page: it fills this page's form and presses this page's Save,
// so adding, editing, backing up, deleting, the outbox and history are this page's own code, exactly as before.
window.mReady = function () {
  try {
    if (document.body.classList.contains("booting") || typeof openForm !== "function" || typeof rows === "undefined" || !db) return { ready: false };
    return { ready: true, canWrite: typeof canWrite === "undefined" || !!canWrite, me: me || "", cats: catList() };
  } catch (e) { return { ready: false }; }
};
// a job as this page has it right now (the Workspace's form opens from this, not from its own older copy)
const mSig = function (r) { const t = r && twinOf(r); return r ? [r.id, r.updatedAt || "", sectionOf(r), t ? t.id : "", t ? t.updatedAt || "" : ""].join("|") : ""; };
window.mJob = function (id) {
  try {
    const r = rows.find(function (x) { return x.id === id; }); if (!r) return null;
    const t = twinOf(r);
    return JSON.parse(JSON.stringify({ r: r, tw: t || null, no: numOf.get(r.id) || "", sig: mSig(r) }));
  } catch (e) { return null; }
};
// drives used in that year (this page's list: minus the ones removed for the year)
window.mDrives = function (y, id) {
  try {
    const used = rows.filter(function (x) { return String(x.year) === String(y) && x.id !== id; }).flatMap(drivesOf).map(function (d) { return d.toUpperCase(); }).filter(function (d) { return d !== "未知"; });
    const hid = hiddenDrives[y] || [];
    return [...new Set(used.filter(function (d) { return !hid.includes(d); }))].sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  } catch (e) { return []; }
};
let mBusy = false;
const mWait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
function mStash(key) { let v = null; try { v = localStorage.getItem(key); } catch (e) {} return v; }
function mPut(key, v) { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch (e) {} }
const mShut = function (id) { const el = $(id); return el.hidden || el.classList.contains("closing"); };   // closed, or closing (it fades out)
function mClose() { try { if (!$("cfmScrim").hidden) { cfmAction = null; hideScrim("cfmScrim"); } if (!$("scrim").hidden) closeForm(); } catch (e) {} }
// this page busy with its own save / delete, or a form left open on it (its unsaved draft is kept first)
async function mFree() {
  if ($("saveBtn").disabled || $("form").classList.contains("saving") || $("cfmYes").disabled) return false;
  if (!mShut("cfmScrim") || !mShut("scrim")) { await mWait(350); if ($("saveBtn").disabled || $("cfmYes").disabled) return false; mClose(); }
  return true;
}
// p = { id, sig, cat, name, parts: [{date, label}], type: video|photo|both, tick: {video, photo}, drives: [], newDrives: [], editor, notes, link, no, force }
window.mSubmit = async function (p) {
  const fail = function (msg, more) { return Object.assign({ ok: false, msg: msg }, more || {}); };
  const st = window.mReady();
  if (!st.ready) return fail("Backup is still loading. Try again in a moment.");
  if (!st.canWrite) return fail("Backup is view only right now.");
  if (!st.me) return fail("Backup doesn't know who you are yet. Lock and sign in again.");
  if (mBusy) return fail("Still saving the last change.");
  mBusy = true;
  try {
    if (!(await mFree())) return fail("Classic Backup is saving something. Try again in a moment.");
    const r = p.id ? rows.find(function (x) { return x.id === p.id; }) : null;
    if (p.id && !r) return fail("This job isn't in Backup any more. It may have been deleted.", { stale: true });
    if (r && mSig(r) !== p.sig) return fail("Someone changed this job since you opened it. Close the form and open it again.", { stale: true });
    const key = "draft:" + (r ? "edit:" + r.id : "add:new"), kept = mStash(key);
    if (typeof draftTimer !== "undefined") clearTimeout(draftTimer);
    mPut(key, null);
    const back = function () { if (typeof draftTimer !== "undefined") clearTimeout(draftTimer); mPut(key, kept); };   // a draft from before stays for later
    openForm(r || null);
    if ($("scrim").hidden) { back(); return fail("Backup didn't open the form."); }
    fillCats(p.cat); if ($("f-cat").value !== p.cat) { mClose(); back(); return fail("The category " + p.cat + " isn't in the list."); }
    $("f-name").value = p.name || "";
    setParts(p.parts && p.parts.length ? p.parts : [{ date: "", label: "" }]);
    $("f-date").required = formMode === "add";
    if (formMode === "add") { $("f-video").checked = p.type !== "photo"; $("f-photo").checked = p.type !== "video"; }
    else { jobType = p.type; $("f-video").checked = !!(p.tick && p.tick.video); $("f-photo").checked = !!(p.tick && p.tick.photo); }
    syncMedia();
    $("f-drive").value = (p.drives || []).join(", ");
    (p.newDrives || []).forEach(function (d) { if ((p.drives || []).includes(d)) { $("driveNew").value = d; addDrive(); } });   // as "+ New drive" here: back on the year's list
    $("f-editor").value = p.editor || "";
    $("f-notes").value = p.notes || "";
    $("f-link").value = p.link || ""; syncLinkOpen();
    if (p.no) $("f-no").value = String(p.no); else if (formMode === "add") $("f-no").value = "";   // edit: keeps the No. this form gave it
    updateNoHint();
    if (p.force && formMode === "add") {
      const y = ((getParts().find(function (x) { return x.date; }) || {}).date || "").slice(0, 4) || year;
      dupOk = y + "|" + $("f-cat").value + "|" + normName($("f-name").value);
    }
    const f = $("form");
    if (!f.checkValidity()) { const bad = f.querySelector(":invalid"); const m = bad ? (bad.id === "f-no" ? "Pick a No. from 1 to " + bad.max + "." : bad.validationMessage) : "Check the form."; mClose(); back(); return fail(m); }
    let saved = null; const on = function (e) { saved = e.detail || {}; };
    document.addEventListener("sm:saved", on);
    const t0 = Date.now();
    try {
      f.requestSubmit();
      // no time limit while the save runs: giving up early would let the same job be saved twice
      for (;;) {
        if (saved) { back(); return { ok: true, queued: queuedNow > 0, added: !!saved.added, year: saved.year }; }
        const msg = $("formMsg").textContent, busy = $("saveBtn").disabled;
        if (!busy && msg) { mClose(); back(); return fail(msg, { dup: /press Save again/.test(msg) }); }
        if (!busy && Date.now() - t0 > 400) { mClose(); back(); return fail("Backup didn't save. Try again."); }
        await mWait(60);
      }
    } finally { document.removeEventListener("sm:saved", on); }
  } finally { mBusy = false; }
};
window.mDelete = async function (id, sig) {
  const st = window.mReady();
  if (!st.ready) return { ok: false, msg: "Backup is still loading. Try again in a moment." };
  if (!st.canWrite) return { ok: false, msg: "Backup is view only right now." };
  if (mBusy) return { ok: false, msg: "Still saving the last change." };
  mBusy = true;
  try {
    if (!(await mFree())) return { ok: false, msg: "Classic Backup is saving something. Try again in a moment." };
    const r = rows.find(function (x) { return x.id === id; });
    if (!r) return { ok: false, msg: "This job isn't in Backup any more.", stale: true };
    if (mSig(r) !== sig) return { ok: false, msg: "Someone changed this job since you opened it. Close the form and open it again.", stale: true };
    const key = "draft:edit:" + id, kept = mStash(key);
    if (typeof draftTimer !== "undefined") clearTimeout(draftTimer);
    mPut(key, null);
    const back = function () { if (typeof draftTimer !== "undefined") clearTimeout(draftTimer); mPut(key, kept); };
    openForm(r);
    if ($("scrim").hidden) { back(); return { ok: false, msg: "Backup didn't open the job." }; }
    $("delBtn").click();
    if ($("cfmScrim").hidden || !cfmAction) { mClose(); back(); return { ok: false, msg: "Backup didn't delete it." }; }
    queuedNow = 0;
    $("cfmYes").click();
    for (;;) {   // no time limit while it runs (see mSubmit)
      const msg = $("formMsg").textContent;
      if (!$("cfmYes").disabled && mShut("cfmScrim")) {
        if (mShut("scrim") && !msg) { mPut(key, null); return { ok: true, queued: queuedNow > 0 }; }
        mClose(); back(); return { ok: false, msg: msg || "Backup didn't delete it." };
      }
      await mWait(60);
    }
  } finally { mBusy = false; }
};
</script>\n`;
const end = page.lastIndexOf("</body>");
must(end > 0, "page: </body> not found");
must(page.includes('id="camSeat"') && page.includes('id="cam"'), "page: 小M seat not found");
const backup = page.slice(0, i) + M_CSS + M_SCENES + bridge + "\n" + page.slice(i, end) + M_MIRROR + M_WRITE + page.slice(end);

// 5) fonts and logos out of the Backup page, for the shell
mkdirSync(at("dist/assets"), { recursive: true });
const fonts = [...page.matchAll(/url\(data:font\/woff;base64,([A-Za-z0-9+/=]+)\) format\("woff"\); font-weight: (\d+)/g)];
must(fonts.length === 2, "page: expected 2 Century Gothic fonts, found " + fonts.length);
fonts.forEach(m => writeFileSync(at(`dist/assets/cg-${m[2]}.woff`), Buffer.from(m[1], "base64")));
for (const v of ["l", "d"]) {
  const m = page.match(new RegExp(`<img class="logo logo-${v}" src="data:image/png;base64,([A-Za-z0-9+/=]+)"`));
  must(m, "page: logo-" + v + " not found");
  writeFileSync(at(`dist/assets/logo-${v}.png`), Buffer.from(m[1], "base64"));
}

// 6) the shell
const shell = read("src/index.html");
must(shell.includes("<!--M_CONFIG-->"), "shell: <!--M_CONFIG--> missing");
writeFileSync(at("dist/index.html"), shell.replace("<!--M_CONFIG-->", `<script>window.M_API = ${JSON.stringify(api)};</script>`));
copyFileSync(at("src/app.js"), at("dist/app.js"));
copyFileSync(at("src/app.css"), at("dist/app.css"));
copyFileSync(at("src/graph.js"), at("dist/graph.js"));
copyFileSync(at("src/fx.js"), at("dist/fx.js"));
copyFileSync(at("vendor/backup/xiaom.js"), at("dist/xiaom.js"));
writeFileSync(at("dist/backup.html"), backup);

// 7) phone app (PWA): manifest, icons, and the offline shell; its cache name changes whenever any shell file does
mkdirSync(at("dist/icons"), { recursive: true });
for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(at("src/icons/" + f), at("dist/icons/" + f));
copyFileSync(at("src/manifest.webmanifest"), at("dist/manifest.webmanifest"));
const shellHash = createHash("sha256");
for (const f of ["index.html", "app.js", "app.css", "fx.js", "graph.js", "xiaom.js", "backup.html", "manifest.webmanifest"]) shellHash.update(readFileSync(at("dist/" + f)));
const ver = JSON.parse(read("package.json")).version + "-" + shellHash.digest("hex").slice(0, 8);
writeFileSync(at("dist/sw.js"), read("src/sw.js").replace("__M_VER__", ver));
console.log("BUILD_OK", api.apiUrl ? "live" : "demo", Buffer.byteLength(backup));
