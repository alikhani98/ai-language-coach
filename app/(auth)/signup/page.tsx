import { AuthForm } from "@/components/auth-form";
import { getMessages } from "@/lib/i18n/config";

export default function SignupPage() {
  return <AuthForm mode="signup" messages={getMessages("en")} />;
}
