import { formatMessage, getMessages } from "@/lib/i18n/config";
import type { LearnerMemory, MemoryArea } from "@/lib/memory/learnerMemory";

export function memoryAreaLabel(area: MemoryArea, language: string) {
  const messages = getMessages(language);
  return messages.intelligence.areas[area as keyof typeof messages.intelligence.areas]
    ?? messages.coach.categories[area as keyof typeof messages.coach.categories];
}

export function coachMemoryCopy(memory: LearnerMemory, language: string) {
  const messages = getMessages(language);
  const ui = messages.memory;
  const number = (value: number) => new Intl.NumberFormat(language).format(value);
  const pattern = memory.weaknesses[0];
  const topic = memory.conversationPatterns[0];
  const milestone = memory.milestones[0];
  const strength = memory.strengths.includes("practice_rhythm")
    ? formatMessage(ui.rhythm, { count: number(memory.weekly.current.days) })
    : topic ? formatMessage(ui.topicPractice, { topic: messages.conversation.topics[topic.topic], count: number(topic.sessions) })
      : milestone ? formatMessage(ui.milestone, { count: number(milestone.count), kind: ui[milestone.kind] })
        : ui.beginning;
  return {
    strength,
    challenge: pattern ? formatMessage(ui.repeated, {
      area: memoryAreaLabel(pattern.topic, language), count: number(pattern.observations), sessions: number(pattern.sessions),
    }) : ui.noPattern,
    historical: pattern && !pattern.recent ? ui.historical : undefined,
    recommendation: memory.recommendedFocus
      ? formatMessage(ui.next, { area: memoryAreaLabel(memory.recommendedFocus, language) }) : ui.nextDefault,
    grammar: formatMessage(ui.grammarPractice, { count: number(memory.weekly.current.lessons) }),
    grammarFeedback: formatMessage(ui.grammarFeedback, { count: number(memory.weekly.grammarCorrections) }),
    feedback: memory.weekly.lowerCorrectionAreas.length
      ? memory.weekly.lowerCorrectionAreas.map((area) => formatMessage(ui.lowerFeedback, { area: memoryAreaLabel(area, language) })).join(" ")
      : ui.noComparison,
  };
}
