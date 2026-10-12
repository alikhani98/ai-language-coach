import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProfile } from "@/lib/actions/profile";
import { getMessages } from "@/lib/i18n/config";

export default async function OnboardingPage() {
  const profile = await getProfile();

  if (profile) {
    redirect("/dashboard");
  }
  const messages = getMessages("en");

  return (
    <section className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {messages.onboarding.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {messages.onboarding.heading}
        </h1>
        <p className="text-muted-foreground">
          {messages.onboarding.body}
        </p>
      </div>
      <OnboardingForm />
    </section>
  );
}
