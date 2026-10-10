// ── Adquisición de Stock Café · las reglas de una compra (V5.203, owner 2026-10-10) — PURO ───────────────────────────────────────
// El owner, 2026-10-10: «CTCx Compras no parece estar funcionando bien; revísalo y mejora el UI/UX con la nueva información que tienes
// donde sea pertinente (también en relación a su interacción con el Triage de Catálogo Activo y la Oferta de CTCx Selection)».
// Aquí, sin red, lo que decide la pantalla y repiten las acciones (y la base, `docs/migraciones/2026-10-10_compras_anulacion.sql`):
//   · B1 — `stock_partidas.compra_id` es UNIQUE: PostgREST devuelve el embed como OBJETO o null, nunca lista; `listaDe` lo normaliza.
//   · B3 — la nota al productor depende del destino; B4 — ninguna fecha en el futuro; B5 — cuándo NO cambia «Es de»;
//   · B6 — el precio sin «PVC PVC-…» y sin ocultar de dónde salió; B9 — cuándo se anula una compra;
//   · el origen legible y el SIGUIENTE PASO de cada compra en el circuito (Stock CTCx → Triage → Catálogo Activo).
// V5.203 · corrección (nodo final, 2026-10-10 · revisión de textos): las fechas `date` en UTC (H3), el estado de un saco por recibir
// sin prometer un pago que no se hizo (H4), lo que le FALTA a un recibo o a un mes pagado —su compra o su partida— para el aviso fijo
// del contrato y su «Reintentar» (H1/H2), el origen con el diccionario único (H9/H11) y lo libre en kg de CPS equivalentes (H10).
// `qa-compras-check` lo ejercita con casos.

import { STOCK_PATH } from "@/lib/stock/linaje";
import { rutaDelTriage } from "@/lib/triage/fobMinimo";
import { ORIGEN_LABEL } from "./selection";

/** H3: una fecha para la pantalla y las notas. Una columna `date` («2026-10-11», sin hora) o un instante a medianoche UTC (lo que
 *  guarda la base de un campo de fecha) se lee en UTC —en la hora de Bogotá saldría el día ANTERIOR—; cualquier otro instante, en la
 *  hora de Colombia. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso) || /T00:00:00(?:\.0+)?(?:Z|[+-]00(?::?00)?)?$/.test(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { timeZone: soloFecha ? "UTC" : "America/Bogota", day: "2-digit", month: "short", year: "numeric" });
}

/** H15: el enlace a la fila de una compra en Adquisición. `?compra=` la resalta desde el servidor (un `<Link>` hace pushState y no
 *  activa `:target`) y abre «Anuladas» si es una anulada; `#compra-…` la trae a la vista. */
export const rutaDeLaCompra = (id: string) => `/ocp/compras?compra=${id}#compra-${id}`;

/** H4: el estado de un saco o un adelanto por recibir. El productor marca «despachado» desde su panel sin que CTCx haya pagado: el
 *  60 % solo se dice pagado si lo está. */
export function estadoDelDespacho(d: { estado: string; pago60: boolean }): string {
  if (d.pago60) return d.estado === "despachado" ? "despachado · 60 % pagado" : "60 % pagado";
  return d.estado === "despachado" ? "despachado por el productor · falta confirmar y pagar el 60 %" : "pendiente · sin el 60 %";
}

/** B1: un embed de PostgREST llega como lista (uno a muchos), como objeto o null (uno a uno: FK UNIQUE). Siempre lista. */
export function listaDe<T>(v: T | readonly T[] | null | undefined): T[] {
  if (Array.isArray(v)) return [...v];
  return v == null ? [] : [v as T];
}

