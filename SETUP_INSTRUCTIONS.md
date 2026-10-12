# Setup Instructions

## Required Software Versions

The exact required runtime version is not explicitly documented in the project.

Known version constraints from `package.json`:

- Next.js: `^15.1.0`
- React: `19.0.0`
- TypeScript: `^5.6.3`
- npm lockfile is present as `package-lock.json`.
- `@types/node` is `^22.9.0`, so Node 22.x is a sensible target unless the deployment platform dictates otherwise.

Recommended starting point for Codex 2:

- Node.js 22.x LTS or a Next.js 15 compatible Node version.
- npm compatible with the lockfile.
- Supabase CLI if applying migrations locally or to a linked project.

## Installation Commands

From the project root:

```bash
npm install
```

Do not rely on transferred `node_modules`. Reinstall dependencies on the new machine.

## Environment Variables Needed

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
AI_MODEL=
AI_BASE_URL=
LOCAL_AI_BASE_URL=
AI_TIMEOUT_MS=20000
```

## Variable Meanings

- `NEXT_PUBLIC_SUPABASE_URL`: required. Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required. Supabase anon/public key.
- `SUPABASE_SERVICE_ROLE_KEY`: optional in currently visible features, required only for `createAdminClient()`.
- `AI_PROVIDER`: optional, defaults to `openrouter`. Allowed values: `openrouter`, `local`.
- `OPENROUTER_API_KEY`: required when `AI_PROVIDER=openrouter`.
- `AI_MODEL`: required for both OpenRouter and local provider modes.
- `AI_BASE_URL`: optional override for OpenRouter base URL or fallback base URL for local mode.
- `LOCAL_AI_BASE_URL`: required for local provider mode unless `AI_BASE_URL` is provided.
- `AI_TIMEOUT_MS`: optional, defaults to `20000`.

## How To Run Locally

1. Install dependencies.
2. Create `.env.local`.
3. Fill Supabase and AI provider variables.
4. Apply database migrations or connect to a Supabase project where they are already applied.
5. Start the development server:

```bash
npm run dev
```

The default Next.js dev server usually runs at:

```text
http://localhost:3000
```

## How To Build

```bash
npm run build
```

Then run the production server:

```bash
npm run start
```

## How To Test

Run the Vitest suite:

```bash
npm test
```

Run TypeScript checking:

```bash
npm run typecheck
```

Run ESLint:

```bash
npm run lint
```

Recommended full local validation:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Database Setup Steps

The repository contains SQL migrations only. No `supabase/config.toml` is present, so local Supabase project linkage is unknown.

Migrations, in order:

1. `supabase/migrations/202610120001_initial_schema.sql`
2. `supabase/migrations/202610120002_profile_timezone.sql`
3. `supabase/migrations/202610120003_daily_lesson_generation_status.sql`
4. `supabase/migrations/202610120004_conversation_messages.sql`
5. `supabase/migrations/202610120005_progress_mistake_notebook.sql`

These migrations create and update:

- `users_profile`
- `daily_lessons`
- `conversations`
- `conversation_messages`
- `mistakes`
- `practice_logs`
- RLS policies
- Indexes
- `insert_assistant_conversation_message(...)` RPC function

### Applying Migrations

Exact command depends on whether a Supabase project is linked. If using Supabase CLI with a linked project, the likely command is:

```bash
supabase db push
```

If using local Supabase, initialize/link according to Supabase CLI documentation, then apply migrations. Because this repo does not include `supabase/config.toml`, Codex 2 must not assume local Supabase is already configured.

If applying manually through the Supabase SQL editor, apply the migration files in timestamp order exactly as listed above.

## Authentication Setup

Supabase Auth must be enabled for email/password.

Unknown external settings:

- Whether email confirmation is required.
- Site URL.
- Redirect URLs.
- SMTP/email provider configuration.

If email confirmation is enabled, signup redirects the user to `/login?message=check-email`.

## AI Provider Setup

### OpenRouter Mode

Use:

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
AI_MODEL=provider/model-name
AI_TIMEOUT_MS=20000
```

`AI_BASE_URL` can override the default OpenRouter base URL, which is:

```text
https://openrouter.ai/api/v1
```

### Local Provider Mode

Use:

```bash
AI_PROVIDER=local
AI_MODEL=local-model-name
LOCAL_AI_BASE_URL=http://localhost:11434/v1
AI_TIMEOUT_MS=20000
```

The local endpoint must expose an OpenAI-compatible `/chat/completions` route and support JSON-object responses.

## Deployment Requirements

Deployment target is unknown. No platform-specific config is present.

Any deployment must provide:

- Node/Next.js compatible runtime.
- All required environment variables.
- Supabase project with migrations applied.
- Supabase Auth callback/site URLs configured for the deployed domain.
- Network access from the server runtime to Supabase and the AI provider.

Deployment risks:

- Synchronous AI calls may exceed platform request limits if the provider is slow.
- Missing environment variables will fail early because `lib/env.ts` parses required values.
- Supabase Auth redirects may fail if production URLs are not configured in Supabase.

## Transfer Checklist For Codex 2

1. Confirm files were transferred without relying on `.next` or `node_modules`.
2. Install dependencies with `npm install`.
3. Create `.env.local`.
4. Fill Supabase values.
5. Fill AI provider values.
6. Confirm migrations are applied.
7. Run `npm run typecheck`.
8. Run `npm run lint`.
9. Run `npm test`.
10. Run `npm run build`.
11. Smoke-test the main user flow in a browser.
12. Restore or initialize Git before making code changes.
