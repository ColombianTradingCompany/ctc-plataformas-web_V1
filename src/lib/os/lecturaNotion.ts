import "server-only";
import { SIN_INTEGRACION_NOTION, type LecturaDeNotion } from "./fuentes";
import type { TareasDeNotion } from "./acciones";
import type { Carta } from "./estafeta";

// ── CTCx OS · los lectores de Notion (F3) · SOLO SERVIDOR, SOLO LECTURA ──────
// Los dos lectores que alimentan los módulos de F3: las Tareas (Acciones) y el registro
// «Correspondencia» (Estafeta). Leerán con la integración de Notion DE SOLO LECTURA del OS
// («CTCx OS · lectura», E-4, decisión CON-28), compartida solo con las bases de
// `BASES_DE_NOTION_DEL_OS`, con su clave en Vercel y una caché de 5 minutos (PLAN F3). Esa
// integración la crea el owner en su sesión; hasta entonces NO EXISTE, y estos lectores devuelven
// `SIN_INTEGRACION_NOTION`: los módulos pintan «Sin datos» con su nota, nunca un cero, y sin aviso.
//
// Hoy no hay red, ni clave, ni cliente aquí (`qa-os-check` A3/A8 lo exigen). Cuando llegue la
// integración, este archivo cambia en su propio paso, con su lista de propiedades leídas (solo estados,
// fechas, Área y la presencia de sus llaves: nunca títulos, textos, personas ni direcciones) y con el
// guardián de paridad de lectura (los conteos contra Notion y el OCP). Nunca lanzan.

/** Las Tareas de Notion, contadas por Área (hub). Sin la integración (CON-28): `SIN_INTEGRACION_NOTION`. */
export function leerTareasDeNotion(): Promise<LecturaDeNotion<TareasDeNotion>> {
  return Promise.resolve(SIN_INTEGRACION_NOTION);
}

/** Las filas de «Correspondencia», reducidas a cartas (sin ids ni texto). Sin la integración (CON-28): `SIN_INTEGRACION_NOTION`. */
export function leerCorrespondencia(): Promise<LecturaDeNotion<readonly Carta[]>> {
  return Promise.resolve(SIN_INTEGRACION_NOTION);
}
