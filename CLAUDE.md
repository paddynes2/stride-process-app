# Stride — CLAUDE.md

## What This Is
Process mapping & continuous improvement SaaS (Puzzle.io clone). **All phases complete** (Phase 0–4 + Phase 3a/3b). Consultant maps processes on a dark-themed infinite canvas, runs journey analysis, executes runbook playbooks, tracks activity, clones workspaces, applies conditional step coloring, manages tools with cost analysis, runs AI analysis, exports premium McKinsey-style PDF reports (white background, navy/teal theme, editorial typography), and links steps across flows via portal links.

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
  app/api/v1/              — REST routes (29 resource groups)
    auth/me/               — GET current user
    workspaces/            — GET list, POST create, GET/PATCH/DELETE by id
    tabs/                  — POST create, PATCH/DELETE by id
    sections/              — POST create, PATCH/DELETE by id
    steps/                 — POST create, PATCH/DELETE by id
    connections/           — POST create, DELETE by id
    activity/              — GET activity log (workspace-scoped)
    ai/                    — POST AI analysis (requires OPENROUTER_API_KEY)
    annotations/           — POST create, PATCH/DELETE by id
    comments/              — POST create, PATCH/DELETE by id
    improvement-ideas/     — POST create, PATCH/DELETE by id
    people/                — POST create, GET/PATCH/DELETE by id
    perspectives/          — POST create, PATCH/DELETE by id
    roles/                 — POST create, GET/PATCH/DELETE by id
    runbooks/              — POST create, GET/PATCH/DELETE by id
    runbook-steps/         — PATCH/DELETE by id
    shares/                — POST create, GET/DELETE by id
    stages/                — POST create, PATCH/DELETE by id
    step-roles/            — POST create, DELETE by id
    step-tools/            — POST create, DELETE by id
    tasks/                 — POST create, PATCH/DELETE by id
    teams/                 — POST create, GET/PATCH/DELETE by id
    tools/                 — POST create, GET/PATCH/DELETE by id
    tool-sections/         — POST create, PATCH/DELETE by id
    touchpoints/           — POST create, PATCH/DELETE by id
    touchpoint-connections/ — POST create, DELETE by id
    coloring-rules/        — POST create, PATCH/DELETE by id
    templates/             — GET list, POST from section, POST deploy, DELETE by id
    workspaces/[id]/clone/ — POST clone workspace
    public/shares/[shareId]/ — GET public read-only data
  app/auth/callback/       — OAuth callback route
  components/
    ui/                    — button, input, badge, dialog, dropdown-menu, separator, skeleton, tabs, textarea, offline-banner, collapsible-section
    canvas/                — flow-canvas, step-node, section-node, stage-node, touchpoint-node
    panels/                — step-detail-panel, section-detail-panel, stage-detail-panel, touchpoint-detail-panel, tool-detail-panel, tool-section-detail-panel, annotation-panel, comment-panel, task-panel, export-pdf-dialog, workspace-summary-panel, rich-text-editor, video-embed
    layout/                — sidebar (grouped nav: Core, Analysis, Collaborate, Manage), header, tab-bar
  lib/
    supabase/              — client.ts, server.ts, middleware.ts (3-client pattern)
    api/                   — client.ts (apiFetch wrappers), response.ts (envelope helpers)
    context/               — workspace-context.tsx (user + workspace + tabs)
    export/                — pdf-theme.ts (shared theme, types, helpers), pdf.ts (title page + 4 base renderers), enhanced-pdf-sections.ts (11 enhanced renderers + TOC), journey-pdf.ts, comparison-pdf.ts, png.ts
    maturity.ts            — maturity scoring constants + helpers
    pain.ts                — pain score constants + helpers
    utils.ts               — cn() (clsx + tailwind-merge)
  types/
    database.ts            — entity types (Workspace, Tab, Section, Step, Connection, Stage, Touchpoint, Team, Role, Person, Tool, Comment, Task, Runbook, Activity, etc.)
    canvas.ts              — React Flow custom node data types + context providers (CommentCounts, TaskCounts, ColoringTint, PortalNavigate)
    export.ts              — PDF export types (ExportConfig, section toggles)
    index.ts               — re-exports
  middleware.ts            — auth guard (redirects unauthenticated to /login)
