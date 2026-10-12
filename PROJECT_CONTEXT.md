# Project Overview

## Project Name

AI Language Coach (`ai-language-coach`).

## Purpose

AI Language Coach is a focused English learning web app for short daily practice sessions. It helps a learner complete a 10, 15, or 30 minute English habit through a generated daily lesson, short conversation practice, correction review, and progress tracking.

## Main User Problem Being Solved

The app addresses the problem of inconsistent English practice and unclear feedback. It gives the user a small daily plan, adapts content to their level and goal, lets them practice conversation, saves useful corrections, and shows recent learning progress.

## Current Development Status

The project appears to be an early-stage MVP/prototype with several completed product slices. The README states that Phase 6.5 is complete: the app uses an internal AI provider interface with OpenRouter as the primary provider and optional local OpenAI-compatible endpoint support.

Important transfer note: `C:\dev\zaban` is not currently a Git repository. There is no local `.git` history, branch, tag, or commit metadata available in this checkout.

# Technology Stack

## Framework

- Next.js 15 App Router.
- React 19.
- Server Components and Server Actions.

## Language

- TypeScript with `strict` enabled.

## Styling

- Tailwind CSS 3.
- shadcn/ui-style primitives.
- `class-variance-authority`, `clsx`, and `tailwind-merge`.
- `lucide-react` icons.

## Database

- Supabase PostgreSQL.
- SQL migrations are stored in `supabase/migrations/`.
- Row Level Security is enabled for user-owned tables.

## Authentication

- Supabase Auth.
- Email/password login and signup are implemented.
- Session refresh is handled by Next middleware through `@supabase/ssr`.

## External Services

- Supabase Auth and PostgreSQL.
- OpenRouter chat completions API as the primary AI provider.
- Optional local OpenAI-compatible chat completions endpoint.

## Important Libraries

- `@supabase/ssr`
- `@supabase/supabase-js`
- `zod`
- `vitest`
- `eslint`
- `typescript`
- `next`
- `react`
- `tailwindcss`

# Architecture Overview

## Folder Structure

- `app/`: Next.js App Router routes and server-rendered pages.
- `app/(auth)/login/page.tsx`: login page.
- `app/(auth)/signup/page.tsx`: signup page.
- `app/dashboard/page.tsx`: authenticated dashboard.
- `app/practice/page.tsx`: daily lesson practice page.
- `app/conversation/page.tsx`: AI conversation coach page.
- `app/mistakes/page.tsx`: mistake notebook page.
- `app/progress/page.tsx`: progress tracking page.
- `app/onboarding/page.tsx`: profile onboarding page.
- `components/`: client UI components and shared primitives.
- `components/ui/`: small button/input/label primitives.
- `lib/actions/`: Next server actions for auth, profile, daily lessons, conversations, mistakes, and progress.
- `lib/ai/`: provider-neutral AI service layer and coach prompts.
- `lib/ai/providers/`: OpenRouter, local provider, and shared JSON response helpers.
- `lib/supabase/`: browser, server, admin, and middleware Supabase clients.
- `lib/validations/`: Zod schemas for user input and AI output.
- `lib/daily/`, `lib/conversation/`, `lib/mistakes/`, `lib/progress/`: domain model helpers.
- `types/database.ts`: manually maintained Supabase database type shape.
- `tests/`: Vitest tests for AI provider behavior and domain helpers.
- `supabase/migrations/`: database schema migrations.

## Major Components

- `AppNav`: reads the current user and profile to render authenticated navigation and onboarding links.
- `AuthForm`: client login/signup form using server actions.
- `OnboardingForm`: multi-step profile setup for level, goal, daily practice time, and timezone.
- `PracticeWorkspace`: client workflow for generating, viewing, stepping through, and completing the daily lesson.
- `ConversationWorkspace`: client workflow for starting conversation threads, sending messages, showing AI replies/corrections, and ending conversations.
- `MistakeNotebook`: displays saved corrections, grouped repeated mistakes, sync action, and soft-removal.
- Route pages: server components that load authenticated data and pass it to client workspaces.

## Data Flow

1. User authenticates through Supabase Auth.
2. Middleware refreshes the Supabase session and redirects unauthenticated users away from protected routes.
3. New authenticated users are redirected to onboarding until `users_profile` is complete.
4. Server pages call server actions/read helpers to load current user data.
5. Client components submit forms through server actions.
6. Server actions validate input with Zod, perform Supabase reads/writes, call AI providers when needed, and revalidate affected paths.
7. Supabase RLS policies enforce per-user access.

## Backend/Frontend Relationship

There is no separate REST API layer in the current source. The app uses Next.js Server Components and Server Actions as the backend boundary. Client components use `useActionState` with imported server actions for mutations.

Supabase is the database/auth backend. AI calls are made from server-side code through the provider abstraction in `lib/ai/provider.ts`.

## Database Architecture

Migrations define these tables:

