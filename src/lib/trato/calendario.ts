// ── El calendario de los Ciclos (V5.174 · docs/PLAN_CICLOS.md §1, owner 2026-10-07) ─────────────────────────────────────────
// PURO. Semanas ISO 8601 (lunes a domingo). Un trimestre = 13 semanas = ciclo 1 de 6 + ciclo 2 de 7; en los años ISO de 53
// semanas el trimestre de fin de año tiene 14 (7 + 7) y termina en la primera semana de enero. Esto PROPONE las fechas: las que
// rigen son las de cada edición del PVC (variables que CTCx aprueba) — `ventanas.ts` lee las de la edición, no estas.
// Ritmo de cada ciclo: semana 1 llega lo nuevo y lo vendido · semana 2 se procesa · semana 3 sale el flete programado.

const DIA_MS = 86_400_000;
const aFecha = (iso: string) => new Date(`${iso}T12:00:00Z`);
const aIso = (d: Date) => d.toISOString().slice(0, 10);
export const sumaDias = (iso: string, n: number) => aIso(new Date(aFecha(iso).getTime() + n * DIA_MS));
export const diasEntre = (desde: string, hasta: string) => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / DIA_MS);

/** Las semanas 2–3 del trimestre no reciben contratos nuevos desde 2027 (owner: en T4-2026 no aplica). */
export const BLOQUEO_SEMANAS_DESDE = "2027-01-01";

/** El lunes de la semana 1 ISO de un año (la que contiene el 4 de enero). */
export function lunesDeLaSemana1(anio: number): string {
  const cuatro = new Date(Date.UTC(anio, 0, 4, 12));
  const dow = (cuatro.getUTCDay() + 6) % 7; // 0 = lunes
  return aIso(new Date(cuatro.getTime() - dow * DIA_MS));
}

/** Cuántas semanas tiene el año ISO (52 o 53). */
export function semanasDelAnioIso(anio: number): 52 | 53 {
  return diasEntre(lunesDeLaSemana1(anio), lunesDeLaSemana1(anio + 1)) / 7 === 53 ? 53 : 52;
}

/** El año ISO de una fecha (el 1 de enero puede caer en la semana 53 del año anterior). */
export function anioIso(iso: string): number {
  const y = Number(iso.slice(0, 4));
  if (iso < lunesDeLaSemana1(y)) return y - 1;
  if (iso >= lunesDeLaSemana1(y + 1)) return y + 1;
  return y;
}

export type Ciclo = { n: 1 | 2; desde: string; hasta: string; semanas: number };
export type Trimestre = {
  /** «F4-2026»: el mismo nombre de franja que las ediciones del PVC («PVC-F4-2026»). */
  codigo: string;
  anio: number;
  q: 1 | 2 | 3 | 4;
  desde: string;
  hasta: string;
  semanas: 13 | 14;
  ciclos: [Ciclo, Ciclo];
  /** Semanas 2–3 del trimestre, sin contratos nuevos (null antes de 2027). */
  sinContratos: { desde: string; hasta: string } | null;
  /** El agente propone el PVC siguiente el lunes de la semana 1 del ciclo 2… */
  agenteEl: string;
  /** …y un responsable de CTCx lo publica a más tardar el domingo de la semana 2. */
  publicaAMasTardar: string;
};

/** Los cuatro trimestres de un año ISO, con sus ciclos. */
export function trimestresDelAnio(anio: number): Trimestre[] {
  const inicio = lunesDeLaSemana1(anio);
  const extra = semanasDelAnioIso(anio) === 53;
  const out: Trimestre[] = [];
  let desde = inicio;
  for (const q of [1, 2, 3, 4] as const) {
    const semanas = q === 4 && extra ? 14 : 13;
    const s1 = semanas === 14 ? 7 : 6;
    const hasta = sumaDias(desde, semanas * 7 - 1);
    const fin1 = sumaDias(desde, s1 * 7 - 1);
    const inicio2 = sumaDias(fin1, 1);
    out.push({
      codigo: `F${q}-${anio}`,
      anio,
      q,
      desde,
      hasta,
      semanas,
      ciclos: [
        { n: 1, desde, hasta: fin1, semanas: s1 },
        { n: 2, desde: inicio2, hasta, semanas: semanas - s1 },
      ],
      sinContratos: desde >= BLOQUEO_SEMANAS_DESDE ? { desde: sumaDias(desde, 7), hasta: sumaDias(desde, 20) } : null,
      agenteEl: inicio2,
      publicaAMasTardar: sumaDias(inicio2, 13),
    });
    desde = sumaDias(hasta, 1);
  }
  return out;
}

