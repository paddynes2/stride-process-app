# Per-Page Quality Gate Checklist — Stride

## Quick Gate (5 checks — minimum every iteration)

1. [ ] **Console clean:** No new errors in `window.__testErrors`
2. [ ] **Visual integrity:** Page renders without layout breaks or overlapping elements
3. [ ] **Primary action works:** The main CTA/interaction on this page functions correctly
4. [ ] **Navigation works:** Can navigate to and from this page without errors
5. [ ] **Data loads:** Dynamic content loads and displays correctly (no spinners stuck)

## Standard Gate (20 checks — for feature iterations)

### Functionality (5)
6. [ ] CRUD operations complete without error
7. [ ] Form validation fires on invalid input
8. [ ] Optimistic updates reflect immediately
9. [ ] Undo/cancel returns to previous state
10. [ ] Edge case: empty/null data handled gracefully

### Visual (5)
11. [ ] Text hierarchy follows design system (90/55/30/15% opacity)
12. [ ] Spacing is consistent (no misaligned elements)
13. [ ] Colors match design tokens (no hardcoded hex values)
14. [ ] Responsive: no horizontal overflow at 1024px
15. [ ] Dark theme: no white flashes or unstyled content

### Accessibility (5)
16. [ ] All interactive elements keyboard-reachable (Tab through page)
17. [ ] Focus indicator visible on focused elements
18. [ ] Images/icons have alt text or aria-label
19. [ ] Form inputs have associated labels
20. [ ] Heading hierarchy is logical (no skipped levels)

### State Coverage (5)
21. [ ] Loading state exists (skeleton or spinner)
22. [ ] Empty state exists (guidance text, not blank)
23. [ ] Error state exists (message, not blank)
24. [ ] Success feedback exists (toast, visual change)
25. [ ] Disabled state exists where applicable

## Full Gate (35 checks — for regression/phase completion)

### Performance (5)
26. [ ] Page loads in < 3 seconds
27. [ ] No visible layout shift after load
28. [ ] Scrolling is smooth (no jank)
29. [ ] Large lists don't freeze the UI
30. [ ] Images/heavy content lazy-loaded

### Microcopy (5 — UX sweeps only)
31. [ ] Button labels are specific ("Create workspace" not "Submit")
32. [ ] Placeholders are examples, not instructions
33. [ ] Error messages are specific and actionable
34. [ ] Empty states guide users toward next action
35. [ ] Confirmation dialogs explain consequences

### Security (5 — phase completion only)
36. [ ] No sensitive data in URL params
37. [ ] API calls use correct auth headers
38. [ ] No client-side secrets exposed
39. [ ] XSS vectors handled (user-generated content escaped)
40. [ ] CSRF protection in place for mutations
