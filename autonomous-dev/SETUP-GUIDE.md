# Ralph Loop — Setup Guide

> How to deploy the autonomous dev loop on any project.
> Time to setup: ~30 minutes. Time to first autonomous iteration: ~35 minutes.

---

## Prerequisites

Before starting, you need:

| Requirement | How to Check | How to Install |
|-------------|-------------|----------------|
| Claude Code CLI | `claude --version` | `npm install -g @anthropic-ai/claude-code` |
| Playwright MCP | Check `.claude/settings.json` for playwright | `claude mcp add playwright -- npx @playwright/mcp@latest` |
| Git | `git --version` | Already installed if you're reading this |
| Node.js | `node --version` | Already installed for web projects |
| Dev server | Can run the app locally | Project-specific |
| **Git Bash** (Windows) | `bash --version` in Git Bash | Comes with [Git for Windows](https://gitforwindows.org) |

> **Windows users:** Ralph must run in **Git Bash**, not PowerShell, CMD, or WSL.
> PowerShell/WSL cannot resolve Git Bash paths (`/c/Users/...`) and WSL doesn't
> have the Claude CLI installed. Open Git Bash directly or add it as a profile in
> Windows Terminal (Command: `C:\Program Files\Git\bin\bash.exe --login -i`).

---

## Step 1: Copy the System

**Option A — Automatic (recommended):** Use `--init` to auto-detect your project and
generate a configured setup:

```bash
/path/to/docs/autonomous-dev/ralph.sh --init /path/to/your-project
```

This copies files, detects your package manager/framework/port, auto-fills ralph.conf,
creates a ralph/ branch, and moves knowledge/prd/testing/ to the project root level.

**Option B — Manual:** Copy the directory and configure by hand:

```bash
cp -r /path/to/docs/autonomous-dev /path/to/your-project/autonomous-dev
```

**Example for Stride:**
```bash
cp -r "C:/Users/Patrick/Builds/Cursor Projects/docs/autonomous-dev" \
      "C:/Users/Patrick/Builds/Cursor Projects/apps/Process App/stride/autonomous-dev"
```

Your project should now have:
```
your-project/
├── autonomous-dev/
│   ├── ralph.sh               ← No edits needed (orchestrator)
│   ├── ralph.conf             ← You edit this (Step 3)
│   ├── PROMPT.md              ← Legacy mode only (Step 2, optional)
│   ├── agents/                ← Multi-agent prompts (v3.0)
│   │   ├── planner.md         ← Planner agent (Phases 0-2.5)
│   │   ├── builder.md         ← Builder agent (Phase 3)
│   │   ├── tester.md          ← Tester agent (Phase 4)
│   │   └── reviewer.md        ← Reviewer agent (Phases 5-7)
│   ├── schemas/               ← JSON handoff validation (v3.0)
│   │   ├── execution-plan.schema.json
│   │   ├── build-result.schema.json
│   │   └── test-result.schema.json
│   ├── ARCHITECTURE.md        ← Reference only
│   ├── SETUP-GUIDE.md         ← This file
│   ├── prd/
│   │   ├── FEATURES.md        ← You seed this (Step 6)
│   │   ├── BUGS.md            ← Empty (agent populates)
│   │   ├── IMPROVEMENTS.md    ← Empty (agent populates)
│   │   └── TECH-DEBT.md       ← Empty (agent populates)
│   ├── knowledge/
│   │   ├── AGENTS.md          ← You seed this (Step 5)
│   │   ├── IMPLEMENTATION-PLAN.md ← You seed this (Step 7)
│   │   ├── STATUS.md          ← Empty (agent populates)
│   │   ├── PROGRESS.md        ← Empty (agent populates)
│   │   ├── LEARNINGS.md       ← Empty (agent populates)
│   │   ├── METRICS.jsonl      ← Empty (agent populates)
│   │   ├── TASK-COUNTER.json  ← {"FEAT":0,"BUG":0,"IMP":0,"DEBT":0}
│   │   ├── DESIGN-PRINCIPLES.md ← Reference only
│   │   ├── PERFECTION-SCORECARD.md ← Reference only
│   │   ├── SIGNAL             ← Empty (agent populates)
│   │   ├── HUMAN_SIGNAL       ← Write here to pause reliably
│   │   └── handoffs/          ← Ephemeral inter-agent JSON (v3.0)
│   ├── testing/
│   │   ├── RUN.md             ← No edits needed
│   │   ├── CHECKLIST.md       ← No edits needed
│   │   ├── RESULTS.md         ← Empty (agent populates)
│   │   ├── suites/            ← 13 test suites (no edits)
│   │   └── apps/              ← You create app context (Step 8)
│   ├── hooks/                 ← Optional (Step 9)
│   ├── .ralph/                ← Runtime state (worktrees, temp files)
│   └── research/              ← Reference only
├── src/
├── package.json
└── ...
```

---

## Step 2: Edit PROMPT.md Header (Legacy Mode Only)

> **Note:** In v3 multi-agent mode (the default), PROMPT.md is not used.
> The agent prompts live in `agents/`. You only need this step if you set
> `AGENT_MODE=single` in ralph.conf or use `./ralph.sh --legacy`.

Open `autonomous-dev/PROMPT.md` and fill in the 3 fields at the top:

```markdown
> **PROJECT:** Your Project Name
> **ROOT:** /absolute/path/to/your/project
> **PORT:** 3000
```

**Example for Stride:**
```markdown
> **PROJECT:** Stride — Process Mapping SaaS
> **ROOT:** C:/Users/Patrick/Builds/Cursor Projects/apps/Process App/stride
> **PORT:** 3000
```

**Do NOT edit anything else in PROMPT.md.** The rest is the agent's operating instructions.

---

## Step 3: Edit ralph.conf

Open `autonomous-dev/ralph.conf` and configure:

```bash
# ─── Must edit ──────────────────────────────────────
APP_URL="http://localhost:3000"          # Your dev server URL
APP_PORT=3000                            # Your dev server port
APP_DEV_COMMAND="npm run dev"            # Command to start dev server
PROJECT_ROOT="."                         # Project root (relative to ralph.sh, or absolute)

# ─── Optionally tweak ──────────────────────────────
LOOP_MAX_ITERATIONS=20                   # Max iterations in AFK mode
LOOP_CIRCUIT_BREAKER=3                   # Stop after N consecutive failures
LOOP_SLEEP_BETWEEN=2                     # Seconds between iterations in AFK mode
```

**Example for Stride:**
```bash
APP_URL="http://localhost:3000"
APP_PORT=3000
APP_DEV_COMMAND="npm run dev"
PROJECT_ROOT="C:/Users/Patrick/Builds/Cursor Projects/apps/Process App/stride"
```

> **Important:** `PROJECT_ROOT` is used by both ralph.sh AND the hooks (stop-hook.sh,
> session-start.sh). After `--init` deployment, knowledge files live at the project root
> level — not under `autonomous-dev/`. The hooks source ralph.conf to find PROJECT_ROOT.

---

## Step 3.5: Configure Multi-Agent Mode (v3.0)

The default mode is multi-agent (`AGENT_MODE=multi`). To customize, edit these
additional settings in `ralph.conf`:

```bash
# ─── Multi-Agent Settings ────────────────────────────────────
AGENT_MODE="multi"              # "multi" (parallel pipeline) or "single" (legacy PROMPT.md)
MAX_PARALLEL_BUILDERS=3         # 1-3 builders in parallel (planner may use fewer)
PLANNER_MODEL="opus"            # Opus for strategic planning (high reasoning)
BUILDER_MODEL="sonnet"          # Sonnet for implementation (fast, cost-effective)
TESTER_MODEL="sonnet"           # Sonnet for verification (procedural)
REVIEWER_MODEL="opus"           # Opus for review + docs (needs full-picture reasoning)
PLAYWRIGHT_AVAILABLE="auto"     # "auto" (detect), "true" (assume present), "false" (skip)
WORKTREE_DIR=".ralph/worktrees" # Where builder worktrees are created
```

**How it works:**
1. **Planner** (Opus) reads all state, picks 1-3 independent tasks, assigns file ownership
2. **Builders** (Sonnet, parallel) each implement one task in an isolated git worktree
3. **Integration** (bash, no LLM) merges worktree branches back sequentially
4. **Tester** (Sonnet, conditional) verifies UI changes via Playwright
5. **Reviewer** (Opus) reviews diffs, commits, tags, updates all documentation

**To use legacy single-agent mode instead:**
```bash
AGENT_MODE="single"             # Uses PROMPT.md instead of agents/
```
Or use the `--legacy` flag: `./ralph.sh --legacy`

**Debugging:**
```bash
RALPH_VERBOSE=0                 # Set to 1 for diagnostic logging at pipeline decision points
```
Or pass as an env var to enable for a single run without editing the config:
```bash
RALPH_VERBOSE=1 bash ralph.sh 1
```
When enabled, `[VERBOSE]` lines appear in `ralph.log` showing JSON parse results,
worktree creation details, builder subshell lifecycle, merge decisions, tester launch
conditions, and signal file contents. Useful for diagnosing pipeline failures.

**Template system:** Builder and tester prompts are templates with `{{variables}}` that
ralph.sh substitutes before launching each agent. Builders get their task slot and worktree
path. Testers get their test type (acceptance vs regression), output file number, and
action budget. You don't need to edit these — the orchestrator handles it automatically.

**JSON parsing requirement:** Multi-agent mode parses handoff JSON files. Install
**python3** or **jq** for reliable parsing. If neither is available, ralph.sh falls back
to grep (which works for simple values but is fragile for nested paths).

**Cost optimization:** Builders and testers use Sonnet (~1/3 the cost of Opus).
Only the planner and reviewer use Opus where deep reasoning is required.

---

## Step 4: Make ralph.sh Executable

```bash
chmod +x autonomous-dev/ralph.sh
```

On Windows with Git Bash, this should already work. If not:
```bash
bash autonomous-dev/ralph.sh
```

---

## Step 5: Seed AGENTS.md (Codebase Knowledge)

This is the agent's "brain" — it reads this every iteration to understand your codebase.
Open `autonomous-dev/knowledge/AGENTS.md` and fill in every section.

**What to include:**

```markdown
## Project

- **Name:** Stride
- **Stack:** Next.js 16.1.6, React 19.2, TypeScript 5, Tailwind CSS 4, Supabase, React Flow 12, TipTap 3
- **Root:** C:/Users/Patrick/Builds/Cursor Projects/apps/Process App/stride
- **Repo:** https://github.com/paddynes2/stride-process-app

## Commands

DEV_COMMAND="npm run dev"
TYPECHECK_COMMAND="npx tsc --noEmit"
LINT_COMMAND="npm run lint"
BUILD_COMMAND="npm run build"
TEST_COMMAND="N/A"
INSTALL_COMMAND="npm install"

## Architecture

src/
├── app/
│   ├── (auth)/        — Login, signup pages
│   ├── (app)/         — Authenticated app shell
│   │   └── w/[workspaceId]/ — Workspace views (canvas, list, settings)
│   └── api/v1/        — REST API routes
├── components/
│   ├── canvas/        — React Flow canvas, step/section nodes
│   ├── panels/        — Detail panels (step, section, workspace summary)
│   ├── layout/        — Sidebar, header, tab bar
│   └── ui/            — Base components (button, input, badge, dialog)
├── lib/
│   ├── supabase/      — Client, server, middleware
│   ├── api/           — apiFetch client, response envelope helpers
│   └── context/       — Workspace context provider
└── types/             — TypeScript types (database, canvas)

## Conventions

- API pattern: envelope { data, error } via successResponse/errorResponse
- apiFetch<T>() returns json.data directly
- Dark theme only (Dark Matter design system)
- CSS variables in globals.css for all tokens
- RLS via is_org_member()/can_access_workspace()
- SECURITY DEFINER for bootstrap_workspace()

## Key Files

- `src/app/globals.css` — All design tokens
- `src/components/canvas/flow-canvas.tsx` — Main canvas component
- `src/lib/supabase/server.ts` — Server-side Supabase client
- `src/lib/api/response.ts` — API envelope helpers
- `src/middleware.ts` — Auth guard
- `supabase/migrations/` — 6 migration files
```

**Tips:**
- If your project has a `CLAUDE.md`, pull from there — it has most of what you need.
- The agent will grow this document over time as it discovers more about the codebase.
- Be specific about conventions. "Follow existing patterns" is not enough — show what the patterns ARE.

---

## Step 6: Seed FEATURES.md (What to Build)

Open `autonomous-dev/prd/FEATURES.md` and add tasks for the current phase.

**Each task needs:**
- A clear name
- The phase it belongs to
- Machine-verifiable acceptance criteria (not "looks good" — "button exists and redirects to /detail")
- Priority (P0 = critical path, P1 = important, P2 = nice to have)

**Example:**
```markdown
### Maturity Scoring — Score Input UI
**Phase:** Phase 1 — Maturity Scoring
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Each step has a "Maturity Score" field (1-5 scale) in the detail panel
- [ ] Score selection uses a radio group or slider
- [ ] Selected score persists after page refresh (saved to database)
- [ ] Score displays on the step node in the canvas (small badge)
**Notes:** Add score column to steps table in Supabase. Use existing detail panel pattern.
```

**How many tasks?** Seed 5-15 tasks for the current phase. The agent works through them one per iteration. You can add more later — just edit FEATURES.md between runs.

---

## Step 7: Seed IMPLEMENTATION-PLAN.md (The Roadmap)

Open `autonomous-dev/knowledge/IMPLEMENTATION-PLAN.md` and define your phases.

**Example for Stride:**
```markdown
## Current Phase: Phase 1 — Maturity Scoring

### Phase 0: Foundation (DONE)
**Status:** DONE 2026-02-XX
**Goal:** Auth, workspace CRUD, canvas, detail panels, rich text, video embed, tabs, list view

### Phase 1: Maturity Scoring
**Status:** In progress
**Depends on:** Phase 0
**Estimated iterations:** 10-15
**Goal:** Each step has a maturity score (1-5). Sections aggregate scores. Workspace shows overall maturity.

Tasks:
1. [ ] Add maturity_score column to steps table
2. [ ] Score input UI in step detail panel
3. [ ] Display score on step nodes in canvas
4. [ ] Section-level score aggregation
5. [ ] Workspace summary maturity overview
6. [ ] Score change history/tracking

**Exit criteria:** All steps can be scored, sections show averages, workspace summary shows overall maturity.

### Phase 2: Gap Analysis & Export
**Status:** Not started
**Depends on:** Phase 1
**Estimated iterations:** 15-20
**Goal:** Generate gap analysis from maturity scores. Export as PDF/PNG.
```

---

## Step 8: Create App Context File (Optional but Recommended)

Create `autonomous-dev/testing/apps/stride.md` from the template:

```markdown
# Stride — Test Context

## App Info

- **URL:** http://localhost:3000
- **Stack:** Next.js 16, React 19, Supabase, React Flow, TipTap, Tailwind CSS 4
- **Auth method:** Email/password (Supabase Auth)

## Test Credentials

```
Email: test@example.com
Password: your-test-password
```

## Known Routes

```
/                           — Redirect to /login or /workspaces
/login                      — Login page
/signup                     — Signup page
/workspaces                 — Workspace list
/w/[workspaceId]            — Canvas view (default tab)
/w/[workspaceId]/[tabId]    — Canvas view (specific tab)
/w/[workspaceId]/list       — Step list view
/w/[workspaceId]/settings   — Workspace settings
/w/[workspaceId]/teams      — Teams (stub, Phase 1+)
/w/[workspaceId]/people     — People (stub, Phase 1+)
/w/[workspaceId]/tools      — Tools (stub, Phase 1+)
```

## Priority Flows (Golden Paths)

1. Sign up → Create workspace → Add steps to canvas → Connect steps → View in list
2. Log in → Open workspace → Click step → Edit details → Add notes
3. Log in → Create new tab → Arrange canvas → Switch between tabs

## Design Tokens

File: `src/app/globals.css`
- Background: --bg-app, --bg-surface, --bg-hover, --bg-active
- Text: --text-primary (90%), --text-secondary (55%), --text-tertiary (30%)
- Brand: --brand (#14B8A6 teal)
- Accent: --accent-blue (#3B82F6)
- Radii: --radius-xs (2px) to --radius-full (9999px)

## Known Issues

- [ ] Teams/People/Tools pages are stubs (planned for Phase 1+)
- [ ] No automated tests exist yet

## App-Specific Notes

- Canvas uses React Flow — drag-and-drop for nodes, click for connections
- Detail panel opens on the right when a step/section is selected
- Workspace context provides user, org, workspaces, tabs to all components
- NEXT_PUBLIC_ vars must use literal access (Next.js static string replacement)
```

This file makes the agent's testing faster and more accurate — it knows what routes exist, what credentials to use, and what to test first.

---

## Step 9: Install Hooks (Optional)

Hooks add safety guardrails inside Claude Code sessions. They complement ralph.sh's external guardrails.

**To install:** Create or edit `.claude/settings.json` in your project root:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash autonomous-dev/hooks/pre-tool-use.sh \"$TOOL_INPUT\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash autonomous-dev/hooks/post-tool-use.sh \"$TOOL_INPUT\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash autonomous-dev/hooks/stop-hook.sh"
          }
        ]
      }
    ]
  }
}
```

**What they do:**
- **pre-tool-use.sh** — Blocks: `.env` access, `git push`, `rm -rf`, `git add .`, `npm publish`
- **post-tool-use.sh** — Warns: files over 500 lines, TypeScript reminders, global CSS edits
- **stop-hook.sh** — Blocks exit until: STATUS.md updated, PROGRESS.md has entry, SIGNAL written

Hooks are optional. The system works without them. They prevent the most common failure modes.

---

## Step 9.5: Add Console Error Collector (Recommended)

Ralph checks `window.__testErrors` during browser testing to catch console errors. Add this script to your app's root layout so errors are captured:

**Next.js (`src/app/layout.tsx`):** Add as the first child inside `<body>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `window.__testErrors=[];const _ce=console.error;console.error=function(){window.__testErrors.push([Date.now(),...arguments]);_ce.apply(console,arguments)};window.addEventListener('error',function(e){window.__testErrors.push([Date.now(),e.message,e.filename,e.lineno])});window.addEventListener('unhandledrejection',function(e){window.__testErrors.push([Date.now(),'UnhandledRejection',String(e.reason)])});`,
  }}
