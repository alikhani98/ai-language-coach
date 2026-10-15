import { isProfileComplete } from "@/lib/daily/lesson";
import { accountDestination } from "@/lib/admin/model";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProfile } from "@/lib/actions/profile";

export default async function OnboardingPage() {
  const profile = await getProfile();

  const destination = accountDestination(profile?.status);
  if (destination) redirect(destination);
  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }
  return <OnboardingForm />;
}
