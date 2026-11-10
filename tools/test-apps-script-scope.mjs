// Apps Script runs every file in one project as one global scope. A name defined in both
// Code.gs and MApp.gs is one binding: the later file replaces the earlier one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const codeSrc = readFileSync(new URL("../api/__fixtures__/Code.gs", import.meta.url), "utf8");
const mappSrc = readFileSync(new URL("../api/MApp.gs", import.meta.url), "utf8");

function topLevelNames(src) {
  const names = [];
  let i = 0;
  const n = src.length;
  let brace = 0, paren = 0, bracket = 0;
  let last = "op";
  const isIdent = c => /[A-Za-z0-9_$]/.test(c);
  const isStart = c => /[A-Za-z_$]/.test(c);
  const keywords = new Set(["return", "throw", "typeof", "case", "void", "do", "else", "in", "of", "new", "delete", "yield", "await"]);

  function skipSpace() {
    while (i < n) {
      if (src[i] === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (src[i] === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
      if (src[i] !== " " && src[i] !== "\n" && src[i] !== "\r" && src[i] !== "\t") break;
      i++;
    }
  }
  function readIdent() {
    skipSpace();
    if (!isStart(src[i])) return "";
    const s = i;
    i++;
    while (i < n && isIdent(src[i])) i++;
    return src.slice(s, i);
  }
  function skipString(q) {
    i++;
    while (i < n) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === q) { i++; return; }
      i++;
    }
  }
  function skipRegex() {
    i++;
    let cls = false;
    while (i < n) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === "[") cls = true;
      else if (src[i] === "]") cls = false;
      else if (src[i] === "/" && !cls) { i++; while (i < n && /[a-z]/i.test(src[i])) i++; return; }
      else if (src[i] === "\n") return;
      i++;
    }
  }

  while (i < n) {
    skipSpace();
    if (i >= n) break;
    const c = src[i];
    if (c === "'" || c === '"') { skipString(c); last = "other"; continue; }
    if (c === "/" && last !== "ident" && last !== ")" && last !== "]") { skipRegex(); last = "other"; continue; }
    if (c === "{") { brace++; i++; last = "op"; continue; }
    if (c === "}") { brace = Math.max(0, brace - 1); i++; last = "other"; continue; }
    if (c === "(") { paren++; i++; last = "op"; continue; }
    if (c === ")") { paren = Math.max(0, paren - 1); i++; last = ")"; continue; }
    if (c === "[") { bracket++; i++; last = "op"; continue; }
    if (c === "]") { bracket = Math.max(0, bracket - 1); i++; last = "]"; continue; }
    if (brace === 0 && paren === 0 && bracket === 0 && isStart(c)) {
      const s = i;
      i++;
      while (i < n && isIdent(src[i])) i++;
      const word = src.slice(s, i);
      if (word === "function") {
        const name = readIdent();
        if (name) names.push(name);
        last = "ident";
        continue;
      }
      if (word === "const" || word === "let" || word === "var") {
        for (;;) {
          const name = readIdent();
          if (name) names.push(name);
          skipSpace();
          if (src[i] === "=") {
            i++;
            last = "op";
            let b = brace, p = paren, k = bracket;
            while (i < n) {
              skipSpace();
              if (i >= n) break;
              const d = src[i];
              if (d === "'" || d === '"') { skipString(d); continue; }
              if (d === "/" && last !== "ident" && last !== ")" && last !== "]") { skipRegex(); last = "other"; continue; }
              if (d === "{") { b++; i++; last = "op"; continue; }
              if (d === "}") { b--; i++; last = "other"; continue; }
              if (d === "(") { p++; i++; last = "op"; continue; }
              if (d === ")") { p--; i++; last = ")"; continue; }
              if (d === "[") { k++; i++; last = "op"; continue; }
              if (d === "]") { k--; i++; last = "]"; continue; }
              if (b === brace && p === paren && k === bracket && (d === "," || d === ";")) break;
              if (isStart(d)) {
                const s2 = i;
                i++;
                while (i < n && isIdent(src[i])) i++;
                const w2 = src.slice(s2, i);
                last = keywords.has(w2) ? "op" : "ident";
                continue;
              }
              i++;
              last = "op";
            }
          }
          skipSpace();
          if (src[i] === ",") { i++; last = "op"; continue; }
          if (src[i] === ";") { i++; last = "op"; }
          break;
        }
        continue;
      }
      last = keywords.has(word) ? "op" : "ident";
      continue;
    }
    if (isStart(c)) {
      const s = i;
      i++;
      while (i < n && isIdent(src[i])) i++;
      const word = src.slice(s, i);
      last = keywords.has(word) ? "op" : "ident";
      continue;
    }
    i++;
    last = "op";
  }
  return names;
}

test("Code.gs and MApp.gs do not share a top-level name", () => {
  const codeNames = topLevelNames(codeSrc);
  const mappNames = topLevelNames(mappSrc);
  assert.ok(codeNames.includes("bump_"), "fixture should still define Code.gs bump_");
  assert.ok(codeNames.includes("withLock_"));
  assert.ok(codeNames.includes("props_"));
  assert.ok(mappNames.includes("bumpCount_"));
  assert.ok(mappNames.includes("doPost"));
  assert.ok(mappNames.includes("login_"));
  assert.equal(mappNames.includes("bump_"), false, "MApp.gs must not declare bump_");
  const codeSet = new Set(codeNames);
  const dup = mappNames.filter(name => codeSet.has(name));
  assert.deepEqual(dup, [], "duplicate top-level names: " + dup.join(", "));
});