/** La partida raíz VIVA de una compra (el embed `stock_partidas` por `compra_id`). */
export function raizVivaDe<T extends { anulada_at: string | null }>(v: T | readonly T[] | null | undefined): T | null {
  return listaDe(v).find((p) => !p.anulada_at) ?? null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** B4: ninguna fecha de la compra en el futuro (una fecha de recibo futura metía el café al stock HOY). `hoy` = AAAA-MM-DD en Colombia. */
export function errorDeFechas(f: { acordadaAt?: string | null; pagadaAt?: string | null; recibidaAt?: string | null }, hoy: string): string | null {
  const campos: [string, string | null | undefined][] = [["del acuerdo", f.acordadaAt], ["de pago", f.pagadaAt], ["de recibo", f.recibidaAt]];
  for (const [nombre, v] of campos) {
    if (!v) continue;
    if (!FECHA.test(v) || Number.isNaN(Date.parse(`${v}T12:00:00Z`))) return `La fecha ${nombre} no es una fecha válida (AAAA-MM-DD).`;
    if (v > hoy) return `La fecha ${nombre} (${v}) está en el futuro: aquí se registra lo que ya pasó (hoy es ${hoy}).`;
  }
  return null;
}

export type Destino = "selection" | "stock";
export const esDestino = (v: unknown): v is Destino => v === "selection" || v === "stock";

/** B3: lo que lee el productor en su feed. Solo una compra de CTCx Selection dice que su café se ofrece como CTCx Selection. */
export function notaDeCompraAlProductor(c: { destino: Destino; kg: number; copKgTexto: string; pagadaAt: string | null }): string {
  const pagada = c.pagadaAt ? ` (pagada el ${fechaCorta(c.pagadaAt)})` : "";
  return c.destino === "selection"
    ? `CTCx registró la compra en firme de ${c.kg} kg de CPS de su lote a ${c.copKgTexto}/kg${pagada}. Ese café pasa a ofrecerse como CTCx Selection.`
    : `CTCx compró en firme ${c.kg} kg de CPS de su lote a ${c.copKgTexto}/kg${pagada}.`;
}

/** B9: la nota al productor cuando se anula el registro de una compra (no repite el motivo interno). */
export function notaDeAnulacionAlProductor(c: { kg: number; registradaEl: string | null }): string {
  return `CTCx anuló el registro de la compra de ${c.kg} kg de CPS de su lote${c.registradaEl ? ` (registrada el ${c.registradaEl})` : ""}: ese registro queda sin efecto y ese café no cuenta como comprado por CTCx.`;
}

/** Una compra que nació del recibo de un saco o un adelanto de un trato por ventana (su raíz tiene despacho, o su precio lo dice). */
export const esDeDespacho = (c: { precioFuente: string | null; raizDespachoId?: string | null }) =>
  !!c.raizDespachoId || /^trato por ventana/i.test(c.precioFuente ?? "");

/** B5: por qué NO cambia «Es de» (null = puede cambiar). La base (`guard_compra`) repite las tres reglas. */
export function motivoParaNoDestinar(e: {
  actual: Destino;
  nuevo: unknown;
  anulada: boolean;
  enMezclaViva: boolean;
  deDespacho: boolean;
  /** El código de una declaración viva del LOTE en el Catálogo Activo (la marca Selection va por lote), o null. */
  declaracionViva: string | null;
}): string | null {
  if (!esDestino(e.nuevo)) return "La compra es de CTCx Selection o solo stock.";
  if (e.anulada) return "Esa compra está anulada: no cambia.";
  if (e.nuevo === e.actual) return null;
  if (e.nuevo === "stock" && e.enMezclaViva) return "Esa compra está en una mezcla de CTCx Selection: no pasa a «solo stock» mientras la mezcla esté viva.";
  if (e.nuevo === "selection" && e.deDespacho) return "Esa compra es un saco o un adelanto de un trato por ventana: el lote se vende a nombre del productor y no pasa a CTCx Selection.";
  if (e.declaracionViva) return `El lote tiene café declarado en el Catálogo Activo (${e.declaracionViva}): cambiar «Es de» cambiaría la vitrina. Retire primero la declaración en el Triage.`;
  return null;
}

/** B9: por qué NO se anula una compra (null = se puede). La base (`compra_anular` · `guard_compra`) repite las reglas. */
export function motivoParaNoAnular(e: { anulada: boolean; origen: string; enMezclaViva: boolean; raizCodigo: string | null; raizConMovimientos: boolean }): string | null {
  if (e.anulada) return "Esa compra ya estaba anulada.";
  if (e.origen !== "manual") return "Solo se anula una compra registrada a mano: la de un contrato (el pago de un mes, un saco o un adelanto recibidos) la sostiene su contrato.";
  if (e.enMezclaViva) return "Esa compra está en una mezcla viva: anule la mezcla (o quite el componente) antes de anular la compra.";
  if (e.raizConMovimientos) return `La partida${e.raizCodigo ? ` ${e.raizCodigo}` : ""} ya se movió (se trilló, salió, está en un kit o declarada en el Triage): deshaga eso antes de anular la compra.`;
  return null;
}

/** El origen de una compra en palabras del operador (la tabla lo enseña en vez de «contrato» / «manual»). V5.203 · corrección: con el
 *  diccionario único (H11) y sin «Selection · mes N» —un mes que pasó a «solo stock» lo contradecía (H9)—. */
export function origenLegible(c: { origen: string; mes: number | null; precioFuente: string | null; despachoTipo?: string | null }): string {
  if (c.origen === "manual") return ORIGEN_LABEL.manual;
  const f = (c.precioFuente ?? "").toLowerCase();
  if (c.despachoTipo === "adelanto" || (f.startsWith("trato por ventana") && f.includes("adelanto"))) return ORIGEN_LABEL.adelanto;
  if (c.despachoTipo || f.startsWith("trato por ventana")) return ORIGEN_LABEL.saco;
  if (c.mes != null) return ORIGEN_LABEL.mes(c.mes);
  return ORIGEN_LABEL.contrato;
}

// La compra a mano guardaba «PVC PVC-F4-2026 (referencia)» (el código ya empieza por «PVC-»): se lee como referencia, sin repetir.
const REFERENCIA = /^(?:PVC\s+)?(PVC-\S+)\s+\(referencia\)$|^referencia\s+(PVC-\S+)$/i;

/** B6: el precio de una compra — su edición del PVC (sin «PVC PVC-») y de dónde salió (saco, adelanto, oferta), sin ocultar nada. */
export function precioLegible(c: { pvcCode: string | null; precioFuente: string | null; modificadorPct?: number | null }): string {
  const fuente = (c.precioFuente ?? "").trim();
  const ref = fuente.match(REFERENCIA);
  const pvc = c.pvcCode ?? (ref ? ref[1] ?? ref[2] : null);
  const mod = c.modificadorPct != null && Number(c.modificadorPct) !== 0 ? ` ${Number(c.modificadorPct) > 0 ? "+" : ""}${Number(c.modificadorPct)} %` : "";
  const partes: string[] = [];
  if (pvc) partes.push(ref || !fuente || fuente === "manual" ? `referencia ${pvc}${mod}` : `${pvc}${mod}`);
  if (fuente && !ref && fuente !== "manual" && fuente !== pvc) partes.push(fuente);
  return partes.join(" · ") || "—";
}

/** Lo que guarda una compra a mano como fuente de su precio (B6: sin «PVC » delante de un código que ya lo lleva). */
export const fuenteDePrecioManual = (pvcCode: string | null | undefined) => (pvcCode ? `referencia ${pvcCode}` : "manual");

export type PasoDeCompra = {
  tipo: "anulada" | "entrar" | "mezcla" | "catalogo" | "declarar" | "stock" | "agotado";
  texto: string;
  href?: string;
};

/** El SIGUIENTE PASO de una compra en el circuito: entrar al stock → (mezcla) → declarar en el Triage → en el Catálogo Activo. */
export function siguientesPasos(e: {
  anulada: boolean;
  raiz: { id: string; codigo: string } | null;
  /** V5.203 · corrección (H10): lo libre de toda la familia de la raíz, en kg de CPS EQUIVALENTES (`equivalenteEnRaiz`): la página
   *  habla en kg de CPS y antes sumaba pergamino, verde y tostado tal cual. */
  disponibleKg: number;
  /** La partida de la familia con más kg declarables (pergamino o verde, con lote, sin comprometer, no Tyrian), si hay. */
  declarable: { partidaId: string; kg: number } | null;
  declaraciones: { codigo: string; partidaId: string; kgVerde: number }[];
  mezclas: { id: string; codigo: string; kg: number }[];
}): PasoDeCompra[] {
  if (e.anulada) return [{ tipo: "anulada", texto: "Anulada" }];
  if (!e.raiz) return [{ tipo: "entrar", texto: "Entrar al stock" }];
  const pasos: PasoDeCompra[] = [];
  for (const m of e.mezclas) pasos.push({ tipo: "mezcla", texto: `En mezcla ${m.codigo} (${m.kg} kg)`, href: `/ocp/compras/mezclas/${m.id}` });
  // H15: «En catálogo CF-…» es una CONSULTA (desplaza y resalta); «Declarar en el Triage →» abre además el formulario.
  for (const d of e.declaraciones) pasos.push({ tipo: "catalogo", texto: `En catálogo ${d.codigo} · ${d.kgVerde} kg verde`, href: rutaDelTriage({ partida: d.partidaId }) });
  if (e.declarable && e.declarable.kg > 0) pasos.push({ tipo: "declarar", texto: "Declarar en el Triage →", href: rutaDelTriage({ partida: e.declarable.partidaId, declarar: true }) });
  if (!pasos.length) {
    pasos.push(
      e.disponibleKg > 0
        ? { tipo: "stock", texto: `En el Stock (≈ ${e.disponibleKg} kg CPS)`, href: `${STOCK_PATH}?partida=${e.raiz.id}` }
        : { tipo: "agotado", texto: "Sin disponible", href: `${STOCK_PATH}?partida=${e.raiz.id}` }
    );
  }
  return pasos;
}

// ── H1/H2 · lo que le falta a un recibo o a un mes pagado (V5.203 · corrección, nodo final 2026-10-10) ──────────────────────────
// El aviso de B8 vivía en el formulario que lo disparó y se iba con el refresco (el despacho ya estaba «recibido», el mes ya pagado: el
// formulario desaparece). Ahora la ficha del contrato lo DERIVA de los datos —un recibo sin su compra o sin su partida, un mes pagado de
// una compra en firme sin su compra o sin su partida— y ofrece «Reintentar», que crea lo que falte sin duplicar (la compra es única por
// despacho y por mes; la partida, por compra y por despacho).

export type FaltaDeCompra = {
  clave: string;
  tipo: "despacho" | "mes";
  despachoId: string | null;
  mes: number | null;
  faltaCompra: boolean;
  faltaPartida: boolean;
  texto: string;
  boton: string;
};

export const BOTON_REINTENTAR_COMPRA = "Reintentar la compra";
export const BOTON_REINTENTAR_PARTIDA = "Reintentar la entrada al Stock CTCx";
const NO_A_MANO = "No lo registre a mano (duplicaría el café): el botón crea lo que falta, una sola vez.";

/** Un despacho RECIBIDO (no devuelto) lleva su partida en el Stock CTCx y, si es saco o adelanto de un grado que se compra, su compra. */
export function faltaDelDespacho(
  d: { id: string; tipo: string; estado: string; resultado: string | null },
  e: { gradoComprable: boolean; partida: { codigo: string } | null; compra: boolean }
): FaltaDeCompra | null {
  if (d.estado !== "recibido" || d.resultado === "devolucion") return null;
  const llevaCompra = d.tipo !== "vendido" && e.gradoComprable;
  const faltaCompra = llevaCompra && !e.compra;
  const faltaPartida = !e.partida;
  if (!faltaCompra && !faltaPartida) return null;
  const que = d.tipo === "adelanto" ? "El adelanto" : d.tipo === "vendido" ? "Lo vendido" : "El saco";
  const texto = faltaCompra && faltaPartida
    ? `${que} quedó recibido, pero ni su compra de CTCx ni su partida en el Stock CTCx se registraron.`
    : faltaCompra
      ? `${que} quedó recibido y está en el Stock CTCx (${e.partida?.codigo ?? "su partida"}), pero su compra de CTCx no se registró.`
      : `${que} quedó recibido${llevaCompra ? " y su compra está registrada" : ""}, pero no entró al Stock CTCx.`;
  return { clave: `d:${d.id}`, tipo: "despacho", despachoId: d.id, mes: null, faltaCompra, faltaPartida, texto: `${texto} ${NO_A_MANO}`, boton: faltaCompra ? BOTON_REINTENTAR_COMPRA : BOTON_REINTENTAR_PARTIDA };
}

/** Un mes PAGADO de un contrato de compra en firme (directa · Black) lleva su compra y, de ella, su partida en el Stock CTCx. */
export function faltaDelMes(
  m: { mes: number; pagadoAt: string | null; enviadoKg: number | null },
  e: { enFirme: boolean; gradoComprable: boolean; compra: boolean; partida: { codigo: string } | null }
): FaltaDeCompra | null {
  if (!e.enFirme || !e.gradoComprable || !m.pagadoAt || !(Number(m.enviadoKg) > 0)) return null;
  const faltaCompra = !e.compra;
  const faltaPartida = !e.partida;
  if (!faltaCompra && !faltaPartida) return null;
  const texto = faltaCompra
    ? `El mes ${m.mes} quedó pagado, pero su compra de CTCx no se registró (ni, por tanto, su entrada al Stock CTCx).`
    : `La compra del mes ${m.mes} quedó registrada, pero no entró al Stock CTCx.`;
  return { clave: `m:${m.mes}`, tipo: "mes", despachoId: null, mes: m.mes, faltaCompra, faltaPartida, texto: `${texto} ${NO_A_MANO}`, boton: faltaCompra ? BOTON_REINTENTAR_COMPRA : BOTON_REINTENTAR_PARTIDA };
}
