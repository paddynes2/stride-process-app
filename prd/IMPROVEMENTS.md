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

- [x] #IMP-023 Coloring rules active indicator on paintbrush button — DONE iteration 125, 2026-03-05 — Attempts: 1
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

- [x] #IMP-039 Activity 'Unknown' fallback should be '[Deleted User]' for deleted accounts — Attempts: 1 — DONE iteration 104, 2026-03-02
  - **Found:** Iteration 103 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx` line 176
  - **What:** Activity entries show 'Unknown' when the users join is null (deleted user accounts). '[Deleted User]' would be more informative for audit trail purposes.
  - **Fix applied:** Changed fallback from `"Unknown"` to `"[Deleted User]"` at activity-view.tsx:176.

- [ ] #IMP-040 Playbook step notes/description panel during execution — Attempts: 0
  - **Found:** Iteration 103 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/playbook/playbook-view.tsx`
  - **What:** Playbook has no notes/description panel for the current step. Users may need step context during execution without exiting to step detail panel.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Add optional collapsible 'Step Notes' section below step name showing the step's notes field if present.

- [ ] #IMP-041 Playbook Exit icon aria-label redundancy with visible text — Attempts: 0
  - **Found:** Iteration 103 (acceptance tester)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/playbook/playbook-view.tsx`
  - **What:** ArrowLeft icon in playbook Exit link has aria-label='Back' redundant with visible 'Exit' text. Multiple icons have duplicate aria-labels.
  - **Design principle:** WCAG 2.5.3 Label in Name
  - **Suggested fix:** Remove aria-label from decorative icons adjacent to visible text. Use aria-hidden='true' on decorative icons.

- [x] #IMP-042 Clone confirmation dialog should display workspace name — Attempts: 1 — DONE iteration 105, 2026-03-02
  - **Found:** Iteration 103 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx`
  - **Fix applied:** Injected workspace.name into DialogDescription and body paragraph using JSX &quot; entities. Both now read 'A full copy of "{workspace.name}" will be created...'

- [x] #IMP-043 Runbook detail shows truncated UUID instead of creator email — Attempts: 1 — DONE iteration 110, 2026-03-04
  - **Found:** Iteration 103 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/[runbookId]/runbook-view.tsx`
  - **Fix applied:** page.tsx joins users table via `users!runbooks_created_by_fkey(email)`. runbook-view.tsx shows `runbook.users?.email ?? '[Deleted User]'`. PATCH state updates preserve users field via functional setState.

- [ ] #IMP-044 Comments view lacks pagination (single fetch) — Attempts: 0
  - **Found:** Iteration 103 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/comments/comments-view.tsx`
  - **What:** Comments view loads all top-level comments in a single fetch with no pagination. Could cause delay with 500+ comments.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Apply Load More pattern (offset pagination) from activity-view.tsx, default first 50 comments.

- [x] #IMP-045 Coloring panel color picker input lacks aria-label — Attempts: 1 — Done iteration 126, 2026-03-05
  - **Found:** Iteration 103 (regression tester)
  - **Category:** Accessibility
  - **Where:** `src/components/canvas/coloring-panel.tsx`
  - **What:** `<input type='color'>` has no aria-label. Screen readers cannot associate it with the hex input.
  - **Design principle:** WCAG 1.3.1: Info and Relationships
  - **Suggested fix:** Add aria-label='Color picker' or associate via htmlFor/id.

- [x] #IMP-046 Runbooks list progress bar lacks step count text — Attempts: 1 — DONE iteration 105, 2026-03-02
  - **Found:** Iteration 103 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/runbooks-list-view.tsx`
  - **Fix applied:** Wrapped progress bar in flex container, appended span showing '{resolved} / {total}' in text-[11px] text-[var(--text-tertiary)] with tabular-nums for stable digit width.

- [ ] #IMP-047 Activity filter tabs overflow on narrow viewports — Attempts: 0
  - **Found:** Iteration 103 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/activity/activity-view.tsx`
  - **What:** 8 action type filter tabs likely overflow on viewports narrower than 1024px.
  - **Design principle:** Nielsen H4: Consistency and standards
  - **Suggested fix:** Wrap filter row or use compact dropdown on narrow viewports, matching workspace-shell tab-bar pattern.

- [ ] #IMP-048 Perspective comparison empty annotations state after selection — Attempts: 0
  - **Found:** Iteration 104 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/perspectives/compare/perspectives-compare-view.tsx`
  - **What:** Empty state guard checks `perspectives.length < 2` (total perspectives) rather than perspectives-with-annotations. A workspace could have 2+ perspectives with zero annotations — user sees selectors but empty table with no guidance. The existing "No annotations found" empty state appears after both are selected, but no guidance is provided for the pre-selection state.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Add secondary empty-state message when both perspectives are selected but annotations.length === 0: e.g. "No annotations found — add annotations to perspective elements in Settings."

- [ ] #IMP-049 Perspective comparison element links should deep-link to specific canvas node — Attempts: 0
  - **Found:** Iteration 104 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/perspectives/compare/perspectives-compare-view.tsx`
  - **What:** Top-3 divergent elements and table element names link to the tab (canvas), but not to the specific element within that tab. User lands on the full canvas and must find the element manually.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** If deep-linking to specific canvas nodes is supported in future (e.g. via URL hash or query param), pre-select the element on navigation. Current behaviour is functional but not optimal.

