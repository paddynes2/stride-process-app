# Retrospectives — Stride

<!-- Append-only. Written every 10th iteration. -->

## Retrospective — Iteration 55 (2026-02-26)
- Note: Bootstrap iteration. No prior RALPH data to analyze.
- Prior iterations: 54 (reconstructed from git history)
- Phases completed: 0, 1, 1.5, 2a, 2b (features)
- Next: Phase 2b completion testing, then Phase 3

## Retrospective — Iteration 60 (2026-02-26)
- Success rate (last 6 — iter 55-60): 6/6 (100%)
- Task types: 1 bootstrap, 2 regression, 3 bugfix
- Hotspot files: src/app/api/v1/annotations/route.ts (2 iterations: 59, 60)
- Recurring pattern: None — all tasks completed first attempt
- Velocity trend: Stable — S and M complexity tasks completing efficiently
- Test coverage concern: Browser testing unavailable across all 6 iterations. Test scores consistently 2/5 due to Playwright MCP limitation. No way to verify UI changes in browser.
- Key observations:
  - Quality audit (iter 57) was high-value: found 5 bugs + 5 improvements in one pass
  - Bugfix cadence (58-60) cleared all P1 bugs from quality audit efficiently
  - All remaining bugs are P2 — project is in good shape for Phase 3
- Action: Investigate Playwright MCP connection to improve test coverage scores. Consider adding BUG for this if not already tracked.

## Retrospective — Iteration 70 (skipped)
- Note: Iteration 70 was the first multi-agent pipeline run. Builders failed due to pipeline bugs. No retrospective data available (only 1 RALPH-managed code iteration since iter 60).

## Retrospective — Iteration 80 (2026-03-02)
- Success rate (last 10 — iter 71-80): 7/10 fully completed, 2 partial, 1 blocked-then-overridden
- Most-failed task type: Pipeline dispatch/merge failures (iter 71 slot 2 never ran, iter 72 tester never ran, iter 74 slot 2 lost in merge, iter 77-78 required manual recovery)
- Hotspot files (top 3):
  - src/lib/api/client.ts (4 iterations: 71, 76, 78, 80)
  - src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx (4 iterations: 73, 74, 77, 78)
  - src/types/database.ts (3 iterations: 71, 76, 80)
- Recurring pattern (5+ occurrences): **Pipeline worktree merge failure (G007)** — builders complete work in worktrees, but git add -A stages handoff files causing merge conflicts. Reviewer must manually recover code from unreachable commits via git fsck. Occurred iter 71, 73, 74, 77, 78. Iteration 80 merged cleanly — first since iter 76.
- Velocity trend: Improving. Iter 71-74 unstable (pipeline issues). Iter 75-80 consistently completing (6/6). Pipeline reliability improved after iter 75 fixes.
- Self-score trends:
  - Code quality: stable at 4-5 (healthy)
  - Test coverage: stuck at 1-2 (Playwright unavailable, no unit tests)
  - Confidence: 4-5 (high — additive features, proven patterns)
  - Efficiency: improving (1-3 in iter 71-74 → 3-4 in iter 75-80)
- Key observations:
  - Phase 4 feature decomposition effective: FEAT-045 (3 iters), FEAT-046 (3 iters), FEAT-047 started
  - Multi-task mode productive when pipeline merges work — both slots completing in 76, 77, 78, 80
  - Improvements resolved steadily: IMP-001 (73), IMP-002 (76), IMP-003 (77), IMP-008 (78), IMP-011 (80)
  - client.ts and database.ts are legitimate hotspots — every data-layer task touches them (additive only)
  - Test coverage is the weakest metric: no unit tests, no Playwright, static analysis only
- Codebase health check:
  - Hotspot: client.ts in 4/10 — expected, not a refactor candidate
  - Hotspot: canvas-view.tsx in 4/10 — monitor for complexity growth
  - No duplication issues. Patterns consistent across all data layers.
  - No files >300 lines except comment-panel.tsx (415 lines)
- Action: Pipeline G007 bug is #1 source of wasted effort — must be addressed. Test coverage needs improvement.

## Retrospective — Iteration 90 (skipped)
- Note: No retrospective triggered — iteration 90 was not caught by reviewer at the time.

## Retrospective — Iteration 100 (2026-03-02)
- Success rate (last 10 — iter 91-100): 6/10 fully completed, 3 partial, 1 blocked
  - Completed: 91 (testing), 93, 96, 97 (testing), 99, 100 (testing)
  - Partial: 92 (BUG-019 failed), 94 (BUG-019 lost in merge), 98 (FEAT-052 worktree paths)
  - Blocked: 95 (planner dispatch failure)
- Most-failed task type: **Pipeline worktree merge failures** still causing partial results (iter 92, 94, 98). Also **BUG-019 "server/API query mismatch"** — took 3 attempts across 3 iterations (92, 94, 96) before fixed correctly.
- Hotspot files (top 3):
  - src/types/database.ts (3 iterations: 92, 94, 99) — additive data layer, expected
  - src/lib/api/client.ts (3 iterations: 92, 94, 99) — additive client wrappers, expected
  - src/app/(app)/w/[workspaceId]/settings/page.tsx (3 iterations: 93, 98, 99) — accumulating complexity (581 lines)
