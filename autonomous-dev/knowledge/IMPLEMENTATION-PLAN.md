# Implementation Plan

> THE ROADMAP. Human seeds this; agent amends as reality diverges.
> The agent reads this EVERY iteration to know what phase it's in,
> what's next, and why things are ordered the way they are.

---

## How This Document Works

**Human:** Seed the phases before starting the loop. Define the big picture:
what gets built first, what depends on what, rough iteration estimates.

**Agent:** Follow the phase order. Pick tasks from the PRD that align with the
current phase. When reality diverges (a phase takes longer, a dependency is
missing, phases need reordering), AMEND this document and record why.

### Built-In Cadences

The following are NOT phases — they're recurring activities woven into the loop:

- **Regression testing** — risk-based (see PROMPT.md Phase 2), minimum every 8th iteration
- **Knowledge cleanup** — Every 15 iterations, consolidate LEARNINGS.md, prune stale AGENTS.md entries
- **Retrospective** — Every 10th iteration (PROMPT.md Phase 6.5)

---

## Current Phase: Phase 2a — Journey Mapping (IN PROGRESS — FEAT-021 [2/3] DONE iter 43, [3/3] alignment hints next)

<!-- Agent: update this line every iteration to reflect where you are. -->

---

## Background

Phase 0 (Foundation) is COMPLETE. A user can:
- Sign up / log in (email + password via Supabase Auth)
- Create workspaces
- Map processes on an infinite canvas (React Flow): sections, steps, connectors
- View/edit step details (name, status, type, notes via TipTap rich text, video embed)
- View/edit section details (name, summary)
- Manage tabs within a workspace
- Switch between canvas view and list view
- Navigate: workspace list → workspace → canvas/list

The app is deployed at https://stride-five-sigma.vercel.app

---

## Phases

### Phase 1: The Consulting Deliverable
**Status:** DONE (9/9 tasks complete, iteration 19)
**Depends on:** Phase 0 (DONE)
**Estimated iterations:** 25-35
**Actual iterations:** 19 (iterations 1-19)
**Goal:** A consultant can deliver a scored, exportable process audit to a client. First monetizable value.

Tasks (in priority order):
1. [x] Maturity scoring — 1-5 rating on steps/sections, roll-up averages, color-coded heat map on canvas
2. [x] Gap analysis view — current vs target maturity, ranked by gap size, filterable
3. [x] Process costing (basic) — time-to-complete + frequency + hourly rate per step, section/workflow cost roll-ups
4. [x] Teams canvas (basic) — team → roles → people data model, hourly rate per role
5. [x] Step-role assignment — connect roles to steps (drives costing calculations)
6. [x] Export PDF — canvas + sidebar summary data as downloadable PDF
7. [x] Export PNG — canvas snapshot as downloadable image
8. [x] Public/shareable views — data layer, settings UI, and public read-only page complete

**Exit criteria:**
- A consultant can map a process, score maturity on every step, see gap analysis
- Cost calculations work (labor cost per step based on role hourly rates)
- PDF and PNG exports produce professional deliverables
- A shareable link lets clients view the process map without logging in

**Notes:**
- Maturity scoring before gap analysis (gap requires scores to exist)
- Teams canvas before step-role assignment (roles must exist to be assigned)
- Costing depends on both step data and role hourly rates
- Export and public views are the final layer — everything must work before these

---

### Phase 1.5: Ship & Harden
**Status:** DONE (7/7 tasks complete, iteration 31)
**Depends on:** Phase 1 (DONE)
**Estimated iterations:** 10-15
**Actual iterations:** 12 (iterations 20-31)
**Goal:** Make Stride production-ready. Fix known issues, polish rough edges, prepare for real users. No new features — just quality.

**Why this phase exists:** Phase 1 built features fast. 8 accessibility bugs were found (BUG-002 through BUG-009), and the agent accumulated improvement observations during testing. Before adding more features, the product needs hardening for real users.

