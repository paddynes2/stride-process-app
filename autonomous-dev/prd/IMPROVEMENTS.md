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
