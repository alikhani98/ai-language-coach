import { z } from "zod";
import { conversationTopics } from "@/lib/validations/conversation";

export const memoryAreas = ["past_simple", "grammar", "vocabulary", "word_order", "tone", "clarity", "other"] as const;
export type MemoryArea = (typeof memoryAreas)[number];
const count = z.number().int().min(0).max(999999999);
const totalsSchema = z.object({ lessons: count, vocabulary: count, conversations: count, exchanges: count }).strict();
const weekSchema = totalsSchema.extend({ days: count.max(7) }).strict();
const areaSchema = z.object({ total: count, sessions: count, recent: count, previous: count,
  recent_feedback: count, previous_feedback: count }).strict();
const topicSchema = z.object({ exchanges: count, sessions: count }).strict();

// A fixed, numeric-only schema: model output and personal facts cannot become memory.
export const memorySnapshotSchema = z.object({
  totals: totalsSchema,
  current: weekSchema,
  previous: weekSchema,
  areas: z.record(z.enum(memoryAreas), areaSchema),
  topics: z.record(z.enum(conversationTopics), topicSchema),
}).strict().superRefine((snapshot, ctx) => {
  for (const area of Object.values(snapshot.areas)) {
    if (area && (area.sessions > area.total || area.recent + area.previous > area.total
      || area.recent_feedback > area.recent || area.previous_feedback > area.previous)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inconsistent correction evidence" });
    }
  }
  for (const topic of Object.values(snapshot.topics)) {
    if (topic && topic.sessions > topic.exchanges) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inconsistent topic evidence" });
    }
  }
});
export type MemorySnapshot = z.infer<typeof memorySnapshotSchema>;
export type MemoryPattern = {
  topic: MemoryArea;
  confidence: "medium" | "high";
  observations: number;
  sessions: number;
  recent: boolean;
};
export type LearnerMemory = {
  asOf: string;
  totals: MemorySnapshot["totals"];
  strengths: ("practice_rhythm" | "topic_practice")[];
  weaknesses: MemoryPattern[];
  grammarIssues: MemoryArea[];
  vocabularyGaps: boolean;
  conversationPatterns: { topic: (typeof conversationTopics)[number]; sessions: number }[];
  milestones: { kind: "lessons" | "conversations"; count: number }[];
  recommendedFocus?: MemoryArea;
  weekly: {
    current: MemorySnapshot["current"];
    previous: MemorySnapshot["previous"];
    lowerCorrectionAreas: MemoryArea[];
    grammarCorrections: number;
  };
};

export function buildLearnerMemory(input: unknown, asOf: string): LearnerMemory {
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(asOf);
  const snapshot = memorySnapshotSchema.parse(input);
  const weaknesses: MemoryPattern[] = memoryAreas.flatMap((topic) => {
    const evidence = snapshot.areas[topic];
    // Several corrections in one chat do not establish a persistent weakness.
    if (!evidence || evidence.total < 3 || evidence.sessions < 2) return [];
    return [{ topic, confidence: evidence.total >= 6 && evidence.sessions >= 3 ? "high" as const : "medium" as const,
      observations: evidence.total, sessions: evidence.sessions, recent: evidence.recent > 0 }];
  }).sort((a, b) => Number(b.recent) - Number(a.recent) || b.sessions - a.sessions || b.observations - a.observations).slice(0, 3);
  const conversationPatterns = conversationTopics.flatMap((topic) => {
    const evidence = snapshot.topics[topic];
    return evidence && evidence.sessions >= 2 && evidence.exchanges >= 3 ? [{ topic, sessions: evidence.sessions }] : [];
  }).sort((a, b) => b.sessions - a.sessions).slice(0, 2);
  const milestones: LearnerMemory["milestones"] = [];
  for (const kind of ["lessons", "conversations"] as const) {
    const reached = [1, 5, 10, 25, 50, 100].filter((value) => snapshot.totals[kind] >= value).at(-1);
    if (reached) milestones.push({ kind, count: reached });
  }
  const lowerCorrectionAreas = memoryAreas.filter((topic) => {
    const evidence = snapshot.areas[topic];
    // Comparing rates reduces volume bias. These are observations about feedback,
    // never claims of accuracy/mastery: task difficulty and topics can vary.
    return evidence && evidence.previous_feedback >= 3 && snapshot.previous.exchanges >= 10
      && snapshot.current.exchanges >= 10
      && evidence.recent_feedback / snapshot.current.exchanges <= (evidence.previous_feedback / snapshot.previous.exchanges) * 0.75;
  }).slice(0, 2);
  return {
    asOf, totals: snapshot.totals,
    strengths: [
      ...(snapshot.current.days >= 3 ? ["practice_rhythm" as const] : []),
      ...(conversationPatterns.length ? ["topic_practice" as const] : []),
    ],
    weaknesses,
    grammarIssues: weaknesses.filter((item) => ["grammar", "past_simple", "word_order"].includes(item.topic)).map((item) => item.topic),
    vocabularyGaps: weaknesses.some((item) => item.topic === "vocabulary"),
    conversationPatterns, milestones,
    recommendedFocus: weaknesses.find((item) => item.recent)?.topic ?? weaknesses[0]?.topic,
    weekly: { current: snapshot.current, previous: snapshot.previous, lowerCorrectionAreas,
      grammarCorrections: (["grammar", "past_simple", "word_order"] as const)
        .reduce((total, area) => total + (snapshot.areas[area]?.recent_feedback ?? 0), 0) },
  };
}

// Prompt projection has a hard item budget and contains only verified domain fields.
// Do not stringify raw database rows or caller-provided memory objects into prompts.
export function memoryPromptContext(memory?: LearnerMemory) {
  if (!memory) return undefined;
  return {
    asOf: memory.asOf, strengths: memory.strengths.slice(0, 2),
    repeatedWeaknesses: memory.weaknesses.slice(0, 3),
    grammarIssues: memory.grammarIssues.slice(0, 3), vocabularyGaps: memory.vocabularyGaps,
    practicedTopics: memory.conversationPatterns.slice(0, 2), milestones: memory.milestones.slice(0, 2),
    recommendedFocus: memory.recommendedFocus,
    recentPractice: memory.weekly.current,
    lowerCorrectionAreas: memory.weekly.lowerCorrectionAreas.slice(0, 2),
  };
}
