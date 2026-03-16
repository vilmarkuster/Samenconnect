/**
 * Generates SQL and Next.js app structure from an app plan spec.
 * Used to scaffold generated-apps/{appSlug} and optional Supabase tables.
 */

type TableSpec = {
  name?: string;
  description?: string;
  columns?: { name?: string; type?: string }[];
};

type NavItem = { label?: string; path?: string };
type DashboardWidget = { type?: string; entity?: string; label?: string };

type Spec = {
  appName?: string;
  description?: string;
  databaseTables?: TableSpec[];
  pages?: { name?: string; description?: string }[];
  navigation?: NavItem[];
  dashboardWidgets?: DashboardWidget[];
  apiRoutes?: unknown[];
  agents?: unknown[];
  workflows?: unknown[];
};

const SANITIZE_REG = /[^a-z0-9_]/gi;

function toSnakeCase(s: string): string {
  return s
    .replace(SANITIZE_REG, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase() || "item";
}

function toSlug(s: string): string {
  return toSnakeCase(s).replace(/_/g, "-");
}

function toPascal(s: string): string {
  const slug = toSnakeCase(s);
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** Build CREATE TABLE statements from spec. Tables get id, created_at, updated_at, plus optional columns. */
export function buildSqlFromSpec(spec: Spec): string {
  let tables = Array.isArray(spec.databaseTables) ? spec.databaseTables : [];
  if (tables.length === 0) {
    tables = [{ name: "items", description: "Default table", columns: [] }];
  }
  const lines: string[] = [
    "-- Generated from app plan. Run in Supabase SQL Editor if not applied automatically.",
    ""
  ];

  for (const t of tables) {
    const name = typeof t.name === "string" && t.name.trim() ? t.name.trim() : null;
    if (!name) continue;
    const tableName = toSnakeCase(name);
    if (!tableName) continue;

    const cols: string[] = [
      "id uuid primary key default gen_random_uuid()",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ];
    const colSpecs = Array.isArray(t.columns) ? t.columns : [];
    if (colSpecs.length > 0) {
      for (const c of colSpecs) {
        const cn = typeof c.name === "string" ? toSnakeCase(c.name) : "";
        const ty = (typeof c.type === "string" && c.type) ? c.type.toLowerCase() : "text";
        if (cn && cn !== "id" && cn !== "created_at" && cn !== "updated_at") {
          cols.push(`${cn} ${ty}`);
        }
      }
    } else {
      cols.push("name text", "description text");
    }

    lines.push(`create table if not exists "${tableName}" (`);
    lines.push("  " + cols.join(",\n  "));
    lines.push(");");
    lines.push("");
    lines.push(`create or replace function set_updated_at_${tableName}() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;`);
    lines.push(`drop trigger if exists trigger_updated_at_${tableName} on "${tableName}";`);
    lines.push(`create trigger trigger_updated_at_${tableName} before update on "${tableName}" for each row execute function set_updated_at_${tableName}();`);
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function getAppSlug(appName: string): string {
  return toSlug(appName) || "app";
}

/** Entity = table name as slug for URL segment */
export function getEntitySlugs(spec: Spec): string[] {
  const tables = Array.isArray(spec.databaseTables) ? spec.databaseTables : [];
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const t of tables) {
    const name = typeof t.name === "string" && t.name.trim() ? t.name.trim() : null;
    if (!name) continue;
    const slug = toSlug(name);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs.length > 0 ? slugs : ["items"];
}

/** Table name for Supabase (snake_case) */
export function getTableName(spec: Spec, entitySlug: string): string {
  const tables = Array.isArray(spec.databaseTables) ? spec.databaseTables : [];
  const entitySlugNorm = entitySlug.replace(/-/g, "_");
  for (const t of tables) {
    const name = typeof t.name === "string" ? t.name : "";
    if (toSnakeCase(name).replace(/_/g, "-") === entitySlug) return toSnakeCase(name);
    if (toSnakeCase(name) === entitySlugNorm) return toSnakeCase(name);
  }
  return entitySlug.replace(/-/g, "_");
}

export type GeneratedFile = { path: string; content: string };

export function buildGeneratedAppFiles(spec: Spec, appSlug: string): GeneratedFile[] {
  const appName = typeof spec.appName === "string" ? spec.appName : "Generated App";
  const entities = getEntitySlugs(spec);
  const files: GeneratedFile[] = [];

  const navLinks = entities
    .map(
      (e) =>
        `<Link href="/generated-apps/${appSlug}/${e}" className="text-slate-600 hover:text-slate-900">${toPascal(e)}</Link>`
    )
    .join("\n            ");
  const layoutTsx = `"use client";

import Link from "next/link";

export default function GeneratedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/generated-apps/${appSlug}/dashboard" className="text-lg font-semibold text-slate-900">
            ${appName.replace(/"/g, '\\"')}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/generated-apps/${appSlug}/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            ${navLinks}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
`;
  files.push({ path: `app/generated-apps/${appSlug}/layout.tsx`, content: layoutTsx });

  const pageTsx = `import { redirect } from "next/navigation";

export default function GeneratedAppHome() {
  redirect("/generated-apps/${appSlug}/dashboard");
}
`;
  files.push({ path: `app/generated-apps/${appSlug}/page.tsx`, content: pageTsx });

  const dashboardPage = `import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${entities.map((e) => `<Card key="${e}" className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">${toPascal(e)}</h2>
          <p className="mt-1 text-xs text-slate-500">View and manage ${e.replace(/-/g, " ")}.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/${e}">Open</Link>
          </Button>
        </Card>`).join("\n        ")}
      </div>
    </div>
  );
}
`;
  files.push({ path: `app/generated-apps/${appSlug}/dashboard/page.tsx`, content: dashboardPage });

  for (const entity of entities) {
    const tableName = getTableName(spec, entity);
    const entityPascal = toPascal(entity);

    const listPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { id: string; name?: string; description?: string; created_at?: string; [k: string]: unknown };

export default function ${entityPascal}ListPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generated-apps/${appSlug}/${entity}")
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">${entityPascal}</h1>
        <Button asChild>
          <Link href="/generated-apps/${appSlug}/${entity}/new">Add new</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          No items yet. <Link href="/generated-apps/${appSlug}/${entity}/new" className="text-primary-600 underline">Create one</Link>.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.name ?? row.id}</p>
                {row.description && <p className="text-xs text-slate-500">{row.description}</p>}
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={\"/generated-apps/${appSlug}/${entity}/\" + row.id}>Edit</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
    files.push({ path: `app/generated-apps/${appSlug}/${entity}/page.tsx`, content: listPage });

    const formPage = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function New${entityPascal}Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/${entity}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, description: description || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/${entity}");
      else setSaving(false);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New ${entityPascal}</h1>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
    files.push({ path: `app/generated-apps/${appSlug}/${entity}/new/page.tsx`, content: formPage });

    const detailPage = `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Row = { id: string; name?: string; description?: string; [k: string]: unknown };

export default function ${entityPascal}DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/generated-apps/${appSlug}/${entity}/" + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        const row = d.data;
        if (row) {
          setItem(row);
          setName(row.name ?? "");
          setDescription(row.description ?? "");
        }
      })
      .catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/${entity}/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, description: description || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/${entity}");
      else setSaving(false);
    } catch {
      setSaving(false);
    }
  }

  if (item === null && !id) return null;
  if (item === null) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit ${entityPascal}</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/generated-apps/${appSlug}/${entity}">Back to list</Link>
        </Button>
      </div>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
    files.push({ path: `app/generated-apps/${appSlug}/${entity}/[id]/page.tsx`, content: detailPage });

    const apiListRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "${tableName}";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data: data ?? [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).insert({ name: body?.name ?? null, description: body?.description ?? null }).select("*").single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
    files.push({ path: `app/api/generated-apps/${appSlug}/${entity}/route.ts`, content: apiListRoute });

    const apiIdRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "${tableName}";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message ?? "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).update({ name: body?.name ?? null, description: body?.description ?? null }).eq("id", id).select("*").single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
    files.push({ path: `app/api/generated-apps/${appSlug}/${entity}/[id]/route.ts`, content: apiIdRoute });
  }

  const sql = buildSqlFromSpec(spec);
  if (sql) {
    files.push({ path: `app/generated-apps/${appSlug}/schema.sql`, content: sql });
  }

  return files;
}

/** Build minimal scaffold from plan: generated-apps/{slug}/ with pages/ (from spec.pages), api/, components/, and simple Next.js pages. */
export function buildMinimalScaffoldFiles(spec: Spec, appSlug: string): GeneratedFile[] {
  const appName = typeof spec.appName === "string" ? spec.appName : "Generated App";
  const base = `app/generated-apps/${appSlug}`;
  const pagesSpec = Array.isArray(spec.pages) ? spec.pages : [];
  const pageSlugs: string[] = [];
  const pageNames: string[] = [];
  for (const p of pagesSpec) {
    const name = typeof p === "object" && p !== null && typeof (p as { name?: string }).name === "string"
      ? (p as { name: string }).name.trim()
      : "";
    if (!name) continue;
    const slug = toSlug(name);
    if (slug && !pageSlugs.includes(slug)) {
      pageSlugs.push(slug);
      pageNames.push(name);
    }
  }
  if (pageSlugs.length === 0) {
    pageSlugs.push("dashboard");
    pageNames.push("Dashboard");
  }

  const files: GeneratedFile[] = [];

  const navLinks = pageSlugs
    .map((slug, i) => `<Link href="/generated-apps/${appSlug}/pages/${slug}" className="text-slate-600 hover:text-slate-900">${pageNames[i]}</Link>`)
    .join("\n            ");

  const layout = `"use client";

import Link from "next/link";

export default function GeneratedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/generated-apps/${appSlug}/pages/${pageSlugs[0]}" className="text-lg font-semibold text-slate-900">${appName.replace(/"/g, '\\"')}</Link>
          <nav className="flex gap-4 text-sm">
            ${navLinks}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
`;
  files.push({ path: `${base}/layout.tsx`, content: layout });

  const rootPage = `import { redirect } from "next/navigation";

export default function GeneratedAppHome() {
  redirect("/generated-apps/${appSlug}/pages/${pageSlugs[0]}");
}
`;
  files.push({ path: `${base}/page.tsx`, content: rootPage });

  for (let i = 0; i < pageSlugs.length; i++) {
    const slug = pageSlugs[i];
    const pageName = pageNames[i];
    const pageContent = `import { Card } from "@/components/ui/card";

export default function ${toPascal(slug)}Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">${pageName.replace(/"/g, '\\"')}</h1>
      <Card className="p-6">
        <p className="text-sm text-slate-500">${pageName} page. Add your content here.</p>
      </Card>
    </div>
  );
}
`;
    files.push({ path: `${base}/pages/${slug}/page.tsx`, content: pageContent });
  }

  files.push({ path: `${base}/api/.gitkeep`, content: "" });
  files.push({ path: `${base}/components/.gitkeep`, content: "" });

  return files;
}

/** Build CRUD API route files for generated-apps/[appSlug]. One [entity] route and one [entity]/[id] route. */
export function buildAppApiRouteFiles(spec: Spec, appSlug: string): GeneratedFile[] {
  const entities = getEntitySlugs(spec);
  const tableMap: Record<string, string> = {};
  for (const e of entities) {
    tableMap[e] = getTableName(spec, e);
  }
  const entitiesStr = JSON.stringify(entities);
  const apiBase = `app/api/generated-apps/${appSlug}`;

  const listRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const ENTITIES = ${entitiesStr};
const TABLE_MAP: Record<string, string> = ${JSON.stringify(tableMap)};

function isEntity(s: string): boolean {
  return ENTITIES.includes(s);
}

function getTable(s: string): string {
  return TABLE_MAP[s] ?? s.replace(/-/g, "_");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params;
    if (!isEntity(entity)) {
      return new Response(JSON.stringify({ error: "Invalid entity." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, data: [] }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ data: data ?? [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed", data: [] }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params;
    if (!isEntity(entity)) {
      return new Response(JSON.stringify({ error: "Invalid entity." }), { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const insertPayload: Record<string, unknown> = { ...body };
    delete insertPayload.id;
    delete insertPayload.created_at;
    delete insertPayload.updated_at;
    insertPayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(table)
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
`;

  const idRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const ENTITIES = ${entitiesStr};
