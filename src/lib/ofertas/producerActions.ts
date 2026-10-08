"use server";

import { diaEnColombia, fechaParaElProductor } from "@/lib/trato/fechas";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/arena/inscriptions";
import { CONTRATO_VERSION, textoDelContrato, type DatosDelContrato } from "@/lib/trato/contrato";
import { COLUMNAS_DEL_CONTRATO, datosDeLaFila, type FilaDelContrato } from "@/lib/trato/contratoDeFila";
import { documentoDelFirmante, validarDocumento } from "@/lib/trato/documento";
import { validarDeclaracion } from "@/lib/trato/minimos";
import { plazoDelSaco } from "@/lib/trato/despachos";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { RETIRO_LIBRE_CICLO_PCT, RETIRO_LIBRE_EXTENDIDA_PCT } from "@/lib/trato/ventanas";
import { condicionesDeFirma, disponibleDe, type CondicionesDeFirma, type OfertaParaVentana } from "./ventanaDeOferta";
import { sincronizarListado } from "@/lib/trato/ventanaServidor";
import { fleteDeLaFila } from "@/lib/trato/flete";
import { guardarExistencia } from "@/lib/kaffetal/existencia";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { ctcLotReference, supplierCode } from "@/components/kaffetal-regal/data";
import { cargarOferta, crearContratoDeOferta, operadorDeLaAsistida, requireProducer, validarAceptacion, type Aceptable, type DeclaracionDelProductor } from "./aceptacion";

// ── La respuesta del productor a una oferta (V5.18 · con declaración desde la V5.83 · por ventanas desde la V5.175) ──────────
// lot_offers es de solo lectura para el productor (RLS select-own); TODA escritura pasa por aquí con service role — el mismo
// patrón de src/lib/arena/producerActions.ts. Devuelve resultado, nunca lanza.
//
// ACEPTAR ES DONDE NACE EL CONTRATO, lleno y firmado por el productor. Desde la V5.175 (docs/PLAN_CICLOS.md) una participación en
// Cherry Picked ya no elige modalidad: la FECHA DE FIRMA decide la ventana, el retiro libre y la regla de precio
// (`condicionesDeFirma`, la misma cuenta que enseña la calculadora). El productor declara una cantidad (>= el mínimo; o, si la
// existencia del lote no le alcanza, hasta la mitad sin retiro), CTCx compra el SACO fuera de lo declarado y su despacho queda
// con plazo al cierre de la semana. Rechazar cierra la oferta con la nota del productor — y no crea nada.
// V5.190 (owner, 2026-10-08): la validación y el insert viven en `aceptacion.ts` (un solo camino para firmar y para la ACEPTACIÓN
// PROVISIONAL de CTCx en una sesión asistida); aquí quedan las tres acciones del productor y la RATIFICACIÓN.

export type RespuestaOferta = { ok: true } | { ok: false; message: string };
export type { DeclaracionDelProductor };

/** V5.168 (owner): la firma del productor con el dedo — su nombre y el trazo en PNG (data URL). */
/** V5.188: con el nombre llega el documento de quien firma (tipo y número), que el texto firmado dice y el contrato guarda. */
export type FirmaDeAceptacion = { nombre: string; documentoTipo: string; documentoNumero: string; imagenPng: string };

const FIRMA_PREFIJO = "data:image/png;base64,";
const FIRMA_MAX_BYTES = 600_000;

/** La firma que llega de la pantalla, validada: el nombre, el documento (V5.188) y el PNG del trazo. */
function validarFirma(firma: FirmaDeAceptacion | undefined):
  | { ok: true; nombre: string; documento: { tipo: "CC" | "CE" | "PPT" | "PA" | "NIT"; numero: string }; bytes: Buffer }
  | { ok: false; message: string } {
  if (!firma) return { ok: false, message: "Para aceptar hay que firmar el contrato (su nombre y su firma con el dedo)." };
  const nombre = String(firma.nombre ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 5) return { ok: false, message: "Escriba su nombre completo para firmar." };
  const documento = validarDocumento(firma.documentoTipo, firma.documentoNumero);
  if (!documento.ok) return { ok: false, message: documento.motivo };
  if (typeof firma.imagenPng !== "string" || !firma.imagenPng.startsWith(FIRMA_PREFIJO)) return { ok: false, message: "La firma no llegó bien. Fírmela de nuevo." };
  const bytes = Buffer.from(firma.imagenPng.slice(FIRMA_PREFIJO.length), "base64");
  if (bytes.length < 200 || bytes.length > FIRMA_MAX_BYTES) return { ok: false, message: "La firma no llegó bien. Fírmela de nuevo." };
  return { ok: true, nombre, documento: { tipo: documento.tipo, numero: documento.numero }, bytes };
}

