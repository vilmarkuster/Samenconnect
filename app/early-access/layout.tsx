import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Early access | SamenConnect",
  description:
    "Vraag early access aan voor SamenConnect. Laat je gegevens achter; we nemen persoonlijk contact op.",
};

export default function EarlyAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
