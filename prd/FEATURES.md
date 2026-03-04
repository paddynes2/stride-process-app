# Features — Stride

## Phase 0: Core Canvas MVP — DONE
- [x] #FEAT-000 Core canvas (auth, DB, CRUD, React Flow, panels) — DONE iteration ~7

## Phase 1: Analysis & Export — DONE
- [x] #FEAT-001 Maturity scoring data model + UI — DONE
- [x] #FEAT-002 Section maturity roll-up + canvas heat map — DONE
- [x] #FEAT-003 Gap analysis view — DONE
- [x] #FEAT-005 Teams, roles, people (data model, API, UI) — DONE
- [x] #FEAT-006 Step-role assignments + cost calculations — DONE
- [x] #FEAT-007 PDF export (canvas + data table + gap analysis + cost) — DONE
- [x] #FEAT-008 PNG export — DONE
- [x] #FEAT-009 Public sharing (data layer, settings UI, read-only view) — DONE

## Phase 1.5: Polish & Hardening — DONE
- [x] #FEAT-011 Empty states (canvas, list views, getting started template) — DONE
- [x] #FEAT-012 Loading states (skeletons, error boundaries, offline banner) — DONE
- [x] #FEAT-013 Lazy-load heavy deps (jspdf, tiptap) — DONE
- [x] #FEAT-014 Extract shared maturity constants + canvas export hook — DONE
- [x] #FEAT-015 Responsive sanity check (1024px) — DONE
- [x] #FEAT-016 Golden path verification — DONE

## Phase 2a: Journey Canvas — DONE
- [x] #FEAT-017 Journey canvas data model + API + tab type UI + rendering — DONE (4 sub-tasks)
- [x] #FEAT-018 Stage detail panel — DONE
- [x] #FEAT-019 Touchpoint detail panel — DONE
- [x] #FEAT-020 Journey heat map (pain score coloring) — DONE
- [x] #FEAT-021 Comparison view — DONE (3 sub-tasks)
- [x] #FEAT-022 Journey canvas export (PDF + PNG) — DONE (2 sub-tasks)

## Phase 2b: Perspectives — DONE (features + completion testing complete)
- [x] #FEAT-023 Perspectives data model + API + management UI — DONE (3 sub-tasks)
- [x] #FEAT-024 Perspective annotations + canvas indicators — DONE (3 sub-tasks)
- [x] #FEAT-025 Phase 2b completion testing: regression suite — DONE iteration 56, 2026-02-26
- [x] #FEAT-026 Phase 2b completion testing: quality audit — DONE iteration 57, 2026-02-26

## Phase 3: Advanced Features — PAUSED (remaining items deferred)
- [x] #FEAT-027 Dashboard / workspace overview page — DONE iteration 63, 2026-02-26
- [x] #FEAT-028 Search & filtering across all entity types (steps, sections, stages, touchpoints) — DONE iteration 69, 2026-02-26
  - [x] [1/2] Search & filter for People and Tools views — DONE iteration 68, 2026-02-26
  - [x] [2/2] Search & filter for Teams view — DONE iteration 69, 2026-02-26
- [x] #FEAT-029 People page (flesh out stub with people CRUD, role assignments) — DONE iteration 65, 2026-02-26
- [x] #FEAT-030 Tools page (flesh out stub — define tools data model + CRUD) — DONE iteration 67, 2026-02-26
  - [x] [1/2] Data model + types + API routes + client functions — DONE iteration 66, 2026-02-26
  - [x] [2/2] Tools page UI (CRUD view, remove sidebar stub badge) — DONE iteration 67, 2026-02-26
- [ ] #FEAT-031 Step list bulk actions (multi-select, bulk status change) — Attempts: 0 — **Status: deferred** (per human feedback)
- [ ] #FEAT-032 Workspace templates (starter templates for common process types) — Attempts: 0 — **Status: deferred** (per human feedback)

