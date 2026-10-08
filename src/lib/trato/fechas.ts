// ── Fechas sin ambigüedad para el productor (V5.188) ─────────────────────────────────────────────────────────────────────────
// Feedback de revisión de «Contratos y Compras»: «"Vence el 4/1/2027" puede leerse como 4 de enero o como 1 de abril». En
// Kaffetal Regal ninguna fecha va en números: se escribe «3 de enero de 2027». Un INSTANTE (timestamptz) se lee en la hora de
// Colombia: una oferta que vence el 3 de enero a las 23:59 de Bogotá decía «4/1/2027» a quien la miraba desde otro huso.
// Y la ventana dice su duración exacta («88 días · 12 semanas y 4 días»), no un redondeo a 13 semanas.
// PURO: lo usan la pantalla, el servidor y los guardianes.

import { fechaLarga } from "./modalidades";

const ZONA_COLOMBIA = "America/Bogota";
const DIA_MS = 86_400_000;

/** El día de Colombia en que cae un instante, como «AAAA-MM-DD». */
export function diaEnColombia(instante: string | Date): string {
  const d = typeof instante === "string" ? new Date(instante) : instante;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_COLOMBIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Una fecha para el productor: «3 de enero de 2027». Acepta un día («2027-01-03») o un instante, que se lee en la hora de Colombia. */
export function fechaParaElProductor(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return fechaLarga(iso.length > 10 ? diaEnColombia(iso) : iso);
}

/** La duración de una ventana, contando el primer y el último día, dicha sin redondear: «88 días · 12 semanas y 4 días». */
export function duracionDeVentana(desde: string, hasta: string): { dias: number; semanas: number; restoDias: number; texto: string } {
  const dias = Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / DIA_MS) + 1;
  const semanas = Math.floor(dias / 7);
  const restoDias = dias % 7;
  const n = (k: number, uno: string, varios: string) => `${k} ${k === 1 ? uno : varios}`;
  const partes =
    semanas === 0 ? n(restoDias, "día", "días") : restoDias === 0 ? n(semanas, "semana", "semanas") : `${n(semanas, "semana", "semanas")} y ${n(restoDias, "día", "días")}`;
  return { dias, semanas, restoDias, texto: `${n(dias, "día", "días")} · ${partes}` };
}