/>
```

**What it captures:**
- `console.error()` calls (React errors, failed fetches, etc.)
- Uncaught exceptions (`window.onerror`)
- Unhandled promise rejections

**How Ralph uses it:** During Phase 4 browser testing and canary tests, Ralph runs `window.__testErrors` in the browser console. If entries exist, it logs them as bugs and fixes them.

Without this script, Ralph's console error checks silently pass — it thinks there are no errors when it simply can't see them.

---

## Step 10: Run It

### Start the dev server first

In one terminal (any shell):
```bash
cd /path/to/your-project
npm run dev
```

Leave this running.

### Run the loop (Git Bash required on Windows)

Open **Git Bash** and run:

```bash
cd /path/to/your-project/autonomous-dev
./ralph.sh                   # Single iteration, multi-agent pipeline (default)
./ralph.sh 5                 # 5 iterations autonomously
./ralph.sh 20                # 20 iterations AFK
./ralph.sh --monitor         # Continuous, pause between each
./ralph.sh --status          # Check current state
./ralph.sh --rollback 3      # Revert to iteration 3
./ralph.sh --dashboard       # Metrics dashboard
./ralph.sh --resume          # Resume after fixing a blocker
./ralph.sh --legacy          # Single iteration using legacy PROMPT.md
./ralph.sh --agents          # Show multi-agent configuration
```

> **Windows Terminal tip:** Add Git Bash as a profile:
> Settings → Add new profile → Command line: `C:\Program Files\Git\bin\bash.exe --login -i`

### What happens (multi-agent mode — default)

1. **ralph.sh** creates a `ralph/session-*` branch (your main branch is never touched)
2. **Stage 1 — Planner** (Opus): Reads all knowledge files, picks 1-3 independent tasks, assigns file ownership, outputs `EXECUTION_PLAN.json`
3. **Stage 2 — Builders** (Sonnet, parallel): Each builder implements one task in its own git worktree
4. **Stage 3 — Integration** (bash): Merges worktree branches back sequentially
5. **Stage 4 — Tester** (Sonnet, conditional): Verifies UI changes via Playwright MCP
6. **Stage 5 — Reviewer** (Opus): Reviews all diffs, commits, tags, updates ALL documentation, writes signal
7. ralph.sh checks `HUMAN_SIGNAL` first (human pause), then `SIGNAL` and circuit breaker
8. If `CONTINUE`, it starts the next iteration
9. If `COMPLETE`, `BLOCKED`, circuit breaker trips, or `HUMAN_SIGNAL` exists, it stops

> In legacy mode (`--legacy` or `AGENT_MODE=single`), steps 2-6 are replaced by a
> single Claude session that runs all phases from PROMPT.md.

### Recommended first run

```bash
./autonomous-dev/ralph.sh              # Single iteration
```

Watch it work. Read the output. Check:
- Did it read your AGENTS.md correctly?
- Did it pick a reasonable task?
- Did the browser testing work?
- Are STATUS.md, PROGRESS.md, and LEARNINGS.md populated?

If everything looks good:
```bash
./autonomous-dev/ralph.sh 10           # Let it run 10 iterations
```

---

## After Running: What to Check

### Between runs

```bash
./autonomous-dev/ralph.sh --status     # Quick overview
```

Or read these files directly:
- `knowledge/STATUS.md` — What happened last, what's next
- `knowledge/SIGNAL` — CONTINUE, COMPLETE, or BLOCKED
- `prd/BUGS.md` — Bugs the agent found while testing
- `prd/IMPROVEMENTS.md` — UX improvements the agent noticed
- `testing/RESULTS.md` — Test results from browser verification

### Merging back to main

When you're happy with the work:

```bash
git checkout main
git merge ralph/session-XXXXXXXX-XXXXXX
```

Or cherry-pick specific iterations:
```bash
git cherry-pick ralph-iter-3
git cherry-pick ralph-iter-7
```

### Rollback

If an iteration broke something:

```bash
./autonomous-dev/ralph.sh --rollback 5  # Revert to iteration 5
```

This uses the `ralph-iter-N` tags created at each successful commit.

---

## Adding More Work

To add features, bugs, or improvements between runs:

1. Edit `prd/FEATURES.md` — add new tasks with the standard format
2. Edit `prd/BUGS.md` — add bugs you found manually
3. Edit `knowledge/IMPLEMENTATION-PLAN.md` — adjust phases if priorities changed

The next iteration will pick up the changes automatically.

---

## Troubleshooting

### Windows: `\r': command not found` or `invalid option: pipefail`

