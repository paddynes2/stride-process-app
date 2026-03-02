# Decisions Log — Stride

<!-- Non-trivial implementation choices. Append-only. -->

## D-001 — Normalized schema over JSONB blobs (Phase 0)
**Context:** Canvas data (steps, sections, connections) needed to be stored in Supabase
**Options:** (A) Single JSONB column per tab with all canvas state, (B) Normalized tables per entity
**Decision:** Normalized tables — each step/section/connection is an individual row
**Trade-off:** More complex queries and more API routes, but better RLS, indexing, and partial updates

## D-002 — Polymorphic annotations for perspectives (Phase 2b, Iteration 49)
**Context:** Perspectives need to annotate steps, sections, touchpoints, and stages
**Options:** (A) Separate junction table per entity type, (B) Polymorphic (annotatable_type, annotatable_id)
**Decision:** Polymorphic — single `perspective_annotations` table with type+id columns
**Trade-off:** No foreign key enforcement on annotatable_id, but simpler schema and API

## D-003 — Reuse annotatable_type enum for comments (Phase 4, Iteration 71)
**Context:** Comments target the same entity types as annotations (step/section/touchpoint/stage)
**Options:** (A) Create new `commentable_type` enum with same values, (B) Reuse existing `annotatable_type` enum
**Decision:** Reuse `annotatable_type` — comments table uses the same Postgres enum
**Trade-off:** Tight coupling between comments and annotations at the DB level, but avoids duplicating identical enum values. If comment targets ever diverge from annotation targets, a migration would be needed.

## D-004 — CommentCountsContext over prop-drilling (Phase 4, Iteration 74)
**Context:** Comment count badges needed on 4 canvas node types. FlowCanvas (`flow-canvas.tsx`) is not owned by FEAT-045 (shared component) — cannot add commentCounts prop to it.
**Options:** (A) Modify FlowCanvas to pass commentCounts through (ownership violation), (B) React Context consumed directly by node components
**Decision:** React Context — `CommentCountsContext` exported from `canvas.ts`, provided by canvas views, consumed by node components
**Trade-off:** Bypasses FlowCanvas prop chain, making the data flow less explicit. But avoids ownership violation and prop-drilling through a shared component.

## D-005 — runbook_steps RLS via EXISTS subquery (Phase 4, Iteration 80)
**Context:** runbook_steps table has no workspace_id column (only runbook_id FK). RLS policies need workspace access verification.
**Options:** (A) Add workspace_id column to runbook_steps (denormalization), (B) EXISTS subquery joining through runbooks table to check workspace_id
**Decision:** EXISTS subquery — `EXISTS (SELECT 1 FROM runbooks r WHERE r.id = runbook_steps.runbook_id AND can_access_workspace(r.workspace_id))`
**Trade-off:** Slightly slower queries due to join, but maintains normalized schema. Same pattern used by tasks (step → section → workspace) and annotations (polymorphic).

## D-006 — Fixed overlay for Playbook mode instead of workspace-shell modification (Phase 4, Iteration 86)
**Context:** Playbook mode needs distraction-free display (no sidebar, header, or tab bar visible). Page is nested under runbooks/[runbookId]/playbook/ which inherits workspace shell layout.
**Options:** (A) Modify workspace-shell.tsx to conditionally hide shell UI when on /playbook path — requires hook-order awareness and reserved path handling, (B) Fixed full-viewport overlay (position: fixed, inset: 0, z-50) in PlaybookView that covers the workspace shell visually
**Decision:** Fixed overlay — PlaybookView renders `position: fixed; inset: 0; z-index: 50; bg-[var(--surface)]` covering everything beneath it. No workspace-shell.tsx changes needed.
**Trade-off:** Shell components (sidebar, header, tab bar) still render in the DOM beneath the overlay (wasted render cycles), but this avoids hook-order issues, reserved path logic, and coupling between PlaybookView and workspace-shell. Simpler, safer, and zero risk of breaking the shell for other routes.
