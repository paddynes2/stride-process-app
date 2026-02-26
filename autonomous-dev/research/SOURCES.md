# Research Sources

> Findings from the research phase that informed this system's design.
> Reference this when considering future enhancements.

---

## Claude Code Ecosystem

### Official Resources

- **Awesome Claude Code** — Curated list of 100+ tools, plugins, MCP servers, and workflows
  https://github.com/anthropics/awesome-claude-code
  Key finds: ralph-wiggum plugin, hooks patterns, MCP integrations, worktree workflows

- **Claude Code Plugins (Official)** — Anthropic's plugin system with 15+ built-in plugins
  https://github.com/anthropics/claude-code-plugins
  Plugins: ralph-wiggum (loop), think-tool, memory, session-notes, todo-tracker, auto-commit, vibes

- **Ralph Wiggum Plugin** — Official Anthropic loop plugin
  https://github.com/anthropics/claude-code-plugins (ralph-wiggum directory)
  Uses Stop Hook (exit code 2) to intercept exit attempts and re-feed the prompt.
  Alternative to ralph.sh — preserves session context but lacks circuit breaker/branch management.

### Community Resources

- **claude-code-hooks-mastery** — Creative hook patterns and configurations
  https://github.com/anthropics/awesome-claude-code (linked from)
  Patterns: security guardrails (PreToolUse), auto-format (PostToolUse), completion enforcement (Stop)

- **Claude Code Power User Setup (2026)** — Real-world setup by @okhlopkov
  https://okhlopkov.com/claude-code-power-user-setup-2026/
  Key insight: Multi-file CLAUDE.md structure, hooks for auto-linting, worktrees for parallel work

- **Claude Code Showcase** — Comprehensive project configuration patterns
  https://github.com/anthropics/awesome-claude-code (linked from)
  Patterns: .claude/settings.json structure, MCP server configuration, permission modes

## Browser Testing / Computer Use

### Playwright MCP

- **Playwright MCP Server** — Accessibility tree-based browser automation for Claude
  https://github.com/anthropics/awesome-claude-code (MCP servers section)
  Install: `claude mcp add playwright -- npx @playwright/mcp@latest`
  10-100x cheaper than vision-based approaches (text vs screenshots)

### Decision: Playwright MCP over Alternatives

Documented in the original `computer-use/DECISION.md` research. Summary:

| Option | Approach | Cost | Accuracy | Chosen? |
|--------|----------|------|----------|---------|
| Playwright MCP | Accessibility tree | Cheapest (text) | High | YES |
| Claude Computer Use | Screenshots + vision | Expensive | Good | No |
| Browser-Use | Vision + Playwright hybrid | Medium | Good | No (future) |
| Stagehand | AI-powered selectors | Medium | Good | No |

Playwright MCP wins on cost and is sufficient for development loop testing.
Vision-based approaches reserved for future visual regression testing (Level 3).

## Ralph Loop / Autonomous Coding

### Key Concepts

- **Fresh context per iteration:** Each Claude invocation gets a clean context window.
  Progress persists in files and git history, not LLM memory. Prevents context pollution.

- **File-based memory:** STATUS.md (structured handoff), PROGRESS.md (append-only log),
  LEARNINGS.md (gotchas), AGENTS.md (codebase knowledge). Agent reads at start, writes at end.

- **Circuit breaker:** External loop (ralph.sh) counts consecutive failures and stops
  before burning tokens on unsolvable problems.

- **Attempt tracking:** Per-task failure counter prevents infinite retry on the same broken task.
  After 3 failures, task is SKIP_UNTIL'd.

- **Checkpoint tags:** Git tags (ralph-iter-N) on every successful commit enable rollback.

- **Branch isolation:** All work on ralph/session-* branches, never on main.

### Techniques from Research

