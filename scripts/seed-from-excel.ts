/**
 * Seed condominium data from Excel spreadsheets.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function excelDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

function truthy(v: unknown): boolean {
  return v === true || v === "TRUE" || v === 1 || v === "1";
}

async function seedYear(
  condoId: string,
  unitByFloor: Map<string, string>,
  filePath: string,
  year: number,
  openingBalance: number,
  bankBalance: number,
  cashBalance: number,
  quotasSheet: string,
) {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer", cellDates: true });

  const { data: fy, error: fyErr } = await supabase
    .from("fiscal_years")
    .upsert(
      {
        condominium_id: condoId,
        year,
        opening_balance: openingBalance,
        monthly_quota_amount: 20,
        bank_balance: bankBalance,
        cash_balance: cashBalance,
      },
      { onConflict: "condominium_id,year" },
    )
    .select("id")
    .single();
  if (fyErr) throw fyErr;

  // Quotas
  const quotaSheet = wb.Sheets[quotasSheet];
  if (quotaSheet) {
    const range = XLSX.utils.decode_range(quotaSheet["!ref"] || "A1");
    for (let r = 1; r <= range.e.r; r++) {
      const floorCell = quotaSheet[XLSX.utils.encode_cell({ r, c: 0 })];
      const floor = floorCell?.v;
      if (!floor || String(floor).toUpperCase() === "TOTAL") continue;
      const unitId = unitByFloor.get(String(floor).trim());
      if (!unitId) continue;
      for (let month = 1; month <= 12; month++) {
        const cell = quotaSheet[XLSX.utils.encode_cell({ r, c: month })];
        const paid = truthy(cell?.v);
        await supabase.from("quota_statuses").upsert(
          {
            fiscal_year_id: fy.id,
            unit_id: unitId,
            month,
            paid,
          },
          { onConflict: "fiscal_year_id,unit_id,month" },
        );
      }
    }
  }

  // Receipts
  const recibos = sheetRows(wb, "Recibos");
  for (const row of recibos) {
    const amount = Number(row["Montante"]);
    if (!amount || Number.isNaN(amount)) continue;
    const floor = String(row["Fração"] ?? "").trim();
    const unitId = unitByFloor.get(floor) ?? null;
    const date =
      excelDate(row["Dia"]) || `${year}-01-01`;
    await supabase.from("receipts").insert({
      fiscal_year_id: fy.id,
      unit_id: unitId,
      amount,
      paid_via_bank: truthy(row["Banco"]),
      receipt_date: date,
      receipt_issued: truthy(row["Recibo"]),
      notes: row["Notas"] ? String(row["Notas"]) : null,
    });
  }

  // Bank
  const banco = sheetRows(wb, "Banco");
  for (const row of banco) {
    const amount = Number(row["Montante"]);
    if (Number.isNaN(amount) || row["Montante"] == null) continue;
    if (typeof row["Montante"] === "string" && String(row["Montante"]).startsWith("="))
      continue;
    const date = excelDate(row["Dia"]);
    if (!date) continue;
    await supabase.from("bank_transactions").insert({
      fiscal_year_id: fy.id,
      amount,
      transaction_date: date,
      notes: row["Notas"] ? String(row["Notas"]) : null,
    });
  }

  // Expenses
  const pagamentos = sheetRows(wb, "Pagamentos");
  for (const row of pagamentos) {
    const amount = Number(row["Montante"]);
    if (!amount || Number.isNaN(amount)) continue;
    const category = String(row["Serviço"] ?? "").trim();
    if (!category) continue;
    const date = excelDate(row["Dia"]) || `${year}-01-01`;
    const period = excelDate(row["Mês"]);
    const periodMonth = period ? Number(period.slice(5, 7)) : null;
    await supabase.from("expenses").insert({
      fiscal_year_id: fy.id,
      category,
      amount,
      expense_date: date,
      period_month: periodMonth,
      notes: row["Notas"] ? String(row["Notas"]) : null,
    });
  }

  // Providers (from Serviços — only once, but upsert-ish)
  const servicos = sheetRows(wb, "Serviços");
  for (const row of servicos) {
    const service = String(row["Serviço"] ?? "").trim();
    if (!service) continue;
    const { data: existing } = await supabase
      .from("service_providers")
      .select("id")
      .eq("condominium_id", condoId)
      .eq("service_type", service)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("service_providers").insert({
      condominium_id: condoId,
      service_type: service,
      name: row["Nome"] ? String(row["Nome"]) : null,
      contact: row["Contacto"] ? String(row["Contacto"]) : null,
      notes: row["Notas"] ? String(row["Notas"]) : null,
    });
  }

  console.log(`Seeded year ${year}`);
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const file2025 = path.join(dataDir, "condominio-2025.xlsx");
  const file2026 = path.join(dataDir, "condominio-2026.xlsx");

  // Clear previous seed condo if re-running
  const { data: existing } = await supabase
    .from("condominiums")
    .select("id")
    .eq("name", "Condomínio Principal")
    .maybeSingle();
  if (existing) {
    console.log("Removing previous seed condominium…");
    await supabase.from("condominiums").delete().eq("id", existing.id);
  }

  const { data: condo, error: condoErr } = await supabase
    .from("condominiums")
    .insert({
      name: "Condomínio Principal",
      address: "Portugal",
      city: "Portugal",
      currency: "EUR",
    })
    .select("id")
    .single();
  if (condoErr) throw condoErr;

  const wb2025 = XLSX.read(fs.readFileSync(file2025), {
    type: "buffer",
    cellDates: true,
  });
  const condóminos = sheetRows(wb2025, "Condóminos");
  const unitByFloor = new Map<string, string>();

  for (const row of condóminos) {
    const code = String(row["Fração"] ?? "").trim();
    const floor = String(row["Andar"] ?? "").trim();
    if (!code || !floor) continue;
    const { data: unit, error } = await supabase
      .from("units")
      .insert({
        condominium_id: condo.id,
        code,
        floor_label: floor,
        permilage: Number(row["Permilagem"] ?? 0),
      })
      .select("id")
      .single();
    if (error) throw error;
    unitByFloor.set(floor, unit.id);

    const name = String(row["Nomes"] ?? "").trim();
    if (name) {
      const nif = row["NIF"] != null ? String(Math.trunc(Number(row["NIF"]))) : null;
      const phone =
        row["Contacto"] != null ? String(Math.trunc(Number(row["Contacto"]))) : null;
      const { data: person, error: pErr } = await supabase
        .from("people")
        .insert({
          condominium_id: condo.id,
          full_name: name,
          nif: nif && nif !== "NaN" ? nif : null,
          phone: phone && phone !== "NaN" ? phone : null,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      await supabase.from("unit_residents").insert({
        unit_id: unit.id,
        person_id: person.id,
        is_primary: true,
      });
      await supabase.from("condominium_members").insert({
        condominium_id: condo.id,
        person_id: person.id,
        role: "member",
        has_platform_access: false,
      });
    }
  }

  await seedYear(
    condo.id,
    unitByFloor,
    file2025,
    2025,
    1812.48,
    1736.15,
    860,
    "Quotas 25",
  );
  await seedYear(
    condo.id,
    unitByFloor,
    file2026,
    2026,
    2596.15,
    3581.68,
    1180.8,
    "Quotas 26",
  );

  console.log("Done. Condo id:", condo.id);
  console.log("Sign in and click “Claim management of imported condominium”.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
