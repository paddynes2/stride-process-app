# Ralph Loop — Improvement Roadmap

> Consolidated analysis of gaps, enhancements, and new capabilities.
> Ranked by impact. Each item includes effort estimate and implementation notes.
> Created: 2026-02-26

---

## What's Already Strong

The bones are solid:
- **7-phase discipline** — structured, repeatable, auditable iterations
- **Circuit breaker** — prevents runaway token burn on unsolvable problems
- **Attempt tracking + SKIP_UNTIL** — no infinite retry on single broken tasks
- **Git checkpoint tags** — rollback to any iteration
- **Fresh context per iteration** — prevents context drift/pollution
- **Observation loop** (Phase 4 → IMPROVEMENTS.md) — proactive discovery instinct
- **13 test suites + mega listener** — comprehensive browser-based quality gates
- **Hooks architecture** — pre/post/stop lifecycle with real scripts (not just docs)
- **File-based memory** — human-readable, git-tracked, survives session resets
- **Branch isolation** — never touches main/master

---

## Tier 1: Build First (Highest Leverage)

Effort: <2 hours each. These compound immediately.

---

### 1.1 Human Feedback Channel — `knowledge/FEEDBACK.md`

**Gap:** Signal file is binary (CONTINUE/PAUSE/STOP). No way to say "that last change was wrong" or "reprioritize X" without editing PRD files directly.

**Add:** `knowledge/FEEDBACK.md` — structured human → agent channel.

```markdown
# Human Feedback
<!-- Write feedback here. Agent reads in Phase 1, acknowledges, clears after acting. -->

## Pending
- 2026-02-26: The sidebar animation from iter-12 feels janky. Revert the easing curve.
- 2026-02-26: Prioritize the export feature over the settings page.

## Processed
<!-- Agent moves items here after acknowledging in PROGRESS.md -->
```

**PROMPT.md change:** Add to Phase 1 (ORIENT), between steps 1 and 2:
```
1.5. `knowledge/FEEDBACK.md` — if it exists and has items under `## Pending`,
     these OVERRIDE normal task priority. Address each item: either act on it
     (fix/reprioritize) or note why you can't. Move processed items to
     `## Processed` with your response and iteration number.
```

**Effort:** 30 min (new template file + PROMPT.md Phase 1 edit)

---

### 1.2 Self-Review Step — Phase 5 Enhancement

**Gap:** Phase 5 reviews the diff for truncation, debug statements, and unintended files — but never does *semantic* review. The agent doesn't read its own code as a reviewer would.

**Add to Phase 5, before the commit gate:**

```markdown
### Semantic Review (read your diff as if reviewing someone else's PR)

4. Run `git diff --cached` and review for:
   - [ ] Naming follows existing patterns (check AGENTS.md conventions)
   - [ ] No hardcoded values that should be constants or config
   - [ ] No accidental deletions (if file size decreased >30%, investigate)
   - [ ] Error paths handled, not just happy path
   - [ ] No debug artifacts (console.log, TODO, commented-out code)
   - [ ] No code duplication with existing utilities (check AGENTS.md patterns)
5. If issues found: fix before committing, note in PROGRESS.md
```

**Effort:** 30 min (PROMPT.md Phase 5 edit)

---

### 1.3 Structured Metrics — `knowledge/METRICS.jsonl`

**Gap:** PROGRESS.md is append-only text. The agent can't query its own patterns: success rate by task type, most-touched files, velocity trends.

**Add:** `knowledge/METRICS.jsonl` — one JSON line per iteration, machine-readable.

```json
{"iter": 15, "date": "2026-02-26", "task_type": "fix", "source": "BUGS.md", "result": "completed", "files_changed": 2, "files_list": ["src/app/page.tsx", "src/lib/utils.ts"], "bugs_found": 0, "improvements_found": 1, "attempts": 1, "complexity": "S", "risk_score": 1}
```

**PROMPT.md change:** Add to Phase 6, after PROGRESS.md update:
```
### 2.5. METRICS.jsonl — Append one JSON line

