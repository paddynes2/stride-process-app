# Test Results

> Structured record of the last test run per suite.
> Agent updates this during Phase 4 (testing) and Phase 6 (doc updates).
> Future iterations read this to know what is currently broken.

---

## Last Smoke Test

- **Iteration:** 42
- **Date:** 2026-02-26
- **Result:** pass (static only — Playwright MCP unavailable)
- **Pages checked:** 0 (browser testing skipped)
- **Errors found:** 0
- **Note:** Regression pass. Type-check (0 errors), lint (0 errors, 6 warnings), build (44 routes) all pass. No code changes — verification only.

## Last Navigation Suite

- **Iteration:** (none yet)
- **Date:** —
- **Result:** not run
- **Pages discovered:** —
- **Pages visited:** —
- **Pages with errors:** —
- **Key findings:** —

## Last Forms Suite

- **Iteration:** (none yet)
- **Date:** —
- **Result:** not run
- **Forms tested:** —
- **Validation gaps found:** —
- **Key findings:** —

## Last States Suite

- **Iteration:** (none yet)
- **Date:** —
- **Result:** not run
- **Empty states checked:** —
- **Error states checked:** —
- **Key findings:** —

## Last UX Review

- **Iteration:** 40
- **Date:** 2026-02-26
- **Result:** pass (static code review — Playwright MCP unavailable)
- **Pages reviewed:** 4 (journey-canvas-view, touchpoint-detail-panel, stage-detail-panel, settings) + 2 comparison (canvas-view, flow-canvas)
- **Bugs found:** 2 (BUG-010, BUG-011 — text-quaternary for functional content, WCAG AA violations)
- **Improvements found:** 6 (IMP-003 through IMP-008 — export parity, silent errors, keyboard hints, sparse summary, missing pain data, no delete confirmation)
- **Top findings:** (1) Silent `.catch(() => {})` on position updates in both canvases (4 instances), (2) --text-quaternary used for readable text in 2 components, (3) Journey canvas missing export buttons

## Last Accessibility Audit

- **Iteration:** 10
- **Date:** 2026-02-26
- **Result:** 8 bugs found (5 P1, 3 P2)
- **Pages audited:** 7 (/workspaces, canvas, teams, gap-analysis, list, settings, login→redirect)
- **Total violations:** 42 (across all pages, many duplicated across pages)
- **Critical (P1):** 5 unique issues (BUG-002 through BUG-006)
- **Contrast failures:** 3 patterns (active sidebar 1:1, primary buttons 3.68:1, gap badge 1:1)
- **Missing labels:** 6 inputs across 3 pages
- **Missing button names:** 7+ icon-only buttons
- **Keyboard issues:** Low-contrast focus indicators (15% opacity) on icon buttons
- **Small targets:** "All Workspaces" link (16px), expand/collapse (20px), delete (16px)
- **Semantic issues:** Heading skip h1→h3 on /workspaces

## Last Regression Pass

- **Iteration:** 42
- **Date:** 2026-02-26
- **Result:** pass (no regressions, static analysis only — Playwright MCP unavailable)
- **Pages re-checked:** All 14 page routes + 30 API routes (44 total)
- **Regressions found:** 0
- **Iterations covered:** 35-41 (cadence floor: last regression iter 34 + 8 = 42)
- **Files reviewed:** 16 source files changed since iter 34 (journey-canvas-view.tsx, stage-node.tsx, touchpoint-node.tsx, stage-detail-panel.tsx, touchpoint-detail-panel.tsx, pain.ts, tab-bar.tsx, page.tsx, workspace-shell.tsx, sidebar.tsx, compare-view.tsx, compare/page.tsx, compare/loading.tsx, canvas.ts, client.ts, tabs/route.ts)
- **Verification:** type-check pass (0 errors), lint pass (0 errors, 6 warnings — unchanged), build pass (44 routes), zero debug artifacts
- **Known-good baseline:**
  - /workspaces — clean (pre-existing hydration warning in dev only)
  - /w/[id]/[tabId] (process canvas) — clean (dynamic imports for pdf/png/tiptap, empty state overlay)
  - /w/[id]/[tabId] (journey canvas) — clean (stage/touchpoint nodes, detail panels, heat map)
  - /w/[id]/list — clean (empty state card)
  - /w/[id]/gap-analysis — clean
  - /w/[id]/compare — clean (new iter 41, stats summary + section/stage lists)
  - /w/[id]/teams — clean (a11y fixes: touch targets, aria-labels, focus indicators)
  - /w/[id]/settings — clean
  - /public/[shareId] — clean (loading.tsx)
  - /login — redirects to /workspaces when authenticated (correct behavior)
  - API routes — all 30 routes present and typed correctly (14 original + 6 journey canvas × 2)
  - Error boundaries (×2), offline banner, skeleton, toast helpers — all clean
  - Journey canvas: complete (data model, API, canvas rendering, detail panels, heat map)
  - Comparison view: shell complete ([2/3] canvases + [3/3] alignment hints remain)
  - Pre-existing: 4 silent `.catch(() => {})` patterns (documented as IMP-004)
  - Pre-existing: unused imports `addEdge` (journey-canvas-view) + `Plus` (sidebar)

## Last Data Integrity Check

- **Iteration:** 6
- **Date:** 2026-02-26
- **Result:** pass
- **Entities tested:** teams, roles, people
- **Operations verified:** CREATE (201), READ nested (200), UPDATE (200), DELETE (200), verify deletion
- **Key findings:** All operations clean. Nested select returns full hierarchy. Hourly rate persists and updates correctly. Deletion bottom-up works without constraint errors.

## Known Broken (Current)

<!-- Agent: list pages/features currently known to be broken. -->
<!-- Remove items when they are fixed and verified. -->
<!-- Format: - [severity] /route — [description] — found iteration [N] -->
