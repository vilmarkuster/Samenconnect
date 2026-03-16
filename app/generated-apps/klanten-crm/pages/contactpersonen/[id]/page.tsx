"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api/generated-apps/klanten-crm";

type Contact = {
  id: string;
  company_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  created_at?: string;
};

export default function ContactDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/contacts/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        setItem(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
        setRole(d.role ?? "");
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API}/contacts/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null, phone: phone.trim() || null, role: role.trim() || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bijwerken mislukt");
      setItem((prev) => (prev ? { ...prev, name, email, phone, role } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bijwerken mislukt");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Laden…</p>;
  if (!item) return <p className="text-sm text-red-600">Contact niet gevonden.</p>;

  return (
    <div className="space-y-6">
      <Link href="/generated-apps/klanten-crm/pages/contactpersonen" className="text-sm text-slate-600 hover:text-slate-900">← Contactpersonen</Link>
      <h1 className="text-2xl font-semibold text-slate-900">{item.name || "Contact"}</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Naam *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefoon</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            <Link href="/generated-apps/klanten-crm/pages/contactpersonen">
              <Button type="button" variant="outline">Terug</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
