import { PanelShell } from "@/components/panel/PanelShell";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

export default async function BcpAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("bcp");
  return (
    <PanelShell
      console="bcp"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
      nivel={identity.niveles["bcp"] ?? null}
    >
      {children}
    </PanelShell>
  );
}
