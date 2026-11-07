# DirectAdmin / Passenger deployment

This procedure deploys the already-built application. It does not run MySQL
migrations, change MySQL records, or set environment values automatically.

## Required server environment

Set these values in the DirectAdmin Node.js application environment. Keep them
server-side; never use `NEXT_PUBLIC_` for credentials.

```text
NODE_ENV=production
APP_URL=https://zaban.54i.ir
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=<database name>
MYSQL_USER=<database user>
MYSQL_PASSWORD=<database password>
BETTER_AUTH_SECRET=<at least 32 bytes, unique and private>
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=<private key>
AI_TIMEOUT_MS=20000
ZABAN_DATA_BACKEND=mysql
ZABAN_CUTOVER_APPROVED=yes
```

Optional `AI_LESSON_MODEL`, `AI_CONVERSATION_MODEL`, and `AI_ANALYSIS_MODEL`
override `AI_MODEL`. Leave them unset to use `openai/gpt-4o-mini` everywhere.

`ZABAN_DATA_BACKEND=mysql` and `ZABAN_CUTOVER_APPROVED=yes` are both required
for the MySQL/Better Auth request path. Removing either value reverts code to
the Supabase path after application rollback/restart; it does not reconcile
data written to MySQL while cutover was active.

## Build and release

1. Back up the current application release directory and record its Git SHA.
2. Create a MySQL backup through DirectAdmin or `mysqldump` from a secure host.
   Verify that the backup restores in a non-production database before relying
   on it.
3. Install the locked dependencies and build:

   ```bash
   npm ci
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

4. Confirm `.next/standalone/server.js`, `.next/standalone/.next/static`, and
   `.next/standalone/release-manifest.json` exist. The build explicitly traces
   the guarded MySQL/Better Auth runtime packages; it does not copy all of
   `node_modules` or build caches. Run `npm run test:standalone` after the build;
   it starts the artifact with an empty `NODE_PATH` outside the source tree.
5. Deploy the built release using the existing Passenger process and `app.js`.
   Do not edit `app.js` as part of ordinary release work.
6. Restart the Node.js application from DirectAdmin, then verify login, logout,
   an active learner request, a non-admin denial, and an administrator request.

The release artifact contains only the traced standalone runtime, `.next/static`,
optional `public`, `server.js`, and its manifest. `.next/cache` is not copied.
Build on a clean Linux/Node 22 host for the production-equivalent check; Windows
may report `EPERM` while Next creates traced directories even when compilation
and static generation succeed.

## OpenRouter smoke test

Run only in a secure server shell where the production-equivalent environment
is already available. It sends two small paid requests, writes no database
records, validates returned JSON, and never prints the API key.

```bash
AI_PROVIDER=openrouter AI_MODEL=openai/gpt-4o-mini npm run smoke:ai
```

The expected output contains `Daily lesson generation: schema valid.`,
`Conversation response: schema valid.`, and `AI provider smoke test passed.`
An HTTP 401 only verifies rejection or acceptance of credentials; it does not
prove this model can produce application-valid JSON.

## Rollback

1. Put the prior application release back in place and restart Passenger.
2. Restore the prior environment values. If reverting only the data path,
   unset either `ZABAN_DATA_BACKEND` or `ZABAN_CUTOVER_APPROVED` and restart.
3. Do not apply reverse schema changes or restore the MySQL backup unless the
   incident requires it and the restore has been reviewed. Application rollback
   alone does not remove newly-created Better Auth or learning records.
4. Record the incident window and decide whether MySQL records created during
   it require a one-time reconciliation.
## User AI settings (BYOK)

The MySQL-only user AI settings feature is additive and remains inactive until
the Better Auth/MySQL cutover is enabled. Before activation, generate a random
32-byte master key outside the repository and DocumentRoot, for example:

```bash
openssl rand -hex 32
```

Set the result as `ZABAN_AI_ENCRYPTION_KEY` in the private Passenger
environment/bootstrap used by `/home/jtphyqur/apps/zaban` (the same
`zaban-production.env` loading path already used by the application). Never
print it in deployment logs, commit it, or expose it as `NEXT_PUBLIC_*`.

Review and apply migrations in order during a maintenance window:

1. Review `drizzle/0002_medical_shinko_yamashiro.sql` against the target MySQL 8 schema.
2. Back up the database and apply the migration with the operator's migration procedure.
3. Set `ZABAN_AI_ENCRYPTION_KEY`, then smoke-test `/settings/ai` with two active users.
4. Leave shared-key policy disabled unless an authenticated administrator explicitly enables it.

Do not run migrations from the web process. If a migration fails, stop and restore
the database backup or use a reviewed compensating migration; do not edit old
foundation migrations or delete user data. Rotation requires a planned decrypt-
and-reencrypt operation while the old key is available, followed by replacement
of the private environment value. A missing or invalid key fails closed.

The page fetches the OpenRouter model catalog server-side with a short cache.
Model tests are explicit user actions and are not part of deployment smoke tests;
live requests and API credits must remain opt-in. No production deployment is
performed by this change.
