// Studio M Backup — Google Sheets version (Code.gs v3.2.00, 2026-10-22).
// v3.2.00: the "Team" tab has a second column, birthday (YYYY-MM-DD). Only day + month are shown in the app; the year is used
// for the zodiac. A weekly copy of the Sheet's data goes to a separate spreadsheet "Studio M Backup Archive" (the last 4 are kept):
// run setupWeeklyArchive() once in the editor to start it (it also makes the first copy).
// v3.1.01: the page is no longer pasted in here. It is read from the private GitHub repo hang6803/studio-m-backup
// (google/Index.html), so a new page version goes live by itself within about 5 minutes of being pushed — no redeploy.
// Script properties used: GITHUB_TOKEN (read-only token for that one repo), PIN (optional), SHEET_ID (optional).
// If GitHub can't be reached (or the token expired), the last page read is used (kept in Google Drive), and if that is
// missing too, the "Index" file in this project.
// The "Jobs" sheet holds one row per job; "Team" holds the user list;
// "Drives" lists hidden drives per year (year, drive, status = hidden) — the page's "settings/drives";
// "Settings" holds other small page settings as key + JSON (each person's sort order, "prefs/<name>").
// "Feedback" collects what people send with the Feedback button (at, by, ver, kind, text, device, id).
// Deploy as a web app (Execute as: Me, Who has access: Anyone) to get a link anyone can open.
// Optional: set a Script property PIN (Project Settings → Script properties) so only people
// who know it can add, update or delete. Viewing and searching never need the PIN.
const JOBS = "Jobs", TEAM = "Team", SETTINGS = "Settings", DRIVES = "Drives", FEEDBACK = "Feedback";
const FB_COLS = ["at", "by", "ver", "kind", "text", "device", "id"];
const COLS = ["id", "year", "section", "sec", "ord", "no", "name", "parts", "date", "drive", "editor", "backupDate", "backedUp",
  "notes", "link", "secTitle", "sheet", "history", "createdBy", "createdAt", "updatedBy", "updatedAt"];

function doGet(e) {
  const fresh = !!(e && e.parameter && e.parameter.refresh);   // open the link with ?refresh=1 to skip the 5-minute wait
  return HtmlService.createHtmlOutput(page_(fresh))
    .setTitle("Studio M Backup")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

// ---- The page, read from GitHub (v3.1.01) ----
const GH_REPO = "hang6803/studio-m-backup", GH_PATH = "google/Index.html", GH_BRANCH = "main";
const PAGE_TTL = 300;  // seconds a read page is reused before GitHub is asked again

function page_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) { const hit = cacheGet_(cache, "page"); if (hit) return hit; }
  let html = null;
  try { html = fetchGithub_(); } catch (err) { console.warn("GitHub: " + err.message); }
  if (!html) html = lastGood_();
  if (!html) html = HtmlService.createHtmlOutputFromFile("Index").getContent();
  cachePut_(cache, "page", html, PAGE_TTL);
  return html;
}

function fetchGithub_() {
  const token = String(props_().getProperty("GITHUB_TOKEN") || "").trim();
  if (!token) throw new Error("no GITHUB_TOKEN");
  const url = "https://api.github.com/repos/" + GH_REPO + "/contents/" + GH_PATH + "?ref=" + GH_BRANCH;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: {
    Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error("HTTP " + code + (code === 401 ? " (token wrong or expired)" : code === 404 ? " (no access to the repo, or file missing)" : ""));
  const j = JSON.parse(res.getContentText());
  const html = Utilities.newBlob(Utilities.base64Decode(String(j.content || "").replace(/\s/g, ""))).getDataAsString("UTF-8");
  if (html.indexOf("google.script.run") < 0) throw new Error("the file from GitHub is not the Google page");
  if (j.sha && j.sha !== props_().getProperty("PAGE_SHA")) { saveLastGood_(html); props_().setProperty("PAGE_SHA", j.sha); }
  return html;
}

// The last page read from GitHub is kept as a file in Google Drive, so the app still opens if GitHub is unreachable
const PAGE_FILE = "Studio M Backup - live page (auto, do not edit).html";
function saveLastGood_(html) {
  try {
    const id = props_().getProperty("PAGE_FILE_ID");
    let f = null; try { f = id ? DriveApp.getFileById(id) : null; } catch (e) {}
    if (f) f.setContent(html);
    else props_().setProperty("PAGE_FILE_ID", DriveApp.createFile(PAGE_FILE, html, MimeType.HTML).getId());
  } catch (e) { console.warn("Drive copy: " + e.message); }
}
function lastGood_() {
  try { const id = props_().getProperty("PAGE_FILE_ID"); return id ? DriveApp.getFileById(id).getBlob().getDataAsString("UTF-8") : null; }
  catch (e) { return null; }
}

// The script cache holds at most 100 KB per entry, so the page is zipped and split into pieces
function cachePut_(cache, key, text, ttl) {
  try {
    const z = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(text, "text/html")).getBytes());
    const parts = {}, n = Math.ceil(z.length / 90000);
    for (let i = 0; i < n; i++) parts[key + ":" + i] = z.slice(i * 90000, (i + 1) * 90000);
    parts[key + ":n"] = String(n);
    cache.putAll(parts, ttl);
  } catch (e) {}
}
function cacheGet_(cache, key) {
  try {
    const n = Number(cache.get(key + ":n") || 0); if (!n) return null;
    const keys = []; for (let i = 0; i < n; i++) keys.push(key + ":" + i);
    const got = cache.getAll(keys); let z = "";
    for (const k of keys) { if (!got[k]) return null; z += got[k]; }
    return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(z), "application/x-gzip")).getDataAsString("UTF-8");
  } catch (e) { return null; }
}

