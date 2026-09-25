"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { MOTIVO_LABEL, saldoDe, salidaValida, trillaDelKilo, type MotivoDeSalida } from "@/lib/muestras/particion";
import { KG_REVISION_ALMACENAJE } from "@/lib/muestras/almacenaje";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras (1.ª tanda, V5.80) ────────────────────
// El recibo (que crea las filas) vive en Solicitudes de Evaluación (`solicitudesActions.ts`) y en la vista del lote.
// Aquí están las dos cosas que se hacen DESPUÉS con una muestra que ya está en la casa: ubicarla y anotar una
// salida. Las dos son `borrador` (lista blanca en `docs/BCP_USER_ADMIN_PLAN.md`): son el cuaderno interno de dónde
// está el café y qué se sacó; nadie de fuera lo ve, no disparan correo ni cobro, y se corrigen con otra anotación.
// El saldo NO se guarda: se deriva (recibido − Σ salidas) y una salida que no cabe se rechaza aquí.

type Result = { ok: true } | { ok: false; error: string };
const revalidar = () => {
  revalidatePath("/ocp/muestras");
  revalidatePath("/ocp/a-evaluar");
};

export async function ubicarMuestra(muestraId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const ubicacion = String(formData.get("ubicacion") ?? "").trim();
  const custodio = String(formData.get("custodio") ?? "").trim();
  // V5.89: la bodega (`bodegas_muestras`) es la ubicación principal; `ubicacion` queda para el detalle (estante, caja).
  const bodegaId = String(formData.get("bodega_id") ?? "").trim() || null;
  if (!ubicacion && !custodio && !bodegaId) return { ok: false, error: "Elija la bodega, o escriba dónde queda la muestra o quién la tiene." };
  if (bodegaId) {
    const { data: bodega } = await service.from("bodegas_muestras").select("id, estado").eq("id", bodegaId).maybeSingle();
    if (!bodega) return { ok: false, error: "Bodega no encontrada." };
    if (bodega.estado === "inactiva") return { ok: false, error: "Esa bodega está inactiva." };
  }
  const { error } = await service.from("muestras").update({ ubicacion: ubicacion || null, custodio: custodio || null, bodega_id: bodegaId }).eq("id", muestraId);
  if (error) return { ok: false, error: "No se pudo ubicar la muestra: " + error.message };
  revalidar();
  return { ok: true };
}