- **TDD loop:** Write failing test → implement → verify passes → commit. Works when
  test infrastructure exists. Our system uses browser testing instead of unit tests
  for UI-heavy projects, but supports unit tests when available (Phase 3 verification).

- **Parallel worktrees:** Claude Code supports running agents in isolated git worktrees.
  Future enhancement (Level 5) for multi-agent orchestration.

- **Subagents:** Claude Code's Task tool can spawn subagents for parallel research.
  Useful for codebase exploration without polluting main context. Already part of
  Claude Code's native capabilities.

## Hooks Architecture

### Lifecycle Events

| Event | When | Can Block? | Use Case |
|-------|------|-----------|----------|
| PreToolUse | Before tool runs | Yes (exit 2) | Security guardrails |
| PostToolUse | After tool completes | No | Quality feedback |
| Stop | Agent tries to exit | Yes (exit 2) | Completion enforcement |
| SessionStart | Session begins | No | Context injection |

### Key Design Patterns

1. **Security guardrails (PreToolUse):** Block dangerous Bash commands (.env access,
   rm -rf, git push, git add .). Whitelist-safe patterns (reading .env.example).

2. **Auto quality (PostToolUse):** After file edits, remind about type checking,
   warn about large file sizes, validate knowledge file integrity.

3. **Completion enforcement (Stop):** Before allowing exit, verify STATUS.md updated,
   PROGRESS.md has entry, SIGNAL file written, no uncommitted changes. Forces the agent
   to complete Phase 5-7 before exiting.

4. **Context injection (SessionStart):** Pre-load STATUS.md content into the prompt.
   Redundant with ralph.sh (which pipes PROMPT.md) but useful for manual Claude sessions.

## Design Decisions

### ralph.sh vs Official Ralph Plugin

| Aspect | ralph.sh | Ralph Plugin |
|--------|----------|-------------|
| Context | Fresh per iteration | Preserved (may pollute) |
| Circuit breaker | Built-in | Not available |
| Branch management | Built-in | Not available |
| Health checks | Built-in | Not available |
| Rollback | --rollback flag | Not available |
| Setup complexity | Copy files, configure | One command install |
| Flexibility | Full control | Plugin's behavior |

**Decision:** Use ralph.sh as primary. Plugin is a simpler alternative for quick work.

### Structured STATUS.md vs Free-Form

Deep analysis found that vague handoffs between iterations caused cascading quality loss.
Mandating a structured format with specific fields (iteration number, branch, last task,
result, next task, blockers, context with file paths) significantly improves iteration
continuity.

### Per-Iteration Validation (Phase 1.5)

Without validation, a bad commit in iteration N causes iteration N+1 to build on a
broken foundation, which then breaks iteration N+2, etc. Phase 1.5 catches this by
type-checking the last commit and reverting if needed. Cost: ~30 seconds per iteration.
Benefit: prevents multi-iteration error cascading.

### Regression Cadence (Every 5th Iteration)

Browser testing during build iterations (Phase 4) only tests the feature being built.
Regressions in OTHER features go undetected. A periodic full sweep catches these.
Every 5th iteration is a balance between thoroughness and velocity.

## UI/UX Quality (v2 Expansion Research)

### Accessibility

- **axe-core** — Catches ~57% of WCAG issues automatically via DOM analysis.
  Our simplified `__auditAccessibility()` covers the highest-impact checks without
  injecting the full axe-core library (~500KB). Checks: color contrast (WCAG luminance
  formula), missing labels, heading order, lang attribute, title, alt text, touch targets.

- **WCAG 2.2 AA** — Current standard (2023). Key additions over 2.1: target size minimum
  24x24 CSS px (2.5.8 AA), focus appearance (2.4.11 AA), dragging alternatives (2.5.7 AA).
  Our system targets AA, not AAA (AAA requires 7:1 contrast, impractical for many designs).

