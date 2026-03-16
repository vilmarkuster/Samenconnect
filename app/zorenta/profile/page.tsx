"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getZorentaAccessToken().then((token) => {
      if (!token) {
        router.replace("/zorenta/login");
        return;
      }
      fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          const r = d.profile?.role;
          if (r === "caregiver") router.replace("/zorenta/caregivers/me/edit");
          else if (r === "client") router.replace("/zorenta/clients/me/edit");
          else if (r === "organization") router.replace("/zorenta/organizations/me/edit");
          else setRole(r ?? null);
        });
    });
  }, [router]);

  if (role) return <p className="text-slate-500">Redirect…</p>;
  return null;
}
