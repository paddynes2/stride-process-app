# Agents — Codebase Knowledge

> Living document. The agent updates this as codebase understanding grows.
> This is the "brain" — architecture, conventions, file locations, commands.
> READ THIS BEFORE WRITING ANY CODE.

---

## Project

- **Name:** Stride (Process Mapping SaaS)
- **Stack:** Next.js 16.1.6, React 19.2, TypeScript 5, Tailwind CSS 4, React Flow 12.x, Supabase (Auth + DB + RLS), TipTap 3.x, Radix UI
- **Root:** `/c/Users/Patrick/Builds/Cursor Projects/apps/Process App/stride`
- **Repo:** https://github.com/paddynes2/stride-process-app (branch: `main`)
- **Production URL:** https://stride-five-sigma.vercel.app
- **Supabase project ref:** `tkcyxtxkmveipnwgrddd`

## Commands (MANDATORY — agent uses these every iteration)

```bash
# Start dev server
DEV_COMMAND="npm run dev"

# Type checking (MANDATORY — run every iteration)
TYPECHECK_COMMAND="npx tsc --noEmit"

# Linting (MANDATORY — run every iteration)
LINT_COMMAND="npm run lint"

# Build (run if available)
BUILD_COMMAND="npm run build"

# Unit tests (run if available)
TEST_COMMAND="N/A"

# Install dependencies
INSTALL_COMMAND="npm install"

# Deploy
DEPLOY_COMMAND="npx vercel --prod --force"

# Push Supabase migrations
MIGRATION_COMMAND="npx supabase db push"
```

If any command is "N/A", the agent should add a tech debt item to set it up.

## Pre-Commit Requirements

- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] Tests pass — N/A (no test framework yet)
- [ ] Browser verification passes — if UI was changed

## Architecture

<!-- Updated: iter-5, 2026-02-26 -->

```
src/
├── app/
│   ├── (auth)/              — Login/signup pages (centered card layout)
│   │   ├── login/           — login-form.tsx (email+password), page.tsx
│   │   └── signup/          — page.tsx
│   ├── (app)/               — Authenticated app shell
│   │   ├── workspaces/      — Workspace list page + workspace-list.tsx
│   │   ├── w/[workspaceId]/ — Workspace shell (sidebar + header + tab bar)
│   │   │   ├── [tabId]/     — Canvas view (canvas-view.tsx + page.tsx)
│   │   │   ├── list/        — Step list view (step-list-view.tsx)
│   │   │   ├── gap-analysis/ — Gap analysis view (gap-analysis-view.tsx)
│   │   │   ├── settings/    — Workspace settings
│   │   │   ├── teams/       — Teams page (stub → Phase 1 CRUD)
│   │   │   ├── people/      — Stub page (Phase 1+)
│   │   │   └── tools/       — Stub page (Phase 1+)
│   │   ├── layout.tsx       — Server layout (fetch user, org, workspaces)
│   │   └── layout-client.tsx — Client context provider wrapper
│   ├── public/[shareId]/    — Public read-only view (no auth, page.tsx + public-canvas-view.tsx)
│   ├── api/v1/              — REST API routes
│   │   ├── auth/me/         — GET current user
│   │   ├── workspaces/      — GET list, POST create, GET/PATCH/DELETE by id
│   │   ├── tabs/            — POST create, PATCH/DELETE by id
│   │   ├── sections/        — POST create, PATCH/DELETE by id
│   │   ├── steps/           — POST create, PATCH/DELETE by id
│   │   ├── connections/     — POST create, DELETE by id
│   │   ├── teams/           — GET list (nested), POST create, PATCH/DELETE by id
│   │   ├── roles/           — POST create, PATCH/DELETE by id
│   │   ├── people/          — POST create, PATCH/DELETE by id
│   │   ├── step-roles/      — GET by step_id or step_ids (batch), POST create, DELETE by id
│   │   ├── shares/          — GET list, POST create, PATCH/DELETE by id (authenticated)
│   │   ├── public/shares/   — GET by shareId (unauthenticated, calls SECURITY DEFINER RPC)
│   │   ├── stages/          — POST create, PATCH/DELETE by id (journey canvas)
│   │   ├── touchpoints/     — GET list, POST create, PATCH/DELETE by id (journey canvas)
│   │   └── touchpoint-connections/ — POST create, DELETE by id (journey canvas)
│   └── auth/callback/       — OAuth callback route
├── components/
│   ├── ui/                  — button, input, badge, dialog, dropdown-menu, separator, tabs, textarea
│   ├── canvas/              — flow-canvas.tsx, step-node.tsx, section-node.tsx
│   ├── panels/              — step-detail-panel, section-detail-panel, workspace-summary-panel, rich-text-editor, video-embed
│   └── layout/              — sidebar.tsx, header.tsx, tab-bar.tsx
├── lib/
│   ├── supabase/            — client.ts, server.ts, middleware.ts (3-client pattern)
│   ├── api/                 — client.ts (apiFetch wrappers), response.ts (envelope helpers)
│   ├── context/             — workspace-context.tsx (user + workspace + tabs)
│   └── utils.ts             — cn() (clsx + tailwind-merge)
├── types/
│   ├── database.ts          — Entity types (Workspace, Tab, Section, Step, Connection, Team, Role, Person)
│   ├── canvas.ts            — React Flow custom node data types
│   └── index.ts             — Re-exports
└── middleware.ts             — Auth guard (redirects unauthenticated to /login)
```

