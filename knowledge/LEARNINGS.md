# Learnings — Stride
<!-- Cap: 100 entries. Merge/remove when exceeded. -->

## Codebase Gotchas

- **NEXT_PUBLIC_ static replacement:** Never use dynamic property access for `NEXT_PUBLIC_*` vars. Browser has no `process.env` — Next.js inlines via static string replacement at build time. `process.env[name]` returns undefined.
- **Vercel env piping:** Use `printf` (not `echo -e`) when piping values to `vercel env add` — `echo -e` corrupts values with escape sequences.
- **apiFetch unwraps envelope:** `apiFetch<T>()` extracts `json.data` and returns `T`. Client functions must NOT add nested property access (e.g., `result.workspace` is wrong when `result` IS the workspace).
- **React state immutability:** Never call `.sort()` on prop arrays directly — use `[...arr].sort()`. React expects immutable state.
- **Canvas null guards:** `buildNodes`/`buildEdges` defensively handle null/undefined with `(arr ?? []).filter(Boolean)` before `.map()`.
- **Supabase RLS + INSERT RETURNING:** `.insert().select()` triggers RETURNING checked against SELECT policies. Use SECURITY DEFINER functions for bootstrap operations.
- **React 19 useRef:** Requires initial value argument — `useRef(null)` not bare `useRef()`.
- **TipTap SSR crash:** TipTap editor must be lazy-loaded or wrapped in dynamic() to avoid SSR hydration mismatch.
- **WCAG AA text-quaternary:** `text-white/15` is too low contrast for functional content. Only use for decorative elements. Functional text minimum: `text-white/55`.

## Patterns That Work

- **Phase decomposition:** Large features (4+ files) benefit from splitting into 3-4 sub-tasks (data model → API → UI → polish).
- **Polymorphic annotations:** Using `(annotatable_type, annotatable_id)` pairs allows perspectives to work across all entity types without separate junction tables.
- **Canvas type discrimination:** Single `flow-canvas.tsx` handles both process and journey by switching on `tab.canvas_type`.

## Meta

- **Pre-existing lint warnings:** 5 warnings in flow-canvas.tsx (unused import, missing hook deps) and sidebar.tsx (unused import). These are known and acceptable.
