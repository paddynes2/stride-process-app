# Improvements

> Agent-discovered opportunities to make the app better. NOT bugs (broken things)
> and NOT features (PRD-defined requirements). These are things the agent noticed
> while working that would improve UX, polish, flow, or strategic value.
>
> The agent adds items here during Phase 4 (testing) and Phase 6 (doc updates).
> Items are worked on after all features in the current phase are done and all
> P0-P2 bugs are resolved — but BEFORE tech debt.

---

## Task Format

```markdown
### [Short improvement description]
**Category:** UX flow | Visual polish | Missing affordance | Strategic | Microcopy | Performance | Accessibility
**Discovered:** Iteration [N] — [date]
**Page:** [route where this was noticed]
**Priority:** High (significant UX win) | Medium (noticeable improvement) | Low (nice-to-have)
**Effort:** Small (< 1 iteration) | Medium (1 iteration) | Large (2+ iterations)
**Attempts:** 0
**Status:** proposed | approved | in-progress | done | skip
**SKIP_UNTIL:** [condition — only if status is skip]

**What I noticed:**
[Describe what you observed — be specific about the user experience, not the code]

**Why it matters:**
[What's the impact? Faster flow? Less confusion? Better first impression? Fewer support questions?]

**Suggested approach:**
[Concrete, actionable suggestion. "Add X to Y" not "improve the flow"]

**Design principle:**
[Reference to DESIGN-PRINCIPLES.md — which heuristic/principle does this address?]
```

### Rules

- **DO NOT add items that are already in FEATURES.md or BUGS.md.** Check first.
- **Every improvement must reference a design principle** — this prevents subjective opinions.
  If you can't tie it to a principle, it might not be a real improvement.
- **Improvements are NOT permission to scope-creep.** Do not implement improvements
  during a build iteration. Log them here, work them in their own iteration.
- **High-effort improvements** (Large) should be discussed — add `NEEDS_REVIEW: true`
  and the human will decide whether to promote it to FEATURES.md.
- **Attempts** follows the same 3-strike rule as features and bugs.
- **Improvements with `NEEDS_REVIEW: true`** are skipped until the human approves or rejects.

### Categories Explained

| Category | What to Look For |
|----------|-----------------|
| **UX flow** | Steps that could be eliminated, flows that could be shorter, actions that should be linked |
| **Visual polish** | Inconsistent spacing, missing hover states, transitions that feel abrupt, alignment issues |
| **Missing affordance** | Things users would expect to be clickable/actionable but aren't, missing tooltips, no help text |
| **Strategic** | Features competitors have, patterns from best-in-class apps, monetization opportunities |
| **Microcopy** | Better labels, more helpful empty states, clearer error messages, better placeholder text |
| **Performance** | Perceived speed improvements, optimistic updates, prefetching, lazy loading opportunities |
| **Accessibility** | Improvements beyond WCAG AA compliance — better screen reader experience, keyboard shortcuts |

---

## Items

<!-- Agent: add improvements below as you discover them during testing and building. -->
<!-- Each item gets its own ### section. -->
<!-- Check FEATURES.md and BUGS.md first — don't duplicate. -->

### #IMP-001 Extract export logic from canvas-view.tsx (hotspot decomposition)
**Category:** Performance
**Discovered:** Iteration 20 — 2026-02-26
**Page:** /w/[workspaceId]/[tabId]
**Priority:** Medium (reduces maintenance burden)
**Effort:** Small (< 1 iteration)
**Attempts:** 1
**Status:** done — DONE iteration 29, 2026-02-26

**What I noticed:**
canvas-view.tsx was modified in 5 of the last 10 iterations (iter 11, 12, 13, 14, 16). It serves as the orchestration point between FlowCanvas, detail panels, and export utilities. The export-related code (PDF callback, PNG callback, step-roles batch fetch for PDF) adds ~30 lines that are independent of the core canvas logic.

**Why it matters:**
Hotspot files are maintenance risks. Extracting export logic into a `useCanvasExport` hook would reduce the file's surface area and make export changes independent of canvas changes. Fewer merge conflicts, clearer responsibility boundaries.

**Suggested approach:**
Create `src/hooks/use-canvas-export.ts` — extract `handleExportPdf` and `handleExportPng` callbacks, the step-roles batch fetch for PDF, and the `exporting` state. The hook takes `{ steps, sections, connections, workspaceName }` and returns `{ handleExportPdf, handleExportPng }`.

**Design principle:**
Single Responsibility — each module should have one reason to change. canvas-view.tsx currently changes for both canvas orchestration AND export logic.

