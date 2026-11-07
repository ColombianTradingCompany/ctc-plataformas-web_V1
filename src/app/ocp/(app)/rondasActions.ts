"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { rondaPorSlug } from "@/lib/os/rondas/definiciones";
import { validarEntrada, type EntradaDeRonda } from "@/lib/os/rondas/nucleo";
import { registrarExistenciaOcp } from "./actions";

// ── OCP · Kaffetal Regal · el escritor de las Rondas (2026-11-07, módulo «Rondas» de la CTCx OS) ─────────────────────────────
// «Registrar respuesta» de una ronda (`/os/m/rondas/<slug>`) llega AQUÍ, con la compuerta del OCP: los productores, sus lotes y
// sus fincas son del OCP (Kaffetal Regal), y la OS no escribe por su cuenta (charter `ctcx-os`, regla propia 1). Clase `emite`:
// la existencia que escribe la ve el productor (su feed). Hace tres cosas, en este orden, y nunca lanza:
//   1. valida la entrada contra la DEFINICIÓN de la ronda (`validarEntrada`, el mismo núcleo puro que usa el formulario) y contra
//      los lotes del productor leídos de la base;
//   2. lo que tiene escritor dueño va por ÉL, con su propia compuerta: hoy los kilos disponibles → `registrarExistenciaOcp`
//      (lots.existencia_cps_kg + Ficha A2 + historial + auditoría + nota al productor). Lo demás (la fecha de envío de la muestra,
//      el precio que pide, los términos, la venta anticipada, el mapa, el WhatsApp) queda DICHO en la bitácora: un precio o unos
//      kilos dichos por teléfono nunca cambian un contrato (guardarraíl 8 del charter `ctcx-os`); lo aplica su dueño en su pantalla;
//   3. deja la fila de la bitácora `ronda_contactos` (quién, cuándo, cómo fue, la nota, lo dicho y lo aplicado) y su fila en
//      `audit_log` (`producer` · `ronda_contacto_registrado`, en `hechosCatalogo.ts`).
// No envía NADA a nadie (ni WhatsApp, ni correo, ni evento a Make): el mensaje lo envía la persona desde su teléfono.

export type ResultadoDeRegistro =
  | { ok: true; aplicadas: Record<string, string> }
  | { ok: false; error: string };

const ACCIONES = { registrarExistenciaOcp } as const;

export async function registrarRespuestaDeRonda(entrada: EntradaDeRonda): Promise<ResultadoDeRegistro> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const def = rondaPorSlug(String(entrada?.ronda ?? ""));
  if (!def) return { ok: false, error: "Esa ronda no existe." };
  if (typeof entrada.productorId !== "string" || !entrada.productorId) return { ok: false, error: "Falta el productor." };

  const service = createServiceRoleClient();
  // La bitácora tiene que existir ANTES de escribir nada (su migración se aplica en la sesión del owner).
  const sonda = await service.from("ronda_contactos").select("id", { count: "exact", head: true }).eq("ronda", def.slug);
  if (sonda.error) {
    return { ok: false, error: "La bitácora de las rondas todavía no existe en la base (falta aplicar docs/migraciones/2026-11-07_ronda_contactos.sql). No se guardó nada." };
  }
  const { data: lotes, error: errLotes } = await service.from("lots").select("id").eq("producer_id", entrada.productorId);
  if (errLotes) return { ok: false, error: "No se pudieron leer los lotes del productor. No se guardó nada." };
  const v = validarEntrada(def, entrada, ((lotes as { id: string }[] | null) ?? []).map((l) => l.id));
  if (!v.ok) return v;

  // 2 · lo que tiene escritor dueño, por su acción (cada una con su compuerta y su auditoría).
  const aplicadas: Record<string, string> = {};
  for (const e of v.valor.porAccion) {
    const r = await ACCIONES[e.accion](e.loteId, e.valor);
    aplicadas[`${e.loteId}.${e.campo}`] = r.ok ? "ok" : r.error.slice(0, 300);
  }

  // 3 · la bitácora y su rastro.
  const { error } = await service.from("ronda_contactos").insert({
    ronda: def.slug,
    producer_id: v.valor.productorId,
    resultado: v.valor.resultado,
    volver_el: v.valor.volverEl,
    nota: v.valor.nota,
    respuestas: v.valor.respuestas,
    aplicadas,
    registrado_por: permiso.userId,
  });
  if (error) {
    const hechas = Object.entries(aplicadas).filter(([, r]) => r === "ok").length;
    return {
      ok: false,
      error: `No se pudo guardar el contacto en la bitácora: ${error.message}.${hechas ? ` Ojo: ${hechas} dato(s) ya se escribieron en su registro (la existencia del lote).` : ""}`,
    };
  }
  await service.from("audit_log").insert({
    entity_type: "producer",
    entity_id: v.valor.productorId,
    action: "ronda_contacto_registrado",
    new_status: v.valor.resultado,
    performed_by: permiso.userId,
    notes: `Ronda «${def.titulo}»: ${v.valor.resultado}.`,
  });

  revalidatePath("/os/m/rondas", "layout");
  revalidatePath("/ocp/kr");
  return { ok: true, aplicadas };
}
