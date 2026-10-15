# Phase 9 — Admin console and manual approval

## Audit and implementation scope

Read the repository structure, package manifest, README, CURRENT_STATE, NEXT_TASKS, all migrations, Phase 8/8.1 reports and implementation, session clients, middleware, auth/profile/learning actions, navigation, i18n, themes, and test infrastructure before edits. No AGENTS.md was found in the repository or its parent directories. Git already contained extensive uncommitted Phase 8.1 work; it was preserved.

Profiles previously appeared only after onboarding. Existing profile UPDATE privileges covered every column. There was an unused service-role client but no admin authorization. Learning actions already converged on requireProfile(). These facts determined the implementation: extend profiles, use the existing session client, restrict profile column writes, and put privileged operations behind narrowly scoped database functions. No provider, learning algorithm, theme system, authentication provider, or dependency was replaced.

## A. Architecture

Next.js server-rendered admin routes use the existing Supabase session client. Client forms call a Server Action, which calls requireAdmin(), validates input, and invokes one transactional RPC. Read functions join Auth email on the server; there is no duplicate user directory or email synchronization table. Lists and audit pages return at most 25 records per request with stable date/UUID ordering.

## B. Authentication

Supabase email/password signup and login remain unchanged in responsibility. Signup receives a session and redirects to /approval-pending. An Auth INSERT trigger creates a pending profile in the same database transaction. No approval email or SMTP integration was added.

Deployment MUST turn off the hosted Supabase email provider's **Confirm email** setting before accepting this signup flow. There is no local Supabase auth configuration in this repository, and hosted configuration was neither accessed nor changed. Keep password rules, rate limits, CAPTCHA and other protections as configured. A signup that unexpectedly returns no session reports localized temporary unavailability, never an instruction to check email. A failed request is not proof that no Auth account was created; inspect Auth records when correcting a misconfigured deployment.

## C. Authorization

requireAdmin() obtains the verified session user through requireUser()/auth.getUser(), checks app_metadata.role, and calls is_app_admin(). The latter reads current auth.users.raw_app_meta_data and requires an active profile. Every read/mutation RPC independently performs that same fresh database check. Revoked roles or suspended administrators cannot rely on an old JWT claim.

No client role, admin ID, hidden field, profile flag, or user_metadata claim grants authority. Target UUIDs select the record being managed, not the acting administrator. The actor is always auth.uid(). Self-mutation through the admin RPC is denied.

## D. User lifecycle

| Action | Required state | Result |
| --- | --- | --- |
| Signup | New Auth account | pending |
| Approve | pending | active |
| Reject | pending | rejected |
| Suspend | active | suspended |
| Reactivate | suspended | active |

Rejected-to-active is deliberately unsupported. Reconsidering a rejected registration needs a separately designed audited workflow. All existing Auth accounts at migration time remain active, including accounts without a profile. Existing profile values are preserved. New/incomplete profiles use empty level/goal until onboarding; no proficiency or learning goal is invented. Approved incomplete profiles finish onboarding before learning.

## E. Database changes

Migration: `supabase/migrations/202610160001_admin_approval.sql`.

- users_profile: status NOT NULL with an explicit four-value CHECK and final DEFAULT pending; approved_at and approved_by.
- Backfill missing profiles for legacy Auth accounts and preserve legacy access. Approval timestamps remain null for grandfathered accounts rather than inventing approval events.
- Create pending profiles on Auth registration.
- admin_audit_logs with actor/target UUID references, bounded JSON changes, action, ID, timestamp.
- Profile status/date/UUID index and audit date/target indexes.
- Narrow authorization, mutation, list, detail and audit functions with fixed empty search_path and qualified object names.
- Restrictive active-account policies on existing learning tables; a trigger protects the existing SECURITY DEFINER assistant-message insertion path.

The migration is transactional and ledger-managed, intentionally not a rerunnable backfill: rerunning must not reactivate suspended users. It locks auth.users during backfill/trigger installation to close the concurrent-registration gap. No user records are deleted. Brief write blocking is expected; schedule a maintenance window and assess table size first.

## F. RLS

Existing owner SELECT/UPDATE policies remain in place. INSERT/DELETE of profiles by normal users is removed. Table-level profile UPDATE is revoked and only the six existing preference columns receive UPDATE grants. Status, approval identity, timestamps, and owner cannot be written by ordinary users. Learning policies remain owner-scoped and additionally require active status. Admin access does not grant broad table reads or writes.

