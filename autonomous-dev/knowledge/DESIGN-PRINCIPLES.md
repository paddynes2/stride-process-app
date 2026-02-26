# Design Principles Reference

> Foundational UX, UI, and interaction design principles.
> The agent consults this when evaluating usability, visual quality,
> and interaction design during testing and code review.
> This file is reference material — it is NOT modified during iterations.

---

## Nielsen's 10 Usability Heuristics

Source: Jakob Nielsen, Nielsen Norman Group (1994, updated 2020)

| # | Heuristic | What to Check | Automation |
|---|-----------|--------------|------------|
| 1 | **Visibility of system status** | Loading indicators during data fetch. Progress bars for multi-step flows. Active state on nav items. Feedback after every action (save, delete, submit). | HIGH — check for loading states, active nav, success/error toasts |
| 2 | **Match between system and real world** | Uses domain language (not dev terms). "Companies" not "Entities". "Save" not "Persist". Date formats match locale. No status enums shown raw. | MEDIUM — scan for camelCase, snake_case, ISO dates in visible text |
| 3 | **User control and freedom** | Undo available. Back navigation works. Confirmation dialogs on destructive actions. Edit mode can be cancelled. Escape closes modals. | HIGH — check for cancel buttons, confirm dialogs, back nav, Escape |
| 4 | **Consistency and standards** | Same action = same label everywhere. Same component = same style. Platform conventions followed (links look like links, buttons like buttons). | HIGH — terminology audit, component consistency audit |
| 5 | **Error prevention** | Confirmation on delete. Input validation before submit. Disabled button when form invalid. Format hints on complex fields. | HIGH — check for confirmation dialogs, inline validation |
| 6 | **Recognition rather than recall** | Options visible (dropdowns, not free-text for known values). Recently used items accessible. Search available for large datasets. Labels on every input. | MEDIUM — check for labels, dropdowns vs free-text, search |
| 7 | **Flexibility and efficiency of use** | Keyboard shortcuts available (advanced). Default values pre-filled. Bulk actions available. Pagination or infinite scroll for large lists. | LOW — keyboard testing, default values |
| 8 | **Aesthetic and minimalist design** | No unnecessary elements. Information hierarchy clear. White space used effectively. Cognitive load within thresholds. | MEDIUM — cognitive load audit, word count, interactive element count |
| 9 | **Help users recognize, diagnose, and recover from errors** | Error messages specific and actionable. Inline near the field. Clear path to fix. No technical jargon in errors. | HIGH — trigger errors, evaluate messages |
| 10 | **Help and documentation** | Empty states provide guidance. Tooltips on complex fields. Help text where needed. Onboarding for first-time users. | MEDIUM — check empty states, tooltips |

## Shneiderman's 8 Golden Rules

Source: Ben Shneiderman, "Designing the User Interface" (1986, 6th ed. 2016)

| # | Rule | Quick Check |
|---|------|------------|
| 1 | Strive for consistency | Same terminology, layout patterns, and interaction patterns across all pages |
| 2 | Seek universal usability | Works for novice AND expert users (tooltips for new users, shortcuts for power users) |
| 3 | Offer informative feedback | Every action produces visible feedback within 200ms |
| 4 | Design dialogs to yield closure | Multi-step flows have clear completion. "Done" states are obvious |
| 5 | Prevent errors | Constrain inputs (dropdowns, date pickers), validate before submit |
| 6 | Permit easy reversal of actions | Undo, cancel, edit, back — always available |
| 7 | Keep users in control | No auto-advance without user action. No forced sequences |
| 8 | Reduce short-term memory load | Show context inline. Don't require users to remember info from previous pages |

## Gestalt Principles (Visual Perception)

| Principle | Application | What to Check |
|-----------|------------|---------------|
| **Proximity** | Related items are close together. Unrelated items have visible separation. | Card padding groups content. Section spacing separates groups. |
| **Similarity** | Same type = same visual treatment. | All action buttons look the same. All status badges consistent. |
| **Continuity** | Elements in a line or curve are perceived as related. | Tables have consistent column alignment. Lists are vertically aligned. |
| **Closure** | The brain completes incomplete shapes. | Card borders can be subtle. Implied grouping (background color) works. |
| **Figure/Ground** | Primary content stands out from background. | Clear visual hierarchy. Modal overlay dims background. |
| **Common Region** | Elements in a bounded area are perceived as a group. | Cards, sections, form groups create logical groupings. |

## Fitts's Law

**Larger targets closer to the cursor are easier to click.**

