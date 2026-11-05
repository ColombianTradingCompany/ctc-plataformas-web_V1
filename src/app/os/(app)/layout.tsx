import { PanelShell } from "@/components/panel/PanelShell";
import { ProcedenciaProvider } from "@/components/os/Procedencia";
import { identidadDeLaOs } from "@/app/os/(app)/quienMira";
import "@/components/os/identidad/os-tokens.css";

// CTCx OS · la compuerta de la consola (V6.19, F2). Igual que las otras cuatro: sin la llave `os` en
// `panel_users`, `requireConsoleAccess` cierra (aquí por `identidadDeLaOs`, la misma compuerta UNA vez por
// petición: las páginas la vuelven a pedir para pasar `isOwner` al tablero sin leer otra vez). La OS es de
// SOLO LECTURA en F2: no tiene Server Actions. Dentro del armazón de la casa (rail y cabecera en su tema), el
// contenido va en `data-os-juego` —donde valen los tokens del juego, `os-tokens.css`— y con el contexto de quien
// mira (`ProcedenciaProvider`): sus consolas y si es el owner, para que «Abrir» siga la regla del rail, y su
// nombre para el HUD.
export default async function OsAppLayout({ children }: { children: React.ReactNode }) {
  const identity = await identidadDeLaOs();
  return (
    <PanelShell
      console="os"
      identityName={identity.displayName}
      accessibleConsoles={identity.consoles}
      isOwner={identity.isOwner}
      nivel={identity.niveles["os"] ?? null}
    >
      <ProcedenciaProvider consolas={identity.consoles} isOwner={identity.isOwner} nombre={identity.displayName}>
        <div data-os-juego="">{children}</div>
      </ProcedenciaProvider>
    </PanelShell>
  );
}
