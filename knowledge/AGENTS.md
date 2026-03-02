# AGENTS.md — Stride Codebase Knowledge
<!-- Updated: iter-80, 2026-03-02 -->

## Project

- **Name:** Stride — Process Mapping & Continuous Improvement SaaS
- **Stack:** Next.js 16.1.6 + React 19.2 + TypeScript 5 + Tailwind CSS 4
- **Canvas:** React Flow (@xyflow/react 12.x)
- **DB:** Supabase (Auth + DB + RLS) — project ref: `tkcyxtxkmveipnwgrddd`
- **Rich Text:** TipTap 3.x
- **UI Primitives:** Radix UI (dialog, dropdown-menu, select, separator, tabs, tooltip)
- **Variants:** class-variance-authority (CVA)
- **Icons:** lucide-react
- **Fonts:** Plus Jakarta Sans + JetBrains Mono (via next/font)
- **Theme:** Dark only (Dark Matter design system)

## Commands

```bash
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint (eslint .)
npx tsc --noEmit         # Type check
npx vercel --prod        # Deploy to production
npx supabase db push     # Push migrations
```

## Key Files
<!-- Updated: iter-55, 2026-02-26 -->

### App Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Redirect to /workspaces |
| `/login` | `src/app/(auth)/login/page.tsx` | Login page |
| `/signup` | `src/app/(auth)/signup/page.tsx` | Signup page |
| `/workspaces` | `src/app/(app)/workspaces/page.tsx` | Workspace list |
| `/w/[workspaceId]` | `src/app/(app)/w/[workspaceId]/page.tsx` | Workspace shell |
| `/w/.../[tabId]` | `src/app/(app)/w/[workspaceId]/[tabId]/page.tsx` | Canvas view |
| `/w/.../list` | `src/app/(app)/w/[workspaceId]/list/page.tsx` | Step list view |
| `/w/.../compare` | `src/app/(app)/w/[workspaceId]/compare/page.tsx` | Comparison view |
| `/w/.../dashboard` | `src/app/(app)/w/[workspaceId]/dashboard/page.tsx` | Workspace dashboard overview |
| `/w/.../gap-analysis` | `src/app/(app)/w/[workspaceId]/gap-analysis/page.tsx` | Gap analysis |
| `/w/.../teams` | `src/app/(app)/w/[workspaceId]/teams/page.tsx` | Teams management |
| `/w/.../people` | `src/app/(app)/w/[workspaceId]/people/page.tsx` | People management (flat table CRUD) |
| `/w/.../tools` | `src/app/(app)/w/[workspaceId]/tools/page.tsx` | Tools management (flat table CRUD) |
| `/w/.../comments` | `src/app/(app)/w/[workspaceId]/comments/page.tsx` | Workspace comments (all comments, category filter) |
| `/w/.../settings` | `src/app/(app)/w/[workspaceId]/settings/page.tsx` | Workspace settings |
| `/public/[shareId]` | `src/app/public/[shareId]/page.tsx` | Public share view |

### API Routes (all under `src/app/api/v1/`)
- `auth/me/route.ts` — GET current user
- `workspaces/route.ts` — GET list, POST create
- `workspaces/[id]/route.ts` — GET, PATCH, DELETE
- `tabs/route.ts` + `[id]/route.ts` — CRUD
- `sections/route.ts` + `[id]/route.ts` — CRUD
- `steps/route.ts` + `[id]/route.ts` — CRUD
- `connections/route.ts` + `[id]/route.ts` — POST, DELETE
- `stages/route.ts` + `[id]/route.ts` — CRUD
- `touchpoints/route.ts` + `[id]/route.ts` — CRUD
- `touchpoint-connections/route.ts` + `[id]/route.ts` — POST, DELETE
- `teams/route.ts` + `[id]/route.ts` — CRUD
- `roles/route.ts` + `[id]/route.ts` — CRUD
- `people/route.ts` + `[id]/route.ts` — CRUD
- `tools/route.ts` + `[id]/route.ts` — CRUD (GET list, POST create, PATCH, DELETE)
- `step-roles/route.ts` + `[id]/route.ts` — POST, GET, DELETE
- `shares/route.ts` + `[id]/route.ts` — CRUD
- `perspectives/route.ts` + `[id]/route.ts` — CRUD
- `annotations/route.ts` + `[id]/route.ts` — CRUD
- `comments/route.ts` + `[id]/route.ts` — CRUD (GET filterable, POST, PATCH, DELETE)
- `tasks/route.ts` + `[id]/route.ts` — CRUD (GET by step_id, POST, PATCH, DELETE)
- `runbooks/route.ts` + `[id]/route.ts` — CRUD (GET list by workspace_id, POST create with step snapshot, GET/PATCH/DELETE by id)
- `runbook-steps/route.ts` + `[id]/route.ts` — GET by runbook_id, PATCH by id
- `public/shares/[shareId]/route.ts` — GET (unauthenticated)