export async function anotarSalidaDeMuestra(muestraId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const kg = Number(String(formData.get("kg") ?? "").replace(",", ".").trim());
  const motivo = String(formData.get("motivo") ?? "") as MotivoDeSalida;
  const destino = String(formData.get("destino") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  if (!(motivo in MOTIVO_LABEL)) return { ok: false, error: "Elija el motivo de la salida." };

  const [{ data: muestra }, { data: salidas }] = await Promise.all([
    service.from("muestras").select("id, lot_id, kg, tipo").eq("id", muestraId).maybeSingle(),
    service.from("muestra_movimientos").select("kg").eq("muestra_id", muestraId),
  ]);
  if (!muestra) return { ok: false, error: "Muestra no encontrada." };
  const saldo = saldoDe(Number(muestra.kg), (salidas as { kg: number }[] | null) ?? []);
  if (!salidaValida(saldo, kg)) return { ok: false, error: `Esa salida no cabe: quedan ${saldo} kg de esta muestra.` };

  const { error } = await service.from("muestra_movimientos").insert({
    muestra_id: muestraId,
    kg,
    motivo,
    destino: destino || null,
    notas: notas || null,
    por: adminId,
  });
  if (error) return { ok: false, error: "No se pudo anotar la salida: " + error.message };
  await service.from("audit_log").insert({
    entity_type: "muestra",
    entity_id: muestraId,
    action: "salida",
    performed_by: adminId,
    notes: `${kg} kg · ${MOTIVO_LABEL[motivo]}${destino ? ` · ${destino}` : ""} · quedan ${saldoDe(saldo, [{ kg }])} kg`,
  });
  revalidar();
  return { ok: true };
}

// ── 2.ª tanda (V5.88): la revisión de almacenaje y las muestras para comprador ──────────────────

/**
 * La revisión de almacenaje a los 90 días (owner, 2026-09-16: «no se recata; se revisa el almacenaje con 1 kg»). Es un
 * movimiento más de la muestra de TESTEO (motivo `revision_almacenaje`) con el resultado en las notas; la alerta se deriva
 * de este movimiento y de la fecha de la catación (`src/lib/muestras/almacenaje.ts`). Cuaderno interno: `borrador`.
 */
export async function anotarRevisionDeAlmacenaje(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const kgPedidos = String(formData.get("kg") ?? "").trim();
  const kg = kgPedidos ? Number(kgPedidos.replace(",", ".")) : KG_REVISION_ALMACENAJE;
  const resultado = String(formData.get("resultado") ?? "").trim();
  if (!resultado) return { ok: false, error: "Anote el resultado de la revisión (humedad, olor, estado del grano…)." };
  const { data: testeos } = await service.from("muestras").select("id, kg").eq("lot_id", lotId).eq("tipo", "testeo").order("recibida_at", { ascending: false });
  const filas = (testeos as { id: string; kg: number | string }[] | null) ?? [];
  if (!filas.length) return { ok: false, error: "Este lote no tiene muestra de testeo en la casa: pídala antes de revisar." };
  const { data: salidasRaw } = await service.from("muestra_movimientos").select("muestra_id, kg").in("muestra_id", filas.map((f) => f.id));
  const salidas = (salidasRaw as { muestra_id: string; kg: number | string }[] | null) ?? [];
  const conSaldo = filas.map((f) => ({ id: f.id, saldo: saldoDe(Number(f.kg), salidas.filter((x) => x.muestra_id === f.id)) })).find((f) => f.saldo > 0);
  if (!conSaldo) return { ok: false, error: "La muestra de testeo de este lote ya no tiene saldo: pida una nueva." };
  const usa = Math.min(Number.isFinite(kg) && kg > 0 ? kg : KG_REVISION_ALMACENAJE, conSaldo.saldo);
  if (!salidaValida(conSaldo.saldo, usa)) return { ok: false, error: `Esa cantidad no cabe: quedan ${conSaldo.saldo} kg de testeo.` };
  const { error } = await service.from("muestra_movimientos").insert({
    muestra_id: conSaldo.id,
    kg: usa,
    motivo: "revision_almacenaje",
    destino: "revisión in-house",
    notas: resultado,
    por: adminId,
  });
  if (error) return { ok: false, error: "No se pudo anotar la revisión: " + error.message };
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: lotId, action: "revision_almacenaje", performed_by: adminId, notes: `${usa} kg · ${resultado.slice(0, 250)}` });
  revalidar();
  revalidatePath("/ecp");
  revalidatePath("/ocp");
  return { ok: true };
}

const revalidarPedidos = () => {
  revalidatePath("/ocp/muestras");
  revalidatePath("/ecp");
};

/**
 * Añadir una muestra a un pedido de pack (comprador): una salida `a_comprador` ligada al pedido (`pedido_id`); la primera lo
 * pasa a «preparado». Qué lotes y cuántos gramos van los decide CTC aquí (decisiones 4 y 5 del brief: del owner). `borrador`:
 * el comprador no ve nada hasta que se marca enviado.
 */
export async function agregarMuestraAlPedido(pedidoId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const muestraId = String(formData.get("muestra_id") ?? "").trim();
  const gramos = Number(String(formData.get("gramos") ?? "").replace(",", ".").trim());
  if (!muestraId) return { ok: false, error: "Elija la muestra." };
  if (!Number.isFinite(gramos) || gramos <= 0) return { ok: false, error: "Escriba los gramos que van al pedido." };
  const kg = Math.round(gramos) / 1000;
  const [{ data: pedido }, { data: muestra }, { data: salidas }] = await Promise.all([
    service.from("sample_pack_orders").select("id, status, buyer_id").eq("id", pedidoId).maybeSingle(),
    service.from("muestras").select("id, lot_id, kg, tipo, lots(name)").eq("id", muestraId).maybeSingle(),
    service.from("muestra_movimientos").select("kg").eq("muestra_id", muestraId),
  ]);
  if (!pedido) return { ok: false, error: "Pedido no encontrado." };
  if (pedido.status === "enviado") return { ok: false, error: "Ese pedido ya salió: no se le añaden muestras." };
  if (!muestra) return { ok: false, error: "Muestra no encontrada." };
  const saldo = saldoDe(Number(muestra.kg), (salidas as { kg: number }[] | null) ?? []);
  if (!salidaValida(saldo, kg)) return { ok: false, error: `Esa cantidad no cabe: quedan ${saldo} kg de esa muestra.` };
  const lote = (Array.isArray(muestra.lots) ? muestra.lots[0] : muestra.lots) as { name: string } | null;
  const { error } = await service.from("muestra_movimientos").insert({
    muestra_id: muestraId,
    kg,
    motivo: "a_comprador",
    destino: `Pedido ${pedidoId.slice(0, 8)}`,
    pedido_id: pedidoId,
    por: adminId,
  });
  if (error) return { ok: false, error: "No se pudo añadir la muestra al pedido: " + error.message };
  if (pedido.status === "ordered") {
    await service.from("sample_pack_orders").update({ status: "preparado", preparado_at: new Date().toISOString() }).eq("id", pedidoId);
  }
  await service.from("audit_log").insert({ entity_type: "sample_pack_order", entity_id: pedidoId, action: "pedido_muestra_preparado", performed_by: adminId, notes: `${lote?.name ?? "lote"} · ${muestra.tipo} · ${gramos} g` });
  revalidarPedidos();
  return { ok: true };
}