Tasks (in priority order):
1. [x] Fix all 8 open accessibility bugs (BUG-002 through BUG-009) — contrast, labels, touch targets, headings, focus indicators
2. [x] Empty states & onboarding — first workspace experience, helpful empty states on canvas/gap/teams/list views, "getting started" guidance — DONE iteration 23
3. [x] Loading & error states — skeleton loaders on all data-fetching pages, error boundaries, retry affordances — DONE iteration 26
4. [x] Performance pass — bundle analysis, lazy loading for heavy deps (jspdf, tiptap), image check — DONE iteration 27
5. [x] Work through IMPROVEMENTS.md backlog — agent-discovered UX wins from Phase 1 testing — DONE iteration 29
6. [x] Responsive sanity check — key flows work on tablet (1024px). Not mobile-first, but not broken. — DONE iteration 30
7. [x] End-to-end golden path test — full consultant workflow: create workspace → map process → score maturity → assign roles → export PDF → share link — DONE iteration 31

**Exit criteria:**
- Zero P1+ bugs open
- IMPROVEMENTS.md backlog < 3 items remaining
- Full golden path works without errors
- Loading states on all async pages
- Accessibility audit score > 90 (Lighthouse)
- UX quality gate: `__auditStateCoverage()` returns 3/5+ on all workspace pages (loading, empty, error minimum)
- Design token compliance: `__auditDesignTokens()` returns 0 violations on all pages
- Microcopy pass: all button labels action-specific, no generic "Submit"/"OK" remaining

**Notes:**
- This is a stabilization phase, NOT a feature phase. Resist adding new capabilities.
- The golden path test (task 7) should be run every iteration as a regression gate.
- Fix bugs in severity order: P1 first (BUG-002 through BUG-006), then P2 (BUG-007 through BUG-009).
- Run one UX sweep during this phase (after bugs are fixed) to catch polish issues missed during feature work.

---

### Phase 2a: Journey Mapping
**Status:** IN PROGRESS (started iteration 32)
**Depends on:** Phase 1.5 (DONE)
**Estimated iterations:** 20-25
**Goal:** Add customer journey mapping alongside process mapping. Consultants can now map both internal processes AND customer experiences.

**Why journey mapping first:** It's the highest-value addition — consultants already sell journey mapping as a separate deliverable. This doubles the use cases Stride can handle. Everything else in Phase 2 builds on top of journey data.

Tasks (in priority order):
1. [ ] Journey canvas type — new canvas type (journey vs process), stages instead of sections, touchpoints instead of steps
2. [ ] Stage detail panel — stage name, description, channel (web/phone/email/in-person), owner
3. [ ] Touchpoint detail panel — pain/gain scoring (1-5), sentiment (positive/neutral/negative), customer emotion, notes
4. [ ] Journey heat map — sentiment-colored touchpoints, pain point highlighting
5. [ ] Internal vs external comparison — side-by-side view of process canvas and journey canvas, gap highlighting between what the company does and what the customer experiences
6. [ ] Journey-specific export — journey map PDF with sentiment summary, pain point ranking

**Exit criteria:**
- A consultant can create a journey canvas and map a customer experience with touchpoints
- Pain/gain scoring works on touchpoints with visual heat map
- Journey can be exported as a standalone PDF
- Side-by-side comparison of process and journey canvases works

**Notes:**
- Journey mapping reuses the existing canvas infrastructure (React Flow). Stages ~ Sections, Touchpoints ~ Steps.
- New DB tables: `journeys`, `stages`, `touchpoints` (or extend existing tables with a `canvas_type` discriminator).
- The comparison view is the killer feature — it shows gaps between internal operations and customer experience.

---

<!-- ═══════════════════════════════════════════════════════════════════════
     PHASE 2b/2c/3 DETAILED SPECS BELOW — Added by human.
     Agent: DO NOT delete or rewrite these sections. Only update task checkboxes
     and status fields as you complete work. The detailed FEAT entries are in FEATURES.md.
     ═══════════════════════════════════════════════════════════════════════ -->