| Context | Minimum Target Size | Comfortable Size |
|---------|-------------------|-----------------|
| Desktop (mouse) | 24 x 24 CSS px (WCAG 2.5.8 AA) | 32 x 32 px |
| Touch (mobile) | 44 x 44 CSS px (Apple/Google guideline) | 48 x 48 px |
| Primary action buttons | 36 x 36 px minimum | Full-width on mobile |
| Icon-only buttons | 32 x 32 px (with 8px padding on 16px icon) | 40 x 40 px |
| Inline links in text | Height of line-height | Add padding if standalone |

**Practical implications:**
- Place primary actions where the user's cursor already is (near the form, not at the top of the page)
- Make destructive actions smaller and further away than constructive actions
- Full-width buttons on mobile are easier than small centered buttons

## Animation & Timing Standards

Source: Material Design, Apple HIG, and empirical UX research

| Category | Duration | Easing | Use Case |
|----------|----------|--------|----------|
| Micro-feedback | 50-100ms | ease-out | Button press, checkbox toggle, icon state change |
| Element transition | 150-250ms | ease-in-out | Dropdown open, tooltip appear, tab switch |
| Layout transition | 200-350ms | ease-in-out | Accordion expand, panel slide, card move |
| Page transition | 250-500ms | ease-out | Route change animation, modal open |
| Loading entrance | 300-500ms | ease-out | Skeleton-to-content, fade-in |
| Stagger (lists) | 50-100ms per item | ease-out | List items appearing one by one (max 8-10 items) |

**Rules:**
- Under 100ms feels instant — no animation needed
- 100-300ms is the "responsive" zone — most UI animations belong here
- Over 500ms feels slow — only for dramatic or page-level transitions
- Over 1000ms = must show a loading indicator
- Reduce motion for `prefers-reduced-motion` users — no animation, instant transitions

## Cognitive Load Budget

Source: Miller's Law (7±2 items), cognitive psychology research

| Metric | Good | Warning | Overloaded |
|--------|------|---------|-----------|
| Interactive elements per page | < 25 | 25-40 | > 40 |
| Decisions per step (dropdowns, toggles, choices) | < 5 | 5-8 | > 8 |
| Distinct colors per page | < 10 | 10-15 | > 15 |
| Font families per page | ≤ 2 | 3 | > 3 |
| Font sizes per page | ≤ 6 | 7-9 | > 9 |
| Words per page (visible, not scrolled) | < 300 | 300-500 | > 500 |
| Form fields per form | < 7 | 7-12 | > 12 |
| Navigation items per level | ≤ 7 | 8-10 | > 10 |
| Nesting depth (visual) | ≤ 3 | 4 | > 4 |
| Steps to complete core task | < 5 | 5-8 | > 8 |

**When overloaded:** Break into steps (wizard), use progressive disclosure (show advanced only on demand), group related items (tabs, accordions), or split into multiple pages.

## Information Hierarchy

Every page should have a clear visual hierarchy with 3-4 levels:

```
Level 1: PRIMARY    — Page title, main CTA, primary metric
                      Largest text, strongest weight, most prominent color

Level 2: SECONDARY  — Section headings, secondary actions, summary data
                      Medium text, medium weight, standard color

Level 3: TERTIARY   — Body content, data in tables/lists, form labels
                      Normal text, normal weight, muted color

Level 4: SUBDUED    — Timestamps, metadata, helper text, disabled items
                      Small text, light weight, very muted color
```

**If everything looks the same weight, nothing stands out — the hierarchy is broken.**

## Empty State Design

Empty states are a critical UX moment — the first thing a new user sees.

### Good Empty State:
1. **Explain** what this page is for (1 sentence)
2. **Show** what it will look like with data (illustration or preview)
3. **Guide** with a clear CTA ("Create your first deal")
4. **Encourage** — positive tone, not "No data found"

### Bad Empty State:
- Just blank space
- "No results" with no guidance
- "0 items" in a table header with empty rows
- A sad face or error icon for a normal initial state

## Error Message Standards

| Dimension | Good | Bad |
|-----------|------|-----|
| **Specificity** | "Email address is required" | "Validation error" |
| **Actionability** | "Enter an email like name@company.com" | "Invalid input" |
| **Tone** | "Please enter your email address" | "You didn't enter an email" |
| **Placement** | Inline, next to the field | Only in a toast far from the field |
| **Persistence** | Visible until the user fixes it | Disappears after 3 seconds |
| **Recovery** | Clear what to do next | "Error" with no guidance |
| **Blame** | System-centric ("Something went wrong") | User-centric ("You did it wrong") |
| **Technical detail** | Hidden (logged, not shown) | Stack trace visible in UI |
