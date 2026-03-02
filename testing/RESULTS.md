# Test Results — Stride

## Last Run Summary
- **Iteration:** 101
- **Date:** 2026-03-02
- **Suite:** feat-052-ui-acceptance
- **Method:** Browser (Playwright) + static code analysis
- **Result:** **15/16 PASS, 1 FAIL** (FEAT-052 UI 11/12 + IMP-032 4/4)
- **Bugs found:** 2 (BUG-022 migration not pushed P1, BUG-023 DialogTitle a11y P2)
- **Improvements found:** 1 (IMP-036 starters in error state)
- **Note:** The 1 FAIL is "Dialog shows both DB templates and STARTER_TEMPLATES as cards" — DB error (migration 020 not pushed) prevents template list rendering. Code is correct per static analysis.

## Suite Results

### Acceptance
- Last run: Iteration 101 (2026-03-02) — 15/16 PASS (FEAT-052 UI 11/12 browser+static, IMP-032 4/4 static)
- Previous: Iteration 99 (2026-03-02) — 16/16 PASS (FEAT-052 DI 10, BUG-020 4, IMP-029 2 — static)

### Regression
- Last run: Iteration 100 (2026-03-02) — 29/32 (regression 11/14 browser, FEAT-052 DI 10/10 static, performance 3/6+3warn static)
- Previous run: Iteration 99 (2026-03-02) — 16/16 PASS (FEAT-052 10, BUG-020 4, IMP-029 2 — static code analysis)
- Previous run: Iteration 98 (2026-03-02) — IMP-028 7/7 PASS, BUG-020 0/4 FAIL (not merged), FEAT-052 all PASS (static, wrong paths)
- Previous run: Iteration 97 (2026-03-03) — 87/87 PASS (35 regression baseline + 13 FEAT-050 acceptance + 10 FEAT-051 verify + 5 BUG-019 verify, static analysis)
- Previous run: Iteration 96 (2026-03-03) — 19/19 PASS (6 BUG-019 + 1 IMP-018 + 12 FEAT-051 acceptance, static analysis + production quality gate)
- Previous run: Iteration 91 (2026-03-03) — 57/57 PASS (20 FEAT-049 acceptance + 37 regression baseline, static analysis)
- Previous run: Iteration 87 (2026-03-02) — 33/33 PASS (5 regression + 16 FEAT-047 acceptance + 12 FEAT-048 acceptance)
- Previous run: Iteration 83 (2026-03-02) — 23/23 PASS (static analysis + curl + API probing)
- Previous run: Iteration 79 (2026-03-02) — 40/40 PASS (27 baseline + 13 acceptance, static analysis)
- Previous run: Iteration 77 (2026-03-01) — 19/19 baseline PASS, 0/6 acceptance FAIL (code absent — merge failures)
- Previous run: Iteration 75 (2026-03-01) — 32/32 PASS (19 baseline + 13 extended)
- Previous run: Iteration 73 (2026-03-01) — baseline 19/19 PASS, iter-73 acceptance 0/5 FAIL (code absent at test time)
- Previous run: Iteration 64 (2026-02-26) — PASS (19/19)
- Method: Static analysis + API auth probing (Playwright unavailable)
- Previous run: Iteration 56 (PASS 19/19)

#### Detailed Results (Iteration 64)

