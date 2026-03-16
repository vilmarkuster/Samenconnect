"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VacaturesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/zorenta/jobs");
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-slate-500">
      Redirect naar vacatures…
    </div>
  );
}
