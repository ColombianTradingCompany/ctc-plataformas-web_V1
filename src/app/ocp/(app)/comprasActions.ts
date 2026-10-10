"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { edicionVigente, hoyEnColombia } from "@/lib/pvc/servicio";
import { BUCKET_CTCX, BUCKET_CTCX_STAGING, CLAVE_PERFIL_CTCX, EXTENSION_DE_IMAGEN_CTCX, MAX_MB_IMAGEN_CTCX, abandonadasDelStaging } from "@/lib/compras/reglas";
import { errorDeFechas, esDeDespacho, esDestino, fechaCorta, fuenteDePrecioManual, motivoParaNoAnular, motivoParaNoDestinar, notaDeAnulacionAlProductor, notaDeCompraAlProductor } from "@/lib/compras/adquisicion";
import { leerVitrinaDelLote } from "@/lib/compras/adquisicionServidor";
import { cambioAlAnular, cambioAlDestinar, cambioAlRegistrar, esCompraSelection } from "@/lib/compras/selection";
import { TRIAGE_PATH } from "@/lib/triage/fobMinimo";
import { formatCop } from "@/lib/arena/inscriptions";
import { TIPO_MEZCLA_LABEL, esGradoDeMezcla, resumenDeMezcla, tipoDeMezcla, validarCierre, validarComponente, type GradoDeMezcla } from "@/lib/compras/mezclas";
import { SELECT_LOTE_PARA_MEZCLA, cargarMezcla, composicionDelLote } from "@/lib/compras/mezclasServidor";
import { KITS, validarEnvioDeKit, validarItemDeKit, type TipoDeKit } from "@/lib/compras/sampleKits";
import { cargarKit } from "@/lib/compras/sampleKitsServidor";
import { STOCK_PATH, fmtKg } from "@/lib/stock/linaje";
import { COLUMNAS_PARTIDA, aPartida, crearRaizDeStock, mensajeDeLaBase } from "@/lib/stock/servidor";

// ── CTCx Selection · Compras (fase 8 del PLAN_CIRCUITO_DEL_LOTE, V5.85) ──────────────────────
// Folio 8, paso 19, y la decisión 7 del owner. Una compra en firme nace normalmente del PAGO de un mes de un contrato
// `directa`/`black` (`registrarPagoDelMes`, en contractActions.ts); aquí viven la compra registrada A MANO (la casa siempre
// puede documentar lo que compró fuera de la plataforma: la ruta Desacoplada, un acuerdo por WhatsApp), el PERFIL ÚNICO de
// CTCx Selection (respuesta 7 del 23-sep: uno para toda la casa) y la IMAGEN por lote o del perfil (bucket público
// `ctcx-selection`, subida firmada desde el navegador: una acción no carga archivos — Next capa el cuerpo en 1 MB).
// Todas son `emite`: lo que escriben lo lee el comprador en la vitrina.
// V5.203 (owner, 2026-10-10: «CTCx Compras no parece estar funcionando bien»): la nota al productor según el destino (B3), ninguna fecha
// en el futuro (B4), «Es de» sin valor por defecto y con sus reglas (B5), el precio sin «PVC PVC-» (B6), una sola ubicación (B7) y
// ANULAR una compra (B9). Las reglas, puras, en `src/lib/compras/adquisicion.ts`; la base las repite (`2026-10-10_compras_anulacion.sql`).
// V5.203 · corrección (nodo final, 2026-10-10): la IMAGEN de CTCx Selection ya no se publica cruda —se sube a un staging privado con un
// nombre aleatorio y el servidor la re-codifica con sharp (sin EXIF ni GPS) antes de pasarla al bucket público (decisión 1)—; quitarle
// a un lote su ÚLTIMA compra Selection viva borra su imagen (fila y objeto); y quitar o poner la marca Selection a un lote que ya sale
// en la vitrina pide CONFIRMACIÓN (`confirma_vitrina`, decisión 2 / H7) con el texto de lo que cambia (`selection.ts`).

const esUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Decisión 2: si el cambio de la marca Selection cambia la cara de un lote que ya sale en la vitrina, se confirma en el formulario. */
// V5.203 · verificación (nodo final, 2026-10-10): si la vitrina cambió después de abrir la página, el formulario no trae la casilla (la
// pinta la carga de la pantalla) y un error no refresca: el mensaje dice que recargue.
const pideConfirmar = (cambio: string | null, formData: FormData) => (cambio && formData.get("confirma_vitrina") !== "1" ? `${cambio} Si es lo que quiere, márquelo en el formulario para confirmar (si no ve la casilla, recargue la página: la vitrina cambió desde que la abrió).` : null);