- Recurring pattern (3+ occurrences): **Pipeline worktree merge failures** continue (iter 92, 94, 98) — down from 5 occurrences in iter 71-80 to 3 in 91-100. Improving but not eliminated.
- Recurring pattern: **BUG-019 multi-attempt fix** — root cause was server page.tsx using different `.select()` shape than API route. Same query mismatch documented in LEARNINGS.md. 3 attempts over 5 iterations.
- Velocity trend: Stable. 10 iterations completed 3 features (FEAT-050, 051, 052 [1/2]), 3 bugs (BUG-018, 019, 020), 6 improvements. Testing iterations (3/10) consistently productive.
- Self-score trends:
  - Code quality: 4-5 on build iterations (stable, healthy)
  - Test coverage: 2-3 on builds, 4-5 on testing_only (bifurcated — no unit tests)
  - Confidence: 3-5 (lower on partial results, consistently high otherwise)
  - Efficiency: 2-5 (lower on merge failures at iter 92/94/98, consistently 5 otherwise)
- Key observations:
  - Phase 4 nearing completion: FEAT-050, 051, 052 [1/2] done. Only FEAT-052 [2/2] UI + FEAT-053 testing gate remain.
  - Browser-based regression (Playwright) at iter 100 found P1 routing bug (BUG-021) that static analysis missed for 30+ iterations. Demonstrates value of browser testing.
  - Performance cadence at iter 100 identified 5 concrete optimizations (IMP-031-035).
  - Accessibility cadence is 79 iterations overdue (last audit iter 21). Significant gap.
  - settings/page.tsx at 581 lines — third hotspot, growing. Consider splitting after Phase 4.
- Codebase health check:
  - Hotspot: settings/page.tsx in 3/10 — watch for further growth
  - Hotspot: database.ts and client.ts in 3/10 — legitimate (additive)
  - 5 files >500 lines flagged (IMP-033)
  - No duplication issues detected
  - canvas-view.tsx performance issues flagged (IMP-032, IMP-034)
- Action:
  - BUG-021 (P1) should be prioritized alongside FEAT-052 [2/2] in next build iteration
  - Accessibility cadence overdue — schedule audit after Phase 4 testing gate
  - Pipeline worktree merge reliability improved but still ~30% failure rate on build iterations

## Retrospective — Iteration 110 (skipped)
- Note: Iteration 110 retrospective was not triggered during review.

## Retrospective — Iteration 120 (2026-03-05)
- Success rate (last 10 — iter 111-120): **10/10 fully completed** (100%)
  - Completed: 111, 112, 113, 114, 115, 116, 117, 118, 119, 120
  - Partial: 0
  - Blocked: 0
- Most-failed task type: None — zero failures in this window. Best stretch in project history.
- Hotspot files (top 3):
  - src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx (4 iterations: 111, 113, 114, 115) — AI narrative feature + improvement cleanup
  - src/app/(app)/w/[workspaceId]/improvements/improvements-view.tsx (4 iterations: 111, 113, 114, 117) — AI suggestions + polish
  - src/app/(app)/w/[workspaceId]/tools/tools-canvas-view.tsx (3 iterations: 116, 117, 119) — new Phase 3b canvas
- Recurring pattern: **Zero pipeline merge failures** across all 10 iterations. This is a major improvement from iter 91-100 (30% failure rate) and iter 71-80 (50% failure rate). Pipeline is now stable.
- Recurring pattern: **Unpushed migration root cause** — BUG-032/035 (step-tools 500) is the same pattern as BUG-028/029 (iter 112). Builders create migrations but `npx supabase db push` is not automated. 3rd occurrence of this class of bug.
- Velocity trend: **Improving.** 10 iterations completed 3 features (FEAT-040, FEAT-041, FEAT-042), 1 phase gate (FEAT-039), 1 bug (BUG-027, BUG-030), 15 improvements, 2 testing-only iterations. Phase 3a completed and Phase 3b 75% done in 10 iterations.
- Self-score trends:
  - Code quality: 5/5 consistently on build iterations (stable, highest)
  - Test coverage: 2-5 (bifurcated — 5 on testing_only, 2-4 on builds depending on Playwright availability)
  - Confidence: 4-5 consistently (high, stable)
  - Efficiency: 5/5 across all 10 iterations (zero merge failures, zero re-attempts)
- Key observations:
  - Phase 3a completed (iter 112) and Phase 3b 75% done (FEAT-040, 041, 042 of 044 complete)
  - Pipeline reliability: 0% merge failure rate (down from 30% in iter 91-100, 50% in iter 71-80). This is the single biggest operational improvement.
  - P1 BUG-034 (step nodes unclickable) is a significant regression — blocks primary user workflow. Was not caught until live browser testing in iter 120. May have been introduced as early as iter 116 (section-node.tsx created).
  - Testing cadence working well: regression every 8 iterations, performance every 10-20 iterations. Playwright browser testing is now more reliable than earlier iterations.
  - Improvement backlog growing: 91 total IMP items logged. Consider dedicated improvement cleanup iterations.
- Codebase health check (iter 120):
  - Hotspot: gap-analysis-view.tsx in 4/10 — expected (AI features concentrated here), not a refactor candidate
  - Hotspot: improvements-view.tsx in 4/10 — expected (AI suggestions + polish), monitor
  - step-detail-panel.tsx at ~770 lines — exceeding 500-line threshold, flagged since iter 118
  - tools-canvas-view.tsx growing (521+ lines) — monitor
  - No duplication issues detected
  - Transfer size regression: canvas pages now exceed 1MB (1208KB) — React Flow bundle size
- Action:
  - P1 BUG-034 (step click interception) must be fixed before any new features
  - P1 BUG-035 (step-tools 500) — push migration 024 or verify/create step_tools table
  - Consider automating `npx supabase db push` in pipeline (3rd occurrence of migration-not-pushed bugs)
  - step-detail-panel.tsx needs refactoring (770+ lines) — add to IMPROVEMENTS.md if not already tracked
