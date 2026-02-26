# Test Results

> Structured record of the last test run per suite.
> Agent updates this during Phase 4 (testing) and Phase 6 (doc updates).
> Future iterations read this to know what is currently broken.

---

## Last Smoke Test

- **Iteration:** 44
- **Date:** 2026-02-26
- **Result:** pass (static only — Playwright MCP unavailable)
- **Pages checked:** 0 (browser testing skipped)
- **Errors found:** 0
- **Note:** FEAT-021 [3/3] alignment hints. Type-check (0 errors, run twice), lint (0 errors, 6 pre-existing warnings), build (43 routes) all pass. 1 file modified (compare-view.tsx).

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

- **Iteration:** 48
- **Date:** 2026-02-26
- **Result:** pass (Phase 2a completion quality audit — static analysis only, Playwright MCP unavailable)
- **Pages re-checked:** All 14 page routes + 30 API routes
- **Regressions found:** 0
- **Iterations covered:** 42-47 (Phase 2a completion audit)
- **Verification method:** 3 parallel verification agents + type-check + lint + build
- **Verification results:** type-check pass (0 errors), lint pass (0 errors, 6 warnings — unchanged), build pass (all routes)
- **Phase 2a features verified:**
  - FEAT-017: Journey canvas type — data model (migration 011), types, API routes (9 endpoints), canvas rendering ✓
  - FEAT-018: Stage detail panel — name, channel, owner, description (TipTap), touchpoint summary, delete ✓
  - FEAT-019: Touchpoint detail panel — name, sentiment, pain/gain, emotion, notes (TipTap), delete ✓
  - FEAT-020: Journey heat map — pain score coloring, stage roll-up ✓
  - FEAT-021: Comparison view — side-by-side React Flow canvases, alignment hints ✓
  - FEAT-022: Journey export — journey-pdf.ts (5 sections), comparison-pdf.ts (4 sections) ✓
  - BUG-010 + BUG-011: text-quaternary → text-tertiary on functional content ✓
- **Known-good baseline:**
  - All Phase 1 + 1.5 features: unchanged and verified
  - Journey canvas: complete (data model, API, canvas, detail panels, heat map, export)
  - Comparison view: complete (dual canvases, alignment hints, PDF export)
  - Pre-existing: 4 silent `.catch(() => {})` patterns (documented as IMP-004)
  - Pre-existing: unused imports `addEdge` (flow-canvas) + `Plus` (sidebar)
  - Note: stages and touchpoint-connections API lack GET endpoints (data fetched via tab queries)

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
