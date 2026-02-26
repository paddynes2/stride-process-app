# Decisions

> Appended when agent makes a non-trivial choice. Captures reasoning for future iterations.

---

## D-001 — Parallel tables for journey canvas data model (Iteration 32)
**Context:** FEAT-017 requires adding journey mapping alongside process mapping. Needed to decide whether to extend existing sections/steps tables with a discriminator or create parallel stages/touchpoints tables.
**Options:**
- A: Add journey-specific columns (channel, owner, pain_score, gain_score, sentiment, customer_emotion) to existing sections/steps tables + `canvas_type` discriminator on tabs. Simpler, less code.
- B: Create new `stages` and `touchpoints` tables (+ `touchpoint_connections`) with journey-specific columns only, plus `canvas_type` discriminator on tabs. More code but clean separation.
**Decision:** Option B — parallel tables. Steps and touchpoints have fundamentally different column sets (steps: status, executor, time_minutes, frequency, maturity; touchpoints: pain, gain, sentiment, emotion). Adding 6+ nullable columns to steps would be confusing and hard to reason about.
**Trade-off:** More CRUD code, more API routes, more RLS policies. But this is bounded duplication (known patterns) not conceptual complexity. Each table stays clean and independently extensible for future journey-specific features (FEAT-020 heat map, FEAT-021 comparison view).
