-- Condo Manager schema + RLS
create schema if not exists private;

create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  preferred_locale text not null default 'pt' check (preferred_locale in ('pt', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Condominiums
create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text default 'Portugal',
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- People (contacts; may not have platform access)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  full_name text not null,
  nif text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_condo_idx on public.people (condominium_id);
create index people_email_idx on public.people (lower(email));

-- Membership: managers and members (with or without login)
create type public.member_role as enum ('manager', 'member');

create table public.condominium_members (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  role public.member_role not null default 'member',
  has_platform_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_identity check (user_id is not null or person_id is not null)
);

create unique index condominium_members_user_unique
  on public.condominium_members (condominium_id, user_id)
  where user_id is not null;

create index condominium_members_user_idx on public.condominium_members (user_id);
create index condominium_members_condo_idx on public.condominium_members (condominium_id);

-- Units (frações)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  code text not null,
  floor_label text not null,
  permilage numeric(8, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, code),
  unique (condominium_id, floor_label)
);

create index units_condo_idx on public.units (condominium_id);

-- Unit residents
create table public.unit_residents (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, person_id)
);

-- Fiscal years
create table public.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  year integer not null,
  opening_balance numeric(12, 2) not null default 0,
  monthly_quota_amount numeric(12, 2) not null default 20,
  bank_balance numeric(12, 2) not null default 0,
  cash_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, year)
);

-- Quota paid status grid
create table public.quota_statuses (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  paid boolean not null default false,
  unique (fiscal_year_id, unit_id, month)
);

create index quota_statuses_year_idx on public.quota_statuses (fiscal_year_id);

-- Receipts (Recibos)
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  amount numeric(12, 2) not null,
  paid_via_bank boolean not null default false,
  receipt_date date not null,
  receipt_issued boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_year_idx on public.receipts (fiscal_year_id);

