// M app (Mac) — JSON API. Add this as a second file (MApp.gs) in the Studio M Backup Apps Script project, next to
// Code.gs; it only adds, Code.gs and the web page are not changed.
// The app sends POST {key, token, fn, args} as text/plain and gets {result} or {error} back.
// Script properties: API_KEY (required, also built into the app), PIN (the studio PIN, as today).
// Set by this file: PIN_SALT, UPIN_<name> (each person's hashed 4-digit PIN — never sent to the app).
// Deploy: a web-app deployment with "Execute as: Me" and "Who has access: Anyone" (the app has no Google sign-in).
const SHOOTS = "Shoots";
const SHOOT_COLS = ["id", "name", "dates", "location", "type", "crew", "notes", "jobId", "createdBy", "createdAt", "updatedBy", "updatedAt"];
const SESSION_TTL = 21600;   // 6 hours, the longest CacheService keeps a value; after that the app asks for the PIN again

// Reads need a signed-in person. Writes also need one; the studio PIN (first argument of each Code.gs write) is
// filled in here, so people only ever type their own PIN.
const API_READ = { getAll: getAll, getRev: getRev, getJob: getJob, getShoots: getShoots, addFeedback: addFeedback };
const API_WRITE = { saveJob: saveJob, deleteJob: deleteJob, setTeam: setTeam, setSetting: setSetting,
  saveShoot: saveShoot, deleteShoot: deleteShoot };

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const key = String(props_().getProperty("API_KEY") || "");
    if (!key || req.key !== key) throw new Error("Bad API key");
    const args = Array.isArray(req.args) ? req.args : [];
    if (req.fn === "team") out = { result: teamStatus_() };
    else if (req.fn === "login") out = { result: login_(args[0]) };
    else if (req.fn === "setMyPin") out = { result: setMyPin_(args[0], args[1], args[2]) };
    else {
      const who = sessionName_(req.token);
      if (!who) throw new Error("SESSION: please enter your PIN again");
      if (API_READ[req.fn]) {
        const r = API_READ[req.fn].apply(null, args);
        if (req.fn === "getAll") r.pinRequired = false;
        out = { result: r };
      } else if (API_WRITE[req.fn]) {
        args[0] = String(props_().getProperty("PIN") || "");
        out = { result: API_WRITE[req.fn].apply(null, args) };
      } else throw new Error("Unknown call: " + req.fn);
    }
  } catch (err) {
    out = { error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ---- Personal PIN ----
function salt_() {
  let s = props_().getProperty("PIN_SALT");
  if (!s) { s = Utilities.getUuid(); props_().setProperty("PIN_SALT", s); }
  return s;
}
function hash_(pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + "|" + pin, Utilities.Charset.UTF_8);
  return bytes.map(b => ("0" + (b & 255).toString(16)).slice(-2)).join("");
}
const teamNames_ = () => sheet_(TEAM).getDataRange().getDisplayValues().slice(1).map(r => String(r[0] || "").trim()).filter(Boolean);
const pinOf_ = name => props_().getProperty("UPIN_" + name) || "";

// Who is on the team and who has set a PIN yet (for the first-time setup screen). No PINs or hashes leave the server.
function teamStatus_() {
  return { members: teamNames_().map(n => ({ name: n, hasPin: !!pinOf_(n) })), studioPin: !!props_().getProperty("PIN") };
}

// Too many wrong PINs in 10 minutes locks login for everyone until the 10 minutes pass (4 digits are easy to guess).
function tooMany_() { return Number(CacheService.getScriptCache().get("pinFails") || 0) >= 10; }
function failed_() { const c = CacheService.getScriptCache(); c.put("pinFails", String(Number(c.get("pinFails") || 0) + 1), 600); }

function login_(pin) {
  pin = String(pin || "");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN is 4 digits");
  if (tooMany_()) throw new Error("Too many tries. Wait 10 minutes.");
  const h = hash_(pin), name = teamNames_().find(n => pinOf_(n) === h);
  if (!name) { failed_(); throw new Error("Wrong PIN"); }
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("sess:" + token, name, SESSION_TTL);
  return { name: name, token: token };
}
function sessionName_(token) {
  return token ? CacheService.getScriptCache().get("sess:" + String(token)) : null;
}

// First time: auth = the studio PIN (or nothing if the studio has none). Changing: auth = the person's current PIN.
// Two people can't share a PIN, because the PIN alone says who is signing in.
function setMyPin_(name, auth, newPin) {
  name = String(name || "").trim(); auth = String(auth || ""); newPin = String(newPin || "");
  if (teamNames_().indexOf(name) < 0) throw new Error("Not on the team: " + name);
  if (!/^\d{4}$/.test(newPin)) throw new Error("PIN is 4 digits");
  if (tooMany_()) throw new Error("Too many tries. Wait 10 minutes.");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cur = pinOf_(name), studio = String(props_().getProperty("PIN") || "").trim();
    if (!(cur ? hash_(auth) === cur : !studio || auth.trim() === studio)) {
      failed_(); throw new Error(cur ? "Current PIN is wrong" : "Studio PIN is wrong");
    }
    const h = hash_(newPin);
    if (teamNames_().some(n => n !== name && pinOf_(n) === h)) throw new Error("That PIN is taken. Pick another.");
    props_().setProperty("UPIN_" + name, h);
  } finally { lock.releaseLock(); }
  return login_(newPin);
}

// ---- Shoot days (the M app calendar) ----
// One row per shoot. dates = "YYYY-MM-DD" values joined by ","; crew = team names joined by ",";
// type = video | photo | both; jobId = the Backup job made from it (empty until then).
function shootsSheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(SHOOTS);
  if (!sh) { sh = ss.insertSheet(SHOOTS); sh.getRange(1, 1, 1, SHOOT_COLS.length).setValues([SHOOT_COLS]); }
  return sh;
}
function getShoots() {
  const vals = shootsSheet_().getDataRange().getDisplayValues(), head = vals.shift() || [];
  return vals.filter(r => r[0]).map(r => { const o = {}; head.forEach((h, i) => { if (h && r[i] !== "") o[h] = r[i]; }); return o; });
}
function saveShoot(pin, s) {
  checkPin_(pin);
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error("Bad shoot");
  const id = String(s.id || "").trim();
  if (!id || id.length > 100) throw new Error("Missing id");
  if (!String(s.name || "").trim()) throw new Error("Missing name");
  const dates = String(s.dates || "").split(",").map(d => d.trim()).filter(Boolean);
  if (!dates.length || dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("Dates must be YYYY-MM-DD");
  if (["video", "photo", "both"].indexOf(String(s.type || "")) < 0) throw new Error("Type must be video, photo or both");
  if (JSON.stringify(s).length > 20000) throw new Error("This shoot is too big to save");
  return withLock_(() => {
    const sh = shootsSheet_();
    const row = SHOOT_COLS.map(h => h === "dates" ? dates.join(",") : String(s[h] == null ? "" : s[h]).slice(0, 4000));
    const at = rowOf_(sh, id);
    const range = sh.getRange(at > 0 ? at : sh.getLastRow() + 1, 1, 1, SHOOT_COLS.length);
    range.setNumberFormat("@");
    range.setValues([row]);
    return true;
  });
}
function deleteShoot(pin, id) {
  checkPin_(pin);
  return withLock_(() => { const sh = shootsSheet_(), at = rowOf_(sh, id); if (at > 0) sh.deleteRow(at); return true; });
}
