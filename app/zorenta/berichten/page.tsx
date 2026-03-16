"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BerichtenPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/zorenta/messages");
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
      Doorverwijzen naar berichten…
    </div>
  );
}