- `users_profile`: one profile per Supabase auth user, including level, goal, daily minutes, and timezone.
- `daily_lessons`: one generated daily lesson per user and date, including vocabulary, sentence, reading text, speaking task, completion state, and generation status.
- `conversations`: conversation thread metadata, topic, status, generation lock fields, and timestamps.
- `conversation_messages`: normalized conversation messages with role, content, corrections, request ID, and per-conversation ordering.
- `mistakes`: saved correction notebook entries, optionally linked to a conversation message and correction index.
- `practice_logs`: generic activity log table. It exists in schema and types, but current progress code does not use it.

All main tables have RLS enabled. Policies generally allow users to select, insert, update, and delete only rows tied to `auth.uid()`. `conversation_messages` policies verify ownership through the parent `conversations` row. Assistant message insertion uses `public.insert_assistant_conversation_message(...)`, a `security definer` function, because users are only allowed to insert user-role messages directly.

## Important Design Decisions

- Keep user data isolated with Supabase RLS instead of relying only on application checks.
- Use Server Actions as the mutation/API boundary.
- Validate all external/user/model data with Zod before use.
- Keep AI model calls provider-neutral through `AIProvider`.
- Require JSON responses from AI providers and parse/validate them before persistence.
- Track daily lessons by user-local calendar date, using the profile timezone.
- Claim daily lesson generation with `generation_status` to avoid duplicate generation.
- Store conversation messages in `conversation_messages` rather than relying on the older `conversations.messages` JSONB column.
- Use request IDs and active generation locks for conversation reply idempotency/concurrency.
- Soft-remove mistake notebook entries by setting `dismissed_at` instead of deleting source-backed corrections.

# Completed Features

## Authentication

- Email/password signup.
- Email/password login.
- Logout.
- Middleware session refresh.
- Redirects unauthenticated users from protected routes to `/login`.
- Redirects authenticated users away from `/login` and `/signup`.

## Onboarding/Profile

- Multi-step onboarding for English level, learning goal, daily practice time, and timezone.
- Supported levels: A1, A2, B1, B2, C1.
- Supported goals: conversation, work, travel, exam, personal growth.
- Supported daily practice durations: 10, 15, 30 minutes.
- Profile completeness gates access to protected app sections.

## Dashboard

- Shows readiness for daily practice.
- Links to practice generation/opening.
- Shows progress summary: current streak, last 14 days, weak areas.
- Links to progress and mistake notebook.

## Daily Practice

- Generates one daily lesson per user-local calendar day.
- Lesson contains vocabulary, one sentence, reading text, and a speaking task.
- AI prompt uses user level, goal, daily minutes, timezone, previous mistakes, and recent topics.
- Supports `pending`, `ready`, and `failed` generation states.
- Failed generation can be retried.
- Ready lessons are reused instead of regenerated.
- Completed lessons can be marked complete idempotently.

## Conversation Coach

- Users can start conversations by fixed topic.
- Supported topics: daily life, work, travel, hobbies, free conversation.
- Users can send messages up to 800 characters.
- AI replies are concise and can include up to two corrections.
- Recent conversation context is included in the AI prompt.
- Conversations can be ended.
- Recent conversations are listed.
- Duplicate request IDs are detected.
- Active generation lock prevents overlapping AI responses.
- Stale generation locks are recoverable after two minutes.
- Per-user message throttle limits new user messages to six per minute.
- Conversation length is capped at 60 messages.

## Mistake Notebook

- Conversation corrections can be synced into `mistakes`.
- New assistant messages call sync for the returned assistant message ID.
- Notebook entries can be filtered by category through the URL.
- Repeated corrections are grouped deterministically.
- Entries can be removed by setting `dismissed_at`.
- Source conversation messages are not deleted when notebook entries are removed.

## Progress Tracking

- Counts practice days from completed daily lessons and answered conversation exchanges.
- Deduplicates multiple activities on the same local calendar day.
- Shows last 7 days, last 14 days, current streak, total completed lessons, practiced topics, weak areas, and recent activity.
- Uses profile timezone for conversation practice day boundaries.

## AI Provider Layer

- Internal `AIProvider` interface.
- OpenRouter provider.
- Local OpenAI-compatible provider.
- Shared JSON payload builder.
- Timeout handling.
- Provider error mapping for rate limit, unavailable model, network failure, timeout, and invalid response.
- Test override hook through `setAIProviderForTesting`.

## Tests

Vitest tests exist for:

- AI provider selection, JSON parsing, invalid JSON, Zod validation, timeout handling, unavailable provider handling, mocked coach calls.
- Daily lesson helper behavior, concurrency conflict detection, timezone date keys, completion idempotency, profile completeness.
- Conversation validation, response shape, request ID deduplication, lock staleness, ownership helpers.
- Mistake grouping, weak area counting, soft-removal model.
- Progress day deduplication, streaks, timezone boundaries.

# Current Phase

The README states: Phase 6.5 is complete.

Based on the source, this phase includes:

- Provider-based AI layer.
- OpenRouter primary support.
- Optional local OpenAI-compatible endpoint support.
- Daily lesson generation and completion.
- Conversation coaching with corrections.
- Correction sync into mistake notebook.
- Progress calculations.

