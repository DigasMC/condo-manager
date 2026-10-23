"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "login" | "signup" | "forgot";

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/dashboard`,
        });
        if (err) throw err;
        setMessage(t("resetSent"));
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=/dashboard`,
          },
        });
        if (err) throw err;
        setMessage(t("checkEmail"));
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/dashboard`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <p className="font-display text-4xl font-semibold tracking-tight text-teal-900">
          {tApp("name")}
        </p>
        <p className="mt-2 text-stone-600">{tApp("tagline")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "login"
              ? t("signIn")
              : mode === "signup"
                ? t("signUp")
                : t("resetPassword")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-teal-800" role="status">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "login"
                ? t("signIn")
                : mode === "signup"
                  ? t("signUp")
                  : t("sendReset")}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative py-2 text-center text-xs text-stone-400">
                <span className="bg-white px-2 relative z-10">ou</span>
                <div className="absolute inset-x-0 top-1/2 border-t border-stone-200" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                {t("google")}
              </Button>
            </>
          )}

          <div className="space-y-1 text-center text-sm text-stone-600">
            {mode === "login" && (
              <>
                <p>
                  <Link href="/forgot-password" className="text-teal-800 underline">
                    {t("forgotPassword")}
                  </Link>
                </p>
                <p>
                  {t("noAccount")}{" "}
                  <Link href="/signup" className="text-teal-800 underline">
                    {t("signUp")}
                  </Link>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                {t("hasAccount")}{" "}
                <Link href="/login" className="text-teal-800 underline">
                  {t("signIn")}
                </Link>
              </p>
            )}
            {mode === "forgot" && (
              <p>
                <Link href="/login" className="text-teal-800 underline">
                  {t("signIn")}
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
