# Stride App Context — Testing

## URLs
- **Local dev:** http://localhost:3000
- **Production:** https://stride-five-sigma.vercel.app

## Auth
- Auth method: Supabase email/password + OAuth
- Test credentials: Use the account created during development (check .env.local or sign up a new test account)
- OAuth callback: `/auth/callback`

## Golden Path (critical user journey)
1. User signs up → bootstrap_workspace creates org + workspace + first tab
2. Navigate to workspace canvas (auto-redirects to first tab)
3. Add a section to the canvas
4. Add a step inside the section
5. Click step → detail panel opens → edit name, status, notes
6. Add maturity score to step
7. View heat map (maturity coloring on canvas)
8. View gap analysis
9. Create a journey tab (canvas_type: journey)
10. Add stage + touchpoint to journey canvas
11. Export canvas as PDF

## Known Issues
- 5 pre-existing lint warnings (non-blocking)
- People and Tools pages are stubs (Phase 1+ content)

## Key Routes for Testing
| Route | What to test |
|-------|-------------|
| `/workspaces` | Workspace list loads, create new workspace |
| `/w/[id]/[tabId]` | Canvas renders, add/edit/delete nodes |
| `/w/[id]/list` | Step list displays all steps |
| `/w/[id]/compare` | Side-by-side canvas comparison |
| `/w/[id]/gap-analysis` | Maturity gap ranking |
| `/w/[id]/teams` | Team/role/person CRUD |
| `/w/[id]/settings` | Workspace settings, perspectives management, public sharing |
| `/public/[shareId]` | Read-only public view |
