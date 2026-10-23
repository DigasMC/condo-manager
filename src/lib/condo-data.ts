import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export async function requireCondoAccess(condoId: string, locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("Unauthenticated");
  }

  const { data: membership } = await supabase
    .from("condominium_members")
    .select("role, has_platform_access")
    .eq("condominium_id", condoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.has_platform_access) {
    redirect({ href: "/dashboard", locale });
    throw new Error("Forbidden");
  }

  const { data: condo } = await supabase
    .from("condominiums")
    .select("*")
    .eq("id", condoId)
    .single();

  if (!condo) {
    redirect({ href: "/dashboard", locale });
    throw new Error("Not found");
  }

  return {
    supabase,
    user,
    condo,
    isManager: membership.role === "manager",
  };
}

export async function getFiscalYear(
  supabase: Awaited<ReturnType<typeof createClient>>,
  condoId: string,
  year?: number,
) {
  const targetYear = year ?? new Date().getFullYear();
  let { data: fy } = await supabase
    .from("fiscal_years")
    .select("*")
    .eq("condominium_id", condoId)
    .eq("year", targetYear)
    .maybeSingle();

  if (!fy) {
    const { data: latest } = await supabase
      .from("fiscal_years")
      .select("*")
      .eq("condominium_id", condoId)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();
    fy = latest;
  }

  const { data: years } = await supabase
    .from("fiscal_years")
    .select("id, year")
    .eq("condominium_id", condoId)
    .order("year", { ascending: false });

  return { fy, years: years ?? [] };
}