- [x] #IMP-050 Redundant step count display on runbook cards — Attempts: 1 — DONE iteration 106, 2026-03-02
  - **Found:** Iteration 105 (acceptance + regression testers)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/runbooks/runbooks-list-view.tsx`
  - **What:** Step count now appears twice per runbook card: once in metadata row as '{resolved}/{total} steps' (IMP-014, line 114) and again next to progress bar as '{resolved} / {total}' (IMP-046, line 124). Visually redundant.
  - **Design principle:** Nielsen H8: Aesthetic and minimalist design
  - **Fix applied:** Removed metadata row step count span and preceding separator dot. Progress bar label retained.

- [x] #IMP-051 Delete Workspace action uses native browser confirm() dialog — Attempts: 1 — DONE iteration 106, 2026-03-02
  - **Found:** Iteration 105 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx`
  - **What:** Delete Workspace still uses native `confirm()` while Duplicate Workspace uses polished Radix Dialog (IMP-028). Inconsistent destructive action UX.
  - **Design principle:** Nielsen H4: Consistency and standards
  - **Fix applied:** Added confirmDeleteOpen state + Radix Dialog mirroring clone dialog pattern. Dialog shows workspace name. Cancel (secondary) + Delete (destructive/red) buttons.

- [x] #IMP-052 Prioritization chart lacks axis tick marks or grid lines — Attempts: 1 — DONE iteration 107, 2026-03-03
  - **Found:** Iteration 106 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/prioritization/prioritization-view.tsx`
  - **Fix applied:** Added Y-axis numeric labels (5→1 top-to-bottom) in w-4 column, X-axis numeric labels (1→5 left-to-right) in 14px row, and subtle dashed grid lines at 25%/75% (horizontal + vertical) using var(--border-subtle) at 35% opacity. Existing 50% quadrant dividers preserved.

- [x] #IMP-053 Prioritization empty state has no CTA to navigate to canvas — Attempts: 1 — DONE iteration 108, 2026-03-03
  - **Found:** Iteration 106 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/prioritization/prioritization-view.tsx`
  - **What:** When no items have scores, the empty state message is helpful but there's no direct link to navigate to a step/canvas to assign scores.
  - **Design principle:** Nielsen H3: User control and freedom
  - **Suggested fix:** Add a secondary action link 'Go to Canvas' pointing to the first workflow tab.

- [x] #IMP-054 Perspective deletion uses native confirm() while workspace delete uses Radix Dialog — Attempts: 0 — RESOLVED iteration 107, 2026-03-03
  - **Found:** Iteration 106 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` (PerspectivesSection.handleDelete, line ~379)
  - **Resolution:** Fixed by BUG-025 in iteration 107. Perspective deletion now uses Radix Dialog matching workspace delete and clone patterns.

- [x] #IMP-055 Delete Perspective button label should say "Delete Perspective" for specificity — Attempts: 1 — DONE iteration 108, 2026-03-03
  - **Found:** Iteration 107 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — Delete Perspective dialog footer button
  - **What:** Delete button reads "Delete" but dialog title reads "Delete Perspective". Workspace delete dialog likely uses specific label. Minor inconsistency.
  - **Design principle:** Nielsen H6: Recognition over recall — specific labels confirm what is being deleted
  - **Suggested fix:** Change button label to "Delete Perspective" to match dialog title.

- [ ] #IMP-056 Prioritization Y-axis label column may clip at narrow widths — Attempts: 0
  - **Found:** Iteration 107 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/prioritization/prioritization-view.tsx`
  - **What:** Y-axis label column uses w-4 (16px) for single-digit numbers. At very small viewports these 1-digit numbers may be clipped. Low risk since chart is desktop-only.
  - **Design principle:** Nielsen H4: Consistency and standards — labels should remain readable
  - **Suggested fix:** Consider w-5 or add overflow-visible if wider scores are planned in future.

