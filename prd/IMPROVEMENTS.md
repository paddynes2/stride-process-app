# Improvements — Stride

## High Priority
<!-- Agent-discovered UX/polish wins that are noticeable -->

- [x] #IMP-001 Add color format validation to perspective API — DONE iteration 73, 2026-03-01
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Input validation
  - **Where:** `src/app/api/v1/perspectives/route.ts` POST, `src/app/api/v1/perspectives/[id]/route.ts` PATCH
  - **Fix applied:** `HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/i` at module scope. Guard clause validates when color is defined, returns 400 with descriptive message.

- [ ] #IMP-002 Color picker keyboard accessibility + ARIA in perspective settings — Attempts: 2 (iter 74 — merge loss; iter 76 — builder failed, no BUILD_RESULT)
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — PerspectiveRow color picker
  - **What:** Color picker popup opens/closes on click only. Missing `role="listbox"`, `aria-expanded`, arrow key navigation. Screen readers can't announce the picker as a dropdown.
  - **Why it matters:** WCAG 2.1 Level A: keyboard operability + proper ARIA.
  - **Design principle:** Nielsen's heuristic #7 (Flexibility and efficiency of use)

## Medium Priority
<!-- Improvements that would help but aren't urgent -->

- [ ] #IMP-003 Annotation indicator dots lack semantic ARIA for screen readers — Attempts: 0
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Accessibility
  - **Where:** `src/components/canvas/step-node.tsx`, `section-node.tsx`, `touchpoint-node.tsx`, `stage-node.tsx`
  - **What:** Annotation indicator dots have `title` attribute but no `aria-label` or `role="status"`. Screen readers won't announce them meaningfully.
  - **Why it matters:** Perspective annotations are invisible to assistive tech users.
  - **Suggested fix:** Add `aria-label="Annotated by perspective"` and `role="img"` to indicator divs.

- [ ] #IMP-004 Optimize annotation loading for large canvases — Attempts: 0
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Performance
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` refreshAnnotatedIds()
  - **What:** Currently fetches ALL annotations for the active perspective (across all tabs/elements). On a perspective with 100+ annotations, this is wasteful. The fetchAnnotations API already supports filtering by type/id but the canvas doesn't use it.
  - **Why it matters:** Performance degradation as annotation count grows.
  - **Suggested fix:** Filter by tab's element IDs or paginate. Alternatively, accept current approach until real users report slowness.

## Low Priority
<!-- Nice-to-have polish items -->

- [ ] #IMP-005 Orphaned annotations when entities deleted (no FK on annotatable_id) — Attempts: 0
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Data integrity
  - **Where:** `supabase/migrations/012_perspectives.sql` — `perspective_annotations.annotatable_id` has no foreign key constraint
  - **What:** When a step/section/touchpoint/stage is deleted, its annotations are NOT cascade-deleted. They remain in the DB orphaned (referencing non-existent entity IDs). The UI won't show them (fetch returns them but they don't match any canvas elements), but they bloat the table.
  - **Why it matters:** Data hygiene. Not urgent because orphaned records don't break anything, but accumulate over time.
  - **Suggested fix:** Add a DB trigger or periodic cleanup. FK constraints are complex here due to polymorphic annotatable_type pointing to different tables.

- [ ] #IMP-006 AnnotationPanel/CommentPanel visibility asymmetry — Attempts: 0
  - **Found:** Iteration 73 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`, `journey-canvas-view.tsx`
  - **What:** AnnotationPanel is gated on activePerspective (hidden when none selected). CommentPanel always shows when entity selected. Users may be confused by this asymmetry.
  - **Why it matters:** Nielsen H6 — Recognition rather than recall. Users need to understand when each panel appears.
  - **Suggested fix:** Add empty state on AnnotationPanel area when no perspective active ("Select a perspective to add annotations").

- [ ] #IMP-007 Journey canvas keyboard shortcuts undocumented in UI — Attempts: 0
  - **Found:** Iteration 73 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/journey-canvas-view.tsx`
  - **What:** Keyboard shortcuts 's' (new stage) and 'n' (new touchpoint) are registered globally but not shown in the UI. Users who discover them get unexpected behavior; users who don't miss efficiency.
  - **Why it matters:** Nielsen H7 — Flexibility and efficiency of use. Shortcuts need to be discoverable.
  - **Suggested fix:** Add keyboard shortcut legend to journey toolbar or tooltip on buttons.

- [ ] #IMP-008 flow-canvas handleKeyDown useCallback has incomplete dependency array — Attempts: 0
  - **Found:** Iteration 75 (regression tester)
  - **Category:** Code maintainability
  - **Where:** `src/components/canvas/flow-canvas.tsx` — handleKeyDown useCallback
  - **What:** handleAddStep and handleAddSection are used inside the useCallback but not listed in the dependency array `[selectedStepId, selectedSectionId, onStepDelete, onSectionDelete]`. React hooks exhaustive-deps lint warning.
  - **Why it matters:** Not a runtime bug currently (functions close over stable props), but could cause staleness bugs if handlers are refactored to use local state.
  - **Suggested fix:** Add handleAddStep and handleAddSection to the dependency array, or wrap them in useCallback.

- [ ] #IMP-009 Workspace comments page lacks navigation links to source entities — Attempts: 0
  - **Found:** Iteration 75 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/comments/comments-view.tsx`
  - **What:** CommentsView renders comments with entity type+name but no clickable link to navigate to the specific step/section/stage/touchpoint the comment belongs to.
  - **Why it matters:** Nielsen H6 — Recognition rather than recall. Users should be able to navigate from a comment to its source entity without memorizing IDs.
  - **Suggested fix:** Add a clickable link/button on each comment row that navigates to `/w/[id]/[tabId]` and selects the relevant entity.

## Logged
<!-- Processed improvements with iteration and resolution -->