const revalida = () => {
  // V5.203: también el Triage y /ocp/kr (leen las compras: la marca Selection y lo declarable).
  for (const r of ["/ocp/compras", "/ocp/ctc-selection", "/ocp/catalogo", TRIAGE_PATH, "/ocp/kr", STOCK_PATH]) revalidatePath(r);
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
  const ubicacion = texto(formData.get("ubicacion"))?.slice(0, 200) ?? null;
  // V5.203: «Es de» NO tiene valor por defecto — quien registra dice qué verá la vitrina (el perfil de CTCx o el lote del productor).
  const destino = texto(formData.get("destino"));
  if (!esDestino(destino)) return { ok: false, error: "Diga de quién es la compra: CTCx Selection o solo stock (cambia lo que ve la vitrina)." };
  if (!lotId) return { ok: false, error: "Elija el lote." };
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos de CPS comprados." };
  if (!Number.isFinite(copKg) || copKg <= 0) return { ok: false, error: "Escriba el precio pagado por kg (COP)." };
  if (!nota) return { ok: false, error: "Una compra registrada a mano lleva su nota: de dónde sale (acuerdo, mensaje, factura…)." };
  // V5.203 (B4): ninguna fecha en el futuro — la de recibo metía el café al stock HOY aunque dijera noviembre.
  const errorFechas = errorDeFechas({ pagadaAt, recibidaAt }, hoyEnColombia());
  if (errorFechas) return { ok: false, error: errorFechas };

  const { data: lot } = await service.from("lots").select("id, name, stage, grade, producer_id").eq("id", lotId).maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "galardonado" || !lot.grade) return { ok: false, error: "Solo se compra en firme un lote galardonado (con grado)." };
  if (lot.grade === "tyrian") return { ok: false, error: "Un Tyrian no se compra en firme: va a subasta." };
  // V5.203 (hueco H15): con un trato por ventana vivo, su saco y su adelanto ya SON compras (nacen al recibirlos en el contrato);
  // registrarlos aquí también los duplicaría. Se pide confirmar que esta es otra compra.
  const { data: tratos } = await service.from("purchase_contracts").select("id, price_per_kg_locked").eq("lot_id", lotId).eq("status", "active").not("ventana_tipo", "is", null).limit(1);
  const trato = ((tratos as { id: string; price_per_kg_locked: number | string | null }[] | null) ?? [])[0];
  if (trato && formData.get("confirma_trato") !== "1") {
    return { ok: false, error: `Ese lote tiene un trato por ventana vivo (a ${formatCop(Number(trato.price_per_kg_locked ?? 0))}/kg): su saco y su adelanto ya son compras de CTCx y nacen solos al recibirlos en el contrato. Si esta compra es otra, márquelo en el formulario.` };
  }
  // V5.203 · corrección (H7, decisión 2): una compra Selection en un lote que YA sale en la vitrina como lote del productor le cambia la
  // cara (rótulo e imagen de CTCx en vez de sus fotos): se confirma, como al quitarla.
  const foto = await leerVitrinaDelLote(service, lotId);
  if (foto && "error" in foto) return { ok: false, error: foto.error };
  const sinConfirmar = pideConfirmar(foto ? cambioAlRegistrar(foto, destino) : null, formData);
  if (sinConfirmar) return { ok: false, error: sinConfirmar };

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
      // V5.203 (B6): el código ya empieza por «PVC-»; antes se guardaba «PVC PVC-…».
      precio_fuente: fuenteDePrecioManual(edicion?.code),
      acordada_at: pagadaAt,
      recibida_at: recibidaAt,
      pagada_at: pagadaAt,
      pago_ref: pagoRef,
      origen: "manual",
      destino,
      nota,
      ubicacion,
      registrada_por: adminId,
    })
    .select("id")
    .single();
  if (error || !fila) return { ok: false, error: "No se pudo registrar la compra: " + (error?.message ?? "sin fila") };

  await service.from("audit_log").insert({ entity_type: "compra", entity_id: fila.id, action: "compra_registrada", performed_by: adminId, notes: `${lot.name} · ${kg} kg · ${formatCop(copKg)}/kg · manual · ${nota.slice(0, 200)}` });
  // V5.195: si ya llegó (tiene fecha de recibo), entra al Stock CTCx en pergamino; si no, entra con «Entrar al stock» cuando llegue.
  let aviso: string | undefined;
  if (recibidaAt) {
    const raiz = await crearRaizDeStock(service, { lotId, estado: "pergamino", kg, costoCopKg: copKg, origen: "compra", compraId: fila.id, ubicacion, nota: `compra a mano · lote ${lot.name}`, por: adminId });
    if (raiz.ok) await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: raiz.id, action: "stock_raiz_compra", performed_by: adminId, notes: `${raiz.codigo ?? ""} · compra a mano · ${kg} kg de pergamino` });
    else {
      // V5.203 (B8): la compra quedó; que no entrara al stock se dice (y queda en el rastro), sin invitar a registrarla otra vez.
      aviso = `La compra quedó registrada, pero no entró al Stock CTCx (${mensajeDeLaBase(raiz.error)}). No la registre otra vez: use «Entrar al stock» en su fila.`;
      await service.from("audit_log").insert({ entity_type: "compra", entity_id: fila.id, action: "compra_sin_stock", performed_by: adminId, notes: mensajeDeLaBase(raiz.error).slice(0, 300) });
    }
    revalidatePath(STOCK_PATH);
  }
  // V5.203 (B3): la nota depende del destino — solo una compra de Selection dice que su café se ofrece como CTCx Selection.
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: notaDeCompraAlProductor({ destino, kg, copKgTexto: formatCop(copKg), pagadaAt }),
    created_by: adminId,
  });
  revalida();
  return aviso ? { ok: true, aviso } : { ok: true };
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

/** El perfil ÚNICO de CTCx Selection (nombre, lema, descripción): el rótulo que la vitrina enseña en un lote de CTCx (V5.203 · H14:
 *  desde la V5.202 ningún lote enseña la finca; el rótulo y la imagen de CTCx van en vez de las fotos del lote). */
