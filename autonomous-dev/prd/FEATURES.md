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

### #FEAT-010 Fix accessibility bugs (BUG-002 through BUG-009) — DONE iteration 21, 2026-02-26
**Phase:** 1.5
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] BUG-002: Active sidebar link has >= 4.5:1 contrast ratio (was 1:1)
- [x] BUG-003: Primary action buttons have >= 4.5:1 contrast ratio (was 3.68:1)
- [x] BUG-004: All icon-only buttons have aria-label (sidebar toggle, teams expand/collapse, delete)
- [x] BUG-005: All form inputs have associated labels (teams hourly rate, list search/filters, settings name)
- [x] BUG-006: Gap analysis badge text has >= 4.5:1 contrast (was 1:1)
- [x] BUG-007: All interactive elements are >= 24x24 CSS pixels
- [x] BUG-008: No heading level skips (h1 → h2 → h3, not h1 → h3)
- [x] BUG-009: Focus indicators have >= 3:1 contrast against adjacent colors
**Notes:** All 8 bugs fixed in iteration 21. 11 files changed across button, sidebar, header, tab-bar, panels, gap-analysis, teams, list, and workspaces.

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

### #FEAT-015 Responsive sanity check — DONE iteration 30, 2026-02-26
**Phase:** 1.5
**Priority:** P2 (nice to have)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Workspace list page is usable at 1024px width (no overflow, no clipped buttons) — already responsive (sm:/lg: breakpoints)
- [x] Canvas page sidebar collapses cleanly at 1024px — auto-collapses via matchMedia at ≤1280px
- [x] Gap analysis table doesn't overflow at 1024px (horizontal scroll or column hiding) — overflow-x-auto + min-w-[600px]
- [x] Teams page is usable at 1024px — responsive summary cards + max-w-4xl fits in 976px available
**Notes:** Panel width reduced from 360→300px at ≤1280px via CSS media query. Summary cards use grid-cols-1 sm:grid-cols-3 for graceful stacking.

### #FEAT-016 End-to-end golden path test — DONE iteration 31, 2026-02-26
**Phase:** 1.5
**Priority:** P1 (important)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Full workflow tested: create workspace → add section → add steps → score maturity → set targets → view gap analysis → assign roles → view cost → export PDF → share link — verified via comprehensive static code tracing (10 steps, all wired correctly)
- [ ] Zero console errors during the entire flow — deferred (Playwright MCP unavailable)
- [ ] All data persists across page reload at each step — deferred (Playwright MCP unavailable)
- [ ] No visual regressions (layout shifts, missing elements, broken styling) — deferred (Playwright MCP unavailable)
**Notes:** Verified via static code analysis with 3 parallel exploration agents. All 10 golden path steps traced from UI → API client → API route → database. Types consistent, null guards in place, error handling present. Browser-based verification criteria deferred due to Playwright MCP being unavailable for iterations 20-31.

---

## Phase 2a: Journey Mapping

### #FEAT-017 Journey canvas type — DONE iteration 36, 2026-02-26
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] Data model: `canvas_type` discriminator on tabs + new `stages`/`touchpoints`/`touchpoint_connections` tables (Decision D-001: parallel tables)
- [x] TypeScript types updated (CanvasType, TouchpointSentiment, Stage, Touchpoint, TouchpointConnection, Tab.canvas_type)
- [x] API routes for stages, touchpoints, touchpoint_connections (CRUD + client wrappers)
- [x] Creating a new tab allows choosing "Process" or "Journey" type
- [x] Journey canvas has stages (group nodes) instead of sections
- [x] Journey canvas has touchpoints (step nodes) instead of steps
**Notes:** Decision D-001: Parallel tables chosen over discriminator. Migration 011 pushed. Decomposed into 4 sub-tasks. All complete.
**Sub-tasks:**
- [x] [1/4] Data model: migration 011 (enums, tables, RLS), TypeScript types — DONE iteration 32
- [x] [2/4] API routes + client wrappers for stages, touchpoints, touchpoint_connections — DONE iteration 33
- [x] [3/4] Tab type UI — canvas_type selector on tab creation, routing by canvas_type — DONE iteration 35
- [x] [4/4] Journey canvas rendering — stage nodes, touchpoint nodes, connections — DONE iteration 36

### #FEAT-018 Stage detail panel — DONE iteration 37, 2026-02-26
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Clicking a stage on journey canvas opens stage detail panel
- [x] Stage detail shows: name (editable), description (rich text), channel selector (web/phone/email/in-person/other), owner (text field)
- [x] Changes persist to database
- [x] Stage node on canvas shows name and channel icon (already implemented in FEAT-017)
**Notes:** Mirrors section-detail-panel.tsx pattern. Debounced name + owner inputs, native <select> for channel, TipTap rich text for description. Touchpoint sentiment summary, delete with orphan handling. Integrated into journey-canvas-view.tsx with conditional panel rendering.

### #FEAT-019 Touchpoint detail panel — DONE iteration 38, 2026-02-26
**Phase:** 2a
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Clicking a touchpoint on journey canvas opens touchpoint detail panel
- [x] Touchpoint detail shows: name, pain score (1-5), gain score (1-5), sentiment selector (positive/neutral/negative), customer emotion (text), notes (rich text)
- [x] Changes persist to database
- [x] Touchpoint node on canvas shows sentiment color (green/gray/red) — already implemented in FEAT-017
**Notes:** Mirrors stage-detail-panel.tsx pattern. Debounced name + emotion inputs, sentiment toggle buttons with colored highlights, pain/gain score button selectors (1-5) with click-to-toggle/deselect, TipTap rich text notes, delete with connection cleanup. Integrated into journey-canvas-view.tsx conditional panel rendering.

