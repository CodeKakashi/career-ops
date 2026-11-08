import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFreshMatches, nextApplyStep, parseRanks, parseTrackerScore, shiftISODate } from "../../src/lib/fresh-matches.mjs";

const PIPELINE = `## Pending

- [ ] https://jobs.ashbyhq.com/a/1 | Acme | Data Engineer | London | posted: 2026-11-08 | rank: 4.5/5 — strong dbt match
- [ ] https://jobs.ashbyhq.com/a/2 | Acme | Analytics Engineer | London | posted: 2026-11-07 | rank: 3.0/5 — needs 5 yrs
- [ ] https://jobs.ashbyhq.com/a/3 | Beta | Data Scientist | Berlin | posted: 2026-11-01 | rank: 4.8/5 — old posting
- [ ] https://jobs.lever.co/c/4 | Gamma | Data Engineer | Paris
- [ ] https://jobs.lever.co/c/5 | Delta | ML Engineer | London

## Filtered out

- [x] ~~Zeta | Senior Data Engineer~~ — filtered https://jobs.lever.co/z/9
- [x] https://jobs.ashbyhq.com/e/6 | Eps | Data Engineer | London | posted: 2026-11-08
`;

const SCAN = new Map([
  ["https://jobs.lever.co/c/4", "2026-11-08"],
  ["https://jobs.lever.co/c/5", "2026-10-01"],
]);

const APPS = [
  { n: "7", company: "Eps", role: "Data Engineer", score: "4.3/5", status: "Evaluated", pdf: "❌", url: "https://jobs.ashbyhq.com/e/6" },
];

const run = (extra = {}) => selectFreshMatches({ pipelineMd: PIPELINE, scanDates: SCAN, applications: APPS, today: "2026-11-08", ...extra });

test("shiftISODate crosses month boundaries", () => {
  assert.equal(shiftISODate("2026-11-01", 1), "2026-10-31");
  assert.equal(shiftISODate("2026-03-01", 1), "2026-02-28");
});

test("parseRanks and parseTrackerScore read the existing formats", () => {
  const r = parseRanks(PIPELINE);
  assert.deepEqual(r.get("https://jobs.ashbyhq.com/a/1"), { score: 4.5, reason: "strong dbt match" });
  assert.equal(parseTrackerScore("4.3/5"), 4.3);
  assert.equal(parseTrackerScore("N/A"), null);
});

test("only today/yesterday postings are fresh; posted: beats first_seen", () => {
  const urls = run().items.map((i) => i.url);
  assert.ok(urls.includes("https://jobs.ashbyhq.com/a/1"));
  assert.ok(urls.includes("https://jobs.ashbyhq.com/a/2")); // yesterday
  assert.ok(urls.includes("https://jobs.lever.co/c/4")); // first_seen today
  assert.ok(!urls.includes("https://jobs.ashbyhq.com/a/3")); // posted a week ago
  assert.ok(!urls.includes("https://jobs.lever.co/c/5")); // first seen last month
});

test("checked rows count only when tracked; filtered rows are dropped", () => {
  const items = run().items;
  assert.ok(!items.some((i) => i.url.includes("/z/9")));
  const tracked = items.find((i) => i.url === "https://jobs.ashbyhq.com/e/6");
  assert.equal(tracked.scoreSource, "evaluation");
  assert.equal(tracked.score, 4.3);
  assert.equal(tracked.trackerN, "7");
});

test("match = score at/above threshold; unranked never matches", () => {
  const by = Object.fromEntries(run().items.map((i) => [i.url, i]));
  assert.equal(by["https://jobs.ashbyhq.com/a/1"].match, true);
  assert.equal(by["https://jobs.ashbyhq.com/a/2"].match, false);
  assert.equal(by["https://jobs.lever.co/c/4"].match, false);
  assert.equal(by["https://jobs.lever.co/c/4"].score, null);
  assert.equal(run({ minScore: 3 }).items.find((i) => i.url.endsWith("/a/2")).match, true);
});

test("applied postings are never a match", () => {
  const apps = [{ ...APPS[0], status: "Applied" }];
  const item = selectFreshMatches({ pipelineMd: PIPELINE, scanDates: SCAN, applications: apps, today: "2026-11-08" }).items.find((i) => i.trackerN === "7");
  assert.equal(item.applied, true);
  assert.equal(item.match, false);
});

test("queued URLs stay visible after they stop being fresh", () => {
  const item = run({ include: ["https://jobs.ashbyhq.com/a/3"] }).items.find((i) => i.url.endsWith("/a/3"));
  assert.ok(item);
  assert.equal(item.fresh, false);
  assert.equal(item.match, true);
});

test("sorted by score, highest first, unranked last", () => {
  const scores = run().items.map((i) => i.score);
  assert.deepEqual(scores, [4.5, 4.3, 3.0, null]);
  assert.ok(run().items.every((i) => i.fresh));
});

test("nextApplyStep walks evaluate → pdf → fill and stops below the line", () => {
  assert.equal(nextApplyStep({ scoreSource: "quick", score: 4.5 }), "evaluate");
  assert.equal(nextApplyStep({ scoreSource: "evaluation", trackerN: "7", score: 3.5 }), "below-threshold");
  assert.equal(nextApplyStep({ scoreSource: "evaluation", trackerN: "7", score: 4.3, pdfReady: false }), "pdf");
  assert.equal(nextApplyStep({ scoreSource: "evaluation", trackerN: "7", score: 4.3, pdfReady: true }), "fill");
  assert.equal(nextApplyStep({ applied: true }), "done");
});