export async function guardarPerfilCtcx(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const nombre = texto(formData.get("nombre"));
  if (!nombre) return { ok: false, error: "El perfil necesita un nombre: es el rótulo de CTCx que el comprador ve en un lote de CTCx Selection." };
  const actual = await perfilActual(service);
  const err = await guardarPerfil(service, { ...actual, nombre, lema: texto(formData.get("lema")) ?? "", descripcion: texto(formData.get("descripcion")) ?? "" }, adminId);
  if (err) return { ok: false, error: "No se pudo guardar el perfil: " + err };
  await service.from("audit_log").insert({ entity_type: "platform_setting", entity_id: adminId, action: "ctcx_perfil_guardado", performed_by: adminId, notes: nombre });
  revalida();
  return { ok: true };
}

export type DestinoCtcx = { tipo: "lote"; lotId: string } | { tipo: "perfil" };

/** La carpeta de una imagen (la misma en el staging y en el bucket público). null si el destino no es válido. */
const carpetaDe = (destino: DestinoCtcx): string | null => (destino?.tipo === "perfil" ? "perfil/" : destino?.tipo === "lote" && esUuid(destino.lotId) ? `lotes/${destino.lotId}/` : null);

/** ¿El lote tiene una compra Selection VIVA? Solo entonces la vitrina enseña su imagen (la vista la anula en los demás, sin avisar). */
async function loteConSelectionViva(service: ReturnType<typeof createServiceRoleClient>, lotId: string): Promise<boolean> {
  const { data: cs } = await service.from("compras").select("destino, anulada_at").eq("lot_id", lotId).eq("destino", "selection");
  return ((cs as { destino: string; anulada_at: string | null }[] | null) ?? []).some(esCompraSelection);
}
const SIN_SELECTION_VIVA = "La imagen por lote es de un lote COMPRADO en firme como CTCx Selection: este no tiene compras de Selection vivas (la vitrina no la enseñaría).";

/** V6.1: el barrido del staging — borra las subidas ABANDONADAS (firmadas y nunca fijadas, más viejas que `STAGING_ABANDONO_MS`) de
 *  `perfil/` y de cada `lotes/<id>/`. Corre al pedir una URL nueva, porque es el único momento en que alguien está mirando; informa,
 *  no manda: si falla, la subida sigue. El bucket no se lista desde fuera (solo el service role). */
async function barrerStagingCtcx(service: ReturnType<typeof createServiceRoleClient>): Promise<void> {
  try {
    const bucket = service.storage.from(BUCKET_CTCX_STAGING);
    const carpetas = ["perfil"];
    const { data: lotes } = await bucket.list("lotes", { limit: 1000 });
    for (const l of lotes ?? []) if (!l.id) carpetas.push(`lotes/${l.name}`);
    const ahora = Date.now();
    const borrar: string[] = [];
    for (const carpeta of carpetas) {
      const { data } = await bucket.list(carpeta, { limit: 1000 });
      for (const o of abandonadasDelStaging((data ?? []).filter((x) => !!x.id), ahora)) borrar.push(`${carpeta}/${o.name}`);
    }
    if (borrar.length) await bucket.remove(borrar);
  } catch {
    // El barrido es limpieza: nunca estorba la subida que lo disparó.
  }
}

/** La URL firmada para subir una imagen (del perfil o de un lote comprado) al STAGING privado. V5.203 · corrección (decisión 1): el
 *  nombre es aleatorio (uuid + la extensión de su tipo) —nunca el del archivo, que puede decir la finca— y lo público llega después,
 *  re-codificado por `fijarImagenCtcx`. */
export async function crearUrlDeSubidaCtcx(destino: DestinoCtcx, tipo: string): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const carpeta = carpetaDe(destino);
  if (!carpeta) return { ok: false, error: "Destino de la imagen inválido." };
  const ext = EXTENSION_DE_IMAGEN_CTCX[String(tipo ?? "")];
  if (!ext) return { ok: false, error: "Solo se admiten imágenes JPEG, PNG o WebP." };
  if (destino.tipo === "lote" && !(await loteConSelectionViva(service, destino.lotId))) return { ok: false, error: SIN_SELECTION_VIVA };
  await barrerStagingCtcx(service); // V6.1: lo abandonado se va antes de firmar la subida nueva
  const path = `${carpeta}${randomUUID()}.${ext}`;
  const { data, error } = await service.storage.from(BUCKET_CTCX_STAGING).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

/** La imagen del staging, RE-CODIFICADA: orientada según su EXIF y sin metadatos (sharp no copia EXIF, GPS ni ICC salvo que se le pida),
 *  en WebP, sin pasar de 2000 px por lado (una foto de teléfono no necesita más en la vitrina). null si no es una imagen. */
