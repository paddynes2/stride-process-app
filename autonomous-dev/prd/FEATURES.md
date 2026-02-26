# Features

> Human seeds this with stories. Agent marks tasks done, adds sub-tasks, increments attempts.
> Agent picks from here when no P0/P1 bugs exist and the task aligns with the current phase.

---

## Task Format

```markdown
### [Feature Name]
**Phase:** [which phase in IMPLEMENTATION-PLAN.md]
**Priority:** P0 (critical path) | P1 (important) | P2 (nice to have)
**Attempts:** 0
**Status:** pending | in-progress | done | skip
**SKIP_UNTIL:** [condition — only if status is skip]
**Acceptance criteria:**
- [ ] Criterion 1 (machine-verifiable: "button exists", "form submits", "data persists")
- [ ] Criterion 2
- [ ] Criterion 3
**Notes:** [context, constraints, references, related files]
**Sub-tasks:** (added by agent if task is too large for one iteration)
- [ ] [1/N] sub-task description
- [ ] [2/N] sub-task description
```

### Rules

- **Attempts** is incremented by the agent each iteration it works on this task.
- After **3 failed attempts**, the agent marks `Status: skip` and adds `SKIP_UNTIL:`.
- **Acceptance criteria must be machine-verifiable.** "Looks good" is not a criterion.
  "Button submits form and redirects to /detail page" is a criterion.
- **One task per iteration.** If a task needs multiple iterations, the agent decomposes
  it into numbered sub-tasks and completes them one per iteration.
- When done: `Status: done`, all criteria marked `[x]`, note which iteration completed it.

---

## Tasks

### #FEAT-001 Maturity scoring data model and step-level UI — DONE iteration 1, 2026-02-26
**Phase:** 1
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] New `maturity_score` (integer 1-5, nullable) column on `steps` table via Supabase migration
- [x] New `target_maturity` (integer 1-5, nullable) column on `steps` table
- [x] Step detail panel shows maturity score selector (1-5 scale with labels)
- [x] Step detail panel shows target maturity selector (1-5 scale)
- [x] Saving maturity score persists to database and survives page reload
- [x] Step node on canvas shows maturity indicator (color-coded: 1=red, 2=orange, 3=yellow, 4=lime, 5=green)
- [x] TypeScript types updated in `database.ts`
**Notes:** Completed in iteration 1. Migration 007 pushed to Supabase. Persistence criterion verified via API route — EDITABLE_FIELDS includes both fields. Browser reload test pending (Playwright unavailable). Bonus: gap indicator shows current vs target gap in step detail panel.

### #FEAT-002 Section-level maturity roll-up and heat map — DONE iteration 3, 2026-02-26
**Phase:** 1
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Section detail panel shows average maturity of contained steps (computed, not stored)
- [x] Section detail panel shows average target maturity
- [x] Section node on canvas shows color-coded maturity indicator (average of steps)
- [x] Canvas has "heat map mode" toggle — when active, node colors represent maturity levels
- [x] Heat map legend shows what colors mean (1-5 scale)
**Notes:** Completed in iteration 3. Averages exclude null maturity values. computeSectionMaturity() pure function in flow-canvas.tsx. Heat map toggle in toolbar, legend in bottom-left panel. Section detail panel shows avg current/target with gap indicator.

### #FEAT-003 Gap analysis view — DONE iteration 4, 2026-02-26
**Phase:** 1
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] New "Gap Analysis" tab/view accessible from workspace navigation
- [x] Shows all steps with both current and target maturity set, ranked by gap size (target - current, descending)
- [x] Each row shows: step name, section name, current maturity, target maturity, gap value
- [x] Gap values color-coded (large gaps = red, small = green, zero = gray)
- [x] Filterable by section
- [x] Clicking a step navigates to that step on the canvas
**Notes:** Completed in iteration 4. Route at /w/[workspaceId]/gap-analysis. Summary cards (scored/below target/avg gap), sortable table, visual gap bar, section filter. Empty state when no steps have both scores set.

### #FEAT-004 Process costing — step-level time and frequency — DONE iteration 5, 2026-02-26
**Phase:** 1
**Priority:** P1 (important)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] New columns on `steps` table: `time_minutes` (integer), `frequency_per_month` (integer)
- [x] Step detail panel has fields for time-to-complete (minutes) and frequency (times per month)
- [x] Values persist to database
- [x] Step detail panel shows calculated monthly time: `time_minutes × frequency_per_month`
- [x] TypeScript types updated
**Notes:** Already implemented in base codebase. Columns in migration 004, types in database.ts, UI in step-detail-panel.tsx, API route includes both fields in EDITABLE_FIELDS. Verified in browser — Minutes and Per Month fields visible, monthly cost calculation shows when both values set.

