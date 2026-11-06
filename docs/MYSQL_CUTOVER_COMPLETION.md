# Zaban — بسته تجمیعی تکمیل کد مهاجرت

Base commit (D2): `f9f5d7b1b308f68203c43bcc29b2f3debbac1f5a`

This package is a code-completion candidate. It **does not** claim live MySQL, QA, or production acceptance.

## Included

- MySQL learning memory numeric-only refresh, with ownership checks, timezone-specific dates, correction dismissals, idempotent rebuild, snapshot validation, per-user DB row locking, and bounded evidence reads.
- Admin-created Better Auth credential accounts (no SMTP) with strongly hashed initial passwords, role check inside the same transaction, active profile, and audit metadata.
- Audit display maps the existing `user_updated` storage enum + `metadata.event=user_created` to a distinct view label. No production schema DDL is required for this addition.
- Lazy Supabase environment validation: MySQL-only requests no longer need Supabase environment values at module-import time; legacy Supabase accesses still validate credentials.
- Explicit production backend double opt-in (`ZABAN_DATA_BACKEND=mysql` AND `ZABAN_CUTOVER_APPROVED=yes`) and Better Auth route gating. Default remains Supabase.
- Administrator navigation, failed daily-lesson retry, memory refresh following lesson completion.
- A small unit suite for safety gates and memory aggregation; full local tests and build run before commit.
- A read-only host QA schema probe at `node scripts/mysql-qa-readiness.mjs` (requires `ZABAN_QA_DB_CHECK=enabled`, checks tables, InnoDB, foreign-key count; no writes).

## Important limitations

- This does not migrate historical Supabase records or credentials. Existing Supabase password hashes cannot be treated as Better Auth credentials. Accounts should be provisioned with secure initial passwords or a separately approved identity/data import.
- Before production cutover, independently test with a real MySQL QA instance on the actual DirectAdmin/Passenger host, and record pass/fail for login/session/logout, account create, suspend, admin role, lesson, chat, correction notebook, and memory rebuild. Back up both production application and database and rehearse rollback. Test time zone Asia/Tehran and custom domain HTTPS/cookies.
- The memory rebuild uses a strict 20,000 row limit per evidence class; it fails closed for very large histories instead of claiming an inaccurate snapshot. A scalable SQL aggregation would be needed for larger user histories.
- Existing Supabase dependency packages/imports stay in place until after QA and the approved cutover. They are not removed in this candidate.
- Production cutover cannot be performed safely by running this local script; it does not connect to the host or change production variables.
- MySQL account creation sets `email_verified=false`; Better Auth is configured to permit credential sign-in without email verification. Treat initial passwords as secrets; never email/commit/log them.

## QA procedure (not automated here)

1. Test on a separate QA app and database, with only dummy accounts. Never point the new code at live production data during initial QA.
2. Ensure database foundation and Better Auth migrations are installed on QA, schema constraints enforced, and required environment secrets are available only to the server.
3. Run dev mode with `ZABAN_MYSQL_PREVIEW=enabled`, `ZABAN_BETTER_AUTH_DEV_ROUTE=enabled`, MySQL variables, `APP_URL`, and `BETTER_AUTH_SECRET`. The public QA endpoint remains development-only.
4. For production cutover, after QA acceptance and backups, set `ZABAN_DATA_BACKEND=mysql` and `ZABAN_CUTOVER_APPROVED=yes` on the application server, with `NODE_ENV=production`, and redeploy/restart through the host control plane. Never set these values in client-side variables.
5. Rollback: unset either production opt-in; restore the prior release if necessary; do not automatically reconcile divergent new MySQL records with Supabase. A data consistency plan is needed for real users.
