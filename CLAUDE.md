# Stride — CLAUDE.md

## What This Is
Process mapping & continuous improvement SaaS (Puzzle.io clone). Currently in **Phase 4 — The Living Playbook** (iteration 90). Consultant maps processes on a dark-themed infinite canvas, runs journey analysis, executes runbook playbooks, and tracks activity.

## Tech Stack
- Next.js 16.1.6 + React 19.2 + TypeScript 5 + Tailwind CSS 4
- React Flow (@xyflow/react 12.x) for canvas
- Supabase (Auth + DB + RLS) — project ref: `tkcyxtxkmveipnwgrddd`
- TipTap 3.x for rich text
- Radix UI primitives (dialog, dropdown-menu, select, separator, tabs, tooltip)
- class-variance-authority (CVA) for component variants
- Dark Matter design system (dark theme only)
- Fonts: Plus Jakarta Sans + JetBrains Mono (loaded via next/font)

## Deployment
- **Production URL:** https://stride-five-sigma.vercel.app
- **GitHub:** https://github.com/paddynes2/stride-process-app (branch: `main`)
- **Hosting:** Vercel (auto-deploy from GitHub push)
- **Deploy manually:** `npx vercel --prod --force` (skip build cache)

## Environment Variables
- `.env.local` — secrets (not committed). Must contain `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for local dev.
- `.env.production` — public Supabase vars (committed). Read by Vercel at build time.
- Vercel also has both vars set via `vercel env` for production builds.

**CRITICAL:** Next.js inlines `NEXT_PUBLIC_*` via static string replacement at build time. You MUST use the literal `process.env.NEXT_PUBLIC_SUPABASE_URL` — dynamic access like `process.env[name]` will NOT be replaced and returns `undefined` in the browser.

## Key Architecture Decisions
- **Normalized tables, NOT JSONB blob** — steps/sections/connections are individual rows. Canvas reconstructs React Flow nodes/edges from DB records.
- **RLS via `is_org_member()` / `can_access_workspace()`** — all entity tables have `workspace_id`, policies check org membership.
- **bootstrap_workspace() RPC** — creates org + membership + workspace + first tab atomically on signup. Uses `SECURITY DEFINER` to bypass RLS during bootstrap.
- **API envelope** — all routes return `{ data, error }` via `successResponse`/`errorResponse` helpers in `lib/api/response.ts`.
- **apiFetch() returns `json.data` directly** — client functions must NOT add nested property access (e.g., `result.workspace` is wrong when `result` IS the workspace). Every client function returns `apiFetch<Type>(url, ...)` directly.

## Project Structure
```
src/
  app/(auth)/              — login, signup (centered card layout)
  app/(app)/               — authenticated app shell
    workspaces/            — workspace list page + workspace-list.tsx
    w/[workspaceId]/       — workspace shell with sidebar + header + tab bar
      [tabId]/             — canvas view (canvas-view.tsx, journey-canvas-view.tsx)
      activity/            — activity log timeline
      comments/            — workspace-level comments view
      compare/             — perspective comparison view
      dashboard/           — workspace overview / summary
      gap-analysis/        — gap analysis view
      list/                — step list view (step-list-view.tsx)
      people/              — people management
      runbooks/            — runbook list + [runbookId]/playbook/ (playbook mode)
      settings/            — workspace settings
      teams/               — team management
      tools/               — tool management
      workspace-shell.tsx  — client layout (sidebar, header, tab bar)
    layout.tsx             — server layout (fetch user, org, workspaces)
    layout-client.tsx      — client context provider wrapper
  app/api/v1/              — REST routes (22 resource groups)
    auth/me/               — GET current user
    workspaces/            — GET list, POST create, GET/PATCH/DELETE by id
    tabs/                  — POST create, PATCH/DELETE by id
    sections/              — POST create, PATCH/DELETE by id
    steps/                 — POST create, PATCH/DELETE by id
    connections/           — POST create, DELETE by id
    activity/              — GET activity log (workspace-scoped)
    annotations/           — POST create, PATCH/DELETE by id
    comments/              — POST create, PATCH/DELETE by id
    people/                — POST create, GET/PATCH/DELETE by id
    perspectives/          — POST create, PATCH/DELETE by id
    roles/                 — POST create, GET/PATCH/DELETE by id
    runbooks/              — POST create, GET/PATCH/DELETE by id
    runbook-steps/         — PATCH/DELETE by id
    shares/                — POST create, GET/DELETE by id
    stages/                — POST create, PATCH/DELETE by id
    step-roles/            — POST create, DELETE by id
    tasks/                 — POST create, PATCH/DELETE by id
    teams/                 — POST create, GET/PATCH/DELETE by id
    tools/                 — POST create, GET/PATCH/DELETE by id
    touchpoints/           — POST create, PATCH/DELETE by id
    touchpoint-connections/ — POST create, DELETE by id
    public/shares/[shareId]/ — GET public read-only data
  app/auth/callback/       — OAuth callback route
  components/
    ui/                    — button, input, badge, dialog, dropdown-menu, separator, skeleton, tabs, textarea, offline-banner
    canvas/                — flow-canvas, step-node, section-node, stage-node, touchpoint-node
    panels/                — step-detail-panel, section-detail-panel, stage-detail-panel, touchpoint-detail-panel, annotation-panel, comment-panel, task-panel, workspace-summary-panel, rich-text-editor, video-embed
    layout/                — sidebar, header, tab-bar
  lib/
    supabase/              — client.ts, server.ts, middleware.ts (3-client pattern)
    api/                   — client.ts (apiFetch wrappers), response.ts (envelope helpers)
    context/               — workspace-context.tsx (user + workspace + tabs)
    export/                — PDF/PNG export utilities
    maturity.ts            — maturity scoring constants + helpers
    pain.ts                — pain score constants + helpers
    utils.ts               — cn() (clsx + tailwind-merge)
  types/
    database.ts            — entity types (Workspace, Tab, Section, Step, Connection, Stage, Touchpoint, Team, Role, Person, Tool, Comment, Task, Runbook, Activity, etc.)
    canvas.ts              — React Flow custom node data types
    index.ts               — re-exports
  middleware.ts            — auth guard (redirects unauthenticated to /login)
