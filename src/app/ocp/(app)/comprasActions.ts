"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { edicionVigente } from "@/lib/pvc/servicio";
import { BUCKET_CTCX, CLAVE_PERFIL_CTCX } from "@/lib/compras/reglas";
import { formatCop } from "@/lib/arena/inscriptions";
import { esGradoDeMezcla, resumenDeMezcla, validarCierre, validarComponente, type GradoDeMezcla } from "@/lib/compras/mezclas";
import { cargarMezcla } from "@/lib/compras/mezclasServidor";

// ── CTCx Selection · Compras (fase 8 del PLAN_CIRCUITO_DEL_LOTE, V5.85) ──────────────────────
// Folio 8, paso 19, y la decisión 7 del owner. Una compra en firme nace normalmente del PAGO de un mes de un contrato
// `directa`/`black` (`registrarPagoDelMes`, en contractActions.ts); aquí viven la compra registrada A MANO (la casa siempre
// puede documentar lo que compró fuera de la plataforma: la ruta Desacoplada, un acuerdo por WhatsApp), el PERFIL ÚNICO de
// CTCx Selection (respuesta 7 del 23-sep: uno para toda la casa) y la IMAGEN por lote o del perfil (bucket público
// `ctcx-selection`, subida firmada desde el navegador: una acción no carga archivos — Next capa el cuerpo en 1 MB).
// Todas son `emite`: lo que escriben lo lee el comprador en la vitrina.

const revalida = () => {
  for (const r of ["/ocp/compras", "/ocp/ctc-selection", "/ocp/catalogo"]) revalidatePath(r);
};
const kgDe = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", ".").trim());
const copDe = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/\./g, "").replace(",", ".").trim());
const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