### Data Model

<!-- Updated: iter-32, 2026-02-26 -->

Normalized tables (NOT JSONB blob). Canvas reconstructs React Flow nodes/edges from DB records.

- `organizations` → `workspaces` → `tabs` → `sections` + `steps` + `connections` (process canvas)
- `tabs.canvas_type` discriminator: `'process'` (default) or `'journey'`
- Journey canvas: `tabs` → `stages` + `touchpoints` + `touchpoint_connections` (parallel to sections/steps/connections)
- `workspaces` → `teams` → `roles` → `people` (team hierarchy for costing)
- `step_roles` junction table: `steps` ↔ `roles` (many-to-many for cost calculation)
- `public_shares`: workspace_id + share_id (32-char hex) + is_active toggle. `get_public_share_data()` SECURITY DEFINER returns full workspace data for unauthenticated access.
- `organization_members` links users to orgs with roles
- RLS via `is_org_member()` / `can_access_workspace()` helper functions
- Roles/people RLS: EXISTS join back to teams.workspace_id → can_access_workspace()
- `bootstrap_workspace()` RPC creates org + membership + workspace + first tab atomically (SECURITY DEFINER)

### Database Migrations

<!-- Updated: iter-32, 2026-02-26 -->

11 migration files in `supabase/migrations/`:
1. `001_extensions.sql` — uuid-ossp, pg_trgm
2. `002_enums.sql` — step_status, executor_type, workspace_role
3. `003_core_tables.sql` — users, organizations, organization_members, workspaces
4. `004_canvas_tables.sql` — tabs, sections, steps (incl. time_minutes, frequency_per_month), connections
5. `005_rls_policies.sql` — is_org_member, can_access_workspace + per-table policies
6. `006_functions.sql` — bootstrap_workspace, handle_new_user trigger
7. `007_maturity_scoring.sql` — maturity_score, target_maturity on steps
8. `008_teams_roles_people.sql` — teams, roles (hourly_rate), people + RLS policies
9. `009_step_roles.sql` — step_roles junction table (step_id, role_id) + RLS via step→workspace
10. `010_public_shares.sql` — public_shares table (share_id, is_active) + RLS + get_public_share_data() SECURITY DEFINER
11. `011_journey_canvas.sql` — canvas_type enum on tabs, stages table, touchpoints table, touchpoint_connections table + RLS policies

## Color System (for accessibility fixes)

<!-- Updated: human, 2026-02-26 -->

**Background layers (darkest to lightest):**
| Variable | Value | Use |
|----------|-------|-----|
| `--bg-app` | `#0A0A0B` | Page background |
| `--bg-surface` | `#111113` | Cards, panels, sidebar |
| `--bg-surface-hover` | `rgba(255,255,255,0.03)` | Hover state |
| `--bg-surface-active` | `rgba(255,255,255,0.06)` | Active/selected state |

