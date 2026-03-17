import { RequireAuth } from "@/lib/require-auth";
import { AppShell } from "@/components/layout/app-shell";

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="relative min-h-screen">
        <div className="fixed left-4 top-16 z-[9999] rounded-lg bg-purple-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
          PROTECTED LAYOUT
        </div>
        <AppShell>{children}</AppShell>
      </div>
    </RequireAuth>
  );
}