/** El pedido sale de la casa: estado «enviado», guía y notas. Lo ve el comprador (su pedido cambia de estado): `emite`. */
export async function marcarPedidoEnviado(pedidoId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const guia = String(formData.get("guia") ?? "").trim() || null;
  const notas = String(formData.get("notas_ctc") ?? "").trim() || null;
  const [{ data: pedido }, { count }] = await Promise.all([
    service.from("sample_pack_orders").select("id, status").eq("id", pedidoId).maybeSingle(),
    service.from("muestra_movimientos").select("id", { count: "exact", head: true }).eq("pedido_id", pedidoId),
  ]);
  if (!pedido) return { ok: false, error: "Pedido no encontrado." };
  if (pedido.status === "enviado") return { ok: false, error: "Ese pedido ya está marcado como enviado." };
  if (!count) return { ok: false, error: "El pedido no tiene muestras todavía: añádalas antes de marcarlo enviado." };
  const { error } = await service.from("sample_pack_orders").update({ status: "enviado", enviado_at: new Date().toISOString(), enviado_por: adminId, guia, notas_ctc: notas }).eq("id", pedidoId);
  if (error) return { ok: false, error: "No se pudo marcar el envío: " + error.message };
  await service.from("audit_log").insert({ entity_type: "sample_pack_order", entity_id: pedidoId, action: "pedido_muestra_enviado", performed_by: adminId, notes: `${count} muestra(s)${guia ? ` · guía ${guia}` : ""}` });
  revalidarPedidos();
  return { ok: true };
}

// ── V5.89 (owner, 2026-09-25): las bodegas de muestras y el kilo CTCx trillado ──────────────────

const ESTADOS_BODEGA = ["activa", "pendiente", "inactiva"] as const;

function bodegaDe(formData: FormData): { nombre: string | null; responsable: string | null; direccion: string | null; capacidad_muestras: number | null; estado: string; notas: string | null } {
  const t = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const cap = String(formData.get("capacidad_muestras") ?? "").trim();
  const estado = t("estado") ?? "activa";
  return { nombre: t("nombre"), responsable: t("responsable"), direccion: t("direccion"), capacidad_muestras: cap ? Number(cap) : null, estado, notas: t("notas") };
}

/** Una bodega de muestras nueva (responsable, dirección, capacidad en muestras de 1 kg, estado). Configuración interna: `borrador`. */
export async function crearBodega(formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const b = bodegaDe(formData);
  if (!b.nombre) return { ok: false, error: "Póngale nombre a la bodega." };
  if (!(ESTADOS_BODEGA as readonly string[]).includes(b.estado)) return { ok: false, error: "Estado inválido." };
  if (b.capacidad_muestras != null && (!Number.isInteger(b.capacidad_muestras) || b.capacidad_muestras < 0)) return { ok: false, error: "La capacidad se cuenta en muestras de 1 kg (entero)." };
  const { data, error } = await service.from("bodegas_muestras").insert({ ...b, updated_by: adminId }).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear la bodega: " + (error?.message ?? "sin fila") };
  await service.from("audit_log").insert({ entity_type: "bodega_muestras", entity_id: data.id, action: "bodega_creada", performed_by: adminId, notes: b.nombre });
  revalidar();
  return { ok: true };
}

