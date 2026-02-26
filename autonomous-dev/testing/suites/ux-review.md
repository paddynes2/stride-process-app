# UX Review Suite

> Goal-driven UX audit. Not a checklist — an evaluation of the user experience.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Walk the Primary Journey

Identify and walk through what a new user would do first:

1. **Landing/Auth:** What's the first thing a user sees? Is the path to value clear?
2. **First action:** What's the first meaningful thing they can do? How many clicks to get there?
3. **Core loop:** What's the action they'll repeat most often? How efficient is it?

For each step, rate the friction:

| Rating | Meaning |
|--------|---------|
| 1 | Effortless — obvious what to do, instant result |
| 2 | Smooth — minor hesitation, clear path |
| 3 | Acceptable — requires thought, but achievable |
| 4 | Frustrating — confusing, multiple attempts, unclear feedback |
| 5 | Blocked — cannot figure out how to proceed without help |

**Format:**
```
JOURNEY: Sign up → Create first company → Add a person → Create a deal
Step 1: Sign up — Friction: 2/5 — Clear form, but no password requirements shown until error
Step 2: Create company — Friction: 1/5 — Obvious CTA, simple form
Step 3: Add person — Friction: 3/5 — Had to navigate away to People, not linked from company
Step 4: Create deal — Friction: 4/5 — Pipeline selection unclear, no explanation of stages
```

## Phase 2: Label and Terminology Audit

Scan all visible text across 5+ pages:

1. Are the same concepts referred to consistently? (e.g., "People" vs "Contacts" vs "Users")
2. Do button labels clearly describe their action? ("Save" vs "Submit" vs "Done" vs "OK")
3. Are technical terms exposed to users? (IDs, enum values, field names from the database)
4. Do navigation labels match page headings?

**Flag inconsistencies as findings.**

## Phase 3: Error Message Quality

Trigger 3-5 errors (invalid form submissions, 404s, etc.) and evaluate:

| Check | Good | Bad |
|-------|------|-----|
| Specificity | "Email address is required" | "Validation error" |
| Actionability | "Enter a valid email (e.g., name@company.com)" | "Invalid input" |
| Tone | Neutral, helpful | Blaming ("You entered wrong...") or robotic |
| Placement | Inline next to the field | Only in a toast, or only at the top of the page |
| Persistence | Visible until fixed | Disappears after 3 seconds |

## Phase 4: Navigation Flow Critique

Evaluate the overall navigability:

1. **Can I always tell where I am?** (active nav state, breadcrumbs, page title)
2. **Can I always get back?** (back button, breadcrumb, nav link to parent)
3. **Are related things linked?** (company detail links to its people, deal links to its company)
4. **Is the information hierarchy logical?** (most used features most accessible)
5. **Are there dead ends?** (pages with no clear next action)

## Phase 5: Suggestions → Improvements Pipeline

For every finding rated 3+ friction or any inconsistency, suggest a concrete fix:

```
FINDING: Pipeline selection on deal creation is confusing
FRICTION: 4/5
SUGGESTION: Add a tooltip explaining what pipelines are, or auto-select the default pipeline
EFFORT: Low (1-2 hours)
PRINCIPLE: Nielsen #6 — Recognition rather than recall
```

Keep suggestions actionable and scoped. "Redesign the whole flow" is not helpful. "Add a label above the dropdown" is.

### Route findings to the right file:

| Finding Type | Destination |
|-------------|------------|
| Friction 5/5 (blocked) | `prd/BUGS.md` — P0 (broken flow) |
| Friction 4/5 (frustrating) | `prd/BUGS.md` — P1 (severely degraded UX) |
| Friction 3/5 (requires thought) | `prd/IMPROVEMENTS.md` — High priority |
| Terminology inconsistency | `prd/IMPROVEMENTS.md` — Medium (microcopy) |
| Error message quality issue | `prd/IMPROVEMENTS.md` — Medium (microcopy) |
| Missing affordance (no tooltip, no link between related entities) | `prd/IMPROVEMENTS.md` — High (missing affordance) |
| Navigation dead end | `prd/BUGS.md` — P1 (dead end) |
| Visual polish (alignment, spacing, hover state) | `prd/IMPROVEMENTS.md` — Low (visual polish) |

## Completion

Report format:
1. **Journey map** with friction ratings
2. **Terminology issues** (list of inconsistencies)
3. **Error message grades** (per error tested)
4. **Navigation critique** (strengths and gaps)
5. **Top 5 improvements** ranked by impact/effort → add each to `prd/IMPROVEMENTS.md`

**For blocked/frustrating findings (friction 4-5):** Add to `prd/BUGS.md`.
**For all other suggestions:** Add to `prd/IMPROVEMENTS.md`.
**Update `testing/RESULTS.md`** with this audit's results.