<!-- ═══════════════════════════════════════════════════════════════════════════════
     HUMAN-ADDED FEATURES BELOW (FEAT-033 through FEAT-053)
     These are the high-value consulting features that differentiate Stride.
     Agent: Work these in order. Do NOT skip, reorder, delete, or restructure.
     Only modify individual entries (mark done, add sub-tasks, increment attempts).
     ═══════════════════════════════════════════════════════════════════════════════ -->

---

## Phase 3a: Analysis Intelligence — ACTIVE (Phase 4 complete, iteration 103)

### #FEAT-033 Perspective comparison view — DONE iteration 104, 2026-03-02
**Phase:** 3a
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [x] New "Compare Perspectives" page at `/w/[workspaceId]/perspectives/compare` — only visible when 2+ perspectives exist with annotations
- [x] Two dropdown selectors at top to pick which perspectives to compare
- [x] Table layout: rows = annotated elements (steps/sections/touchpoints/stages), columns = each perspective's annotation text + rating
- [x] Divergence highlighting: rows where ratings differ by 2+ points get amber background
- [x] Summary stats at top: annotation count per perspective, average rating, divergence count, top 3 most divergent elements
- [x] Clicking element name navigates to that element on the correct canvas. Fetch elements with tab_id to build navigation URLs: `/w/{workspaceId}/{tabId}`
- [x] Export comparison as PDF section (button). PDF export is standalone download using jsPDF (existing dep). Layout: title + summary stats + comparison table.
- [x] "Top 3 most divergent" = sorted by maximum absolute rating difference across all annotations for that element
**Notes:** This is THE consulting insight tool — reveals where leaders and frontline teams disagree. Uses existing perspectives + perspective_annotations tables from FEAT-023/024. Pure client-side computation from fetched annotations. Divergence threshold (2 points) should be a named constant.

### #FEAT-034 Prioritization matrix
**Phase:** 3a
**Priority:** P0 (critical path)
**Attempts:** 2
**Status:** DONE — [1/2] data layer iteration 105, [2/2] UI iteration 106, 2026-03-02
**Acceptance criteria:**
- [x] New columns on `steps` table: `effort_score` (integer 1-5 nullable), `impact_score` (integer 1-5 nullable) — via Supabase migration
- [x] Same columns on `touchpoints` table
- [x] Step detail panel + touchpoint detail panel show effort/impact score selectors (1-5 scale, reuse maturity scoring UI pattern)
- [x] New "Prioritization" page at `/w/[workspaceId]/prioritization`
- [x] Quadrant chart: X=effort (1-5), Y=impact (1-5), items plotted as dots
- [x] Quadrants labeled: "Quick Wins" (low effort, high impact), "Major Projects" (high effort, high impact), "Fill-Ins" (low effort, low impact), "Deprioritize" (high effort, low impact)
- [x] Dots show name on hover, colored by section/stage. Click navigates to canvas. Section/stage color derived from deterministic hash of entity name → HSL palette (8 colors). Tooltips use Radix Tooltip (already in deps).
- [x] Filters: two dropdowns above chart — Tab (select) and Section/Stage (select, filtered by tab). Default: All.
- [x] Render quadrant chart using positioned divs (CSS absolute positioning within relative container). No charting library.
- [x] TypeScript types updated, API routes updated for new columns
**Sub-tasks:**
- [x] [1/2] Data layer: migration (effort_score + impact_score on steps and touchpoints), types, API PATCH support — DONE iteration 105
- [x] [2/2] UI: Score selectors on detail panels + prioritization page with quadrant chart — DONE iteration 106
**Notes:** Standard consulting deliverable. Position computed from scores — no drag-to-reposition. Reuse scoring UI pattern from maturity scoring (FEAT-001). Migration adds nullable columns — zero risk to existing data.