Audit RLS is enabled with no user table policies or grants. Only guarded SECURITY DEFINER RPCs access it. Public/anonymous execution is revoked on all new functions; authenticated EXECUTE grants name specific functions. The existing learning memory owner policies and algorithms are preserved.

## G. Admin role mechanism

One trusted role: `auth.users.raw_app_meta_data.role = "admin"`, exposed by Supabase as app_metadata.role. Only the project owner or trusted Auth administrative tooling can grant it. Do not set user_metadata or create an editable is_admin profile column.

Bootstrap one **existing active, verified operator account** through the Supabase owner SQL editor, substituting the independently verified UUID:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where id = '<verified-operator-uuid>'::uuid;
```

Check exactly one affected row and that its users_profile.status is active. Use an existing account before the migration for first bootstrap; new accounts are pending. Reauthenticate afterward. Role grants/revocations are owner operations outside this console and outside its audit table; retain the platform/operator change record. Removing this role immediately prevents RPC access.

## H. Server-side privileged operations

admin_change_user locks the target row, enforces exact transitions, updates conditionally, and inserts the audit entry in the same transaction. Repeated approvals fail safely. Audit failure rolls back the user change. Profile edits accept only level, goal, daily_minutes, timezone, interface_language, theme_preference. Existing Zod validation is reused, unknown profile fields are rejected, and the SQL function also validates its inputs because RPCs can be invoked directly. Editable preferences use serialized last-write-wins updates; status transitions do not.

No Phase 9 path uses the service-role client or key. The existing unused client now has an explicit server-only import. Optional admin-created accounts and permanent deletion were deferred: secure initial password handling/reset and deliberate account-deletion retention/recovery need dedicated workflows. No deletion controls or half-implemented Auth mutations are present.

## I. Audit logging

Successful state transitions and actual preference changes create one record. The database constructs bounded `changes: {field: {from, to}}` metadata; the caller cannot submit metadata or actor identity. No passwords, tokens, email copies, or conversation text are logged. Foreign keys use ON DELETE SET NULL so audit events survive an external Auth deletion, although that removes their UUID attribution. Direct owner changes are outside this application audit scope.

## J. Routes

- /admin: overview counts and first 25 pending requests.
- /admin/users: server-side email substring search, status filter, pagination.
- /admin/users/[id]: account details, preferences, approval actions, bounded saved learning summary.
- /admin/audit: paginated activity.
- /approval-pending, /account-suspended, /account-rejected: intentional status pages with refresh, logout, language and theme controls.

Middleware refreshes cookies and preserves them on redirects. Admin routes require a session and role; server authorization remains authoritative. Status pages do not loop; active users return to dashboard/onboarding. Every existing learning Server Action goes through requireProfile(), which now requires active status even without middleware.

## K. UI components

Shared account-status page, user list, native confirmation dialog, profile editor, pagination, and learning summary reuse Card, Button, Input, typography and palette tokens. User rows stack on narrow screens. Long emails and UUIDs wrap. Actions wrap with touch-sized controls. Dialogs are width/height bounded, scrollable, keyboard accessible and support native Escape/focus handling. Existing focus-visible and reduced-motion styles apply.

No display-name field exists in the profile architecture, so none was invented. Last sign-in is labeled accurately and is not claimed to be learning activity. Saved memory uses Phase 8.1 validation/derivation, fixed numeric aggregates and at most three learning patterns. Its as-of date is shown; viewing it does not rebuild another user's memory or invoke AI. Missing/corrupt memory shows an unavailable state.

## L. i18n

All new visible copy is in the existing en.json/fa.json catalogs. Status/action/error labels, confirmations, filters, empty states and profile fields have Persian translations. Layout direction and fonts come from the existing root layout. Numbers and dates use Intl with the interface locale; emails/UUIDs use bidi isolation. Account times explicitly use UTC. Learning summaries display their saved learner-local as-of date.

## M. Theme

The existing light/dark/system/auto provider and stored preferences are reused. Surfaces, borders, text and buttons use existing semantic color tokens. No new theme store, provider, UI library, or runtime dependency was added.

## N. Tests

Run:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
node scripts/test-learning-memory-sql.mjs C:/Users/alikhani98/AppData/Local/Temp/zaban-phase9-validation/node_modules/@electric-sql/pglite
```

