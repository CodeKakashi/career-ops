# career-ops: Beginner's Guide

A plain-English guide to running your job search with career-ops: what to use, where to use it, and the exact commands.

> **New here? Read sections 1–4 first.** They cover 90% of daily use. The rest is reference you can look up when you need it.

---

## Contents

1. [What career-ops is (in 30 seconds)](#1-what-career-ops-is-in-30-seconds)
2. [The 3 places you use it](#2-the-3-places-you-use-it)
3. [First-time check (5 minutes)](#3-first-time-check-5-minutes)
4. [Your daily routine, step by step](#4-your-daily-routine-step-by-step)
5. [Auto-apply with the Fresh matches tab](#5-auto-apply-with-the-fresh-matches-tab)
6. [Chat commands (inside Claude Code)](#6-chat-commands-inside-claude-code)
7. [Terminal commands](#7-terminal-commands)
8. [Web app pages](#8-web-app-pages)
9. [Your files: what lives where](#9-your-files-what-lives-where)
10. [Your current settings](#10-your-current-settings)
11. [Safety rules (what it will never do)](#11-safety-rules-what-it-will-never-do)
12. [Troubleshooting](#12-troubleshooting)
13. [Glossary](#13-glossary)

---

## 1. What career-ops is (in 30 seconds)

career-ops is an AI job-search assistant that runs **on your own Mac**. It:

1. **Finds** jobs on company career sites (for free, no AI needed).
2. **Scores** each job against your CV (0–5).
3. **Writes** a CV tailored to each job, as a PDF.
4. **Fills in** application forms for you, and **stops before Submit** so you check and send them yourself.
5. **Tracks** every application, follow-up and interview.

Your CV, profile and tracker stay on your machine.

---

## 2. The 3 places you use it

| Place | What it is | Use it for | How to open it |
|---|---|---|---|
| 💬 **Claude Code chat** | The AI assistant in your terminal | Evaluating jobs, tailored CVs, cover letters, interview prep, and anything that needs thinking | `cd ~/career-ops` then `claude` |
| ⌨️ **Terminal** | Plain commands, no AI | Scanning for jobs, health checks, stats, updating statuses. Free and fast | Any terminal, inside `~/career-ops` |
| 🌐 **Web app** | A dashboard in your browser | Seeing everything visually, **Fresh matches**, **auto-apply** | `cd ~/career-ops/web && npm run dev`, then open the address it prints (usually http://127.0.0.1:3000) |

**Rule of thumb:**
- Want to *see* or *click*? → **Web app**
- Want the AI to *think or write*? → **Claude Code chat**
- Want a quick *fact or check*? → **Terminal**

---

## 3. First-time check (5 minutes)

Run these once in the terminal, from `~/career-ops`:

```bash
cd ~/career-ops
node doctor.mjs            # checks your setup; everything should show ✓
node verify-pipeline.mjs   # checks your tracker and pipeline are healthy
```

Then in the web app:

1. Open **Config** in the sidebar.
2. Select **Claude Code** (it is already installed and detected).
3. Click **Save config**.

✅ Done. You don't need to repeat this.

---

## 4. Your daily routine, step by step

### Step 1: Find new jobs (free)
**Where:** Terminal, or the web app's **Scheduled scans** page.
```bash
node scan.mjs
```
New matching jobs are added to `data/pipeline.md`. Only jobs that pass your filters get in (UK + EU, Junior–Mid titles, posted in the last 45 days).

> 💡 Set up a **daily scheduled scan** in the web app (**Scheduled scans** page) so new jobs arrive automatically.

### Step 2: Pick the good ones
**Where:** Web app → **Fresh matches** (see [section 5](#5-auto-apply-with-the-fresh-matches-tab)).
Or in the Claude Code chat:
```
/career-ops pipeline
```
This evaluates the jobs waiting in your pipeline one by one.

### Step 3: Evaluate a single job
**Where:** Claude Code chat. Just paste the job link:
```
https://jobs.ashbyhq.com/company/12345
```
career-ops checks the job is still open, scores it (A–G report), and saves a report in `reports/`.
- **Score 4.0 or more** → worth applying.
- **Below 4.0** → it will recommend you skip it.

### Step 4: Get a tailored CV
**Where:** Claude Code chat.
```
/career-ops pdf
```
The PDF is saved in `output/`.

### Step 5: Apply
**Where:** Web app → **Fresh matches** or **Pipeline** → **Apply**.
career-ops fills the form. **You check it and click Submit yourself.**

### Step 6: Record it
**Where:** Web app (**Mark Applied** button) or terminal:
```bash
node set-status.mjs "Monzo" Applied
```

### Step 7: Follow up
**Where:** Web app → **Follow-ups**, or terminal:
```bash
node followup-cadence.mjs --summary
```

---

## 5. Auto-apply with the Fresh matches tab

This is the fastest way to apply: new jobs from the last 24 hours, scored, with the forms filled in for you.

> ⚠️ The **Fresh matches** tab was added to your copy only. If a career-ops update ever removes it, ask Claude to restore it.

**How to use it:**

1. **Start the web app:** `cd ~/career-ops/web && npm run dev`
   *(If you use `npm start`, run `npm run build` first. Otherwise new pages won't show.)*
2. Click **Fresh matches** in the sidebar.
3. Click **Quick-rank N unscored** to give each new job a quick AI score.
4. Jobs scoring **4.0 or more** are shown. Tick **Show all fresh** to see the rest.
5. **Tick** the jobs you want → click **Confirm apply**.
6. The **Apply queue** handles one job at a time:

   | Step | What happens | Your action |
   |---|---|---|
   | Evaluating | Full report + real score | Wait |
   | Scored below threshold | It recommends skipping | Remove it, or press **Apply anyway** |
   | Building tailored CV | Tailored PDF is made | Wait |
   | **Ready: fill the form** | — | Click **Fill form** |
   | Form filled | The real application opens in a separate browser with your answers | **Check every answer, then click Submit yourself** |
   | Back in the app | — | Click **Mark Applied** → the next job starts |

**Good to know:**
- "Last 24 hours" means **dated today or yesterday**. Job sites give dates, not exact times.
- Some forms have **CAPTCHAs or checkboxes** it leaves for you. The Apply page lists anything it skipped.
- It **never submits**. There is no setting that changes this.

---

## 6. Chat commands (inside Claude Code)

Open the chat first: `cd ~/career-ops` then `claude`. Then type a command, **or just describe what you want in plain English**. Both work.

### 🔍 Finding jobs
| Command | What it does |
|---|---|
| *(paste a job URL)* | Full evaluation + report + tracker entry (the most common action) |
| `/career-ops scan` | Search all your company career pages for new jobs |
| `/career-ops pipeline` | Evaluate every job waiting in `data/pipeline.md` |
| `/career-ops triage` | Quick first-pass filter before full evaluations |
| `/career-ops discover` | Turn a list of company names into scannable job boards |
| `/career-ops titles` | Suggest other job titles that fit your CV |

### 📊 Evaluating
| Command | What it does |
|---|---|
| `/career-ops oferta` | Evaluate one job in detail |
| `/career-ops ofertas` | Compare several jobs side by side |
| `/career-ops deep` | Deep research on a company |
| `/career-ops batch` | Evaluate many jobs at once |

### 📄 Applying
| Command | What it does |
|---|---|
| `/career-ops pdf` | Tailored CV as a PDF |
| `/career-ops text` | Tailored CV as Markdown (to paste elsewhere) |
| `/career-ops cover` | Cover letter |
| `/career-ops apply` | Help filling an application form (never submits) |
| `/career-ops email` | Draft an application email (never sends) |
| `/career-ops contacto` | Find recruiters / hiring managers + draft a LinkedIn message |
| `/career-ops ats` | Check your CV reads well in applicant tracking systems |

### 📋 Tracking
| Command | What it does |
|---|---|
| `/career-ops tracker` | Show where all your applications stand |
| `/career-ops followup` | Who to follow up with, and when |
| `/career-ops reply-watch` | Sort replies from companies and suggest tracker updates |
| `/career-ops outcome` | Record a result (rejected, offer, hired) |

### 🎤 Interviews and offers
| Command | What it does |
|---|---|
| `/career-ops interview-prep` | Prep doc for a specific company |
| `/career-ops interview/plan` | Time-blocked prep plan before an interview |
| `/career-ops interview/practice` | Mock interview with feedback |
| `/career-ops interview/debrief` | Review a real interview afterwards |
| `/career-ops interview-redflag` | Check a company for red flags |
| `/career-ops offer-prep` | Walk through an offer/contract before signing |

### 🧠 Improving your profile
| Command | What it does |
|---|---|
| `/career-ops add` | Add a new project, role or paper to your CV |
| `/career-ops expand` | Find skills you forgot to put on your CV |
| `/career-ops intake` | Build your profile from documents in `documents/` |
| `/career-ops upskill` | Which skills your target jobs keep asking for |
| `/career-ops patterns` | What your rejections have in common |
| `/career-ops retro` | Teach career-ops a correction so it remembers next time |
| `/career-ops update` | Update career-ops |

> 💡 You don't have to remember these. Typing `/career-ops` alone shows the menu, and plain English works too: *"prepare me for my Monzo interview"*.

---

## 7. Terminal commands

Run all of these from inside `~/career-ops`. **None of them use AI tokens.**

### Everyday
| Command | What it does |
|---|---|
| `node scan.mjs` | Find new jobs on all your company career pages |
| `node scan.mjs --dry-run` | Preview a scan without saving anything |
| `node set-status.mjs "Company" Applied` | Change an application's status |
| `node set-status.mjs 3 Interview --note "Call on Tue"` | Same, using the tracker row number, with a note |
| `node followup-cadence.mjs --summary` | Which applications need a follow-up |
| `node stats.mjs --summary` | Your overall job-search numbers |
| `node closing-soon.mjs` | Jobs with deadlines coming up |

**Status words you can use:** `Evaluated`, `Applied`, `Responded`, `Assessment`, `Interview`, `Offer`, `Hired`, `Rejected`, `Discarded`, `SKIP`.

### Checking jobs and companies
| Command | What it does |
|---|---|
| `node check-liveness.mjs <job-url>` | Is this job still open? |
| `node sponsor-check.mjs --company "Monzo" --summary` | Does this UK employer hold a visa sponsor licence? (`not-found` = *unconfirmed*, not "no") |
| `node company-history.mjs --company "Monzo" --summary` | Everything you've done with one company |
| `node rank-pipeline.mjs --limit 20` | Quick AI score for jobs in your pipeline *(uses a little AI)* |

### Health and maintenance
| Command | What it does |
|---|---|
| `node doctor.mjs` | Check your setup |
| `node verify-pipeline.mjs` | Check tracker + pipeline health |
| `node verify-cv-facts.mjs` | Check your CV facts are consistent |
| `node validate-portals.mjs` | Check `portals.yml` has no mistakes |
| `node audit-portals.mjs --summary` | Check each company career page actually has jobs |
| `node merge-tracker.mjs` | Merge new tracker entries (after batch evaluations) |

### Analysis
| Command | What it does |
|---|---|
| `node funnel-velocity.mjs --summary` | How fast applications move through stages |
| `node salary-gap.mjs --summary` | Your salary target vs what jobs advertise |
| `node analyze-patterns.mjs` | Patterns in your results |
| `node upskill.mjs` | Skill gaps across the jobs you've looked at |

### Updates
| Command | What it does |
|---|---|
| `node update-system.mjs check` | Is there a new version? |
| `node update-system.mjs apply --confirm` | Install it (**your CV, profile, tracker and reports are never touched**) |
| `node update-system.mjs rollback` | Undo the last update |

### Shortcuts
Many commands also have short `npm run` versions, for example `npm run scan`, `npm run doctor`, `npm run verify`, `npm run update:check`. Run `npm run` to see the full list.

---

## 8. Web app pages

**Start it:** `cd ~/career-ops/web && npm run dev`. Open the address it prints.
**Stop it:** press `Ctrl + C` in that terminal.

| Page | What it's for |
|---|---|
| **Today** | Your daily overview: new jobs this week and follow-ups due |
| **Fresh matches** | New jobs (last 24h), scored, with select + auto-fill ([section 5](#5-auto-apply-with-the-fresh-matches-tab)) |
| **Explore** | Browse and search discovered jobs |
| **Scheduled scans** | Set up automatic daily scans |
| **Pipeline** | All evaluated jobs and their reports; Apply buttons live here too |
| **Follow-ups** | Who to chase, and when |
| **Portals** | Which company career pages are scanned |
| **Analytics** | Charts of your job search |
| **CV** | View and edit your CV |
| **Documents** | Generated CVs and cover letters |
| **Config** | Choose your AI tool (Claude Code) and settings |

> ⚠️ **Careful on Today/Explore:** adding or evaluating a job from those cards **skips your UK/EU and seniority filters**. Prefer **Fresh matches** or **Pipeline**.

---

## 9. Your files: what lives where

### Your personal files (never overwritten by updates)
| File / folder | What's in it | Edit it? |
|---|---|---|
| `cv.md` | Your master CV, the source of truth for every application | ✅ Yes, keep it accurate |
| `config/profile.yml` | Name, contact info, target roles, salary, visa status | ✅ Yes |
| `modes/_profile.md` | How to pitch you, negotiation scripts, dealbreakers | ✅ Yes |
| `portals.yml` | Which companies to scan + filters (titles, locations) | ✅ Yes, carefully |
| `data/applications.md` | Your application tracker | ⚠️ Use `set-status.mjs`, not hand edits |
| `data/pipeline.md` | Jobs waiting to be evaluated | Read-only mostly |
| `data/follow-ups.md` | Follow-up history | Automatic |
| `reports/` | One evaluation report per job | Read |
| `output/` | Your tailored CVs and cover letters (PDF) | Read / download |
| `interview-prep/` | Interview prep notes and your story bank | Read / edit |
| `documents/` | Drop old CVs, certificates, etc. here for `intake` | ✅ Yes |

### System files (managed by career-ops, don't put personal info here)
`modes/*.md` (except `_profile.md`, `_custom.md`, `_brief.md`), all `*.mjs` scripts, `templates/`, `web/`.

> 💡 Want to change how career-ops behaves? Just ask Claude in plain English, e.g. *"stop showing me fintech jobs"*. It writes the change to the right personal file.

---

## 10. Your current settings

| Setting | Value | Where it lives |
|---|---|---|
| Target roles | Data Engineer, Analytics Engineer (main); Data Scientist, ML Engineer (secondary) | `config/profile.yml` |
| Level | Junior–Mid (Senior, Lead, Manager titles filtered out) | `portals.yml` |
| Locations | UK + EU/EEA/Switzerland, **except Poland** (local Polish-language jobs, no sponsorship) | `portals.yml` → `location_filter` |
| EU jobs | Only if they **offer visa sponsorship** | `modes/_profile.md` |
| UK jobs | OK; "no sponsorship" postings are skipped | `modes/_profile.md` |
| Salary target | £35K–£55K, minimum £35K | `config/profile.yml` + `modes/_profile.md` |
| Sponsorship warning | UK jobs paying under **£33,400** get flagged (can't sponsor after the Graduate visa ends in March 2028) | `modes/_profile.md` |
| Job age | Postings older than 45 days are skipped | `portals.yml` |
| Apply threshold | 4.0 / 5 | Built in + Fresh matches tab |

---

## 11. Safety rules (what it will never do)

- ❌ **Never submits an application.** It fills, you submit.
- ❌ **Never sends emails or messages.** It drafts, you send.
- ❌ **Never invents facts.** Everything comes from `cv.md` and your profile. If something's missing, it asks you.
- ⚠️ **Discourages weak applications.** Below 4.0/5, it recommends skipping.
- 🔒 **Local-first.** Your files stay on your Mac.

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| Something seems broken | `node doctor.mjs`, then follow what it says |
| A new web page (e.g. Fresh matches) is missing | Stop the web app (`Ctrl + C`), then `npm run build && npm start` or `npm run dev` |
| "Port 3000 is in use" | Another copy is running. Use that one, or stop it first |
| Web app says "No CLI configured" | **Config** → select **Claude Code** → **Save config** |
| Fresh matches is empty | No jobs dated today/yesterday. Run `node scan.mjs` (or set up a scheduled scan) |
| Tracker looks wrong | `node verify-pipeline.mjs` |
| PDF won't generate | `npx playwright install chromium` |
| Today page shows jobs outside UK/EU | Those come from older scan history. Ignore them, use **Fresh matches** |
| Update went wrong | `node update-system.mjs rollback` |
| Need Claude Code itself updated | `claude update` |

---

## 13. Glossary

| Word | Meaning |
|---|---|
| **Pipeline** | Your inbox of jobs waiting to be looked at (`data/pipeline.md`) |
| **Tracker** | Your list of jobs you've evaluated or applied to (`data/applications.md`) |
| **Evaluation / report** | A full A–G analysis of one job with a score out of 5 |
| **Quick rank** | A cheap, fast AI score to sort jobs before a full evaluation |
| **Scan** | Checking company career pages for new jobs (free, no AI) |
| **Portal** | A company's career page / job board (Greenhouse, Lever, Ashby, Workday…) |
| **ATS** | Applicant Tracking System, the software companies use to receive applications |
| **Liveness** | Whether a job posting is still open |
| **Sponsor licence** | UK Home Office permission for an employer to sponsor a Skilled Worker visa |
| **Mode** | A career-ops chat command, e.g. `pdf`, `scan`, `interview-prep` |
