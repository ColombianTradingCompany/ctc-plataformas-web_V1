"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { codigoDirectorio, hace, iniciales } from "@/components/directorio/data";
import type { DirectorioEstado, FichaDoc } from "@/lib/directorio/types";

// ── ECP · administración del Directorio del Café ────────────────────────────
// Verificación de fichas (Aceptar / Revisar / Rechazar — solo Aceptar emite el
// Código de Verificado) y moderación del muro. Todas las tablas directorio_*
// son service-role-only; cada acción reautentica con requireActiveAdmin().

export type AdminResult = { ok: true } | { ok: false; error: string };

export type AdminUsuario = {
  profileId: string;
  codigo: string;
  nombre: string;
  correo: string | null;
  departamento: string;
  municipio: string;
  estado: DirectorioEstado;
  esp: string[];
  cert: string[];
  avatarUrl: string | null;
  creado: string;
};

export type AdminMensaje = { id: string; ctc: boolean; texto: string; hora: string };

export type AdminFicha = AdminUsuario & {
  telefono: string;
  anios: number;
  bio: string;
  motivoTxt: string;
  smsNotifications: boolean;
  documentos: FichaDoc[];
  conversacion: AdminMensaje[];
};

export type AdminPost = {
  id: string;
  autor: string;
  ini: string;
  color: string;
  etiqueta: string;
  texto: string;
  fijo: boolean;
  estado: string;
  cuando: string;
  esCtc: boolean;
};

// Un soporte de certificación en la cola de verificación de CTC: quién lo subió,
// qué certificación respalda, el documento en sí y el veredicto actual.
export type AdminCertificado = {
  docId: string;
  profileId: string;
  autor: string;
  codigo: string;
  ini: string;
  color: string;
  avatarUrl: string | null;
  certificacion: string; // enlace_valor
  docNombre: string;
  docTipo: string;
  docUrl: string | null;
  docKind: "file" | "url";
  verificacion: "pendiente" | "aprobado" | "rechazado";
  verdictoNota: string | null;
  removerDespuesDe: string | null;
  creado: string; // relativo
};

export type DirectorioAdminData = {
  usuarios: AdminUsuario[];
  kpis: { total: number; pendientes: number; enRevision: number; verificados: number; rechazados: number };
  posts: AdminPost[];
  certificados: AdminCertificado[];
};

type Row = Record<string, unknown>;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
const clamp = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

async function emails(service: ReturnType<typeof createServiceRoleClient>, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>();
  const { data } = await service.from("profiles").select("id, email").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [String(p.id), (p.email as string) ?? null]));
}

function mapUsuario(r: Row, correo: string | null, avatarUrl: string | null): AdminUsuario {
  const id = String(r.profile_id);
  return {
    profileId: id,
    codigo: codigoDirectorio(id),
    nombre: String(r.nombre ?? ""),
    correo,
    departamento: String(r.departamento ?? ""),
    municipio: String(r.municipio ?? ""),
    estado: (r.estado as DirectorioEstado) ?? "pendiente",
    esp: (r.especialidades as string[]) ?? [],
    cert: (r.certificaciones as string[]) ?? [],
    avatarUrl,
    creado: String(r.created_at ?? ""),
  };
}

export async function listarDirectorioAdmin(): Promise<DirectorioAdminData> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: rows } = await service.from("directorio_profiles").select("*").order("created_at", { ascending: false });
  const fichas = rows ?? [];
  const emailBy = await emails(service, fichas.map((r) => String(r.profile_id)));
  const avatarUrls = await signedKaffetalMediaUrls(service, fichas.map((r) => r.avatar_asset_id).filter(Boolean).map(String));
  const usuarios = fichas.map((r) =>
    mapUsuario(
      r,
      emailBy.get(String(r.profile_id)) ?? null,
      r.avatar_asset_id ? avatarUrls.get(String(r.avatar_asset_id)) ?? null : null
    )
  );

  const kpis = {
    total: usuarios.length,
    pendientes: usuarios.filter((u) => u.estado === "pendiente").length,
    enRevision: usuarios.filter((u) => u.estado === "en_revision").length,
    verificados: usuarios.filter((u) => u.estado === "verificado").length,
    rechazados: usuarios.filter((u) => u.estado === "rechazado").length,
  };

  const { data: postRows } = await service.from("directorio_posts").select("*").order("created_at", { ascending: false }).limit(200);
  const prows = postRows ?? [];
  const authorIds = prows.map((p) => p.author_profile_id).filter(Boolean).map(String);
  const { data: authors } = authorIds.length
    ? await service.from("directorio_profiles").select("profile_id, nombre, color").in("profile_id", [...new Set(authorIds)])
    : { data: [] as Row[] };
  const byId = new Map((authors ?? []).map((a) => [String(a.profile_id), a]));

  const posts: AdminPost[] = prows.map((p) => {
    const a = p.author_profile_id ? byId.get(String(p.author_profile_id)) : null;
    const nombre = a ? String(a.nombre ?? "") : "Colombian Trading Company";
    return {
      id: String(p.id),
      autor: nombre,
      ini: a ? iniciales(nombre) : "CT",
      color: a ? String(a.color ?? "#2A0A55") : "#2A0A55",
      etiqueta: String(p.etiqueta ?? "Anuncio"),
      texto: String(p.texto ?? ""),
      fijo: !!p.fijo,
      estado: String(p.estado ?? "publicado"),
      cuando: hace(String(p.created_at)),
      esCtc: !p.author_profile_id,
    };
  });

  const certificados = await loadCertificados(service);

  return { usuarios, kpis, posts, certificados };
}

