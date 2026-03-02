# Diagnoses — Stride

<!-- Detailed analysis of tasks that failed 2+ attempts. -->

## #BUG-019 — Activity page "Unknown" for all user entries — RESOLVED (iteration 96)
**Attempts:** 3 (attempts 1-2 failed, attempt 3 succeeded)
**Root cause:** Server component `page.tsx` line 25 used `.select("*")` which did NOT join the `users` table. The API route (`activity/route.ts`) was correctly updated in iter 92 with `.select("*, users!activity_log_user_id_fkey(email)")`, but `page.tsx` (which provides initial SSR data) was never updated. Initial load entries lacked `users` field → "Unknown" display.

**Attempt 1 (iter 92):** Builder updated API route but NOT `page.tsx`. Wrong file targeted.
**Attempt 2 (iter 94):** Builder targeted correct file (`page.tsx`) but code was lost in pipeline worktree merge failure. Code never reached the branch.
**Attempt 3 (iter 96):** Fixed `page.tsx` line 25: `.select("*")` → `.select("*, users!activity_log_user_id_fkey(email)")`. Merged successfully. Acceptance tested: 6/6 criteria PASS.

**Resolution:** ONE LINE change in page.tsx. Both page.tsx and route.ts now use identical select shapes.
