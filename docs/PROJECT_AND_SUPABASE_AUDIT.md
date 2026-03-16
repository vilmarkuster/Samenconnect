# Project Structure & Supabase Schema Audit

Single source of truth for keeping the codebase and Supabase migrations synchronized. Update this doc when adding routes, tables, or migrations.

**Last audit:** 2025-03-15

---

## 1. Project structure

### 1.1 App routes (Next.js App Router)

| Route | File | Purpose |
|-------|------|--------|
| `/` | `app/page.tsx` | Root; redirects to dashboard or login |
| `/(auth)/login` | `app/(auth)/login/page.tsx` | Platform login |
| `/(auth)/signup` | `app/(auth)/signup/page.tsx` | Platform signup |
| `/(protected)/dashboard` | `app/(protected)/dashboard/page.tsx` | Main dashboard |
| `/(protected)/chat` | `app/(protected)/chat/page.tsx` | AI Chat |
| `/(protected)/agents` | `app/(protected)/agents/page.tsx` | Agents list |
| `/(protected)/workflows` | `app/(protected)/workflows/page.tsx` | Workflows list |
| `/(protected)/tasks` | `app/(protected)/tasks/page.tsx` | Task Runner |
| `/(protected)/prompts` | `app/(protected)/prompts/page.tsx` | Prompt Library (mock data) |
| `/(protected)/apps` | `app/(protected)/apps/page.tsx` | Generated apps list |
| `/(protected)/builder` | `app/(protected)/builder/page.tsx` | Latest app plan |
| `/(protected)/settings` | `app/(protected)/settings/page.tsx` | Settings |
| **Zorenta** | | |
| `/zorenta` | `app/zorenta/page.tsx` | Redirect → `/zorenta/dashboard` |
| `/zorenta/login` | `app/zorenta/login/page.tsx` | Zorenta login |
| `/zorenta/register` | `app/zorenta/register/page.tsx` | Zorenta register + complete profile |
| `/zorenta/dashboard` | `app/zorenta/dashboard/page.tsx` | Zorenta dashboard |
| `/zorenta/caregivers/me/edit` | `app/zorenta/caregivers/me/edit/page.tsx` | Edit caregiver profile |
| `/zorenta/clients/me/edit` | `app/zorenta/clients/me/edit/page.tsx` | Edit client profile |
| `/zorenta/organizations/me/edit` | `app/zorenta/organizations/me/edit/page.tsx` | Edit organization profile |
| **Generated apps** | | |
| `/generated-apps/klanten-crm/*` | `app/generated-apps/klanten-crm/...` | Klanten CRM (companies, contacts, deals, tasks, activities) |

### 1.2 API routes

| Path | Methods | Supabase table(s) |
|------|--------|-------------------|
| `/api/agents` | GET, POST | `agents` |
| `/api/agents/run` | POST | (Claude), `runs` |
| `/api/agents` (by id) | DELETE | `agents` |
| `/api/workflows` | GET, POST | `workflows` |
| `/api/tasks` | GET, POST | `tasks` |
| `/api/runs` | GET, POST | `runs` |
| `/api/app-plans` | GET, POST | `app_plans` |
| `/api/app-plans/scaffold` | POST | `app_plans`, `generated_apps` (+ optional dynamic tables) |
| `/api/chat` | POST | `app_plans` (when creating app plan) |
| `/api/generated-apps` | GET | `generated_apps` |
| `/api/zorenta/auth/register` | POST | `profiles` |
| `/api/zorenta/me` | GET, PUT | `profiles`, `caregiver_profiles` / `client_profiles` / `organization_profiles` |
| `/api/zorenta/caregivers/me` | GET, POST, PUT | `caregiver_profiles` |
| `/api/zorenta/clients/me` | GET, POST, PUT | `client_profiles` |
| `/api/zorenta/organizations/me` | GET, POST, PUT | `organization_profiles` |
| `/api/generated-apps/klanten-crm/stats` | GET | `companies`, `deals`, `tasks` (Klanten CRM) |
| `/api/generated-apps/klanten-crm/[entity]` | GET, POST | Dynamic: `companies` \| `contacts` \| `deals` \| `tasks` \| `activities` |
| `/api/generated-apps/klanten-crm/[entity]/[id]` | GET, PUT, DELETE | Same entities |

