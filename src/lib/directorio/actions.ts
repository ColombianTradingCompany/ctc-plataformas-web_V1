"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { codigoDirectorio, colorPara, hace, iniciales } from "@/components/directorio/data";
import type {
  DirectorioBundle,
  DirectorioEstado,
  Ficha,
  FichaDoc,
  Hilo,
  Mensaje,
  MiFicha,
  Post,
} from "./types";

// ── Directorio del Café · server actions ────────────────────────────────────
// Todas las tablas directorio_* son service-role-only (RLS activada, cero
// políticas), como leads/arena. El cliente NUNCA las toca directo: cada acción
// reautentica con la sesión (auth.uid()) y luego usa el cliente service-role.
// El Directorio es ORTOGONAL al rol producer/buyer: se apoya en profiles.id
// compartido y jamás lee ni escribe profiles.role.

export type ActionResult = { ok: true } | { ok: false; error: string };

const CTC = { nombre: "Colombian Trading Company", color: "#2A0A55", ini: "CT" } as const;

const WELCOME =
  "¡Gracias por inscribirte en el Directorio del Café! Tu ficha quedó registrada y el equipo de CTC la revisará. " +
  "Cuando la aprobemos recibirás aquí tu Código de Verificado para activar tu cuenta y ver el resto del directorio. " +
  "¿Dudas? Escríbenos por este mismo chat.";

async function sessionUser() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const clamp = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

export type FichaInput = {
  nombre: string;
  departamento: string;
  municipio: string;
  telefono: string;
  especialidades: string[];
  certificaciones: string[];
  bio: string;
  motivo: string;
  motivoTxt: string;
};

// Whitelist + caps for anything a user can write into their own ficha.
function sanitizeFicha(input: FichaInput) {
  const arr = (v: unknown, cap: number, each: number) =>
    Array.isArray(v) ? [...new Set(v.map((x) => clamp(x, each)).filter(Boolean))].slice(0, cap) : [];
  return {
    nombre: clamp(input.nombre, 120),
    departamento: clamp(input.departamento, 80),
    municipio: clamp(input.municipio, 80),
    telefono: clamp(input.telefono, 40),
    especialidades: arr(input.especialidades, 12, 60),
    certificaciones: arr(input.certificaciones, 40, 120),
    bio: clamp(input.bio, 800),
    motivo: clamp(input.motivo, 120),
    motivo_txt: clamp(input.motivoTxt, 160),
  };
}

// ── Mappers row → UI type ───────────────────────────────────────────────────

type DirRow = Record<string, unknown>;

function mapDoc(r: DirRow, signed: Map<string, string>, sizes: Map<string, number>): FichaDoc {
  const kind = r.kind === "url" ? "url" : "file";
  const assetId = r.asset_id ? String(r.asset_id) : null;
  return {
    id: String(r.id),
    kind,
    url: kind === "url" ? ((r.url as string) ?? null) : assetId ? signed.get(assetId) ?? null : null,
    nombre: String(r.nombre ?? ""),
    tipo: String(r.tipo ?? "Certificado"),
    enlazaA: (r.enlaza_a as FichaDoc["enlazaA"]) ?? null,
    enlaceValor: (r.enlace_valor as string) ?? null,
    tam: assetId ? sizes.get(assetId) ?? null : null,
  };
}

function mapMiFicha(r: DirRow, correo: string, documentos: FichaDoc[]): MiFicha {
  const id = String(r.profile_id);
  return {
    profileId: id,
    codigo: codigoDirectorio(id),
    nombre: String(r.nombre ?? ""),
    correo,
    departamento: String(r.departamento ?? ""),
    municipio: String(r.municipio ?? ""),
    telefono: String(r.telefono ?? ""),
    mostrarTelefono: r.mostrar_telefono !== false,
    mostrarCorreo: r.mostrar_correo !== false,
    recibirMensajes: r.recibir_mensajes !== false,
    anios: Number(r.anios_experiencia ?? 0),
    esp: (r.especialidades as string[]) ?? [],
    cert: (r.certificaciones as string[]) ?? [],
    bio: String(r.bio ?? ""),
    motivo: String(r.motivo ?? ""),
    motivoTxt: String(r.motivo_txt ?? ""),
    color: String(r.color ?? colorPara(id)),
    estado: (r.estado as DirectorioEstado) ?? "pendiente",
    tieneCodigo: r.estado === "aprobado" && !!r.verificado_codigo,
    createdAt: String(r.created_at ?? ""),
    documentos,
  };
}

