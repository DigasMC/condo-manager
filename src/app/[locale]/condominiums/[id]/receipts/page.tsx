import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess, getFiscalYear } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { YearPicker } from "@/components/condo/year-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addReceipt, deleteReceipt } from "@/app/actions/condo";
import { formatEur, formatDate } from "@/lib/utils";

export default async function ReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale, id } = await params;
  const { year: yearParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("receipts");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);
  const { fy, years } = await getFiscalYear(
    supabase,
    id,
    yearParam ? Number(yearParam) : undefined,
  );

  const { data: units } = await supabase
    .from("units")
    .select("id, floor_label")
    .eq("condominium_id", id)
    .order("code");

  const { data: receipts } = fy
    ? await supabase
        .from("receipts")
        .select("*, units(floor_label)")
        .eq("fiscal_year_id", fy.id)
        .order("receipt_date", { ascending: false })
    : { data: [] };

  const total = (receipts ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-stone-600">
            {tCommon("total")}: {formatEur(total, locale)}
          </p>
        </div>
        <Suspense>
          <YearPicker
            years={years}
            currentYear={fy?.year ?? new Date().getFullYear()}
          />
        </Suspense>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">{t("unit")}</th>
              <th className="px-3 py-2">{tCommon("amount")}</th>
              <th className="px-3 py-2">{t("viaBank")}</th>
              <th className="px-3 py-2">{tCommon("date")}</th>
              <th className="px-3 py-2">{t("issued")}</th>
              <th className="px-3 py-2">{tCommon("notes")}</th>
              {isManager && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {(receipts ?? []).map((r) => {
              const unit = r.units as unknown as { floor_label: string } | null;
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{unit?.floor_label ?? "—"}</td>
                  <td className="px-3 py-2">{formatEur(Number(r.amount), locale)}</td>
                  <td className="px-3 py-2">
                    {r.paid_via_bank ? tCommon("yes") : tCommon("no")}
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(r.receipt_date, locale)}
                  </td>
                  <td className="px-3 py-2">
                    {r.receipt_issued ? tCommon("yes") : tCommon("no")}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate">{r.notes}</td>
                  {isManager && (
                    <td className="px-3 py-2">
                      <form
                        action={async () => {
                          "use server";
                          await deleteReceipt(r.id, id);
                        }}
                      >
                        <Button type="submit" variant="ghost" size="sm">
                          {tCommon("delete")}
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isManager && fy && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addReceipt} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="condoId" value={id} />
              <input type="hidden" name="fiscalYearId" value={fy.id} />
              <div className="space-y-1">
                <Label htmlFor="unitId">{t("unit")}</Label>
                <select
                  id="unitId"
                  name="unitId"
                  className="flex h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
                  required
                >
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.floor_label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">{tCommon("amount")}</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receiptDate">{tCommon("date")}</Label>
                <Input id="receiptDate" name="receiptDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">{tCommon("notes")}</Label>
                <Input id="notes" name="notes" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="paidViaBank" /> {t("viaBank")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="receiptIssued" /> {t("issued")}
              </label>
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