/** Una compra en firme registrada a mano (origen 'manual'): lote galardonado, kilos, precio, fechas y la nota obligatoria. */
export async function registrarCompraManual(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const lotId = texto(formData.get("lot_id"));
  const kg = kgDe(formData.get("kg"));
  const copKg = copDe(formData.get("cop_kg"));
  const pagadaAt = texto(formData.get("pagada_at"));
  const recibidaAt = texto(formData.get("recibida_at"));
  const pagoRef = texto(formData.get("pago_ref"));
  const nota = texto(formData.get("nota"));
  if (!lotId) return { ok: false, error: "Elija el lote." };
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos de CPS comprados." };
  if (!Number.isFinite(copKg) || copKg <= 0) return { ok: false, error: "Escriba el precio pagado por kg (COP)." };
  if (!nota) return { ok: false, error: "Una compra registrada a mano lleva su nota: de dónde sale (acuerdo, mensaje, factura…)." };

  const { data: lot } = await service.from("lots").select("id, name, stage, grade, producer_id").eq("id", lotId).maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "galardonado" || !lot.grade) return { ok: false, error: "Solo se compra en firme un lote galardonado (con grado)." };
  if (lot.grade === "tyrian") return { ok: false, error: "Un Tyrian no se compra en firme: va a subasta." };

  // El precio cita su edición del PVC (brief, punto 4): la vigente el día del pago, como referencia.
  const edicion = await edicionVigente(pagadaAt ?? undefined);
  const { data: fila, error } = await service
    .from("compras")
    .insert({
      lot_id: lotId,
      contract_id: null,
      mes: null,
      grado: lot.grade,
      kg,
      cop_kg: copKg,
      total_cop: Math.round(kg * copKg),
      pvc_edition_id: edicion?.id ?? null,
      modificador_pct: null,
      precio_fuente: edicion ? `PVC ${edicion.code} (referencia)` : "manual",
      acordada_at: pagadaAt,
      recibida_at: recibidaAt,
      pagada_at: pagadaAt,
      pago_ref: pagoRef,
      origen: "manual",
      nota,
      registrada_por: adminId,
    })
    .select("id")
    .single();
  if (error || !fila) return { ok: false, error: "No se pudo registrar la compra: " + (error?.message ?? "sin fila") };

  await service.from("audit_log").insert({ entity_type: "compra", entity_id: fila.id, action: "compra_registrada", performed_by: adminId, notes: `${lot.name} · ${kg} kg · ${formatCop(copKg)}/kg · manual · ${nota.slice(0, 200)}` });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTC registró la compra en firme de ${kg} kg de CPS de su lote a ${formatCop(copKg)}/kg${pagadaAt ? ` (pagada el ${pagadaAt})` : ""}. Ese café pasa a ofrecerse como CTCx Selection.`,
    created_by: adminId,
  });
  revalida();
  return { ok: true };
}

type ValorPerfil = { nombre?: string; lema?: string; descripcion?: string; imagen_path?: string | null };

async function perfilActual(service: ReturnType<typeof createServiceRoleClient>): Promise<ValorPerfil> {
  const { data } = await service.from("platform_settings").select("value").eq("key", CLAVE_PERFIL_CTCX).maybeSingle();
  return ((data?.value as ValorPerfil | null) ?? {}) as ValorPerfil;
}

async function guardarPerfil(service: ReturnType<typeof createServiceRoleClient>, valor: ValorPerfil, adminId: string): Promise<string | null> {
  const { error } = await service.from("platform_settings").upsert({ key: CLAVE_PERFIL_CTCX, value: valor, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "key" });
  return error ? error.message : null;
}

/** El perfil ÚNICO de CTCx Selection (nombre, lema, descripción): lo que la vitrina enseña en vez de la finca. */
export async function guardarPerfilCtcx(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const nombre = texto(formData.get("nombre"));
  if (!nombre) return { ok: false, error: "El perfil necesita un nombre: es lo que el comprador ve en vez de la finca." };
  const actual = await perfilActual(service);
  const err = await guardarPerfil(service, { ...actual, nombre, lema: texto(formData.get("lema")) ?? "", descripcion: texto(formData.get("descripcion")) ?? "" }, adminId);
  if (err) return { ok: false, error: "No se pudo guardar el perfil: " + err };
  await service.from("audit_log").insert({ entity_type: "platform_setting", entity_id: adminId, action: "ctcx_perfil_guardado", performed_by: adminId, notes: nombre });
  revalida();
  return { ok: true };
}

export type DestinoCtcx = { tipo: "lote"; lotId: string } | { tipo: "perfil" };

/** La URL firmada para subir una imagen (del perfil o de un lote comprado) al bucket público `ctcx-selection`. */
export async function crearUrlDeSubidaCtcx(destino: DestinoCtcx, filename: string): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  if (destino.tipo === "lote") {
    const { count } = await service.from("compras").select("id", { count: "exact", head: true }).eq("lot_id", destino.lotId);
    if (!count) return { ok: false, error: "La imagen por lote es de un lote COMPRADO en firme: este no tiene compras." };
  }
  const clean = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "imagen";
  const path = destino.tipo === "lote" ? `lotes/${destino.lotId}/${Date.now()}-${clean}` : `perfil/${Date.now()}-${clean}`;
  const { data, error } = await service.storage.from(BUCKET_CTCX).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

/** Deja fijada la imagen ya subida (la anterior, si la había, se borra del bucket). */
export async function fijarImagenCtcx(destino: DestinoCtcx, path: string, alt?: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const limpio = String(path ?? "").trim();
  const prefijo = destino.tipo === "lote" ? `lotes/${destino.lotId}/` : "perfil/";
  if (!limpio.startsWith(prefijo) || limpio.includes("..")) return { ok: false, error: "Ruta de imagen inválida." };
  const altText = String(alt ?? "").trim() || null;

  let anterior: string | null = null;
  if (destino.tipo === "lote") {
    const { data: prev } = await service.from("ctcx_selection_lotes").select("imagen_path").eq("lot_id", destino.lotId).maybeSingle();
    anterior = prev?.imagen_path ?? null;
    const { error } = await service.from("ctcx_selection_lotes").upsert({ lot_id: destino.lotId, imagen_path: limpio, imagen_alt: altText, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "lot_id" });
    if (error) return { ok: false, error: "No se pudo fijar la imagen: " + error.message };
  } else {
    const actual = await perfilActual(service);
    anterior = actual.imagen_path ?? null;
    const err = await guardarPerfil(service, { ...actual, imagen_path: limpio }, adminId);
    if (err) return { ok: false, error: "No se pudo fijar la imagen: " + err };
  }
  if (anterior && anterior !== limpio) await service.storage.from(BUCKET_CTCX).remove([anterior]);
  await service.from("audit_log").insert({ entity_type: destino.tipo === "lote" ? "lot" : "platform_setting", entity_id: destino.tipo === "lote" ? destino.lotId : adminId, action: "ctcx_imagen_fijada", performed_by: adminId, notes: limpio });
  revalida();
  return { ok: true };
}

export async function quitarImagenCtcx(destino: DestinoCtcx): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  let anterior: string | null = null;
  if (destino.tipo === "lote") {
    const { data: prev } = await service.from("ctcx_selection_lotes").select("imagen_path").eq("lot_id", destino.lotId).maybeSingle();
    anterior = prev?.imagen_path ?? null;
    await service.from("ctcx_selection_lotes").update({ imagen_path: null, imagen_alt: null, updated_at: new Date().toISOString(), updated_by: adminId }).eq("lot_id", destino.lotId);
  } else {
    const actual = await perfilActual(service);
    anterior = actual.imagen_path ?? null;
    const err = await guardarPerfil(service, { ...actual, imagen_path: null }, adminId);
    if (err) return { ok: false, error: "No se pudo quitar la imagen: " + err };
  }
  if (anterior) await service.storage.from(BUCKET_CTCX).remove([anterior]);
  await service.from("audit_log").insert({ entity_type: destino.tipo === "lote" ? "lot" : "platform_setting", entity_id: destino.tipo === "lote" ? destino.lotId : adminId, action: "ctcx_imagen_quitada", performed_by: adminId, notes: anterior });
  revalida();
  return { ok: true };
}

// ── 2.ª tanda (V5.87): la ubicación física de una compra y las MEZCLAS ─────────────────────────
// La regla de la mezcla (Black 3–4 orígenes y/o variedades · Red una variedad · una carga por productor) la impone
// `src/lib/compras/mezclas.ts` (puro, que la LEE de `lectura.ts`) al añadir cada componente y al cerrar; el guard
// `guard_mezcla_cerrada` la repite en la base. Una mezcla es borrador → cerrada · anulada: nada se borra.

const revalidaMezclas = (id?: string) => {
  revalida();
  revalidatePath("/ocp/compras/mezclas");
  if (id) revalidatePath(`/ocp/compras/mezclas/${id}`);
};

/** Dónde está físicamente el café comprado (decisión 2 del brief: texto libre hasta que el owner fije los sitios). */
export async function ubicarCompra(compraId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const ubicacion = texto(formData.get("ubicacion"));
  const { error } = await service.from("compras").update({ ubicacion }).eq("id", compraId);
  if (error) return { ok: false, error: "No se pudo guardar la ubicación: " + error.message };
  await service.from("audit_log").insert({ entity_type: "compra", entity_id: compraId, action: "compra_ubicada", performed_by: adminId, notes: ubicacion });
  revalida();
  return { ok: true };
}

export async function crearMezcla(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const nombre = texto(formData.get("nombre"));
  const grado = texto(formData.get("grado"));
  if (!nombre) return { ok: false, error: "Póngale nombre a la mezcla." };
  if (!esGradoDeMezcla(grado)) return { ok: false, error: "Solo Black y Red se mezclan (Blue, Gold y Tyrian son lote único)." };
  const { data, error } = await service.from("mezclas").insert({ nombre, grado, nota: texto(formData.get("nota")), created_by: adminId }).select("id, codigo").single();
  if (error || !data) return { ok: false, error: "No se pudo crear la mezcla: " + (error?.message ?? "sin fila") };
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: data.id, action: "mezcla_creada", performed_by: adminId, notes: `${data.codigo} · ${nombre} · ${grado}` });
  revalidaMezclas(data.id);
  return { ok: true };
}

export async function agregarComponente(mezclaId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const compraId = texto(formData.get("compra_id"));
  const kg = kgDe(formData.get("kg"));
  if (!compraId) return { ok: false, error: "Elija la compra." };
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos que entran en la mezcla." };
  const mezcla = await cargarMezcla(service, mezclaId);
  if (!mezcla) return { ok: false, error: "Mezcla no encontrada." };
  if (mezcla.status !== "borrador") return { ok: false, error: "Los componentes solo cambian mientras la mezcla es un borrador." };
  const { data: compra } = await service.from("compras").select("id, kg, grado, lots(producer_id, ficha_variedad)").eq("id", compraId).maybeSingle();
  if (!compra) return { ok: false, error: "Compra no encontrada." };
  const lot = (Array.isArray(compra.lots) ? compra.lots[0] : compra.lots) as { producer_id: string; ficha_variedad: string | null } | null;
  const { data: asignadoRaw } = await service.from("mezcla_componentes").select("kg, mezclas!inner(status)").eq("compra_id", compraId).neq("mezclas.status", "anulada");
  const asignado = ((asignadoRaw as { kg: number | string }[] | null) ?? []).reduce((a, r) => a + Number(r.kg), 0);
  const nuevo = {
    compraId,
    kg,
    producerId: lot?.producer_id ?? "",
    variedad: lot?.ficha_variedad ?? null,
    grado: compra.grado,
    disponibleKg: Math.max(0, Math.round((Number(compra.kg) - asignado) * 10) / 10),
  };
  const errores = validarComponente(mezcla.grado as GradoDeMezcla, mezcla.componentes, nuevo);
  if (errores.length) return { ok: false, error: errores.join(" ") };
  const { error } = await service.from("mezcla_componentes").insert({ mezcla_id: mezclaId, compra_id: compraId, kg });
  if (error) return { ok: false, error: "No se pudo añadir el componente: " + error.message };
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_componente_anadido", performed_by: adminId, notes: `compra ${compraId.slice(0, 8)} · ${kg} kg` });
  revalidaMezclas(mezclaId);
  return { ok: true };
}

export async function quitarComponente(mezclaId: string, componenteId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: m } = await service.from("mezclas").select("status").eq("id", mezclaId).maybeSingle();
  if (!m) return { ok: false, error: "Mezcla no encontrada." };
  if (m.status !== "borrador") return { ok: false, error: "Los componentes solo cambian mientras la mezcla es un borrador." };
  const { error } = await service.from("mezcla_componentes").delete().eq("id", componenteId).eq("mezcla_id", mezclaId);
  if (error) return { ok: false, error: "No se pudo quitar el componente: " + error.message };
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_componente_quitado", performed_by: adminId, notes: componenteId.slice(0, 8) });
  revalidaMezclas(mezclaId);
  return { ok: true };
}

/** Cerrar = la regla entera se cumple (servidor) y la base la repite (guard). Desde aquí la mezcla no cambia: solo se anula. */
export async function cerrarMezcla(mezclaId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const mezcla = await cargarMezcla(service, mezclaId);
  if (!mezcla) return { ok: false, error: "Mezcla no encontrada." };
  if (mezcla.status !== "borrador") return { ok: false, error: "Solo se cierra un borrador." };
  const errores = validarCierre(mezcla.grado, mezcla.componentes);
  if (errores.length) return { ok: false, error: errores.join(" ") };
  const { error } = await service.from("mezclas").update({ status: "cerrada" }).eq("id", mezclaId);
  if (error) return { ok: false, error: "La base no dejó cerrar la mezcla: " + error.message };
  const r = resumenDeMezcla(mezcla.componentes);
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_cerrada", performed_by: adminId, notes: `${mezcla.codigo} · ${r.componentes} componentes · ${r.productores} productores · ${r.kgTotal} kg (${r.cargas} cargas)${r.variedades.length ? ` · ${r.variedades.join(", ")}` : ""}` });
  revalidaMezclas(mezclaId);
  return { ok: true };
}

export async function anularMezcla(mezclaId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const motivo = texto(formData.get("motivo"));
  if (!motivo) return { ok: false, error: "Anular lleva motivo (queda en el rastro)." };
  const { data: m } = await service.from("mezclas").select("status, codigo").eq("id", mezclaId).maybeSingle();
  if (!m) return { ok: false, error: "Mezcla no encontrada." };
  if (m.status === "anulada") return { ok: false, error: "Ya estaba anulada." };
  const { error } = await service.from("mezclas").update({ status: "anulada", anulada_motivo: motivo }).eq("id", mezclaId);
  if (error) return { ok: false, error: "No se pudo anular: " + error.message };
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_anulada", performed_by: adminId, previous_status: m.status, new_status: "anulada", notes: `${m.codigo} · ${motivo.slice(0, 300)}` });
  revalidaMezclas(mezclaId);
  return { ok: true };
}
