"use server";

// ── ECP · Modelo de Producción · Empacado hasta FOB · Server Actions (V5.194) ────────────────────────────────────────────────
// Guardar una referencia RECALCULA en el servidor con el cálculo puro (`empaqueFob.ts`): del navegador solo se aceptan los
// parámetros, nunca las cifras. Las dos acciones emiten: una referencia ancla el precio FOB mínimo de los lotes en el Triage de
// Catálogo Activo (la lee otra consola), así que no es un borrador. `docs/PLAN_TRIAGE_CATALOGO.md` §2.2.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite, quoteServiceClient } from "@/lib/panel/requireConsoleWrite";
import type { PanelConsoleKey } from "@/lib/panel/consoles";
import { calcularEmpaqueFob, destinoDe, erroresDeParametros, normalizaParametros, resumenParaGuardar } from "./empaqueFob";
import { EMPACADO_PATH } from "./referencias";

/** La consola donde vive este módulo. UNA vez; `qa-rutas-consolas` (f-bis) la contrasta con el rail. */
const CONSOLA: PanelConsoleKey = "ecp";

const NO_AUTH = { ok: false as const, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel en el ECP no permite emitir." };

/** Guarda el cálculo como una referencia con nombre (congelada). */
export async function guardarReferenciaEmpaque(nombre: string, parametros: unknown): Promise<{ ok: true; codigo: string } | { ok: false; error: string }> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const n = String(nombre ?? "").trim().slice(0, 120);
  if (n.length < 3) return { ok: false, error: "Póngale un nombre a la referencia (al menos 3 letras)." };
  const p = normalizaParametros(parametros);
  const errores = erroresDeParametros(p);
  if (errores.length) return { ok: false, error: errores[0] };
  // Una referencia ancla precios: sin el flete al puerto, el costo hasta FOB quedaría corto.
  if (!(p.costoViaje > 0)) return { ok: false, error: `Falta la tarifa del flete a ${destinoDe(p.destino)?.nombre ?? "el puerto"}: escriba la cotización del transportador antes de guardar.` };
  const r = calcularEmpaqueFob(p);

  const service = quoteServiceClient();
  const { data, error } = await service
    .from("empaque_fob_referencias")
    .insert({
      nombre: n,
      modo: p.modo,
      destino: p.destino,
      kg_embarque: p.kgEmbarque,
      trm: p.trm,
      parametros: p,
      resultado: resumenParaGuardar(r),
      cop_kg: Math.round(r.copKg * 100) / 100,
      usd_kg: Math.round(r.usdKg * 10000) / 10000,
      created_by: who.userId,
    })
    .select("id, codigo")
    .single();
  if (error || !data) {
    console.error("guardarReferenciaEmpaque: el insert falló", error);
    return { ok: false, error: `No se pudo guardar la referencia${error ? ` (código ${error.code})` : ""}.` };
  }
  const fila = data as { id: string; codigo: string };
  await service.from("audit_log").insert({
    entity_type: "empaque_fob_referencia",
    entity_id: fila.id,
    action: "referencia_guardada",
    performed_by: who.userId,
    notes: `${fila.codigo} · ${n} · ${p.kgEmbarque} kg · US$ ${(Math.round(r.usdKg * 100) / 100).toFixed(2)}/kg`,
  });
  revalidatePath(EMPACADO_PATH);
  return { ok: true, codigo: fila.codigo };
}

/** Retira una referencia: deja de ofrecerse en el Triage. Los lotes ya anclados en ella conservan su cifra. */
export async function retirarReferenciaEmpaque(id: string, motivo: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, error: "Escriba por qué se retira la referencia." };
  const service = quoteServiceClient();
  const { data, error } = await service
    .from("empaque_fob_referencias")
    .update({ estado: "retirada", retirada_at: new Date().toISOString(), retirada_por: who.userId, retirada_motivo: m })
    .eq("id", id)
    .eq("estado", "vigente")
    .select("codigo");
  if (error || !data?.length) return { ok: false, error: "No se pudo retirar (¿ya estaba retirada?)." };
  await service.from("audit_log").insert({ entity_type: "empaque_fob_referencia", entity_id: id, action: "referencia_retirada", performed_by: who.userId, notes: `${(data[0] as { codigo: string }).codigo} · ${m}` });
  revalidatePath(EMPACADO_PATH);
  return { ok: true };
}