```

## Commands
```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npx vercel --prod        # Deploy to production
npx supabase db push     # Push migrations to remote DB
npx supabase link --project-ref tkcyxtxkmveipnwgrddd  # Link CLI to project
```

## Design System
- Dark theme only. Tokens in `globals.css`.
- Brand: `--brand` (#14B8A6 teal) — sidebar active state
- Interaction: `--accent-blue` (#3B82F6) — buttons, focus, selection
- Text hierarchy: pure white at 90/55/30/15% opacity
- 6px radius default, 2px for badges
- Step status badges: draft (gray), in_progress (blue), testing (yellow), live (green), archived (dim)

## Database
17 migration files in `supabase/migrations/`:
- 001: extensions (uuid-ossp, pg_trgm)
- 002: enums (step_status, executor_type, workspace_role)
- 003: core tables (users, organizations, organization_members, workspaces)
- 004: canvas tables (tabs, sections, steps, connections)
- 005: RLS policies (is_org_member, can_access_workspace + per-table policies)
- 006: functions (bootstrap_workspace, handle_new_user trigger)
- 007: maturity scoring (maturity fields on steps/sections)
- 008: teams, roles, people
- 009: step-role assignments
- 010: public shares (read-only sharing)
- 011: journey canvas (stages, touchpoints, touchpoint_connections)
- 012: perspectives + annotations
- 013: tools + step-tool assignments
- 014: comments (threaded, 5 categories)
- 015: tasks (step-level checklists)
- 016: runbooks (executable section snapshots)
- 017: activity log (audit trail)

## Gotchas & Learnings
- **NEXT_PUBLIC_ static replacement:** Never use dynamic property access for these vars. Browser has no `process.env`.
- **Vercel env vars:** Use `printf` (not `echo -e`) when piping values to `vercel env add` — `echo -e` can corrupt values with escape sequences.
- **apiFetch response format:** `apiFetch<T>()` extracts `json.data` and returns it as `T`. Do not wrap return type in `{ entity: T }`.
- **React state mutation:** Never call `.sort()` on a prop array directly — use `[...arr].sort()`. React expects immutable state.
- **Canvas null guards:** `buildNodes`/`buildEdges` defensively handle null/undefined with `(arr ?? []).filter(Boolean)` before `.map()`.
- **Supabase RLS + INSERT...RETURNING:** `.insert().select()` triggers RETURNING checked against SELECT policies. Use SECURITY DEFINER functions for bootstrap operations where policies can't be satisfied yet.
- **React 19 useRef:** Requires initial value argument — `useRef(undefined)` or `useRef(null)`, not bare `useRef()`.
