# Stride

Process mapping and continuous improvement platform. Map, score, compare, and execute operational processes on a dark-themed infinite canvas.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Canvas:** React Flow (@xyflow/react)
- **Backend:** Supabase (Auth, Postgres, RLS)
- **Styling:** Tailwind CSS 4 (dark theme)
- **Rich Text:** TipTap
- **Hosting:** Vercel

## Project Structure

```
src/
  app/(auth)/         Login, signup
  app/(app)/          Authenticated app (workspaces, canvas, list view)
  app/api/v1/         REST API (workspaces, tabs, sections, steps, connections)
  components/
    canvas/           React Flow canvas, custom step/section nodes
    panels/           Detail panels (step, section, workspace summary)
    layout/           Sidebar, header, tab bar
    ui/               Shared UI primitives
  lib/                Supabase clients, API helpers, context
  types/              TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Database

Migrations are in `supabase/migrations/`. Push to remote:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## Deployment

Deployed on Vercel. Push to `main` triggers auto-deploy.

```bash
npx vercel --prod         # Manual deploy
npx vercel --prod --force # Deploy with cache skip
```