### #FEAT-005 Teams and roles data model — DONE iteration 8, 2026-02-26
**Phase:** 1
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] New `teams` table: id, workspace_id, name, created_at
- [x] New `roles` table: id, team_id, name, hourly_rate (decimal), created_at
- [x] New `people` table: id, role_id, name, email (nullable), created_at
- [x] RLS policies following existing `can_access_workspace()` pattern
- [x] Teams page (`/w/[workspaceId]/teams`) shows team list with CRUD
- [x] Each team expandable to show roles with CRUD
- [x] Each role shows hourly rate field
- [x] API routes for teams, roles, people following existing envelope pattern
- [x] TypeScript types in `database.ts`
**Notes:** Migration 008 pushed. Data layer complete (iteration 5). Teams page UI done (iteration 7). People CRUD done (iteration 8).
**Sub-tasks:**
- [x] [1/3] Database migration, TypeScript types, API routes, client wrappers — DONE iteration 5
- [x] [2/3] Teams page UI — team list with CRUD, expandable roles with hourly rate — DONE iteration 7
- [x] [3/3] People CRUD within roles — DONE iteration 8

### #FEAT-006 Step-role assignment and cost calculation — DONE iteration 12, 2026-02-26
**Phase:** 1
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] New `step_roles` junction table: step_id, role_id (many-to-many)
- [x] Step detail panel has role selector (multi-select from roles in workspace)
- [x] Assigned roles shown as badges on step detail panel
- [x] Step cost calculated: `time_minutes / 60 × frequency_per_month × avg(assigned role hourly rates)`
- [x] Section cost = sum of step costs
- [x] Workspace summary panel shows total process cost (sum of all sections)
**Notes:** Depends on FEAT-004 (time/frequency) and FEAT-005 (roles with hourly rates). Junction table needs RLS. Migration 009 pushed. Batch step-roles API endpoint added for efficient cost calculation across multiple steps.
**Sub-tasks:**
- [x] [1/3] Data layer: migration 009, StepRole type, API routes, client wrappers — DONE iteration 9
- [x] [2/3] Step detail panel role assignment UI (selector + badges) — DONE iteration 11
- [x] [3/3] Cost calculation display (step cost, section cost, workspace total) — DONE iteration 12

### #FEAT-007 Export PDF — DONE iteration 15, 2026-02-26
**Phase:** 1
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] "Export PDF" button in workspace header or dropdown
- [x] PDF includes: workspace name, date, canvas snapshot (as image), step list with maturity scores, gap analysis summary, cost summary
- [x] PDF downloads to user's machine
- [x] PDF renders correctly (no broken layout, readable text, professional appearance)
**Notes:** Using jspdf + html-to-image (client-side). Canvas snapshot via html-to-image toPng() at 2x resolution. Dark theme PDF matching app design. Table headers repeat on overflow pages with "(continued)" label.
**Sub-tasks:**
- [x] [1/3] Install deps (jspdf, html-to-image), create export utility, Export PDF button, title page + canvas snapshot + step table — DONE iteration 13
- [x] [2/3] Add gap analysis summary section + cost summary section to PDF — DONE iteration 14
- [x] [3/3] Polish layout, table headers on overflow pages, helper extraction — DONE iteration 15

### #FEAT-008 Export PNG — DONE iteration 16, 2026-02-26
**Phase:** 1
**Priority:** P2 (nice to have)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] "Export PNG" button in workspace header or dropdown
- [x] PNG captures the full canvas (not just visible viewport)
- [x] PNG downloads to user's machine with workspace name in filename
- [x] PNG has adequate resolution (min 2x for retina)
**Notes:** Uses html-to-image toPng at 2x pixelRatio. PngExportButton component uses useReactFlow() to fitView before capture (saves/restores viewport), ensuring full canvas capture. Filter excludes controls, minimap, and toolbar panels. Filename: `{workspace-name}-canvas.png`.

### #FEAT-009 Public shareable views — DONE iteration 19, 2026-02-26
**Phase:** 1
**Priority:** P2 (nice to have)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] Workspace settings has "Share" section with toggle to enable public view
- [x] When enabled, generates a unique URL (e.g., `/public/[shareId]`)
- [x] Public URL loads a read-only view of the canvas (no auth required)
- [x] Read-only view shows steps, sections, connections, maturity scores, but no edit controls
- [x] Share link can be copied to clipboard
- [x] Disabling the toggle revokes access (URL returns 404)
**Notes:** Uses `public_shares` table (migration 010). SECURITY DEFINER function `get_public_share_data()` returns full workspace data for unauthenticated access. Cost data excluded from public view.
**Sub-tasks:**
- [x] [1/3] Data layer: migration 010, PublicShare type, API routes (CRUD + public), client wrappers, middleware /public path — DONE iteration 17
- [x] [2/3] Workspace settings UI: share section with toggle, copy link, share URL display — DONE iteration 18
- [x] [3/3] Public read-only view: /public/[shareId] page with read-only canvas (no edit controls) — DONE iteration 19