/** Los datos del texto de una aceptación (los mismos que la pantalla le enseñó a quien acepta). */
function datosDeAceptacion(a: Aceptable, quien: { nombre: string; documento: string | null } | null, provisional: DatosDelContrato["provisional"]): DatosDelContrato {
  const { offer, cond } = a;
  return {
    tipo: a.esSelection ? "selection" : "cherry_picked",
    ventana: cond ? { tipo: cond.ventana.tipo, desde: cond.ventana.desde, hasta: cond.ventana.hasta, ciclos: cond.ventana.ciclos, retiroLibrePct: cond.ventana.retiroLibrePct, precio: cond.ventana.precio } : null,
    sinRetiro: a.sinRetiro,
    sacoKg: cond ? cond.sacoKg : null,
    esRenovacion: cond?.esRenovacion ?? false,
    minimoKg: cond ? cond.minimoKg : null,
    calidad: cond?.calidad ?? null,
    flete: fleteDeLaFila(offer),
    productorNombre: quien?.nombre ?? "—",
    productorDocumento: quien?.documento ?? null,
    loteNombre: a.lot?.name ?? "—",
    loteReferencia: ctcLotReference(offer.lot_id),
    grado: offer.grade_snapshot ?? "—",
    copKg: a.copKgTrato,
    declaradoKg: a.lockedKg ?? 0,
    lugarEntrega: a.lugarEntrega,
    termsVersion: offer.terms_version ?? null,
    temporada: offer.season_label ?? null,
    provisional,
  };
}

const ventanaDe = (a: Aceptable) =>
  a.cond
    ? ` · ventana ${a.cond.ventana.desde} → ${a.cond.ventana.hasta} (${a.cond.ventana.tipo}, retiro libre ${a.sinRetiro ? 0 : a.cond.ventana.retiroLibrePct} %) · declaró ${a.lockedKg} kg${a.sinRetiro ? " sin retiro (existencia insuficiente)" : ""} · saco ${a.cond.sacoKg} kg · términos ${a.offer.terms_version}`
    : a.esSelection
      ? ` · compra CTCx Selection de ${a.lockedKg} kg`
      : "";