// Cola de verificación de certificados: pendientes primero (accionables), luego
// los ya resueltos como referencia. Ordena por antigüedad dentro de cada grupo.
async function loadCertificados(service: ReturnType<typeof createServiceRoleClient>): Promise<AdminCertificado[]> {
  const { data } = await service
    .from("directorio_documents")
    .select("*")
    .eq("enlaza_a", "certificacion")
    .not("verificacion", "is", null)
    .order("created_at", { ascending: true });
  const docs = data ?? [];
  if (!docs.length) return [];

  const ownerIds = [...new Set(docs.map((d) => String(d.profile_id)))];
  const { data: owners } = await service
    .from("directorio_profiles")
    .select("profile_id, nombre, color, avatar_asset_id")
    .in("profile_id", ownerIds);
  const byId = new Map((owners ?? []).map((o) => [String(o.profile_id), o]));
  const fileIds = docs.filter((d) => d.kind === "file" && d.asset_id).map((d) => String(d.asset_id));
  const avatarIds = (owners ?? []).map((o) => o.avatar_asset_id).filter(Boolean).map(String);
  const signed = await signedKaffetalMediaUrls(service, [...fileIds, ...avatarIds]);

  const items = docs.map((d): AdminCertificado => {
    const owner = byId.get(String(d.profile_id));
    const nombre = owner ? String(owner.nombre ?? "") : "(sin nombre)";
    const kind = d.kind === "url" ? "url" : "file";
    return {
      docId: String(d.id),
      profileId: String(d.profile_id),
      autor: nombre,
      codigo: codigoDirectorio(String(d.profile_id)),
      ini: iniciales(nombre),
      color: owner ? String(owner.color ?? "#2A0A55") : "#2A0A55",
      avatarUrl: owner?.avatar_asset_id ? signed.get(String(owner.avatar_asset_id)) ?? null : null,
      certificacion: String(d.enlace_valor ?? ""),
      docNombre: String(d.nombre ?? ""),
      docTipo: String(d.tipo ?? ""),
      docUrl: kind === "url" ? ((d.url as string) ?? null) : d.asset_id ? signed.get(String(d.asset_id)) ?? null : null,
      docKind: kind,
      verificacion: (d.verificacion as AdminCertificado["verificacion"]) ?? "pendiente",
      verdictoNota: (d.verdicto_nota as string) ?? null,
      removerDespuesDe: (d.remover_despues_de as string) ?? null,
      creado: hace(String(d.created_at)),
    };
  });

  // Pendientes primero (los que hay que atender), luego resueltos.
  const rank = (v: string) => (v === "pendiente" ? 0 : 1);
  return items.sort((a, b) => rank(a.verificacion) - rank(b.verificacion));
}