- [x] #IMP-057 ImprovementsView has no delete action on cards — Attempts: 1 — DONE iteration 109, 2026-03-03
  - **Found:** Iteration 108 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **Fix applied:** Added Trash2 icon button after priority badge with window.confirm + deleteImprovementIdea + state removal + toastError. Styled text-[var(--text-tertiary)] hover:text-[#EF4444]. Reviewer added aria-label='Delete improvement idea'.

- [x] #IMP-058 Improvements page empty state has no CTA to navigate to canvas — Attempts: 1 — DONE iteration 110, 2026-03-04
  - **Found:** Iteration 108 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **Fix applied:** Added optional tabs prop + "Go to Canvas" link in empty state targeting first process-type tab. page.tsx updated by reviewer to pass tabs prop (builder omitted this, caught by tester).

- [x] #IMP-059 Status filter buttons missing aria-pressed on ImprovementsView — Attempts: 1 — DONE iteration 110, 2026-03-04
  - **Found:** Iteration 108 (acceptance tester)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **Fix applied:** Added `aria-pressed={statusFilter === "all"}` on All button and `aria-pressed={statusFilter === status}` on each status filter button.

- [x] #IMP-060 Sidebar improvements badge count stale after adding from detail panel — Attempts: 1 — Done iteration 124, 2026-03-05
  - **Found:** Iteration 108 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/layout/sidebar.tsx` (lines 62-74)
  - **What:** Badge count loads once on mount but does not refresh after user adds a new improvement from a detail panel. Count is stale until page reload or navigation.
  - **Design principle:** Nielsen H1: Visibility of system status — badge should reflect current state
  - **Suggested fix:** Emit a custom event or use a lightweight context signal from createImprovementIdea success path to trigger badge refetch. Alternatively, refetch on tab focus.

- [x] #IMP-061 Improvement status change waits for API before visual update — Attempts: 1 — DONE iteration 117, 2026-03-04
  - **Found:** Iteration 108 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx` (lines 58-65)
  - **What:** handleStatusChange waits for API roundtrip before updating local state. Brief visual lag on slow connections.
  - **Design principle:** Nielsen H1: Visibility of system status — immediate feedback preferred
  - **Suggested fix:** Apply optimistic update before API call: setIdeas with newStatus first, then revert on error.

- [x] #IMP-062 Prioritization 'Go to Canvas' should target first process tab — Attempts: 1 — DONE iteration 109, 2026-03-03
  - **Found:** Iteration 108 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/prioritization/prioritization-view.tsx` (line 169)
  - **Fix applied:** Changed `tabs[0].id` to `(tabs.find(t => t.canvas_type === 'process') ?? tabs[0]).id`. Existing `tabs.length > 0` guard prevents render when empty.

- [x] #IMP-063 section-detail-panel BUG reference inconsistency (BUG-024 vs BUG-023) — Attempts: 1 — DONE iteration 127, 2026-03-05
  - **Found:** Iteration 108 (regression tester)
  - **Category:** Content
  - **Where:** `src/components/panels/section-detail-panel.tsx`
  - **What:** Comment at line 11 references 'BUG-024' but other panels reference this as the 'BUG-023 pattern'. Implementation is correct (using DialogPrimitive.Title) but the bug number is inconsistent.
  - **Design principle:** Code maintainability — consistent documentation references across files
  - **Suggested fix:** Align comment to reference 'BUG-023' consistently across all panels.

- [x] #IMP-065 AI analysis rate-limit state has no visual countdown timer — Attempts: 1 — DONE iteration 111, 2026-03-04
  - **Found:** Iteration 110 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/ai-analysis/ai-analysis-view.tsx`
  - **What:** Rate-limited state shows "Try again in about N minutes" but no countdown — user must manually refresh or guess when to retry.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Fix applied:** Added formatCountdown() helper, countdown state, useEffect with setInterval (1s), auto-transitions to idle when countdown reaches 0. Display format: "Try again in M:SS". Regenerate button disabled during rate_limited state. Previously numbered IMP-063 (duplicate — renumbered to IMP-065).

- [x] #IMP-064 AI analysis not-configured message targets developers only, not SaaS users — Attempts: 1 — DONE iteration 114, 2026-03-04
  - **Found:** Iteration 110 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/ai-analysis/ai-analysis-view.tsx`
  - **What:** The not_configured state instructs users to "redeploy" the app, which is appropriate for self-hosted users but not SaaS users who may not have environment variable access.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Distinguish self-hosted from cloud-hosted messaging, or link to documentation about configuring AI features.

- [x] #IMP-066 Gap analysis rate-limited state uses static minutes display instead of live countdown — Attempts: 1 — DONE iteration 113, 2026-03-04
  - **Found:** Iteration 111 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx`
  - **What:** Rate-limited state in gap analysis shows static "Try again in about X minutes" while ai-analysis shows a live countdown (IMP-065). Inconsistent feedback — users on gap analysis page don't know when to retry.
  - **Design principle:** Nielsen H1: Visibility of system status — consistent patterns across features
  - **Suggested fix:** Apply the same IMP-065 countdown timer pattern to the gap-narrative rate_limited state.

- [x] #IMP-067 AI Suggestions button enabled with no steps in workspace — Attempts: 1 — DONE iteration 114, 2026-03-04
  - **Found:** Iteration 111 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **What:** The "AI Suggestions" button is always enabled even when workspace has no steps. Clicking returns empty or unhelpful response, wasting the 5-minute rate-limit window.
  - **Design principle:** Nielsen H5: Error Prevention
  - **Suggested fix:** Disable button when workspace has no steps (add hasSteps prop from page.tsx, same pattern as ai-analysis-view).

- [x] #IMP-068 Add as Improvement button lacks visual confirmation feedback — Attempts: 1 — DONE iteration 113, 2026-03-04
  - **Found:** Iteration 111 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **What:** After "Add as Improvement" is clicked, there is no visual confirmation. The improvement appears silently in the list below the panel, which may be missed if panel is expanded.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Show brief inline confirmation — change button text to "Added" with checkmark for 2 seconds (same Copy button pattern in gap-analysis-view).

- [x] #IMP-069 StageNode and TouchpointNode not wrapped in React.memo() — Attempts: 1 — DONE iteration 113, 2026-03-04
  - **Found:** Iteration 112 (acceptance tester)
  - **Category:** Performance
  - **Where:** `src/components/canvas/stage-node.tsx`, `src/components/canvas/touchpoint-node.tsx`
  - **What:** StageNode and TouchpointNode are exported as plain function components without React.memo(). StepNode and SectionNode already use React.memo() (IMP-032, iter 101). In a canvas with many journey elements, re-renders of the parent cause unnecessary re-renders of all stage/touchpoint nodes.
  - **Design principle:** Performance — minimize unnecessary renders (React Flow docs recommend memo on custom nodes)
  - **Suggested fix:** Wrap exports in React.memo() matching step-node.tsx:145 and section-node.tsx:96 patterns.

- [x] #IMP-070 AI Suggestions panel duplicates fetch logic instead of using apiFetch client — Attempts: 1 — DONE iteration 114, 2026-03-04
  - **Found:** Iteration 112 (acceptance tester)
  - **Category:** Code consistency
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx` (lines 68-85)
  - **What:** The fetchSuggestionsAPI function fetches inline via `fetch('/api/v1/ai/suggest-improvements', ...)` rather than using the shared API client pattern. This duplicates fetch logic and bypasses the standard apiFetch envelope pattern used by the rest of the app (generateProcessAnalysis, generateGapNarrative).
  - **Design principle:** Code consistency — all API calls should use apiFetch via lib/api/client.ts
  - **Suggested fix:** Extract a fetchAISuggestions() function in lib/api/client.ts and use it from improvements-view.tsx.

- [x] #IMP-071 Sidebar improvements badge shows nothing on API 500 instead of fallback 0 — Attempts: 1 — DONE iteration 113, 2026-03-04
  - **Found:** Iteration 112 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/layout/sidebar.tsx` (lines 131-135)
  - **What:** When /api/v1/improvement-ideas returns 500 (BUG-028), the sidebar badge count stays null and renders nothing. Users see a blank badge area instead of "0".
  - **Design principle:** Nielsen H9: Help users recognize, diagnose, recover from errors
  - **Suggested fix:** Default badge count to 0 on fetch error rather than null, so the nav item renders consistently.

- [x] #IMP-072 Compare view empty state lacks CTA to create journey tab — Attempts: 1 — DONE iteration 117, 2026-03-04
  - **Found:** Iteration 112 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/compare/compare-view.tsx`
  - **What:** The compare view empty state says "create a journey canvas tab" but has no direct CTA button or link. Users must remember to add a tab via the tab bar.
  - **Design principle:** Nielsen H6: Recognition over recall — users should not have to remember where to take action
  - **Suggested fix:** Add a small "Add Journey Tab" button in the empty state that triggers the tab creation flow directly.

- [x] #IMP-073 Regenerate button hidden during rate_limited state instead of shown as disabled — Attempts: 1 — DONE iteration 114, 2026-03-04
  - **Found:** Iteration 113 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx`
  - **What:** The Regenerate button is inside a block conditioned on `narrativeState.type === 'idle' && narrativeText !== null`. During rate_limited state, the button is completely absent — users see no button at all until the countdown expires. A disabled Regenerate button would give better status visibility.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Render Regenerate button outside the narrativeText conditional, add disabled={narrativeState.type === 'loading' || narrativeState.type === 'rate_limited'} with tooltip when rate_limited.

- [x] #IMP-074 AI Suggestions panel shows no error state on endpoint failure — Attempts: 1 — DONE iteration 114, 2026-03-04 (already resolved by existing code — no changes needed)
  - **Found:** Iteration 113 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **What:** The AI Suggestions button triggers a panel that depends on a broken endpoint (BUG-028). When the endpoint fails, the user gets no visible feedback — the panel may open to an empty or broken state with no error messaging.
  - **Design principle:** Nielsen H9: Help users recognize, diagnose, and recover from errors
  - **Suggested fix:** Show an inline error state in the AI Suggestions panel when the endpoint returns a non-ok response, rather than silently failing.

- [x] #IMP-075 Gap analysis not_configured message still says "redeploy" — DONE iteration 115, 2026-03-04
  - **Found:** Iteration 114 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx` (line 325)
  - **What:** The not_configured state in gap-analysis-view.tsx still instructs users to "redeploy" — same issue as IMP-064 but in a different file. Was deferred because slot 1 (IMP-073) owned this file and focused on Regenerate button visibility.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Apply same text update as IMP-064 (ai-analysis-view.tsx). Replace "redeploy" with SaaS-appropriate language.

- [ ] #IMP-076 AI Suggestions button lacks "last generated" visual indicator — Attempts: 0
  - **Found:** Iteration 114 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx`
  - **What:** AI Suggestions button has no visual indicator showing whether suggestions have been generated previously. A user returning to the page sees the same button with no memory of prior state.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Show a small badge or "Last generated N min ago" label near the button when cached suggestions exist.

- [x] #IMP-077 Gap analysis "Generate Summary" disabled state lacks guidance — DONE iteration 116, 2026-03-04
  - **Found:** Iteration 115 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx`
  - **What:** The "Generate Summary" button is disabled with text "Score steps to enable AI narrative" but there is no inline guidance directing users to where they can score steps. A new user would not know to go to the canvas and open a step's detail panel.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Add a small link or tooltip near the disabled state: "Open a step on the canvas to set maturity scores" with a link to the canvas tab.

- [x] #IMP-078 Workspace card date uses locale-dependent toLocaleDateString — DONE iteration 116, 2026-03-04
  - **Found:** Iteration 115 (acceptance tester)
  - **Category:** Visual consistency
  - **Where:** Workspace list card component (workspace-list.tsx or similar)
  - **What:** Workspace card shows "Created 3/4/2026" using toLocaleDateString() — same locale-dependent pattern that BUG-030 fixed on the ai-analysis page. Causes hydration mismatch.
  - **Design principle:** Consistency and standards
  - **Suggested fix:** Apply same toISOString().slice(0, 10) fix to the workspace creation date display.

- [x] #IMP-079 Tools canvas empty state "Add Group" vs toolbar "Add Tool Section" label inconsistency — Attempts: 1 — DONE iteration 117, 2026-03-04
  - **Found:** Iteration 116 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx`
  - **What:** The empty state overlay uses "Add Group" for the secondary button but the toolbar uses "Add Tool Section". Inconsistent labeling could confuse users about what they're creating.
  - **Design principle:** Nielsen H4: Consistency and standards
  - **Suggested fix:** Change the empty state button label from "Add Group" to "Add Tool Section" to match the toolbar.

- [ ] #IMP-080 Gap analysis guidance text consolidation — Attempts: 0
  - **Found:** Iteration 116 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx`
  - **What:** Two separate hint messages exist when no maturity data: "Score steps to enable AI narrative." (inline) and "Open the canvas to set maturity scores →" (link below). Could be consolidated into one sentence.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Combine into: "Open the canvas to set maturity scores on steps to enable AI narrative →" as a single linked message.

- [x] #IMP-081 Tool status dropdown lacks optimistic update — DONE iteration 118, 2026-03-04
  - **Found:** Iteration 117 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/tool-detail-panel.tsx`
  - **Fix applied:** Added `const [status, setStatus] = React.useState(tool.status)` with optimistic update in `handleStatusChange`. Reverts on error with toast notification. Status added to useEffect deps for reset on tool change.

- [x] #IMP-082 Compare view CTA only creates journey tab, not process tab — Attempts: 1 — DONE iteration 119, 2026-03-05 (verified pre-existing from IMP-072, iter 117)
  - **Found:** Iteration 117 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/compare/compare-view.tsx`
  - **What:** When hasNeither is true (no tabs at all), empty state says "Create a process canvas AND a journey canvas" but only shows "Create Journey Tab" button. After clicking, user navigates away and must manually create a process tab.
  - **Design principle:** Nielsen H6: Recognition rather than recall — guide users with CTAs for all required actions
  - **Suggested fix:** Show a second "Create Process Tab" button when processTab is also null, or update copy to acknowledge only journey will be created.

- [x] #IMP-083 Tool section detail panel lacks tool count display — DONE iteration 118, 2026-03-04
  - **Found:** Iteration 117 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/tool-section-detail-panel.tsx`
  - **Fix applied:** Already implemented in baseline. `toolCount?: number` prop (line 34) with display text '{N} tool(s) in this section'. Computed via `toolSectionMap` spatial containment in tools-canvas-view.tsx.

- [x] #IMP-084 Assigned Tools section lacks link to Tools page when no tools exist — Attempts: 1 — DONE iteration 119, 2026-03-05
  - **Found:** Iteration 118 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/step-detail-panel.tsx` (Assigned Tools dropdown empty state)
  - **What:** When workspace has no tools, dropdown label says "No tools — create tools first" but doesn't link to the Tools page. User must navigate manually.
  - **Design principle:** Nielsen H6: Recognition rather than recall — user shouldn't need to remember where to create tools
  - **Suggested fix:** Replace static label with a link: "No tools yet — go to Tools to create some" with navigation to `/w/{workspaceId}/tools`.

- [ ] #IMP-085 Tool section panel click behavior may require investigation — Attempts: 0
  - **Found:** Iteration 118 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx`
  - **What:** Single-clicking a tool section node may not reliably open the ToolSectionDetailPanel. Tester observed the panel wasn't visible in accessibility tree after click.
  - **Design principle:** Nielsen H1: Visibility of system status — clear feedback on selection
  - **Suggested fix:** Verify panel opens on single click and is visible in viewport; add tooltip if double-click required.

- [x] #IMP-086 Tool Analysis toggle button lacks active visual indicator — Attempts: 1 — Done iteration 124, 2026-03-05
  - **Found:** Iteration 119 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx` — Analysis toggle button in sidebar header
  - **What:** Toggle changes label (Canvas/Analysis) but no strong visual indicator of which mode is active. Button already has accent-blue styling when active, but could be more prominent.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Apply highlighted/active style similar to sidebar nav active states (--brand color) when analysis mode is on.

- [x] #IMP-087 Coverage Gaps sorts null-frequency steps mixed with real values — DONE (iteration 123, 2026-03-05) — Attempts: 1
  - **Found:** Iteration 119 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tool-analysis-view.tsx` — Coverage Gaps card
  - **What:** Steps with null/undefined frequency_per_month display as '—' but are mixed with steps that have real values. Sorting treats null as 0 but they could appear anywhere in the list.
  - **Design principle:** Nielsen H7: Flexibility and efficiency of use
  - **Suggested fix:** Treat null frequency as -1 for sorting so unset steps always appear at the bottom of the Coverage Gaps list.

- [ ] #IMP-088 Canvas + tools page transfer size exceeds 1MB performance budget — Attempts: 0
  - **Found:** Iteration 120 (regression tester — Playwright performance audit)
  - **Category:** Performance
  - **Where:** All React Flow canvas pages (workflow 1208KB, tools 1150KB, compare)
  - **What:** Cold load transfer size exceeds the 1MB warning threshold. React Flow and its peer dependencies are the primary contributors. All three canvas pages load the full React Flow bundle independently.
  - **Design principle:** Performance budget: keep single-page transfer under 1MB
  - **Suggested fix:** Evaluate dynamic import() for React Flow bundle or shared chunk splitting so React Flow is fetched once and reused across canvas routes.

- [ ] #IMP-089 Section-step visual/data association mismatch on canvas — Attempts: 0
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` + section-node.tsx
  - **What:** Section Details panel shows 'Steps (0)' even when a step node is visually positioned inside the section container. The step has no section_id association despite visual placement. Users may expect drag-into-section to auto-associate.
  - **Design principle:** Nielsen H1: Visibility of system status — section should auto-associate or indicate the step is unlinked
  - **Suggested fix:** When a step node is dropped inside a section node's bounding box, auto-assign section_id. Or show visual indicator for unlinked steps.

- [x] #IMP-090 Overlapping 'NEW GROUP' tool section nodes on default canvas — Attempts: 1 — DONE iteration 130, 2026-03-05
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx` — initial tool section positioning
  - **What:** Two 'NEW GROUP' tool section nodes overlap on the default canvas layout. The second group node partially covers the first, creating visual confusion.
  - **Design principle:** Nielsen H8: Aesthetic and minimalist design — initial layout should not show overlapping nodes
  - **Suggested fix:** Ensure default tool section nodes are positioned with non-overlapping coordinates. Add minimum gap between auto-positioned nodes.

- [ ] #IMP-091 Journey canvas needs test data for regression coverage — Attempts: 0
  - **Found:** Iteration 120 (regression tester — Playwright browser)
  - **Category:** Testing
  - **Where:** Journey canvas regression testing
  - **What:** Journey canvas has 0 stages and 0 touchpoints, making it impossible to verify touchpoint/stage detail panel behavior in regression runs. Panel interactions are untestable without data.
  - **Design principle:** Regression testing coverage — critical paths need representative test data
  - **Suggested fix:** Seed the test workspace with at least one stage and one touchpoint for regression runs.

- [x] #IMP-092 Spend Summary lacks visual hierarchy separating totals from status breakdown — Attempts: 1 — DONE iteration 127, 2026-03-05 (already implemented in code — border-t + 'By Status' label)
  - **Found:** Iteration 121 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tool-analysis-view.tsx` — Spend Summary card
  - **What:** No visual separation between totals (Monthly/Annual) and status breakdown (Active/Considering/Cancelled). Adding a 'By Status' sub-label would improve scannability.
  - **Design principle:** Nielsen H6: Recognition over recall — grouping related values reduces cognitive load
  - **Suggested fix:** Add a small 'By Status' label above the Active/Considering/Cancelled rows.

- [x] #IMP-093 Step Details "No tools defined yet" copy misleading — DONE (iteration 123, 2026-03-05) — Attempts: 1
  - **Found:** Iteration 121 (acceptance tester)
  - **Category:** Usability
  - **Where:** Step detail panel — tools section empty state
  - **What:** Message says "No tools defined yet. Go to Tools →" implying tools must be defined globally first. Should say "No tools assigned. Assign from Tools page →" to clarify the action.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Change copy to "No tools assigned. Assign from Tools page →".

- [x] #IMP-094 Export dialog disabled sections lack tooltip explaining what data is needed — Attempts: 1 — DONE iteration 129, 2026-03-05 (tooltip infrastructure added but functionally unreachable — needs IMP-105)
  - **Found:** Iteration 124 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — disabled checkboxes
  - **What:** Disabled "coming soon" sections have no tooltip explaining when they'll become available or what data is needed (e.g., "Add a journey tab to enable Journey Map").
  - **Design principle:** Nielsen H1: Visibility of system status — users should understand why a feature is unavailable
  - **Suggested fix:** Add tooltip on disabled checkboxes: "Requires journey tab" or "Requires improvement ideas".

- [x] #IMP-095 Export dialog presets don't auto-switch to Custom on manual checkbox change — Attempts: 1 — Done iteration 126, 2026-03-05 (already working — handleToggle calls setActivePreset('custom'))
  - **Found:** Iteration 124 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — preset button state
  - **What:** Clicking any checkbox after selecting a preset doesn't switch to "Custom" automatically — user must manually click Custom first.
  - **Design principle:** Nielsen H4: Consistency and standards — preset systems typically auto-switch to "Custom" when user deviates
  - **Suggested fix:** When any checkbox state is manually changed, auto-activate the Custom preset button.

- [x] #IMP-096 Executive Summary preset config includes Data Table + Cost Analysis — should only enable canvasSnapshot + gapAnalysis + executiveSummary — Attempts: 1 — Done iteration 126, 2026-03-05 (already correct — EXECUTIVE_SUMMARY_CONFIG only enables canvasSnapshot + gapAnalysis + executiveSummary)
  - **Found:** Iteration 125 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — EXECUTIVE_SUMMARY_CONFIG
  - **What:** Executive Summary preset currently enables all 4 available sections (Canvas Snapshot, Data Table, Gap Analysis, Cost Analysis). Per spec, it should only enable canvasSnapshot + gapAnalysis + executiveSummary. Data Table and Cost Analysis add noise to a summary-oriented export.
  - **Design principle:** Nielsen H8: Aesthetic and minimalist design — presets should surface only what is relevant to the named use case
  - **Suggested fix:** Set `dataTable: false` and `costAnalysis: false` in EXECUTIVE_SUMMARY_CONFIG.

- [x] #IMP-097 Coming soon export sections shown as checked+disabled — should be unchecked+disabled — Attempts: 1 — DONE iteration 127, 2026-03-05 (checked={available ? config[key] : false})
  - **Found:** Iteration 126 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — available:false sections
  - **What:** Sections with available:false render as checked+disabled checkboxes. A checked-but-disabled checkbox implies the feature is included but locked, when it cannot be included at all.
  - **Design principle:** Nielsen H1: Visibility of system status — state should accurately reflect what will happen
  - **Suggested fix:** Render available:false sections as unchecked+disabled, or hide them entirely.

- [ ] #IMP-098 Export PDF dialog lacks estimated page count — Attempts: 0
  - **Found:** Iteration 127 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — Export button area
  - **What:** After selecting sections, users have no indication of how many pages the PDF will contain or how long export will take. An estimated page count badge would reduce uncertainty.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Show estimated page count (e.g., '~8 pages') next to the Export button, computed from the number of selected sections.

- [x] #IMP-100 Tools canvas empty state lacks onboarding guidance — Attempts: 1 — DONE iteration 129, 2026-03-05 (pre-existing implementation at tools-canvas-view.tsx lines 479-506)
  - **Found:** Iteration 128 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx`
  - **What:** Tools canvas shows empty state with no tools — no guidance shown (e.g., 'Add your first tool to start tracking your tech stack'). Only toolbar buttons visible.
  - **Design principle:** Nielsen H6: Recognition rather than recall — empty state should guide users toward first action
  - **Suggested fix:** Add empty state overlay or centered prompt inside the canvas when no tools exist.

- [ ] #IMP-101 Coverage Gaps table lacks section/tab navigation context — Attempts: 0
  - **Found:** Iteration 128 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tool-analysis-view.tsx` — Coverage Gaps card
  - **What:** Coverage Gaps table shows step name and frequency, but no link to navigate to the step's parent section/canvas tab. User must manually find where the step lives.
  - **Design principle:** Nielsen H1: Visibility of system status — user should know where the uncovered step lives
  - **Suggested fix:** Add section/tab context to Coverage Gaps table rows, or make the step button navigate directly to the step on the canvas.

- [ ] #IMP-102 Tool detail panel Step Usage list items not clickable — Attempts: 0
  - **Found:** Iteration 128 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/tool-detail-panel.tsx` — Step Usage list
  - **What:** Step Usage list shows step names as plain text (cursor-default). Users cannot click a step name to navigate to it on the canvas.
  - **Design principle:** Nielsen H1: Visibility of system status + H6: Recognition rather than recall
  - **Suggested fix:** Wrap step names in Link or button with onClick → router.push('/w/workspaceId/tabId'), matching pattern in tool-analysis-view.tsx.

- [x] #IMP-103 PDF Table of Contents may truncate with 12+ sections enabled — Attempts: 1 — DONE iteration 130, 2026-03-05
  - **Found:** Iteration 128 (regression tester)
  - **Category:** Usability
  - **Where:** `src/lib/export/enhanced-pdf-sections.ts` — `renderTableOfContents()` (line ~1349)
  - **What:** TOC uses `break` when y exceeds page height. With 12+ sections enabled, entries may be truncated instead of paginating to a second TOC page.
  - **Design principle:** Nielsen H5: Error prevention
  - **Suggested fix:** Add pdf.addPage() + reset y when TOC entries overflow, similar to newTablePage() pattern in other PDF sections.

- [x] #IMP-104 Tool Analysis toggle button not in toolbar Panel — DONE iteration 133, 2026-03-05 — Attempts: 1
  - **Found:** Iteration 128 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx` — toolbar Panel
  - **What:** Summary sidebar shows Analysis toggle, but it's not in the main toolbar. On smaller screens the sidebar toggle requires scrolling.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Add Analysis button to the toolbar Panel alongside 'Add Tool' and 'Add Tool Section'.

- [x] #IMP-105 Export dialog section availability should be computed dynamically from workspace data — Attempts: 1 — DONE iteration 130, 2026-03-05
  - **Found:** Iteration 129 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — SECTION_GROUPS `available` field
  - **What:** All SECTION_GROUPS entries have `available: true` hardcoded as a static constant. Section availability should be computed dynamically: journeyMap disabled when workspace has no journey tab, improvements disabled when improvementIdeas array is empty, aiInsights disabled when AI analysis hasn't been run, etc. This would make the IMP-094 tooltip feature actually functional.
  - **Design principle:** Nielsen H1: Visibility of system status — users should understand when a section requires prerequisites
  - **Suggested fix:** Accept availability flags as props (hasJourneyTab, hasImprovements, hasAiInsights, hasPerspectives, hasPrioritizationScores, hasTools) and compute `available` per section. Pass from canvas-view.tsx which has access to tabs, improvementIdeas, etc.

- [x] #IMP-106 Preset masked sections info note — DONE iteration 133, 2026-03-05 — Attempts: 1
  - **Found:** Iteration 130 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — preset buttons area
  - **What:** When a preset (e.g. 'Full Audit') is applied and some sections are masked by availability, no visual indication tells the user why the preset didn't enable all expected sections.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Show a small info note under the preset buttons when a preset was applied but some sections were masked, e.g. '3 sections unavailable — add data to unlock them'.

- [x] #IMP-107 Add aria-label to sidebar nav links matching tooltip text — DONE iteration 132, 2026-03-05 (resolved by BUG-045) — Attempts: 0
  - **Found:** Iteration 131 (accessibility audit)
  - **Category:** Accessibility
  - **Where:** `src/components/layout/sidebar.tsx` — all navigation links
  - **What:** Sidebar navigation links use tooltips (likely via CSS :hover) but have no aria-label. Adding aria-label matching the tooltip text would address WCAG violation (BUG-045) and improve the experience for keyboard-only users who never see hover tooltips.
  - **Design principle:** Nielsen H6: Recognition rather than recall — names/labels prevent users from having to remember icon meanings
  - **Suggested fix:** Add `aria-label` to each sidebar link matching its destination name (e.g., `aria-label="Canvas"`, `aria-label="Step List"`, etc.)

- [x] #IMP-108 Dynamic page titles pattern — [Page Name] — [Workspace] — Stride — DONE iteration 133, 2026-03-05 (resolved by BUG-048) — Attempts: 0
  - **Found:** Iteration 131 (accessibility audit)
  - **Category:** Accessibility
  - **Where:** All pages — `<title>` element
  - **What:** Page titles are all identical. Even a simple pattern like '[Page Name] — My Workspace — Stride' would satisfy WCAG 2.4.2 (BUG-048) and dramatically improve usability for users with many tabs open.
  - **Design principle:** Nielsen H1: Visibility of system status — users should always know where they are
  - **Suggested fix:** In each page's server component or layout, set document title dynamically to include workspace name + view name.

- [x] #IMP-109 Wrap workspace name visible label text in label element — DONE iteration 132, 2026-03-05 (resolved by BUG-046) — Attempts: 0
  - **Found:** Iteration 131 (accessibility audit)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/settings/page.tsx` — workspace name input
  - **What:** The workspace name input lacks a `<label>` element. The visible text 'Workspace Name' is rendered as a generic div. Wrapping it in a `<label>` or adding `aria-labelledby` takes one line and fixes the WCAG violation (BUG-046).
  - **Design principle:** WCAG 1.3.1 Info and Relationships
  - **Suggested fix:** Use `htmlFor` on a `<label>` element pointing to the input's id, or add `aria-label="Workspace name"` directly to the input.

- [x] #IMP-110 Add aria-label and title to sidebar footer button — DONE iteration 132, 2026-03-05 (resolved by BUG-047) — Attempts: 0
  - **Found:** Iteration 131 (accessibility audit)
  - **Category:** Usability
  - **Where:** `src/components/layout/sidebar.tsx` — sidebar footer button
  - **What:** The icon-only submit button in the sidebar footer (bottom-left) has no tooltip, no title, and is `type="submit"` which is unusual for a navigation context. Its purpose is not immediately clear. If it's a form submission trigger it should be explicitly labeled.
  - **Design principle:** Nielsen H6: Recognition rather than recall
  - **Suggested fix:** Add `aria-label` and `title` attribute clarifying the button's action; confirm whether `type="submit"` is intentional.

- [ ] #IMP-111 Tools canvas toolbar Analysis button is one-way navigation — Attempts: 0
  - **Found:** Iteration 133 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx` — toolbar Panel
  - **What:** The toolbar Analysis button only shows 'Analysis' because the toolbar Panel is hidden when analysis view is active. Users in analysis view must use the sidebar toggle to return to canvas — no toolbar affordance for the return path.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Either render the toolbar panel inside the analysis view with 'Canvas' button, or accept current behavior since sidebar toggle serves the return path.

- [ ] #IMP-112 Tool Analysis panel transition animation — Attempts: 0
  - **Found:** Iteration 134 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/tools/` — Tool Analysis panel
  - **What:** The Tool Analysis panel opens abruptly with no visual animation or transition. It replaces the canvas summary panel without signaling the state change.
  - **Design principle:** Nielsen H1: Visibility of system status — transitions should signal state changes
  - **Suggested fix:** Add a fade-in or slide-in animation to the analysis panel.

- [ ] #IMP-113 PDF export preset buttons should show section contents on hover — Attempts: 0
  - **Found:** Iteration 134 (acceptance tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — preset buttons
  - **What:** The PDF export preset buttons (Executive Summary, Full Audit, Gap Report) do not show which sections each preset selects before clicking. User must click each to discover the preset configuration.
  - **Design principle:** Nielsen H6: Recognition rather than recall — show preset contents on hover
  - **Suggested fix:** Add a tooltip or description below each preset button listing the sections it includes.

- [ ] #IMP-114 AI Regenerate button disabled state needs explanatory tooltip — Attempts: 0
  - **Found:** Iteration 134 (regression tester)
  - **Category:** Usability
  - **Where:** `src/app/(app)/w/[workspaceId]/ai-analysis/` — Regenerate button
  - **What:** The Regenerate button is disabled when hasSteps=false but only shows cursor:not-allowed with no explanation of why.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Add tooltip: 'Add steps to the canvas before running AI analysis'.

- [ ] #IMP-115 Perspectives comparison table missing aria-label — Attempts: 0
  - **Found:** Iteration 134 (regression tester)
  - **Category:** Accessibility
  - **Where:** `src/app/(app)/w/[workspaceId]/compare/perspectives-compare-view.tsx` — comparison table (~line 388)
  - **What:** Same missing aria-label pattern as gap analysis and tool analysis tables.
  - **Design principle:** WCAG 2.2 1.3.1 Info and Relationships
  - **Suggested fix:** Add `aria-label="Perspectives comparison"` to the table element.

- [ ] #IMP-116 PDF custom mode disabled section guidance — Attempts: 0
  - **Found:** Iteration 134 (regression tester)
  - **Category:** Usability
  - **Where:** `src/components/panels/export-pdf-dialog.tsx` — custom mode
  - **What:** The maskedCount unavailability hint only appears when using a named preset. In custom mode, disabled sections have individual tooltips but there's no top-level guidance about why certain sections remain disabled.
  - **Design principle:** Nielsen H1: Visibility of system status
  - **Suggested fix:** Verify individual disabled tooltips are visible on hover/focus in browser. If so, no change needed.

## Logged
<!-- Processed improvements with iteration and resolution -->