async function recodificar(buf: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

/** Deja fijada la imagen ya subida al staging: la re-codifica, la publica con otro nombre aleatorio, borra el staging y la anterior. */
export async function fijarImagenCtcx(destino: DestinoCtcx, path: string, alt?: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const carpeta = carpetaDe(destino);
  if (!carpeta) return { ok: false, error: "Destino de la imagen inválido." };
  const subida = String(path ?? "").trim();
  // Solo lo que `crearUrlDeSubidaCtcx` pudo firmar: su carpeta, un uuid y una extensión de imagen.
  if (!subida.startsWith(carpeta) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(subida.slice(carpeta.length))) {
    return { ok: false, error: "Ruta de imagen inválida." };
  }
  const borrarSubida = () => service.storage.from(BUCKET_CTCX_STAGING).remove([subida]);
  if (destino.tipo === "lote" && !(await loteConSelectionViva(service, destino.lotId))) {
    await borrarSubida();
    return { ok: false, error: SIN_SELECTION_VIVA };
  }
  const { data: blob, error: errBajada } = await service.storage.from(BUCKET_CTCX_STAGING).download(subida);
  if (errBajada || !blob) return { ok: false, error: "No se encontró la imagen subida: vuelva a elegirla." };
  const cruda = Buffer.from(await blob.arrayBuffer());
  if (cruda.length > MAX_MB_IMAGEN_CTCX * 1024 * 1024) {
    await borrarSubida();
    return { ok: false, error: `La imagen supera ${MAX_MB_IMAGEN_CTCX} MB.` };
  }
  const webp = await recodificar(cruda);
  if (!webp) {
    await borrarSubida();
    return { ok: false, error: "El archivo no es una imagen que se pueda leer (JPEG, PNG o WebP)." };
  }
  const limpio = `${carpeta}${randomUUID()}.webp`;
  // V5.203 · verificación (nodo final, 2026-10-10): caché CORTA (10 min, como la foto pública del lote en `/api/catalogo/foto`). Con un
  // año, la imagen que se borra al dejar el lote de ser Selection (decisión 1) seguiría servida desde la CDN y los navegadores.
  const { error: errSubida } = await service.storage.from(BUCKET_CTCX).upload(limpio, webp, { contentType: "image/webp", upsert: false, cacheControl: "600" });
  await borrarSubida();
  if (errSubida) return { ok: false, error: "No se pudo publicar la imagen: " + errSubida.message };
  const altText = String(alt ?? "").trim().slice(0, 200) || null;

  let anterior: string | null = null;
  if (destino.tipo === "lote") {
    const { data: prev } = await service.from("ctcx_selection_lotes").select("imagen_path").eq("lot_id", destino.lotId).maybeSingle();
    anterior = prev?.imagen_path ?? null;
    const { error } = await service.from("ctcx_selection_lotes").upsert({ lot_id: destino.lotId, imagen_path: limpio, imagen_alt: altText, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "lot_id" });
    if (error) {
      await service.storage.from(BUCKET_CTCX).remove([limpio]);
      return { ok: false, error: "No se pudo fijar la imagen: " + error.message };
    }
  } else {
    const actual = await perfilActual(service);
    anterior = actual.imagen_path ?? null;
    const err = await guardarPerfil(service, { ...actual, imagen_path: limpio }, adminId);
    if (err) {
      await service.storage.from(BUCKET_CTCX).remove([limpio]);
      return { ok: false, error: "No se pudo fijar la imagen: " + err };
    }
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
  if (!carpetaDe(destino)) return { ok: false, error: "Destino de la imagen inválido." };
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
  const ubicacion = texto(formData.get("ubicacion"))?.slice(0, 200) ?? null;
  const { data: compra } = await service.from("compras").select("id, anulada_at, despacho_id").eq("id", compraId).maybeSingle();
  if (!compra) return { ok: false, error: "Compra no encontrada." };
  if ((compra as { anulada_at: string | null }).anulada_at) return { ok: false, error: "Esa compra está anulada: no se ubica." };
  const { error } = await service.from("compras").update({ ubicacion }).eq("id", compraId);
  if (error) return { ok: false, error: "No se pudo guardar la ubicación: " + mensajeDeLaBase(error.message) };
  // V5.203 (B7): UNA sola verdad — si la compra ya entró al Stock CTCx, su partida raíz lleva la misma ubicación. Corrección (H1/H2): la
  // de un saco o un adelanto puede estar enlazada solo por su despacho (la partida nació sin la compra).
  const despachoId = (compra as { despacho_id: string | null }).despacho_id;
  const { data: porCompra } = await service.from("stock_partidas").select("id, codigo").eq("compra_id", compraId).is("anulada_at", null).maybeSingle();
  const { data: porDespacho } = !porCompra && despachoId ? await service.from("stock_partidas").select("id, codigo").eq("despacho_id", despachoId).is("anulada_at", null).maybeSingle() : { data: null };
  const raiz = porCompra ?? porDespacho;
  let aviso: string | undefined;
  if (raiz) {
    const { error: e2 } = await service.from("stock_partidas").update({ ubicacion }).eq("id", (raiz as { id: string }).id);
    if (e2) aviso = `La compra quedó ubicada, pero su partida ${(raiz as { codigo: string }).codigo} no (${mensajeDeLaBase(e2.message)}): ubíquela en el Stock CTCx.`;
  }
  await service.from("audit_log").insert({ entity_type: "compra", entity_id: compraId, action: "compra_ubicada", performed_by: adminId, notes: `${ubicacion ?? "sin ubicación"}${raiz ? ` · también ${(raiz as { codigo: string }).codigo}` : ""}` });
  revalida();
  return aviso ? { ok: true, aviso } : { ok: true };
}

export async function crearMezcla(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const nombre = texto(formData.get("nombre"));
  const grado = texto(formData.get("grado"));
  if (!nombre) return { ok: false, error: "Póngale nombre a la mezcla." };
  if (!esGradoDeMezcla(grado)) return { ok: false, error: "Solo Black y Red se mezclan (Blue, Gold y Tyrian son casi siempre Single Estate)." };
  const objetivo = objetivoDe(formData);
  if (objetivo === false) return { ok: false, error: "El objetivo de temporada son kilos de CPS mayores que cero (o vacío)." };
  const { data, error } = await service
    .from("mezclas")
    .insert({ nombre, grado, nota: texto(formData.get("nota")), temporada: texto(formData.get("temporada")), objetivo_temporada_kg: objetivo, created_by: adminId })
    .select("id, codigo")
    .single();
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
  const { data: compra } = await service.from("compras").select(`id, kg, grado, destino, anulada_at, ${SELECT_LOTE_PARA_MEZCLA}`).eq("id", compraId).maybeSingle();
  if (!compra) return { ok: false, error: "Compra no encontrada." };
  // V5.203: una compra anulada no entra a una mezcla (la base lo repite en `guard_mezcla_componente`); y «es Selection» con la regla única.
  if (compra.anulada_at) return { ok: false, error: "Esa compra está anulada." };
  if (!esCompraSelection(compra)) return { ok: false, error: "Esa compra es solo stock: las mezclas de CTCx Selection se arman con compras de Selection." };
  const comp = composicionDelLote(compra.lots as Parameters<typeof composicionDelLote>[0]);
  const { data: asignadoRaw } = await service.from("mezcla_componentes").select("kg, mezclas!inner(status)").eq("compra_id", compraId).neq("mezclas.status", "anulada");
  const asignado = ((asignadoRaw as { kg: number | string }[] | null) ?? []).reduce((a, r) => a + Number(r.kg), 0);
  // V5.195: si la compra ya está en el Stock CTCx, lo libre lo dice su raíz (lo trillado, lo que salió o está en un kit ya no
  // está libre; `stock_disponible` ya descuenta lo asignado a mezclas). Así un mismo kilo no va a una mezcla y a un kit.
  const { data: raiz } = await service.from("stock_partidas").select("id").eq("compra_id", compraId).is("anulada_at", null).maybeSingle();
  const libreEnStock = raiz ? Number((await service.rpc("stock_disponible", { p_partida: (raiz as { id: string }).id })).data ?? 0) : Number.POSITIVE_INFINITY;
  const nuevo = {
    compraId,
    kg,
    producerId: comp.producerId,
    fincaId: comp.fincaId,
    departamento: comp.departamento,
    variedad: comp.variedad,
    proceso: comp.proceso,
    fincaIds: comp.fincaIds,
    departamentos: comp.departamentos,
    variedades: comp.variedades,
    procesos: comp.procesos,
    grado: compra.grado,
    disponibleKg: Math.max(0, Math.round(Math.min(Number(compra.kg) - asignado, libreEnStock) * 10) / 10),
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
  // El TIPO se deriva de la composición (owner, 2026-09-25); la base lo vuelve a derivar y no deja cerrar si no coincide.
  const tipo = tipoDeMezcla(mezcla.componentes).tipo;
  const { error } = await service.from("mezclas").update({ status: "cerrada", tipo }).eq("id", mezclaId);
  if (error) return { ok: false, error: "La base no dejó cerrar la mezcla: " + error.message };
  const r = resumenDeMezcla(mezcla.componentes);
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_cerrada", performed_by: adminId, notes: `${mezcla.codigo} · ${tipo ? TIPO_MEZCLA_LABEL[tipo] : "sin tipo"} · ${r.componentes} lotes · ${r.estates} estates · ${r.kgTotal} kg (${r.cargas} cargas${r.cubreMoq ? "" : ", bajo el MOQ"})${r.variedades.length ? ` · ${r.variedades.join(", ")}` : ""}${r.regiones.length ? ` · ${r.regiones.join(", ")}` : ""}` });
  revalidaMezclas(mezclaId);
  return { ok: true };
}

/** El objetivo de temporada: `null` si viene vacío, `false` si no es un número mayor que cero. */
const objetivoDe = (formData: FormData): number | null | false => {
  const crudo = texto(formData.get("objetivo_temporada_kg"));
  if (!crudo) return null;
  const n = kgDe(crudo);
  return Number.isFinite(n) && n > 0 ? n : false;
};

/** V5.91 (owner, 2026-09-25): «para estas mezclas CTCx asegura un mínimo por temporada desde Adquisición». Informativo. `emite`. */
export async function guardarObjetivoDeMezcla(mezclaId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: m } = await service.from("mezclas").select("status, codigo").eq("id", mezclaId).maybeSingle();
  if (!m) return { ok: false, error: "Mezcla no encontrada." };
  if (m.status === "anulada") return { ok: false, error: "Una mezcla anulada no lleva objetivo." };
  const objetivo = objetivoDe(formData);
  if (objetivo === false) return { ok: false, error: "El objetivo de temporada son kilos de CPS mayores que cero (o vacío)." };
  const temporada = texto(formData.get("temporada"));
  const { error } = await service.from("mezclas").update({ temporada, objetivo_temporada_kg: objetivo }).eq("id", mezclaId);
  if (error) return { ok: false, error: "No se pudo guardar el objetivo: " + error.message };
  await service.from("audit_log").insert({ entity_type: "mezcla", entity_id: mezclaId, action: "mezcla_objetivo", performed_by: adminId, notes: `${m.codigo} · ${temporada ?? "sin temporada"} · ${objetivo ?? "sin objetivo"} kg` });
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

// ── V5.90 (owner, 2026-09-25): «Adquisición de Stock Café» y los Sample Kits — sobre el Stock CTCx desde la V5.195 ─────────
// Cada compra dice si es de CTCx Selection o solo stock (`compras.destino`); los kits (CP · Plus · Max) que salen a un Master
// Roaster, un comprador o una región se arman con PARTIDAS del Stock CTCx (owner, 2026-10-09: «el Stock CTCx absorberá Stock de
// Sample Kits»). La regla vive en `src/lib/compras/sampleKits.ts` (puro) y los guards de la base repiten lo esencial
// (componentes solo con el kit armado; lo asignado nunca supera el disponible de la partida; al enviarse, sale del stock).

/** V5.203 · corrección (decisión 1 del nodo final): si al lote ya no le queda ninguna compra Selection viva, su imagen de CTCx Selection
 *  se borra —la fila de `ctcx_selection_lotes` y el objeto público—: la vista ya no la enseñaba, pero el archivo seguía servido. Devuelve
 *  el aviso si algo no se pudo (lo principal ya se hizo: nunca se calla). */
async function limpiarImagenSiYaNoEsSelection(service: ReturnType<typeof createServiceRoleClient>, lotId: string, adminId: string): Promise<string | null> {
  const { data: vivas, error } = await service.from("compras").select("id").eq("lot_id", lotId).eq("destino", "selection").is("anulada_at", null).limit(1);
  if (error) return `No se pudo comprobar si el lote sigue siendo CTCx Selection (${mensajeDeLaBase(error.message)}): revise su imagen en Oferta desde CTCx Selection.`;
  if (((vivas as unknown[] | null) ?? []).length) return null;
  const { data: fila } = await service.from("ctcx_selection_lotes").select("imagen_path").eq("lot_id", lotId).maybeSingle();
  if (!fila) return null;
  const ruta = (fila as { imagen_path: string | null }).imagen_path;
  const { error: e1 } = await service.from("ctcx_selection_lotes").delete().eq("lot_id", lotId);
  if (e1) return `La imagen de CTCx Selection del lote no se pudo quitar (${mensajeDeLaBase(e1.message)}).`;
  if (ruta) {
    const { error: e2 } = await service.storage.from(BUCKET_CTCX).remove([ruta]);
    if (e2) return `La imagen de CTCx Selection del lote se desvinculó, pero su archivo no se pudo borrar (${e2.message}).`;
  }
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: lotId, action: "ctcx_imagen_quitada", performed_by: adminId, notes: `${ruta ?? "sin archivo"} · el lote ya no tiene compras CTCx Selection vivas` });
  return null;
}

const revalidaKits = (id?: string) => {
  revalida();
  revalidatePath(STOCK_PATH);
  revalidatePath(`${STOCK_PATH}/sample-kits`);
  if (id) revalidatePath(`${STOCK_PATH}/sample-kits/${id}`);
};

/** Si una compra es de CTCx Selection (en la vitrina el lote sale con el rótulo y la imagen de CTCx) o solo stock. Cambia lo que lee el comprador: `emite`. */
export async function destinarCompra(compraId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const destino = texto(formData.get("destino"));
  if (!esDestino(destino)) return { ok: false, error: "La compra es de CTCx Selection o solo stock." };
  const { data: c } = await service.from("compras").select("id, lot_id, destino, precio_fuente, anulada_at, despacho_id").eq("id", compraId).maybeSingle();
  if (!c) return { ok: false, error: "Compra no encontrada." };
  const compra = c as { id: string; lot_id: string; destino: "selection" | "stock"; precio_fuente: string | null; anulada_at: string | null; despacho_id: string | null };
  // V5.203 (B5): «Es de» no cambia si la compra está en una mezcla viva (a stock), si es un saco o un adelanto de un trato por ventana
  // (a Selection: le pondría el rótulo de CTCx a un lote que se vende a nombre del productor) o si su LOTE tiene café declarado vivo en el
  // Catálogo Activo (la marca va por lote: cambiaría la vitrina sin aviso). `guard_compra` lo repite en la base.
  const [{ data: mz }, { data: raiz }, { data: cf }] = await Promise.all([
    service.from("mezcla_componentes").select("id, mezclas!inner(status)").eq("compra_id", compraId).neq("mezclas.status", "anulada").limit(1),
    service.from("stock_partidas").select("despacho_id").eq("compra_id", compraId).maybeSingle(),
    service.from("catalogo_fuentes").select("codigo").eq("lot_id", compra.lot_id).eq("estado", "declarada").order("created_at").limit(1),
  ]);
  const motivo = motivoParaNoDestinar({
    actual: compra.destino,
    nuevo: destino,
    anulada: !!compra.anulada_at,
    enMezclaViva: ((mz as unknown[] | null) ?? []).length > 0,
    // Corrección (H1/H2): también por el despacho de la propia compra (la de un reintento no está enlazada a su partida).
    deDespacho: esDeDespacho({ precioFuente: compra.precio_fuente, raizDespachoId: compra.despacho_id ?? (raiz as { despacho_id: string | null } | null)?.despacho_id }),
    declaracionViva: ((cf as { codigo: string }[] | null) ?? [])[0]?.codigo ?? null,
  });
  if (motivo) return { ok: false, error: motivo };
  if (compra.destino === destino) return { ok: true };
  // V5.203 · corrección (decisión 2): quitarle (o ponerle) a un lote que ya sale en la vitrina su marca Selection le cambia la cara.
  const foto = await leerVitrinaDelLote(service, compra.lot_id);
  if (foto && "error" in foto) return { ok: false, error: foto.error };
  const sinConfirmar = pideConfirmar(foto ? cambioAlDestinar(foto, compraId, destino) : null, formData);
  if (sinConfirmar) return { ok: false, error: sinConfirmar };
  const { error } = await service.from("compras").update({ destino }).eq("id", compraId);
  if (error) return { ok: false, error: "No se pudo cambiar el destino: " + mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "compra", entity_id: compraId, action: "compra_destinada", performed_by: adminId, previous_status: compra.destino, new_status: destino });
  const aviso = destino === "stock" ? await limpiarImagenSiYaNoEsSelection(service, compra.lot_id, adminId) : null;
  revalidaKits();
  return aviso ? { ok: true, aviso } : { ok: true };
}