### Components
| Directory | Key Files | Purpose |
|-----------|-----------|---------|
| `src/components/ui/` | button, input, textarea, badge, dialog, dropdown-menu, separator, tabs, skeleton, offline-banner | Design system primitives |
| `src/components/canvas/` | flow-canvas, step-node, section-node, touchpoint-node, stage-node | React Flow canvas nodes |
| `src/components/panels/` | step-detail-panel, section-detail-panel, touchpoint-detail-panel, stage-detail-panel, workspace-summary-panel, annotation-panel, comment-panel, task-panel, rich-text-editor, video-embed | Right-side edit panels |
| `src/components/layout/` | sidebar, header, tab-bar | App shell layout |

### Lib
| File | Purpose |
|------|---------|
| `src/lib/api/client.ts` | Client-side API wrappers (apiFetch<T>) |
| `src/lib/api/response.ts` | Server-side response envelope helpers |
| `src/lib/api/toast-helpers.ts` | Toast notification helpers |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/supabase/middleware.ts` | Auth middleware |
| `src/lib/context/workspace-context.tsx` | WorkspaceProvider + useWorkspace hook |
| `src/lib/export/pdf.ts` | Base PDF generation |
| `src/lib/export/png.ts` | Canvas → PNG export |
| `src/lib/export/comparison-pdf.ts` | Comparison PDF export |
| `src/lib/export/journey-pdf.ts` | Journey PDF export |
| `src/lib/maturity.ts` | Maturity scoring calculations |
| `src/lib/pain.ts` | Pain/gain score calculations |
| `src/lib/utils.ts` | cn() classname merge |

### Types
| File | Key Types |
|------|-----------|
| `src/types/database.ts` | User, Organization, Workspace, Tab, Section, Step, Connection, Stage, Touchpoint, TouchpointConnection, Team, Role, Person, StepRole, PublicShare, Perspective, PerspectiveAnnotation, Comment, Task, Runbook, RunbookStep + enums (CommentCategory, CommentableType, RunbookStatus, RunbookStepStatus) |
| `src/types/canvas.ts` | StepNode, SectionNode, StageNode, TouchpointNode + data types, CommentCountsContext, TaskCountsContext |
| `src/types/index.ts` | Re-exports |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-canvas-export.ts` | Canvas export hook (PNG, PDF) |

### Database Migrations (`supabase/migrations/`)
| File | Purpose |
|------|---------|
| 001 | Extensions (uuid-ossp, pg_trgm) |
| 002 | Enums (step_status, executor_type, workspace_role) |
| 003 | Core tables (users, organizations, organization_members, workspaces) |
| 004 | Canvas tables (tabs, sections, steps, connections) |
| 005 | RLS policies (is_org_member, can_access_workspace) |
| 006 | Functions (bootstrap_workspace, handle_new_user) |
| 007 | Maturity scoring schema |
| 008 | Teams, roles, people tables |
| 009 | Step_roles junction table |
| 010 | Public shares table |
| 011 | Journey canvas (canvas_type, stages, touchpoints, touchpoint_connections) |
| 012 | Perspectives + perspective_annotations |
| 013 | Tools table + RLS policies |
| 014 | Comments table + comment_category enum + RLS (reuses annotatable_type) |
| 015 | Tasks table (step-scoped checklists) + RLS + indexes + update trigger |
| 016 | Runbooks + runbook_steps tables + enums (runbook_status, runbook_step_status) + RLS + indexes + triggers |

