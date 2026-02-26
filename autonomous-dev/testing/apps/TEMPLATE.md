# [App Name] — Test Context

> Copy this file to `apps/[app-name].md` and fill in the sections.
> This file is optional — all suites work without it. It makes repeat testing faster.

---

## App Info

- **URL:** http://localhost:[PORT]
- **Stack:** [e.g., Next.js 15, React 19, Supabase, Tailwind]
- **Auth method:** [e.g., email/password, magic link, OAuth, none]

## Test Credentials

```
Email: test@example.com
Password: testpassword123
```

Or: "Sign up with any email — no verification required"
Or: "No auth — app loads directly"

## Known Routes

List every route the app has. Suites use this to verify they discovered everything.

```
/                    — Landing / redirect to dashboard
/login               — Auth page
/dashboard           — Main dashboard
/people              — People list
/people/new          — Create person
/people/:id          — Person detail
/people/:id/edit     — Edit person
/companies           — Companies list
/settings            — Settings page
```

## Priority Flows

Rank the user flows by importance. Suites will test these first.

1. [Most critical flow — e.g., "Create a company and add a person to it"]
2. [Second most critical — e.g., "Create a deal and move it through pipeline stages"]
3. [Third — e.g., "Search for an entity across all types"]

## Known Issues

Skip these during testing — they're already tracked.

- [ ] [Description of known issue — e.g., "Search returns 500 on empty query (tracked in #42)"]
- [ ] [Another known issue]

## App-Specific Notes

Anything a tester should know:

- [e.g., "First column in data table is always read-only"]
- [e.g., "Kanban drag-and-drop requires mouse events, not just clicks"]
- [e.g., "After creating a workspace, you must refresh to see it in the sidebar"]