function mapFicha(r: DirRow, correo: string | null): Ficha {
  const id = String(r.profile_id);
  const nombre = String(r.nombre ?? "");
  return {
    profileId: id,
    codigo: codigoDirectorio(id),
    nombre,
    departamento: String(r.departamento ?? ""),
    municipio: String(r.municipio ?? ""),
    telefono: r.mostrar_telefono !== false ? String(r.telefono ?? "") || null : null,
    correo: r.mostrar_correo !== false ? correo : null,
    recibirMensajes: r.recibir_mensajes !== false,
    anios: Number(r.anios_experiencia ?? 0),
    esp: (r.especialidades as string[]) ?? [],
    cert: (r.certificaciones as string[]) ?? [],
    bio: String(r.bio ?? ""),
    motivoTxt: String(r.motivo_txt ?? ""),
    color: String(r.color ?? colorPara(id)),
    iniciales: iniciales(nombre),
  };
}

// ── Loader ──────────────────────────────────────────────────────────────────

export async function cargarDirectorio(): Promise<DirectorioBundle | null> {
  const user = await sessionUser();
  if (!user) return null;

  const service = createServiceRoleClient();
  const correo = user.email ?? "";

  const { data: fichaRow } = await service
    .from("directorio_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  const emptyCtc: Hilo = {
    clave: "ecp",
    canal: "ecp",
    nombre: CTC.nombre,
    color: CTC.color,
    iniciales: CTC.ini,
    sub: "Verificación y soporte",
    noLeido: false,
    mensajes: [],
  };

  if (!fichaRow) {
    return { ficha: null, correo, hiloCtc: emptyCtc, directorio: [], posts: [], hilosDirectos: [] };
  }

  const { data: docRows } = await service
    .from("directorio_documents")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });
  const docs = docRows ?? [];
  const fileAssetIds = docs.filter((d) => d.kind === "file" && d.asset_id).map((d) => String(d.asset_id));
  const signed = await signedKaffetalMediaUrls(service, fileAssetIds);
  const { data: assetRows } = fileAssetIds.length
    ? await service.from("media_assets").select("id, size_bytes").in("id", fileAssetIds)
    : { data: [] as DirRow[] };
  const sizes = new Map((assetRows ?? []).map((a) => [String(a.id), Number(a.size_bytes) || 0]));
  const documentos = docs.map((d) => mapDoc(d, signed, sizes));

  const ficha = mapMiFicha(fichaRow, correo, documentos);

  // The CTC conversation (ecp channel) — always available, even unverified.
  const { data: ecpRows } = await service
    .from("directorio_messages")
    .select("*")
    .eq("owner_profile_id", user.id)
    .eq("canal", "ecp")
    .order("created_at", { ascending: true });

  const hiloCtc: Hilo = {
    ...emptyCtc,
    noLeido: (ecpRows ?? []).some((m) => m.is_ctc && !m.leido),
    mensajes: (ecpRows ?? []).map(
      (m): Mensaje => ({ id: String(m.id), yo: !m.is_ctc, esCtc: !!m.is_ctc, texto: String(m.texto), hora: hora(String(m.created_at)) })
    ),
  };

  // Everything past the verification gate is empty unless the viewer is verified.
  if (ficha.estado !== "verificado") {
    return { ficha, correo, hiloCtc, directorio: [], posts: [], hilosDirectos: [] };
  }

  const [directorio, posts, hilosDirectos] = await Promise.all([
    loadDirectorio(service, user.id),
    loadPosts(service, user.id),
    loadDirectos(service, user.id),
  ]);

  return { ficha, correo, hiloCtc, directorio, posts, hilosDirectos };
}

type Service = ReturnType<typeof createServiceRoleClient>;

async function emailsFor(service: Service, ids: string[]): Promise<Map<string, string | null>> {
  if (!ids.length) return new Map();
  const { data } = await service.from("profiles").select("id, email").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [String(p.id), (p.email as string) ?? null]));
}

async function loadDirectorio(service: Service, me: string): Promise<Ficha[]> {
  const { data } = await service
    .from("directorio_profiles")
    .select("*")
    .eq("estado", "verificado")
    .neq("profile_id", me);
  const rows = data ?? [];
  const emails = await emailsFor(service, rows.map((r) => String(r.profile_id)));
  return rows.map((r) => mapFicha(r, emails.get(String(r.profile_id)) ?? null));
}