const TABLE_MAP: Record<string, string> = ${JSON.stringify(tableMap)};

function isEntity(s: string): boolean {
  return ENTITIES.includes(s);
}

function getTable(s: string): string {
  return TABLE_MAP[s] ?? s.replace(/-/g, "_");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { data, error } = await supabase.from(table).select("*").eq("id", id).single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = { ...body };
    delete updatePayload.id;
    delete updatePayload.created_at;
    updatePayload.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Update failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Delete failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
`;

  return [
    { path: `${apiBase}/[entity]/route.ts`, content: listRoute },
    { path: `${apiBase}/[entity]/[id]/route.ts`, content: idRoute }
  ];
}

/** Full pipeline: schema from spec (id, created_at, updated_at), API routes, layout, dashboard, list/create/detail pages. */
export function buildFullAppScaffoldFiles(spec: Spec, appSlug: string): GeneratedFile[] {
  const appName = typeof spec.appName === "string" ? spec.appName : "Generated App";
  const entities = getEntitySlugs(spec);
  const base = `app/generated-apps/${appSlug}`;
  const API = "/api/generated-apps/" + appSlug;
  const files: GeneratedFile[] = [];

  const sql = buildSqlFromSpec(spec);
  files.push({ path: `${base}/supabase-schema.sql`, content: sql });

  files.push(...buildAppApiRouteFiles(spec, appSlug));

  const pageSlugs = ["dashboard", ...entities];
  const pageNames = ["Dashboard", ...entities.map((s) => toPascal(s))];
  const navLinks = pageSlugs
    .map(
      (slug, i) =>
        `<Link href="/generated-apps/${appSlug}/pages/${slug}" className="text-slate-600 hover:text-slate-900">${pageNames[i]}</Link>`
    )
    .join("\n            ");

  const layout = `"use client";

import Link from "next/link";

export default function GeneratedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/generated-apps/${appSlug}/pages/dashboard" className="text-lg font-semibold text-slate-900">${appName.replace(/"/g, '\\"')}</Link>
          <nav className="flex gap-4 text-sm">
            ${navLinks}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