### 1.3 Lib

| Path | Purpose |
|------|--------|
| `lib/supabase-client.ts` | Singleton Supabase client (anon key) |
| `lib/auth-context.tsx` | Auth state + login/logout |
| `lib/require-auth.tsx` | Protects (protected) routes |
| `lib/utils.ts` | cn() etc. |
| `lib/app-plan-scaffold.ts` | App plan → SQL, API routes, UI files |
| `lib/zorenta/supabase-server.ts` | Supabase client with user JWT; `getAccessTokenFromRequest()` |
| `lib/zorenta/client.ts` | `getZorentaAccessToken()`, `zorentaHeaders()` |

### 1.4 Components

- **Layout:** `app-shell`, `sidebar-nav`, `topbar`, `page-header`
- **UI:** `button`, `input`, `textarea`, `card`, `badge`, `table`, `dialog`, `tabs`
- **Dashboard:** `stat-card`, `activity-feed`, `quick-actions`
- **Forms:** `form-field`
- **Tables:** `data-table`

---

## 2. Supabase schema reference

### 2.1 Tables with migrations in repo

#### Zorenta (Phase 1)

**Source:** `supabase/migrations/20250315000000_zorenta_phase1.sql`  
**Fix (if already applied old schema):** `supabase/migrations/20250315100000_zorenta_profiles_id_fk.sql`

| Table | Columns | Notes |
|-------|---------|--------|
| `profiles` | `id` (uuid PK, FK → auth.users(id)), `display_name`, `role`, `avatar_url`, `created_at`, `updated_at` | **Convention:** `profiles.id = auth.uid()` |
| `caregiver_profiles` | `id`, `profile_id` (FK → profiles), `headline`, `bio`, `skills` (text[]), `experience_years`, `availability`, `city`, `region`, `country`, `latitude`, `longitude`, `created_at`, `updated_at` | RLS: `profile_id = auth.uid()` |
| `client_profiles` | `id`, `profile_id` (FK → profiles), `care_needs`, `preferred_location`, `city`, `region`, `country`, `latitude`, `longitude`, `created_at`, `updated_at` | Same RLS pattern |
| `organization_profiles` | `id`, `profile_id` (FK → profiles), `name`, `org_type`, `description`, `city`, `region`, `country`, `latitude`, `longitude`, `created_at`, `updated_at` | Same RLS pattern |

#### App registry

**Source:** `supabase/generated_apps_table.sql` (standalone; not under `migrations/`)

| Table | Columns | Notes |
|-------|---------|--------|
| `generated_apps` | `id`, `name`, `slug` (unique), `description`, `created_at` | Upsert key: `slug` |

---

### 2.2 Platform tables (no migration in repo)

These are used by the app but **do not** have a migration file in this repo. Ensure your Supabase project has them; add migrations when consolidating.

| Table | Expected columns (from API usage) | Used by |
|-------|-----------------------------------|--------|
| `agents` | `id`, `name`, `description`, `status`, `created_at` | `/api/agents` |
| `workflows` | `id`, `name`, `description`, `status`, `created_at` | `/api/workflows` |
| `tasks` | `id`, `name`, `workflow_id`, `workflow_name`, `status`, `created_at` | `/api/tasks` (Task Runner) |
| `runs` | `id`, `kind`, `agent_id`, `agent_name`, `workflow_id`, `workflow_name`, `task_id`, `input`, `output`, `created_at` | `/api/runs`, `/api/agents/run` |
| `app_plans` | `id`, `app_name`, `description`, `spec_json`, `created_at` | `/api/app-plans`, `/api/chat`, `/api/app-plans/scaffold` |

**Note:** API types use `id: number` for agents/workflows/tasks/runs; Supabase may use `bigint`/serial. Keep types and DB consistent.

---

### 2.3 Generated-app tables (per app)

