"use client";

// ── ECP · Direccionamiento · el envoltorio ───────────────────────────────────
// `DefinicionDeContexto.jsx` llega tal cual del autor y NO se edita (salvo la
// directiva "use client" de su primera línea). Todo el cableado con la
// plataforma vive aquí, en las props que el propio módulo documenta:
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
import {
  cargarContexto,
  guardarContexto,
  redactarContexto,
  memoriaContexto,
} from "@/app/ecp/(app)/direccionamientoActions";

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

  return (
    <DefinicionDeContexto
      adapter={adapter}
      aiComplete={aiComplete}
      memory={memory}
      initialData={initialRecord}
    />
  );
}