**Text hierarchy (brightest to dimmest):**
| Variable | Value | Contrast on `#0A0A0B` | Use |
|----------|-------|-----------------------|-----|
| `--text-primary` | `rgba(255,255,255,0.90)` | ~16:1 | Headings, important text |
| `--text-secondary` | `rgba(255,255,255,0.55)` | ~9:1 | Body text, labels |
| `--text-tertiary` | `rgba(255,255,255,0.30)` | ~4.5:1 | Muted text, timestamps |
| `--text-quaternary` | `rgba(255,255,255,0.15)` | ~2:1 | **FAILS WCAG** — decorative only |

**Accent colors (on dark backgrounds):**
| Variable | Value | Contrast on `#0A0A0B` | On `#111113` |
|----------|-------|-----------------------|--------------|
| `--accent-blue` / `--signal` | `#3B82F6` | 4.0:1 | 3.7:1 |
| `--brand` (teal) | `#14B8A6` | 5.9:1 | 5.5:1 |
| `--accent-green` | `#22C55E` | 6.4:1 | 5.9:1 |
| `--accent-yellow` | `#EAB308` | 8.5:1 | 7.9:1 |
| `--accent-red` | `#EF4444` | 4.6:1 | 4.2:1 |
| `--accent-orange` | `#F97316` | 5.6:1 | 5.2:1 |

**WCAG thresholds:**
- Normal text: 4.5:1 minimum (AA), 7:1 enhanced (AAA)
- Large text (>=18.66px bold or >=24px): 3:1 minimum (AA)
- UI components/focus indicators: 3:1 minimum

