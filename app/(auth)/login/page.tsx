import { AuthForm } from "@/components/auth-form";
import { getMessages } from "@/lib/i18n/config";
export default function LoginPage() { return <AuthForm mode="login" messages={getMessages("en")} />; }
