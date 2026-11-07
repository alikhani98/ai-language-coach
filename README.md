# AI Language Coach

A small AI-powered daily English coach focused on 10-15 minutes of consistent practice with clear direction and personalized feedback.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Better Auth and MySQL for the production data path
- Supabase compatibility modules retained for rollback only
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

3. Fill in MySQL, Better Auth, and AI provider values in `.env.local`.

4. Apply only the reviewed MySQL migrations for the target environment.

5. Start the app:

```bash
npm run dev
```

## Current Phase

Production uses Better Auth and MySQL after the explicit MySQL cutover gates are
set in the server environment. Supabase packages and migrations remain only for
rollback compatibility; do not remove them without a separately reviewed
retirement plan. The operational procedure is in
[DirectAdmin / Passenger deployment](docs/PASSENGER_DEPLOYMENT.md).

## Environment Variables

Server-only variables:

```bash
APP_URL=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
BETTER_AUTH_SECRET=
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
AI_MODEL=openai/gpt-4o-mini
AI_LESSON_MODEL=
AI_CONVERSATION_MODEL=
AI_ANALYSIS_MODEL=
AI_TIMEOUT_MS=20000
ZABAN_DATA_BACKEND=mysql
ZABAN_CUTOVER_APPROVED=yes
```

`APP_URL` is required in production and must be the public HTTPS origin without
a path or port (for example, `https://zaban.54i.ir`). Configure it in the
DirectAdmin Node.js application's environment. It is used by middleware for
canonical redirects and must not be prefixed with `NEXT_PUBLIC_`.

Optional AI provider variables:

```bash
AI_BASE_URL=
LOCAL_AI_BASE_URL=
```

OpenRouter is the default production provider. The local provider is optional and is intended for OpenAI-compatible local endpoints. No paid OpenAI API key or OpenAI SDK is required.

Task-specific model variables are optional and fall back to `AI_MODEL`. Progress summaries use the analysis model. No model identifiers are hardcoded. `AI_TIMEOUT_MS` accepts 1–45000 milliseconds per attempt; transient transport, timeout, rate-limit, and server failures receive one retry after 250 milliseconds. The timeout covers response-body consumption as well as connection setup. Configuration errors and malformed output are not retried.

Do not expose `MYSQL_PASSWORD`, `BETTER_AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
or `OPENROUTER_API_KEY` in client components, browser bundles, logs, or public
documentation examples.

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

## Deployment

Use the [DirectAdmin / Passenger deployment](docs/PASSENGER_DEPLOYMENT.md)
procedure. It includes server-only variables, backup, build artifacts, OpenRouter
JSON smoke validation, and rollback.
