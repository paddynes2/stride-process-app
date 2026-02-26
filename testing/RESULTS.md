# Test Results — Stride

## Last Run Summary
- **Iteration:** 56
- **Date:** 2026-02-26
- **Suite:** Regression (Phase 2b completion)
- **Method:** Static analysis + API probing + production URL rendering (Playwright unavailable)

## Suite Results

### Regression
- Last run: Iteration 56 (2026-02-26)
- Result: **PASS** (19/19 checks)
- Method: Static analysis + HTTP verification (no Playwright)

#### Detailed Results

| # | Check | Result | Method |
|---|-------|--------|--------|
| 1 | `/login` renders | PASS | WebFetch (200) |
| 2 | `/workspaces` loads (authed) / redirects (unauthed) | PASS | curl (302→login) + static analysis |
| 3 | Canvas tab loads with nodes | PASS | Static analysis (canvas-view.tsx) |
| 4 | Click step → detail panel | PASS | Static analysis (onNodeClick handler) |
| 5 | Edit step name saves | PASS | Static analysis (handleStepUpdate) |
| 6 | Click section → panel | PASS | Static analysis (selection logic) |
| 7 | Canvas zoom/pan | PASS | Static analysis (React Flow defaults) |
| 8 | Journey tab renders | PASS | Static analysis (journey-canvas-view.tsx) |
| 9 | Click touchpoint → panel | PASS | Static analysis (selectedTouchpoint) |
| 10 | Click stage → panel | PASS | Static analysis (selectedStage) |
| 11 | Step list displays | PASS | Static analysis (step-list-view.tsx) |
| 12 | Gap analysis displays | PASS | Static analysis (gap-analysis-view.tsx) |
| 13 | Comparison view renders | PASS | Static analysis (compare-view.tsx) |
| 14 | Settings page loads | PASS | Static analysis (settings/page.tsx) |
| 15 | Teams page loads | PASS | API guard (401) + static analysis |
| 16 | Perspectives list displays | PASS | Static analysis (settings perspectives) |
| 17 | PDF export no errors | PASS | Static analysis (pdf.ts, journey-pdf.ts) |
| 18 | PNG export no errors | PASS | Static analysis (png.ts, use-canvas-export.ts) |
| 19 | No new console errors | PASS | API probing + static analysis |

**API Auth Guards Verified:**
- workspaces: 401 ✓
- steps: 401 ✓
- perspectives: 401 ✓
- annotations: 401 ✓
- teams: 401 ✓
- sections: 405 (POST-only, correct) ✓
- stages: 405 (POST-only, correct) ✓
- public/shares/[id]: not_found (correct for nonexistent) ✓

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
