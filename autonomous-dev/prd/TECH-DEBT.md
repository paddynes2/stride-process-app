# Tech Debt

> Lowest priority. Only work on these when no features or bugs remain in the current phase.
> Both human and agent can add items here.

---

## Task Format

```markdown
### [Short description]
**Priority:** Low | Medium | High
**Added:** [date] — [who: human or iteration N]
**Attempts:** 0
**Status:** open | done | skip
**SKIP_UNTIL:** [condition — only if status is skip]
**Reason:** [why this matters — what breaks or degrades if ignored]
**Scope:** [files/areas affected]
**Notes:** [any additional context]
```

### Rules

- Tech debt is only worked on when the current phase has no features or bugs remaining.
- Items like "set up linting" or "add type checking" are HIGH priority tech debt —
  they affect the quality gate for every future iteration.
- **Attempts** follows the same 3-strike rule as features and bugs.

---

## Items

### #DEBT-001 Set up unit testing framework
**Priority:** High
**Added:** 2026-02-26 — human (init)
**Attempts:** 0
**Status:** open
**Reason:** No `test` script in package.json. Quality gate cannot run unit tests. Every iteration that writes testable logic has no verification.
**Scope:** package.json, new test config file, potentially vitest or jest setup
**Notes:** Vitest recommended for Next.js 16+ projects. At minimum: can run `npm test` and it exits 0 with no tests. Ideally: one smoke test for an API route.
