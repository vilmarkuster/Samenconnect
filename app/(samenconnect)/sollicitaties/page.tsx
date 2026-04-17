"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SollicitatiesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/applications");
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
      Doorverwijzen naar sollicitaties…
    </div>
  );
}