export async function respondToOffer(
  offerId: string,
  respuesta: "aceptar" | "rechazar",
  note?: string,
  declaracion?: DeclaracionDelProductor,
  firma?: FirmaDeAceptacion
): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const offer = await cargarOferta(service, auth.userId, offerId);
  if (!offer) return { ok: false, message: "Oferta no encontrada." };
  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) ?? null;

  if (respuesta === "rechazar") {
    // V5.169: una Selection en contraoferta (le toca a CTCx) se puede DESISTIR, no aceptar.
    if (offer.status !== "emitida" && offer.status !== "contraofertada") return { ok: false, message: "Esta oferta ya fue respondida o retirada." };
    const cleanNote = note?.trim() || null;
    await service.from("lot_offers").update({ status: "rechazada", responded_at: new Date().toISOString(), response_note: cleanNote }).eq("id", offerId);
    if (offer.kind === "directa") {
      await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "productor", accion: "desiste", nota: cleanNote, created_by: auth.userId });
    }
    await service.from("audit_log").insert({
      entity_type: "lot_offer",
      entity_id: offer.lot_id,
      action: "offer_rejected",
      previous_status: offer.status,
      new_status: "rechazada",
      performed_by: auth.userId,
      notes: cleanNote?.slice(0, 300) ?? null,
    });
    return { ok: true };
  }

  const val = await validarAceptacion(service, auth.userId, offer, declaracion);
  if (!val.ok) return { ok: false, message: val.message };
  const a = val.a;

  // V5.168 · LA FIRMA DEL PRODUCTOR: aceptar es firmar. Se valida y se guarda ANTES de crear el contrato (si la imagen no se
  // puede guardar, no nace un contrato sin firma). El texto firmado es el que arma `textoDelContrato` con estos mismos datos —
  // la pantalla le enseñó exactamente ese— y se guarda su huella SHA-256.
  const f = validarFirma(firma);
  if (!f.ok) return { ok: false, message: f.message };
  const documento = documentoDelFirmante(f.documento.tipo, f.documento.numero);
  const texto = textoDelContrato(datosDeAceptacion(a, { nombre: f.nombre, documento }, null));
  const huella = createHash("sha256").update(texto, "utf8").digest("hex");
  // V5.190: en una SESIÓN ASISTIDA la firma con la mano es del productor, presente; queda sellada con el operador de consola.
  const operador = await operadorDeLaAsistida(auth.userId);
  const rutaFirma = `contratos/oferta-${offer.id}/firma-productor-${Date.now()}.png`;
  const { error: errorFirma } = await service.storage.from("kaffetal-media").upload(rutaFirma, f.bytes, { contentType: "image/png", upsert: false });
  if (errorFirma) return { ok: false, message: "No se pudo guardar su firma. Intente de nuevo." };
  const h = await headers();
  const metaFirma = {
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    firmado_en: a.now,
    ...(operador ? { sesion_asistida: { operador: operador.userId } } : {}),
  };

  // Aceptar ⇒ el contrato nace aquí, LLENO y FIRMADO por el productor, pendiente de la firma de CTCx.
  const r = await crearContratoDeOferta(service, a, {
    firmante: { nombre: f.nombre, documentoTipo: f.documento.tipo, documentoNumero: f.documento.numero, rutaFirma, meta: metaFirma },
    provisional: null,
    textoVersion: CONTRATO_VERSION,
    textoSha256: huella,
    actor: auth.userId,
    notaAuditoria: `Nace de la oferta ${offer.kind} aceptada y FIRMADA por el productor (${f.nombre}, texto ${CONTRATO_VERSION}, sha256 ${huella.slice(0, 12)}…)${operador ? ` · firmada en una sesión asistida (operador de consola ${operador.userId})` : ""} · ${formatCop(a.copKgTrato)}/kg${a.lockedKg ? ` · ${a.lockedKg} kg` : ""}${ventanaDe(a)}.`,
  });
  if (!r.ok) {
    // Sin contrato, la imagen subida no es de nadie: se retira (es la de este intento).
    await service.storage.from("kaffetal-media").remove([rutaFirma]);
    return { ok: false, message: r.message };
  }
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: offer.lot_id,
    note: a.cond
      ? `Usted aceptó la invitación de CTCx y declaró ${a.lockedKg} kg de CPS para la ventana del ${a.cond.ventana.desde} al ${a.cond.ventana.hasta}, a ${formatCop(a.copKgTrato)}/kg.${a.cond.sacoKg > 0 ? ` CTCx le compra ${a.cond.sacoKg} kg ${a.cond.esRenovacion ? "por adelantado" : "(el saco)"}: despáchelo a más tardar el ${plazoDelSaco(a.hoy)}.` : ""} El contrato queda vigente con la firma de CTCx; lo verá en «Contratos y Compras».`
      : "Usted aceptó la oferta de CTCx. El contrato quedó creado con el precio de la oferta, pendiente de la firma de CTCx — lo verá avanzar en «Contratos y Compras» → Contratos de Temporada.",
    created_by: auth.userId,
  });
  return { ok: true };
}