`;
  files.push({ path: `${base}/layout.tsx`, content: layout });

  const rootPage = `import { redirect } from "next/navigation";

export default function GeneratedAppHome() {
  redirect("/generated-apps/${appSlug}/pages/dashboard");
}
`;
  files.push({ path: `${base}/page.tsx`, content: rootPage });

  const dashboardPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "${API}";

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    ${entities.map((e) => `fetch(\`\${API}/${e}\`).then((r) => r.json()).then((d) => setCounts((c) => ({ ...c, ${JSON.stringify(e)}: Array.isArray(d?.data) ? d.data.length : 0 }))).catch(() => {});`).join("\n    ")}
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${entities.map((e) => `<Card key="${e}" className="p-4">
          <p className="text-sm font-medium text-slate-500">${toPascal(e)}</p>
          <p className="text-2xl font-semibold text-slate-900">{counts["${e}"] ?? 0}</p>
          <Link href="/generated-apps/${appSlug}/pages/${e}"><Button variant="outline" size="sm" className="mt-2">View</Button></Link>
        </Card>`).join("\n        ")}
      </div>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/dashboard/page.tsx`, content: dashboardPage });

  for (const entity of entities) {
    const entityPascal = toPascal(entity);
    const listPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "${API}";

type Row = { id: string; name?: string; description?: string; created_at?: string; [k: string]: unknown };

export default function ${entityPascal}ListPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`\${API}/${entity}\`).then((r) => r.json()).then((d) => setItems(Array.isArray(d?.data) ? d.data : [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">${entityPascal}</h1>
        <Link href="/generated-apps/${appSlug}/pages/${entity}/new"><Button>Add new</Button></Link>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No items yet. <Link href="/generated-apps/${appSlug}/pages/${entity}/new" className="text-primary-600 underline">Create one</Link>.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.name ?? row.id}</p>
                {row.description && <p className="text-xs text-slate-500">{row.description}</p>}
              </div>
              <Link href={\"/generated-apps/${appSlug}/pages/${entity}/\" + row.id}><Button variant="ghost" size="sm">Edit</Button></Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
    files.push({ path: `${base}/pages/${entity}/page.tsx`, content: listPage });

    const newPage = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = "${API}";

export default function New${entityPascal}Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(\`\${API}/${entity}\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || null, description: description.trim() || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      router.push("/generated-apps/${appSlug}/pages/${entity}");
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Link href="/generated-apps/${appSlug}/pages/${entity}" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
      <h1 className="text-2xl font-semibold text-slate-900">New ${entityPascal}</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Link href="/generated-apps/${appSlug}/pages/${entity}"><Button type="button" variant="outline">Cancel</Button></Link></div>
        </form>
      </Card>
    </div>
  );
}
`;
    files.push({ path: `${base}/pages/${entity}/new/page.tsx`, content: newPage });

    const detailPage = `"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = "${API}";

type Row = { id: string; name?: string; description?: string; [k: string]: unknown };

export default function ${entityPascal}DetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(\`\${API}/${entity}/\${encodeURIComponent(id)}\`).then((r) => r.json()).then((d) => { setItem(d); setName(d?.name ?? ""); setDescription(d?.description ?? ""); }).catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(\`\${API}/${entity}/\${encodeURIComponent(id)}\`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || null, description: description.trim() || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      setItem((p) => (p ? { ...p, name, description } : null));
    } catch {}
    finally { setSaving(false); }
  }

  if (!item) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <Link href="/generated-apps/${appSlug}/pages/${entity}" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
      <h1 className="text-2xl font-semibold text-slate-900">{item.name ?? "Detail"}</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Link href="/generated-apps/${appSlug}/pages/${entity}"><Button type="button" variant="outline">Back</Button></Link></div>
        </form>
      </Card>
    </div>
  );
}
`;
    files.push({ path: `${base}/pages/${entity}/[id]/page.tsx`, content: detailPage });
  }

  return files;
}

