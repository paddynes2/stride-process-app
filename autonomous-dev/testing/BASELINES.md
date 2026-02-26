# Performance Baselines

> Updated after performance suite runs. Agent compares against these.
> Flag any metric that regresses >20% from baseline even if still within absolute threshold.

---

## Thresholds (absolute — any route)

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| LCP | < 1500ms | < 2500ms | > 2500ms |
| FCP | < 1000ms | < 1800ms | > 1800ms |
| CLS | < 0.05 | < 0.1 | > 0.1 |
| INP | < 100ms | < 200ms | > 200ms |
| TTFB | < 400ms | < 800ms | > 800ms |
| Total JS bundle | < 200KB | < 350KB | > 350KB |

## Per-Route Baselines

| Route | LCP (ms) | CLS | FCP (ms) | JS (KB) | Updated |
|-------|----------|-----|----------|---------|---------|
| /workspaces | — | — | — | — | not measured |
| /w/[id]/[tab] (canvas) | — | — | — | — | not measured |
| /w/[id]/list | — | — | — | — | not measured |
| /w/[id]/gap-analysis | — | — | — | — | not measured |
| /w/[id]/teams | — | — | — | — | not measured |
| /w/[id]/settings | — | — | — | — | not measured |

<!-- Agent: populate after first performance suite run using __auditPerformance() -->
<!-- Run `npm run build` and note total .next/static size for JS bundle column -->

## How to Measure

1. **Core Web Vitals:** Inject mega listener (RUN.md Step 1), navigate to route, wait 5s, read `window.__perfMetrics`
2. **JS Bundle:** Run `npm run build`, check terminal output for `.next/static` size
3. **Per-route JS:** In browser DevTools Network tab, filter JS, reload page, sum transferred sizes
4. **Comparison:** After each performance iteration, update the table above with new values
