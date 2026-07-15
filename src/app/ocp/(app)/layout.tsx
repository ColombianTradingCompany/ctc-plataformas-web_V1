import { PanelShell } from "@/components/panel/PanelShell";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

export default async function OcpAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("ocp");
  return (
    <PanelShell
      console="ocp"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
    >
      {children}
    </PanelShell>
  );
}
