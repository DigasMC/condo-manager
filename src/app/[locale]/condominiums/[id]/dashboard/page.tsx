import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess, getFiscalYear } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { YearPicker } from "@/components/condo/year-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEur } from "@/lib/utils";
import { updateFiscalBalances } from "@/app/actions/condo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function CondoDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale, id } = await params;
  const { year: yearParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);
  const yearNum = yearParam ? Number(yearParam) : undefined;
  const { fy, years } = await getFiscalYear(supabase, id, yearNum);

  let income = 0;
  let expenses = 0;
  let bankFees = 0;
  const byCategory: Record<string, number> = {};

  if (fy) {
    const [{ data: receipts }, { data: expenseRows }, { data: bankRows }] =
      await Promise.all([
        supabase.from("receipts").select("amount").eq("fiscal_year_id", fy.id),
        supabase
          .from("expenses")
          .select("amount, category")
          .eq("fiscal_year_id", fy.id),
        supabase
          .from("bank_transactions")
          .select("amount")
          .eq("fiscal_year_id", fy.id),
      ]);
    income = (receipts ?? []).reduce((s, r) => s + Number(r.amount), 0);
    expenses = (expenseRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
    bankFees = (bankRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
    for (const row of expenseRows ?? []) {
      byCategory[row.category] =
        (byCategory[row.category] ?? 0) + Number(row.amount);
    }
  }

  const opening = Number(fy?.opening_balance ?? 0);
  const saldo = opening + income + bankFees - expenses;
  const bank = Number(fy?.bank_balance ?? 0);
  const cash = Number(fy?.cash_balance ?? 0);

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <Suspense>
          <YearPicker years={years} currentYear={fy?.year ?? new Date().getFullYear()} />
        </Suspense>
      </div>

      {!fy ? (
        <p className="text-stone-600">No fiscal year data yet.</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("openingBalance")} value={formatEur(opening, locale)} />
            <Stat label={t("income")} value={formatEur(income, locale)} />
            <Stat label={t("expenseTotal")} value={formatEur(expenses, locale)} />
            <Stat label={t("saldo")} value={formatEur(saldo, locale)} highlight />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Stat label={t("bank")} value={formatEur(bank, locale)} />
            <Stat label={t("cash")} value={formatEur(cash, locale)} />
            <Stat
              label={`${t("bank")} + ${t("cash")}`}
              value={formatEur(bank + cash, locale)}
            />
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("expenseTotal")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(byCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span>{cat}</span>
                    <span>{formatEur(amt, locale)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 text-sm font-medium">
                  <span>{t("bankFees")}</span>
                  <span>{formatEur(bankFees, locale)}</span>
                </div>
              </CardContent>
            </Card>

            {isManager && (
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("edit")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={updateFiscalBalances} className="space-y-3">
                    <input type="hidden" name="condoId" value={id} />
                    <input type="hidden" name="fiscalYearId" value={fy.id} />
                    <Field
                      name="openingBalance"
                      label={t("openingBalance")}
                      defaultValue={opening}
                    />
                    <Field name="bankBalance" label={t("bank")} defaultValue={bank} />
                    <Field name="cashBalance" label={t("cash")} defaultValue={cash} />
                    <Field
                      name="monthlyQuota"
                      label="Quota"
                      defaultValue={Number(fy.monthly_quota_amount)}
                    />
                    <Button type="submit">{tCommon("save")}</Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-teal-700" : undefined}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}
