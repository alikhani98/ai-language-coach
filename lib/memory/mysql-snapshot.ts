import { detectWeakArea } from "@/lib/learner/context";
import { memoryAreas, memorySnapshotSchema, type MemorySnapshot } from "@/lib/memory/learnerMemory";
import { conversationTopics } from "@/lib/validations/conversation";

type Correction = { category: string; original: string; corrected: string; explanation: string };
type Answer = { id: string; conversationId: string; topic: string; day: string; corrections: Correction[] };
type Manual = { day: string; category: string; original: string; corrected: string; explanation: string };
export type MemoryEvidence = {
  lessons: { day: string; words: number }[];
  answers: Answer[];
  ended: { conversationId: string; day: string }[];
  dismissed: Set<string>;
  manual: Manual[];
};
function moveDay(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw Error("Invalid memory date");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
const toCount = (n: number) => {
  if (!Number.isSafeInteger(n) || n < 0 || n > 999999999) throw Error("Memory counter overflow");
  return n;
};
/** Pure, numeric-only MySQL parity aggregation. No learner sentences are persisted. */
export function computeMySqlMemorySnapshot(today: string, evidence: MemoryEvidence): MemorySnapshot {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw Error("Invalid local date");
  const previousStart = moveDay(today, -13), currentStart = moveDay(today, -6), previousEnd = moveDay(today, -7);
  const answered = evidence.answers.filter(a => a.day <= today);
  const answeredConversations = new Set(answered.map(a => a.conversationId));
  const lessons = evidence.lessons.filter(l => l.day <= today);
  const ended = evidence.ended.filter(e => e.day <= today && answeredConversations.has(e.conversationId));
  const topics: Record<string, { exchanges: number; sessions: number }> = {};
  for (const topic of conversationTopics) {
    const entries = answered.filter(a => a.topic === topic);
    if (entries.length) topics[topic] = { exchanges: toCount(entries.length), sessions: toCount(new Set(entries.map(a => a.conversationId)).size) };
  }
  const corrections: { area: string; session: string; day: string; feedback: boolean }[] = [];
  for (const answer of answered) {
    answer.corrections.forEach((c, index) => {
      if (evidence.dismissed.has(`${answer.id}:${index}`)) return;
      if (!["grammar", "vocabulary", "word_order", "tone", "clarity", "other"].includes(c.category)) return;
      const area = detectWeakArea({ wrong_sentence: c.original, correct_sentence: c.corrected, explanation: c.explanation, category: c.category });
      corrections.push({ area: memoryAreas.includes(area as typeof memoryAreas[number]) ? area : "other", session: answer.conversationId, day: answer.day, feedback: true });
    });
  }
  for (const item of evidence.manual) {
    if (item.day > today) continue;
    const area = detectWeakArea({ wrong_sentence: item.original, correct_sentence: item.corrected, explanation: item.explanation, category: item.category });
    corrections.push({ area: memoryAreas.includes(area as typeof memoryAreas[number]) ? area : "other", session: `notebook:${item.day}`, day: item.day, feedback: false });
  }
  const areas: Record<string, { total: number; sessions: number; recent: number; previous: number; recent_feedback: number; previous_feedback: number }> = {};
  for (const area of memoryAreas) {
    const matches = corrections.filter(c => c.area === area);
    if (!matches.length) continue;
    const recent = matches.filter(c => c.day >= currentStart && c.day <= today);
    const previous = matches.filter(c => c.day >= previousStart && c.day <= previousEnd);
    areas[area] = { total: toCount(matches.length), sessions: toCount(new Set(matches.map(c => c.session)).size), recent: toCount(recent.length), previous: toCount(previous.length), recent_feedback: toCount(recent.filter(c => c.feedback).length), previous_feedback: toCount(previous.filter(c => c.feedback).length) };
  }
  const week = (start: string, end: string) => {
    const ls = lessons.filter(l => l.day >= start && l.day <= end);
    const as = answered.filter(a => a.day >= start && a.day <= end);
    const es = ended.filter(e => e.day >= start && e.day <= end);
    return { lessons: toCount(ls.length), vocabulary: toCount(ls.reduce((sum, l) => sum + l.words, 0)), conversations: toCount(es.length), exchanges: toCount(as.length), days: toCount(new Set([...ls.map(l => l.day), ...as.map(a => a.day)]).size) };
  };
  return memorySnapshotSchema.parse({
    totals: { lessons: toCount(lessons.length), vocabulary: toCount(lessons.reduce((sum, l) => sum + l.words, 0)), conversations: toCount(ended.length), exchanges: toCount(answered.length) },
    current: week(currentStart, today), previous: week(previousStart, previousEnd), areas, topics,
  });
}