/** V5.203 (owner, 2026-10-10 · bug B9): ANULA una compra registrada a mano por error —la fila no se borra: queda tachada con su motivo—
 *  y, en la misma transacción (`compra_anular`), su partida raíz del Stock CTCx. Solo si la compra no está en una mezcla viva y su raíz
 *  no se movió (ni trilla, ni salidas, ni kits, ni declaración viva en el Triage). Avisa al productor sin repetir el motivo interno.
 *  `emite`: cambia lo que cuentan CTCx Selection, el Triage y la vitrina. */
export async function anularCompra(compraId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const motivo = texto(formData.get("motivo"));
  if (!motivo || motivo.length < 3) return { ok: false, error: "Anular una compra lleva su motivo (queda en el rastro)." };
  if (motivo.length > 300) return { ok: false, error: "El motivo va hasta 300 caracteres." };
  const { data: c } = await service.from("compras").select("id, lot_id, kg, origen, destino, anulada_at, created_at, lots(name, producer_id)").eq("id", compraId).maybeSingle();
  if (!c) return { ok: false, error: "Compra no encontrada." };
  const compra = c as unknown as { id: string; lot_id: string; kg: number | string; origen: string; destino: string; anulada_at: string | null; created_at: string; lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null };
  const lot = Array.isArray(compra.lots) ? compra.lots[0] ?? null : compra.lots;
  const [{ data: mz }, { data: r }] = await Promise.all([
    service.from("mezcla_componentes").select("id, mezclas!inner(status)").eq("compra_id", compraId).neq("mezclas.status", "anulada").limit(1),
    service.from("stock_partidas").select("id, codigo, anulada_at").eq("compra_id", compraId).maybeSingle(),
  ]);
  const raiz = r as { id: string; codigo: string; anulada_at: string | null } | null;
  const raizViva = raiz && !raiz.anulada_at ? raiz : null;
  const conMovimientos = raizViva ? !!(await service.rpc("stock_tiene_movimientos", { p_partida: raizViva.id })).data : false;
  const motivoNo = motivoParaNoAnular({ anulada: !!compra.anulada_at, origen: compra.origen, enMezclaViva: ((mz as unknown[] | null) ?? []).length > 0, raizCodigo: raizViva?.codigo ?? null, raizConMovimientos: conMovimientos });
  if (motivoNo) return { ok: false, error: motivoNo };
  // V5.203 · corrección (decisión 2): anular la última compra Selection de un lote que sigue en la vitrina le cambia la cara.
  const foto = await leerVitrinaDelLote(service, compra.lot_id);
  if (foto && "error" in foto) return { ok: false, error: foto.error };
  const sinConfirmar = pideConfirmar(foto ? cambioAlAnular(foto, compraId, raizViva?.id ?? null) : null, formData);
  if (sinConfirmar) return { ok: false, error: sinConfirmar };
  const { error } = await service.rpc("compra_anular", { p_compra: compraId, p_motivo: motivo, p_por: adminId });
  if (error) return { ok: false, error: "No se pudo anular la compra: " + mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "compra", entity_id: compraId, action: "compra_anulada", performed_by: adminId, previous_status: "registrada", new_status: "anulada", notes: `${lot?.name ?? ""} · ${Number(compra.kg)} kg${raizViva ? ` · anulada también ${raizViva.codigo}` : ""} · ${motivo.slice(0, 250)}` });
  if (raizViva) await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: raizViva.id, action: "stock_raiz_anulada", performed_by: adminId, notes: `${raizViva.codigo} · compra anulada · ${motivo.slice(0, 250)}` });
  if (lot) {
    await service.from("producer_comm_log").insert({
      producer_id: lot.producer_id,
      context_label: `Lote ${lot.name}`,
      lot_id: compra.lot_id,
      note: notaDeAnulacionAlProductor({ kg: Number(compra.kg), registradaEl: fechaCorta(compra.created_at) }),
      created_by: adminId,
    });
  }
  const aviso = compra.destino === "selection" ? await limpiarImagenSiYaNoEsSelection(service, compra.lot_id, adminId) : null;
  revalidaMezclas();
  return aviso ? { ok: true, aviso } : { ok: true };
}

