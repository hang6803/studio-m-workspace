import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { CASES, CTX } from "./brain-cases.mjs";
const g = {}; vm.runInNewContext(readFileSync(new URL("../src/brain.js", import.meta.url), "utf8"), { globalThis: g });
const B = g.MBrain;
test("M's brain has a few hundred examples", () => { assert.ok(B.size >= 500, `only ${B.size} examples`); });
test("M's brain understands requests it hasn't seen (>= 90%)", () => {
  const wrong = CASES.filter(([q, want]) => B.classify(q, CTX).intent !== want).map(([q, want]) => `${q} → ${B.classify(q, CTX).intent} (want ${want})`);
  const ok = (CASES.length - wrong.length) / CASES.length;
  if (process.env.SHOW) console.log(wrong.join("\n"));
  assert.ok(ok >= .9, `${Math.round(ok * 100)}% right; wrong:\n${wrong.join("\n")}`);
});
