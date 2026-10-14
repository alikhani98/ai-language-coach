import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProfile } from "@/lib/actions/profile";

export default async function OnboardingPage() {
  const profile = await getProfile();

  if (profile) {
    redirect("/dashboard");
  }
  return <OnboardingForm />;
}
