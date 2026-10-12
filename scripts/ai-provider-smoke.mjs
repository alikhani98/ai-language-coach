import { z } from "zod";

const dailyLessonSchema = z.object({
  words: z.array(
    z.object({
      word: z.string().min(1).max(60),
      meaning: z.string().min(1).max(160),
      example: z.string().min(1).max(220),
    }),
  ).min(3).max(5),
  sentence: z.string().min(8).max(220),
  reading: z.string().min(80).max(1400),
  speakingTask: z.string().min(20).max(420),
});

const conversationResponseSchema = z.object({
  reply: z.string().min(1).max(900),
  corrections: z.array(
    z.object({
      original: z.string().min(1).max(240),
      corrected: z.string().min(1).max(240),
      explanation: z.string().min(1).max(320),
      category: z.enum([
        "grammar",
        "vocabulary",
        "word_order",
        "tone",
        "clarity",
        "other",
      ]),
    }),
  ).max(2),
});

const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS ?? "20000", 10);
const provider = process.env.AI_PROVIDER || "openrouter";
const model = process.env.AI_MODEL;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const baseUrl = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(
  /\/$/,
  "",
);

if (provider !== "openrouter") {
  fail("This smoke test validates the OpenRouter production provider only.");
}

if (!openRouterApiKey) {
  fail("OPENROUTER_API_KEY is required for the AI provider smoke test.");
}

if (!model) {
  fail("AI_MODEL is required for the AI provider smoke test.");
}

await runSmokeCase({
  name: "Daily lesson generation",
  schema: dailyLessonSchema,
  maxTokens: 900,
  temperature: 0.2,
  userPrompt: [
    "Create one focused daily English lesson for this authenticated user profile.",
    "Level: B1 Intermediate",
    "Goal: Work",
    "Daily practice time: 15 minutes",
    "Return JSON with words, sentence, reading, and speakingTask.",
  ].join("\n"),
  schemaHint: JSON.stringify({
    words: [{ word: "string", meaning: "string", example: "string" }],
    sentence: "string",
    reading: "string",
    speakingTask: "string",
  }),
});

await runSmokeCase({
  name: "Conversation response",
  schema: conversationResponseSchema,
  maxTokens: 650,
  temperature: 0.2,
  userPrompt: [
    "Learner level: B1 Intermediate",
    "Learning goal: Conversation",
    "Conversation topic: Work",
    "Latest learner message: I go to meeting yesterday.",
    "Return JSON with reply and corrections. Correct only important mistakes.",
  ].join("\n"),
  schemaHint: JSON.stringify({
    reply: "string",
    corrections: [
      {
        original: "string",
        corrected: "string",
        explanation: "string",
        category: "grammar | vocabulary | word_order | tone | clarity | other",
      },
    ],
  }),
});

console.log("AI provider smoke test passed.");

async function runSmokeCase({
  name,
  schema,
  maxTokens,
  temperature,
  userPrompt,
  schemaHint,
}) {
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "Return only valid JSON.",
            `JSON shape: ${schemaHint}.`,
            "Do not include Markdown.",
          ].join(" "),
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    fail(`${name} failed with provider HTTP status ${response.status}.`);
  }

  const parsed = parseProviderJson(await response.json());
  const validation = schema.safeParse(parsed);

  if (!validation.success) {
    fail(`${name} returned JSON that does not match the expected schema.`);
  }

  console.log(`${name}: schema valid.`);
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      fail("AI provider smoke test timed out.");
    }

    fail("AI provider smoke test could not reach the provider.");
  } finally {
    clearTimeout(timeout);
  }
}

function parseProviderJson(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    fail("AI provider returned an empty or unsupported response.");
  }

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? extractJsonObject(trimmed);

  try {
    return JSON.parse(candidate);
  } catch {
    fail("AI provider returned invalid JSON.");
  }
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
