// ── Herramientas Internas · las puertas de entrada (CTCx OS) ─────────────────
// Desde el 2026-11-05 las herramientas del ECP se abren también COMO MÓDULOS: desde el tablero del juego (CTCx OS), un
// evento de calendario, el teléfono o el chat con Tailor. Cada herramienta tiene una URL de entrada con tres piezas:
// un REGISTRO que abrir (o nada), lo que se PRECARGA, y una VUELTA segura a donde estaba quien la abrió. El contrato
// completo (herramienta → parámetros → qué precargan → quién abre) es la tabla «Puertas de entrada» del charter
// `docs/componentes/herramientas-internas.md`.
//
// Módulo PURO (sin servidor, sin sesión): lo prueba `qa-entradas-check` sin levantar la consola (2FA). Todo parámetro es de
// LISTA BLANCA o de forma estricta: lo que no casa se IGNORA (la herramienta abre como si no viniera) — nunca se adivina,
// nunca se redondea un valor fuera de rango hacia dentro. La herramienta sigue detrás de su compuerta de consola: la URL
// precarga, no autoriza.

import type { Nivel, Triada } from "@/lib/pvc/escala";
import { UNIDADES, type UnidadId } from "@/lib/direccionamiento/definicion";

/** Un parámetro de `searchParams` de Next: string, varios (si se repite) o nada. Repetido = ambiguo = se ignora. */
export type Param = string | string[] | null | undefined;

const uno = (v: Param): string | null => (typeof v === "string" ? v : null);

/** Las raíces a las que puede volver una herramienta interna: las consolas y su selector. Una superficie nueva de
 *  CTCx OS que abra estas herramientas entra aquí con UNA línea (y su prueba en el guardián). `/os` (V6.19) es la
 *  consola de la OS: una herramienta abierta desde ella con `?volver=/os/...` conserva su «Volver». */
export const VUELTAS_PERMITIDAS = ["/ecp", "/ocp", "/lcp", "/bcp", "/panel", "/os"] as const;

/** Tope de largo de `?volver=`: una vuelta legítima es una ruta de consola con su consulta, no un párrafo. */
export const VOLVER_MAX = 300;

/**
 * `?volver=` saneado, con las mismas reglas que `vueltaSegura` de las herramientas públicas (`src/lib/tools/volverSeguro.ts`,
 * el redirect abierto que evita) y una raíz distinta: SOLO rutas relativas que caen, por FRONTERA DE SEGMENTO, dentro de una
 * consola. Devuelve `null` si no vale: la herramienta no pinta «Volver» (ya tiene su rail), en vez de inventar un destino.
 */
export function vueltaDeConsola(volver: Param): string | null {
  const v0 = uno(volver);
  if (!v0) return null;
  const v = v0.trim();
  if (!v || v.length > VOLVER_MAX) return null;
  if (!v.startsWith("/") || v.startsWith("//")) return null; // absoluta, esquema raro o `//otro-host`
  if (/[\\\u0000-\u001f\u007f]/.test(v)) return null; // `\`, saltos de línea, tabuladores y demás controles
  if (v.includes("://")) return null;
  // Segmentos `.` y `..` (también en `%2e`): el navegador los RESUELVE, así que `/ecp/../kaffetal-regal` empieza por `/ecp/` y
  // aterriza fuera de las consolas. Una vuelta legítima nunca los lleva: se rechazan, sin intentar «arreglarlos».
  if (/(^|\/)(\.|%2e){1,2}(\/|\?|#|$)/i.test(v)) return null;
  // Y la prueba de verdad: lo que el NAVEGADOR haría con ella. Se resuelve contra un origen ficticio; tiene que quedarse en él y
  // su ruta, ya normalizada, caer por frontera de segmento dentro de una consola. Se devuelve la forma normalizada.
  const BASE = "https://vuelta.invalid";
  let u: URL;
  try {
    u = new URL(v, BASE);
  } catch {
    return null;
  }
  if (u.origin !== BASE || u.pathname.startsWith("//")) return null;
  const ok = VUELTAS_PERMITIDAS.some((r) => u.pathname === r || u.pathname.startsWith(r + "/"));
  return ok ? `${u.pathname}${u.search}${u.hash}` : null;
}

/** El enlace de una herramienta con su vuelta (para quien la abre desde otra pantalla). */
export function conVuelta(ruta: string, volver: string | null): string {
  if (!volver) return ruta;
  return `${ruta}${ruta.includes("?") ? "&" : "?"}volver=${encodeURIComponent(volver)}`;
}

/* ── Definición de Contexto · `?unidad=` ─────────────────────────────────── */

/** `?unidad=ctcx|kr|chp|ecosistema` (los ids de `UNIDADES`, tal cual: sin mayúsculas ni espacios). */
export function unidadDeUrl(v: Param): UnidadId | null {
  const s = uno(v);
  return s !== null && UNIDADES.some((u) => u.id === s) ? (s as UnidadId) : null;
}

/* ── Escala de puntos · calculadora · `?sca=` y `?triada=` ───────────────── */

/** El rango del control de la calculadora (`EscalaBoard`): fuera de él no se precarga nada. */
export const SCA_URL_MIN = 78;
export const SCA_URL_MAX = 100;

/** `?sca=86.5` o `?sca=86,5` (coma decimal, como se escribe en Colombia): hasta dos decimales, dentro del rango del control. */
export function scaDeUrl(v: Param): number | null {
  const s = uno(v)?.trim();
  if (!s || !/^\d{2,3}(?:[.,]\d{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= SCA_URL_MIN && n <= SCA_URL_MAX ? n : null;
}

/** `?triada=BCA`: tres letras C/B/A en el orden de la casa (variedad · proceso · reconocimiento, `letras()` de `escala.ts`).
 *  Se aceptan minúsculas; nada más. */
export function triadaDeUrl(v: Param): Triada | null {
  const s = uno(v)?.trim().toUpperCase();
  if (!s || !/^[ABC]{3}$/.test(s)) return null;
  return { variedad: s[0] as Nivel, proceso: s[1] as Nivel, reconocimiento: s[2] as Nivel };
}
