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

- [ ] #BUG-022 Migration 020 (section_templates) not pushed to remote Supabase DB (P1) — Attempts: 0
  - **Found:** Iteration 101 (acceptance tester — browser)
  - **Where:** Remote Supabase DB (project ref: tkcyxtxkmveipnwgrddd)
  - **What:** The `templates` table does not exist in production schema. GET /api/v1/templates returns HTTP 500 with error "Could not find the table public.templates in the schema cache". This blocks the entire Templates feature — dialog opens but cannot display any templates or allow deployment of DB templates. Migration file exists at `supabase/migrations/020_section_templates.sql` but has not been pushed.
  - **Steps to reproduce:** Open any workspace canvas → click Templates button → dialog shows error message instead of template cards.
  - **Suggested fix:** Run `npx supabase db push` to apply migration 020 (and migrations 014-019 if also pending). Verify the templates table exists after push.

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

- [ ] #BUG-025 Perspective deletion in settings page uses native confirm() dialog (P2) — Attempts: 0
  - **Found:** Iteration 106 (acceptance tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — PerspectivesSection.handleDelete (line ~379)
  - **What:** Native `confirm("Delete this perspective? All annotations will be permanently removed.")` call. Pre-existing, not introduced by IMP-051. Now inconsistent with workspace delete (Radix Dialog) and clone (Radix Dialog) on same page.
  - **Steps to reproduce:** Navigate to workspace settings → add a perspective → click delete (trash icon) → native browser confirm() appears.
  - **Suggested fix:** Replace with Radix Dialog following IMP-051 pattern. Also tracked as IMP-054.
