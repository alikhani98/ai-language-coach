import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

const messages: Record<string, string> = {
  "check-email": "Check your email to confirm your account, then log in.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthForm
      mode="login"
      message={params.message ? messages[params.message] : undefined}
    />
  );
}
