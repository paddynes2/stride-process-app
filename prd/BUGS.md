# Bugs — Stride

## Resolved
- [x] #BUG-001 TipTap SSR crash on step selection — DONE (phase 1)
- [x] #BUG-002 through #BUG-009 Accessibility bugs (8 items) — DONE (phase 1.5, iteration 21)
- [x] #BUG-010 text-quaternary on functional content (WCAG AA) — DONE (phase 2a)
- [x] #BUG-011 text-quaternary on functional content (WCAG AA) — DONE (phase 2a)

## Open

### P0 (Blocking)
<!-- None known -->

### P1 (Broken features)

- [x] #BUG-012 Perspective deletion has no confirmation dialog — DONE iteration 58, 2026-02-26
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — PerspectiveRow delete handler
  - **Fix applied:** Added `confirm()` guard before `deletePerspective()` call in `handleDelete` (line 282)

- [x] #BUG-013 API routes return success on RLS-denied mutations — DONE iteration 59, 2026-02-26
  - **Found:** Iteration 57 (quality audit)
  - **Where:** All perspective + annotation API routes (POST/PATCH/DELETE)
  - **Fix applied:** Added PGRST116 detection in all mutation handlers. POST→403, PATCH/DELETE→404. DELETE routes now use `.select().single()` to detect 0-row deletes.

- [x] #BUG-014 No `annotatable_type` enum validation in annotation API routes — DONE iteration 60, 2026-02-26
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/app/api/v1/annotations/route.ts` POST handler
  - **Fix applied:** Added typed `VALID_ANNOTATABLE_TYPES` constant (from `AnnotatableType`) and validation guard before DB insert. Returns 400 with descriptive message listing valid values.

### P2 (Degraded UX)

- [x] #BUG-015 No rating range validation before DB insert (annotations) — DONE iteration 61, 2026-02-26
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/app/api/v1/annotations/route.ts` POST, `src/app/api/v1/annotations/[id]/route.ts` PATCH
  - **Fix applied:** Added guard clause in both POST and PATCH: validates `rating` is a number between 1-5, returns 400 with descriptive message if invalid. Prevents DB CHECK constraint from surfacing as opaque 500.

- [x] #BUG-016 Silent error swallowing on annotation fetch failure — DONE iteration 62, 2026-02-26
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/components/panels/annotation-panel.tsx` line ~63-64
  - **Fix applied:** Added `toastError("Failed to load annotation", { error: err })` in the `.catch()` block before `setLoading(false)`. Passes error object for network error detection.

- [x] #BUG-017 PlaybookView optimistic rollback doesn't restore currentIndex — Attempts: 1 — DONE iteration 88, 2026-03-03
  - **Found:** Iteration 87 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/playbook/playbook-view.tsx` — handleMarkComplete
  - **Fix applied:** Added `const prevIndex = currentIndex` before auto-advance, and `setCurrentIndex(prevIndex)` in catch block. Same pattern applied to new handleSkip function (IMP-015).

- [x] #BUG-018 Inconsistent `void` keyword on logActivity() calls across API routes — Attempts: 1 — DONE iteration 93, 2026-03-03
  - **Found:** Iteration 91 (regression tester)
  - **Where:** Multiple API route files (steps/route.ts, connections/route.ts, workspaces/route.ts, etc.)
  - **What:** Some routes use `void logActivity()` (comments, runbooks) while others use bare `logActivity()` without `void` prefix. Both are functionally fire-and-forget since logActivity() handles its own errors, but bare calls create floating promises that will trigger `@typescript-eslint/no-floating-promises` warnings when that lint rule is enabled.
  - **Fix applied:** Added `void` prefix to all 25 bare `logActivity()` calls across 18 API route files (connections, sections, shares, stages, steps, tabs, touchpoints, touchpoint-connections, workspaces). Non-owned files (annotations, roles, people, step-roles, runbook-steps) left untouched per ownership rules.

