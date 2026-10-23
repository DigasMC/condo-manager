import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess, getFiscalYear } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { YearPicker } from "@/components/condo/year-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addExpense, deleteExpense } from "@/app/actions/condo";
import { formatEur, formatDate } from "@/lib/utils";

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale, id } = await params;
  const { year: yearParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("expenses");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);
  const { fy, years } = await getFiscalYear(
    supabase,
    id,
    yearParam ? Number(yearParam) : undefined,
  );

  const { data: expenses } = fy
    ? await supabase
        .from("expenses")
        .select("*")
        .eq("fiscal_year_id", fy.id)
        .order("expense_date", { ascending: false })
    : { data: [] };

  const total = (expenses ?? []).reduce((s, r) => s + Number(r.amount), 0);

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
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">{t("category")}</th>
              <th className="px-3 py-2">{tCommon("amount")}</th>
              <th className="px-3 py-2">{tCommon("date")}</th>
              <th className="px-3 py-2">{t("periodMonth")}</th>
              <th className="px-3 py-2">{tCommon("notes")}</th>
              {isManager && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {(expenses ?? []).map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-3 py-2">{e.category}</td>
                <td className="px-3 py-2">{formatEur(Number(e.amount), locale)}</td>
                <td className="px-3 py-2">{formatDate(e.expense_date, locale)}</td>
                <td className="px-3 py-2">{e.period_month ?? "—"}</td>
                <td className="px-3 py-2 max-w-xs truncate">{e.notes}</td>
                {isManager && (
                  <td className="px-3 py-2">
                    <form
                      action={async () => {
                        "use server";
                        await deleteExpense(e.id, id);
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

      {isManager && fy && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addExpense} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="condoId" value={id} />
              <input type="hidden" name="fiscalYearId" value={fy.id} />
              <div className="space-y-1">
                <Label htmlFor="category">{t("category")}</Label>
                <Input id="category" name="category" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">{tCommon("amount")}</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expenseDate">{tCommon("date")}</Label>
                <Input id="expenseDate" name="expenseDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="periodMonth">{t("periodMonth")}</Label>
                <Input id="periodMonth" name="periodMonth" type="number" min={1} max={12} />
              </div>
              <div className="space-y-1 sm:col-span-2">
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