/** SQL for standard app tables: customers, deals, tasks, activities */
export function buildStandardAppSql(): string {
  return `-- Generated app plan: customers, deals, tasks, activities. Run in Supabase SQL Editor if not applied automatically.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text,
  value numeric,
  customer_id uuid references customers(id) on delete set null,
  status text
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text,
  description text,
  status text,
  due_date timestamptz
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text,
  description text,
  customer_id uuid references customers(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  task_id uuid references tasks(id) on delete set null
);
`;
}

/** Build the standard app structure: pages (dashboard, customers, deals, tasks, reports, settings), api (customers, deals, tasks), components (forms, tables, dashboard). */
export function buildStandardAppFiles(spec: Spec, appSlug: string): GeneratedFile[] {
  const appName = typeof spec.appName === "string" ? spec.appName : "Generated App";
  const base = `app/generated-apps/${appSlug}`;
  const apiBase = `app/api/generated-apps/${appSlug}`;
  const files: GeneratedFile[] = [];

  const layout = `"use client";

import Link from "next/link";

export default function GeneratedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/generated-apps/${appSlug}/pages/dashboard" className="text-lg font-semibold text-slate-900">${appName.replace(/"/g, '\\"')}</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/generated-apps/${appSlug}/pages/dashboard" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
            <Link href="/generated-apps/${appSlug}/pages/customers" className="text-slate-600 hover:text-slate-900">Customers</Link>
            <Link href="/generated-apps/${appSlug}/pages/deals" className="text-slate-600 hover:text-slate-900">Deals</Link>
            <Link href="/generated-apps/${appSlug}/pages/tasks" className="text-slate-600 hover:text-slate-900">Tasks</Link>
            <Link href="/generated-apps/${appSlug}/pages/reports" className="text-slate-600 hover:text-slate-900">Reports</Link>
            <Link href="/generated-apps/${appSlug}/pages/settings" className="text-slate-600 hover:text-slate-900">Settings</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
`;
  files.push({ path: `${base}/layout.tsx`, content: layout });

  const rootPage = `import { redirect } from "next/navigation";

export default function GeneratedAppHome() {
  redirect("/generated-apps/${appSlug}/pages/dashboard");
}
`;
  files.push({ path: `${base}/page.tsx`, content: rootPage });

  const dashboardPage = `import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Customers</h2>
          <p className="mt-1 text-xs text-slate-500">View and manage customers.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/pages/customers">Open</Link>
          </Button>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
          <p className="mt-1 text-xs text-slate-500">View and manage deals.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/pages/deals">Open</Link>
          </Button>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
          <p className="mt-1 text-xs text-slate-500">View and manage tasks.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/pages/tasks">Open</Link>
          </Button>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Reports</h2>
          <p className="mt-1 text-xs text-slate-500">View reports.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/pages/reports">Open</Link>
          </Button>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          <p className="mt-1 text-xs text-slate-500">App settings.</p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/generated-apps/${appSlug}/pages/settings">Open</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/dashboard/page.tsx`, content: dashboardPage });

  const customersListPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { id: string; name?: string; email?: string; phone?: string; [k: string]: unknown };

