# career-ops: Complete Step-by-Step Practical Guide

Welcome to **career-ops**, your open-source, local AI job search agent. This guide covers everything you need to operate career-ops day-to-day to search, evaluate, apply, track, and interview for jobs with maximum signal and zero fluff.

---

## Table of Contents
1. [Core Philosophy & Safety Guarantees](#1-core-philosophy--safety-guarantees)
2. [Prerequisites & Verification](#2-prerequisites--verification)
3. [The Daily Job Search Workflow (Step-by-Step)](#3-the-daily-job-search-workflow-step-by-step)
   - [Step 1: Finding & Ingesting Opportunities](#step-1-finding--ingesting-opportunities)
   - [Step 2: Evaluating the Job (A–G Fit Analysis)](#step-2-evaluating-the-job-ag-fit-analysis)
   - [Step 3: Generating Tailored Application Materials](#step-3-generating-tailored-application-materials)
   - [Step 4: Networking & Contact Discovery ("Beyond the CV")](#step-4-networking--contact-discovery-beyond-the-cv)
   - [Step 5: Tracking & Pipeline Management](#step-5-tracking--pipeline-management)
   - [Step 6: Interview Preparation & Practice](#step-6-interview-preparation--practice)
   - [Step 7: Offer Review & Salary Negotiation](#step-7-offer-review--salary-negotiation)
4. [Master Command & Mode Cheat Sheet](#4-master-command--mode-cheat-sheet)
5. [Data Contract: Where Files Live](#5-data-contract-where-files-live)
6. [Troubleshooting & Maintenance](#6-troubleshooting--maintenance)

---

## 1. Core Philosophy & Safety Guarantees

career-ops is built on 4 strict rules:
- **Apply better to fewer:** Signal over volume. The system actively discourages applying to poor fits (< 4.0/5.0).
- **Evidence over keywords:** Reorders and emphasizes your real experience, but **never invents** facts, metrics, or employers.
- **Human-in-the-Loop (Non-Negotiable):** career-ops drafts PDFs, emails, and answers, but **never auto-submits applications** or sends messages. You always review and click Submit.
- **Local-First & Private:** Your CV, tracker, reports, and notes stay on your machine. No telemetry or external server tracking.

---

## 2. Prerequisites & Verification

### 2.1 Dependencies
Ensure you have Node.js (v18+) and Playwright Chromium (required for compiling pixel-perfect ATS PDFs):
```bash
# Verify Node
node -v

# Install dependencies (if not already installed)
npm install

# Install Playwright browser engine for PDF generation
npx playwright install chromium
```

### 2.2 Verify Your Profile Files
Your personal facts live in the **User Layer**:
- [`cv.md`](cv.md): Your source-of-truth master CV.
- [`config/profile.yml`](config/profile.yml): Your contact info, target roles/archetypes, exit narrative, and proof points.
- [`modes/_profile.md`](modes/_profile.md): Your adaptive framing rules, UK comp targets (£35k–£55k), and negotiation scripts.

Run the built-in diagnostic and fact verification tools:
```bash
# Check repository health
node doctor.mjs

# Verify CV facts and detect potential hallucinations
node verify-cv-facts.mjs
```

---

## 3. The Daily Job Search Workflow (Step-by-Step)

```text
[ Job Discovery ] ──▶ [ A-G Evaluation ] ──▶ [ Decision Gate ]
  • Paste URL/JD         • Fit score (1-5)       • Score ≥ 4.0: APPLY
  • Portal scanner       • Liveness check        • Score < 4.0: SKIP
  • Pipeline inbox       • Visa blockers
                                │
                                ▼
[ Interview & Offer ] ◀── [ Pipeline Tracker ] ◀── [ Tailor & Apply ]
  • STAR story prep        • Update state            • Tailored ATS PDF
  • Company deep dive      • Log status-log.tsv      • Cover letter
  • Practice & debrief     • Follow-up cadence       • Answers & outreach
```

---

### Step 1: Finding & Ingesting Opportunities

Choose any of the 3 ingestion methods:

#### Method A: Direct Paste in Chat (Fastest & Most Interactive)
Simply paste any **job link** (Greenhouse, Ashby, Lever, LinkedIn, Workday, etc.) or paste the **raw Job Description (JD)** text directly into this chat:
> *"Evaluate this job opening: https://boards.greenhouse.io/company/jobs/12345"*

The system auto-detects the JD and immediately executes the **Auto-Pipeline**.

#### Method B: Zero-Token Portal Scanner (`scan.mjs`)
Scan over 100+ top company career pages configured in [`portals.yml`](portals.yml) without spending AI tokens:
```bash
node scan.mjs
```
*Tip: Or ask in chat: `"Run career-ops scan mode"`.*
New matching jobs are filtered by your target titles (Junior–Mid; Senior/Lead/Manager excluded), UK + EU locations and age (≤45 days), deduplicated against your scan history, and appended to [`data/pipeline.md`](data/pipeline.md).

#### Method C: Batch Processing from Inbox (`data/pipeline.md`)
Add URLs into [`data/pipeline.md`](data/pipeline.md), one per line. Then evaluate them in sequence:
> *"Run career-ops pipeline mode for data/pipeline.md"*

---

### Step 2: Evaluating the Job (A–G Fit Analysis)

When career-ops evaluates a role, it produces a report at `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`. Before Block A it runs gates (liveness, blacklist, your dealbreakers — e.g. EU roles without sponsorship, explicit "no sponsorship"). Then 7 blocks:

| Block | Analysis | What It Does |
|---|---|---|
| **Block A** | Role Summary | Archetype, seniority, stack, team and location. |
| **Block B** | Match with CV | Maps JD requirements to evidence in [`cv.md`](cv.md); gaps with honest mitigations. |
| **Block C** | Level and Strategy | How the role's level compares to yours and how to position. |
| **Block D** | Comp and Demand | Market comp vs your £35k–£55k target band. |
| **Block E** | Customization Plan | What to change in the CV/application for this role. |
| **Block F** | Interview Plan | Likely interview topics and which stories (PremPulse, Siscaso, THENU) to use. |
| **Block G** | Posting Legitimacy | Liveness, ghost-job / repost signals. |

For UK roles, check the employer holds a Skilled Worker sponsor licence (needed after your Graduate visa ends):
```bash
node sponsor-check.mjs --company "Monzo" --summary
```
`not-found` means *unconfirmed* (the register uses legal entity names), not "does not sponsor".

#### The Decision Gate:
- **Score ≥ 4.0 / 5.0:** **RECOMMENDED TO APPLY**. Proceed to Step 3.
- **Score < 4.0 / 5.0:** **DO NOT APPLY**. Protect your energy and focus on higher-signal roles.

---

### Step 3: Generating Tailored Application Materials

Once a role is approved, create your application package:

#### 1. Tailored ATS-Optimized CV (PDF & LaTeX)
Ask in chat:
> *"Generate a tailored PDF for report #1"*

The `pdf` mode builds a tailored HTML CV and then converts it. The terminal script only converts an already-built HTML file:
```bash
node generate-pdf.mjs output/cv.html output/cv.pdf --format=a4 --report=1
```
* **Output:** Stored in [`output/`](output/) as an ATS-friendly, clean PDF styled with Space Grotesk and DM Sans typography.
* **Fact Gate Guarantee:** The system will reorder, reframe, and highlight your existing experience, but will never invent facts or numbers.

#### 2. Tailored Cover Letter
Ask in chat:
> *"Draft a cover letter for report #1"*

Generates a targeted cover letter mirroring the company's language and problems, and compiles both a `.md` and `.pdf` version.

#### 3. Form Answers & Email Outreach
Ask in chat:
> *"Prepare answers for this application's custom questions"*  
> *"Draft an application email for report #1"*

Generates answers for common screening fields (e.g., "Describe a difficult data pipeline challenge you solved", salary expectations) and cold outreach templates.

---

### Step 4: Networking & Contact Discovery ("Beyond the CV")

Applying gets you in the queue; research and outreach get you conversations:

#### 1. Deep Company Research (`deep` mode)
Ask in chat:
> *"Run deep mode on Monzo"*

Researches engineering culture, data architecture, recent public engineering blog posts, and recent business moves.

#### 2. Finding Hiring Managers & Recruiters (`contacto` mode)
Ask in chat:
> *"Find contacts for Monzo and draft LinkedIn outreach"*

Identifies relevant decision makers (Hiring Managers, Lead Data Engineers, Technical Recruiters) and drafts a LinkedIn note within the connection-request limit (200 chars free, 300 Premium) tailored to your profile.

---

### Step 5: Tracking & Pipeline Management

All your applications are recorded in [`data/applications.md`](data/applications.md).

#### Updating Application Status (Canonical Way)
Always update statuses using the locked script so timestamps are logged to [`data/status-log.tsv`](data/status-log.tsv):
```bash
node set-status.mjs <tracker#|company> <State> [--note "Your note"]
node set-status.mjs --report <report#> <State>      # by report number
```
*Canonical states (`templates/states.yml`):*
- `Evaluated` — Report done, decision pending.
- `Applied` — Application submitted by you.
- `Responded` — Company replied.
- `Assessment` — Online test / take-home.
- `Interview` — In an interview process.
- `Offer` — Offer received.
- `Hired` — Offer accepted.
- `Rejected` — Company rejected.
- `Discarded` — You dropped it, or the posting closed (use this for "ghosted").
- `SKIP` — Doesn't fit, don't apply.

*Example:*
```bash
node set-status.mjs "Monzo" Applied --note "Applied on Greenhouse with tailored PDF"
```

#### Tracking Metrics & Funnel Velocity
Monitor your conversion rates and response latencies:
```bash
# View lifetime funnel stats
node stats.mjs --summary

# Measure stage velocity against industry benchmarks
node funnel-velocity.mjs --summary

# Check applications due for a follow-up
node followup-cadence.mjs
```

---

### Step 6: Interview Preparation & Practice

When you land an interview, prepare methodically:

1. **Company Intel Prep Document:**
   > *"Run interview-prep for Monzo Data Engineer"*
   Generates a prep doc at `interview-prep/monzo-data-engineer.md`.

2. **STAR+R Story Matching:**
   Uses your accumulated stories in [`interview-prep/story-bank.md`](interview-prep/story-bank.md) to pair your past projects (PremPulse, Siscaso, THENU) with anticipated questions.

3. **Interactive Mock Interview:**
   > *"Run interview/practice mode for Monzo"*
   The agent acts as the interviewer, asks questions one by one, and evaluates your answers against what engineering interviewers look for.

4. **Employer Red-Flag Analysis:**
   > *"Run interview-redflag mode on Monzo"*
   Checks team stability, Glassdoor sentiment trends, and recruiter friction.

5. **Post-Interview Debrief:**
   > *"Run interview/debrief for my interview with Monzo today"*
   Logs questions asked, captures what went well/poorly, and predicts next-round topics.

---

### Step 7: Offer Review & Salary Negotiation

1. **Contract Review Companion:**
   > *"Run offer-prep for my offer from Monzo"*
   Walks through clauses, IP assignment, notice periods, and creates questions for your hiring manager.

2. **Salary Gap Analysis:**
   ```bash
   node salary-gap.mjs --summary
   ```
   Compares your desired £35k–£55k band against advertised comp in your reports and any logged salary observations.

3. **Negotiation Scripts:**
   Pre-configured negotiation scripts in [`modes/_profile.md`](modes/_profile.md) help you counter-offer professionally with data-backed justification.

---

## 4. Master Command & Mode Cheat Sheet

### Interactive Chat Modes
You can type these modes directly into the chat:

| Mode | What It Does |
|---|---|
| `[Paste JD / URL]` | **Auto-Pipeline:** Full evaluation, report, tracker entry, and PDF prep. |
| `pdf` | Generates tailored ATS-friendly PDF CV. |
| `cover` | Generates tailored cover letter (Markdown & PDF). |
| `email` | Drafts formal recruiter / application outreach email. |
| `contacto` | Finds hiring managers/recruiters & drafts LinkedIn notes (200/300 char limit). |
| `deep` | Deep company research (tech stack, culture, business strategy). |
| `interview-prep` | Generates role-specific interview briefing document. |
| `interview/practice`| Simulates an interactive mock interview. |
| `interview/debrief` | Records post-interview learnings and predicts next steps. |
| `interview-redflag` | Audits company red flags and hiring friction. |
| `tracker` | Summarizes current application statuses. |
| `pipeline` | Processes pending URLs in `data/pipeline.md`. |
| `scan` | Scans company career portals for matching listings. |
| `offer-prep` | Analyzes job offer, contract clauses, and negotiation strategy. |
| `upskill` | Aggregates skill gaps from past rejected/evaluated roles. |

### Terminal CLI Scripts

| Command | Purpose |
|---|---|
| `node scan.mjs` | Run zero-token portal scanner across all enabled boards. |
| `node generate-pdf.mjs <in.html> <out.pdf> --report=<#>` | Convert an already-built CV HTML to PDF (use `pdf` mode to build it). |
| `node sponsor-check.mjs --company "<name>" --summary` | UK sponsor-licence lookup (advisory). |
| `node set-status.mjs <#|name> <State>` | Canonical status update for an application. |
| `node check-liveness.mjs <url>` | Check whether a job listing is still live or expired. |
| `node stats.mjs --summary` | Show lifetime application funnel stats. |
| `node funnel-velocity.mjs --summary` | Analyze conversion speeds and latency per stage. |
| `node followup-cadence.mjs` | Identify applications that need follow-up outreach. |
| `node doctor.mjs` | Run complete system diagnostic check. |
| `node update-system.mjs check` | Check if a newer version of career-ops is available. |

---

## 5. Data Contract: Where Files Live

career-ops separates files into two distinct layers so system updates never overwrite your personal work:

### 🔒 User Layer (Your Personal Files — Preserved Across Updates)
- `cv.md` — Your primary CV source of truth.
- `config/profile.yml` — Identity, targets, exit story, and proof points.
- `modes/_profile.md` — Target archetypes, narrative framing, comp targets.
- `modes/_custom.md` — Your personal procedural house rules.
- `data/applications.md` — Your application tracker.
- `data/status-log.tsv` — Historical timestamp ledger of status changes.
- `data/pipeline.md` — Incoming URL inbox.
- `portals.yml` — Configured ATS boards to scan.
- `reports/` — Stored evaluation reports.
- `output/` — Compiled tailored PDF CVs and cover letters.
- `interview-prep/` — Prep reports and STAR story bank.

### ⚙️ System Layer (Managed & Updatable by career-ops)
- `modes/*.md` (except `_profile.md`, `_custom.md`, `_brief.md`)
- `*.mjs` scripts (scanner, generators, liveness checkers, analytics)
- `templates/` (CV templates, LaTeX configs)
- `tests/` and system documentation

---

## 6. Troubleshooting & Maintenance

### Checking for Updates
career-ops publishes regular improvements to scanners, ATS parsers, and evaluation logic:
```bash
# Check if an update is available
node update-system.mjs check

# Apply update safely (user files are never touched)
node update-system.mjs apply --confirm

# Undo the last update
node update-system.mjs rollback
```

### PDF Generation Issues
If `node generate-pdf.mjs` reports browser issues:
```bash
# Reinstall Playwright Chromium dependencies
npx playwright install --with-deps chromium
```

### Resetting or Adding Portals
To audit which career portals in `portals.yml` are responding properly:
```bash
node audit-portals.mjs --summary
```
