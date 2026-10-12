# Recommended Continuation Plan

## Priority 1

### Task 1: Recreate A Reliable Development Environment

- Objective: Make the project reproducible on the next machine before changing behavior.
- Affected files: `.env.example`, `package.json`, `package-lock.json`, `README.md`, `SETUP_INSTRUCTIONS.md`.
- Dependencies: Node/npm, Supabase project credentials, AI provider credentials.
- Potential risks: Missing or incorrect environment variables will break Supabase clients at import/runtime and AI generation actions.

### Task 2: Verify Supabase Database State

- Objective: Confirm all migrations are applied and the live database matches source expectations.
- Affected files: `supabase/migrations/202610120001_initial_schema.sql`, `202610120002_profile_timezone.sql`, `202610120003_daily_lesson_generation_status.sql`, `202610120004_conversation_messages.sql`, `202610120005_progress_mistake_notebook.sql`, `types/database.ts`.
- Dependencies: Supabase CLI or dashboard access; target Supabase project reference.
- Potential risks: Missing `conversation_messages`, RLS policies, or `insert_assistant_conversation_message` will break conversation replies and mistake sync.

### Task 3: Run Baseline Validation

- Objective: Establish the first verified baseline on the new machine.
- Affected files: all source files indirectly.
- Dependencies: Completed install and environment setup.
- Potential risks: Tests may pass without Supabase credentials, but build/runtime can still fail if `.env.local` is missing because `lib/env.ts` parses required public Supabase values.

Recommended commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### Task 4: Restore Or Initialize Git History

- Objective: Ensure future work has version-control safety.
- Affected files: repository metadata outside current source tree.
- Dependencies: Original remote repository or decision to initialize a new repository.
- Potential risks: Continuing without Git makes it hard to review, revert, transfer, or audit future Codex work.

### Task 5: Manual End-To-End Smoke Test

- Objective: Confirm the implemented MVP actually works with real Supabase and AI settings.
- Affected files: none if only testing.
- Dependencies: Valid `.env.local`, applied migrations, reachable AI provider.
- Potential risks: Supabase Auth email confirmation settings may block signup/login flow; AI provider may fail due to model/key/base URL configuration.

Smoke-test path:

- Create account.
- Confirm email if Supabase requires it.
- Log in.
- Complete onboarding.
- Generate today's lesson.
- Complete lesson.
- Start a conversation.
- Send a message with a correctable mistake.
- Confirm assistant reply and corrections.
- Sync mistakes.
- Review progress.

## Priority 2

### Task 6: Generate Or Correct Supabase Types

- Objective: Bring `types/database.ts` in sync with migrations, including functions/RPC.
- Affected files: `types/database.ts`, possibly Supabase CLI config if added.
- Dependencies: Supabase project access and CLI setup.
- Potential risks: Generated types may reveal mismatches that require source updates; avoid schema changes unless intentionally planned.

### Task 7: Add Profile Settings/Edit Flow

- Objective: Let users update level, goal, daily minutes, and timezone after onboarding.
- Affected files: likely `app/settings/page.tsx` or similar new route, `components/onboarding-form.tsx` or a new profile form component, `lib/actions/profile.ts`, `components/app-nav.tsx`.
- Dependencies: Existing `updateProfile` action already exists.
- Potential risks: Changing timezone affects future daily lesson keys and progress date boundaries. Existing date-only lessons should remain date-only.

### Task 8: Improve Post-Login Redirect

- Objective: Honor `redirectedFrom` set by middleware after successful login.
- Affected files: `lib/actions/auth.ts`, `app/(auth)/login/page.tsx`, `components/auth-form.tsx`, possibly validation schema.
- Dependencies: Safe redirect validation to prevent open redirects.
- Potential risks: Never redirect to arbitrary external URLs from form input/query params.

### Task 9: Improve Daily Lesson Pending UX

- Objective: Avoid requiring manual refresh while a lesson is pending.
- Affected files: `components/practice-workspace.tsx`, `lib/actions/dailyLesson.ts`, possibly route refresh logic.
- Dependencies: Existing `generation_status` workflow.
- Potential risks: Do not start multiple AI calls or bypass the pending/failed/ready state machine.

### Task 10: Decide What To Do With `practice_logs`

- Objective: Either start using `practice_logs` consistently or document/deprecate it.
- Affected files: `lib/actions/dailyLesson.ts`, `lib/actions/conversation.ts`, `lib/actions/progress.ts`, `supabase/migrations/*` if schema changes are chosen later.
- Dependencies: Product decision on whether progress should be event-log based or derived from completed lessons/messages.
- Potential risks: Avoid double-counting practice if both derived activity and logs are used.

### Task 11: Decide What To Do With Standalone Mistake Analysis

- Objective: Either expose `analyzeMistake` as a user-facing/manual feature or remove/defer it with documentation.
- Affected files: `lib/ai/mistakeAnalyzer.ts`, `lib/actions/mistakes.ts`, possible new route/component.
- Dependencies: Product decision.
- Potential risks: Adding manual mistake creation should not create duplicate or conflicting correction records with conversation-backed mistakes.

### Task 12: Add Password Reset

- Objective: Complete basic auth account recovery.
- Affected files: `app/(auth)/*`, `components/auth-form.tsx` or new forms, `lib/actions/auth.ts`.
- Dependencies: Supabase Auth email configuration.
- Potential risks: Redirect/callback URLs must match deployed app settings in Supabase.

## Priority 3

### Task 13: Add CI

- Objective: Run lint, typecheck, tests, and build automatically.
- Affected files: `.github/workflows/*` or equivalent CI config.
- Dependencies: Repository hosting and secrets strategy.
- Potential risks: Build may require environment variables; use safe CI placeholders or configure secrets carefully.

### Task 14: Improve AI Job Robustness

- Objective: Move long AI generation out of synchronous user requests if deployment limits require it.
- Affected files: `lib/actions/dailyLesson.ts`, `lib/actions/conversation.ts`, possible queue/worker/Edge Function files.
- Dependencies: Deployment platform, Supabase Edge Functions or another queue/job mechanism.
- Potential risks: Must preserve idempotency, request IDs, generation status, and user ownership checks.

### Task 15: Add Observability For AI Failures

- Objective: Record provider failures and generation errors in a structured way.
- Affected files: likely new logging table migration, `lib/ai/providers/json.ts`, `lib/actions/dailyLesson.ts`, `lib/actions/conversation.ts`.
- Dependencies: Product/privacy decision on what can be logged.
- Potential risks: Do not log secrets or sensitive learner conversation content unnecessarily.

### Task 16: Improve Conversation Review UX

- Objective: Make corrections and prior conversations easier to study.
- Affected files: `components/conversation-workspace.tsx`, `components/mistake-notebook.tsx`, `app/conversation/page.tsx`, `app/mistakes/page.tsx`.
- Dependencies: Existing message and mistake schema.
- Potential risks: Avoid expensive unbounded message loading as conversation history grows.

### Task 17: Add Reminder Or Habit Support

- Objective: Help users return daily.
- Affected files: unknown until product direction is chosen; may require new migrations and notification/email service.
- Dependencies: Notification provider, email provider, or browser push strategy.
- Potential risks: Requires consent, scheduling, unsubscribe/settings, and privacy review.

### Task 18: Add Deployment Documentation

- Objective: Define the production deployment path.
- Affected files: `README.md`, deployment config files if chosen, environment documentation.
- Dependencies: Target platform such as Vercel, Supabase project, AI provider.
- Potential risks: Server actions, environment variables, Supabase Auth callback URLs, and AI request timeouts vary by platform.
