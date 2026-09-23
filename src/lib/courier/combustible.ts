// ── Cotizador Courier · el recargo de combustible, derivado ─────────────────────────────────────────
// FedEx cambia el recargo cada lunes y lo publica en fedex.com, pero fedex.com NO responde a un servidor
// (Akamai: devuelve «System Down» a todo lo que no sea un navegador — probado 2026-09-23 desde curl y con
// cabeceras de navegador). Así que el cron lo DERIVA igual que lo deriva FedEx, de dos fuentes:
//
//   1. El precio semanal del queroseno de aviación en la Costa del Golfo (USGC), que publica la EIA
//      (serie EER_EPJK_PF4_RGC_DPG, semana que cierra en viernes, sale los miércoles). Público y sin clave.
//   2. La tabla de escalones de FedEx (precio → %), que es dato en `courier_combustible_escalas`.
//
// El desfase lo fija FedEx («retraso de dos semanas»), y se comprobó contra las 13 semanas que publicaba
// su página el 2026-09-23: el precio de la semana EIA que cierra el viernes V rige el lunes V + 10 días.
// (09-11 → $4.418 → 41,00 % la semana del 21-sep.) `qa-courier-check` lo vigila con esas 13 semanas.
//
// Puro: sin red. La lectura de la EIA vive en `./eia.ts`.

export type EscalaCombustible = { desde: number; hasta: number; pct: number };
export type PrecioSemanal = { semanaFin: string; usd: number }; // semanaFin = el viernes que cierra la semana EIA

export const DIAS_DESFASE = 10;

const sumaDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** La semana de FedEx (lunes → domingo) en que rige el precio de la semana EIA que cierra `semanaFin`. */
export function semanaFedex(semanaFin: string): { desde: string; hasta: string } {
  const desde = sumaDias(semanaFin, DIAS_DESFASE);
  return { desde, hasta: sumaDias(desde, 6) };
}

/** El % de la tabla para un precio: «al menos `desde` y menos que `hasta`». Fuera de la tabla, null —
 *  un precio que la tabla no cubre no se adivina (FedEx cambia la tabla cuando el recargo se sale). */
export function pctPorPrecio(escalas: EscalaCombustible[], usd: number): number | null {
  const e = escalas.find((x) => usd >= x.desde - 1e-9 && usd < x.hasta - 1e-9);
  return e ? e.pct : null;
}

const MESES: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** Lee la tabla semanal de la página de la EIA (LeafHandler, f=W): filas «2026-Sep | 09/04 | 4.082 | 09/11 | 4.418 …».
 *  Devuelve las semanas en orden, ignorando los huecos. Si el formato cambia y no reconoce nada, devuelve []. */
export function parseEiaSemanal(html: string): PrecioSemanal[] {
  const texto = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const out: PrecioSemanal[] = [];
  const bloques = texto.split(/(?=\b\d{4}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)/);
  for (const b of bloques) {
    const cab = b.match(/^(\d{4})-(\w{3})\b/);
    if (!cab || !MESES[cab[2]]) continue;
    const anio = Number(cab[1]);
    for (const m of b.matchAll(/\b(\d{2})\/(\d{2})\s+(\d+\.\d{2,3})\b/g)) {
      // Una semana cuyo viernes cae en enero puede aparecer bajo el diciembre anterior: el año sale del mes.
      const a = m[1] === "01" && cab[2] === "Dec" ? anio + 1 : anio;
      const usd = Number(m[3]);
      if (usd > 0 && usd < 20) out.push({ semanaFin: `${a}-${m[1]}-${m[2]}`, usd });
    }
  }
  return out.sort((x, y) => x.semanaFin.localeCompare(y.semanaFin));
}
