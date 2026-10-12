import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProfile } from "@/lib/actions/profile";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";

export default async function OnboardingPage() {
  const profile = await getProfile();

  if (profile) {
    redirect("/dashboard");
  }
  const messages = getMessages("en");

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.onboarding.eyebrow}
        title={messages.onboarding.heading}
        description={messages.onboarding.body}
        className="mx-auto max-w-2xl"
      />
      <OnboardingForm />
    </section>
  );
}
