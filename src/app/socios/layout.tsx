import type { Metadata } from "next";
// Partner surfaces share the internal corporate theme tokens (paper/purple/gold).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "CTC · Red de socios",
  robots: { index: false, follow: false },
};

export default function SociosLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
