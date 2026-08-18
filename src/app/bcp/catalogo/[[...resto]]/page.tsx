import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/bcp/catalogo` se fue al OCP ──
// PR-A del paso (ii) del plan V5 (V4.24, 2026-08-18). La regla F2 dice que las
// URLs viejas NO mueren: quedan como 308 permanentes hacia el destino final.
// Aquí importa quién las tenía escritas — marcadores del owner, enlaces en
// correos ya enviados y cualquier ruta interna que se nos haya escapado.
//
// El destino NO se escribe a mano: sale de `RUTAS_MOVIDAS`. Si este módulo
// vuelve a moverse (Black Stock, por ejemplo, se convierte en pestaña de CTC
// Selection en el paso (iii)), se reapunta ALLÍ y este archivo no se toca —
// que es justo como se evita una cadena de talones.
//
// El catch-all opcional `[[...resto]]` cubre el módulo Y todas sus sub-rutas
// con UN archivo: `/bcp/catalogo`, `/bcp/catalogo/algo` y `/bcp/catalogo/algo/mas`.
// `destinoDe()` reconstruye la cola, así que un `[id]` viaja sin que este
// talón sepa nada de su propio parámetro.
//
// Vive FUERA del grupo `(app)` a propósito: ahí dentro el layout corre
// `requireConsoleAccess("bcp")`, y quien llegue por un marcador viejo se
// comería un «no tiene acceso» sobre una URL que ya no existe. Redirigir
// primero y dejar que el OCP haga de portero es lo correcto.
export default async function TalonBcpCatalogo({
  params,
}: {
  params: Promise<{ resto?: string[] }>;
}) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/bcp/catalogo" + cola) ?? "/ocp");
}
