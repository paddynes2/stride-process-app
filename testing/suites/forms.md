# Forms Suite

> Find every form in the app and test it adversarially.
> Budget: 40 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Discover Forms

Use navigation suite results if available. Otherwise, click through top-level nav to find pages with forms.

A "form" is any page with input fields and a submit action: create forms, edit forms, search bars, filters, login, settings, modals with inputs.

**List all discovered forms:**
```
FORMS MAP:
- /people/new — Create Person (fields: name, email, phone, company)
- /settings — Pipeline config (fields: name, stages)
- /login — Auth (fields: email, password)
- Header search — Global search (fields: query)
```

## Phase 2: Input Matrix

For each form, test these inputs on every text field. Pick the 3 most important forms if there are many.

| Input | Value | What to check |
|-------|-------|---------------|
| Empty | Submit with field blank | Validation error shown? No crash? |
| Whitespace only | `"   "` | Treated as empty or accepted? |
| Very long text | 500+ characters | Truncated gracefully? No layout break? |
| Special characters | `!@#$%^&*(){}[]<>'"\\|` | Accepted or rejected cleanly? |
| XSS probe | `<img src=x onerror=alert(1)>` | Rendered as text, not executed? |
| SQL-like | `' OR 1=1 --` | No error, treated as plain text? |
| Unicode | `Test 日本語 العربية 🎉` | Accepted and displayed correctly? |
| Numeric overflow | `99999999999999999` in number fields | Validated or handled? |
| Negative numbers | `-1` in quantity/amount fields | Validated or handled? |
| Leading/trailing spaces | `" test "` | Trimmed or preserved consistently? |

## Phase 3: Behavioral Tests

| Test | Steps | What to check |
|------|-------|---------------|
| Double submit | Click submit twice rapidly | No duplicate record created? Button disabled after first click? |
| Submit then back | Submit form → browser back | No re-submission? No broken state? |
| Fill then navigate | Fill form halfway → click nav link → come back | Form state preserved or cleanly reset? |
| Required field bypass | Remove `required` attr in devtools, submit | Server-side validation catches it? |
| Paste into fields | Paste multi-line text into single-line input | Handled gracefully? |

## Phase 4: Validation UX

For every form that shows validation errors:

1. Are errors shown inline next to the field (not just a toast)?
2. Is the error message specific ("Email is required" not just "Error")?
3. Does the error clear when the user fixes the input?
4. Is the first errored field focused after submission?
5. Are errors announced to screen readers (aria-live or role="alert")?

## Completion

Report per the RUN.md format:
- Findings table with severity
- Highlight any form that accepts XSS/SQL input without sanitization as P0
- Highlight any form that crashes on edge input as P0
- Highlight missing validation as P1
- Note which forms were tested and which were skipped (with reason)
