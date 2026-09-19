import { PanelShell } from "@/components/panel/PanelShell";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

export default async function LcpAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("lcp");
  return (
    <PanelShell
      console="lcp"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
      nivel={identity.niveles["lcp"] ?? null}
    >
      {children}
    </PanelShell>
  );
}
