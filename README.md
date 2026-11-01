# EventGenie

EventGenie is a Next.js event-planning application for organizing event details, budgets, expenses, and tasks, with an NVIDIA NIM-powered assistant for validated event actions.

## What is implemented

- Responsive landing page and authenticated sign-up, log-in, email verification, password reset, and logout flows through Supabase Auth.
- Authenticated event creation, editing, and deletion, backed by Supabase PostgreSQL and Row Level Security.
- Event overview with actual saved budget and expense totals, tasks, guests, and vendor records.
- Task creation and completion; actual expense recording; event progress derived from saved tasks.
- NVIDIA NIM chat-completions integration, called only from the server. Validated tools can read events and event details, create and update events, change a total budget, and create tasks and expenses.
- Persistent conversation history and an authenticated per-user assistant rate limit.
- Supabase schema migration for events, members, budgets, categories, expenses, tasks, vendors and quotes, guests, ideas, reminders, conversations, action logs, and documents.

The application does not fabricate seed events, expenses, vendor quotes, or guest data. The first implementation intentionally limits assistant mutations to the actions listed above; vendor, guest, idea, export, undo, and notification workflows still need implementation before the full project brief is complete.

## Prerequisites

- Node.js 20.9 or later
- A Supabase project
- An NVIDIA NIM API key and a model available to your NIM account for assistant requests

## Local setup

1. Install packages:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Configure the Supabase project URL and publishable/anon key in `.env.local`. These two Supabase client values are public identifiers; database access is protected by RLS. Keep the NVIDIA NIM API key server-only and do not use a `NEXT_PUBLIC_` prefix.

4. Apply `supabase/migrations/202611010001_eventgenie_core.sql` to the Supabase project using the Supabase SQL Editor or Supabase CLI:

   ```bash
   supabase db push
   ```

   The migration creates the application tables, indexes, membership policies, atomic event-and-budget creation, timestamp triggers, and assistant rate-limit function. Do not expose a Supabase service-role key to the application.

5. In Supabase Auth settings, set the local site URL to `http://localhost:3000` and allow the same URL for email verification and password-reset redirects. Enable email confirmation if you want verified accounts.

6. To use the assistant, set `NVIDIA_NIM_API_KEY` and `NVIDIA_NIM_MODEL` in `.env.local`. The key from the original project request was posted in chat; revoke it and use a newly rotated key. Never commit `.env.local`. Verify the rotated key and model with:

```bash
npm run check:nim
```

This sends a minimal test prompt to NVIDIA NIM and reports success or the HTTP status without printing the key or provider response.

7. Start the application:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

   Or use the single local startup script:

   ```bash
   ./start-local.sh
   ```

   It checks Node.js/npm, installs dependencies if needed, reports missing service configuration, and starts the app on localhost. Next.js selects an available port (usually `3000`); set `PORT=3001` to choose a specific port.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The API rejects invalid request bodies, derives the user from a verified Supabase session, and relies on RLS for event-level authorization. The assistant uses a fixed NVIDIA NIM endpoint; user input cannot select a model endpoint, invoke SQL, or run arbitrary code. If NIM credentials are missing or a provider call fails, the assistant returns an explicit error and does not report success.

## Render deployment

The app requires a Node.js web service because it uses Next.js server-rendered pages, API routes, and server-side secrets. `render.yaml` defines a Render Blueprint web service using the free plan.

1. Push this project to a GitHub or GitLab repository.
2. In the Render Dashboard, create a **Blueprint** and connect that repository. Render reads `render.yaml` and creates the `eventgenie` web service.
3. Enter `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NVIDIA_NIM_API_KEY`, and `NVIDIA_NIM_MODEL` when prompted. Use a rotated NVIDIA key; the key originally shared in chat should be revoked. Render stores `sync: false` values as service environment variables; never commit secrets.
4. Apply the database migration to the production Supabase project and add the Render URL to the Supabase Auth site URL and redirect allowlist.

The free Render service may spin down after inactivity, so its first request after idle can be slow. Configure the environment variables and Supabase project before expecting sign-in, saved data, or assistant calls to work.

For an existing Render service, open **Dashboard → eventgenie → Environment**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project's API settings, and save. Render will rebuild/redeploy the service. These values must be present during the Next.js build because `NEXT_PUBLIC_` variables are included in the browser bundle. Do not set or expose the Supabase service-role key.

## Project layout

```text
src/app/                 Next.js pages and authenticated API routes
src/components/          Landing, auth, dashboard, event detail, assistant UI
src/lib/                 Validation schemas and Supabase client helpers
supabase/migrations/     PostgreSQL schema, authorization policies, functions
```
