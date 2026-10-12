import { z } from "zod";

export type Mistake = {
  id: string;
  user_id: string;
  wrong_sentence: string;
  correct_sentence: string;
  explanation: string;
  category: string;
  source_message_id: string | null;
  correction_index: number | null;
  dismissed_at: string | null;
  created_at: string;
};

export type MistakeGroup = {
  key: string;
  wrong_sentence: string;
  correct_sentence: string;
  explanation: string;
  category: string;
  count: number;
  latest_at: string;
};

export function normalizeMistakeKey({
  wrong,
  correct,
  category,
}: {
  wrong: string;
  correct: string;
  category: string;
}) {
  return [wrong, correct, category]
    .map((value) => value.toLowerCase().trim().replace(/\s+/g, " "))
    .join("::");
}

export function mapMistakeRow(row: Record<string, unknown>): Mistake {
  return {
    id: z.string().parse(row.id),
    user_id: z.string().parse(row.user_id),
    wrong_sentence: z.string().parse(row.wrong_sentence),
    correct_sentence: z.string().parse(row.correct_sentence),
    explanation: z.string().parse(row.explanation),
    category: z.string().parse(row.category),
    source_message_id: z.string().nullable().parse(row.source_message_id ?? null),
    correction_index: z.number().int().nullable().parse(row.correction_index ?? null),
    dismissed_at: z.string().nullable().parse(row.dismissed_at ?? null),
    created_at: z.string().parse(row.created_at),
  };
}

export function groupMistakes(mistakes: Mistake[]): MistakeGroup[] {
  const groups = new Map<string, MistakeGroup>();

  for (const mistake of mistakes) {
    const key = normalizeMistakeKey({
      wrong: mistake.wrong_sentence,
      correct: mistake.correct_sentence,
      category: mistake.category,
    });
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        wrong_sentence: mistake.wrong_sentence,
        correct_sentence: mistake.correct_sentence,
        explanation: mistake.explanation,
        category: mistake.category,
        count: 1,
        latest_at: mistake.created_at,
      });
      continue;
    }

    existing.count += 1;
    if (mistake.created_at > existing.latest_at) {
      existing.latest_at = mistake.created_at;
      existing.explanation = mistake.explanation;
    }
  }

  return Array.from(groups.values()).sort(
    (left, right) =>
      right.count - left.count || right.latest_at.localeCompare(left.latest_at),
  );
}

export function countWeakAreas(mistakes: Array<{ category: string }>) {
  const counts = new Map<string, number>();

  for (const mistake of mistakes) {
    counts.set(mistake.category, (counts.get(mistake.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}
