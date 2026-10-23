"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCondominium(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim() || null;
  if (!name) return { error: "Name required" as const };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_condominium", {
    p_name: name,
    p_address: address,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { id: data as string };
}

export async function claimSeededCondominium() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: claimId, error: claimError } = await supabase.rpc(
    "claim_seeded_condominium",
  );
  if (claimError) return { error: claimError.message };
  revalidatePath("/", "layout");
  return { id: claimId as string };
}

export async function createFiscalYear(
  condominiumId: string,
  year: number,
  monthlyQuota = 20,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fiscal_years")
    .insert({
      condominium_id: condominiumId,
      year,
      monthly_quota_amount: monthlyQuota,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return { id: data.id };
}

export async function toggleQuota(
  statusId: string,
  paid: boolean,
  condoId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quota_statuses")
    .update({ paid })
    .eq("id", statusId);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/quotas`);
  return;
}

export async function upsertQuotaStatuses(
  fiscalYearId: string,
  unitId: string,
  month: number,
  paid: boolean,
  condoId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("quota_statuses").upsert(
    {
      fiscal_year_id: fiscalYearId,
      unit_id: unitId,
      month,
      paid,
    },
    { onConflict: "fiscal_year_id,unit_id,month" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/quotas`);
  return;
}

export async function addReceipt(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const payload = {
    fiscal_year_id: String(formData.get("fiscalYearId")),
    unit_id: String(formData.get("unitId")) || null,
    amount: Number(formData.get("amount")),
    paid_via_bank: formData.get("paidViaBank") === "on",
    receipt_date: String(formData.get("receiptDate")),
    receipt_issued: formData.get("receiptIssued") === "on",
    notes: String(formData.get("notes") || "") || null,
  };
  const { error } = await supabase.from("receipts").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/receipts`);
  return;
}

export async function deleteReceipt(id: string, condoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/receipts`);
  return;
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const periodMonth = formData.get("periodMonth");
  const payload = {
    fiscal_year_id: String(formData.get("fiscalYearId")),
    category: String(formData.get("category")),
    amount: Number(formData.get("amount")),
    expense_date: String(formData.get("expenseDate")),
    period_month: periodMonth ? Number(periodMonth) : null,
    notes: String(formData.get("notes") || "") || null,
  };
  const { error } = await supabase.from("expenses").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/expenses`);
  return;
}

export async function deleteExpense(id: string, condoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/expenses`);
  return;
}

export async function addBankTx(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const payload = {
    fiscal_year_id: String(formData.get("fiscalYearId")),
    amount: Number(formData.get("amount")),
    transaction_date: String(formData.get("transactionDate")),
    notes: String(formData.get("notes") || "") || null,
  };
  const { error } = await supabase.from("bank_transactions").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/bank`);
  return;
}

export async function deleteBankTx(id: string, condoId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_transactions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/bank`);
  return;
}

export async function addProvider(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const payload = {
    condominium_id: condoId,
    service_type: String(formData.get("serviceType")),
    name: String(formData.get("name") || "") || null,
    contact: String(formData.get("contact") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };
  const { error } = await supabase.from("service_providers").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/providers`);
  return;
}

export async function deleteProvider(id: string, condoId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_providers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/providers`);
  return;
}

export async function addUnit(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const unit = {
    condominium_id: condoId,
    code: String(formData.get("code")),
    floor_label: String(formData.get("floorLabel")),
    permilage: Number(formData.get("permilage") || 0),
  };
  const { data: unitRow, error } = await supabase
    .from("units")
    .insert(unit)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const residentName = String(formData.get("residentName") || "").trim();
  if (residentName) {
    const { data: person, error: pErr } = await supabase
      .from("people")
      .insert({
        condominium_id: condoId,
        full_name: residentName,
        nif: String(formData.get("nif") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
      })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);
    await supabase.from("unit_residents").insert({
      unit_id: unitRow.id,
      person_id: person.id,
      is_primary: true,
    });
  }

  revalidatePath(`/condominiums/${condoId}/units`);
  return;
}

export async function addMember(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const fullName = String(formData.get("fullName"));
  const email = String(formData.get("email") || "").trim() || null;
  const role = String(formData.get("role") || "member") as "manager" | "member";
  const hasAccess = formData.get("hasPlatformAccess") === "on";

  const { data: person, error: pErr } = await supabase
    .from("people")
    .insert({
      condominium_id: condoId,
      full_name: fullName,
      email,
    })
    .select("id")
    .single();
  if (pErr) throw new Error(pErr.message);

  const { error } = await supabase.from("condominium_members").insert({
    condominium_id: condoId,
    person_id: person.id,
    role,
    has_platform_access: hasAccess && !!email,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/members`);
  return;
}

export async function updateMemberAccess(
  memberId: string,
  hasPlatformAccess: boolean,
  condoId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("condominium_members")
    .update({ has_platform_access: hasPlatformAccess })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/members`);
  return;
}

export async function updateFiscalBalances(formData: FormData) {
  const supabase = await createClient();
  const condoId = String(formData.get("condoId"));
  const fyId = String(formData.get("fiscalYearId"));
  const { error } = await supabase
    .from("fiscal_years")
    .update({
      opening_balance: Number(formData.get("openingBalance")),
      bank_balance: Number(formData.get("bankBalance")),
      cash_balance: Number(formData.get("cashBalance")),
      monthly_quota_amount: Number(formData.get("monthlyQuota")),
    })
    .eq("id", fyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/condominiums/${condoId}/dashboard`);
  return;
}
