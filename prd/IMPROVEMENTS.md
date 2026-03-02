# Improvements — Stride

## High Priority
<!-- Agent-discovered UX/polish wins that are noticeable -->

- [x] #IMP-001 Add color format validation to perspective API — DONE iteration 73, 2026-03-01
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Input validation
  - **Where:** `src/app/api/v1/perspectives/route.ts` POST, `src/app/api/v1/perspectives/[id]/route.ts` PATCH
  - **Fix applied:** `HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/i` at module scope. Guard clause validates when color is defined, returns 400 with descriptive message.

- [x] #IMP-002 Color picker keyboard accessibility + ARIA in perspective settings — DONE iteration 76, 2026-03-01
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — PerspectiveRow color picker
  - **What:** Color picker popup opens/closes on click only. Missing `role="listbox"`, `aria-expanded`, arrow key navigation. Screen readers can't announce the picker as a dropdown.
  - **Why it matters:** WCAG 2.1 Level A: keyboard operability + proper ARIA.
  - **Design principle:** Nielsen's heuristic #7 (Flexibility and efficiency of use)

## Medium Priority
<!-- Improvements that would help but aren't urgent -->

- [x] #IMP-003 Annotation indicator dots lack semantic ARIA for screen readers — DONE iteration 77, 2026-03-01
  - **Found:** Iteration 57 (quality audit)
  - **Category:** Accessibility
  - **Where:** `src/components/canvas/step-node.tsx`, `section-node.tsx`, `touchpoint-node.tsx`, `stage-node.tsx`
  - **Fix applied:** Added `role="img"` and `aria-label="Annotated by perspective"` to annotation indicator `<div>` elements in all 4 node types. Existing `title` preserved for mouse hover tooltip.

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

- [x] #IMP-006 AnnotationPanel/CommentPanel visibility asymmetry — Attempts: 1 — DONE iteration 82, 2026-03-02
  - **Found:** Iteration 73 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`, `journey-canvas-view.tsx`
  - **Fix applied:** Replaced `{activePerspective && selected && <AnnotationPanel />}` with ternary showing empty state message ("Select a perspective to add annotations") when no perspective active. Applied to both canvas-view.tsx and journey-canvas-view.tsx for step/section and stage/touchpoint selection paths.

- [ ] #IMP-007 Journey canvas keyboard shortcuts undocumented in UI — Attempts: 0
  - **Found:** Iteration 73 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/journey-canvas-view.tsx`
  - **What:** Keyboard shortcuts 's' (new stage) and 'n' (new touchpoint) are registered globally but not shown in the UI. Users who discover them get unexpected behavior; users who don't miss efficiency.
  - **Why it matters:** Nielsen H7 — Flexibility and efficiency of use. Shortcuts need to be discoverable.
  - **Suggested fix:** Add keyboard shortcut legend to journey toolbar or tooltip on buttons.

- [x] #IMP-008 flow-canvas handleKeyDown useCallback has incomplete dependency array — Attempts: 1 — DONE iteration 78, 2026-03-01
  - **Found:** Iteration 75 (regression tester)
  - **Category:** Code maintainability
  - **Where:** `src/components/canvas/flow-canvas.tsx` — handleKeyDown useCallback
  - **What:** handleAddStep and handleAddSection are used inside the useCallback but not listed in the dependency array `[selectedStepId, selectedSectionId, onStepDelete, onSectionDelete]`. React hooks exhaustive-deps lint warning.
  - **Why it matters:** Not a runtime bug currently (functions close over stable props), but could cause staleness bugs if handlers are refactored to use local state.
  - **Suggested fix:** Add handleAddStep and handleAddSection to the dependency array, or wrap them in useCallback.

- [x] #IMP-009 Workspace comments page navigation links to source entities — DONE iteration 81, 2026-03-02
  - **Found:** Iteration 75 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/comments/comments-view.tsx`, `page.tsx`
  - **Fix applied:** Server page.tsx builds entityTabMap (entity_id → tab_id) from steps/sections/stages/touchpoints. CommentsView wraps entity names in `<Link>` to `/w/{workspaceId}/{tabId}`, styled `text-[var(--accent-blue)] hover:underline`. Falls back to workspace root when tab_id unavailable.

- [ ] #IMP-010 Collapsible side panels with persistent state — Attempts: 0
  - **Found:** Iteration 77 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`
  - **What:** Once TaskPanel is implemented, three stacked panels (AnnotationPanel, TaskPanel, CommentPanel) for a selected step may exceed viewport height and require scrolling.
  - **Why it matters:** Nielsen H8 — Aesthetic and minimalist design. Too many expanded panels reduces usability.
  - **Suggested fix:** Each panel stores collapsed state in localStorage keyed by panel type. Single collapse chevron in panel header toggles it.

- [x] #IMP-011 Journey canvas handleAddTouchpoint/handleAddStage not wrapped in useCallback — Attempts: 1 — DONE iteration 80, 2026-03-02
  - **Found:** Iteration 79 (regression+acceptance tester)
  - **Category:** Performance
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/journey-canvas-view.tsx` lines 345, 363
  - **What:** handleAddTouchpoint and handleAddStage are declared as regular functions (not useCallback) but referenced in a useCallback dependency array. This causes the keyboard shortcut handler to re-subscribe on every render.
  - **Why it matters:** React performance: stable references in useCallback deps prevent unnecessary re-subscriptions and re-renders.
  - **Suggested fix:** Wrap handleAddTouchpoint and handleAddStage in useCallback (same fix pattern as IMP-008 for flow-canvas.tsx handleAddStep/handleAddSection).

## Logged
<!-- Processed improvements with iteration and resolution -->
