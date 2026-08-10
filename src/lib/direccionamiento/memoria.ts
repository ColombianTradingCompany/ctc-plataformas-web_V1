// ── ECP · Direccionamiento · la memoria del sistema ──────────────────────────
// Módulo PURO (sin servidor, sin sesión, sin red) a propósito: esto es lo que
// entra en CADA prompt del módulo, y es exactamente lo que hay que poder
// comprobar sin levantar la consola. Lo usan el Server Action
// (`direccionamientoActions.ts`) y el guardián `scripts/qa-direccionamiento-check.mjs`
// — una sola fuente, para que la comprobación no acabe probando una copia.
//
// POR QUÉ EXISTE ESTE TEXTO. El componente vendorizado trae embebido su propio
// contexto de compañía, y ahí los grados están citados como ÍNDICE DE PRECIO
// sobre base 100 (Black 105–110, Red 110–125, Blue 125–135, Gold 135–150,
// Tyrian 150–200). Eso NO es la definición de la casa: el grado se lee del
// PUNTAJE SCA. Como el archivo del autor se mantiene verbatim, la corrección no
// se hace editándolo — se hace aquí, en la memoria, que el módulo coloca dentro
// de <memoria_del_sistema> ANTES del brief.

import { GRADOS, SCA_MINIMO, SCA_MAXIMO } from "@/lib/grados/definicion";

/** El system prompt de la redacción. Vive aquí y no en el módulo de actions
 *  para que el guardián pruebe LA MISMA cadena que se manda en producción. */
export const SISTEMA_REDACCION =
  "Eres el estratega de contenido y copy de Colombian Trading Company. " +
  "Respondes ÚNICAMENTE con el JSON que se te pide, sin preámbulo, sin explicación " +
  "y sin vallas de markdown. Escribes en español de Colombia.";

/** La escala, compuesta desde la fuente única. Si alguien cambia un umbral en
 *  `definicion.ts`, este texto cambia solo — que es todo el punto. */
export function escalaCanonica(): string {
  return GRADOS.map(
    (g) => `${g.nombre} (SCA ${g.scaMin}–${g.scaMax}) — «${g.lema}» · ${g.claseLote} · ${g.variedad}`
  ).join("\n");
}

/** Lo que el sistema ya sabe y el modelo tiene que respetar.
 *
 *  Espacio para crecer: piezas ya publicadas en Coffeed, ángulos ya usados,
 *  métricas de rendimiento. Cuando existan, se añaden a este texto. */
export function textoMemoria(): string {
  return [
    "GRADOS DE CALIDAD CTC — ESTA es la definición de la casa y prevalece sobre",
    "cualquier otra cifra que aparezca en el contexto de compañía. Los grados se",
    `leen del PUNTAJE SCA (escala continua de ${SCA_MINIMO} a ${SCA_MAXIMO}, dos decimales como máximo),`,
    "no de un índice de precio. El puntaje manda y no se negocia; los criterios",
    "cualitativos orientan el VALOR dentro del rango, no cambian el grado.",
    escalaCanonica(),
    "",
    "Nunca inventes ni redondees un umbral de grado en una pieza de contenido:",
    "si hace falta un número, es uno de los de arriba.",
  ].join("\n");
}