The script has Windows line endings (CRLF). Fix with:
```bash
sed -i 's/\r$//' ralph.sh
```

### Windows: `Argument list too long`

The PROMPT.md is too large for Windows/MSYS2 command-line argument limits. This is already fixed
in the current ralph.sh — it pipes the prompt via stdin instead of passing it as `-p "$(cat ...)"`.
If you see this error, you have an older version of ralph.sh.

### Windows: `No such file or directory` for project path

You're running from WSL or PowerShell instead of Git Bash. WSL uses `/mnt/c/...` paths,
Git Bash uses `/c/...` paths. Ralph expects Git Bash paths. Switch to Git Bash.

### Windows: Script exits immediately with no output after "Iteration 1"

Check `ralph.log` for the error. Common causes:
- `CLAUDECODE` env var set (running inside a Claude Code session) — fixed in current ralph.sh
- Claude CLI not in PATH — run `which claude` in Git Bash to verify
- Wrong working directory — ralph.sh must run from the `autonomous-dev/` directory

### "Dev server not responding"

The dev server must be running BEFORE you start ralph.sh. Start it in a separate terminal.

### "Claude Code CLI not found"

Install it: `npm install -g @anthropic-ai/claude-code`

### "Playwright MCP not working"

Install it: `claude mcp add playwright -- npx @playwright/mcp@latest`

