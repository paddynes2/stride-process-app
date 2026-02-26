# Bugs

> Agent-populated during browser testing. Human can also add bugs here.
> P0 bugs take priority over ALL other work. P1 bugs in the current phase
> take priority over new features.

---

## Task Format

```markdown
### [BUG-NNN] Short description
**Severity:** P0 (crash/data loss) | P1 (feature broken) | P2 (degraded UX) | P3 (cosmetic)
**Phase:** [which implementation phase this relates to]
**Found:** iteration [N], [date]
**Attempts:** 0
**Status:** open | fixing | fixed | wont-fix | skip
**SKIP_UNTIL:** [condition — only if status is skip]
**Page:** /route/where/it/happens
**Steps to reproduce:**
1. Step 1
2. Step 2
3. Step 3
**Expected:** [what should happen]
**Actual:** [what actually happens]
**Console errors:** [any JS errors captured, or "None"]
**Fixed:** iteration [N], [date] (when resolved)
**Fix details:** [what was changed to fix it]
```

### Rules

- Bugs are numbered sequentially: BUG-001, BUG-002, etc.
- **Attempts** is incremented each iteration the agent works on this bug.
- After **3 failed attempts**, mark `Status: skip` with `SKIP_UNTIL:`.
- When fixed, move to the Resolved section with the fix date and details.
- P0 bugs are NEVER skipped — if stuck after 3 attempts, escalate in STATUS.md.

---

## Open Bugs

### #BUG-010 Pain/gain score helper text uses --text-quaternary (fails WCAG AA)
**Severity:** P2 (WCAG 1.4.3 violation)
**Phase:** 2a
**Found:** iteration 40, 2026-02-26
**Attempts:** 0
**Status:** open
**Page:** /w/[workspaceId]/[tabId] (journey canvas → touchpoint detail panel)
**Steps to reproduce:**
1. Navigate to a journey canvas tab
2. Click a touchpoint to open the detail panel
3. Look at the helper text below pain score buttons ("1 = low pain, 5 = high pain") and gain score buttons ("1 = low gain, 5 = high gain")
**Expected:** Helper text is readable (meets WCAG AA 4.5:1 minimum contrast)
**Actual:** Helper text uses `--text-quaternary` (rgba(255,255,255,0.15)), which has ~2:1 contrast on dark backgrounds. This is documented as "FAILS WCAG — decorative only" in AGENTS.md Color System but is used for functional content.
**Console errors:** None

### #BUG-011 Stage description text in node uses --text-quaternary (fails WCAG AA)
**Severity:** P2 (WCAG 1.4.3 violation)
**Phase:** 2a
**Found:** iteration 40, 2026-02-26
**Attempts:** 0
**Status:** open
**Page:** /w/[workspaceId]/[tabId] (journey canvas)
**Steps to reproduce:**
1. Navigate to a journey canvas tab
2. Click a stage and add a description
3. Look at the description text rendered on the stage node
**Expected:** Description text is readable
**Actual:** Stage node description uses `text-[var(--text-quaternary)]` (stage-node.tsx line 75), which has ~2:1 contrast. The description is functional content (helps identify stage purpose at a glance) but is rendered at a contrast level designated for decorative use only.
**Console errors:** None

## Resolved

<!-- Agent: move fixed bugs here. Keep for reference and regression tracking. -->

### #BUG-002 Active sidebar link has 1:1 contrast ratio (invisible text)
**Severity:** P1 (WCAG 1.4.3 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Changed active sidebar link bg from `bg-[var(--bg-surface-active)]` to `bg-[var(--signal-subtle)]` (rgba(59,130,246,0.12)) in `src/components/layout/sidebar.tsx`. Provides visible blue-tinted active indicator while keeping text-primary readable.

### #BUG-003 Primary action buttons have insufficient contrast (3.68:1)
**Severity:** P1 (WCAG 1.4.3 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Changed default button variant bg from `var(--signal)` (#3B82F6, 3.68:1) to `#2563EB` (5.2:1) in `src/components/ui/button.tsx`. Hover changed to `#3B82F6`. Did NOT change global `--signal` variable — only the button component bg.

### #BUG-004 Icon-only buttons missing accessible names
**Severity:** P1 (WCAG 4.1.2 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Added aria-labels to all 12 icon-only buttons across 7 files: sidebar toggle, tab add/close, team/role/person expand/collapse/delete, step/section panel close, video embed clear, header user menu.

### #BUG-005 Form inputs missing associated labels
**Severity:** P1 (WCAG 1.3.1 / 4.1.2 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Added aria-labels to 7 inputs across 3 files: team name, hourly rate, person email (teams-view.tsx), search steps, filter by status, filter by executor (step-list-view.tsx), filter by section (gap-analysis-view.tsx).

### #BUG-006 Gap analysis badge contrast 1:1 ("+2" gap value invisible)
**Severity:** P1 (WCAG 1.4.3 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Changed gap badge from transparent same-hue bg (`${getGapColor(gap)}15`) to solid `bg-[var(--bg-surface)]` with colored text only in `gap-analysis-view.tsx`. Guarantees contrast on dark background.

### #BUG-007 Small touch targets on interactive elements (< 24px)
**Severity:** P2 (WCAG 2.5.8 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Increased icon sizes in teams-view.tsx: team expand from h-5 w-5 to h-6 w-6, role expand from h-4 w-4 to h-6 w-6, person delete from h-5 w-5 to h-6 w-6. All now meet 24px minimum.

### #BUG-008 Heading level skip (h1 → h3) on workspaces page
**Severity:** P2 (WCAG 1.3.1 best practice)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Changed `<h3>` to `<h2>` for workspace card titles in `workspace-list.tsx` line 97. Heading hierarchy now sequential (h1→h2).

### #BUG-009 Low-contrast focus indicators on icon buttons (15% opacity)
**Severity:** P2 (WCAG 2.4.13 violation)
**Found:** iteration 10, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Fixed:** iteration 21, 2026-02-26
**Fix details:** Added `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] rounded-[var(--radius-sm)]` to plain `<button>` elements in teams-view.tsx (expand/collapse buttons). These now have visible blue focus indicators.

### #BUG-001 TipTap RichTextEditor SSR crash on step selection
**Severity:** P0 (crash/data loss)
**Phase:** 0 (pre-existing, affects all phases)
**Found:** iteration 2, 2026-02-26
**Attempts:** 1
**Status:** fixed
**Page:** /w/[workspaceId]/[tabId] (canvas view)
**Steps to reproduce:**
1. Navigate to any canvas
2. Click any step node
3. Step detail panel attempts to render RichTextEditor
**Expected:** Detail panel opens with notes editor
**Actual:** Entire app crashes: "Tiptap Error: SSR has been detected, please set `immediatelyRender` explicitly to `false` to avoid hydration mismatches."
**Console errors:** `Error: Tiptap Error: SSR has been detected...` + `Application error: a client-side exception has occurred`
**Fixed:** iteration 2, 2026-02-26
**Fix details:** Added `immediatelyRender: false` to `useEditor()` config in `src/components/panels/rich-text-editor.tsx`. Standard TipTap 3.x requirement for SSR/Next.js environments.
