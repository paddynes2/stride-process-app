# Regression Suite

> Run every 5th iteration to catch silent breakage from previous iterations.
> Budget: 25 actions. Apply CHECKLIST.md to every page.
>
> This suite does NOT discover new bugs. It verifies that previously-working
> things still work. Compare against the known-good state in RESULTS.md
> and the app context file.

---

## Phase 1: Baseline Check

Read `testing/RESULTS.md` to understand the current known state:
- What pages were clean last time?
- What was known-broken?
- When was the last regression pass?

If an app context file exists in `testing/apps/`, read the route list.

## Phase 2: Quick Navigation Sweep

Visit every TOP-LEVEL route from the nav map (sidebar links, header links).
For each page:

1. Navigate to it
2. Run CHECKLIST.md automatic checks (console errors, page loaded, not 404)
3. Check `window.__testErrors` for new errors since last page
4. Check `window.__networkErrors` for failed API calls
5. Note: PASS (clean) or FAIL (new error)

**Do NOT drill into sub-pages or test forms.** This is a breadth sweep, not depth.

```
REGRESSION MAP:
[x] /dashboard      — clean (no errors)
[x] /people         — clean
[!] /deals          — NEW: console error on load (was clean at iteration 12)
[x] /companies      — clean
[x] /settings       — clean
```

## Phase 3: Form Smoke Check

Pick the 2-3 most important forms (from the app context file or your judgment):

1. Navigate to the form
2. Fill in minimum valid data
3. Submit
4. Verify: did the submission succeed? Any console errors?

**Do NOT run adversarial inputs.** Just verify the happy path still works.

## Phase 4: Data Round-Trip

Pick one entity type (people, companies, deals — whatever the app manages):

1. Create a new record with test data
2. Verify it appears in the list view
3. Click into the detail view — does it render correctly?
4. Edit the record — does the form pre-populate?
5. Save the edit — does it persist?
6. Delete the record (if the app supports it) — does it disappear from the list?

This catches data layer regressions that aren't visible in navigation sweeps.

## Phase 5: Compare to Baseline

Compare your findings to the last regression pass in `testing/RESULTS.md`:

| Route | Last Pass | This Pass | Change |
|-------|-----------|-----------|--------|
| /dashboard | clean | clean | — |
| /deals | clean | error | REGRESSION |
| /people | error | clean | FIXED |

## Completion

Report format:

```markdown
## Regression Pass — Iteration [N]

**Pages checked:** N
**Pages clean:** N
**New regressions:** N
**Previously broken, now fixed:** N
**Still broken:** N

### Regressions Found
| Route | Was | Now | Likely Cause |
|-------|-----|----|-------------|
| /deals | clean | console error | Iteration 14 modified deals-list.tsx |

### Still Broken (pre-existing)
| Route | Error | Since |
|-------|-------|-------|
| ... | ... | ... |
```

**For each regression found:** Add to `prd/BUGS.md` with severity and the likely
iteration that caused it (check `git log` for recent changes to relevant files).

**Update `testing/RESULTS.md`** with this pass's results.
