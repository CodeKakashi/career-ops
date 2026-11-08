import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { careerOpsRoot, readApplications, readScanDates, rootScript } from "@/lib/career-ops";
import { resolveCodeRoot } from "@/lib/core/code-root.mjs";
import { localISODate } from "@/lib/followups";
import { selectFreshMatches, DEFAULT_MIN_SCORE } from "@/lib/fresh-matches.mjs";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // a quick-rank pass is one CLI call per batch of postings

// Hard cap on one rank pass, so a click can never queue an unbounded AI spend.
const MAX_RANK = 40;

function readPipeline(): string {
  try {
    return fs.readFileSync(path.join(careerOpsRoot(), "data", "pipeline.md"), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw err;
  }
}

type Snap = ReturnType<typeof selectFreshMatches>;

/**
 * Hide postings the scanner's OWN portals.yml filters would reject (title and
 * location). Rows added outside the scanner, e.g. from Explore / "new this
 * week", never went through those filters. Runs the core's filter builders in
 * a child process, the same way core/pipeline.ts reaches scan.mjs, so there is
 * no second implementation. Fails open: if the check cannot run, nothing is
 * hidden. Queued URLs are always kept.
 */
async function inScope(snap: Snap, keep: string[]): Promise<Snap> {
  const codeRoot = resolveCodeRoot(process.cwd(), process.env);
  const scanPath = rootScript("scan");
  if (!fs.existsSync(scanPath) || snap.items.length === 0) return snap;
  const code = `
import { readFileSync } from "node:fs";
import { buildLocationFilter, PORTALS_PATH } from ${JSON.stringify(pathToFileURL(scanPath).href)};
import { buildTitleFilter } from ${JSON.stringify(pathToFileURL(path.join(codeRoot, "title-keywords.mjs")).href)};
import { loadYaml } from ${JSON.stringify(pathToFileURL(path.join(codeRoot, "lib", "yaml-document.mjs")).href)};
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { input += d; });
process.stdin.on("end", () => {
  try {
    const cfg = loadYaml(readFileSync(PORTALS_PATH, "utf8")) || {};
    const title = buildTitleFilter(cfg.title_filter);
    const loc = buildLocationFilter(cfg.location_filter);
    const items = JSON.parse(input);
    process.stdout.write(JSON.stringify(items.map((i) => title(i.role || "") && loc(i.location || ""))));
  } catch (e) {
    process.stdout.write("null");
  }
});
`;
  const verdicts = await new Promise<boolean[] | null>((resolve) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", code], { cwd: codeRoot, env: process.env, windowsHide: true });
    let out = "";
    const timer = setTimeout(() => child.kill(), 20_000);
    child.stdout.on("data", (d) => (out += d));
    child.on("error", () => resolve(null));
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const v = JSON.parse(out);
        resolve(Array.isArray(v) && v.length === snap.items.length ? v : null);
      } catch {
        resolve(null);
      }
    });
    child.stdin.end(JSON.stringify(snap.items.map((i) => ({ role: i.role, location: i.location }))));
  });
  if (!verdicts) return snap;
  const kept = new Set(keep);
  return { ...snap, items: snap.items.filter((i, idx) => verdicts[idx] || kept.has(i.url)) };
}

async function scoped(minScore: number, include: string[] = []) {
  return inScope(snapshot(minScore, include), include);
}

function snapshot(minScore: number, include: string[] = []) {
  return selectFreshMatches({
    include,
    pipelineMd: readPipeline(),
    scanDates: readScanDates(),
    applications: readApplications(),
    today: localISODate(),
    minScore,
  });
}

function minScoreFrom(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : DEFAULT_MIN_SCORE;
}

// Read-only list of fresh postings with their best known score.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const min = minScoreFrom(params.get("min"));
  // ?include=<url>&include=<url> keeps queued postings listed after they age out.
  const include = params.getAll("include").filter((u) => /^https?:\/\//i.test(u)).slice(0, 100);
  return Response.json(await scoped(min, include));
}

// POST { action: "rank", urls: string[] } — quick-rank the given fresh postings
// via the core's rank-pipeline.mjs (annotates pipeline.md, never filters or
// submits). Only URLs that are currently fresh AND unranked are passed on, so
// the request body can't steer the script at arbitrary rows.
export async function POST(req: Request) {
  const body = await readJsonObject<{ action?: string; urls?: unknown; min?: unknown }>(req);
  if (!body || body.action !== "rank") return Response.json({ error: "unsupported action" }, { status: 400 });
  const min = minScoreFrom(body.min);
  const requested = new Set(Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === "string") : []);
  const eligible = (await scoped(min)).items.filter((i) => i.fresh && i.score == null && (requested.size === 0 || requested.has(i.url))).map((i) => i.url).slice(0, MAX_RANK);
  if (eligible.length === 0) return Response.json({ ranked: 0, message: "Nothing to rank: every fresh posting already has a score.", ...(await scoped(min)) });

  const script = rootScript("rank-pipeline");
  if (!fs.existsSync(script)) return Response.json({ error: "rank-pipeline.mjs not found in the career-ops checkout" }, { status: 500 });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-fresh-"));
  const urlsFile = path.join(dir, "urls.txt");
  fs.writeFileSync(urlsFile, eligible.join("\n") + "\n");
  const result = await new Promise<{ code: number; out: string; err: string }>((resolve) => {
    execFile(
      process.execPath,
      [script, "--urls-file", urlsFile, "--limit", String(eligible.length)],
      { cwd: resolveCodeRoot(process.cwd(), process.env), timeout: 550_000, maxBuffer: 8 << 20, windowsHide: true },
      (error, out, err) => resolve({ code: error ? (typeof error.code === "number" ? error.code : 1) : 0, out: out || "", err: err || "" }),
    );
  });
  fs.rmSync(dir, { recursive: true, force: true });

  if (result.code !== 0) {
    return Response.json({ error: (result.err || result.out || "rank-pipeline failed").trim().slice(-400) }, { status: 500 });
  }
  return Response.json({ ranked: eligible.length, message: result.out.trim().split("\n").slice(-3).join(" "), ...(await scoped(min)) });
}
