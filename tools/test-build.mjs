// The Pages / Mac build must not carry a shared API key. This runs the real build and checks dist/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const SECRET = "TEST_M_API_KEY_do-not-ship-9f3c1a7e";
const API_URL = "https://example.test/studio-m/exec";
const root = new URL("..", import.meta.url);
const at = p => new URL(p, root);

function runBuild(extra) {
  const env = { ...process.env, M_API_URL: "", M_API_KEY: "", ...extra };
  const r = spawnSync(process.execPath, ["tools/build.mjs"], {
    cwd: new URL(".", root),
    env,
    encoding: "utf8"
  });
  assert.equal(r.status, 0, (r.stderr || "") + (r.stdout || ""));
  return r;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test("built pages do not contain an API key", () => {
  const cfgPath = at("config.local.json");
  const had = existsSync(cfgPath);
  const prev = had ? readFileSync(cfgPath) : null;
  try {
    writeFileSync(cfgPath, JSON.stringify({ apiUrl: API_URL, apiKey: SECRET }));
    runBuild({ M_API_KEY: SECRET });

    const html = readFileSync(at("dist/index.html"), "utf8");
    assert.equal(html.includes(SECRET), false, "dist/index.html contains the API key value");
    assert.equal(html.includes("apiKey"), false, "dist/index.html contains the apiKey field");
    const m = html.match(/window\.M_API = (\{.*?\});/);
    assert.ok(m, "window.M_API missing");
    const cfg = JSON.parse(m[1]);
    assert.deepEqual(Object.keys(cfg), ["apiUrl"]);
    assert.equal(cfg.apiUrl, API_URL);

    const dist = walk(new URL("dist", root).pathname);
    for (const p of dist) {
      if (statSync(p).size > 8_000_000) continue;
      const text = readFileSync(p);
      assert.equal(text.includes(SECRET), false, p + " contains the API key value");
      if (p.endsWith(".html") || p.endsWith(".js")) assert.equal(text.includes("apiKey"), false, p + " contains apiKey");
    }

    const app = readFileSync(at("dist/app.js"), "utf8");
    assert.equal(app.includes("CFG.apiKey"), false);
    assert.equal(app.includes('"key":'), false, "the app still sends a shared key");

    const server = readFileSync(at("api/MApp.gs"), "utf8");
    assert.equal(server.includes("req.key"), false, "server still checks a shared key");
    assert.equal(server.includes('getProperty("API_KEY")'), false, "server still reads API_KEY");
    assert.match(server, /if \(OPEN_LIMITS\[req\.fn\]\) openGate_\(req\.fn\)/);
    assert.match(server, /register:\s*\{\s*ip:\s*3,\s*all:\s*10\s*\}/);
    assert.match(server, /resetPin:\s*\{\s*ip:\s*6,\s*all:\s*20\s*\}/);
    assert.match(server, /setMyPin:\s*\{\s*ip:\s*40,\s*all:\s*500\s*\}/);
    assert.equal(/login:\s*\{\s*ip:/.test(server), false, "login still has an all-call IP cap");
    assert.equal(/team:\s*\{\s*ip:/.test(server), false, "team still has an all-call IP cap");
    assert.match(server, /TEAM_FAIL_CAP = 500/);
    assert.match(server, /get\("pinFails:" \+ name\) \|\| 0\) >= 5/);
    assert.match(server, /get\("pinFails"\) \|\| 0\) >= 30/);
    const bump = server.slice(server.indexOf("function bump_"), server.indexOf("function openGate_"));
    assert.equal(bump.includes("Too many tries"), false, "bump_ reports a cache failure as too many tries");
    assert.match(server, /cache error, sign-in allowed/);
    assert.match(server, /not trusted/);
    for (const fn of ["saveJob", "deleteJob", "saveShoot"]) {
      assert.match(server, new RegExp(fn + ':\\s*"member"'));
    }
    assert.match(server, /if \(WRITE_MIN\[req\.fn\]\) need_\(WRITE_MIN\[req\.fn\]\)/);
    assert.match(server, /does not grant or deny by role/);
    const log = readFileSync(at("CHANGELOG.md"), "utf8");
    assert.match(log, /只要求已登录，角色分级另开 PR/);
    assert.equal(log.includes("member and above"), false);
  } finally {
    if (had) writeFileSync(cfgPath, prev);
    else if (existsSync(cfgPath)) unlinkSync(cfgPath);
  }
});