export async function cargarFichaAdmin(profileId: string): Promise<AdminFicha | null> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: r } = await service.from("directorio_profiles").select("*").eq("profile_id", profileId).maybeSingle();
  if (!r) return null;
  const emailBy = await emails(service, [profileId]);

  const { data: docRows } = await service.from("directorio_documents").select("*").eq("profile_id", profileId).order("created_at", { ascending: true });
  const docs = docRows ?? [];
  const fileIds = docs.filter((d) => d.kind === "file" && d.asset_id).map((d) => String(d.asset_id));
  const avatarId = r.avatar_asset_id ? String(r.avatar_asset_id) : null;
  const signed = await signedKaffetalMediaUrls(service, [...fileIds, ...(avatarId ? [avatarId] : [])]);
  const documentos: FichaDoc[] = docs.map((d) => ({
    id: String(d.id),
    kind: d.kind === "url" ? "url" : "file",
    url: d.kind === "url" ? ((d.url as string) ?? null) : d.asset_id ? signed.get(String(d.asset_id)) ?? null : null,
    nombre: String(d.nombre ?? ""),
    tipo: String(d.tipo ?? ""),
    enlazaA: (d.enlaza_a as FichaDoc["enlazaA"]) ?? null,
    enlaceValor: (d.enlace_valor as string) ?? null,
    tam: null,
    verificacion: (d.verificacion as FichaDoc["verificacion"]) ?? null,
    verdictoNota: (d.verdicto_nota as string) ?? null,
    removerDespuesDe: (d.remover_despues_de as string) ?? null,
  }));

  const { data: msgs } = await service
    .from("directorio_messages")
    .select("*")
    .eq("owner_profile_id", profileId)
    .eq("canal", "ecp")
    .order("created_at", { ascending: true });
  const conversacion: AdminMensaje[] = (msgs ?? []).map((m) => ({
    id: String(m.id),
    ctc: !!m.is_ctc,
    texto: String(m.texto),
    hora: hora(String(m.created_at)),
  }));

  return {
    ...mapUsuario(r, emailBy.get(profileId) ?? null, avatarId ? signed.get(avatarId) ?? null : null),
    telefono: String(r.telefono ?? ""),
    anios: Number(r.anios_experiencia ?? 0),
    bio: String(r.bio ?? ""),
    motivoTxt: String(r.motivo_txt ?? ""),
    smsNotifications: r.sms_notifications === true,
    documentos,
    conversacion,
  };
}

// ── Verdictos ─────────────────────────────────────────────────────────────────

async function postCtc(service: ReturnType<typeof createServiceRoleClient>, adminId: string, ownerId: string, texto: string) {
  await service.from("directorio_messages").insert({
    canal: "ecp", owner_profile_id: ownerId, from_profile_id: adminId, to_profile_id: ownerId, is_ctc: true, texto,
  });
}

async function logVerdicto(
  service: ReturnType<typeof createServiceRoleClient>,
  adminId: string, ownerId: string, action: string, prev: string, next: string, nota: string | null,
  entityType = "directorio_profile", entityId = ownerId
) {
  await service.from("audit_log").insert({
    entity_type: entityType, entity_id: entityId, action, previous_status: prev, new_status: next, performed_by: adminId, notes: nota,
  });
}