## Intentionally Not Implemented Or Not Evident

The following are not evident in the current source:

- Audio recording.
- Pronunciation scoring.
- Speech-to-text.
- Live speaking feedback.
- Push/email reminders.
- Admin interface.
- Billing/subscriptions.
- Public marketing pages.
- Separate API routes.
- Supabase Edge Functions.
- Deployment configuration.
- CI pipeline.
- Local Supabase config file.
- Automated generated database types from Supabase CLI.

# Important Architecture Decisions

## Preserve Server Actions As The Backend Boundary

Current mutations live in `lib/actions/*` and are consumed directly by client components through `useActionState`. Do not introduce REST or API route duplication without a clear reason.

## Preserve RLS And User Ownership Checks

RLS policies are central to data isolation. Application queries also filter by `user_id`. Future changes should preserve both layers.

## Preserve Provider-Neutral AI Calls

Feature code should call `getAIProvider()` through coach modules, not hard-code OpenRouter calls in UI or server actions.

## Preserve JSON + Zod AI Output Validation

AI output must be parsed as JSON and validated with Zod before persistence. Do not store raw model output directly as trusted structured data.

## Preserve User-Local Date Semantics

Daily lessons are keyed by user-local date from profile timezone. Conversation activity is converted to profile-local date for progress. Avoid replacing this with naive UTC date slicing.

## Preserve Conversation Idempotency And Locking

Conversation sends rely on `requestId`, duplicate detection, active generation locks, and the assistant-message RPC. Keep these patterns if changing conversation behavior.

## Preserve Soft Removal For Mistakes

Mistake notebook removal uses `dismissed_at`, not hard delete. This preserves source-backed learning history and avoids re-sync surprises.

## Keep Existing Schema Intent Clear

`conversations.messages` and `conversations.feedback` still exist from the initial schema, but current code reads/writes normalized `conversation_messages`. Do not reintroduce the old JSONB message flow without an explicit migration plan.

# Known Issues And Limitations

## Repository/Transfer Limitations

- This folder is not currently a Git repository. There is no branch, commit, or diff history available from this checkout.
- `node_modules` and `.next` are present locally, but a future machine should reinstall dependencies and rebuild.

## Configuration Gaps

- `.env.example` lists required variables but contains no values.
- Required Supabase URL and anon key are unknown.
- Required OpenRouter API key and AI model are unknown for OpenRouter mode.
- Local AI endpoint URL is unknown for local mode.
- Supabase project reference is unknown.
- Supabase CLI configuration is not present in the repository.
- Deployment target and production environment configuration are unknown.

## Database/Type Gaps

- `types/database.ts` appears manually maintained and has `Functions: EmptyObject`, even though the migration creates `insert_assistant_conversation_message`. Current server Supabase clients are not typed with `Database`, so this does not currently block the visible code, but future typed RPC usage may need generated types.
- `practice_logs` exists but is not currently written by feature code.
- `conversations.messages` and `conversations.feedback` exist but are not the active conversation message storage path.

## Product Limitations

- Speaking task is self-guided only. There is no audio capture, transcription, pronunciation feedback, or scoring.
- Daily lesson generation is synchronous in a server action; long AI calls can make the request feel slow.
- Pending daily lesson state requires user refresh; there is no background polling.
- Login ignores the `redirectedFrom` query parameter set by middleware and always redirects to `/dashboard`.
- Signup confirmation URL behavior depends on Supabase Auth settings outside this repo and is unknown.
- Mistake analysis module exists, but the current UI uses conversation corrections rather than a standalone manual mistake analyzer.
- Admin Supabase client exists but no admin feature is visible in source.

## Validation Status

The source includes lint, typecheck, build, and test scripts. This transfer pass did not run validation commands; it only inspected files and created documentation.

# Development Rules

## Coding Conventions

- Use TypeScript with strict typing.
- Use `@/*` path aliases.
- Keep domain helpers in `lib/<domain>/`.
- Keep validation schemas in `lib/validations/`.
- Keep mutations in `lib/actions/`.
- Keep UI components focused and reuse existing primitives in `components/ui/`.
- Prefer Zod validation at boundaries.
- Prefer server-side Supabase access for authenticated data operations.

## Architectural Constraints

- Do not bypass Supabase RLS assumptions.
- Do not trust AI output without schema validation.
- Do not duplicate active conversation storage into `conversations.messages`.
- Do not change date semantics without a dedicated timezone review.
- Do not change migrations casually; all schema changes need new migrations.
- Do not hard-code provider-specific AI logic into feature actions or components.
- Do not remove concurrency/idempotency protections in daily lesson or conversation flows.

## Things Codex 2 Must Avoid Changing Without Reason

- The provider abstraction in `lib/ai/provider.ts`.
- The `generation_status` workflow for daily lessons.
- The `requestId` and active lock workflow for conversation replies.
- The assistant-message RPC pattern.
- RLS ownership policies.
- `dismissed_at` soft-removal behavior for mistakes.
- Profile timezone-based date calculations.
- The Server Action boundary unless intentionally redesigning the app architecture.
