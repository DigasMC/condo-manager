import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess, getFiscalYear } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { YearPicker } from "@/components/condo/year-picker";
import { QuotaGrid } from "@/components/condo/quota-grid";

export default async function QuotasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale, id } = await params;
  const { year: yearParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("quotas");
  const tMonths = await getTranslations("months");
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

  const { data: statuses } = fy
    ? await supabase
        .from("quota_statuses")
        .select("id, unit_id, month, paid")
        .eq("fiscal_year_id", fy.id)
    : { data: [] };

  const monthLabels: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) monthLabels[String(i)] = tMonths(String(i));

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
          {fy && (
            <p className="mt-1 text-sm text-stone-600">
              {t("monthlyAmount")}: €{Number(fy.monthly_quota_amount).toFixed(2)}
            </p>
          )}
        </div>
        <Suspense>
          <YearPicker
            years={years}
            currentYear={fy?.year ?? new Date().getFullYear()}
          />
        </Suspense>
      </div>

      {fy && units ? (
        <QuotaGrid
          condoId={id}
          fiscalYearId={fy.id}
          monthlyAmount={Number(fy.monthly_quota_amount)}
          units={units}
          statuses={statuses ?? []}
          monthLabels={monthLabels}
          canEdit={isManager}
        />
      ) : (
        <p className="text-stone-600">No fiscal year.</p>
      )}
    </AppShell>
  );
}
