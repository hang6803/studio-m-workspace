// M app (Mac) — JSON API. Add this as a second file (MApp.gs) in the Studio M Backup Apps Script project, next to
// Code.gs; it only adds, Code.gs and the web page are not changed.
// The app sends POST {token, fn, args} as text/plain and gets {result} or {error} back.
// There is no shared API key. A key in an old copy of the page is ignored. Delete the API_KEY script
// property after this version is deployed, so the key that was published with the old page is dead.
// Script properties: PIN (the studio PIN, as today), DEEPSEEK_KEY (for Ask M; stays here, the app never sees it).
// Set by this file: PIN_SALT, UPIN_<name> (each person's hashed PIN — never sent to the app).
// Deploy: a web-app deployment with "Execute as: Me" and "Who has access: Anyone" (the app has no Google sign-in).
// Code.gs is not changed by this file. saveJob / deleteJob / checkPin_ still live there. This file checks
// that a session exists, then fills in the studio PIN before those calls. need_("member") does not split
// writes by role: every signed-in person is at least a member, and setSetting is not checked.
const SHOOTS = "Shoots";
const SHOOT_COLS = ["id", "name", "dates", "location", "type", "crew", "notes", "jobId", "createdBy", "createdAt", "updatedBy", "updatedAt"];
const SESSION_TTL = 21600;   // 6 hours, the longest CacheService keeps a value; after that the app asks for the PIN again

// Reads need a signed-in person. Writes also need one; the studio PIN (first argument of each Code.gs write) is
// filled in here, so people only ever type their own PIN.
const API_READ = { getAll: getAll, getRev: getRev, getJob: getJob_, getShoots: getShoots, addFeedback: addFeedback, ask: ask_, aiStatus: aiStatus_,
  people: people_, approve: approve_, reject: reject_, setRole: setRole_, removeMember: removeMember_, auditLog: auditLog_, setPinFor: setPinFor_ };
const API_WRITE = { saveJob: saveJob, deleteJob: deleteJob, setTeam: setTeamGuarded_, setSetting: setSetting,
  saveShoot: saveShoot, deleteShoot: deleteShoot };
// Calls need_("member") before these writes. That only requires a signed-in person: roleOf_() returns
// member or higher for everyone who can log in, so it does not grant or deny by role. setSetting is not listed.
// Role permissions are a separate change.
const WRITE_MIN = { saveJob: "member", deleteJob: "member", saveShoot: "member", deleteShoot: "member" };
// open without a session: who exists, signing in, first-time PIN, registering, and a PIN reset vouched for by an admin
const API_OPEN = { team: teamStatus_, login: login_, setMyPin: setMyPin_, register: register_, resetPin: resetPin_ };
// The IP below is whatever the browser sends. Apps Script cannot see the caller, so that IP is not trusted
// and a limit keyed on it can be bypassed by sending another one.
// login is not counted here. Wrong PINs use the older counters only: 5 failures for one name lock that name
// for 15 minutes, and 30 failures with no name lock sign-in for 10 minutes. Successes are not counted.
// team successes are not counted either. Only a failed team list counts, toward a high ceiling (TEAM_FAIL_CAP).
// register and resetPin keep a strict cap on every call. setMyPin's ceiling is high so it cannot lock the team out.
const OPEN_WINDOW = 600;
const TEAM_FAIL_CAP = 500;
const OPEN_LIMITS = {
  register: { ip: 3, all: 10 },
  resetPin: { ip: 6, all: 20 },
  setMyPin: { ip: 40, all: 500 }
};

