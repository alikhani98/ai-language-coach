import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProfile } from "@/lib/actions/profile";

export default async function OnboardingPage() {
  const profile = await getProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Personalize your practice
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Build a daily plan that fits your English life.
        </h1>
        <p className="text-muted-foreground">
          These choices help the coach prepare short lessons and feedback that
          match your level, goal, and available time.
        </p>
      </div>
      <OnboardingForm />
    </section>
  );
}