### #FEAT-035 Improvement ideas tracker
**Phase:** 3a
**Priority:** P1 (important)
**Attempts:** 2
**Status:** DONE — iteration 108, 2026-03-03
**Acceptance criteria:**
- [x] New `improvement_ideas` table: id, workspace_id, title, description, status (enum `improvement_status`: proposed/approved/in_progress/completed/rejected), priority (enum `improvement_priority`: low/medium/high/critical), linked_step_id (nullable FK), linked_touchpoint_id (nullable FK), linked_section_id (nullable FK), created_by (FK users), created_at, updated_at
- [x] RLS via `can_access_workspace()`, types, API routes (GET list filterable, POST, PATCH, DELETE), client wrappers
- [x] "Add Improvement" button on step/section/touchpoint detail panels — dialog with title, description, priority. Pre-fills linked entity.
- [x] "Improvements" page at `/w/[workspaceId]/improvements` — filterable list view by status/priority
- [x] Each card: title, status badge, priority badge, linked element (clickable), description preview
- [x] Inline status change via dropdown
- [x] Count badge on sidebar nav showing open ideas count. Open count = status NOT IN ('completed', 'rejected').
**Sub-tasks:**
- [x] [1/2] Data layer: migration (improvement_ideas table + `improvement_status` and `improvement_priority` enums), types, API routes, client wrappers — DONE iteration 107
- [x] [2/2] UI: "Add Improvement" on detail panels, improvements page, sidebar count badge — DONE iteration 108
**Notes:** Replaces consultant sticky notes and spreadsheets. Status lifecycle: proposed → approved → in_progress → completed (or rejected). Link to source element provides traceability.

### #FEAT-036 AI process analysis
**Phase:** 3a
**Priority:** P1 (important)
**Attempts:** 2
**Status:** DONE — [1/2] backend iteration 109, [2/2] UI iteration 110
**Acceptance criteria:**
- [x] API route: POST `/api/v1/ai/analyze-process` — accepts workspace_id, returns structured JSON analysis — DONE iteration 109
- [x] Server-side call to OpenRouter API via fetch() to `https://openrouter.ai/api/v1/chat/completions`. Model: `deepseek/deepseek-chat-v3-0324`. Requires `OPENROUTER_API_KEY` in .env.local. Auth header: `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}` — DONE iteration 109
- [x] Prompt constructed from workspace's actual steps (maturity, time, frequency, cost, roles, gaps) — DONE iteration 109
- [x] Response JSON typed as: — DONE iteration 109
  ```typescript
  interface AIAnalysisResult { bottlenecks: AIInsight[]; redundancies: AIInsight[]; automation_candidates: AIInsight[]; maturity_recommendations: AIInsight[]; }
  interface AIInsight { title: string; description: string; severity: 'high' | 'medium' | 'low'; affected_step_ids: string[]; }
  ```
- [x] "AI Analysis" page at `/w/[workspaceId]/ai-analysis` — categorized result cards with severity indicators — DONE iteration 110
- [x] Each recommendation links back to source step(s) — DONE iteration 110
- [x] "Regenerate" button, loading state (5-15 seconds). Cache via PATCH to workspace settings JSONB: `{ settings: { last_analysis: AIAnalysisResult, last_analysis_at: string } }`. Merge into existing settings, don't overwrite. Workspace PATCH route must support partial `settings` JSONB merge if it doesn't already. — DONE iteration 110
- [x] Error handling: missing API key → setup instructions, API failure → retry with error message — DONE iteration 110
- [x] Rate limit: 1 analysis per workspace per 5 minutes (check cached timestamp) — DONE iteration 110
**Notes:** NOT generic advice. Prompt is grounded in real data. Temperature 0.3, max_tokens 4096. Do NOT install new deps — use native fetch(). Uses OpenRouter (OpenAI-compatible API format). Request body: `{ model: "deepseek/deepseek-chat-v3-0324", messages: [...], temperature: 0.3, max_tokens: 4096 }`. Response: `response.choices[0].message.content`. If OPENROUTER_API_KEY not set, UI shows setup instructions gracefully.

