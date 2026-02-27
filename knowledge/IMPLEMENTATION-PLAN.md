# Implementation Plan — Stride
<!-- Updated: iter-57, 2026-02-26 -->

## Phase 0: Core Canvas MVP — DONE
**Iterations:** 1-7 (approx)
- [x] Auth (Supabase login/signup/OAuth)
- [x] Database schema (users, orgs, workspaces, tabs, sections, steps, connections)
- [x] RLS policies
- [x] CRUD API routes
- [x] React Flow canvas with step/section nodes
- [x] Detail panels (step, section, workspace summary)
- [x] Rich text editor (TipTap)
- [x] Video embed
- [x] Workspace shell (sidebar, header, tab bar)

## Phase 1: Analysis & Export — DONE
**Iterations:** 8-20 (approx)
- [x] #FEAT-001 Maturity scoring data model + UI
- [x] #FEAT-002 Section maturity roll-up + canvas heat map
- [x] #FEAT-003 Gap analysis view
- [x] #FEAT-005 Teams, roles, people (data model, API, UI)
- [x] #FEAT-006 Step-role assignments + cost calculations
- [x] #FEAT-007 PDF export (canvas + data table + gap analysis + cost)
- [x] #FEAT-008 PNG export
- [x] #FEAT-009 Public sharing (data layer, settings UI, read-only view)

## Phase 1.5: Polish & Hardening — DONE
**Iterations:** 21-31
- [x] #BUG-002 through #BUG-009 Accessibility fixes (8 bugs)
- [x] #FEAT-011 Empty states (canvas, list views, getting started template)
- [x] #FEAT-012 Loading states (skeletons, error boundaries, offline banner)
- [x] #FEAT-013 Lazy-load heavy deps (jspdf, tiptap)
- [x] #FEAT-014 Extract shared maturity constants + canvas export hook
- [x] #FEAT-015 Responsive sanity check (1024px)
- [x] #FEAT-016 Golden path verification

## Phase 2a: Journey Canvas — DONE
**Iterations:** 32-48
- [x] #FEAT-017 Journey canvas data model + API + rendering (4 sub-tasks)
- [x] #FEAT-018 Stage detail panel
- [x] #FEAT-019 Touchpoint detail panel
- [x] #FEAT-020 Journey heat map (pain score coloring)
- [x] #FEAT-021 Comparison view (3 sub-tasks)
- [x] #FEAT-022 Journey canvas PDF/PNG export (2 sub-tasks)
- [x] #BUG-010 #BUG-011 WCAG AA text-quaternary fixes

## Phase 2b: Perspectives — DONE
**Iterations:** 49-57
- [x] #FEAT-023 Perspectives data model + API + management UI (3 sub-tasks)
- [x] #FEAT-024 Perspective annotations + canvas indicators (3 sub-tasks)
- [x] Phase 2b completion testing: regression suite — DONE iteration 56
- [x] Phase 2b completion testing: quality audit — DONE iteration 57 (5 bugs, 5 improvements logged)

## Phase 3: Advanced Features — IN PROGRESS
**Target iterations:** 63+
**Depends on:** All bugs resolved (BUG-012 through BUG-016 fixed in iterations 58-62)

Prioritized features:
- [x] #FEAT-027 Dashboard / workspace overview page — DONE iteration 63
- [x] #FEAT-028 Search & filtering across all entity types — DONE iteration 69
  - [x] [1/2] Search & filter for People and Tools views — DONE iteration 68
  - [x] [2/2] Search & filter for Teams view — DONE iteration 69
- [x] #FEAT-029 People page (flesh out stub) — DONE iteration 65
- [x] #FEAT-030 Tools page (flesh out stub) — DONE iteration 67
  - [x] [1/2] Data model + types + API routes + client functions — DONE iteration 66
  - [x] [2/2] Tools page UI (CRUD view, remove sidebar stub badge) — DONE iteration 67
- [ ] #FEAT-031 Step list bulk actions — **DEFERRED** (per human feedback)
- [ ] #FEAT-032 Workspace templates — **DEFERRED** (per human feedback)

## Phase 3a: Analysis Intelligence — PENDING
**Target iterations:** 70+
**Depends on:** Human course correction processed

Core consulting insight features:
- [ ] #FEAT-033 Perspective comparison view
- [ ] #FEAT-034 Prioritization matrix (effort/impact scoring + quadrant chart)
- [ ] #FEAT-035 Improvement ideas tracker (proposals → approval → completion)
- [ ] #FEAT-036 AI process analysis (Anthropic API, structured bottleneck/redundancy/automation analysis)
- [ ] #FEAT-037 AI gap narrative generator (consulting-grade summary text)
- [ ] #FEAT-038 AI improvement suggestions (bridges AI analysis → improvement tracker)
- [ ] #FEAT-039 Phase 3a testing gate (full regression + new features)