/** El trimestre (propuesto por la regla ISO) que contiene una fecha. */
export function trimestreDe(iso: string): Trimestre {
  return trimestresDelAnio(anioIso(iso)).find((t) => t.desde <= iso && iso <= t.hasta)!;
}

/** El trimestre que sigue a otro. */
export function trimestreSiguiente(t: Trimestre): Trimestre {
  return trimestreDe(sumaDias(t.hasta, 1));
}

// ── Las fechas de UNA edición (las que rigen) ────────────────────────────────────────────────────────────────────────────
export type CalendarioDeEdicion = { desde: string; ciclo1Hasta: string; hasta: string };

/** Las fechas que propone la regla ISO para la edición de un trimestre. */
export function calendarioPropuesto(t: Trimestre): CalendarioDeEdicion {
  return { desde: t.desde, ciclo1Hasta: t.ciclos[0].hasta, hasta: t.hasta };
}

/** ¿Las fechas de una edición son válidas? Lunes a domingo, ciclo 1 de 6–7 semanas y el trimestre de 13–14. */
export function validarCalendario(c: CalendarioDeEdicion): string | null {
  const dow = (iso: string) => aFecha(iso).getUTCDay();
  if (dow(c.desde) !== 1) return "La edición empieza un lunes.";
  if (dow(c.ciclo1Hasta) !== 0 || dow(c.hasta) !== 0) return "Los ciclos terminan un domingo.";
  const s1 = (diasEntre(c.desde, c.ciclo1Hasta) + 1) / 7;
  const st = (diasEntre(c.desde, c.hasta) + 1) / 7;
  if (st !== 13 && st !== 14) return "El trimestre tiene 13 semanas (14 en el de ajuste de fin de año).";
  if (s1 !== 6 && s1 !== 7) return "El ciclo 1 tiene 6 semanas (7 en el trimestre de 14).";
  if (st - s1 < s1) return "El primer ciclo es el más corto (o igual).";
  return null;
}

export type Ubicacion = { ciclo: 1 | 2; semanaDelCiclo: number; semanaDelTrimestre: number; inicioCiclo: string; finCiclo: string };

/** Dónde cae una fecha dentro de las fechas de una edición. null si cae fuera. */
export function ubicar(iso: string, c: CalendarioDeEdicion): Ubicacion | null {
  if (iso < c.desde || iso > c.hasta) return null;
  const ciclo = iso <= c.ciclo1Hasta ? 1 : 2;
  const inicioCiclo = ciclo === 1 ? c.desde : sumaDias(c.ciclo1Hasta, 1);
  return {
    ciclo,
    semanaDelCiclo: Math.floor(diasEntre(inicioCiclo, iso) / 7) + 1,
    semanaDelTrimestre: Math.floor(diasEntre(c.desde, iso) / 7) + 1,
    inicioCiclo,
    finCiclo: ciclo === 1 ? c.ciclo1Hasta : c.hasta,
  };
}

/** El agente y el plazo de publicación del PVC siguiente, para las fechas de una edición. */
export function agendaDelPvcSiguiente(c: CalendarioDeEdicion): { agenteEl: string; publicaAMasTardar: string } {
  const inicio2 = sumaDias(c.ciclo1Hasta, 1);
  return { agenteEl: inicio2, publicaAMasTardar: sumaDias(inicio2, 13) };
}

/** Las semanas sin contratos nuevos de una edición (semanas 2–3 del trimestre; null antes de 2027). */
export function semanasSinContratos(c: CalendarioDeEdicion): { desde: string; hasta: string } | null {
  return c.desde >= BLOQUEO_SEMANAS_DESDE ? { desde: sumaDias(c.desde, 7), hasta: sumaDias(c.desde, 20) } : null;
}
