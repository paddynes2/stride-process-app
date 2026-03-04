# Test Results — Stride

## Last Run Summary
- **Iteration:** 115
- **Date:** 2026-03-04
- **Suite:** Acceptance (iteration 115 tasks)
- **Method:** Playwright browser + static code analysis
- **Result:** **Acceptance 14/14 PASS** + Canary PASS
- **Bugs found:** 1 (BUG-028 improvement-ideas 500 — pre-existing, already tracked)
- **Improvements found:** 2 (IMP-077 gap analysis disabled guidance, IMP-078 workspace card date hydration)

## Suite Results

### Acceptance
- Last run: Iteration 115 (2026-03-04) — 14/14 PASS (FEAT-040 [1/3] 8/8, IMP-075 3/3, BUG-030 3/3 — Playwright browser + static code analysis)
- Previous: Iteration 114 (2026-03-04) — 18/18 PASS (IMP-073 6/6, IMP-067+IMP-070+IMP-074 7/7, IMP-064 5/5 — Playwright browser + static code analysis)
- Previous: Iteration 113 (2026-03-04) — 10/10 PASS (BUG-027 6/6, IMP-069 2/2, IMP-071+IMP-068 2/2 — Playwright browser + static code analysis)
- Previous: Iteration 112 (2026-03-04) — 14/14 PASS (Phase 3a gate: FEAT-033 through FEAT-038 acceptance, regression checks, accessibility audit — static code analysis)
- Previous: Iteration 111 (2026-03-04) — 16/16 PASS (FEAT-037 7/7, FEAT-038 5/5, IMP-065 4/4 — static code analysis, Playwright unavailable)
- Previous: Iteration 109 (2026-03-03) — 24/24 PASS (FEAT-036 [1/2] 14/14, IMP-057 7/7, IMP-062 3/3 — static code analysis, Playwright unavailable)
- Previous: Iteration 107 (2026-03-03) — 19/19 PASS (FEAT-035 11/11, BUG-025 5/5, IMP-052 4/4 — static code analysis, Playwright unavailable)
- Previous: Iteration 106 (2026-03-02) — 19/20 PASS (FEAT-034 [2/2] 11/11, IMP-050 4/4, IMP-051 4/5 — static analysis + production comparison; 1 fail pre-existing)
- Previous: Iteration 105 (2026-03-02) — 14/14 PASS (FEAT-034 [1/2] 6/6, IMP-042 4/4, IMP-046 4/4 — static code analysis)
- Previous: Iteration 104 (2026-03-02) — 16/16 PASS (FEAT-033 10/10, BUG-024 4/4, IMP-039 2/2 — static code analysis)
- Previous: Iteration 103 (2026-03-02) — 9/9 PASS (Phase 4 full gate — playbook, activity, clone, coloring, templates, compilation, BUG-021 fix, comments+tasks+runbooks baseline)
- Previous: Iteration 102 (2026-03-02) — 5/5 PASS (BUG-023 + IMP-036 + IMP-030 + IMP-020 — static code analysis)
- Previous: Iteration 101 (2026-03-02) — 15/16 PASS (FEAT-052 UI 11/12 browser+static, IMP-032 4/4 static)
- Previous: Iteration 99 (2026-03-02) — 16/16 PASS (FEAT-052 DI 10, BUG-020 4, IMP-029 2 — static)

