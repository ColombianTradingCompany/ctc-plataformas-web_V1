import { PanelShell } from "@/components/panel/PanelShell";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

export default async function EcpAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("ecp");
  return (
    <PanelShell
      console="ecp"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
    >
      {children}
    </PanelShell>
  );
}