async function loadPosts(service: Service, me: string): Promise<Post[]> {
  const { data } = await service
    .from("directorio_posts")
    .select("*")
    .eq("estado", "publicado")
    .order("fijo", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];

  const authorIds = rows.map((r) => r.author_profile_id).filter(Boolean).map(String);
  const { data: authors } = authorIds.length
    ? await service.from("directorio_profiles").select("profile_id, nombre, departamento, municipio, especialidades, color").in("profile_id", [...new Set(authorIds)])
    : { data: [] as DirRow[] };
  const byId = new Map((authors ?? []).map((a) => [String(a.profile_id), a]));

  const postIds = rows.map((r) => String(r.id));
  const { data: myLikes } = postIds.length
    ? await service.from("directorio_post_likes").select("post_id").eq("profile_id", me).in("post_id", postIds)
    : { data: [] as DirRow[] };
  const liked = new Set((myLikes ?? []).map((l) => String(l.post_id)));

  const { data: likeCounts } = postIds.length
    ? await service.from("directorio_post_likes").select("post_id").in("post_id", postIds)
    : { data: [] as DirRow[] };
  const counts = new Map<string, number>();
  for (const l of likeCounts ?? []) counts.set(String(l.post_id), (counts.get(String(l.post_id)) ?? 0) + 1);

  return rows.map((r): Post => {
    const id = String(r.id);
    const a = r.author_profile_id ? byId.get(String(r.author_profile_id)) : null;
    const nombre = a ? String(a.nombre ?? "") : CTC.nombre;
    const sub = a
      ? [a.municipio, (a.especialidades as string[] | undefined)?.[0]].filter(Boolean).join(" · ")
      : "CTC · Piedecuesta";
    return {
      id,
      autorId: r.author_profile_id ? String(r.author_profile_id) : null,
      autor: nombre,
      sub,
      ini: a ? iniciales(nombre) : CTC.ini,
      color: a ? String(a.color ?? colorPara(String(a.profile_id))) : CTC.color,
      etiqueta: String(r.etiqueta ?? "Anuncio"),
      fijo: !!r.fijo,
      esCtc: !r.author_profile_id,
      cuando: r.fijo ? "Fijado" : hace(String(r.created_at)),
      megusta: counts.get(id) ?? 0,
      miGusta: liked.has(id),
      texto: String(r.texto ?? ""),
    };
  });
}

