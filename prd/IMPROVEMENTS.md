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

- [x] #IMP-007 Journey canvas keyboard shortcuts undocumented in UI — Attempts: 1 — DONE iteration 94, 2026-03-03
  - **Found:** Iteration 73 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/journey-canvas-view.tsx`
  - **Fix applied:** Added `<kbd>` shortcut hint elements inside Touchpoint button (showing 'N') and Stage button (showing 'S') in journey canvas toolbar. Styled: text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-subtle)].

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

- [x] #IMP-012 Styled confirmation dialog for runbook Complete/Cancel — Attempts: 3 — DONE iteration 86, 2026-03-02
  - **Found:** Iteration 83 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/runbook-view.tsx`
  - **Fix applied:** Replaced both `window.confirm()` calls with controlled Radix Dialog components. `confirmCompleteOpen` and `confirmCancelOpen` useState booleans. Complete dialog uses default variant button (blue). Cancel dialog uses destructive variant button (red). Both dialogs explain consequences via DialogDescription. Zero `window.confirm()` calls remain.

- [x] #IMP-013 Segmented progress bar for runbook list — Attempts: 1 — DONE iteration 86, 2026-03-02
  - **Found:** Iteration 83 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/runbooks-list-view.tsx`
  - **Fix applied:** Added segmented progress bar below step count text. Teal segment (`--brand`) for completed, blue/60 (`--accent-blue/60`) for in_progress. Proportional widths. Empty state shows gray background bar only. Follows h-1.5 rounded-full overflow-hidden flex pattern from runbook-view.tsx.

- [x] #IMP-014 Progress bar should count skipped steps as "resolved" — Attempts: 1 — DONE iteration 89, 2026-03-03
  - **Found:** Iteration 87 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/runbook-view.tsx`
  - **Fix applied:** Added `resolvedCount = completedCount + skippedCount` in runbook-view.tsx, runbooks-list-view.tsx, and playbook-view.tsx. Progress bar uses resolvedCount/total. Text shows "N of M resolved". List view has white/20 skipped segment between teal (completed) and blue/60 (in_progress).

- [x] #IMP-015 Playbook mode Skip action button — Attempts: 1 — DONE iteration 88, 2026-03-03
  - **Found:** Iteration 87 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/playbook/playbook-view.tsx`
  - **Fix applied:** Added handleSkip function with identical optimistic+rollback pattern (status='skipped', prevIndex saved/restored). Skip button (variant=secondary) placed below Mark Complete & Next, hidden for completed/skipped steps and in read-only mode, disabled while isUpdating.

- [x] #IMP-016 Playbook button visible on read-only runbooks — Attempts: 1 — DONE iteration 90, 2026-03-03
  - **Found:** Iteration 87 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/runbook-view.tsx`
  - **Fix applied:** Moved Playbook button outside `!isReadOnly` guard. Cancel and Complete buttons remain inside the guard. Button container div always renders; only action buttons are conditionally hidden.

- [ ] #IMP-017 Activity filter should re-fetch from server instead of client-side filtering — Attempts: 0
  - **Found:** Iteration 91 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** Filter tabs filter client-side on already-fetched entries. When Load More is used and then a filter applied, the filter only applies to loaded entries — DB may have matching entries not yet fetched.
  - **Suggested fix:** When a filter tab is activated, reset entries and re-fetch from API with the action= filter param. Ensures pagination aligns with selected filter.

- [x] #IMP-018 Activity empty state guidance text — Attempts: 1 — DONE iteration 96, 2026-03-03
  - **Found:** Iteration 91 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **Fix applied:** Added guidance paragraph below "No activity yet" in all-filter empty state: "Actions like creating steps, adding comments, and completing runbooks appear here." Styled text-[12px] text-[var(--text-tertiary)] mt-1.

- [x] #IMP-019 Entity type human-readable labels in activity entries — Attempts: 1 — DONE iteration 92, 2026-03-03
  - **Found:** Iteration 91 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **Fix applied:** Added ENTITY_TYPE_SINGULAR map (19 entity types: steps → step, runbook_steps → runbook step, etc.). Activity entries now show "Created step" instead of "created steps". Also uses ACTION_LABELS for capitalized action names.

- [ ] #IMP-020 Load More skeleton placeholders for activity pagination — Attempts: 0
  - **Found:** Iteration 91 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** Load More shows 'Loading...' but no skeleton placeholders for expected new items.
  - **Suggested fix:** Add 2-3 skeleton activity row placeholders below Load More button when loading.