export default function CustomersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generated-apps/${appSlug}/customers")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <Button asChild><Link href="/generated-apps/${appSlug}/pages/customers/new">Add customer</Link></Button>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No customers yet. <Link href="/generated-apps/${appSlug}/pages/customers/new" className="text-primary-600 underline">Add one</Link>.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.name ?? row.email ?? row.id}</p>
                {row.email && <p className="text-xs text-slate-500">{row.email}</p>}
              </div>
              <Button asChild variant="ghost" size="sm"><Link href={"/generated-apps/" + "${appSlug}" + "/pages/customers/" + row.id}>Edit</Link></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/customers/page.tsx`, content: customersListPage });

  const customerNewPage = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, email: email || null, phone: phone || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/customers");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New customer</h1>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/customers/new/page.tsx`, content: customerNewPage });

  const customerEditPage = `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { id: string; name?: string; email?: string; phone?: string; [k: string]: unknown };

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/generated-apps/${appSlug}/customers/" + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        const row = d.data;
        if (row) { setItem(row); setName(row.name ?? ""); setEmail(row.email ?? ""); setPhone(row.phone ?? ""); }
      })
      .catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/customers/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, email: email || null, phone: phone || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/customers");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  if (item === null && id) return <p className="text-sm text-slate-500">Loading…</p>;
  if (item === null) return null;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit customer</h1>
        <Button asChild variant="ghost" size="sm"><Link href="/generated-apps/${appSlug}/pages/customers">Back</Link></Button>
      </div>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/customers/[id]/page.tsx`, content: customerEditPage });

  const dealsListPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { id: string; title?: string; value?: number; status?: string; [k: string]: unknown };

