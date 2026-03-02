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

## Phase 3: Advanced Features — PAUSED (remaining items deferred per human feedback)
**Iterations:** 63-69
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

## Phase 3a: Analysis Intelligence — ACTIVE (Phase 4 complete)
**Target iterations:** 104+
**Depends on:** Phase 4 complete ✓ (iteration 103)

Core consulting insight features:
- [ ] #FEAT-033 Perspective comparison view
- [ ] #FEAT-034 Prioritization matrix (effort/impact scoring + quadrant chart)
- [ ] #FEAT-035 Improvement ideas tracker (proposals → approval → completion)
- [ ] #FEAT-036 AI process analysis (Anthropic API, structured bottleneck/redundancy/automation analysis)
- [ ] #FEAT-037 AI gap narrative generator (consulting-grade summary text)
- [ ] #FEAT-038 AI improvement suggestions (bridges AI analysis → improvement tracker)
- [ ] #FEAT-039 Phase 3a testing gate (full regression + new features)

## Phase 3b: Tools Canvas + Enhanced Export — DEFERRED (per human feedback — Phase 4 prioritized)
**Depends on:** Phase 4 complete

- [ ] #FEAT-040 Tools canvas upgrade (React Flow canvas for tools landscape)
- [ ] #FEAT-041 Tool detail panel + step-tool assignment (junction table, cost integration)
- [ ] #FEAT-042 Tool overlap and gap analysis (client-side computation)
- [ ] #FEAT-043 Enhanced PDF export — multi-section report (4 sub-tasks)
  - [ ] [1/4] Export dialog UI with section toggles and presets
  - [ ] [2/4] New sections: executive summary, journey map, journey sentiment, perspective comparison
  - [ ] [3/4] New sections: prioritization matrix, tool landscape, improvements, AI insights
  - [ ] [4/4] Page numbers, table of contents, consistent styling
- [ ] #FEAT-044 Phase 3b testing gate

## Phase 4: The Living Playbook — DONE
**Iterations:** 71-103

- [x] #FEAT-045 Comments system (threaded, categorized: note/decision/pain_point/idea/question) — DONE iteration 74
  - [x] [1/3] Data model + types + API routes + client wrappers — DONE iteration 71
  - [x] [2/3] Comment panel UI on detail panels — DONE iteration 73
  - [x] [3/3] Canvas badges + workspace comments view — DONE iteration 74
- [x] #FEAT-046 Tasks system (step-level checklists with drag-to-reorder) — [1/3] DONE iter 76, [2/3] DONE iter 77, [3/3] DONE iter 78
- [x] #FEAT-047 Runbook instances (turn sections into executable checklists) — [1/3] DONE iter 80, [2/3] DONE iter 81, [3/3] DONE iter 82
- [x] #FEAT-048 Playbook mode (distraction-free runbook execution view) — DONE iteration 86
- [x] #FEAT-049 Activity log (audit trail for consulting engagements) — DONE iter 90
  - [x] [1/3] Data layer — DONE iter 88
  - [x] [2/3] Page UI — DONE iter 89
  - [x] [3/3] API route integration — DONE iter 90