// Run this once in the editor (choose "authorize" at the top, then Run): it asks for the permissions the app needs
// (reach GitHub, keep the page copy in Drive) and shows in the log whether everything works.
function authorize() {
  console.log("Sheet: " + book_().getName());
  try { const html = fetchGithub_(); const v = (html.match(/APP_VER = "([^"]+)"/) || [])[1];
    console.log("GitHub OK — page v" + v + " (" + Math.round(html.length / 1024) + " KB)"); }
  catch (e) { console.log("GitHub NOT OK: " + e.message); }
  console.log(lastGood_() ? "Drive copy OK" : "Drive copy not made yet");
  CacheService.getScriptCache().remove("page:n");
}
// Same as opening the link with ?refresh=1: forget the cached page so the next visit reads GitHub again
function refreshPage() { CacheService.getScriptCache().remove("page:n"); console.log("Cache cleared"); }

// Works both ways: opened from the Sheet (Extensions → Apps Script), or as a separate
// script project with a Script property SHEET_ID = the long id in the Sheet's address.
function book_() {
  let id = (PropertiesService.getScriptProperties().getProperty("SHEET_ID") || "").trim();
  // Accept a whole Sheet address too: keep only the part between /d/ and the next /
  const m = id.match(/\/d\/([\w-]+)/) || id.match(/^([\w-]+)/);
  if (m) id = m[1];
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error("Set the Script property SHEET_ID to your Google Sheet's id");
  return ss;
}

function sheet_(name) {
  const ss = book_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const head = name === JOBS ? COLS : name === SETTINGS ? ["key", "value"] : name === DRIVES ? ["year", "drive", "status"] : name === FEEDBACK ? FB_COLS : ["name", "birthday"];
    sh.getRange(1, 1, 1, head.length).setValues([head]);
  }
  return sh;
}
const props_ = () => PropertiesService.getScriptProperties();
// REV changes on every write; pages poll it to pick up other people's changes
function rev_() { return Number(props_().getProperty("REV") || 0); }
function bump_() { props_().setProperty("REV", String(rev_() + 1)); }
function checkPin_(pin) {
  const p = props_().getProperty("PIN");
  if (p && String(pin || "") !== p) throw new Error("PIN 错误 / Wrong PIN");
}

function getRev() { return rev_(); }

// The full read is kept in the script cache (zipped, 5 minutes) under the current REV, so most page loads skip
// reading the Sheet. Every change made through the page bumps REV, so those always show at once; a cell typed straight
// into the Sheet by hand shows within 5 minutes.
function getAll() {
  const rev = rev_(), cache = CacheService.getScriptCache(), key = "all:" + rev;
  try {
    const z = cache.get(key);
    if (z) return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(z), "application/x-gzip")).getDataAsString("UTF-8"));
  } catch (e) {}
  const out = readAll_();
  if (out.rev !== rev) return out; // something was saved while reading: don't keep this copy
  try {
    const z = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(out), "application/json")).getBytes());
    if (z.length < 95000) cache.put(key, z, 300);
  } catch (e) {}
  return out;
}

