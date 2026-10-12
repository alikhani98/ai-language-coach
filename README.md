# AI Language Coach

A small AI-powered daily English coach focused on 10-15 minutes of consistent practice with clear direction and personalized feedback.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Supabase Auth and PostgreSQL
- Zod validation
- Provider-based AI service layer with OpenRouter primary support

## Project Structure

- `app/` - routes and server components
- `components/` - shared UI and app components
- `lib/actions/` - server actions
- `lib/ai/` - AI service layer
- `lib/supabase/` - Supabase clients
- `lib/validations/` - Zod schemas
- `types/` - shared TypeScript types
- `supabase/migrations/` - database migrations

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in Supabase and AI provider keys in `.env.local`.

4. Apply the Supabase migration in `supabase/migrations`.

5. Start the app:

```bash
npm run dev
```

## Current Phase

Deployment preparation is complete. The app uses an internal AI provider interface with OpenRouter as the default provider and optional local OpenAI-compatible endpoint support.

## Environment Variables

Client-side variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Server-only variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
AI_MODEL=
AI_TIMEOUT_MS=20000
```

Optional AI provider variables:

```bash
AI_BASE_URL=
LOCAL_AI_BASE_URL=
```

OpenRouter is the default production provider. The local provider is optional and is intended for OpenAI-compatible local endpoints. No paid OpenAI API key or OpenAI SDK is required.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENROUTER_API_KEY` in client components, browser bundles, logs, or public documentation examples.

## Production Validation

Run automated checks before deployment:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Run the AI provider smoke test only in a secure server shell with real provider credentials:

```bash
npm run smoke:ai
```

The smoke test validates daily lesson and conversation response schemas without writing to the database and without printing API keys.

## Supabase Deployment Checklist

1. Apply migrations in order from `supabase/migrations`.
2. Verify tables: `users_profile`, `daily_lessons`, `conversations`, `conversation_messages`, `mistakes`, `practice_logs`.
3. Verify RLS is enabled on all user-owned tables.
4. Verify policies restrict access to `auth.uid() = user_id`.
5. Verify `public.insert_assistant_conversation_message` exists.
6. Verify direct user inserts into `conversation_messages` only allow user-role messages.