### Phase 2b: Analysis & Intelligence
**Status:** Not started
**Depends on:** Phase 2a
**Estimated iterations:** 20-25
**Goal:** Layer analysis tools on top of process and journey data. Move from "document what exists" to "reveal what's broken and where perceptions diverge." Introduce AI where it adds clear consulting value.

Tasks (in priority order — detailed specs in FEATURES.md):
1. [ ] Perspectives data model + UI shell (FEAT-023) — perspectives table, annotations table, types, API, management UI
2. [ ] Perspective annotation UI (FEAT-024) — perspective switcher, annotation panel on elements, visual indicators
3. [ ] Perspective comparison view (FEAT-025) — side-by-side table, divergence highlighting, summary stats
4. [ ] Prioritization matrix (FEAT-026) — effort/impact scores on steps/touchpoints, quadrant visualization
5. [ ] Improvement ideas tracker (FEAT-027) — improvement_ideas table, CRUD, kanban view, link to source elements
6. [ ] AI process analysis (FEAT-028) — Anthropic API integration, structured analysis from workspace data, result cards UI
7. [ ] AI gap narrative (FEAT-029) — generate consulting-quality gap summary text, copy-to-clipboard, PDF inclusion
8. [ ] AI improvement suggestions (FEAT-030) — AI-generated suggestions → create as improvement ideas
9. [ ] Phase 2b quality pass (FEAT-031) — full regression + new feature verification

**Exit criteria:**
- Multiple stakeholder perspectives can be captured and compared on the same process map
- Divergence between perspectives is highlighted and quantified
- Prioritization matrix helps consultants rank recommendations by effort and impact
- AI analysis produces useful (not generic) insights grounded in actual process data
- Improvement ideas can be created, tracked, and linked to process elements
- Type check, lint, build pass. No console errors on new pages.

**Notes:**
- AI features use Claude API via fetch() to `https://api.anthropic.com/v1/messages`. Use `claude-sonnet-4-5-20250514` for cost efficiency. ANTHROPIC_API_KEY stored server-side in .env.local.
- Perspectives are annotations on existing elements, NOT separate canvases — polymorphic via annotatable_type + annotatable_id.
- The perspective comparison view is the key insight from the consultant transcript — reveals where leaders and teams disagree.
- Prioritization matrix position is computed from scores, not drag-to-reposition.

---

### Phase 2c: Tools Canvas & Enhanced Export
**Status:** Not started
**Depends on:** Phase 2b
**Estimated iterations:** 20-25
**Goal:** Complete the consulting toolkit with technology mapping and professional multi-section exports. After this phase, all data capture and analysis tools are in place.

Tasks (in priority order — detailed specs in FEATURES.md):
1. [ ] Tools data model (FEAT-032) — tools, tool_sections, step_tools tables, enums, types, API routes
2. [ ] Tools canvas page (FEAT-033) — React Flow canvas with tool nodes, tool section nodes, cost summary
3. [ ] Tool detail panel (FEAT-034) — editable fields, step usage backlinks, cost display
4. [ ] Step-tool assignment (FEAT-035) — tools section on step detail panel, tool badges, cost integration
5. [ ] Tool overlap and gap analysis (FEAT-036) — overlapping tools, unused tools, coverage gaps, spend summary
6. [ ] Enhanced PDF export (FEAT-037) — export dialog with section toggles, 12 report sections, presets (Full Audit, Executive Summary, Gap Report)
7. [ ] Phase 2c quality pass (FEAT-038) — full regression + tools + PDF verification

**Exit criteria:**
- Tools can be mapped on a dedicated canvas with cost tracking
- Tools can be assigned to process steps, with tool costs factored into step cost calculations
- Tool overlap/gap analysis identifies redundancies and coverage gaps
- Enhanced PDF export produces a complete, professional multi-section consulting deliverable
- Export presets available for different audiences (full audit, executive summary, gap report)
- Type check, lint, build pass. No console errors on new pages.

