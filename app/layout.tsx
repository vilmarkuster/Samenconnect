import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LayoutKeyWrapper } from "@/components/layout/LayoutKeyWrapper";

export const metadata: Metadata = {
  title: "SamenConnect",
  description:
    "Het platform dat zorgverleners, cliënten en organisaties verbindt.",
  icons: {
    icon: [{ url: "/samenconnect-icon.png", type: "image/png" }],
    apple: "/samenconnect-icon.png",
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
        <AuthProvider>
          <LayoutKeyWrapper>{children}</LayoutKeyWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
