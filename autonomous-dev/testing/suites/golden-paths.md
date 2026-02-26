# Golden Paths Suite

> Test every critical user journey end-to-end. The golden path is the most
> important sequence of actions — the reason the app exists.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## What is a Golden Path?

A golden path is a complete user journey from entry to value:
- Sign up → create first entity → accomplish core task
- Log in → find existing data → take action on it
- Arrive at dashboard → identify what needs attention → act on it

The golden paths are the app's reason to exist. If these break, nothing else matters.

## Phase 1: Define Golden Paths

Read the app context file in `testing/apps/` for defined golden paths.
If none exist, discover them from the app's structure:

### Template

```yaml
Golden Path 1: [Name]
  Entry: [URL or action]
  Steps:
    1. [Action] → [Expected result]
    2. [Action] → [Expected result]
    3. [Action] → [Expected result]
  Success: [What "done" looks like]
  Max clicks: [N]
```

### Common Golden Paths

| App Type | Golden Path |
|----------|------------|
| CRM | Sign up → Create company → Add person → Create deal → Move deal through pipeline |
| E-commerce | Browse → Search → View product → Add to cart → Checkout |
| SaaS tool | Sign up → Onboard → Create first [entity] → Invite team |
| Dashboard | Log in → View metrics → Drill into detail → Take action |

Define 2-4 golden paths before testing.

## Phase 2: Walk Each Path

For each golden path, follow every step:

1. Start from the entry point (clean state — new user or fresh session)
2. At each step, rate the friction:

| Rating | Meaning |
|--------|---------|
| 1 | Effortless — obvious, instant |
| 2 | Smooth — minor hesitation |
| 3 | Acceptable — requires thought |
| 4 | Frustrating — confusing, multiple attempts |
| 5 | Blocked — cannot proceed |

3. At each step, check:
   - Is the next action obvious? (visible CTA, logical flow)
   - Is feedback immediate? (loading state, success confirmation)
   - Can I recover from mistakes? (back button, undo, edit)
   - Are there console errors?

4. Count total clicks from entry to success

### Example Walk-Through

```
GOLDEN PATH: First Deal Creation

Step 1: Navigate to /dashboard (entry point)
  Friction: 1/5 — Dashboard loads, clear nav visible
  Console: Clean

Step 2: Click "Deals" in sidebar
  Friction: 1/5 — Nav item clearly labeled, active state on click
  Console: Clean

Step 3: Click "New Deal" button
  Friction: 2/5 — Button exists but small, not the most prominent element
  Console: Clean

Step 4: Fill deal form (name, company, pipeline, stage, value)
  Friction: 3/5 — Pipeline selector is confusing for first-time users. No tooltip.
  Console: Clean

Step 5: Submit form
  Friction: 2/5 — "Create" button works, redirects to deal detail
  Console: Clean

RESULT: 5 clicks, total friction 9/25, highest friction at step 4 (pipeline selector)
VERDICT: PASS with P2 UX issue (pipeline selector needs explanation)
```

## Phase 3: Measure Time to Value

For each golden path, estimate:
- **Clicks to complete:** Fewer = better. Ideal: under 10 for core journey.
- **Decisions required:** Fewer = better. Each dropdown/choice adds cognitive load.
- **Error potential:** Where could a user go wrong? Is recovery easy?
- **Friction total:** Sum of friction ratings. Lower = better.

## Phase 4: State Completeness

For each step in each golden path, verify:

1. **Success state:** What does the user see after completing the step?
2. **Error state:** What if the step fails? (API error, validation error)
3. **Loading state:** What does the user see while waiting?
4. **Empty state:** What if there's no data to show?
5. **Recovery:** Can the user go back and fix a mistake?

Flag missing states as P1 (missing error state) or P2 (missing loading/empty state).

## Phase 5: Onboarding (First-Time Experience)

If the app has any first-time experience:

1. Is there an onboarding flow? (tutorial, wizard, empty state CTAs)
2. Does it guide the user to the first golden path?
3. Can it be dismissed? Does it come back if not completed?
4. Is the value proposition clear within the first 60 seconds?

If there is NO onboarding:
- Is the empty state helpful enough to guide a new user?
- Are CTAs visible and descriptive? ("Create your first deal" not just "+")

## Completion

Report format:
```markdown
## Golden Paths Audit — Iteration [N]

**Paths tested:** N
**Paths fully passing:** N
**Paths with friction >= 3:** N
**Paths blocked:** N

### Path Results
| Path | Clicks | Friction | Highest Friction Step | Verdict |
|------|--------|----------|-----------------------|---------|
| First Deal | 5 | 9/25 | Pipeline selector | PASS (P2 UX) |
| New Person | 3 | 4/15 | None | PASS |
| Dashboard Drill | 4 | 12/20 | Metric click target | WARN |

### Issues Found
| # | Severity | Path | Step | Finding |
|---|----------|------|------|---------|
| 1 | P2 | First Deal | 4 | Pipeline selector needs explanation |
| 2 | P1 | Dashboard Drill | 3 | Clicking metric does nothing (dead end) |

### Missing States
| Path | Step | Missing State | Severity |
|------|------|--------------|----------|
| First Deal | 5 | No error state on form submit failure | P1 |
| New Person | 2 | No loading state while saving | P2 |
```

### Routing Findings

| Finding Type | Destination |
|-------------|------------|
| Friction 4-5 or blocked path | `prd/BUGS.md` (P0/P1) |
| Missing state (error, loading, empty) | `prd/BUGS.md` (P1/P2) |
| Friction 3 (requires thought) | `prd/IMPROVEMENTS.md` — High (UX flow) |
| Could be fewer clicks | `prd/IMPROVEMENTS.md` — Medium (UX flow) |
| Missing onboarding/guidance | `prd/IMPROVEMENTS.md` — High (missing affordance) |
| Unclear CTA or confusing label | `prd/IMPROVEMENTS.md` — Medium (microcopy) |

**Update `testing/RESULTS.md`** with this audit's results.