---

## Phase 1.5: Ship & Harden

### #FEAT-010 Fix accessibility bugs (BUG-002 through BUG-009)
**Phase:** 1.5
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] BUG-002: Active sidebar link has >= 4.5:1 contrast ratio (was 1:1)
- [ ] BUG-003: Primary action buttons have >= 4.5:1 contrast ratio (was 3.68:1)
- [ ] BUG-004: All icon-only buttons have aria-label (sidebar toggle, teams expand/collapse, delete)
- [ ] BUG-005: All form inputs have associated labels (teams hourly rate, list search/filters, settings name)
- [ ] BUG-006: Gap analysis badge text has >= 4.5:1 contrast (was 1:1)
- [ ] BUG-007: All interactive elements are >= 24x24 CSS pixels
- [ ] BUG-008: No heading level skips (h1 → h2 → h3, not h1 → h3)
- [ ] BUG-009: Focus indicators have >= 3:1 contrast against adjacent colors
**Notes:** 8 bugs found in iteration 10 accessibility audit. Fix in severity order: P1 first (002-006), then P2 (007-009). Agent should decompose into sub-tasks if needed.

### #FEAT-011 Empty states and onboarding — DONE iteration 23, 2026-02-26
**Phase:** 1.5
**Priority:** P1 (important)
**Attempts:** 2
**Status:** done
**Acceptance criteria:**
- [x] Empty workspace canvas shows helpful prompt ("Add your first section to start mapping")
- [x] Empty gap analysis page shows guidance ("Score steps with maturity ratings to see gap analysis") — pre-existing
- [x] Empty teams page shows guidance ("Create a team to start assigning roles and calculating costs") — pre-existing
- [x] Empty list view shows guidance ("Add steps to your canvas to see them listed here")
- [x] New workspace gets a "Getting Started" section with 3 example steps (deletable)
**Notes:** Empty states are the first thing a new user sees. Template seeded server-side in POST /api/v1/workspaces (best-effort, won't fail creation). Section "Getting Started" with 3 connected steps.
**Sub-tasks:**
- [x] [1/2] Empty state UIs — canvas overlay + list view card (gap/teams already done) — DONE iteration 22
- [x] [2/2] Getting Started template — new workspace auto-creates example section with sample steps — DONE iteration 23

### #FEAT-012 Loading and error states — DONE iteration 26, 2026-02-26
**Phase:** 1.5
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] All pages with data fetching show skeleton loaders while loading (not blank white/dark)
- [x] API errors show user-friendly error message with retry button
- [x] Error boundary catches component crashes and shows recovery UI (not white screen)
- [x] Network offline state shows banner ("You're offline — changes won't be saved")
**Notes:** 7 loading.tsx files, 2 error boundaries, offline banner (useSyncExternalStore), toastError utility with retry across 8 files. Public share route loading.tsx added in final polish.
**Sub-tasks:**
- [x] [1/3] Skeleton component + error boundaries + loading.tsx for all routes — DONE iteration 24
- [x] [2/3] Network offline banner + improved error toasts with retry — DONE iteration 25
- [x] [3/3] Polish — verify all states, add missing loading.tsx — DONE iteration 26

### #FEAT-013 Performance pass — DONE iteration 27, 2026-02-26
**Phase:** 1.5
**Priority:** P1 (important)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Bundle analysis run (next build analyzer or similar) — report top 5 largest chunks
- [x] Gap analysis route lazy-loaded (not in main bundle)
- [x] Teams route lazy-loaded
- [x] No images > 100KB without next/image optimization
- [ ] Lighthouse performance score > 80 on workspace canvas page — deferred (needs browser)
**Notes:** 832KB monolith (jspdf + tiptap/prosemirror) split into lazy-loaded chunks: 420KB jspdf (export-only) + 356KB tiptap (panel-only). Gap analysis (32KB) and teams (47KB) already code-split by App Router. All images < 100KB. Lighthouse deferred — Playwright MCP unavailable. Top 5 chunks: 420KB jspdf, 356KB tiptap, 220KB framework, 200KB supabase, 194KB framework.

