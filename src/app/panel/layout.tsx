import type { Metadata } from "next";
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "CTC Web Platform",
  robots: { index: false, follow: false },
};

export default function PanelHubLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