| # | Check | Result | Method |
|---|-------|--------|--------|
| 1 | `/login` renders | PASS | curl (200) |
| 2 | `/workspaces` redirects (unauthed) | PASS | curl (307→login) |
| 3 | Canvas tab loads with nodes | PASS | Static analysis (canvas-view.tsx, flow-canvas.tsx) |
| 4 | Click step → detail panel | PASS | Static analysis (onNodeClick → onStepSelect) |
| 5 | Edit step name saves | PASS | Static analysis (debounced handleNameChange → updateStep) |
| 6 | Click section → panel | PASS | Static analysis (onSectionSelect → SectionDetailPanel) |
| 7 | Canvas zoom/pan | PASS | Static analysis (React Flow defaults + Controls + MiniMap) |
| 8 | Journey tab renders | PASS | Static analysis (journey-canvas-view.tsx, canvas_type check) |
| 9 | Click touchpoint → panel | PASS | Static analysis (selectedTouchpointId → TouchpointDetailPanel) |
| 10 | Click stage → panel | PASS | Static analysis (selectedStageId → StageDetailPanel) |
| 11 | Step list displays | PASS | Static analysis (step-list-view.tsx — fetch, filter, sort, render) |
| 12 | Gap analysis displays | PASS | Static analysis (gap-analysis-view.tsx — maturity gaps + visual bars) |
| 13 | Comparison view renders | PASS | Static analysis (compare-view.tsx — side-by-side + match glow) |
| 14 | Settings page loads | PASS | Static analysis (settings/page.tsx — name, sharing, perspectives) |
| 15 | Teams page loads | PASS | Static analysis (teams-view.tsx — full CRUD hierarchy) |
| 16 | Perspectives list displays | PASS | Static analysis (settings PerspectivesSection + PerspectiveRow) |
| 17 | PDF export no errors | PASS | Static analysis (pdf.ts 763 lines, all imports valid) |
| 18 | PNG export no errors | PASS | Static analysis (png.ts + use-canvas-export.ts) |
| 19 | No new console errors | PASS | API probing + static analysis |

**Additional checks (iteration 64):**
- Dashboard page (NEW iter 63): PASS — code structure verified, all imports valid, data transformations correct
- Sidebar navigation: PASS — Dashboard item correctly placed, Workflows exclusion correct
- Workspace shell: PASS — dashboard path excluded from tab detection

**API Auth Guards Verified:**
- workspaces: 401 ✓
- steps: 401 ✓
- perspectives: 401 ✓
- annotations: 401 ✓
- teams: 401 ✓
- sections: 405 (POST-only, correct) ✓
- stages: 405 (POST-only, correct) ✓
- public/shares/[id]: not_found (correct for nonexistent) ✓

### Quality Audit
- Last run: Iteration 57 (2026-02-26)
- Result: **5 bugs + 5 improvements identified**
- Method: Deep code review (3 parallel agents)

#### Audit Areas

| Area | Files Reviewed | Issues Found |
|------|---------------|--------------|
| API Routes (perspectives) | 2 files | BUG-013 (silent RLS), IMP-001 (color validation) |
| API Routes (annotations) | 2 files | BUG-014 (enum validation), BUG-015 (rating range) |
| Annotation Panel | 1 file | BUG-016 (silent fetch error) |
| Canvas Node Indicators | 4 files | IMP-003 (ARIA semantics) |
| Settings Perspectives UI | 1 file | BUG-012 (delete confirmation), IMP-002 (a11y) |
| Types & Context | 3 files | Consistent, no issues |
| DB Migration | 1 file | IMP-005 (orphaned annotations) |

#### Overall Assessment
- **Type safety:** Excellent — all types match schema, no `any` misuse
- **API pattern consistency:** Good — all routes follow envelope pattern
- **Error handling:** Mixed — auth checks consistent, but silent failures on mutations
- **Accessibility:** Partial — some ARIA present, color picker needs work
- **Data integrity:** Good for normal usage, edge cases exist (polymorphic FK)

### Accessibility
- Last run: N/A (BUG-002 through BUG-009 fixed in iteration 21, not re-audited with RALPH)
- Result: N/A

### Performance
- Last run: Iteration 100 (2026-03-02)
- Result: 3/6 PASS, 3 WARN (node types module-level ✓, flow-canvas useCallback ✓, no circular imports ✓; canvas-view handlers not useCallback ⚠, nodes not React.memo ⚠, 5 files >500 lines ⚠)

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
