# System Architecture

> How the autonomous dev loop works, end to end.

---

## Overview

Ralph v3.0 uses a **multi-agent pipeline** by default. Legacy single-agent mode is
available via `--legacy` or `AGENT_MODE=single`.

### Multi-Agent Pipeline (default)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RALPH LOOP v3.0                                    │
│                                                                          │
│  ralph.sh (bash orchestrator — deterministic state machine)              │
│  ├── Preflight: clean git, create branch, check signal                   │
│  ├── Health check: dev server alive?                                     │
│  ├── Circuit breaker: too many consecutive failures?                     │
│  │                                                                       │
│  └── for each iteration:                                                 │
│       │                                                                  │
│       ├── Clean handoffs, create dirs                                    │
│       ├── STAGE 1: PLANNER (serial, Opus)                                │
│       │    └── Reads state → picks 1-3 tasks → EXECUTION_PLAN.json      │
│       ├── STAGE 2: BUILDERS (parallel, Sonnet, worktrees)                │
│       │    ├── Builder #1 (worktree-1) → BUILD_RESULT_1.json            │
│       │    ├── Builder #2 (worktree-2) → BUILD_RESULT_2.json            │
│       │    └── Builder #3 (worktree-3) → BUILD_RESULT_3.json            │
│       ├── STAGE 3: INTEGRATION (bash — no LLM)                           │
│       │    └── Sequential merge of worktree branches                     │
│       ├── STAGE 4: TESTERS (parallel, Sonnet, conditional)               │
│       │    ├── Tester #1: acceptance → TEST_RESULT_1.json               │
│       │    └── Tester #2: regression → TEST_RESULT_2.json               │
│       ├── STAGE 5: REVIEWER (serial, Opus)                               │
│       │    └── Review → commit → tag → update ALL docs → SIGNAL         │
│       │                                                                  │
│       ├── Check signal file (COMPLETE? BLOCKED? PAUSE?)                  │
│       ├── Check circuit breaker (N consecutive failures?)                │
│       ├── Write session summary (on exit)                                │
│       └── Continue or stop                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Legacy Single-Agent Mode (`--legacy` or `AGENT_MODE=single`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ralph.sh                                                                │
│  └── for each iteration:                                                 │
│       └── Pipe PROMPT.md into Claude Code (single session)               │
│            ├── Phase 0: PREFLIGHT                                        │
│            ├── Phase 1: ORIENT                                           │
│            ├── Phase 1.5: VALIDATE                                       │
│            ├── Phase 2: DECIDE                                           │
│            ├── Phase 2.5: RESEARCH                                       │
│            ├── Phase 3: BUILD                                            │
│            ├── Phase 4: TEST                                             │
│            ├── Phase 5: COMMIT                                           │
│            ├── Phase 6: UPDATE DOCS                                      │
│            ├── Phase 6.5: RETROSPECTIVE (every 10th)                     │
│            └── Phase 7: SIGNAL & EXIT                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Human → Agent → Human

```
HUMAN SEEDS:                    REVIEWER MAINTAINS:

IMPLEMENTATION-PLAN.md ──────▶  IMPLEMENTATION-PLAN.md (amended)
FEATURES.md ─────────────────▶  FEATURES.md (tasks marked done, IDs assigned)
AGENTS.md (project info) ────▶  AGENTS.md (codebase knowledge grows)
FEEDBACK.md ─────────────────▶  FEEDBACK.md (pending → processed)
                                STATUS.md (overwritten each iteration)
                                PROGRESS.md (appended each iteration)
                                LEARNINGS.md (appended when discoveries)
                                BUGS.md (populated from TEST_RESULTs)
                                IMPROVEMENTS.md (populated from TEST_RESULTs)
                                TECH-DEBT.md (populated when noticed)
                                RESULTS.md (updated from test results)
                                SIGNAL (completion/blocking signal)
HUMAN_SIGNAL ───────────────▶  (read + deleted by ralph.sh)
                                METRICS.jsonl (one JSON line per iteration)
                                DECISIONS.md (non-trivial choices logged)
                                DIAGNOSES.md (root-cause analysis on failures)
                                RETROSPECTIVES.md (every 10th iteration)
                                TASK-COUNTER.json (ID counters incremented)

RALPH.SH AUTO-GENERATES:
                                SESSION-HISTORY.md (appended at session end)
```

### Inter-Agent Data Flow (v3.0)

```
Planner ──EXECUTION_PLAN.json──▶ ralph.sh ──▶ Builders (via worktree copy)
                                          ──▶ Testers (direct read)
                                          ──▶ Reviewer (direct read)

Builder #1 ──BUILD_RESULT_1.json──▶ ralph.sh ──▶ Reviewer
Builder #2 ──BUILD_RESULT_2.json──▶ ralph.sh ──▶ Reviewer
Builder #3 ──BUILD_RESULT_3.json──▶ ralph.sh ──▶ Reviewer

Tester #1 ──TEST_RESULT_1.json──▶ Reviewer
Tester #2 ──TEST_RESULT_2.json──▶ Reviewer

Builder code changes ──git worktree──▶ ralph.sh (merge) ──▶ Reviewer (git diff)
```

All handoff JSON files in `knowledge/handoffs/` are ephemeral — cleaned at the start
of each iteration and gitignored.

## File Purposes

### Control Files

| File | Read by | Written by | Lifecycle |
|------|---------|------------|-----------|
| `PROMPT.md` | Agent (legacy mode only) | Human only | Deprecated in v3.0 (preserved as --legacy fallback) |
| `ralph.conf` | ralph.sh | Human only | Immutable during loop |
| `ralph.sh` | Shell | Human only | Immutable during loop |
| `agents/planner.md` | Planner agent | Human only | Immutable during loop |
| `agents/builder.md` | Builder agents | Human only | Template (orchestrator injects task JSON) |
| `agents/tester.md` | Tester agents | Human only | Template (orchestrator injects test type and budget) |
| `agents/reviewer.md` | Reviewer agent | Human only | Immutable during loop |
| `schemas/*.schema.json` | Orchestrator (validation) | Human only | Immutable during loop |
| `knowledge/SIGNAL` | ralph.sh + Reviewer | Planner or Reviewer | Overwritten each iteration |
| `knowledge/HUMAN_SIGNAL` | ralph.sh | Human only | Deleted after read (single-use) |
| `.gitignore` | git | Human only | Excludes SIGNAL, handoffs, worktrees, ralph.log |

### Handoff Files (v3.0 Inter-Agent Communication)

| File | Written by | Read by | Lifecycle |
|------|-----------|---------|-----------|
| `knowledge/handoffs/EXECUTION_PLAN.json` | Planner | Orchestrator, Builders, Testers, Reviewer | Cleaned each iteration |
| `knowledge/handoffs/BUILD_RESULT_N.json` | Builder #N | Orchestrator, Reviewer | Cleaned each iteration |
| `knowledge/handoffs/TEST_RESULT_N.json` | Tester #N | Reviewer | Cleaned each iteration |

### Knowledge Files (Agent Memory)

| File | Read by | Written by | Lifecycle | Purpose |
|------|---------|------------|-----------|---------|
| `knowledge/STATUS.md` | Planner, Reviewer | Planner (warnings), Reviewer (full) | Overwritten | Handoff to next iteration |
| `knowledge/PROGRESS.md` | Planner (tail only) | Reviewer | Append-only | Full iteration history |
| `knowledge/LEARNINGS.md` | Planner, Builders (read-only) | Reviewer | Append-only (capped at 100) | Gotchas and patterns |
| `knowledge/AGENTS.md` | Planner, Builders (read-only) | Reviewer | Living doc (freshness-dated) | Codebase brain |
| `knowledge/IMPLEMENTATION-PLAN.md` | Planner | Reviewer | Living doc | Roadmap |
| `knowledge/FEEDBACK.md` | Planner | Human seeds, Reviewer processes | Living doc | Human → agent channel |
| `knowledge/METRICS.jsonl` | Planner (last 5), Reviewer | Reviewer | Append-only | Machine-readable iteration data |
| `knowledge/DECISIONS.md` | Planner | Reviewer | Append-only | Non-trivial implementation choices |
| `knowledge/DIAGNOSES.md` | Planner | Planner, Reviewer | Append-only | Root-cause analysis for failing tasks |
| `knowledge/RETROSPECTIVES.md` | Planner | Reviewer (every 10th) | Append-only | Meta-learning summaries |
| `knowledge/SESSION-HISTORY.md` | Planner (last entry) | ralph.sh (at session end) | Append-only | Cross-session narrative |
| `knowledge/TASK-COUNTER.json` | Planner, Reviewer | Planner, Reviewer | Living doc | Structured task ID counters |
| `knowledge/archive/` | — | Reviewer | Directory | Archived PROGRESS.md entries |

### PRD Files (Task Lists)

| File | Read by | Written by | Priority |
|------|---------|------------|----------|
| `prd/FEATURES.md` | Planner (task selection) | Human seeds, Reviewer marks done | After P0/P1 bugs |
| `prd/BUGS.md` | Planner (task selection) | Reviewer (from TEST_RESULTs) | P0 first, P1 second |
| `prd/IMPROVEMENTS.md` | Planner (task selection) | Reviewer (from TEST_RESULTs) | After features/bugs, before tech debt |
| `prd/TECH-DEBT.md` | Planner (task selection) | Both | Lowest priority |

### Knowledge Reference Files

| File | Read by | Written by |
|------|---------|------------|
| `knowledge/DESIGN-PRINCIPLES.md` | Tester (UX evaluation) | Human only |
| `knowledge/PERFECTION-SCORECARD.md` | Reviewer (phase completion) | Human only |

### Testing Files

| File | Read by | Written by |
|------|---------|------------|
| `testing/RUN.md` | Tester (mega listener) | Human only |
| `testing/CHECKLIST.md` | Tester (quality gate) | Human only |
| `testing/RESULTS.md` | Planner (known-broken) | Reviewer |
| `testing/BASELINES.md` | Tester (perf comparison) | Reviewer (after perf runs) |
| `testing/suites/SUITE-INDEX.md` | Planner (cadence), Tester | Human only |
| `testing/suites/*.md` | Tester | Human only |
| `testing/apps/*.md` | Planner, Tester, Reviewer | Human initially, Reviewer updates |

## Safety Mechanisms

### Circuit Breaker (ralph.sh)

ralph.sh counts consecutive `blocked` or `partial` results in PROGRESS.md.
If the count reaches `LOOP_CIRCUIT_BREAKER` (default: 3), the loop stops.
This prevents runaway iterations burning tokens on an unsolvable problem.

```
Iteration 7: completed ✓  (counter resets to 0)
Iteration 8: partial   ✗  (counter = 1)
Iteration 9: blocked   ✗  (counter = 2)
Iteration 10: blocked  ✗  (counter = 3 → CIRCUIT BREAKER TRIPPED)
```

### Attempt Tracking + Diagnosis (PROMPT.md Phase 2)

Each task in the PRD has an `Attempts:` counter. The agent increments it each time
it works on the task. After attempt 2, the agent writes a root-cause analysis to
`knowledge/DIAGNOSES.md`. Attempt 3 must use a fundamentally different approach.
After 3 failed attempts, the task is marked with `SKIP_UNTIL:` (verifiable condition),
`DIAGNOSIS:` (what was tried), and `RESOLUTION:` (concrete next step). Vague conditions
are explicitly forbidden. This prevents a single broken task from consuming all iterations.

### Risk-Based Testing (PROMPT.md Phase 2)

Instead of fixed testing cadences, the agent calculates a risk score based on what the
last iteration touched (auth/security: +3, data model: +3, >5 files: +2, shared components: +2,
revert: +2, partial/blocked: +1). Scores of 3-4 trigger regression next iteration; 5+
triggers regression + data-integrity. Minimum floors still apply (regression at least
every 8th iteration, accessibility/performance on 10th-iteration schedule).

### Self-Review (PROMPT.md Phase 5)

Before committing, the agent reads its own diff as if reviewing someone else's PR —
checking naming conventions, hardcoded values, accidental deletions, error paths, debug
artifacts, and code duplication. Issues must be fixed before the commit gate.

### Canary Test (PROMPT.md Phase 5)

After every commit that touches UI, the agent runs one critical golden path as a smoke
test — navigating to the app entry point, completing the most important user journey, and
checking for console errors. A failed canary blocks progression to Phase 6.

### Git Checkpoints (PROMPT.md Phase 5)

Every successful commit is tagged `ralph-iter-N`. If a later iteration introduces a
regression, you can rollback: `./ralph.sh --rollback N` reverts to that checkpoint.

### Stash Before Revert (PROMPT.md Phase 1.5)

When reverting a bad commit, the approach is first preserved via
`git stash push -m "ralph-reverted-iter-N-approach"` before the revert. This allows
partial recovery of 90%-correct approaches.

**Known limitation — stash pile-up:** ralph.sh also stashes uncommitted changes at
session start (`verify_clean_git_state`), but never pops them. Over multiple sessions,
this causes stale stashes to accumulate. Periodically clean up manually:

```bash
git stash list                     # See accumulated stashes
git stash drop stash@{N}          # Drop a specific stash
git stash clear                    # Nuclear option: drop all stashes
```

Future fix: ralph.sh should pop its auto-stash at session end, or tag stashes with
session IDs and clean up stashes older than N sessions.

### Signal File (knowledge/SIGNAL)

The signal file provides bidirectional communication:
- **Agent → ralph.sh:** "COMPLETE" stops the loop, "BLOCKED" stops the loop
- **Human → Agent:** Write "PAUSE" or "STOP" to halt the loop before the next iteration

**Limitation:** The agent overwrites SIGNAL every iteration in Phase 7. If a human writes
"PAUSE" to SIGNAL while the agent is mid-iteration, the agent's Phase 7 output will
overwrite it. Use `HUMAN_SIGNAL` (below) for reliable pausing.

### Human Signal File (knowledge/HUMAN_SIGNAL)

The reliable human pause mechanism. ralph.sh checks this file **before** checking
`knowledge/SIGNAL` at the start of each iteration. Any non-empty content triggers a pause.

```bash
# Reliably pause Ralph between iterations:
echo "PAUSE" > autonomous-dev/knowledge/HUMAN_SIGNAL
```

**Behavior:**
- ralph.sh reads the file, logs the content, then **deletes** it (single-use)
- The agent never reads or writes this file — only ralph.sh touches it
- Checked before SIGNAL, so it cannot be overwritten by the agent
- Added to `.gitignore` (ephemeral state, not tracked)

### Human Feedback Channel (knowledge/FEEDBACK.md)

Richer than the binary signal file. Humans write structured feedback under `## Pending`.
The agent reads these in Phase 1 — pending items override normal task priority. After
acting on each item, the agent moves it to `## Processed` with a response.

### Branch Isolation

ralph.sh creates a `ralph/session-*` branch at session start. All work happens on
this branch, never on main/master. Merge back to main only after human review.

### Validation (PROMPT.md Phase 1.5)

Each iteration validates the previous iteration's work before building on it.
If the last commit broke compilation or looks wrong, it gets reverted automatically.
This prevents error cascading across iterations.

### Graceful Degradation (PROMPT.md Phase 4)

When Playwright MCP is unavailable, the agent doesn't skip testing entirely. Instead it
increases static verification rigor (extra type-check, full build, complete test suite),
logs a P1 bug to investigate the Playwright issue, and proceeds with the commit. Code is
still verified — just not visually.

### Proactive Improvement Discovery

The agent doesn't just fix bugs and build features — it actively discovers improvements.

**How it works:**
1. During Phase 4 (testing), the agent observes pages with a "product eye" — looking for
   unnecessary friction, missing affordances, suboptimal flows, and polish opportunities
2. Observations are logged to `prd/IMPROVEMENTS.md` with structured metadata: category,
   what was noticed, why it matters, suggested approach, and a design principle reference
3. Improvements sit in the priority order between bugs and tech debt — they get worked on
   after features and bugs in the current phase are resolved
4. Each improvement must reference a design principle from `knowledge/DESIGN-PRINCIPLES.md`
   to prevent subjective opinions from entering the pipeline
5. Testing suites route findings appropriately: broken things → BUGS.md, things that work
   but could be better → IMPROVEMENTS.md

**This turns the agent from reactive (build what's listed) to proactive (build what's listed
AND discover what's missing).**

### Quality Reference System

Two reference documents guide the agent's quality judgments:
- `knowledge/DESIGN-PRINCIPLES.md` — Nielsen's heuristics, Gestalt principles, Fitts's Law,
  animation timing, cognitive load budgets, information hierarchy, empty state design,
  error message standards. Consulted during UX testing and code review.
- `knowledge/PERFECTION-SCORECARD.md` — 10-dimension scoring system with 100 measurable
  criteria. Scored at phase completion milestones. Dimensions: functional, accessibility,
  performance, responsive, visual, content, journeys, states, security, resilience.

## Metacognition Layer

The system doesn't just execute — it reflects on its own performance through four
interlocking mechanisms:

### 1. METRICS.jsonl — Structured Telemetry

Every iteration appends one JSON line capturing: task ID, type, result, files changed,
bugs/improvements found, attempt count, complexity estimate, risk score, and self-scores.
This creates a machine-queryable log of agent behavior over time.

### 2. Self-Scoring — Per-Iteration Quality Assessment

Each PROGRESS.md entry includes a 5-dimension self-assessment:
- Code quality (1-5)
- Test coverage of change (1-5)
- Confidence this won't regress (1-5)
- Efficiency / wasted actions (1-5)
- Proactive observations count

Over 20+ iterations, score trends reveal declining quality, testing gaps, or lost
observation discipline before they manifest as bugs.

### 3. Retrospective (Phase 6.5) — Pattern Analysis

Every 10th iteration, the agent analyzes the last 10 PROGRESS entries and METRICS.jsonl
records. It computes success rate, identifies most-failed task types, detects hotspot
files (modified in 5+ of last 10 iterations), finds recurring failure root causes, and
tracks velocity trends. Patterns that appear 3+ times get promoted to META entries in
LEARNINGS.md. Summaries go to RETROSPECTIVES.md.

### 4. Codebase Health Checks — Architectural Awareness

Every 10th iteration (Phase 6, subsection 9), the agent scans METRICS.jsonl for:
- **Hotspots:** Files touched in 5+ recent iterations → suggests decomposition
- **Duplication:** Same pattern written 3+ times → suggests extraction
- **Complexity creep:** Files exceeding 300 lines → suggests splitting

These observations enter the normal IMPROVEMENTS.md priority queue.

### How They Work Together

```
METRICS.jsonl ──▶ Retrospective (every 10th)  ──▶ META entries in LEARNINGS.md
     │                                                      │
     ├──▶ Self-Score Trends ──▶ "Confidence dropping" ──▶ Trigger regression
     │
     └──▶ Codebase Health  ──▶ Hotspots/Duplication ──▶ IMPROVEMENTS.md
```

The metacognition layer turns Ralph from a diligent executor into a learning system that
gets better over time. Without it, the same mistakes repeat; with it, patterns are
detected and mitigations are codified.

## Platform Compatibility

Ralph runs on **macOS**, **Linux**, and **Windows (via Git Bash / MSYS2)**.

### Windows-Specific Considerations

| Issue | Cause | Solution (built into ralph.sh) |
|-------|-------|-------------------------------|
| `\r': command not found` | CRLF line endings | Run `sed -i 's/\r$//' ralph.sh` after copying |
| `Argument list too long` | PROMPT.md exceeds Windows arg limit | Prompt piped via stdin, not `-p "$(cat ...)"` |
| `CLAUDECODE` env var blocks nested launch | Running from inside Claude Code session | ralph.sh unsets `CLAUDECODE` before invoking claude |
| Path not found in WSL | WSL uses `/mnt/c/`, Git Bash uses `/c/` | Use Git Bash, not WSL/PowerShell |

**Required shell:** Git Bash (comes with Git for Windows). PowerShell and WSL are not supported
because the Claude CLI is installed via npm on Windows and uses MSYS2-style paths.

**Windows Terminal setup:** Add Git Bash as a profile:
Settings → Add new profile → Command line: `C:\Program Files\Git\bin\bash.exe --login -i`

## Hooks (Optional Enhancement)

The `hooks/` directory contains template scripts for Claude Code lifecycle hooks.
These are OPTIONAL but recommended for maximum robustness.

| Hook | When | Purpose |
|------|------|---------|
| `session-start.sh` | Claude Code session begins | Inject STATUS.md context automatically |
| `pre-tool-use.sh` | Before any tool runs | Block dangerous commands (.env access, rm -rf) |
| `post-tool-use.sh` | After file edits | Auto-run lint on modified files, size/truncation checks |
| `stop-hook.sh` | Agent tries to exit | Verify docs + metrics updated, enforce quality gate |

**Multi-agent behavior (v3.0):** In multi-agent mode, ralph.sh sets `RALPH_AGENT`
env var to identify the current agent. `stop-hook.sh` checks this and bypasses for
non-reviewer agents (planner, builder, tester exit freely). Only the reviewer must
pass the documentation enforcement checks. Security hooks (`pre-tool-use.sh`) apply
to ALL agents equally.

See `hooks/README.md` for installation instructions.

## Testing Coverage Summary

| Category | Suites | Total Budget |
|----------|--------|-------------|
| Core (v1) | Navigation, Forms, States, UX Review, Regression | ~150 actions |
| Quality (v2) | Accessibility, Performance, Responsive, Visual, Data, Security, Golden Paths, Content | ~250 actions |
| **Total** | **13 suites** | **~400 actions** |

Supporting infrastructure:
- Mega listener (errors, warnings, network, performance, layout shifts)
- 6 audit functions (accessibility, performance, responsive, content, cognitive load, security)
- 35-check per-page quality gate
- 100-criterion perfection scorecard across 10 dimensions
- Design principles reference (Nielsen, Shneiderman, Gestalt, Fitts's Law, cognitive load)
- Performance baselines tracking (`testing/BASELINES.md`)

## Known Issues & Fixes

### Token Parsing Crash (Fixed 2026-02-26)

**Problem:** `set -eo pipefail` at the top of ralph.sh combined with `grep` pipelines
in the token/cost tracking section (lines ~777-778) caused silent script death. When
`grep` found no match (e.g., Claude's stderr didn't contain token info), it returned
exit code 1, which `pipefail` promoted to a fatal error. The script died silently after
every iteration without reaching the signal check or inter-iteration logic.

**Fix:** Added `|| true` to the grep pipelines in the token parsing block:
```bash
TOKENS_IN=$(echo "$CLAUDE_STDERR" | grep -oE 'input[_: ]+[0-9,]+' | ... || true)
TOKENS_OUT=$(echo "$CLAUDE_STDERR" | grep -oE 'output[_: ]+[0-9,]+' | ... || true)
```

**Impact:** Applied to master copy and both project instances (Stride, clay-web-ui).
Without this fix, ralph.sh ran exactly one iteration per invocation regardless of the
requested count, because the script exited before reaching the loop continuation logic.

### Builder BUILD_RESULT Copy Bug (Fixed 2026-02-28)

**Problem:** In the builder subshell, `PROJECT_ROOT` was overridden to the worktree path
(needed so the builder agent works in the worktree). The copy-back line that sends
`BUILD_RESULT_N.json` to the main handoffs directory used `$PROJECT_ROOT`, which now
pointed at the worktree — making the copy a no-op. Merge and review stages never saw
builder results.

**Fix:** Capture `main_handoffs_dir="$PROJECT_ROOT/knowledge/handoffs"` before the
subshell overrides `PROJECT_ROOT`.

### JSON Parsing Fragility (Fixed 2026-02-28)

**Problem:** 8 inline `python3 -c "import json..."` blocks scattered through ralph.sh
pipeline code, each with a fragile `grep` fallback. If python3 was unavailable, the grep
fallbacks would silently produce wrong results for nested JSON paths.

**Fix:** Added 5 centralized JSON helper functions (`json_val`, `json_count`, `json_pluck`,
`json_extract`, `json_any`) that try python3 → jq → grep as a fallback chain. All 8 inline
blocks replaced with one-liner calls. A preflight warning is shown if neither python3 nor
jq is available in multi-agent mode.

### Hook Path Mismatch (Fixed 2026-02-28)

**Problem:** `stop-hook.sh` and `session-start.sh` used `$SCRIPT_DIR/knowledge/` paths.
After `--init` deployment, `SCRIPT_DIR` (autonomous-dev/) diverges from `PROJECT_ROOT`
(project root where agents write knowledge files). Hooks couldn't find STATUS.md, SIGNAL, etc.

**Fix:** Both hooks now source `ralph.conf` if available to get `PROJECT_ROOT`, with
fallback to `SCRIPT_DIR` if ralph.conf is missing.

## Multi-Agent Pipeline (v3.0)

Ralph v3 decomposes the single mega-prompt into a parallel multi-agent pipeline.
The orchestrator (`ralph.sh`) routes between specialized agents, each with a focused
prompt and limited permissions.

### Pipeline Architecture

```
ralph.sh (bash orchestrator — deterministic state machine)
│
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ Pre-iteration: clean handoffs, check signal, circuit breaker   │
│  └────────────────────────────┬────────────────────────────────────┘
│                               ▼
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ STAGE 1: PLANNER (serial, Opus)                                │
│  │ Reads all state → picks 1-3 independent tasks → file ownership │
│  │ Output: knowledge/handoffs/EXECUTION_PLAN.json                 │
│  └────────────────────────────┬────────────────────────────────────┘
│                               ▼
│         ┌─────────────────────┼─────────────────────┐
│         ▼                     ▼                     ▼
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │ STAGE 2a:    │  │ STAGE 2b:    │  │ STAGE 2c:    │
│  │ BUILDER #1   │  │ BUILDER #2   │  │ BUILDER #3   │
│  │ (worktree-1) │  │ (worktree-2) │  │ (worktree-3) │
│  │ Sonnet       │  │ Sonnet       │  │ Sonnet       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
│         │                  │                  │
│         ▼                  ▼                  ▼
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ STAGE 3: INTEGRATION (bash — no LLM)                           │
│  │ Sequential merge of worktree branches → conflict detection     │
│  └────────────────────────────┬────────────────────────────────────┘
│                               ▼
│         ┌─────────────────────┼─────────────────────┐
│         ▼                     ▼                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ STAGE 4a:    │  │ STAGE 4b:    │                 │
│  │ TESTER #1    │  │ TESTER #2    │   (conditional) │
│  │ (acceptance) │  │ (regression) │                 │
│  │ Sonnet       │  │ Sonnet       │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                         │
│         ▼                  ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ STAGE 5: REVIEWER (serial, Opus)                               │
│  │ Reviews diffs → commits → tags → updates ALL docs → signal     │
│  └─────────────────────────────────────────────────────────────────┘
```

### Key Properties

- Stages 1 and 5 are ALWAYS serial (planning and review cannot be parallelized)
- Stage 2 runs 1-3 builders in parallel git worktrees (planner decides count)
- Stage 3 is deterministic bash (no LLM involved in merging)
- Stage 4 runs 0-2 testers in parallel (conditional on UI changes + Playwright)
- The orchestrator makes all routing decisions — agents never decide what to run next

### Inter-Agent Communication

Agents communicate via JSON handoff files in `knowledge/handoffs/`:

```
Planner ──EXECUTION_PLAN.json──▶ Orchestrator ──▶ Builders, Testers, Reviewer
Builder  ──BUILD_RESULT_N.json──▶ Orchestrator ──▶ Reviewer
Tester   ──TEST_RESULT_N.json──▶ Reviewer
```

All handoff files are ephemeral (gitignored) and cleaned at the start of each iteration.
Schemas for validation live in `schemas/`.

### Agent Prompt Templates

Builder and tester prompts are **templates** — ralph.sh substitutes variables before
piping the prompt to Claude. This allows the same source prompt to produce distinct
agent identities.

| Template | Variables | Produced by |
|----------|-----------|-------------|
| `agents/builder.md` | `{{SLOT}}`, `{{WORKTREE_PATH}}` | `prepare_builder_prompt()` — also appends task JSON |
| `agents/tester.md` | `{{TEST_TYPE}}`, `{{TEST_N}}`, `{{ACTION_BUDGET}}`, `{{TEST_FOCUS}}` | `prepare_tester_prompt()` |

**Tester parameterization:** Acceptance tester gets budget=10, focus on acceptance criteria
and quality gate. Regression tester gets budget=40, focus on regression suites and suite
testing. Without this, both testers would receive identical prompts and produce colliding
output files.

Generated prompt files are written to `.ralph/` and gitignored.

### File Ownership Model

The planner assigns non-overlapping `files_owned` sets to each builder. Builders
verify ownership before every file write. `shared_files.read_only` (package.json,
tsconfig.json, etc.) are off-limits to all builders.

### Agent Prompts

| Agent | File | Model | Lines | Phases | Template? |
|-------|------|-------|-------|--------|-----------|
| Planner | `agents/planner.md` | Opus | ~200 | 0, 1, 1.5, 2, 2.5 | No |
| Builder | `agents/builder.md` | Sonnet | ~150 | 3 | Yes (`{{SLOT}}`, `{{WORKTREE_PATH}}`) |
| Tester | `agents/tester.md` | Sonnet | ~190 | 4 | Yes (`{{TEST_TYPE}}`, `{{TEST_N}}`, `{{ACTION_BUDGET}}`, `{{TEST_FOCUS}}`) |
| Reviewer | `agents/reviewer.md` | Opus | ~200 | 5, 6, 6.5, 7 | No |

### Backward Compatibility

- `./ralph.sh` → multi-agent mode (new default)
- `./ralph.sh --legacy` → single-agent mode (uses PROMPT.md)
- `AGENT_MODE=single` in ralph.conf → permanently use legacy mode
- All existing modes (--monitor, --rollback, --status, --dashboard, --init, --resume) unchanged

### Diagnostic Logging (`RALPH_VERBOSE`)

Set `RALPH_VERBOSE=1` (env var or in `ralph.conf`) to enable `[VERBOSE]` log lines at
every pipeline decision point. Covers:

- **JSON helpers** (`json_val`, `json_count`, `json_pluck`) — key, value, return code (G014 `\r` detection)
- **Worktree lifecycle** — path, branch name, creation verify result
- **Builder subshells** — entry (slot, path, prompt), `run_agent` exit code, BUILD_RESULT health check, copy-back success
- **Merge decisions** — per-slot branch existence, build status
- **Tester launch** — all boolean conditions (playwright, acceptance, regression, UI changes)
- **Signal parsing** — raw value + hex dump (invisible `\r`/`\n` detection)
- **Circuit breaker** — consecutive failure count

Default is `0` (off). No performance impact when disabled — `vlog()` short-circuits on the
first `if` test.

### Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Planner crashes | Exit code != 0 | Reviewer documents failure |
| Builder fails | BUILD_RESULT.status=failed | Skip merge for that slot |
| All builders fail | All results failed | Reviewer documents, no commit |
| Merge conflict | git merge exit != 0 | Abort merge, skip conflicting slot |
| Tester unavailable | Playwright not detected | Skip testing, reviewer notes |
| Reviewer crashes | Exit code != 0 | Critical — needs human review |

## Evolution Path

| Level | Trigger | What Changes |
|-------|---------|-------------|
| 1 | Foundation | ralph.sh + PROMPT.md + Playwright MCP + 13 suites |
| 2 | Metacognition | METRICS.jsonl + self-scoring + retrospectives + risk-based testing + structured IDs + research phase + session continuity + knowledge maintenance + codebase health checks + `--init` / `--dashboard` / `--resume` modes |
| 3 (NOW) | Multi-Agent | Parallel builder worktrees, Planner/Builder/Tester/Reviewer hierarchy, JSON handoffs, model routing (Opus for reasoning, Sonnet for execution) |
| 4 | First week | App-context files, tuned PRDs, AFK mode |
| 5 | Revenue | Visual regression testing (screenshot diffing), production smoke tests |
| 6 | CI/CD exists | GitHub Actions integration, PR-triggered testing |
| 7 | High volume | Browser-Use + cheap models for broad sweeps, cost tracking |
