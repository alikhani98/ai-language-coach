import { AuthForm } from "@/components/auth-form";
import { getMessages } from "@/lib/i18n/config";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const messages = getMessages("en");

  return (
    <AuthForm
      mode="login"
      messages={messages}
      message={
        params.message === "check-email" ? messages.auth.checkEmail : undefined
      }
    />
  );
}
