# Test Results — Stride

## Iteration 134 — 2026-03-05 (Testing-Only: Phase 3b Revalidation)

### Acceptance Suite (8/8 PASS)
| Criterion | Task | Result |
|-----------|------|--------|
| FEAT-040: Tools canvas renders with React Flow | FEAT-040 | PASS |
| FEAT-042: Tool Analysis panel shows analysis cards | FEAT-042 | PASS |
| FEAT-043: Enhanced PDF export dialog with presets | FEAT-043 | PASS |
| BUG-042: PDF Cost Analysis section present | BUG-042 | PASS |
| BUG-043: Dynamic section availability with tooltips | BUG-043 | PASS |
| BUG-044: AI Insights gating | BUG-044 | PASS |
| BUG-048: Dynamic page titles | BUG-048 | PASS |
| BUG-045-051: Zero a11y violations (tools + canvas) | BUG-045-051 | PASS |

### Regression Suite — Static Analysis (16/16 PASS)
| Criterion | Result |
|-----------|--------|
| BUG-048: Dynamic page titles metadata | PASS |
| BUG-043: Dynamic section availability masking | PASS |
| BUG-042: PDF cost chain includes tool costs | PASS |
| BUG-044: AI Insights gating requires analysis | PASS |
| BUG-045/047: Sidebar aria-labels | PASS |
| BUG-049: Canvas sr-only h1 | PASS |
| BUG-046: Settings workspace name label | PASS |
| BUG-050: Workspaces main landmark | PASS |
| BUG-051: Step list table aria-label | PASS |
| FEAT-043: Export dialog maskedCount hint | PASS |
| FEAT-042: Tool Analysis toggle button | PASS |
| Regression: Canvas node click dispatch | PASS |
| Regression: Section-node pointer events | PASS |
| Regression: TypeScript compilation clean | PASS |
| Regression: ESLint clean (1 pre-existing warning) | PASS |
| Signup page refactor: server component + client form | PASS |

### Quality Gate
- Console errors: 0
- Network errors: 0
- Accessibility issues: 1 (BUG-052: export PDF close button)
- Layout shifts: 0
- Note: Regression suite used static analysis (Playwright unavailable — Chrome profile lock)