Playwright launches a visible browser window. If you want headless:
```bash
claude mcp add playwright -- npx @playwright/mcp@latest --headless
```

### Circuit breaker keeps tripping

The agent is stuck. Check:
1. `knowledge/STATUS.md` — What was it trying to do?
2. `prd/BUGS.md` — Are tasks marked SKIP_UNTIL?
3. `knowledge/LEARNINGS.md` — Did it record what went wrong?

Fix the underlying issue, then:
```bash
echo "CONTINUE" > autonomous-dev/knowledge/SIGNAL
./autonomous-dev/ralph.sh
```

### Agent not finding tasks

Check that `prd/FEATURES.md` has tasks with `Status: pending` in the correct phase, and that `knowledge/IMPLEMENTATION-PLAN.md` has a `Current Phase:` set.

### Agent making bad changes

Rollback and adjust:
```bash
./autonomous-dev/ralph.sh --rollback N   # Go back to a good state
```

Then add a LEARNINGS.md entry explaining what went wrong, and adjust AGENTS.md if the conventions weren't clear enough.

### Multi-agent: "WARNING: Neither python3 nor jq found"

Install one of: `python3` (usually pre-installed on macOS/Linux) or `jq` (`brew install jq`
or `apt install jq`). Without either, ralph.sh uses grep to parse JSON handoff files.
Grep works for simple top-level values but will fail on nested paths like
`.validation.revert_needed` or array iteration.

