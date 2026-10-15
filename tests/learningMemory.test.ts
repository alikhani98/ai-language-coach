import { describe, expect, it } from "vitest";
import { buildLearnerMemory, memoryPromptContext, memorySnapshotSchema, type MemorySnapshot } from "@/lib/memory/learnerMemory";
import { coachMemoryCopy } from "@/lib/memory/presentation";
import { learnerPrompt } from "@/lib/ai/prompts/context";
import { buildLearnerContext } from "@/lib/learner/context";
import { buildAnalysisPrompt } from "@/lib/ai/prompts/analysis";

export function snapshot(): MemorySnapshot {
  return {
    totals: { lessons: 10, vocabulary: 40, conversations: 5, exchanges: 30 },
    current: { lessons: 3, vocabulary: 12, conversations: 2, exchanges: 15, days: 3 },
    previous: { lessons: 2, vocabulary: 8, conversations: 2, exchanges: 15, days: 2 },
    areas: { past_simple: { total: 8, sessions: 4, recent: 2, previous: 6, recent_feedback: 2, previous_feedback: 6 } },
    topics: { work: { exchanges: 12, sessions: 3 } },
  };
}

describe("long-term learner memory", () => {
  it("identifies meaningful repeated patterns without copying raw history or profile data", () => {
    const memory = buildLearnerMemory(snapshot(), "2026-10-14");
    expect(memory.weaknesses).toEqual([{ topic: "past_simple", confidence: "high", observations: 8, sessions: 4, recent: true }]);
    expect(memory.grammarIssues).toEqual(["past_simple"]);
    expect(memory.recommendedFocus).toBe("past_simple");
    expect(memory.strengths).toEqual(["practice_rhythm", "topic_practice"]);
    expect(memory.milestones).toEqual([{ kind: "lessons", count: 10 }, { kind: "conversations", count: 5 }]);
    expect(memory.conversationPatterns).toEqual([{ topic: "work", sessions: 3 }]);
    expect(JSON.stringify(memoryPromptContext(memory)).length).toBeLessThan(1700);
    expect(JSON.stringify(memory)).not.toMatch(/sentence|email|user_id|level|goal/);
  });

  it("does not label isolated mistakes or a single session as long-term weaknesses", () => {
    const input = snapshot();
    input.areas = { grammar: { total: 9, sessions: 1, recent: 9, previous: 0, recent_feedback: 9, previous_feedback: 0 } };
    expect(buildLearnerMemory(input, "2026-10-14").weaknesses).toEqual([]);
    input.areas.grammar!.total = 2;
    input.areas.grammar!.sessions = 2;
    input.areas.grammar!.recent = 2;
    input.areas.grammar!.recent_feedback = 2;
    expect(buildLearnerMemory(input, "2026-10-14").recommendedFocus).toBeUndefined();
  });

  it("prefers current challenges while retaining older meaningful patterns", () => {
    const input = snapshot();
    input.areas.past_simple!.recent = 0;
    input.areas.past_simple!.recent_feedback = 0;
    input.areas.vocabulary = { total: 3, sessions: 2, recent: 3, previous: 0, recent_feedback: 3, previous_feedback: 0 };
    const memory = buildLearnerMemory(input, "2026-10-14");
    expect(memory.recommendedFocus).toBe("vocabulary");
    expect(memory.vocabularyGaps).toBe(true);
    expect(memory.weaknesses[1].recent).toBe(false);
  });

  it("compares correction rates only with adequate evidence and excludes manual notebook counts", () => {
    const input = snapshot();
    expect(buildLearnerMemory(input, "2026-10-14").weekly.lowerCorrectionAreas).toEqual(["past_simple"]);
    input.current.exchanges = 1;
    expect(buildLearnerMemory(input, "2026-10-14").weekly.lowerCorrectionAreas).toEqual([]);
    input.current.exchanges = 30;
    input.areas.past_simple!.recent_feedback = 6;
    input.areas.past_simple!.recent = 6;
    input.areas.past_simple!.total = 12;
    expect(buildLearnerMemory(input, "2026-10-14").weekly.lowerCorrectionAreas).toEqual(["past_simple"]);
    input.areas.past_simple!.previous_feedback = 0;
    expect(buildLearnerMemory(input, "2026-10-14").weekly.lowerCorrectionAreas).toEqual([]);
  });

  it("rejects personal text, unknown topics, extra fields, and impossible counts", () => {
    expect(memorySnapshotSchema.safeParse({ ...snapshot(), personal: "private@example.test" }).success).toBe(false);
    expect(memorySnapshotSchema.safeParse({ ...snapshot(), areas: { address: { total: 1 } } }).success).toBe(false);
    expect(memorySnapshotSchema.safeParse({ ...snapshot(), totals: { ...snapshot().totals, vocabulary: "secret" } }).success).toBe(false);
    const input = snapshot();
    input.areas.past_simple!.sessions = 9;
    expect(memorySnapshotSchema.safeParse(input).success).toBe(false);
  });

  it("handles first-time learners without invented history or mastery claims", () => {
    const empty = { lessons: 0, vocabulary: 0, conversations: 0, exchanges: 0 };
    const memory = buildLearnerMemory({ totals: empty, current: { ...empty, days: 0 }, previous: { ...empty, days: 0 }, areas: {}, topics: {} }, "2026-10-14");
    expect(memory.weaknesses).toEqual([]);
    expect(memory.milestones).toEqual([]);
    expect(memory.strengths).toEqual([]);
    expect(coachMemoryCopy(memory, "en").strength).toContain("starts");
    expect(memoryPromptContext()).toBeUndefined();
  });

  it("localizes reports and separates observations from claims of improvement", () => {
    const memory = buildLearnerMemory(snapshot(), "2026-10-14");
    const en = coachMemoryCopy(memory, "en");
    const fa = coachMemoryCopy(memory, "fa");
    expect(en.feedback).toContain("per exchange");
    expect(en.grammar).toContain("not assessed");
    expect(fa.strength).toContain("۳");
    expect(fa.challenge).toContain("زمان گذشته");
    expect(fa.recommendation).toContain("سه جمله");
  });

  it("supplies bounded memory to existing prompt flows and analysis without duplicating the full report", () => {
    const context = { ...buildLearnerContext({ level: "b1_intermediate", goal: "work", daily_minutes: 15, interface_language: "fa" }), learningMemory: buildLearnerMemory(snapshot(), "2026-10-14") };
    const prompt = learnerPrompt(context);
    expect(prompt).toContain("past_simple");
    expect(prompt).toContain("Long-term learning memory");
    expect(prompt).not.toContain('"previous"');
    expect(prompt.length).toBeLessThan(2500);
    expect(buildAnalysisPrompt({ sentence: "I go yesterday", learnerContext: context })).toContain("past_simple");
  });
});
