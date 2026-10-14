# Phase 8 — AI Coach Intelligence Layer

## Architecture decisions

The learner context is derived at request time from the existing authenticated profile and session-scoped Supabase queries. It stores no second copy of profile data. Queries explicitly filter by the authenticated user ID and retain the existing RLS protection; no admin client is used.

History is limited to eight undismissed mistakes, five ready lessons, and four recent conversations. Mistakes retain original/corrected sentences and explanations; lesson summaries use short reading and speaking excerpts. Weaknesses are ranked by frequency within this sample. Past-tense classification uses explicit correction explanations or a changed irregular verb paired with a past-time cue. Remaining categories and vocabulary corrections are passed to the model directly. Explanation style derives from the existing interface language, rather than adding a preference field.

Daily generation passes this context through the existing AI service and validated lesson schema. Prompt instructions prioritize recurring weaknesses, connect to previous lessons, revisit vocabulary, and incorporate a correction exercise in the existing speaking task. Same-day ready lessons remain reusable; existing lesson and conversation persistence flows are preserved.

Conversation prompts contain level, goal, learner mistakes, the latest lesson focus, a topic objective, up to eight recent turns of 500 characters each, and up to 900 characters of earlier learner excerpts. Extractive memory preserves the first two and latest four earlier learner turns within the existing 60-message session bound. It avoids an extra summarization model request and duplicate conversation storage. Long sessions retain a bounded sample rather than all details. Latest messages are treated as learning data, with role and output constraints in the system prompt.

Prompts are centralized under `lib/ai/prompts/`. All AI results remain Zod-validated JSON. Lesson, conversation, and analysis requests route through optional environment overrides, each falling back to the existing `AI_MODEL`. Summaries use the existing analysis provider method, so the provider interface remains compatible.

Timeouts cover the full response body. A transient error receives at most one retry; configuration and invalid-output errors fail immediately. Environment timeouts are capped at 45 seconds per attempt, keeping the two-attempt budget below the existing two-minute conversation lock expiry. Failed lessons return a retryable failed state, and conversation failures release their lock and show localized fallback copy. Optional history failures fall back to profile context.

Completion summaries report observed practice and recommend a next task. They do not claim measured confidence, fluency, mastery, or pronunciation improvements. Empty conversations use a deterministic summary without an AI call. Conversation summaries are stored as validated JSON in the existing `conversations.feedback` text field. Legacy feedback safely falls back to a derived summary. Practice summaries are returned by the completion action; after reload, the UI reconstructs a factual localized summary from the saved lesson. Summary failures do not undo completion. Conversation completion checks the generation lock atomically before ending the session.

`AIProgressSummary` reuses theme tokens and inherited RTL layout, with automatic text direction for generated notes. Dashboard, practice, and conversation show translated focus copy. English target learning content remains English.

## Database changes

None. No migration, new table, profile field, authentication change, or RLS policy change. The existing conversation feedback column now holds structured completion-summary JSON for newly ended sessions. No dependencies were added.

## Files changed

- Learner context: `lib/learner/context.ts`, `lib/learner/load.ts`, `lib/learner/focus.ts`, `lib/learner/summary.ts`.
- Prompts: `lib/ai/prompts/context.ts`, `lib/ai/prompts/lesson.ts`, `lib/ai/prompts/conversation.ts`, `lib/ai/prompts/analysis.ts`, `lib/ai/prompts/summary.ts`.
- AI services: `lib/ai/dailyCoach.ts`, `lib/ai/conversationCoach.ts`, `lib/ai/mistakeAnalyzer.ts`, `lib/ai/progressCoach.ts`.
- Provider and configuration: `lib/ai/provider.ts`, `lib/ai/providers/json.ts`, `lib/ai/providers/openrouter.ts`, `lib/ai/providers/local.ts`, `lib/env.ts`, `.env.example`.
- Actions and conversation mapping: `lib/actions/dailyLesson.ts`, `lib/actions/conversation.ts`, `lib/conversation/model.ts`.
- UI: `app/dashboard/page.tsx`, `app/practice/page.tsx`, `app/conversation/page.tsx`, `components/practice-workspace.tsx`, `components/conversation-workspace.tsx`, `components/coach/AIProgressSummary.tsx`.
- Translations: `lib/i18n/messages/en.json`, `lib/i18n/messages/fa.json`.
- Tests: `tests/learnerIntelligence.test.ts`, `tests/learnerContextLoad.test.ts`.
- Documentation: `README.md`, `docs/phase-8.md`.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`: 65 tests across nine files, including all 51 existing tests.
- `npm run build`

New regression coverage verifies weakness derivation, past-tense versus article corrections, bounded historical data and conversation memory, adaptive prompt inputs, English/Persian focus copy, malformed summary handling, provider failure fallback, both providers' task routing, bounded retries, stalled response-body timeouts, user-scoped queries, and optional-history failures.

## Remaining risks and limitations

- Real provider quality and authenticated end-to-end Supabase behavior still need a deployment smoke check; automated checks use mocked providers and history queries. No live credentials or user records were used for validation.
- Weakness ranking is a conservative heuristic over recent records. Model output remains probabilistic; schema validation enforces shape, while prompts constrain educational claims.
- Extractive conversation memory omits some earlier details. It is deliberately bounded and does not provide unlimited recall across sessions.
- Generated practice summaries are not persisted; reopening a completed lesson displays a deterministic factual summary. Stored conversation summaries may retain the language used when they were generated.
- The existing pending daily-lesson claim can remain pending if the server process terminates during generation. Ordinary AI failures are marked failed and retryable; process-crash lease recovery would require a separate persistence design.
