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

- **Server/API query mismatch:** When a page uses both a server component (page.tsx with direct Supabase query) and an API route (for client-side Load More), BOTH queries must use the same `.select()` shape. Updating only the API route to add a join (e.g., `select("*, users!fk(email)")`) while leaving page.tsx at `select("*")` causes initial load data to lack join fields. Always update both code paths together.

## Patterns That Work

- **Phase decomposition:** Large features (4+ files) benefit from splitting into 3-4 sub-tasks (data model → API → UI → polish).
- **Polymorphic annotations:** Using `(annotatable_type, annotatable_id)` pairs allows perspectives to work across all entity types without separate junction tables.
- **Canvas type discrimination:** Single `flow-canvas.tsx` handles both process and journey by switching on `tab.canvas_type`.

- **Supabase RLS silent mutations:** INSERT/UPDATE/DELETE filtered by RLS don't throw errors — they affect 0 rows silently. API routes must check if `data` is null after mutations and return 403 explicitly. Otherwise clients think operations succeeded when they didn't.
- **Polymorphic FK limitation:** `annotatable_id` in `perspective_annotations` has no FK constraint because it points to different tables depending on `annotatable_type`. Orphaned annotations accumulate when parent entities are deleted. Consider a cleanup trigger or periodic sweep.

## Environment

- **Playwright MCP unavailable — not a dev server issue:** Playwright MCP has been unavailable since iteration 56. In Phase 0 (Preflight) step 3, if Playwright can't navigate, this is a TOOL LIMITATION, not a dev server outage. Do NOT write "DEV SERVER DOWN" to SIGNAL. Instead: verify the dev server is running via `curl http://localhost:3000` or `lsof -i :3000`, note "Playwright MCP unavailable" in STATUS.md warnings, and continue. The dev server is likely fine.

## Pipeline

- **Worktree merge failure:** Ralph v3.0 builder worktrees may be cleaned up without merging code back to the main branch. The builder's commit becomes unreachable (visible via `git fsck --unreachable`). Reviewer must check for orphaned commits and cherry-pick/checkout files manually. Root cause likely in the pipeline's worktree cleanup logic.

## Meta

- **Pre-existing lint warnings:** 5 warnings in flow-canvas.tsx (unused import, missing hook deps) and sidebar.tsx (unused import). These are known and acceptable.
- **API route HTTP methods:** Not all entity routes export GET. Sections and stages are POST-only at the collection level (no list endpoint). 405 responses for GET are expected, not bugs.
- **WebFetch limitations:** WebFetch cannot access localhost URLs. For regression testing, use production URL for unauthenticated pages and curl for localhost API probing.
- **Pipeline dispatch reliability:** 3 consecutive iterations (70-72) had pipeline dispatch failures — builders or testers never executing despite correct EXECUTION_PLAN.json. Root cause: 5 ralph.sh bugs fixed in commit 00a7356. Iteration 73 — both builders completed successfully.
- **Pipeline worktree merge recurring:** Iteration 71 and 73 — builders complete their work in worktrees, but worktrees are cleaned up before code is merged back to main branch. Reviewer must run `git fsck --unreachable` to find orphaned commits, then `git checkout <sha> -- <files>` to recover. This is a recurring pipeline issue that needs a fix in ralph.sh worktree cleanup logic.

## Pipeline Issues

- **Worktree commit path bug:** Builder's `git add -A` in worktree commits files under `autonomous-dev/.ralph/worktrees/build-N/src/` instead of main `src/`. The pipeline's merge step copies files from worktree to main but the builder commits before merge happens. Occurred iter 71, 73, 74.
- **Lucide-react no `title` prop:** Lucide-react icon components don't accept a `title` prop (TS2322). Use `aria-label` instead for accessibility labeling.
- **BUILD_RESULT misleading on merge failure:** BUILD_RESULT files report builder's worktree state, not main branch state. When merge fails (conflict or branch missing), BUILD_RESULT shows completed but code is absent from main. Tester/reviewer must verify files actually exist on the target branch, not trust BUILD_RESULT alone. (Iter 77, 84, 85)
- **Pipeline merge step total failure (iter 84-85):** Two consecutive iterations with identical failure: builders complete work in worktrees with passing typecheck/lint, but no builder branches exist post-build, no merge commits in reflog, and worktrees are cleaned up — destroying all code. Different from earlier "conflict" failures (iter 74, 77) where branches existed but merged incorrectly. This is a complete merge step non-execution. Pipeline fix required before any more build iterations.
- **Slot 2 merge conflict recurring (G007 pattern):** Iterations 74, 77 — builder's `git add -A` in worktree stages EXECUTION_PLAN.json and BUILD_RESULT files, which conflict with main branch versions. ralph.sh must exclude `knowledge/handoffs/` from worktree commits or use `git add <specific-files>` instead of `git add -A`.
- **Tester dispatch delayed in testing_only mode:** Iteration 72 — tester never launched. Iteration 79 — tester initially failed to dispatch (reviewer committed "blocked"), then executed successfully on retry (40/40 PASS). May be a pipeline timing/dispatch bug in testing_only mode. Partially mitigated by ralph.sh verbose logging added in iter 79.
- **Pre-merge stash never popped = merge never ran:** Iteration 84 — both builders completed in worktrees, but `ralph-auto-stash-*` stash was never popped. This means the pre-merge stash was created but the merge step crashed or was never reached. No builder branches, no merge commits, code absent from disk. 6th+ occurrence of builder work loss (iters 73, 74, 77, 78, 84). The worktree merge pipeline is fundamentally unreliable and needs a redesign.
- **3 consecutive merge failures for FEAT-050 (iter 92-94):** Same total-failure pattern as iter 84-85. Builders complete, worktrees cleaned up, code unreachable. Reviewer recovered from unreachable commits via `git fsck --unreachable | grep commit | git log --oneline` then `git checkout <sha> -- <files>`. This recovery pattern is now well-established and should be automated in ralph.sh.
