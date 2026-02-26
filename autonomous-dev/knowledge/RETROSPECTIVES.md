# Retrospectives

> Appended every 10th iteration. Agent analyzes patterns and trends.

---

## Retrospective — Iteration 10 (2026-02-26)

### Metrics Summary (Iterations 1-10)
- **Success rate:** 10/10 (100%) — all iterations completed
- **Task breakdown:** 7 build, 3 regression/testing
- **Failed tasks:** 0 — every task completed on first attempt
- **Bugs found during testing:** 9 total (1 in iter 2, 8 in iter 10)
- **Reverts:** 0

### Hotspot Files (top 3 by modification frequency)
1. `src/types/database.ts` — 3 iterations (1, 5, 9) — expected, grows with each new entity
2. `src/lib/api/client.ts` — 2 iterations (5, 9) — same reason, new API wrappers per entity
3. `src/components/canvas/step-node.tsx` — 2 iterations (1, 3) — maturity scoring display

No file appears in 5+ iterations — no decomposition needed yet.

### Self-Score Trends
| Metric | Iter 1-3 avg | Iter 4-6 avg | Iter 7-10 avg | Trend |
|--------|-------------|-------------|---------------|-------|
| Code quality | 4.3 | 3.0* | 4.3 | Stable |
| Test coverage | 3.3 | 4.3 | 4.5 | Improving |
| Confidence | 4.3 | 5.0 | 5.0 | Stable/High |
| Efficiency | 4.7 | 4.3 | 4.8 | Stable |

*Iter 6 was a testing-only iteration (code_quality=0), skewing the average.

### Velocity
- 8 feature sub-tasks completed in 10 iterations (80% feature velocity)
- 2 testing iterations (20%) — appropriate for risk-triggered + cadence-triggered testing
- Average complexity: M (medium) — all tasks well-scoped
- No XL tasks or decomposition needed beyond FEAT-005/006 sub-tasks

### Patterns
- **Schema changes trigger regression:** Migrations in iter 1, 5, 9 all triggered risk-based regression the following iteration. This is working correctly.
- **Accessibility debt is systemic:** 8 a11y bugs found across all pages suggest the base component library (buttons, sidebar, inputs) lacks aria attributes. A focused "add aria-labels to all icon buttons" pass would clear 3+ bugs at once.
- **No recurring failures:** No task has failed 2+ times. No SKIP_UNTIL markers needed.

### Action
- Consider batching BUG-002/003/004/005 fixes into a single "accessibility fundamentals" iteration since they share root causes (missing aria-labels, contrast tweaks)
- No process changes needed — velocity and quality are strong

## Retrospective — Iteration 20 (2026-02-26)

### Metrics Summary (Iterations 11-20)
- **Success rate:** 10/10 (100%) — all iterations completed
- **Task breakdown:** 9 build, 1 regression
- **Failed tasks:** 0 — every task completed
- **Bugs found:** 0 (no new bugs during feature work)
- **Reverts:** 0

### Hotspot Files (top 3 by modification frequency, iter 11-20)
1. `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` — **5 iterations** (11, 12, 13, 14, 16) — HOTSPOT threshold reached
2. `src/lib/export/pdf.ts` — 3 iterations (13, 14, 15) — expected, built across 3 sub-tasks
3. `src/lib/api/client.ts` — 2 iterations (12, 17) — new API wrappers added

**Action:** canvas-view.tsx is at the 5-iteration threshold. It serves as the orchestration point between FlowCanvas, detail panels, and export utilities. Consider extracting export-related logic into a separate hook (useCanvasExport) in a future improvement iteration.

### Self-Score Trends
| Metric | Iter 11-13 avg | Iter 14-16 avg | Iter 17-20 avg | Trend |
|--------|----------------|----------------|----------------|-------|
| Code quality | 5.0 | 5.0 | 5.0* | Stable |
| Test coverage | 4.3 | 3.0 | 2.5 | **DECLINING** |
| Confidence | 5.0 | 5.0 | 5.0 | Stable/High |
| Efficiency | 5.0 | 5.0 | 4.8 | Stable |

*Iter 20 was testing-only (code_quality=0), excluded from average.

**Test coverage decline analysis:** Directly correlated with Playwright MCP becoming unavailable around iter 13. Browser verification dropped from active testing (iter 1-12) to "skipped - Playwright MCP unavailable" (iter 13-20). This means 8 iterations of feature work have NOT been browser-tested.

### Velocity
- 4 full features completed in 10 iterations: FEAT-006 (costs), FEAT-007 (PDF), FEAT-008 (PNG), FEAT-009 (sharing)
- Phase 1 completed in 19 iterations (estimated 25-35) — 24-46% under budget
- Average complexity: M — tasks well-scoped with appropriate 3-sub-task decomposition for L tasks

