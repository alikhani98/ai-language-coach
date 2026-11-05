# MySQL migration mapping

## Scope and safety boundary

Phase 1 adds a parallel, version-controlled MySQL 8.0.45 schema. It does not
connect to MySQL, copy data, change Supabase, alter authentication, or change a
request path. Supabase remains authoritative until a separately reviewed
cutover.

The MySQL migration is [0000_mysql_foundation.sql](../drizzle/0000_mysql_foundation.sql).
It must be reviewed and applied manually through the hosting control plane only
after a backup, a migration runner, and a rollback plan exist.

## Object mapping

| PostgreSQL object | MySQL object | Phase 1 behavior |
| --- | --- | --- |
| `auth.users` | `app_users` | New stable application identity bridge. Existing Supabase IDs map to `id` and `auth_subject_id`; Better Auth remains deferred. No email is copied in this phase. |
| `users_profile` | `users_profile` | Preserves profile, preferences, account status, approval attribution, and one profile per user. |
| `daily_lessons` | `daily_lessons` | Preserves one lesson per user/local date, words JSON, completion, and generation state. |
| `conversations` | `conversations` | Preserves topics, legacy JSON `messages`, feedback, lifecycle, and active-generation lock. Normalized messages remain authoritative. |
| `conversation_messages` | `conversation_messages` | Preserves role, correction JSON, request idempotency, ordering indexes, and ownership fields. |
| `mistakes` | `mistakes` | Preserves source correction linkage and `dismissed_at` soft removal. |
| `practice_logs` | `practice_logs` | Preserves generic activity/duration records even though current code does not use them. |
| `learning_memory` | `learning_memory` | Preserves bounded numeric snapshot cache, schema version, and profile-local snapshot date. |
| `admin_audit_logs` | `admin_audit_logs` | Preserves immutable admin mutation audit shape and metadata size/object constraints. |
| indexes in all migrations | named MySQL indexes | Retained for user/date, user/time, status, category, request, and audit access paths. |

## PostgreSQL features that do not transfer directly

### UUIDs

PostgreSQL generated UUID defaults become canonical `CHAR(36)` ASCII keys.
Server-side application services must generate UUIDs. This avoids a binary UUID
conversion during import and retains current string IDs. Every foreign key uses
the same representation and explicit delete behavior.

### JSON and JSONB

MySQL `JSON` validates JSON syntax but does not provide PostgreSQL `jsonb`
operators or the recursive `valid_learning_memory` function. Basic array/object
and byte-size checks remain in SQL. Zod's existing `memorySnapshotSchema` must
validate learning-memory snapshots before writes; the later repository service
must keep that check mandatory.

### UTC timestamps and dates

The schema uses `DATETIME(3)` rather than `TIMESTAMP`, avoiding implicit MySQL
timezone conversion. Values are UTC by contract. The server-only pool uses
`timezone: "Z"`; writers must send UTC timestamps. `DATE` still represents the
learner-local date calculated from `users_profile.timezone`, as it does today.
Before any deployment, verify the MySQL session/server timezone and test the
Asia/Tehran day-boundary cases.

### Collation and comparisons

Tables explicitly use `utf8mb4_unicode_ci` for Persian/English data. UUID
columns use ASCII binary collation. Application code must use the same
case-insensitive semantics deliberately for admin email search after Better Auth
is introduced; there is no copied email column in Phase 1.

### Unique constraints with `NULL`

MySQL permits multiple `NULL` values in a unique index. That intentionally
matches the current PostgreSQL behavior for nullable request IDs and nullable
manual mistake source pairs. A non-null request ID remains unique per
conversation and role; services must require it for generated conversation
messages.

### Transactions, foreign keys, and cascading deletes

All tables use InnoDB. Foreign keys preserve cascade deletion for user-owned
records and `SET NULL` for audit attribution and source-message retention.
MySQL DDL has implicit commits, so schema deployment must not assume PostgreSQL
transactional DDL. Later multi-write services must use `db.transaction` and
lock rows explicitly where the existing RPC currently uses `FOR UPDATE`.