- [ ] #IMP-021 Activity filter tab scroll affordance gradient — Attempts: 0
  - **Found:** Iteration 91 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** Filter tabs are scrollable (overflow-x-auto) but no visual affordance indicates more tabs exist on narrow viewports.
  - **Suggested fix:** Add right-side fade gradient overlay on filter tab container when scroll is possible.

- [ ] #IMP-022 Actor type field for activity audit trail — Attempts: 0
  - **Found:** Iteration 91 (regression tester)
  - **Category:** Data model
  - **Where:** `src/lib/api/activity.ts`, `supabase/migrations/017_activity_log.sql`
  - **What:** No distinction between user-initiated and automated/system actions. Future audit trail may need actor_type.
  - **Suggested fix:** Add optional actor_type:'user'|'system' to LogActivityParams in a future migration.

- [ ] #IMP-023 Coloring rules active indicator on paintbrush button — Attempts: 0
  - **Found:** Iteration 96 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`
  - **What:** Paintbrush button has no indicator that coloring rules are currently active. Users cannot tell at a glance whether tinting is on after reloading.
  - **Suggested fix:** Add a small dot indicator on the button when any active coloring rule exists.

- [ ] #IMP-024 has_role criteria type not visually evaluated — Attempts: 0
  - **Found:** Iteration 96 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/canvas/coloring-panel.tsx`, `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`
  - **What:** has_role criteria type appears in the dropdown but is not visually evaluated. Users who create a has_role rule see no canvas effect and no explanation.
  - **Suggested fix:** Show inline warning when has_role is selected, or remove from dropdown until implemented.

- [ ] #IMP-025 Verify activity sidebar nav link present after deployment — Attempts: 0
  - **Found:** Iteration 96 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/layout/sidebar.tsx`
  - **What:** Activity sidebar nav link absent from production (iter 96 not deployed). If link was dropped in a prior merge the page is undiscoverable.
  - **Suggested fix:** Confirm sidebar.tsx Activity link present after iter 96 deployment.

- [x] #IMP-026 Clone confirm dialog text understates what's cloned — Attempts: 1 — DONE iteration 98, 2026-03-02
  - **Found:** Iteration 97 (acceptance tester)
  - **Category:** Content
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — handleClone confirm() text
  - **What:** Text says "A full copy will be created with all tabs, sections, steps, and connections" but clone_workspace() also copies teams, roles, people, tools, stages, and touchpoints (13 tables total).
  - **Fix applied:** Radix Dialog description now accurately lists "tabs, sections, steps, connections, teams, roles, people, and tools." (IMP-028 replaced confirm() with Dialog, dialog text is accurate.)

- [ ] #IMP-027 Activity Load More lacks total count indicator — Attempts: 0
  - **Found:** Iteration 97 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** Load More button fetches next page of 50, but no indication of total entries or how close to the end. Button disappears only when no more entries are returned.
  - **Suggested fix:** Show total count in header badge (e.g., "50 of 234"), or add subtle "Showing N entries" text when total is known via a count query.

- [x] #IMP-028 Duplicate Workspace uses native confirm() instead of Radix Dialog — Attempts: 1 — DONE iteration 98, 2026-03-02
  - **Found:** Iteration 97 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — handleClone
  - **Fix applied:** Replaced `window.confirm()` with Radix Dialog matching IMP-012 pattern. `confirmCloneOpen` useState boolean, Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter. Cancel (secondary) and Duplicate (default) buttons. Zero `window.confirm()` calls remain for clone.

- [x] #IMP-029 Settings page body text inconsistent with clone dialog description — Attempts: 1 — DONE iteration 99, 2026-03-02
  - **Found:** Iteration 98 (acceptance tester)
  - **Category:** Content
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — line 245
  - **Fix applied:** Updated paragraph to "including all tabs, sections, steps, connections, teams, roles, people, and tools" matching the Radix Dialog description.

- [ ] #IMP-030 Canvas toolbar icon-only buttons lack aria-label — Attempts: 0
  - **Found:** Iteration 99 (acceptance tester)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`, `src/components/layout/tab-bar.tsx`
  - **What:** 4 icon-only buttons on canvas toolbar/tab-bar lack aria-label attributes. Pre-existing issue, not introduced by iter 99.
  - **Suggested fix:** Add aria-label to: add-tab button, canvas toolbar expand/collapse buttons.

## Logged
<!-- Processed improvements with iteration and resolution -->
