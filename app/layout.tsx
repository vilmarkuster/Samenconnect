import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LayoutKeyWrapper } from "@/components/layout/LayoutKeyWrapper";

export const metadata: Metadata = {
  title: "SamenConnect",
  description:
    "Het platform dat zorgverleners, cliënten en organisaties verbindt.",
  icons: {
    icon: "/branding/favicon.ico",
    apple: "/branding/samenconnect-icon.png",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="fixed left-4 top-4 z-[9999] rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
          ROOT LAYOUT
        </div>
        <AuthProvider>
          <LayoutKeyWrapper>{children}</LayoutKeyWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
