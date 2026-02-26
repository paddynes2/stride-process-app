# Regression Suite — Stride

## Purpose
Verify nothing is broken after changes. Run every 8th iteration or when risk ≥ 3.

## Checklist (15-20 actions)

### Auth (2 actions)
1. [ ] Navigate to `/login` — page renders
2. [ ] If logged in: navigate to `/workspaces` — workspace list loads

### Workspace Canvas (5 actions)
3. [ ] Navigate to workspace → canvas tab loads with nodes
4. [ ] Click a step node → detail panel opens
5. [ ] Edit step name → saves without error
6. [ ] Click a section node → section detail panel opens
7. [ ] Canvas zoom/pan works

### Journey Canvas (3 actions)
8. [ ] Switch to journey tab → journey canvas renders
9. [ ] Click touchpoint → detail panel opens
10. [ ] Click stage → stage detail panel opens

### List & Analysis Views (3 actions)
11. [ ] Navigate to step list → data displays
12. [ ] Navigate to gap analysis → maturity gaps shown
13. [ ] Navigate to comparison view → side-by-side renders

### Settings & Management (3 actions)
14. [ ] Navigate to workspace settings → page loads
15. [ ] Navigate to teams page → teams/roles display
16. [ ] Navigate to perspectives (in settings) → list displays

### Export (2 actions)
17. [ ] Trigger PDF export → file generates (or at least no errors)
18. [ ] Trigger PNG export → file generates (or at least no errors)

### Console Check (1 action)
19. [ ] Check `window.__testErrors` — no new errors

## Pass Criteria
All 19 checks pass. No new console errors introduced.
