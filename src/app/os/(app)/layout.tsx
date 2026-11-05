import { PanelShell } from "@/components/panel/PanelShell";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// CTCx OS · la compuerta de la consola (V6.19, F2). Igual que las otras cuatro: sin la llave `os` en
// `panel_users`, `requireConsoleAccess` cierra. La OS es de SOLO LECTURA en F2: no tiene Server Actions.
export default async function OsAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("os");
  return (
    <PanelShell
      console="os"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
      nivel={identity.niveles["os"] ?? null}
    >
      {children}
    </PanelShell>
  );
}
