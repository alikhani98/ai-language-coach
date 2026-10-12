# Current Implementation State

## Working Features

### Authentication And Session Handling

- Supabase email/password signup exists in `lib/actions/auth.ts`.
- Supabase email/password login exists in `lib/actions/auth.ts`.
- Logout signs out through Supabase and redirects to `/login`.
- `middleware.ts` calls `updateSession` from `lib/supabase/middleware.ts`.
- Middleware protects `/dashboard`, `/practice`, `/conversation`, `/progress`, `/mistakes`, and `/onboarding`.
- Authenticated users are redirected away from `/login` and `/signup`.

### Onboarding

- `/onboarding` displays `OnboardingForm`.
- New users choose level, goal, daily practice minutes, and timezone.
- Browser timezone is detected client-side and submitted with the profile.
- Profile data is stored in `users_profile`.
- Incomplete profile users are redirected to onboarding before protected routes.

### Dashboard

- `/dashboard` requires a complete profile.
- It loads today's lesson and progress summary.
- It shows daily practice status, weak areas, streak, and links to practice/progress/mistakes.

### Daily Lesson Practice

- `/practice` requires a complete profile.
- Daily lesson records are keyed by authenticated user and user-local date.
- Lesson generation creates or reuses one lesson per user/date.
- Generation states are `pending`, `ready`, and `failed`.
- AI output is parsed through `dailyLessonContentSchema`.
- Failed generation can be retried.
- Ready lessons can be completed.
- Completion is idempotent.

### Conversation Coach

- `/conversation` requires a complete profile.
- Users can start conversation threads using predefined topics.
- Users can submit messages.
- AI replies include one concise response and zero to two corrections.
- Messages are stored in `conversation_messages`.
- Conversations can be ended.
- Recent conversations are listed.
- Duplicate request IDs are detected.
- Active generation locks prevent overlapping replies.
- Stale locks are treated as recoverable after 120 seconds.
- User message rate is capped at six per minute.
- Conversation length is capped at 60 messages.

### Mistake Notebook

- `/mistakes` requires a complete profile.
- Assistant conversation corrections can be synced into `mistakes`.
- Corrections are upserted by `(source_message_id, correction_index)`.
- Notebook entries are grouped by normalized wrong sentence, corrected sentence, and category.
- Notebook entries can be soft-removed with `dismissed_at`.
- Category filter is supported through `?category=...`.

### Progress Tracking

- `/progress` requires a complete profile.
- Completed daily lessons count as practice.
- Assistant replies with matching user request IDs count as conversation practice.
- Multiple activities on the same local date are deduplicated.
- Current streak allows yesterday's streak to continue when today is empty.
- Progress includes practiced topics, weak areas, and recent activity.

### AI Provider Layer

- Provider-neutral interface exists in `lib/ai/provider.ts`.
- OpenRouter provider exists in `lib/ai/providers/openrouter.ts`.
- Local OpenAI-compatible provider exists in `lib/ai/providers/local.ts`.
- Shared JSON response parsing/error mapping exists in `lib/ai/providers/json.ts`.
- Daily lesson, conversation coach, and mistake analysis modules call the provider interface.

### Tests

- Vitest configuration exists.
- Tests cover AI provider behavior, daily lesson helpers, conversation helpers, mistake grouping, and progress calculations.

## Partially Implemented Features

### Generic Practice Logs

The `practice_logs` table exists in the initial migration and `types/database.ts`, but current feature code does not write to it or use it for progress. Progress is derived from completed daily lessons and answered conversation messages.

### Mistake Analysis

`lib/ai/mistakeAnalyzer.ts` exists and can analyze a sentence through the AI provider, but there is no visible page/component/action using it as a standalone feature. Current mistake notebook entries come from conversation corrections.

### Admin Client

`lib/supabase/admin.ts` defines a service-role Supabase client, but no current feature appears to call it.

### Conversation Legacy Columns

The initial schema includes `conversations.messages` and `conversations.feedback`, but active code stores messages in `conversation_messages` and does not use those columns for conversation state.

### Database Types

`types/database.ts` models the main tables, but functions are empty despite a migration creating `insert_assistant_conversation_message`. Server/browser Supabase clients are currently untyped, so this is not blocking current code, but generated types would be safer for continuation.

## Missing Features

The following features are not present in current source:

- Audio recording.
- Speech-to-text.
- Pronunciation scoring.
- Live speaking feedback.
- Reminder notifications.
- Email sending outside Supabase Auth.
- Admin dashboard.
- User settings page for changing profile after onboarding.
- Password reset flow.
- Public landing page.
- Billing/subscription logic.
- CI workflow.
- Deployment configuration.
- Supabase local development config.
- Edge Functions.
- API route layer.

## Current Errors Or Risks

### Environment Risk

Required environment values are absent from `.env.example`. A new machine must provide valid Supabase and AI provider settings before the app can run successfully.

### Supabase Setup Risk

There is no `supabase/config.toml`, seed file, or project reference in the repo. Database setup steps must be performed against a known Supabase project manually unless Codex 2 receives external project details.

### AI Provider Risk

OpenRouter mode requires both `OPENROUTER_API_KEY` and `AI_MODEL`. Local mode requires `AI_MODEL` and `LOCAL_AI_BASE_URL` or `AI_BASE_URL`. Missing values will throw provider configuration errors during generation.

### Long Request Risk

AI generation happens synchronously inside server actions. Slow provider responses may produce poor UX or hit platform request limits depending on deployment target.

### Pending State UX Risk

If a daily lesson is pending, the UI tells the user to refresh. There is no polling or background job.

### Login Redirect Risk

Middleware sets `redirectedFrom`, but the login action always redirects to `/dashboard`. Returning users do not automatically return to the originally requested protected route.

### Type Drift Risk

Database types may drift from migrations because they are manually maintained. The RPC function is not reflected in `types/database.ts`.

### Git Transfer Risk

This checkout has no `.git` directory. Transfer must preserve files by copying or reinitializing Git elsewhere; there is no local branch state to continue from.

### Validation Risk

This documentation pass did not run `npm run lint`, `npm run typecheck`, `npm run build`, or `npm test`.

## Last Known Stable State

The last documented stable state in this repository is the README statement:

Phase 6.5 is complete: the app uses an internal AI provider interface with OpenRouter as the primary provider and optional local OpenAI-compatible endpoint support.

Source inspection supports that statement. The code includes implemented daily lessons, conversation coach, mistake notebook, and progress tracking around that provider layer.

Because there is no Git repository and validation commands were not run during this transfer documentation pass, the exact last passing commit or test run is unknown.

## Recommended First Investigation Steps

1. Confirm Node and npm versions on the new machine.
2. Run `npm install` from a clean checkout/copy.
3. Create `.env.local` from `.env.example` and fill Supabase plus AI values.
4. Identify the intended Supabase project and confirm whether migrations have already been applied.
5. Apply or verify all migrations in `supabase/migrations/` in order.
6. Run `npm run typecheck`.
7. Run `npm run lint`.
8. Run `npm test`.
9. Run `npm run build`.
10. Manually smoke-test signup/login, onboarding, daily lesson generation, conversation reply, mistake sync, and progress pages.
11. Decide whether to generate authoritative Supabase types and update `types/database.ts`.
12. Decide whether to initialize or restore Git history before feature work continues.
