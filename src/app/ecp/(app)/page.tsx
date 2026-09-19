import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { CONSOLES } from "@/lib/panel/consoles";
import { porConsola } from "@/lib/panel/tareas";
import { cargarTareas } from "@/lib/panel/tareasCarga";
import { PanelTasks } from "@/components/panel/PanelTasks";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── ECP · Tablero de Ejecución (V5.60) ───────────────────────────────────────
// El Panel del ECP fue hasta la V5.59 un índice con cuatro casillas de módulos
// por construir. El cuadro del owner (2026-09-19) lo convierte en lo que el
// nombre de la consola promete: **qué tiene pendiente la casa, en las cuatro
// consolas, en un sitio.**
//
// No guarda tareas: las DEDUCE (`src/lib/panel/tareasCarga.ts`) — un lead sin
// responder, una finca por revisar, un mensaje de productor, una humedad fuera
// de rango, un lote en fila para la Arena. Cada una dice de qué consola es y
// enlaza a SU elemento. Lo único que se persiste es la casilla.
//
// Se ven TODAS aunque quien mira no tenga grant de la consola dueña: el tablero
// es para saber qué hay, y el enlace ya lo para `requireConsoleAccess()` si no
// puede entrar. Marcar la casilla sí pide nivel (borrador) en la dueña o aquí.
export default async function TableroDeEjecucionPage() {
  const identity = await requireConsoleAccess("ecp");
  const { tareas } = await cargarTareas(createServiceRoleClient());
  const pendientes = tareas.filter((t) => t.state === "tbd");
  const grupos = porConsola(tareas);

  return (
    <div>
      <h1 className={styles.title}>Tablero de Ejecución</h1>
      <p className={styles.subtitle}>
        Lo que la casa tiene pendiente, consola por consola. Nada de esto se escribe a mano: cada línea sale de un estado que
        pide a alguien, y desaparece sola cuando se resuelve.
      </p>

      <div className={styles.kpiGrid}>
        {grupos.map(({ consola, tareas: suyas }) => {
          const c = CONSOLES[consola];
          const abiertas = suyas.filter((t) => t.state === "tbd").length;
          const entra = identity.consoles.includes(consola);
          const tarjeta = (
            <>
              <div className={styles.kpiTop}>
                <span className={styles.kpiK}>{c.code}</span>
              </div>
              <div className={styles.kpiV} style={{ color: abiertas > 0 ? c.accent : "var(--ink)" }}>
                {abiertas}
              </div>
              <div className={styles.kpiSub}>{abiertas === 1 ? "tarea pendiente" : "tareas pendientes"} · de {suyas.length}</div>
            </>
          );
          return (
            <div className={styles.kpiCard} key={consola}>
              {entra ? <Link href={c.home}>{tarjeta}</Link> : tarjeta}
            </div>
          );
        })}
      </div>

      {!pendientes.length && <p className={styles.empty}>Nada pendiente en ninguna consola. Todo al día ✓</p>}

      {grupos.map(({ consola, tareas: suyas }) => (
        <section key={consola}>
          <h2 className={styles.sectionHead} style={{ marginTop: 28 }}>
            {CONSOLES[consola].code} · {CONSOLES[consola].name}
          </h2>
          <PanelTasks items={suyas} />
        </section>
      ))}
    </div>
  );
}
