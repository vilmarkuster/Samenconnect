import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/samenconnect/legal-document-layout";
import { TermsConditionsNlBody } from "@/lib/samenconnect/legal/terms-conditions-nl";

export const metadata: Metadata = {
  title: "Algemene voorwaarden | SamenConnect",
  description:
    "Gebruiksvoorwaarden voor het SamenConnect zorgmarktplaatsplatform — platformrol, aansprakelijkheid, accounts en Nederlands recht.",
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Algemene voorwaarden"
      subtitle="Voorwaarden voor het gebruik van SamenConnect als online platform voor zorgvragers, zorgverleners en organisaties. Lees dit document samen met ons privacybeleid."
    >
      <TermsConditionsNlBody />
    </LegalDocumentLayout>
  );
}