### #FEAT-037 AI gap narrative generator
**Phase:** 3a
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] API route: POST `/api/v1/ai/gap-narrative` — returns professional consulting narrative (2-4 paragraphs)
- [ ] Prompt includes actual gap data: steps with current vs target maturity, section names, gap sizes
- [ ] "Generate Summary" button on gap analysis page, above the table
- [ ] Narrative displayed in styled card with copy-to-clipboard button
- [ ] "Regenerate" button, loading state. Cache in localStorage.
**Notes:** Consultants need gap analysis summaries for client reports. AI generates first draft. Must reference actual step/section names and maturity numbers. Same OpenRouter API pattern as FEAT-036 (deepseek/deepseek-chat-v3-0324 via `https://openrouter.ai/api/v1/chat/completions`).

### #FEAT-038 AI improvement suggestions
**Phase:** 3a
**Priority:** P2 (nice to have)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] API route: POST `/api/v1/ai/suggest-improvements` — returns array of suggestions
- [ ] Each suggestion: title, description, affected_step_ids, estimated_impact, category (process/technology/people/governance)
- [ ] "AI Suggestions" button on Improvements page (FEAT-035) — generates and shows suggestions
- [ ] Each suggestion has "Add as Improvement" button that pre-fills the improvement idea dialog
- [ ] Loading state, error handling (same pattern as FEAT-036)
**Notes:** Depends on FEAT-035 (improvement_ideas table). Bridges AI analysis and improvement tracker. Suggestions must be specific: "Automate 'Manual Data Entry' (45min × 20/month = $1,500/month)" not "improve your processes." Same OpenRouter API pattern as FEAT-036.

### #FEAT-039 Phase 3a testing gate
**Phase:** 3a
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full regression: all existing features still work (canvas, scoring, gap analysis, costing, teams, export, sharing, perspectives, journey)
- [ ] Perspective comparison: create 2 perspectives → annotate → compare → see divergence
- [ ] Prioritization matrix renders with effort/impact scores
- [ ] Improvement ideas lifecycle: create → approve → complete
- [ ] AI analysis returns structured results (if OPENROUTER_API_KEY available; otherwise test UI states)
- [ ] Type check, lint, build pass. No console errors on new pages.
**Notes:** Dedicated testing iteration. If AI can't be tested (no API key), test loading/error/empty UI states and mark integration testing as deferred.

---

## Phase 3b: Tools Canvas + Enhanced Export — DEFERRED (Phase 4 prioritized)

### #FEAT-040 Tools canvas upgrade
**Phase:** 3b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Upgrade existing tools page to React Flow canvas (reuse canvas infrastructure from process/journey)
- [ ] New `tool_sections` table: id, workspace_id, name, position_x, position_y, width, height — groups tools visually
- [ ] Tool nodes: card with name, status badge (active=green, considering=yellow, cancelled=gray), cost ($/mo)
- [ ] Tool section nodes: group containers (like process sections)
- [ ] Drag tools into/out of tool sections
- [ ] "Add Tool" and "Add Tool Section" buttons in toolbar
- [ ] Right sidebar summary when nothing selected: total monthly cost, annual cost, counts by status
- [ ] Canvas zoom/pan controls (reuse existing)
**Notes:** Builds on top of Ralph's FEAT-030 tools data model (migration 013). Add position_x, position_y columns to tools table if not already there. Tool sections are new table. The canvas is a single view per workspace (not tab-based).

### #FEAT-041 Tool detail panel + step-tool assignment
**Phase:** 3b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Click tool on canvas → right sidebar detail panel with: name, vendor, URL, status dropdown, cost type (monthly/annual/one-time), cost amount, renewal date (for monthly/annual only), category, notes (TipTap)
- [ ] Changes persist on blur/change
- [ ] "Step Usage" section: lists all steps using this tool (via step_tools junction), clickable
- [ ] New `step_tools` junction table: id, step_id, tool_id, created_at. RLS, types, API.
- [ ] Step detail panel gets "Tools" section (below Roles): dropdown selector + badges, same pattern as role assignment
- [ ] Tool cost factored into step cost: labor cost + sum of assigned tool monthly costs
- [ ] For annual tools use monthly equivalent (÷12), one-time tools excluded from recurring cost
**Notes:** Step-tool assignment connects tools canvas to process canvas. Cost integration is important for total cost-of-process-ownership calculations.