Append a single JSON line to `knowledge/METRICS.jsonl`:
{"iter": N, "date": "YYYY-MM-DD", "task_type": "build|fix|improve|regression|cleanup", "source": "FEATURES|BUGS|IMPROVEMENTS|TECH-DEBT", "result": "completed|partial|blocked|reverted", "files_changed": N, "files_list": ["path1", "path2"], "bugs_found": N, "improvements_found": N, "attempts": N, "complexity": "S|M|L", "risk_score": N}
```

**Effort:** 30 min (PROMPT.md Phase 6 edit + empty METRICS.jsonl template)

---

### 1.4 Pre-Build Research Phase — Phase 2.5: RESEARCH

**Gap:** Phase 3 says "read relevant source files" but doesn't formalize research. For non-trivial tasks, the agent should search before writing.

**Add:** New phase between DECIDE and BUILD:

```markdown
## PHASE 2.5: RESEARCH

Skip this phase for trivial fixes (typos, config changes, single-line edits).
For all other tasks, spend 3-5 tool calls on targeted research:

1. **Search for existing solutions:** Grep the codebase for similar patterns,
   function names, or component types related to your task.
2. **Check LEARNINGS.md:** Specifically search for gotchas in the area you're touching.
3. **Read the test suite:** If tests exist for the area being modified, read them
   to understand expected behavior and edge cases.
4. **Check IMPLEMENTATION-PLAN.md:** Look for notes, dependencies, or warnings
   about this area.
5. **Read 2-3 similar files:** (moved from Phase 3 pre-build — do it here instead)

Budget: 5 tool calls maximum. Document what you found in your Phase 6 PROGRESS entry.
```

**Effort:** 15 min (PROMPT.md new phase)

---

### 1.5 Self-Scoring — Phase 6 Enhancement

**Gap:** No per-iteration quality self-assessment. Trends emerge only from reading PROGRESS.md manually.

**Add to Phase 6, after PROGRESS.md entry:**

```markdown
### Self-Score

Append to your PROGRESS.md entry:

