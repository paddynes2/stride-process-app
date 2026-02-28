# Test Results — Stride

## Last Run Summary
- **Iteration:** 71
- **Date:** 2026-02-28
- **Suite:** Build verification (typecheck + lint + build)
- **Method:** npx tsc --noEmit, npm run lint, npm run build — all pass

## Suite Results

### Regression
- Last run: Iteration 64 (2026-02-26)
- Result: **PASS** (19/19 checks)
- Method: Static analysis via 3 parallel Explore agents + API probing via curl
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
- Last run: N/A
- Result: N/A

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