## Phase 3b: Tools Canvas + Enhanced Export — PENDING
**Depends on:** Phase 3a complete

- [ ] #FEAT-040 Tools canvas upgrade (React Flow canvas for tools landscape)
- [ ] #FEAT-041 Tool detail panel + step-tool assignment (junction table, cost integration)
- [ ] #FEAT-042 Tool overlap and gap analysis (client-side computation)
- [ ] #FEAT-043 Enhanced PDF export — multi-section report (4 sub-tasks)
  - [ ] [1/4] Export dialog UI with section toggles and presets
  - [ ] [2/4] New sections: executive summary, journey map, journey sentiment, perspective comparison
  - [ ] [3/4] New sections: prioritization matrix, tool landscape, improvements, AI insights
  - [ ] [4/4] Page numbers, table of contents, consistent styling
- [ ] #FEAT-044 Phase 3b testing gate

## Phase 4: The Living Playbook — PENDING
**Depends on:** Phase 3b complete

- [ ] #FEAT-045 Comments system (threaded, categorized: note/decision/pain_point/idea/question)
- [ ] #FEAT-046 Tasks system (step-level checklists with drag-to-reorder)
- [ ] #FEAT-047 Runbook instances (turn sections into executable checklists)
- [ ] #FEAT-048 Playbook mode (distraction-free runbook execution view)
- [ ] #FEAT-049 Activity log (audit trail for consulting engagements)
- [ ] #FEAT-050 Workspace cloning (deep copy for reuse)
- [ ] #FEAT-051 Conditional step coloring (rule-based canvas highlighting)
- [ ] #FEAT-052 Section templates (save & deploy)
- [ ] #FEAT-053 Phase 4 testing gate

Deferred indefinitely:
- Versioning / snapshot history for canvases
- Real-time collaboration
- Advanced permissions (workspace-level roles beyond org member)

## Amendments

- [2026-02-26] Iteration 55: RALPH loop bootstrapped. Phases 0-2b reconstructed from git history. Phase 2b features complete but needs completion testing before advancing.
- [2026-02-26] Iteration 56: Regression suite passed (19/19 checks via static analysis + API probing). Quality audit remaining.
- [2026-02-26] Iteration 57: Quality audit complete. 5 bugs + 5 improvements logged. Phase 2b fully done. P1 bugs should be fixed before Phase 3 features.
- [2026-02-26] Iteration 62: All quality audit bugs resolved (BUG-012 through BUG-016). Phase 3 unblocked. Next iteration should prioritize Phase 3 candidate features.
- [2026-02-26] Iteration 63: Phase 3 started. Dashboard page built as first feature. Candidate features prioritized and added to FEATURES.md. Versioning, collaboration, and advanced permissions deferred to Phase 4+.
- [2026-02-26] Iteration 65: People page fleshed out. Flat table view with inline editing, role picker for adding people, delete confirmation. Sidebar stub badge removed.
- [2026-02-26] Iteration 66: Tools data layer built (migration 013, API routes, types, client functions). Decomposed into 2 sub-tasks — UI next iteration.
- [2026-02-26] Iteration 67: Tools page UI complete. #FEAT-030 fully done. Sidebar stub badge removed. Next: #FEAT-028 search/filtering or #FEAT-031 bulk actions.
- [2026-02-26] Iteration 68: #FEAT-028 [1/2] done — search & filter added to People and Tools views. [2/2] Teams view remaining.
- [2026-02-26] Iteration 69: #FEAT-028 [2/2] done — search & filter added to Teams view with hierarchical matching. #FEAT-028 fully complete. Next: #FEAT-031 bulk actions.
- [2026-02-27] **HUMAN COURSE CORRECTION:** Product owner reviewed iterations 55-69. Agent built utility features (dashboard, search, people/tools CRUD) instead of high-value consulting features. Phase 3 (Advanced Features) STOPPED. FEAT-031 and FEAT-032 deferred. New phases added: Phase 3a (Analysis Intelligence, FEAT-033-039), Phase 3b (Tools Canvas + Enhanced Export, FEAT-040-044), Phase 4 (The Living Playbook, FEAT-045-053). Next task: FEAT-033. See knowledge/FEEDBACK.md for full override details.
