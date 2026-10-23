import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/condo/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { CreateCondoForm } from "@/components/condo/create-condo-form";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const userId = user.id;
  const { data: memberships } = await supabase
    .from("condominium_members")
    .select("id, role, has_platform_access, condominiums(id, name, address)")
    .eq("user_id", userId)
    .eq("has_platform_access", true);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-stone-900">
          {t("title")}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {!memberships?.length && (
            <p className="text-stone-600">{t("empty")}</p>
          )}
          {memberships?.map((m) => {
            const condo = m.condominiums as unknown as {
              id: string;
              name: string;
              address: string | null;
            };
            if (!condo) return null;
            return (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium text-stone-900">{condo.name}</p>
                    {condo.address && (
                      <p className="text-sm text-stone-500">{condo.address}</p>
                    )}
                    <p className="mt-1 text-xs uppercase tracking-wide text-teal-800">
                      {m.role === "manager" ? t("roleManager") : t("roleMember")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/condominiums/${condo.id}/dashboard`}>
                      {t("open")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <CreateCondoForm />
      </div>
    </AppShell>
  );
}
