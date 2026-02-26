# Test Suite Index — Stride

## Available Suites

| Suite | File | Actions | Cadence | Trigger |
|-------|------|---------|---------|---------|
| Regression | `suites/regression.md` | 15-20 | Every 8th iteration or risk ≥ 3 | Mandatory floor |
| Accessibility | `suites/accessibility.md` | 20-30 | Every 10th even iter (10, 30, 50) | Cadence |
| Performance | `suites/performance.md` | 10-15 | Every 10th odd iter (20, 40, 60) | Cadence |
| Forms | `suites/forms.md` | 10-15 | When forms modified | Triggered |
| Navigation | `suites/navigation.md` | 10-15 | When routes/links modified | Triggered |
| Golden Paths | `suites/golden-paths.md` | 20-30 | Phase completion | Phase gate |
| Data Integrity | `suites/data-integrity.md` | 15-20 | Risk ≥ 5 or phase completion | Risk/phase gate |
| Responsive | `suites/responsive.md` | 10-15 | Phase completion | Phase gate |
| Security | `suites/security.md` | 15-20 | Phase completion | Phase gate |
| Visual Consistency | `suites/visual-consistency.md` | 10-15 | Phase completion | Phase gate |
| Content Quality | `suites/content-quality.md` | 10-15 | Phase completion | Phase gate |
| UX Sweep | (inline in PROMPT.md) | Full iteration | Every 20th iter | Cadence |

## Suite Selection Guide

1. **Every iteration:** Quick Gate from CHECKLIST.md (5 checks)
2. **Feature iterations:** Standard Gate (20 checks) + triggered suites
3. **Regression iterations:** Full Regression suite
4. **Phase completion:** Golden Paths → Data Integrity → Responsive → Accessibility → Security → Visual Consistency → Content Quality → Performance (one per iteration)

## Triggered Suite Rules

| If you modified... | Run suite |
|-------------------|-----------|
| Any `<form>`, `<input>`, `<select>` | Forms |
| Any route, link, sidebar item | Navigation |
| Auth/middleware/RLS | Security |
| Shared UI components (button, input, badge) | Visual Consistency |
| Canvas components | Regression (canvas section) |
| Data model/migrations | Data Integrity |