let REQ = { who: "", ip: "", dev: "" };   // ip is client-reported and not trusted (see the note above OPEN_WINDOW)
function cacheErr_() {
  const err = new Error("Couldn't check the rate limit. Try again in a moment.");
  err.cache = true;
  return err;
}
// Not bump_(): Code.gs already defines bump_() to increment REV after a write. Both files share one
// global scope, so this counter needs its own name or it replaces that REV bump.
function bumpCount_(key, ttl) {
  try {
    const c = cache_();
    const n = Number(c.get(key) || 0) + 1;
    if (!isFinite(n)) throw new Error("bad count");
    c.put(key, String(n), ttl);
    return n;
  } catch (e) {
    if (e && e.cache) throw e;
    throw cacheErr_();   // not "too many tries": the cache failed, the person did not
  }
}
function openGate_(fn) {
  const lim = OPEN_LIMITS[fn];
  if (!lim) return;
  let ipN, allN;
  try {
    const ip = String(REQ.ip || "").trim().slice(0, 60) || "noip";
    ipN = bumpCount_("op:" + fn + ":" + ip, OPEN_WINDOW);
    allN = bumpCount_("op:" + fn, OPEN_WINDOW);
  } catch (e) {
    if (!(e && e.cache)) throw e;
    if (fn === "login") { audit_("rate limit unavailable", "", "cache error, sign-in allowed"); return; }
    throw e;   // register, resetPin, setMyPin: say the check failed, not that they tried too many times
  }
  if (ipN > lim.ip || allN > lim.all) throw new Error("Too many tries. Wait 10 minutes.");
}
function teamFailCount_() {
  try {
    const n = Number(cache_().get("fail:team") || 0);
    if (!isFinite(n)) throw new Error("bad count");
    return n;
  } catch (e) {
    if (e && e.cache) throw e;
    throw cacheErr_();
  }
}
function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const args = Array.isArray(req.args) ? req.args : [];
    REQ = { who: "", ip: String(req.ip || "").slice(0, 60), dev: String(req.dev || "").slice(0, 120) };
    if (API_OPEN[req.fn]) {
      if (req.fn === "team") {
        try {
          if (teamFailCount_() >= TEAM_FAIL_CAP) throw new Error("Too many tries. Wait 10 minutes.");
        } catch (e) {
          if (e && e.cache) throw new Error("Couldn't check the rate limit. Try again in a moment.");
          throw e;
        }
      }
      if (OPEN_LIMITS[req.fn]) openGate_(req.fn);
      try {
        out = { result: API_OPEN[req.fn].apply(null, args) };
      } catch (err) {
        if (req.fn === "team") { try { bumpCount_("fail:team", OPEN_WINDOW); } catch (e) {} }   // successes are not counted
        throw err;
      }
    } else {
      const who = sessionName_(req.token);
      if (!who) throw new Error("SESSION: please enter your PIN again");
      REQ.who = who;
      if (API_READ[req.fn]) {
        const r = API_READ[req.fn].apply(null, args);
        if (req.fn === "getAll") { r.pinRequired = false; r.me = { name: who, role: roleOf_(who) }; }
        out = { result: r };
      } else if (API_WRITE[req.fn]) {
        if (WRITE_MIN[req.fn]) need_(WRITE_MIN[req.fn]);
        args[0] = String(props_().getProperty("PIN") || "");
        out = { result: API_WRITE[req.fn].apply(null, args) };
      } else throw new Error("Unknown call: " + req.fn);
    }
  } catch (err) {
    out = { error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ---- People: PINs, roles, sign-up requests, and a log of who did what ----
// Roles, highest first: boss > 小M > admin > member. 小M is a sign-in of its own (not an editor on the Team list):
// it can approve, change member/admin and remove members and admins; only the boss can remove 小M, and nobody the boss.
// Kept in script properties: PIN_SALT, UPIN_<name> (hashed PINs), ROLES {name: role}, PEOPLE {name: {gmail}},
// PENDING [sign-up requests, each with its hashed PIN], BOSS (optional: who the boss is; else the first on the Team list).
// 小M's PIN: put XIAOM_PIN (6 digits) in the script properties; on its first use it is hashed and the plain one deleted.
const XIAOM = "M";
const RANK = { member: 1, admin: 2, xiaom: 3, boss: 4 };
const PIN_RE = /^\d{6}$/, OLD_PIN_RE = /^\d{4}$/;
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
const jsonProp_ = (k, d) => { try { return JSON.parse(props_().getProperty(k) || "") || d; } catch (e) { return d; } };
const setJsonProp_ = (k, v) => props_().setProperty(k, JSON.stringify(v));
function xiaomPin_() {   // 小M's PIN, hashed on first sight; "" when 小M has none (or the boss removed it)
  const plain = String(props_().getProperty("XIAOM_PIN") || "").trim();
  if (PIN_RE.test(plain)) { props_().setProperty("UPIN_" + XIAOM, hash_(plain)); props_().deleteProperty("XIAOM_PIN"); props_().deleteProperty("XIAOM_REMOVED"); }
  return props_().getProperty("XIAOM_REMOVED") ? "" : pinOf_(XIAOM);
}
function bossName_() { const b = String(props_().getProperty("BOSS") || "").trim(), t = teamNames_(); return b && t.indexOf(b) >= 0 ? b : t[0] || ""; }
function roleOf_(name) {
  if (name === XIAOM) return "xiaom";
  if (name === bossName_()) return "boss";
  const r = jsonProp_("ROLES", {})[name]; return r === "admin" ? "admin" : "member";
}
const rank_ = name => RANK[roleOf_(name)] || 0;
function need_(min) { if (rank_(REQ.who) < RANK[min]) throw new Error("Only " + min + "s and above can do that"); }
const signers_ = () => teamNames_().concat(xiaomPin_() ? [XIAOM] : []);

// the log: one row per event in a sheet of its own (Audit), newest at the bottom
const AUDIT = "Audit", AUDIT_COLS = ["at", "who", "action", "target", "detail", "ip", "device"];
function audit_(action, target, detail, who) {
  try {
    const ss = book_(); let sh = ss.getSheetByName(AUDIT);
    if (!sh) { sh = ss.insertSheet(AUDIT); sh.getRange(1, 1, 1, AUDIT_COLS.length).setValues([AUDIT_COLS]); sh.setFrozenRows(1); }
    const row = [new Date().toISOString(), who || REQ.who || "", action, target || "", String(detail || "").slice(0, 300), REQ.ip, REQ.dev];
    const r = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length); r.setNumberFormat("@"); r.setValues([row]);
  } catch (e) {}
}

// Who is on the team and who has set a PIN yet (sign-in and first-time screens). No PINs or hashes leave the server.
function teamStatus_() {
  return { members: teamNames_().map(n => ({ name: n, hasPin: !!pinOf_(n) })), xiaom: !!xiaomPin_(), studioPin: !!props_().getProperty("PIN"), pinLength: 6 };
}

// Wrong PINs only (a successful sign-in is not counted). 5 for one name in 15 minutes locks that name.
// 30 with no name, in 10 minutes, locks unnamed sign-in for everyone. The current app sends no name, so that
// shared counter of 30 is the global brake. It is not a count of every request.
const cache_ = () => CacheService.getScriptCache();
function tooMany_(name) {
  try {
    const c = cache_();
    return name ? Number(c.get("pinFails:" + name) || 0) >= 5 : Number(c.get("pinFails") || 0) >= 30;
  } catch (e) {
    if (e && e.cache) throw e;
    throw cacheErr_();
  }
}
function failed_(name) {
  try {
    const c = cache_();
    c.put("pinFails", String(Number(c.get("pinFails") || 0) + 1), 600);
    if (name) c.put("pinFails:" + name, String(Number(c.get("pinFails:" + name) || 0) + 1), 900);
  } catch (e) {
    if (e && e.cache) throw e;
    throw cacheErr_();
  }
}
function checkWho_(name, pin) {   // true when this person's PIN is right (6 digits, or an old 4-digit one not yet changed)
  const h = name === XIAOM ? xiaomPin_() : pinOf_(name);
  return !!h && hash_(String(pin)) === h;
}

// Sign in with a name and a PIN. (An older app sends only the PIN: then the PIN says who it is.)
function login_(pin, name) {
  pin = String(pin || ""); name = String(name || "").trim();
  if (!PIN_RE.test(pin) && !OLD_PIN_RE.test(pin)) throw new Error("PIN is 6 digits");
  let locked = false;
  try { locked = tooMany_(name); }
  catch (e) {
    if (!(e && e.cache)) throw e;
    audit_("rate limit unavailable", name, "cache error, sign-in allowed", name || "?");
    locked = false;   // the cache is down: let this sign-in through instead of calling it too many tries
  }
  if (locked) throw new Error("Too many tries. Wait 15 minutes.");
  if (name && jsonProp_("PENDING", []).some(p => p.name === name && p.kind === "register")) throw new Error("Your sign-up is waiting for approval");
  let who = "";
  if (name) { if (signers_().indexOf(name) >= 0 && checkWho_(name, pin)) who = name; }
  else { const h = hash_(pin); who = signers_().find(n => (n === XIAOM ? xiaomPin_() : pinOf_(n)) === h) || ""; }
  if (!who) {
    try { failed_(name); }
    catch (e) {
      if (!(e && e.cache)) throw e;
      audit_("rate limit unavailable", name, "cache error, sign-in failure not counted", name || "?");
    }
    audit_("sign-in failed", name, "", name || "?");
    throw new Error("Wrong PIN");
  }
  const token = Utilities.getUuid();
  cache_().put("sess:" + token, who, SESSION_TTL);
  audit_("signed in", who, "", who);
  return { name: who, token: token, role: roleOf_(who), upgrade: pin.length !== 6 };
}
function sessionName_(token) {
  const n = token ? cache_().get("sess:" + String(token)) : null;
  return n && signers_().indexOf(n) >= 0 ? n : null;   // removed people are signed out at once
}

// First time: auth = the studio PIN (or nothing if the studio has none). Changing: auth = the person's current PIN.
function setMyPin_(name, auth, newPin) {
  name = String(name || "").trim(); auth = String(auth || ""); newPin = String(newPin || "");
  if (signers_().indexOf(name) < 0) throw new Error("Not on the team: " + name);
  if (!PIN_RE.test(newPin)) throw new Error("PIN is 6 digits");
  if (tooMany_(name)) throw new Error("Too many tries. Wait 15 minutes.");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let first = false;
  try {
    const cur = name === XIAOM ? xiaomPin_() : pinOf_(name), studio = String(props_().getProperty("PIN") || "").trim();
    if (!(cur ? hash_(auth) === cur : !studio || auth.trim() === studio)) {
      failed_(name); throw new Error(cur ? "Current PIN is wrong" : "Studio PIN is wrong");
    }
    props_().setProperty("UPIN_" + name, hash_(newPin));
    first = !cur;
  } finally { lock.releaseLock(); }
  audit_(first ? "set first PIN" : "changed PIN", name, "", name);
  return login_(newPin, name);
}

// Forgot PIN: someone with a role of admin or above vouches with their own name and PIN, on the spot
function resetPin_(name, newPin, byName, byPin) {
  name = String(name || "").trim(); byName = String(byName || "").trim(); newPin = String(newPin || "");
  if (teamNames_().indexOf(name) < 0) throw new Error("Not on the team: " + name);
  if (!PIN_RE.test(newPin)) throw new Error("PIN is 6 digits");
  if (tooMany_(byName)) throw new Error("Too many tries. Wait 15 minutes.");
  if (!checkWho_(byName, byPin)) { failed_(byName); audit_("PIN reset refused", name, "wrong PIN for " + byName, byName); throw new Error("That admin PIN is wrong"); }
  if (rank_(byName) < RANK.admin) throw new Error(byName + " can't reset PINs (admin, M or boss only)");
  if (rank_(name) > rank_(byName)) throw new Error(byName + " can't reset the PIN of a " + roleOf_(name));
  props_().setProperty("UPIN_" + name, hash_(newPin));
  audit_("reset PIN", name, "vouched by " + byName, byName);
  return login_(newPin, name);
}

// From the Team page: an admin, 小M or the boss sets a new PIN for someone (not above them) and tells them in person
function setPinFor_(name, newPin) {
  name = String(name || "").trim(); newPin = String(newPin || "");
  need_("admin");
  if (name === REQ.who) throw new Error("Change your own PIN below");
  if (signers_().indexOf(name) < 0) throw new Error("Not on the team: " + name);
  if (rank_(name) > rank_(REQ.who)) throw new Error("You can't reset the PIN of a " + roleOf_(name));
  if (!PIN_RE.test(newPin)) throw new Error("PIN is 6 digits");
  props_().setProperty("UPIN_" + name, hash_(newPin));
  audit_("reset PIN", name, "on the Team page");
  return people_();
}

// Sign up: name, Gmail, birthday, PIN. Nothing opens until an admin (or above) approves it on the Team page.
function register_(name, gmail, birthday, pin) {
  name = String(name || "").trim().replace(/\s+/g, " "); gmail = String(gmail || "").trim().toLowerCase(); birthday = String(birthday || "").trim(); pin = String(pin || "");
  if (!name || name.length > 40 || name === XIAOM) throw new Error("Pick another name");
  if (!/^[^@\s]+@(gmail\.com|googlemail\.com)$/.test(gmail)) throw new Error("Use a Gmail address");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new Error("Birthday is needed");
  if (!PIN_RE.test(pin)) throw new Error("PIN is 6 digits");
  if (tooMany_("") ) throw new Error("Too many tries. Wait 10 minutes.");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (teamNames_().some(n => n.toLowerCase() === name.toLowerCase())) throw new Error("That name is already on the team. Use First time or Forgot PIN.");
    const pend = jsonProp_("PENDING", []);
    if (pend.length >= 30) throw new Error("Too many sign-ups waiting. Ask an admin.");
    if (pend.some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error("A sign-up for that name is already waiting");
    pend.push({ id: Utilities.getUuid(), kind: "register", name: name, gmail: gmail, birthday: birthday, hash: hash_(pin), at: new Date().toISOString(), ip: REQ.ip, device: REQ.dev });
    setJsonProp_("PENDING", pend);
  } finally { lock.releaseLock(); }
  audit_("signed up", name, gmail, name);
  return { waiting: true };
}

// The Team page: everyone with their role, and (for admins and above) the sign-ups waiting
function people_() {
  const me = REQ.who, myRank = rank_(me), info = jsonProp_("PEOPLE", {});
  const list = teamNames_().map(n => ({ name: n, role: roleOf_(n), hasPin: !!pinOf_(n), gmail: myRank >= RANK.admin ? (info[n] && info[n].gmail) || "" : "" }));
  if (xiaomPin_()) list.push({ name: XIAOM, role: "xiaom", hasPin: true, gmail: "" });
  const pending = myRank >= RANK.admin ? jsonProp_("PENDING", []).map(p => ({ id: p.id, name: p.name, gmail: p.gmail, birthday: p.birthday, at: p.at, ip: p.ip })) : [];
  return { me: { name: me, role: roleOf_(me) }, people: list, pending: pending };
}
function takePending_(id) {
  const pend = jsonProp_("PENDING", []), i = pend.findIndex(p => p.id === id);
  if (i < 0) throw new Error("That sign-up is gone (someone else handled it)");
  const p = pend.splice(i, 1)[0]; setJsonProp_("PENDING", pend); return p;
}
function approve_(id) {
  need_("admin");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let p;
  try {
    p = takePending_(String(id));
    const all = getAll(), team = (all.team || []).slice(), bd = Object.assign({}, all.birthdays || {});
    if (team.indexOf(p.name) < 0) team.push(p.name);
    bd[p.name] = p.birthday;
    setTeam(String(props_().getProperty("PIN") || ""), team, bd);
    props_().setProperty("UPIN_" + p.name, p.hash);
    const info = jsonProp_("PEOPLE", {}); info[p.name] = { gmail: p.gmail }; setJsonProp_("PEOPLE", info);
  } finally { lock.releaseLock(); }
  audit_("approved", p.name, p.gmail);
  return people_();
}
function reject_(id) {
  need_("admin");
  const p = takePending_(String(id));
  audit_("rejected", p.name, p.gmail);
  return people_();
}
// boss: anyone to admin or member; 小M: member <-> admin
function setRole_(name, role) {
  name = String(name || ""); role = String(role || "");
  if (["admin", "member"].indexOf(role) < 0) throw new Error("Role is admin or member");
  if (teamNames_().indexOf(name) < 0 || name === bossName_()) throw new Error("Can't change that person's role");
  need_("xiaom");
  const roles = jsonProp_("ROLES", {}); roles[name] = role; setJsonProp_("ROLES", roles);
  audit_("role " + role, name);
  return people_();
}
// boss removes anyone but the boss; 小M removes members and admins; admins remove members
function removeMember_(name) {
  name = String(name || "");
  const r = rank_(name), mine = rank_(REQ.who);
  if (name === REQ.who) throw new Error("You can't remove yourself");
  if (roleOf_(name) === "boss") throw new Error("Nobody can remove the boss");
  if (mine < RANK.admin || r >= mine) throw new Error("You can't remove a " + roleOf_(name));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (name === XIAOM) { props_().deleteProperty("UPIN_" + XIAOM); props_().setProperty("XIAOM_REMOVED", "1"); }
    else {
      const all = getAll(), team = (all.team || []).filter(n => n !== name), bd = Object.assign({}, all.birthdays || {}); delete bd[name];
      setTeam(String(props_().getProperty("PIN") || ""), team, bd);
      props_().deleteProperty("UPIN_" + name);
      const roles = jsonProp_("ROLES", {}); delete roles[name]; setJsonProp_("ROLES", roles);
    }
  } finally { lock.releaseLock(); }
  audit_("removed", name);
  return people_();
}
// Team edits from the app: birthdays for anyone; adding or removing people needs an admin (removing goes through removeMember)
function setTeamGuarded_(pin, members, birthdays) {
  const cur = teamNames_(), next = (members || []).map(n => String(n).trim()).filter(Boolean);
  const added = next.filter(n => cur.indexOf(n) < 0), gone = cur.filter(n => next.indexOf(n) < 0);
  if (gone.length) throw new Error("Remove people from the Team page (needs admin or above)");
  if (added.length) { need_("admin"); audit_("added", added.join(", ")); }
  return setTeam(pin, next, birthdays);
}
// The log, newest first. Admins and above only; looking at it is logged too.
function auditLog_(limit) {
  need_("admin");
  const sh = book_().getSheetByName(AUDIT); audit_("opened the log", "");
  if (!sh || sh.getLastRow() < 2) return [];
  const n = Math.min(Math.max(10, Number(limit) || 200), 500), last = sh.getLastRow(), from = Math.max(2, last - n + 1);
  return sh.getRange(from, 1, last - from + 1, AUDIT_COLS.length).getDisplayValues().reverse()
    .map(r => ({ at: r[0], who: r[1], action: r[2], target: r[3], detail: r[4], ip: r[5], device: r[6] }));
}