### #FEAT-042 Tool overlap and gap analysis
**Phase:** 3b
**Priority:** P1 (important)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] "Tool Analysis" section on tools page (tab or button)
- [ ] "Overlapping Tools" card: steps served by 2+ tools with combined cost
- [ ] "Unused Tools" card: tools with zero step assignments
- [ ] "Coverage Gaps" card: steps with no tool, sorted by frequency descending
- [ ] Total tool spend summary (monthly, annual, by status)
- [ ] Click step/tool name → navigate to element
**Notes:** Client-side computation from tools + step_tools + steps data. Standard consulting deliverable: "you're paying for 3 redundant tools."

### #FEAT-043 Enhanced PDF export — multi-section report
**Phase:** 3b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Export dialog (replaces direct download) with toggleable sections
- [ ] Sections: Title page, Executive Summary (key metrics), Process Map (existing), Gap Analysis (existing), Cost Analysis (existing), Journey Map (if exists), Journey Sentiment (if exists), Perspective Comparison (if exists), Prioritization Matrix (if exists), Tool Landscape (if tools exist), Improvement Recommendations (if ideas exist), AI Insights (if cached)
- [ ] Presets: "Full Audit" (all), "Executive Summary" (title + summary + gaps + recs), "Gap Report" (title + gaps + perspectives + recs)
- [ ] Each section starts on new page, consistent dark-theme styling
- [ ] Page numbers, table of contents
**Notes:** The "crown jewel" — what consultants hand to clients. Builds on existing jspdf/html-to-image infrastructure. One render function per section (modular). FEAT-007's existing export becomes the "Process Map" section.
**Sub-tasks:**
- [ ] [1/4] Export dialog UI with section toggles and presets
- [ ] [2/4] New sections: executive summary, journey map, journey sentiment, perspective comparison
- [ ] [3/4] New sections: prioritization matrix, tool landscape, improvements, AI insights
- [ ] [4/4] Page numbers, table of contents, consistent styling

### #FEAT-044 Phase 3b testing gate
**Phase:** 3b
**Priority:** P0 (critical path)
**Attempts:** 0
**Status:** pending
**Acceptance criteria:**
- [ ] Full regression: all prior features still work
- [ ] Tools CRUD → assign to step → see backlinks in tool detail → see cost in step panel
- [ ] Tool analysis computes correctly
- [ ] Enhanced PDF export produces multi-section document with all data
- [ ] Type check, lint, build pass
**Notes:** Focus on cost chain: tool cost → step cost → section cost → workspace total → PDF cost page.

---

## Phase 4: The Living Playbook — DONE (iteration 103, 2026-03-02)

### #FEAT-045 Comments system — DONE iteration 74, 2026-03-01
**Phase:** 4
**Priority:** P0 (critical path)
**Attempts:** 3
**Status:** done
**Sub-tasks:**
- [x] [1/3] Data model + types + API routes + client wrappers — DONE iteration 71, 2026-02-28
- [x] [2/3] Comment panel UI on step/section/touchpoint/stage detail panels — DONE iteration 73, 2026-03-01
- [x] [3/3] Canvas badges + workspace-level comments view — DONE iteration 74, 2026-03-01
**Acceptance criteria:**
- [x] New `comments` table: id, workspace_id, commentable_type (enum: step/section/touchpoint/stage), commentable_id, parent_id (nullable FK for threading), author_id (FK users), content, category (enum: note/decision/pain_point/idea/question), is_resolved (boolean), created_at, updated_at
- [x] RLS, types, API routes (GET filterable, POST, PATCH, DELETE), client wrappers
- [x] Comment panel tab on step/section detail panels — DONE iteration 73
- [x] Comment list: author, relative timestamp, category badge, content, reply count
- [x] "Add Comment" form: category dropdown + text + submit
- [x] Thread replies (parent_id), "Resolve" button (dims comment)
- [x] Comment count badge on canvas nodes — via CommentCountsContext (avoids FlowCanvas prop-drilling)
- [x] Workspace-level comments view: all comments, filterable by category — /w/{id}/comments
**Notes:** Category system (note/decision/pain_point/idea/question) from Puzzle spec — helps organize workshop feedback. No @mentions until Phase 5.

