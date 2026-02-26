# Visual Consistency Suite

> Verify the UI follows the design system. No hardcoded values, consistent spacing,
> correct typography hierarchy. This is the "pixel-perfect" suite.
> Budget: 25 actions. Focus on inspection, not interaction.

---

## Prerequisites

The app context file in `testing/apps/` should define design tokens. If not, discover them
by reading `globals.css`, `tailwind.config.ts`, or the design system documentation.
Note: This suite is MOST effective when design tokens are documented.

## Phase 1: Discover Design Tokens

Before auditing, establish the expected values:

1. Read the project's CSS variables / design tokens (from `globals.css` or similar)
2. Document the token set:

```
DESIGN TOKENS:
Font sizes: 11px, 12px, 13px, 14px, 16px, 20px, 24px, 32px
Spacing: 0, 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px
Colors (text): --text-primary, --text-secondary, --text-tertiary, --text-disabled
Colors (bg): --bg-app, --bg-surface, --bg-elevated, --bg-hover
Colors (brand): --brand, --accent-blue
Border radii: 4px, 6px, 8px, 12px, 9999px
Shadows: [list if defined]
```

## Phase 2: Typography Audit

On 3-5 pages, check heading hierarchy:

1. Are headings visually distinct? (each level smaller than the one above)
2. Do font sizes match the design token scale?
3. Is there exactly one heading level hierarchy? (no h1 that looks smaller than h2)
4. Is line-height consistent for body text? (typically 1.4-1.6)
5. Do all text elements use the defined font family?

Check via accessibility tree: heading levels should match visual hierarchy.

## Phase 3: Spacing Consistency

On 3-5 pages, inspect spacing:

1. **Section gaps:** Are all sections separated by the same amount?
2. **Card padding:** Do all cards have the same internal padding?
3. **Form field gaps:** Are all form fields spaced equally?
4. **Button padding:** Are all buttons the same height/padding for their size variant?
5. **List item gaps:** Are all list items evenly spaced?

Look for inconsistencies — one card with 16px padding and another with 20px is a violation.

## Phase 4: Color Audit

On each page:

1. **No hardcoded colors:** Inspect key elements — do they use CSS variables or hardcoded hex?
2. **Text color hierarchy:** Is primary text brighter than secondary? Secondary brighter than tertiary?
3. **Background consistency:** Do all surfaces at the same level use the same background color?
4. **Interactive colors:** Do all links use the same color? All primary buttons?
5. **Status colors:** Are success/warning/error colors used consistently across the app?

## Phase 5: Component Consistency

Compare the same component type across different pages:

| Component | Check | What to Compare |
|-----------|-------|----------------|
| Buttons | Same size variants everywhere? | Height, padding, border-radius, font-size |
| Inputs | Same styling on all forms? | Height, border color, focus ring, padding |
| Cards | Same shadow/border/radius? | box-shadow, border, border-radius, padding |
| Tables | Same row height, header style? | Row height, header bg, cell padding |
| Badges/pills | Same size, padding, radius? | height, padding, font-size, border-radius |
| Avatars | Same sizes and fallback? | Width/height, border-radius, placeholder |

**If component A on page X looks different from component A on page Y, that's a violation.**

## Phase 6: Alignment Check

On complex pages (dashboards, settings):

1. Are elements aligned to a consistent grid?
2. Are labels and values aligned in detail views?
3. Are action buttons consistently positioned (always right, always bottom)?
4. Are icons consistently sized within the same context?

## Completion

Report format:
```markdown
## Visual Consistency Audit — Iteration [N]

**Pages audited:** N
**Design token violations:** N
**Typography issues:** N
**Spacing inconsistencies:** N
**Color violations:** N
**Component inconsistencies:** N

### Issues Found
| # | Severity | Category | Page | Finding |
|---|----------|----------|------|---------|
| 1 | P2 | Color | /deals | Hardcoded #333 instead of var(--text-primary) |
| 2 | P3 | Spacing | /settings | Card padding 20px vs 16px on other pages |
| 3 | P2 | Typography | /people | h3 same size as h2 on this page |

### Design Token Compliance
| Token Type | Used Correctly | Violations | Pages Affected |
|------------|---------------|------------|----------------|
| Font sizes | 95% | 2 | /settings |
| Spacing | 90% | 3 | /deals, /settings |
| Colors | 85% | 5 | /deals, /people/new |
```

### Routing Findings

| Finding Type | Destination |
|-------------|------------|
| P2 (hardcoded color, broken typography hierarchy, wrong component style) | `prd/BUGS.md` |
| P3 (minor spacing inconsistency, icon size variation) | `prd/IMPROVEMENTS.md` — Low (visual polish) |
| Alignment issue | `prd/IMPROVEMENTS.md` — Low (visual polish) |
| Missing hover/active state on component | `prd/IMPROVEMENTS.md` — Medium (visual polish) |

**Update `testing/RESULTS.md`** with this audit's results.
