import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUnit } from "@/app/actions/condo";

export default async function UnitsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("units");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);

  const { data: units } = await supabase
    .from("units")
    .select(
      "id, code, floor_label, permilage, unit_residents(is_primary, people(full_name, nif, phone, email))",
    )
    .eq("condominium_id", id)
    .order("code");

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <h1 className="mb-6 font-display text-3xl font-semibold">{t("title")}</h1>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">{t("code")}</th>
              <th className="px-3 py-2">{t("floor")}</th>
              <th className="px-3 py-2">{t("permilage")}</th>
              <th className="px-3 py-2">{t("resident")}</th>
              <th className="px-3 py-2">{t("nif")}</th>
              <th className="px-3 py-2">{t("contact")}</th>
            </tr>
          </thead>
          <tbody>
            {(units ?? []).map((u) => {
              const residents = u.unit_residents as unknown as {
                is_primary: boolean;
                people: {
                  full_name: string;
                  nif: string | null;
                  phone: string | null;
                  email: string | null;
                };
              }[];
              const person =
                residents?.find((r) => r.is_primary)?.people ??
                residents?.[0]?.people;
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{u.code}</td>
                  <td className="px-3 py-2">{u.floor_label}</td>
                  <td className="px-3 py-2">{u.permilage}</td>
                  <td className="px-3 py-2">{person?.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{person?.nif ?? "—"}</td>
                  <td className="px-3 py-2">
                    {person?.phone || person?.email || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isManager && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("addUnit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addUnit} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="condoId" value={id} />
              <div className="space-y-1">
                <Label htmlFor="code">{t("code")}</Label>
                <Input id="code" name="code" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="floorLabel">{t("floor")}</Label>
                <Input id="floorLabel" name="floorLabel" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="permilage">{t("permilage")}</Label>
                <Input id="permilage" name="permilage" type="number" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="residentName">{t("resident")}</Label>
                <Input id="residentName" name="residentName" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nif">{t("nif")}</Label>
                <Input id="nif" name="nif" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">{t("contact")}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">{tCommon("add")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
