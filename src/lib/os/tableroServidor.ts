import "server-only";
import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { armarTablero, type LecturasDelTablero, type Tablero } from "./tablero";
import {
  PIEZAS_DEL_LECTOR,
  leerHechosPorHub,
  leerLotesPorEtapa,
  leerPvc,
  leerSalud,
  leerStockDelCircuito,
  leerTareasDeLaCasa,
  leerTratos,
} from "./lectura";

// ── CTCx OS · el tablero, leído (V6.19, F2) · SOLO SERVIDOR ──────────────────
// Corre los lectores de `lectura.ts` a la vez y arma el tablero con `armarTablero` (puro).
// Un lector que falla deja sus piezas en «Sin datos» y un AVISO con sus fuentes; si ni
// siquiera hay cliente (falta la credencial), todo el tablero sale en «Sin datos» con un
// aviso por lector. Nunca lanza. Una lectura por petición (`cache` de React); sin caché
// entre peticiones en F2: el HUD dice a qué hora se leyó.
//
// Las tareas van primero en la cadena de los tratos: de ellas salen los despachos
// vencidos (`despacho:vencido:*` = `pendientesDelCircuito().sacosVencidos`), y así el stock
// no se carga otra vez solo para contarlos (crítica 5). El resto corre en paralelo.

export const leerTablero = cache(async (): Promise<Tablero> => {
  const leidoAt = new Date().toISOString();
  let lecturas: LecturasDelTablero;
  try {
    const service = createServiceRoleClient();
    const tareasP = leerTareasDeLaCasa(service);
    const tratosP = tareasP.then((t) => leerTratos(service, t.ok ? { sacosVencidos: t.valor.sacosVencidos } : {}));
    const [tareas, tratos, stock, pvc, salud, hechos, lotes] = await Promise.all([
      tareasP,
      tratosP,
      leerStockDelCircuito(service),
      leerPvc(service),
      leerSalud(service, new Date(leidoAt)),
      leerHechosPorHub(),
      leerLotesPorEtapa(service),
    ]);
    lecturas = {
      leidoAt,
      tareas: tareas.ok ? { ...tareas, valor: tareas.valor.conteo } : tareas,
      tratos,
      stock,
      pvc,
      salud,
      hechos,
      lotes,
    };
  } catch {
    const sin = <K extends keyof typeof PIEZAS_DEL_LECTOR>(k: K) => ({ ok: false as const, error: "lectura_fallida" as const, fuentes: PIEZAS_DEL_LECTOR[k] });
    lecturas = {
      leidoAt,
      tareas: sin("tareas"),
      tratos: sin("tratos"),
      stock: sin("stock"),
      pvc: sin("pvc"),
      salud: sin("salud"),
      hechos: sin("hechos"),
      lotes: sin("lotes"),
    };
  }
  return armarTablero(lecturas);
});