async function loadDirectos(service: Service, me: string): Promise<Hilo[]> {
  const { data } = await service
    .from("directorio_messages")
    .select("*")
    .eq("canal", "directo")
    .or(`from_profile_id.eq.${me},to_profile_id.eq.${me}`)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  if (!rows.length) return [];

  const otherIds = [
    ...new Set(rows.map((m) => (String(m.from_profile_id) === me ? String(m.to_profile_id) : String(m.from_profile_id)))),
  ];
  const { data: others } = await service
    .from("directorio_profiles")
    .select("profile_id, nombre, departamento, municipio, especialidades, color")
    .in("profile_id", otherIds);
  const byId = new Map((others ?? []).map((o) => [String(o.profile_id), o]));

  const grupos = new Map<string, Mensaje[]>();
  const noLeido = new Map<string, boolean>();
  for (const m of rows) {
    const other = String(m.from_profile_id) === me ? String(m.to_profile_id) : String(m.from_profile_id);
    if (!grupos.has(other)) grupos.set(other, []);
    grupos.get(other)!.push({
      id: String(m.id),
      yo: String(m.from_profile_id) === me,
      esCtc: false,
      texto: String(m.texto),
      hora: hora(String(m.created_at)),
    });
    if (String(m.to_profile_id) === me && !m.leido) noLeido.set(other, true);
  }

  return [...grupos.entries()].map(([other, mensajes]): Hilo => {
    const o = byId.get(other);
    const nombre = o ? String(o.nombre ?? "Especialista") : "Especialista";
    return {
      clave: other,
      canal: "directo",
      nombre,
      color: o ? String(o.color ?? colorPara(other)) : colorPara(other),
      iniciales: iniciales(nombre),
      sub: o ? [o.municipio, (o.especialidades as string[] | undefined)?.[0]].filter(Boolean).join(" · ") : "",
      noLeido: noLeido.get(other) ?? false,
      mensajes,
    };
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function registrarFichaDirectorio(input: FichaInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión para inscribirte." };

  const service = createServiceRoleClient();
  const clean = sanitizeFicha(input);
  if (!clean.nombre) return { ok: false, error: "Escribe tu nombre completo." };

  const { data: existing } = await service
    .from("directorio_profiles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existing) return { ok: true }; // ya tenía ficha — idempotente

  const { error } = await service.from("directorio_profiles").insert({
    profile_id: user.id,
    ...clean,
    color: colorPara(user.id),
    habeas_data_at: new Date().toISOString(),
    estado: "pendiente",
  });
  if (error) return { ok: false, error: "No se pudo crear tu ficha. Intenta de nuevo." };

  // Semilla de la conversación con CTC (mensaje de bienvenida del lado CTC).
  await service.from("directorio_messages").insert({
    canal: "ecp",
    owner_profile_id: user.id,
    from_profile_id: null,
    to_profile_id: user.id,
    is_ctc: true,
    texto: WELCOME,
  });

  return { ok: true };
}

export async function guardarFichaDirectorio(
  input: FichaInput & { mostrarTelefono: boolean; mostrarCorreo: boolean; recibirMensajes: boolean; anios: number }
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const service = createServiceRoleClient();
  const clean = sanitizeFicha(input);
  if (!clean.nombre) return { ok: false, error: "Escribe tu nombre completo." };

  const { error } = await service
    .from("directorio_profiles")
    .update({
      ...clean,
      mostrar_telefono: !!input.mostrarTelefono,
      mostrar_correo: !!input.mostrarCorreo,
      recibir_mensajes: !!input.recibirMensajes,
      anios_experiencia: Math.max(0, Math.min(80, Math.round(Number(input.anios) || 0))),
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: "No se pudieron guardar los cambios." };
  return { ok: true };
}

export async function enviarMensajeEcp(texto: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const t = clamp(texto, 4000);
  if (!t) return { ok: false, error: "Escribe un mensaje." };

  const service = createServiceRoleClient();
  const { data: ficha } = await service.from("directorio_profiles").select("profile_id").eq("profile_id", user.id).maybeSingle();
  if (!ficha) return { ok: false, error: "Aún no tienes una ficha en el directorio." };

  const { error } = await service.from("directorio_messages").insert({
    canal: "ecp",
    owner_profile_id: user.id,
    from_profile_id: user.id,
    to_profile_id: null,
    is_ctc: false,
    texto: t,
  });
  if (error) return { ok: false, error: "No se pudo enviar el mensaje." };
  return { ok: true };
}

export async function ingresarCodigoVerificado(codigo: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const code = clamp(codigo, 40).toUpperCase();
  if (!code) return { ok: false, error: "Escribe tu Código de Verificado." };

  const service = createServiceRoleClient();
  const { data: ficha } = await service
    .from("directorio_profiles")
    .select("estado, verificado_codigo")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!ficha) return { ok: false, error: "Aún no tienes una ficha en el directorio." };
  if (ficha.estado === "verificado") return { ok: true };
  if (ficha.estado !== "aprobado" || !ficha.verificado_codigo)
    return { ok: false, error: "Tu ficha todavía no tiene un código. Espera el veredicto de CTC." };
  if (String(ficha.verificado_codigo).toUpperCase() !== code)
    return { ok: false, error: "El código no coincide. Revísalo en tu conversación con CTC." };

  const { error } = await service
    .from("directorio_profiles")
    .update({ estado: "verificado", verificado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: "No se pudo activar tu cuenta. Intenta de nuevo." };
  return { ok: true };
}

// ── Verified-only actions ─────────────────────────────────────────────────────

async function requireVerified(service: Service, userId: string): Promise<boolean> {
  const { data } = await service.from("directorio_profiles").select("estado").eq("profile_id", userId).maybeSingle();
  return data?.estado === "verificado";
}

export async function publicarPost(etiqueta: string, texto: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const service = createServiceRoleClient();
  if (!(await requireVerified(service, user.id)))
    return { ok: false, error: "Activa tu cuenta con el Código de Verificado para publicar." };

  const t = clamp(texto, 4000);
  if (!t) return { ok: false, error: "Escribe algo para publicar." };
  const { error } = await service.from("directorio_posts").insert({
    author_profile_id: user.id,
    etiqueta: clamp(etiqueta, 40) || "Anuncio",
    texto: t,
  });
  if (error) return { ok: false, error: "No se pudo publicar." };
  return { ok: true };
}

export async function alternarMeGusta(postId: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const service = createServiceRoleClient();
  if (!(await requireVerified(service, user.id))) return { ok: false, error: "Cuenta no verificada." };

  const { data: existing } = await service
    .from("directorio_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existing) await service.from("directorio_post_likes").delete().eq("post_id", postId).eq("profile_id", user.id);
  else await service.from("directorio_post_likes").insert({ post_id: postId, profile_id: user.id });
  return { ok: true };
}

export async function enviarMensajeDirecto(toProfileId: string, asunto: string, texto: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  if (toProfileId === user.id) return { ok: false, error: "No puedes escribirte a ti mismo." };
  const service = createServiceRoleClient();
  if (!(await requireVerified(service, user.id)))
    return { ok: false, error: "Activa tu cuenta para escribir a otros miembros." };

  const { data: dest } = await service
    .from("directorio_profiles")
    .select("estado, recibir_mensajes")
    .eq("profile_id", toProfileId)
    .maybeSingle();
  if (!dest || dest.estado !== "verificado") return { ok: false, error: "Ese especialista no está disponible." };
  if (dest.recibir_mensajes === false) return { ok: false, error: "Ese especialista no recibe mensajes directos." };

  const asuntoTxt = clamp(asunto, 120);
  const cuerpo = clamp(texto, 4000) || "Hola, te escribo desde el Directorio del Café.";
  const { error } = await service.from("directorio_messages").insert({
    canal: "directo",
    from_profile_id: user.id,
    to_profile_id: toProfileId,
    is_ctc: false,
    asunto: asuntoTxt,
    texto: asuntoTxt ? `${asuntoTxt} — ${cuerpo}` : cuerpo,
  });
  if (error) return { ok: false, error: "No se pudo enviar el mensaje." };
  return { ok: true };
}

export async function marcarHiloLeido(clave: string, canal: "ecp" | "directo"): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const service = createServiceRoleClient();

  if (canal === "ecp") {
    await service
      .from("directorio_messages")
      .update({ leido: true })
      .eq("owner_profile_id", user.id)
      .eq("canal", "ecp")
      .eq("is_ctc", true)
      .eq("leido", false);
  } else {
    await service
      .from("directorio_messages")
      .update({ leido: true })
      .eq("canal", "directo")
      .eq("to_profile_id", user.id)
      .eq("from_profile_id", clave)
      .eq("leido", false);
  }
  return { ok: true };
}

// ── Documentos y soportes ─────────────────────────────────────────────────────

export type DocInput = {
  nombre: string;
  tipo: string;
  enlazaA: "certificacion" | "especialidad" | null;
  enlaceValor: string | null;
};

function sanitizeDoc(d: DocInput) {
  const enlazaA = d.enlazaA === "certificacion" || d.enlazaA === "especialidad" ? d.enlazaA : null;
  return {
    nombre: clamp(d.nombre, 200) || "Documento",
    tipo: clamp(d.tipo, 60) || "Certificado",
    enlaza_a: enlazaA,
    enlace_valor: enlazaA ? clamp(d.enlaceValor, 200) || null : null,
  };
}

export async function agregarDocumentoUrl(url: string, doc: DocInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  let u = clamp(url, 500);
  if (!u) return { ok: false, error: "Escribe un enlace." };
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    new URL(u);
  } catch {
    return { ok: false, error: "Ese enlace no es válido." };
  }
  const service = createServiceRoleClient();
  const { error } = await service.from("directorio_documents").insert({
    profile_id: user.id,
    kind: "url",
    url: u,
    ...sanitizeDoc(doc),
  });
  if (error) return { ok: false, error: "No se pudo guardar el enlace." };
  return { ok: true };
}

export async function agregarDocumentoArchivo(assetId: string, doc: DocInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const service = createServiceRoleClient();
  // El archivo debe pertenecer al usuario (se subió con su sesión a su carpeta).
  const { data: asset } = await service.from("media_assets").select("id, uploaded_by").eq("id", assetId).maybeSingle();
  if (!asset || String(asset.uploaded_by) !== user.id) return { ok: false, error: "Archivo no válido." };

  const { error } = await service.from("directorio_documents").insert({
    profile_id: user.id,
    kind: "file",
    asset_id: assetId,
    ...sanitizeDoc(doc),
  });
  if (error) return { ok: false, error: "No se pudo guardar el documento." };
  return { ok: true };
}

export async function eliminarDocumento(id: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const service = createServiceRoleClient();
  const { error } = await service.from("directorio_documents").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  return { ok: true };
}

// ── Mis plataformas ───────────────────────────────────────────────────────────
// Detección de a qué OTRAS superficies del ecosistema pertenece esta misma
// identidad (mismo profiles.id). No enlaza cuentas ni cambia roles: solo lee lo
// que ya existe para ofrecer saltos rápidos. Entrega el "auto-link por login".

export type MisPlataformas = { productor: boolean; comprador: boolean; interno: boolean };

export async function misPlataformas(): Promise<MisPlataformas> {
  const user = await sessionUser();
  if (!user) return { productor: false, comprador: false, interno: false };
  const service = createServiceRoleClient();
  const [{ data: prod }, { data: buy }, { data: prof }] = await Promise.all([
    service.from("producer_profiles").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    service.from("buyer_profiles").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  return { productor: !!prod, comprador: !!buy, interno: prof?.role === "bcp_admin" };
}