```

## Commands
```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Run unit tests (vitest)
npm run test:watch       # Run tests in watch mode
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
28 migration files in `supabase/migrations/`:
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
- 018: clone_workspace (SECURITY DEFINER deep copy function)
- 019: coloring_rules (conditional step coloring)
- 020: section_templates (reusable section+steps snapshots)
- 021: prioritization_scores (effort_score & impact_score on steps/touchpoints)
- 022: improvement_ideas (status & priority tracking)
- 023: tool_sections (tool grouping with position/status)
- 024: step_tools (many-to-many step↔tool junction table)
- 025: connection_handles (source_handle + target_handle on connections)
- 026: annotation_cleanup_triggers (cascade delete annotations on entity delete)
- 027: activity_actor_type (actor_type column on activity_log)
- 028: portal_links (link_to_tab_id + link_to_step_id on steps for cross-flow navigation)

## Gotchas & Learnings
- **NEXT_PUBLIC_ static replacement:** Never use dynamic property access for these vars. Browser has no `process.env`.
- **Vercel env vars:** Use `printf` (not `echo -e`) when piping values to `vercel env add` — `echo -e` can corrupt values with escape sequences.
- **apiFetch response format:** `apiFetch<T>()` extracts `json.data` and returns it as `T`. Do not wrap return type in `{ entity: T }`.
- **React state mutation:** Never call `.sort()` on a prop array directly — use `[...arr].sort()`. React expects immutable state.
- **Canvas null guards:** `buildNodes`/`buildEdges` defensively handle null/undefined with `(arr ?? []).filter(Boolean)` before `.map()`.
- **Supabase RLS + INSERT...RETURNING:** `.insert().select()` triggers RETURNING checked against SELECT policies. Use SECURITY DEFINER functions for bootstrap operations where policies can't be satisfied yet.
- **React 19 useRef:** Requires initial value argument — `useRef(undefined)` or `useRef(null)`, not bare `useRef()`.
- **Canvas context pattern:** Node-level data (comment counts, task counts, coloring tints, portal navigation) is passed via React contexts (defined in `types/canvas.ts`) to avoid prop-drilling through FlowCanvas. Canvas views provide these contexts; node components consume them.
- **Edge deletion:** React Flow's `deleteKeyCode={null}` disables built-in deletion. Custom keyboard handler in FlowCanvas checks selected edges via `edges.filter(e => e.selected)` and calls `apiDeleteConnection`.
- **Portal links:** Steps can link to other tabs via `link_to_tab_id`/`link_to_step_id`. Navigation uses `PortalNavigateContext` provided by canvas-view, which calls `router.push()` with `?focusNode=` query param.

## PDF Export Design System
Premium consulting-grade PDF output via jsPDF (client-side). White background, navy/teal Swiss editorial theme.

### Architecture
- **`pdf-theme.ts`** — Single source of truth for theme (`T`), shared types (`StepRoleForExport`, `StepToolForExport`, `PdfSectionEntry`), all shared helpers (layout, data, formatting, `resetFontState`, `withTimeout`, `renderFooter`, `safeMax`, `safeDivide`). Both `pdf.ts` and `enhanced-pdf-sections.ts` import from here.
- **`pdf.ts`** — Title page + 4 exported base section renderers (`renderBaseCanvasSnapshot`, `renderBaseStepDetails`, `renderBaseGapAnalysis`, `renderBaseCostSummary`). `renderBaseCanvasSnapshot` accepts optional `sections`/`steps` params to render a "Process Structure" summary table below the canvas image. Re-exports shared types for backward compatibility.
- **`enhanced-pdf-sections.ts`** — 11 enhanced section renderers (exec summary, walkthrough, findings, journey map, sentiment, perspectives, prioritization, tools, improvements, AI insights, TOC).
- **`canvas-view.tsx`** orchestrator — imports all three modules via dynamic `import()`. Calls sections individually based on `ExportConfig` toggles via `safeRender()` (per-section try/catch with font state reset). Renders TOC last, moves to page 2 via `pdf.movePage()`. Footer via shared `renderFooter()`.

### Theme (Single T Object in pdf-theme.ts)
One unified theme object with consistent property names (`h1`, `small`, `tiny`, etc.). Both consumer files import `T` from `pdf-theme.ts`. Theme changes only need to be made in one place.

