import { AuthForm } from "@/components/auth-form";
import { getMessages } from "@/lib/i18n/config";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
export default function LoginPage() { return <AuthForm mode="login" messages={getMessages("en")} mysqlPreview={isMySqlPreviewEnabled()} />; }
