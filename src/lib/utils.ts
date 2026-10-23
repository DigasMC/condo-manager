import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-PT").format(
    new Date(date + (date.length === 10 ? "T00:00:00" : "")),
  );
}
