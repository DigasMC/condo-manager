"use client";

import { useTransition } from "react";
import { upsertQuotaStatuses } from "@/app/actions/condo";
import { cn } from "@/lib/utils";

export function QuotaGrid({
  condoId,
  fiscalYearId,
  monthlyAmount,
  units,
  statuses,
  monthLabels,
  canEdit,
}: {
  condoId: string;
  fiscalYearId: string;
  monthlyAmount: number;
  units: { id: string; floor_label: string }[];
  statuses: { id: string; unit_id: string; month: number; paid: boolean }[];
  monthLabels: Record<string, string>;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const map = new Map(
    statuses.map((s) => [`${s.unit_id}-${s.month}`, s] as const),
  );

  function toggle(unitId: string, month: number, current: boolean) {
    if (!canEdit) return;
    startTransition(async () => {
      await upsertQuotaStatuses(
        fiscalYearId,
        unitId,
        month,
        !current,
        condoId,
      );
    });
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-white", pending && "opacity-70")}>
      <table className="w-full min-w-[900px] text-center text-sm">
        <thead className="border-b bg-stone-50">
          <tr>
            <th className="px-2 py-2 text-left">—</th>
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i + 1} className="px-1 py-2">
                {monthLabels[String(i + 1)]}
              </th>
            ))}
            <th className="px-2 py-2">€</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => {
            let paidCount = 0;
            return (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-2 py-2 text-left font-medium">{u.floor_label}</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const st = map.get(`${u.id}-${month}`);
                  const paid = st?.paid ?? false;
                  if (paid) paidCount += 1;
                  return (
                    <td key={month} className="px-1 py-1">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => toggle(u.id, month, paid)}
                        className={cn(
                          "h-7 w-7 rounded",
                          paid ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-400",
                        )}
                        aria-label={`${u.floor_label} ${month}`}
                      >
                        {paid ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-2 font-medium">
                  {(paidCount * monthlyAmount).toFixed(0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