The last command uses an externally installed temporary PGlite runtime, as in Phase 8.1; change the path to your installation. It is an isolated in-memory database, not a Supabase connection. The runner's minimal Auth schema was extended for metadata/email/creation dates. Phase 8.1 fixtures now upsert active profiles because registration creates them automatically.

Coverage includes authorization, forged metadata, session expiry, all four statuses, middleware loop avoidance and refreshed cookies, direct learning-action gating, transitions, invalid/missing targets, input allowlists, bilingual catalog parity, all theme values, and safe error mapping. SQL tests execute all migrations and cover legacy account preservation, pending defaults, ownership, blocked profile status/owner changes, preference edits, audit tampering, admin reads/updates, role revocation, invalid/repeated transitions, and audit rollback. Existing learning-memory integration assertions still pass.

No browser/viewport fixture infrastructure existed in this checkout. Automated tests do not constitute visual verification. Live authenticated browser checks at 360/390/768/1024/1440px, both languages and all theme modes remain a deployment acceptance step.

## O. Security verification

- Session identity is verified server-side; database functions independently check current trusted role and active account.
- RLS still enforces ownership and now active learning access.
- Protected profile columns cannot be self-written; profiles cannot be deleted/recreated to evade status.
- Restrictive policies also cover learning_memory; assistant-message RPC writes have an additional guard.
- State transitions are locked and audited atomically.
- No service-role credentials are used or serialized by Phase 9.
- SQL errors become localized safe codes; no raw database message reaches admin UI.
- Admin listing joins Auth in a bounded server response, with no N+1 lookups.
- No production data, Auth configuration, role assignments or migrations were changed during implementation.

## P. Production migration instructions

1. Back up the database and review existing Auth/profile counts and current policies/default privileges in staging. Repository migrations are the baseline; unknown production drift has not been inspected.
2. Verify all earlier migrations, including `202610140002_learning_memory.sql`, are applied in order.
3. Schedule coordinated migration/app deployment: old onboarding inserts are incompatible with the new trigger and profile grants. Stop signup briefly during this rollout; do not run mismatched application/schema versions.
4. Apply `202610160001_admin_approval.sql` once through the normal Supabase migration ledger as the owner. Do not replay prior migrations or run test fixture SQL in production.
5. Verify every legacy Auth account has an active profile, existing preferences are unchanged, future default is pending, trigger/policies/grants/functions exist, and the audit table has no normal-user writes.
6. Bootstrap the independently verified existing operator as above. No public admin enrollment exists.
7. Turn off **Confirm email** for Supabase email/password authentication. Keep other Auth protections. Existing unconfirmed legacy accounts need separate review; this migration deliberately does not mark old emails confirmed or change Auth identities.
8. Deploy this application build, then test a new signup: session issued without email, pending page, no direct learning access, administrator approval, onboarding, then learning.
9. Test suspend/reactivate/reject, non-admin admin denial, audit entries, Persian RTL, mobile layouts and all theme preferences in staging before promoting.

This migration was tested locally only and has NOT been applied to production. Rollback must be coordinated with application rollback; do not casually drop status/audit records or replay legacy backfills.

## Q. Remaining risks and limits

- Hosted Auth settings, production schema drift, real sessions and visual browser behavior require staging verification.
- Without email confirmation, possession of an entered email is not verified by this flow. Administrators must use their enrollment verification process before approval.
- Optional user creation, password reset/change enforcement, deletion and rejected-account reconsideration are deferred.
- Substring email search, exact totals and offset pagination can become expensive at large scale; responses are bounded, but database work grows with user count. Pagination is capped at 10,000 pages.
- Saved learning summaries may be stale; viewing them does not refresh another user's data.
- An AI request already started before suspension may finish consuming provider resources; subsequent database writes are denied and future learning requests are blocked.
- Preference edits serialize but use last-write-wins semantics. Native dialog layout and focus still need browser acceptance testing.
- No automatic commit was made. Pre-existing Phase 8.1 changes remain in the working tree.

## Validation results — 2026-10-16