### #FEAT-046 Tasks system (step-level checklists)
**Phase:** 4
**Priority:** P0 (critical path)
**Attempts:** 4
**Status:** done
**Sub-tasks:**
- [x] [1/3] Data model + types + API routes + client wrappers — DONE iteration 76, 2026-03-01
- [x] [2/3] Tasks tab UI on step detail panel (checkbox list, inline edit, drag-to-reorder, add task input) — DONE iteration 77, 2026-03-01
- [x] [3/3] Task count on canvas nodes + section-level rollup in section detail panel — DONE iteration 78, 2026-03-01
**Acceptance criteria:**
- [ ] New `tasks` table: id, workspace_id, step_id (FK), title, is_completed (boolean), position (integer), assigned_to (nullable FK users), created_by (FK users), created_at, updated_at
- [ ] RLS, types, API (GET by step_id, POST, PATCH, DELETE), client wrappers
- [ ] Tasks tab on step detail panel: checkbox list, inline-editable titles, drag-to-reorder
- [ ] Completed tasks show strikethrough. "Add Task" input at bottom.
- [ ] Task count on step canvas nodes (e.g., "2/5")
- [ ] Section-level rollup in section detail panel: all tasks grouped by step
**Notes:** Lightweight step-scoped to-dos for consulting engagements. Drag-to-reorder updates position field.

### #FEAT-047 Runbook instances
**Phase:** 4
**Priority:** P0 (critical path)
**Attempts:** 3
**Status:** done
**Sub-tasks:**
- [x] [1/3] Data model + types + API routes + client wrappers — DONE iteration 80, 2026-03-02
- [x] [2/3] Runbook UI — "Run as Checklist" button on section panel, runbook view (linear checklist with progress bar), runbook list page, sidebar nav — DONE iteration 81, 2026-03-02
- [x] [3/3] Polish — Complete/Cancel buttons, 4-state step status transitions, read-only view, progress text, metadata footer, list filter tabs — DONE iteration 82, 2026-03-02
**Acceptance criteria:**
- [ ] New `runbooks` table: id, workspace_id, section_id (FK), name, status (enum: active/completed/cancelled), started_at, completed_at, created_by (FK users), created_at, updated_at
- [ ] New `runbook_steps` table: id, runbook_id (FK), step_id (FK), status (enum: pending/in_progress/completed/skipped), assigned_to, completed_at, notes, position, created_at, updated_at
- [ ] RLS, types, API routes, client wrappers
- [ ] "Run as Checklist" button on section detail panel → creates runbook from section's steps (snapshot, not live reference)
- [ ] Runbook view: linear checklist with checkbox, assignee, status, notes per step
- [ ] Progress bar, "Complete Runbook" button
- [ ] Runbook list view: all runbooks with status, progress, dates
**Notes:** THE Phase 4 killer feature — turns static process maps into executable checklists. Same section can have multiple active runbooks ("Onboarding — Acme Corp", "Onboarding — Beta Inc"). Steps are snapshot-copied at creation.