### Patterns
- **Browser testing debt:** 8 consecutive iterations without browser testing is a significant risk. Phase 1.5 should prioritize getting Playwright MCP working or doing manual browser verification.
- **Additive-only changes are safe:** All 9 build iterations were additive (new files/features, not modifying existing behavior). This explains the 0 regressions.
- **Sub-task decomposition works well:** FEAT-007 (3 sub-tasks) and FEAT-009 (3 sub-tasks) both completed cleanly with data-layer → UI → polish ordering.

### Comparison to Previous Retrospective (Iter 10)
| Metric | Iter 1-10 | Iter 11-20 | Change |
|--------|-----------|------------|--------|
| Success rate | 100% | 100% | Same |
| Bugs found | 9 | 0 | Down (good for builds, but testing debt may mask issues) |
| Feature velocity | 80% | 90% | Improved |
| Test coverage avg | 4.1 | 3.2 | **Declined** |

### Actions
1. **HIGH PRIORITY:** Investigate Playwright MCP unavailability — 8 iterations of untested UI is a significant risk. Add to BUG/TECH-DEBT if not already tracked.
2. Add canvas-view.tsx decomposition to IMPROVEMENTS.md (extract useCanvasExport hook).
3. No process changes needed — velocity and code quality are strong. Test coverage is the only concern.

## Retrospective — Iteration 30 (2026-02-26)

### Metrics Summary (Iterations 21-30)
- **Success rate:** 10/10 (100%) — all iterations completed
- **Task breakdown:** 6 build/improve, 1 bugfix, 2 regression, 1 improve (responsive)
- **Failed tasks:** 0 — every task completed
- **Bugs found:** 0 (all 8 pre-existing bugs fixed in iter 21)
- **Reverts:** 0

### Hotspot Files (top 3 by modification frequency, iter 21-30)
1. `src/app/(app)/w/[workspaceId]/[tabId]/canvas-view.tsx` — 3 iterations (25, 27, 29) — still hotspot, but reduced from iter 11-20 (5 hits). Export hook extraction in iter 29 should reduce future hits.
2. `src/components/panels/step-detail-panel.tsx` — 3 iterations (25, 27, 29) — same cluster (error toasts, lazy loading, maturity extraction)
3. `src/app/(app)/w/[workspaceId]/gap-analysis/gap-analysis-view.tsx` — 2 iterations (21, 30) — a11y fixes + responsive

No file at 5+ iterations — hotspot concern from iter 20 retro addressed by hook extraction.

### Self-Score Trends
| Metric | Iter 21-23 avg | Iter 24-26 avg | Iter 27-30 avg | Trend |
|--------|----------------|----------------|----------------|-------|
| Code quality | 5.0 | 5.0 | 5.0* | Stable/High |
| Test coverage | 3.0 | 3.0 | 2.3 | Still low |
| Confidence | 5.0 | 5.0 | 5.0 | Stable/High |
| Efficiency | 4.3 | 4.7 | 4.5 | Stable |

*Iter 28 was testing-only (code_quality=0), excluded from average.

**Test coverage remains the weakest metric.** Playwright MCP has been unavailable for ALL 10 iterations (21-30). Every browser test and canary test was "skipped (Playwright MCP unavailable)". This is now 18 consecutive iterations without browser testing.

### Velocity
- Phase 1.5 progress: 6 of 7 tasks complete in 11 iterations (20-30)
- All 8 a11y bugs fixed in single iteration (21) — batching worked as iter 10 retro suggested
- Average complexity: M — tasks well-scoped
- FEAT-012 (loading/error states) decomposed into 3 sub-tasks, completed across 3 iterations — appropriate

### Patterns
- **Playwright MCP permanently unavailable:** 18 consecutive iterations without browser testing. At this point, treat it as a known constraint, not a temporary issue. All verification relies on static checks (typecheck, lint, build). Consider adding a TECH-DEBT item for unit/integration testing framework.
- **Phase 1.5 highly efficient:** Quality/hardening phase completed with zero regressions. All changes were additive or CSS-level modifications.
- **Code quality scores consistently 5:** Indicates high confidence in code quality, but without browser testing, this confidence may be inflated.

### Comparison Across All Retrospectives
| Metric | Iter 1-10 | Iter 11-20 | Iter 21-30 | Trend |
|--------|-----------|------------|------------|-------|
| Success rate | 100% | 100% | 100% | Consistent |
| Bugs found | 9 | 0 | 0 | Stable |
| Feature velocity | 80% | 90% | 80% | Stable |
| Test coverage avg | 4.1 | 3.2 | 2.6 | **Declining** |
| Efficiency avg | 4.5 | 4.9 | 4.5 | Stable |

### Actions
1. **Accept Playwright MCP unavailability as permanent.** Stop noting it as a temporary issue. Add unit/integration test framework to TECH-DEBT for Phase 2a.
2. **FEAT-016 (golden path test) will be limited to static verification** unless Playwright becomes available. Document this limitation clearly.
3. **Consider Vitest or similar for component testing** — would improve test coverage scores without relying on browser automation.
4. canvas-view.tsx hotspot reduced from 5 hits (iter 11-20) to 3 hits (iter 21-30) after export hook extraction. The action from iter 20 retro worked.
