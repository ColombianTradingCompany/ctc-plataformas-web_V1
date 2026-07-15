import type { Metadata } from "next";
// Shared internal-panel Tailwind entry (see login/layout.tsx for the note).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "OCP · Operational Control Panel",
  robots: { index: false, follow: false },
};

export default function OcpLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