// One job by id (Code.gs has no getJob of its own)
function getJob_(id) { id = String(id || ""); return (getAll().rows || []).find(r => String(r.id) === id) || null; }

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


// ---- Ask M: the chat goes to DeepSeek from here, so the key never leaves the server ----
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
function aiStatus_() { return { ready: !!props_().getProperty("DEEPSEEK_KEY"), model: DEEPSEEK_MODEL }; }
function ask_(messages) {
  const key = String(props_().getProperty("DEEPSEEK_KEY") || "");
  if (!key) throw new Error("Ask M isn't set up yet: add DEEPSEEK_KEY in the script properties");
  // only what a chat needs, and not too much of it: the system note, then the last turns
  const ms = (Array.isArray(messages) ? messages : []).filter(m => m && /^(system|user|assistant)$/.test(m.role))
    .map(m => ({ role: m.role, content: String(m.content || "").slice(0, 24000) }));
  const sys = ms.filter(m => m.role === "system").slice(0, 1), turns = ms.filter(m => m.role !== "system").slice(-16);
  if (!turns.length) throw new Error("Nothing to ask");
  const res = UrlFetchApp.fetch(DEEPSEEK_URL, {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + key },
    payload: JSON.stringify({ model: DEEPSEEK_MODEL, messages: sys.concat(turns), temperature: 0.4, max_tokens: 4000, stream: false })
  });
  const code = res.getResponseCode(), body = res.getContentText();
  if (code !== 200) {
    let msg = ""; try { msg = JSON.parse(body).error.message; } catch (e) {}
    throw new Error(code === 401 ? "DeepSeek refused the key (DEEPSEEK_KEY)" : code === 402 ? "The DeepSeek account is out of credit" : code === 429 ? "DeepSeek is busy, try again in a moment" : "DeepSeek said " + code + (msg ? ": " + msg : ""));
  }
  const o = JSON.parse(body), c = o.choices && o.choices[0];
  return { text: String(c && c.message && c.message.content || "") };
}