### #IMP-002 Extract MATURITY_COLORS to shared constant
**Category:** Visual polish
**Discovered:** Iteration 20 — 2026-02-26 (from LEARNINGS.md observation)
**Page:** Multiple (canvas, gap-analysis, PDF export)
**Priority:** Low (nice-to-have)
**Effort:** Small (< 1 iteration)
**Attempts:** 1
**Status:** done — DONE iteration 29, 2026-02-26

**What I noticed:**
The MATURITY_COLORS map (1→red through 5→green) is duplicated in 4 places: step-node.tsx, section-node.tsx, flow-canvas.tsx (legend), and pdf.ts. Any change to the color scheme requires updating all 4 locations.

**Why it matters:**
DRY violation. If a color is changed in one place but not others, the heat map and exports will show inconsistent colors — confusing for consultants who compare canvas screenshots to PDF outputs.

**Suggested approach:**
Create `src/lib/constants.ts` (or `src/lib/maturity.ts`) with a shared `MATURITY_COLORS` constant. Import it in all 4 files. Single source of truth.

**Design principle:**
Consistency (Nielsen's Heuristic #4) — identical data should always look identical across all views and outputs.

### #IMP-003 Journey canvas missing export buttons (PDF/PNG)
**Category:** Missing affordance
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (journey canvas)
**Priority:** High (significant UX win)
**Effort:** Medium (1 iteration)
**Attempts:** 0
**Status:** done — Covered by FEAT-022 (iteration 45-46)

**What I noticed:**
The process canvas toolbar has Export PDF and Export PNG buttons, but the journey canvas toolbar only has Add Touchpoint, Add Stage, and Heat Map toggle. A consultant switching between process and journey tabs would expect the same export capabilities on both.

**Why it matters:**
Journey maps are a standalone consulting deliverable. Without export, consultants can't include journey maps in client reports. This is already tracked as FEAT-022 in FEATURES.md, but the missing parity with process canvas should be noted as a UX gap.

**Suggested approach:**
Already covered by FEAT-022. This improvement is noted for priority awareness — FEAT-022 should be prioritized to maintain parity.

**Design principle:**
Consistency (Nielsen's Heuristic #4) — same canvas type should offer same capabilities. Shneiderman #1 — strive for consistency.

### #IMP-004 Silent error swallowing on node position updates
**Category:** UX flow
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (journey canvas)
**Priority:** Medium (noticeable improvement)
**Effort:** Small (< 1 iteration)
**Attempts:** 0
**Status:** proposed

**What I noticed:**
In `journey-canvas-view.tsx`, the position update handlers for stages and touchpoints have empty `.catch(() => {})` blocks (lines 146, 154). If a position update fails (e.g., network issue), the node visually moves but the server state doesn't persist. On next load, the node snaps back to its old position with no indication of what happened.

**Why it matters:**
Data loss without user awareness. Consultant moves elements, closes the tab, opens later — everything is back to the old layout. Silent failures erode trust.

**Suggested approach:**
Replace `.catch(() => {})` with `.catch((err) => toastError("Failed to save position", { error: err }))`. The process canvas (flow-canvas.tsx) likely has the same pattern — check and fix both.

**Design principle:**
Nielsen #1 (Visibility of system status) — the user should always know whether their action succeeded. Nielsen #9 (Help users recover from errors) — errors must be visible to be recoverable.

### #IMP-005 Keyboard shortcut hints not visible on journey canvas
**Category:** Missing affordance
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (journey canvas)
**Priority:** Low (nice-to-have)
**Effort:** Small (< 1 iteration)
**Attempts:** 0
**Status:** proposed

**What I noticed:**
The journey canvas supports keyboard shortcuts (N = new touchpoint, S = new stage, Delete/Backspace = delete selected). These are not discoverable — no tooltips, no help text, no keyboard shortcut hint on the toolbar buttons.

**Why it matters:**
Power users who know the process canvas shortcuts would expect the same on journey canvas, but new users have no way to discover them. Keyboard shortcuts are a significant efficiency boost for consultants mapping complex journeys.

**Suggested approach:**
Add `title` attributes to toolbar buttons with shortcut hints (e.g., "Add Touchpoint (N)"). Alternatively, add a small "?" icon that shows a keyboard shortcut cheatsheet. Check process canvas for same gap — apply to both.

**Design principle:**
Shneiderman #2 (Seek universal usability) — works for novice AND expert users. Nielsen #7 (Flexibility and efficiency of use) — shortcuts for power users.

### #IMP-006 Journey summary panel is very sparse
**Category:** Missing affordance
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (journey canvas)
**Priority:** Medium (noticeable improvement)
**Effort:** Medium (1 iteration)
**Attempts:** 0
**Status:** proposed

**What I noticed:**
When no stage or touchpoint is selected, the journey canvas side panel shows only 3 counts: stages, touchpoints, connections. The process canvas equivalent (WorkspaceSummaryPanel) shows maturity averages, gap analysis summary, cost totals, and more. The journey panel provides almost no analytical value.

**Why it matters:**
Consultants need at-a-glance metrics when presenting journey maps. Useful additions: average pain score, sentiment distribution (positive/neutral/negative counts), high-pain touchpoint list, stages with highest average pain.

**Suggested approach:**
Compute summary statistics from touchpoints array: average pain score, sentiment distribution, top 3 pain points. Display in the same card/stat pattern as WorkspaceSummaryPanel. Keep it simple — 5-6 metrics maximum.

**Design principle:**
Shneiderman #8 (Reduce short-term memory load) — show context inline so users don't have to click through individual touchpoints to assess the journey. Nielsen #1 (Visibility of system status) — summary gives overview of journey health.

### #IMP-007 Stage detail panel missing pain score summary
**Category:** Missing affordance
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (journey canvas → stage detail)
**Priority:** Low (nice-to-have)
**Effort:** Small (< 1 iteration)
**Attempts:** 0
**Status:** proposed

**What I noticed:**
The stage detail panel shows a touchpoint sentiment breakdown (positive: N, neutral: N, negative: N) but no pain score summary. The heat map and stage node both show average pain score, but when a user clicks a stage to see details, the pain data disappears from the panel.

**Why it matters:**
Inconsistency between what the stage node shows (average pain badge) and what the panel shows (no pain data). The consultant has to mentally calculate or look at the heat map to see pain scores for a stage's touchpoints.

**Suggested approach:**
Add average pain score display below the sentiment breakdown. Optionally add a mini-list of high-pain touchpoints (pain >= 4) to make the panel actionable.

**Design principle:**
Consistency (Nielsen #4) — if the node shows pain data, the panel should too. Shneiderman #8 — reduce memory load by showing computed values inline.

### #IMP-008 No delete confirmation on destructive actions (canvas)
**Category:** UX flow
**Discovered:** Iteration 40 — 2026-02-26 (UX sweep)
**Page:** /w/[workspaceId]/[tabId] (both process and journey canvas)
**Priority:** Medium (noticeable improvement)
**Effort:** Medium (1 iteration)
**Attempts:** 0
**Status:** proposed
**NEEDS_REVIEW:** true

**What I noticed:**
Pressing Delete/Backspace on a selected stage, touchpoint, step, or section immediately deletes it with no confirmation. The panel delete buttons also delete immediately (with only a toast notification after). Compare to workspace delete which shows `window.confirm()`. This applies to both process and journey canvases.

**Why it matters:**
Accidental deletion of a stage with 10 touchpoints, or a section with 20 steps, is catastrophic — there's no undo. A single misplaced keypress can destroy significant work. This is the highest-risk interaction in the app.

**Suggested approach:**
Add a confirmation dialog (using existing Radix Dialog) for: (1) keyboard delete when the selected item has children (e.g., stage with touchpoints), and (2) always for the panel delete button. Skip confirmation for empty stages/sections (no children). Use the app's design system dialog, not `window.confirm()`.

**Design principle:**
Nielsen #3 (User control and freedom) — support undo/confirmation. Nielsen #5 (Error prevention) — prevent accidental destruction. Shneiderman #6 (Permit easy reversal of actions).

### #IMP-009 Audit remaining text-quaternary usage for borderline cases
**Category:** Accessibility
**Discovered:** Iteration 47 — 2026-02-26
**Page:** Multiple (step-detail-panel, gap-analysis-view, teams-view, workspace-list, step-list-view, section-detail-panel)
**Priority:** Low (nice-to-have)
**Effort:** Medium (1 iteration — ~20 instances across ~10 files)
**Attempts:** 0
**Status:** proposed

**What I noticed:**
After fixing BUG-010/BUG-011, grep found ~30 remaining `text-quaternary` instances. Most are genuinely decorative (placeholders, icons, separators, hover-interactive elements), but some borderline cases exist: secondary info text in step-detail-panel (team names, avg rates, helper text), section names in table columns, role/people counts in teams-view, workspace creation dates. These are readable but at ~2:1 contrast — below WCAG AA.

**Why it matters:**
While these secondary texts are intentionally de-emphasized, users with low vision may struggle. A full audit would categorize each as truly decorative (keep quaternary) or upgrade to tertiary.

**Suggested approach:**
Read each instance in context. Upgrade to `--text-tertiary` where the text carries meaning a user needs. Leave quaternary for placeholders, separators, and decorative icons.

**Design principle:**
WCAG 1.4.3 (Minimum Contrast) — text that conveys information must meet 4.5:1 contrast.
