# Test Suite Index

> Master index of all test suites. Use this to select suites for a session
> and to plan testing cadences within the Ralph Loop.

---

## All Suites

| # | Suite | File | Budget | Focus | When to Run |
|---|-------|------|--------|-------|-------------|
| 1 | **Navigation** | `navigation.md` | 40 actions | Route completeness, link health, nav structure | Every 5th iteration (regression) |
| 2 | **Forms** | `forms.md` | 30 actions | Input validation, submission, edge cases | After any form change |
| 3 | **States** | `states.md` | 25 actions | Loading, error, empty, success, disabled states | After any new page/component |
| 4 | **UX Review** | `ux-review.md` | 30 actions | Nielsen heuristics, user flow, friction | Phase completion |
| 5 | **Regression** | `regression.md` | 25 actions | Baseline comparison, silent breakage | Every 5th iteration (automatic) |
| 6 | **Accessibility** | `accessibility.md` | 35 actions | WCAG 2.2 AA compliance, keyboard nav, screen reader | Every 10th iteration |
| 7 | **Performance** | `performance.md` | 20 actions | Core Web Vitals, resource audit, memory | Every 10th iteration |
| 8 | **Responsive** | `responsive.md` | 35 actions | 7 breakpoints, mobile/tablet/desktop, zoom | Phase completion |
| 9 | **Visual Consistency** | `visual-consistency.md` | 25 actions | Design system compliance, tokens, spacing | Phase completion |
| 10 | **Data Integrity** | `data-integrity.md` | 40 actions | CRUD, sorting, filtering, pagination, edge cases | After any data model change |
| 11 | **Security** | `security.md` | 30 actions | XSS, storage, auth boundaries, URL manipulation | Phase completion |
| 12 | **Golden Paths** | `golden-paths.md` | 40 actions | End-to-end user journeys, friction scoring | Phase completion |
| 13 | **Content Quality** | `content-quality.md` | 25 actions | Placeholder text, terminology, error messages, cognitive load | Phase completion |

**Total budget for full audit:** ~400 actions across all suites

---

## Testing Cadences

### Per-Iteration (Every Iteration)

During Phase 4 of every Ralph Loop iteration:
1. Run `testing/CHECKLIST.md` on every page visited (quick gate — 5 essential checks minimum)
2. Test your specific change (happy path + 1-2 edge cases)
3. Budget: 10 actions

### Every 5th Iteration (Regression)

Automatic via PROMPT.md Phase 2:
1. Run `regression.md` full suite (25 actions)
2. Compare against baseline in RESULTS.md
3. Any new regressions → P0/P1 bugs

### Every 10th Iteration (Deep Quality)

Alternate between:
- **Even 10s (10, 30, 50...):** Run `accessibility.md`
- **Odd 10s (20, 40, 60...):** Run `performance.md`

### Phase Completion (All features in a phase done)

Run the **Full Quality Audit**:

```
Phase Completion Testing Plan:
1. golden-paths.md      — 40 actions (journeys work end-to-end?)
2. data-integrity.md    — 40 actions (CRUD round-trip solid?)
3. responsive.md        — 35 actions (works on all screens?)
4. accessibility.md     — 35 actions (WCAG 2.2 AA compliant?)
5. security.md          — 30 actions (no client-side vulnerabilities?)
6. visual-consistency.md — 25 actions (design system followed?)
7. content-quality.md   — 25 actions (copy is professional?)
8. performance.md       — 20 actions (fast enough?)
9. Perfection Scorecard — score all 10 dimensions

Total: ~250 actions (6-8 iterations dedicated to testing)
```

Schedule these as tasks in `prd/FEATURES.md` when a phase completes.

### Pre-Ship (Before declaring "done")

Run everything above plus:
1. `ux-review.md` — heuristic evaluation
2. Full `regression.md` pass
3. Score the `PERFECTION-SCORECARD.md` — target 95%+

---

## Triggered Suites

These suites are triggered by specific code changes, not cadence:

| Change Type | Suite to Run |
|-------------|-------------|
| New/modified form | `forms.md` (relevant tests only) |
| New/modified route | `navigation.md` (relevant tests only) |
| New/modified component | `states.md` + `visual-consistency.md` |
| Data model change | `data-integrity.md` |
| Auth/security change | `security.md` |
| CSS/design token change | `visual-consistency.md` + `responsive.md` |
| New page | Full `CHECKLIST.md` + `accessibility.md` (quick pass) |

---

## Suite Selection Guide

**"I have 10 actions"** → Per-page CHECKLIST.md only
**"I have 25 actions"** → Regression sweep
**"I have 40 actions"** → One focused suite (pick the most relevant)
**"I have 100 actions"** → Golden paths + data integrity + responsive
**"I have 250 actions"** → Full quality audit (phase completion)
**"I have 400 actions"** → Everything + perfection scorecard

---

## Full Audit Mode

When `testing/RUN.md` references "full audit mode," run suites in this order:

1. **Golden Paths** (most important — do user journeys work?)
2. **Data Integrity** (does CRUD work correctly?)
3. **Navigation** (can users reach everything?)
4. **Forms** (do inputs work?)
5. **States** (are all states handled?)
6. **Accessibility** (is it inclusive?)
7. **Responsive** (does it work on all screens?)
8. **Security** (is it safe?)
9. **Visual Consistency** (does it look intentional?)
10. **Content Quality** (is the copy professional?)
11. **Performance** (is it fast?)
12. **UX Review** (heuristic evaluation)

This order prioritizes "does it work?" → "can everyone use it?" → "does it look good?" → "is it fast?"
