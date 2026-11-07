import "server-only";
import { z } from "zod";
import { fetchJsonWithTimeout } from "@/lib/ai/providers/json";

const catalogItemSchema = z.object({
  id: z.string().min(1).max(191),
  name: z.string().optional(),
  context_length: z.number().optional(),
  pricing: z.object({ prompt: z.string().optional(), completion: z.string().optional() }).optional(),
  architecture: z.object({ modality: z.string().optional(), input_modalities: z.array(z.string()).optional() }).optional(),
}).passthrough();
export type AIModel = { id: string; name: string; free: boolean; promptPrice?: number; completionPrice?: number; contextLength?: number };
let cache: { expires: number; models: AIModel[] } | null = null;

function price(value?: string) { const n = Number(value); return Number.isFinite(n) ? n * 1_000_000 : undefined; }
export function classifyOpenRouterModels(payload: unknown): AIModel[] {
  const rows = z.object({ data: z.array(catalogItemSchema).max(5000) }).safeParse(payload);
  if (!rows.success) return [];
  return rows.data.data.filter((m) => !m.id.includes("/") || !m.id.includes("embedding") && !m.id.includes("image"))
    .filter((m) => !m.architecture?.modality || /text/i.test(m.architecture.modality))
    .map((m) => ({ id: m.id, name: m.name ?? m.id, free: m.id.endsWith(":free"), promptPrice: price(m.pricing?.prompt), completionPrice: price(m.pricing?.completion), contextLength: m.context_length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function getOpenRouterCatalog(force = false) {
  if (!force && cache && cache.expires > Date.now()) return cache.models;
  const response = await fetchJsonWithTimeout("https://openrouter.ai/api/v1/models", { headers: { Accept: "application/json" } }, 10000);
  if (!response.ok) throw new Error("AI model catalog unavailable.");
  const models = classifyOpenRouterModels(await response.json());
  cache = { models, expires: Date.now() + 12 * 60 * 1000 };
  return models;
}
export function findCatalogModel(models: AIModel[], id: string) { return models.find((model) => model.id === id) ?? null; }