function sheet() {
  const rows = [];
  const self = {
    setFrozenRows() {},
    getLastRow() { return rows.length; },
    getLastColumn() { return rows.reduce((m, r) => Math.max(m, r.length), 0); },
    getDataRange() {
      return self.getRange(1, 1, Math.max(rows.length, 1), Math.max(self.getLastColumn(), 1));
    },
    getRange(r, c, numRows, numCols) {
      const nr = numRows == null ? 1 : numRows;
      const nc = numCols == null ? 1 : numCols;
      const range = {
        setNumberFormat() { return range; },
        setValues(vals) {
          for (let ri = 0; ri < vals.length; ri++) {
            const at = r - 1 + ri;
            while (rows.length <= at) rows.push([]);
            for (let ci = 0; ci < vals[ri].length; ci++) {
              const col = c - 1 + ci;
              while (rows[at].length <= col) rows[at].push("");
              rows[at][col] = vals[ri][ci] == null ? "" : String(vals[ri][ci]);
            }
          }
          return range;
        },
        getDisplayValues() {
          const out = [];
          for (let ri = 0; ri < nr; ri++) {
            const src = rows[r - 1 + ri] || [];
            const line = [];
            for (let ci = 0; ci < nc; ci++) line.push(src[c - 1 + ci] == null ? "" : String(src[c - 1 + ci]));
            out.push(line);
          }
          return out;
        },
        clearContent() {},
      };
      return range;
    },
    clearContents() { rows.length = 0; },
    deleteRow(at) { rows.splice(at - 1, 1); },
  };
  return self;
}

test("login and a write share one scope and Code.gs bump_ still increments REV", () => {
  const props = {};
  const cacheStore = new Map();
  const sheets = new Map();
  const team = sheet();
  team.getRange(1, 1, 1, 2).setValues([["name", "birthday"]]);
  team.getRange(2, 1, 1, 2).setValues([["Hang", "1990-03-12"]]);
  sheets.set("Team", team);
  let flushed = 0;
  const cache = {
    get(k) {
      if (k == null || k === "") throw new Error("cache key required");
      return cacheStore.has(k) ? cacheStore.get(k) : null;
    },
    put(k, v, ttl) {
      if (typeof k !== "string" || !k) throw new Error("cache key required");
      if (typeof ttl !== "number" || !(ttl > 0)) throw new Error("cache ttl required");
      cacheStore.set(k, String(v));
    },
    remove(k) { cacheStore.delete(k); },
    getAll(keys) { const o = {}; for (const k of keys) o[k] = cache.get(k); return o; },
    putAll(obj, ttl) { for (const k of Object.keys(obj)) cache.put(k, obj[k], ttl); },
  };
  const ss = {
    getName: () => "Studio M Backup Data",
    getSheetByName: name => sheets.get(name) || null,
    insertSheet(name) { const sh = sheet(); sheets.set(name, sh); return sh; },
    getSheets: () => [...sheets.values()],
  };
  const context = {
    console,
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (Object.prototype.hasOwnProperty.call(props, k) ? String(props[k]) : null),
      setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: k => { delete props[k]; },
    }) },
    SpreadsheetApp: { getActive: () => ss, openById: () => ss, flush: () => { flushed++; } },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      getUuid: () => "uuid-test",
      computeDigest(_alg, text) { return [...createHash("sha256").update(String(text), "utf8").digest()]; },
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(s) { const o = { setMimeType() { return o; }, getContent: () => s }; return o; },
    },
  };
  vm.createContext(context);
  const api = vm.runInContext(codeSrc + "\n" + mappSrc + "\n;({ doPost, bump_, bumpCount_, hash_, props_ })", context);
  api.props_().setProperty("PIN_SALT", "testsalt");
  api.props_().setProperty("UPIN_Hang", api.hash_("246810"));

  const post = body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  const signed = post({ fn: "login", args: ["246810"], ip: "203.0.113.5", dev: "test" });
  assert.equal(signed.error, undefined, signed.error);
  assert.equal(signed.result.name, "Hang");
  assert.equal(typeof signed.result.token, "string");
  assert.equal(props.REV, undefined, "login must not bump REV");

  const saved = post({
    fn: "saveJob", token: signed.result.token,
    args: ["", { id: "j1", name: "Tan Wedding", year: "2026", section: "Wedding" }],
    ip: "203.0.113.5", dev: "test",
  });
  assert.equal(saved.error, undefined, saved.error);
  assert.equal(saved.result, true);
  assert.equal(props.REV, "1", "withLock_ must call Code.gs bump_(), which stores REV");
  assert.equal(flushed, 1);
  assert.equal(api.bump_.length, 0);
  assert.equal(api.bumpCount_("op:register:203.0.113.5", 600), 1);
  assert.equal(cacheStore.get("op:register:203.0.113.5"), "1");
  api.bump_();
  assert.equal(props.REV, "2");
});
