import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(pt|en)(\/|$)/);
  const locale = localeMatch?.[1] ?? "pt";
  const pathWithoutLocale = localeMatch
    ? pathname.slice(locale.length + 1) || "/"
    : pathname;

  const isAuthRoute =
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale.startsWith("/signup") ||
    pathWithoutLocale.startsWith("/forgot-password") ||
    pathWithoutLocale.startsWith("/auth");

  const isProtected =
    pathWithoutLocale.startsWith("/dashboard") ||
    pathWithoutLocale.startsWith("/condominiums") ||
    pathWithoutLocale === "/";

  if (!user && isProtected && pathWithoutLocale !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !pathWithoutLocale.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(request);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
