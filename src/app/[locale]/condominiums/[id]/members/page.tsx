import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCondoAccess } from "@/lib/condo-data";
import { AppShell } from "@/components/condo/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMember, updateMemberAccess } from "@/app/actions/condo";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");
  const tCommon = await getTranslations("common");
  const { supabase, condo, isManager } = await requireCondoAccess(id, locale);

  const { data: members } = await supabase
    .from("condominium_members")
    .select("id, role, has_platform_access, user_id, people(full_name, email)")
    .eq("condominium_id", id);

  return (
    <AppShell condoId={id} condoName={condo.name}>
      <h1 className="mb-6 font-display text-3xl font-semibold">{t("title")}</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">{t("role")}</th>
              <th className="px-3 py-2">{t("platformAccess")}</th>
              <th className="px-3 py-2">Email</th>
              {isManager && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => {
              const person = m.people as unknown as {
                full_name: string;
                email: string | null;
              } | null;
              return (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {person?.full_name ?? (m.user_id ? "Utilizador" : "—")}
                  </td>
                  <td className="px-3 py-2">
                    {m.role === "manager" ? t("manager") : t("member")}
                  </td>
                  <td className="px-3 py-2">
                    {m.has_platform_access ? tCommon("yes") : tCommon("no")}
                  </td>
                  <td className="px-3 py-2">{person?.email ?? "—"}</td>
                  {isManager && (
                    <td className="px-3 py-2">
                      <form
                        action={async () => {
                          "use server";
                          await updateMemberAccess(
                            m.id,
                            !m.has_platform_access,
                            id,
                          );
                        }}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          {t("platformAccess")}
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

      {isManager && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("addMember")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addMember} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="condoId" value={id} />
              <div className="space-y-1">
                <Label htmlFor="fullName">Nome</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">{t("inviteEmail")}</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">{t("role")}</Label>
                <select
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
                >
                  <option value="member">{t("member")}</option>
                  <option value="manager">{t("manager")}</option>
                </select>
              </div>
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" name="hasPlatformAccess" />{" "}
                {t("platformAccess")}
              </label>
              <Button type="submit">{tCommon("add")}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
