# Perfection Scorecard

> The world-class definition of done. A page/feature is "perfect" when it scores
> 100% across all 10 dimensions. Use this scorecard at phase completion milestones
> and before declaring any feature truly done.
>
> Each dimension has specific, measurable criteria. No hand-waving. No "looks good."

---

## How to Use

1. At **phase completion** (all features in a phase are done), score every page
2. At **full audit** time, score the entire app
3. Each criterion is PASS or FAIL — no partial credit
4. **Target: 95%+ across all dimensions** before shipping
5. Items marked P0/P1 that FAIL are blockers. P2/P3 items are tracked in TECH-DEBT.md.

---

## Dimension 1: Functional Correctness

> Does it work? Every feature does what the PRD says it should.

| # | Criterion | Severity |
|---|-----------|----------|
| 1.1 | All CRUD operations complete successfully | P0 |
| 1.2 | Data persists across page refresh | P0 |
| 1.3 | Forms validate inputs and show specific errors | P1 |
| 1.4 | Navigation reaches every route described in the PRD | P0 |
| 1.5 | Search returns correct results | P1 |
| 1.6 | Sorting orders data correctly (both directions) | P1 |
| 1.7 | Filtering reduces results accurately | P1 |
| 1.8 | Pagination shows no duplicates, correct totals | P1 |
| 1.9 | Real-time updates reflect changes without refresh | P2 |
| 1.10 | No console errors during normal usage | P0 |

**Test with:** `testing/suites/data-integrity.md`, `testing/suites/forms.md`

## Dimension 2: Accessibility (WCAG 2.2 AA)

> Can everyone use it? Inclusive by default, not as an afterthought.

| # | Criterion | Severity |
|---|-----------|----------|
| 2.1 | All text meets 4.5:1 contrast ratio (3:1 for large text) | P1 |
| 2.2 | All form inputs have associated labels | P1 |
| 2.3 | All images have alt text (or role="presentation") | P1 |
| 2.4 | Heading hierarchy is sequential (no skipped levels) | P2 |
| 2.5 | Every page has exactly one h1 | P2 |
| 2.6 | All interactive elements are keyboard accessible | P1 |
| 2.7 | Focus indicator is visible on every focusable element | P1 |
| 2.8 | Tab order follows visual order | P2 |
| 2.9 | Modals trap focus and return focus on close | P1 |
| 2.10 | Touch targets are ≥24x24 CSS px (≥44x44 on mobile) | P2 |
| 2.11 | html lang attribute is set | P2 |
| 2.12 | Page has a descriptive title | P2 |

**Test with:** `testing/suites/accessibility.md`, `window.__auditAccessibility()`

## Dimension 3: Performance

> Is it fast? Users perceive "instant" under 100ms and "slow" over 1s.

| # | Criterion | Severity |
|---|-----------|----------|
| 3.1 | LCP ≤ 2500ms on every page | P1 |
| 3.2 | CLS ≤ 0.1 on every page | P1 |
| 3.3 | INP ≤ 200ms (no interaction feels sluggish) | P2 |
| 3.4 | FCP ≤ 1800ms (content appears quickly) | P2 |
| 3.5 | TTFB ≤ 800ms (server responds quickly) | P2 |
| 3.6 | No resource over 250KB (images, JS bundles) | P2 |
| 3.7 | Total page weight under 1MB | P2 |
| 3.8 | No render-blocking resources | P2 |
| 3.9 | No memory leaks (heap stable over 60s) | P2 |
| 3.10 | No layout shifts on interaction | P2 |

**Test with:** `testing/suites/performance.md`, `window.__auditPerformance()`

## Dimension 4: Responsive Design

> Does it work on every screen size? Mobile-first is a floor, not a ceiling.