- **Color Contrast Formula** — WCAG uses relative luminance: L = 0.2126R + 0.7152G + 0.0722B
  (after linearization). Ratio = (L1 + 0.05) / (L2 + 0.05). Thresholds: 4.5:1 normal text,
  3:1 large text (≥24px or ≥18.66px bold), 3:1 UI components and focus indicators.

### Performance

- **Core Web Vitals (2025)** — Google's metrics: LCP ≤2500ms, INP ≤200ms (replaced FID
  March 2024), CLS ≤0.1. Additional: FCP ≤1800ms, TTFB ≤800ms.

- **PerformanceObserver API** — Captures LCP, CLS, INP, FCP in-browser without external
  tools. Wrapped in try/catch for browser compatibility. INP uses event entries with
  interactionId and duration. CLS uses layout-shift entries with hadRecentInput filter.

- **Lighthouse MCP Server** — Available for deeper analysis but not integrated in v2.
  Future enhancement: `claude mcp add lighthouse -- npx @anthropic/lighthouse-mcp`.

### Responsive Design

- **Breakpoint Set** — 320px (small phone), 375px (iPhone), 428px (large phone),
  768px (iPad portrait), 1024px (iPad landscape), 1280px (laptop), 1440px (desktop),
  1920px (large monitor). Our system tests 7 critical widths.

- **Common Failures** — Horizontal overflow (most common), tables that don't collapse,
  fixed-width elements, text too small for mobile, touch targets below 44px on mobile,
  modals that extend beyond viewport.

### Visual Consistency

- **Design Token Verification** — Programmatic: read CSS custom properties, then inspect
  elements via getComputedStyle() to verify they use tokens not hardcoded values.
  Effective for color, spacing, font size, border-radius verification.

- **Component Consistency** — Compare getBoundingClientRect() and getComputedStyle()
  for same component type across pages. Flag differences in height, padding, font-size,
  border-radius, background-color.

### Security (Client-Side)

- **XSS Testing** — 5 payload types: script injection, event handler injection,
  attribute breakout, protocol injection, template injection. Test on forms, check
  if payload renders as text (safe) or executes (P0 vulnerability).

- **Storage Audit** — Scan localStorage/sessionStorage keys for sensitive patterns
  (token, password, secret, api_key, bearer, jwt, private). JWT in localStorage is
  common for SPAs but worth flagging. Passwords/API keys in storage = P0.

### Design Principles

- **Nielsen's 10 Heuristics** (1994) — Mapped to automation potential in
  `knowledge/DESIGN-PRINCIPLES.md`. High automatable: visibility of status,
  consistency, error recognition/recovery. Low: real-world match, flexibility.

- **Cognitive Load (Miller's Law)** — 7±2 items in working memory. Applied as:
  <25 interactive elements per page, <10 distinct colors, ≤2 fonts, <300 words visible,
  <7 form fields, ≤7 nav items per level.

- **Fitts's Law** — Time to acquire target = f(distance, size). Minimum: 24x24 CSS px
  (WCAG AA), 44x44 on mobile (Apple/Google). Primary actions should be large and near
  the user's current focus.

- **Animation Timing** — 50-100ms micro, 150-250ms element, 200-350ms layout,
  250-500ms page transitions. Under 100ms = instant. Over 500ms = needs loading indicator.

### Quality Frameworks

- **Perfection Scorecard** — 10 dimensions × 10 criteria = 100 total checks.
  Dimensions: functional, accessibility, performance, responsive, visual, content,
  journeys, states, security, resilience. Target: 95%+ for production.

- **Golden Path Testing** — Complete user journey documentation with per-step friction
  scoring (1-5). Measures clicks to value, decisions required, error potential.
  Catches dead ends, missing states, confusing flows.

- **Pixel-Perfect QA** — Chromatic, Percy, Applitools for visual regression (vision-based).
  Not integrated in v2 (Level 3 evolution). Current approach: DOM-based inspection via
  getComputedStyle() and getBoundingClientRect() as a proxy.
