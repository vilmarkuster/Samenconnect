"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";

/**
 * Deep-link entry for a conversation thread. Canonical inbox UI lives at
 * `/zorenta/berichten?conversation=<conversationId>` (single implementation, refresh-stable).
 */
export default function MessagesConversationRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  useEffect(() => {
    if (id) {
      router.replace(`/zorenta/berichten?conversation=${encodeURIComponent(id)}`);
    } else {
      router.replace("/zorenta/berichten");
    }
  }, [id, router]);

  return (
    <PageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageSkeleton className="space-y-6" />
    </PageContainer>
  );
}