function readAll_() {
  const vals = sheet_(JOBS).getDataRange().getDisplayValues();
  const head = vals.shift() || [];
  const rows = vals.filter(r => r[0]).map(r => {
    const o = {};
    head.forEach((h, i) => { if (h && r[i] !== "") o[h] = r[i]; });
    return o;
  });
  const teamVals = sheet_(TEAM).getDataRange().getDisplayValues().slice(1).filter(r => r[0]);
  const team = teamVals.map(r => r[0]);
  const birthdays = {};
  teamVals.forEach(r => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(r[1] || "").trim())) birthdays[r[0]] = String(r[1]).trim(); });
  const settings = {};
  sheet_(SETTINGS).getDataRange().getDisplayValues().slice(1).forEach(r => {
    if (r[0]) { try { settings[r[0]] = JSON.parse(r[1]); } catch (e) {} }
  });
  settings["settings/drives"] = { hidden: hiddenDrives_() };
  return { rev: rev_(), rows: rows, team: team, birthdays: birthdays, settings: settings, pinRequired: !!props_().getProperty("PIN") };
}

// Drives tab -> { "2026": ["2021 4TB", ...] } for rows whose status is "hidden"
function hiddenDrives_() {
  const out = {};
  sheet_(DRIVES).getDataRange().getDisplayValues().slice(1).forEach(r => {
    if (r[0] && r[1] && String(r[2]).trim().toLowerCase() === "hidden") (out[r[0]] = out[r[0]] || []).push(r[1]);
  });
  return out;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  // v3.0.00: write the change to the Sheet (flush) before bumping REV and letting go of the lock. Without the flush,
  // the next read could still see the old cells, and that old copy was then kept in the cache under the new REV.
  try { const out = fn(); SpreadsheetApp.flush(); bump_(); return out; } finally { lock.releaseLock(); }
}

function rowOf_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const i = sh.getRange(2, 1, n, 1).getDisplayValues().findIndex(r => r[0] === String(id));
  return i < 0 ? -1 : i + 2;
}

// v3.1.01: one job, read fresh from the Sheet (null if it's not there).
function getJob(id) {
  const sh = sheet_(JOBS), at = rowOf_(sh, id);
  if (at < 0) return null;
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const r = sh.getRange(at, 1, 1, head.length).getDisplayValues()[0], o = {};
  head.forEach((h, i) => { if (h && r[i] !== "") o[h] = r[i]; });
  return o;
}

// Add or replace one job (matched by id).
function saveJob(pin, job) {
  checkPin_(pin);
  if (!job || !job.id) throw new Error("Missing id");
  return withLock_(() => {
    const sh = sheet_(JOBS);
    let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    const extra = Object.keys(job).filter(k => head.indexOf(k) < 0 && k !== "archived" && k !== "deleted");
    if (extra.length) { sh.getRange(1, head.length + 1, 1, extra.length).setValues([extra]); head = head.concat(extra); }
    const row = head.map(h => {
      const v = job[h];
      if (v == null || v === "") return "";
      return typeof v === "object" ? JSON.stringify(v) : String(v);
    });
    const at = rowOf_(sh, job.id);
    const range = sh.getRange(at > 0 ? at : sh.getLastRow() + 1, 1, 1, head.length);
    range.setNumberFormat("@");           // keep dates and numbers exactly as text
    range.setValues([row]);
    return true;
  });
}

function deleteJob(pin, id) {
  checkPin_(pin);
  return withLock_(() => {
    const sh = sheet_(JOBS), at = rowOf_(sh, id);
    if (at > 0) sh.deleteRow(at);
    return true;
  });
}

// v3.2.00: birthdays = { name: "YYYY-MM-DD" }. An older page that sends no birthdays keeps the ones already in the tab.
function setTeam(pin, members, birthdays) {
  checkPin_(pin);
  return withLock_(() => {
    const sh = sheet_(TEAM);
    const old = {};
    sh.getDataRange().getDisplayValues().slice(1).forEach(r => { if (r[0] && r[1]) old[r[0]] = String(r[1]).trim(); });
    const bd = birthdays && typeof birthdays === "object" ? birthdays : old;
    sh.clearContents();
    const vals = [["name", "birthday"]].concat((members || []).map(m => [String(m), String(bd[m] || "")]));
    sh.getRange(1, 1, vals.length, 2).setNumberFormat("@").setValues(vals);
    return true;
  });
}

// Save one page setting, e.g. key "settings/drives" or "prefs/hang".
function setSetting(pin, key, value) {
  if (!String(key).startsWith("prefs/")) checkPin_(pin);   // a person's sort order needs no PIN
  if (!key) throw new Error("Missing key");
  if (key === "settings/drives") return withLock_(() => writeDrives_((value && value.hidden) || {}));
  return withLock_(() => {
    const sh = sheet_(SETTINGS), at = rowOf_(sh, key);
    const range = sh.getRange(at > 0 ? at : sh.getLastRow() + 1, 1, 1, 2);
    range.setNumberFormat("@");
    range.setValues([[String(key), JSON.stringify(value)]]);
    return true;
  });
}

