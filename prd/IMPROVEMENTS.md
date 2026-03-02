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

- [x] #IMP-020 Load More skeleton placeholders for activity pagination — Attempts: 1 — DONE iteration 102, 2026-03-02
  - **Found:** Iteration 91 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **Fix applied:** Added 3 skeleton rows inside space-y-2 list div that appear when loading=true. Each row matches real entry container (same border/bg/padding) with two animate-pulse bars (h-3 w-3/4 for action line, h-2.5 w-2/5 for timestamp). Button text simplified to static "Load More" since skeletons serve as loading indicator.

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

- [x] #IMP-030 Canvas toolbar icon-only buttons lack aria-label — Attempts: 1 — DONE iteration 102, 2026-03-02
  - **Found:** Iteration 99 (acceptance tester)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx`, `src/components/layout/tab-bar.tsx`
  - **Fix applied:** Builder audit confirmed all icon-only buttons in canvas-view.tsx (Templates, Color, Delete template) and tab-bar.tsx (Close tab, Add tab) already have aria-label attributes. No changes needed — marking resolved.

- [ ] #IMP-031 Deploy route sequential INSERT — batch insert for templates — Attempts: 0
  - **Found:** Iteration 100 (acceptance tester — static analysis)
  - **Category:** Performance
  - **Where:** `src/app/api/v1/templates/[id]/deploy/route.ts`
  - **What:** Deploy route inserts steps in a sequential for-of loop — N supabase INSERT calls for N steps. For templates with many steps this creates N database roundtrips on the server. Acceptable for current template sizes (5 steps), but would degrade for larger templates.
  - **Suggested fix:** Batch insert all steps in one call, then build the ID map from the returned rows using stored template step IDs as correlation key.

- [x] #IMP-032 StepNode/SectionNode not wrapped in React.memo — Attempts: 1 — DONE iteration 101, 2026-03-02
  - **Found:** Iteration 100 (acceptance + regression tester)
  - **Category:** Performance
  - **Where:** `src/components/canvas/step-node.tsx`, `src/components/canvas/section-node.tsx`
  - **What:** Custom React Flow node components are not wrapped in React.memo. React Flow's nodeTypes pattern requires stable references, but the components themselves re-render on any parent context change. React Flow documentation explicitly recommends memo on custom nodes.
  - **Suggested fix:** Wrap each custom node export in React.memo: `export const StepNode = React.memo(function StepNode(...) { ... })`.

- [ ] #IMP-033 Large component files exceeding 500 lines — Attempts: 0
  - **Found:** Iteration 100 (regression tester)
  - **Category:** Maintainability
  - **Where:** Multiple files: teams-view.tsx (721), journey-canvas-view.tsx (662), compare-view.tsx (640), settings/page.tsx (581), flow-canvas.tsx (504)
  - **What:** 5 component files exceed the 500-line maintainability threshold. Large client components are harder to tree-shake and slower to parse.
  - **Suggested fix:** Split largest files into sub-components. Not urgent — route-level components load only on specific routes.

- [ ] #IMP-034 canvas-view.tsx handler functions not memoized with useCallback — Attempts: 0
  - **Found:** Iteration 100 (regression tester)
  - **Category:** Performance
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` lines 44-93
  - **What:** 10 handler functions (handleStepSelect, handleSectionSelect, handleStepUpdate, handleStepCreate, handleStepDelete, handleSectionCreate, handleSectionUpdate, handleSectionDelete, handleConnectionCreate, handleConnectionDelete) are plain inline functions not wrapped in useCallback. These are passed as props to FlowCanvas and cause re-renders on every CanvasView state change.
  - **Suggested fix:** Wrap all 10 handlers in React.useCallback with appropriate dependency arrays. Most only depend on setState functions (stable) and state values.

- [x] #IMP-035 Sidebar missing navigation links for multiple views — Attempts: 0 — RESOLVED iteration 102, 2026-03-02
  - **Found:** Iteration 100 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/layout/sidebar.tsx`
  - **Resolution:** Already resolved in current codebase. Sidebar has 12 nav items including Dashboard, Gap Analysis, Compare, Runbooks, and Activity. The regression tester tested against production (which is 20+ commits behind). Confirmed by planner and reviewer in iteration 102.

- [x] #IMP-036 Template browser should show starter templates even when DB fetch fails — Attempts: 1 — DONE iteration 102, 2026-03-02
  - **Found:** Iteration 101 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` — template browser dialog
  - **Fix applied:** Restructured template dialog ternary: loading=skeletons; non-loading=grid with error message at top when templateError, DB templates hidden on error, STARTER_TEMPLATES always visible unconditionally.

- [ ] #IMP-037 Load More button needs secondary loading indicator — Attempts: 0
  - **Found:** Iteration 102 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** Load More button is disabled while loading but provides no visible affordance beyond opacity-50. Users who miss the skeleton rows may think the button is broken.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Add a subtle spinner icon inside the Load More button when loading=true as a secondary signal alongside skeleton rows.

- [ ] #IMP-038 Full aria-label audit across all icon-only buttons — Attempts: 0
  - **Found:** Iteration 102 (acceptance tester)
  - **Category:** Accessibility
  - **Where:** Multiple files (production page showed 4 unlabeled buttons in pre-iteration-102 code)
  - **What:** Production canvas page has 4 icon-only buttons without aria-labels visible in older code. These may be resolved by iteration 102 deployment, but additional buttons in other code paths may need audit.
  - **Design principle:** WCAG 2.1 SC 4.1.2: Name, Role, Value
  - **Suggested fix:** Run full aria-label audit across all icon-only buttons as part of FEAT-053 testing gate.

## Logged
<!-- Processed improvements with iteration and resolution -->
