# Per-Page Quality Gate

> Apply to EVERY page visited during any test suite.
> These checks are non-negotiable — a page that fails any P0 check is a bug.
> Total: 40 checks across 8 categories.

---

## Category 1: Runtime Errors (Automatic — via JS listener)

Run these silently. Only report if they FAIL.

| # | Check | Severity | How |
|---|-------|----------|-----|
| 1 | No console errors | P0 | Read `window.__testErrors` array. Any new entries since last page = fail. |
| 2 | No unhandled promise rejections | P0 | Read `window.__testErrors` — rejections are captured alongside console errors. |
| 3 | No failed network requests | P1 | Read `window.__networkErrors`. Any 4xx/5xx since last page = flag. |
| 4 | No console warnings | P3 | Read `window.__testWarnings`. Note but don't block. |

## Category 2: Page Load (Automatic)

| # | Check | Severity | How |
|---|-------|----------|-----|
| 5 | Page loaded (not blank) | P0 | Accessibility tree has meaningful content (not just a spinner after 5s). |
| 6 | Not a 404 / error page | P0 | No "404", "not found", "500", "error" as the primary heading or page title. |
| 7 | No stuck loading state | P1 | If a spinner/skeleton is visible, wait up to 10s. Still loading = fail. |
| 8 | Page title is descriptive | P3 | `document.title` is not generic ("Loading...", "Untitled", blank). |

## Category 3: Accessibility (Quick — no audit function needed)

| # | Check | Severity | How |
|---|-------|----------|-----|
| 9 | Single h1 heading | P2 | Exactly one `<h1>` in the accessibility tree. Zero or multiple = flag. |
| 10 | Heading order sequential | P2 | No skipped levels (h1 → h3 with no h2). |
| 11 | Interactive elements have names | P2 | Buttons, links, and inputs have accessible names (not empty). |
| 12 | Focus indicator visible | P2 | Tab to 3 elements — each shows a visible focus ring. |
| 13 | Images have alt text | P2 | No `<img>` without `alt` (unless `role="presentation"`). |
| 14 | html lang attribute present | P2 | `document.documentElement.getAttribute('lang')` is set. |

## Category 4: Navigation & Structure

| # | Check | Severity | How |
|---|-------|----------|-----|
| 15 | Back navigation exists | P1 | At least one of: browser back works, in-app back button, breadcrumb, or parent nav link. |
| 16 | Current location indicated | P2 | Active nav item is visually distinct (highlighted, bold, different color). |
| 17 | No dead-end pages | P1 | Every page has at least one outbound link/action beyond the browser back button. |
| 18 | Links go somewhere | P1 | Clicking any visible link changes the URL or opens content. No `href="#"` or `href=""`. |

## Category 5: Content Quality

| # | Check | Severity | How |
|---|-------|----------|-----|
| 19 | No placeholder text | P1 | No "Lorem ipsum", "TODO", "FIXME", "Coming soon", "example.com", or framework defaults. |
| 20 | No debug output | P0 | No JSON objects, stack traces, `[object Object]`, or `undefined` visible in the UI. |
| 21 | No broken images | P2 | No `<img>` elements with failed loads (broken icon shown). |
| 22 | No empty elements | P2 | No empty headings, buttons, links, labels, or table headers. |
| 23 | No raw data display | P1 | Dates formatted (not ISO strings), numbers formatted (not raw floats), statuses as labels (not enum values). |

## Category 6: Visual & Layout

| # | Check | Severity | How |
|---|-------|----------|-----|
| 24 | No horizontal overflow | P1 | `document.documentElement.scrollWidth <= window.innerWidth`. No sideways scroll. |
| 25 | No overlapping elements | P1 | No text on top of other text, no buttons hidden behind other elements. |
| 26 | Consistent text alignment | P3 | Text within a section is aligned consistently (all left, all center, not mixed). |
| 27 | No giant empty spaces | P2 | No sections with 200px+ of unexplained whitespace (layout collapse, flex errors). |
| 28 | Loading states exist | P2 | When data is fetching, a spinner/skeleton/placeholder is shown (not blank space). |
| 28b | Empty states are helpful | P2 | When page has no data: (1) explains what the page is for, (2) tells user what to do, (3) has a CTA button. Run `__auditEmptyStates()` — score should be 2/3 or higher. |

## Category 7: Interaction Basics

| # | Check | Severity | How |
|---|-------|----------|-----|
| 29 | Clickable things look clickable | P2 | Buttons look like buttons. Links look like links. Cursor changes on hover. |
| 30 | Disabled states are visible | P2 | If a button/input is disabled, it looks visually distinct (not identical to active). |
| 31 | Error states are present | P1 | If a form field can fail validation, submitting with invalid data shows an error (not silent). |
| 32 | Success feedback exists | P2 | After a successful action (save, create, delete), the user sees confirmation. |
| 33 | Touch targets are 24px+ | P2 | No interactive elements smaller than 24x24 CSS pixels (WCAG 2.5.8). |
| 34 | No phantom scrollbars | P3 | Scrollbars appear only when content overflows, not on pages that fit in viewport. |
| 35 | Actions are responsive | P2 | Clicking a button produces a visible response within 200ms (hover state, loading indicator, or result). |

## Category 8: Microcopy & Labels (UX Sweep only)

Run these during UX sweep iterations (every 20th). Too detailed for every-page checks.

| # | Check | Severity | How |
|---|-------|----------|-----|
| 36 | Button labels are action-specific | P3 | Buttons say "Create workspace", "Save changes", "Add team" — NOT generic "Submit", "OK", "Done". |
| 37 | Placeholders are examples, not instructions | P3 | Input placeholders show format examples ("e.g., Acme Corp") — NOT instructions ("Enter name here"). |
| 38 | Error messages are specific and actionable | P2 | Trigger a validation error. Message says what's wrong AND how to fix it ("Email is required" not "Invalid"). |
| 39 | Terminology is consistent across pages | P3 | Same concept uses same word everywhere. "Workspace" not sometimes "Project". "Step" not sometimes "Task". |
| 40 | Labels match their actions | P2 | A "Delete" button actually deletes. A "Save" button actually saves. No mislabeled actions. |

---

## When to Report

- **P0 failures:** Stop and report immediately. These block further testing on this page.
- **P1 failures:** Log and continue. Report in the findings summary.
- **P2-P3 failures:** Batch and report at the end of the suite run.

## Shortcut: Quick Gate (5 checks)

When pressed for actions, run ONLY these 5 critical checks per page:

| # | Check | Severity |
|---|-------|----------|
| 1 | No console errors | P0 |
| 5 | Page loaded (not blank) | P0 |
| 6 | Not a 404 / error page | P0 |
| 20 | No debug output | P0 |
| 24 | No horizontal overflow | P1 |

## Console Error Format

When reporting console errors, include:

```
PAGE: /the/current/route
ERROR: [exact error message]
TYPE: console.error | unhandled rejection | window.onerror
TRIGGERED BY: [the action that caused it, or "on page load"]
```