**Self-score:**
- Code quality: [1-5] — [one-line justification]
- Test coverage of change: [1-5] — [what was/wasn't tested]
- Confidence this won't regress: [1-5] — [why]
- Efficiency (wasted actions?): [1-5] — [what could be faster]
- Proactive observations: [count logged to IMPROVEMENTS.md]
```

Over 20 iterations, trends emerge: "My confidence is dropping — maybe I need a regression run" or "I haven't logged any improvements in 8 iterations — I'm not observing."

**Effort:** 10 min (PROMPT.md Phase 6 edit)

---

### 1.6 SKIP_UNTIL Requires Resolution Strategy

**Gap:** Current SKIP_UNTIL allows vague conditions like "someone looks at this" — a black hole.

**Change in PROMPT.md Phase 2 (Attempt Tracking section):**

Replace:
```
mark it `SKIP_UNTIL: [specific condition that would unblock it]`
```

With:
```
mark it with ALL of:
- `SKIP_UNTIL: [specific, verifiable condition — e.g., "dependency X installed", "upstream API deployed"]`
- `DIAGNOSIS: [what was tried, what specifically failed, what hypotheses remain]`
- `RESOLUTION: [concrete next step to unblock — who/what needs to act]`

Vague conditions like "someone looks at this" or "needs investigation" are NOT acceptable.
The condition must be machine-verifiable or tied to a specific external event.
```

**Effort:** 5 min (PROMPT.md text edit)

---

### 1.7 Canary Test After Every Commit

**Gap:** Per-iteration browser testing (Phase 4) only tests the feature being built. A change to shared code could break the login flow and nobody notices until the 5th-iteration regression.

**Add to Phase 5, after commit and tag:**

```markdown
### Canary Test (3 actions — mandatory for UI changes)

After committing, run ONE critical golden path as a smoke test:
1. Navigate to the app's entry point
2. Complete the single most important user journey (defined in testing/apps/*.md)
3. Verify no console errors via window.__testErrors

If the canary fails: your commit broke something fundamental.
Investigate immediately — do NOT proceed to Phase 6 with a broken canary.
```

**Effort:** 30 min (PROMPT.md Phase 5 edit + canary path definition in app context)

---

### 1.8 Structured Task IDs

**Gap:** Tasks in PRD files are free-text. Cross-referencing between commits, PROGRESS.md, LEARNINGS.md, and METRICS.jsonl is imprecise.

**Add ID format to PRD files:**

```markdown
## Format for all PRD tasks:

- [ ] `#FEAT-001` Task description
  Priority: P1 | Attempts: 0 | Phase: 1

- [ ] `#BUG-003` Bug description
  Priority: P0 | Attempts: 1 | Phase: 2
```

Commits reference IDs: `[phase-1] #FEAT-001 Add sidebar navigation`
PROGRESS.md references IDs: `**Task:** #FEAT-001 — Add sidebar navigation`
METRICS.jsonl includes: `"task_id": "FEAT-001"`

**Counter file:** `knowledge/TASK-COUNTER.json`
```json
{"FEAT": 0, "BUG": 0, "IMP": 0, "DEBT": 0}
```
Agent increments when creating new tasks.

**Effort:** 1 hr (PROMPT.md edits across phases 2, 5, 6 + counter file + PRD format docs)

---

### 1.9 Task Complexity Estimation

**Gap:** A "change button color" and "implement real-time sync" are both treated as one iteration. No mechanism to say "this needs decomposition" before starting.

**Add to Phase 2 (DECIDE), after task selection:**

```markdown
### Complexity Estimate

Before starting, estimate the task:

| Size | Criteria | Action |
|------|----------|--------|
| **S** | 1 file, <20 lines, no new patterns | Proceed normally |
| **M** | 2-3 files, follows existing patterns | Proceed, note in PROGRESS |
| **L** | 4+ files, new patterns needed | Decompose into sub-tasks before starting |
| **XL** | Architectural change, new dependencies | STOP — write proposal to FEEDBACK.md, set SIGNAL=PAUSE |

Record in your Phase 2 task declaration:
COMPLEXITY: S | M | L | XL

Track actual vs. estimated in PROGRESS.md. Over time, calibrate.
```

**Effort:** 30 min (PROMPT.md Phase 2 edit)

---

### 1.10 `ralph.sh --init` — Automated Setup

**Gap:** Starting a new project requires manually filling in AGENTS.md, creating branches, verifying tooling. No initialization script.

**Add `--init` mode to ralph.sh:**

```bash
# ./ralph.sh --init /path/to/project

Steps:
1. Detect package manager (package.json → pnpm/npm/yarn, Cargo.toml → cargo, etc.)
2. Detect framework (next.config.* → Next.js, vite.config.* → Vite, etc.)
3. Auto-fill AGENTS.md commands section (dev, typecheck, lint, build, test)
4. Auto-fill AGENTS.md project section (name from package.json, root path, git remote)
5. Create ralph branch
6. Initialize all knowledge files from templates
7. Run preflight checks: Claude CLI? Playwright MCP? Dev server starts?
8. Create testing/apps/[project-name].md from TEMPLATE.md
9. Report what was auto-detected and what needs manual filling
```

**Effort:** 1-2 hrs (ralph.sh new mode + auto-detection logic)

---

## Tier 2: Build Next (Compounding Value)

Effort: 1-3 hours each. These create feedback loops that improve the system over time.

---

### 2.1 Phase 6.5: RETROSPECTIVE — Meta-Learning

**Gap:** The system logs everything but never analyzes its own patterns. It doesn't know its success rate, most-failed task types, or recurring failure causes.

**Add:** New phase between UPDATE DOCS and SIGNAL, triggered every 10th iteration:

```markdown
## PHASE 6.5: RETROSPECTIVE (every 10th iteration only)

Read the last 10 PROGRESS.md entries and METRICS.jsonl.

Analyze:
1. **Success rate:** completed / total — is it trending up or down?
2. **Most-failed task type:** Which category (build/fix/improve) fails most?
3. **Hotspot files:** Which files appear most in `files_list` across iterations?
4. **Recurring failures:** Same root cause appearing 3+ times?
5. **Velocity:** Are iterations getting faster or slower?
6. **Self-score trends:** Are quality scores declining?

If pattern detected (same root cause 3+ times):
→ Add META entry to LEARNINGS.md: "META-PATTERN: [X]. Mitigation: [Y]."
→ If a task type has <50% success rate, add warning to STATUS.md

Write a 5-line summary to `knowledge/RETROSPECTIVES.md` (append-only):
## Retrospective — Iteration [N] (YYYY-MM-DD)
- Success rate (last 10): X/10
- Hotspot files: [top 3]
- Recurring pattern: [if any]
- Velocity trend: [improving/stable/declining]
- Action: [what to change, or "None"]
```

**Effort:** 2 hrs (PROMPT.md new phase + RETROSPECTIVES.md template)

---

### 2.2 Adaptive Risk-Based Testing

**Gap:** Testing cadence is fixed (every 5th = regression, every 10th = accessibility/performance). A high-risk auth change on iteration 7 doesn't get tested until iteration 10.

**Replace fixed cadence with risk scoring in Phase 2:**

```markdown
### Risk Assessment (before selecting testing cadence)

Calculate a risk score for the LAST completed iteration:

RISK_SCORE = 0
If touched auth/middleware/RLS/security:    +3
If touched data model/migrations/schema:    +3
If touched >5 files:                        +2
If touched shared components/utilities:     +2
If last iteration was a revert:             +2
If last iteration was partial/blocked:      +1

| Risk Score | Action |
|-----------|--------|
| 0-2       | Normal task selection |
| 3-4       | Run regression.md NEXT iteration (override normal priority) |
| 5+        | Run regression.md + data-integrity.md NEXT iteration |

MINIMUM cadence still applies: regression at least every 8th iteration.
Accessibility/performance cadences remain on 10th-iteration schedule.
```

**Effort:** 1 hr (PROMPT.md Phase 2 rewrite of testing cadence section)

---

### 2.3 `ralph.sh --dashboard` — Visibility

**Gap:** Can't answer "how's Ralph doing?" without reading PROGRESS.md manually.

**Add `--dashboard` mode to ralph.sh:**

```
═══ Ralph Dashboard ═══════════════════════════════
Iterations:    47 total (this session: 12)
Success rate:  78% (37/47)
  ├─ Features:     85% (23/27)
  ├─ Bugs:         70% (7/10)
  └─ Improvements: 70% (7/10)
Streak:        4 consecutive successes
Circuit trips: 1 (iter-22)

Hotspot files:
  sidebar.tsx        12 touches
  data-table.tsx      8 touches

Current phase: Phase 2 (68% complete)
Last signal:   CONTINUE: implement export button
═══════════════════════════════════════════════════
```

**Implementation:** Parse METRICS.jsonl (if Tier 1.3 is done) or fall back to grepping PROGRESS.md. Pure bash + awk.

**Effort:** 1-2 hrs (ralph.sh new mode)

---

### 2.4 Self-Healing — Diagnosis Before SKIP_UNTIL

**Gap:** When a task fails 3 times, the system just stops trying. It never asks *why* it failed or tries a fundamentally different approach.

**Enhance attempt tracking in Phase 2:**

```markdown
### Enhanced Attempt Handling

**After attempt 2 (second failure):**
Write a DIAGNOSIS entry to `knowledge/DIAGNOSES.md`:
- Task ID and description
- What was tried in attempts 1 and 2
- What specifically failed (error messages, test failures, browser behavior)
- 2-3 hypotheses for root cause
- One fundamentally different approach to try in attempt 3

**Attempt 3 MUST use a different approach** than attempts 1-2.
If the same approach is the only option, skip immediately (don't waste an iteration).

**After attempt 3 (if still failing):**
Update the DIAGNOSIS entry with the result.
SKIP_UNTIL must include the diagnosis reference: `SKIP_UNTIL: [condition] (see DIAGNOSES.md #DIAG-N)`
```

**Effort:** 1 hr (PROMPT.md Phase 2 edit + DIAGNOSES.md template)

---

### 2.5 Performance Baselines — `testing/BASELINES.md`

**Gap:** The mega listener captures LCP, CLS, INP, FCP — but they're fire-and-forget. A page could slowly degrade from 800ms to 2400ms over 30 iterations and nobody notices.

**Add:** `testing/BASELINES.md` — tracked metric snapshots.

```markdown
# Performance Baselines
Updated: 2026-02-26 (Iteration 20)

| Route        | LCP (ms) | CLS   | FCP (ms) | Bundle (KB) |
|--------------|----------|-------|----------|-------------|
| /dashboard   | 820      | 0.02  | 340      | 185         |
| /deals       | 1100     | 0.05  | 410      | 220         |
| /settings    | 600      | 0.01  | 280      | 160         |
```

**PROMPT.md change:** After any performance suite run (Phase 4 or cadence):
```
Compare results against testing/BASELINES.md.
Flag any metric that regressed >20% even if still within absolute thresholds.
Update baselines when intentional improvements land.
```

**Effort:** 1 hr (BASELINES.md template + PROMPT.md Phase 4 edit)

---

### 2.6 Session Continuity — `knowledge/SESSION-HISTORY.md`

**Gap:** Each ralph.sh session creates a fresh branch. There's no summary of "what happened last session" as a coherent narrative.

**Add to ralph.sh:** On clean exit (end of loop), auto-generate session summary:

```bash
# Appended to knowledge/SESSION-HISTORY.md by ralph.sh at session end
## Session 2026-02-26 14:30
- **Branch:** ralph/session-20260226-143000
- **Iterations:** 1-12
- **Key commits:**
  [output of: git log --oneline ralph-iter-1..ralph-iter-12]
- **Signal at exit:** CONTINUE
```

**PROMPT.md change:** Add to Phase 1 (ORIENT):
```
8. `knowledge/SESSION-HISTORY.md` — if it exists, read the LAST entry only.
   This tells you what happened in the previous session as a coherent narrative.
```

**Effort:** 1 hr (ralph.sh session-end logic + PROMPT.md Phase 1 edit)

---

### 2.7 Knowledge Pruning Rules

**Gap:** LEARNINGS.md and AGENTS.md grow unbounded. After 50+ iterations, reading them eats significant context.

**Add explicit rules:**

```markdown
### Knowledge Maintenance (every 15th iteration — from IMPLEMENTATION-PLAN.md cadence)

**LEARNINGS.md:**
- Cap at 100 entries
- After 100: merge similar entries, remove outdated ones, promote critical ones to AGENTS.md
- Mark superseded entries with `[SUPERSEDED by: label]`

**AGENTS.md:**
- Add freshness dates to sections: `<!-- Updated: iter-N, YYYY-MM-DD -->`
- If a section hasn't been updated in 30 iterations, flag for review
- Remove entries for deleted files/components

**PROGRESS.md:**
- After each phase completion, archive old entries to `knowledge/archive/progress-phase-N.md`
- Keep only last 20 entries in main file
```

**Effort:** 1 hr (PROMPT.md Phase 6 edit + archive directory)

---

### 2.8 Hotspot + Duplication + Complexity Creep Detection

**Gap:** No mechanism to detect when refactoring would save future iterations.

**Add to Phase 6 (UPDATE DOCS), using METRICS.jsonl data:**

```markdown
### Codebase Health Check (every 10th iteration)

Review METRICS.jsonl `files_list` entries:

1. **Hotspot detection:** If the same file appears in 5+ of the last 10 iterations:
   → Add to IMPROVEMENTS.md: "Hotspot: [file] modified in [N] recent iterations. Consider decomposition."

2. **Duplication detection:** If you wrote similar code (same pattern, different entity)
   in 3+ places during recent iterations:
   → Add to IMPROVEMENTS.md: "Pattern emerging in [files]. Consider extracting utility."

3. **Complexity creep:** If a file you modified is now >300 lines:
   → Add to IMPROVEMENTS.md: "[file] is now [N] lines. Consider splitting."

These are observations, not tasks. They enter the normal priority queue.
```

**Effort:** 1 hr (PROMPT.md Phase 6 edit)

---

### 2.9 Dependency Health Audit

**Gap:** No mechanism to catch outdated packages, security vulnerabilities, or deprecated APIs.

**Add cadence to Phase 2:**

```markdown
### Dependency Audit (every phase boundary or every 25th iteration)

Run:
- `pnpm outdated` (or equivalent)
- `pnpm audit` (or equivalent)

If critical vulnerabilities found: → P0 bug in BUGS.md
If major version behind on key deps: → TECH-DEBT.md entry
If deprecated API warnings in build output: → TECH-DEBT.md entry
```

**Effort:** 30 min (PROMPT.md Phase 2 cadence addition)

---

### 2.10 Health Snapshot in Phase 0

**Gap:** Phase 0 checks git state, branch, dev server, signal — but not codebase health.

**Add to Phase 0 (PREFLIGHT):**

```markdown
6. **Quick health snapshot** (skip if iteration < 5):
   - Run build command — note if warnings increased since last iteration
   - Check `knowledge/METRICS.jsonl` last entry — note if last result was partial/blocked
   - If last 2 iterations were partial/blocked: add "⚠ declining velocity" to STATUS.md warnings
```

**Effort:** 30 min (PROMPT.md Phase 0 edit)

---

## Tier 3: Build When Mature (50+ Iterations)

These add value once the system has enough history to analyze.

---

### 3.1 Predictive Task Sequencing

**Gap:** Priority order is static. Doesn't consider dependency chains, blast radius, or momentum.

**Enhance Phase 2 task selection:**

```markdown
### Smart Sequencing (tiebreaker within same priority level)

When multiple tasks have the same priority, prefer:

1. **Dependency order:** If Task B depends on Task A (per IMPLEMENTATION-PLAN.md),
   pick A first — even if B seems simpler.

2. **Blast radius:** Tasks that touch shared utilities/components come before tasks
   that consume them. Building the foundation first prevents rework.

3. **Momentum:** If you just completed 3 tasks in the same area (same directory,
   same component family), prefer a 4th task in that area over switching.
   Warm context = fewer research actions = faster iteration.
   Exception: if the same-area task is lower priority by 2+ levels, switch.
```

**Effort:** 2 hrs (PROMPT.md Phase 2 edit — requires careful wording)

---

### 3.2 Exploration Iterations

**Gap:** Ralph only reads what AGENTS.md tells it to. External changes (human commits, dependency updates) create blind spots.

**Add three exploration modes:**

```markdown
### Exploration (every 15th iteration, or after detecting external commits)

**Mode 1: External Change Detection**
Run: git log --oneline --since="[last STATUS.md date]" --not --author="ralph"
If external commits found:
- Read changed files
- Update AGENTS.md with new patterns/files
- Check if any PRD tasks are affected

**Mode 2: Proactive Discovery (every 15th iteration)**
Spend 10 actions browsing the app with NO task — purely observing:
- Look for friction, inconsistency, missing affordances
- Visit pages you haven't tested recently
- Run cognitive load audit on 2-3 pages
- Log all findings to IMPROVEMENTS.md

**Mode 3: Comparative Analysis (after building a feature)**
Visit 2-3 SIMILAR features in the app. Check for consistency:
- "I just built delete confirmation for Companies — do People and Deals have one?"
- "I just styled the Companies table — does the People table match?"
Log inconsistencies to IMPROVEMENTS.md.
```

**Effort:** 1-2 hrs (PROMPT.md Phase 2 cadence + Phase 4 exploration protocol)

---

### 3.3 Production Feedback Integration

**Gap:** The system builds, tests, commits — but never checks if what shipped actually works in production.

**Add (when deployed):**

```markdown
### Production Monitoring (post-deploy, if production URL configured in ralph.conf)

**Post-deploy smoke test (every 20th iteration or after phase completion):**
- Navigate to PRODUCTION_URL (from ralph.conf, separate from APP_URL)
- Run golden paths suite (3 critical journeys)
- Log results to testing/RESULTS.md under "## Production Smoke"

**Error monitoring (if Sentry/LogRocket configured):**
- Check for new error types since last check
- New production errors → P1 bugs in BUGS.md

**User feedback loop:**
- `prd/FEEDBACK.md` — human writes real-user observations
- These enter the priority queue as P1 bugs or high-priority improvements
```

**ralph.conf addition:**
```bash
# Production URL (optional — for post-deploy smoke tests)
# PRODUCTION_URL="https://myapp.vercel.app"
```

**Effort:** 2-3 hrs (ralph.conf + PROMPT.md + testing protocol)

---

### 3.4 Cost Estimation Per Iteration

**Gap:** No awareness of token spend. A stuck iteration that burns $5 in tokens is invisible.

**Add to ralph.sh:** Capture Claude CLI output and extract usage stats.

```bash
# After Claude invocation, parse output for token usage
TOKENS=$(echo "$RESULT" | grep -oP 'tokens: \K[0-9]+' || echo "unknown")
echo "RALPH|$timestamp|iter=$ITER_NUM|tokens=$TOKENS" >> "$LOG_FILE"
```

**Add to `--dashboard`:**
```
Token usage:  ~$12.40 total (47 iterations)
Avg/iteration: ~$0.26
Last iteration: $0.31
```

**Effort:** 1 hr (ralph.sh parsing + dashboard addition)

---

### 3.5 Change Coupling Detection

**Gap:** Some files always change together (e.g., a component and its test, a type and its validator). When one changes without the other, it's likely a bug.

**Add to Phase 6 health check (every 10th iteration):**

```markdown
### Change Coupling (requires 20+ iterations of METRICS.jsonl data)

Identify files that appeared together in `files_list` in 80%+ of iterations where either appeared.
If one changes without the other in the current iteration:
→ Add note to STATUS.md warnings: "Coupling alert: [file-A] changed without [file-B] (usually paired)"
```

**Effort:** 1-2 hrs (PROMPT.md + analysis logic)

---

### 3.6 Screenshot Diffing (Visual Regression)

**Gap:** No visual regression testing. DOM-based checks catch structural issues but miss visual regressions (colors, spacing, alignment).

**Add:** Before/after screenshots stored as references.

```markdown
### Visual Snapshots (Phase 4 enhancement, every 10th iteration)

1. For each key page (defined in testing/apps/*.md):
   - Take a screenshot via Playwright MCP
   - Compare against the last snapshot (agent uses vision capability)
   - Flag visual differences that aren't explained by the current iteration's changes
2. Store latest snapshots as reference for next comparison

No external service needed — agent's own vision capability handles comparison.
```

**Effort:** 2 hrs (PROMPT.md Phase 4 + snapshot storage convention)

---

### 3.7 Graceful Degradation When Playwright Unavailable

**Gap:** If Playwright MCP is down, Phase 4 (browser testing) fails entirely. No fallback.

**Add to Phase 4:**

```markdown
### Fallback: When Playwright MCP is unavailable

If Playwright fails to connect or navigate:
1. Note "Browser testing unavailable" in PROGRESS.md
2. Increase static verification rigor:
   - Run type-check a second time (catch any missed issues)
   - Run build (catches SSR/hydration errors)
   - If tests exist, run the full test suite (not just the fast subset)
3. Add P1 bug to BUGS.md: "Playwright MCP connection failed — investigate"
4. Do NOT skip the commit — the code was verified statically
5. Add note to STATUS.md warnings: "Browser testing skipped — Playwright unavailable"
```

**Effort:** 30 min (PROMPT.md Phase 4 edit)

---

### 3.8 Staleness Detection for Knowledge Files

**Gap:** AGENTS.md could describe files that were deleted 20 iterations ago.

**Add to Phase 6 (every 15th iteration, alongside knowledge maintenance):**

```markdown
### Staleness Check

If a section of AGENTS.md references files/patterns:
- Quick-check: do the referenced files still exist? (`ls` or `stat`)
- If a referenced file was deleted or moved: update AGENTS.md
- If a section's freshness date is >30 iterations old: re-read the area and update
```

**Effort:** 30 min (PROMPT.md Phase 6 edit)

---

### 3.9 `ralph.sh --resume` — Warm Start

**Gap:** After fixing a blocker (SIGNAL=BLOCKED), `ralph.sh` starts a full new session. The agent re-reads everything from scratch even though only the blocker changed.

**Add `--resume` mode:**

```bash
# ./ralph.sh --resume

Behavior:
- Does NOT clear the signal file
- Does NOT create a new branch (stays on existing ralph/* branch)
- Writes "CONTINUE: blocker resolved, resuming" to SIGNAL
- Runs a single iteration (agent reads STATUS.md which has the context)
```

**Effort:** 1 hr (ralph.sh new mode)

---

## Tier 4: Multi-Agent / Scale

Future capabilities for when the system runs on larger projects.

---

### 4.1 Task Locking

**Gap:** If two agents run in parallel worktrees, they could pick the same task.

**Add `ASSIGNED: [agent-id]` field to PRD task format:**

```markdown
- [ ] `#FEAT-001` Add sidebar navigation
  Priority: P1 | Attempts: 0 | Phase: 1 | ASSIGNED: ralph-session-20260226-143000
```

Agent sets ASSIGNED when picking a task in Phase 2, clears when completing.
Other agents skip ASSIGNED tasks.

**Effort:** 1 hr (PROMPT.md Phase 2 + Phase 6 edits)

---

### 4.2 Worktree-Aware Parallel Mode

**Gap:** ralph.sh is single-threaded. No way to run multiple agents in parallel.

**Add `--parallel N` mode:**

```bash
# ./ralph.sh --parallel 3

Behavior:
- Creates 3 git worktrees in .ralph-worktrees/
- Each gets its own ralph.sh subprocess
- Shared: PRD files (with task locking from 4.1)
- Independent: knowledge/STATUS.md, branches, commits
- On completion: merge all branches back (human reviews conflicts)
```

**Effort:** 3-5 hrs (ralph.sh major addition)

---

## Standalone Improvements (No Tier — Implement Anytime)

These are independent fixes that don't depend on other items.

---

### S.1 Stash Before Revert

**Current:** Phase 1.5 reverts bad commits with `git revert HEAD --no-edit`.
**Problem:** Sometimes the code was 90% right. Reverting throws away the approach entirely.

**Change:** Before reverting, stash the diff:
```bash
git stash push -m "ralph-reverted-iter-N-approach"
git revert HEAD --no-edit
```
The approach is preserved in the stash for later reference or partial recovery.

---

### S.2 Test Flakiness Tracking

**Add `[FLAKY]` tag to RESULTS.md:**

If a test passes, fails, then passes again across iterations → flag as `[FLAKY]`.
Flaky tests erode confidence in the entire testing system.
After 3 flaky occurrences, add to BUGS.md as P2: "Investigate flaky test: [description]"

---

### S.3 Decision Log — `knowledge/DECISIONS.md`

PROGRESS.md logs *what* happened. DECISIONS.md logs *why*.

```markdown
# Decisions

## D-001 — Chose CSS modules over Tailwind for component X (Iteration 12)
**Context:** Component needed dynamic class composition
**Options:** Tailwind + clsx, CSS modules, styled-components
**Decision:** CSS modules — matches existing pattern in sidebar.tsx
**Trade-off:** Less utility-class consistency, but avoids new dependency
```

Agent appends after any non-trivial implementation choice in Phase 3.

---

### S.4 Auto-Lint on File Edit (Hook Enhancement)

**Current `post-tool-use.sh`:** Shows reminders ("Run type check before committing").
**Enhancement:** Actually run the linter on the modified file and return results.

```bash
# In post-tool-use.sh, after extracting FILE_PATH:
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  LINT_RESULT=$(pnpm eslint "$FILE_PATH" 2>&1 || true)
  if [ -n "$LINT_RESULT" ]; then
    echo "LINT ISSUES in $FILE_PATH:"
    echo "$LINT_RESULT"
  fi
fi
```

Catches errors immediately instead of waiting for Phase 3 step 8.

---

### S.5 ARCHITECTURE.md — Remove Non-Existent Plugin Reference

**Current (line 207-221):** References "Official Ralph Plugin" at `ralph-wiggum@claude-plugins-official`.
**Fix:** This plugin doesn't exist as described. Either remove the section or mark it clearly as aspirational/community reference.

---

### S.6 Add `.gitignore` for Ephemeral Files

```gitignore
# Ephemeral state (not tracked)
knowledge/SIGNAL
knowledge/METRICS.jsonl
ralph.log
```

SIGNAL and ralph.log are runtime state, not source. METRICS.jsonl is debatable — you may want to track it.

---

## Implementation Priority Summary

```
PHASE 1 (This Week):
  1.1  FEEDBACK.md                    30 min
  1.2  Self-review in Phase 5         30 min
  1.3  METRICS.jsonl                  30 min
  1.4  Phase 2.5 RESEARCH             15 min
  1.5  Self-scoring                   10 min
  1.6  SKIP_UNTIL resolution req      5 min
  1.7  Canary test                    30 min
  1.8  Task IDs                       1 hr
  1.9  Complexity estimation          30 min
  1.10 ralph.sh --init                1-2 hr
  S.5  Remove plugin reference        5 min
  S.6  .gitignore                     5 min
                              Total: ~6 hrs

PHASE 2 (Next Week):
  2.1  Retrospective (Phase 6.5)      2 hr
  2.2  Risk-based testing             1 hr
  2.3  ralph.sh --dashboard           1-2 hr
  2.4  Diagnosis before SKIP          1 hr
  2.5  Performance baselines          1 hr
  2.6  Session continuity             1 hr
  2.7  Knowledge pruning              1 hr
  2.8  Hotspot detection              1 hr
  2.9  Dependency audit               30 min
  2.10 Health snapshot                30 min
  S.1-S.4 Standalone fixes            2 hr
                              Total: ~12-14 hrs

PHASE 3 (When Mature):
  3.1-3.9 + Tier 4                    ~15-20 hrs
```

---

## The Big Missing Piece: Reflection

The system has **memory** (LEARNINGS, PROGRESS, AGENTS) but no **reflection**.

It doesn't ask:
- "Am I building the right thing?"
- "Is this phase taking longer than expected? Why?"
- "What pattern keeps causing failures?"

Items 1.3 (METRICS.jsonl), 1.5 (Self-scoring), 2.1 (Retrospective), and 2.8 (Hotspot detection) together form a **metacognition layer** that turns Ralph from a diligent executor into a learning system. They should be implemented as a group.
