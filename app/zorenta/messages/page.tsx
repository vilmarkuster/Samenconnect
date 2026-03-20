"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/zorenta/berichten");
  }, [router]);

  return null;
}
