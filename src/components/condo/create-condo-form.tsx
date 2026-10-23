"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createCondominium, claimSeededCondominium } from "@/app/actions/condo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateCondoForm() {
  const t = useTranslations("home");
  const tMembers = useTranslations("members");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setError(null);
    const result = await createCondominium(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.id) router.push(`/condominiums/${result.id}/dashboard`);
  }

  async function onClaim() {
    setError(null);
    const result = await claimSeededCondominium();
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.id) router.push(`/condominiums/${result.id}/dashboard`);
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="secondary" onClick={onClaim}>
        {tMembers("claimSeed")}
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" name="address" />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit">{tCommon("save")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
