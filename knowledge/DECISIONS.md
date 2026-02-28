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
