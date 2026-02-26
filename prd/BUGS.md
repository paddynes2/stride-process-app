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

- [ ] #BUG-015 No rating range validation before DB insert (annotations) — Attempts: 0
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/app/api/v1/annotations/route.ts` POST, `src/app/api/v1/annotations/[id]/route.ts` PATCH
  - **Impact:** Sending `rating: 99` or `rating: -1` results in DB CHECK constraint failure, surfaced as opaque 500 error. Should return 400 with clear message.
  - **Fix:** Add `if (rating !== undefined && (rating < 1 || rating > 5)) return errorResponse("validation", "Rating must be between 1 and 5", 400);`

- [ ] #BUG-016 Silent error swallowing on annotation fetch failure — Attempts: 0
  - **Found:** Iteration 57 (quality audit)
  - **Where:** `src/components/panels/annotation-panel.tsx` line ~63-64
  - **Impact:** If annotation fetch fails (network error, server error), the `.catch()` block silently sets `loading=false` with no user feedback. User sees empty panel and doesn't know the fetch failed.
  - **Fix:** Add `toastError("Failed to load annotation")` in the catch block.
