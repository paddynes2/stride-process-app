# Responsive Suite

> Test the app at 7 viewport sizes to catch layout breakage.
> Budget: 35 actions. Apply CHECKLIST.md at each viewport.

---

## Viewport Breakpoints

| Name | Width | Height | Represents |
|------|-------|--------|------------|
| Mobile S | 375px | 667px | iPhone SE / 12 Mini |
| Mobile L | 428px | 926px | iPhone 14 Pro Max |
| Tablet | 768px | 1024px | iPad portrait |
| Laptop | 1024px | 768px | Small laptop / iPad landscape |
| Desktop | 1280px | 720px | Standard desktop |
| Wide | 1440px | 900px | Large desktop |
| Ultra-wide | 1920px | 1080px | Full HD |

**Minimum viable test set (if action budget is tight):** Mobile S (375), Tablet (768), Desktop (1280).

## Phase 1: Desktop Baseline

1. Set viewport to 1280x720 (Desktop)
2. Navigate to the main page
3. Inject the mega listener
4. Discover navigation structure at desktop size
5. Note the layout: sidebar, header, content width, grid columns

This is your reference point — everything else gets compared to this.

## Phase 2: Mobile Sweep

1. Resize to 375x667 (Mobile S)
2. Visit the same pages you noted at desktop. For each:
   - Run `window.__auditResponsive()` — check for overflow, truncation, touch targets
   - Check: Is navigation accessible? (hamburger menu, bottom nav, collapsible sidebar)
   - Check: Are data tables usable? (horizontal scroll, card view, or column hiding)
   - Check: Are forms usable? (input sizes, submit button reachable, keyboard not covering inputs)
   - Check: Is text readable without zooming? (>= 16px body text)
   - Check: No horizontal scroll on the page (THE most common mobile bug)

**Report each page:**
```
RESPONSIVE MAP (375px):
[x] /dashboard   — No overflow, nav collapsed, cards stack vertically
[!] /people      — Table overflows horizontally, no mobile alternative
[x] /people/new  — Form renders full width, all inputs accessible
[!] /deals       — Kanban columns overflow, no horizontal scroll indicator
```

## Phase 3: Tablet Sweep

1. Resize to 768x1024 (Tablet)
2. Visit 3-4 key pages. Check:
   - Does the layout use the intermediate breakpoint well? (not just mobile or desktop)
   - Are sidebar and content both visible, or does sidebar collapse?
   - Do grid layouts adjust column count?
   - Touch targets still >= 44x44px?

## Phase 4: Edge Cases

Pick 2-3 problematic pages from previous phases and test:

1. **Font scaling:** Run `document.documentElement.style.fontSize = '150%'` — does the layout survive 150% browser zoom?
2. **Landscape mobile:** Resize to 667x375 (iPhone SE landscape) — does the layout work?
3. **Ultra-narrow:** Resize to 320x568 (smallest viable phone) — does anything break?

## Phase 5: Responsive Patterns

For each page, evaluate which responsive pattern is used:

| Pattern | Good For | What to Check |
|---------|----------|---------------|
| Stack (column on mobile) | Cards, forms, content blocks | Items stack vertically, full width |
| Collapse (sidebar hides) | Navigation, panels | Sidebar becomes hamburger/drawer on mobile |
| Scroll (horizontal) | Data tables, timelines | Horizontal scroll works, indicator visible |
| Adapt (different component) | Data tables → card list | Mobile shows different layout, same data |
| Hide (remove on mobile) | Secondary content | Less critical content hidden, nothing essential lost |

Report whether each page uses an appropriate pattern.

## Completion

Report format:
```markdown
## Responsive Audit — Iteration [N]

**Viewports tested:** N
**Pages tested per viewport:** N
**Overflow issues:** N
**Touch target issues:** N
**Layout breakage:** N

### Per-Viewport Results
| Page | 375px | 768px | 1280px | Issues |
|------|-------|-------|--------|--------|
| /dashboard | OK | OK | OK | None |
| /people | FAIL | OK | OK | Table overflow at mobile |
| /deals | FAIL | WARN | OK | Kanban overflow at mobile, tight at tablet |

### Issues Found
| # | Severity | Page | Viewport | Finding |
|---|----------|------|----------|---------|
| 1 | P1 | /people | 375px | Table overflows horizontally, no scroll indicator |
| 2 | P2 | /deals | 375px | Kanban columns extend past viewport edge |
| 3 | P2 | /settings | 375px | Touch targets 28px (need 44px on mobile) |
```

**For each P1+ finding:** Add to `prd/BUGS.md`.
**Update `testing/RESULTS.md`** with this audit's results.