**Notes:**
- Tools canvas is a single canvas per workspace (not tab-based like process/journey).
- Tool cost aggregation: monthly costs roll up directly, annual costs ÷ 12 for monthly view, one-time excluded from recurring totals.
- Enhanced PDF is the "crown jewel" — what consultants hand to clients. Builds on existing jspdf infrastructure with modular render functions per section.
- Step cost = labor cost + sum of tool monthly costs for assigned tools.

---

### Phase 3: The Living Playbook
**Status:** Not started
**Depends on:** Phase 2c
**Estimated iterations:** 30-40
**Goal:** Process map becomes executable. Consultant's client becomes a paying user. Shift from "analyze and report" to "execute and track."

Tasks (in priority order — detailed specs in FEATURES.md):
1. [ ] Comments system (FEAT-039) — comments table with categories (note/decision/pain_point/idea/question), threading, resolve, comment panel on detail panels, workspace aggregation view
2. [ ] Tasks system (FEAT-040) — step-level checklists, completion toggle, drag-to-reorder, section rollup, canvas count indicator
3. [ ] Runbook instances (FEAT-041) — launch section as executable checklist, runbook_steps table, linear view, progress tracking, "Run as Checklist" button
4. [ ] Playbook mode (FEAT-042) — distraction-free step-by-step execution view, "Mark Complete & Next", mobile-responsive, URL-shareable
5. [ ] Activity log (FEAT-043) — activity_log table, logActivity() utility called from API routes, chronological list with filtering/pagination
6. [ ] Workspace cloning (FEAT-044) — deep copy via SECURITY DEFINER RPC, preserves internal relationships, new UUIDs
7. [ ] Conditional step coloring (FEAT-045) — coloring_rules table, rule evaluation engine, paintbrush panel, real-time canvas tinting
8. [ ] Section templates (FEAT-046) — save section as JSONB snapshot, template browser, deploy template to new section, pre-built starters
9. [ ] Phase 3 quality pass (FEAT-047) — full regression across all phases + new feature verification

**Exit criteria:**
- Consultant delivers engagement → client runs playbooks → completion data flows back
- Comments enable collaboration during consulting workshops
- Tasks provide actionable checklists at the step level
- Runbooks turn static process maps into executable workflows
- Activity log provides full audit trail
- Workspace cloning enables consultant framework reuse
- Conditional coloring provides at-a-glance visual analysis
- Templates accelerate new engagement setup
- Type check, lint, build pass. No console errors on any page.

**Notes:**
- Comments/tasks are the collaboration backbone — keep them simple (no @mentions or notifications until Phase 4).
- Runbook steps are snapshots copied from the section at creation time — they don't change if the process map is updated.
- Playbook mode is the upsell from Consultant tier to Team tier (per ROADMAP.md pricing).
- Workspace cloning uses a Supabase RPC function for atomicity (map old IDs → new IDs in a single transaction).
- Templates store JSONB snapshots; role/tool assignments matched by name on deploy (not by ID).

---

## Phase Summary

| Phase | Name | Goal | Est. Iterations | Depends On | Status |
|-------|------|------|-----------------|------------|--------|
| 1 | Consulting Deliverable | Scored, exportable process audit | 25-35 | Phase 0 (DONE) | **DONE** (19 iters) |
| 1.5 | Ship & Harden | Production quality, zero P1 bugs | 10-15 | Phase 1 | **DONE** (12 iters) |
| 2a | Journey Mapping | Customer experience mapping | 20-25 | Phase 1.5 | **IN PROGRESS** |
| 2b | Analysis & Intelligence | Perspectives, prioritization, AI | 20-25 | Phase 2a | Not started |
| 2c | Tools & Enhanced Export | Tool mapping, professional reports | 20-25 | Phase 2b | Not started |
| 3 | Living Playbook | Executable processes | 30-40 | Phase 2c | Not started |

