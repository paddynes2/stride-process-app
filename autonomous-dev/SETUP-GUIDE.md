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

---

## Step 1: Copy the System

Copy the entire `autonomous-dev/` directory into your project:

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
│   ├── PROMPT.md              ← You edit the header (Step 2)
│   ├── ralph.sh               ← No edits needed
│   ├── ralph.conf             ← You edit this (Step 3)
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
│   │   ├── DESIGN-PRINCIPLES.md ← Reference only
│   │   ├── PERFECTION-SCORECARD.md ← Reference only
│   │   └── SIGNAL             ← Empty (agent populates)
│   ├── testing/
│   │   ├── RUN.md             ← No edits needed
│   │   ├── CHECKLIST.md       ← No edits needed
│   │   ├── RESULTS.md         ← Empty (agent populates)
│   │   ├── suites/            ← 13 test suites (no edits)
│   │   └── apps/              ← You create app context (Step 8)
│   ├── hooks/                 ← Optional (Step 9)
│   └── research/              ← Reference only
├── src/
├── package.json
└── ...
```

---

## Step 2: Edit PROMPT.md Header

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

## Step 10: Run It

### Start the dev server first

```bash
cd /path/to/your-project
npm run dev
```

Leave this running in a separate terminal.

### Run the loop

```bash
# From your project root:
./autonomous-dev/ralph.sh              # Single iteration (watch it work)
./autonomous-dev/ralph.sh 5            # 5 iterations autonomously
./autonomous-dev/ralph.sh 20           # 20 iterations AFK
./autonomous-dev/ralph.sh --monitor    # Continuous, pause between each
./autonomous-dev/ralph.sh --status     # Check current state
./autonomous-dev/ralph.sh --rollback 3 # Revert to iteration 3
```

### What happens

1. **ralph.sh** creates a `ralph/session-*` branch (your main branch is never touched)
2. It pipes `PROMPT.md` into Claude Code
3. Claude reads all knowledge files, picks a task, builds it, tests it in the browser, commits, updates docs
4. ralph.sh checks the signal file and circuit breaker
5. If `CONTINUE`, it starts the next iteration
6. If `COMPLETE`, `BLOCKED`, or circuit breaker trips, it stops

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

### Pausing the loop

Write to the signal file:
```bash
echo "PAUSE" > autonomous-dev/knowledge/SIGNAL
```

The agent will stop at the start of the next iteration.

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
| `PROMPT.md` header | Once at setup | Project name, root path, port |
| `ralph.conf` | Once at setup | Dev command, URL, port, circuit breaker |
| `knowledge/AGENTS.md` | Once at setup + review periodically | Stack, commands, architecture, conventions |
| `knowledge/IMPLEMENTATION-PLAN.md` | Once at setup + when priorities change | Phases, tasks, dependencies |
| `prd/FEATURES.md` | Before each run + between runs | Features to build |
| `testing/apps/*.md` | Once at setup | Routes, credentials, golden paths |

### Files the AGENT maintains (don't edit during a run)

| File | What |
|------|------|
| `knowledge/STATUS.md` | Handoff state (overwritten each iteration) |
| `knowledge/PROGRESS.md` | Full iteration log (append-only) |
| `knowledge/LEARNINGS.md` | Gotchas and patterns (append-only) |
| `prd/BUGS.md` | Bugs found during testing |
| `prd/IMPROVEMENTS.md` | UX improvements discovered |
| `prd/TECH-DEBT.md` | Code quality issues |
| `testing/RESULTS.md` | Test results per suite |
| `knowledge/SIGNAL` | Loop control signal |

### Commands

```bash
./autonomous-dev/ralph.sh              # Single iteration
./autonomous-dev/ralph.sh 10           # 10 iterations AFK
./autonomous-dev/ralph.sh --monitor    # Continuous with pause
./autonomous-dev/ralph.sh --status     # Check state
./autonomous-dev/ralph.sh --rollback N # Revert to iteration N
```

### Testing cadences (automatic)

| Every | What runs |
|-------|-----------|
| Every iteration | CHECKLIST.md (35 per-page checks) + 10-action verification |
| Every 5th | Regression suite (catch silent breakage) |
| Every 10th | Accessibility or performance deep audit |
| Phase completion | Full quality audit (8 suites, 1 per iteration) |
| Pre-ship | Perfection scorecard (100 criteria, target 95%) |
