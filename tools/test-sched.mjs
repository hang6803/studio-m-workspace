// src/sched.js: pasted schedules, the same shoot, copies, the time kept in the notes; and MApp.gs's clock-time reading
// for Google Calendar. Run: node --test tools/test-sched.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {}; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../src/sched.js", import.meta.url), "utf8"), ctx);
const S = ctx.MSched;
const team = ["JHang", "Mun", "Michael", "M"];
const today = new Date(2026, 10, 17, 9);   // 17 Nov 2026

// the studio's own WhatsApp update (with WhatsApp's invisible marks around the @mentions)
const UPDATE = `Update

18 - Livestream test, 11am

19 - HAITS call meeting, New Office shooting. 2.30pm

20th
Morning - OCBC Signing Ceremony (Photo)

2.30pm - 8.30pm
AI Summit
1 Photo, 1 Video @⁨JHang⁩
Photo & Video RAW file will immediately copy to client after the event.
2-3min Video highlight @⁨Mun (Studio M)⁩
Delivery - 3 working days

21 - RHB Golf (Photo)

22 - Paw Wow Event
Video highlight - 1st draft on 27th @⁨JHang⁩

23 - Afternoon setup and rehearsal @⁨all⁩

24 - AdiSea Games 2026 @⁨all⁩

28th
Miles with EcoBrown's Walkathon (Andy Leong)

Proton Golf (Morning)
Photo, Video, Fast editing @⁨all⁩`;

const plain = x => JSON.parse(JSON.stringify(x));

test("a WhatsApp update becomes one card per job, on the right day", () => {
  const r = plain(S.parse(UPDATE, { team, today }));
  assert.deepEqual(r.map(c => [c.dates[0], c.name]), [
    ["2026-11-18", "Livestream test"],
    ["2026-11-19", "HAITS call meeting, New Office shooting"],
    ["2026-11-20", "OCBC Signing Ceremony"],
    ["2026-11-20", "AI Summit"],
    ["2026-11-21", "RHB Golf"],
    ["2026-11-22", "Paw Wow Event"],
    ["2026-11-23", "Afternoon setup and rehearsal"],
    ["2026-11-24", "AdiSea Games 2026"],
    ["2026-11-28", "Miles with EcoBrown's Walkathon (Andy Leong)"],
    ["2026-11-28", "Proton Golf"]]);
  const by = n => r.find(c => c.name === n);
  assert.equal(by("Livestream test").time, "11am");
  assert.equal(by("Livestream test").type, "video");
  assert.equal(by("OCBC Signing Ceremony").type, "photo");
  assert.equal(by("OCBC Signing Ceremony").time, "Morning");
  assert.equal(by("AI Summit").time, "2.30pm - 8.30pm");
  assert.deepEqual(by("AI Summit").crew, ["JHang", "Mun"]);
  assert.match(by("AI Summit").notes, /RAW file/);
  assert.deepEqual(by("AdiSea Games 2026").crew, ["JHang", "Mun", "Michael"]);   // @all: the team, not 小M
  assert.equal(by("Proton Golf").time, "Morning");
});

test("counts and ranges are not days; a venue line is the location", () => {
  const r = plain(S.parse("5th\nLaunch event\n1 Photo, 2 Video\n2-3min highlight\nVenue: Sunway Pyramid\n\n6 - Dinner, 7pm", { team, today }));
  assert.deepEqual(r.map(c => [c.dates[0], c.name, c.location]), [["2026-12-05", "Launch event", "Sunway Pyramid"], ["2026-12-06", "Dinner", ""]]);
  assert.equal(r[1].time, "7pm");
});

test("a month in the text is used", () => {
  const r = plain(S.parse("Jan\n3 - CNY shoot\n4 - Gala", { team, today }));
  assert.deepEqual(r.map(c => c.dates[0]), ["2027-01-03", "2027-01-04"]);
});

test("the same shoot is found again, and copies are found", () => {
  const saved = [
    { id: "a", name: "AI Summit", dates: "2026-11-20", createdAt: "1" },
    { id: "b", name: "ai summit ", dates: "2026-11-20", createdAt: "2" },
    { id: "c", name: "RHB Golf", dates: "2026-11-21", createdAt: "3" },
    { id: "d", name: "RHB Golf", dates: "2026-11-22", createdAt: "4" }];
  assert.equal(S.sameIn(saved, { name: "AI Summit", dates: ["2026-11-20"] }).id, "a");
  assert.equal(S.sameIn(saved, { name: "Paw Wow Event", dates: ["2026-11-20"] }), undefined);
  assert.equal(S.sameIn(saved, { name: "RHB Golf", dates: ["2026-11-23"] }), undefined);   // another day: another shoot
  assert.deepEqual(plain(S.dupsOf(saved).map(x => x.id)), ["b"]);
  assert.ok(S.nameLike("Miles with EcoBrown's Walkathon", "Miles with EcoBrowns Walkathon (Andy Leong)"));
  assert.ok(!S.nameLike("RHB Golf", "Proton Golf"));
});

test("the time rides in the notes and comes back out", () => {
  const notes = S.pack("2.30pm - 8.30pm", "RAW to client");
  assert.equal(notes, "⏰ 2.30pm - 8.30pm\nRAW to client");
  assert.equal(S.timeOf({ notes }), "2.30pm - 8.30pm");
  assert.equal(S.notesOf({ notes }), "RAW to client");
  assert.equal(S.timeOf({ notes: "just notes" }), "");
  assert.equal(S.notesOf({ notes: "just notes" }), "just notes");
  assert.equal(S.pack("", "x"), "x");
});

test("MApp.gs reads clock times for Google Calendar", () => {
  const g = {}; vm.createContext(g);
  const src = readFileSync(new URL("../api/MApp.gs", import.meta.url), "utf8");
  const fn = name => src.slice(src.indexOf("function " + name + "("), src.indexOf("\n}", src.indexOf("function " + name + "(")) + 2);
  vm.runInContext(fn("shootTime_") + "\n" + fn("shootTimeText_"), g);
  assert.deepEqual(plain(g.shootTime_("2.30pm - 8.30pm")), [[14, 30], [20, 30]]);
  assert.deepEqual(plain(g.shootTime_("11am")), [[11, 0]]);
  assert.deepEqual(plain(g.shootTime_("12pm")), [[12, 0]]);
  assert.equal(g.shootTime_("Morning"), null);
  assert.equal(g.shootTimeText_("⏰ 7pm\nnotes"), "7pm");
  assert.equal(g.shootTimeText_("notes"), "");
});