export async function crearKit(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const tipo = texto(formData.get("tipo")) as TipoDeKit | null;
  if (!tipo || !(tipo in KITS)) return { ok: false, error: "Elija el tipo de kit (CP · Plus · Max)." };
  const destino = texto(formData.get("destino"));
  const pedidoId = texto(formData.get("pedido_id"));
  if (pedidoId) {
    const { data: pedido } = await service.from("sample_pack_orders").select("id, status").eq("id", pedidoId).maybeSingle();
    if (!pedido) return { ok: false, error: "Pedido no encontrado." };
    if (pedido.status === "enviado") return { ok: false, error: "Ese pedido ya salió." };
  }
  const { data, error } = await service.from("sample_kits").insert({ tipo, destino, pedido_id: pedidoId, notas: texto(formData.get("notas")), created_by: adminId }).select("id, codigo").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el kit: " + (error?.message ?? "sin fila") };
  await service.from("audit_log").insert({ entity_type: "sample_kit", entity_id: data.id, action: "kit_armado", performed_by: adminId, notes: `${data.codigo} · ${KITS[tipo].nombre}${destino ? ` · ${destino}` : ""}` });
  revalidaKits(data.id);
  return { ok: true };
}

export async function agregarLoteAlKit(kitId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const partidaId = texto(formData.get("partida_id"));
  const kg = kgDe(formData.get("kg"));
  if (!partidaId) return { ok: false, error: "Elija la partida del Stock CTCx." };
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos que salen de la partida." };
  const kit = await cargarKit(service, kitId);
  if (!kit) return { ok: false, error: "Kit no encontrado." };
  if (kit.status !== "armado") return { ok: false, error: "Los lotes de un kit solo cambian mientras está armado." };
  const { data: fila } = await service.from("stock_partidas").select(COLUMNAS_PARTIDA).eq("id", partidaId).maybeSingle();
  if (!fila) return { ok: false, error: "Partida no encontrada." };
  const partida = aPartida(fila as Parameters<typeof aPartida>[0]);
  if (partida.anulada || !partida.lotId) return { ok: false, error: "Esa partida está anulada o no tiene lote." };
  const { data: disp } = await service.rpc("stock_disponible", { p_partida: partida.id });
  const nuevo = { partidaId: partida.id, lotId: partida.lotId, kg, disponibleKg: Math.round(Number(disp ?? 0) * 1000) / 1000, contenido: partida.contenido, comprometido: partida.comprometido };
  const errores = validarItemDeKit(kit.tipo, kit.items, nuevo);
  if (errores.length) return { ok: false, error: errores.join(" ") };
  const { error } = await service.from("sample_kit_items").insert({ kit_id: kitId, partida_id: partida.id, kg });
  if (error) return { ok: false, error: "No se pudo añadir el lote al kit: " + mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "sample_kit", entity_id: kitId, action: "kit_lote_anadido", performed_by: adminId, notes: `${partida.codigo} · ${fmtKg(kg)} kg de ${partida.estado}` });
  revalidaKits(kitId);
  return { ok: true };
}