| Check | Result |
| --- | --- |
| npm run typecheck | Passed |
| npm test | Passed: 17 files, 135 tests |
| npm run lint | Passed |
| npm run build | Passed: optimized build with all admin/status routes |
| SQL integration | Passed: all migrations, legacy account preservation, approval security and existing memory suite |
| git diff --check | Passed |
| Live Supabase / browser viewports | Not performed; staging acceptance required |

## Phase 9 file inventory

New files:

- `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/users/page.tsx`, `app/admin/users/[id]/page.tsx`, `app/admin/audit/page.tsx`
- `app/approval-pending/page.tsx`, `app/account-suspended/page.tsx`, `app/account-rejected/page.tsx`
- `components/account-status-page.tsx`
- `components/admin/user-actions.tsx`, `components/admin/user-editor.tsx`, `components/admin/user-list.tsx`, `components/admin/learning-summary.tsx`
- `lib/admin/auth.ts`, `lib/admin/data.ts`, `lib/admin/model.ts`, `lib/actions/admin.ts`
- `supabase/migrations/202610160001_admin_approval.sql`, `supabase/tests/admin_approval.sql`
- `tests/admin.test.ts`, `tests/adminAuthorization.test.ts`, `tests/approvalMiddleware.test.ts`, `tests/approvalProfile.test.ts`
- `docs/PHASE_9_ADMIN.md`

Updated integrations:

- `app/(auth)/login/page.tsx`, `app/onboarding/page.tsx`
- `components/app-nav.tsx`, `components/auth-form.tsx`
- `lib/actions/auth.ts`, `lib/actions/profile.ts`
- `lib/supabase/middleware.ts`, `lib/supabase/admin.ts`
- `lib/i18n/messages/en.json`, `lib/i18n/messages/fa.json`, `types/database.ts`
- `scripts/test-learning-memory-sql.mjs`, `supabase/tests/learning_memory.sql` (existing Phase 8.1 test harness/fixtures adapted for automatic profile creation)
- `README.md`, `CURRENT_STATE.md`, `NEXT_TASKS.md`

Package manifest and lockfile are unchanged. PGlite and the formatter were installed outside the project in a temporary validation directory, not added as dependencies.

## Final working-tree status

This includes pre-existing Phase 8.1 changes, not just this implementation. No commit or reset was performed.

```text
 M CURRENT_STATE.md
 M NEXT_TASKS.md
 M README.md
 M app/(auth)/login/page.tsx
 M app/dashboard/page.tsx
 M app/globals.css
 M app/onboarding/page.tsx
 M app/progress/page.tsx
 M components/app-nav.tsx
 M components/auth-form.tsx
 M lib/actions/auth.ts
 M lib/actions/conversation.ts
 M lib/actions/dailyLesson.ts
 M lib/actions/mistakes.ts
 M lib/actions/profile.ts
 M lib/ai/mistakeAnalyzer.ts
 M lib/ai/prompts/analysis.ts
 M lib/ai/prompts/context.ts
 M lib/ai/prompts/conversation.ts
 M lib/ai/prompts/lesson.ts
 M lib/i18n/messages/en.json
 M lib/i18n/messages/fa.json
 M lib/learner/context.ts
 M lib/learner/focus.ts
 M lib/learner/load.ts
 M lib/supabase/admin.ts
 M lib/supabase/middleware.ts
 M supabase/.temp/cli-latest
 M tests/learnerContextLoad.test.ts
 M types/database.ts
 M vitest.config.mjs
?? app/account-rejected/
?? app/account-suspended/
?? app/admin/
?? app/approval-pending/
?? components/account-status-page.tsx
?? components/admin/
?? components/coach/LearningMemoryInsight.tsx
?? components/coach/WeeklyCoachReport.tsx
?? docs/PHASE_8_1_MEMORY.md
?? docs/PHASE_9_ADMIN.md
?? lib/actions/admin.ts
?? lib/admin/
?? lib/memory/
?? scripts/test-learning-memory-sql.mjs
?? supabase/migrations/202610140002_learning_memory.sql
?? supabase/migrations/202610160001_admin_approval.sql
?? supabase/tests/
?? tests/admin.test.ts
?? tests/adminAuthorization.test.ts
?? tests/approvalMiddleware.test.ts
?? tests/approvalProfile.test.ts
?? tests/learningMemory.test.ts
?? tests/learningMemoryLoad.test.ts
?? tests/memoryEvents.test.ts
?? tests/weeklyCoachReport.test.ts
```
