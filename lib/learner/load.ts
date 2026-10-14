import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/actions/profile";
import { buildLearnerContext } from "@/lib/learner/context";

// Only call with the profile returned by requireProfile; use the session client and RLS.
export async function loadLearnerContext(profile: UserProfile) {
  try {
    const supabase = await createClient();
    const [mistakes, lessons, conversations] = await Promise.all([
      supabase.from("mistakes").select("wrong_sentence,correct_sentence,explanation,category")
        .eq("user_id", profile.user_id).is("dismissed_at", null).order("created_at", { ascending: false }).limit(8),
      supabase.from("daily_lessons").select("date,sentence,completed,reading_text,speaking_task")
        .eq("user_id", profile.user_id).eq("generation_status", "ready").order("date", { ascending: false }).limit(5),
      supabase.from("conversations").select("topic,feedback,status")
        .eq("user_id", profile.user_id).order("updated_at", { ascending: false }).limit(4),
    ]);
    // Optional history must not prevent practice when a query fails.
    return buildLearnerContext(profile, {
      mistakes: mistakes.error ? [] : mistakes.data ?? [],
      lessons: lessons.error ? [] : (lessons.data ?? []).map((lesson) => ({
        date: lesson.date, sentence: lesson.sentence, completed: lesson.completed,
        summary: `Reading: ${lesson.reading_text.slice(0, 240)} Speaking prompt: ${lesson.speaking_task.slice(0, 180)}`,
      })),
      conversations: conversations.error ? [] : conversations.data ?? [],
    });
  } catch {
    return buildLearnerContext(profile);
  }
}