| Token | Value | Usage |
|-------|-------|-------|
| `navy` | `[23, 37, 84]` | Title page hero banner, table headers, stat cards, phase banners |
| `teal` | `[13, 148, 136]` | Accent lines, page numbers, stat card variant, teal strip under banner |
| `tealBg` | `[240, 253, 250]` | Light teal fill for stat cards |
| `surface` | `[248, 250, 252]` | Default stat card fill, alternating table rows |
| `body` | `[51, 65, 85]` | Primary body text |
| `muted` | `[100, 116, 139]` | Secondary text, labels |
| `bodySize` | `10` | Body text (bumped from 9.5) |
| `lineH` | `4.5` | Line spacing (bumped from 4.2) |
| `paraGap` | `7` | Paragraph spacing (bumped from 6) |

### Key Components
- **Title page:** Navy hero banner (top 38%) + teal accent strip + white title text. Metadata below on white.
- **Stat cards:** 3 variants — `navy` (white text on navy fill), `teal` (dark text on teal-tinted fill), `default` (dark text on light gray fill).
- **Table headers:** Navy background with white text. Alternating `surface` row stripes. Pagination via `shouldBreakTable()` — anti-orphan logic with threshold `> 8` remaining rows.
- **Gap analysis:** Horizontal bar chart (top 10 gaps, teal current + color-coded gap overlay) above the detail table.
- **Prioritization matrix:** 2×2 scatter plot with quadrant backgrounds (green/blue/amber/red tints), color-coded points with radial spiral jitter (prevents overlap), and a legend sidebar listing steps by quadrant with "E = Effort, I = Impact" key.
- **Sentiment curve:** Line chart plotting pain scores across touchpoints in stage order, with sentiment-colored points.
- **Process walkthrough:** Hero cards for decisions/pain points (tinted backgrounds, thicker accent bars, body-size text, icon badges). Standard callouts for other comment types.
- **Perspective comparison:** Side-by-side annotation layout with colored column headers and dual cards.
- **Improvements:** Numbered priority-colored badge circles + card backgrounds with accent stripes.
- **Phase banners:** Navy rect + teal underline for process walkthrough sections.
- **TOC:** 10pt font, teal page numbers, alternating stripe backgrounds.
- **Footer:** Teal accent line, bold "Stride" branding, page N of M. Skips page 1 (title page has own footer).
- **Canvas snapshot (Process Map):** Intro line + canvas image (capped to ~55% height when sections/steps available) + "Process Structure" summary table below (per-section stats: step count, live/draft, avg maturity, hrs/mo, effort bar). Temporary `<style>` element injected for light-theme override (white backgrounds, slate text, slate borders on all React Flow nodes).

### Gotchas
- **jsPDF font state bug:** `splitTextToSize()` uses CURRENT font settings. Must set correct font/size BEFORE calling split.
- **Single theme in `pdf-theme.ts`:** All theme values, shared types, and helpers live in `pdf-theme.ts`. Both `pdf.ts` and `enhanced-pdf-sections.ts` import from it.
- **`const margin` type narrowing:** `const margin = T.margin` infers literal type `20`. Use `const margin: number = T.margin` to avoid TS errors when passing to functions expecting `number`.
- **Canvas CSS overrides:** Must target `.react-flow`, `.react-flow__node *`, `[class*="section-node"] *`, badges, pills, and `svg rect` to fully override dark theme for PDF capture.
- **Improvements sorting:** `[...data.ideas].sort()` by priority (Critical→High→Medium→Low) — never mutate props directly.
- **Base section independence:** Each `renderBase*` function builds its own `sectionMap`, `stepRolesMap`, etc. from params — no shared state with `createWorkspacePdf()`.
- **Pagination overflow:** `shouldBreakTable()` uses threshold `remainingRows > 8`. Tail-end rows (≤8) either extend into footer gap zone if they fit, or force-break immediately to push all remaining rows to next page together — prevents 2-3 row orphan pages.
- **Per-section isolation:** `canvas-view.tsx` wraps every section render in `safeRender()` — catches errors, calls `resetFontState(pdf)` to prevent state leakage, logs failed section names, and continues rendering remaining sections.
- **Canvas capture timeout:** `toPng()` calls are wrapped in `withTimeout(…, 30_000)` to prevent indefinite hangs on large or complex canvases.
- **Empty-array spread guard:** Never use `Math.max(...arr)` on potentially empty arrays (returns `-Infinity`). Use `safeMax(arr)` from `pdf-theme.ts` instead.
- **TOC leader loop guard:** Dotted leader rendering skipped when `leaderStart >= leaderEnd` (very long section names). Text-width truncation loops capped at 200 iterations.
- **Footer single source:** `renderFooter()` in `pdf-theme.ts` is the only footer renderer — both `pdf.ts` and `canvas-view.tsx` call it (no hardcoded color values).
