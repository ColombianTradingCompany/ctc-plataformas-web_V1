import type { Metadata } from "next";
import "@/app/bcp/tailwind.css";
import { InternalAuthShell } from "@/components/panel/InternalAuthShell";

export const metadata: Metadata = {
  title: "CTC Web Platform · Confirmación",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <InternalAuthShell>{children}</InternalAuthShell>;
}
