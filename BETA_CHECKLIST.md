# AI Language Coach Beta Checklist

## Technical

- [ ] Build passes with production environment variables.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is configured.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] `AI_PROVIDER=openrouter` is configured.
- [ ] `OPENROUTER_API_KEY` is configured server-side only.
- [ ] `AI_MODEL` is configured.
- [ ] Supabase migrations `202610120001` through `202610120005` are applied in order.
- [ ] Tables exist: `users_profile`, `daily_lessons`, `conversations`, `conversation_messages`, `mistakes`, `practice_logs`.
- [ ] RLS is enabled on all user-owned tables.
- [ ] RLS policies prevent cross-user reads and writes.
- [ ] RPC `public.insert_assistant_conversation_message` exists.
- [ ] Direct user inserts into `conversation_messages` only allow `role = 'user'`.
- [ ] AI provider smoke test passes with real staging or production credentials.

## Product

- [ ] Signup flow tested.
- [ ] Login flow tested.
- [ ] Logout flow tested.
- [ ] Protected routes redirect unauthenticated users to `/login`.
- [ ] New authenticated users without a profile redirect to `/onboarding`.
- [ ] Onboarding creates a profile and redirects to `/dashboard`.
- [ ] First daily lesson generated.
- [ ] First daily lesson completed.
- [ ] First conversation started.
- [ ] First conversation reply generated.
- [ ] Conversation corrections appear in mistakes.
- [ ] Progress page shows completed practice activity.

## Manual Production Checks

1. Apply migrations in timestamp order.
2. Verify tables, indexes, policies, and RPC functions in Supabase.
3. Configure deployment environment variables.
4. Run `npm run build`.
5. Run `npm run smoke:ai` with real AI provider credentials in a secure server shell.
6. Complete the signup, onboarding, lesson, conversation, mistakes, and progress flows with a beta test account.
