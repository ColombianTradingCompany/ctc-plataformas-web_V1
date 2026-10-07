import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarioDeLaEdicion, edicionProxima, edicionVigente, pvcParaGrado } from "@/lib/pvc/servicio";
import { precioDeVentana, ventanaDeFirma, ventanaDeRenovacion, type Ventana } from "@/lib/trato/ventanas";
import { diasEntre } from "@/lib/trato/calendario";
import { disponibleDelLote } from "@/lib/trato/minimos";
import type { RangosDeCalidad } from "@/lib/trato/despachos";
import type { GradoId } from "@/lib/grados/definicion";
import { fleteDeLaFila, fletePorKg, type FleteDelTrato } from "@/lib/trato/flete";

// ── Lo que firma el productor si acepta HOY (V5.175 · docs/PLAN_CICLOS.md §2–§4) ───────────────────────────────────────────────
// Una sola cuenta para la vista previa (la calculadora) y para la aceptación (el servidor): la ventana que decide la fecha, el
// precio de su regla (vigente · promedio con el PVC siguiente · siguiente), el mínimo congelado en la oferta, lo que le queda al
// lote (existencia de A2 − vendido − retirado − sacos despachados), el saco, la calidad y (V5.177) el Flete a CTCx de la oferta.

export type OfertaParaVentana = {
  id: string;
  lot_id: string;
  grade_snapshot: string | null;
  price_per_kg: number | string;
  modificador_pct: number | string | null;
  min_kg: number | string | null;
  saco_kg: number | string | null;
  es_renovacion: boolean | null;
  flete_region?: string | null;
  flete_carga?: number | string | null;
  kind?: string | null;
  pvc_edition_id?: string | null;
  reference_price_source?: string | null;
};

export type CondicionesDeFirma =
  | {
      abierta: true;
      ventana: Extract<Ventana, { abierta: true }>;
      semanas: number;
      precioKg: number;
      minimoKg: number;
      existenciaKg: number | null;
      disponibleKg: number | null;
      sacoKg: number;
      esRenovacion: boolean;
      calidad: RangosDeCalidad | null;
      /** V5.177: el Flete a CTCx congelado en la oferta (ya está en el precio). */
      flete: FleteDelTrato | null;
      edicionId: string;
      edicionCodigo: string;
    }
  | { abierta: false; motivo: string; reabre: string | null };

/** Lo que el lote todavía tiene: existencia (A2) − vendido − retirado − sacos/adelantos que no se cancelaron. */
export async function disponibleDe(service: SupabaseClient, lotId: string): Promise<{ existenciaKg: number | null; disponibleKg: number | null }> {
  const { data: lot } = await service.from("lots").select("existencia_cps_kg").eq("id", lotId).maybeSingle();
  const existenciaKg = lot?.existencia_cps_kg != null ? Number(lot.existencia_cps_kg) : null;
  if (existenciaKg == null) return { existenciaKg: null, disponibleKg: null };
  const { data: contratos } = await service.from("purchase_contracts").select("id").eq("lot_id", lotId);
  const ids = ((contratos ?? []) as { id: string }[]).map((c) => c.id);
  if (!ids.length) return { existenciaKg, disponibleKg: existenciaKg };
  const [{ data: ventas }, { data: retiros }, { data: despachos }] = await Promise.all([
    service.from("contract_ventas").select("kg").in("contract_id", ids).is("anulada_at", null),
    service.from("contract_retiros").select("kg").in("contract_id", ids),
    service.from("contract_despachos").select("kg, tipo, estado").in("contract_id", ids).in("tipo", ["saco", "adelanto"]).neq("estado", "cancelado"),
  ]);
  const suma = (xs: { kg: number | string }[] | null) => (xs ?? []).reduce((a, x) => a + (Number(x.kg) || 0), 0);
  return { existenciaKg, disponibleKg: disponibleDelLote(existenciaKg, suma(ventas), suma(retiros) + suma(despachos)) };
}

/** Las condiciones con que el productor firmaría hoy una oferta de Cherry Picked. */
export async function condicionesDeFirma(service: SupabaseClient, offer: OfertaParaVentana, hoy: string): Promise<CondicionesDeFirma> {
  const [vigente, proxima] = await Promise.all([edicionVigente(hoy), edicionProxima()]);
  if (!vigente) return { abierta: false, motivo: "Hoy no hay una edición vigente del PVC.", reabre: null };
  const calVig = calendarioDeLaEdicion(vigente);
  if (!calVig) return { abierta: false, motivo: "La edición vigente del PVC no tiene sus ciclos definidos (Modelo Económico).", reabre: null };
  const calSig = proxima ? calendarioDeLaEdicion(proxima) : null;
  const siguiente = proxima && calSig ? { codigo: proxima.code, cal: calSig } : null;
  const esRenovacion = Boolean(offer.es_renovacion);
  const ventana = (esRenovacion ? ventanaDeRenovacion : ventanaDeFirma)({ firma: hoy, vigente: { codigo: vigente.code, cal: calVig }, siguiente });
  if (!ventana.abierta) return ventana;
  // El precio de la oferta se congeló al emitir (PVC vigente con su % + el flete); el siguiente, de la edición publicada con el
  // mismo % y el MISMO flete congelado (V5.177: el flete no cambia dentro de un trato).
  let vigenteKg = Number(offer.price_per_kg);
  const flete = fleteDeLaFila(offer);
  // V5.178 (docs/PLAN_CICLOS.md §6): una corrección aprobada aplica a lo que se firme DESPUÉS. Una invitación de Cherry Picked
  // anclada a una edición que luego se corrigió (mismo código, otra fila) firma con el PVC corregido: mismo %, mismo flete.
  if (offer.kind === "temporada" && offer.grade_snapshot && offer.pvc_edition_id && offer.pvc_edition_id !== vigente.id && offer.reference_price_source === `PVC ${vigente.code}`) {
    const corregido = await pvcParaGrado(offer.grade_snapshot as GradoId, hoy, { modificadorPct: Number(offer.modificador_pct ?? 0) });
    if (corregido) vigenteKg = Math.round(corregido.precio.copKgFinal + (flete ? fletePorKg(flete.carga) : 0));
  }
  let siguienteKg: number | null = null;
  if (ventana.precio !== "vigente" && proxima?.validFrom && offer.grade_snapshot) {
    const sig = await pvcParaGrado(offer.grade_snapshot as GradoId, proxima.validFrom, { modificadorPct: Number(offer.modificador_pct ?? 0) });
    siguienteKg = sig ? Math.round(sig.precio.copKgFinal + (flete ? fletePorKg(flete.carga) : 0)) : null;
  }
  const precioKg = precioDeVentana(ventana.precio, vigenteKg, siguienteKg);
  if (precioKg == null) return { abierta: false, motivo: "El PVC de la temporada siguiente todavía no tiene precio para este grado.", reabre: null };
  const { existenciaKg, disponibleKg } = await disponibleDe(service, offer.lot_id);
  return {
    abierta: true,
    ventana,
    semanas: Math.max(1, Math.round((diasEntre(ventana.desde, ventana.hasta) + 1) / 7)),
    precioKg,
    minimoKg: Number(offer.min_kg ?? 0),
    existenciaKg,
    disponibleKg,
    sacoKg: Number(offer.saco_kg ?? 0),
    esRenovacion,
    calidad: vigente.rangosCalidad,
    flete,
    edicionId: vigente.id,
    edicionCodigo: vigente.code,
  };
}
