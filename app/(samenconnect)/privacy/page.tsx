import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/samenconnect/legal-document-layout";
import { PrivacyPolicyNlBody } from "@/lib/samenconnect/legal/privacy-policy-nl";

export const metadata: Metadata = {
  title: "Privacybeleid | SamenConnect",
  description:
    "Hoe SamenConnect persoonsgegevens verwerkt op het zorgmarktplaatsplatform — AVG, beveiliging, rechten en contact.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Privacybeleid"
      subtitle="Transparant over gegevens op het SamenConnect-platform: wat we verwerken, waarom, hoe we het beveiligen en welke rechten u heeft onder de AVG."
    >
      <PrivacyPolicyNlBody />
    </LegalDocumentLayout>
  );
}