**Safe combinations for text on dark backgrounds:**
- White on `--accent-blue` (#3B82F6): 3.68:1 — **FAILS AA normal**, passes large text only
- White on `#2563EB` (button default): 5.2:1 — passes AA (used since iter 21)
- White on darker blue `#1D4ED8`: 6.5:1 — passes AA+AAA
- `--text-primary` on `--bg-surface`: ~15:1 — excellent
- `--text-secondary` on `--bg-surface`: ~8:1 — good
- `--text-tertiary` on `--bg-surface`: ~4:1 — borderline, large text only

## Conventions

<!-- Updated: iter-0, 2026-02-26 -->

- **API envelope pattern:** All routes return `{ data, error }` via `successResponse`/`errorResponse` helpers in `lib/api/response.ts`
- **apiFetch returns data directly:** `apiFetch<T>(url)` extracts `json.data` and returns it as `T`. Do NOT add nested property access like `result.workspace`
- **Dark theme only:** Dark Matter design system. Tokens in `globals.css`
- **Brand color:** `--brand` (#14B8A6 teal) — sidebar active state
- **Interaction color:** `--accent-blue` (#3B82F6) — focus, selection. Default button bg is `#2563EB` (blue-600, 5.2:1 contrast, changed iter 21)
- **Text hierarchy:** Pure white at 90/55/30/15% opacity
- **Border radius:** 6px default, 2px for badges
- **Component variants:** class-variance-authority (CVA)
- **Utility merge:** `cn()` = clsx + tailwind-merge (in `lib/utils.ts`)
- **Icons:** lucide-react
- **Rich text:** TipTap 3.x (rich-text-editor.tsx in panels/)
- **Canvas:** React Flow (@xyflow/react 12.x) — custom step-node.tsx + section-node.tsx
- **Fonts:** Plus Jakarta Sans + JetBrains Mono (loaded via next/font, NOT CSS @import)
- **Auth:** Supabase Auth (email+password). Middleware redirects unauthenticated to /login
- **Supabase clients:** 3-client pattern (browser client, server client, middleware client)
- **Step status badges:** draft (gray), in_progress (blue), testing (yellow), live (green), archived (dim) — 11px text, no icons

## Key Files

<!-- Updated: iter-29, 2026-02-26 -->

- `src/lib/maturity.ts` — Shared maturity constants (MATURITY_COLORS, MATURITY_LABELS, MATURITY_LEVELS, getMaturityColor)
- `src/hooks/use-canvas-export.ts` — Canvas export hook (handleExportPdf, handleExportPng with dynamic imports)
- `src/app/(app)/w/[workspaceId]/workspace-shell.tsx` — Main workspace client layout (sidebar, header, tab bar)
- `src/components/canvas/flow-canvas.tsx` — React Flow canvas with custom nodes
- `src/components/canvas/step-node.tsx` — Custom step node rendering
- `src/components/canvas/section-node.tsx` — Custom section node (group)
- `src/components/panels/step-detail-panel.tsx` — Right sidebar for step editing
- `src/components/panels/section-detail-panel.tsx` — Right sidebar for section editing
- `src/components/panels/workspace-summary-panel.tsx` — Workspace overview panel
- `src/components/panels/rich-text-editor.tsx` — TipTap rich text editor for notes
- `src/components/panels/video-embed.tsx` — Loom/YouTube embed for step/section
- `src/app/(app)/w/[workspaceId]/teams/teams-view.tsx` — Teams page client component (team/role CRUD)
- `src/lib/api/client.ts` — apiFetch wrappers for all API calls
- `src/lib/api/response.ts` — successResponse/errorResponse envelope helpers
- `src/lib/api/toast-helpers.ts` — toastError() utility (network detection + retry action buttons)
- `src/lib/context/workspace-context.tsx` — React context (user, workspace, tabs)
- `src/lib/supabase/client.ts` — Browser Supabase client
- `src/lib/supabase/server.ts` — Server-side Supabase client
- `src/lib/export/pdf.ts` — PDF export utility (jspdf + html-to-image)
- `src/lib/export/png.ts` — PNG export utility (html-to-image toPng at 2x)
- `src/types/database.ts` — All entity TypeScript types (incl. StepRole, PublicShare, Stage, Touchpoint, TouchpointConnection)
- `src/components/ui/skeleton.tsx` — Skeleton primitive (animated pulse block for loading states)
- `src/components/ui/offline-banner.tsx` — Network offline/online banner (useSyncExternalStore)
- `src/app/(app)/w/[workspaceId]/[tabId]/journey-canvas-view.tsx` — Journey canvas with React Flow (stages as group nodes, touchpoints as individual nodes, CRUD + keyboard shortcuts)
- `src/components/canvas/stage-node.tsx` — Custom stage node (group, resizable, channel icons) — mirrors section-node.tsx
- `src/components/canvas/touchpoint-node.tsx` — Custom touchpoint node (sentiment colors, pain score) — mirrors step-node.tsx
- `src/components/panels/stage-detail-panel.tsx` — Stage detail panel (name, channel, owner, description, touchpoint summary, delete) — mirrors section-detail-panel.tsx
- `src/components/panels/touchpoint-detail-panel.tsx` — Touchpoint detail panel (name, sentiment, pain/gain scores, customer emotion, notes, delete) — mirrors stage-detail-panel.tsx
- `src/app/(app)/error.tsx` — App-level error boundary (catches component crashes)
- `src/app/(app)/w/[workspaceId]/error.tsx` — Workspace-level error boundary

## Patterns

<!-- Updated: iter-0, 2026-02-26 -->

- **API routes:** All in `src/app/api/v1/`. Each entity has `route.ts` (list/create) and `[id]/route.ts` (get/update/delete). Use `successResponse`/`errorResponse` envelope.
- **Supabase RLS + INSERT...RETURNING:** `.insert().select()` triggers RETURNING checked against SELECT policies. Use SECURITY DEFINER functions for bootstrap operations where policies can't be satisfied yet.
- **React 19 useRef:** Requires initial value — `useRef(undefined)` or `useRef(null)`, not bare `useRef()`.
- **Canvas null guards:** `buildNodes`/`buildEdges` defensively handle null/undefined with `(arr ?? []).filter(Boolean)` before `.map()`.
- **React state mutation:** Never call `.sort()` on a prop array directly — use `[...arr].sort()`. React expects immutable state.
- **NEXT_PUBLIC_ static replacement:** Next.js inlines these at build time. Must use literal `process.env.NEXT_PUBLIC_SUPABASE_URL` — dynamic access returns undefined in browser.
- **Vercel env vars:** Use `printf` (not `echo -e`) when piping values to `vercel env add`.

## Dependencies

<!-- Agent: document any new dependencies installed. -->
- `jspdf` (^4.2.0) — Client-side PDF generation. Added iteration 13 for FEAT-007 (Export PDF).
- `html-to-image` (^1.11.13) — DOM-to-image capture. Added iteration 13 for canvas snapshot in PDF export.
