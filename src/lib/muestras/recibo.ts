import type { SupabaseClient } from "@supabase/supabase-js";
import { particionDeMuestra, TIPO_LABEL } from "./particion";
import { avanzarAFilaSiCompleta } from "@/lib/arena/inscriptions";
import { MUESTRA_EVALUACION_KG } from "@/lib/trato/terminos";

// ── El recibo de la muestra · UNA acción para las dos cosas (Gestión de Muestras, 1.ª tanda · V5.80) ──
// Hasta la V5.79 «recibir la muestra» era una marca de tiempo (`lots.sample_2kg_confirmed_at`) y nada más: ni cuánto
// llegó, ni dónde quedó. El brief lo fija: la marca SE QUEDA (es la señal que lee `estadoDelCircuito`) y el recibo pasa
// a hacer las dos cosas en la misma acción —las filas de `muestras` con la partición del folio 7 Y la marca—, para que
// no puedan discrepar: si la marca falla, las filas se deshacen; si las filas fallan, la marca no se pone.
//
// Sin compuerta a propósito: la compuerta la pone quien llama (`recibirMuestraAction` en Solicitudes de Evaluación y
// `confirmSampleReceived` en la vista del lote, las dos `permisoDeEscritura("ocp", "emite")`), y este módulo recibe
// el `adminId` ya verificado. Así `qa-rutas-consolas` (f-bis) no tiene que conocerlo.

export type ReciboDeMuestra = {
  lotId: string;
  /** Lo que de verdad llegó. Sin dato, los 2 kg del folio. */
  kgRecibidos?: number | null;
  ubicacion?: string | null;
  custodio?: string | null;
  notas?: string | null;
  adminId: string;
};

export type ResultadoDelRecibo = { ok: true; partes: { tipo: string; kg: number }[] } | { ok: false; error: string };

export async function recibirMuestra(service: SupabaseClient, r: ReciboDeMuestra): Promise<ResultadoDelRecibo> {
  const kg = r.kgRecibidos == null || r.kgRecibidos === undefined ? MUESTRA_EVALUACION_KG : Number(r.kgRecibidos);
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos que llegaron (más de 0)." };

  const [{ data: lot }, { data: ins }] = await Promise.all([
    service.from("lots").select("id, name, stage, producer_id, source, sample_shipped_at, sample_2kg_confirmed_at").eq("id", r.lotId).maybeSingle(),
    service.from("arena_inscriptions").select("id, phase").eq("lot_id", r.lotId).maybeSingle(),
  ]);
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.sample_2kg_confirmed_at) return { ok: false, error: "La muestra de este lote ya estaba recibida." };
  const registradoPorCtc = lot.source === "bcp_manual_entry";
  if (!ins && !registradoPorCtc) return { ok: false, error: "Este lote no tiene solicitud de evaluación — la muestra se recibe dentro de la solicitud." };
  if (ins && ins.phase !== "postulacion") return { ok: false, error: "La muestra de esta solicitud ya fue procesada." };
  if (!lot.sample_shipped_at && !registradoPorCtc) return { ok: false, error: "El productor todavía no ha confirmado el envío de la muestra." };

  const partes = particionDeMuestra(kg);
  if (!partes.length) return { ok: false, error: "Con esos kilos no hay muestra que partir." };
  const now = new Date().toISOString();

  // (1) Las filas de la muestra, con la partición del folio 7.
  const { data: filas, error: e1 } = await service
    .from("muestras")
    .insert(
      partes.map((p) => ({
        lot_id: r.lotId,
        tipo: p.tipo,
        kg: p.kg,
        recibida_at: now,
        ubicacion: r.ubicacion?.trim() || null,
        custodio: r.custodio?.trim() || null,
        notas: r.notas?.trim() || null,
        recibida_por: r.adminId,
      }))
    )
    .select("id");
  if (e1 || !filas) return { ok: false, error: "No se pudo registrar la muestra: " + (e1?.message ?? "sin filas") };

  // (2) La marca que lee el circuito. Si falla, las filas se deshacen: o las dos cosas o ninguna.
  const { error: e2 } = await service.from("lots").update({ sample_2kg_confirmed_at: now }).eq("id", r.lotId);
  if (e2) {
    await service.from("muestras").delete().in("id", filas.map((f) => f.id));
    return { ok: false, error: "No se pudo confirmar el recibo: " + e2.message };
  }

  const detalle = partes.map((p) => `${TIPO_LABEL[p.tipo]} ${p.kg} kg`).join(" · ");
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: r.lotId,
    action: "sample_received",
    previous_status: lot.stage,
    new_status: lot.stage,
    performed_by: r.adminId,
    notes: `Muestra recibida: ${kg} kg → ${detalle}${r.ubicacion?.trim() ? ` · en ${r.ubicacion.trim()}` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: r.lotId,
    note: `Recibimos la muestra de su lote ${lot.name} (${kg} kg). Con el pago confirmado, el lote pasa a «Lotes a Evaluar» y CTC lo sube a un Bache de Evaluación.`,
    created_by: r.adminId,
  });

  await avanzarAFilaSiCompleta(service, r.lotId);
  return { ok: true, partes };
}
