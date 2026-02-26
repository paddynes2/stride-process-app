# Test Results

> Structured record of the last test run per suite.
> Agent updates this during Phase 4 (testing) and Phase 6 (doc updates).
> Future iterations read this to know what is currently broken.

---

## Last Smoke Test

- **Iteration:** 19
- **Date:** 2026-02-26
- **Result:** pass (static only — Playwright MCP unavailable)
- **Pages checked:** 0 (browser testing skipped)
- **Errors found:** 0
- **Note:** FEAT-009 [3/3] (public read-only view). Type-check, lint, build all pass. New /public/[shareId] route with read-only canvas. Browser testing deferred — Playwright MCP unavailable. Phase 1 complete.

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

- **Iteration:** (none yet)
- **Date:** —
- **Result:** not run
- **Journey friction score:** —
- **Top suggestions:** —

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

- **Iteration:** 28
- **Date:** 2026-02-26
- **Result:** pass (no regressions, static analysis only — Playwright MCP unavailable)
- **Pages re-checked:** All routes (static code review of 28 source files changed)
- **Regressions found:** 0
- **Iterations covered:** 21-27 (7 iterations since last regression at iter 20)
- **Files reviewed:** button.tsx, sidebar.tsx, header.tsx, tab-bar.tsx, offline-banner.tsx, skeleton.tsx, toast-helpers.ts, error.tsx (×2), canvas-view.tsx, flow-canvas.tsx, step-detail-panel.tsx, section-detail-panel.tsx, step-list-view.tsx, gap-analysis-view.tsx, teams-view.tsx, workspace-list.tsx, workspaces/route.ts, settings/page.tsx, 7× loading.tsx, layout.tsx, video-embed.tsx, public/[shareId]/loading.tsx
- **Verification:** type-check pass, lint pass (0 errors, 5 pre-existing warnings), build pass (37 routes)
- **Known-good baseline:**
  - /workspaces — clean (pre-existing hydration warning in dev only)
  - /w/[id]/[tabId] (canvas) — clean (dynamic imports for pdf/png/tiptap, empty state overlay)
  - /w/[id]/list — clean (empty state card added)
  - /w/[id]/gap-analysis — clean
  - /w/[id]/teams — clean (a11y fixes: touch targets, aria-labels, focus indicators)
  - /w/[id]/settings — clean
  - /public/[shareId] — clean (loading.tsx added)
  - /login — redirects to /workspaces when authenticated (correct behavior)
  - API routes — all 14 route groups present and typed correctly
  - Error boundaries (×2), offline banner, skeleton, toast helpers — all clean
  - Getting Started template seeding — best-effort, properly guarded

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