### #FEAT-048 Playbook mode — DONE iteration 86, 2026-03-02
**Phase:** 4
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
**Acceptance criteria:**
- [x] Distraction-free view for active runbooks: shows current step large/centered with name and status
- [x] "Mark Complete & Next" button advances to next pending/in_progress step
- [x] Progress indicator (Step N of M text + progress bar), prev/next navigation
- [x] Completed steps show green checkmark + timestamp
- [x] URL-shareable (direct link: /w/[workspaceId]/runbooks/[runbookId]/playbook)
- [x] Mobile-responsive (max-w-xl single column layout)
**Notes:** "What do I do next?" view for ops team members. Uses fixed full-viewport overlay (z-50) covering workspace shell — no workspace-shell.tsx modification needed. Attempts 1-2 failed due to pipeline merge, attempt 3 succeeded.

### #FEAT-049 Activity log — DONE iteration 90, 2026-03-03
**Phase:** 4
**Priority:** P1 (important)
**Attempts:** 3
**Status:** done
  - [x] [1/3] Data layer (migration 017, types, API route, client wrapper, logActivity utility) — DONE iteration 88, 2026-03-03
  - [x] [2/3] Activity page UI at `/w/[workspaceId]/activity` — DONE iteration 89, 2026-03-03
  - [x] [3/3] Integrate logActivity() into existing POST/PATCH/DELETE routes — DONE iteration 90, 2026-03-03
**Acceptance criteria:**
- [ ] New `activity_log` table: id, workspace_id, user_id (FK), action (enum: created/updated/deleted/completed/assigned/commented/exported/shared), entity_type, entity_id, entity_name (snapshot), details (JSONB nullable), created_at
- [ ] RLS, types. Utility function `logActivity()` called from API routes.
- [ ] Activity page at `/w/[workspaceId]/activity`: chronological list with user, action sentence, timestamp, entity link
- [ ] Filterable by user, action type, entity type, date range. Pagination.
- [ ] Add logActivity() calls to POST/PATCH/DELETE handlers across existing API routes
**Notes:** Audit trail for consulting engagements. Don't log reads. Keep details JSONB small (only changed fields for updates).

### #FEAT-051 Conditional step coloring — DONE iteration 96, 2026-03-03
**Phase:** 4
**Priority:** P2 (nice to have)
**Attempts:** 2
**Status:** done
**Acceptance criteria:**
- [x] New `coloring_rules` table: id, workspace_id, name, color (hex), criteria_type (enum: status/executor/step_type/has_role/maturity_below/maturity_above), criteria_value TEXT NOT NULL (interpreted per criteria_type), is_active (boolean), position (integer), created_at, updated_at
- [x] RLS, types, API (CRUD), client wrappers
- [x] Coloring panel in canvas toolbar (paintbrush icon): list rules with color swatch, criteria dropdowns, active toggle
- [x] Rules evaluated client-side in position order, last match wins
- [x] Step nodes show matching rule's color as subtle background tint (opacity: 15%). Steps matching no rule show default background (no tint).
- [x] Applies to process canvas step nodes only (not journey touchpoints/stages)
- [x] Real-time: rules apply as created/edited
**Sub-tasks:**
- [x] [1/2] Data layer: migration (coloring_rules table + criteria_type enum), types, API (CRUD), client wrappers — DONE iteration 94, 2026-03-03
- [x] [2/2] UI: Coloring panel in canvas toolbar (paintbrush icon) + step node background tint + API validation — DONE iteration 96, 2026-03-03
**Notes:** From Puzzle spec. "All draft steps = yellow", "steps with no role = red". Color is background tint (low opacity) preserving readability. has_role criteria type included in dropdown but not visually evaluated (requires step-role data fetch).