export default function DealsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generated-apps/${appSlug}/deals")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Deals</h1>
        <Button asChild><Link href="/generated-apps/${appSlug}/pages/deals/new">Add deal</Link></Button>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No deals yet. <Link href="/generated-apps/${appSlug}/pages/deals/new" className="text-primary-600 underline">Add one</Link>.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.title ?? row.id}</p>
                {row.value != null && <p className="text-xs text-slate-500">Value: {row.value}</p>}
              </div>
              <Button asChild variant="ghost" size="sm"><Link href={"/generated-apps/" + "${appSlug}" + "/pages/deals/" + row.id}>Edit</Link></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/deals/page.tsx`, content: dealsListPage });

  const dealsNewPage = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewDealPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, value: value ? Number(value) : null, status: status || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/deals");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New deal</h1>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Value</label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Status</label><Input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1" placeholder="e.g. Open" /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/deals/new/page.tsx`, content: dealsNewPage });

  const dealsEditPage = `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { id: string; title?: string; value?: number; status?: string; [k: string]: unknown };

export default function DealEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/generated-apps/${appSlug}/deals/" + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        const row = d.data;
        if (row) { setItem(row); setTitle(row.title ?? ""); setValue(row.value != null ? String(row.value) : ""); setStatus(row.status ?? ""); }
      })
      .catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/deals/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, value: value ? Number(value) : null, status: status || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/deals");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  if (item === null && id) return <p className="text-sm text-slate-500">Loading…</p>;
  if (item === null) return null;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit deal</h1>
        <Button asChild variant="ghost" size="sm"><Link href="/generated-apps/${appSlug}/pages/deals">Back</Link></Button>
      </div>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Value</label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Status</label><Input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1" /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/deals/[id]/page.tsx`, content: dealsEditPage });

  const tasksListPage = `"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { id: string; title?: string; description?: string; status?: string; [k: string]: unknown };

export default function TasksPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generated-apps/${appSlug}/tasks")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        <Button asChild><Link href="/generated-apps/${appSlug}/pages/tasks/new">Add task</Link></Button>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No tasks yet. <Link href="/generated-apps/${appSlug}/pages/tasks/new" className="text-primary-600 underline">Add one</Link>.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.title ?? row.id}</p>
                {row.status && <span className="text-xs text-slate-500">{row.status}</span>}
              </div>
              <Button asChild variant="ghost" size="sm"><Link href={"/generated-apps/" + "${appSlug}" + "/pages/tasks/" + row.id}>Edit</Link></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/tasks/page.tsx`, content: tasksListPage });

  const tasksNewPage = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, description: description || null, status: status || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/tasks");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New task</h1>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} /></div>
          <div><label className="text-xs font-medium text-slate-500">Status</label><Input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1" placeholder="e.g. Todo" /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/tasks/new/page.tsx`, content: tasksNewPage });

  const tasksEditPage = `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Row = { id: string; title?: string; description?: string; status?: string; [k: string]: unknown };

export default function TaskEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/generated-apps/${appSlug}/tasks/" + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        const row = d.data;
        if (row) { setItem(row); setTitle(row.title ?? ""); setDescription(row.description ?? ""); setStatus(row.status ?? ""); }
      })
      .catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/generated-apps/${appSlug}/tasks/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, description: description || null, status: status || null }),
      });
      if (res.ok) router.push("/generated-apps/${appSlug}/pages/tasks");
      else setSaving(false);
    } catch { setSaving(false); }
  }

  if (item === null && id) return <p className="text-sm text-slate-500">Loading…</p>;
  if (item === null) return null;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit task</h1>
        <Button asChild variant="ghost" size="sm"><Link href="/generated-apps/${appSlug}/pages/tasks">Back</Link></Button>
      </div>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-slate-500">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} /></div>
          <div><label className="text-xs font-medium text-slate-500">Status</label><Input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1" /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/tasks/[id]/page.tsx`, content: tasksEditPage });

  const reportsPage = `import { Card } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      <Card className="p-6">
        <p className="text-sm text-slate-500">Reports and analytics. Connect to your data to build dashboards.</p>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/reports/page.tsx`, content: reportsPage });

  const settingsPage = `import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <Card className="p-6">
        <p className="text-sm text-slate-500">App settings. Extend this page as needed.</p>
      </Card>
    </div>
  );
}
`;
  files.push({ path: `${base}/pages/settings/page.tsx`, content: settingsPage });

  const apiCustomersRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "customers";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: data ?? [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).insert({ name: body?.name ?? null, email: body?.email ?? null, phone: body?.phone ?? null }).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/customers/route.ts`, content: apiCustomersRoute });

  const apiCustomersIdRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "customers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (error || !data) return new Response(JSON.stringify({ error: error?.message ?? "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).update({ name: body?.name ?? null, email: body?.email ?? null, phone: body?.phone ?? null }).eq("id", id).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/customers/[id]/route.ts`, content: apiCustomersIdRoute });

  const apiDealsRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "deals";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: data ?? [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).insert({ title: body?.title ?? null, value: body?.value ?? null, customer_id: body?.customer_id ?? null, status: body?.status ?? null }).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/deals/route.ts`, content: apiDealsRoute });

  const apiDealsIdRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "deals";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (error || !data) return new Response(JSON.stringify({ error: error?.message ?? "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).update({ title: body?.title ?? null, value: body?.value ?? null, customer_id: body?.customer_id ?? null, status: body?.status ?? null }).eq("id", id).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/deals/[id]/route.ts`, content: apiDealsIdRoute });

  const apiTasksRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "tasks";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: data ?? [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).insert({ title: body?.title ?? null, description: body?.description ?? null, status: body?.status ?? null, due_date: body?.due_date ?? null }).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/tasks/route.ts`, content: apiTasksRoute });

  const apiTasksIdRoute = `import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const TABLE = "tasks";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (error || !data) return new Response(JSON.stringify({ error: error?.message ?? "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).update({ title: body?.title ?? null, description: body?.description ?? null, status: body?.status ?? null, due_date: body?.due_date ?? null }).eq("id", id).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
`;
  files.push({ path: `${apiBase}/tasks/[id]/route.ts`, content: apiTasksIdRoute });

  const componentForms = `"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

export default function FormsComponent() {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-600">Reusable form components. Import FormField as needed.</p>
    </Card>
  );
}
`;
  files.push({ path: `${base}/components/forms.tsx`, content: componentForms });

  const componentTables = `"use client";

import { Card } from "@/components/ui/card";

type Column = { key: string; label: string };

export function DataTable<T extends Record<string, unknown>>({ columns, rows }: { columns: Column[]; rows: T[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-900">{String(row[col.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function TablesComponent() {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-600">Reusable table components. Import DataTable as needed.</p>
    </Card>
  );
}
`;
  files.push({ path: `${base}/components/tables.tsx`, content: componentTables });

  const componentDashboard = `"use client";

import { Card } from "@/components/ui/card";

export function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </Card>
  );
}

export default function DashboardComponent() {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-600">Dashboard building blocks. Import StatCard for metrics.</p>
    </Card>
  );
}
`;
  files.push({ path: `${base}/components/dashboard.tsx`, content: componentDashboard });

  return files;
}

/** Write generated files to the project. rootDir should be process.cwd(). */
export function writeGeneratedAppFiles(
  files: GeneratedFile[],
  rootDir: string
): { written: string[]; errors: string[] } {
  const fs = require("fs");
  const path = require("path");
  const written: string[] = [];
  const errors: string[] = [];
  for (const f of files) {
    try {
      const full = path.join(rootDir, f.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.content, "utf8");
      written.push(f.path);
    } catch (e: unknown) {
      errors.push(`${f.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { written, errors };
}
