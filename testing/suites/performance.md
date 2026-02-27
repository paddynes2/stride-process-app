# Performance Suite

> Measure Core Web Vitals and resource efficiency on every key page.
> Budget: 20 actions. The mega listener captures metrics passively.

---

## Phase 1: Baseline Metrics

1. Navigate to the app's main page (cold load — not SPA navigation)
2. Wait for the page to fully load (3 seconds after navigation)
3. Inject the mega listener from `RUN.md` if not already injected
4. Run `window.__auditPerformance()` — record all metrics

### Core Web Vitals Thresholds (Google 2025)

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | <= 2500ms | 2500-4000ms | > 4000ms |
| INP (Interaction to Next Paint) | <= 200ms | 200-500ms | > 500ms |
| CLS (Cumulative Layout Shift) | <= 0.1 | 0.1-0.25 | > 0.25 |
| FCP (First Contentful Paint) | <= 1800ms | 1800-3000ms | > 3000ms |
| TTFB (Time to First Byte) | <= 800ms | 800-1800ms | > 1800ms |

Note: This is a dev server (localhost), so TTFB and FCP will be faster than production.
Focus on LCP and CLS as the most meaningful metrics for dev testing.

## Phase 2: Per-Page Performance

Navigate to each key page (5-8 pages) and for each:

1. Navigate directly (fresh load, not SPA)
2. Wait 3 seconds for metrics to settle
3. Run `window.__auditPerformance()`
4. Record: LCP, CLS, resource count, total transfer size

```
PERFORMANCE MAP:
/dashboard   — LCP: 1200ms, CLS: 0.02, Resources: 24, Transfer: 340KB — PASS
/people      — LCP: 1800ms, CLS: 0.00, Resources: 18, Transfer: 280KB — PASS
/deals       — LCP: 3100ms, CLS: 0.15, Resources: 32, Transfer: 520KB — FAIL (LCP, CLS)
```

## Phase 3: Resource Audit

On the heaviest page (largest transfer size), examine the performance audit output:

1. **Large resources** (> 250KB): Are they necessary? Could they be lazy-loaded?
2. **Render-blocking resources**: CSS/JS blocking first paint?
3. **Total resource count**: > 50 resources suggests optimization opportunity
4. **Total transfer size**: > 1MB for a single page is a warning

## Phase 4: Layout Shift Detection

Check `window.__layoutShifts` for CLS contributors.

For each page where CLS > 0.1:
1. What elements shifted? (images loading, dynamic content, fonts swapping)
2. Could the shift be prevented? (explicit dimensions, font-display, skeleton screens)

Common causes:
- Images without width/height attributes
- Dynamically inserted content above the fold
- Web fonts causing FOUT (Flash of Unstyled Text)
- Async-loaded components that push content down

## Phase 5: Interaction Responsiveness

On 2-3 interactive pages (forms, lists with sorting/filtering):

1. Click a button or link
2. Check `window.__perfMetrics.inp` — is worst INP under 200ms?
3. If INP > 200ms, note which interaction caused it

## Completion

Report format:
```markdown
## Performance Audit — Iteration [N]

**Pages tested:** N
**Pages passing all thresholds:** N
**Pages with warnings:** N
**Pages failing:** N

### Per-Page Results
| Page | LCP | CLS | INP | FCP | Resources | Transfer |
|------|-----|-----|-----|-----|-----------|----------|
| /dashboard | 1200ms | 0.02 | 45ms | 800ms | 24 | 340KB |
| /deals | 3100ms | 0.15 | 120ms | 1200ms | 32 | 520KB |

### Issues Found
| # | Severity | Page | Metric | Value | Threshold |
|---|----------|------|--------|-------|-----------|
| 1 | P2 | /deals | LCP | 3100ms | 2500ms |
| 2 | P2 | /deals | CLS | 0.15 | 0.1 |

### Resource Hotspots
| Resource | Size | Type | Page |
|----------|------|------|------|
| deals-bundle.js | 380KB | Script | /deals |

### Recommendations
1. [Specific recommendation with file/component]
```

**For each P2+ finding:** Add to `prd/BUGS.md` or `prd/TECH-DEBT.md`.
**Update `testing/RESULTS.md`** with this audit's results.
