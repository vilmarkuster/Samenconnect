# AI App Builder Platform – Implementation Plan

## Pipeline Overview

```
User prompt ("Build a CRM")
  → Claude returns structured App Plan (JSON)
  → Parse & validate plan
  → Save to app_plans
  → Register in generated_apps
  → Generate DB schema (SQL with id, created_at, updated_at)
  → Generate CRUD API routes per table
  → Generate UI: layout, navigation, dashboard, list/create/edit/detail pages
  → Write files under app/generated-apps/[app-slug] and app/api/generated-apps/[app-slug]
  → Optionally run SQL (Supabase)
  → Return app URL to user
```

## 1. App Plan Schema (Extended)

- **appName**, **description**
- **pages**: `[{ name, description }]`
- **databaseTables**: `[{ name, description, columns: [{ name, type }] }]`
- **apiRoutes**, **agents**, **workflows** (optional)
- **navigation**: `[{ label, path }]` (optional; derived from pages if missing)
- **dashboardWidgets**: `[{ type: "count"|"link", entity, label }]` (optional)

## 2. Database

- **generated_apps** table: `id`, `name`, `slug`, `description`, `created_at`
- **Per-app tables**: from plan `databaseTables`; each table gets `id` (uuid), `created_at`, `updated_at`, plus custom columns
- Schema file per app: `app/generated-apps/[slug]/supabase-schema.sql`

## 3. API Routes (Generated)

- `GET/POST /api/generated-apps/[appSlug]/[entity]/route.ts`
- `GET/PUT/DELETE /api/generated-apps/[appSlug]/[entity]/[id]/route.ts`
- Entity list and table names come from plan; generated route files include the allowed entities for that app.
- Optional: `GET /api/generated-apps/[appSlug]/stats/route.ts` for dashboard counts

## 4. UI (Generated)

- **Layout**: header + nav (from plan pages or navigation)
- **Root page**: redirect to dashboard
- **Dashboard**: cards from dashboardWidgets or default (counts per entity)
- **Per entity**: list page, “new” form page, detail/edit page (`[id]`)
- Reusable: Card, Button, Input, Textarea from `@/components/ui`

## 5. App Registry

- **Table**: `generated_apps`
- **API**: `GET /api/generated-apps` → list all apps; `POST` (internal) when scaffolding
- **Dashboard**: “Generated Apps” section with links to each app

## 6. Safety & Consistency

- All generated code uses the same patterns (templates)
- No eval or user-controlled code execution
- Supabase table names and column names sanitized (snake_case)
- Entity slugs validated against plan
