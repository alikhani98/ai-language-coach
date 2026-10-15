# Phase 8.1 — Long-term learning memory

## A. Architecture decisions

Existing lessons, conversations, messages, and notebook entries remain the evidence source. The old learner context loaded only 8 mistakes, 5 lessons, and 4 conversations. A compact persistent snapshot now supplies long-term signals alongside that recent context.

`lib/memory/learnerMemory.ts` owns the validated evidence schema, pattern thresholds, strengths, milestones, recommendations, and bounded prompt projection. `load.ts` owns session-authenticated persistence and graceful recovery. `presentation.ts` owns bilingual, evidence-based report copy.

The snapshot is derived deterministically from saved learning evidence. It does not require another model call or retain model-written biographies. AI-generated corrections contribute through the existing saved conversation workflow. Standalone mistake analysis can receive memory context but does not persist an unconfirmed analysis as fact.

Memory includes:

- Strengths supported by practice consistency and repeated topic exposure, without inferred skill mastery.
- Up to 3 recurring weaknesses, requiring at least 3 corrections across 2 independent evidence groups. High support requires 6 corrections across 3 groups. These support labels are not calibrated probabilities.
- Grammar issues, including the existing conservative past-simple heuristic; vocabulary gaps remain category-level signals rather than a copied list of personal sentences.
- Up to 2 practiced conversation topics and 2 completed activity milestones. No rewards, points, or new gamification flow.
- A recommended future focus, prioritizing repeated patterns seen in the current window. Older patterns remain review candidates and are identified as historical in the UI.

Conversation evidence groups are distinct conversations. Unsourced legacy/manual notebook evidence is grouped by local date. Linked notebook copies never count again. Dismissed corrections are excluded from both saved assistant feedback and notebook evidence.

Rebuilds run after successful lesson completion, saved answered conversation turns, conversation completion, notebook sync, and notebook dismissal. Completion retries rebuild rather than increment. A per-owner transaction lock serializes database rebuilds. No new event ledger or duplicated profile fields are needed.

On reads, snapshots are reused for at most five minutes and only for the learner's current local date. Missing, stale, corrupt, and wrong-owner snapshots trigger a canonical rebuild. This also backfills existing learners. Each optional database read/rebuild request has a four-second abort signal. Memory failures cannot prevent the existing learning flow; UI reports distinguish unavailable history from zero activity.

## B. Database changes

Migration: `supabase/migrations/202610140002_learning_memory.sql`.

One new table, `learning_memory`, stores one versioned row per user:

| Column | Purpose |
| --- | --- |
| `user_id` | Primary key and cascading ownership reference to `auth.users` |
| `schema_version` | Snapshot format version, currently 1 |
| `as_of` | Learner-local date for rolling-window freshness |
| `snapshot` | Fixed learning codes and aggregate integer counts only |
| `updated_at` | Cache freshness |

The JSON snapshot contains lifetime totals, current/previous seven-day aggregates, correction categories, and practiced topic counts. Its output size is bounded by fixed category/topic enums; a database constraint also caps the stored JSON at 12 KB. Unknown keys, strings, arrays, negative counts, and arbitrary text are rejected by the database privacy validator. Zod additionally validates the exact shape and evidence consistency when loading it.

`refresh_learning_memory()` has no arguments and resolves ownership from `auth.uid()`. It uses `SECURITY INVOKER`, existing source-table RLS, explicit owner filters, and the profile's existing timezone. A helper classifies only controlled learning-area codes. An additional message index supports request pairing and evidence lookup.

The migration is included and tested in an isolated database. **It has not been applied to the live Supabase project.** Apply migrations in order using the project's normal migration workflow before enabling persistent memory in a deployment. No service-role key or live learner records were used during implementation or validation.

## C. AI prompt changes

- `LearnerContext` now optionally carries `learningMemory`.
- The shared prompt helper serializes a compact projection: 3 weaknesses, 3 grammar codes, 2 strengths, 2 topics, 2 milestones, one recommended focus, recent practice counts, and at most 2 observed feedback trends. It does not serialize the full snapshot or weekly comparison data.
- Daily lesson prompts revisit repeated patterns, recycle relevant material, and vary previous tasks.
- Conversation prompts gently revisit the recommended focus within the chosen topic, without inventing personal facts.
- Mistake-analysis input accepts learner context; its prompt forbids inventing errors to match historical patterns.
- Existing progress-summary generation inherits memory through the shared context helper.
- The provider interface and provider-specific adapters are unchanged. No extra AI requests are introduced for memory generation or weekly reports.

The existing bounded recent learner excerpts still travel through their existing AI flows. The new numeric-only memory storage does not replace or expand those raw-history limits, and the memory privacy statement applies specifically to coach memory, not to the existing conversation/notebook records.

## Weekly report semantics

`WeeklyCoachReport` appears on Dashboard and Progress. `LearningMemoryInsight` supplies the dashboard's “Your coach noticed” / “مربی شما متوجه شد” section. Both reuse existing coach primitives, typography, theme colors, RTL layout, and responsive spacing.

- Reports use rolling seven local dates, including today; the comparison window is the preceding seven local dates. This is not a scheduled calendar-week email or an archived report series.
- Completed sessions are completed ready lessons plus ended conversations containing at least one matched user/assistant exchange. Empty ended conversations do not count.
- Vocabulary counts describe review opportunities in completed lessons, including repeated words. They do not imply unique vocabulary acquisition or mastery.
- Grammar notes describe completed sentence practice, saved conversation grammar feedback, and repeated patterns. Independent speaking and grammar accuracy remain unassessed.
- A lower-feedback-rate observation requires at least 10 answered exchanges in each window, at least 3 previous corrections in that area, and at least a 25% rate reduction. Manual notebook entries are excluded from these rates. Copy explicitly notes that topics and difficulty can differ; this is not a causal or proficiency claim.
- Sessions, reviews, and exchanges use locale numerals. Persian copy and the existing Vazirmatn/Inter system are preserved. Empty and unavailable states have distinct meanings.

