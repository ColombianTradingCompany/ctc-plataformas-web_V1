import type { PanelConsoleKey } from "@/lib/panel/consoles";
import { PanelChrome } from "./PanelChrome";

/**
 * Shared frame for an internal console: the cross-console rail + the page body.
 * El armazón pasó a PanelChrome (cliente) porque el rail ahora se pliega; este
 * componente sigue siendo de servidor y solo le entrega el contenido ya
 * renderizado, así que las páginas no cambian de naturaleza.
 */
export function PanelShell({
  console: consoleKey,
  identityName,
  accessibleConsoles,
  isOwner,
  children,
}: {
  console: PanelConsoleKey;
  identityName: string;
  accessibleConsoles: PanelConsoleKey[];
  isOwner: boolean;
  children: React.ReactNode;
}) {
  return (
    <PanelChrome
      consoleKey={consoleKey}
      identityName={identityName}
      accessibleConsoles={accessibleConsoles}
      isOwner={isOwner}
    >
      {children}
    </PanelChrome>
  );
}
