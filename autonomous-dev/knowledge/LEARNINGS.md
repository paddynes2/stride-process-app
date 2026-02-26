# Learnings

> Append-only. Record gotchas, patterns, and non-obvious discoveries.
> Future iterations read this FULLY to avoid repeating mistakes.
>
> Keep this file CONCISE. Only genuine insights that save future iterations time.
> If this file grows beyond ~100 entries, a cleanup iteration should consolidate
> related entries and remove superseded ones.

---

## Format

```
- **[SHORT LABEL]:** [What you learned and why it matters]
```

If a learning supersedes a previous one:
```
- **[LABEL] [SUPERSEDES: old label]:** [Updated learning]
```

If a learning is no longer relevant:
```
- ~~**[LABEL]:** [old learning]~~ [SUPERSEDED by: new label, iteration N]
```

---

## What To Record

- A gotcha that cost you time (API quirk, config issue, dependency behavior)
- A pattern that worked well (approach, structure, workaround)
- A codebase convention you discovered by reading existing code
- An assumption that turned out wrong
- A tool/command that behaved unexpectedly

## What NOT To Record

- "I completed the task successfully" (that's PROGRESS.md)
- Obvious things ("React components go in /components")
- Speculation ("this might cause issues later")
- Things already documented in AGENTS.md

---

<!-- Agent: append entries below. -->

- **EDITABLE_FIELDS allowlist:** The steps API route (`src/app/api/v1/steps/[id]/route.ts`) uses a `const EDITABLE_FIELDS` array to whitelist PATCH-able fields. Any new column on the steps table MUST be added here or PATCH requests will silently ignore it.
- **Step type flows through canvas automatically:** Adding fields to the `Step` interface in `database.ts` automatically makes them available in `StepNodeData.step` on canvas nodes (via `canvas.ts` types). No additional type changes needed for canvas access.
- **Supabase db push auto-confirms:** `npx supabase db push` prompts Y/n but auto-accepts in non-interactive mode. Works without issues on this project.
- **TipTap 3.x SSR requires immediatelyRender: false:** Without this option in `useEditor()`, TipTap throws "SSR has been detected" and crashes the entire React tree. This is a P0-level crash that only manifests at runtime (typecheck and build pass fine). Always set `immediatelyRender: false` for any new TipTap editor instance in Next.js.
- **Test account login vs signup:** The test account (ralph@test.stride.dev) must be CREATED via /signup first. If the account doesn't exist, /login returns "Invalid login credentials" — Supabase Auth doesn't auto-create accounts on login.
- **MATURITY_COLORS duplication:** The `MATURITY_COLORS` map (1→red through 5→green) is defined in step-node.tsx, section-node.tsx, and flow-canvas.tsx (legend). If a 4th usage appears, extract to a shared `lib/constants.ts` or `lib/maturity.ts` file.
- **Section node data passes through buildNodes:** To get computed data (like averages) onto section nodes, add it to `SectionNodeData` in canvas.ts and compute it in `buildNodes()` in flow-canvas.tsx. The same pattern works for any derived data on nodes.
- **Supabase nested select for hierarchical data:** `supabase.from("teams").select("*, roles(*, people(*))")` returns the full hierarchy in one query. RLS policies on child tables (roles, people) use EXISTS joins back to the workspace-scoped parent.
- **Check existing migrations before building features:** FEAT-004 (time_minutes, frequency_per_month) was already in the base schema (migration 004), types, UI, and API route. Always verify what's already implemented before creating new migrations.
- **SIGNAL path is autonomous-dev/knowledge/SIGNAL:** The PROMPT.md references `knowledge/SIGNAL` but the actual path from the project root is `autonomous-dev/knowledge/SIGNAL`. Always check relative to `autonomous-dev/` directory, not the project root.
- **Accessibility debt is systemic in base components:** The button, sidebar link, and input components all lack aria-labels. A single "add aria-labels to icon buttons" pass would fix BUG-004 across all pages. Similarly, missing input labels (BUG-005) could be fixed by adding labels to the ui/ input/select components.
- **Active sidebar link contrast 1:1 is a styling issue:** The active sidebar link applies the same color to both text and background, resulting in invisible text. This is likely a CSS class issue in sidebar.tsx where the active state styling doesn't maintain contrast.
- **MATURITY_COLORS duplication now in 4 places [SUPERSEDES: MATURITY_COLORS duplication]:** The map is now in step-node.tsx, section-node.tsx, flow-canvas.tsx (legend), AND `src/lib/export/pdf.ts`. Should extract to `lib/constants.ts` — add to IMPROVEMENTS.md.
- **html-to-image filter for React Flow:** When using `toPng()` on a React Flow wrapper, use the `filter` option to exclude `.react-flow__controls`, `.react-flow__minimap`, and `.react-flow__panel` elements. These UI overlays clutter the export image.
- **ReactFlow needs wrapper div for DOM capture:** ReactFlow component doesn't accept a `ref` directly. Wrap it in a `<div ref={wrapperRef}>` for html-to-image capture. The wrapper needs `className="w-full h-full"` to maintain sizing.
- **Edit tool path format must match Read:** The Edit tool requires files to have been previously read using the SAME path format. If you read with `C:\Users\...` (Windows backslash), you must edit with the same format — or re-read with forward slashes before editing. Mixing formats causes "File has not been read yet" errors.
- **Button contrast: override component, not CSS variable:** When fixing button contrast (BUG-003), hardcode the new color (`#2563EB`) in the button component rather than changing `--signal` in globals.css. The `--signal` variable is used for links, focus rings, and other UI elements where the original blue works well as text on dark backgrounds.
- **React 19 strict lint: no setState in effects, no refs during render:** The `react-hooks/set-state-in-effect` and `react-hooks/refs` rules are active in this project. For external browser state (like `navigator.onLine`), use `useSyncExternalStore` with a module-level store that manages transitions internally. Pattern: define `let state`, `let listeners`, `subscribe()`, `getSnapshot()`, and `getServerSnapshot()` at module level, then `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` in the component.
- **Sonner toast action button for retry:** Sonner v2.x supports `toast.error("message", { action: { label: "Retry", onClick: fn } })` to add a clickable action button inside the toast notification. Useful for retryable API failures.
