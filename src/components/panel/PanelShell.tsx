import type { PanelConsoleKey } from "@/lib/panel/consoles";
import { PanelSidebar } from "./PanelSidebar";
import styles from "./panel.module.css";

/** Shared frame for an internal console: the cross-console rail + the page body. */
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
    <div className={styles.shell}>
      <PanelSidebar
        activeConsole={consoleKey}
        identityName={identityName}
        accessibleConsoles={accessibleConsoles}
        isOwner={isOwner}
      />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
