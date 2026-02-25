# Stride — CLAUDE.md

## What This Is
Process mapping & continuous improvement SaaS (Puzzle.io clone). Phase 0 — consultant maps processes on a dark-themed infinite canvas.

## Tech Stack
- Next.js 15 + React 19 + TypeScript 5.9 + Tailwind CSS 4
- React Flow (@xyflow/react) for canvas
- Supabase (Auth + DB + RLS)
- TipTap for rich text
- Dark Matter design system (dark theme only)
- Fonts: Plus Jakarta Sans + JetBrains Mono (loaded via next/font)

## Key Architecture Decisions
- **Normalized tables, NOT JSONB blob** — steps/sections/connections are individual rows. Canvas reconstructs React Flow from DB records.
- **RLS via `is_org_member()` / `can_access_workspace()`** — all entity tables have workspace_id, policies check org membership.
- **bootstrap_workspace() RPC** — creates org + membership + workspace + first tab atomically on signup.
- **API envelope** — all routes return `{ data, error }` via successResponse/errorResponse helpers.

## Project Structure
```
src/
  app/(auth)/       — login, signup (centered card layout)
  app/(app)/        — authenticated app shell
    workspaces/     — workspace list page
    w/[workspaceId]/ — workspace shell with sidebar + header + tab bar
      [tabId]/      — canvas view (React Flow)
      list/         — step list view (table)
      settings/     — workspace settings
      teams|people|tools/ — stub pages (Phase 1)
  app/api/v1/       — REST routes for workspaces, tabs, sections, steps, connections
  components/
    ui/             — button, input, badge, dialog, dropdown-menu, separator, tabs, textarea
    canvas/         — flow-canvas, step-node, section-node
    panels/         — step-detail-panel, section-detail-panel, workspace-summary-panel, rich-text-editor, video-embed
    layout/         — sidebar, header, tab-bar
  lib/
    supabase/       — client, server, middleware (3-client pattern)
    api/            — client.ts (apiFetch wrappers), response.ts (envelope)
    context/        — workspace-context.tsx
    utils.ts        — cn() (clsx + tailwind-merge)
  types/
    database.ts     — entity types
    canvas.ts       — React Flow node/edge types
```

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Design System
- Dark theme only. Tokens in globals.css.
- Brand: --brand (#14B8A6 teal) — sidebar only
- Interaction: --accent-blue (#3B82F6) — buttons, focus, selection
- Text hierarchy: pure white at 90/55/30/15% opacity
- 6px radius default, 2px for badges
- Step status badges: draft (gray), in_progress (blue), testing (yellow), live (green), archived (dim)

## Database
6 migration files in supabase/migrations/:
- 001: extensions
- 002: enums (step_status, executor_type, workspace_role)
- 003: core tables (users, organizations, organization_members, workspaces)
- 004: canvas tables (tabs, sections, steps, connections)
- 005: RLS policies
- 006: functions (bootstrap_workspace)
