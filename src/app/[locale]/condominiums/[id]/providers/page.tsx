import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addProvider, deleteProvider } from "@/app/actions/condo";

export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("providers");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);

  const { data: providers } = await supabase
    .from("service_providers")
    .select("*")
    .eq("condominium_id", id)
    .order("service_type");

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <h1 className="mb-6 font-display text-3xl font-semibold">{t("title")}</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">{t("service")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("contact")}</th>
              <th className="px-3 py-2">{tCommon("notes")}</th>
              {isManager && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {(providers ?? []).map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-3 py-2">{p.service_type}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.contact}</td>
                <td className="px-3 py-2 max-w-xs truncate">{p.notes}</td>
                {isManager && (
                  <td className="px-3 py-2">
                    <form
                      action={async () => {
                        "use server";
                        await deleteProvider(p.id, id);
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        {tCommon("delete")}
                      </Button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isManager && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addProvider} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="condoId" value={id} />
              <div className="space-y-1">
                <Label htmlFor="serviceType">{t("service")}</Label>
                <Input id="serviceType" name="serviceType" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact">{t("contact")}</Label>
                <Input id="contact" name="contact" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">{tCommon("notes")}</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit">{tCommon("add")}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
