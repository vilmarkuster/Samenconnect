# Zorenta MVP – Deployment

## Environment variables

Set in Vercel (or `.env.local` for local dev):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://your-app.vercel.app`) for redirects and API calls |

Optional (for existing AI App Builder features):

- `ANTHROPIC_API_KEY` – AI Chat / app plan generation
- `DATABASE_URL` – Direct Postgres (if used by scaffold)

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run migrations in order:
   - `supabase/migrations/20250315000000_zorenta_phase1.sql` (or `20250315100000_zorenta_profiles_id_fk.sql` if you had the old schema)
   - `supabase/migrations/20250315200000_zorenta_mvp_full.sql`
3. **Authentication** → Settings: enable Email provider; optionally disable “Confirm email” for faster testing.
4. **RLS**: All Zorenta tables use RLS; policies are in the migrations.

## Migrations to run (exact order)

1. **Phase 1 (profiles):**  
   Run the full contents of `supabase/migrations/20250315000000_zorenta_phase1.sql`.

2. **MVP (jobs, applications, messaging, reviews, notifications):**  
   Run the full contents of `supabase/migrations/20250315200000_zorenta_mvp_full.sql`.

If you already have the old Phase 1 schema (with `auth_user_id`), run `supabase/migrations/20250315100000_zorenta_profiles_id_fk.sql` first to fix it, then run `20250315200000_zorenta_mvp_full.sql`.

## Vercel

1. Connect the repo to Vercel.
2. Add the environment variables above.
3. Deploy. Zorenta routes live under `/zorenta`.

## First URL

- **App:** `https://your-domain.com/zorenta`
- **Login:** `https://your-domain.com/zorenta/login`
- **Register:** `https://your-domain.com/zorenta/register`

## Post-launch

- Enable email confirmation in Supabase if desired.
- Add `SUPABASE_SERVICE_ROLE_KEY` only if you need server-side notifications or admin actions; MVP uses triggers for application notifications.
- Consider rate limiting and CAPTCHA on register/login for production.
