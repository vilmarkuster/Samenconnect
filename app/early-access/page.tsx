import { AuthLandingGate } from "@/components/samenconnect/auth-landing-gate";
import { HomeLandingSkeleton } from "@/components/samenconnect/home-landing-skeleton";
import { EarlyAccessSignupShell } from "@/components/samenconnect/early-access-signup-form";
import { parseEarlyAccessSource } from "@/lib/samenconnect/early-access-signup-schema";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function EarlyAccessPage({ searchParams }: PageProps) {
  const raw = searchParams.src;
  const srcParam =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const initialSource = parseEarlyAccessSource(srcParam);

  return (
    <AuthLandingGate fallback={<HomeLandingSkeleton />}>
      <EarlyAccessSignupShell initialSource={initialSource} />
    </AuthLandingGate>
  );
}
