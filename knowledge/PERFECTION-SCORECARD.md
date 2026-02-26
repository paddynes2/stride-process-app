# Perfection Scorecard — Stride

Score at phase completion. Target 95%+ before shipping.

## Dimensions (10 × 10 criteria = 100 total)

### 1. Functionality (10 criteria)
- [ ] All CRUD operations work for every entity type
- [ ] All forms validate input and show errors
- [ ] All delete operations have confirmation
- [ ] Canvas drag/drop works without glitches
- [ ] Detail panels open/close/save correctly
- [ ] Export (PDF/PNG) generates valid output
- [ ] Public sharing produces accessible link
- [ ] Navigation between all pages works
- [ ] Auth flow (login/signup/logout) completes
- [ ] Data persists across page reloads

### 2. Visual Design (10 criteria)
- [ ] Consistent color tokens (no hardcoded colors)
- [ ] Text hierarchy follows 90/55/30/15% system
- [ ] Spacing is consistent (4px grid)
- [ ] Border radius follows design system (6px default, 2px badges)
- [ ] Icons are consistent size and style (lucide-react)
- [ ] Status badges use correct colors
- [ ] Canvas nodes are visually distinct by type
- [ ] Panels have consistent layout structure
- [ ] Empty states have visual guidance
- [ ] Loading states use skeletons (not spinners)

### 3. Accessibility (10 criteria)
- [ ] All interactive elements keyboard-reachable
- [ ] Focus indicators visible and consistent
- [ ] Heading hierarchy is logical
- [ ] Images/icons have alt/aria-label
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] No information conveyed by color alone
- [ ] Screen reader can navigate page structure
- [ ] Disabled states are announced
- [ ] Error messages are associated with fields

### 4. Performance (10 criteria)
- [ ] Initial page load < 3s
- [ ] Canvas with 50+ nodes is responsive
- [ ] No visible layout shift (CLS < 0.1)
- [ ] Heavy dependencies are lazy-loaded
- [ ] Images are optimized
- [ ] API calls are debounced where appropriate
- [ ] No memory leaks from event listeners
- [ ] Scrolling is smooth (60fps)
- [ ] Build bundle size is reasonable
- [ ] No unnecessary re-renders

### 5. Error Handling (10 criteria)
- [ ] API errors show user-friendly messages
- [ ] Network offline state is detected and shown
- [ ] Invalid routes show 404
- [ ] Server errors show error boundary
- [ ] Form validation prevents bad data
- [ ] Concurrent edits don't corrupt data
- [ ] Missing data doesn't crash components
- [ ] Auth expiry redirects to login
- [ ] Rate limiting is handled gracefully
- [ ] File export errors are reported

### 6. State Coverage (10 criteria)
- [ ] Loading states exist for all data-fetching pages
- [ ] Empty states exist for all list/collection views
- [ ] Error states exist for all data-fetching pages
- [ ] Success feedback for all mutations
- [ ] Disabled states for loading/invalid actions
- [ ] Selected states for canvas nodes
- [ ] Hover states for interactive elements
- [ ] Focus states for keyboard navigation
- [ ] Offline state banner
- [ ] Auth loading state (middleware redirect)

### 7. Data Integrity (10 criteria)
- [ ] RLS prevents cross-org data access
- [ ] Cascade deletes work correctly
- [ ] No orphaned records after delete
- [ ] Timestamps update correctly
- [ ] IDs are valid UUIDs
- [ ] Foreign key constraints enforced
- [ ] Unique constraints prevent duplicates
- [ ] Null handling is consistent
- [ ] Canvas positions persist after reload
- [ ] Rich text content saves/loads correctly

### 8. Responsive Design (10 criteria)
- [ ] Layout works at 1024px (tablet)
- [ ] No horizontal overflow
- [ ] Touch targets are 44px minimum
- [ ] Text is readable without zoom
- [ ] Sidebar collapses appropriately
- [ ] Canvas is usable on smaller screens
- [ ] Dialogs fit viewport
- [ ] Tables scroll horizontally if needed
- [ ] Navigation remains accessible
- [ ] Export dialogs are usable

### 9. Code Quality (10 criteria)
- [ ] TypeScript strict mode, no any types
- [ ] No lint errors
- [ ] Consistent naming conventions
- [ ] No dead code or unused imports
- [ ] Error boundaries at route level
- [ ] Context providers minimize re-renders
- [ ] API routes validate input
- [ ] Consistent API response format
- [ ] No hardcoded strings (use constants)
- [ ] File structure matches conventions

### 10. Security (10 criteria)
- [ ] RLS policies on all tables
- [ ] API routes check authentication
- [ ] No secrets in client code
- [ ] Input sanitization for user content
- [ ] XSS prevention in rich text
- [ ] CSRF protection on mutations
- [ ] Secure cookie settings
- [ ] No sensitive data in URLs
- [ ] Rate limiting on auth endpoints
- [ ] Public share access is read-only

## Scoring

| Phase | Date | Score | Notes |
|-------|------|-------|-------|
| — | — | — | Not yet scored |
