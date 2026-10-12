import { describe, expect, it } from "vitest";
import {
  countWeakAreas,
  groupMistakes,
  normalizeMistakeKey,
  type Mistake,
} from "@/lib/mistakes/model";

const baseMistake: Mistake = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "user-a",
  wrong_sentence: "I go yesterday.",
  correct_sentence: "I went yesterday.",
  explanation: "Use past tense for completed past events.",
  category: "grammar",
  source_message_id: "00000000-0000-4000-8000-000000000010",
  correction_index: 0,
  dismissed_at: null,
  created_at: "2026-10-12T08:00:00.000Z",
};

describe("mistake notebook helpers", () => {
  it("normalizes repeated corrections deterministically", () => {
    expect(
      normalizeMistakeKey({
        wrong: " I   GO yesterday. ",
        correct: "I went yesterday.",
        category: "grammar",
      }),
    ).toBe("i go yesterday.::i went yesterday.::grammar");
  });

  it("groups repeated real correction occurrences", () => {
    const groups = groupMistakes([
      baseMistake,
      {
        ...baseMistake,
        id: "00000000-0000-4000-8000-000000000002",
        source_message_id: "00000000-0000-4000-8000-000000000011",
        created_at: "2026-10-13T08:00:00.000Z",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].latest_at).toBe("2026-10-13T08:00:00.000Z");
  });

  it("counts weak area categories by frequency", () => {
    expect(
      countWeakAreas([
        { category: "grammar" },
        { category: "grammar" },
        { category: "vocabulary" },
      ]),
    ).toEqual([
      { category: "grammar", count: 2 },
      { category: "vocabulary", count: 1 },
    ]);
  });

  it("models notebook removal without deleting the source message", () => {
    const dismissed = {
      ...baseMistake,
      dismissed_at: "2026-10-14T08:00:00.000Z",
    };

    expect(dismissed.source_message_id).toBe(baseMistake.source_message_id);
    expect(dismissed.dismissed_at).not.toBeNull();
  });

  it("prevents duplicate source-backed correction keys", () => {
    const key = `${baseMistake.source_message_id}:${baseMistake.correction_index}`;

    expect(key).toBe(
      "00000000-0000-4000-8000-000000000010:0",
    );
  });
});