// ── V5.190 (owner, 2026-10-08) · la ACEPTACIÓN PROVISIONAL de CTCx en una sesión asistida ─────────────────────────────────────
// «Necesitamos un mecanismo para hacer un contrato provisional que queda vigente y podrá ser revisado en cuanto a la cantidad
// declarada (lo demás es fijo, siempre y cuando se usen los valores del PVC correspondiente al grado) […] si es seleccionado, no se
// inserta firma, ni nombre ni documento del Productor, sino que pedirá un "Nombre de responsable CTCx".»
// CTCx no firma por el productor: acepta en su favor («grupo de Pioneros»). Lo puede hacer SOLO un colaborador del OCP con nivel para
// emitir, dentro de una sesión asistida de ESTE productor (`operadorDeLaAsistida`), y solo sobre una participación en Cherry Picked
// anclada al PVC de su grado. El contrato nace VIGENTE (CTCx ya aceptó por su lado), sin firma del productor, y él lo ratifica.
export async function aceptarProvisionalmente(offerId: string, declaracion: DeclaracionDelProductor, responsable: string): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const operador = await operadorDeLaAsistida(auth.userId);
  if (!operador) return { ok: false, message: "La aceptación provisional es de CTCx: se hace desde una sesión asistida abierta en el OCP, con su sesión de consola." };
  const nombre = String(responsable ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 5) return { ok: false, message: "Escriba el nombre del responsable de CTCx (nombre y apellido)." };
  const service = createServiceRoleClient();
  const offer = await cargarOferta(service, auth.userId, offerId);
  if (!offer) return { ok: false, message: "Oferta no encontrada." };
  if (offer.kind !== "temporada" || !offer.pvc_edition_id || !offer.terms_version) {
    return { ok: false, message: "Solo una participación en Cherry Picked anclada al PVC de su grado se acepta provisionalmente (ni una excepción ni una compra de CTCx Selection)." };
  }
  const val = await validarAceptacion(service, auth.userId, offer, declaracion);
  if (!val.ok) return { ok: false, message: val.message };
  const a = val.a;
  // La fecha del texto sale del MISMO instante que se guarda (`provisional_at` = a.now): la página del contrato la recalcula de ahí.
  const provisional = { responsable: nombre, fecha: diaEnColombia(a.now), cuenta: supplierCode(auth.userId), ratificado: null };
  const texto = textoDelContrato(datosDeAceptacion(a, null, provisional));
  const huella = createHash("sha256").update(texto, "utf8").digest("hex");
  const r = await crearContratoDeOferta(service, a, {
    firmante: null,
    provisional: { responsable: nombre, operador: operador.userId },
    textoVersion: CONTRATO_VERSION,
    textoSha256: huella,
    actor: operador.userId,
    notaAuditoria: `Aceptado PROVISIONALMENTE por CTCx en una sesión asistida, en favor del productor (grupo de Pioneros) · responsable: ${nombre} · operador de consola ${operador.userId} · vigente desde ya, sin firma del productor (la ratifica él) · texto ${CONTRATO_VERSION}, sha256 ${huella.slice(0, 12)}… · ${formatCop(a.copKgTrato)}/kg · ${a.lockedKg} kg${ventanaDe(a)}.`,
  });
  if (!r.ok) return { ok: false, message: r.message };

  // El aviso al productor: en su feed y por correo (el remitente único filtra las etiquetas de los desacoplados).
  const lot = a.lot;
  const aviso =
    `CTCx aceptó provisionalmente, en su favor y como parte del grupo de Pioneros, la invitación para su lote ${lot?.name ?? ""}: ${a.lockedKg} kg de CPS ` +
    `para la ventana del ${a.cond ? fechaParaElProductor(a.cond.ventana.desde) : ""} al ${a.cond ? fechaParaElProductor(a.cond.ventana.hasta) : ""}, a ${formatCop(a.copKgTrato)}/kg ` +
    `(responsable de CTCx: ${nombre}). El contrato ya está vigente. Revíselo y ratifíquelo con su firma en «Contratos y Compras»: al ratificar puede ajustar la cantidad declarada; ` +
    "el precio, la ventana y las demás condiciones no cambian. Ningún cambio será unilateral.";
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: lot ? `Lote ${lot.name}` : null, lot_id: offer.lot_id, note: aviso, created_by: operador.userId });
  const { data: perfil } = await service.from("profiles").select("email").eq("id", auth.userId).maybeSingle();
  const correo = (perfil as { email: string | null } | null)?.email ?? null;
  const envio = correo
    ? await sendTransactionalEmail(correo, `Contrato provisional · lote ${lot?.name ?? ""}`, `${aviso}\n\n${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`)
    : { ok: false as const, error: "el productor no tiene correo" };
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: r.contractId,
    action: "provisional_notified",
    performed_by: operador.userId,
    notes: `aviso al productor: ${envio.ok ? "feed + correo" : `feed; correo no enviado: ${envio.error}`}`,
  });
  return { ok: true };
}

// ── V5.190 · la RATIFICACIÓN del productor ─────────────────────────────────────────────────────────────────────────────────
// El contrato aceptado provisionalmente llega a «Contratos» con «Ratificar y firmar». El productor lo ratifica DESDE SU CUENTA (no en
// una sesión asistida: es su firma), puede ajustar la cantidad declarada —dentro del mínimo, de lo que le queda al lote y de lo que ya
// se vendió o retiró— y el texto pasa a nombrarlo con su nombre y su documento, con la fecha de la ratificación y la huella nueva.

type FilaRatificable = FilaDelContrato & { lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null };