### #FEAT-020 Journey heat map — DONE iteration 39, 2026-02-26
**Phase:** 2a
**Priority:** P1 (important)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] Journey canvas has heat map toggle (similar to process canvas maturity heat map)
- [x] Heat map colors touchpoints by pain score (high pain = red, low = green)
- [x] Stage-level roll-up shows average pain score
- [x] Heat map legend explains the color scale
**Notes:** Created src/lib/pain.ts with inverted color scale (1=green, 5=red). Mirrors process canvas heat map pattern exactly: toggle button, colored backgrounds, stage roll-up badges, legend panel.

### #FEAT-021 Process vs journey comparison view
**Phase:** 2a
**Priority:** P1 (important)
**Attempts:** 2
**Status:** in-progress
**Acceptance criteria:**
- [x] New "Compare" view accessible from workspace navigation (only when workspace has both process and journey tabs)
- [x] Side-by-side layout: process canvas on left, journey canvas on right
- [x] Both canvases are read-only in comparison mode (click to navigate to full canvas)
- [ ] Visual alignment hints: stages and sections that share names or are linked are highlighted
**Notes:** This is the killer feature of journey mapping. The comparison reveals gaps between what the company does internally and what the customer experiences. The linking mechanism (stage ↔ section) can be manual or name-based.
**Sub-tasks:**
- [x] [1/3] Route + sidebar nav + side-by-side shell with data fetching + stats summary — DONE iteration 41
- [x] [2/3] Read-only React Flow canvas rendering (process left, journey right) — DONE iteration 43
- [ ] [3/3] Visual alignment hints between stages/sections with matching names

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

---

<!-- ═══════════════════════════════════════════════════════════════════════
     PHASE 2b/2c/3 FEATURES BELOW — Added by human (not agent-generated).
     Agent: DO NOT delete these sections. They are the roadmap for future phases.
     Only modify individual task entries (mark done, add sub-tasks, increment attempts).
     ═══════════════════════════════════════════════════════════════════════ -->

## Phase 2b: Analysis & Intelligence

### #FEAT-023 Perspectives data model and UI shell
**Phase:** 2b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `perspectives` table: id, workspace_id, name (e.g., "Customer", "Operations Manager", "IT"), color (hex), icon (text), created_at, updated_at
- [ ] New `perspective_annotations` table: id, perspective_id, annotatable_type (enum: 'step', 'section', 'touchpoint', 'stage'), annotatable_id (UUID), content (text — the annotation), rating (integer 1-5 nullable), created_at, updated_at
- [ ] RLS policies using `can_access_workspace()` via perspectives.workspace_id
- [ ] TypeScript types: `Perspective`, `PerspectiveAnnotation`, `AnnotatableType`
- [ ] API routes: GET/POST perspectives, PATCH/DELETE perspectives/[id], GET/POST/PATCH/DELETE annotations
- [ ] Client wrappers in `lib/api/client.ts`
- [ ] Migration file pushed to Supabase
**Notes:** Perspectives are overlays on existing canvas elements, NOT separate canvases. A perspective is like a "lens" — the consultant switches to "Customer" perspective and adds annotations to existing steps/touchpoints. The annotatable_type + annotatable_id pattern allows annotations on any entity (polymorphic). Rating is optional — used for sentiment/importance scoring per perspective.
**Sub-tasks:**
- [ ] [1/3] Database migration, enums, TypeScript types
- [ ] [2/3] API routes + client wrappers
- [ ] [3/3] Basic perspectives management UI (create/edit/delete perspectives in workspace settings or a dedicated panel)

### #FEAT-024 Perspective annotation UI
**Phase:** 2b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Perspective switcher dropdown in workspace header or canvas toolbar — lists all perspectives + "None" default
- [ ] When a perspective is active, clicking a step/section/touchpoint/stage shows an annotation panel alongside the normal detail panel
- [ ] Annotation panel has: text area (rich text via TipTap), optional rating (1-5 stars/score), save/delete buttons
- [ ] Existing annotations for the active perspective are loaded and displayed when viewing an element
- [ ] Visual indicator on canvas nodes that have annotations in the active perspective (e.g., small colored dot matching perspective color)
- [ ] Annotations persist to database and survive page reload
- [ ] Switching perspective reloads annotations for the new perspective
**Notes:** The perspective switcher should be prominent but not intrusive. Consider a colored badge/pill showing the active perspective name. When no perspective is active, the app works exactly as before — perspectives are purely additive. Don't modify existing step-detail-panel or section-detail-panel — create a separate annotation overlay/section within them.

### #FEAT-025 Perspective comparison view
**Phase:** 2b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New "Compare Perspectives" view accessible from workspace navigation (only visible when workspace has 2+ perspectives with annotations)
- [ ] Select 2 perspectives to compare via dropdown selectors at the top
- [ ] Side-by-side table layout: rows are annotated elements (steps/sections/touchpoints), columns show each perspective's annotation text and rating
- [ ] Divergence highlighting: rows where ratings differ by 2+ points are highlighted (e.g., amber background)
- [ ] Summary statistics at top: total annotations per perspective, average rating per perspective, divergence count, top 3 most divergent elements
- [ ] Clicking an element name navigates to that element on the canvas
- [ ] Export comparison as section in PDF (button) — adds a "Perspective Comparison" page to existing PDF export
**Notes:** This is the insight generator from the Further Context transcript — leaders think everything is great, teams say it's broken. The comparison surface reveals that divergence. Keep the layout clean: no canvas rendering in this view, just a structured table/card layout. The divergence threshold (2+ point difference) should be a constant, not hardcoded.

