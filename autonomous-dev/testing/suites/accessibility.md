# Accessibility Suite (WCAG 2.2 AA)

> Audit every page for accessibility compliance. Catches ~57% of WCAG issues via automated checks.
> Budget: 35 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Inject and Scan

1. Navigate to the app's main page
2. Inject the mega listener from `RUN.md`
3. Run `window.__auditAccessibility()` — record all violations
4. Repeat on 5-8 key pages (dashboard, list views, detail views, forms, settings)

For each page, record the violation count and types.

## Phase 2: Color Contrast

The `__auditAccessibility()` function checks text-on-background contrast.
Review violations:

| Check | WCAG SC | Threshold | How |
|-------|---------|-----------|-----|
| Normal text contrast | 1.4.3 | >= 4.5:1 | Automated in audit function |
| Large text contrast | 1.4.3 | >= 3.0:1 | Automated (>=24px or >=18.66px bold) |
| UI component contrast | 1.4.11 | >= 3.0:1 | Check buttons, inputs, icons vs background |
| Focus indicator contrast | 2.4.13 | >= 3.0:1 | Tab to elements, check focus ring visibility |

**Report each failing element** with the actual ratio and the required minimum.

## Phase 3: Keyboard Navigation

On 3-4 representative pages (dashboard, list, form, detail):

1. Press `Tab` through the entire page (up to 50 presses)
2. For EACH focused element, check:
   - Is the focus indicator visible? (outline, ring, shadow)
   - Is the element interactive? (skip purely decorative focus)
   - Does the tab order follow the visual layout? (left-to-right, top-to-bottom)
3. Press `Enter` on focused buttons/links — do they activate?
4. Press `Escape` on open modals/dropdowns — do they close?
5. If there are modals: verify focus is trapped inside while open
6. If there are modals: verify focus returns to the trigger element on close

**Report:**
- Total focusable elements found
- Elements with invisible focus (P1)
- Tab order illogical (P2)
- Modal focus trap missing (P1)

## Phase 4: Semantic Structure

Check on each page:

| Check | WCAG SC | How |
|-------|---------|-----|
| Exactly one `h1` | 1.3.1 | Count h1 elements in accessibility tree |
| Heading order sequential | 1.3.1 | h1 → h2 → h3, no skips (e.g., h1 → h3) |
| Main landmark exists | Best practice | `<main>` or `role="main"` present |
| Nav landmark exists | Best practice | `<nav>` present |
| All inputs have labels | 1.3.1 | `__auditAccessibility()` checks this |
| All images have alt text | 1.1.1 | `__auditAccessibility()` checks this |
| All buttons have names | 4.1.2 | `__auditAccessibility()` checks this |
| Page has `<title>` | 2.4.2 | `document.title` is meaningful |
| `<html>` has `lang` attr | 3.1.1 | `__auditAccessibility()` checks this |

## Phase 5: Interactive Components

For each interactive component type found (modals, dropdowns, tabs, accordions):

1. **Dialog/Modal:**
   - Has `role="dialog"` or `<dialog>` element
   - Has `aria-modal="true"`
   - Has `aria-labelledby` or `aria-label`
   - Focus moves into dialog on open
   - Escape closes dialog
   - Focus returns to trigger on close

2. **Dropdown/Menu:**
   - Has appropriate ARIA roles (`menu`, `menuitem`)
   - Arrow keys navigate between items
   - Escape closes the menu

3. **Tabs:**
   - Tab container has `role="tablist"`
   - Each tab has `role="tab"` and `aria-selected`
   - Tab panels have `role="tabpanel"` and `aria-labelledby`

4. **Toast/Alert:**
   - Uses `role="alert"` or `aria-live="polite"`
   - Not the only way to communicate errors (also inline)

## Phase 6: Target Sizes

The `__auditAccessibility()` function checks WCAG 2.5.8 (24x24 minimum).
Review the violations list.

For mobile viewports (if testing responsive): targets should be 44x44 minimum.

## Completion

Report format:
```markdown
## Accessibility Audit — Iteration [N]

**Pages audited:** N
**Total violations:** N
**Critical (P0-P1):** N
**Contrast failures:** N
**Missing labels:** N
**Keyboard issues:** N
**Semantic issues:** N
**Target size violations:** N

### Violations by Category
| Category | Count | Severity | Pages Affected |
|----------|-------|----------|----------------|
| Color contrast | N | P1 | /page1, /page2 |
| Missing labels | N | P1 | /forms |
| ... | | | |

### Critical Issues (fix immediately)
1. [Description] — [page] — [WCAG SC]
2. ...

### Keyboard Navigation Map
| Page | Focusable Elements | Tab Order | Focus Visible | Issues |
|------|-------------------|-----------|---------------|--------|
| /dashboard | 12 | Logical | Yes | None |
| /people/new | 8 | Logical | Partial | 2 inputs invisible focus |
```

**For each P0/P1 finding:** Add to `prd/BUGS.md` with severity, WCAG success criterion, and affected pages.
**Update `testing/RESULTS.md`** with this audit's results.