- [x] #BUG-019 Activity page displays "Unknown" for all user entries (P1 regression) — Attempts: 3 — DONE iteration 96, 2026-03-03
  - **Found:** Iteration 91 (acceptance + regression tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/page.tsx` line 25
  - **What:** page.tsx server component used `.select("*")` while API route had `.select("*, users!activity_log_user_id_fkey(email)")`. Initial load entries lacked user join → "Unknown" display.
  - **Fix applied:** Changed page.tsx `.select("*")` to `.select("*, users!activity_log_user_id_fkey(email)")`. Both page.tsx and route.ts now use identical select shape.

- [x] #BUG-020 has_role coloring criteria silently skipped during tint evaluation (P2) — Attempts: 2 — DONE iteration 99, 2026-03-02
  - **Found:** Iteration 97 (regression tester)
  - **Where:** `src/components/canvas/coloring-panel.tsx` — CRITERIA_OPTIONS dropdown
  - **What:** Rules with `criteria_type='has_role'` can be created and saved via the coloring panel, but the canvas-view.tsx tint evaluator has a comment `// Requires additional data fetch — skip visual evaluation for now` and produces no background tint on step nodes. Users get no feedback that the rule isn't working.
  - **Related:** IMP-024 (same issue framed as improvement)
  - **Fix applied:** Disabled has_role option in CRITERIA_OPTIONS with `disabled: true` and label "Has Role (coming soon)". Both select elements pass `disabled={opt.disabled}` to option. Rule list display uses CRITERIA_OPTIONS label lookup (with fallback to raw criteria_type). CRITERIA_VALUE_HINTS key retained. API routes and enum unchanged.

- [ ] #BUG-021 Production workspace-shell exclusion list missing route segments (P1) — Attempts: 0
  - **Found:** Iteration 100 (regression tester — browser)
  - **Where:** `src/app/(app)/w/[workspaceId]/workspace-shell.tsx` — urlTabId exclusion check (~line 47)
  - **What:** workspace-shell.tsx has an exclusion list for non-tab route segments (list, settings, teams, people, tools, dashboard, comments, compare). The segments 'runbooks', 'activity', and 'gap-analysis' are missing. When users navigate to /runbooks, /activity, or /gap-analysis, the shell treats the segment as a tabId, sets isCanvasView=true, and renders an empty React Flow canvas with TabBar instead of the intended view component.
  - **Steps to reproduce:** Navigate to /w/[workspaceId]/runbooks — see empty canvas instead of RunbooksListView. Same for /activity and /gap-analysis.
  - **Suggested fix:** Add 'runbooks', 'activity', 'gap-analysis' to the exclusion list in workspace-shell.tsx. Verify all route segment directories under `w/[workspaceId]/` are covered.
  - **Note:** Already fixed in current codebase (ralph/init-stride) per planner analysis (iter 101). Exists only on production which is 20+ commits behind. Mark resolved once deployed.

- [x] #BUG-022 Migration 020 (section_templates) not pushed to remote Supabase DB (P1) — DONE 2026-03-04
  - **Found:** Iteration 101 (acceptance tester — browser)
  - **Where:** Remote Supabase DB (project ref: tkcyxtxkmveipnwgrddd)
  - **Fix applied:** Pushed migrations 018-023 to remote DB via `npx supabase db push`. Fixed `uuid_generate_v4()` → `gen_random_uuid()` in migrations 019, 020, 022 (Supabase puts uuid-ossp in `extensions` schema).

- [x] #BUG-023 DialogTitle accessibility warning fires when Templates dialog opens (P2) — Attempts: 1 — DONE iteration 102, 2026-03-02
  - **Found:** Iteration 101 (acceptance tester — browser console)
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` — Templates dialog
  - **What:** Root cause: custom `ui/dialog.tsx` DialogTitle wraps a plain `<h2>`, not `DialogPrimitive.Title`. Radix's internal context check cannot detect it.
  - **Fix applied:** Imported `DialogPrimitive` from `@radix-ui/react-dialog` and replaced `<DialogTitle>` with `<DialogPrimitive.Title>` in canvas-view.tsx Templates dialog. Comment documents root cause. section-detail-panel.tsx has same issue (filed as BUG-024).

- [x] #BUG-024 section-detail-panel.tsx Save as Template dialog has same DialogTitle a11y warning (P2) — Attempts: 1 — DONE iteration 104, 2026-03-02
  - **Found:** Iteration 102 (acceptance tester)
  - **Where:** `src/components/panels/section-detail-panel.tsx` — Save as Template dialog
  - **What:** Same root cause as BUG-023 — custom ui/dialog.tsx DialogTitle wraps `<h2>` not `DialogPrimitive.Title`. Radix a11y check fires console.error when dialog opens.
  - **Fix applied:** Imported `DialogPrimitive` from `@radix-ui/react-dialog` and replaced `<DialogTitle>` with `<DialogPrimitive.Title>` preserving identical styling classes. BUG-024 comment added matching BUG-023 pattern.

- [x] #BUG-025 Perspective deletion in settings page uses native confirm() dialog (P2) — Attempts: 1 — DONE iteration 107, 2026-03-03
  - **Found:** Iteration 106 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — PerspectivesSection.handleDelete (line ~379)
  - **What:** Native `confirm("Delete this perspective? All annotations will be permanently removed.")` call. Pre-existing, not introduced by IMP-051. Now inconsistent with workspace delete (Radix Dialog) and clone (Radix Dialog) on same page.
  - **Fix applied:** Replaced with Radix Dialog following IMP-051 pattern. Added confirmDeletePerspectiveOpen + perspectiveToDelete + deletingPerspective state. Dialog shows perspective name, explains consequences ("All annotations for this perspective will be permanently removed."), Cancel (secondary) + Delete (destructive) buttons. Zero confirm() calls remain in settings/page.tsx. Also resolves IMP-054.

- [ ] #BUG-026 Pipeline BUILD_RESULT_2.json iteration metadata mismatch (P3) — Attempts: 0
  - **Found:** Iteration 108 (acceptance tester)
  - **Where:** `knowledge/handoffs/BUILD_RESULT_2.json`
  - **What:** BUILD_RESULT_2.json has `iteration: 54` but current plan is iteration 108. Pipeline slot 2 builder wrote stale iteration number. Code change (Delete Perspective label) is correct but tracking metadata is wrong. Can cause confusion when correlating build results to iterations.
  - **Impact:** Pipeline metadata only — no user-facing impact.

- [x] #BUG-027 Gap analysis Generate Summary button hidden when no gap data (P2) — Attempts: 1 — DONE iteration 113, 2026-03-04
  - **Found:** Iteration 111 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx` — `{hasGapData && (...)}` block
  - **What:** The entire AI narrative section (including "Generate Summary" button) is hidden when hasGapData is false. A new or empty workspace gives no indication that the AI narrative feature exists.
  - **Fix applied:** Moved AI narrative section outside `{hasGapData && (...)}` block — now always visible. Generate Summary button shows disabled state with muted styling, cursor-not-allowed, and hint text "Score steps to enable AI narrative." when !hasGapData. Fully functional when hasGapData. Also added live countdown timer for rate-limited state (IMP-066).

- [x] #BUG-028 /api/v1/improvement-ideas returns HTTP 500 for authenticated users (P2) — DONE 2026-03-04
  - **Found:** Iteration 112 (regression tester — browser)
  - **Where:** `src/app/api/v1/improvement-ideas/route.ts`, sidebar.tsx badge fetch
  - **Root cause:** Migration 022 (improvement_ideas table) not pushed to remote DB.
  - **Fix applied:** Pushed migrations 018-023 via `npx supabase db push`. Table now exists in remote schema.

- [x] #BUG-029 /api/v1/coloring-rules returns HTTP 500 for authenticated users (P2) — DONE 2026-03-04
  - **Found:** Iteration 112 (regression tester — browser)
  - **Where:** `src/app/api/v1/coloring-rules/route.ts`, flow-canvas.tsx mount fetch
  - **Root cause:** Migration 019 (coloring_rules table) not pushed to remote DB.
  - **Fix applied:** Pushed migrations 018-023 via `npx supabase db push`. Table now exists in remote schema.

- [x] #BUG-030 Pre-existing hydration mismatch on AI analysis date format (P3) — DONE iteration 115, 2026-03-04
  - **Found:** Iteration 114 (acceptance tester — browser console)
  - **Where:** `src/app/(app)/w/[workspaceId]/ai-analysis/ai-analysis-view.tsx` — "Last run" timestamp
  - **What:** Server renders date as '2026/03/04' but client locale formats it as '3/4/2026'. React detects the mismatch and regenerates the subtree on the client. Appears as a console error on every page load with existing analysis results.
  - **Steps to reproduce:** 1. Navigate to /ai-analysis with existing analysis results. 2. Open browser console. 3. Observe hydration mismatch warning on date display.
  - **Suggested fix:** Use a consistent date format (e.g., `toISOString().slice(0, 10)` or `Intl.DateTimeFormat` with explicit locale) that produces the same output on server and client.

- [x] #BUG-031 Spend Summary missing Cancelled status breakdown row (P2) — Attempts: 1 — DONE iteration 121, 2026-03-05
  - **Found:** Iteration 119 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tool-analysis-view.tsx` — Spend Summary card
  - **Fix applied:** Removed `{spendByStatus.cancelled > 0 && (...)}` conditional wrapper. Cancelled row now renders unconditionally as a grid column matching Active and Considering styling.

- [ ] #BUG-032 step-tools API returns HTTP 500 when step detail panel opens (P2) — Attempts: 0
  - **Found:** Iteration 119 (acceptance tester)
  - **Where:** `src/app/api/v1/step-tools` route, triggered by step-detail-panel.tsx
  - **What:** GET /api/v1/step-tools?step_id={id} returns 500 twice (duplicate requests, likely StrictMode double-invoke). Causes step tool assignments to fail silently — panel shows no assigned tools even if any exist.
  - **Steps to reproduce:** 1. Navigate to a canvas tab. 2. Click any step node. 3. Observe network: /api/v1/step-tools?step_id={id} returns 500.
  - **Suggested fix:** Investigate step-tools API route handler — likely missing step_tools table (migration 024 not pushed) or query error.

- [x] #BUG-033 Journey tab not in tab bar after creation from Compare view CTA (P2) — Attempts: 1 — DONE iteration 122, 2026-03-05
  - **Found:** Iteration 119 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/compare/compare-view.tsx` + workspace-shell.tsx tab bar
  - **Fix applied:** Imported `useWorkspace`, destructured `refreshTabs`. Added `await refreshTabs()` after `createTab()` and before `router.push()` in both `handleCreateJourneyTab` and `handleCreateProcessTab`. Updated dependency arrays.

- [x] #BUG-034 Step nodes unclickable — section overlay intercepts pointer events (P1) — Attempts: 1 — DONE iteration 121, 2026-03-05
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Where:** `src/components/canvas/section-node.tsx`
  - **Fix applied:** Added `pointerEvents: "none"` to section container div style (both heatMap and default branches). Added `pointerEvents: "auto"` on interactive children: annotation indicator dot, section label row (name + maturity badge), comment count badge. Step node clicks now pass through to React Flow's onNodeClick.

- [ ] #BUG-035 step-tools API returns HTTP 500 — migration 024 likely not pushed (P1) — Attempts: 1
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Where:** `src/app/api/v1/step-tools` route
  - **What:** GET /api/v1/step-tools?step_id=... returns HTTP 500 Internal Server Error. Called twice every time Step Details panel opens. Prevents tool assignments from loading. Likely the step_tools table (migration 024) was never created or pushed to the DB.
  - **Steps to reproduce:** 1. Open Step Details panel for any step. 2. Observe 2x HTTP 500 errors in network tab for /api/v1/step-tools?step_id=[uuid].
  - **Suggested fix:** Verify step_tools migration exists. Run `npx supabase db push` to apply. If migration doesn't exist, create it with step_tools junction table (step_id FK, tool_id FK, RLS, indexes).
  - **Note:** May be the same root cause as BUG-032 but confirmed independently by regression tester with P1 severity upgrade.

- [x] #BUG-036 Radix hydration mismatch on gap-analysis and tools pages (P2) — DONE (iteration 123, 2026-03-05) — Attempts: 2
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Where:** `src/components/layout/header.tsx` (User Menu DropdownMenuTrigger)
  - **What:** Radix UI DropdownMenuTrigger generates different IDs on server vs client: server renders 'radix-_R_9knebn9erlb_', client expects 'radix-_R_16knebn9erlb_'. The ID counter offset (9 vs 16) suggests gap-analysis and tools pages render more Radix components on client than server. Causes aria-controls mismatch.
  - **Steps to reproduce:** 1. Cold-navigate to /w/[id]/gap-analysis or /w/[id]/tools. 2. Open browser console. 3. Observe hydration mismatch warning with DropdownMenuTrigger ID diff.
  - **Suggested fix:** Wrap the client-only Radix components with `suppressHydrationWarning` or ensure SSR/CSR component trees match (likely a conditional render that differs between server and client).

- [x] #BUG-037 Tools page heading hierarchy violation — h2 without h1 (P2) — Attempts: 1 — DONE iteration 122, 2026-03-05
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx` (summary sidebar panel)
  - **Fix applied:** Added `<h1 className="sr-only">Tools</h1>` as first child of outermost container div. Existing h2 unchanged. Heading hierarchy now h1→h2, WCAG 1.3.1 compliant. No visual change.
