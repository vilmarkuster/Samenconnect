import type { Metadata } from "next";
import { AuthLandingGate } from "@/components/samenconnect/auth-landing-gate";
import { HomeLandingSkeleton } from "@/components/samenconnect/home-landing-skeleton";
import { SamenConnectHomeLanding } from "@/components/samenconnect/samenconnect-home-landing";

export const metadata: Metadata = {
  title: "SamenConnect | Zorg zonder gedoe",
  description:
    "SamenConnect verbindt zorgverleners, opdrachtgevers en organisaties — met direct contact, transparantie en alles op één plek. Vraag early access aan.",
};

export default function HomePage() {
  return (
    <AuthLandingGate fallback={<HomeLandingSkeleton />}>
      <SamenConnectHomeLanding heroBackgroundSrc="/images/landing/hero-connection.jpg" />
    </AuthLandingGate>
  );
}
