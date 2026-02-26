# System Architecture

> How the autonomous dev loop works, end to end.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RALPH LOOP                                      │
│                                                                          │
│  ralph.sh                                                                │
│  ├── Preflight: clean git, create branch, check signal                   │
│  ├── Health check: dev server alive?                                     │
│  ├── Circuit breaker: too many consecutive failures?                     │
│  │                                                                       │
│  └── for each iteration:                                                 │
│       │                                                                  │
│       ├── Pipe PROMPT.md into Claude Code                                │
│       │    │                                                             │
│       │    ├── Phase 0: PREFLIGHT (git, branch, server, signal, health)  │
│       │    ├── Phase 1: ORIENT (STATUS, FEEDBACK, PLAN, AGENTS, etc.)    │
│       │    ├── Phase 1.5: VALIDATE (check last commit, stash + revert)   │
│       │    ├── Phase 2: DECIDE (risk score, complexity, smart sequence)   │
│       │    ├── Phase 2.5: RESEARCH (grep, tests, similar files)          │
│       │    ├── Phase 3: BUILD (implement, typecheck, lint, test)         │
│       │    ├── Phase 4: TEST (Playwright MCP + graceful degradation)     │
│       │    ├── Phase 5: COMMIT (semantic review, canary test)            │
│       │    ├── Phase 6: UPDATE DOCS (all knowledge + metrics + health)   │
│       │    ├── Phase 6.5: RETROSPECTIVE (every 10th — analyze patterns)  │
│       │    └── Phase 7: SIGNAL & EXIT                                    │
│       │                                                                  │
│       ├── Check signal file (COMPLETE? BLOCKED? PAUSE?)                  │
│       ├── Check circuit breaker (N consecutive failures?)                │
│       ├── Write session summary (on exit)                                │
│       └── Continue or stop                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
HUMAN SEEDS:                    AGENT MAINTAINS:

IMPLEMENTATION-PLAN.md ──────▶  IMPLEMENTATION-PLAN.md (amended)
FEATURES.md ─────────────────▶  FEATURES.md (tasks marked done, IDs assigned)
AGENTS.md (project info) ────▶  AGENTS.md (codebase knowledge grows)
FEEDBACK.md ─────────────────▶  FEEDBACK.md (pending → processed)
                                STATUS.md (overwritten each iteration)
                                PROGRESS.md (appended each iteration)
                                LEARNINGS.md (appended when discoveries)
                                BUGS.md (populated from testing)
                                IMPROVEMENTS.md (populated from observation)
                                TECH-DEBT.md (populated when noticed)
                                RESULTS.md (updated from browser tests)
                                SIGNAL (completion/blocking signal)
                                METRICS.jsonl (one JSON line per iteration)
                                DECISIONS.md (non-trivial choices logged)
                                DIAGNOSES.md (root-cause analysis on failures)
                                RETROSPECTIVES.md (every 10th iteration)
                                TASK-COUNTER.json (ID counters incremented)

RALPH.SH AUTO-GENERATES:
                                SESSION-HISTORY.md (appended at session end)
