import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CTC Business Control Panel",
  robots: { index: false, follow: false },
};

export default function BcpLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