| # | Criterion | Severity |
|---|-----------|----------|
| 4.1 | No horizontal overflow on any viewport (320px to 1920px) | P1 |
| 4.2 | Navigation adapts to mobile (hamburger, bottom nav, or collapse) | P1 |
| 4.3 | Tables scroll horizontally or stack on mobile | P1 |
| 4.4 | Forms are usable on 375px width (inputs full-width, labels above) | P1 |
| 4.5 | Text readable without zooming (≥14px on mobile) | P2 |
| 4.6 | Images scale proportionally (no stretching or cropping) | P2 |
| 4.7 | Modals/dialogs fit within viewport on mobile | P2 |
| 4.8 | Works at 150% browser zoom | P2 |
| 4.9 | Touch targets ≥44x44 on mobile viewports | P2 |
| 4.10 | Landscape mode doesn't break layout | P3 |

**Test with:** `testing/suites/responsive.md`, `window.__auditResponsive()`

## Dimension 5: Visual Consistency

> Does it look intentional? Every element follows the design system.

| # | Criterion | Severity |
|---|-----------|----------|
| 5.1 | All colors use CSS variables / design tokens (no hardcoded hex) | P2 |
| 5.2 | Spacing follows the defined scale (no arbitrary pixel values) | P3 |
| 5.3 | Typography uses the defined font size scale | P2 |
| 5.4 | ≤2 font families used | P2 |
| 5.5 | Same component looks identical on all pages (buttons, cards, inputs) | P2 |
| 5.6 | Headings have clear visual hierarchy (h1 > h2 > h3) | P2 |
| 5.7 | Icons consistently sized within context | P3 |
| 5.8 | Status colors (success/warning/error) used consistently | P2 |
| 5.9 | Elements align to a consistent grid | P3 |
| 5.10 | Action buttons consistently positioned (always right, always bottom) | P3 |

**Test with:** `testing/suites/visual-consistency.md`

## Dimension 6: Content & Copy

> Is every word intentional? No placeholder text, no jargon, no inconsistency.

| # | Criterion | Severity |
|---|-----------|----------|
| 6.1 | No placeholder text (Lorem ipsum, TODO, Coming soon) | P1 |
| 6.2 | No debug output visible (JSON, stack traces, undefined, [object Object]) | P0 |
| 6.3 | Terminology consistent across pages (same concept = same word) | P3 |
| 6.4 | Action labels consistent (Save/Submit/Create used predictably) | P3 |
| 6.5 | Error messages are specific, actionable, and user-friendly | P2 |
| 6.6 | Empty states have guidance (what this is, what to do, CTA) | P2 |
| 6.7 | Dates, numbers, and currencies formatted for locale | P2 |
| 6.8 | Button text describes the action ("Create Deal", not "Submit") | P2 |
| 6.9 | No broken images or missing icons | P2 |
| 6.10 | Microcopy is helpful — placeholders are examples, not instructions | P3 |

**Test with:** `testing/suites/content-quality.md`, `window.__auditContent()`

## Dimension 7: User Journeys (Golden Paths)

> Can users accomplish their goals? Friction-free from entry to value.

| # | Criterion | Severity |
|---|-----------|----------|
| 7.1 | Every golden path completes end-to-end without errors | P0 |
| 7.2 | Core journey (entry to first value) takes <10 clicks | P2 |
| 7.3 | No step in any journey has friction ≥4/5 | P1 |
| 7.4 | Next action is always obvious (visible CTA, logical flow) | P2 |
| 7.5 | Feedback is immediate at every step (loading, success, error) | P1 |
| 7.6 | Recovery from mistakes is possible at every step (back, undo, edit) | P1 |
| 7.7 | Empty state guides user to first golden path | P2 |
| 7.8 | First-time experience is self-explanatory | P2 |

**Test with:** `testing/suites/golden-paths.md`

## Dimension 8: State Coverage

> Every state is handled. No blank screens, no silent failures, no confusion.

