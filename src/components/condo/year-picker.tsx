"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function YearPicker({
  years,
  currentYear,
}: {
  years: { id: string; year: number }[];
  currentYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!years.length) return null;

  return (
    <select
      className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm"
      value={currentYear}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("year", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {years.map((y) => (
        <option key={y.id} value={y.year}>
          {y.year}
        </option>
      ))}
    </select>
  );
}
