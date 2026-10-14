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
- Bilingual UI support for English and Persian
- Light, dark, system, and time-based auto theme support

## Project Structure

- `app/` - routes and server components
- `components/` - shared UI and app components
- `lib/actions/` - server actions
- `lib/ai/` - AI service layer
- `lib/i18n/` - UI language config and message catalogs
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

Phase 8 adds a derived learner context, adaptive lesson prompts, bounded conversation memory, completion summaries, and task-specific model routing. The existing server actions, authentication, Supabase schema, and RLS remain the foundation. See `docs/phase-8.md` for architecture decisions, changed files, validation, and limitations.

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
AI_LESSON_MODEL=
AI_CONVERSATION_MODEL=
AI_ANALYSIS_MODEL=
AI_TIMEOUT_MS=20000
```

Optional AI provider variables:

```bash
AI_BASE_URL=
LOCAL_AI_BASE_URL=
```

OpenRouter is the default production provider. The local provider is optional and is intended for OpenAI-compatible local endpoints. No paid OpenAI API key or OpenAI SDK is required.

Task-specific model variables are optional and fall back to `AI_MODEL`. Progress summaries use the analysis model. No model identifiers are hardcoded. `AI_TIMEOUT_MS` accepts 1–45000 milliseconds per attempt; transient transport, timeout, rate-limit, and server failures receive one retry after 250 milliseconds. The timeout covers response-body consumption as well as connection setup. Configuration errors and malformed output are not retried.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENROUTER_API_KEY` in client components, browser bundles, logs, or public documentation examples.

## UI Languages

The application interface supports:

- English (`en`)
- Persian (`fa`)

The UI language is stored on `users_profile.interface_language`. Authenticated users can change it from the navigation language selector. The explicit profile value is the source of truth; if no profile language is available, the app falls back to English.

The learning language remains English. Lessons, vocabulary examples, target sentences, and user conversation text should stay in English. For Persian UI users, AI correction explanations may be Persian while corrected English sentences remain English.

Translations live in:

```text
lib/i18n/messages/en.json
lib/i18n/messages/fa.json
```

To add or change translated UI text, update both message files with the same key structure and use helpers from `lib/i18n/config.ts`. Avoid translating user-generated text or AI-generated English learning content.

## Theme Preferences

The app supports these theme modes:

- `light`: always use the light theme.
- `dark`: always use the dark theme.
- `system`: follow the operating system color scheme.
- `auto`: use browser-local time, light from 06:00 to 18:00 and dark from 18:00 to 06:00.

Authenticated users store their choice in `users_profile.theme_preference`. Visitors who are not signed in use a `localStorage` fallback. After login, the database profile preference is authoritative.

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
