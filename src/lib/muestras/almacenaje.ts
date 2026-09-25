// ── La revisión de almacenaje a los 90 días · la regla PURA (Gestión de Muestras, 2.ª tanda · V5.88) ──
// El owner (2026-09-16, `docs/ALINEACION.md` §3): «llamado a más de 90 días de la catación: NO se recata, se hace revisión de
// almacenaje con 1 kg». El kilo es la porción de TESTEO de la partición del folio 7 (`PARTICION_KG`), así que aquí no se
// inventa un peso: se lee de allí. La alerta NO es un campo: se DERIVA de la fecha de la evaluación que rige el grado y del
// último movimiento `revision_almacenaje` (cada revisión reinicia el reloj). La leen el Tablero de Ejecución (tarea `muestra`),
// `/ocp/muestras` y `qa-muestras-check`.

import { PARTICION_KG } from "./particion";

/** A partir de cuántos días de la catación toca revisar el almacenaje en vez de recatar. */
export const DIAS_REVISION_ALMACENAJE = 90;
/** Con cuánto se revisa: la porción de testeo del folio 7 (1 kg). */
export const KG_REVISION_ALMACENAJE: number = PARTICION_KG.find((p) => p.tipo === "testeo")?.kg ?? 1;

const MS_DIA = 24 * 60 * 60 * 1000;

export type LecturaDeAlmacenaje = {
  /** Toca revisar: pasaron 90 días desde la catación (o desde la última revisión) y el lote sigue en juego. */
  debida: boolean;
  /** Días desde la catación que rige. */
  diasDesdeCatacion: number;
  /** Días desde el último punto de referencia (la catación o la última revisión). */
  diasDesdeReferencia: number;
};

/**
 * Qué toca hoy con el almacenaje de un lote catado: nada, o la revisión de almacenaje.
 *   · Sin evaluación que rija no hay reloj.
 *   · El reloj arranca en la catación y se reinicia con cada revisión anotada (`revision_almacenaje`).
 *   · A los DIAS_REVISION_ALMACENAJE, toca. No hay campo: es aritmética sobre dos fechas.
 */
export function revisionDeAlmacenaje(o: { evaluadaAt: string | null; ultimaRevisionAt: string | null }, ahora: Date): LecturaDeAlmacenaje {
  if (!o.evaluadaAt) return { debida: false, diasDesdeCatacion: 0, diasDesdeReferencia: 0 };
  const catacion = new Date(o.evaluadaAt).getTime();
  const referencia = Math.max(catacion, o.ultimaRevisionAt ? new Date(o.ultimaRevisionAt).getTime() : 0);
  const diasDesdeCatacion = Math.floor((ahora.getTime() - catacion) / MS_DIA);
  const diasDesdeReferencia = Math.floor((ahora.getTime() - referencia) / MS_DIA);
  return { debida: diasDesdeReferencia >= DIAS_REVISION_ALMACENAJE, diasDesdeCatacion, diasDesdeReferencia };
}