Defined per generated app (e.g. in `app/generated-apps/<app>/supabase-schema.sql` or by scaffold). **Not** in `supabase/migrations/`; they are created at scaffold time or manually.

**Example – Klanten CRM** (`app/generated-apps/klanten-crm/supabase-schema.sql`):

| Table | Purpose |
|-------|--------|
| `companies` | CRM companies |
| `contacts` | Contacts (FK company_id) |
| `deals` | Deals (FK company_id, contact_id) |
| `tasks` | CRM tasks (FK deal_id, contact_id) — **distinct from platform `tasks`** |
| `activities` | Activities (FK company_id, contact_id, deal_id) |

Namespace: same Supabase project, so avoid naming clashes (e.g. platform `tasks` vs app-specific `tasks` if both exist).

---

## 3. Migration inventory

| File | Applies to | Purpose |
|------|------------|--------|
| `supabase/migrations/20250315000000_zorenta_phase1.sql` | Zorenta | profiles + caregiver/client/org profiles, RLS |
| `supabase/migrations/20250315100000_zorenta_profiles_id_fk.sql` | Zorenta | Fix: drop/recreate with `profiles.id` = auth user id |
| `supabase/generated_apps_table.sql` | Platform | `generated_apps` (run manually or copy into a migration) |

**Missing migrations (recommended for sync):**

- Platform: `agents`, `workflows`, `tasks`, `runs`, `app_plans` — add a single migration (e.g. `YYYYMMDD_platform_tables.sql`) that creates them so new environments and future work stay in sync.

---

## 4. Table → API map (quick reference)

| Table | API route(s) | Auth |
|-------|--------------|------|
| `profiles` | POST `/api/zorenta/auth/register`, GET/PUT `/api/zorenta/me` | Bearer (Zorenta) |
| `caregiver_profiles` | GET/POST/PUT `/api/zorenta/caregivers/me` | Bearer |
| `client_profiles` | GET/POST/PUT `/api/zorenta/clients/me` | Bearer |
| `organization_profiles` | GET/POST/PUT `/api/zorenta/organizations/me` | Bearer |
| `agents` | GET/POST/DELETE `/api/agents` | (anon for now) |
| `workflows` | GET/POST `/api/workflows` | (anon) |
| `tasks` | GET/POST `/api/tasks` | (anon) |
| `runs` | GET/POST `/api/runs`, POST `/api/agents/run` | (anon) |
| `app_plans` | GET/POST `/api/app-plans`, POST `/api/chat`, POST `/api/app-plans/scaffold` | (anon) |
| `generated_apps` | GET `/api/generated-apps`, POST `/api/app-plans/scaffold` (upsert) | (anon) |
| Klanten CRM tables | `/api/generated-apps/klanten-crm/...` | (anon) |

---

## 5. Checklist for new migrations

When adding or changing Supabase schema:

1. **Create migration** in `supabase/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`.
2. **Document** in this file: table name, columns, and which API/page uses it.
3. **RLS:** For user-scoped data, add policies (e.g. `auth.uid()` = profile id or equivalent).
4. **Conventions:**
   - Zorenta: `profiles.id` = `auth.users(id)`; no separate `auth_user_id`.
   - Prefer `uuid` for new PKs; use `timestamptz` for `created_at`/`updated_at`.
5. **Generated apps:** Schema lives in app folder or scaffold output; optional to also add a migration if you want platform DB to own them.
6. **Update this audit** (Table → API map, migration inventory, and any new routes).

---

## 6. Zorenta expansion (future phases)

For Zorenta MVP expansion (Phase 2+), see `docs/ZORENTA_MVP_PLAN.md`. When adding:

- `care_jobs`, `applications`, `conversations`, `messages`, `reviews`, `notifications`
- Add migrations under `supabase/migrations/` with clear names (e.g. `*_zorenta_phase2.sql`).
- Keep `profiles.id` = auth user id; reference `profiles(id)` from new tables (e.g. `poster_profile_id`, `applicant_profile_id`).
- Update this audit and the table → API map.
