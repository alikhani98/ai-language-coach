import { getLocalDateKey } from "@/lib/daily/date";

export type PracticeActivity = {
  type: "daily_lesson" | "conversation";
  occurredAt: string;
};

export type ProgressSummary = {
  practiceDays: string[];
  practiceDaysLast7: number;
  practiceDaysLast14: number;
  currentStreak: number;
  totalCompletedLessons: number;
};

export function uniquePracticeDays(
  activities: PracticeActivity[],
  timezone: string,
) {
  return Array.from(
    new Set(
      activities.map((activity) =>
        activity.type === "daily_lesson"
          ? activity.occurredAt.slice(0, 10)
          : getLocalDateKey(new Date(activity.occurredAt), timezone),
      ),
    ),
  ).sort();
}

export function getDateKeysEndingToday(
  today: Date,
  timezone: string,
  days: number,
) {
  const todayKey = getLocalDateKey(today, timezone);
  const keys: string[] = [];
  const cursor = new Date(`${todayKey}T12:00:00.000Z`);

  for (let index = 0; index < days; index += 1) {
    const day = new Date(cursor);
    day.setUTCDate(cursor.getUTCDate() - index);
    keys.push(day.toISOString().slice(0, 10));
  }

  return keys;
}

export function countDaysInWindow(
  practiceDays: string[],
  today: Date,
  timezone: string,
  days: number,
) {
  const windowKeys = new Set(getDateKeysEndingToday(today, timezone, days));
  return practiceDays.filter((day) => windowKeys.has(day)).length;
}

export function calculateCurrentStreak(
  practiceDays: string[],
  today: Date,
  timezone: string,
) {
  const daySet = new Set(practiceDays);
  const keys = getDateKeysEndingToday(today, timezone, 365);
  let startIndex = 0;

  if (!daySet.has(keys[0]) && daySet.has(keys[1])) {
    startIndex = 1;
  }

  let streak = 0;

  for (let index = startIndex; index < keys.length; index += 1) {
    if (!daySet.has(keys[index])) break;
    streak += 1;
  }

  return streak;
}

export function buildProgressSummary({
  activities,
  timezone,
  totalCompletedLessons,
  today = new Date(),
}: {
  activities: PracticeActivity[];
  timezone: string;
  totalCompletedLessons: number;
  today?: Date;
}): ProgressSummary {
  const practiceDays = uniquePracticeDays(activities, timezone);

  return {
    practiceDays,
    practiceDaysLast7: countDaysInWindow(practiceDays, today, timezone, 7),
    practiceDaysLast14: countDaysInWindow(practiceDays, today, timezone, 14),
    currentStreak: calculateCurrentStreak(practiceDays, today, timezone),
    totalCompletedLessons,
  };
}