export async function quitarItemDelKit(kitId: string, itemId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: k } = await service.from("sample_kits").select("status").eq("id", kitId).maybeSingle();
  if (!k) return { ok: false, error: "Kit no encontrado." };
  if (k.status !== "armado") return { ok: false, error: "Los lotes de un kit solo cambian mientras está armado." };
  const { error } = await service.from("sample_kit_items").delete().eq("id", itemId).eq("kit_id", kitId);
  if (error) return { ok: false, error: "No se pudo quitar el lote: " + error.message };
  await service.from("audit_log").insert({ entity_type: "sample_kit", entity_id: kitId, action: "kit_lote_quitado", performed_by: adminId, notes: itemId.slice(0, 8) });
  revalidaKits(kitId);
  return { ok: true };
}

/** El kit sale de la casa (a un MR, un comprador o una región): completo, con guía. Si viene de un pedido de la tienda, el pedido queda
 *  enviado. Sus kilos SALEN del Stock CTCx solos (`stock_kit_estado`, en la base). `emite`. */
export async function marcarKitEnviado(kitId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const kit = await cargarKit(service, kitId);
  if (!kit) return { ok: false, error: "Kit no encontrado." };
  if (kit.status !== "armado") return { ok: false, error: "Solo se envía un kit armado." };
  const errores = validarEnvioDeKit(kit.tipo, kit.items);
  if (errores.length) return { ok: false, error: errores.join(" ") };
  const guia = texto(formData.get("guia"));
  const notas = texto(formData.get("notas")) ?? kit.notas;
  const now = new Date().toISOString();
  const { error } = await service.from("sample_kits").update({ status: "enviado", enviado_at: now, guia, notas }).eq("id", kitId);
  if (error) return { ok: false, error: "No se pudo marcar el envío: " + error.message };
  if (kit.pedidoId) {
    await service.from("sample_pack_orders").update({ status: "enviado", enviado_at: now, enviado_por: adminId, guia, notas_ctc: notas }).eq("id", kit.pedidoId).neq("status", "enviado");
  }
  await service.from("audit_log").insert({ entity_type: "sample_kit", entity_id: kitId, action: "kit_enviado", performed_by: adminId, notes: `${kit.codigo} · ${KITS[kit.tipo].nombre} · ${kit.items.length} lotes${kit.destino ? ` → ${kit.destino}` : ""}${guia ? ` · guía ${guia}` : ""}` });
  revalidaKits(kitId);
  revalidatePath("/ocp/muestras");
  return { ok: true };
}

export async function anularKit(kitId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const motivo = texto(formData.get("motivo"));
  if (!motivo) return { ok: false, error: "Anular lleva motivo." };
  const { data: k } = await service.from("sample_kits").select("status, codigo").eq("id", kitId).maybeSingle();
  if (!k) return { ok: false, error: "Kit no encontrado." };
  if (k.status === "anulado") return { ok: false, error: "Ya estaba anulado." };
  const { error } = await service.from("sample_kits").update({ status: "anulado", anulado_motivo: motivo, anulado_at: new Date().toISOString() }).eq("id", kitId);
  if (error) return { ok: false, error: "No se pudo anular: " + error.message };
  await service.from("audit_log").insert({ entity_type: "sample_kit", entity_id: kitId, action: "kit_anulado", performed_by: adminId, previous_status: k.status, new_status: "anulado", notes: `${k.codigo} · ${motivo.slice(0, 300)}` });
  revalidaKits(kitId);
  return { ok: true };
}
