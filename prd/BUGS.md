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

- [ ] #BUG-019 Activity page displays "Unknown" for all user entries (P1 regression) — Attempts: 1 (FAILED)
  - **Found:** Iteration 91 (acceptance + regression tester)
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/page.tsx` line 25, `activity-view.tsx` line 171
  - **What:** Builder updated API route (`activity/route.ts`) to join users table: `.select("*, users!activity_log_user_id_fkey(email)")`, BUT forgot to update `page.tsx` server component which still uses `.select("*")`. Initial page load entries have no `users` data → `entry.users?.email` is `undefined` → all entries show "Unknown". This is WORSE than the original UUID prefix. Load More entries work (they use the API route which has the join).
  - **Steps to reproduce:** Navigate to `/w/[workspaceId]/activity`. Observe all user entries show "Unknown" on initial load.
  - **Fix required:** Change `page.tsx` line 25 from `.select("*")` to `.select("*, users!activity_log_user_id_fkey(email)")`. Also consider adding full_name priority: `full_name > email > user_id.slice(0,8)` fallback chain.
  - **Acceptance criteria (from iteration 91):** userMap approach OR Supabase join in BOTH page.tsx and route.ts. Display priority: full_name > email > UUID prefix fallback.
