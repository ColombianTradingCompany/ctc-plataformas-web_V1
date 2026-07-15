import type { Metadata } from "next";
// Shared internal-panel Tailwind entry (see login/layout.tsx for the note).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "ECP · Executive Control Panel",
  robots: { index: false, follow: false },
};

export default function EcpLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
