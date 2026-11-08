"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { useJobs } from "@/components/jobs/job-store";
import { useApply } from "@/components/apply/apply-provider";
import { nextApplyStep } from "@/lib/fresh-matches.mjs";
import { cn } from "@/lib/cn";

type Item = {
  url: string;
  company: string;
  role: string;
  location: string;
  compensation: string;
  date: string;
  fresh: boolean;
  dateSource: "posted" | "first-seen";
  score: number | null;
  scoreSource: "evaluation" | "quick" | null;
  reason: string;
  trackerN: string | null;
  status: string;
  pdfReady: boolean;
  applied: boolean;
  match: boolean;
};
type Snapshot = { since: string; today: string; minScore: number; items: Item[] };

const QUEUE_KEY = "co-fresh-queue";
const MIN_KEY = "co-fresh-min";
// Below-threshold postings the user explicitly chose to apply to anyway.
const OVERRIDE_KEY = "co-fresh-override";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private window / blocked storage: queue lives for this tab only */
  }
}

const STEP_LABEL: Record<string, string> = {
  evaluate: "Evaluating (full report + score)",
  pdf: "Building tailored CV (PDF)",
  fill: "Ready: fill the form",
  "below-threshold": "Scored below your threshold",
  done: "Applied",
};

export function FreshView() {
  const router = useRouter();
  const { jobs, startJob } = useJobs();
  const apply = useApply();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState(false);
  const [rankMsg, setRankMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [minScore, setMinScore] = useState(4);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<string[]>([]);
  const started = useRef<Set<string>>(new Set());

  useEffect(() => {
    setQueue(load<string[]>(QUEUE_KEY, []));
    setOverrides(load<string[]>(OVERRIDE_KEY, []));
    setMinScore(load<number>(MIN_KEY, 4));
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams({ min: String(minScore) });
      for (const u of load<string[]>(QUEUE_KEY, [])) qs.append("include", u);
      const r = await fetch(`/api/fresh?${qs}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSnap(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load fresh matches");
    } finally {
      setLoading(false);
    }
  }, [minScore]);

  useEffect(() => {
    refresh();
    const onDone = () => refresh();
    window.addEventListener("co-job-done", onDone);
    window.addEventListener("focus", onDone);
    return () => {
      window.removeEventListener("co-job-done", onDone);
      window.removeEventListener("focus", onDone);
    };
  }, [refresh]);

  const byUrl = useMemo(() => new Map((snap?.items ?? []).map((i) => [i.url, i])), [snap]);
  const fresh = (snap?.items ?? []).filter((i) => i.fresh);
  const visible = fresh.filter((i) => showAll || i.match);
  const unranked = fresh.filter((i) => i.score == null);

  const setQ = (q: string[]) => {
    setQueue(q);
    save(QUEUE_KEY, q);
  };

  const rankFresh = async () => {
    setRanking(true);
    setRankMsg(null);
    try {
      const r = await fetch("/api/fresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rank", urls: unranked.map((i) => i.url), min: minScore }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setRankMsg(data.message || `Ranked ${data.ranked} postings.`);
      setSnap(data);
    } catch (e) {
      setRankMsg(e instanceof Error ? e.message : "ranking failed");
    } finally {
      setRanking(false);
    }
  };

  const confirmApply = () => {
    const add = [...selected].filter((u) => !queue.includes(u));
    setQ([...queue, ...add]);
    setSelected(new Set());
  };

  // ── Queue runner: one posting at a time ────────────────────────────────
  // The active posting is the first one not yet applied. Evaluation and the
  // tailored PDF run automatically; the form is opened only when the user
  // clicks, and submitting it is always the user's own click on the real form.
  const queueItems = queue.map((u) => byUrl.get(u)).filter((i): i is Item => !!i);
  const stepOf = (i: Item) => {
    const pdfJobDone = !!i.trackerN && jobs.some((j) => j.kind === "pdf" && j.input === i.trackerN && j.status === "done");
    const effective = { ...i, pdfReady: i.pdfReady || pdfJobDone };
    const step = nextApplyStep(effective, minScore);
    // An explicit "apply anyway" lets a below-threshold posting continue.
    if (step === "below-threshold" && overrides.includes(i.url)) return effective.pdfReady ? "fill" : "pdf";
    return step;
  };
  const active = queueItems.find((i) => stepOf(i) !== "done");
  const activeStep = active ? stepOf(active) : null;
  const jobFor = (kind: string, input: string | null) =>
    input ? [...jobs].reverse().find((j) => j.kind === kind && j.input === input) : undefined;
  const activeJob = active && activeStep === "evaluate" ? jobFor("evaluate", active.url) : active && activeStep === "pdf" ? jobFor("pdf", active.trackerN) : undefined;

  useEffect(() => {
    if (!active || !activeStep) return;
    const key = `${activeStep}:${active.url}`;
    if (started.current.has(key)) return;
    if (activeStep === "evaluate") {
      const running = jobs.some((j) => j.kind === "evaluate" && j.input === active.url && j.status === "running");
      if (running) return;
      started.current.add(key);
      startJob({ title: `Evaluate · ${active.company}`, subtitle: active.role, kind: "evaluate", input: active.url, page: "/fresh" });
    } else if (activeStep === "pdf" && active.trackerN) {
      const running = jobs.some((j) => j.kind === "pdf" && j.input === active.trackerN && j.status === "running");
      if (running) return;
      started.current.add(key);
      startJob({ title: `Tailored CV · ${active.company}`, subtitle: active.role, kind: "pdf", input: active.trackerN, page: "/fresh" });
    }
  }, [active, activeStep, jobs, startJob]);

  const retry = () => {
    if (!active || !activeStep) return;
    started.current.delete(`${activeStep}:${active.url}`);
    refresh();
  };

  const openForm = (i: Item) => {
    apply.open(i.url, { prefill: true, company: i.company, n: i.trackerN ?? undefined, from: "/fresh" });
    router.push("/apply");
  };

  const removeFromQueue = (url: string) => setQ(queue.filter((u) => u !== url));
  const applyAnyway = (url: string) => {
    const next = [...overrides, url];
    setOverrides(next);
    save(OVERRIDE_KEY, next);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-landing">Fresh matches</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Postings dated {snap ? <span className="tabular-nums">{snap.since}</span> : "yesterday"} or today that score at or above your
            threshold. Select the ones you want and confirm. Each is evaluated, gets a tailored CV, then its form is filled for you
            to review. <span className="text-foreground">Nothing is ever submitted for you.</span>
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {/* ── Apply queue ── */}
      {queueItems.length > 0 && (
        <section className="mt-6 rounded-2xl border border-brand/40 bg-surface/50 p-4">
          <h2 className="text-sm font-medium">Apply queue · one at a time</h2>
          <ol className="mt-3 space-y-2">
            {queueItems.map((i) => {
              const step = stepOf(i);
              const isActive = active?.url === i.url;
              return (
                <li key={i.url} className={cn("rounded-xl border px-3 py-2.5", isActive ? "border-brand/50 bg-brand/5" : "border-border")}>
                  <div className="flex flex-wrap items-center gap-2">
                    {step === "done" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : isActive && (step === "evaluate" || step === "pdf") && activeJob?.status !== "error" ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-brand-text" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {i.company} · {i.role}
                      </div>
                      <div className="text-xs text-muted">
                        {isActive || step === "done" ? STEP_LABEL[step] : "Waiting"}
                        {i.score != null && i.scoreSource === "evaluation" && <> · scored {i.score}/5</>}
                      </div>
                    </div>
                    {isActive && step === "fill" && (
                      <button
                        onClick={() => openForm(i)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1 text-xs font-medium text-brand-foreground hover:bg-brand-200"
                      >
                        <Send className="size-3.5" /> Fill form
                      </button>
                    )}
                    {isActive && step === "below-threshold" && (
                      <button
                        onClick={() => applyAnyway(i.url)}
                        title="career-ops recommends against applying below your threshold"
                        className="rounded-full border border-amber-500/50 px-3 py-1 text-xs text-amber-800 hover:bg-amber-500/10 dark:text-amber-300"
                      >
                        Apply anyway
                      </button>
                    )}
                    {isActive && activeJob?.status === "error" && (
                      <button onClick={retry} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground">
                        Retry
                      </button>
                    )}
                    <button onClick={() => removeFromQueue(i.url)} title="Remove from queue" className="rounded p-1 text-faint hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {isActive && step === "below-threshold" && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                      The full evaluation scored this {i.score}/5, below your {minScore} threshold. Recommendation: skip it. Remove it, or
                      choose Apply anyway if you have a specific reason.
                    </p>
                  )}
                  {isActive && step === "fill" && (
                    <p className="mt-2 text-xs text-muted">
                      The form opens in a separate browser career-ops controls. Check every answer, then press Submit on the real form yourself.
                      Mark it Applied there, and the next posting in the queue starts.
                    </p>
                  )}
                  {isActive && activeJob?.status === "error" && (
                    <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                      {activeJob.steps.at(-1)?.label ?? "The worker failed."} See Workers for details.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ── Controls ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1.5 text-muted">
          Min score
          <select
            value={minScore}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinScore(v);
              save(MIN_KEY, v);
            }}
            className="rounded-md border border-border bg-surface px-1.5 py-1 text-foreground"
          >
            {[3.5, 4, 4.5].map((v) => (
              <option key={v} value={v}>
                {v.toFixed(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5 text-muted">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all fresh ({fresh.length})
        </label>
        {unranked.length > 0 && (
          <button
            onClick={rankFresh}
            disabled={ranking}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-60"
          >
            {ranking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Quick-rank {Math.min(unranked.length, 40)} unscored
          </button>
        )}
        {rankMsg && <span className="text-muted">{rankMsg}</span>}
      </div>

      {/* ── List ── */}
      {error ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4" /> {error}
        </div>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center text-sm text-muted">
          {fresh.length === 0
            ? "No postings from the last 24 hours. Run a scan (or set up a daily scheduled scan) to find new ones."
            : unranked.length > 0
              ? `No scored matches yet. ${unranked.length} fresh postings have no score: quick-rank them above.`
              : `None of the ${fresh.length} fresh postings reach ${minScore.toFixed(1)}. Tick "Show all fresh" to see them.`}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
          {visible.map((i) => {
            const queued = queue.includes(i.url);
            const selectable = i.match && !queued;
            return (
              <li key={i.url} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${i.company} ${i.role}`}
                  disabled={!selectable}
                  checked={selected.has(i.url)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(i.url);
                    else next.delete(i.url);
                    setSelected(next);
                  }}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="truncate text-sm font-medium">{i.role}</span>
                    <a href={i.url} target="_blank" rel="noreferrer" className="text-faint hover:text-foreground" title="Open posting">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {i.company}
                    {i.location && <> · {i.location}</>}
                    {i.compensation && <> · {i.compensation}</>} · {i.dateSource === "posted" ? "posted" : "found"} {i.date}
                  </div>
                  {i.reason && <div className="mt-0.5 text-xs text-faint">{i.reason}</div>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {i.score != null ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                        i.score >= minScore ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400" : "bg-surface-hover text-muted",
                      )}
                      title={i.scoreSource === "evaluation" ? "Full evaluation score" : "Quick rank (rank-pipeline.mjs)"}
                    >
                      {i.score}/5{i.scoreSource === "quick" ? " ·quick" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-faint">unscored</span>
                  )}
                  {queued && <span className="text-[11px] text-brand-text">in queue</span>}
                  {i.applied && <span className="text-[11px] text-muted">{i.status}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm">
            {selected.size} selected. Each will be evaluated, get a tailored CV, then wait for you at its form.
          </span>
          <button
            onClick={confirmApply}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand-200"
          >
            <Send className="size-4" /> Confirm apply
          </button>
        </div>
      )}
    </div>
  );
}