// Aceptar VERIFICA directo (2026-07-24): 'aprobado' y el paso de "ingresar
// código" se eliminaron — Aceptar es lo mismo que verificar. La cuenta gana
// acceso completo de inmediato en su próxima carga.
export async function aceptarFicha(profileId: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: r } = await service.from("directorio_profiles").select("estado").eq("profile_id", profileId).maybeSingle();
  if (!r) return { ok: false, error: "Ficha no encontrada." };
  if (r.estado === "verificado") return { ok: false, error: "Esta ficha ya está verificada." };

  await service
    .from("directorio_profiles")
    .update({ estado: "verificado", verificado_at: new Date().toISOString(), verdicto_por: adminId, verdicto_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("profile_id", profileId);
  await postCtc(
    service, adminId, profileId,
    "¡Buenas noticias! Tu ficha fue verificada por CTC. Tu cuenta ya está activa: ya puedes ver todo el directorio, el muro y escribir a otros especialistas."
  );
  await logVerdicto(service, adminId, profileId, "aceptar", String(r.estado), "verificado", null);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function revisarFicha(profileId: string, nota: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const n = clamp(nota, 2000);
  if (!n) return { ok: false, error: "Escribe qué información le pides al usuario." };
  const service = createServiceRoleClient();
  const { data: r } = await service.from("directorio_profiles").select("estado").eq("profile_id", profileId).maybeSingle();
  if (!r) return { ok: false, error: "Ficha no encontrada." };
  if (r.estado === "verificado") return { ok: false, error: "Esta ficha ya está verificada." };

  await service.from("directorio_profiles").update({ estado: "en_revision", verdicto_por: adminId, verdicto_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("profile_id", profileId);
  await postCtc(service, adminId, profileId, n);
  await logVerdicto(service, adminId, profileId, "revisar", String(r.estado), "en_revision", n);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function rechazarFicha(profileId: string, nota: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const n = clamp(nota, 2000);
  if (!n) return { ok: false, error: "Escribe el motivo del rechazo." };
  const service = createServiceRoleClient();
  const { data: r } = await service.from("directorio_profiles").select("estado").eq("profile_id", profileId).maybeSingle();
  if (!r) return { ok: false, error: "Ficha no encontrada." };
  if (r.estado === "verificado") return { ok: false, error: "Esta ficha ya está verificada." };

  await service.from("directorio_profiles").update({ estado: "rechazado", verdicto_por: adminId, verdicto_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("profile_id", profileId);
  await postCtc(service, adminId, profileId, n);
  await logVerdicto(service, adminId, profileId, "rechazar", String(r.estado), "rechazado", n);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function responderEcp(profileId: string, texto: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const t = clamp(texto, 4000);
  if (!t) return { ok: false, error: "Escribe un mensaje." };
  const service = createServiceRoleClient();
  await postCtc(service, adminId, profileId, t);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

// ── Verificación de certificados (soportes ligados a una certificación) ────────
// Días que un soporte rechazado sigue visible antes de retirarse si no se corrige.
const DIAS_PARA_RETIRAR = 10;
const fechaLarga = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

async function cargarCertDoc(service: ReturnType<typeof createServiceRoleClient>, docId: string) {
  const { data } = await service
    .from("directorio_documents")
    .select("id, profile_id, enlaza_a, enlace_valor, verificacion")
    .eq("id", docId)
    .maybeSingle();
  return data;
}

export async function aprobarCertificado(docId: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const doc = await cargarCertDoc(service, docId);
  if (!doc || doc.enlaza_a !== "certificacion") return { ok: false, error: "Ese soporte no existe o no liga una certificación." };
  const ownerId = String(doc.profile_id);
  const cert = String(doc.enlace_valor ?? "tu certificación");

  const { error } = await service
    .from("directorio_documents")
    .update({ verificacion: "aprobado", verdicto_por: adminId, verdicto_at: new Date().toISOString(), verdicto_nota: null, remover_despues_de: null })
    .eq("id", docId);
  if (error) return { ok: false, error: "No se pudo aprobar el soporte." };

  await postCtc(service, adminId, ownerId, `Verificamos el soporte de tu certificación «${cert}». Ahora aparece con el sello azul de CTC en tu ficha.`);
  await logVerdicto(service, adminId, ownerId, "cert_aprobar", String(doc.verificacion ?? ""), "aprobado", cert, "directorio_document", docId);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function rechazarCertificado(docId: string, nota: string): Promise<AdminResult> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const doc = await cargarCertDoc(service, docId);
  if (!doc || doc.enlaza_a !== "certificacion") return { ok: false, error: "Ese soporte no existe o no liga una certificación." };
  const ownerId = String(doc.profile_id);
  const cert = String(doc.enlace_valor ?? "tu certificación");
  const notaLimpia = clamp(nota, 2000);

  const remover = new Date(Date.now() + DIAS_PARA_RETIRAR * 24 * 60 * 60 * 1000);
  const { error } = await service
    .from("directorio_documents")
    .update({ verificacion: "rechazado", verdicto_por: adminId, verdicto_at: new Date().toISOString(), verdicto_nota: notaLimpia || null, remover_despues_de: remover.toISOString() })
    .eq("id", docId);
  if (error) return { ok: false, error: "No se pudo rechazar el soporte." };

  // Mensaje al usuario: no aceptado + revisar + se retira en 10 días. Se añade la
  // nota del admin si la escribió.
  const base =
    `El soporte de tu certificación «${cert}» no fue aceptado por CTC. ` +
    `Por favor revísalo y vuelve a subir el documento correcto. ` +
    `Si no se corrige, se retirará el ${fechaLarga(remover)} (en ${DIAS_PARA_RETIRAR} días).`;
  await postCtc(service, adminId, ownerId, notaLimpia ? `${base}\n\nNota de CTC: ${notaLimpia}` : base);
  await logVerdicto(service, adminId, ownerId, "cert_rechazar", String(doc.verificacion ?? ""), "rechazado", notaLimpia || cert, "directorio_document", docId);
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

// ── Moderación del muro ───────────────────────────────────────────────────────

export async function moderarPost(postId: string, accion: "ocultar" | "publicar" | "eliminar"): Promise<AdminResult> {
  await requireActiveAdmin();
  const estado = accion === "ocultar" ? "oculto" : accion === "publicar" ? "publicado" : "eliminado";
  const service = createServiceRoleClient();
  const { error } = await service.from("directorio_posts").update({ estado }).eq("id", postId);
  if (error) return { ok: false, error: "No se pudo moderar la publicación." };
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function fijarPost(postId: string, fijo: boolean): Promise<AdminResult> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { error } = await service.from("directorio_posts").update({ fijo }).eq("id", postId);
  if (error) return { ok: false, error: "No se pudo fijar la publicación." };
  revalidatePath("/ecp/directorio");
  return { ok: true };
}

export async function crearAnuncioCtc(etiqueta: string, texto: string): Promise<AdminResult> {
  await requireActiveAdmin();
  const t = clamp(texto, 4000);
  if (!t) return { ok: false, error: "Escribe el anuncio." };
  const service = createServiceRoleClient();
  const { error } = await service.from("directorio_posts").insert({
    author_profile_id: null, etiqueta: clamp(etiqueta, 40) || "Anuncio", texto: t, fijo: true, estado: "publicado",
  });
  if (error) return { ok: false, error: "No se pudo crear el anuncio." };
  revalidatePath("/ecp/directorio");
  return { ok: true };
}