## Patterns
<!-- Updated: iter-55, 2026-02-26 -->

### API Envelope Pattern
All routes return `{ data: T | null, error: { code, message } | null }`.
- Server: `successResponse(data)` / `errorResponse(code, message)` from `lib/api/response.ts`
- Client: `apiFetch<T>(url)` unwraps envelope, returns `T` directly

### Normalized Schema
Steps/sections/connections are individual DB rows, NOT JSONB blobs.
Canvas reconstructs React Flow nodes/edges from DB records.

### RLS Access Control
All entity tables have `workspace_id`. Policies check org membership via `can_access_workspace()`.
`bootstrap_workspace()` uses SECURITY DEFINER for atomic signup.

### Canvas Type Discrimination
Tabs have `canvas_type: 'process' | 'journey'`.
- Process: sections + steps + connections
- Journey: stages + touchpoints + touchpoint_connections

### Perspectives Overlay
Polymorphic annotations: `PerspectiveAnnotation` uses `(annotatable_type, annotatable_id)`.
Types: step, section, touchpoint, stage.

### Context Provider
`WorkspaceProvider` wraps authenticated app. `useWorkspace()` exposes user, org, workspace, tabs, perspectives, activePerspective.

### Comment & Task Counts on Canvas Nodes
`CommentCountsContext` (from `canvas.ts`) provides Map<entityId, count> to node components. `TaskCountsContext` provides Map<stepId, { completed, total }>. Canvas views fetch all workspace comments/tasks once, build count maps, and wrap React Flow in both providers. Node components consume via `useContext()`. Comment badge: bottom-right. Task badge: bottom-left (step nodes only). Section detail panel shows task rollup (per-step progress + summary). This avoids prop-drilling through FlowCanvas (D-004).

### Reserved Paths in Workspace Shell
`workspace-shell.tsx` line 47: array of path segments that are NOT tab IDs. When adding a new workspace sub-route, add its path segment here: `["teams", "people", "tools", "settings", "list", "gap-analysis", "compare", "comments", "dashboard"]`

### Component Conventions
- Dark theme only. All colors via CSS custom properties in globals.css
- Brand: `--brand` (#14B8A6 teal) — sidebar active state
- Interaction: `--accent-blue` (#3B82F6) — buttons, focus, selection
- Text hierarchy: pure white at 90/55/30/15% opacity
- 6px radius default, 2px for badges
- Status badges: draft (gray), in_progress (blue), testing (yellow), live (green), archived (dim)

### Code Style
- CVA for component variants (button.tsx)
- Radix UI primitives for complex UI (dialog, dropdown-menu, etc.)
- `cn()` from utils.ts for conditional classnames
- React 19 useRef requires initial value: `useRef(null)` not bare `useRef()`
- Never sort prop arrays directly — use `[...arr].sort()`
- Canvas arrays: `(arr ?? []).filter(Boolean)` before `.map()`

## PRD File Rules (permanent)
<!-- Added by human, 2026-02-27. DO NOT remove this section. -->

- **DO NOT restructure, reformat, or rewrite `prd/FEATURES.md` or `knowledge/IMPLEMENTATION-PLAN.md`.**
- Permitted modifications: mark tasks done/in-progress, add sub-tasks, increment attempt counters, append amendments.
- DO NOT delete features, change feature numbers, rewrite section headers, compress format, or create new feature IDs in Phase 3a/3b/4 sections.
- New features (if needed) go in Phase 5+ with IDs from TASK-COUNTER.json.

## Color System
<!-- Updated: iter-55, 2026-02-26 -->

### Safe Contrast Combinations (Dark Theme)
- Primary text: `text-white/90` on dark backgrounds
- Secondary text: `text-white/55`
- Tertiary text: `text-white/30`
- Quaternary text: `text-white/15` — decorative only, NOT for functional content
- Teal brand: `#14B8A6` on dark backgrounds
- Blue accent: `#3B82F6` on dark backgrounds
- Status colors: gray/blue/yellow/green on `bg-surface-secondary`
