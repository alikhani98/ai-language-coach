import { isValidTimeZone } from "@/lib/validations/profile";

export function getLocalDateKey(date: Date, timezone: string) {
  const safeTimezone = isValidTimeZone(timezone) ? timezone : "UTC";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
