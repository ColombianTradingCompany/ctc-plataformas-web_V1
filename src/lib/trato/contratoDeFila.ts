// ── Los datos del contrato, leídos de su fila (V5.190) ───────────────────────────────────────────────────────────────────
// La página del contrato (`/kaffetal-regal/contrato/[id]`) recalcula la huella del texto con lo que quedó guardado; la RATIFICACIÓN de
// un contrato aceptado provisionalmente (V5.190) arma el texto nuevo con lo mismo. Un solo armador para los dos, con las mismas
// columnas: si una cambia, cambian las dos. PURO.

import type { DatosDelContrato } from "./contrato";
import type { RangosDeCalidad } from "./despachos";
import { fleteDeLaFila } from "./flete";
import { LUGAR_DE_ENTREGA_POR_DEFECTO } from "./terminos";
import { diaEnColombia } from "./fechas";

export const COLUMNAS_DEL_CONTRATO =
  "id, lot_id, status, grade_snapshot, price_per_kg_locked, quantity_frozen_kg, terms_version, lugar_entrega, signed_at, producer_signed_at, producer_signer_name, producer_signer_doc_tipo, producer_signer_doc_numero, producer_signature_path, contract_text_version, contract_text_sha256, offer_id, vigencia_desde, vigencia_hasta, retiro_libre_pct, ventana_tipo, ventana_ciclos, precio_regla, sin_retiro, saco_kg, minimo_kg, renovacion_de, calidad_snapshot, flete_region, flete_carga, provisional_at, provisional_responsable, provisional_sha256, ratificado_at, lots(name, producer_id), lot_offers!purchase_contracts_offer_id_fkey(season_label, kind)";

export type FilaDelContrato = {
  id: string;
  lot_id: string;
  offer_id: string | null;
  status: string;
  grade_snapshot: string | null;
  price_per_kg_locked: number | string | null;
  quantity_frozen_kg: number | string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  retiro_libre_pct: number | string | null;
  ventana_tipo: "ciclo" | "extendida" | null;
  ventana_ciclos: string[] | null;
  precio_regla: "vigente" | "promedio" | "siguiente" | null;
  sin_retiro: boolean | null;
  saco_kg: number | string | null;
  minimo_kg: number | string | null;
  renovacion_de: string | null;
  calidad_snapshot: RangosDeCalidad | null;
  flete_region: string | null;
  flete_carga: number | string | null;
  terms_version: string | null;
  lugar_entrega: string | null;
  signed_at: string | null;
  producer_signed_at: string | null;
  producer_signer_name: string | null;
  producer_signer_doc_tipo: string | null;
  producer_signer_doc_numero: string | null;
  producer_signature_path: string | null;
  contract_text_version: string | null;
  contract_text_sha256: string | null;
  provisional_at: string | null;
  provisional_responsable: string | null;
  provisional_sha256: string | null;
  ratificado_at: string | null;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
  lot_offers: { season_label: string | null; kind: string } | { season_label: string | null; kind: string }[] | null;
};

const n = (v: number | string | null) => (v != null ? Number(v) : null);

/** Los datos del texto, como quedaron guardados. `firmante` = el nombre y el documento de quien firmó (null mientras un contrato
 *  provisional no se ratifica); `cuenta` = el código del productor (CTC-P-…), que nombra al Productor en el texto provisional;
 *  `ratificadoEl` permite armar el texto de una ratificación que todavía no se guardó (la acción de ratificar). */
export function datosDeLaFila(
  c: FilaDelContrato,
  o: { loteNombre: string; loteReferencia: string; cuenta: string; firmante: { nombre: string; documento: string | null } | null; ratificadoEl?: string | null; declaradoKg?: number; sinRetiro?: boolean; retiroLibrePct?: number },
): DatosDelContrato {
  const oferta = (Array.isArray(c.lot_offers) ? c.lot_offers[0] : c.lot_offers) ?? null;
  const ventana =
    oferta?.kind !== "directa" && c.ventana_tipo && c.vigencia_desde && c.vigencia_hasta && c.precio_regla
      ? { tipo: c.ventana_tipo, desde: c.vigencia_desde, hasta: c.vigencia_hasta, ciclos: c.ventana_ciclos ?? [], retiroLibrePct: o.retiroLibrePct ?? n(c.retiro_libre_pct) ?? 0, precio: c.precio_regla }
      : null;
  const ratificado = o.ratificadoEl ?? (c.ratificado_at ? diaEnColombia(c.ratificado_at) : null);
  return {
    tipo: oferta?.kind === "directa" ? "selection" : "cherry_picked",
    ventana,
    sinRetiro: o.sinRetiro ?? Boolean(c.sin_retiro),
    sacoKg: n(c.saco_kg),
    esRenovacion: Boolean(c.renovacion_de),
    minimoKg: n(c.minimo_kg),
    calidad: c.calidad_snapshot ?? null,
    flete: fleteDeLaFila(c),
    productorNombre: o.firmante?.nombre ?? "—",
    productorDocumento: o.firmante?.documento ?? null,
    loteNombre: o.loteNombre,
    loteReferencia: o.loteReferencia,
    grado: c.grade_snapshot ?? "—",
    copKg: Number(c.price_per_kg_locked ?? 0),
    declaradoKg: o.declaradoKg ?? Number(c.quantity_frozen_kg ?? 0),
    lugarEntrega: c.lugar_entrega ?? LUGAR_DE_ENTREGA_POR_DEFECTO,
    termsVersion: c.terms_version,
    temporada: oferta?.season_label ?? null,
    provisional:
      c.provisional_at && c.provisional_responsable
        ? { responsable: c.provisional_responsable, fecha: diaEnColombia(c.provisional_at), cuenta: o.cuenta, ratificado }
        : null,
  };
}