## Authorization and RPC replacement plan

MySQL has no equivalent of Supabase JWT RLS. No browser code may receive MySQL
credentials or query this database. Later server-side repositories must accept
the authenticated actor from the session, apply `user_id` predicates on every
query, and check `users_profile.status = 'active'` for learning writes/reads.
Admin operations must re-check an application-owned admin role inside their
transaction and write the audit row in that same transaction.

| PostgreSQL function or policy | Replacement after cutover |
| --- | --- |
| table RLS ownership policies | Repository methods scoped by authenticated `app_users.id`; never caller-supplied ownership. |
| restrictive `has_active_account` policy | Server authorization guard before all learning domain operations. |
| `is_app_admin` | Server authorization guard using `app_users.role` plus active profile status. |
| `insert_assistant_conversation_message` | Transactional conversation service: verify owner/status, insert idempotently, then return the inserted UUID. |
| `refresh_learning_memory` and `learning_memory_area` | Server service using parameterized queries and existing Zod validation. It must preserve timezone conversion, idempotent rebuilds, privacy filtering, and per-user serialization. |
| `admin_change_user` | Transactional admin service: lock target profile, validate legal transition/profile payload, prevent self-change, update, then insert audit row. |
| `admin_users`, `admin_user_detail`, `admin_audit` | Parameterized, bounded server repository queries with authorization and pagination validation. |
| profile creation trigger | Better Auth lifecycle hook or a transaction in the future sign-up service. |
| active message trigger | Conversation service active-account check before every insert. |

## Deferred Better Auth work

Better Auth packages, tables, sessions, password credentials, callback routes,
and the authentication middleware are deliberately absent. `app_users` stores a
provider/subject pair so existing Supabase UUIDs can remain stable while a
future Better Auth account maps to the same application identity. The cutover
must decide whether Better Auth IDs are generated as UUIDs or mapped through a
separate account table, migrate verified emails/password material safely, and
invalidate Supabase sessions only after the server-side data path is complete.

Before Phase 2 starts, record and approve these decisions:

- Use `app_users.id` as the stable application UUID. Better Auth's `user.id`
  should either equal it or have a documented one-to-one mapping; domain tables
  must never point at a provider account ID.
- Create Better Auth's `user`, `account`, `session`, and `verification` tables
  separately. `account` records hold provider identities and password hashes;
  application tables must never store passwords, password hashes, or session
  tokens.
- Use Better Auth's approved password hashing implementation and parameters.
  Do not invent an application password column or import unverifiable Supabase
  password material.
- Make every session validation consult the application profile status. A
  suspended, rejected, or pending user must be denied even if a pre-existing
  Better Auth session token remains otherwise valid; the cutover must also
  revoke that user's active sessions transactionally.
- Bootstrap the first administrator through a one-time, access-controlled
  migration procedure that writes `app_users.role = 'admin'` and an audit
  record. There is intentionally no browser-accessible role bootstrap path.

## Open risks and compatibility questions

- MySQL `CHECK` enforcement is available in 8.0.45, but the deployment process
  must verify it uses this server and InnoDB after application.
- `utf8mb4_unicode_ci` is intentionally selected from the confirmed host
  configuration. Email uniqueness/search semantics need fixture tests when
  Better Auth is added.
- The stored learning-memory function performs timezone-sensitive aggregates
  and advisory locking. It needs a dedicated parity test suite before cutover.
- The migration has no migration ledger runner yet. Drizzle generation is
  version controlled, but applying it must wait for a reviewed operational
  migration procedure and backup plan.
- Phase 1 intentionally has no source-data import. Import order will be
  `app_users`, profiles, parent records, child messages/mistakes, memory, then
  audit logs; imported IDs must be validated before foreign keys are enabled.