- [x] #FEAT-050 Workspace cloning (deep copy for reuse) — [1/2] DONE iter 92, [2/2] DONE iter 93
- [x] #FEAT-051 Conditional step coloring (rule-based canvas highlighting) — [1/2] DONE iter 94, [2/2] DONE iter 96
- [x] #FEAT-052 Section templates (save & deploy) — [1/2] DONE iter 99, [2/2] DONE iter 101
- [x] #FEAT-053 Phase 4 testing gate — DONE iteration 103 (acceptance 9/9, regression 10/10)

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
- [2026-02-28] Iteration 70: Multi-agent pipeline first run — planner executed successfully but builders failed (create_worktree stdout pollution bug). No code changes. See PROGRESS.md iter 70.
- [2026-02-28] **HUMAN COURSE CORRECTION #2:** Product owner reversed Phase 3a prioritization. Phase 4 (The Living Playbook, FEAT-045-053) is now the active phase. Phase 3a and 3b are DEFERRED until Phase 4 is complete. Ralph v3.0 multi-agent pipeline deployed. Next task: FEAT-045.
- [2026-02-28] Iteration 71: FEAT-045 [1/3] completed — comments data layer (migration, API, types, client). IMP-001 not built (builder slot 2 did not execute). Pipeline worktree merge issue discovered and manually resolved by reviewer.
- [2026-02-28] Iteration 72: Testing-only iteration (REGRESSION-72) — tester agent did not execute. Regression still overdue (risk score 9 from iter 71). 3rd consecutive pipeline dispatch failure.
- [2026-03-01] Iteration 73: FEAT-045 [2/3] and IMP-001 both completed. Comment panel UI built (415 lines) and integrated into both canvas views. Hex color validation added to perspectives API. Builder worktrees cleaned before merge again — reviewer recovered from unreachable commits. 2 new improvements logged (IMP-006, IMP-007).
- [2026-03-01] Iteration 74: FEAT-045 [3/3] completed — canvas badges + workspace comments page. CommentCountsContext avoids prop-drilling. IMP-002 built but lost in merge. Pipeline worktree merge bug is critical (3rd occurrence).
- [2026-03-01] Iteration 75: Testing-only — regression 32/32 PASS. All features through Phase 4 FEAT-045 verified. Pipeline fixes: builder health check, exit code capture, regression tester Playwright independence, skip-on-failure. 2 new improvements (IMP-008, IMP-009). Next: IMP-002 re-attempt + FEAT-046.
- [2026-03-01] Iteration 76: FEAT-046 [1/3] completed — tasks data layer (migration 015, API routes, types, client wrappers). IMP-002 completed (reviewer missed BUILD_RESULT_2 initially — corrected in 6ec8fc1). Next: FEAT-046 [2/3] tasks tab UI.
- [2026-03-01] Iteration 77: FEAT-046 [2/3] and IMP-003 both completed. Builder worktree merge failed again (4th occurrence) — reviewer recovered code from unreachable commits (186099a, 262a973) via `git fsck`. TaskPanel UI built (254 lines), ARIA labels added to all 4 node types. Pipeline G007 bug still unfixed. Next: FEAT-046 [3/3] task count badges.
- [2026-03-01] Iteration 78: FEAT-046 [3/3] completed — task count badges on step nodes (TaskCountsContext, mirrors CommentCountsContext), section-level task rollup in section-detail-panel. IMP-008 fixed (handleKeyDown deps). 5th worktree merge failure — code recovered from unreachable commits (6858b30, 287dbc2). FEAT-046 fully complete. Next: FEAT-047 Runbook instances.
- [2026-03-02] Iteration 79: Testing-only — acceptance (#FEAT-046) + regression. 40/40 PASS (static analysis). FEAT-046 fully acceptance-tested. 1 improvement logged (IMP-011). Retrospective due at iteration 80.
- [2026-03-02] Iteration 80: FEAT-047 [1/3] completed — runbook instances data layer (migration 016, types, API routes, client wrappers). IMP-011 completed — journey-canvas useCallback fix. Both builders merged cleanly. Retrospective performed (iter 80 = multiple of 10).
- [2026-03-02] Iteration 81: FEAT-047 [2/3] completed — runbook UI (list page, view page, section panel button, sidebar nav). IMP-009 completed (comment nav links). Both builders merged cleanly. [3/3] polish remaining.
- [2026-03-02] Iteration 82: FEAT-047 [3/3] completed — runbook polish (Complete/Cancel buttons, 4-state step status, read-only view, progress text, metadata footer, list filter). IMP-006 completed (annotation panel empty state). FEAT-047 fully done. Next: acceptance testing for FEAT-047.
- [2026-03-02] Iteration 83: Testing-only — regression 23/23 PASS. Acceptance testing for FEAT-047 not executed (tester dispatch failure). FEAT-047 acceptance still needed. 2 improvements found (IMP-012, IMP-013).
- [2026-03-02] Iteration 84: FEAT-048 + IMP-012 — both builders reported success but pipeline merge step failed. No builder branches exist, no code on disk. Stash `ralph-auto-stash-1772431205` never popped. All builder work lost. Tasks need re-attempt. This is the 6th+ worktree merge failure incident (previously iters 73, 74, 77, 78).
- [2026-03-02] Iteration 85: FEAT-048 + IMP-012 attempt 2 — IDENTICAL failure to iter 84. Both BUILD_RESULTs report success with passing typecheck/lint, but no builder branches exist, no source files on disk, no merge commits. Pipeline merge step is completely broken — not a conflict issue (those were recoverable in iters 73-78) but a total non-execution. 3 consecutive non-productive iterations (83 partial, 84 reverted, 85 reverted). **Pipeline infrastructure fix required before any more build iterations.**
- [2026-03-02] Iteration 86: #FEAT-048 Playbook mode (attempt 3) + #IMP-012 styled confirm dialog + #IMP-013 segmented progress bar — ALL COMPLETED. Pipeline merge succeeded after 2 consecutive failures. PlaybookView uses fixed overlay (D-006). FEAT-048 acceptance testing needed next iteration. All Phase 4 P0 features now done (FEAT-045, 046, 047). Next: FEAT-049 Activity log or regression+acceptance testing.
- [2026-03-02] Iteration 87: Testing-only — 33/33 PASS (regression 5 + FEAT-047 acceptance 16 + FEAT-048 acceptance 12). All Phase 4 P0 features acceptance-tested. FEAT-047 overdue acceptance resolved. 1 bug (BUG-017 optimistic rollback) + 3 improvements logged. Next: FEAT-049 Activity log.
- [2026-03-03] Iteration 88: #FEAT-049 [1/3] data layer complete (migration 017, types, API, client, logActivity). #BUG-017 fixed (optimistic rollback prevIndex). #IMP-015 done (playbook skip button). Both builders merged cleanly. Next: FEAT-049 [2/3] activity page UI.
- [2026-03-03] Iteration 89: #FEAT-049 [2/3] activity page UI complete (page.tsx, activity-view.tsx, sidebar, workspace-shell). #IMP-014 done (skipped steps count as resolved in all 3 runbook views). Next: FEAT-049 [3/3] logActivity() integration.
- [2026-03-03] Iteration 90: #FEAT-049 [3/3] logActivity() integration across 40 API route files. #IMP-016 done. FEAT-049 fully complete. Risk score 4 triggers testing-only iter 91.
- [2026-03-03] Iteration 91: Testing-only — FEAT-049 acceptance 20/20 PASS + regression 37/37 PASS. 2 bugs (BUG-018 void keyword, BUG-019 user display) + 6 improvements logged. Next: FEAT-050 workspace cloning.
- [2026-03-03] Iteration 92: #FEAT-050 [1/2] data layer + #IMP-019 completed. #BUG-019 FAILED (4/6 acceptance criteria) — builder updated API route join but not page.tsx server query, causing "Unknown" regression on initial load. Code recovered from 3 pipeline merge failures. Result: partial. Next: fix BUG-019 (page.tsx query), then FEAT-050 [2/2] UI.
- [2026-03-03] Iteration 93: #FEAT-050 [2/2] UI complete (Duplicate Workspace button in settings). #BUG-018 resolved (void prefix on 25 logActivity calls). FEAT-050 fully done. Slot 2 diverged from plan (IMP-018 assigned, BUG-018 built). Next: BUG-019 fix, then FEAT-051 or FEAT-052.
- [2026-03-03] Iteration 94: PARTIAL — #FEAT-051 [1/2] data layer completed (reviewer recovered code from working tree — builder wrote files but didn't commit). #IMP-007 completed (kbd hints, partial run carry-over). #BUG-019 attempt 2 FAILED (builder completed but worktree merge failure — code lost). Next: BUG-019 attempt 3 + FEAT-051 [2/2] UI.
- [2026-03-03] Iteration 95: BLOCKED — planner produced no EXECUTION_PLAN.json (agent dispatch failure). No code changes. Acceptance tester re-validated iter 94: BUG-019 still broken (3/5 FAIL), FEAT-051 [1/2] minor validation gaps (2/9 FAIL — HEX_COLOR_REGEX missing in POST/PATCH). Both findings already known. Next: BUG-019 attempt 3 + FEAT-051 [2/2] UI.
- [2026-03-03] Iteration 96: #BUG-019 resolved (attempt 3 — page.tsx select join). #IMP-018 done (activity empty state guidance). #FEAT-051 [2/2] done (coloring panel UI, step node tint, API validation). FEAT-051 fully complete. 3 new improvements logged (IMP-023-025). Next: iter 97 MUST be testing_only.
- [2026-03-03] Iteration 97: Testing-only — 87/87 ALL PASS across 4 suites (regression + FEAT-050 acceptance + FEAT-051 verify + BUG-019 verify). FEAT-050 first acceptance test. Risk score fully resolved. 1 new bug (BUG-020 has_role) + 3 new improvements (IMP-026-028). Next: FEAT-052 section templates or FEAT-053 testing gate.
- [2026-03-02] Iteration 98: PARTIAL — #IMP-028 done (clone dialog), #IMP-026 done (dialog text). #FEAT-052 [1/2] FAILED (builder committed to worktree paths). #BUG-020 FAILED (never committed). 1 new improvement (IMP-029). Next: re-attempt FEAT-052 [1/2] + BUG-020.
- [2026-03-02] Iteration 99: COMPLETED — #FEAT-052 [1/2] data layer done (migration 020, types, 3 API routes, client wrappers, STARTER_TEMPLATES). #BUG-020 resolved (has_role disabled in dropdown). #IMP-029 resolved (settings text). All 3 slots merged cleanly. Next: FEAT-052 [2/2] UI.
- [2026-03-02] Iteration 100: TESTING ONLY — 3 suites: feat-052-data-integrity 10/10 PASS, performance-static-audit 3/6 PASS (3 warn), regression-baseline-full 11/14 (3 FAIL = BUG-021 routing). FEAT-052 data layer verified. 1 new P1 bug (BUG-021) + 5 improvements (IMP-031-035). Retrospective performed (100th iteration milestone). Next: FEAT-052 [2/2] UI.
- [2026-03-02] Iteration 101: COMPLETED — #FEAT-052 [2/2] UI done (Save as Template dialog on section panel, template browser dialog in canvas toolbar). #IMP-032 done (React.memo on StepNode/SectionNode). FEAT-052 fully complete. 2 new bugs (BUG-022 migration not pushed, BUG-023 DialogTitle a11y) + 1 improvement (IMP-036 starters in error state). Next: file bugs, then FEAT-053 testing gate or remaining improvements.
- [2026-03-02] Iteration 102: COMPLETED — Cleanup iteration. #BUG-023 fixed (DialogPrimitive.Title in canvas-view.tsx). #IMP-036 done (starters always visible in template dialog). #IMP-030 verified resolved. #IMP-020 done (activity skeleton placeholders). #IMP-035 verified resolved. 1 new bug (BUG-024). Next: FEAT-053 Phase 4 testing gate.
- [2026-03-02] Iteration 103: **PHASE 4 COMPLETE.** FEAT-053 Phase 4 testing gate passed — acceptance 9/9, regression 10/10. All 9 Phase 4 features (FEAT-045 through FEAT-053) done. 9 new improvements logged (IMP-039-047). BUG-024 only open bug (P2). Phase 3a: Analysis Intelligence now ACTIVE, starting with FEAT-033 Perspective comparison view.
