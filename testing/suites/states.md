# States Suite

> Test how the app handles empty, error, and loading states.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Identify Data-Driven Pages

Pages that display dynamic data: tables, lists, dashboards, detail views, feeds.

Use navigation suite results if available. Otherwise discover by clicking through nav.

```
DATA PAGES:
- /dashboard — metrics, recent activity
- /people — list/table of people
- /deals — list/kanban of deals
- /companies — list of companies
- /people/123 — detail view
```

## Phase 2: Empty States

For list/table pages, check what happens with zero records.

**How to reach empty state:**
- If the app has a fresh/demo mode, use it
- If you can delete all records in a category, do so (create a test record first so you can verify re-creation works)
- If you can't reach an empty state, note it and move on

**Check for each empty state:**
| # | Check | Expected |
|---|-------|----------|
| 1 | Is there a visible empty state message? | Not just a blank page or empty table |
| 2 | Does the empty state have a CTA? | "Create your first X" or similar |
| 3 | Does the CTA work? | Clicking it takes you to the create form |
| 4 | No console errors in empty state? | Check `window.__testErrors` |

## Phase 3: Error States

Force error conditions and check the app's response.

| Scenario | How to trigger | Expected |
|----------|----------------|----------|
| Invalid entity ID | Navigate to `/entity/nonexistent-id` | "Not found" message, not a crash |
| Deleted entity | If you deleted a record, visit its old URL | Graceful error or redirect |
| Network error | (If possible) disconnect and retry an action | Error message with retry option |
| Malformed URL params | Add `?page=-1` or `?sort=fake` to a list page | Ignored or graceful fallback |

**For each error state, check:**
1. Is an error message shown to the user?
2. Does it explain what went wrong (not just "Something went wrong")?
3. Is there a recovery path (back button, retry, link to home)?
4. No console errors beyond the expected API failure?

## Phase 4: Loading States

For pages that load data asynchronously:

1. Do they show a loading indicator (spinner, skeleton, progress bar)?
2. Does the loading state resolve within a reasonable time (< 5s for local)?
3. If loading takes > 3s, is there any indication of progress?
4. After loading completes, is the page fully interactive?
5. No layout shift when data loads (content doesn't jump around)?

## Phase 5: Boundary Conditions

If you can create records:

| Condition | How | What to check |
|-----------|-----|---------------|
| Single record | Create exactly one item in a list | List renders, pagination absent or shows "1 of 1" |
| Duplicate names | Create two records with identical names | Both visible, distinguishable |
| Long content | Create a record with very long field values | Layout doesn't break, text truncates gracefully |
| Special chars in data | Create a record with `<script>`, quotes, etc. | Displays as text, no XSS |

## Completion

Report per the RUN.md format:
- List every data page and whether it has a proper empty state
- List every error state tested and whether recovery exists
- Flag any page that crashes or shows a blank screen as P0
- Flag missing empty states (blank page with no guidance) as P1