async function cargarRatificable(service: ReturnType<typeof createServiceRoleClient>, userId: string, contractId: string): Promise<{ ok: true; c: FilaRatificable; lote: { name: string; producer_id: string } } | { ok: false; message: string }> {
  const { data } = await service.from("purchase_contracts").select(COLUMNAS_DEL_CONTRATO).eq("id", contractId).maybeSingle();
  const c = data as FilaRatificable | null;
  const lote = c ? ((Array.isArray(c.lots) ? c.lots[0] : c.lots) ?? null) : null;
  if (!c || !lote || lote.producer_id !== userId) return { ok: false, message: "Contrato no encontrado." };
  if (!c.provisional_at) return { ok: false, message: "Este contrato no es provisional: ya lleva su firma." };
  if (c.ratificado_at) return { ok: false, message: "Usted ya ratificó este contrato." };
  if (["cancelled", "ruptura", "completed", "renovado"].includes(c.status)) return { ok: false, message: "Este contrato ya no está vigente: no se ratifica." };
  return { ok: true, c, lote };
}

/** Lo que el productor puede declarar al ratificar: el mínimo de la ventana, lo que le queda al lote (contando lo que ESTE contrato ya
 *  movió: vendido, retirado y su saco) y lo que ya se vendió o retiró (no se declara por debajo). */
