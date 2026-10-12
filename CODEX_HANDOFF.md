# CODEX HANDOFF

This is an existing project continuation for AI Language Coach.

Do not treat this repository as a greenfield build. Before making any code, architecture, schema, provider, or product changes, read the project context and inspect the existing implementation carefully.

## First Read

Read these files first, in this order:

1. `PROJECT_CONTEXT.md`
2. `CURRENT_STATE.md`
3. `NEXT_TASKS.md`
4. `SETUP_INSTRUCTIONS.md`
5. `README.md`
6. `BETA_CHECKLIST.md`

If any of these files are missing, report that clearly before proceeding.

## Then Inspect

After reading the handoff/context files, inspect:

1. Repository structure
2. Git history
3. `package.json`
4. Supabase migrations
5. AI provider architecture

Pay particular attention to:

- `lib/ai/provider.ts`
- `lib/ai/providers/`
- `lib/ai/dailyCoach.ts`
- `lib/ai/conversationCoach.ts`
- `lib/ai/mistakeAnalyzer.ts`
- `supabase/migrations/`
- `tests/`

## Important Constraints

- Do not redesign the AI provider system.
- Do not reintroduce OpenAI SDK.
- Do not reintroduce direct provider coupling in application code.
- Do not add `OPENAI_API_KEY` or OpenAI-only configuration.
- Do not implement Google AI Studio or Gemini API unless explicitly approved in a future phase.
- Do not change product scope.
- Do not add features before understanding the existing architecture.
- Preserve Supabase migration discipline.
- Do not rewrite existing migrations unless explicitly instructed.
- Preserve tests and validation patterns.
- Keep AI output validation behind Zod schemas.
- Keep secrets server-only.
- Do not claim live production readiness without real credential-backed validation.

## Current Architecture Assumptions

The application has already been developed through:

- Phase 1: Foundation
- Phase 2: Authentication
- Phase 3: User Profile and Onboarding
- Phase 4: Daily Language Coach
- Phase 5: AI Conversation Coach
- Phase 6: Progress Tracking and Mistake Notebook
- Phase 6.5: AI Provider Migration
- Deployment Preparation and Production Validation

The AI integration is provider-based. OpenRouter is the primary provider. A local OpenAI-compatible endpoint is optional. Application code should depend on the internal AI provider interface, not on an external provider SDK.

## Required Analysis Report

After analysis, report the following before making code changes:

1. Product understanding
2. Architecture understanding
3. Completed implementation
4. Current phase
5. Risks
6. Recommended next action

## Approval Rule

No code changes before explicit approval.

If the next request asks for analysis, audit, planning, or continuation, first produce the analysis report above and wait for approval before modifying code.