## D. Files changed

New domain and UI:

- `lib/memory/learnerMemory.ts`
- `lib/memory/load.ts`
- `lib/memory/presentation.ts`
- `components/coach/LearningMemoryInsight.tsx`
- `components/coach/WeeklyCoachReport.tsx`

Database and integration:

- `supabase/migrations/202610140002_learning_memory.sql`
- `types/database.ts`
- `lib/learner/context.ts`
- `lib/learner/load.ts`
- `lib/learner/focus.ts`
- `lib/actions/dailyLesson.ts`
- `lib/actions/conversation.ts`
- `lib/actions/mistakes.ts`
- `lib/ai/mistakeAnalyzer.ts`
- `lib/ai/prompts/context.ts`
- `lib/ai/prompts/lesson.ts`
- `lib/ai/prompts/conversation.ts`
- `lib/ai/prompts/analysis.ts`
- `app/dashboard/page.tsx`
- `app/progress/page.tsx`
- `app/globals.css`
- `lib/i18n/messages/en.json`
- `lib/i18n/messages/fa.json`

Validation and documentation:

- `tests/learningMemory.test.ts`
- `tests/learningMemoryLoad.test.ts`
- `tests/memoryEvents.test.ts`
- `tests/weeklyCoachReport.test.ts`
- `tests/learnerContextLoad.test.ts`
- `vitest.config.mjs`
- `supabase/tests/learning_memory.sql`
- `scripts/test-learning-memory-sql.mjs`
- `docs/PHASE_8_1_MEMORY.md`

Vitest now transforms JSX for server-rendered component checks. Mocked loader suites reset module caches to keep session mocks independent under the existing non-isolated test-worker setting. No package manifest, lockfile, runtime dependency, auth flow, route definition, or provider adapter was changed.

## E. Security review

- Owner-only SELECT/INSERT/UPDATE/DELETE policies with both `USING` and `WITH CHECK` where required; changing the owner is rejected.
- The application verifies the session user's ID against the internally supplied authenticated profile before querying the cache.
- Every memory/history source query is explicitly owner-scoped in addition to RLS. The rebuild RPC accepts no user IDs or caller-provided snapshot data.
- Anonymous table access and execution of the rebuild/helper functions are revoked. No service-role client is used by memory.
- Fixed-code, numeric-only storage prevents persisting names, emails, locations, conversational biographies, instructions, or sensitive sentences as memory.
- Account deletion cascades to memory. Deleting a snapshot alone is a cache reset: it rebuilds from retained learning records. Dismissing a notebook correction removes that evidence from subsequent rebuilds.
- Snapshots are learning recommendations, never authorization inputs or cross-user shared state.

## F. Tests

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed: 13 files, 93 tests |
| `npm run build` | Passed: optimized production build |
| SQL integration | Passed against all migrations in isolated PostgreSQL/PGlite |

New tests cover thresholds, historical vs recent focus, low-volume and rate comparisons, privacy rejection, prompt budgets, both report languages, unavailable vs empty UI, session ownership, TTL recovery, missing migrations, transport errors, completion retries, successful/failed event writes, notebook updates, and non-fatal memory failure.

SQL integration executes the real migrations and tests two authenticated owners, anonymous denial, missing identity, cross-user reads/writes/deletes/inserts, owner reassignment, source deduplication, source dismissal, empty conversations, orphan messages, all-time history, current/previous windows, timezone boundaries, numeric-only storage, and repeatable rebuilds. Fixtures and changes roll back.

The runner was tested with an externally installed temporary `@electric-sql/pglite` 0.5.10 runtime, with a minimal Supabase `auth.uid()` contract. It skips only the initial `pgcrypto` extension declaration because UUID generation is built into that PostgreSQL runtime. It neither connects to Supabase nor replaces production dependencies. To repeat locally:

```powershell
$memoryTestDirectory = Join-Path $env:TEMP 'zaban-memory-validation'
npm install --prefix $memoryTestDirectory --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.10
node scripts/test-learning-memory-sql.mjs "$memoryTestDirectory/node_modules/@electric-sql/pglite"
```

Alternatively, execute `supabase/tests/learning_memory.sql` as the migration owner against a disposable local PostgreSQL/Supabase database after applying all migrations. Do not run fixture SQL against production.

## G. Remaining risks and limits

- The live migration and authenticated end-to-end smoke test remain deployment steps. Missing memory storage degrades gracefully until then.
- SQL tests use an isolated runtime and a minimal auth contract; they do not verify the live Supabase project's configuration or real JWT issuance.
- Per-user rebuilds aggregate lifetime source history in the database, so cost grows with retained history. Output and AI context stay bounded; large-account latency should be monitored before considering incremental aggregation. Optional requests are time-bounded and stale snapshots heal on read.
- Cached data can lag external/manual database changes by up to five minutes. Failed event refreshes retry through later reads/events. Profile timezone changes can have the same short freshness delay.
- Classification is deliberately conservative but heuristic, and feedback rates depend on task mix and AI correction behavior. No proficiency or measured accuracy inference is made.
- Vocabulary gaps are category-level. No word-level retention assessment is introduced in this phase.
- Weekly summaries are regenerated rolling views over retained history, not permanent weekly report archives. Deleting source evidence can change a rebuilt report.
- Persian/English server-rendered UI was tested; browser screenshots and interactive viewport/theme smoke tests were not verified in this phase.

Work stops at Phase 8.1.