async function limitesDeRatificacion(service: ReturnType<typeof createServiceRoleClient>, c: FilaRatificable) {
  const [{ disponibleKg }, { data: ventas }, { data: retiros }, { data: sacos }, { data: oferta }] = await Promise.all([
    disponibleDe(service, c.lot_id),
    service.from("contract_ventas").select("kg").eq("contract_id", c.id).is("anulada_at", null),
    service.from("contract_retiros").select("kg").eq("contract_id", c.id),
    service.from("contract_despachos").select("kg").eq("contract_id", c.id).in("tipo", ["saco", "adelanto"]).neq("estado", "cancelado"),
    c.offer_id ? service.from("lot_offers").select("max_kg").eq("id", c.offer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const suma = (xs: { kg: number | string }[] | null) => (xs ?? []).reduce((s, x) => s + (Number(x.kg) || 0), 0);
  const movido = suma(ventas) + suma(retiros);
  const disponible = disponibleKg == null ? null : Math.round((disponibleKg + movido + suma(sacos)) * 10) / 10;
  const maxOferta = (oferta as { max_kg: number | string | null } | null)?.max_kg;
  return { minimo: Number(c.minimo_kg ?? 0), disponible, movido, maxKg: maxOferta != null ? Number(maxOferta) : null };
}

export type VistaDeRatificacion =
  | { ok: true; datos: Omit<DatosDelContrato, "productorNombre" | "productorDocumento">; actualKg: number; minimoKg: number; disponibleKg: number | null; movidoKg: number; maxKg: number | null }
  | { ok: false; message: string };

export async function previsualizarRatificacion(contractId: string): Promise<VistaDeRatificacion> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const r = await cargarRatificable(service, auth.userId, contractId);
  if (!r.ok) return r;
  const lim = await limitesDeRatificacion(service, r.c);
  // El nombre y el documento los escribe el productor en la pantalla (los que trae la fila, «—» y null, se pisan allí).
  const datos: Omit<DatosDelContrato, "productorNombre" | "productorDocumento"> = datosDeLaFila(r.c, {
    loteNombre: r.lote.name,
    loteReferencia: ctcLotReference(r.c.lot_id),
    cuenta: supplierCode(auth.userId),
    firmante: null,
    ratificadoEl: hoyEnColombia(),
  });
  return { ok: true, datos, actualKg: Number(r.c.quantity_frozen_kg ?? 0), minimoKg: lim.minimo, disponibleKg: lim.disponible, movidoKg: lim.movido, maxKg: lim.maxKg };
}

export async function ratificarContrato(contractId: string, declaradoKg: number, firma: FirmaDeAceptacion): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  // La ratificación es la firma del productor: no se hace en una sesión asistida.
  if (await operadorDeLaAsistida(auth.userId)) {
    return { ok: false, message: "La ratificación es del Productor, desde su propia cuenta: no se hace en una sesión asistida de CTCx." };
  }
  const service = createServiceRoleClient();
  const r = await cargarRatificable(service, auth.userId, contractId);
  if (!r.ok) return r;
  const { c, lote } = r;
  const kg = Number(declaradoKg);
  const lim = await limitesDeRatificacion(service, c);
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, message: "Escriba cuántos kilos de CPS deja declarados." };
  if (kg + 1e-9 < lim.movido) return { ok: false, message: `Ya se vendió o se retiró ${lim.movido} kg de este contrato: no puede declarar menos.` };
  if (lim.maxKg != null && kg > lim.maxKg) return { ok: false, message: `Esta invitación admite hasta ${lim.maxKg} kg.` };
  const v = validarDeclaracion({ kg, minimo: lim.minimo, disponibleKg: lim.disponible });
  if (!v.ok) return { ok: false, message: v.motivo };
  const f = validarFirma(firma);
  if (!f.ok) return { ok: false, message: f.message };
  const documento = documentoDelFirmante(f.documento.tipo, f.documento.numero);
  const sinRetiro = !v.conRetiro;
  const retiroLibrePct = sinRetiro ? 0 : c.ventana_tipo === "ciclo" ? RETIRO_LIBRE_CICLO_PCT : RETIRO_LIBRE_EXTENDIDA_PCT;
  // La fecha del texto sale del MISMO instante que se guarda en `ratificado_at` (la página del contrato la recalcula de ahí).
  const now = new Date().toISOString();
  const ratificadoEl = diaEnColombia(now);
  const texto = textoDelContrato(
    datosDeLaFila(c, {
      loteNombre: lote.name,
      loteReferencia: ctcLotReference(c.lot_id),
      cuenta: supplierCode(auth.userId),
      firmante: { nombre: f.nombre, documento },
      ratificadoEl,
      declaradoKg: kg,
      sinRetiro,
      retiroLibrePct,
    }),
  );
  const huella = createHash("sha256").update(texto, "utf8").digest("hex");
  const rutaFirma = `contratos/contrato-${c.id}/ratificacion-${Date.now()}.png`;
  const { error: errorFirma } = await service.storage.from("kaffetal-media").upload(rutaFirma, f.bytes, { contentType: "image/png", upsert: false });
  if (errorFirma) return { ok: false, message: "No se pudo guardar su firma. Intente de nuevo." };
  const h = await headers();
  const antesKg = Number(c.quantity_frozen_kg ?? 0);
  const { data: hecho, error } = await service
    .from("purchase_contracts")
    .update({
      producer_signed_at: now,
      producer_signer_name: f.nombre,
      producer_signer_doc_tipo: f.documento.tipo,
      producer_signer_doc_numero: f.documento.numero,
      producer_signature_path: rutaFirma,
      producer_signature_meta: { user_agent: h.get("user-agent")?.slice(0, 300) ?? null, ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null, firmado_en: now, ratificacion: true },
      ratificado_at: now,
      quantity_frozen_kg: kg,
      sin_retiro: sinRetiro,
      retiro_libre_pct: retiroLibrePct,
      contract_text_version: CONTRATO_VERSION,
      contract_text_sha256: huella,
    })
    .eq("id", c.id)
    .is("ratificado_at", null)
    .select("id")
    .maybeSingle();
  if (error || !hecho) {
    await service.storage.from("kaffetal-media").remove([rutaFirma]);
    if (error) console.error("ratificarContrato: el update falló", { contractId: c.id, code: error.code, message: error.message, details: error.details });
    return { ok: false, message: error ? `No se pudo ratificar el contrato (código ${error.code}). Intente de nuevo.` : "Este contrato ya fue ratificado." };
  }
  if (kg !== antesKg) {
    if (c.offer_id) await service.from("lot_offers").update({ locked_kg: kg }).eq("id", c.offer_id);
    await sincronizarListado(service, c.lot_id);
  }
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: c.id,
    action: "ratified",
    performed_by: auth.userId,
    notes: `El productor RATIFICÓ y firmó el contrato aceptado provisionalmente (${f.nombre}, ${documento}; texto ${CONTRATO_VERSION}, sha256 ${huella.slice(0, 12)}…)${kg !== antesKg ? ` · ajustó lo declarado de ${antesKg} kg a ${kg} kg` : " · sin cambio en lo declarado"}.`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: `Lote ${lote.name}`,
    lot_id: c.lot_id,
    note: `Usted ratificó y firmó el contrato de su lote ${lote.name}${kg !== antesKg ? ` y ajustó lo declarado a ${kg} kg` : ""}. Su contrato con CTCx queda completo; lo encuentra en «Contratos y Compras».`,
    created_by: auth.userId,
  });
  return { ok: true };
}

