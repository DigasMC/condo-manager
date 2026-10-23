import { AuthForm } from "@/components/auth/auth-form";
import { setRequestLocale } from "next-intl/server";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthForm mode="signup" />;
}