```

## File Purposes

### Control Files

| File | Read by | Written by | Lifecycle |
|------|---------|------------|-----------|
| `PROMPT.md` | Agent (every iteration) | Human only | Immutable during loop |
| `ralph.conf` | ralph.sh | Human only | Immutable during loop |
| `ralph.sh` | Shell | Human only | Immutable during loop |
| `knowledge/SIGNAL` | ralph.sh + Agent | Agent | Overwritten each iteration |
| `.gitignore` | git | Human only | Excludes SIGNAL, ralph.log |

### Knowledge Files (Agent Memory)

| File | Read by | Written by | Lifecycle | Purpose |
|------|---------|------------|-----------|---------|
| `knowledge/STATUS.md` | Agent (Phase 1) | Agent (Phase 6) | Overwritten | Handoff to next iteration |
| `knowledge/PROGRESS.md` | Agent (Phase 1, tail only) | Agent (Phase 6) | Append-only | Full iteration history |
| `knowledge/LEARNINGS.md` | Agent (Phase 1) | Agent (Phase 6) | Append-only (capped at 100) | Gotchas and patterns |
| `knowledge/AGENTS.md` | Agent (Phase 1) | Agent (Phase 6) | Living doc (freshness-dated) | Codebase brain |
| `knowledge/IMPLEMENTATION-PLAN.md` | Agent (Phase 1) | Agent (Phase 6) | Living doc | Roadmap |
| `knowledge/FEEDBACK.md` | Agent (Phase 1) | Human seeds, Agent processes | Living doc | Human → agent channel |
| `knowledge/METRICS.jsonl` | Agent (Phase 6, 6.5) | Agent (Phase 6) | Append-only | Machine-readable iteration data |
| `knowledge/DECISIONS.md` | Agent (Phase 2.5) | Agent (Phase 6) | Append-only | Non-trivial implementation choices |
| `knowledge/DIAGNOSES.md` | Agent (Phase 2) | Agent (Phase 2) | Append-only | Root-cause analysis for failing tasks |
| `knowledge/RETROSPECTIVES.md` | Agent (Phase 1) | Agent (Phase 6.5) | Append-only | Meta-learning summaries (every 10th) |
| `knowledge/SESSION-HISTORY.md` | Agent (Phase 1) | ralph.sh (at session end) | Append-only | Cross-session narrative |
| `knowledge/TASK-COUNTER.json` | Agent (Phase 2, 6) | Agent (Phase 6) | Living doc | Structured task ID counters |
| `knowledge/archive/` | — | Agent (Phase 6) | Directory | Archived PROGRESS.md entries |

### PRD Files (Task Lists)

| File | Read by | Written by | Priority |
|------|---------|------------|----------|
| `prd/FEATURES.md` | Agent (Phase 2) | Human seeds, Agent marks done | After P0/P1 bugs |
| `prd/BUGS.md` | Agent (Phase 2) | Agent populates from testing | P0 first, P1 second |
| `prd/IMPROVEMENTS.md` | Agent (Phase 2) | Agent populates from observation | After features/bugs, before tech debt |
| `prd/TECH-DEBT.md` | Agent (Phase 2) | Both | Lowest priority |

### Knowledge Reference Files

| File | Read by | Written by |
|------|---------|------------|
| `knowledge/DESIGN-PRINCIPLES.md` | Agent (testing) | Human only |
| `knowledge/PERFECTION-SCORECARD.md` | Agent (phase completion) | Human only |

### Testing Files

| File | Read by | Written by |
|------|---------|------------|
| `testing/RUN.md` | Agent (Phase 4) | Human only |
| `testing/CHECKLIST.md` | Agent (Phase 4) | Human only |
| `testing/RESULTS.md` | Agent (Phase 1) | Agent (Phase 4) |
| `testing/BASELINES.md` | Agent (Phase 4) | Agent (Phase 4, after perf runs) |
| `testing/suites/SUITE-INDEX.md` | Agent (Phase 2, 4) | Human only |
| `testing/suites/*.md` | Agent (Phase 4) | Human only |
| `testing/apps/*.md` | Agent (Phase 1) | Human initially, Agent updates |

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

### Signal File (knowledge/SIGNAL)

The signal file provides bidirectional communication:
- **Agent → ralph.sh:** "COMPLETE" stops the loop, "BLOCKED" stops the loop
- **Human → Agent:** Write "PAUSE" or "STOP" to halt the loop before the next iteration

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

## Evolution Path

| Level | Trigger | What Changes |
|-------|---------|-------------|
| 1 | Foundation | ralph.sh + PROMPT.md + Playwright MCP + 13 suites |
| 2 (NOW) | Metacognition | METRICS.jsonl + self-scoring + retrospectives + risk-based testing + structured IDs + research phase + session continuity + knowledge maintenance + codebase health checks + `--init` / `--dashboard` / `--resume` modes |
| 3 | First week | App-context files, tuned PRDs, AFK mode |
| 4 | Revenue | Visual regression testing (screenshot diffing), production smoke tests |
| 5 | CI/CD exists | GitHub Actions integration, PR-triggered testing |
| 6 | Team grows | Parallel worktrees, multi-agent orchestration, task locking |
| 7 | High volume | Browser-Use + cheap models for broad sweeps, cost tracking |
