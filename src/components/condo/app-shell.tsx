"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const condoLinks = [
  { href: "dashboard", key: "dashboard" },
  { href: "units", key: "units" },
  { href: "quotas", key: "quotas" },
  { href: "receipts", key: "receipts" },
  { href: "expenses", key: "expenses" },
  { href: "bank", key: "bank" },
  { href: "providers", key: "providers" },
  { href: "members", key: "members" },
] as const;

export function AppShell({
  children,
  condoId,
  condoName,
}: {
  children: React.ReactNode;
  condoId?: string;
  condoName?: string;
}) {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function switchLocale() {
    const next = locale === "pt" ? "en" : "pt";
    window.location.href = `/${next}${pathname}`;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-semibold text-teal-900">
              {tApp("name")}
            </Link>
            {condoName && (
              <span className="hidden text-sm text-stone-500 sm:inline">
                / {condoName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={switchLocale}>
              {locale === "pt" ? "EN" : "PT"}
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              {t("signOut")}
            </Button>
          </div>
        </div>
        {condoId && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
            {condoLinks.map((link) => {
              const href = `/condominiums/${condoId}/${link.href}`;
              const active = pathname.includes(`/${link.href}`);
              return (
                <Link
                  key={link.href}
                  href={href}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                    active
                      ? "bg-teal-900 text-white"
                      : "text-stone-600 hover:bg-stone-100",
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
