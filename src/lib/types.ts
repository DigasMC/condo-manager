export type MemberRole = "manager" | "member";

export type Condominium = {
  id: string;
  name: string;
  address: string | null;
  currency: string;
};

export type Membership = {
  id: string;
  role: MemberRole;
  has_platform_access: boolean;
  condominiums: Condominium;
};

export type Unit = {
  id: string;
  code: string;
  floor_label: string;
  permilage: number;
};

export type Person = {
  id: string;
  full_name: string;
  nif: string | null;
  phone: string | null;
  email: string | null;
};

export type FiscalYear = {
  id: string;
  year: number;
  opening_balance: number;
  monthly_quota_amount: number;
  bank_balance: number;
  cash_balance: number;
};
