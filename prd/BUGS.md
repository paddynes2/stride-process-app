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
