"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/actions/profile";
import {
  groupMistakes,
  mapMistakeRow,
  type Mistake,
} from "@/lib/mistakes/model";
import { createClient } from "@/lib/supabase/server";
import {
  conversationCorrectionSchema,
  type ConversationCorrection,
} from "@/lib/validations/conversation";
import {
  mistakeCategoryFilterSchema,
  mistakeIdSchema,
} from "@/lib/validations/mistake";

type MistakeActionState = {
  error?: string;
  success?: string;
};

const mistakeColumns =
  "id,user_id,wrong_sentence,correct_sentence,explanation,category,source_message_id,correction_index,dismissed_at,created_at";

type AssistantCorrectionSource = {
  id: string;
  user_id: string;
  corrections: unknown;
  created_at: string;
};

function mapCorrectionToMistake(
  correction: ConversationCorrection,
  source: AssistantCorrectionSource,
  index: number,
) {
  return {
    user_id: source.user_id,
    wrong_sentence: correction.original,
    correct_sentence: correction.corrected,
    explanation: correction.explanation,
    category: correction.category,
    source_message_id: source.id,
    correction_index: index,
    created_at: source.created_at,
  };
}

export async function syncConversationCorrections() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id,user_id,corrections,created_at")
    .eq("user_id", profile.user_id)
    .eq("role", "assistant")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AssistantCorrectionSource[];
  const mistakeRows = rows.flatMap((row) => {
    const corrections = conversationCorrectionSchema.array().safeParse(
      row.corrections,
    );

    if (!corrections.success) {
      return [];
    }

    return corrections.data.map((correction, index) =>
      mapCorrectionToMistake(correction, row, index),
    );
  });

  if (!mistakeRows.length) {
    return { inserted: 0 };
  }

  const { error: upsertError } = await supabase
    .from("mistakes")
    .upsert(mistakeRows, {
      onConflict: "source_message_id,correction_index",
      ignoreDuplicates: true,
    });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  revalidatePath("/mistakes");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { inserted: mistakeRows.length };
}

export async function syncConversationCorrectionsAction(
  previousState: MistakeActionState,
): Promise<MistakeActionState> {
  void previousState;

  try {
    const result = await syncConversationCorrections();
    return {
      success: result.inserted
        ? "Corrections synced to your notebook."
        : "No new corrections to sync.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not sync corrections right now.",
    };
  }
}

export async function syncCorrectionsForMessage(sourceMessageId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id,user_id,corrections,created_at")
    .eq("id", sourceMessageId)
    .eq("user_id", profile.user_id)
    .eq("role", "assistant")
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const corrections = conversationCorrectionSchema.array().safeParse(
    data.corrections,
  );

  if (!corrections.success || !corrections.data.length) {
    return;
  }

  await supabase.from("mistakes").upsert(
    corrections.data.map((correction, index) =>
      mapCorrectionToMistake(
        correction,
        data as AssistantCorrectionSource,
        index,
      ),
    ),
    {
      onConflict: "source_message_id,correction_index",
      ignoreDuplicates: true,
    },
  );
}

export async function getMistakeNotebook(category?: string) {
  const profile = await requireProfile();
  const parsedCategory = mistakeCategoryFilterSchema.safeParse(category);
  const supabase = await createClient();
  let query = supabase
    .from("mistakes")
    .select(mistakeColumns)
    .eq("user_id", profile.user_id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (parsedCategory.success && parsedCategory.data) {
    query = query.eq("category", parsedCategory.data);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const mistakes = (data ?? []).map(mapMistakeRow);

  return {
    mistakes,
    groups: groupMistakes(mistakes),
    categories: Array.from(
      new Set(mistakes.map((mistake: Mistake) => mistake.category)),
    ).sort(),
  };
}

export async function getWeakAreas(limit = 3) {
  const { countWeakAreas } = await import("@/lib/mistakes/model");
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mistakes")
    .select("category")
    .eq("user_id", profile.user_id)
    .is("dismissed_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return countWeakAreas((data ?? []) as Array<{ category: string }>).slice(
    0,
    limit,
  );
}

export async function removeMistake(
  previousState: MistakeActionState,
  formData: FormData,
): Promise<MistakeActionState> {
  void previousState;
  const parsed = mistakeIdSchema.safeParse(formData.get("mistakeId"));

  if (!parsed.success) {
    return { error: "Notebook entry was not found." };
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("mistakes")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("user_id", profile.user_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/mistakes");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { success: "Notebook entry removed." };
}