**Completed iterations:** 40 (Phase 1: 19, Phase 1.5: 12, Phase 2a: 9 so far)
**Remaining iterations (est.):** 75-100 (Phase 2a remainder: ~5, Phase 2b: 20-25, Phase 2c: 20-25, Phase 3: 30-40)
**Total features:** 47 (FEAT-001 through FEAT-047)

---

## Amendments

<!-- Agent: record EVERY change to the plan here. -->
<!-- Format: - [YYYY-MM-DD] Iteration [N]: [what changed and why] -->
- [2026-02-26] Iteration 1: Completed FEAT-001 (maturity scoring data model + UI). Phase 1 task 1 of 8 done.
- [2026-02-26] Iteration 2: Regression pass (risk score 5). Found/fixed BUG-001 (TipTap SSR crash). FEAT-001 browser-verified. Baseline established for all pages.
- [2026-02-26] Iteration 3: Completed FEAT-002 (section maturity roll-up + heat map). Phase 1 task 2 of 8 done. No schema changes needed — all computed client-side.
- [2026-02-26] Iteration 4: Completed FEAT-003 (gap analysis view). Phase 1 task 3 of 8 done. New route, no schema changes. Core consulting deliverable in place.
- [2026-02-26] Iteration 5: FEAT-004 (process costing) was already in base codebase — marked done. Completed FEAT-005 [1/3] (teams/roles/people data layer). Decomposed FEAT-005 into 3 sub-tasks. Phase 1 tasks 4-5 progressing (4 done, 5 partially done).
- [2026-02-26] Iteration 6: Regression + data integrity pass (risk score 5 from schema changes). All 9 pages clean, full CRUD round-trip on teams/roles/people verified. No regressions.
- [2026-02-26] Iteration 7: Completed FEAT-005 [2/3] (teams page UI). Team list with expandable cards, team/role CRUD, inline editing, hourly rate input. Sub-task [3/3] (people CRUD) remains.
- [2026-02-26] Iteration 8: Completed FEAT-005 [3/3] (people CRUD). Phase 1 task 5 of 8 done. Teams/roles/people fully functional. Next: FEAT-006 (step-role assignment + cost calculation).
- [2026-02-26] Iteration 9: Completed FEAT-006 [1/3] (step_roles data layer). Migration 009, types, API routes, client wrappers. Decomposed FEAT-006 into 3 sub-tasks. Sub-task [2/3] (UI) and [3/3] (cost calc) remain.
- [2026-02-26] Iteration 10: Accessibility + regression testing (cadence trigger). 8 a11y bugs found (BUG-002 through BUG-009). Regression sweep clean — 0 regressions across 7 pages. No code changes.
- [2026-02-26] Iteration 11: Completed FEAT-006 [2/3] (step detail panel role assignment UI). Dropdown grouped by team, badges with remove. Sub-task [3/3] (cost calculation) remains.
- [2026-02-26] Iteration 12: Completed FEAT-006 [3/3] (cost calculation). Phase 1 task 6 of 8 done (tasks 1-6 all complete). Cost displays in step panel, section panel, and workspace summary. Batch step-roles API added. Workspace summary panel now always visible.
- [2026-02-26] Iteration 13: FEAT-007 [1/3] complete (PDF export core). Installed jspdf + html-to-image, created export utility with title page, canvas snapshot, step table. Decomposed FEAT-007 into 3 sub-tasks. Sub-tasks [2/3] (gap + cost summary) and [3/3] (polish) remain.
- [2026-02-26] Iteration 14: FEAT-007 [2/3] complete (gap analysis + cost summary PDF pages). Gap page with summary cards + ranked table with bars. Cost page with totals + section breakdown + top 5 steps. Sub-task [3/3] (polish) remains.
- [2026-02-26] Iteration 15: FEAT-007 [3/3] complete (PDF polish). Table headers repeat on overflow pages, extracted helpers. Phase 1 tasks 1-7 of 8 done. Next: FEAT-008 (Export PNG) or FEAT-009 (Public shareable views).
- [2026-02-26] Human restructured roadmap: Split Phase 2 into 2a/2b/2c, added Phase 1.5 (Ship & Harden), deferred Phase 3 until user demand, pulled AI features into Phase 2b. Rationale: Phase 2 was too large (30-40 iterations as monolith), Phase 1.5 addresses 8 known a11y bugs and quality debt before adding features, AI adds clear consulting value in analysis phase.
- [2026-02-26] Iteration 16: FEAT-008 complete (Export PNG). Phase 1 tasks 1-8 of 8 done (all P0/P1 features + FEAT-008 P2). Only FEAT-009 (Public shareable views, P2) remains in Phase 1.
- [2026-02-26] Iteration 17: FEAT-009 [1/3] complete (public shares data layer). Migration 010, PublicShare type, authenticated CRUD API routes, unauthenticated public data route (SECURITY DEFINER RPC), client wrappers, middleware /public path. Fixed plan checkmarks (items 7/8 were inverted). Sub-tasks [2/3] (settings UI) and [3/3] (public page) remain.
- [2026-02-26] Iteration 18: FEAT-009 [2/3] complete (settings share UI). Public Sharing section in workspace settings: enable/disable toggle, URL display, copy-to-clipboard. Sub-task [3/3] (public read-only page) remains — last task in Phase 1.
- [2026-02-26] Iteration 19: FEAT-009 [3/3] complete (public read-only view). **PHASE 1 COMPLETE** — all 9 tasks done in 19 iterations (estimated 25-35). Public page at /public/[shareId] with read-only canvas, heat map, tab switcher. Moving to Phase 1.5 (Ship & Harden).
- [2026-02-26] Iteration 20: Regression pass (cadence — overdue, gap 10 iterations). 0 regressions found. All changes since iter 10 are additive. Phase 1.5 status updated to IN PROGRESS. Baseline reset for Phase 1.5 work.
- [2026-02-26] Iteration 21: Fixed all 8 accessibility bugs (BUG-002 through BUG-009). Phase 1.5 task 1 of 7 complete. 11 files changed across button, sidebar, header, tab-bar, panels, gap-analysis, teams, list, and workspaces. All P1 bugs now resolved. Zero open bugs.
- [2026-02-26] Iteration 22: FEAT-011 [1/2] complete (empty state UIs). Canvas empty state overlay with action buttons. List view empty state card replaces bare table. Gap analysis and teams already had good empty states. Decomposed: [2/2] Getting Started template remains. Phase 1.5 task 2 partially done.
- [2026-02-26] Iteration 23: FEAT-011 [2/2] complete (Getting Started template). New workspaces auto-seed a section with 3 connected example steps via POST /api/v1/workspaces. Phase 1.5 task 2 of 7 fully done.
- [2026-02-26] Iteration 24: FEAT-012 [1/3] complete (skeleton + error boundaries + loading.tsx). Decomposed FEAT-012 into 3 sub-tasks. Created Skeleton component, 2 error boundaries, and 6 loading.tsx files. Phase 1.5 task 3 in progress.
- [2026-02-26] Iteration 25: FEAT-012 [2/3] complete (offline banner + retry toasts). OfflineBanner component (useSyncExternalStore), toastError utility with retry action buttons. 23 of 24 toast.error calls updated across 8 files. All 4 acceptance criteria now met. Sub-task [3/3] polish remains.
- [2026-02-26] Iteration 26: FEAT-012 [3/3] complete (polish + verification). Added loading.tsx for /public/[shareId]. Verified all 7 loading.tsx files, 2 error boundaries, offline banner, toast helpers. FEAT-012 fully DONE. Phase 1.5 task 3 of 7 complete.
- [2026-02-26] Iteration 27: FEAT-013 complete (performance pass). Lazy-loaded jspdf (420KB) and tiptap/prosemirror (356KB) via dynamic imports. 832KB removed from initial canvas page load. Gap analysis and teams already code-split by App Router. All images < 100KB. Lighthouse criterion deferred (needs browser). Phase 1.5 task 4 of 7 complete.
- [2026-02-26] Iteration 29: FEAT-014 complete (IMPROVEMENTS.md backlog). Both IMP-001 (export hook extraction) and IMP-002 (maturity constants extraction) done in single iteration. Created `src/lib/maturity.ts` and `src/hooks/use-canvas-export.ts`. Phase 1.5 task 5 of 7 complete.
- [2026-02-26] Iteration 30: FEAT-015 complete (responsive sanity check). Auto-collapse sidebar at ≤1280px, reduce panel width, responsive summary card grids, table horizontal scroll. Phase 1.5 task 6 of 7 complete. Only golden path test remains.
- [2026-02-26] Iteration 31: FEAT-016 complete (golden path test). All 10 steps of consultant workflow verified via static code tracing (3 parallel agents). **PHASE 1.5 COMPLETE** — 7/7 tasks done in 12 iterations (estimated 10-15). Moving to phase completion testing before Phase 2a.
- [2026-02-26] Iteration 32: **Phase 2a started.** FEAT-017 [1/4] complete (data model + types). Decision D-001: parallel tables for journey canvas. Migration 011 pushed. FEAT-017 decomposed into 4 sub-tasks. Also fixed FEAT-010 status (was showing pending, actually done iter 21).
- [2026-02-26] Iteration 33: FEAT-017 [2/4] complete (API routes + client wrappers). 6 route files, 9 client functions. Journey data layer fully operational. Sub-tasks [3/4] tab type UI and [4/4] canvas rendering remain.
- [2026-02-26] Iteration 35: FEAT-017 [3/4] complete (tab type UI + routing). Dropdown for process/journey tab creation, type icons on tabs, page.tsx routes by canvas_type to CanvasView or JourneyCanvasView. Only [4/4] canvas rendering remains.
- [2026-02-26] Iteration 36: **FEAT-017 DONE** (all 4/4 sub-tasks complete). Journey canvas rendering with React Flow — stage-node.tsx, touchpoint-node.tsx, full CRUD + keyboard shortcuts. 5 iterations total for FEAT-017 (iter 32-36). Next: FEAT-018 stage detail panel.
- [2026-02-26] Iteration 37: FEAT-018 complete (stage detail panel). Mirrors section-detail-panel pattern: name, channel, owner, description (TipTap), touchpoint summary, delete. Next: FEAT-019 touchpoint detail panel.
- [2026-02-26] Iteration 38: FEAT-019 complete (touchpoint detail panel). Mirrors stage-detail-panel: name, sentiment toggle, pain/gain scores, emotion, notes (TipTap). Next: FEAT-020 journey heat map.
- [2026-02-26] Iteration 39: FEAT-020 complete (journey heat map). Pain score coloring with stage roll-up. Created pain.ts constants. Mirrors process canvas heat map exactly. Next: FEAT-021 comparison view.
- [2026-02-26] Iteration 40: UX sweep (cadence trigger). Reviewed 4 pages + 2 comparison pages. Found 2 P2 a11y bugs (BUG-010, BUG-011: text-quaternary used for functional content) and 6 improvements (IMP-003 through IMP-008). Retrospective completed. Next: FEAT-021 or BUG-010/011.
- [2026-02-26] Iteration 41: FEAT-021 [1/3] complete (comparison view shell). New /compare route, sidebar nav, side-by-side layout with stats summaries, server-side data fetching for both canvas types. Decomposed into 3 sub-tasks. [2/3] read-only canvases and [3/3] alignment hints remain. Human added Phase 2b/2c/3 detailed specs to FEATURES.md and IMPLEMENTATION-PLAN.md.
- [2026-02-26] Iteration 43: FEAT-021 [2/3] complete (read-only React Flow canvases). Replaced stats summaries with dual ReactFlow instances in compare-view.tsx. Process canvas left, journey canvas right. Reused all 4 existing node types. Only [3/3] alignment hints remain.