export async function guardarBodega(bodegaId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const b = bodegaDe(formData);
  if (!b.nombre) return { ok: false, error: "La bodega necesita nombre." };
  if (!(ESTADOS_BODEGA as readonly string[]).includes(b.estado)) return { ok: false, error: "Estado inválido." };
  if (b.capacidad_muestras != null && (!Number.isInteger(b.capacidad_muestras) || b.capacidad_muestras < 0)) return { ok: false, error: "La capacidad se cuenta en muestras de 1 kg (entero)." };
  const { error } = await service.from("bodegas_muestras").update({ ...b, updated_at: new Date().toISOString(), updated_by: adminId }).eq("id", bodegaId);
  if (error) return { ok: false, error: "No se pudo guardar la bodega: " + error.message };
  await service.from("audit_log").insert({ entity_type: "bodega_muestras", entity_id: bodegaId, action: "bodega_guardada", performed_by: adminId, notes: `${b.nombre} · ${b.estado}${b.capacidad_muestras != null ? ` · ${b.capacidad_muestras} muestras` : ""}` });
  revalidar();
  return { ok: true };
}

/**
 * El kilo CTCx se trilla por completo (owner, 2026-09-25): sale TODO el saldo del kilo (motivo `trilla_verde`) y nacen dos
 * muestras nuevas con `origen_muestra_id`: el verde al vacío (contramuestra, 250 g) y el tostado de ensayo (400 g de los
 * ~500 g de verde que se tuestan). Los kilos se proponen con `trillaDelKilo` y se pueden corregir con lo que de verdad pesó.
 */
export async function trillarMuestraCtcx(muestraId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const [{ data: muestra }, { data: salidas }] = await Promise.all([
    service.from("muestras").select("id, lot_id, kg, tipo, bodega_id, custodio, ubicacion").eq("id", muestraId).maybeSingle(),
    service.from("muestra_movimientos").select("kg").eq("muestra_id", muestraId),
  ]);
  if (!muestra) return { ok: false, error: "Muestra no encontrada." };
  if (muestra.tipo !== "testeo") return { ok: false, error: "Solo se trilla el kilo de evaluación CTCx." };
  const saldo = saldoDe(Number(muestra.kg), (salidas as { kg: number }[] | null) ?? []);
  if (saldo <= 0) return { ok: false, error: "Ese kilo ya no tiene saldo." };
  const propuesta = trillaDelKilo(saldo);
  const num = (k: string, def: number) => {
    const raw = String(formData.get(k) ?? "").replace(",", ".").trim();
    if (!raw) return def;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : NaN;
  };
  const verdeVacioKg = num("verde_vacio_kg", propuesta.verdeVacioKg);
  const tostadoKg = num("tostado_kg", propuesta.tostadoKg);
  if (Number.isNaN(verdeVacioKg) || Number.isNaN(tostadoKg)) return { ok: false, error: "Los kilos deben ser números (0 o más)." };
  if (verdeVacioKg + tostadoKg > saldo + 1e-9) return { ok: false, error: `Del kilo (${saldo} kg de CPS) no pueden salir ${verdeVacioKg + tostadoKg} kg: la trilla merma.` };
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const now = new Date().toISOString();

  const { error: e1 } = await service.from("muestra_movimientos").insert({
    muestra_id: muestraId,
    kg: saldo,
    motivo: "trilla_verde",
    destino: `→ ${verdeVacioKg} kg verde al vacío · ${tostadoKg} kg tostado de ensayo`,
    notas,
    por: adminId,
  });
  if (e1) return { ok: false, error: "No se pudo anotar la trilla: " + e1.message };
  const nuevas = [
    verdeVacioKg > 0 ? { tipo: "verde_vacio", kg: verdeVacioKg, notas: "del kilo CTCx, al vacío" } : null,
    tostadoKg > 0 ? { tipo: "tostado_ensayo", kg: tostadoKg, notas: "del kilo CTCx, para ensayos piloto" } : null,
  ].filter((n): n is { tipo: string; kg: number; notas: string } => n !== null);
  if (nuevas.length) {
    const { error: e2 } = await service.from("muestras").insert(
      nuevas.map((n) => ({
        lot_id: muestra.lot_id,
        tipo: n.tipo,
        kg: n.kg,
        recibida_at: now,
        bodega_id: muestra.bodega_id,
        ubicacion: muestra.ubicacion,
        custodio: muestra.custodio,
        notas: n.notas,
        recibida_por: adminId,
        origen_muestra_id: muestraId,
      }))
    );
    if (e2) return { ok: false, error: "La trilla quedó anotada pero no se pudieron crear las muestras derivadas: " + e2.message };
  }
  await service.from("audit_log").insert({ entity_type: "muestra", entity_id: muestraId, action: "trilla_verde", performed_by: adminId, notes: `${saldo} kg CPS → ${verdeVacioKg} kg verde al vacío + ${tostadoKg} kg tostado` });
  revalidar();
  return { ok: true };
}