### #FEAT-052 Section templates (save & deploy)
**Phase:** 4
**Priority:** P2 (nice to have)
**Attempts:** 4
**Status:** done
**Acceptance criteria:**
- [ ] New `templates` table: id, workspace_id UUID NOT NULL, name, description, category, template_data (JSONB snapshot), created_by, created_at, updated_at
- [ ] RLS via `can_access_workspace()`, types, API (GET list, POST from section_id, POST deploy, DELETE), client wrappers
- [ ] "Save as Template" on section detail panel → dialog with name, description, category
- [ ] Captures: section + steps + connections + role assignments as JSONB
- [ ] Template browser in canvas toolbar: cards with name, description, category, step count
- [ ] Deploy route: `POST /api/v1/templates/[id]/deploy` with body `{ tab_id, position_x, position_y }`. Deploy remaps connection source/target IDs using old→new UUID mapping. Role assignments matched by name; silently skip if name not found in target workspace.
- [ ] "Deploy Template" creates new section + steps + connections on current tab (new UUIDs)
- [ ] Pre-built starters hardcoded in `src/lib/templates.ts` as `STARTER_TEMPLATES` constant. Shown alongside DB templates in browser. Not stored in DB until deployed. Starters:
  - "Customer Onboarding" (steps: Receive Application, Verify Identity, Setup Account, Welcome Email, Assign CSM)
  - "Support Ticket" (steps: Receive Ticket, Triage & Classify, Investigate Issue, Resolve & Respond, Close Ticket)
  - "Content Creation" (steps: Brief & Research, Draft Content, Internal Review, Revisions, Publish & Distribute)
  - "Lead Nurturing" (steps: Capture Lead, Qualify Lead, Initial Outreach, Follow-Up Sequence, Hand Off to Sales)
**Sub-tasks:**
- [x] [1/2] Data layer: migration (templates table), types, API (GET list, POST from section_id, POST deploy, DELETE), client wrappers, STARTER_TEMPLATES constant — DONE iteration 99, 2026-03-02
- [x] [2/2] UI: "Save as Template" dialog on section panel, template browser dialog in toolbar, deploy flow — DONE iteration 101, 2026-03-02
**Notes:** Workspace-scoped only (no organization_id — no org-level RLS helper exists). Role assignments matched by name on deploy (not by ID). JSONB snapshot, not live references.

### #FEAT-050 Workspace cloning
**Phase:** 4
**Priority:** P2 (nice to have)
**Attempts:** 2
**Status:** done
**Acceptance criteria:**
- [x] API route: `POST /api/v1/workspaces/[id]/clone`
- [x] "Duplicate Workspace" button in workspace settings. Loading spinner on button, timeout handling (clone may take 2-5s).
- [x] Deep copy: workspace + tabs + sections + steps + connections + teams + roles + people + tools + step_roles + stages + touchpoints + touchpoint_connections
- [x] New UUIDs throughout, internal FKs preserved using temporary mapping arrays (old UUID → new UUID) for all tables
- [x] Perspectives, annotations, comments, tasks, runbooks, activity log NOT copied
- [x] `clone_workspace` SECURITY DEFINER function for atomic transaction. Navigate to new workspace on success.
**Sub-tasks:**
- [x] [1/2] Migration (`clone_workspace` SECURITY DEFINER function) + API route + client wrapper — DONE iteration 92, 2026-03-03
- [x] [2/2] UI: "Duplicate Workspace" button in settings, loading state, navigate to clone — DONE iteration 93, 2026-03-03
**Notes:** How consultants reuse frameworks. Clone template workspace for each client engagement.

### #FEAT-053 Phase 4 testing gate — DONE iteration 103, 2026-03-02
**Phase:** 4
**Priority:** P0 (critical path)
**Attempts:** 1
**Status:** done
**Acceptance criteria:**
- [ ] Full regression across all phases
- [ ] Comments: create, reply, resolve, category filter, aggregation view
- [ ] Tasks: create, complete, reorder, section rollup
- [ ] Runbooks: create from section → execute steps → complete
- [ ] Playbook mode works end-to-end
- [ ] Activity log captures actions from all major API routes
- [ ] Workspace clone produces correct deep copy
- [ ] Conditional coloring rules apply on canvas
- [ ] Templates: save → browse → deploy
- [ ] Type check, lint, build pass
**Notes:** Largest testing gate. Test full chain: section with tasks → create runbook → execute in playbook → activity log captures all.
