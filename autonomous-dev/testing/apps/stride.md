# Stride — Test Context

> App-specific testing context for the Stride process mapping SaaS.

---

## App Info

- **URL:** http://localhost:3000
- **Production URL:** https://stride-five-sigma.vercel.app
- **Stack:** Next.js 16.1.6, React 19.2, Supabase, Tailwind CSS 4, React Flow 12.x, TipTap 3.x
- **Auth method:** Email + password (Supabase Auth)

## Test Credentials

Sign up with any email — Supabase Auth in development accepts any email/password combo.
For repeat testing, use:
```
Email: ralph@test.stride.dev
Password: ralph-test-2026!
```

## Known Routes

```
/                              — Redirects to /workspaces (if authenticated) or /login
/login                         — Login page (email + password)
/signup                        — Signup page
/workspaces                    — Workspace list (all user's workspaces)
/w/[workspaceId]               — Workspace landing (redirects to first tab)
/w/[workspaceId]/[tabId]       — Canvas view (React Flow infinite canvas)
/w/[workspaceId]/list          — Step list view (table format)
/w/[workspaceId]/gap-analysis  — Gap analysis view (maturity gaps ranked)
/w/[workspaceId]/settings      — Workspace settings
/w/[workspaceId]/teams         — Teams page (team/role CRUD with expandable cards)
/w/[workspaceId]/people        — People page (stub — Phase 1)
/w/[workspaceId]/tools         — Tools page (stub — Phase 1+)
```

## Priority Flows

1. **Sign up → create workspace → add steps to canvas** — Core onboarding flow. User signs up, lands on workspace list, creates a workspace, sees the canvas, adds sections and steps.
2. **Edit step details** — Click a step on canvas → detail panel opens → edit name, status, notes (TipTap), video embed → changes persist.
3. **Navigate between views** — Canvas view ↔ List view ↔ Settings. Tab bar navigation. Sidebar navigation.
4. **Create and manage tabs** — Add new tabs, switch between tabs, rename tabs.
5. **Create sections and organize steps** — Add section to canvas, add steps inside section, connect steps with edges.

## Known Issues

- [ ] People/Tools pages are stubs (intentionally — Phase 1 will build these)

## App-Specific Notes

- Dark theme only — all testing should verify against dark backgrounds
- Canvas uses React Flow — interactions require mouse events (drag, click nodes, zoom)
- Step status badges: draft (gray), in_progress (blue), testing (yellow), live (green), archived (dim)
- TipTap rich text editor is in step/section detail panels — supports bold, italic, lists, headings
- Video embed supports Loom and YouTube URLs
- Workspace summary panel shows workspace-level info when no step/section is selected
- After signup, `bootstrap_workspace()` RPC creates org + membership + workspace + first tab atomically
- Tab bar at top of workspace allows switching between canvas tabs
- Sidebar shows workspace name and navigation links
