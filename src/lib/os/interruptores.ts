import "server-only";
import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CLAVE_MODULOS_OS, modulosSinLectura, parsearModulos, type ClaveDeModulo, type EstadoDeModulo } from "./modulos";

// ── CTCx OS · el interruptor de cada módulo · LECTURA (V6.19, F2) ────────────
// Lee la llave `os_modulos` de `platform_settings` UNA vez por petición (`cache` de React)
// y la pasa por `parsearModulos` (puro, en `modulos.ts`):
//   · sin fila                    → los valores por defecto del registro (MODULOS_OS);
//   · la lectura falla o el valor no tiene forma → TODOS los módulos del OS apagados, con
//     su motivo. Apaga el OS, nunca la red: las otras 19 superficies no leen esta llave.
// Nunca lanza. No escribe (el escritor llega en el PR1b, con la dueña de la tabla, en el BCP)
// y no pasa por ninguna compuerta: la compuerta de la consola ya la pasó el layout de /os.

export const leerModulosOs = cache(async (): Promise<Record<ClaveDeModulo, EstadoDeModulo>> => {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service.from("platform_settings").select("value").eq("key", CLAVE_MODULOS_OS).maybeSingle();
    if (error) return modulosSinLectura();
    return parsearModulos((data as { value: unknown } | null)?.value ?? null);
  } catch {
    return modulosSinLectura();
  }
});

/** El estado de UN módulo (encendido, motivo y de dónde sale). Lo llama el layout de cada módulo y, si lee datos, su página. */
export async function moduloEncendido(clave: ClaveDeModulo): Promise<EstadoDeModulo> {
  return (await leerModulosOs())[clave];
}
