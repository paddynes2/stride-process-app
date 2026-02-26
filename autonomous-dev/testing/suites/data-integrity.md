# Data Integrity Suite

> Test CRUD operations, sorting, filtering, pagination, and search accuracy.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Identify Data Pages

Pages that display, create, edit, or delete data: tables, lists, kanban boards,
detail views, dashboards with metrics.

```
DATA PAGES:
- /people — list/table
- /companies — list/table
- /deals — kanban/list
- /people/[id] — detail view
- /people/new — create form
- /dashboard — metrics/widgets
```

## Phase 2: CRUD Round-Trip

Pick the most important entity (people, companies, or deals). Test the full lifecycle:

### Create
1. Navigate to the create form
2. Fill all fields with recognizable test data (e.g., "Ralph Test Person", "ralph@test.com")
3. Submit the form
4. **Check:** Success feedback shown? (toast, redirect, or inline confirmation)
5. **Check:** No console errors during or after submission
6. **Check:** Redirected to detail view or list?

### Read (List)
7. Navigate to the list view
8. **Check:** Does the new record appear?
9. **Check:** Are all columns displaying data correctly? (no "undefined", no "[object Object]")
10. **Check:** Is the data format correct? (dates formatted, numbers formatted, status badges)

### Read (Detail)
11. Click the new record to open the detail view
12. **Check:** All fields populated correctly? (match what was entered)
13. **Check:** Related data shown? (linked entities, activity timeline)
14. **Check:** No "null" or "undefined" displayed

### Update
15. Click Edit (or navigate to edit form)
16. **Check:** Form pre-populates with existing data
17. Change one field to something recognizable (e.g., "Ralph EDITED Person")
18. Submit
19. **Check:** Changes saved? Verify on detail view
20. **Check:** Unchanged fields preserved? (not reset to empty)

### Delete (if supported)
21. Delete the record
22. **Check:** Confirmation dialog shown? (not immediate delete)
23. **Check:** After confirming, record removed from list?
24. **Check:** Navigating to the old detail URL shows 404 or "not found"?
25. **Check:** Related records updated? (orphaned references?)

## Phase 3: Sorting

If the list view has sortable columns:

1. Click a column header to sort ascending
2. **Check:** Data is correctly sorted (alphabetical, numerical, or chronological)
3. Click again for descending
4. **Check:** Data is correctly sorted in reverse
5. **Check:** Sort indicator (arrow) visible and pointing the right direction
6. **Check:** After sorting, row data still matches (columns didn't scramble)

Test with at least 2 different column types (text + date, or text + number).

## Phase 4: Filtering and Search

If the app has search or filters:

### Search
1. Enter a search term that matches known data
2. **Check:** Results update (with or without pressing Enter)
3. **Check:** Every visible result contains the search term (no false positives)
4. **Check:** Search for something that shouldn't match — empty results shown gracefully?

### Filters
1. Apply a filter (status, type, date range)
2. **Check:** Results reduced correctly
3. **Check:** Filter state visible (badge, pill, or active state on filter control)
4. Clear the filter
5. **Check:** All results return

## Phase 5: Pagination

If the app has pagination or infinite scroll:

1. Navigate to page 2 (or scroll to trigger more loading)
2. **Check:** New items appear
3. **Check:** No duplicates between page 1 and page 2
4. **Check:** Page indicator updates
5. Navigate back to page 1
6. **Check:** Original items shown, no data corruption

If possible, note the total count and verify it matches the pagination info.

## Phase 6: Edge Cases

1. **Rapid operations:** Submit a form twice quickly — only one record created?
2. **Empty fields:** Can you save a record with only required fields filled?
3. **Long content:** Create a record with very long names/descriptions — layout intact?
4. **Special characters:** Create a record with `<script>`, quotes, emoji — displays correctly?
5. **Concurrent edits:** (if testable) Open edit in two tabs, save both — what happens?

## Completion

Report format:
```markdown
## Data Integrity Audit — Iteration [N]

**Entity types tested:** N
**CRUD operations:** Create [PASS/FAIL], Read [P/F], Update [P/F], Delete [P/F]
**Sorting tested:** N columns — [P/F]
**Filtering tested:** N filters — [P/F]
**Pagination tested:** [P/F/N/A]

### Issues Found
| # | Severity | Page | Finding |
|---|----------|------|---------|
| 1 | P0 | /people/new | Double-submit creates duplicate records |
| 2 | P1 | /deals | Sort by date shows wrong order |
| 3 | P2 | /people | Search doesn't clear when navigating away |
```

**For each finding:** Add to `prd/BUGS.md`.
**Update `testing/RESULTS.md`** with this audit's results.
