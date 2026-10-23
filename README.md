# Condo Manager

Next.js app for Portuguese condominium cost management (quotas, receipts, expenses, bank, balance), with Supabase Auth and i18n (`pt` / `en`).

## Stack

- Next.js 15 App Router + Tailwind CSS
- Supabase (Postgres + Auth: email/password + Google)
- next-intl (`/pt`, `/en`)
- Vercel

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev
```

Open [http://localhost:3000/pt/login](http://localhost:3000/pt/login).

## Seed data

Excel files under `data/` were imported into Supabase as **Condomínio Principal** (2025 + 2026).

After first sign-in, click **Assumir gestão do condomínio importado** / **Claim management of imported condominium**.

To re-seed (requires service role key):

```bash
SUPABASE_SERVICE_ROLE_KEY=... pnpm seed
```

## Auth setup (Supabase dashboard)

1. Authentication → Providers → enable Email and Google
2. Redirect URLs: `http://localhost:3000/**` and `https://<your-vercel-domain>/**`
3. Site URL: your Vercel production URL

## Scripts

- `pnpm dev` — development server
- `pnpm build` / `pnpm start` — production
- `pnpm seed` — import Excel into Supabase
