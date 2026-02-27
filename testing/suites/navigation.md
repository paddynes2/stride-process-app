# Navigation Suite

> Discovery-based. Works on any web app with zero prior knowledge.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Discovery

**Goal:** Map the app's navigation structure before clicking anything.

1. Read the accessibility tree of the landing page
2. Identify all navigation regions:
   - Primary nav (sidebar, top bar, hamburger menu)
   - Secondary nav (tabs, sub-menus, breadcrumbs)
   - In-page links (cards, CTAs, footer links)
3. Record every unique link destination

**Output a navigation map before proceeding:**
```
NAV MAP:
- Sidebar: [Dashboard, People, Companies, Deals, Settings]
- Header: [Search, Profile, Notifications]
- Page body: [Quick actions, Recent items]
```

## Phase 2: Exhaustive Click-Through

For every link in the nav map:

1. Click the link
2. **Check:** Did a real page load? (not 404, not error, not blank)
3. **Check:** Any new console errors? (`window.__testErrors`)
4. **Check:** Can I navigate back? (browser back, in-app button, breadcrumb, or nav link)
5. **Discover:** What new links exist on THIS page that weren't in the nav map?
6. Add new links to the map (don't recurse deeper than 3 levels)

**Track coverage:**
```
[x] /dashboard — loaded, no errors, back via sidebar
[x] /people — loaded, no errors, back via sidebar
[ ] /people/123 — discovered, not yet visited
```

## Phase 3: Deep Navigation

For pages with sub-navigation (tabs, nested routes, settings sections):

1. Click every tab/sub-item on the page
2. Verify each sub-view loads
3. Test the drill-down chain where applicable:
   - List page → click a row → detail page → edit button → edit page → save → back to detail
   - If any step in the chain breaks, report the exact break point

**Common drill-down patterns to test:**
- List → Detail → Edit → Back
- List → New → Save → Detail
- Settings → Sub-section → Change → Save
- Dashboard → Widget link → Target page

## Phase 4: Direct URL Manipulation

Take 3-5 discovered URLs and test variations:

| Variation | Example | Expected |
|-----------|---------|----------|
| Nonexistent child route | `/people/nonexistent` | 404 page or redirect |
| Invalid ID | `/people/99999` or `/people/abc` | Error page or "not found" message |
| Extra path segment | `/people/123/extra/junk` | 404 page or redirect |
| Remove trailing segment | From `/settings/pipelines` try `/settings` | Parent page or redirect |
| Double slashes | `//people` | Should normalize |

**For each:** Does the app handle it gracefully (404 page, redirect) or crash (blank screen, console error)?

## Phase 5: Keyboard Navigation

On 2-3 representative pages:

1. Press `Tab` repeatedly through the page
2. **Check:** Is focus visible on every focusable element?
3. **Check:** Is the tab order logical (left-to-right, top-to-bottom)?
4. **Check:** Can you activate links/buttons with Enter?
5. **Check:** Can you close modals/dropdowns with Escape?
6. **Check:** Are skip links present (for screen readers)?

## Completion

Produce the results in the format specified by RUN.md:
- Findings table (severity, page, finding, steps)
- Console error log
- Coverage summary (pages discovered vs visited, links tested)
- The final navigation map with status annotations