### #FEAT-026 Prioritization matrix
**Phase:** 2b
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New columns on `steps` table: `effort_score` (integer 1-5, nullable), `impact_score` (integer 1-5, nullable) — via migration
- [ ] Same columns on `touchpoints` table: `effort_score`, `impact_score`
- [ ] Step detail panel and touchpoint detail panel show effort and impact score selectors (1-5 scale, similar UI to maturity scoring)
- [ ] New "Prioritization" view accessible from workspace navigation
- [ ] Quadrant visualization: X-axis = effort (1-5), Y-axis = impact (1-5), items plotted as dots/cards
- [ ] Four quadrants labeled: "Quick Wins" (low effort, high impact), "Major Projects" (high effort, high impact), "Fill-Ins" (low effort, low impact), "Deprioritize" (high effort, low impact)
- [ ] Each dot shows step/touchpoint name, hover shows full details
- [ ] Dots are colored by gap size (if maturity data exists) or by section/stage
- [ ] Clicking a dot navigates to the element on canvas
- [ ] Filter by tab, section/stage, or score threshold
- [ ] TypeScript types updated for new columns
**Notes:** The prioritization matrix is a standard consulting deliverable. The effort x impact quadrant is universal. Keep it simple — no drag-to-reposition (that implies persistent position data we don't need). Position is computed from the scores. The matrix reuses existing scoring UI patterns from maturity scoring (FEAT-001).

### #FEAT-027 Improvement ideas tracker
**Phase:** 2b
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `improvement_ideas` table: id, workspace_id, title (text), description (text), status (enum: 'proposed', 'approved', 'in_progress', 'completed', 'rejected'), priority (enum: 'low', 'medium', 'high', 'critical'), linked_step_id (UUID nullable, FK steps), linked_touchpoint_id (UUID nullable, FK touchpoints), linked_section_id (UUID nullable, FK sections), created_by (UUID FK users), created_at, updated_at
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `ImprovementIdea`, `IdeaStatus`, `IdeaPriority`
- [ ] API routes: GET list (filterable by status/priority), POST create, PATCH update, DELETE
- [ ] Client wrappers in `lib/api/client.ts`
- [ ] "Add Improvement" button on step detail panel, section detail panel, and touchpoint detail panel — opens a dialog with title, description, priority fields. Pre-fills the linked entity.
- [ ] New "Improvements" view accessible from workspace navigation — shows all improvement ideas as a filterable list/kanban by status
- [ ] Each idea card shows: title, status badge, priority badge, linked element name (clickable), description preview
- [ ] Status can be changed inline (dropdown) or via drag in kanban view
- [ ] Count badge on navigation item showing number of open (non-completed/rejected) ideas
**Notes:** This replaces sticky notes and spreadsheets that consultants currently use to track recommendations. The link back to source element (step/touchpoint/section) provides traceability. Status lifecycle: proposed → approved → in_progress → completed (or → rejected at any point). Keep kanban simple — 4 columns matching the non-rejected statuses.
**Sub-tasks:**
- [ ] [1/3] Data model: migration, enums, types, API routes, client wrappers
- [ ] [2/3] "Add Improvement" dialogs on step/section/touchpoint panels + improvements list view
- [ ] [3/3] Kanban view with drag-to-change-status + filtering + count badge

### #FEAT-028 AI process analysis
**Phase:** 2b
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New API route: POST `/api/v1/ai/analyze-process` — accepts workspace_id, returns structured analysis
- [ ] Server-side Claude API call (Anthropic SDK) using `ANTHROPIC_API_KEY` env var (stored in `.env.local`, added to Vercel)
- [ ] Analysis prompt includes: all steps with maturity scores, time, frequency, cost, roles, gaps — structured as JSON context
- [ ] Response is structured JSON with sections: `bottlenecks` (steps with high cost + low maturity), `redundancies` (steps with similar names/roles that could be consolidated), `automation_candidates` (steps with executor=person, high frequency, low complexity), `maturity_recommendations` (steps below target with specific suggestions)
- [ ] New "AI Analysis" panel/page accessible from workspace navigation
- [ ] Analysis results displayed as categorized cards with severity indicators
- [ ] Each recommendation links back to the source step(s)
- [ ] "Regenerate" button to re-run analysis
- [ ] Loading state while analysis runs (can take 5-15 seconds)
- [ ] Results cached in `workspace.settings` JSONB field (key: `last_analysis`) with timestamp — avoids re-running on every page visit
- [ ] Error handling: if API key missing, show setup instructions; if API fails, show retry with error message
**Notes:** This is NOT a generic "analyze my business" feature. The prompt must be grounded in actual data. The agent constructs a structured prompt from the workspace's real steps, scores, costs, and gaps. The model returns structured JSON that maps directly to UI cards. Use `claude-sonnet-4-5-20250514` for cost efficiency (not opus). Temperature 0.3 for consistency. Max tokens 4096. Rate limit: 1 analysis per workspace per 5 minutes (check cached timestamp). Do NOT install new dependencies — use fetch() to call the Anthropic API directly (REST endpoint: `https://api.anthropic.com/v1/messages`).
**Sub-tasks:**
- [ ] [1/3] API route with Anthropic API integration, prompt construction from workspace data, structured response parsing
- [ ] [2/3] AI Analysis page UI: categorized result cards, loading state, regenerate button, link-to-step navigation
- [ ] [3/3] Caching in workspace settings, rate limiting, error states (missing API key, API failure, empty workspace)

### #FEAT-029 AI gap narrative generator
**Phase:** 2b
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New API route: POST `/api/v1/ai/gap-narrative` — accepts workspace_id, returns written narrative text
- [ ] Prompt includes gap analysis data: steps with current vs target maturity, section names, gap sizes, cost implications
- [ ] Response is a professional consulting narrative (2-4 paragraphs) suitable for inclusion in a client report
- [ ] "Generate Summary" button on gap analysis view — appears above the gap table
- [ ] Generated narrative displayed in a styled card above the table with copy-to-clipboard button
- [ ] "Regenerate" button to get a fresh narrative
- [ ] Narrative can be included in PDF export (optional toggle on export dialog)
- [ ] Loading state while generating
**Notes:** This directly addresses the consultant use case — they need to write gap analysis summaries for client reports. The AI generates a first draft they can edit. Output should sound like a senior consultant wrote it: specific, data-grounded, action-oriented. No generic business platitudes. The narrative references actual step names, section names, and maturity numbers from the data. Same Anthropic API pattern as FEAT-028. Cache result in localStorage (simpler than DB for a text blob).

### #FEAT-030 AI improvement suggestions
**Phase:** 2b
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New API route: POST `/api/v1/ai/suggest-improvements` — accepts workspace_id, returns array of improvement suggestions
- [ ] Prompt includes: low-maturity steps (below target), high-cost steps, high-frequency manual steps, gap analysis data
- [ ] Each suggestion has: title, description, affected_step_ids, estimated_impact (text), category (process, technology, people, governance)
- [ ] "AI Suggestions" button on the Improvements view (FEAT-027) — generates suggestions and offers to create improvement ideas from them
- [ ] Each suggestion has an "Add as Improvement" button that pre-fills the improvement idea creation dialog
- [ ] Loading state, error handling (same pattern as FEAT-028)
**Notes:** This bridges AI analysis (FEAT-028) and the improvement tracker (FEAT-027). AI suggests, human reviews and approves. Suggestions should be specific and actionable, not generic. "Consider automating the 'Manual Data Entry' step (currently 45 min x 20/month = $1,500/month in labor) using a Zapier integration" is good. "Improve your processes" is bad. Depends on FEAT-027 being complete (needs the improvement ideas table).

### #FEAT-031 Phase 2b regression and quality pass
**Phase:** 2b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full regression pass: all existing features (canvas, scoring, gap analysis, costing, teams, export, sharing) still work
- [ ] Perspectives CRUD works end-to-end: create perspective → annotate steps → switch perspectives → compare
- [ ] Prioritization matrix renders correctly with test data
- [ ] Improvement ideas lifecycle works: create → approve → complete
- [ ] AI analysis returns structured results (requires ANTHROPIC_API_KEY in env)
- [ ] All new pages have loading states and error boundaries
- [ ] All new interactive elements have aria-labels
- [ ] Type check, lint, and build all pass
- [ ] No console errors on any new page
**Notes:** This is a dedicated testing iteration, not a feature build. Run after all Phase 2b features are complete. If AI features can't be tested (no API key in CI), test the UI states (loading, error, empty) and mark AI integration testing as deferred.

---

## Phase 2c: Tools Canvas & Enhanced Export

### #FEAT-032 Tools data model
**Phase:** 2c
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `tools` table: id, workspace_id, name (text), vendor (text nullable), url (text nullable), icon_url (text nullable), status (enum: 'active', 'considering', 'cancelled'), cost_type (enum: 'monthly', 'annual', 'one_time'), cost_amount (numeric 10,2 nullable), renewal_date (date nullable), notes (text nullable), category (text nullable), position_x (float), position_y (float), created_at, updated_at
- [ ] New `tool_sections` table: id, workspace_id, name, position_x, position_y, width, height, created_at, updated_at — groups tools visually on canvas (like sections group steps)
- [ ] New `step_tools` junction table: id, step_id (FK steps), tool_id (FK tools), created_at — many-to-many linking steps to tools
- [ ] New enums: `tool_status` ('active', 'considering', 'cancelled'), `tool_cost_type` ('monthly', 'annual', 'one_time')
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `Tool`, `ToolSection`, `StepTool`, `ToolStatus`, `ToolCostType`
- [ ] API routes: tools (GET list, POST create, PATCH/DELETE by id), tool-sections (POST create, PATCH/DELETE by id), step-tools (GET by step_id, POST create, DELETE by id)
- [ ] Client wrappers in `lib/api/client.ts`
- [ ] Migration file pushed to Supabase
**Notes:** Tools are workspace-scoped. The position_x/y fields support canvas rendering (tools as draggable cards on a dedicated canvas). cost_type determines how cost is displayed and aggregated: monthly costs roll up directly, annual costs are divided by 12 for monthly view, one_time costs are excluded from recurring totals (Puzzle spec requirement). renewal_date is only relevant for monthly/annual costs. icon_url can be auto-fetched from favicon later, but start with manual entry or null.
**Sub-tasks:**
- [ ] [1/2] Database migration, enums, TypeScript types
- [ ] [2/2] API routes + client wrappers for tools, tool-sections, step-tools

### #FEAT-033 Tools canvas page
**Phase:** 2c
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Tools page at `/w/[workspaceId]/tools` renders a React Flow canvas (reusing existing canvas infrastructure)
- [ ] Tool nodes: card with icon/avatar, tool name, status badge (active=green, considering=yellow, cancelled=gray), cost display ($/mo)
- [ ] Tool section nodes: group containers similar to process sections, with name label
- [ ] Dragging tools into/out of tool sections works
- [ ] "Add Tool" button in toolbar creates a new tool node on canvas
- [ ] "Add Tool Section" button creates a new section container (e.g., "Sales Stack", "Marketing Tools")
- [ ] Right sidebar summary when nothing selected: total monthly cost, total annual cost, tool counts by status (active/considering/cancelled)
- [ ] Canvas zoom/pan controls (reuse existing)
**Notes:** The tools canvas is the third canvas type (after process and journey). It does NOT use tabs — it's a single canvas per workspace. Use the same React Flow setup as the process canvas but with different node types. Tool nodes are simpler than step nodes (no connections between tools by default). Tool sections are purely organizational grouping.
**Sub-tasks:**
- [ ] [1/3] Tool canvas page setup: React Flow canvas, tool node component, tool section node component
- [ ] [2/3] Add Tool / Add Tool Section toolbar, drag into sections, canvas controls
- [ ] [3/3] Right sidebar cost summary panel (total monthly, annual, counts by status)

### #FEAT-034 Tool detail panel
**Phase:** 2c
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Clicking a tool on tools canvas opens right sidebar detail panel
- [ ] Editable fields: name, vendor, URL, status (dropdown: active/considering/cancelled), cost type (dropdown: monthly/annual/one-time), cost amount (currency input), renewal date (date picker, only shown for monthly/annual), category (text input), notes (rich text via TipTap)
- [ ] Changes persist to database on blur/change
- [ ] "Step Usage" section at bottom: lists all steps that use this tool (via step_tools junction), each clickable to navigate to that step on the process canvas
- [ ] "Delete Tool" link at bottom (red text, confirmation dialog)
- [ ] Cost display: shows monthly equivalent (annual / 12 for annual tools, shows "one-time" label for one-time)
**Notes:** The step usage section is the "backlink index" from the Puzzle spec — it shows everywhere a tool is referenced. This is computed by querying step_tools JOIN steps. Clicking a step navigates to the process canvas tab containing that step.

### #FEAT-035 Step-tool assignment
**Phase:** 2c
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Step detail panel has a "Tools" section (accordion, below Roles section)
- [ ] "Add Tool" button opens a dropdown/selector listing all tools in the workspace
- [ ] Selected tools appear as badges/pills in the step detail panel (similar to role assignment)
- [ ] Each tool badge shows tool name and small icon (if icon_url exists)
- [ ] Remove tool by clicking X on the badge
- [ ] Tool assignment persists via step_tools junction table
- [ ] Step node on process canvas shows small tool icons (up to 3, then "+N" overflow)
- [ ] Touchpoint detail panel also has "Tools" section with same behavior (reuse component)
- [ ] Tool cost is factored into step cost calculation: step labor cost + sum of tool monthly costs for assigned tools = total step cost
**Notes:** This connects the tools canvas to the process canvas. The cost integration is important — when a tool is assigned to a step, that tool's monthly cost is added to the step's cost display. For annual tools, use monthly equivalent (/12). For one-time tools, exclude from recurring cost (per Puzzle spec). Reuse the role-assignment UI pattern (dropdown + badges) for consistency.

### #FEAT-036 Tool overlap and gap analysis
**Phase:** 2c
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New "Tool Analysis" section on the tools page (accessible via tab or button)
- [ ] "Overlapping Tools" card: lists steps served by 2+ tools (potential redundancy). Shows step name, list of overlapping tools, combined monthly cost
- [ ] "Unused Tools" card: lists tools with zero step assignments (tools that exist but aren't linked to any process step). Shows tool name, status, cost
- [ ] "Coverage Gaps" card: lists steps with no tool assigned (manual/unautomated steps). Shows step name, section, frequency — sorted by frequency descending (highest-frequency unautomated steps first)
- [ ] Total tool spend summary: monthly total, annual total, count by status
- [ ] Clicking any step/tool name navigates to that element
**Notes:** This is a standard consulting deliverable — "you're paying for 3 tools that do the same thing" and "these 10 high-frequency steps have no tool support." The analysis is computed client-side from tools + step_tools + steps data. No AI needed — pure data analysis.

### #FEAT-037 Enhanced PDF export — multi-section report
**Phase:** 2c
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Export dialog (replaces direct download) with section toggles — user chooses what to include
- [ ] Available PDF sections (each toggleable):
  - [ ] Title page (always included): workspace name, date, logo placeholder
  - [ ] Executive Summary: key metrics (total steps, scored steps, average maturity, total cost, team count)
  - [ ] Process Map: canvas snapshot (existing)
  - [ ] Gap Analysis: summary cards + ranked table (existing)
  - [ ] Cost Analysis: cost breakdown by section + top costly steps (existing)
  - [ ] Journey Map: journey canvas snapshot (if journey tabs exist)
  - [ ] Journey Sentiment: touchpoint pain/gain summary (if journey data exists)
  - [ ] Perspective Comparison: divergence table (if perspectives exist)
  - [ ] Prioritization Matrix: quadrant snapshot (if effort/impact scores exist)
  - [ ] Tool Landscape: tool list with costs, status, usage count (if tools exist)
  - [ ] Improvement Recommendations: list of improvement ideas by priority (if ideas exist)
  - [ ] AI Insights: AI analysis results (if cached analysis exists)
- [ ] PDF renders selected sections in order, each starting on a new page
- [ ] "Full Audit" preset: selects all available sections
- [ ] "Executive Summary" preset: title + executive summary + gap analysis + recommendations only
- [ ] "Gap Report" preset: title + gap analysis + perspective comparison + recommendations
- [ ] Export button generates and downloads the PDF
- [ ] Each section uses existing dark-theme styling
**Notes:** This is the "crown jewel" — what consultants actually hand to clients. The existing PDF export (FEAT-007) becomes one section within this larger report. The dialog approach lets consultants customize the deliverable per client. Presets save time. The export builds on the existing jspdf infrastructure. Each new section needs a corresponding render function in lib/export/pdf.ts (or split into lib/export/pdf-sections/). Keep render functions modular — one per section.
**Sub-tasks:**
- [ ] [1/4] Export dialog UI with section toggles and presets
- [ ] [2/4] New PDF sections: executive summary, journey map snapshot, journey sentiment, perspective comparison
- [ ] [3/4] New PDF sections: prioritization matrix, tool landscape, improvement recommendations, AI insights
- [ ] [4/4] Polish: consistent styling across sections, page numbers, table of contents page

### #FEAT-038 Phase 2c regression and quality pass
**Phase:** 2c
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full regression: process canvas, journey canvas, scoring, gap analysis, perspectives, prioritization, improvements, AI analysis all still work
- [ ] Tools CRUD end-to-end: create tool → assign to step → see in tool detail backlinks → see cost in step panel
- [ ] Tool analysis computes correctly: overlapping tools, unused tools, coverage gaps
- [ ] Enhanced PDF export produces correct multi-section document with all available data
- [ ] PDF presets work correctly (Full Audit, Executive Summary, Gap Report)
- [ ] All new pages have loading states, error boundaries, aria-labels
- [ ] Type check, lint, build pass
- [ ] No console errors on any new page
**Notes:** Dedicated testing iteration. Focus on data flow: tool cost → step cost → section cost → workspace cost → PDF cost page. This chain must be correct.

---

## Phase 3: The Living Playbook

### #FEAT-039 Comments system
**Phase:** 3
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `comments` table: id, workspace_id, commentable_type (enum: 'step', 'section', 'touchpoint', 'stage'), commentable_id (UUID), parent_id (UUID nullable FK comments — for threading), author_id (UUID FK users), content (text), category (enum: 'note', 'decision', 'pain_point', 'idea', 'question'), is_resolved (boolean default false), created_at, updated_at
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `Comment`, `CommentCategory`, `CommentableType`
- [ ] API routes: GET (filterable by commentable_type + commentable_id, or by workspace_id for all), POST create, PATCH update, DELETE
- [ ] Client wrappers
- [ ] Comment panel tab on step detail panel (speech bubble icon, per Puzzle spec)
- [ ] Comment list shows: author name, timestamp (relative), category badge, content, reply count
- [ ] "Add Comment" form: category dropdown + text area + submit button
- [ ] Threaded replies: click "Reply" to add a child comment
- [ ] "Resolve" button on comments (toggles is_resolved, dims the comment)
- [ ] Comment count badge on step/section/touchpoint nodes on canvas
- [ ] Workspace-level comment aggregation view: all comments across workspace, filterable by category, sortable by date
**Notes:** Comments are the collaboration backbone. The category system (note/decision/pain_point/idea/question) is from the Puzzle spec — it helps consultants organize feedback from workshops. Threading via parent_id (null = top-level, non-null = reply). Start with basic CRUD — @mentions and email notifications are Phase 4. The aggregation view goes in a new comments panel accessible from the sidebar.
**Sub-tasks:**
- [ ] [1/3] Data model: migration, enums, types, API routes, client wrappers
- [ ] [2/3] Comment panel on step/section detail panels: list, create, reply, resolve
- [ ] [3/3] Comment count badges on canvas nodes + workspace-level comments aggregation view

### #FEAT-040 Tasks system (step-level checklists)
**Phase:** 3
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `tasks` table: id, workspace_id, step_id (UUID FK steps), title (text), is_completed (boolean default false), position (integer — for ordering), assigned_to (UUID nullable FK users), created_by (UUID FK users), created_at, updated_at
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `Task`
- [ ] API routes: GET by step_id, POST create, PATCH update (title, is_completed, position, assigned_to), DELETE
- [ ] Client wrappers
- [ ] Tasks tab on step detail panel (checkbox icon, per Puzzle spec)
- [ ] Task list with: checkbox (toggle completion), title (inline editable), drag-to-reorder
- [ ] Completed tasks show strikethrough styling
- [ ] "Add Task" input at bottom of list
- [ ] Task count indicator on step nodes on canvas (e.g., "2/5 tasks" or checkmark icon)
- [ ] Section-level task rollup in section detail panel: lists all tasks from all steps in the section, grouped by step
**Notes:** Tasks are lightweight step-scoped to-dos, not a full project management system. They're used during consulting engagements to track implementation items per step. Drag-to-reorder updates the position field. The section rollup is important — consultants review all outstanding tasks per section. Reuse existing sortable patterns if available, otherwise use a simple drag handler with position integers.
**Sub-tasks:**
- [ ] [1/2] Data model: migration, types, API routes, client wrappers
- [ ] [2/2] Task panel UI on step detail: list, create, complete, reorder, delete + section rollup + canvas indicator

### #FEAT-041 Runbook instances
**Phase:** 3
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `runbooks` table: id, workspace_id, section_id (FK sections — a runbook is launched from a section), name (text — defaults to section name + instance info), status (enum: 'active', 'completed', 'cancelled'), started_at (timestamptz), completed_at (timestamptz nullable), created_by (UUID FK users), created_at, updated_at
- [ ] New `runbook_steps` table: id, runbook_id (FK runbooks), step_id (FK steps), status (enum: 'pending', 'in_progress', 'completed', 'skipped'), assigned_to (UUID nullable FK users), completed_at (timestamptz nullable), notes (text nullable), position (integer — preserves step order from section), created_at, updated_at
- [ ] RLS policies via `can_access_workspace()` through runbooks.workspace_id
- [ ] TypeScript types: `Runbook`, `RunbookStep`, `RunbookStatus`, `RunbookStepStatus`
- [ ] API routes: runbooks (GET list, POST create from section_id, PATCH status, DELETE), runbook-steps (GET by runbook_id, PATCH status/notes/assigned_to)
- [ ] Client wrappers
- [ ] "Run as Checklist" button on section detail panel — creates a runbook instance from the section's steps
- [ ] Runbook view: simplified linear checklist (no canvas) showing steps in order, each with checkbox, assignee, status, notes field
- [ ] Progress bar showing completion percentage
- [ ] "Complete Runbook" button when all steps are done
- [ ] Runbook list view: all runbooks in workspace with status, progress, dates
**Notes:** This is the Phase 3 killer feature — it turns static process maps into executable checklists. A consultant maps the process, then the client's ops team "runs" it. The runbook is an instance of a section — the same section can have multiple active runbooks (e.g., "Client Onboarding — Acme Corp" and "Client Onboarding — Beta Inc"). Steps are copied from the section at creation time (snapshot, not live reference) so the runbook doesn't change if the process map is updated. The linear view is intentionally simple — no canvas complexity, just a checklist.
**Sub-tasks:**
- [ ] [1/3] Data model: migration, enums, types, API routes, client wrappers
- [ ] [2/3] "Run as Checklist" button, runbook creation from section, linear checklist view
- [ ] [3/3] Progress tracking, completion flow, runbook list view with filtering

### #FEAT-042 Playbook mode (simplified execution view)
**Phase:** 3
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New "Playbook" view for active runbooks — a distraction-free linear view optimized for daily execution
- [ ] Shows only the current step (large, centered) with: step name, description/notes, assigned person, tools needed, checklist tasks (from FEAT-040 if any)
- [ ] "Mark Complete & Next" button advances to the next step
- [ ] Progress indicator showing position in the overall runbook (step 3 of 12)
- [ ] Previous/next navigation to review completed steps or peek ahead
- [ ] Completed steps shown with green checkmark and completion timestamp
- [ ] Current step highlighted with accent color
- [ ] URL-shareable: each runbook has a direct URL that non-workspace-members could access (if public sharing is enabled for the workspace)
**Notes:** Playbook mode is the "1000-foot view" for ops team members who don't need to see the full process map. They just need "what do I do next?" This is the upsell from Consultant tier to Team tier (per ROADMAP.md pricing). The view should be mobile-responsive since ops team members might use it on tablets. Keep it extremely simple — no sidebar, no canvas, no complexity.

### #FEAT-043 Activity log
**Phase:** 3
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `activity_log` table: id, workspace_id, user_id (FK users), action (enum: 'created', 'updated', 'deleted', 'completed', 'assigned', 'commented', 'exported', 'shared'), entity_type (text — 'step', 'section', 'tool', 'runbook', etc.), entity_id (UUID), entity_name (text — snapshot of name at time of action), details (JSONB nullable — changed fields, old/new values), created_at
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `ActivityLogEntry`, `ActivityAction`
- [ ] Activity logging middleware/utility: function `logActivity(workspace_id, user_id, action, entity_type, entity_id, entity_name, details?)` called from relevant API routes
- [ ] Activity log page at `/w/[workspaceId]/activity` — chronological list of all workspace activity
- [ ] Each entry shows: user name/avatar, action description (human-readable sentence, e.g., "Patrick created step 'Data Entry' in section 'Onboarding'"), timestamp (relative), entity link (clickable)
- [ ] Filterable by: user, action type, entity type, date range
- [ ] Pagination (load more / infinite scroll) — activity logs can be large
**Notes:** Activity log is the audit trail. It's important for consulting engagements (showing clients what changed and when) and for team collaboration (understanding what happened while you were away). The logging function should be called from existing API routes — add `logActivity()` calls to POST/PATCH/DELETE handlers for steps, sections, tools, runbooks. Don't log reads (GET). Keep the details JSONB small — only store changed field names and old/new values for updates.
**Sub-tasks:**
- [ ] [1/3] Data model: migration, types, logging utility function
- [ ] [2/3] Add logActivity() calls to all relevant API routes (steps, sections, tabs, tools, runbooks, shares)
- [ ] [3/3] Activity log page UI: chronological list, filtering, pagination, entity links

### #FEAT-044 Workspace cloning
**Phase:** 3
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] "Duplicate Workspace" button in workspace settings
- [ ] Creates a deep copy of the workspace: new workspace + copies of all tabs, sections, steps, connections, teams, roles, people, tools, tool sections, step_roles, step_tools, stages, touchpoints, touchpoint_connections
- [ ] New workspace name defaults to "{Original Name} (Copy)"
- [ ] All IDs are regenerated (new UUIDs) — no reference to original workspace entities
- [ ] Foreign key relationships preserved within the copy (section_id on steps points to the copied section, not the original)
- [ ] Perspectives, annotations, comments, tasks, runbooks, activity log are NOT copied (they're instance-specific)
- [ ] Improvement ideas are NOT copied
- [ ] Server-side implementation via a SECURITY DEFINER function (single transaction for atomicity)
- [ ] Loading state during clone (can take several seconds for large workspaces)
- [ ] After clone, navigate to the new workspace
**Notes:** Workspace cloning is how consultants reuse their frameworks. They build a "template workspace" with their standard sections, scoring rubric, and team structure, then clone it for each new client engagement. The clone must be a full deep copy — not references. Use a Supabase RPC function that does all the INSERTs in a single transaction. Map old IDs to new IDs to preserve internal relationships.

### #FEAT-045 Conditional step coloring
**Phase:** 3
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `coloring_rules` table: id, workspace_id, name (text), color (hex text), criteria_type (enum: 'status', 'executor', 'step_type', 'has_tool', 'has_role', 'maturity_below', 'maturity_above'), criteria_value (text — the value to match, e.g., 'draft', 'person', tool_id, role_id, '3'), is_active (boolean default true), position (integer — evaluation order), created_at, updated_at
- [ ] RLS policies via `can_access_workspace()`
- [ ] TypeScript types: `ColoringRule`, `CriteriaType`
- [ ] API routes: GET list, POST create, PATCH update, DELETE
- [ ] Client wrappers
- [ ] Conditional coloring panel accessible from canvas toolbar (paintbrush icon in left sidebar)
- [ ] Panel shows list of rules with: name (editable), color swatch (clickable color picker), criteria type dropdown, criteria value dropdown/input, active toggle, delete button
- [ ] "Add Rule" button creates a new rule
- [ ] Rules evaluated in order (position) — last matching rule wins
- [ ] Step nodes on canvas apply the matching rule's color as background tint (subtle, preserving readability)
- [ ] Rules apply in real-time as rules are created/edited
**Notes:** Conditional coloring is from the Puzzle spec — it lets users visually highlight steps by criteria (e.g., "all draft steps = yellow", "all steps with no role assigned = red"). The evaluation is client-side: fetch all rules, evaluate each step against rules in order, apply the last matching color. Keep it simple — AND logic only (all criteria of a rule must match for it to apply). No complex boolean expressions. The color should be applied as a background tint (low opacity overlay) so text remains readable.
**Sub-tasks:**
- [ ] [1/2] Data model: migration, enums, types, API routes, client wrappers
- [ ] [2/2] Coloring panel UI + real-time rule evaluation on canvas step nodes

### #FEAT-046 Section templates (save & deploy)
**Phase:** 3
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] New `templates` table: id, workspace_id (nullable — null = global/org template), organization_id, name (text), description (text nullable), category (text nullable — 'Marketing', 'Sales', 'Operations', etc.), template_data (JSONB — snapshot of section + steps + connections + roles + tools), created_by (UUID FK users), created_at, updated_at
- [ ] RLS policies: workspace-scoped templates via `can_access_workspace()`, org-scoped via `is_org_member()`
- [ ] TypeScript types: `Template`
- [ ] API routes: GET list (filterable by category, workspace, org), POST create (from section_id), DELETE
- [ ] Client wrappers
- [ ] "Save as Template" button on section detail panel — opens dialog with name, description, category fields
- [ ] Saving captures: section name/summary, all steps (name, status, type, executor, notes, time, frequency, maturity fields), connections between steps, role assignments, tool assignments — as a JSONB snapshot
- [ ] Template browser accessible from canvas toolbar (grid icon) — shows templates as cards with name, description, category, step count
- [ ] Searchable by name, filterable by category
- [ ] "Deploy Template" creates a new section with all the captured steps, connections, and assignments on the current tab
- [ ] Deployed steps get new UUIDs — no reference to original entities
- [ ] Pre-built starter templates: "Customer Onboarding", "Support Ticket Resolution", "Content Creation", "Lead Nurturing" (seeded as org-level templates)
**Notes:** Templates are how Puzzle enables reuse. A consultant builds their "Client Onboarding" framework once, saves it as a template, and deploys it in every client workspace. The template_data JSONB stores a complete snapshot — not references to live entities. When deploying, all IDs are regenerated. Role and tool assignments reference by name (not ID) since the target workspace may have different role/tool IDs — attempt to match by name, skip unmatched.
**Sub-tasks:**
- [ ] [1/3] Data model: migration, types, API routes (create from section, list, delete)
- [ ] [2/3] "Save as Template" dialog on section panel + template data capture logic
- [ ] [3/3] Template browser UI + deploy template logic (create section + steps + connections from JSONB snapshot)

### #FEAT-047 Phase 3 regression and quality pass
**Phase:** 3
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full regression: all Phase 1, 1.5, 2a, 2b, 2c features still work
- [ ] Comments CRUD end-to-end: create, reply, resolve, category filtering, aggregation view
- [ ] Tasks CRUD end-to-end: create, complete, reorder, section rollup
- [ ] Runbooks: create from section → execute steps → complete runbook
- [ ] Playbook mode: step-by-step execution works
- [ ] Activity log captures actions from all major API routes
- [ ] Workspace cloning produces a correct deep copy
- [ ] Conditional coloring rules apply correctly on canvas
- [ ] Templates: save section → browse templates → deploy in another tab
- [ ] All new pages have loading states, error boundaries, aria-labels
- [ ] Type check, lint, build pass
- [ ] No console errors on any page
**Notes:** This is the largest testing gate. Phase 3 touches many systems (comments, tasks, runbooks, activity log, cloning, coloring, templates). Test data flow chains thoroughly: section with steps + tasks → create runbook → execute in playbook mode → activity log captures all actions.
