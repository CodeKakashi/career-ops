// Fresh matches: postings first seen or posted in the last ~24h that score as a
// strong match. Pure logic, no I/O, so `node --test` can assert it directly.
//
// Freshness is day-granular because both inputs are dates, not timestamps:
// the scanner's `posted:` label (the employer's own posting date) and, when the
// board gives none, scan-history's first_seen. "Last 24h" therefore means
// "dated today or yesterday" in the user's local calendar.
//
// Score precedence: a full evaluation (tracker score) beats the quick
// rank-pipeline.mjs annotation. A posting with neither is "unranked": it is
// shown so the user can rank it, but it never counts as a match.

import { parseInbox } from "./pipeline-table.mjs";
import { normalizeUrl } from "./core/url-key.mjs";
import { readTrackerUrl } from "./posting-url.mjs";

export const DEFAULT_MIN_SCORE = 4.0;
export const DEFAULT_WINDOW_DAYS = 1;

// Tracker states after which a posting is no longer something to apply to.
const DONE_STATES = new Set(["applied", "responded", "assessment", "interview", "offer", "hired", "rejected", "discarded", "skip"]);

const RANK_SEGMENT = /\|\s*rank:\s*(\d+(?:\.\d+)?)\/5\s*—\s*([^|]*)/i;

/** YYYY-MM-DD `days` before `iso` (calendar arithmetic, timezone-free). */
export function shiftISODate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

/** Map<url, {score, reason}> of rank-pipeline.mjs annotations on pipeline rows. */
export function parseRanks(md) {
  const ranks = new Map();
  for (const line of String(md ?? "").split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*\[[ xX]\]\s*(\S+)/);
    if (!m) continue;
    const r = line.match(RANK_SEGMENT);
    if (!r) continue;
    const score = Number(r[1]);
    if (Number.isFinite(score)) ranks.set(m[1], { score, reason: r[2].trim() });
  }
  return ranks;
}

/** "4.2/5" → 4.2; anything else (N/A, —, blank) → null. */
export function parseTrackerScore(cell) {
  const m = String(cell ?? "").match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  return m ? Number(m[1]) : null;
}

/**
 * @param {object} input
 * @param {string} input.pipelineMd - data/pipeline.md contents
 * @param {Map<string,string>} input.scanDates - url → first_seen (YYYY-MM-DD)
 * @param {{n:string, company:string, role:string, score:string, status:string, pdf:string, url?:string}[]} input.applications
 * @param {string} input.today - local YYYY-MM-DD
 * @param {number} [input.windowDays]
 * @param {number} [input.minScore]
 * @param {Iterable<string>} [input.include] - URLs kept regardless of age (the apply queue)
 */
export function selectFreshMatches({ pipelineMd, scanDates, applications, today, windowDays = DEFAULT_WINDOW_DAYS, minScore = DEFAULT_MIN_SCORE, include = [] }) {
  const keep = new Set(include);
  const since = shiftISODate(today, windowDays);
  const ranks = parseRanks(pipelineMd);
  const byUrl = new Map();
  for (const app of applications ?? []) {
    const key = normalizeUrl(readTrackerUrl(app.url));
    if (key && !byUrl.has(key)) byUrl.set(key, app);
  }

  const seen = new Set();
  const out = [];
  for (const job of parseInbox(pipelineMd ?? "")) {
    if (!/^https?:\/\//i.test(job.url) || seen.has(job.url)) continue;
    seen.add(job.url);
    const app = byUrl.get(normalizeUrl(job.url)) ?? null;
    // A checked row that is not in the tracker was filtered or processed away
    // (e.g. "Filtered out" section) — not a candidate.
    if (job.done && !app) continue;

    const date = job.postedAt ?? scanDates?.get(job.url) ?? null;
    const fresh = !!date && date >= since && date <= today;
    if (!fresh && !keep.has(job.url)) continue;

    const evalScore = app ? parseTrackerScore(app.score) : null;
    const rank = ranks.get(job.url) ?? null;
    const score = evalScore ?? rank?.score ?? null;
    const source = evalScore != null ? "evaluation" : rank ? "quick" : null;
    const status = app?.status ?? "";
    const applied = DONE_STATES.has(status.trim().toLowerCase());

    out.push({
      url: job.url,
      company: job.company,
      role: job.role,
      location: job.location ?? "",
      compensation: job.compensation ?? "",
      date: date ?? "",
      fresh,
      dateSource: job.postedAt ? "posted" : "first-seen",
      score,
      scoreSource: source,
      reason: source === "quick" ? rank.reason : "",
      trackerN: app?.n ?? null,
      status,
      pdfReady: (app?.pdf ?? "").includes("✅"),
      applied,
      match: score != null && score >= minScore && !applied,
    });
  }

  out.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.date.localeCompare(a.date) || a.company.localeCompare(b.company));
  return { since, today, minScore, items: out };
}

/**
 * Next step for a queued posting, in order: evaluate → (stop if below the
 * line) → tailored PDF → fill form. Never "submit": that is the user's click.
 * @returns {"evaluate"|"below-threshold"|"pdf"|"fill"|"done"}
 */
export function nextApplyStep(item, minScore = DEFAULT_MIN_SCORE) {
  if (item.applied) return "done";
  if (item.scoreSource !== "evaluation" || !item.trackerN) return "evaluate";
  if (item.score == null || item.score < minScore) return "below-threshold";
  if (!item.pdfReady) return "pdf";
  return "fill";
}
