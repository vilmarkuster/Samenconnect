"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaInbox } from "@/components/zorenta/zorenta-inbox";

const QUERY_CONVERSATION = "conversation";
/** Legacy query key — still read for older links */
const QUERY_LEGACY = "c";

function BerichtenInboxWithQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId =
    searchParams.get(QUERY_CONVERSATION) || searchParams.get(QUERY_LEGACY);

  return (
    <ZorentaInbox
      urlConversationId={conversationId && conversationId.length > 0 ? conversationId : null}
      onUrlConversationChange={(id) => {
        if (id) {
          router.replace(
            `/zorenta/berichten?${QUERY_CONVERSATION}=${encodeURIComponent(id)}`,
            { scroll: false }
          );
        } else {
          router.replace("/zorenta/berichten", { scroll: false });
        }
      }}
    />
  );
}

export default function BerichtenPage() {
  return (
    <Suspense
      fallback={
        <PageContainer maxWidth="default" className="space-y-6">
          <ZorentaPageSkeleton className="space-y-6" />
        </PageContainer>
      }
    >
      <BerichtenInboxWithQuery />
    </Suspense>
  );
}
