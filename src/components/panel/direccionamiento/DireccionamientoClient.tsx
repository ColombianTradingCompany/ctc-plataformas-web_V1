"use client";

// ── BCP · Direccionamiento · el envoltorio ───────────────────────────────────
// ⚠️ EL MÓDULO YA NO ES VENDORIZADO (V4.32). Hasta V4.31 `DefinicionDeContexto`
// llegaba tal cual de su autor y no se editaba, para poder resincronizarlo. El
// rework de F7 retiró justo lo que lo hacía suyo —formatos de vídeo, derivables
// y moodboard—, así que la pantalla se reescribió como componente de la casa.
// El envoltorio se queda porque las props siguen siendo el contrato correcto:
//
//   adapter     persistencia por ámbito ("record" | "assets")
//   aiComplete  redacción — recibe el prompt armado, devuelve el texto
//   memory      lo que el sistema ya sabe; entra en cada prompt
//   initialData la ficha ya cargada en el servidor (evita el primer viaje)
//
// El módulo también emite `postMessage` y un CustomEvent en cada cambio; no se
// escuchan porque el guardado ya va por `adapter.save`.

import { useMemo } from "react";
import DefinicionDeContexto from "./DefinicionDeContexto";
import styles from "./direccionamiento.module.css";
import {
  cargarContexto,
  guardarContexto,
  redactarContexto,
  memoriaContexto,
} from "@/app/bcp/(app)/direccionamientoActions";

export function DireccionamientoClient({ initialRecord }: { initialRecord: Record<string, unknown> | null }) {
  const adapter = useMemo(
    () => ({
      load: (scope: string) => cargarContexto(scope),
      save: (scope: string, data: unknown) => guardarContexto(scope, data),
    }),
    []
  );

  // El módulo llama a estas con argumentos extra (metadatos de la pieza) que la
  // acción no necesita; se envuelven para no mandarlos al servidor por gusto.
  const aiComplete = useMemo(() => (prompt: string) => redactarContexto(prompt), []);
  const memory = useMemo(() => () => memoriaContexto(), []);

  // El envoltorio no es decorativo: aísla al módulo de las reglas de ELEMENTO
  // de globals.css (ver direccionamiento.module.css).
  return (
    <div className={styles.host}>
      <DefinicionDeContexto
        adapter={adapter}
        aiComplete={aiComplete}
        memory={memory}
        initialData={initialRecord}
      />
    </div>
  );
}
