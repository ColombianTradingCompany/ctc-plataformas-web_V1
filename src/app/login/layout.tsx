import type { Metadata } from "next";
// Shared internal-panel Tailwind entry (kept under bcp/ for historical reasons;
// it carries the CTC corporate palette used by every internal console).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "CTC Web Platform · Acceso",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
