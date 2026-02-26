# Content Quality Suite

> Audit text content, terminology consistency, placeholder detection, broken assets,
> error message quality, and cognitive load indicators.
> Budget: 25 actions. Focus on reading, not interaction.

---

## Phase 1: Placeholder and Debug Content

1. Navigate to each key page (5-8 pages)
2. Run `window.__auditContent()` from `RUN.md`
3. Review violations — any placeholder text remaining?

### Manual Scan

In addition to the automated detection, visually scan for:

| Pattern | Severity | Example |
|---------|----------|---------|
| Lorem ipsum | P1 | Body text with "Lorem ipsum dolor sit amet" |
| TODO/FIXME comments visible in UI | P0 | Button text "TODO: add label" |
| Placeholder values | P1 | Price showing "$0.00" or "N/A" |
| Debug output | P0 | JSON objects, stack traces, or console output visible in UI |
| Default framework text | P1 | "Welcome to Next.js" or similar |
| Untranslated strings | P2 | i18n keys visible: "common.buttons.submit" |

## Phase 2: Terminology Consistency

Scan 5+ pages and catalog the terms used:

1. What is the primary entity called? (People vs Contacts vs Users)
2. What are the action labels? (Save vs Submit vs Done vs OK vs Create)
3. What are the navigation labels? Match page headings?
4. What are the status terms? (Active/Inactive, Open/Closed, Enabled/Disabled)

**Flag inconsistencies:**
```
TERMINOLOGY AUDIT:
"People" used in sidebar, but "Contacts" in page heading on /people — INCONSISTENT
"Save" on /people/new, but "Submit" on /deals/new — INCONSISTENT
"Delete" on /people/[id], but "Remove" on /companies/[id] — INCONSISTENT
```

Each inconsistency is a P3 finding.

## Phase 3: Error Message Quality

Trigger 3-5 error conditions (empty form submit, invalid data, 404 route):

For each error message, evaluate:

| Check | Good | Bad | Severity if Bad |
|-------|------|-----|----------------|
| Specific | "Email is required" | "Validation error" | P2 |
| Actionable | "Enter an email like name@company.com" | "Invalid input" | P2 |
| Tone | Neutral, helpful | "You entered wrong data" | P3 |
| Placement | Inline next to the field | Only in a toast far away | P2 |
| Persistence | Visible until fixed | Disappears after 3 seconds | P2 |
| Recovery | Clear path to fix (fix field, retry) | "Error" with no way back | P1 |

## Phase 4: Cognitive Load Assessment

Run `window.__auditCognitiveLoad()` on 3-5 pages.

Compare against thresholds:

| Metric | Good | Warning | Poor |
|--------|------|---------|------|
| Interactive elements (visible) | < 25 | 25-40 | > 40 |
| Distinct colors | < 10 | 10-15 | > 15 |
| Distinct font families | <= 2 | 3 | > 3 |
| Max DOM depth | < 12 | 12-15 | > 15 |
| Visible word count | < 300 | 300-500 | > 500 |

Pages exceeding "Poor" thresholds are P3 findings (information overload / UI complexity).

## Phase 5: Broken Assets

1. Run `window.__auditContent()` — checks for broken images
2. Visually verify: Are any icons missing? (empty squares, broken SVGs)
3. Check: Do all links in the footer/help/about go somewhere real?
4. Check: Are external links (if any) still valid?

## Phase 6: Microcopy Review

On forms and interactive elements:

1. Do input labels clearly describe what to enter?
2. Are placeholder texts examples (good) or instructions (bad)?
   - Good placeholder: "e.g., Acme Corp"
   - Bad placeholder: "Enter company name" (disappears on focus, inaccessible)
3. Do buttons describe their action? ("Create Deal" not just "Submit")
4. Are help texts/tooltips provided for complex fields?
5. Is the empty state copy helpful and encouraging?

## Completion

Report format:
```markdown
## Content Quality Audit — Iteration [N]

**Pages scanned:** N
**Placeholder text found:** N
**Broken images:** N
**Terminology inconsistencies:** N
**Error messages evaluated:** N (quality: N good, N needs work)
**Cognitive load warnings:** N pages

### Issues Found
| # | Severity | Category | Page | Finding |
|---|----------|----------|------|---------|
| 1 | P0 | Debug | /deals | JSON object visible in UI |
| 2 | P1 | Placeholder | /settings | "Lorem ipsum" in help text |
| 3 | P2 | Error msg | /people/new | "Error" without specifics |
| 4 | P3 | Terminology | /companies | "Remove" vs "Delete" inconsistency |
| 5 | P3 | Cognitive | /dashboard | 45 interactive elements (threshold: 25) |

### Terminology Map
| Concept | Terms Found | Recommended | Pages |
|---------|-----------|-------------|-------|
| Primary entity | People, Contacts | People | sidebar, /people |
| Save action | Save, Submit, Create | Save | /people/new, /deals/new |
```

### Routing Findings

| Finding Type | Destination |
|-------------|------------|
| P0 (debug output, visible code) | `prd/BUGS.md` |
| P1 (placeholder text, broken images) | `prd/BUGS.md` |
| P2 (vague error message, missing empty state) | `prd/BUGS.md` |
| P3 terminology inconsistency | `prd/IMPROVEMENTS.md` — Medium (microcopy) |
| P3 cognitive load warning | `prd/IMPROVEMENTS.md` — Medium (UX flow) |
| Better microcopy suggestion (label, placeholder, help text) | `prd/IMPROVEMENTS.md` — Low (microcopy) |
| Empty state could be more helpful | `prd/IMPROVEMENTS.md` — Medium (missing affordance) |

**Update `testing/RESULTS.md`** with this audit's results.