// ── V5.169 (owner, 2026-10-06) · la CONTRAOFERTA de una compra de CTCx Selection ─────────────────────────────────────────
// «El Productor puede contestar rebatiendo con una contraoferta, llevándolo de nuevo a OCP para que CTCx responda. Esto puede
// suceder las veces que se quiera hasta que alguno de los dos acepte o desista del todo.» La contraoferta queda en
// `lot_offer_rondas` y la oferta pasa a «contraofertada» (le toca a CTCx en «Pendiente de Oferta» → Abiertas).
export async function contraofertarSeleccion(offerId: string, precioKg: number, kg: number, nota?: string): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: offer } = await service.from("lot_offers").select("id, lot_id, producer_id, status, kind, price_per_kg, lots(name)").eq("id", offerId).maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  if (offer.kind !== "directa") return { ok: false, message: "Solo una compra de CTCx Selection se negocia con contraofertas." };
  if (offer.status !== "emitida") return { ok: false, message: offer.status === "contraofertada" ? "Ya envió una contraoferta: espere la respuesta de CTCx." : "Esta propuesta ya no está abierta." };
  const p = Number(precioKg);
  const q = Number(kg);
  if (!Number.isFinite(p) || p <= 0) return { ok: false, message: "Escriba el precio por kg que propone." };
  if (!Number.isFinite(q) || q <= 0) return { ok: false, message: "Escriba cuántos kilos propone vender." };
  const limpia = nota?.trim().slice(0, 600) || null;
  const { error } = await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "productor", accion: "contraoferta", price_per_kg: p, quantity_kg: q, nota: limpia, created_by: auth.userId });
  if (error) return { ok: false, message: "No se pudo enviar la contraoferta. Intente de nuevo." };
  await service.from("lot_offers").update({ status: "contraofertada" }).eq("id", offerId);
  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) as { name: string } | null;
  await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: "offer_countered", previous_status: "emitida", new_status: "contraofertada", performed_by: auth.userId, notes: `Contraoferta del productor: ${formatCop(p)}/kg · ${q} kg${limpia ? ` · ${limpia.slice(0, 200)}` : ""}` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: lot ? `Lote ${lot.name}` : null, lot_id: offer.lot_id, note: `Usted envió una contraoferta a CTCx Selection: ${formatCop(p)}/kg por ${q} kg. CTCx la responde (acepta, contraoferta o desiste).`, created_by: auth.userId });
  return { ok: true };
}

// ── V5.175 (docs/PLAN_CICLOS.md §2–§4) · la VISTA PREVIA de lo que el productor firmaría hoy ─────────────────────────────────
// La calculadora no decide nada: le pide al servidor la misma cuenta que hará al aceptar (`condicionesDeFirma`).
export type VistaPreviaDeOferta = { ok: true; c: CondicionesDeFirma } | { ok: false; message: string };

export async function previsualizarOferta(offerId: string): Promise<VistaPreviaDeOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: offer } = await service
    .from("lot_offers")
    .select("id, lot_id, producer_id, status, kind, grade_snapshot, price_per_kg, modificador_pct, min_kg, saco_kg, es_renovacion, flete_region, flete_carga, pvc_edition_id, reference_price_source")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  if (offer.kind === "directa") return { ok: false, message: "Una compra de CTCx Selection no lleva ventana." };
  return { ok: true, c: await condicionesDeFirma(service, offer as unknown as OfertaParaVentana, hoyEnColombia()) };
}

// ── V5.175 (docs/PLAN_CICLOS.md §7) · la EXISTENCIA del lote, también cuando la Ficha ya no se edita ───────────────────────────
// El guard de `lots` impide al productor tocar un lote que avanzó en el circuito; la existencia (A2) se registra o reconfirma
// aquí, con service role, solo para su dueño, con auditoría — y se espeja en la Ficha (`datasheet.existencia_cps_kg`).
export async function registrarExistencia(lotId: string, kg: number): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: lot } = await service.from("lots").select("id, producer_id").eq("id", lotId).maybeSingle();
  if (!lot || lot.producer_id !== auth.userId) return { ok: false, message: "Lote no encontrado." };
  // V5.181: un solo escritor de la existencia fuera de la Ficha (lots + A2 + auditoría).
  const r = await guardarExistencia(service, { lotId, kg, porQuien: auth.userId, origen: "productor" });
  return r.ok ? { ok: true } : { ok: false, message: r.error };
}