// Rewrite the hidden rows of the Drives tab; rows with any other status are kept as they are
function writeDrives_(hidden) {
  const sh = sheet_(DRIVES);
  const keep = sh.getDataRange().getDisplayValues().slice(1).filter(r => r[0] && String(r[2]).trim().toLowerCase() !== "hidden");
  const rows = keep.concat(Object.keys(hidden).sort().flatMap(y => (hidden[y] || []).map(d => [String(y), String(d), "hidden"])));
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setNumberFormat("@").setValues(rows);
  return true;
}

// v3.0.01: the logo film for the opening, kept in Google Drive (studiom.my). It is only read when a device plays it
//  (once per release), so ordinary page loads are not slowed down. Needs the Drive permission (asked once on deploy).
//  To use another file, set a Script property INTRO_FILE_ID.
const INTRO_FILE_ID = "1WvZz0e-d8tN63Axs9Kg6m3-n4dpO2HiL";
function getIntro() {
  const id = String(props_().getProperty("INTRO_FILE_ID") || INTRO_FILE_ID).trim();
  return Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes());
}

// v3.0.00: Feedback button. Anyone can send (no PIN); it is not part of the job data, so REV is not bumped.
function addFeedback(item) {
  item = item || {};
  const text = String(item.text || "").trim().slice(0, 4000);
  if (!text) throw new Error("Empty feedback");
  const row = [item.at || new Date().toISOString(), item.by || "", item.ver || "", item.kind || "", text, item.device || "", item.id || ""];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(FEEDBACK);
    const range = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
    range.setNumberFormat("@");
    range.setValues([row.map(String)]);
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return true;
}

// ---- v3.2.00: weekly archive ----
// Every week a copy of the data tabs (Jobs, Team, Drives, Settings, Feedback) is saved in a separate spreadsheet,
// "Studio M Backup Archive", one tab per tab per week ("2026-10-26 Jobs"…). Only the last 4 weeks are kept.
// The archive spreadsheet is made by the script the first time (in the Drive of the account that runs it).
const ARCHIVE_NAME = "Studio M Backup Archive", ARCHIVE_KEEP = 4, ARCHIVE_TABS = [JOBS, TEAM, DRIVES, SETTINGS, FEEDBACK];
function archiveBook_() {
  const id = props_().getProperty("ARCHIVE_ID");
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create(ARCHIVE_NAME);
  props_().setProperty("ARCHIVE_ID", ss.getId());
  return ss;
}
function weeklyArchive() {
  const src = book_(), dst = archiveBook_();
  const stamp = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "yyyy-MM-dd");
  ARCHIVE_TABS.forEach(name => {
    const sh = src.getSheetByName(name); if (!sh) return;
    const title = stamp + " " + name;
    const old = dst.getSheetByName(title); if (old) dst.deleteSheet(old);
    const vals = sh.getDataRange().getDisplayValues();
    const out = dst.insertSheet(title);
    if (vals.length && vals[0].length) out.getRange(1, 1, vals.length, vals[0].length).setNumberFormat("@").setValues(vals);
  });
  // keep the newest ARCHIVE_KEEP weeks
  const weeks = [...new Set(dst.getSheets().map(s => (s.getName().match(/^(\d{4}-\d{2}-\d{2}) /) || [])[1]).filter(Boolean))].sort().reverse();
  const drop = new Set(weeks.slice(ARCHIVE_KEEP));
  dst.getSheets().forEach(s => { const w = (s.getName().match(/^(\d{4}-\d{2}-\d{2}) /) || [])[1]; if (w && drop.has(w) && dst.getSheets().length > 1) dst.deleteSheet(s); });
  const blank = dst.getSheetByName("Sheet1") || dst.getSheetByName("工作表1"); if (blank && dst.getSheets().length > 1) dst.deleteSheet(blank);
  props_().setProperty("ARCHIVE_LAST", new Date().toISOString());
  console.log("Archived " + stamp + " → " + dst.getUrl());
  return dst.getUrl();
}
// Run once in the editor: makes the first copy and sets the weekly run (Mondays, about 3am Malaysia time).
function setupWeeklyArchive() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "weeklyArchive").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("weeklyArchive").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).inTimezone("Asia/Kuala_Lumpur").create();
  return weeklyArchive();
}
