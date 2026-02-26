# Design Principles — Stride

## Nielsen's 10 Usability Heuristics

1. **Visibility of system status** — Always inform users about what's happening (loading states, save confirmations, error messages)
2. **Match between system and real world** — Use process mapping terminology users know
3. **User control and freedom** — Provide undo, cancel, back navigation. Never trap users.
4. **Consistency and standards** — Same interaction pattern across all entity types (steps, sections, touchpoints, stages)
5. **Error prevention** — Confirmation dialogs for destructive actions. Disable invalid actions.
6. **Recognition rather than recall** — Show options, don't make users remember. Use dropdowns, not free-text for status.
7. **Flexibility and efficiency** — Keyboard shortcuts for power users. Direct manipulation on canvas.
8. **Aesthetic and minimalist design** — Dark Matter theme. Only show what's needed.
9. **Help users recognize, diagnose, and recover from errors** — Specific error messages with suggested actions.
10. **Help and documentation** — Empty states that guide next action. Tooltips on complex controls.

## Cognitive Load Thresholds

- **Miller's Law:** 7±2 items per group. Navigation items, dropdown options, table columns.
- **Hick's Law:** Decision time increases with number of choices. Reduce options where possible.
- **Total interactive elements per viewport:** Flag if > 30
- **Nesting depth:** Flag if > 3 levels

## Fitts's Law

- **Minimum click target:** 44x44px (WCAG 2.5.8 Target Size)
- **Important actions:** Larger targets, closer to current focus
- **Destructive actions:** Smaller targets, further from primary actions

## Gestalt Principles

- **Proximity:** Group related items with spacing. Separate unrelated items.
- **Similarity:** Same visual treatment for same-type elements.
- **Continuity:** Alignment guides the eye. Maintain consistent left edges.
- **Closure:** Canvas sections visually contain their steps.

## Animation & Timing

- **Micro-interactions:** 150-300ms ease-out
- **Page transitions:** 200-400ms
- **Loading feedback:** Show within 100ms of action
- **Toast duration:** 3-5 seconds for info, persistent for errors