-- Expenses (Pagamentos)
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years (id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null,
  expense_date date not null,
  period_month smallint check (period_month is null or period_month between 1 and 12),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_year_idx on public.expenses (fiscal_year_id);

-- Bank transactions
create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years (id) on delete cascade,
  amount numeric(12, 2) not null,
  transaction_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bank_transactions_year_idx on public.bank_transactions (fiscal_year_id);

-- Service providers
create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  service_type text not null,
  name text,
  contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper functions (private schema, security definer)
create or replace function private.is_condo_member(p_condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.condominium_members m
    where m.condominium_id = p_condo_id
      and m.user_id = auth.uid()
      and m.has_platform_access = true
  );
$$;

create or replace function private.is_condo_manager(p_condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.condominium_members m
    where m.condominium_id = p_condo_id
      and m.user_id = auth.uid()
      and m.role = 'manager'
      and m.has_platform_access = true
  );
$$;

create or replace function private.condo_id_from_fiscal_year(p_fy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select condominium_id from public.fiscal_years where id = p_fy_id;
$$;

create or replace function private.condo_id_from_unit(p_unit_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select condominium_id from public.units where id = p_unit_id;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  -- Link memberships by email
  update public.condominium_members m
  set user_id = new.id,
      has_platform_access = true,
      updated_at = now()
  from public.people p
  where m.person_id = p.id
    and m.user_id is null
    and p.email is not null
    and lower(p.email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create condo + first manager
create or replace function public.create_condominium(p_name text, p_address text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.condominiums (name, address, created_by)
  values (p_name, p_address, auth.uid())
  returning id into v_id;
  insert into public.condominium_members (condominium_id, user_id, role, has_platform_access)
  values (v_id, auth.uid(), 'manager', true);
  return v_id;
end;
$$;

grant execute on function public.create_condominium(text, text) to authenticated;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.condominiums enable row level security;
alter table public.people enable row level security;
alter table public.condominium_members enable row level security;
alter table public.units enable row level security;
alter table public.unit_residents enable row level security;
alter table public.fiscal_years enable row level security;
alter table public.quota_statuses enable row level security;
alter table public.receipts enable row level security;
alter table public.expenses enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.service_providers enable row level security;

-- Profiles policies
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Condominiums
create policy condominiums_select on public.condominiums
  for select to authenticated using (private.is_condo_member(id));
create policy condominiums_insert on public.condominiums
  for insert to authenticated with check (created_by = auth.uid());
create policy condominiums_update on public.condominiums
  for update to authenticated using (private.is_condo_manager(id));
create policy condominiums_delete on public.condominiums
  for delete to authenticated using (private.is_condo_manager(id));

-- Members
create policy members_select on public.condominium_members
  for select to authenticated using (private.is_condo_member(condominium_id) or user_id = auth.uid());
create policy members_insert on public.condominium_members
  for insert to authenticated with check (private.is_condo_manager(condominium_id));
create policy members_update on public.condominium_members
  for update to authenticated using (private.is_condo_manager(condominium_id));
create policy members_delete on public.condominium_members
  for delete to authenticated using (private.is_condo_manager(condominium_id));

-- People
create policy people_select on public.people
  for select to authenticated using (private.is_condo_member(condominium_id));
create policy people_insert on public.people
  for insert to authenticated with check (private.is_condo_manager(condominium_id));
create policy people_update on public.people
  for update to authenticated using (private.is_condo_manager(condominium_id));
create policy people_delete on public.people
  for delete to authenticated using (private.is_condo_manager(condominium_id));

-- Units
create policy units_select on public.units
  for select to authenticated using (private.is_condo_member(condominium_id));
create policy units_insert on public.units
  for insert to authenticated with check (private.is_condo_manager(condominium_id));
create policy units_update on public.units
  for update to authenticated using (private.is_condo_manager(condominium_id));
create policy units_delete on public.units
  for delete to authenticated using (private.is_condo_manager(condominium_id));

-- Unit residents
create policy unit_residents_select on public.unit_residents
  for select to authenticated using (private.is_condo_member(private.condo_id_from_unit(unit_id)));
create policy unit_residents_insert on public.unit_residents
  for insert to authenticated with check (private.is_condo_manager(private.condo_id_from_unit(unit_id)));
create policy unit_residents_update on public.unit_residents
  for update to authenticated using (private.is_condo_manager(private.condo_id_from_unit(unit_id)));
create policy unit_residents_delete on public.unit_residents
  for delete to authenticated using (private.is_condo_manager(private.condo_id_from_unit(unit_id)));

-- Fiscal years
create policy fiscal_years_select on public.fiscal_years
  for select to authenticated using (private.is_condo_member(condominium_id));
create policy fiscal_years_insert on public.fiscal_years
  for insert to authenticated with check (private.is_condo_manager(condominium_id));
create policy fiscal_years_update on public.fiscal_years
  for update to authenticated using (private.is_condo_manager(condominium_id));
create policy fiscal_years_delete on public.fiscal_years
  for delete to authenticated using (private.is_condo_manager(condominium_id));

-- Quota statuses
create policy quota_statuses_select on public.quota_statuses
  for select to authenticated using (private.is_condo_member(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy quota_statuses_insert on public.quota_statuses
  for insert to authenticated with check (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy quota_statuses_update on public.quota_statuses
  for update to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy quota_statuses_delete on public.quota_statuses
  for delete to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));

-- Receipts
create policy receipts_select on public.receipts
  for select to authenticated using (private.is_condo_member(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy receipts_insert on public.receipts
  for insert to authenticated with check (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy receipts_update on public.receipts
  for update to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy receipts_delete on public.receipts
  for delete to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));

-- Expenses
create policy expenses_select on public.expenses
  for select to authenticated using (private.is_condo_member(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy expenses_insert on public.expenses
  for insert to authenticated with check (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy expenses_update on public.expenses
  for update to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy expenses_delete on public.expenses
  for delete to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));

-- Bank transactions
create policy bank_transactions_select on public.bank_transactions
  for select to authenticated using (private.is_condo_member(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy bank_transactions_insert on public.bank_transactions
  for insert to authenticated with check (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy bank_transactions_update on public.bank_transactions
  for update to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));
create policy bank_transactions_delete on public.bank_transactions
  for delete to authenticated using (private.is_condo_manager(private.condo_id_from_fiscal_year(fiscal_year_id)));

-- Service providers
create policy service_providers_select on public.service_providers
  for select to authenticated using (private.is_condo_member(condominium_id));
create policy service_providers_insert on public.service_providers
  for insert to authenticated with check (private.is_condo_manager(condominium_id));
create policy service_providers_update on public.service_providers
  for update to authenticated using (private.is_condo_manager(condominium_id));
create policy service_providers_delete on public.service_providers
  for delete to authenticated using (private.is_condo_manager(condominium_id));