| # | Criterion | Severity |
|---|-----------|----------|
| 8.1 | Loading state shown during all async operations | P2 |
| 8.2 | Error state shown when operations fail | P1 |
| 8.3 | Empty state shown when no data exists | P2 |
| 8.4 | Success state shown after completed actions | P2 |
| 8.5 | Disabled state visually distinct on inactive elements | P2 |
| 8.6 | Hover state on all interactive elements | P3 |
| 8.7 | Active/pressed state on buttons | P3 |
| 8.8 | Skeleton/placeholder state during initial load | P3 |
| 8.9 | Offline state handled gracefully (if applicable) | P2 |
| 8.10 | Partial data state handled (some fields loaded, others pending) | P2 |

**Test with:** `testing/suites/states.md`, `testing/suites/golden-paths.md` (Phase 4)

## Dimension 9: Security

> No client-side vulnerabilities. Data is protected. Auth is enforced.

| # | Criterion | Severity |
|---|-----------|----------|
| 9.1 | No XSS vulnerabilities (all user input escaped in DOM) | P0 |
| 9.2 | No sensitive data in localStorage/sessionStorage | P1 |
| 9.3 | No sensitive data in URL parameters | P1 |
| 9.4 | Authentication boundaries enforced (unauthenticated users redirected) | P0 |
| 9.5 | No open redirect vulnerabilities | P1 |
| 9.6 | API responses don't leak unauthorized data | P1 |
| 9.7 | CSP header present (at least in production) | P3 |
| 9.8 | HTTPS enforced (at least in production) | P1 |
| 9.9 | No source maps in production | P3 |
| 9.10 | No sensitive data logged to console | P2 |

**Test with:** `testing/suites/security.md`, `window.__auditSecurity()`

## Dimension 10: Resilience & Edge Cases

> Break it on purpose. If it breaks in testing, it'll break in production.

| # | Criterion | Severity |
|---|-----------|----------|
| 10.1 | Double-submit creates only one record | P1 |
| 10.2 | Long content doesn't break layout | P2 |
| 10.3 | Special characters display correctly (<, >, &, ", emoji) | P2 |
| 10.4 | Very long names/emails/text truncate gracefully with ellipsis | P2 |
| 10.5 | Rapid navigation doesn't cause race conditions | P1 |
| 10.6 | Browser back/forward doesn't corrupt state | P1 |
| 10.7 | Page refresh preserves expected state | P2 |
| 10.8 | Slow network doesn't cause silent failures | P2 |
| 10.9 | Required fields enforced on form submission | P1 |
| 10.10 | Confirmation dialog on destructive actions (delete) | P1 |

**Test with:** `testing/suites/data-integrity.md` (Phase 6), `testing/suites/forms.md`

---

## Scoring

**Per dimension:** `(criteria passing / total criteria) × 100`

**Overall score:** Average of all 10 dimensions

| Score | Rating | Action |
|-------|--------|--------|
| 95-100% | SHIP IT | Ready for production |
| 85-94% | POLISH | Fix P1+ items, ship when resolved |
| 70-84% | WORK NEEDED | Fix P0/P1 items before any release |
| Below 70% | NOT READY | Major gaps — continue development |

## Scoring Template

```markdown
## Perfection Score — [Date]

| # | Dimension | Pass | Total | Score |
|---|-----------|------|-------|-------|
| 1 | Functional | /10 | 10 | % |
| 2 | Accessibility | /12 | 12 | % |
| 3 | Performance | /10 | 10 | % |
| 4 | Responsive | /10 | 10 | % |
| 5 | Visual | /10 | 10 | % |
| 6 | Content | /10 | 10 | % |
| 7 | Journeys | /8 | 8 | % |
| 8 | States | /10 | 10 | % |
| 9 | Security | /10 | 10 | % |
| 10 | Resilience | /10 | 10 | % |
| | **OVERALL** | | **100** | **%** |

### P0/P1 Failures (Must Fix)
| Dim | # | Criterion | Finding |
|-----|---|-----------|---------|
| ... | ... | ... | ... |
```