### Multi-agent: Planner did not produce EXECUTION_PLAN.json

The planner agent failed to output its JSON plan. Check `ralph.log` for the planner's
stderr. Common causes:
- Knowledge files missing or empty (STATUS.md, AGENTS.md, IMPLEMENTATION-PLAN.md)
- No tasks available (all tasks SKIP_UNTIL'd or complete)
- Planner model not available (check `PLANNER_MODEL` in ralph.conf)

### Multi-agent: Builder worktree creation failed

Git worktree creation can fail if:
- A stale worktree from a crashed session exists — run: `git worktree prune`
- The branch name already exists — run: `git branch -D ralph-build-N-slot-N`
- Disk space is full

Clean up manually: `rm -rf .ralph/worktrees/ && git worktree prune`

### Multi-agent: Merge conflict after parallel builds

The planner assigns non-overlapping files, but conflicts can still occur if builders
modify shared imports or generated files. When this happens:
- The conflicting slot is skipped (merge aborted for that slot only)
- The reviewer documents the partial merge
- The next iteration should resolve the conflict

### Pausing the loop

Write to the HUMAN_SIGNAL file (recommended):
```bash
echo "PAUSE" > autonomous-dev/knowledge/HUMAN_SIGNAL
```

ralph.sh checks this file before each iteration, uses it, and deletes it. This is
the reliable pause mechanism — the agent never touches this file.

**Why not use SIGNAL?** The agent overwrites `knowledge/SIGNAL` every iteration in
Phase 7. If you write "PAUSE" to SIGNAL while an iteration is running, the agent's
output will overwrite your pause before ralph.sh reads it. HUMAN_SIGNAL avoids this
race condition entirely.

### Resuming after pause

```bash
echo "CONTINUE" > autonomous-dev/knowledge/SIGNAL
./autonomous-dev/ralph.sh 10
```

---

## Quick Reference

### Files YOU edit (human-maintained)

| File | When | What |
|------|------|------|
| `ralph.conf` | Once at setup | Dev command, URL, port, agent mode, models |
| `knowledge/AGENTS.md` | Once at setup + review periodically | Stack, commands, architecture, conventions |
| `knowledge/IMPLEMENTATION-PLAN.md` | Once at setup + when priorities change | Phases, tasks, dependencies |
| `prd/FEATURES.md` | Before each run + between runs | Features to build |
| `testing/apps/*.md` | Once at setup | Routes, credentials, golden paths |
| `knowledge/HUMAN_SIGNAL` | When you want to pause | Write any content to pause reliably |
| `knowledge/FEEDBACK.md` | Between runs | Human → agent feedback (pending items override priority) |
| `PROMPT.md` header | Legacy mode only | Project name, root path, port |

### Files the AGENT maintains (don't edit during a run)

| File | What |
|------|------|
| `knowledge/STATUS.md` | Handoff state (overwritten each iteration) |
| `knowledge/PROGRESS.md` | Full iteration log (append-only) |
| `knowledge/LEARNINGS.md` | Gotchas and patterns (append-only) |
| `knowledge/METRICS.jsonl` | Machine-readable iteration telemetry (append-only) |
| `knowledge/DECISIONS.md` | Non-trivial implementation choices (append-only) |
| `knowledge/DIAGNOSES.md` | Root-cause analysis for failing tasks |
| `knowledge/RETROSPECTIVES.md` | Meta-learning summaries (every 10th iteration) |
| `knowledge/TASK-COUNTER.json` | Structured task ID counters |
| `knowledge/handoffs/*.json` | Ephemeral inter-agent communication (v3.0) |
| `prd/BUGS.md` | Bugs found during testing |
| `prd/IMPROVEMENTS.md` | UX improvements discovered |
| `prd/TECH-DEBT.md` | Code quality issues |
| `testing/RESULTS.md` | Test results per suite |
| `knowledge/SIGNAL` | Loop control signal (agent-written) |

### Commands

```bash
./autonomous-dev/ralph.sh              # Single iteration (multi-agent)
./autonomous-dev/ralph.sh 10           # 10 iterations AFK
./autonomous-dev/ralph.sh --monitor    # Continuous with pause
./autonomous-dev/ralph.sh --status     # Check state
./autonomous-dev/ralph.sh --rollback N # Revert to iteration N
./autonomous-dev/ralph.sh --dashboard  # Metrics dashboard
./autonomous-dev/ralph.sh --resume     # Resume after fixing blocker
./autonomous-dev/ralph.sh --legacy     # Single iteration (legacy PROMPT.md)
./autonomous-dev/ralph.sh --agents     # Show agent configuration
```

### Testing cadences (automatic)

| Every | What runs |
|-------|-----------|
| Every iteration | CHECKLIST.md (35 per-page checks) + 10-action verification |
| Every 8th | Regression suite (catch silent breakage) |
| Every 10th even | Accessibility deep audit |
| Every 10th odd | Performance deep audit |
| Risk score 3-4 | Regression next iteration |
| Risk score 5+ | Regression + data-integrity next iteration |
| Phase completion | Full quality audit (8 suites, 1 per iteration) |
| Pre-ship | Perfection scorecard (100 criteria, target 95%) |
