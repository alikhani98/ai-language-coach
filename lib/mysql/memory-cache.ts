import "server-only";

import { eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { learningMemory } from "@/lib/db/schema";
import { getLocalDateKey } from "@/lib/daily/date";
import { buildLearnerMemory } from "@/lib/memory/learnerMemory";
import type { LearningMemoryResult } from "@/lib/memory/load";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Strictly read a fresh, validated MySQL snapshot; never trust arbitrary JSON.
 * This is not a snapshot refresh/rebuild implementation. Missing or expired
 * snapshots fail closed to 'unavailable' rather than fabricating learner data.
 */
export async function loadMySqlLearningMemoryCache(
  appUserId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<LearningMemoryResult> {
  if (!UUID.test(appUserId)) throw new Error("Invalid application identity.");
  try {
    const rows = await getMySqlDatabase().select().from(learningMemory)
      .where(eq(learningMemory.userId, appUserId)).limit(1);
    const row = rows[0];
    if (!row || row.schemaVersion !== 1 || row.asOf !== getLocalDateKey(now, timezone)) {
      return { status: "unavailable" };
    }
    const age = now.getTime() - Date.parse(formatMySqlUtcDateTime(row.updatedAt));
    if (age < 0 || age >= 300000) return { status: "unavailable" };
    return { status: "ready", memory: buildLearnerMemory(row.snapshot, row.asOf) };
  } catch {
    return { status: "unavailable" };
  }
}