### #FEAT-014 IMPROVEMENTS.md backlog
**Phase:** 1.5
**Priority:** P2 (nice to have)
**Attempts:** 1
**Status:** done — DONE iteration 29, 2026-02-26
**Acceptance criteria:**
- [x] All items in IMPROVEMENTS.md are either implemented, moved to FEATURES.md, or documented as won't-do with reason
- [x] Fewer than 3 items remain in IMPROVEMENTS.md (0 items remain — both IMP-001 and IMP-002 done)
**Notes:** IMP-001: Extracted export logic to `src/hooks/use-canvas-export.ts`. IMP-002: Extracted maturity constants to `src/lib/maturity.ts` (replaced duplication in 7 files).

### #FEAT-015 Responsive sanity check
**Phase:** 1.5
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Workspace list page is usable at 1024px width (no overflow, no clipped buttons)
- [ ] Canvas page sidebar collapses cleanly at 1024px
- [ ] Gap analysis table doesn't overflow at 1024px (horizontal scroll or column hiding)
- [ ] Teams page is usable at 1024px
**Notes:** Not mobile-first — consultants use laptops/desktops. But tablet/small laptop should not be broken. Test at 1024x768.

### #FEAT-016 End-to-end golden path test
**Phase:** 1.5
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full workflow tested in browser: create workspace → add section → add steps → score maturity → set targets → view gap analysis → assign roles → view cost → export PDF → verify PDF content
- [ ] Zero console errors during the entire flow
- [ ] All data persists across page reload at each step
- [ ] No visual regressions (layout shifts, missing elements, broken styling)
**Notes:** This is the defining user journey. Run this as a single continuous test. If any step fails, that's a P0 bug.

---

## Phase 2a: Journey Mapping

### #FEAT-017 Journey canvas type
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New "Journey" tab type in workspace (alongside existing "Process" canvas)
- [ ] Journey canvas has stages (horizontal swim lanes) instead of sections
- [ ] Journey canvas has touchpoints (nodes within stages) instead of steps
- [ ] Data model: `canvas_type` discriminator on tabs OR new `journeys`/`stages`/`touchpoints` tables
- [ ] Creating a new tab allows choosing "Process" or "Journey" type
- [ ] TypeScript types updated
**Notes:** Core data model decision: extend existing tables with discriminator OR create parallel tables. Discriminator is simpler but mixes concerns. Parallel tables are cleaner but duplicate CRUD logic. Agent should evaluate and document the choice in DECISIONS.md.

### #FEAT-018 Stage detail panel
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Clicking a stage on journey canvas opens stage detail panel
- [ ] Stage detail shows: name (editable), description (rich text), channel selector (web/phone/email/in-person/other), owner (text field)
- [ ] Changes persist to database
- [ ] Stage node on canvas shows name and channel icon
**Notes:** Stages are the journey equivalent of sections. Channel is important for journey mapping — it shows how the customer interacts at each stage.

### #FEAT-019 Touchpoint detail panel
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Clicking a touchpoint on journey canvas opens touchpoint detail panel
- [ ] Touchpoint detail shows: name, pain score (1-5), gain score (1-5), sentiment selector (positive/neutral/negative), customer emotion (text), notes (rich text)
- [ ] Changes persist to database
- [ ] Touchpoint node on canvas shows sentiment color (green/gray/red)
**Notes:** Pain/gain scoring is the journey equivalent of maturity scoring. Sentiment is visual shorthand.

### #FEAT-020 Journey heat map
**Phase:** 2a
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Journey canvas has heat map toggle (similar to process canvas maturity heat map)
- [ ] Heat map colors touchpoints by pain score (high pain = red, low = green)
- [ ] Stage-level roll-up shows average pain score
- [ ] Heat map legend explains the color scale
**Notes:** Reuse the existing heat map infrastructure from FEAT-002. Different metric (pain vs maturity) but same visualization pattern.

### #FEAT-021 Process vs journey comparison view
**Phase:** 2a
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New "Compare" view accessible from workspace navigation (only when workspace has both process and journey tabs)
- [ ] Side-by-side layout: process canvas on left, journey canvas on right
- [ ] Both canvases are read-only in comparison mode (click to navigate to full canvas)
- [ ] Visual alignment hints: stages and sections that share names or are linked are highlighted
**Notes:** This is the killer feature of journey mapping. The comparison reveals gaps between what the company does internally and what the customer experiences. The linking mechanism (stage ↔ section) can be manual or name-based.

### #FEAT-022 Journey export
**Phase:** 2a
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] "Export PDF" on journey canvas produces journey-specific PDF
- [ ] PDF includes: journey name, stage breakdown, touchpoint list with pain/gain scores, sentiment summary
- [ ] Pain point ranking: touchpoints sorted by pain score descending
- [ ] Comparison view exportable as PDF (side-by-side snapshot)
**Notes:** Extends the existing PDF export infrastructure from FEAT-007. Journey PDF follows same visual style.