### Regression
- Last run: Iteration 112 (2026-03-04) — 27/28 PASS, 1 skip (full regression: Playwright browser on localhost, 13 pages checked, 2 console errors, 4 network errors, 0 accessibility violations; skip: journey canvas — no journey tab)
- Previous: Iteration 109 (2026-03-03) — 19/19 PASS, 2 skip (regression-baseline hybrid: browser on production + static analysis for iter-109 changes, 7 pages checked, 0 console errors, 8 regression checks PASS)
- Previous: Iteration 107 (2026-03-03) — 20/20 PASS (baseline 15 + BUG-025 2 + FEAT-035 2 + IMP-052 1 — Playwright browser, 7 pages checked, 0 console errors)
- Previous: Iteration 105 (2026-03-02) — 12/12 PASS (regression-baseline static, feat-034-data-integrity static — Playwright unavailable)
- Previous run: Iteration 103 (2026-03-02) — 10/10 PASS (Phase 4 full gate — all phases regression + all Phase 4 feature verification, 30+ files analyzed)
- Previous run: Iteration 100 (2026-03-02) — 29/32 (regression 11/14 browser, FEAT-052 DI 10/10 static, performance 3/6+3warn static)
- Previous run: Iteration 99 (2026-03-02) — 16/16 PASS (FEAT-052 10, BUG-020 4, IMP-029 2 — static code analysis)
- Previous run: Iteration 98 (2026-03-02) — IMP-028 7/7 PASS, BUG-020 0/4 FAIL (not merged), FEAT-052 all PASS (static, wrong paths)
- Previous run: Iteration 97 (2026-03-03) — 87/87 PASS (35 regression baseline + 13 FEAT-050 acceptance + 10 FEAT-051 verify + 5 BUG-019 verify, static analysis)
- Previous run: Iteration 96 (2026-03-03) — 19/19 PASS (6 BUG-019 + 1 IMP-018 + 12 FEAT-051 acceptance, static analysis + production quality gate)
- Previous run: Iteration 91 (2026-03-03) — 57/57 PASS (20 FEAT-049 acceptance + 37 regression baseline, static analysis)
- Previous run: Iteration 87 (2026-03-02) — 33/33 PASS (5 regression + 16 FEAT-047 acceptance + 12 FEAT-048 acceptance)
- Previous run: Iteration 83 (2026-03-02) — 23/23 PASS (static analysis + curl + API probing)
- Previous run: Iteration 79 (2026-03-02) — 40/40 PASS (27 baseline + 13 acceptance, static analysis)
- Previous run: Iteration 75 (2026-03-01) — 32/32 PASS (19 baseline + 13 extended)
- Previous run: Iteration 64 (2026-02-26) — PASS (19/19)
- Method: Static analysis + API auth probing (Playwright unavailable)
- Previous run: Iteration 56 (PASS 19/19)

#### Regression Checks (Iteration 103)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | BUG-021 workspace-shell exclusion | PASS | workspace-shell.tsx:44-51 — all 11 reserved routes |
| 2 | BUG-020 has_role disabled | PASS | coloring-panel.tsx — disabled=true |
| 3 | BUG-024 DialogTitle (P2) | FIXED (iter 104) | section-detail-panel.tsx now uses DialogPrimitive.Title |
| 4 | Heat map precedence over coloring | PASS | step-node.tsx — heatMapMode+maturityColor wins |
| 5 | Coloring 15% tint | PASS | hex alpha 0x26 ≈ 14.9% |
| 6 | Last match wins | PASS | canvas-view.tsx — loop overwrites map entry |
| 7 | Activity logActivity 10 routes | PASS | steps, sections, connections, workspaces, tabs, teams, people, tools, runbooks/[id], runbook-steps/[id] |
| 8 | Clone 13 tables | PASS | migration 018 copies 13 child tables |
| 9 | Playbook z-50 overlay | PASS | playbook-view.tsx:109,122 fixed inset-0 z-50 |
| 10 | Playbook max-w-xl | PASS | playbook-view.tsx:152,241 |
| 11 | Starter templates 4 | PASS | lib/templates.ts exports 4 STARTER_TEMPLATES |
| 12 | Migration 020 exists | PASS (file) / BLOCKED (remote) | npx supabase db push required |
| 13 | TypeScript clean | PASS | compilation_status=passing |
| 14 | apiFetch envelope | PASS | all client functions return apiFetch<T>() directly |

### Quality Audit
- Last run: Iteration 57 (2026-02-26)
- Result: **5 bugs + 5 improvements identified**
- Method: Deep code review (3 parallel agents)

### Accessibility
- Last run: Iteration 112 (2026-03-04) — 0 violations (static audit via __auditAccessibility() on canvas + activity pages; static code review of Phase 3a components)
- Previous: BUG-002 through BUG-009 fixed in iteration 21 (not re-audited with RALPH until now)

### Performance
- Last run: Iteration 100 (2026-03-02)
- Result: 3/6 PASS, 3 WARN (node types module-level ✓, flow-canvas useCallback ✓, no circular imports ✓; canvas-view handlers not useCallback ⚠, nodes not React.memo ⚠ [IMP-032 fixed iter 101], 5 files >500 lines ⚠)

### Forms
- Last run: N/A
- Result: N/A

### Navigation
- Last run: N/A
- Result: N/A

### Golden Paths
- Last run: N/A (FEAT-016 verified in iteration 31, not re-verified with RALPH)
- Result: N/A

## Flaky Tests
<!-- Tests that have flipped between pass/fail across iterations -->
