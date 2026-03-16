"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api/generated-apps/klanten-crm";

export default function NewKlantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null, phone: phone.trim() || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      router.push("/generated-apps/klanten-crm/pages/klanten");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/generated-apps/klanten-crm/pages/klanten" className="text-sm text-slate-600 hover:text-slate-900">
          ← Klanten
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Nieuwe klant</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Naam *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bedrijfsnaam" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefoon</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 ..." />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            <Link href="/generated-apps/klanten-crm/pages/klanten">
              <Button type="button" variant="outline">Annuleren</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
