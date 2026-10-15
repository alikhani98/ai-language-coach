import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeeklyCoachReport } from "@/components/coach/WeeklyCoachReport";
import { LearningMemoryInsight } from "@/components/coach/LearningMemoryInsight";
import { buildLearnerMemory } from "@/lib/memory/learnerMemory";
import { getMessages } from "@/lib/i18n/config";

const zero = { lessons: 0, vocabulary: 0, conversations: 0, exchanges: 0 };
const memory = buildLearnerMemory({ totals: zero, current: { ...zero, days: 0 }, previous: { ...zero, days: 0 }, areas: {}, topics: {} }, "2026-10-14");

describe("weekly report presentation", () => {
  it.each(["en", "fa"])("renders the %s report and coach insight with localized empty states", (language) => {
    const ui = getMessages(language).memory;
    const report = renderToStaticMarkup(createElement(WeeklyCoachReport, { memory, language }));
    expect(report).toContain(ui.weeklyTitle);
    expect(report).toContain(ui.emptyWeek);
    expect(report).toContain(ui.sessionDefinition);
    const insight = renderToStaticMarkup(createElement(LearningMemoryInsight, { memory, language }));
    expect(insight).toContain(ui.noticed);
    expect(insight).toContain(ui.noPattern);
  });

  it("shows an unavailable state instead of invented zero statistics on a load failure", () => {
    const report = renderToStaticMarkup(createElement(WeeklyCoachReport, { language: "fa" }));
    expect(report).toContain(getMessages("fa").memory.unavailable);
    expect(report).not.toContain(getMessages("fa").memory.emptyWeek);
    expect(report).not.toContain("<dd");
  });
});
